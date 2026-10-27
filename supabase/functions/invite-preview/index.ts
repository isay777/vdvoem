import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const token = new URL(request.url).searchParams.get('token')?.trim();
  if (!token || token.length < 32) return Response.json({ valid: false, reason: 'Некорректная ссылка' }, { status: 400, headers: corsHeaders });
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } });
  const { data, error } = await client.rpc('preview_invitation', { p_token: token });
  if (error) return Response.json({ valid: false, reason: 'Сервис временно недоступен' }, { status: 503, headers: corsHeaders });
  return Response.json(data, { headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });
});
