import { useState, useEffect, useCallback } from 'react';
import {
    Zap, Building2, Users, Plug, Ticket, CheckCircle2, XCircle,
    Plus, Edit2, X, Loader2, ArrowLeft, ArrowRight, Check,
    RefreshCw, Eye, EyeOff, Shield, Copy, Search,
    Crown, Power, Settings, Layers, UserPlus, Globe, Activity, ShieldAlert, Trash2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { listAllOrgs, updateOrg, setOrgStatus, deleteOrg, onboardClient } from '../services/orgService';
import type { Organization } from '../services/orgService';

// ==========================================
// Constants & Types
// ==========================================

type PlanType = 'basic' | 'professional' | 'enterprise' | 'trial';

interface PlanInfo {
    label: string;
    color: string;
    bg: string;
    border: string;
}

const getPlanColors = (t: any): Record<PlanType, PlanInfo> => ({
    basic: { label: t('Básico', 'Basic'), color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
    professional: { label: t('Profissional', 'Professional'), color: 'text-primary-400', bg: 'bg-primary-500/10', border: 'border-primary-500/20' },
    enterprise: { label: t('Empresarial', 'Enterprise'), color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    trial: { label: t('Teste', 'Trial'), color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
});

const getStatusInfo = (t: any): Record<string, { label: string, dot: string, color: string }> => ({
    active: { label: t('Ativo', 'Active'), dot: 'bg-emerald-400', color: 'text-emerald-400' },
    suspended: { label: t('Suspenso', 'Suspended'), dot: 'bg-rose-400', color: 'text-rose-400' },
    trial: { label: t('Teste', 'Trial'), dot: 'bg-amber-400', color: 'text-amber-400' },
});

const getGlobalPlans = () => {
    const stored = localStorage.getItem('tella_global_plans');
    if (stored) {
        try { return JSON.parse(stored); } catch (e) { }
    }
    return {
        basic: { max_users: 3, max_connections: 1, features: { campanhas: false, encarte: false, api_access: false, export: false, academy: true } },
        professional: { max_users: 5, max_connections: 5, features: { campanhas: true, encarte: false, api_access: false, export: true, academy: true } },
        enterprise: { max_users: 999, max_connections: 99, features: { campanhas: true, encarte: true, api_access: true, export: true, academy: true } },
        trial: { max_users: 3, max_connections: 1, features: {} },
    };
};

const getTabs = (t: any) => [
    { id: 'clients', label: t('Clientes', 'Clients'), icon: Building2 },
    { id: 'onboarding', label: t('Novo Cliente', 'New Client'), icon: UserPlus },
    { id: 'plans', label: t('Planos', 'Plans'), icon: Layers },
];

// ==========================================
// Progress Bar
// ==========================================
function UsageBar({ current, max, t }: { current: number, max: number, t: any }) {
    const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
    const color = pct >= 90 ? 'bg-rose-400' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-400';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden text-slate-800 dark:text-white">
                <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] font-mono opacity-50 shrink-0 dark:text-white/50">{current}/{max >= 99 ? '∞' : max}</span>
        </div>
    );
}

// ==========================================
// Edit Org Modal
// ==========================================
interface EditOrgModalProps {
    org: Organization;
    onClose: () => void;
    onSave: (id: string, updates: any, adminUpdates: any) => Promise<void>;
}

function EditOrgModal({ org, onClose, onSave }: EditOrgModalProps) {
    const { t } = useLanguage();
    const PLAN_COLORS = getPlanColors(t);
    const [form, setForm] = useState({
        name: org.name,
        plan: org.plan as PlanType,
        max_users: org.max_users,
        max_connections: org.max_connections,
        notes: org.notes || '',
        adminEmail: '',
        adminPassword: '',
    });
    const [saving, setSaving] = useState(false);

    const handlePlanChange = (plan: PlanType) => {
        const globalPlans = getGlobalPlans() as any;
        const defaults = globalPlans[plan] || globalPlans.basic;
        setForm(f => ({ ...f, plan, max_users: defaults.max_users, max_connections: defaults.max_connections }));
    };

    const save = async () => {
        setSaving(true);
        const adminUpdates: any = {};
        if (form.adminEmail) adminUpdates.email = form.adminEmail;
        if (form.adminPassword) adminUpdates.password = form.adminPassword;

        await onSave(org.id, {
            name: form.name,
            plan: form.plan,
            max_users: form.max_users,
            max_connections: form.max_connections,
            notes: form.notes,
        }, Object.keys(adminUpdates).length > 0 ? adminUpdates : null);
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md fade-in" onClick={onClose}>
            <div className="w-full max-w-md bg-void-900/95 backdrop-blur-2xl rounded-3xl p-8 m-4 border border-white/10 shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg flex items-center gap-2.5 text-slate-800 dark:text-white">
                        <Edit2 size={20} className="text-primary-400" /> {t('Editar Organização', 'Edit Organization')}
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 opacity-40 hover:opacity-100 cursor-pointer transition-all dark:text-white/40"><X size={20} /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-[11px] font-bold opacity-40 block mb-1.5 uppercase tracking-wider dark:text-white/40">{t('Nome do Cliente', 'Client Name')}</label>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl glass-surface text-sm outline-none focus:ring-1 focus:ring-primary-500/40 font-medium text-slate-800 dark:text-white" />
                    </div>
                    <div>
                        <label className="text-[11px] font-bold opacity-40 block mb-2 uppercase tracking-wider dark:text-white/40">{t('Plano Atual', 'Current Plan')}</label>
                        <div className="flex gap-2 flex-wrap">
                            {(['basic', 'professional', 'enterprise'] as PlanType[]).map((key) => {
                                const p = PLAN_COLORS[key];
                                return (
                                    <button key={key} onClick={() => handlePlanChange(key)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer border transition-all ${form.plan === key ? `${p.bg} ${p.color} ${p.border}` : 'glass-surface opacity-30 border-transparent hover:opacity-100 dark:text-white/30 dark:hover:text-white/60'}`}>
                                        {p.label.toUpperCase()}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] font-bold opacity-40 block mb-1.5 uppercase tracking-wider dark:text-white/40">{t('Limite Usuários', 'User Limit')}</label>
                            <input type="number" value={form.max_users} onChange={e => setForm(f => ({ ...f, max_users: +e.target.value }))}
                                className="w-full px-4 py-3 rounded-xl glass-surface text-sm font-mono outline-none focus:ring-1 focus:ring-primary-500/40 text-slate-800 dark:text-white" />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold opacity-40 block mb-1.5 uppercase tracking-wider dark:text-white/40">{t('Limite Conexões', 'Connection Limit')}</label>
                            <input type="number" value={form.max_connections} onChange={e => setForm(f => ({ ...f, max_connections: +e.target.value }))}
                                className="w-full px-4 py-3 rounded-xl glass-surface text-sm font-mono outline-none focus:ring-1 focus:ring-primary-500/40 text-slate-800 dark:text-white" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold opacity-40 block mb-1.5 uppercase tracking-wider dark:text-white/40">{t('Notas Internas', 'Internal Notes')}</label>
                        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            rows={2} className="w-full px-4 py-3 rounded-xl glass-surface text-sm outline-none focus:ring-1 focus:ring-primary-500/40 resize-none placeholder:opacity-20 text-slate-800 dark:text-white" />
                    </div>

                    <div className="h-px bg-white/5 my-2" />

                    <div className="p-4 rounded-2xl bg-white/3 border border-white/5 space-y-3">
                        <h4 className="text-[10px] font-bold flex items-center gap-1.5 opacity-40 uppercase tracking-widest leading-none dark:text-white/40"><Shield size={12} className="text-primary-400" /> {t('Acesso do Administrador', 'Administrator Access')}</h4>
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <input type="email" value={form.adminEmail} onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))} placeholder={t("Novo e-mail (deixe em branco p/ manter)", "New email (leave blank to keep current)")}
                                    className="w-full px-4 py-2.5 rounded-xl glass-surface text-xs font-mono outline-none focus:ring-1 focus:ring-primary-500/40 placeholder:opacity-20 text-slate-800 dark:text-white" />
                            </div>
                            <div>
                                <input type="text" value={form.adminPassword} onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))} placeholder={t("Nova senha (deixe em branco p/ manter)", "New password (leave blank to keep current)")}
                                    className="w-full px-4 py-2.5 rounded-xl glass-surface text-xs font-mono outline-none focus:ring-1 focus:ring-primary-500/40 placeholder:opacity-20 text-slate-800 dark:text-white" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 mt-7">
                    <button onClick={onClose} className="flex-1 py-3.5 rounded-xl glass-surface text-sm font-bold opacity-40 hover:opacity-100 cursor-pointer transition-all dark:text-white/40 dark:hover:text-white/80">{t('CANCELAR', 'CANCEL')}</button>
                    <button onClick={save} disabled={saving}
                        className="flex-1 py-3.5 rounded-xl bg-primary-500 text-white text-sm font-bold cursor-pointer hover:bg-primary-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={18} />}
                        {saving ? t('PROCESSANDO...', 'PROCESSING...') : t('SALVAR', 'SAVE')}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ==========================================
// MÓDULO 1: Gestão de Clientes
// ==========================================
function OrgsList({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
    const { t } = useLanguage();
    const PLAN_COLORS = getPlanColors(t);
    const STATUS_INFO = getStatusInfo(t);
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        const { data, error } = await listAllOrgs();
        if (!error) setOrgs(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSave = async (id: string, updates: any, adminUpdates: any) => {
        const { error } = await updateOrg(id, updates, adminUpdates);
        if (error) { showToast(t('Erro ao salvar.', 'Error saving.'), 'error'); return; }
        setOrgs(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
        setEditingOrg(null);
        showToast(t('Organização atualizada!', 'Organization updated!'));
    };

    const handleToggleStatus = async (org: Organization) => {
        const newStatus = org.status === 'active' || org.status === 'trial' ? 'suspended' : 'active';
        const action = newStatus === 'suspended' ? t('SUSPENDER', 'SUSPEND') : t('REATIVAR', 'REACTIVATE');
        if (!confirm(`${action} "${org.name}"?`)) return;
        const { error } = await setOrgStatus(org.id, newStatus);
        if (error) { showToast(t('Erro ao alterar status.', 'Error changing status.'), 'error'); return; }
        setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, status: newStatus } : o));
        showToast(`${org.name} ${newStatus === 'suspended' ? t('suspenso', 'suspended') : t('reativado', 'reactivated')}.`);
    };

    const handleDeleteOrg = async (org: Organization) => {
        if (!confirm(t(`⚠️ ATENÇÃO: Esta ação é PERMANENTE.\nDeseja realmente EXCLUIR a organização "${org.name}" e TODOS os seus dados (usuários, mensagens, conexões)?`, `⚠️ ATTENTION: This action is PERMANENT.\nDo you really want to DELETE organization "${org.name}" and ALL its data (users, messages, connections)?`))) return;
        
        const { error } = await deleteOrg(org.id);
        if (error) {
            showToast(t('Erro ao excluir organização.', 'Error deleting organization.'), 'error');
            return;
        }
        
        setOrgs(prev => prev.filter(o => o.id !== org.id));
        showToast(t('Organização removida com sucesso.', 'Organization successfully removed.'));
    };

    const totalActive = orgs.filter(o => o.status === 'active').length;
    const totalUsers = orgs.reduce((s, o) => s + (o.current_users || 0), 0);

    const filteredOrgs = orgs.filter(org => {
        const query = searchTerm.toLowerCase().trim();
        if (!query) return true;
        return (
            org.name.toLowerCase().includes(query) ||
            (org.notes && org.notes.toLowerCase().includes(query)) ||
            org.id.toLowerCase().includes(query)
        );
    });

    return (
        <div className="fade-in space-y-6">
            {editingOrg && (
                <EditOrgModal org={editingOrg} onClose={() => setEditingOrg(null)} onSave={handleSave} />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                    { label: t('Clientes Ativos', 'Active Clients'), value: totalActive, icon: Building2, color: 'text-primary-400', bg: 'bg-primary-500/10' },
                    { label: t('Usuários Totais', 'Total Users'), value: totalUsers, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                ].map(stat => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="glass-surface rounded-2xl p-5 flex items-center gap-4 border border-white/5 relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-5 transition-transform group-hover:scale-110 ${stat.color}`}>
                                <Icon size={96} />
                            </div>
                            <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center shrink-0`}>
                                <Icon size={24} className={stat.color} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">{stat.value}</p>
                                <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest mt-0.5 dark:text-white/30">{stat.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-xs font-bold opacity-40 uppercase tracking-widest flex items-center gap-2 dark:text-white/40">
                    <Layers size={14} className="text-primary-400" /> {t('organizações vinculadas', 'linked organizations')} ({filteredOrgs.length})
                </h3>
                
                <div className="flex items-center gap-3">
                    <div className="relative group flex-1 sm:flex-none">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-50 transition-all text-slate-800 dark:text-white" />
                        <input 
                            type="text" 
                            placeholder={t('Buscar cliente...', 'Search client...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 rounded-xl glass-surface text-xs outline-none focus:ring-1 focus:ring-primary-500/40 w-full sm:w-64 transition-all text-slate-800 dark:text-white"
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/10 opacity-30 hover:opacity-100 transition-all cursor-pointer dark:text-white"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    <button onClick={load} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer opacity-40 hover:opacity-100 transition-all font-bold text-[10px] uppercase tracking-widest dark:text-white/40">
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                        {loading ? t('Atualizando...', 'Updating...') : t('Sincronizar', 'Sync')}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => <div key={i} className="glass-surface rounded-2xl h-24 shimmer border border-white/5" />)}
                </div>
            ) : filteredOrgs.length === 0 ? (
                <div className="text-center py-20 glass-surface rounded-2xl opacity-30 border border-white/5 border-dashed dark:text-white/30">
                    <Search size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-sm font-bold uppercase tracking-widest">{searchTerm ? t('Nenhum resultado encontrado', 'No results found') : t('Nenhuma organização cadastrada', 'No organizations registered')}</p>
                    <p className="text-xs mt-1">{searchTerm ? t('Tente ajustar sua busca.', 'Try adjusting your search.') : t('Clique em "Novo Cliente" para começar.', 'Click on "New Client" to start.')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredOrgs.map(org => {
                        const plan = PLAN_COLORS[org.plan as PlanType] || PLAN_COLORS.basic;
                        const st = STATUS_INFO[org.status] || STATUS_INFO.active;
                        const isSuspended = org.status === 'suspended';
                        return (
                            <div key={org.id} className={`glass-surface rounded-2xl p-5 border border-white/5 transition-all hover:bg-white/5 group ${isSuspended ? 'opacity-40 grayscale' : ''}`}>
                                <div className="flex items-start gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center shrink-0 border border-primary-500/10 shadow-inner">
                                        <Building2 size={24} className="text-primary-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="text-sm font-bold truncate leading-none text-slate-800 dark:text-white">{org.name}</h4>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${plan.bg} ${plan.color} ${plan.border}`}>{plan.label.toUpperCase()}</span>
                                            <span className={`flex items-center gap-1.5 text-[9px] font-bold ${st.color}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${st.dot} ${org.status === 'active' ? 'pulse-dot' : ''}`} />{st.label.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 mt-3">
                                            {org.notes && (
                                                <p className="text-[10px] opacity-30 font-medium truncate flex items-center gap-1.5 dark:text-white/30">
                                                    <Settings size={12} /> {org.notes}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 self-center">
                                        <button onClick={() => setEditingOrg(org)}
                                            className="p-3 rounded-xl hover:bg-white/10 cursor-pointer opacity-30 hover:opacity-100 transition-all bg-white/5 hover:scale-105 dark:text-white/30 text-slate-800" title={t("Editar", "Edit")}>
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleToggleStatus(org)}
                                            className={`p-3 rounded-xl cursor-pointer transition-all bg-white/5 hover:scale-105 ${isSuspended ? 'hover:bg-emerald-500/10 opacity-30 hover:opacity-100 hover:text-emerald-400' : 'hover:bg-rose-500/10 opacity-30 hover:opacity-100 hover:text-rose-400'}`}
                                            title={isSuspended ? t('Reativar', 'Reactivate') : t('Suspender', 'Suspend')}>
                                            <Power size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteOrg(org)}
                                            className="p-3 rounded-xl hover:bg-rose-500/10 cursor-pointer opacity-30 hover:opacity-100 transition-all bg-white/5 hover:scale-105 hover:text-rose-500 dark:text-white/30" title={t("Excluir", "Delete")}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ==========================================
// MÓDULO 2: Onboarding Wizard
// ==========================================
function generatePassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const N8N_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

function OnboardingWizard({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
    const { t } = useLanguage();
    const PLAN_COLORS = getPlanColors(t);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [showPass, setShowPass] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

    const [org, setOrg] = useState({ name: '', plan: 'professional' as PlanType, max_users: getGlobalPlans().professional.max_users, max_connections: getGlobalPlans().professional.max_connections, notes: '' });
    const [admin, setAdmin] = useState({ name: '', email: '', password: generatePassword() });
    const [conn, setConn] = useState({ name: t('WhatsApp Principal', 'Main WhatsApp'), instanceName: '', webhookUrl: N8N_URL ? `${N8N_URL}/evolution` : '' });

    const handlePlanSelect = (plan: PlanType) => {
        const globalPlans = getGlobalPlans() as any;
        const defaults = globalPlans[plan] || globalPlans.basic;
        setOrg(o => ({ ...o, plan, max_users: defaults.max_users, max_connections: defaults.max_connections }));
    };

    const validate = () => {
        if (step === 1 && !org.name.trim()) return t('Informe o nome da organização.', 'Enter the organization name.');
        if (step === 2 && (!admin.name.trim() || !admin.email.trim())) return t('Nome e email são obrigatórios.', 'Name and email are required.');
        return '';
    };

    const handleNext = () => {
        const err = validate();
        if (err) { setError(err); return; }
        setError('');
        if (step < 2) setStep(s => s + 1);
        else handleFinish();
    };

    const handleFinish = async () => {
        setLoading(true);
        setError('');
        const { data, error: err } = await onboardClient({
            org: { name: org.name, plan: org.plan, maxUsers: org.max_users, maxConnections: org.max_connections, notes: org.notes },
            adminUser: { name: admin.name, email: admin.email, password: admin.password },
            connection: null,
        });
        setLoading(false);
        if (err) { setError(`${t('Erro no passo', 'Error in step')} ${err.step || '?'}: ${err.message || t('Falha desconhecida.', 'Unknown failure.')}`); return; }
        setResult(data);
        setStep(3);
        showToast(`✅ "${org.name}" ${t('criado com sucesso!', 'created successfully!')}`);
    };

    const copyCredentials = () => {
        const text = `${t('🏢 Organização', '🏢 Organization')}: ${org.name}\n${t('📧 Email Admin', '📧 Admin Email')}: ${admin.email}\n${t('🔑 Senha', '🔑 Password')}: ${admin.password}\n\n${t('Acesse', 'Access')}: ${window.location.origin}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const reset = () => {
        setStep(1); setResult(null); setError('');
        setOrg({ name: '', plan: 'professional', max_users: getGlobalPlans().professional.max_users, max_connections: getGlobalPlans().professional.max_connections, notes: '' });
        setAdmin({ name: '', email: '', password: generatePassword() });
        setConn({ name: t('WhatsApp Principal', 'Main WhatsApp'), instanceName: '', webhookUrl: N8N_URL ? `${N8N_URL}/evolution` : '' });
    };

    const stepsNames = [t('ORGANIZAÇÃO', 'ORGANIZATION'), t('ADMINISTRADOR', 'ADMINISTRATOR'), t('CONCLUÍDO', 'COMPLETED')];

    return (
        <div className="fade-in max-w-xl mx-auto py-4">
            <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2 scrollbar-hide">
                {stepsNames.map((s, i) => {
                    const n = i + 1;
                    const done = step > n;
                    const active = step === n;
                    return (
                        <div key={n} className="flex items-center gap-3 flex-1 min-w-max last:flex-none">
                            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold shrink-0 transition-all border ${done ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : active ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-white/5 border-white/5 opacity-30 dark:text-white/30'}`}>
                                {done ? <Check size={16} /> : n}
                            </div>
                            <span className={`text-[10px] font-bold tracking-widest whitespace-nowrap transition-all ${active ? 'opacity-100 dark:text-white' : done ? 'text-emerald-400' : 'opacity-20 dark:text-white/20'}`}>{s}</span>
                            {i < stepsNames.length - 1 && <div className="w-8 h-px bg-white/10 mx-2" />}
                        </div>
                    );
                })}
            </div>

            <div className="bg-void-900/95 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />

                {step === 1 && (
                    <div className="space-y-6 fade-in relative z-10 text-slate-800 dark:text-white">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                                <Building2 size={20} className="text-primary-400" />
                            </div>
                            <h3 className="text-lg font-bold uppercase tracking-tight">{t('Dados da Organização', 'Organization Data')}</h3>
                        </div>
                        <div>
                            <label className="text-[11px] font-bold opacity-40 block mb-2 uppercase tracking-wider dark:text-white/40">{t('Nome da Empresa / Cliente *', 'Company Name / Client *')}</label>
                            <input value={org.name} onChange={e => setOrg(o => ({ ...o, name: e.target.value }))}
                                placeholder={t("Ex: Matriz Tecnologia", "Ex: Matrix Technology")}
                                className="w-full px-5 py-4 rounded-2xl glass-surface text-sm outline-none focus:ring-1 focus:ring-primary-500/40 placeholder:opacity-20 font-medium" />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold opacity-40 block mb-2.5 uppercase tracking-wider dark:text-white/40">{t('Selecione o Plano *', 'Select Plan *')}</label>
                            <div className="grid grid-cols-3 gap-3">
                                {(['basic', 'professional', 'enterprise'] as PlanType[]).map(p => {
                                    const pd = PLAN_COLORS[p];
                                    return (
                                        <button key={p} onClick={() => handlePlanSelect(p)}
                                            className={`flex flex-col items-center gap-2 py-4 rounded-2xl text-[10px] font-bold cursor-pointer border transition-all ${org.plan === p ? `${pd.bg} ${pd.color} ${pd.border} shadow-lg shadow-black/20` : 'glass-surface opacity-30 border-transparent hover:opacity-100 dark:text-white/30 dark:hover:text-white/60'}`}>
                                            <Crown size={18} />
                                            {pd.label.toUpperCase()}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[11px] font-bold opacity-40 block mb-2 uppercase tracking-wider dark:text-white/40">{t('Máx. Usuários', 'Max Users')}</label>
                                <input type="number" value={org.max_users} onChange={e => setOrg(o => ({ ...o, max_users: +e.target.value }))}
                                    className="w-full px-5 py-4 rounded-2xl glass-surface text-sm font-mono outline-none focus:ring-1 focus:ring-primary-500/40" />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold opacity-40 block mb-2 uppercase tracking-wider dark:text-white/40">{t('Máx. Conexões', 'Max Connections')}</label>
                                <input type="number" value={org.max_connections} onChange={e => setOrg(o => ({ ...o, max_connections: +e.target.value }))}
                                    className="w-full px-5 py-4 rounded-2xl glass-surface text-sm font-mono outline-none focus:ring-1 focus:ring-primary-500/40" />
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 fade-in relative z-10 text-slate-800 dark:text-white">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                                <Shield size={20} className="text-primary-400" />
                            </div>
                            <h3 className="text-lg font-bold uppercase tracking-tight">{t('Administrador do Painel', 'Panel Administrator')}</h3>
                        </div>
                        <div>
                            <label className="text-[11px] font-bold opacity-40 block mb-2 uppercase tracking-wider dark:text-white/40">{t('Nome Completo *', 'Full Name *')}</label>
                            <input value={admin.name} onChange={e => setAdmin(a => ({ ...a, name: e.target.value }))}
                                placeholder={t("Admin do Cliente", "Client Admin")}
                                className="w-full px-5 py-4 rounded-2xl glass-surface text-sm outline-none focus:ring-1 focus:ring-primary-500/40 placeholder:opacity-20 font-medium" />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold opacity-40 block mb-2 uppercase tracking-wider dark:text-white/40">{t('E-mail de Acesso *', 'Access Email *')}</label>
                            <input type="email" value={admin.email} onChange={e => setAdmin(a => ({ ...a, email: e.target.value }))}
                                placeholder="admin@cliente.com"
                                className="w-full px-5 py-4 rounded-2xl glass-surface text-sm font-mono outline-none focus:ring-1 focus:ring-primary-500/40 placeholder:opacity-20" />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold opacity-40 block mb-2 uppercase tracking-wider dark:text-white/40">{t('Senha Temporária', 'Temporary Password')}</label>
                            <div className="relative">
                                <input type={showPass ? 'text' : 'password'} value={admin.password}
                                    onChange={e => setAdmin(a => ({ ...a, password: e.target.value }))}
                                    className="w-full px-5 py-4 pr-24 rounded-2xl glass-surface text-sm font-mono outline-none focus:ring-1 focus:ring-primary-500/40" />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1.5">
                                    <button type="button" onClick={() => setShowPass(s => !s)}
                                        className="p-2 rounded-xl opacity-30 hover:opacity-100 hover:bg-white/5 cursor-pointer transition-all dark:text-white/30 dark:hover:text-white/60">
                                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                    <button type="button" onClick={() => setAdmin(a => ({ ...a, password: generatePassword() }))}
                                        className="p-2 rounded-xl opacity-30 hover:opacity-100 hover:bg-white/5 cursor-pointer transition-all dark:text-white/30 dark:hover:text-white/60" title={t("Gerar nova senha", "Generate new password")}>
                                        <RefreshCw size={16} />
                                    </button>
                                </div>
                            </div>
                            <p className="text-[10px] opacity-30 mt-2 font-medium italic dark:text-white/30">{t('Copie estes dados — eles são necessários para o primeiro acesso.', 'Copy this data — it is required for the first access.')}</p>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="text-center fade-in relative z-10 text-slate-800 dark:text-white">
                        <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/10">
                            <CheckCircle2 size={40} className="text-emerald-400" />
                        </div>
                        <h3 className="font-bold text-xl mb-2">{t('Cliente configurado!', 'Client configured!')} 🎉</h3>
                        <p className="text-xs opacity-50 mb-8 font-medium dark:text-white/50">{t('As credenciais foram geradas. Compartilhe com o cliente:', 'Credentials have been generated. Share them with the client:')}</p>

                        <div className="glass-surface rounded-2xl p-6 text-left mb-8 space-y-4 border border-white/5 bg-white/3">
                            <div className="flex justify-between items-center group/item text-slate-800 dark:text-white">
                                <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest dark:text-white/30">{t('Organização', 'Organization')}</span>
                                <span className="text-sm font-bold border-b border-primary-500/30 pb-0.5">{org.name}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-800 dark:text-white">
                                <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest dark:text-white/30">{t('Plano', 'Plan')}</span>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${PLAN_COLORS[org.plan]?.bg} ${PLAN_COLORS[org.plan]?.color} ${PLAN_COLORS[org.plan]?.border}`}>{PLAN_COLORS[org.plan]?.label.toUpperCase()}</span>
                            </div>
                            <div className="h-px bg-white/5" />
                            <div className="flex justify-between items-center text-slate-800 dark:text-white">
                                <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest leading-none dark:text-white/30">{t('Usuário Admin', 'Admin User')}</span>
                                <span className="text-xs font-mono font-bold opacity-80">{admin.email}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-800 dark:text-white">
                                <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest leading-none dark:text-white/30">{t('Senha Master', 'Master Password')}</span>
                                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">{admin.password}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={copyCredentials}
                                className={`flex-1 py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2.5 cursor-pointer transition-all ${copied ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-primary-500 text-white hover:bg-primary-400 shadow-lg shadow-primary-500/25'}`}>
                                {copied ? <><Check size={18} /> {t('COPIADO', 'COPIED')}</> : <><Copy size={18} /> {t('COPIAR DADOS', 'COPY DATA')}</>}
                            </button>
                            <button onClick={reset}
                                className="flex-[0.6] py-4 rounded-2xl glass-surface text-sm font-bold opacity-40 hover:opacity-100 cursor-pointer transition-all flex items-center justify-center gap-2 bg-white/5 border border-white/5 dark:text-white/40 dark:hover:text-white/80">
                                <Plus size={18} /> {t('NOVO', 'NEW')}
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-3 p-4 mt-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 fade-in animate-shake">
                        <XCircle size={18} className="shrink-0 text-rose-500" /> <span className="font-semibold">{error}</span>
                    </div>
                )}

                {step < 3 && (
                    <div className="flex gap-3 mt-10">
                        {step > 1 && (
                            <button onClick={() => { setStep(s => s - 1); setError(''); }}
                                className="px-6 py-4 rounded-2xl glass-surface text-sm font-bold opacity-40 hover:opacity-100 cursor-pointer flex items-center gap-2 transition-all border border-white/5 dark:text-white/40 dark:hover:text-white/80">
                                <ArrowLeft size={16} /> {t('VOLTAR', 'BACK')}
                            </button>
                        )}
                        <button onClick={handleNext} disabled={loading}
                            className="flex-1 py-4 rounded-2xl bg-primary-500 text-white text-sm font-bold cursor-pointer hover:bg-primary-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25 disabled:opacity-60">
                            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                            {loading ? t('PROCESSANDO...', 'PROCESSING...') : step === 2 ? t('CONCLUIR SETUP', 'FINISH SETUP') : t('PRÓXIMO', 'NEXT')}
                            {!loading && step < 2 && <ArrowRight size={18} />}
                            {!loading && step === 2 && <Check size={18} />}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ==========================================
// MÓDULO 3: Planos & Limites
// ==========================================
const getPlanFeatures = (t: any) => [
    { key: 'campanhas', label: t('Campanhas de Disparo', 'Blast Campaigns') },
    { key: 'encarte', label: t('Encarte Farmacêutico', 'Pharmaceutical Flyer') },
    { key: 'api_access', label: t('Acesso via API Externa', 'External API Access') },
    { key: 'export', label: t('Exportação de Dados', 'Data Export') },
    { key: 'academy', label: t('Treinamento / Academy', 'Training / Academy') },
];

function PlansConfig({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
    const { t } = useLanguage();
    const PLAN_COLORS = getPlanColors(t);
    const PLAN_FEATURES = getPlanFeatures(t);
    const [plans, setPlans] = useState<Record<string, any>>(getGlobalPlans());
    const [saved, setSaved] = useState(false);

    const updateLimit = (plan: string, key: string, val: number) => {
        setPlans((p: Record<string, any>) => ({ ...p, [plan]: { ...p[plan], [key]: val } }));
    };
    const toggleFeature = (plan: string, feat: string) => {
        setPlans((prev: Record<string, any>) => {
            const p = prev[plan];
            return {
                ...prev,
                [plan]: {
                    ...p,
                    features: { ...p.features, [feat]: !p.features[feat] }
                }
            };
        });
    };
    const handleSave = () => {
        localStorage.setItem('tella_global_plans', JSON.stringify(plans));
        setSaved(true);
        showToast(t('Configurações de planos salvas!', 'Plan settings saved!'));
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="fade-in space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xs font-bold opacity-40 uppercase tracking-widest flex items-center gap-2 dark:text-white/40">
                        <Crown size={14} className="text-amber-400" /> {t('Configuração padrão dos planos', 'Default plan configuration')}
                    </h3>
                    <p className="text-[10px] opacity-30 mt-1 uppercase tracking-wider font-semibold dark:text-white/30">{t('afeta apenas novas contas registradas', 'affects only new registered accounts')}</p>
                </div>
                <button onClick={handleSave}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${saved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/25'}`}>
                    {saved ? <><Check size={16} /> {t('SALVO', 'SAVED')}</> : <><Check size={16} /> {t('SALVAR', 'SAVE')}</>}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {Object.entries(plans).map(([planKey, cfg]) => {
                    const p = PLAN_COLORS[planKey as PlanType] || PLAN_COLORS.basic;
                    return (
                        <div key={planKey} className={`glass-surface rounded-3xl p-6 border transition-all hover:bg-white/5 flex flex-col ${p.border}`}>
                            <div className={`text-[10px] font-bold mb-6 px-3 py-1 rounded-lg ${p.bg} ${p.color} inline-block self-start tracking-widest border ${p.border}`}>
                                {p.label.toUpperCase()}
                            </div>

                            <div className="space-y-4 mb-8 text-slate-800 dark:text-white">
                                <div>
                                    <label className="text-[10px] font-bold opacity-30 block mb-1.5 uppercase tracking-widest dark:text-white/30">{t('Limite Usuários', 'User Limit')}</label>
                                    <input type="number" value={cfg.max_users === 999 ? '' : cfg.max_users}
                                        placeholder="∞"
                                        onChange={e => updateLimit(planKey, 'max_users', e.target.value === '' ? 999 : +e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl glass-surface text-sm font-mono outline-none focus:ring-1 focus:ring-primary-500/40 border border-white/5 text-slate-800 dark:text-white" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold opacity-30 block mb-1.5 uppercase tracking-widest dark:text-white/30">{t('Limite Conexões', 'Connection Limit')}</label>
                                    <input type="number" value={cfg.max_connections === 99 ? '' : cfg.max_connections}
                                        placeholder="∞"
                                        onChange={e => updateLimit(planKey, 'max_connections', e.target.value === '' ? 99 : +e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl glass-surface text-sm font-mono outline-none focus:ring-1 focus:ring-primary-500/40 border border-white/5 text-slate-800 dark:text-white" />
                                </div>
                            </div>

                            <div className="h-px bg-white/5 mb-6" />
                            <p className="text-[10px] font-bold opacity-30 mb-4 uppercase tracking-widest dark:text-white/30">{t('Recursos Inclusos', 'Included Features')}</p>
                            <div className="space-y-3 flex-1 text-slate-800 dark:text-white">
                                {PLAN_FEATURES.map(feat => {
                                    const isActive = cfg.features[feat.key as keyof typeof cfg.features];
                                    return (
                                        <label key={feat.key} className="flex items-center gap-3 cursor-pointer group">
                                            <button
                                                onClick={() => toggleFeature(planKey, feat.key)}
                                                className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-all cursor-pointer border ${isActive ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-white/5 border-white/5 group-hover:bg-white/10'}`}>
                                                {isActive && <Check size={12} className="text-white" strokeWidth={3} />}
                                            </button>
                                            <span className={`text-xs font-medium transition-all ${isActive ? 'opacity-100' : 'opacity-20 group-hover:opacity-40'}`}>{feat.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ==========================================
// MAIN: SuperAdminPage
// ==========================================
export default function SuperAdminPage() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const TABS = getTabs(t);
    const [activeTab, setActiveTab] = useState('clients');
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

    if (user?.role !== 'super_admin') {
        return (
            <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 fade-in">
                    <div className="w-20 h-20 rounded-3xl bg-rose-500/10 flex items-center justify-center mb-6 border border-rose-500/20">
                        <ShieldAlert size={40} className="text-rose-500" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight mb-2 text-slate-800 dark:text-white">{t('Acesso Restrito', 'Restricted Access')}</h2>
                    <p className="text-sm opacity-50 max-w-xs leading-relaxed font-medium dark:text-white/50">{t('Esta área é exclusiva para a equipe de engenharia da Tella.', 'This area is exclusive to the Tella engineering team.')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8 pb-20">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="px-2 py-0.5 rounded-md bg-primary-500 text-[10px] font-black text-white tracking-widest uppercase shadow-lg shadow-primary-500/20">CORE</div>
                            <h1 className="text-3xl font-black tracking-tighter text-slate-800 dark:text-white">Tella <span className="text-primary-500">Core</span></h1>
                        </div>
                        <p className="text-xs font-bold opacity-30 uppercase tracking-widest flex items-center gap-2 dark:text-white/30">
                            <Globe size={14} /> {t('Global Infrastructure Management', 'Global Infrastructure Management')}
                        </p>
                    </div>

                    <div className="flex items-center gap-6 overflow-x-auto pb-2 scrollbar-hide">
                        {[
                            { label: 'Uptime', value: '99.98%', icon: Activity, color: 'text-emerald-400' },
                            { label: 'Latency', value: '24ms', icon: Zap, color: 'text-primary-400' },
                        ].map(stat => (
                            <div key={stat.label} className="flex items-center gap-3 shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
                                <div>
                                    <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest leading-none mb-1 dark:text-white/30">{stat.label}</p>
                                    <p className="text-sm font-mono font-bold text-slate-800 dark:text-white">{stat.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </header>

                {/* Navigation */}
                <nav className="flex items-center gap-2 p-1.5 glass-surface rounded-2xl border border-white/5 w-fit">
                    {TABS.map((tab: any) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${isActive ? 'bg-primary-500 text-white shadow-xl shadow-primary-500/25 scale-105' : 'hover:bg-white/5 opacity-40 hover:opacity-100 dark:text-white/40 dark:hover:text-white'}`}>
                                <Icon size={16} />
                                {tab.label.toUpperCase()}
                            </button>
                        );
                    })}
                </nav>

                {/* Content Area */}
                <main className="min-h-[400px]">
                    {activeTab === 'clients' && <OrgsList showToast={showToast} />}
                    {activeTab === 'onboarding' && <OnboardingWizard showToast={showToast} />}
                    {activeTab === 'plans' && <PlansConfig showToast={showToast} />}
                </main>

                {/* Toast System */}
                {toast && (
                    <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-xl z-50 animate-bounce-in ${toast.type === 'error' ? 'bg-rose-500/90 border-rose-400/50 text-white' : 'bg-emerald-500/90 border-emerald-400/50 text-white'}`}>
                        {toast.type === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                        <span className="text-xs font-bold tracking-wide uppercase">{toast.message}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
