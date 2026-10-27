import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const cronSecret = Deno.env.get('ACCOUNT_DELETION_CRON_SECRET');
  if (!cronSecret || request.headers.get('x-cron-secret') !== cronSecret) return new Response('Unauthorized', { status: 401 });
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: due, error } = await client.from('pending_account_deletions').select('user_id').is('cancelled_at', null).lte('delete_after', new Date().toISOString()).limit(50);
  if (error) return Response.json({ error: 'DELETION_QUEUE_READ_FAILED' }, { status: 500 });
  let deleted = 0;
  for (const entry of due ?? []) {
    const { error: deleteError } = await client.auth.admin.deleteUser(entry.user_id);
    if (!deleteError) deleted++;
  }
  const { data: orphaned } = await client.from('assets').select('id,storage_path').is('owner_id', null);
  for (const asset of orphaned ?? []) {
    const { count } = await client.from('asset_access').select('*', { count: 'exact', head: true }).eq('asset_id', asset.id);
    if (!count) { await client.storage.from('pair-assets').remove([asset.storage_path]); await client.from('assets').delete().eq('id', asset.id); }
  }
  return Response.json({ processed: due?.length ?? 0, deleted });
});
