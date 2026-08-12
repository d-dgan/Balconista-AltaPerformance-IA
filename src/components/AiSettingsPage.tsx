import { useState, useEffect, useRef } from 'react';
import {
    Bot,
    Key,
    Save,
    Sparkles,
    Settings2,
    Store,
    Pill,
    Handshake,
    ToggleLeft,
    ToggleRight,
    Plus,
    X,
    Check,
    Loader2,
    AlertCircle,
    Eye,
    EyeOff,
    Truck,
    MapPin,
    Stethoscope,
    MessageSquare,
    DollarSign,
    Brain,
    ChevronDown,
    ChevronUp,
    Info,
    Image,
    Upload,
    Trash2,
    Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTour } from '../contexts/TourContext';
import { fetchAiSettings, upsertAiSettings, fetchOrgLogoUrl, uploadClientLogo, deleteClientLogo } from '../services/aiService';
import type { AiSettings, AiPartner, AiContextData } from '../services/aiService';

const getModels = (t: any) => [
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', desc: t('Rápido e econômico', 'Fast and economical') },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', desc: t('Mais inteligente, maior custo', 'Smarter, higher cost') },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', desc: t('Última geração', 'Latest generation') },
];

const getPharmacyServices = (t: any) => [
    { key: 'aferição de pressão arterial', label: t('Aferição de Pressão Arterial', 'Blood Pressure Measurement'), icon: '🩺' },
    { key: 'glicemia capilar', label: t('Glicemia Capilar', 'Capillary Blood Glucose'), icon: '💉' },
    { key: 'aplicação de injeções', label: t('Aplicação de Injeções', 'Injections'), icon: '💊' },
    { key: 'aplicação de vacinas', label: t('Aplicação de Vacinas', 'Vaccines'), icon: '🛡️' },
    { key: 'teste de gravidez', label: t('Teste de Gravidez', 'Pregnancy Test'), icon: '🤰' },
    { key: 'curativos e primeiros socorros', label: t('Curativos / Primeiros Socorros', 'Dressings / First Aid'), icon: '🩹' },
    { key: 'inalação / nebulização', label: t('Inalação / Nebulização', 'Inhalation / Nebulization'), icon: '💨' },
    { key: 'manipulação de fórmulas', label: t('Manipulação de Fórmulas', 'Compounding'), icon: '⚗️' },
    { key: 'dermocosméticos', label: t('Dermocosméticos', 'Dermocosmetics'), icon: '✨' },
    { key: 'homeopatia', label: t('Homeopatia', 'Homeopathy'), icon: '🌿' },
    { key: 'fitoterápicos', label: t('Fitoterápicos e Naturais', 'Herbal and Natural Products'), icon: '🌱' },
    { key: 'farmácia popular', label: t('Farmácia Popular', 'Popular Pharmacy Program'), icon: '🏛️' },
];

const getToneOptions = (t: any) => [
    { value: 'Profissional e acolhedor, linguagem clara e acessível.', label: t('🤝 Profissional e Acolhedor', '🤝 Professional and Welcoming') },
    { value: 'Formal e técnico, termos científicos quando necessário.', label: t('🎓 Formal e Técnico', '🎓 Formal and Technical') },
    { value: 'Descontraído e amigável, próximo e humano.', label: t('😊 Descontraído e Amigável', '😊 Relaxed and Friendly') },
    { value: 'Direto ao ponto, respostas curtas e objetivas.', label: t('⚡ Direto e Objetivo', '⚡ Direct and Objective') },
];

// Build the system prompt automatically from structured config
function buildSystemPrompt(config: {
    toneOfVoice: string;
    behaviors: Record<string, boolean>;
    pricingRules: string;
    deliveryFee: string;
    availableServices: string[];
}, t: any): string {
    const { toneOfVoice, behaviors, pricingRules, deliveryFee, availableServices } = config;

    let prompt = t(`Identidade:
Você é um Consultor Farmacêutico da equipe de atendimento. Sua função é ser o "segundo cérebro" do atendente — você NUNCA fala diretamente com o cliente, mas gera mensagens PRONTAS para o atendente copiar e enviar.

⚠️ REGRA CRÍTICA DE ESTOQUE: Você NÃO tem acesso ao estoque real. NUNCA confirme disponibilidade. Sempre inclua que o atendente "vai verificar agora no sistema".

Tom de voz: ${toneOfVoice || 'Profissional e acolhedor.'}
`, `Identity:
You are a Pharmaceutical Consultant on the customer service team. Your role is as the attendant's "second brain" — you NEVER speak directly with the customer, but generate READY-TO-SEND messages for the attendant to copy and paste.

⚠️ CRITICAL STOCK RULE: You do NOT have access to real-time stock. NEVER confirm availability. Always mention that the attendant "will check the system now".

Tone of voice: ${toneOfVoice || 'Professional and welcoming.'}
`);

    if (availableServices.length > 0) {
        prompt += `\n${t('Serviços disponíveis nesta farmácia:', 'Available services at this pharmacy:')} ${availableServices.join(', ')}. ${t('Mencione esses serviços quando relevante.', 'Mention these services when relevant.')}\n`;
    }

    if (deliveryFee) {
        prompt += `\n${t('Política de entrega:', 'Delivery policy:')} ${deliveryFee}\n`;
    }

    if (pricingRules) {
        prompt += `\n${t('Regras de precificação:', 'Pricing rules:')} ${pricingRules}\n`;
    }

    prompt += `\n${t('Diretrizes de comportamento:', 'Behavior guidelines:')}\n`;
    prompt += `1. ${t('Gere SEMPRE mensagens prontas para o atendente enviar ao cliente (campo "suggestions").', 'ALWAYS generate ready-to-send messages for the attendant to send to the customer ("suggestions" field).')}\n`;

    if (behaviors.intercambialidade) {
        prompt += `2. ${t(
            'Autoridade Técnica: no campo "technical_info", estruture de forma compacta e OBRIGATÓRIA: 1) SEMPRE identifique a Referência [REF]. 2) Liste o produto do cliente com [REF], [GEN] ou [SIM]. 3) Liste equivalentes (nome+fabricante). 4) Posologia padrão [POS]. 5) Use ⚠️ para alertas críticos (tarja, retenção, álcool). Restrições: máx 12 palavras por linha, máx 6 linhas total, sem frases introdutórias.',
            'Technical Authority: in "technical_info", structure compactly and MANDATORILY: 1) ALWAYS identify the Reference [REF]. 2) List customer\'s product with [REF], [GEN] or [SIM]. 3) List equivalents (name+mfr). 4) Standard posology [POS]. 5) Use ⚠️ for critical alerts (strip, retention, alcohol). Constraints: max 12 words per line, max 6 lines total, no intro phrases.'
        )}\n`;
    }
    if (behaviors.investigacao) {
        prompt += `3. ${t('Investigação Preventiva: sugira perguntas para entender melhor o caso antes de recomendar.', 'Preventive Investigation: suggest questions to better understand the case before recommending.')}\n`;
    }
    if (behaviors.crossSell) {
        prompt += `4. ${t('Combos de Saúde e Cross-sell: sempre sugira produtos complementares de alto valor clínico. Dê DESTAQUE especial a Vitaminas e Suplementos correlacionados ao problema (ex: Magnésio ou B2 para Dores de Cabeça/Enxaqueca, Vitamina C/Zinco para Imunidade, Complexo B para Fadiga, Vitamina D para dores crônicas). Sempre explique o porquê técnico da indicação.', 'Health Combos and Cross-sell: always suggest high-value clinical complementary products. Give special EMPHASIS to Vitamins and Supplements correlated to the problem (e.g., Magnesium or B2 for Headaches/Migraine, Vitamin C/Zinc for Immunity, B Complex for Fatigue, Vitamin D for chronic pain). Always explain the technical reasoning for the recommendation.')}\n`;
    }
    if (behaviors.alertas) {
        prompt += `5. ${t('Alertas Clínicos: identifique interações medicamentosas, medicamentos controlados e receitas obrigatórias.', 'Clinical Alerts: identify drug interactions, controlled medications, and mandatory prescriptions.')}\n`;
    }

    prompt += `\n${t('REGRAS DE CONCISÃO E ESTILO (CRÍTICAS):', 'CONCISENESS AND STYLE RULES (CRITICAL):')}
- ${t('PROIBIDO usar frases de confirmação ou reconhecimento como "Entendi que você busca...", "Compreendo que...", "Ok, vamos verificar..." ou similares. O atendente deve ir direto ao ponto/informação.', 'FORBIDDEN to use confirmation or acknowledgment phrases like "I understand you are looking for...", "I understand that...", "Ok, let\'s check..." or similar. The attendant must get straight to the point/information.')}
- ${t('PROIBIDO usar frases genéricas como "sempre com a aprovação do médico responsável", "consulte seu médico" ou qualquer disclaimer médico padrão. A IA já deve ser técnica o suficiente para ser segura sem clichês.', 'FORBIDDEN to use generic phrases like "always with the approval of the responsible physician", "consult your doctor" or any standard medical disclaimer. The AI must be technical enough to be safe without clichés.')}
- ${t('PROIBIDO incluir títulos ou rótulos internos como "Venda Sugestiva", "Sugestão de Venda", "Informação técnica" ou "Dica" dentro dos campos de texto (suggestions, reason, message, info).', 'FORBIDDEN to include titles or internal labels like "Upsell", "Sales Suggestion", "Technical Information" or "Tip" within text fields (suggestions, reason, message, info).')}
- ${t('O campo "reason" no cross-sell deve ser curto (máximo 15 palavras) e focado no benefício direto ao paciente.', 'The "reason" field in cross-sell must be short (maximum 15 words) and focused on the direct benefit to the patient.')}
- ${t('As mensagens no campo "suggestions" devem ser PRONTAS para o atendente copiar e colar.', 'Messages in the "suggestions" field must be READY for the attendant to copy and paste.')}
`;

    prompt += `
${t('Formato da Saída Obrigatório — responda SEMPRE em JSON válido:', 'Mandatory Output Format — ALWAYS respond in valid JSON:')}
{
  "suggestions": ["${t('Mensagem pronta no tom de voz definido', 'Ready-to-send message in the defined tone of voice')}"],
  "alerts": [{"type": "controlled|interaction|retention", "message": "${t('Resumo do alerta (ex: Precisa de Receita B1)', 'Alert summary (e.g., Needs B1 Prescription)')}"}],
  "cross_sell": [{"product": "${t('Nome do Produto', 'Product Name')}", "reason": "${t('Por que oferecer (sem clichês médicos)', 'Why offer (without medical clichés)')}"}],
  "technical_info": "${t('Informação técnica direta + Equivalentes', 'Direct technical information + Equivalents')}",
  "confidence": 0.0
}`;

    return prompt;
}

function FieldHint({ text }: { text: React.ReactNode }) {
    return (
        <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-white/30 mt-1">
            <Info size={10} />
            {text}
        </span>
    );
}

function SectionCard({ icon, iconBg, title, children }: {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="glass-surface rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${iconBg}`}>{icon}</div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h3>
            </div>
            {children}
        </div>
    );
}

export default function AiSettingsPage() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const { checkAndStartTour } = useTour();
    const orgId = user?.organization?.id;



    const MODELS = getModels(t);
    const PHARMACY_SERVICES = getPharmacyServices(t);
    const TONE_OPTIONS = getToneOptions(t);

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isLoading) {
            checkAndStartTour('ia-copiloto');
        }
    }, [checkAndStartTour, isLoading]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [showApiKey, setShowApiKey] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Logo
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [logoError, setLogoError] = useState<string | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Basic
    const [isEnabled, setIsEnabled] = useState(false);
    const [model, setModel] = useState('gemini-2.0-flash');
    const [apiKey, setApiKey] = useState('');
    const [apiKeyPlaceholder, setApiKeyPlaceholder] = useState('');
    const [openAiKey, setOpenAiKey] = useState('');
    const [openAiKeyPlaceholder, setOpenAiKeyPlaceholder] = useState('');
    const [showOpenAiKey, setShowOpenAiKey] = useState(false);

    const [serpApiKey, setSerpApiKey] = useState('');
    const [serpApiKeyPlaceholder, setSerpApiKeyPlaceholder] = useState('');
    const [showSerpApiKey, setShowSerpApiKey] = useState(false);

    const [hasGemini, setHasGemini] = useState(false);
    const [hasOpenAi, setHasOpenAi] = useState(false);
    const [hasSerpApi, setHasSerpApi] = useState(false);

    // Unit
    const [unitName, setUnitName] = useState('');
    const [unitAddress, setUnitAddress] = useState('');
    const [unitPhone, setUnitPhone] = useState('');
    const [deliveryPhone, setDeliveryPhone] = useState('');

    // Services & Delivery
    const [availableServices, setAvailableServices] = useState<string[]>([]);
    const [deliveryFee, setDeliveryFee] = useState('');
    const [deliveryArea, setDeliveryArea] = useState('');

    // Specialties
    const [specialties, setSpecialties] = useState<string[]>([]);
    const [newSpecialty, setNewSpecialty] = useState('');

    // Partners
    const [partners, setPartners] = useState<AiPartner[]>([]);

    // Behavior toggles
    const [behaviors, setBehaviors] = useState({
        intercambialidade: true,
        investigacao: true,
        crossSell: true,
        alertas: true,
    });

    // Tone & Pricing
    const [toneOfVoice, setToneOfVoice] = useState(TONE_OPTIONS[0].value);
    const [pricingRules, setPricingRules] = useState('');


    useEffect(() => {
        if (!orgId) return;
        loadSettings();
    }, [orgId]);

    useEffect(() => {
        const handleTourAction = (e: any) => {
            if (e.detail?.action === 'open-ai-advanced') setShowAdvanced(true);
            if (e.detail?.action === 'close-ai-advanced') setShowAdvanced(false);
            if (e.detail?.action === 'mock-ai-data') {
                setUnitName('Drogaria Vida');
                setUnitAddress('Av. Brasil, 1500 - São Paulo');
                setUnitPhone('(11) 4004-0000');
                setDeliveryFee('R$ 5,00');
                setPricingRules('Convênio OAB: 15% OFF. Pague Leve 3 Pague 2 em Vitaminas.');
            }
        };
        window.addEventListener('tour:action', handleTourAction);
        return () => window.removeEventListener('tour:action', handleTourAction);
    }, []);

    const loadSettings = async () => {
        setIsLoading(true);
        const { data } = await fetchAiSettings(orgId as string);
        if (data) {
            setIsEnabled(data.is_enabled || false);
            setModel(data.model || 'gemini-1.5-flash');
            // setSystemPrompt(data.system_prompt || ''); // Removed manual prompt override
            if (data.gemini_api_key) {
                setApiKeyPlaceholder('•••••••••' + data.gemini_api_key.slice(-4));
                setHasGemini(true);
            } else setHasGemini(false);
            
            if (data.openai_api_key) {
                setOpenAiKeyPlaceholder('•••••••••' + data.openai_api_key.slice(-4));
                setHasOpenAi(true);
            } else setHasOpenAi(false);

            if (data.serpapi_key) {
                setSerpApiKeyPlaceholder('•••••••••' + data.serpapi_key.slice(-4));
                setHasSerpApi(true);
            } else setHasSerpApi(false);
            const ctx = data.context_data || {};
            setUnitName(ctx.unit?.name || '');
            setUnitAddress(ctx.unit?.address || '');
            setUnitPhone(ctx.unit?.phone || '');
            setDeliveryPhone(ctx.unit?.delivery_phone || '');
            setSpecialties(ctx.specialties || []);
            setPartners(ctx.partners || []);
            setToneOfVoice(ctx.tone_of_voice || TONE_OPTIONS[0].value);
            setPricingRules(ctx.pricing_rules || '');
            setDeliveryFee(ctx.delivery_fee || '');
            setDeliveryArea(ctx.delivery_area || '');
            setAvailableServices(ctx.available_services || []);
        }
        // Load logo directly from organizations table
        const { url } = await fetchOrgLogoUrl(orgId as string);
        setLogoUrl(url);
        setIsLoading(false);
    };

    const toggleService = (key: string) => {
        setAvailableServices(prev =>
            prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
        );
    };

    const toggleBehavior = (key: keyof typeof behaviors) => {
        setBehaviors(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async () => {
        if (!orgId) return;
        setIsSaving(true);
        setSaveError(null);
        setSaveSuccess(false);

        const finalPrompt = buildSystemPrompt({ toneOfVoice, behaviors, pricingRules, deliveryFee, availableServices }, t);

        const contextData: AiContextData = {
            unit: { name: unitName, address: unitAddress, phone: unitPhone, delivery_phone: deliveryPhone },
            specialties,
            partners,
            tone_of_voice: toneOfVoice,
            pricing_rules: pricingRules,
            delivery_fee: deliveryFee,
            delivery_area: deliveryArea,
            available_services: availableServices,
        };

        const settings: Partial<AiSettings> = {
            is_enabled: isEnabled,
            model,
            system_prompt: finalPrompt,
            context_data: contextData,
        };

        if (apiKey.trim()) settings.gemini_api_key = apiKey.trim();
        if (openAiKey.trim()) settings.openai_api_key = openAiKey.trim();
        if (serpApiKey.trim()) settings.serpapi_key = serpApiKey.trim();

        const { error } = await upsertAiSettings(orgId as string, settings);

        if (error) {
            setSaveError(error.message || 'Erro ao salvar configurações');
        } else {
            setSaveSuccess(true);
            if (apiKey.trim()) {
                setApiKeyPlaceholder('•••••••••' + apiKey.slice(-4));
                setHasGemini(true);
                setApiKey('');
            }
            if (openAiKey.trim()) {
                setOpenAiKeyPlaceholder('•••••••••' + openAiKey.slice(-4));
                setHasOpenAi(true);
                setOpenAiKey('');
            }
            if (serpApiKey.trim()) {
                setSerpApiKeyPlaceholder('•••••••••' + serpApiKey.trim().slice(-4));
                setHasSerpApi(true);
                setSerpApiKey('');
            }
            setTimeout(() => setSaveSuccess(false), 3000);
        }
        setIsSaving(false);
    };

    const addSpecialty = () => {
        if (!newSpecialty.trim()) return;
        if (!specialties.includes(newSpecialty.trim())) setSpecialties([...specialties, newSpecialty.trim()]);
        setNewSpecialty('');
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !orgId) return;
        if (file.type !== 'image/png') {
            setLogoError(t('Apenas arquivos PNG são aceitos.', 'Only PNG files are accepted.'));
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setLogoError(t('O arquivo deve ter no máximo 2MB.', 'File must be 2MB or less.'));
            return;
        }
        setLogoError(null);
        setIsUploadingLogo(true);
        const { url, error } = await uploadClientLogo(orgId, file);
        setIsUploadingLogo(false);
        if (error) {
            setLogoError(t('Erro ao enviar logo. Tente novamente.', 'Error uploading logo. Please try again.'));
        } else {
            setLogoUrl(url);
        }
        // reset input so same file can be re-selected
        if (logoInputRef.current) logoInputRef.current.value = '';
    };

    const handleLogoDelete = async () => {
        if (!orgId || !logoUrl) return;
        setIsUploadingLogo(true);
        await deleteClientLogo(orgId);
        setLogoUrl(null);
        setIsUploadingLogo(false);
    };

    const addPartner = () => setPartners([...partners, { brand: '', category: '', priority: 'medium' }]);
    const updatePartner = (idx: number, field: keyof AiPartner, value: string) => {
        const updated = [...partners];
        (updated[idx] as any)[field] = value;
        setPartners(updated);
    };
    const removePartner = (idx: number) => setPartners(partners.filter((_, i) => i !== idx));

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 size={24} className="text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-6 fade-in">
            <div className="max-w-3xl mx-auto space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                            <Bot size={22} className="text-primary-400" />
                            {t('Copiloto IA', 'AI Copilot')}
                        </h2>
                        <p className="text-xs text-slate-400 dark:text-white/40 mt-1">
                            {t('Configure o assistente inteligente da sua farmácia', 'Configure your pharmacy\'s intelligent assistant')}
                        </p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        data-tour="ai-save-button"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50"
                        style={{
                            background: saveSuccess ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                            color: 'white',
                            boxShadow: saveSuccess ? '0 0 20px rgba(16,185,129,.3)' : '0 0 20px rgba(99,102,241,.3)',
                        }}
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : saveSuccess ? <Check size={16} /> : <Save size={16} />}
                        {isSaving ? t('Salvando...', 'Saving...') : saveSuccess ? t('Salvo!', 'Saved!') : t('Salvar Configurações', 'Save Settings')}
                    </button>
                </div>

                {saveError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium">
                        <AlertCircle size={14} />{saveError}
                    </div>
                )}

                {/* ── ATIVAR + MODELO + API KEY ── */}
                <SectionCard icon={<Sparkles size={15} className="text-primary-400" />} iconBg="bg-primary-500/10" title={t('Configuração Geral', 'General Configuration')}>
                    {/* Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-void-800/50 border border-slate-200 dark:border-white/5">
                        <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">{t('Ativar Copiloto IA', 'Activate AI Copilot')}</p>
                            <p className="text-[11px] text-slate-400 dark:text-white/40">{t('A IA sugerirá respostas automaticamente a cada nova mensagem do cliente', 'The AI will automatically suggest responses for each new message from the customer')}</p>
                        </div>
                        <button onClick={() => setIsEnabled(!isEnabled)} className="transition-all cursor-pointer" data-tour="ai-toggle">
                            {isEnabled ? <ToggleRight size={36} className="text-emerald-400" /> : <ToggleLeft size={36} className="text-slate-400 dark:text-white/30" />}
                        </button>
                    </div>

                    {/* API Keys Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Gemini Key */}
                        <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-void-800/50 border border-slate-200 dark:border-white/5">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">
                                    <Key size={12} className="text-primary-400" />
                                    {t('Cérebro do Atendimento (Google Gemini)', 'Support Brain (Google Gemini)')}
                                </label>
                                {hasGemini ? (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full"><Check size={10} className="stroke-3" /> Cadastrada</span>
                                ) : (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full"><X size={10} className="stroke-3" /> Não cadastrada</span>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    type={showApiKey ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder={apiKeyPlaceholder || 'AIzaSy...'}
                                    data-tour="ai-gemini-key"
                                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-void-800 border border-slate-200 dark:border-white/10 text-xs outline-none focus:border-primary-500/50 text-slate-700 dark:text-white font-mono transition-all"
                                />
                                <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 cursor-pointer">
                                    {showApiKey ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-white/30 leading-tight">
                                {t('Responsável pelas sugestões de respostas automáticas no chat e pela criação inteligente de Encartes.', 'Responsible for automatic chat response suggestions and intelligent Flyer creation.')}
                            </p>
                            <FieldHint text={<><a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">Obter Chave Gemini</a></>} />
                        </div>

                        {/* OpenAI Key */}
                        <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-void-800/50 border border-slate-200 dark:border-white/5">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">
                                    <Zap size={12} className="text-emerald-400" />
                                    {t('Cérebro Técnico (OpenAI ChatGPT)', 'Technical Brain (OpenAI ChatGPT)')}
                                </label>
                                {hasOpenAi ? (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full"><Check size={10} className="stroke-3" /> Cadastrada</span>
                                ) : (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full"><X size={10} className="stroke-3" /> Não cadastrada</span>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    type={showOpenAiKey ? 'text' : 'password'}
                                    value={openAiKey}
                                    onChange={(e) => setOpenAiKey(e.target.value)}
                                    placeholder={openAiKeyPlaceholder || 'sk-...'}
                                    data-tour="ai-openai-key"
                                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-void-800 border border-slate-200 dark:border-white/10 text-xs outline-none focus:border-emerald-500/50 text-slate-700 dark:text-white font-mono transition-all"
                                />
                                <button type="button" onClick={() => setShowOpenAiKey(!showOpenAiKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 cursor-pointer">
                                    {showOpenAiKey ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-white/30 leading-tight">
                                {t('Usado pelo Especialista Farma para análise profunda de medicamentos e protocolos.', 'Used by the Pharma Specialist for deep analysis of drugs and protocols.')}
                            </p>
                            <FieldHint text={<><a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Obter Chave OpenAI</a></>} />
                        </div>

                        {/* SerpAPI Key */}
                        <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-void-800/50 border border-slate-200 dark:border-white/5">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">
                                    <Image size={12} className="text-blue-400" />
                                    {t('Cérebro Visual (SerpApi Images)', 'Visual Brain (SerpApi Images)')}
                                </label>
                                {hasSerpApi ? (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full"><Check size={10} className="stroke-3" /> Cadastrada</span>
                                ) : (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full"><X size={10} className="stroke-3" /> Não cadastrada</span>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    type={showSerpApiKey ? 'text' : 'password'}
                                    value={serpApiKey}
                                    onChange={(e) => setSerpApiKey(e.target.value)}
                                    placeholder="a00b12..."
                                    data-tour="ai-serpapi-key"
                                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-void-800 border border-slate-200 dark:border-white/10 text-xs outline-none focus:border-blue-500/50 text-slate-700 dark:text-white font-mono transition-all"
                                />
                                <button type="button" onClick={() => setShowSerpApiKey(!showSerpApiKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 cursor-pointer">
                                    {showSerpApiKey ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-white/30 leading-tight">
                                {t('Buscador de fotos de embalagem (n8n).', 'Packaging photo search engine (n8n).')}
                            </p>
                            <FieldHint text={<><a href="https://serpapi.com/manage-api-key" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Obter Chave SerpApi</a></>} />
                        </div>
                    </div>


                </SectionCard>

                {/* ── DADOS DA FARMÁCIA ── */}
                <SectionCard icon={<Store size={15} className="text-emerald-400" />} iconBg="bg-emerald-500/10" title={t('Dados da Farmácia', 'Pharmacy Data')}>
                    <div data-tour="ai-pharmacy-data">
                        <p className="text-[11px] text-slate-400 dark:text-white/40 -mt-2">{t('A IA usará esses dados para responder perguntas sobre localização, telefone e entrega.', 'The AI will use this data to answer questions about location, phone, and delivery.')}</p>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                        {[
                            { label: t('Nome da Farmácia', 'Pharmacy Name'), val: unitName, set: setUnitName, ph: t('Ex: Cora Farma', 'Ex: Cora Pharma') },
                            { label: t('Endereço', 'Address'), val: unitAddress, set: setUnitAddress, ph: t('Rua, número, cidade', 'Street, number, city') },
                            { label: t('Telefone Principal', 'Main Phone'), val: unitPhone, set: setUnitPhone, ph: '(XX) XXXX-XXXX' },
                            { label: t('Telefone Tele-Entrega', 'Delivery Phone'), val: deliveryPhone, set: setDeliveryPhone, ph: '(XX) XXXX-XXXX' },
                        ].map(({ label, val, set, ph }) => (
                            <div key={label}>
                                <label className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-1 block">{label}</label>
                                <input value={val} onChange={(e) => set(e.target.value)} placeholder={ph}
                                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-void-800 border border-slate-200 dark:border-white/10 text-sm outline-none focus:border-primary-500/50 text-slate-700 dark:text-white transition-all" />
                            </div>
                        ))}
                        </div>
                    </div>
                </SectionCard>

                {/* ── LOGO DA FARMÁCIA ── */}
                <SectionCard icon={<Image size={15} className="text-indigo-400" />} iconBg="bg-indigo-500/10" title={t('Logo da Farmácia', 'Pharmacy Logo')}>
                    {/* Warning */}
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-600 dark:text-amber-300 leading-relaxed font-medium">
                            {t(
                                'A logo deve ser um arquivo PNG com fundo transparente (sem fundo). Isso garante que ela fique com boa aparência em qualquer cor de tema.',
                                'The logo must be a PNG file with a transparent background (no background). This ensures it looks great on any theme color.'
                            )}
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Preview */}
                        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-white/10 flex items-center justify-center bg-slate-100 dark:bg-void-800 overflow-hidden shrink-0">
                            {logoUrl ? (
                                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                            ) : (
                                <Image size={28} className="text-slate-300 dark:text-white/20" />
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex-1 space-y-2">
                            <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/png"
                                className="hidden"
                                onChange={handleLogoUpload}
                            />
                            <button
                                onClick={() => logoInputRef.current?.click()}
                                disabled={isUploadingLogo}
                                data-tour="ai-logo-upload"
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 w-full justify-center"
                            >
                                {isUploadingLogo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                {isUploadingLogo
                                    ? t('Enviando...', 'Uploading...')
                                    : logoUrl
                                        ? t('Substituir Logo', 'Replace Logo')
                                        : t('Enviar Logo PNG', 'Upload PNG Logo')
                                }
                            </button>
                            {logoUrl && (
                                <button
                                    onClick={handleLogoDelete}
                                    disabled={isUploadingLogo}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-rose-500/20 bg-rose-500/10 text-rose-500 dark:text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-50 w-full justify-center"
                                >
                                    <Trash2 size={14} />
                                    {t('Remover Logo', 'Remove Logo')}
                                </button>
                            )}
                            {logoError && (
                                <p className="text-[11px] text-rose-500 flex items-center gap-1">
                                    <AlertCircle size={11} />{logoError}
                                </p>
                            )}
                            <p className="text-[10px] text-slate-400 dark:text-white/30">
                                {t('Formato: PNG · Tamanho máximo: 2MB', 'Format: PNG · Max size: 2MB')}
                            </p>
                        </div>
                    </div>
                </SectionCard>

                {/* ── TELE-ENTREGA ── */}
                <SectionCard icon={<Truck size={15} className="text-sky-400" />} iconBg="bg-sky-500/10" title={t('Tele-Entrega', 'Delivery')}>
                    <div data-tour="ai-delivery">
                        <p className="text-[11px] text-slate-400 dark:text-white/40 -mt-2">{t('A IA mencionará automaticamente sua política de entrega quando o cliente perguntar.', 'The AI will automatically mention your delivery policy when the customer asks.')}</p>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <DollarSign size={11} /> {t('Taxa de Entrega', 'Delivery Fee')}
                            </label>
                            <input value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)}
                                placeholder={t("Ex: Grátis acima de R$50, ou R$8 fixo", "Ex: Free above R$50, or R$8 fixed")}
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-void-800 border border-slate-200 dark:border-white/10 text-sm outline-none focus:border-primary-500/50 text-slate-700 dark:text-white transition-all" />
                            <FieldHint text={t("Aparecerá nas sugestões quando cliente perguntar sobre entrega", "It will appear in suggestions when customer asks about delivery")} />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <MapPin size={11} /> {t('Área de Cobertura', 'Coverage Area')}
                            </label>
                            <input value={deliveryArea} onChange={(e) => setDeliveryArea(e.target.value)}
                                placeholder={t("Ex: Bairros X, Y e Z / até 5km", "Ex: Neighbourhoods X, Y and Z / up to 5km")}
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-void-800 border border-slate-200 dark:border-white/10 text-sm outline-none focus:border-primary-500/50 text-slate-700 dark:text-white transition-all" />
                            <FieldHint text={t("Raio ou bairros atendidos pela tele-entrega", "Radius or neighbourhoods covered by delivery")} />
                        </div>
                        </div>
                    </div>
                </SectionCard>

                {/* ── SERVIÇOS DISPONÍVEIS ── */}
                <SectionCard icon={<Stethoscope size={15} className="text-rose-400" />} iconBg="bg-rose-500/10" title={t('Serviços da Farmácia', 'Pharmacy Services')}>
                    <p className="text-[11px] text-slate-400 dark:text-white/40 -mt-2">{t('Selecione os serviços disponíveis. A IA os mencionará proativamente quando relevante.', 'Select available services. The AI will proactively mention them when relevant.')}</p>
                    <div className="grid grid-cols-3 gap-2" data-tour="ai-services">
                        {PHARMACY_SERVICES.map((svc) => {
                            const active = availableServices.includes(svc.key);
                            return (
                                <button key={svc.key} onClick={() => toggleService(svc.key)}
                                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${active ? 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-300' : 'bg-white dark:bg-void-800 border-slate-200 dark:border-white/5 text-slate-500 dark:text-white/50 hover:border-rose-500/20'}`}>
                                    <span className="text-base">{svc.icon}</span>
                                    <span className="text-[11px] font-semibold leading-tight">{svc.label}</span>
                                    {active && <Check size={11} className="ml-auto shrink-0 text-rose-400" />}
                                </button>
                            );
                        })}
                    </div>
                    {/* Custom specialty */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-2 block">{t('Outro serviço / especialidade', 'Other service / specialty')}</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {specialties.map((s, i) => (
                                <span key={i} className="tag-cyan text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                                    {s}
                                    <button onClick={() => setSpecialties(specialties.filter((_, idx) => idx !== i))} className="ml-0.5 opacity-50 hover:opacity-100 cursor-pointer"><X size={12} /></button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input value={newSpecialty} onChange={(e) => setNewSpecialty(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addSpecialty()}
                                placeholder={t("Ex: Ortopédicos, Ostomia...", "Ex: Orthopedics, Ostomy...")}
                                className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-void-800 border border-slate-200 dark:border-white/10 text-sm outline-none focus:border-primary-500/50 text-slate-700 dark:text-white transition-all" />
                            <button onClick={addSpecialty} className="px-3 py-2 rounded-xl bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 hover:bg-cyan-500/20 transition-all cursor-pointer border border-cyan-500/20">
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                </SectionCard>

                {/* ── COMPORTAMENTO DA IA ── */}
                <SectionCard icon={<Brain size={15} className="text-violet-400" />} iconBg="bg-violet-500/10" title={t('Comportamento da IA', 'AI Behavior')}>
                    <p className="text-[11px] text-slate-400 dark:text-white/40 -mt-2">{t('Ative ou desative cada capacidade da IA conforme a necessidade da sua equipe.', 'Enable or disable each AI capability according to your team\'s needs.')}</p>
                    <div className="space-y-3" data-tour="ai-behaviors">
                        {[
                            {
                                key: 'intercambialidade' as const,
                                label: t('Intercambialidade de Medicamentos', 'Medication Interchangeability'),
                                desc: t('A IA lista Genéricos e Similares equivalentes quando o cliente pede um produto específico. Ideal para aumentar conversão com opções mais acessíveis.', 'The AI lists equivalent Generics and Similars when a customer asks for a specific product. Ideal for increasing conversion with more affordable options.'),
                                color: 'text-violet-400',
                            },
                            {
                                key: 'investigacao' as const,
                                label: t('Investigação Preventiva', 'Preventive Investigation'),
                                desc: t('Antes de oferecer um produto, a IA sugere perguntas ao cliente (ex: "Há quanto tempo sente isso?"). Melhora a assertividade da venda.', 'Before offering a product, the AI suggests questions to the customer (e.g., "How long have you been feeling this?"). Improves sales assertiveness.'),
                                color: 'text-amber-400',
                            },
                            {
                                key: 'crossSell' as const,
                                label: t('Combos e Cross-sell', 'Combos and Cross-sell'),
                                desc: t('A IA sempre sugere produtos complementares (ex: Antibiótico + Probiótico). Aumenta o ticket médio por atendimento.', 'The AI always suggests complementary products (e.g., Antibiotic + Probiotic). Increases the average ticket per service.'),
                                color: 'text-emerald-400',
                            },
                            {
                                key: 'alertas' as const,
                                label: t('Alertas Clínicos e Receitas', 'Clinical Alerts and Prescriptions'),
                                desc: t('A IA identifica medicamentos controlados, interações medicamentosas e exige receita quando necessário. Fundamental para conformidade farmacêutica.', 'The AI identifies controlled medications, drug interactions, and requires prescriptions when necessary. Fundamental for pharmaceutical compliance.'),
                                color: 'text-rose-400',
                            },
                        ].map(({ key, label, desc, color }) => (
                            <div key={key} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-void-800/50 border border-slate-200 dark:border-white/5">
                                <div className="flex-1">
                                    <p className={`text-xs font-bold ${behaviors[key] ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-white/40'}`}>{label}</p>
                                    <p className="text-[11px] text-slate-400 dark:text-white/40 mt-0.5 leading-relaxed">{desc}</p>
                                </div>
                                <button onClick={() => toggleBehavior(key)} className="transition-all cursor-pointer shrink-0 mt-0.5">
                                    {behaviors[key]
                                        ? <ToggleRight size={28} className={color} />
                                        : <ToggleLeft size={28} className="text-slate-400 dark:text-white/20" />}
                                </button>
                            </div>
                        ))}
                    </div>
                </SectionCard>

                {/* ── TOM DE VOZ ── */}
                <SectionCard icon={<MessageSquare size={15} className="text-pink-400" />} iconBg="bg-pink-500/10" title={t('Tom de Voz', 'Tone of Voice')}>
                    <p className="text-[11px] text-slate-400 dark:text-white/40 -mt-2">{t('Estilo de comunicação das mensagens sugeridas pela IA.', 'Communication style of the messages suggested by the AI.')}</p>
                    <div className="grid grid-cols-2 gap-2" data-tour="ai-tone">
                        {TONE_OPTIONS.map((t) => (
                            <button key={t.value} onClick={() => setToneOfVoice(t.value)}
                                className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${toneOfVoice === t.value ? 'bg-pink-500/10 border-pink-500/30 text-pink-600 dark:text-pink-300' : 'bg-white dark:bg-void-800 border-slate-200 dark:border-white/5 text-slate-600 dark:text-white/60 hover:border-pink-500/20'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <textarea value={toneOfVoice} onChange={(e) => setToneOfVoice(e.target.value)} rows={2}
                        placeholder={t("Ou descreva livremente o tom de voz...", "Or describe the tone of voice freely...")}
                        className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-void-800 border border-slate-200 dark:border-white/10 text-xs outline-none focus:border-primary-500/50 text-slate-700 dark:text-white leading-relaxed resize-none transition-all" />
                </SectionCard>

                {/* ── PARCEIROS COMERCIAIS ── */}
                <SectionCard icon={<Handshake size={15} className="text-amber-400" />} iconBg="bg-amber-500/10" title={t('Parceiros Comerciais', 'Commercial Partners')}>
                    <div className="flex items-start justify-between gap-4" data-tour="ai-partners">
                        <p className="text-[11px] text-slate-400 dark:text-white/40 -mt-2">{t('Marcas com prioridade de indicação. A IA priorizará esses produtos nos combos e cross-sell.', 'Brands with referral priority. The AI will prioritize these products in combos and cross-sells.')}</p>
                        <button onClick={addPartner} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-all cursor-pointer border border-amber-500/20 shrink-0">
                            <Plus size={12} /> {t('Adicionar', 'Add')}
                        </button>
                    </div>
                    {partners.length === 0 && (
                        <p className="text-center text-[11px] text-slate-400 dark:text-white/30 py-2 italic">{t('Nenhum parceiro cadastrado', 'No partners registered')}</p>
                    )}
                    {partners.length > 0 && (
                        <div className="space-y-2">
                            <div className="grid grid-cols-[1fr_1fr_90px_32px] gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 px-1">
                                <span>{t('Marca', 'Brand')}</span><span>{t('Categoria', 'Category')}</span><span>{t('Prioridade', 'Priority')}</span><span />
                            </div>
                            {partners.map((p, i) => (
                                <div key={i} className="grid grid-cols-[1fr_1fr_90px_32px] items-center gap-2 p-2 rounded-xl bg-white dark:bg-void-800 border border-slate-200 dark:border-white/5">
                                    <input value={p.brand} onChange={(e) => updatePartner(i, 'brand', e.target.value)} placeholder="Ex: EMS"
                                        className="px-2.5 py-1.5 rounded-lg bg-transparent border border-slate-200 dark:border-white/5 text-xs outline-none focus:border-primary-500/30 text-slate-700 dark:text-white" />
                                    <input value={p.category} onChange={(e) => updatePartner(i, 'category', e.target.value)} placeholder={t("Ex: Genéricos", "Ex: Generics")}
                                        className="px-2.5 py-1.5 rounded-lg bg-transparent border border-slate-200 dark:border-white/5 text-xs outline-none focus:border-primary-500/30 text-slate-700 dark:text-white" />
                                    <select value={p.priority} onChange={(e) => updatePartner(i, 'priority', e.target.value)}
                                        className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-void-700 border border-slate-200 dark:border-white/5 text-xs outline-none text-slate-700 dark:text-white cursor-pointer">
                                        <option value="high">🔴 {t('Alta', 'High')}</option>
                                        <option value="medium">🟡 {t('Média', 'Medium')}</option>
                                        <option value="low">🟢 {t('Baixa', 'Low')}</option>
                                    </select>
                                    <button onClick={() => removePartner(i)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>

                {/* ── REGRAS DE PREÇO ── */}
                <SectionCard icon={<DollarSign size={15} className="text-green-400" />} iconBg="bg-green-500/10" title={t('Regras de Precificação', 'Pricing Rules')}>
                    <p className="text-[11px] text-slate-400 dark:text-white/40 -mt-2">{t('Descontos, programas de fidelidade, convênios. A IA mencionará quando relevante.', 'Discounts, loyalty programs, agreements. The AI will mention them when relevant.')}</p>
                    <textarea value={pricingRules} onChange={(e) => setPricingRules(e.target.value)} rows={2}
                        data-tour="ai-pricing"
                        placeholder={t("Ex: Desconto de 10% para compras acima de R$100. Aceitamos Farmácia Popular. Desconto especial para idosos...", "Ex: 10% discount for purchases over R$100. We accept Popular Pharmacy. Special discount for seniors...")}
                        className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-void-800 border border-slate-200 dark:border-white/10 text-xs outline-none focus:border-primary-500/50 text-slate-700 dark:text-white leading-relaxed resize-none transition-all" />
                </SectionCard>


                <div className="pb-8" />
            </div>
        </div>
    );
}
