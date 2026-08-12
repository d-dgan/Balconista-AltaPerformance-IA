import { useState, useEffect, useCallback } from 'react';
import {
    Users, Plus, Pencil, Trash2, Shield, User as UserIcon, AlertTriangle, Search, X, Check,
    Loader2, Eye, EyeOff, RefreshCw, CheckCircle2, XCircle, Mail,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { listUsers, createUser, updateUser, deleteUser, getOrgUserCount } from '../services/userService';
import type { User } from '../services/userService';
import { useLanguage } from '../contexts/LanguageContext';

// ---- Toast Component ----
interface ToastProps {
    toast: { message: string, type: 'success' | 'error' } | null;
    onClose: () => void;
}

function Toast({ toast, onClose }: ToastProps) {
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(onClose, 4000);
        return () => clearTimeout(t);
    }, [toast, onClose]);

    if (!toast) return null;

    const isSuccess = toast.type === 'success';
    return (
        <div className={`fixed bottom-6 right-6 z-100 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-sm font-medium fade-in transition-all ${isSuccess
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}>
            {isSuccess
                ? <CheckCircle2 size={18} className="shrink-0" />
                : <XCircle size={18} className="shrink-0" />
            }
            <span>{toast.message}</span>
            <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 cursor-pointer">
                <X size={14} />
            </button>
        </div>
    );
}

// ---- Skeleton Row ----
function SkeletonRow() {
    return (
        <tr className="border-b border-white/5">
            {[1, 2, 3, 4, 5].map((i) => (
                <td key={i} className="px-5 py-4">
                    <div className="h-3 rounded-full bg-white/5 animate-pulse" style={{ width: i === 1 ? '60%' : i === 5 ? '40%' : '70%' }} />
                </td>
            ))}
        </tr>
    );
}

export default function UserManagement() {
    const { user: currentUser, canCreateUsers, setUser } = useAuth();
    const { t } = useLanguage();

    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const handleTourAction = (e: any) => {
            if (e.detail?.action === 'open-user-modal') openCreateModal();
            if (e.detail?.action === 'close-user-modal') setShowModal(false);
        };
        window.addEventListener('tour:action', handleTourAction);
        return () => window.removeEventListener('tour:action', handleTourAction);
    }, [canCreateUsers]);
    const [editUser, setEditUser] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [formError, setFormError] = useState('');

    const [formData, setFormData] = useState({ name: '', email: '', role: 'user', password: '' });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

    // ---- Load Users ----
    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        const orgId = currentUser?.organization?.id;
        const { data, error } = await listUsers(orgId as string);
        if (error) {
            showToast(t('Erro ao carregar usuários.', 'Error loading users.'), 'error');
        } else {
            setUsers(data || []);
        }
        setIsLoading(false);
    }, [currentUser?.organization?.id]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // ---- Filtered List ----
    const filteredUsers = users.filter(
        (u) =>
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ---- Open Modals ----
    const openCreateModal = () => {
        if (!canCreateUsers) return;
        setEditUser(null);
        setFormData({ name: '', email: '', role: 'user', password: '' });
        setFormError('');
        setShowPassword(false);
        setShowModal(true);
    };

    const openEditModal = (u: User) => {
        setEditUser(u);
        setFormData({ name: u.name, email: u.email, role: u.role, password: '' });
        setFormError('');
        setShowModal(true);
    };

    // ---- Update Org Counter ----
    const refreshOrgCount = async (delta: number) => {
        if (!currentUser) return;
        const orgId = currentUser.organization?.id;

        // Try to get real count from DB, fallback to local delta
        const realCount = await getOrgUserCount(orgId as string);
        const newCount = realCount !== null
            ? realCount
            : (currentUser.organization?.currentUsers || 0) + delta;

        setUser((prev: any) => ({
            ...prev,
            organization: { ...prev.organization, currentUsers: newCount },
        }));
    };

    // ---- Save (Create / Edit) ----
    const handleSave = async () => {
        setFormError('');

        if (!formData.name.trim()) return setFormError(t('O nome é obrigatório.', 'Name is required.'));
        if (!formData.email.trim()) return setFormError(t('O email é obrigatório.', 'Email is required.'));
        if (!editUser && formData.password.length < 6) {
            return setFormError(t('A senha deve ter pelo menos 6 caracteres.', 'Password must be at least 6 characters.'));
        }

        setIsSaving(true);

        if (editUser) {
            const { data, error } = await updateUser(editUser.id, {
                name: formData.name,
                email: formData.email,
                role: formData.role,
            });

            if (error) {
                setFormError(error.message || t('Erro ao salvar alterações.', 'Error saving changes.'));
                setIsSaving(false);
                return;
            }

            setUsers((prev) =>
                prev.map((u) =>
                    u.id === editUser.id ? { ...u, ...data } : u
                )
            );
            showToast(t('Usuário atualizado com sucesso!', 'User updated successfully!'));
        } else {
            const { data, error } = await createUser({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: formData.role,
                organizationId: currentUser?.organization?.id,
            });

            if (error) {
                setFormError(error.message || t('Erro ao criar usuário.', 'Error creating user.'));
                setIsSaving(false);
                return;
            }

            if (data) setUsers((prev) => [...prev, data]);
            await refreshOrgCount(+1);
            showToast(t('Usuário criado! Um email de confirmação foi enviado.', 'User created! A confirmation email has been sent.'), 'success');
        }

        setIsSaving(false);
        setShowModal(false);
    };

    // ---- Delete ----
    const handleDelete = async (userId: string) => {
        setIsSaving(true);
        const { error } = await deleteUser(userId);

        if (error) {
            showToast(t('Erro ao deletar usuário.', 'Error deleting user.'), 'error');
        } else {
            setUsers((prev) => prev.filter((u) => u.id !== userId));
            await refreshOrgCount(-1);
            showToast(t('Usuário removido com sucesso.', 'User successfully removed.'), 'success');
        }

        setDeleteConfirm(null);
        setIsSaving(false);
    };

    return (
        <div className="flex-1 p-6">
            <Toast toast={toast} onClose={() => setToast(null)} />

            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div data-tour="team-info">
                        <h2 className="text-xl font-bold flex items-center gap-2" data-tour="team-title">
                            <Users size={24} className="text-primary-400" /> {t('Equipe', 'Team')}
                        </h2>
                        <p className="text-xs opacity-40 mt-1">{t('Gerencie os membros da sua organização e seus perfis de acesso.', 'Manage your organization members and their access profiles.')}</p>
                    </div>
                    {canCreateUsers && (
                        <button
                            onClick={openCreateModal}
                            data-tour="team-add-button"
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-400 transition-all shadow-lg shadow-primary-500/20 cursor-pointer"
                        >
                            <Plus size={18} /> {t('Novo Usuário', 'New User')}
                        </button>
                    )}
                </div>

                {/* Plan Limit Warning */}
                {!canCreateUsers && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6 fade-in">
                        <AlertTriangle size={18} className="text-amber-400 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-amber-400">{t('Limite de usuários atingido', 'User limit reached')}</p>
                            <p className="text-xs opacity-60 mt-0.5">
                                {t('Atualize seu plano para administrar mais usuários à organização.', 'Upgrade your plan to manage more users to the organization.')}
                            </p>
                        </div>
                    </div>
                )}

                {/* Search */}
                <div className="relative mb-6" data-tour="team-search">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t("Buscar usuário por nome ou email...", "Search user by name or email...")}
                        className="w-full pl-9 pr-4 py-3 rounded-xl glass-surface text-sm outline-none focus:ring-1 focus:ring-primary-500/40 placeholder:opacity-30 transition-all font-medium"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 cursor-pointer"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* User Table */}
                <div className="glass-surface rounded-2xl overflow-hidden border border-white/5" data-tour="team-table">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/3">
                                <th className="text-left text-[11px] font-bold opacity-40 uppercase tracking-wider px-5 py-4">{t('Usuário', 'User')}</th>
                                <th className="text-left text-[11px] font-bold opacity-40 uppercase tracking-wider px-5 py-4">{t('Email', 'Email')}</th>
                                <th className="text-left text-[11px] font-bold opacity-40 uppercase tracking-wider px-5 py-4">{t('Perfil', 'Profile')}</th>
                                <th className="text-left text-[11px] font-bold opacity-40 uppercase tracking-wider px-5 py-4">{t('Status', 'Status')}</th>
                                <th className="text-right text-[11px] font-bold opacity-40 uppercase tracking-wider px-5 py-4">{t('Ações', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-16 text-sm opacity-30">
                                        {searchQuery ? t('Nenhum usuário encontrado para essa busca.', 'No users found for this search.') : t('Nenhum usuário cadastrado.', 'No users registered.')}
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((u, i) => (
                                    <tr key={u.id} className="border-b border-white/3 hover:bg-white/3 transition-colors" data-tour={i === 0 ? "team-user-row" : undefined}>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative shrink-0">
                                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold ring-2 ring-white/5" style={{ background: `hsl(${(u.name?.charCodeAt(0) || 65) * 11 % 360}, 50%, 30%)`, color: `hsl(${(u.name?.charCodeAt(0) || 65) * 11 % 360}, 80%, 75%)` }}>
                                                        {u.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                                                    </div>
                                                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0c0c11] ${u.status === 'online' ? 'bg-emerald-400' : u.status === 'busy' ? 'bg-rose-400' : 'bg-gray-500'}`} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold flex items-center gap-2">
                                                        {u.name}
                                                        {u.id === currentUser?.id && (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-primary-500/20 text-primary-400 uppercase tracking-tight">
                                                                {t('Você', 'You')}
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-xs font-mono opacity-50">{u.email}</td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg ${u.role === 'admin'
                                                ? 'bg-accent-500/15 text-accent-400 border border-accent-500/20'
                                                : 'bg-white/5 opacity-50 border border-white/5'
                                                }`} data-tour={i === 0 ? "team-role-badge" : undefined}>
                                                {u.role === 'admin' ? <Shield size={10} /> : <UserIcon size={10} />}
                                                {u.role === 'admin' ? t('ADMINISTRADOR', 'ADMINISTRATOR') : t('ATENDENTE', 'ATTENDANT')}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="inline-flex items-center gap-2 text-[10px] font-bold" data-tour={i === 0 ? "team-status" : undefined}>
                                                <span className={`w-2 h-2 rounded-full ${u.status === 'online' ? 'bg-emerald-400 pulse-dot shadow-[0_0_8px_rgba(52,211,153,0.4)]' : u.status === 'busy' ? 'bg-rose-400' : 'bg-gray-400'}`} />
                                                {u.status === 'online' ? t('ONLINE', 'ONLINE') : u.status === 'busy' ? t('OCUPADO', 'BUSY') : t('OFFLINE', 'OFFLINE')}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1.5 justify-end">
                                                <button
                                                    onClick={() => openEditModal(u)}
                                                    className="p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer opacity-40 hover:opacity-100 bg-white/5 hover:scale-105"
                                                    title={t("Editar", "Edit")}
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                {u.id !== currentUser?.id && (
                                                    <button
                                                        onClick={() => setDeleteConfirm(u.id)}
                                                        className="p-2 rounded-xl hover:bg-rose-500/10 transition-colors cursor-pointer opacity-40 hover:opacity-100 hover:text-rose-400 bg-white/5 hover:scale-105"
                                                        title={t("Remover", "Remove")}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* User count footer */}
                {!isLoading && filteredUsers.length > 0 && (
                    <div className="flex items-center justify-between mt-4">
                        <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">
                            {filteredUsers.length} {filteredUsers.length !== 1 ? t('membros', 'members') : t('membro', 'member')} {t('na equipe', 'in the team')}
                        </p>
                        <button onClick={fetchUsers} className="text-[10px] font-bold opacity-30 hover:opacity-100 transition-opacity flex items-center gap-1.5 cursor-pointer uppercase tracking-widest">
                            <RefreshCw size={10} /> {t('Atualizar lista', 'Refresh list')}
                        </button>
                    </div>
                )}
            </div>

            {/* ---- Delete Confirmation Modal ---- */}
            {deleteConfirm && (
                <div className="fixed inset-0 modal-overlay flex items-center justify-center z-100 fade-in" onClick={() => !isSaving && setDeleteConfirm(null)}>
                    <div className="glass-panel rounded-2xl p-7 max-w-sm w-full mx-4 shadow-2xl border border-white/5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 flex items-center justify-center mb-4">
                                <Trash2 size={28} className="text-rose-400" />
                            </div>
                            <h3 className="text-lg font-bold mb-1">{t('Remover Membro', 'Remove Member')}</h3>
                            <p className="text-xs opacity-50 px-4">
                                {t('Tem certeza que deseja remover', 'Are you sure you want to remove')} <strong>{users.find((u) => u.id === deleteConfirm)?.name}</strong> {t('da equipe?', 'from the team?')}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                disabled={isSaving}
                                className="flex-1 py-3 rounded-xl glass-surface text-sm font-bold hover:bg-white/10 transition-all cursor-pointer disabled:opacity-40"
                            >
                                {t('Cancelar', 'Cancel')}
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                disabled={isSaving}
                                className="flex-1 py-3 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 transition-all cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                {t('Confirmar', 'Confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ---- Create / Edit Modal ---- */}
            {showModal && (
                <div className="fixed inset-0 modal-overlay flex items-center justify-center z-100 p-4 sm:p-6 fade-in" onClick={() => !isSaving && setShowModal(false)}>
                    <div className="glass-panel rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-white/5 flex flex-col max-h-[95vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-8 shrink-0">
                            <div>
                                <h3 className="text-xl font-black tracking-tight" data-tour="user-modal-title">{editUser ? t('Editar Perfil', 'Edit Profile') : t('Novo Membro', 'New Member')}</h3>
                                {!editUser && (
                                    <p className="text-xs opacity-40 mt-1">
                                        {t('Os dados de acesso serão enviados por email.', 'Access data will be sent by email.')}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => !isSaving && setShowModal(false)}
                                className="p-2 rounded-xl hover:bg-white/10 cursor-pointer opacity-40 hover:opacity-100 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6 overflow-y-auto pr-2 scrollbar-thin flex-1 min-h-[300px]">
                            {/* Name */}
                            <div>
                                <label className="text-[11px] font-bold opacity-40 mb-2 block uppercase tracking-wider">{t('Nome completo', 'Full name')}</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    data-tour="user-form-name"
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl glass-surface text-sm outline-none focus:ring-1 focus:ring-primary-500/40 placeholder:opacity-20 font-medium"
                                    placeholder={t("João da Silva", "John Doe")}
                                    disabled={isSaving}
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="text-[11px] font-bold opacity-40 mb-2 block uppercase tracking-wider">{t('Email profissional', 'Professional Email')}</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    data-tour="user-form-email"
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl glass-surface text-sm font-mono outline-none focus:ring-1 focus:ring-primary-500/40 placeholder:opacity-20 disabled:opacity-30"
                                    placeholder="joao@empresa.com"
                                    disabled={isSaving || !!editUser}
                                />
                                {editUser && (
                                    <p className="text-[10px] opacity-30 mt-1.5 italic">{t('O email é a identificação única e não pode ser alterado.', 'The email is the unique identification and cannot be changed.')}</p>
                                )}
                            </div>

                            {!editUser && (
                                <div>
                                    <label className="text-[11px] font-bold opacity-40 mb-2 block uppercase tracking-wider">{t('Senha temporária', 'Temporary password')}</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-4 py-3 pr-11 rounded-xl glass-surface text-sm font-mono outline-none focus:ring-1 focus:ring-primary-500/40 placeholder:opacity-20"
                                            placeholder={t("Min. 6 caracteres", "Min. 6 characters")}
                                            disabled={isSaving}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 opacity-30 hover:opacity-100 cursor-pointer"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] opacity-40 mt-2 flex items-center gap-1.5">
                                        <Mail size={12} className="text-primary-400" />
                                        {t('O usuário receberá os dados para o primeiro acesso.', 'The user will receive data for the first access.')}
                                    </p>
                                </div>
                            )}

                            {/* Role */}
                            <div>
                                <label className="text-[11px] font-bold opacity-40 mb-2 block uppercase tracking-wider">{t('Perfil de acesso', 'Access profile')}</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setFormData({ ...formData, role: 'user' })}
                                        disabled={isSaving}
                                        data-tour="user-form-role-user"
                                        className={`flex flex-col items-center gap-2 py-4 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${formData.role === 'user'
                                            ? 'bg-primary-500/15 text-primary-400 border-primary-500/30'
                                            : 'glass-surface opacity-30 border-transparent hover:opacity-60'
                                            }`}
                                    >
                                        <UserIcon size={20} /> {t('ATENDENTE', 'ATTENDANT')}
                                    </button>
                                    <button
                                        onClick={() => setFormData({ ...formData, role: 'admin' })}
                                        disabled={isSaving}
                                        data-tour="user-form-role-admin"
                                        className={`flex flex-col items-center gap-2 py-4 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${formData.role === 'admin'
                                            ? 'bg-accent-500/15 text-accent-400 border-accent-500/30'
                                            : 'glass-surface opacity-30 border-transparent hover:opacity-60'
                                            }`}
                                    >
                                        <Shield size={20} /> {t('ADM TÉCNICO', 'TECHNICAL ADMIN')}
                                    </button>
                                </div>
                                {formData.role === 'admin' && (
                                    <div className="mt-4 p-3 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-start gap-2.5">
                                        <Shield size={14} className="text-accent-400 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-accent-400 font-medium leading-relaxed">
                                            {t('Este perfil tem acesso total às configurações, incluindo conexões, faturamento e gestão de equipe.', 'This profile has full access to settings, including connections, billing and team management.')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Inline form error */}
                        <div className="shrink-0">
                            {formError && (
                                <div className="mt-6 flex items-center gap-2.5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 animate-shake">
                                    <XCircle size={16} className="shrink-0 text-rose-400" />
                                    <span className="font-medium">{formError}</span>
                                </div>
                            )}

                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                data-tour="user-form-submit"
                                className="w-full mt-7 py-4 rounded-2xl bg-primary-500 text-white text-sm font-black uppercase tracking-wider hover:bg-primary-600 transition-all cursor-pointer shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98]"
                            >
                                {isSaving ? (
                                    <><Loader2 size={18} className="animate-spin" /> {t('Processando...', 'Processing...')}</>
                                ) : editUser ? (
                                    <><Check size={18} /> {t('Aplicar Alterações', 'Apply Changes')}</>
                                ) : (
                                    <><Plus size={18} /> {t('Adicionar Membro', 'Add Member')}</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
