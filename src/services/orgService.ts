import { supabase } from './supabase';
import { createUser, updateUser } from './userService';
import { createConnection } from './connectionService';

export interface Organization {
    id: string;
    name: string;
    slug?: string;
    plan: string;
    status: string;
    max_users: number;
    current_users: number;
    max_connections: number;
    notes?: string;
    created_at: string;
    _metrics?: {
        open_tickets: number;
        connections_online: number;
        connections_total: number;
    };
}

const isSupabaseConfigured = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    return url && !url.includes('your-project');
};

// ---- Demo data ----
let demoOrgs: Organization[] = [
    {
        id: 'org_001', name: 'Farmácia São João', plan: 'professional',
        status: 'active', max_users: 10, current_users: 4,
        max_connections: 3, notes: 'Cliente desde Jan/2025',
        created_at: '2025-01-10T10:00:00Z',
        _metrics: { open_tickets: 12, connections_online: 2, connections_total: 2 },
    },
    {
        id: 'org_002', name: 'Clínica Bem Estar', plan: 'basic',
        status: 'active', max_users: 3, current_users: 2,
        max_connections: 1, notes: '',
        created_at: '2025-03-15T10:00:00Z',
        _metrics: { open_tickets: 3, connections_online: 1, connections_total: 1 },
    },
    {
        id: 'org_003', name: 'Pet Shop Patinhas', plan: 'trial',
        status: 'trial', max_users: 3, current_users: 1,
        max_connections: 1, notes: 'Trial gratuito - expira em 30/03/2026',
        created_at: '2026-02-28T10:00:00Z',
        _metrics: { open_tickets: 0, connections_online: 0, connections_total: 0 },
    },
];

// ---- List all orgs (super_admin only) ----
export async function listAllOrgs() {
    if (!isSupabaseConfigured()) {
        return { data: demoOrgs, error: null };
    }
    const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, plan, status, max_users, current_users, max_connections, notes, created_at')
        .order('created_at', { ascending: false });
    if (error) return { data: null, error };
    return { data: (data as Organization[]) || [], error: null };
}

// ---- Create org ----
export async function createOrg({ name, plan, maxUsers, maxConnections, notes }: any) {
    // Generate a URL-friendly and unique slug from the name
    const baseSlug = name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dash
        .replace(/(^-|-$)/g, ''); // Remove leading/trailing dashes

    // Append a short random string to guarantee uniqueness
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

    if (!isSupabaseConfigured()) {
        const org: Organization = {
            id: `org_${Date.now()}`,
            name, slug, plan, status: 'active',
            max_users: maxUsers, current_users: 0,
            max_connections: maxConnections, notes: notes || '',
            created_at: new Date().toISOString(),
            _metrics: { open_tickets: 0, connections_online: 0, connections_total: 0 },
        };
        demoOrgs.unshift(org);
        return { data: org, error: null };
    }
    const { data, error } = await supabase
        .from('organizations')
        .insert({
            name, slug, plan, status: 'active',
            max_users: maxUsers, current_users: 0,
            max_connections: maxConnections, notes: notes || '',
        })
        .select().single();
    
    if (error) return { data: null, error };
    return { data: data as unknown as Organization, error: null };
}

// ---- Update org ----
export async function updateOrg(id: string | number, updates: any, adminUpdates: any = null) {
    if (!isSupabaseConfigured()) {
        demoOrgs = demoOrgs.map(o => o.id === id ? { ...o, ...updates } : o);
        return { data: demoOrgs.find(o => o.id === id), error: null };
    }
    const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .select().single();
    if (error) return { data: null, error };

    if (adminUpdates && (adminUpdates.email || adminUpdates.password)) {
        // Find the admin user for this org
        const { data: usersData } = await supabase
            .from('users')
            .select('id, auth_id')
            .eq('organization_id', id)
            .eq('role', 'admin')
            .limit(1);

        if (usersData && usersData.length > 0) {
            const adminUser = usersData[0];

            if (adminUpdates.email) {
                await updateUser(adminUser.id, { email: adminUpdates.email });
            }
        }
    }

    return { data: data as Organization, error: null };
}

// ---- Suspend / reactivate org ----
export async function setOrgStatus(id: string | number, status: string) {
    return updateOrg(id, { status });
}

// ---- Delete org ----
export async function deleteOrg(id: string | number) {
    if (!isSupabaseConfigured()) {
        demoOrgs = demoOrgs.filter(o => o.id !== id);
        return { error: null };
    }
    const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);
    return { error };
}

// ---- Full onboarding: org + admin user + connection ----
export async function onboardClient({ org, adminUser, connection }: any) {
    // Step 1: Create org
    const { data: orgData, error: orgError } = await createOrg(org);
    if (orgError) return { error: orgError, step: 1 };

    // Step 2: Create admin user
    const { data: userData, error: userError } = await createUser({
        organizationId: orgData!.id,
        name: adminUser.name,
        email: adminUser.email,
        password: adminUser.password,
        role: 'admin',
    });
    if (userError) {
        // Rollback org creation since user failed
        if (isSupabaseConfigured()) {
            await supabase.from('organizations').delete().eq('id', orgData!.id);
        } else {
            demoOrgs = demoOrgs.filter(o => o.id !== orgData!.id);
        }
        return { error: userError, step: 2 };
    }

    // Step 3: Create connection (optional)
    if (connection?.instanceName) {
        const { error: connError } = await (createConnection as any)({
            organizationId: orgData!.id,
            channel: 'whatsapp',
            method: 'evolution',
            name: connection.name || 'WhatsApp Principal',
            instanceName: connection.instanceName,
            webhookUrl: connection.webhookUrl,
            createdBy: userData?.id,
        });
        if (connError) return { error: connError, step: 3, org: orgData, user: userData };
    }

    return { data: { org: orgData, user: userData }, error: null };
}
