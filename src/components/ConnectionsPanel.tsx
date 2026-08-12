import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Plug, QrCode, Wifi, WifiOff, MessageCircle,
    Camera as Instagram, Globe as Facebook,
    RefreshCw, Plus, X, Check, AlertTriangle, Trash2, Loader2,
    Smartphone, ArrowLeft, Key, ChevronRight, Power,
    RotateCcw, CheckCircle2, XCircle, Signal, Building2,
    Shield, Eye, EyeOff,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import * as evo from '../services/evolution';
import {
    listOrgConnections, listAllConnections, createConnection,
    deleteConnection, listOrganizations,
} from '../services/connectionService';
import type { Connection } from '../services/connectionService';
import { initFB, loginFB, getPages, getInstagramAccount, subscribeAppToPage } from '../services/facebookService';

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

// ==========================================
// Channel config
// ==========================================
interface ChannelConfig {
    label: string;
    icon: any;
    color: string;
    bg: string;
}

const CHANNELS: Record<string, ChannelConfig> = {
    whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
    instagram: { label: 'Instagram', icon: Instagram, color: 'text-rose-400', bg: 'bg-rose-500/15' },
    messenger: { label: 'Messenger', icon: Facebook, color: 'text-blue-400', bg: 'bg-blue-500/15' },
};

type Step = 'list' | 'form' | 'qr';

const STEPS: Record<string, Step> = { LIST: 'list', FORM: 'form', QR: 'qr' };

// ==========================================
// Toast
// ==========================================
interface ToastProps {
    toast: { message: string, type: 'success' | 'error' } | null;
    onClose: () => void;
}

function Toast({ toast, onClose }: ToastProps) {
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(onClose, 4500);
        return () => clearTimeout(t);
    }, [toast, onClose]);

    if (!toast) return null;
    const ok = toast.type === 'success';

    return (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-sm font-medium fade-in ${ok ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/15 border-rose-500/30 text-rose-300'}`}>
            {ok ? <CheckCircle2 size={16} className="shrink-0" /> : <XCircle size={16} className="shrink-0" />}
            {toast.message}
            <button onClick={onClose} className="opacity-60 hover:opacity-100 cursor-pointer"><X size={12} /></button>
        </div>
    );
}

// ==========================================
// Status helper
// ==========================================
function getStatusInfo(s: string, t: any) {
    if (s === 'open' || s === 'connected') return { label: t('Conectado', 'Connected'), color: 'text-emerald-400', dot: 'bg-emerald-400', Icon: Wifi };
    if (s === 'connecting') return { label: t('Conectando...', 'Connecting...'), color: 'text-amber-400', dot: 'bg-amber-400', Icon: Signal };
    return { label: t('Desconectado', 'Disconnected'), color: 'text-rose-400', dot: 'bg-rose-400', Icon: WifiOff };
}

// ==========================================
// QR Code View
// ==========================================
interface QRViewProps {
    instanceName: string;
    onBack: () => void;
    onConnected: () => void;
}

function QRView({ instanceName, onBack, onConnected }: QRViewProps) {
    const { t } = useLanguage();
    const [qrData, setQrData] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [polling, setPolling] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(25);
    const pollRef = useRef<any>(null);
    const refreshTimerRef = useRef<any>(null);
    const countdownRef = useRef<any>(null);

    const fetchQR = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const result = await evo.connectInstance(instanceName);
            const qr = result?.base64 || result?.qrcode?.base64 || null;
            if (qr) {
                setQrData(qr);
                setSecondsLeft(25);
            } else {
                const state = await evo.getInstance(instanceName);
                const s = state?.instance?.state || state?.state;
                if (s === 'open') { onConnected(); return; }
                setError(t('QR Code não disponível. Verifique a instância na Evolution API.', 'QR Code not available. Check the instance in the Evolution API.'));
            }
        } catch (err: any) {
            setError(`${t('Erro', 'Error')}: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [instanceName, onConnected]);

    const scheduleRefresh = useCallback(() => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        setSecondsLeft(25);
        countdownRef.current = setInterval(() => setSecondsLeft(s => (s > 0 ? s - 1 : 0)), 1000);
        refreshTimerRef.current = setTimeout(() => {
            fetchQR();
            scheduleRefresh();
        }, 25000);
    }, [fetchQR]);

    const startPoll = useCallback(() => {
        setPolling(true);
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
            try {
                const state = await evo.getInstance(instanceName);
                if ((state?.instance?.state || state?.state) === 'open') {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                    onConnected();
                }
            } catch { /* retry silently */ }
        }, 3000);
        setTimeout(() => {
            if (pollRef.current) { clearInterval(pollRef.current); setPolling(false); }
        }, 180000);
    }, [instanceName, onConnected]);

    useEffect(() => {
        fetchQR().then(() => { startPoll(); scheduleRefresh(); });
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [fetchQR, startPoll, scheduleRefresh]);

    return (
        <div className="flex flex-col items-center fade-in">
            <button onClick={onBack} className="flex items-center gap-1.5 text-xs opacity-40 hover:opacity-80 cursor-pointer mb-5 self-start transition-opacity">
                <ArrowLeft size={14} /> {t('Voltar', 'Back')}
            </button>

            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-3">
                <QrCode size={22} className="text-emerald-400" />
            </div>
            <h2 className="text-base font-bold mb-1">{t('Escanear QR Code', 'Scan QR Code')}</h2>
            <p className="text-xs opacity-40 text-center mb-6">
                {t('Abra o WhatsApp', 'Open WhatsApp')} → <strong>{t('Aparelhos conectados', 'Linked devices')}</strong> → <strong>{t('Conectar um aparelho', 'Link a device')}</strong>
            </p>

            <div className="relative">
                {loading ? (
                    <div className="w-52 h-52 glass-surface rounded-2xl flex items-center justify-center">
                        <Loader2 size={32} className="animate-spin opacity-40" />
                    </div>
                ) : error ? (
                    <div className="w-52 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-center">
                        <XCircle size={28} className="text-rose-400 mx-auto mb-2" />
                        <p className="text-xs text-rose-300">{error}</p>
                        <button onClick={fetchQR} className="mt-3 text-xs text-primary-400 hover:underline cursor-pointer">{t('Tentar novamente', 'Try again')}</button>
                    </div>
                ) : qrData ? (
                    <>
                        <div className="p-3 bg-white rounded-2xl shadow-2xl shadow-black/30">
                            <img
                                src={qrData.startsWith('data:') ? qrData : `data:image/png;base64,${qrData}`}
                                alt="QR Code"
                                className="w-48 h-48 rounded-xl"
                            />
                        </div>
                        <div className="mt-3">
                            <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                                <div
                                    className="h-full bg-emerald-400 transition-all duration-1000"
                                    style={{ width: `${(secondsLeft / 25) * 100}%` }}
                                />
                            </div>
                            <p className="text-[10px] opacity-30 text-center mt-1">
                                {t('Novo QR em', 'New QR in')} {secondsLeft}s {polling && <span className="text-emerald-400/60">• {t('aguardando scan...', 'waiting for scan...')}</span>}
                            </p>
                        </div>
                    </>
                ) : null}
            </div>

            <div className="mt-6 glass-surface rounded-xl p-4 max-w-xs w-full">
                <p className="text-[11px] font-semibold opacity-40 mb-2">{t('Instruções', 'Instructions')}</p>
                <ol className="text-[11px] opacity-40 space-y-1.5 list-decimal list-inside">
                    <li>{t('Abra o WhatsApp no seu celular', 'Open WhatsApp on your phone')}</li>
                    <li>{t('Toque nos 3 pontos', 'Tap the 3 dots')} → <strong className="opacity-80">{t('Aparelhos conectados', 'Linked devices')}</strong></li>
                    <li>{t('Toque em', 'Tap')} <strong className="opacity-80">{t('Conectar um aparelho', 'Link a device')}</strong></li>
                    <li>{t('Aponte a câmera para este QR Code', 'Point your camera at this QR Code')}</li>
                </ol>
            </div>
        </div>
    );
}

// ==========================================
// Connection Cards
// ==========================================
interface ConnectionCardProps {
    conn: Connection;
    liveStatus?: string;
    onConnect: () => void;
    onDisconnect: () => void;
    onRestart: () => void;
    onDelete?: () => void;
}

function ClientConnectionCard({ conn, liveStatus, onConnect, onDisconnect, onRestart }: ConnectionCardProps) {
    const { t } = useLanguage();
    const ch = CHANNELS[conn.channel] || CHANNELS.whatsapp;
    const ChIcon = ch.icon;
    const isOfficial = conn.method === 'meta_api' || conn.method === 'meta';
    const status = isOfficial ? 'connected' : (liveStatus || conn.status || 'disconnected');
    const st = getStatusInfo(status, t);
    const isConnected = status === 'open' || status === 'connected';

    return (
        <div className="glass-surface rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-5">
                <div className={`w-14 h-14 rounded-2xl ${ch.bg} flex items-center justify-center shrink-0`}>
                    <ChIcon size={28} className={ch.color} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm mb-0.5">{conn.name}</h3>
                    {conn.instance_name ? (
                        <p className="text-xs font-mono opacity-30 truncate">{conn.instance_name}</p>
                    ) : conn.method === 'meta_api' ? (
                        <p className="text-xs font-mono opacity-30 truncate">Meta Cloud API</p>
                    ) : null}
                    <div className={`flex items-center gap-1.5 mt-2 text-xs font-semibold ${st.color}`}>
                        <span className={`w-2 h-2 rounded-full ${st.dot} ${isConnected ? 'pulse-dot' : ''}`} />
                        {st.label}
                    </div>
                </div>
            </div>

            {!isOfficial && (
                <div className="flex gap-2">
                    {!isConnected ? (
                        <button
                            onClick={onConnect}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/25 cursor-pointer flex items-center justify-center gap-2 transition-all"
                        >
                            <QrCode size={16} /> {t('Conectar via QR', 'Connect via QR')}
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={onRestart}
                                className="flex-1 py-2.5 rounded-xl glass-surface text-sm font-semibold opacity-60 hover:opacity-100 cursor-pointer flex items-center justify-center gap-2 transition-all"
                            >
                                <RotateCcw size={14} /> {t('Reiniciar', 'Restart')}
                            </button>
                            <button
                                onClick={onDisconnect}
                                className="flex-1 py-2.5 rounded-xl bg-amber-500/15 text-amber-400 text-sm font-semibold hover:bg-amber-500/25 cursor-pointer flex items-center justify-center gap-2 transition-all"
                            >
                                <Power size={14} /> {t('Desconectar', 'Disconnect')}
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function AdminConnectionCard({ conn, liveStatus, onConnect, onDisconnect, onRestart, onDelete }: ConnectionCardProps) {
    const { t } = useLanguage();
    const ch = CHANNELS[conn.channel] || CHANNELS.whatsapp;
    const ChIcon = ch.icon;
    const isOfficial = conn.method === 'meta_api' || conn.method === 'meta';
    const status = isOfficial ? 'connected' : (liveStatus || conn.status || 'disconnected');
    const st = getStatusInfo(status, t);
    const isConnected = status === 'open' || status === 'connected';

    return (
        <div className="glass-surface rounded-2xl p-5 hover:scale-[1.002] transition-all">
            <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl ${ch.bg} flex items-center justify-center shrink-0`}>
                    <ChIcon size={20} className={ch.color} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-bold truncate">{conn.name}</h3>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${ch.bg} ${ch.color}`}>
                            {ch.label}
                        </span>
                        {conn.organization?.name && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-400 flex items-center gap-0.5">
                                <Building2 size={8} /> {conn.organization.name}
                            </span>
                        )}
                    </div>
                    <p className="text-xs font-mono opacity-30 truncate">{isOfficial ? 'Cloud API' : (conn.instance_name || conn.id)}</p>
                    <div className={`flex items-center gap-1 mt-1 text-[10px] font-semibold ${st.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /> {st.label}
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {isOfficial ? (
                        <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-400 text-[10px] font-bold">{t('API Oficial', 'Official API')}</span>
                    ) : (
                        <>
                            {!isConnected ? (
                                <button onClick={onConnect}
                                    className="px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 text-[11px] font-semibold hover:bg-emerald-500/25 cursor-pointer flex items-center gap-1.5 transition-all">
                                    <QrCode size={13} /> {t('Conectar', 'Connect')}
                                </button>
                            ) : (
                                <>
                                    <button onClick={onRestart}
                                        className="p-2 rounded-xl hover:bg-white/10 cursor-pointer opacity-40 hover:opacity-100 transition-colors" title={t("Reiniciar", "Restart")}>
                                        <RotateCcw size={14} />
                                    </button>
                                    <button onClick={onDisconnect}
                                        className="px-3 py-2 rounded-xl bg-amber-500/15 text-amber-400 text-[11px] font-semibold hover:bg-amber-500/25 cursor-pointer flex items-center gap-1.5 transition-all">
                                        <Power size={13} /> {t('Desconectar', 'Disconnect')}
                                    </button>
                                </>
                            )}
                        </>
                    )}
                    {onDelete && (
                        <button onClick={onDelete}
                            className="p-2 rounded-xl hover:bg-rose-500/10 cursor-pointer opacity-30 hover:opacity-100 hover:text-rose-400 transition-colors" title={t("Excluir", "Delete")}>
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function ConnectionsPanel() {
    const { user, isAdmin, isSuperAdmin } = useAuth();
    const { t } = useLanguage();
    const [step, setStep] = useState<Step>(STEPS.LIST);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [liveStatuses, setLiveStatuses] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Admin form state
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [form, setForm] = useState({
        organizationId: '',
        channel: 'whatsapp',
        method: 'evolution',
        name: '',
        instanceName: '',
        phoneId: '',
        wabaId: '',
        officialToken: '',
        webhookUrl: N8N_WEBHOOK_URL ? `${N8N_WEBHOOK_URL}/evolution` : '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [fbLoading, setFbLoading] = useState(false);
    const [fbPages, setFbPages] = useState<any[]>([]);
    const [fbInstagramAccount, setFbInstagramAccount] = useState<any>(null);
    const [fbAccessToken, setFbAccessToken] = useState('');

    // QR state
    const [activeInstanceName, setActiveInstanceName] = useState<string | null>(null);

    useEffect(() => {
        const handleTourAction = (e: any) => {
            if (e.detail?.action === 'open-conn-form') setStep(STEPS.FORM);
            if (e.detail?.action === 'close-conn-form') setStep(STEPS.LIST);
            if (e.detail?.action === 'mock-conn-data') {
                setForm(prev => ({
                    ...prev,
                    name: t('WhatsApp Suporte', 'Support WhatsApp'),
                    instanceName: 'suporte-vendas',
                    channel: 'whatsapp',
                    method: 'evolution',
                    webhookUrl: 'https://n8n.exper.com.br/webhook/evolution'
                }));
            }
        };
        window.addEventListener('tour:action', handleTourAction);
        return () => window.removeEventListener('tour:action', handleTourAction);
    }, [t]);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

    const loadConnections = useCallback(async () => {
        setIsLoading(true);
        const orgId = user?.organization?.id;

        const { data, error } = isSuperAdmin
            ? await listAllConnections()
            : await listOrgConnections(orgId as string);

        if (error) {
            showToast(t('Erro ao carregar conexões.', 'Error loading connections.'), 'error');
        } else {
            setConnections(data || []);
            const evoConns = (data || []).filter(c => c.method === 'evolution' && c.instance_name);
            const statuses: Record<string, string> = {};
            await Promise.allSettled(
                evoConns.map(async (c) => {
                    try {
                        const state = await evo.getInstance(c.instance_name as string);
                        statuses[c.id] = state?.instance?.state || state?.state || 'disconnected';
                    } catch {
                        statuses[c.id] = 'disconnected';
                    }
                })
            );
            setLiveStatuses(statuses);
        }
        setIsLoading(false);
    }, [user?.organization?.id, isSuperAdmin]);

    useEffect(() => {
        loadConnections();
    }, [loadConnections]);

    useEffect(() => {
        if (isSuperAdmin && step === STEPS.FORM) {
            listOrganizations().then(({ data }) => setOrganizations(data || []));
        }
    }, [isSuperAdmin, step]);

    const handleConnect = (conn: Connection) => {
        if (conn.instance_name) {
            setActiveInstanceName(conn.instance_name);
            setStep(STEPS.QR);
        }
    };

    const handleQRConnected = async () => {
        setStep(STEPS.LIST);
        showToast(t('✅ WhatsApp conectado com sucesso!', '✅ WhatsApp connected successfully!'));
        setTimeout(loadConnections, 1500);
    };

    const handleDisconnect = async (conn: Connection) => {
        if (!conn.instance_name) return;
        try {
            await evo.logoutInstance(conn.instance_name);
            showToast(t('Desconectado.', 'Disconnected.'));
            setLiveStatuses(p => ({ ...p, [conn.id]: 'disconnected' }));
        } catch (err: any) {
            showToast(`${t('Erro', 'Error')}: ${err.message}`, 'error');
        }
    };

    const handleRestart = async (conn: Connection) => {
        if (!conn.instance_name) return;
        try {
            await evo.restartInstance(conn.instance_name);
            showToast(t('Instância reiniciada.', 'Instance restarted.'));
            setTimeout(loadConnections, 3000);
        } catch (err: any) {
            showToast(`${t('Erro', 'Error')}: ${err.message}`, 'error');
        }
    };

    const handleDelete = async (conn: Connection) => {
        if (!confirm(t(`Excluir "${conn.name}"? Esta ação não pode ser desfeita.`, `Delete "${conn.name}"? This action cannot be undone.`))) return;
        try {
            if (conn.method === 'evolution' && conn.instance_name) {
                await evo.deleteInstance(conn.instance_name).catch(() => { });
            }
            await deleteConnection(conn.id);
            setConnections(p => p.filter(c => c.id !== conn.id));
            showToast(t('Conexão excluída.', 'Connection deleted.'));
        } catch (err: any) {
            showToast(`${t('Erro', 'Error')}: ${err.message}`, 'error');
        }
    };

    const handleCreate = async () => {
        setFormError('');
        if (!form.name.trim()) return setFormError(t('Informe um nome para a conexão.', 'Enter a name for the connection.'));
        if (isSuperAdmin && !form.organizationId) return setFormError(t('Selecione o cliente/organização.', 'Select the client/organization.'));

        if (form.method === 'evolution' && !form.instanceName.trim()) return setFormError(t('Informe o nome da instância no Evolution API.', 'Enter the instance name in the Evolution API.'));

        if (form.method === 'meta_api' && form.channel === 'whatsapp') {
            if (!form.phoneId?.trim()) return setFormError(t('Informe o Phone Number ID da API Oficial.', 'Enter the Phone Number ID from the Official API.'));
            if (!form.officialToken?.trim()) return setFormError(t('Informe o Access Token da API Oficial.', 'Enter the Access Token from the Official API.'));
        }

        if (form.channel !== 'whatsapp' && !fbInstagramAccount) {
            return setFormError(t('Por favor, conecte-se ao Facebook e selecione uma conta.', 'Please connect to Facebook and select an account.'));
        }

        setIsSaving(true);
        try {
            const safeName = form.instanceName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
            const orgId = isSuperAdmin ? form.organizationId : user?.organization?.id;

            if (isSuperAdmin && !orgId) {
                setIsSaving(false);
                return setFormError(t('Selecione o cliente/organização.', 'Select the client/organization.'));
            }

            const isOfficialWhatsApp = form.method === 'meta_api' && form.channel === 'whatsapp';
            const isSocialMeta = (form.channel === 'instagram' || form.channel === 'facebook') && form.method === 'meta_api';

            const { data, error } = await createConnection({
                organizationId: orgId as string,
                channel: form.channel,
                method: form.method,
                name: form.name.trim(),
                instanceName: form.method === 'evolution' ? safeName : null,
                apiConfig: isOfficialWhatsApp ? {
                    phone_number_id: form.phoneId.trim(),
                    waba_id: form.wabaId?.trim() || null,
                    access_token: form.officialToken.trim(),
                } : (isSocialMeta ? {
                    page_id: fbInstagramAccount.page_id || fbInstagramAccount.id,
                    page_access_token: fbInstagramAccount.page_access_token || fbInstagramAccount.access_token,
                    instagram_business_account_id: fbInstagramAccount.page_id ? fbInstagramAccount.id : null,
                    user_access_token: fbAccessToken,
                    username: fbInstagramAccount.username,
                    name: fbInstagramAccount.name,
                } : null),
                webhookUrl: form.webhookUrl,
                createdBy: user?.id,
            });

            if (error) {
                setFormError(error.message || t('Erro ao salvar conexão.', 'Error saving connection.'));
                setIsSaving(false);
                return;
            }

            // [PRO] Automação Zero-Config
            // Se for Evolution (WhatsApp QR), cria a instância automaticamente com Webhooks
            if (form.method === 'evolution' && form.channel === 'whatsapp' && safeName) {
                try {
                    await evo.createInstance(safeName, {
                        webhookUrl: form.webhookUrl,
                        webhookBase64: true, // [PRO] Habilitado para envio de mídias (Base64)
                        events: [
                            'MESSAGES_UPSERT',
                            'QRCODE_UPDATED'
                        ]
                    });
                    console.log('✅ Instância Evolution criada com Base64 e Eventos específicos.');
                } catch (evoErr: any) {
                    console.error('⚠️ Erro na criação automática da instância:', evoErr);
                }
            }

            if (form.channel !== 'whatsapp') {
                try {
                    await subscribeAppToPage(
                        fbInstagramAccount.page_id || fbInstagramAccount.id,
                        fbInstagramAccount.page_access_token || fbInstagramAccount.access_token
                    );
                    showToast(t('✅ App subscrito à página com sucesso!', '✅ App successfully subscribed to the page!'));
                } catch (subErr) {
                    console.error('Subscription Error', subErr);
                }
            }

            if (data) setConnections(p => [...p, data]);
            showToast(`${t('Conexão', 'Connection')} "${form.name}" ${t('criada!', 'created!')}${form.method === 'meta_api' ? '' : ' ' + t('Clique em "Conectar" para gerar o QR.', 'Click "Connect" to generate the QR.')}`);
            resetForm();
            setStep(STEPS.LIST);
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setForm({
            organizationId: '',
            channel: 'whatsapp',
            method: 'evolution',
            name: '',
            instanceName: '',
            phoneId: '',
            wabaId: '',
            officialToken: '',
            webhookUrl: N8N_WEBHOOK_URL ? `${N8N_WEBHOOK_URL}/evolution` : '',
        });
        setFormError('');
        setFbPages([]);
        setFbInstagramAccount(null);
        setFbAccessToken('');
    };

    const handleFBLogin = async () => {
        setFbLoading(true);
        setFormError('');
        try {
            await initFB();
            const auth = await loginFB();
            setFbAccessToken(auth.accessToken);

            if (form.channel === 'messenger') {
                const pages = await getPages(auth.accessToken);
                setFbPages(pages);
            } else if (form.channel === 'instagram') {
                const pages = await getPages(auth.accessToken);
                const igAccounts = [];
                for (const page of pages) {
                    try {
                        const ig = await getInstagramAccount(page.id, page.access_token);
                        if (ig) igAccounts.push({ ...ig, page_access_token: page.access_token, page_id: page.id });
                    } catch (e) { console.error('IG Error', e); }
                }
                setFbPages(igAccounts);
            }
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setFbLoading(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="flex-1 overflow-y-auto p-6 fade-in">
                <Toast toast={toast} onClose={() => setToast(null)} />
                <div className="max-w-lg mx-auto">
                    {step === STEPS.QR && activeInstanceName ? (
                        <QRView
                            instanceName={activeInstanceName}
                            onBack={() => setStep(STEPS.LIST)}
                            onConnected={handleQRConnected}
                        />
                    ) : (
                        <>
                            {isLoading ? (
                                <div className="glass-surface rounded-2xl p-6 shimmer h-40" />
                            ) : connections.length === 0 ? (
                                <div className="text-center py-16 opacity-30" data-tour="connections-empty">
                                    <Smartphone size={40} className="mx-auto mb-4" />
                                    <p className="text-sm font-semibold">{t('Nenhuma conexão configurada', 'No connection configured')}</p>
                                    <p className="text-xs mt-1">{t('Contate o administrador para configurar seu WhatsApp.', 'Contact the administrator to configure your WhatsApp.')}</p>
                                </div>
                            ) : (
                                <div className="space-y-4" data-tour="connections-list">
                                    {connections.map((conn, i) => (
                                        <div key={conn.id} data-tour={i === 0 ? "connection-item" : undefined}>
                                            <ClientConnectionCard
                                                conn={conn}
                                                liveStatus={liveStatuses[conn.id]}
                                                onConnect={() => handleConnect(conn)}
                                                onDisconnect={() => handleDisconnect(conn)}
                                                onRestart={() => handleRestart(conn)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button
                                onClick={loadConnections}
                                disabled={isLoading}
                                className="mt-4 flex items-center gap-1.5 text-xs opacity-30 hover:opacity-60 cursor-pointer transition-opacity mx-auto"
                            >
                                <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} /> {t('Atualizar status', 'Update status')}
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    if (step === STEPS.FORM && isAdmin) {
        return (
            <div className="flex-1 overflow-y-auto p-6 fade-in">
                <div className="max-w-lg mx-auto">
                    <div className="glass-surface rounded-2xl p-6 space-y-5">
                        {isSuperAdmin && (
                            <div>
                                <label className="text-[11px] font-semibold opacity-60 mb-1.5 flex items-center gap-1">
                                    <Building2 size={10} /> {t('Cliente / Organização *', 'Client / Organization *')}
                                </label>
                                <select
                                    value={form.organizationId}
                                    onChange={e => setForm({ ...form, organizationId: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl glass-surface text-sm outline-none focus:ring-2 focus:ring-primary-500/30 cursor-pointer"
                                >
                                    <option value="">{t('Selecione o cliente...', 'Select the client...')}</option>
                                    {organizations.map(org => (
                                        <option key={org.id} value={org.id}>{org.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="text-[11px] font-semibold opacity-60 mb-1.5 block">{t('Canal', 'Channel')}</label>
                            <div className="flex gap-2">
                                {Object.entries(CHANNELS).map(([key, ch]) => {
                                    const Icon = ch.icon;
                                    return (
                                        <button key={key}
                                            onClick={() => setForm({
                                                ...form,
                                                channel: key,
                                                method: key === 'whatsapp' ? 'evolution' : 'meta_api',
                                                instanceName: '',
                                                phoneId: '', wabaId: '', officialToken: '',
                                                webhookUrl: N8N_WEBHOOK_URL ? `${N8N_WEBHOOK_URL}/${key === 'whatsapp' ? 'evolution' : 'messenger'}` : '',
                                            })}
                                            data-tour={`conn-method-${key}`}
                                            className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${form.channel === key ? `${ch.bg} ${ch.color} ring-1 ring-current` : 'glass-surface opacity-40'}`}>
                                            <Icon size={18} />
                                            {ch.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {form.channel === 'whatsapp' && (
                            <div>
                                <label className="text-[11px] font-semibold opacity-60 mb-1.5 block">{t('Método de Conexão *', 'Connection Method *')}</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setForm({ ...form, method: 'evolution', webhookUrl: N8N_WEBHOOK_URL ? `${N8N_WEBHOOK_URL}/evolution` : '' })}
                                        data-tour="conn-method-evolution"
                                        className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${form.method === 'evolution' ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-400' : 'glass-surface opacity-40 hover:opacity-80'}`}
                                    >
                                        <QrCode size={14} /> Evolution API (QR)
                                    </button>
                                    <button
                                        onClick={() => setForm({ ...form, method: 'meta_api', webhookUrl: N8N_WEBHOOK_URL ? `${N8N_WEBHOOK_URL}/whatsapp_official` : '' })}
                                        className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${form.method === 'meta_api' ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-400' : 'glass-surface opacity-40 hover:opacity-80'}`}
                                    >
                                        <Shield size={14} /> Cloud API (Oficial)
                                    </button>
                                </div>
                            </div>
                        )}

                        {form.channel !== 'whatsapp' && (
                            <div className="space-y-4">
                                <label className="text-[11px] font-semibold opacity-60 block">{t('Configuração da Conta *', 'Account Configuration *')}</label>
                                {fbAccessToken ? (
                                    <div className="glass-surface rounded-xl p-4 bg-primary-500/5 border border-primary-500/20">
                                        <div className="flex items-center justify-between mb-4">
                                            <p className="text-[10px] font-bold text-primary-400 uppercase tracking-wider">{t('Contas Descobertas', 'Discovered Accounts')}</p>
                                            <button onClick={() => { setFbAccessToken(''); setFbPages([]); }} className="text-[10px] opacity-40 hover:opacity-100 hover:text-rose-400">{t('Trocar Conta', 'Switch Account')}</button>
                                        </div>

                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                            {fbPages.length === 0 ? (
                                                <p className="text-[11px] opacity-30 text-center py-4">{t('Nenhuma conta encontrada com as permissões atuais.', 'No accounts found with current permissions.')}</p>
                                            ) : fbPages.map(page => (
                                                <button
                                                    key={page.id}
                                                    onClick={() => {
                                                        setFbInstagramAccount(page);
                                                        setForm({ ...form, name: page.name });
                                                    }}
                                                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all border ${fbInstagramAccount?.id === page.id ? 'bg-primary-500/10 border-primary-500/30' : 'hover:bg-white/5 border-transparent'}`}
                                                >
                                                    {page.profile_picture_url || page.picture?.data?.url ? (
                                                        <img src={page.profile_picture_url || page.picture?.data?.url} className="w-8 h-8 rounded-full bg-black/20" alt="" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center"><Facebook size={14} /></div>
                                                    )}
                                                    <div className="text-left flex-1">
                                                        <p className="text-[11px] font-bold leading-tight">{page.name}</p>
                                                        <p className="text-[9px] opacity-40">{page.username ? `@${page.username}` : 'Página do Facebook'}</p>
                                                    </div>
                                                    {fbInstagramAccount?.id === page.id && <Check size={14} className="text-primary-400" />}
                                                </button>
                                            ))}
                                        </div>

                                        {fbInstagramAccount && (
                                            <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5 fade-in">
                                                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                                    <Check size={12} className="text-emerald-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[11px] font-bold text-emerald-400 leading-tight">{t('Conta Selecionada', 'Selected Account')}</p>
                                                    <p className="text-[9px] opacity-60 mt-0.5 line-clamp-2">
                                                        {t(
                                                          `O App será subscrito automaticamente para receber mensagens de ${fbInstagramAccount.name}.`,
                                                          `The App will be automatically subscribed to receive messages from ${fbInstagramAccount.name}.`
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleFBLogin}
                                        disabled={fbLoading}
                                        className="w-full py-4 rounded-xl bg-[#1877F2] text-white text-[13px] font-bold hover:bg-[#166fe5] transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-lg shadow-[#1877F2]/20 disabled:opacity-50"
                                    >
                                        {fbLoading ? <Loader2 size={18} className="animate-spin" /> : <Facebook size={18} fill="currentColor" />}
                                        {t('Conectar com Facebook', 'Connect with Facebook')}
                                    </button>
                                )}
                            </div>
                        )}

                        <div>
                            <label className="text-[11px] font-semibold opacity-60 mb-1.5 block">{t('Nome da Conexão *', 'Connection Name *')}</label>
                            <input type="text" value={form.name}
                                data-tour="conn-form-name"
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder={t("Ex: WhatsApp Principal", "Ex: Main WhatsApp")}
                                className="w-full px-4 py-3 rounded-xl glass-surface text-sm outline-none focus:ring-2 focus:ring-primary-500/30 placeholder:opacity-30" />
                        </div>

                        {form.channel === 'whatsapp' && form.method === 'evolution' && (
                            <div className="fade-in">
                                <label className="text-[11px] font-semibold opacity-60 mb-1.5 block">{t('Nome da Instância no Evolution API *', 'Instance Name in Evolution API *')}</label>
                                <input type="text" value={form.instanceName}
                                    data-tour="conn-form-instance-name"
                                    onChange={e => setForm({ ...form, instanceName: e.target.value })}
                                    placeholder={t("Ex: cliente-joao-principal", "Ex: client-john-main")}
                                    className="w-full px-4 py-3 rounded-xl glass-surface text-sm font-mono outline-none focus:ring-2 focus:ring-primary-500/30 placeholder:opacity-30" />
                                <p className="text-[10px] opacity-30 mt-1">{t('Deve ser o mesmo nome criado na Evolution API. Sem espaços.', 'Must be the same name created in the Evolution API. No spaces.')}</p>
                            </div>
                        )}

                        {form.channel === 'whatsapp' && form.method === 'meta_api' && (
                            <div className="space-y-4 fade-in glass-surface rounded-xl p-4 bg-primary-500/5">
                                <div>
                                    <label className="text-[11px] font-semibold opacity-80 mb-1.5 flex items-center gap-1"><Smartphone size={12} /> {t('Phone Number ID *', 'Phone Number ID *')}</label>
                                    <input type="text" value={form.phoneId}
                                        onChange={e => setForm({ ...form, phoneId: e.target.value })}
                                        placeholder="Ex: 1029384756"
                                        className="w-full px-4 py-2.5 rounded-xl bg-black/20 text-sm font-mono outline-none focus:ring-2 focus:ring-primary-500/30 placeholder:opacity-30" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-semibold opacity-80 mb-1.5 block">{t('WhatsApp Business Account ID (WABA ID)', 'WhatsApp Business Account ID (WABA ID)')}</label>
                                    <input type="text" value={form.wabaId}
                                        onChange={e => setForm({ ...form, wabaId: e.target.value })}
                                        placeholder={t("Ex: 9876543210 (opcional para envio básico)", "Ex: 9876543210 (optional for basic sending)")}
                                        className="w-full px-4 py-2.5 rounded-xl bg-black/20 text-sm font-mono outline-none focus:ring-2 focus:ring-primary-500/30 placeholder:opacity-30" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-semibold opacity-80 mb-1.5 flex items-center gap-1"><Key size={12} /> {t('Permanent Access Token *', 'Permanent Access Token *')}</label>
                                    <input type="password" value={form.officialToken}
                                        onChange={e => setForm({ ...form, officialToken: e.target.value })}
                                        placeholder="EAAL..."
                                        className="w-full px-4 py-2.5 rounded-xl bg-black/20 text-sm font-mono outline-none focus:ring-2 focus:ring-primary-500/30 placeholder:opacity-30" />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-[11px] font-semibold opacity-60 mb-1.5 block">{t('Webhook URL (n8n)', 'Webhook URL (n8n)')}</label>
                            <input type="text" value={form.webhookUrl}
                                data-tour="conn-form-webhook"
                                onChange={e => setForm({ ...form, webhookUrl: e.target.value })}
                                placeholder="https://n8n.yourdomain.com/webhook/evolution"
                                className="w-full px-4 py-3 rounded-xl glass-surface text-sm font-mono outline-none focus:ring-2 focus:ring-primary-500/30 placeholder:opacity-30" />
                        </div>

                        {formError && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 fade-in">
                                <XCircle size={14} className="shrink-0" /> {formError}
                            </div>
                        )}

                        <button onClick={handleCreate} disabled={isSaving}
                            data-tour="conn-form-submit"
                            className="w-full py-3 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 transition-all cursor-pointer shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 disabled:opacity-60">
                            {isSaving ? <><Loader2 size={16} className="animate-spin" /> {t('Salvando...', 'Saving...')}</> : <><Check size={16} /> {t('Criar Conexão', 'Create Connection')}</>}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === STEPS.QR && activeInstanceName) {
        return (
            <div className="flex-1 overflow-y-auto p-6 fade-in">
                <div className="max-w-lg mx-auto">
                    <QRView
                        instanceName={activeInstanceName}
                        onBack={() => setStep(STEPS.LIST)}
                        onConnected={handleQRConnected}
                    />
                </div>
            </div>
        );
    }

    const connectedCount = Object.values(liveStatuses).filter(s => s === 'open' || s === 'connected').length;

    return (
        <div className="flex-1 overflow-y-auto p-6 fade-in">
            <Toast toast={toast} onClose={() => setToast(null)} />
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div data-tour="connections-info">
                        <h2 className="text-lg font-bold flex items-center gap-2" data-tour="connections-title">
                            <Plug size={20} className="text-primary-400" /> {t('Conexões', 'Connections')}
                        </h2>
                        <p className="text-xs opacity-40 mt-1" data-tour="connections-description">
                            {connections.length} {t(connections.length !== 1 ? 'conexões' : 'conexão', connections.length !== 1 ? 'connections' : 'connection')} —
                            <span className="text-emerald-400 ml-1" data-tour="connections-active-count">{connectedCount} {t(connectedCount !== 1 ? 'ativas' : 'ativa', connectedCount !== 1 ? 'active' : 'active')}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={loadConnections} disabled={isLoading}
                            className="p-2 rounded-xl hover:bg-white/10 cursor-pointer opacity-40 hover:opacity-100 transition-colors">
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                        {isAdmin && (
                            <button onClick={() => { resetForm(); setStep(STEPS.FORM); }}
                                data-tour="connections-add-button"
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-400 cursor-pointer shadow-lg shadow-primary-500/25 transition-all">
                                <Plus size={16} /> {t('Nova Conexão', 'New Connection')}
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-5" data-tour="connections-stats">
                    {Object.entries(CHANNELS).map(([key, ch]) => {
                        const Icon = ch.icon;
                        const count = connections.filter(c => c.channel === key).length;
                        const active = connections.filter(c => c.channel === key && (liveStatuses[c.id] === 'open' || liveStatuses[c.id] === 'connected')).length;
                        return (
                            <div key={key} className="glass-surface rounded-xl p-3 text-center">
                                <Icon size={18} className={`${ch.color} mx-auto mb-1`} />
                                <p className="text-lg font-bold">{count}</p>
                                <p className="text-[10px] opacity-40">{ch.label}</p>
                                {active > 0 && <p className="text-[9px] text-emerald-400 font-semibold mt-0.5">{active} {t(active > 1 ? 'ativos' : 'ativo', active > 1 ? 'active' : 'active')}</p>}
                            </div>
                        );
                    })}
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2].map(i => <div key={i} className="glass-surface rounded-2xl p-5 shimmer h-24" />)}
                    </div>
                ) : connections.length === 0 ? (
                    <div className="text-center py-16 opacity-30" data-tour="connections-empty">
                        <Smartphone size={40} className="mx-auto mb-4" />
                        <p className="text-sm font-semibold mb-1">{t('Nenhuma conexão cadastrada', 'No connection registered')}</p>
                        <p className="text-xs">{t('Clique em "Nova Conexão" para vincular um cliente.', 'Click "New Connection" to link a client.')}</p>
                    </div>
                ) : (
                    <div className="space-y-3" data-tour="connections-list">
                        {connections.map((conn, i) => (
                            <div key={conn.id} data-tour={i === 0 ? "connection-item" : undefined}>
                                <AdminConnectionCard
                                    conn={conn}
                                    liveStatus={liveStatuses[conn.id]}
                                    onConnect={() => handleConnect(conn)}
                                    onDisconnect={() => handleDisconnect(conn)}
                                    onRestart={() => handleRestart(conn)}
                                    onDelete={isAdmin ? () => handleDelete(conn) : undefined}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
