import { useState, useEffect, useRef, useCallback } from 'react';
import {
    AlertTriangle,
    ShoppingCart,
    Brain,
    Copy,
    Check,
    Sparkles,
    ShieldAlert,
    Pill,
    TrendingUp,
    RefreshCw,
    Zap,
    MousePointerClick,
    ToggleLeft,
    ToggleRight,
    Wand2,
} from 'lucide-react';
import { subscribeToAiHint, unsubscribeFromAiHint, fetchAiHint, clearAiHint, fetchAiSettings } from '../services/aiService';
import type { AiHint, AiAlert, AiCrossSell } from '../services/aiService';
import { triggerAiCopilot } from '../services/n8n';
import { useLanguage } from '../contexts/LanguageContext';

interface AiCopilotPanelProps {
    ticketId: string | null;
    organizationId?: string | null;
    contactId?: string | null;
    onUseSuggestion?: (text: string) => void;
    onHintChange?: (hint: AiHint | null) => void;
    lastIncomingMessageId?: string | null;
    lastIncomingMessageTicketId?: string | null;
}

export default function AiCopilotPanel({ ticketId, organizationId, contactId, onUseSuggestion, onHintChange, lastIncomingMessageId, lastIncomingMessageTicketId }: AiCopilotPanelProps) {
    const { t } = useLanguage();
    const [hint, setHint] = useState<AiHint | null>(null);
    const [isThinking, setIsThinking] = useState(false);
    const [isAiActive, setIsAiActive] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    const channelRef = useRef<any>(null);
    const debounceRef = useRef<any>(null);
    const [orgAiEnabled, setOrgAiEnabled] = useState<boolean>(true); // default true until fetched

    useEffect(() => {
        if (organizationId) {
            fetchAiSettings(organizationId).then(({ data }) => {
                setOrgAiEnabled(data?.is_enabled ?? false);
            });
        }
    }, [organizationId]);

    // Fetch existing hint when ticket changes
    useEffect(() => {
        if (!ticketId) {
            setHint(null);
            setIsAiActive(false);
            return;
        }

        if (ticketId === 'tk_treinamento') {
            const mockHint: AiHint = {
                confidence: 0.95,
                suggestion: 'Olá Sr. João! Sim, temos a Lantus em estoque. Deseja que eu reserve para o senhor?',
                suggestions: [
                    'Olá Sr. João! Sim, temos a Lantus em estoque. Deseja que eu reserve para o senhor?',
                    'Tranquilo Sr. João, vou preparar sua entrega para hoje à tarde.',
                    'Posso ajudar com mais algum medicamento para o senhor?'
                ],
                alerts: [
                    { type: 'interaction', message: 'Observação: Paciente faz uso recorrente de Insulina Lantus. Verifique se ele precisa de agulhas novas.' }
                ],
                cross_sell: [
                    { product: 'Agulhas BD Ultra-Fine', reason: 'Essencial para a aplicação indolor da insulina.' },
                    { product: 'Alcool 70% Swabs', reason: 'Para higienização correta antes da aplicação.' }
                ],
                technical_info: 'Insulina Lantus (Glargina) é uma insulina de ação basal longa (24h). Não deve ser misturada com outras insulinas.',
                generated_at: new Date().toISOString()
            };
            setHint(mockHint);
            onHintChange?.(mockHint);
            setIsAiActive(true);
            return;
        }

        setSelectedIdx(null);
        fetchAiHint(ticketId).then(({ data }) => {
            setHint(data);
            onHintChange?.(data);
            if (data) setIsAiActive(true); // Auto-activate if there's already a hint
        });

        // Subscribe to realtime updates for ai_hint
        if (channelRef.current) {
            unsubscribeFromAiHint(channelRef.current);
        }

        channelRef.current = subscribeToAiHint(ticketId, (newHint) => {
            setHint(newHint);
            setIsThinking(false);
            setSelectedIdx(null);
            onHintChange?.(newHint);
        });

        return () => {
            if (channelRef.current) {
                unsubscribeFromAiHint(channelRef.current);
                channelRef.current = null;
            }
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [ticketId]);

    // When a new incoming message arrives and AI is active → trigger thinking state
    useEffect(() => {
        // ONLY trigger if the message specifically belongs to THIS ticket
        if (!lastIncomingMessageId || !isAiActive || !orgAiEnabled || !ticketId || lastIncomingMessageTicketId !== ticketId) return;

        // Debounce: wait 3 seconds after last message before triggering
        if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
            setIsThinking(true);

            // Call n8n webhook
            if (organizationId) {
                triggerAiCopilot({
                    ticketId: ticketId!,
                    organizationId,
                    contactId: contactId || undefined,
                }).catch((err) => {
                    console.error('AI Copilot trigger failed:', err);
                    setIsThinking(false);
                });
            }

            // Safety net: clear thinking after 15s max
            setTimeout(() => setIsThinking(false), 15000);
        }, 3000);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [lastIncomingMessageId, isAiActive, ticketId]);

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleSelectSuggestion = (text: string, idx: number) => {
        setSelectedIdx(idx);
        if (onUseSuggestion) {
            onUseSuggestion(text);
        }
    };

    const handleClearHint = async () => {
        if (ticketId) {
            await clearAiHint(ticketId);
            setHint(null);
            setSelectedIdx(null);
            onHintChange?.(null);
        }
    };

    const handleManualTrigger = () => {
        if (!ticketId || !organizationId) return;
        setIsThinking(true);
        triggerAiCopilot({
            ticketId,
            organizationId,
            contactId: contactId || undefined,
        }).catch((err) => {
            console.error('AI Copilot trigger failed:', err);
            setIsThinking(false);
        });
        setTimeout(() => setIsThinking(false), 15000);
    };

    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'interaction': return <Pill size={13} />;
            case 'retention': return <ShieldAlert size={13} />;
            case 'controlled': return <AlertTriangle size={13} />;
            default: return <AlertTriangle size={13} />;
        }
    };

    const getAlertLabel = (type: string) => {
        switch (type) {
            case 'interaction': return t('Interação Medicamentosa', 'Drug Interaction');
            case 'retention': return t('Retenção de Receita', 'Prescription Retention');
            case 'controlled': return t('Medicamento Controlado', 'Controlled Medication');
            default: return t('Alerta', 'Alert');
        }
    };

    // Build the list of suggestions to display
    const allSuggestions: string[] = [];
    if (hint) {
        if (hint.suggestions && hint.suggestions.length > 0) {
            allSuggestions.push(...hint.suggestions);
        } else if (hint.suggestion) {
            allSuggestions.push(hint.suggestion);
        }
    }

    // ── TOGGLE HEADER (always visible) ──
    const renderToggle = () => (
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
                <Zap size={13} className={isAiActive ? 'text-primary-400' : 'text-slate-400 dark:text-white/20'} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${
                    isAiActive ? 'text-primary-400' : 'text-slate-400 dark:text-white/30'
                }`}>
                    {t('Copiloto IA', 'AI Copilot')}
                </span>
            </div>
            <div className="flex items-center gap-1.5">
                {isAiActive && !isThinking && hint && (
                    <button
                        onClick={handleManualTrigger}
                        className="p-1 rounded-md text-slate-400 dark:text-white/30 hover:text-primary-400 hover:bg-primary-500/10 transition-all cursor-pointer"
                        title={t('Gerar nova sugestão', 'Generate new suggestion')}
                    >
                        <Wand2 size={12} />
                    </button>
                )}
                <button
                    onClick={() => setIsAiActive(!isAiActive)}
                    className="transition-all cursor-pointer"
                    title={isAiActive ? t('Desativar IA neste atendimento', 'Disable AI for this care') : t('Ativar IA neste atendimento', 'Enable AI for this care')}
                >
                    {isAiActive ? (
                        <ToggleRight size={28} className="text-primary-400" />
                    ) : (
                        <ToggleLeft size={28} className="text-slate-400 dark:text-white/20" />
                    )}
                </button>
            </div>
        </div>
    );

    // ── AI IS DISABLED GLOBALLY BY ADMIN ──
    if (!orgAiEnabled) {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                <div className="flex items-center gap-1.5 mb-2">
                    <Zap size={13} className="text-slate-400 dark:text-white/20" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
                        {t('Copiloto IA', 'AI Copilot')}
                    </span>
                </div>
                <div className="flex flex-col items-center justify-center py-4 gap-2 opacity-40">
                    <Brain size={22} className="text-slate-400" />
                    <p className="text-[10px] text-center text-slate-500 dark:text-white/40 max-w-[180px]">
                        {t('O Copiloto IA está desativado nas configurações da organização.', 'The AI Copilot is disabled in the organization settings.')}
                    </p>
                </div>
            </div>
        );
    }

    // ── AI IS OFF ──
    if (!isAiActive) {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                {renderToggle()}
                <div className="flex flex-col items-center justify-center py-4 gap-2 opacity-30">
                    <Brain size={22} className="text-slate-400" />
                    <p className="text-[10px] text-center text-slate-500 dark:text-white/30 max-w-[180px]">
                        {t('Ative o copiloto para receber sugestões da IA durante este atendimento.', 'Activate the copilot to receive AI suggestions during this care.')}
                    </p>
                </div>
            </div>
        );
    }

    // ── AI IS THINKING ──
    if (isThinking) {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                {renderToggle()}
                <div className="flex flex-col items-center py-5 gap-4 fade-in overflow-y-auto custom-scrollbar">
                    {/* Animated brain with orbit ring */}
                    <div className="relative w-14 h-14 flex items-center justify-center">
                        {/* Orbital ring */}
                        <div className="absolute inset-0 rounded-full border-2 border-transparent ai-thinking-orbit"
                            style={{
                                borderTopColor: 'rgba(99, 102, 241, 0.6)',
                                borderRightColor: 'rgba(139, 92, 246, 0.3)',
                            }}
                        />
                        {/* Inner pulse glow */}
                        <div className="absolute inset-1 rounded-full bg-primary-500/8 ai-thinking-pulse" />
                        {/* Brain icon */}
                        <Brain size={22} className="text-primary-400 relative z-10" />
                    </div>

                    {/* Thinking dots */}
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-400 ai-thinking-dot" />
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-400 ai-thinking-dot" />
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-400 ai-thinking-dot" />
                    </div>

                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary-400 mb-1">
                            {t('Analisando conversa...', 'Analyzing conversation...')}
                        </p>
                        <p className="text-[9px] text-slate-400 dark:text-white/25">
                            {t('Gerando sugestões de resposta', 'Generating response suggestions')}
                        </p>
                    </div>

                    {/* Shimmer skeleton cards */}
                    <div className="w-full space-y-2 mt-1">
                        <div className="shimmer-aurora h-14 rounded-xl" />
                        <div className="shimmer-aurora h-12 rounded-xl" style={{ animationDelay: '0.3s' }} />
                        <div className="shimmer-aurora h-10 rounded-xl" style={{ animationDelay: '0.6s' }} />
                    </div>
                </div>
            </div>
        );
    }

    // ── AI IS ACTIVE BUT NO HINT YET ──
    if (!hint) {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                {renderToggle()}
                <div className="flex flex-col items-center justify-center py-4 gap-3 overflow-y-auto custom-scrollbar">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-primary-500/8 flex items-center justify-center border border-primary-500/15">
                            <Sparkles size={18} className="text-primary-400" />
                        </div>
                        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-void-950" />
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-white/50 mb-0.5">
                            {t('IA ativada neste atendimento', 'AI activated for this care')}
                        </p>
                        <p className="text-[9px] text-slate-400 dark:text-white/30 max-w-[190px]">
                            {t('A cada nova mensagem do cliente, sugestões aparecerão automaticamente.', 'With each new message from the customer, suggestions will appear automatically.')}
                        </p>
                    </div>
                    {/* Manual trigger button */}
                    <button
                        onClick={handleManualTrigger}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-primary-500 dark:text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 transition-all cursor-pointer border border-primary-500/20"
                    >
                        <Wand2 size={12} />
                        {t('Gerar Sugestão Agora', 'Generate Suggestion Now')}
                    </button>
                </div>
            </div>
        );
    }

    // ── AI HAS SUGGESTIONS ──
    const confidencePercent = Math.round((hint.confidence || 0) * 100);
    const confidenceColor = confidencePercent >= 80 ? 'emerald' : confidencePercent >= 50 ? 'amber' : 'rose';

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {renderToggle()}

            <div className="space-y-2.5 fade-in overflow-y-auto pr-1.5 flex-1 min-h-0 custom-scrollbar scroll-smooth pb-4">
                {/* Confidence + actions bar */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <MousePointerClick size={11} className="text-slate-400 dark:text-white/30" />
                        <span className="text-[9px] text-slate-400 dark:text-white/30 font-semibold">
                            {t('Clique para usar no chat', 'Click to use in chat')}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md tag-${confidenceColor}`}>
                            <div className="w-7 h-1 rounded-full bg-white/10 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        confidenceColor === 'emerald' ? 'bg-emerald-400'
                                        : confidenceColor === 'amber' ? 'bg-amber-400'
                                        : 'bg-rose-400'
                                    }`}
                                    style={{ width: `${confidencePercent}%` }}
                                />
                            </div>
                            <span className="text-[9px] font-bold">{confidencePercent}%</span>
                        </div>
                        <button
                            onClick={handleClearHint}
                            className="p-1 rounded-md text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                            title={t('Limpar sugestões', 'Clear suggestions')}
                        >
                            <RefreshCw size={11} />
                        </button>
                    </div>
                </div>

                {/* Suggestions moved above the chat input — see ChatWindow */}

                {/* ── SAFETY ALERTS ── */}
                {hint.alerts && hint.alerts.length > 0 && (
                    <div className="space-y-1.5">
                        {hint.alerts.map((alert: AiAlert, i: number) => (
                            <div
                                key={i}
                                className={`rounded-xl p-2.5 flex items-start gap-2 border fade-up ${
                                    alert.type === 'controlled'
                                        ? 'bg-rose-500/8 border-rose-500/20'
                                        : alert.type === 'interaction'
                                        ? 'bg-amber-500/8 border-amber-500/20'
                                        : 'bg-orange-500/8 border-orange-500/20'
                                }`}
                                style={{ animationDelay: `${i * 60}ms` }}
                            >
                                <div className={`p-1 rounded-md shrink-0 ${
                                    alert.type === 'controlled' ? 'bg-rose-500/15 text-rose-400'
                                    : alert.type === 'interaction' ? 'bg-amber-500/15 text-amber-400'
                                    : 'bg-orange-500/15 text-orange-400'
                                }`}>
                                    {getAlertIcon(alert.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[9px] font-black uppercase tracking-wider mb-0.5 ${
                                        alert.type === 'controlled' ? 'text-rose-500 dark:text-rose-400'
                                        : alert.type === 'interaction' ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-orange-600 dark:text-orange-400'
                                    }`}>
                                        ⚠ {getAlertLabel(alert.type)}
                                    </p>
                                    <p className="text-[11px] text-slate-600 dark:text-white/70 leading-relaxed">{alert.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── TECHNICAL INFO & EQUIVALENTS ── */}
                {hint.technical_info && (
                    <div
                        className="w-full rounded-xl border p-2.5 bg-indigo-500/5 dark:bg-indigo-500/8 border-indigo-500/15"
                    >
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Pill size={13} className="text-indigo-400" />
                            <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                {t('Informação Técnica & Equivalentes', 'Technical Info & Equivalents')}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-white/70 leading-relaxed font-medium">
                            {hint.technical_info}
                        </p>
                    </div>
                )}

                {/* ── CROSS-SELL ── */}
                {hint.cross_sell && hint.cross_sell.length > 0 && (
                    <div className="rounded-xl bg-emerald-500/5 dark:bg-emerald-500/8 border border-emerald-500/15 p-2.5">
                        <div className="flex items-center gap-1.5 mb-2">
                            <TrendingUp size={13} className="text-emerald-400" />
                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                {t('Combos de Saúde & Bem-estar', 'Health & Wellness Combos')}
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            {hint.cross_sell.map((item: AiCrossSell, i: number) => (
                                <button
                                    key={i}
                                    onClick={() => handleSelectSuggestion(t(`Que tal complementar com ${item.product}? ${item.reason}`, `How about complementing with ${item.product}? ${item.reason}`), 100 + i)}
                                    className={`w-full text-left flex items-start gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                                        selectedIdx === 100 + i
                                            ? 'bg-emerald-500/10 border-emerald-500/25'
                                             : 'bg-white/50 dark:bg-white/3 border-emerald-500/10 hover:bg-emerald-500/8'
                                    }`}
                                >
                                    <ShoppingCart size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-bold text-slate-700 dark:text-white/90">{item.product}</p>
                                        <p className="text-[10px] text-slate-500 dark:text-white/50">{item.reason}</p>
                                    </div>
                                    {selectedIdx === 100 + i && <Check size={12} className="text-emerald-400 shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Timestamp */}
                {hint.generated_at && (
                    <p className="text-[9px] text-slate-400 dark:text-white/25 text-right font-mono">
                        {new Date(hint.generated_at).toLocaleTimeString(t('pt-BR', 'en-US'), { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                )}
            </div>
        </div>
    );
}
