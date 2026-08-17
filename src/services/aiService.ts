import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// ==========================================
// TYPES
// ==========================================

export interface AiUnitData {
    name: string;
    address: string;
    phone: string;
    delivery_phone: string;
}

export interface AiPartner {
    brand: string;
    category: string;
    priority: 'high' | 'medium' | 'low';
}

export interface AiContextData {
    unit?: AiUnitData;
    specialties?: string[];
    partners?: AiPartner[];
    pricing_rules?: string;
    tone_of_voice?: string;
    delivery_fee?: string;
    delivery_area?: string;
    available_services?: string[];
}

export interface AiSettings {
    id?: string;
    organization_id: string;
    is_enabled: boolean;
    model: string;
    gemini_api_key?: string;
    openai_api_key?: string;
    serpapi_key?: string;
    system_prompt: string;
    context_data: AiContextData;
    created_at?: string;
    updated_at?: string;
}

export interface AiAlert {
    type: 'interaction' | 'retention' | 'controlled';
    message: string;
}

export interface AiCrossSell {
    product: string;
    reason: string;
}

export interface AiHint {
    suggestion: string;
    suggestions?: string[];
    alerts: AiAlert[];
    cross_sell: AiCrossSell[];
    technical_info: string;
    confidence: number;
    generated_at: string;
}

const isSupabaseConfigured = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    return url && url !== 'https://your-project.supabase.co' && !url.includes('your-project');
};

// ==========================================
// FETCH AI SETTINGS
// ==========================================

export async function fetchAiSettings(organizationId: string | number): Promise<{ data: AiSettings | null; error: any }> {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    const { data, error } = await supabase
        .rpc('get_ai_settings_safe', { org_id: organizationId })
        .maybeSingle();

    return { data: data as AiSettings | null, error };
}

// ==========================================
// UPSERT AI SETTINGS
// ==========================================

export async function upsertAiSettings(
    organizationId: string | number,
    settings: Partial<AiSettings>
): Promise<{ data: AiSettings | null; error: any }> {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    // Check if settings already exist
    const { data: existing } = await supabase
        .from('ai_settings')
        .select('id')
        .eq('organization_id', organizationId)
        .maybeSingle();

    const payload = {
        ...settings,
        organization_id: organizationId,
        updated_at: new Date().toISOString(),
    };

    // Don't send empty api_key (keep existing)
    if (!payload.gemini_api_key) {
        delete payload.gemini_api_key;
    }
    if (!payload.openai_api_key) {
        delete payload.openai_api_key;
    }
    if (!payload.serpapi_key) {
        delete payload.serpapi_key;
    }

    let result;

    if (existing) {
        result = await supabase
            .from('ai_settings')
            .update(payload)
            .eq('organization_id', organizationId)
            .select()
            .single();
    } else {
        result = await supabase
            .from('ai_settings')
            .insert({
                ...payload,
                created_at: new Date().toISOString(),
            })
            .select()
            .single();
    }

    return { data: result.data as AiSettings | null, error: result.error };
}

// ==========================================
// SUBSCRIBE TO AI HINT (Realtime)
// ==========================================

export function subscribeToAiHint(
    ticketId: string | number,
    callback: (hint: AiHint | null) => void
): RealtimeChannel | null {
    if (!isSupabaseConfigured()) return null;

    return supabase
        .channel(`ai_hint_${ticketId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'tickets',
                filter: `id=eq.${ticketId}`,
            },
            (payload) => {
                const newRecord = payload.new as any;
                if (newRecord?.ai_hint !== undefined) {
                    callback(newRecord.ai_hint as AiHint | null);
                }
            }
        )
        .subscribe();
}

export function unsubscribeFromAiHint(channel: RealtimeChannel | null) {
    if (channel) {
        supabase.removeChannel(channel);
    }
}

// ==========================================
// FETCH CURRENT AI HINT
// ==========================================

export async function fetchAiHint(ticketId: string | number): Promise<{ data: AiHint | null; error: any }> {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    const { data, error } = await supabase
        .from('tickets')
        .select('ai_hint')
        .eq('id', ticketId)
        .single();

    return { data: data?.ai_hint as AiHint | null, error };
}

// ==========================================
// CLEAR AI HINT
// ==========================================

export async function clearAiHint(ticketId: string | number): Promise<void> {
    if (!isSupabaseConfigured()) return;

    await supabase
        .from('tickets')
        .update({ ai_hint: null })
        .eq('id', ticketId);
}

// ==========================================
// LOGO — organizations.logo_url
// ==========================================

export async function fetchOrgLogoUrl(
    organizationId: string | number
): Promise<{ url: string | null; error: any }> {
    if (!isSupabaseConfigured()) return { url: null, error: 'demo-mode' };
    const { data, error } = await supabase
        .from('organizations')
        .select('logo_url')
        .eq('id', organizationId)
        .single();
    return { url: data?.logo_url ? `${data.logo_url}?t=${Date.now()}` : null, error };
}

// Logo fica no Cloudflare R2 (não no Supabase Storage) — ver api/upload-logo.ts.
// O upload passa por essa function porque as chaves R2 são secretas e não
// podem ir pro bundle do front-end.

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

export async function uploadClientLogo(
    organizationId: string | number,
    file: File
): Promise<{ url: string | null; error: any }> {
    if (!isSupabaseConfigured()) return { url: null, error: 'demo-mode' };

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { url: null, error: 'Sessão inválida' };

    const base64Data = await fileToBase64(file);

    const response = await fetch('/api/upload-logo', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ organizationId, contentType: file.type, base64Data }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) return { url: null, error: result.error ?? 'Erro ao enviar logo' };

    return { url: result.url, error: null };
}

export async function deleteClientLogo(
    organizationId: string | number
): Promise<{ error: any }> {
    if (!isSupabaseConfigured()) return { error: 'demo-mode' };

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: 'Sessão inválida' };

    const response = await fetch('/api/upload-logo', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ organizationId }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) return { error: result.error ?? 'Erro ao remover logo' };

    return { error: null };
}
