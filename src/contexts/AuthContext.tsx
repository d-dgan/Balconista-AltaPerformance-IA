import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabase';

export interface Organization {
    id: string | number;
    name: string;
    slug?: string;
    plan: string;
    maxUsers: number;
    currentUsers: number;
    logoUrl?: string | null;
}

export interface User {
    id: string | number;
    name: string;
    role: 'user' | 'admin' | 'super_admin';
    avatar?: string | null;
    email: string;
    organization: Organization | null;
}

interface AuthContextType {
    user: User | null;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    isAuthenticated: boolean;
    isLoading: boolean;
    authError: string | null;
    canCreateUsers: boolean;
    login: (email: string, password: string) => Promise<User>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isSupabaseConfigured = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    return url && url !== 'https://your-project.supabase.co' && !url.includes('your-project');
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    const isSuperAdmin = user?.role === 'super_admin';
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
    const canCreateUsers = isSuperAdmin || (user?.organization ? user.organization.currentUsers < user.organization.maxUsers : false);

    useEffect(() => {
        const checkSession = async () => {
            if (isSupabaseConfigured()) {
                // SECURITY: When Supabase is configured, ONLY trust server-validated sessions.
                // Never restore user data from localStorage — it can be tampered with.
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user) {
                        const { data: profile } = await supabase
                            .from('users')
                            .select('id, name, role, avatar_url, organization:organizations(id, name, slug, plan, max_users, current_users, logo_url)')
                            .eq('auth_id', session.user.id)
                            .single();

                        if (profile) {
                            const userData: User = {
                                id: profile.id,
                                name: profile.name,
                                role: profile.role as 'user' | 'admin' | 'super_admin',
                                avatar: profile.avatar_url,
                                email: session.user.email || '',
                                organization: profile.organization
                                    ? (Array.isArray(profile.organization)
                                        ? {
                                            id: profile.organization[0].id,
                                            name: profile.organization[0].name,
                                            slug: profile.organization[0].slug,
                                            plan: profile.organization[0].plan,
                                            maxUsers: profile.organization[0].max_users,
                                            currentUsers: profile.organization[0].current_users,
                                        }
                                        : {
                                            id: (profile.organization as any).id,
                                            name: (profile.organization as any).name,
                                            slug: (profile.organization as any).slug,
                                            plan: (profile.organization as any).plan,
                                            maxUsers: (profile.organization as any).max_users,
                                            currentUsers: (profile.organization as any).current_users,
                                            logoUrl: (profile.organization as any).logo_url ?? null,
                                        })
                                    : null,
                            };
                            setUser(userData);
                            setIsAuthenticated(true);
                        }
                    } else {
                        // No valid Supabase session — clear any stale localStorage data
                        localStorage.removeItem('expervivencia-session');
                    }
                } catch (err: any) {
                    console.log('Supabase session check failed:', err.message);
                    localStorage.removeItem('expervivencia-session');
                }
            } else {
                setAuthError("Supabase não configurado. Autenticação desativada.");
                setIsLoading(false);
                return;
            }

            setIsLoading(false);
        };

        checkSession();

        if (isSupabaseConfigured()) {
            const { data: { subscription } } = supabase.auth.onAuthStateChange(
                async (event) => {
                    if (event === 'SIGNED_OUT') {
                        setUser(null);
                        setIsAuthenticated(false);
                        localStorage.removeItem('expervivencia-session');
                    }
                }
            );

            return () => subscription?.unsubscribe();
        }
    }, []);

    const login = async (email: string, password: string): Promise<User> => {
        setAuthError(null);

        if (isSupabaseConfigured()) {
            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;

                const { data: profile, error: profileError } = await supabase
                    .from('users')
                    .select('id, name, role, avatar_url, organization:organizations(id, name, slug, plan, max_users, current_users)')
                    .eq('auth_id', data.user.id)
                    .single();

                if (profileError) throw profileError;

                const userData: User = {
                    id: profile.id,
                    name: profile.name,
                    role: profile.role as 'user' | 'admin' | 'super_admin',
                    avatar: profile.avatar_url,
                    email: data.user.email || '',
                    organization: profile.organization
                        ? (Array.isArray(profile.organization)
                            ? {
                                id: profile.organization[0].id,
                                name: profile.organization[0].name,
                                slug: profile.organization[0].slug,
                                plan: profile.organization[0].plan,
                                maxUsers: profile.organization[0].max_users,
                                currentUsers: profile.organization[0].current_users,
                            }
                            : {
                                id: (profile.organization as any).id,
                                name: (profile.organization as any).name,
                                slug: (profile.organization as any).slug,
                                plan: (profile.organization as any).plan,
                                maxUsers: (profile.organization as any).max_users,
                                currentUsers: (profile.organization as any).current_users,
                                logoUrl: (profile.organization as any).logo_url ?? null,
                            })
                        : null,
                };

                setUser(userData);
                setIsAuthenticated(true);
                localStorage.setItem('expervivencia-session', JSON.stringify(userData));
                return userData;
            } catch (err: any) {
                console.error('Supabase auth failed:', err.message);
                const errorMsg = err.message === 'Invalid login credentials' ? 'Email ou senha incorretos no banco de dados.' : err.message;
                setAuthError(errorMsg);
                throw new Error(errorMsg);
            }
        } else {
            const errorMsg = "Supabase não configurado. Login desativado por segurança.";
            setAuthError(errorMsg);
            throw new Error(errorMsg);
        }
    };


    const logout = async () => {
        if (isSupabaseConfigured()) {
            try {
                await supabase.auth.signOut();
            } catch (err: any) {
                console.log('Supabase signout error:', err.message);
            }
        }

        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('expervivencia-session');
    };

    // REMOVED: toggleRole() was a security vulnerability that allowed
    // client-side privilege escalation. Roles must only be managed
    // server-side via Supabase RLS policies.

    return (
        <AuthContext.Provider
            value={{
                user,
                setUser,
                isAdmin,
                isSuperAdmin,
                isAuthenticated,
                isLoading,
                authError,
                canCreateUsers,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
