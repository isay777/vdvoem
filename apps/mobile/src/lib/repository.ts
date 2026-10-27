import type { EntityKind, PendingMutation } from '@my-vdvoem/shared';
import { orderMutations } from '@my-vdvoem/shared';
import { cacheEntities, failMutation, readPendingMutations, removeMutation } from './localDb';
import { requireSupabase } from './supabase';

export const tableForKind: Record<EntityKind, string> = {
  wishlist: 'wishlist_items', date_idea: 'date_ideas', media: 'media_items', task: 'tasks', shopping: 'shopping_items', place: 'places', event: 'events',
};

export async function fetchAllRecords() {
  const client = await requireSupabase();
  const rows: Record<string, unknown>[] = [];
  for (const [kind, table] of Object.entries(tableForKind)) {
    const result = await client.from(table).select('*').is('deleted_at', null).order('updated_at', { ascending: false });
    if (result.error) throw result.error;
    const typed = (result.data ?? []).map((row) => ({ ...row, kind }));
    rows.push(...typed);
    await cacheEntities(kind, typed);
  }
  return rows;
}

export async function flushMutationQueue(onConflict: (mutation: PendingMutation, server: Record<string, unknown>) => void) {
  const client = await requireSupabase();
  const mutations = orderMutations(await readPendingMutations());
  for (const mutation of mutations) {
    const result = await client.rpc('apply_versioned_mutation', {
      p_entity_kind: mutation.entityKind,
      p_entity_id: mutation.entityId,
      p_operation: mutation.operation,
      p_expected_version: mutation.expectedVersion,
      p_payload: mutation.payload,
      p_client_request_id: mutation.id,
    });
    if (!result.error && result.data?.ok) { await removeMutation(mutation.id); continue; }
    if (result.data?.conflict) { onConflict(mutation, result.data.server); continue; }
    await failMutation(mutation.id, result.error?.message ?? result.data?.error ?? 'Неизвестная ошибка синхронизации');
  }
}

export async function currentIdentity() {
  const client = await requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: membership }] = await Promise.all([
    client.from('profiles').select('*').eq('id', user.id).single(),
    client.from('couple_members').select('couple_id').eq('user_id', user.id).eq('status', 'active').maybeSingle(),
  ]);
  return { user, profile, coupleId: membership?.couple_id ?? null };
}
