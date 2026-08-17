import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AwsClient } from 'aws4fetch';
import { createClient } from '@supabase/supabase-js';

// Logos das farmácias ficam no R2 (Cloudflare) — mesmo bucket já usado
// pra mídia do WhatsApp (chat-evolution-media), sob o prefixo
// client-logos/. As chaves de acesso R2 são secretas, por isso o upload
// não pode ir direto do browser: passa por este endpoint, que valida
// a sessão Supabase do chamador antes de gravar.

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const R2_ACCOUNT_ENDPOINT = process.env.R2_ACCOUNT_ENDPOINT!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET!;
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL!;

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

async function getCallerProfile(authHeader: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('auth_id', user.id)
    .maybeSingle();

  return profile;
}

function canManageOrg(profile: { organization_id: string; role: string }, organizationId: string) {
  return profile.role === 'super_admin' || profile.organization_id === organizationId;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const profile = await getCallerProfile(authHeader);
  if (!profile) {
    return res.status(401).json({ error: 'Sessão inválida' });
  }

  const r2 = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY });
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  if (req.method === 'POST') {
    const { organizationId, contentType, base64Data } = req.body ?? {};
    if (!organizationId || !contentType || !base64Data) {
      return res.status(400).json({ error: 'organizationId, contentType e base64Data são obrigatórios' });
    }
    if (!canManageOrg(profile, organizationId)) {
      return res.status(403).json({ error: 'Sem permissão para essa organização' });
    }

    const ext = EXT_BY_CONTENT_TYPE[contentType];
    if (!ext) {
      return res.status(400).json({ error: 'Tipo de arquivo não suportado (use PNG, JPG, WEBP ou SVG)' });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.byteLength > MAX_FILE_BYTES) {
      return res.status(400).json({ error: 'Arquivo maior que 5MB' });
    }

    const key = `client-logos/${organizationId}/logo.${ext}`;
    const putResp = await r2.fetch(`${R2_ACCOUNT_ENDPOINT}/${R2_BUCKET}/${key}`, {
      method: 'PUT',
      body: buffer,
      headers: { 'Content-Type': contentType },
    });

    if (!putResp.ok) {
      const detail = await putResp.text();
      return res.status(502).json({ error: `Falha ao enviar pro R2 (${putResp.status}): ${detail}` });
    }

    const storedUrl = `${R2_PUBLIC_BASE_URL}/${key}`;
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ logo_url: storedUrl })
      .eq('id', organizationId);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({ url: `${storedUrl}?t=${Date.now()}` });
  }

  if (req.method === 'DELETE') {
    const { organizationId } = req.body ?? {};
    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId é obrigatório' });
    }
    if (!canManageOrg(profile, organizationId)) {
      return res.status(403).json({ error: 'Sem permissão para essa organização' });
    }

    for (const ext of Object.values(EXT_BY_CONTENT_TYPE)) {
      const key = `client-logos/${organizationId}/logo.${ext}`;
      await r2.fetch(`${R2_ACCOUNT_ENDPOINT}/${R2_BUCKET}/${key}`, { method: 'DELETE' });
    }

    const { error } = await supabase.from('organizations').update({ logo_url: null }).eq('id', organizationId);
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
