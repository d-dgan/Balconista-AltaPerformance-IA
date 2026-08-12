import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, 401);
  }

  // Cliente autenticado como quem chamou — usado só pra confirmar que é admin.
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user: caller },
  } = await callerClient.auth.getUser();
  if (!caller) {
    return json({ error: 'Sessão inválida' }, 401);
  }

  const { data: callerProfile } = await callerClient
    .from('balconista_profiles')
    .select('role')
    .eq('id', caller.id)
    .maybeSingle();

  if (callerProfile?.role !== 'admin') {
    return json({ error: 'Apenas administradores podem criar clientes' }, 403);
  }

  const { email, password, farmacia_nome } = await req.json();
  if (!email || !password) {
    return json({ error: 'email e password são obrigatórios' }, 400);
  }
  if (password.length < 6) {
    return json({ error: 'A senha precisa ter pelo menos 6 caracteres' }, 400);
  }

  // Cliente com service_role — ignora RLS, pode criar usuários e o profile dele.
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return json({ error: createError?.message ?? 'Falha ao criar usuário' }, 400);
  }

  const { error: profileError } = await adminClient.from('balconista_profiles').insert({
    id: created.user.id,
    role: 'client',
    farmacia_nome: farmacia_nome ?? null,
  });

  if (profileError) {
    // Rollback: não deixa um auth.users órfão sem profile.
    await adminClient.auth.admin.deleteUser(created.user.id);
    return json({ error: profileError.message }, 400);
  }

  return json({ id: created.user.id, email, farmacia_nome: farmacia_nome ?? null }, 200);
});
