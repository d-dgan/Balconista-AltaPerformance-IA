import { useState, useEffect } from 'react';
import { Zap, X, AlertCircle, Loader2, ChevronRight, Send } from 'lucide-react';
import * as n8nService from '../services/n8n';
import type { Connection } from '../services/connectionService';
import { useLanguage } from '../contexts/LanguageContext';

interface TemplateComponent {
    type: string;
    text?: string;
    format?: string;
}

interface WhatsAppTemplate {
    name: string;
    language: string;
    category: string;
    status: string;
    components: TemplateComponent[];
}

interface TemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    connection: Connection | null;
    contactPhone: string;
    ticketId: string;
    user: any; // User from AuthContext
    onTemplateSent?: () => void;
}

export default function TemplateModal({ isOpen, onClose, connection, contactPhone, ticketId, user, onTemplateSent }: TemplateModalProps) {
    const { t } = useLanguage();
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
    const [templateParams, setTemplateParams] = useState<string[]>([]);
    const [sendingTemplate, setSendingTemplate] = useState(false);
    const [templateError, setTemplateError] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setSelectedTemplate(null);
            setTemplateError('');
            return;
        }

        let cancelled = false;

        const loadTemplates = async () => {
            const apiConfig = connection?.api_config;
            if (!apiConfig?.waba_id) {
                setTemplateError(t('Configuração da API não encontrada.', 'API configuration not found.'));
                return;
            }
            setLoadingTemplates(true);
            setTemplateError('');
            try {
                const { getWhatsAppTemplates } = await import('../services/api');
                const res = await getWhatsAppTemplates(apiConfig.waba_id, apiConfig.access_token);
                if (!cancelled) {
                    setTemplates(res.data?.filter((t: WhatsAppTemplate) => t.status === 'APPROVED') || []);
                }
            } catch (e: any) {
                if (!cancelled) setTemplateError(e.message);
            } finally {
                if (!cancelled) setLoadingTemplates(false);
            }
        };

        loadTemplates();

        return () => { cancelled = true; };
    }, [isOpen, connection]);

    if (!isOpen) return null;

    const getTemplateBody = (tmpl: WhatsAppTemplate | null) =>
        tmpl?.components?.find(c => c.type === 'BODY')?.text || '';

    const countParams = (text: string) => (text.match(/\{\{\d+\}\}/g) || []).length;

    const handleSelectTemplate = (tmpl: WhatsAppTemplate) => {
        setSelectedTemplate(tmpl);
        setTemplateParams(Array(countParams(getTemplateBody(tmpl))).fill(''));
    };

    const renderBodyPreview = (text: string, params: string[]) =>
        text.replace(/\{\{(\d+)\}\}/g, (_, i) => params[parseInt(i) - 1] || `{{${i}}}`);

    const sendTemplate = async () => {
        if (!selectedTemplate) return;
        setSendingTemplate(true);
        setTemplateError('');
        try {
            const safePhone = contactPhone ? (contactPhone.includes('@s.whatsapp.net') ? contactPhone.split(':')[0].split('@')[0].replace(/\D/g, '') : (contactPhone.includes('@') ? contactPhone.replace(/:[\d]+@/, '@') : contactPhone.split(':')[0].replace(/\D/g, ''))) : '';

            await n8nService.sendTemplate({
                connectionId: connection?.id as string,
                contactPhone: safePhone,
                templateName: selectedTemplate.name,
                languageCode: selectedTemplate.language || 'pt_BR',
                variables: templateParams.map(p => p || ' '),
                ticketId: ticketId,
                organizationId: user?.organization?.id,
                agentId: user?.id,
                agentName: user?.name,
            });

            setSendingTemplate(false);
            onClose();
            if (onTemplateSent) onTemplateSent();

        } catch (e: any) {
            setTemplateError(e.message);
            setSendingTemplate(false);
        }
    };

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center fade-in bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg mx-4 rounded-3xl flex flex-col glass-surface border border-white/10 shadow-2xl max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center">
                            <Zap size={18} className="text-primary-400" />
                        </div>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white">{t('Enviar Template Oficial', 'Send Official Template')}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer opacity-40 hover:opacity-100">
                        <X size={20} className="text-white" />
                    </button>
                </div>

                <div className="flex flex-col gap-6 p-6 overflow-y-auto flex-1 scrollbar-thin">
                    {templateError && (
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-shake">
                            <AlertCircle size={16} className="shrink-0 text-rose-400" />
                            <span className="font-medium">{templateError}</span>
                        </div>
                    )}

                    {!selectedTemplate && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] opacity-30 uppercase tracking-widest font-bold">{t('Modelos aprovados pela Meta', 'Meta approved models')}</p>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">WABA ACTIVE</span>
                            </div>

                            {loadingTemplates ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-30">
                                    <Loader2 size={24} className="animate-spin text-primary-400" />
                                    <span className="text-xs font-bold uppercase tracking-widest">{t('Sincronizando...', 'Synchronizing...')}</span>
                                </div>
                            ) : templates.length === 0 ? (
                                <div className="text-center py-16 opacity-30 border border-dashed border-white/10 rounded-2xl">
                                    <AlertCircle size={32} className="mx-auto mb-3" />
                                    <p className="text-xs font-bold uppercase tracking-widest">{t('Nenhum template encontrado', 'No templates found')}</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {templates.map((t, idx) => (
                                        <button
                                            key={`${t.name}-${t.language}-${idx}`}
                                            onClick={() => handleSelectTemplate(t)}
                                            className="w-full flex items-center justify-between p-5 rounded-2xl text-left transition-all cursor-pointer bg-white/3 border border-white/5 hover:bg-white/8 hover:border-white/10 group"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <p className="text-xs font-bold truncate text-white uppercase tracking-tight">{t.name.replace(/_/g, ' ')}</p>
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-white/5 text-white/40 border border-white/5">{t.language}</span>
                                                </div>
                                                <p className="text-[11px] opacity-40 line-clamp-2 leading-relaxed font-medium italic">"{getTemplateBody(t)}"</p>
                                            </div>
                                            <ChevronRight size={18} className="opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0 ml-4 text-primary-400" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {selectedTemplate && (
                        <div className="space-y-6 fade-in">
                            <button onClick={() => setSelectedTemplate(null)} className="text-[10px] font-bold opacity-30 hover:opacity-100 flex items-center gap-2 cursor-pointer uppercase tracking-widest transition-all">
                                <ChevronRight size={14} className="rotate-180" /> {t('Voltar para lista', 'Back to list')}
                            </button>

                            <div className="p-5 rounded-2xl bg-white/3 border border-white/5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-primary-500/5 rounded-full -mr-8 -mt-8 blur-xl" />
                                <p className="text-[10px] opacity-30 uppercase tracking-widest mb-3 font-bold flex items-center gap-2">
                                    {t('Visualização da Mensagem', 'Message Preview')}
                                    <div className="flex-1 h-px bg-white/5" />
                                </p>
                                <div className="bg-[#0c0c11] rounded-xl p-4 border border-white/5 shadow-inner">
                                    <p className="text-[13px] leading-relaxed text-left text-white/90 font-medium" style={{ whiteSpace: 'pre-wrap' }}>
                                        {renderBodyPreview(getTemplateBody(selectedTemplate), templateParams)}
                                    </p>
                                </div>
                            </div>

                            {templateParams.length > 0 && (
                                <div className="space-y-4">
                                    <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">{t('Variáveis Dinâmicas', 'Dynamic Variables')}</p>
                                    <div className="grid gap-3">
                                        {templateParams.map((val, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white/3 flex items-center justify-center shrink-0 border border-white/5">
                                                    <span className="text-[10px] font-bold text-primary-400 uppercase tracking-tighter">{`v${i + 1}`}</span>
                                                </div>
                                                <input
                                                    value={val}
                                                    onChange={e => {
                                                        const p = [...templateParams];
                                                        p[i] = e.target.value;
                                                        setTemplateParams(p);
                                                    }}
                                                    placeholder={t(`Conteúdo para {{${i + 1}}}`, `Content for {{${i + 1}}}`)}
                                                    className="flex-1 px-4 py-3 rounded-xl text-sm font-medium outline-none focus:ring-1 focus:ring-primary-500/40 text-white bg-white/3 border border-white/5 placeholder:opacity-20"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {selectedTemplate && (
                    <div className="px-6 py-5 border-t border-white/5 bg-white/2">
                        <button
                            onClick={sendTemplate}
                            disabled={sendingTemplate}
                            className="w-full py-4 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 cursor-pointer shadow-lg shadow-primary-500/20 text-white bg-primary-500 hover:bg-primary-600 border border-primary-400/20 disabled:opacity-50"
                        >
                            {sendingTemplate ? <Loader2 size={20} className="animate-spin" /> : <Send size={18} />}
                            {sendingTemplate ? t('Disparando...', 'Sending...') : t('Confirmar Envio', 'Confirm Sending')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
