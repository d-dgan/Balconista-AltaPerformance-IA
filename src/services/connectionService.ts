import { supabase } from './supabase';

export interface Connection {
    id: string;
    organization_id: string;
    channel: string;
    method: string;
    name: string;
    instance_name?: string | null;
    webhook_url?: string | null;
    api_config?: any;
    is_default?: boolean;
    status?: string;
    phone_number_id?: string;
    business_account_id?: string;
    created_at: string;
    organization?: {
        id: string;
        name: string;
    };
}

const isSupabaseConfigured = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    return url && url !== 'https://your-project.supabase.co' && !url.includes('your-project');
};

// ---- Mock demo connections (keyed by org) ----
const DEMO_CONNECTIONS: Record<string, Connection[]> = {
    org_001: [
        {
            id: 'conn_demo_001',
            organization_id: 'org_001',
            channel: 'whatsapp',
            method: 'evolution',
            name: 'WhatsApp Principal',
            instance_name: 'exper-chat-principal',
            webhook_url: '',
            created_at: new Date().toISOString(),
        },
    ],
};

// ---- List connections for an organization ----
export async function listOrgConnections(organizationId: string) {
    if (!isSupabaseConfigured()) {
        return { data: DEMO_CONNECTIONS[organizationId] || [], error: null };
    }

    const { data, error } = await supabase
        .from('connections')
        .select('id, organization_id, channel, method, name, instance_name, webhook_url, api_config, is_default, status, phone_number_id, business_account_id, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });

    if (error) return { data: null, error };
    return { data: (data as Connection[]) || [], error: null };
}

// ---- List ALL connections (admin only) ----
export async function listAllConnections() {
    if (!isSupabaseConfigured()) {
        return { data: Object.values(DEMO_CONNECTIONS).flat(), error: null };
    }

    const { data, error } = await supabase
        .from('connections')
        .select('id, organization_id, channel, method, name, instance_name, status, is_default, created_at, organization:organizations(id, name)')
        .order('created_at', { ascending: true });

    if (error) return { data: null, error };
    const formattedData = (data as any[]).map(conn => ({
        ...conn,
        organization: Array.isArray(conn.organization) ? conn.organization[0] : conn.organization
    }));
    return { data: (formattedData as Connection[]) || [], error: null };
}

export async function createConnection({ organizationId, channel, method, name, instanceName, webhookUrl, apiConfig, createdBy }: any) {
    if (!isSupabaseConfigured()) {
        const conn: Connection = {
            id: `conn_${Date.now()}`,
            organization_id: organizationId,
            channel,
            method,
            name,
            instance_name: instanceName,
            webhook_url: webhookUrl,
            api_config: apiConfig || null,
            created_at: new Date().toISOString(),
        };
        // Persist to demo store
        if (!DEMO_CONNECTIONS[organizationId]) DEMO_CONNECTIONS[organizationId] = [];
        DEMO_CONNECTIONS[organizationId].push(conn);
        return { data: conn, error: null };
    }

    // --- HARD LIMIT VALIDATION ---
    if (organizationId) {
        const { data: orgData } = await supabase
            .from('organizations')
            .select('max_connections')
            .eq('id', organizationId)
            .single();

        if (orgData) {
            const { count } = await supabase
                .from('connections')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', organizationId);

            if (count !== null && count >= orgData.max_connections) {
                return { data: null, error: new Error('⛔ Limite do plano atingido: O número máximo de conexões já foi alcançado para esta organização.') };
            }
        }
    }

    const payload: any = {
        organization_id: organizationId,
        channel,
        method,
        name,
        instance_name: instanceName || null,
        webhook_url: webhookUrl || null,
        created_by: createdBy || null,
    };

    if (apiConfig !== undefined && apiConfig !== null) {
        payload.api_config = apiConfig;
    }

    const { data, error } = await supabase
        .from('connections')
        .insert(payload)
        .select()
        .single();

    if (error) return { data: null, error };
    return { data: data as Connection, error: null };
}

// ---- Delete connection (admin) ----
export async function deleteConnection(connectionId: string) {
    if (!isSupabaseConfigured()) {
        for (const orgId in DEMO_CONNECTIONS) {
            DEMO_CONNECTIONS[orgId] = DEMO_CONNECTIONS[orgId].filter(c => c.id !== connectionId);
        }
        return { error: null };
    }

    const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId);

    return { error };
}

// ---- List organizations (admin — for the "assign to client" dropdown) ----
export async function listOrganizations() {
    if (!isSupabaseConfigured()) {
        return {
            data: [
                { id: 'org_001', name: 'Exper Chat (Demo)' },
                { id: 'org_002', name: 'Farmácia Demo' },
            ],
            error: null,
        };
    }

    const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name');

    if (error) return { data: null, error };
    return { data: data || [], error: null };
}
