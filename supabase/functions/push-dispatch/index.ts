import { createClient } from 'npm:@supabase/supabase-js@2';

type Outbox = { id: string; user_id: string; title: string; body: string; route: string | null; entity_id: string | null; attempts: number };
const BATCH_SIZE = 100;

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authorization = request.headers.get('Authorization');
  if (authorization !== `Bearer ${serviceKey}`) return new Response('Unauthorized', { status: 401 });
  const client = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, { auth: { persistSession: false } });
  await client.rpc('enqueue_due_reminders');
  const { data: jobs, error } = await client.from('notification_outbox').select('id,user_id,title,body,route,entity_id,attempts').in('status', ['queued', 'failed']).lte('scheduled_for', new Date().toISOString()).lt('attempts', 8).limit(BATCH_SIZE);
  if (error) return Response.json({ error: 'OUTBOX_READ_FAILED' }, { status: 500 });
  let sent = 0;
  for (const job of (jobs ?? []) as Outbox[]) {
    await client.from('notification_outbox').update({ status: 'sending', attempts: job.attempts + 1 }).eq('id', job.id);
    const { data: devices } = await client.from('devices').select('id,expo_token').eq('user_id', job.user_id).eq('enabled', true);
    if (!devices?.length) { await client.from('notification_outbox').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', job.id); continue; }
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate', ...(Deno.env.get('EXPO_ACCESS_TOKEN') ? { Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}` } : {}) },
        body: JSON.stringify(devices.map((device) => ({ to: device.expo_token, title: job.title, body: job.body, sound: 'default', data: { route: job.route, entityId: job.entity_id } }))),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(`EXPO_${response.status}`);
      const tickets = Array.isArray(result.data) ? result.data : [result.data];
      for (let index = 0; index < tickets.length; index++) if (tickets[index]?.status === 'error' && ['DeviceNotRegistered','InvalidCredentials'].includes(tickets[index]?.details?.error)) await client.from('devices').update({ enabled: false }).eq('id', devices[index]?.id);
      await client.from('notification_outbox').update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null }).eq('id', job.id); sent++;
    } catch (dispatchError) {
      await client.from('notification_outbox').update({ status: 'failed', last_error: dispatchError instanceof Error ? dispatchError.message.slice(0, 300) : 'DISPATCH_FAILED' }).eq('id', job.id);
    }
  }
  return Response.json({ processed: jobs?.length ?? 0, sent });
});
