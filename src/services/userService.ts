import { supabase } from './supabase';
import { orgUsers } from '../data/mockData';

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    avatar: string;
}

const isSupabaseConfigured = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    return url && url !== 'https://your-project.supabase.co' && !url.includes('your-project');
};

// ---- List Users ----
export async function listUsers(organizationId: string | number) {
    if (!isSupabaseConfigured()) {
        return { data: orgUsers as unknown as User[], error: null };
    }

    const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, status, avatar_url')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });

    if (error) return { data: null, error };

    const mapped: User[] = (data || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role || 'user',
        status: u.status || 'offline',
        avatar: u.avatar_url || `https://i.pravatar.cc/150?img=${(u.name?.charCodeAt(0) || 10) % 70}`,
    }));

    return { data: mapped, error: null };
}

export async function createUser({ name, email, password, role, organizationId }: any) {
    if (!isSupabaseConfigured()) {
        const newUser: User = {
            id: `usr_${Date.now()}`,
            name,
            email,
            role,
            status: 'offline',
            avatar: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
        };
        return { data: newUser, error: null };
    }

    // --- HARD LIMIT VALIDATION ---
    if (organizationId) {
        const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('max_users')
            .eq('id', organizationId)
            .single();

        if (orgData) {
            const { count } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', organizationId);

            if (count !== null && count >= orgData.max_users) {
                return { data: null, error: new Error('⛔ Limite do plano atingido: O número máximo de usuários já foi alcançado.') };
            }
        }
    }

    // 1. Create a specialized auth client that does NOT persist the session
    // This prevents the Super Admin from being logged out when creating a new client
    const { createClient } = await import('@supabase/supabase-js');
    const adminAuthClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        }
    );

    // 2. Create Supabase Auth user using the isolated client
    const { data: authData, error: authError } = await adminAuthClient.auth.signUp({
        email,
        password,
        options: {
            data: { name, role },
        },
    });

    if (authError) {
        if (authError.message === 'User already registered') {
            authError.message = 'Este email já está em uso por outro usuário.';
        }
        return { data: null, error: authError };
    }

    const authUserId = authData.user?.id;
    if (!authUserId) {
        return { data: null, error: new Error('Falha ao criar usuário no Auth.') };
    }

    // 3. Insert profile in public.users using the MAIN client (which is still Super Admin)
    const { data: profile, error: profileError } = await supabase
        .from('users')
        .insert({
            auth_id: authUserId,
            name,
            email,
            role,
            organization_id: organizationId,
            status: 'offline',
        })
        .select()
        .single();

    if (profileError) return { data: null, error: profileError };

    // Update organizations current_users tally if out of sync
    const newTotal = await getOrgUserCount(organizationId);
    if (newTotal !== null) {
        await supabase.from('organizations').update({ current_users: newTotal }).eq('id', organizationId);
    }

    return {
        data: {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
            status: profile.status || 'offline',
            avatar: profile.avatar_url || `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
        } as User,
        error: null,
    };
}

// ---- Update User ----
export async function updateUser(userId: string | number, { name, email, role }: any) {
    if (!isSupabaseConfigured()) {
        return { data: { id: userId, name, email, role, status: 'offline' } as any, error: null };
    }

    const { data, error } = await supabase
        .from('users')
        .update({ name, email, role })
        .eq('id', userId)
        .select()
        .single();

    if (error) return { data: null, error };

    return {
        data: {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            status: data.status || 'offline',
            avatar: data.avatar_url,
        } as User,
        error: null,
    };
}

// ---- Delete User ----
export async function deleteUser(userId: string | number) {
    if (!isSupabaseConfigured()) {
        return { error: null };
    }

    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

    return { error };
}

// ---- Fetch updated org user count ----
export async function getOrgUserCount(organizationId: string | number) {
    if (!isSupabaseConfigured()) return null;

    const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

    if (error) return null;
    return count;
}
