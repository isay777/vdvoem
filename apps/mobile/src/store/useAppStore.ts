import type { EntityKind, PendingMutation, SyncConflict } from '@my-vdvoem/shared';
import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { enqueueMutation, purgeLocalData, readCachedEntities, removeMutation } from '../lib/localDb';
import { currentIdentity, fetchAllRecords, flushMutationQueue, tableForKind } from '../lib/repository';
import { isBackendConfigured, requireSupabase, supabase } from '../lib/supabase';

export type RecordView = {
  id: string; kind: EntityKind; title: string; subtitle: string; status: string | undefined; completed: boolean; favorite: boolean; version: number; updatedAt: string; raw: Record<string, unknown>;
};

type Identity = { userId: string; displayName: string; coupleId: string | null };
type Invite = { id: string; token: string; code: string; expiresAt: string };

type AppState = {
  booting: boolean; authenticated: boolean; demo: boolean; online: boolean; syncing: boolean;
  identity: Identity | null; records: RecordView[]; pending: number; conflict: SyncConflict | null; invite: Invite | null; error: string | null;
  bootstrap: () => Promise<void>; enterDemo: () => void; sendOtp: (email: string) => Promise<void>; verifyOtp: (email: string, token: string) => Promise<void>; signOut: () => Promise<void>;
  setOnline: (online: boolean) => void; reload: () => Promise<void>; sync: () => Promise<void>;
  createRecord: (kind: EntityKind, values: Record<string, unknown>) => Promise<void>; toggleRecord: (record: RecordView) => Promise<void>;
  resolveConflict: (choice: 'local' | 'server') => Promise<void>;
  createInvite: () => Promise<void>; revokeInvite: () => Promise<void>; acceptInvite: (tokenOrCode: string) => Promise<void>;
  leaveCouple: () => Promise<void>; requestDeletion: () => Promise<string>;
};

function toView(row: Record<string, unknown>): RecordView {
  const kind = String(row.kind) as EntityKind;
  const secondary = row.description ?? row.note ?? row.address ?? row.place ?? row.genre ?? '';
  return {
    id: String(row.id), kind, title: String(row.title ?? 'Без названия'), subtitle: String(secondary ?? ''), status: row.status ? String(row.status) : undefined,
    completed: Boolean(row.completed ?? row.purchased ?? row.status === 'fulfilled'), favorite: Boolean(row.favorite), version: Number(row.version ?? 1),
    updatedAt: String(row.updated_at ?? new Date().toISOString()), raw: row,
  };
}

const demoRows: Record<string, unknown>[] = [
  { id: 'd1', kind: 'event', title: 'Вечер в маленьком итальянском кафе', description: 'Столик у окна', starts_at: new Date(Date.now() + 86400000 * 2).toISOString(), category: 'date', version: 1 },
  { id: 'd2', kind: 'task', title: 'Выбрать фотографии для альбома', description: 'До воскресенья', completed: false, priority: 'normal', version: 1 },
  { id: 'd3', kind: 'shopping', title: 'Клубника', note: '2 упаковки', purchased: false, version: 1 },
  { id: 'd4', kind: 'wishlist', title: 'Плед крупной вязки', description: 'Молочный или розовый', status: 'wanted', priority: 'high', version: 1 },
  { id: 'd5', kind: 'date_idea', title: 'Пикник на закате', description: 'Плед, лимонад и любимый плейлист', category: 'walk', status: 'want', favorite: true, version: 1 },
  { id: 'd6', kind: 'media', title: 'Перед рассветом', genre: 'Романтика', status: 'want', version: 1 },
  { id: 'd7', kind: 'place', title: 'Кафе «Тёплый свет»', address: 'Набережная, 12', status: 'want', version: 1 },
];

function livePayload(kind: EntityKind, values: Record<string, unknown>, identity: Identity, id: string) {
  const common = { id, couple_id: identity.coupleId, owner_id: identity.userId, created_by: identity.userId, client_request_id: id, version: 1 };
  const title = String(values.title ?? '').trim();
  switch (kind) {
    case 'wishlist': return { ...common, title, description: values.description ?? null, image_path: values.image_path ?? null, status: 'wanted', priority: values.priority ?? 'normal' };
    case 'date_idea': return { ...common, title, description: values.description ?? null, image_path: values.image_path ?? null, category: values.category ?? 'surprise', status: 'idea', favorite: false };
    case 'media': return { ...common, title, note: values.description ?? null, media_type: values.media_type ?? 'movie', status: 'want' };
    case 'task': return { ...common, title, description: values.description ?? null, priority: values.priority ?? 'normal', assignee: values.assignee ?? 'both', completed: false };
    case 'shopping': return { ...common, title, note: values.description ?? null, quantity: Number(values.quantity ?? 1), purchased: false };
    case 'place': return { ...common, title, note: values.description ?? null, address: values.address ?? null, category: values.category ?? 'cafe', status: 'want' };
    case 'event': return { ...common, title, description: values.description ?? null, category: values.category ?? 'date', all_day: Boolean(values.all_day), starts_at: values.starts_at ?? new Date().toISOString(), ends_at: values.ends_at ?? null, reminder_offsets: values.reminder_offsets ?? [1440, 60, 15], timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  booting: true, authenticated: false, demo: false, online: true, syncing: false, identity: null, records: [], pending: 0, conflict: null, invite: null, error: null,
  bootstrap: async () => {
    try {
      const cached = await readCachedEntities();
      if (cached.length) set({ records: cached.map(toView) });
      if (!isBackendConfigured || !supabase) return set({ booting: false, authenticated: false });
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return set({ booting: false, authenticated: false });
      const identity = await currentIdentity();
      if (!identity) return set({ booting: false, authenticated: false });
      set({ authenticated: true, identity: { userId: identity.user.id, displayName: identity.profile?.display_name ?? 'Вы', coupleId: identity.coupleId }, booting: false });
      await get().reload();
    } catch (error) { set({ booting: false, error: error instanceof Error ? error.message : 'Ошибка запуска' }); }
  },
  enterDemo: () => set({ authenticated: true, demo: true, booting: false, identity: { userId: 'demo-user', displayName: 'Аня', coupleId: 'demo-couple' }, records: demoRows.map(toView) }),
  sendOtp: async (email) => { const client = await requireSupabase(); const result = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }); if (result.error) throw result.error; },
  verifyOtp: async (email, token) => {
    const client = await requireSupabase(); const result = await client.auth.verifyOtp({ email, token, type: 'email' }); if (result.error) throw result.error;
    const identity = await currentIdentity(); if (!identity) throw new Error('Не удалось создать профиль');
    set({ authenticated: true, demo: false, identity: { userId: identity.user.id, displayName: identity.profile?.display_name ?? email.split('@')[0]!, coupleId: identity.coupleId } });
    await get().reload();
  },
  signOut: async () => { if (supabase) { await supabase.rpc('disable_my_devices'); await supabase.auth.signOut(); } await purgeLocalData(); set({ authenticated: false, demo: false, identity: null, records: [], invite: null }); },
  setOnline: (online) => { set({ online }); if (online && get().authenticated && !get().demo) void get().sync(); },
  reload: async () => { if (get().demo || !get().authenticated) return; const rows = await fetchAllRecords(); set({ records: rows.map(toView), error: null }); },
  sync: async () => {
    if (get().demo || !get().online || get().syncing) return;
    set({ syncing: true });
    try { await flushMutationQueue((mutation, server) => set({ conflict: { mutation, local: mutation.payload, server, serverVersion: Number(server.version ?? 0) } })); await get().reload(); }
    catch (error) { set({ error: error instanceof Error ? error.message : 'Ошибка синхронизации' }); }
    finally { set({ syncing: false }); }
  },
  createRecord: async (kind, values) => {
    const identity = get().identity; if (!identity) throw new Error('Требуется вход');
    const id = randomUUID(); const payload = livePayload(kind, values, identity, id); const optimistic = toView({ ...payload, kind, updated_at: new Date().toISOString() });
    set((state) => ({ records: [optimistic, ...state.records] }));
    if (get().demo) return;
    const mutation: PendingMutation = { id, entityKind: kind, entityId: id, operation: 'insert', expectedVersion: null, payload, createdAt: new Date().toISOString(), attempts: 0, lastError: null };
    await enqueueMutation(mutation); set((state) => ({ pending: state.pending + 1 })); if (get().online) await get().sync();
  },
  toggleRecord: async (record) => {
    const toggleField = record.kind === 'shopping' ? 'purchased' : record.kind === 'wishlist' ? 'status' : record.kind === 'date_idea' ? 'favorite' : 'completed';
    const value = toggleField === 'status' ? (record.status === 'fulfilled' ? 'wanted' : 'fulfilled') : !(record.raw[toggleField] ?? record.completed ?? record.favorite);
    const payload = { [toggleField]: value };
    set((state) => ({ records: state.records.map((item) => item.id === record.id ? toView({ ...item.raw, ...payload, kind: item.kind, version: item.version, updated_at: new Date().toISOString() }) : item) }));
    if (get().demo) return;
    const mutation: PendingMutation = { id: randomUUID(), entityKind: record.kind, entityId: record.id, operation: 'update', expectedVersion: record.version, payload, createdAt: new Date().toISOString(), attempts: 0, lastError: null };
    await enqueueMutation(mutation); if (get().online) await get().sync();
  },
  resolveConflict: async (choice) => {
    const conflict = get().conflict; if (!conflict) return;
    if (choice === 'server') await removeMutation(conflict.mutation.id);
    else {
      await removeMutation(conflict.mutation.id);
      await enqueueMutation({ ...conflict.mutation, id: randomUUID(), expectedVersion: conflict.serverVersion, attempts: 0, lastError: null });
    }
    set({ conflict: null }); await get().sync();
  },
  createInvite: async () => {
    if (get().demo) return set({ invite: { id: 'demo-invite', token: 'demo-token', code: 'ВДВОЁМ', expiresAt: new Date(Date.now() + 72 * 3600_000).toISOString() } });
    const client = await requireSupabase(); let coupleId = get().identity?.coupleId;
    if (!coupleId) { const created = await client.rpc('create_couple'); if (created.error) throw created.error; coupleId = String(created.data.couple_id); set((state) => ({ identity: state.identity ? { ...state.identity, coupleId: coupleId ?? null } : null })); }
    const result = await client.rpc('create_invitation'); if (result.error) throw result.error;
    set({ invite: { id: result.data.id, token: result.data.token, code: result.data.code, expiresAt: result.data.expires_at } });
  },
  revokeInvite: async () => { const invite = get().invite; if (!invite) return; if (!get().demo) { const client = await requireSupabase(); const result = await client.rpc('revoke_invitation', { p_invitation_id: invite.id }); if (result.error) throw result.error; } set({ invite: null }); },
  acceptInvite: async (tokenOrCode) => { if (get().demo) return; const client = await requireSupabase(); const result = await client.functions.invoke('accept-invite', { body: { tokenOrCode } }); if (result.error) throw result.error; if (result.data?.error) throw new Error(result.data.error); const identity = get().identity; set({ identity: identity ? { ...identity, coupleId: String(result.data.couple_id) } : null }); await get().reload(); },
  leaveCouple: async () => { if (!get().demo) { const client = await requireSupabase(); const result = await client.rpc('leave_couple'); if (result.error) throw result.error; } set((state) => ({ identity: state.identity ? { ...state.identity, coupleId: null } : null, records: state.records.filter((row) => row.raw.owner_id === state.identity?.userId) })); },
  requestDeletion: async () => { if (get().demo) return new Date(Date.now() + 7 * 86400000).toISOString(); const client = await requireSupabase(); const result = await client.rpc('request_account_deletion'); if (result.error) throw result.error; return result.data.delete_after; },
}));

export function recordsOf(kind: EntityKind) { return useAppStore.getState().records.filter((record) => record.kind === kind); }
export { tableForKind };
