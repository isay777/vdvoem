import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

async function fingerprint(value: string) {
  const bytes = new TextEncoder().encode(`${Deno.env.get('INVITE_FINGERPRINT_PEPPER') ?? ''}:${value}`);
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401, headers: corsHeaders });
  const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: { user }, error: authError } = await anon.auth.getUser();
  if (authError || !user) return Response.json({ error: 'INVALID_SESSION' }, { status: 401, headers: corsHeaders });
  const body = await request.json().catch(() => ({}));
  const tokenOrCode = String(body.tokenOrCode ?? '').trim();
  if (tokenOrCode.length < 6 || tokenOrCode.length > 128) return Response.json({ error: 'INVALID_INVITATION' }, { status: 400, headers: corsHeaders });
  const ip = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data, error } = await service.rpc('accept_invitation_internal', { p_token_or_code: tokenOrCode, p_user_id: user.id, p_fingerprint: await fingerprint(ip) });
  if (error) {
    const limited = error.message.includes('TOO_MANY_ATTEMPTS');
    return Response.json({ error: error.message }, { status: limited ? 429 : 400, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });
  }
  return Response.json(data, { headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });
});
