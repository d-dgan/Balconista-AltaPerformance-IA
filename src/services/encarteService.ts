import { supabase } from './supabase';

// Workflow "Balconista - Gerador de Encarte" no n8n de produção (ORAQLE VPS).
// A URL antiga (n8n.expervivenciafarma.com.br) apontava pra uma instância
// órfã com um workflow nunca terminado (nó de busca de imagem com API key
// placeholder, desconectado do resto do fluxo).
const WEBHOOK_URL = 'https://chat-n8n-main.wcvao0.easypanel.host/webhook/imagensia';

// ==========================================
// TYPES
// ==========================================

export interface EncartePayload {
    org: {
        id: string;
        name: string;
        logo_url: string;
        tone: string;
    };
    products: Array<{
        name: string;
        ean: string;
        price_from: string;
        price_to: string;
        tag: string;
        extra_text: string;
    }>;
    style: {
        format: 'feed' | 'story';
        palette: string;
        style: string;
        layout: number; // 1, 4, or 6
        theme?: string;
    };
}

export interface EncarteHistoryItem {
    id: string;
    image_url: string;
    product_name: string;
    created_at: string;
    org_id: string;
}

// ==========================================
// GENERATE ENCARTE (via n8n)
// ==========================================

export async function generateEncarte(
    payload: EncartePayload
): Promise<{ image_url: string | null; error: string | null }> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return { image_url: null, error: 'Sessão inválida. Faça login novamente.' };
        }

        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            return { image_url: null, error: `Erro HTTP ${response.status}` };
        }

        const data = await response.json();
        const imageUrl = data?.image_url || data?.url || data?.[0]?.image_url || null;

        if (!imageUrl) {
            return { image_url: null, error: 'Nenhuma imagem retornada pelo servidor.' };
        }

        return { image_url: imageUrl, error: null };
    } catch (err: any) {
        return { image_url: null, error: err.message || 'Erro ao conectar com o servidor.' };
    }
}

// ==========================================
// HISTORY (Supabase + localStorage fallback)
// ==========================================

const HISTORY_KEY = (orgId: string | number) => `encarte_history_${orgId}`;

export async function saveToHistory(
    orgId: string | number,
    imageUrl: string,
    productName: string,
    layoutQty: number = 1,
    styleJson: any = {}
): Promise<void> {
    // 1. Save to Supabase
    try {
        await supabase.from('flyer_history').insert({
            organization_id: orgId,
            image_url: imageUrl,
            product_name: productName,
            layout_qty: layoutQty,
            style_json: styleJson
        });
    } catch (err) {
        console.error('Error saving to Supabase history:', err);
    }

    // 2. LocalStorage Fallback (keep legacy logic)
    const key = HISTORY_KEY(orgId);
    const existing = getHistoryLocal(orgId);
    const newItem: EncarteHistoryItem = {
        id: Date.now().toString(),
        image_url: imageUrl,
        product_name: productName,
        created_at: new Date().toISOString(),
        org_id: String(orgId),
    };
    const updated = [newItem, ...existing].slice(0, 12);
    localStorage.setItem(key, JSON.stringify(updated));
}

function getHistoryLocal(orgId: string | number): EncarteHistoryItem[] {
    try {
        const raw = localStorage.getItem(HISTORY_KEY(orgId));
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export async function getHistory(orgId: string | number): Promise<EncarteHistoryItem[]> {
    try {
        // 1. Try Supabase first
        const { data, error } = await supabase
            .from('flyer_history')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        if (data && data.length > 0) {
            return data.map(item => ({
                id: item.id,
                image_url: item.image_url,
                product_name: item.product_name,
                created_at: item.created_at,
                org_id: String(item.organization_id)
            }));
        }
    } catch (err) {
        console.error('Error fetching from Supabase history, falling back to local:', err);
    }

    // 2. Fallback to LocalStorage
    return getHistoryLocal(orgId);
}

export async function clearHistory(orgId: string | number): Promise<void> {
    // 1. Clear Supabase (optional approach: mark as hidden or delete)
    try {
        await supabase
            .from('flyer_history')
            .delete()
            .eq('organization_id', orgId);
    } catch (err) {
        console.error('Error clearing Supabase history:', err);
    }

    // 2. Clear LocalStorage
    localStorage.removeItem(HISTORY_KEY(orgId));
}

