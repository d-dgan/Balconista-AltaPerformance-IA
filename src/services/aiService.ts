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

export async function uploadClientLogo(
    organizationId: string | number,
    file: File
): Promise<{ url: string | null; error: any }> {
    if (!isSupabaseConfigured()) return { url: null, error: 'demo-mode' };

    const ext = file.name.split('.').pop();
    const filePath = `${organizationId}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from('client-logos')
        .upload(filePath, file, { upsert: true, contentType: file.type });

    if (uploadError) return { url: null, error: uploadError };

    const { data } = supabase.storage.from('client-logos').getPublicUrl(filePath);
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

    // Persist to organizations table
    const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: data.publicUrl })
        .eq('id', organizationId);

    if (updateError) {
        console.error('Error updating logo_url in organizations table:', updateError);
        return { url: null, error: updateError };
    }

    return { url: publicUrl, error: null };
}

export async function deleteClientLogo(
    organizationId: string | number
): Promise<{ error: any }> {
    if (!isSupabaseConfigured()) return { error: 'demo-mode' };

    // List files in org folder and delete all
    const { data: files } = await supabase.storage
        .from('client-logos')
        .list(`${organizationId}`);

    if (files && files.length > 0) {
        const paths = files.map((f) => `${organizationId}/${f.name}`);
        await supabase.storage.from('client-logos').remove(paths);
    }

    // Clear organizations.logo_url
    const { error } = await supabase
        .from('organizations')
        .update({ logo_url: null })
        .eq('id', organizationId);

    return { error };
}
