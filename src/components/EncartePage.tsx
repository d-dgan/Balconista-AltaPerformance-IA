import { useState, useEffect } from 'react';
import {
    Newspaper,
    Sparkles,
    Loader2,
    Download,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Check,
    AlertCircle,
    Clock,
    Trash2,
    Barcode,
    Tag,
    DollarSign,
    FileImage,
    Store,
    LayoutDashboard,
    Settings,
    Lock,
    Zap,
    Layout,
    Target,
    CheckCircle2,
    X,
    CalendarDays,
    ClipboardPaste,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTour } from '../contexts/TourContext';
import { fetchAiSettings, fetchOrgLogoUrl } from '../services/aiService';
import {
    generateEncarte,
    saveToHistory,
    getHistory,
    clearHistory,
} from '../services/encarteService';
import type { EncarteHistoryItem } from '../services/encarteService';

// ── Style options ─────────────────────────────────────────────
const PALETTES = [
    { id: 'verde', label: 'Verde', color: '#10b981' },
    { id: 'azul', label: 'Azul', color: '#3b82f6' },
    { id: 'roxo', label: 'Roxo', color: '#8b5cf6' },
    { id: 'laranja', label: 'Laranja', color: '#f97316' },
    { id: 'preto', label: 'Preto', color: '#1e293b' },
    { id: 'rosa', label: 'Rosa', color: '#ec4899' },
    { id: 'vermelho', label: 'Vermelho', color: '#ef4444' },
    { id: 'amarelo', label: 'Amarelo', color: '#eab308' },
    { id: 'ciano', label: 'Ciano', color: '#06b6d4' },
];

const STYLES = [
    { id: 'moderno', label: '✦ Moderno' },
    { id: 'minimalista', label: '◻ Minimalista' },
    { id: 'colorido', label: '🎨 Colorido' },
    { id: 'clinico', label: '🏥 Clínico' },
];

const TAGS = [
    { id: 'Promoção', label: '🔥 Promoção' },
    { id: 'Oferta', label: '⚡ Oferta' },
    { id: 'Genérico', label: '💊 Genérico' },
    { id: 'Novo', label: '✨ Novo' },
    { id: 'Kit', label: '📦 Kit' },
    { id: 'Destaque', label: '🏆 Destaque' },
    { id: 'Exclusivo', label: '💎 Exclusivo' },
    { id: 'Saldão', label: '📉 Saldão' },
    { id: 'Uso Contínuo', label: '🏥 Uso Contínuo' },
    { id: 'Brinde', label: '🎁 Brinde' },
    { id: 'Mamãe & Bebê', label: '🍼 Kids' },
    { id: 'Natural', label: '🌿 Natural' },
    { id: 'Fitness', label: '💪 Fitness' },
    { id: 'Pague Menos', label: '🔢 Pague Menos' },
];

// ── Helpers ───────────────────────────────────────────────────
const compressImage = (file: File, maxWidth = 1024): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                // 0.7 quality is a good balance between size and quality
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    });
};

function SectionCard({ icon, iconBg, title, children, collapsible = false }: {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    children: React.ReactNode;
    collapsible?: boolean;
}) {
    const [open, setOpen] = useState(!collapsible);
    return (
        <div className="glass-surface rounded-2xl overflow-hidden">
            <div
                className={`flex items-center gap-2.5 px-5 py-4 ${collapsible ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''}`}
                onClick={() => collapsible && setOpen(o => !o)}
            >
                <div className={`p-1.5 rounded-lg ${iconBg}`}>{icon}</div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex-1">{title}</h3>
                {collapsible && (open ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />)}
            </div>
            {open && <div className="px-5 pb-5 space-y-4 border-t border-slate-200 dark:border-white/5 pt-4">{children}</div>}
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────
export default function EncartePage({ onNavigate }: { onNavigate?: (view: string) => void }) {
    const { user } = useAuth();
    const { t } = useLanguage();
    const { checkAndStartTour } = useTour();
    const orgId = user?.organization?.id;


    const orgName = user?.organization?.name || '';

    // Data fetched from DB (not stale AuthContext)
    const [orgLogo, setOrgLogo] = useState('');
    const [orgTone, setOrgTone] = useState('Profissional e acolhedor');
    const [orgAddress, setOrgAddress] = useState('');
    const [orgPhone, setOrgPhone] = useState('');
    const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);

    useEffect(() => {
        if (aiConfigured !== null) {
            checkAndStartTour('ia-encartes');
        }
    }, [checkAndStartTour, aiConfigured]); // null = loading

    // Layout and Product fields
    interface ProductData {
        name: string;
        ean: string;
        priceFrom: string;
        priceTo: string;
        extraText: string;
        selectedTag: string;
        requiresPrescription: boolean;
        customImage: string | null;
    }
    const [layoutQty, setLayoutQty] = useState<1 | 4>(1);
    const [products, setProducts] = useState<ProductData[]>(
        Array(4).fill(null).map(() => ({
            name: '', ean: '', priceFrom: '', priceTo: '', extraText: '', selectedTag: 'Promoção', requiresPrescription: false, customImage: null
        }))
    );

    const updateProduct = (idx: number, field: keyof ProductData, value: string) => {
        const newArr = [...products];
        newArr[idx] = { ...newArr[idx], [field]: value };
        setProducts(newArr);
    };

    // Style
    const [format, setFormat] = useState<'feed' | 'story'>('feed');
    const [palette, setPalette] = useState(() => {
        return localStorage.getItem('encarte_bg_color') || 'roxo';
    });

    useEffect(() => {
        localStorage.setItem('encarte_bg_color', palette);
    }, [palette]);
    const [style, setStyle] = useState('moderno');
    const [theme, setTheme] = useState('');
    const [validity, setValidity] = useState('');

    // Paste handler for spreadsheet-style input
    const handleTablePaste = (e: React.ClipboardEvent, startRow: number, startCol: number) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        const rows = text.trim().split(/\r?\n/);
        const cols = ['name', 'ean', 'priceFrom', 'priceTo'] as const;
        const newProducts = [...products];
        rows.forEach((row, ri) => {
            const cells = row.split('\t');
            const prodIdx = startRow + ri;
            if (prodIdx >= layoutQty) return;
            cells.forEach((val, ci) => {
                const field = cols[startCol + ci];
                if (field && newProducts[prodIdx]) {
                    newProducts[prodIdx] = { ...newProducts[prodIdx], [field]: val.trim() };
                }
            });
        });
        setProducts(newProducts);
    };

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
    const [genError, setGenError] = useState<string | null>(null);
    const [loadingMsg, setLoadingMsg] = useState(0);

    // History
    const [history, setHistory] = useState<EncarteHistoryItem[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const LOADING_MSGS = [
        t('Buscando imagem do produto...', 'Searching for product image...'),
        t('Montando composição visual...', 'Building visual composition...'),
        t('Aplicando identidade da farmácia...', 'Applying pharmacy identity...'),
        t('Finalizando o encarte...', 'Finalizing the flyer...'),
    ];

    const fetchHistory = async () => {
        if (!orgId) return;
        const data = await getHistory(orgId);
        setHistory(data);
    };

    useEffect(() => {
        if (!orgId) return;
        fetchHistory();
        // Load logo fresh from DB (AuthContext may be stale after upload)
        fetchOrgLogoUrl(orgId).then(({ url }) => {
            if (url) setOrgLogo(url);
        });
        // Load tone, address, phone from ai_settings + check gemini key
        fetchAiSettings(orgId).then(({ data }) => {
            const ctx = data?.context_data || {};
            if (ctx.tone_of_voice) setOrgTone(ctx.tone_of_voice);
            if (ctx.unit?.address) setOrgAddress(ctx.unit.address);
            if (ctx.unit?.phone) setOrgPhone(ctx.unit.phone);
            const hasGemini = !!(data as any)?.gemini_api_key;
            const hasSerp = !!(data as any)?.serpapi_key;
            setAiConfigured(hasGemini && hasSerp);
        });
    }, [orgId]);

    // Cycle through loading messages
    useEffect(() => {
        if (!isGenerating) return;
        const interval = setInterval(() => {
            setLoadingMsg(prev => (prev + 1) % LOADING_MSGS.length);
        }, 3500);
        return () => clearInterval(interval);
    }, [isGenerating]);

    const handleGenerate = async () => {
        const activeProducts = products.slice(0, layoutQty);
        const missingIndex = activeProducts.findIndex(p => !p.priceTo.trim() || !(p.name.trim() || p.ean.trim()));
        
        if (missingIndex !== -1) {
            setGenError(t(`Preencha o Nome ou EAN, e o preço POR do Produto ${missingIndex + 1}.`, `Fill in the Name or EAN, and the sale price for Product ${missingIndex + 1}.`));
            return;
        }

        const missingRxNameIndex = activeProducts.findIndex(p => p.requiresPrescription && !p.name.trim());
        if (missingRxNameIndex !== -1) {
            setGenError(t(`O Produto ${missingRxNameIndex + 1} exige prescrição médica, portanto o Nome é obrigatório.`, `Product ${missingRxNameIndex + 1} requires prescription, Name is mandatory.`));
            return;
        }

        if (!theme.trim()) {
            setGenError(t('O Tema da Campanha é obrigatório. Por favor, preencha-o.', 'Campaign Theme is required. Please fill it.'));
            return;
        }

        if (!validity) {
            setGenError(t('A validade do encarte é obrigatória.', 'Flyer validity date is required.'));
            return;
        }

        setGenError(null);
        setGeneratedUrl(null);
        setIsGenerating(true);
        setLoadingMsg(0);

        const payload = {
            org: {
                id: orgId,
                name: orgName,
                logo_url: orgLogo,
                tone: orgTone,
                address: orgAddress,
                phone: orgPhone,
            },
            products: activeProducts.map(p => ({
                name: p.name.trim(),
                ean: p.requiresPrescription ? 'APP_PRESCRIPTION_IMAGE' : p.ean.trim(),
                price_from: p.priceFrom.trim(),
                price_to: p.priceTo.trim(),
                tag: p.selectedTag,
                extra_text: p.extraText.trim(),
                requires_prescription: p.requiresPrescription,
                custom_image_base64: p.requiresPrescription ? null : p.customImage,
            })),
            style: { format, palette, style, layout: layoutQty, theme: theme.trim(), validity },
        };

        const { image_url, error } = await generateEncarte(payload as any);
        setIsGenerating(false);

        if (error || !image_url) {
            setGenError(error || t('Erro desconhecido.', 'Unknown error.'));
            return;
        }

        setGeneratedUrl(image_url);
        if (orgId) {
            const firstProdName = activeProducts[0].name.trim();
            await saveToHistory(
                orgId, 
                image_url, 
                layoutQty > 1 ? `${firstProdName} +${layoutQty - 1}` : firstProdName,
                layoutQty,
                { palette, style, format }
            );
            fetchHistory();
        }
    };

    const forceDownload = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Download failed", err);
            // Fallback
            window.open(url, '_blank');
        }
    };

    const handleDownload = async () => {
        if (!generatedUrl) return;
        const filename = `encarte-${products[0].name.replace(/\s+/g, '-').toLowerCase()}${layoutQty > 1 ? `-mais-${layoutQty-1}` : ''}.png`;
        await forceDownload(generatedUrl, filename);
    };

    const handleReset = () => {
        setGeneratedUrl(null);
        setGenError(null);
    };

    const handleClearHistory = async () => {
        if (!orgId) return;
        await clearHistory(orgId);
        setHistory([]);
    };

    const inputCls = "w-full px-3 py-2.5 rounded-xl bg-white dark:bg-void-800 border border-slate-200 dark:border-white/10 text-sm outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/10 text-slate-700 dark:text-white transition-all";
    const labelCls = "text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1";

    return (
        <div className="w-full h-full flex overflow-hidden relative">
            <div className="flex-1 overflow-y-auto p-6 fade-in lg:mr-72">
                <div className="max-w-2xl mx-auto space-y-5">

                {/* ── AI NOT CONFIGURED PREMIUM UPSELL ── */}
                {aiConfigured === false && (
                    <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-slate-900/40 backdrop-blur-xl p-8 lg:p-12 text-center">
                        {/* Decorative Background Glows */}
                        <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none" />
                        
                        <div className="relative z-10 flex flex-col items-center max-w-lg mx-auto">
                            <div className="mb-6 p-4 rounded-2xl bg-linear-to-br from-amber-500/20 to-orange-500/20 shadow-xl shadow-amber-500/5">
                                <Sparkles size={40} className="text-amber-400" />
                            </div>

                            <h2 className="text-2xl lg:text-3xl font-black text-white mb-4 tracking-tight leading-tight">
                                {t('Crie Encartes Profissionais em Segundos', 'Create Professional Flyers in Seconds')}
                            </h2>
                            
                            <p className="text-slate-400 text-sm lg:text-base mb-8 leading-relaxed">
                                {t(
                                    'Utilize o poder da Inteligência Artificial para gerar artes de alta conversão, com neuromarketing aplicado e design digno das grandes redes.',
                                    'Use the power of AI to generate high-conversion arts with applied neuromarketing and design worthy of major pharmacy chains.'
                                )}
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-10">
                                {[
                                    { icon: <Zap size={16} />, text: t('Design Instantâneo', 'Instant Design') },
                                    { icon: <Layout size={16} />, text: t('Feed & Stories', 'Feed & Stories') },
                                    { icon: <Target size={16} />, text: t('Neuromarketing', 'Neuromarketing') },
                                    { icon: <CheckCircle2 size={16} />, text: t('Fotorrealismo', 'Photorealism') },
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-xs font-bold text-white/80">
                                        <span className="text-amber-400">{item.icon}</span>
                                        {item.text}
                                    </div>
                                ))}
                            </div>

                            <div className="w-full h-px bg-linear-to-r from-transparent via-white/10 to-transparent mb-8" />

                            <p className="text-[10px] uppercase font-black tracking-widest text-amber-500/60 mb-4 px-4 py-1 rounded-full border border-amber-500/20 bg-amber-500/5">
                                {t('Configuração Necessária', 'Setup Required')}
                            </p>

                            <p className="text-xs text-slate-500 mb-8 max-w-sm">
                                {t(
                                    'Para liberar este recurso, você precisa configurar suas chaves do Google Gemini e SerpApi.',
                                    'To unlock this feature, you need to configure your Google Gemini and SerpApi keys.'
                                )}
                            </p>

                            <button
                                onClick={() => onNavigate?.('ia-copiloto')}
                                className="group relative flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-sm font-black text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xl shadow-orange-500/20 overflow-hidden"
                                style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)' }}
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                <Settings size={18} className="relative z-10" />
                                <span className="relative z-10">{t('LIBERAR AGORA', 'UNLOCK NOW')}</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Rest of the form is blocked if AI is not configured */}
                {aiConfigured !== false && (
                    <>
                {/* Header */}
                <div className="flex items-center justify-between" data-tour="encarte-header">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                            <Newspaper size={22} className="text-amber-400" />
                            {t('Encarte Farma IA', 'AI Pharmacy Flyer')}
                        </h2>
                        <p className="text-xs text-slate-400 dark:text-white/40 mt-1">
                            {t('Gere encartes profissionais com IA em segundos', 'Generate professional flyers with AI in seconds')}
                        </p>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        data-tour="encarte-generate-btn"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50"
                        style={{
                            background: 'linear-gradient(135deg,#f59e0b,#f97316)',
                            color: 'white',
                            boxShadow: '0 0 20px rgba(245,158,11,.3)',
                        }}
                    >
                        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        {isGenerating ? t('Gerando...', 'Generating...') : t('Gerar Encarte', 'Generate Flyer')}
                    </button>
                </div>

                {/* Error */}
                {genError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium">
                        <AlertCircle size={14} />{genError}
                    </div>
                )}

                <SectionCard icon={<LayoutDashboard size={15} className="text-blue-400" />} iconBg="bg-blue-500/10" title={t('Layout e Quantidade', 'Layout and Quantity')}>
                    <div className="grid grid-cols-2 gap-3" data-tour="encarte-layout">
                        {([1, 4] as Array<1 | 4>).map(num => (
                            <button key={num} onClick={() => setLayoutQty(num)}
                                className={`p-4 rounded-xl border text-center transition-all cursor-pointer ${layoutQty === num
                                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                                    : 'bg-white dark:bg-void-800 border-slate-200 dark:border-white/5 text-slate-500 dark:text-white/60 hover:border-blue-500/20'
                                    }`}>
                                <div className="text-2xl font-bold mb-1">{num}</div>
                                <div className="text-[10px] font-bold uppercase">{num === 1 ? 'Produto' : 'Produtos'}</div>
                            </button>
                        ))}
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-white/5 mt-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div data-tour="encarte-theme">
                                <label className={labelCls}>{t('Tema da Campanha', 'Campaign Theme')} <span className="text-slate-300 dark:text-white/20 normal-case font-normal">({t('obrigatório', 'required')})</span></label>
                                <input 
                                    list="themes-list"
                                    value={theme}
                                    onChange={(e) => setTheme(e.target.value)}
                                    placeholder={t('Ex: Mês das Mães, Black Friday...', 'Ex: Mother\'s Month, Black Friday...')}
                                    className={inputCls}
                                />
                                <datalist id="themes-list">
                                    <option value="Mês da Saúde" />
                                    <option value="Dia das Mães" />
                                    <option value="Dia dos Pais" />
                                    <option value="Dia das Crianças" />
                                    <option value="Semana da Mulher" />
                                    <option value="Dia do Cliente" />
                                    <option value="Semana do Consumidor" />
                                    <option value="Black Friday" />
                                    <option value="Natal" />
                                    <option value="Ano Novo" />
                                    <option value="Fecha Mês" />
                                    <option value="Bota Fora" />
                                    <option value="Mega Oferta" />
                                    <option value="Carnaval de Ofertas" />
                                    <option value="Verão com Saúde" />
                                    <option value="Inverno sem Gripe" />
                                    <option value="Outubro Rosa" />
                                    <option value="Novembro Azul" />
                                    <option value="Mês do Bebê" />
                                    <option value="Festival da Higiene" />
                                    <option value="Festival de Vitaminas" />
                                    <option value="Festival de Perfumaria" />
                                    <option value="Especial Diabetes" />
                                    <option value="Especial Hipertensão" />
                                    <option value="Semana da Beleza" />
                                    <option value="Cuidado Diário" />
                                    <option value="Bem Estar" />
                                    <option value="Aniversário da Farmácia" />
                                </datalist>
                            </div>
                            <div data-tour="encarte-validity">
                                <label className={labelCls}>
                                    <CalendarDays size={11} />
                                    {t('Válido até', 'Valid until')} <span className="text-rose-400/70 normal-case font-normal">({t('obrigatório', 'required')})</span>
                                </label>
                                <input
                                    type="date"
                                    value={validity}
                                    onChange={(e) => setValidity(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        {/* Cor de Fundo (Moved from Style block) */}
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5" data-tour="encarte-palette">
                            <label className={labelCls}>{t('Cor de Fundo', 'Background color')}</label>
                            <div className="flex flex-wrap items-center gap-3">
                                {PALETTES.map(p => {
                                    const isActive = palette === p.id || palette === p.label || palette.toLowerCase() === p.color.toLowerCase();
                                    return (
                                        <button key={p.id} title={p.label} onClick={() => setPalette(p.label)}
                                            className={`w-9 h-9 rounded-full border-4 transition-all cursor-pointer ${isActive ? 'border-white scale-110 shadow-lg z-10' : 'border-transparent'}`}
                                            style={{ background: p.color, boxShadow: isActive ? `0 0 0 2px ${p.color}` : undefined }} />
                                    );
                                })}
                                {/* Custom Hex */}
                                <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/10 ml-1">
                                    <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-slate-200 dark:border-white/10 shrink-0 cursor-pointer transition-transform hover:scale-105" title="Cor Customizada">
                                        <input 
                                            type="color" 
                                            value={palette.startsWith('#') ? palette : PALETTES.find(p => p.id === palette || p.label === palette)?.color || '#8b5cf6'}
                                            onChange={(e) => setPalette(e.target.value)}
                                            className="absolute -inset-4 w-20 h-20 cursor-pointer p-0 border-0"
                                        />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={palette} 
                                        onChange={(e) => setPalette(e.target.value)}
                                        placeholder="#HEX ou Cor"
                                        className="w-24 px-2 py-1.5 rounded-lg bg-white dark:bg-void-800 border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-white outline-none focus:border-cyan-500/50 uppercase"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </SectionCard>

                {/* ── BLOCO 1: PRODUTO(S) — Tabela Planilha ── */}
                <SectionCard icon={<Tag size={15} className="text-amber-400" />} iconBg="bg-amber-500/10" title={t('Dados dos Produtos', 'Products Details')}>

                    {/* Dica de uso */}
                    <div className="flex items-center gap-2 text-[10px] text-amber-600/80 dark:text-amber-400/70 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">
                        <ClipboardPaste size={12} className="shrink-0" />
                        {t('Copie as colunas da sua planilha e cole diretamente nas células abaixo', 'Copy columns from your spreadsheet and paste directly into the cells below')}
                    </div>

                    {/* Cabeçalho omitido, o layout em cards explica-se por si */}

                    {/* Linhas de produto */}
                    <div className="space-y-4" data-tour="encarte-products">
                        {products.slice(0, layoutQty).map((prod, idx) => (
                            <div key={idx} className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-3 relative overflow-visible mt-2"
                                 data-tour={idx === 0 ? "encarte-product-card" : undefined}>
                                {/* Decorative badge */}
                                <div className="absolute -top-3 left-4 bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg shadow-amber-500/20 tracking-widest uppercase">
                                    {t(`Produto ${idx + 1}`, `Product ${idx + 1}`)}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
                                    {/* Nome */}
                                    <div className="col-span-12 md:col-span-4">
                                        <label className={labelCls}><Store size={10} />{t('Nome', 'Name')} <span className={`normal-case opacity-50 ${prod.requiresPrescription ? 'text-rose-500 font-bold opacity-100' : ''}`}>({prod.requiresPrescription ? t('obrigatório', 'required') : t('opic.', 'opt.')})</span></label>
                                        <input
                                            value={prod.name}
                                            onChange={e => updateProduct(idx, 'name', e.target.value)}
                                            onPaste={e => handleTablePaste(e, idx, 0)}
                                            data-tour={idx === 0 ? "encarte-product-name" : undefined}
                                            placeholder={t('Nome do produto', 'Product Name')}
                                            className={`${inputCls} ${prod.requiresPrescription && !prod.name.trim() ? 'border-rose-500/50 bg-rose-500/5' : ''}`}
                                        />
                                    </div>
                                    {/* EAN */}
                                    <div className="col-span-6 md:col-span-3">
                                        <label className={labelCls}><Barcode size={10} />EAN</label>
                                        <input
                                            value={prod.ean}
                                            onChange={e => updateProduct(idx, 'ean', e.target.value)}
                                            onPaste={e => handleTablePaste(e, idx, 1)}
                                            placeholder="789..."
                                            className={inputCls}
                                            inputMode="numeric"
                                        />
                                    </div>
                                    {/* Preços */}
                                    <div className="col-span-3 md:col-span-3">
                                        <label className={labelCls}><DollarSign size={10} />{t('De', 'From')}</label>
                                        <input
                                            value={prod.priceFrom}
                                            onChange={e => updateProduct(idx, 'priceFrom', e.target.value)}
                                            onPaste={e => handleTablePaste(e, idx, 2)}
                                            placeholder="Ex: 50,00"
                                            className={inputCls}
                                            inputMode="decimal"
                                        />
                                    </div>
                                    <div className="col-span-3 md:col-span-2">
                                        <label className={labelCls}><DollarSign size={10} className="text-emerald-400" />{t('Por ★', 'Sale')}</label>
                                        <input
                                            value={prod.priceTo}
                                            onChange={e => updateProduct(idx, 'priceTo', e.target.value)}
                                            onPaste={e => handleTablePaste(e, idx, 3)}
                                            data-tour={idx === 0 ? "encarte-product-price" : undefined}
                                            placeholder="Ex: 39,90"
                                            className={`${inputCls} border-emerald-500/30 focus:border-emerald-500/50 min-w-0`}
                                            inputMode="decimal"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-amber-500/10 items-center">
                                    {/* Tag Selection */}
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={prod.selectedTag}
                                            onChange={e => updateProduct(idx, 'selectedTag', e.target.value)}
                                            className={`${inputCls} w-full py-2`}
                                        >
                                            {TAGS.map(tag => (
                                                <option key={tag.id} value={tag.id}>{tag.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Prescription Toggle */}
                                    <div className="relative flex items-center text-xs group">
                                        <label className="flex items-center gap-2 font-bold text-slate-600 dark:text-white/70 cursor-pointer select-none whitespace-nowrap bg-white/50 dark:bg-black/20 px-4 py-2.5 rounded-xl border border-transparent hover:border-amber-500/20 transition-all w-full">
                                            <input 
                                                type="checkbox" 
                                                checked={prod.requiresPrescription} 
                                                onChange={e => updateProduct(idx, 'requiresPrescription', e.target.checked as any)} 
                                                data-tour={idx === 0 ? "encarte-product-prescription" : undefined}
                                                className="w-4 h-4 rounded text-amber-500 border-amber-500/30 focus:ring-amber-500/30 cursor-pointer"
                                            />
                                            {t('Prescrição Médica', 'Medical Prescription')}
                                            <AlertCircle size={12} className="text-slate-400 dark:text-white/20 animate-pulse" />
                                        </label>

                                        {/* Tooltip Info Box */}
                                        <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-slate-900 dark:bg-void-950 border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[100] pointer-events-none translate-y-2 group-hover:translate-y-0">
                                            <div className="flex gap-2 items-start">
                                                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-500 shrink-0">
                                                    <Lock size={12} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">{t('Norma ANVISA', 'ANVISA Regulation')}</p>
                                                    <p className="text-[10px] leading-relaxed text-slate-300 font-medium">
                                                        {t(
                                                            'Remédios tarjados não podem ter fotos promocionais na internet (RDCs 96/2008 e 44/2009). Ao marcar, o Nome torna-se obrigatório para garantir o teor técnico do encarte.',
                                                            'Prescription drugs cannot have promotional photos on the web. By checking this, the Name becomes mandatory for technical compliance.'
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            {/* Triangle Pointer */}
                                            <div className="absolute top-full left-10 -mt-1 border-8 border-transparent border-t-slate-900 dark:border-t-void-950" />
                                        </div>
                                    </div>

                                    {/* Custom Image Upload */}
                                    <div className="shrink-0 w-full lg:w-auto relative group/img">
                                        <label className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed transition-all cursor-pointer text-xs font-bold w-full ${prod.customImage ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-white/50 dark:bg-black/20 border-slate-300 dark:border-white/20 text-slate-500 dark:text-white/60 hover:bg-amber-500/10 hover:border-amber-500/30'}`}
                                               data-tour={idx === 0 ? "encarte-product-image" : undefined}>
                                            {prod.customImage ? <CheckCircle2 size={14} /> : <FileImage size={14} />}
                                            {prod.customImage ? t('Sua imagem anexada', 'Your image attached') : t('Usar própria imagem', 'Use own image')}
                                            <input 
                                                type="file" 
                                                accept="image/jpeg,image/png,image/webp" 
                                                className="hidden" 
                                                onChange={async e => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        try {
                                                            const compressedBase64 = await compressImage(file);
                                                            updateProduct(idx, 'customImage', compressedBase64);
                                                        } catch (err) {
                                                            console.error("Compression failed", err);
                                                        }
                                                    }
                                                }}
                                            />
                                        </label>

                                        {/* Tooltip Image Box */}
                                        <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-900 dark:bg-void-950 border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover/img:opacity-100 group-hover/img:visible transition-all duration-300 z-[100] pointer-events-none translate-y-2 group-hover/img:translate-y-0">
                                            <div className="flex gap-2 items-start">
                                                <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 shrink-0">
                                                    <Sparkles size={12} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{t('Dica de Qualidade', 'Quality Tip')}</p>
                                                    <p className="text-[10px] leading-relaxed text-slate-300 font-medium">
                                                        {t(
                                                            'Se a busca automática da IA não trouxer a foto ideal ou se ela estiver em baixa resolução, anexe aqui a foto real da embalagem para um resultado fotorrealista.',
                                                            'If the AI search doesn’t find the right photo or if it’s low resolution, attach the real package photo here for a photorealistic result.'
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            {/* Triangle Pointer */}
                                            <div className="absolute top-full right-6 -mt-1 border-8 border-transparent border-t-slate-900 dark:border-t-void-950" />
                                        </div>

                                        {prod.customImage && (
                                            <button 
                                                onClick={() => updateProduct(idx, 'customImage', null as any)}
                                                className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform z-10 cursor-pointer"
                                                title="Remover imagem anexada"
                                            >
                                                <X size={10} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Botão limpar */}
                    <button
                        onClick={() => setProducts(products.map(() => ({ name: '', ean: '', priceFrom: '', priceTo: '', extraText: '', selectedTag: 'Promoção', requiresPrescription: false, customImage: null })))}
                        className="flex items-center justify-center gap-1.5 w-full py-3 rounded-xl border border-rose-500/20 text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer mt-4"
                    >
                        <Trash2 size={14} /> {t('Limpar todos os formulários', 'Clear all forms')}
                    </button>
                </SectionCard>

                {/* ── BLOCO 2: ESTILO VISUAL ── */}
                <SectionCard icon={<FileImage size={15} className="text-violet-400" />} iconBg="bg-violet-500/10" title={t('Estilo Visual', 'Visual Style')}>

                    {/* Formato */}
                    <div>
                        <label className={labelCls}>{t('Formato', 'Format')}</label>
                        <div className="grid grid-cols-2 gap-3" data-tour="encarte-format">
                            {(['feed', 'story'] as const).map(f => (
                                <button key={f} onClick={() => setFormat(f)}
                                    className={`p-4 rounded-xl border text-center transition-all cursor-pointer ${format === f
                                        ? 'bg-violet-500/10 border-violet-500/30'
                                        : 'bg-white dark:bg-void-800 border-slate-200 dark:border-white/5 hover:border-violet-500/20'
                                        }`}>
                                    <div className={`mx-auto mb-2 rounded-md bg-violet-400/20 ${f === 'feed' ? 'w-10 h-10' : 'w-6 h-10'}`} />
                                    <p className={`text-xs font-bold ${format === f ? 'text-violet-600 dark:text-violet-300' : 'text-slate-600 dark:text-white/60'}`}>
                                        {f === 'feed' ? 'Feed 1:1' : 'Story 9:16'}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Estilo */}
                    <div>
                        <label className={labelCls}>{t('Estilo', 'Style')}</label>
                        <div className="grid grid-cols-4 gap-2" data-tour="encarte-style">
                            {STYLES.map(s => (
                                <button key={s.id} onClick={() => setStyle(s.id)}
                                    className={`p-2.5 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer ${style === s.id
                                        ? 'bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-300'
                                        : 'bg-white dark:bg-void-800 border-slate-200 dark:border-white/5 text-slate-500 dark:text-white/50 hover:border-violet-500/20'
                                        }`}>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </SectionCard>

                {/* ── BLOCO 3: CONTEXTO DA FARMÁCIA (colapsável) ── */}
                <SectionCard icon={<Store size={15} className="text-emerald-400" />} iconBg="bg-emerald-500/10"
                    title={t('Contexto da Farmácia (automático)', 'Pharmacy Context (automatic)')} collapsible>
                    <div className="space-y-2">
                        {[
                            { label: t('Nome', 'Name'), value: orgName || '—' },
                            { label: t('Endereço', 'Address'), value: orgAddress || '—' },
                            { label: t('Telefone', 'Phone'), value: orgPhone || '—' },
                            { label: t('Tom de voz', 'Tone'), value: orgTone || '—' },
                            { label: 'Logo', value: orgLogo ? '✅ ' + orgLogo.split('/').pop()?.split('?')[0] : t('❌ Não cadastrada', '❌ Not registered') },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex items-start gap-2 text-xs">
                                <span className="text-slate-400 dark:text-white/40 w-24 shrink-0">{label}</span>
                                <span className="text-slate-700 dark:text-white/80 font-medium truncate">{value}</span>
                            </div>
                        ))}
                        <p className="text-[10px] text-slate-400 dark:text-white/30 mt-2">
                            {t('Editável em Configurações → Copiloto IA', 'Edit in Settings → AI Copilot')}
                        </p>
                    </div>
                </SectionCard>

                {/* ── BLOCO 4: GERAÇÃO ── */}
                {isGenerating && (
                    <div className="glass-surface rounded-2xl p-8 flex flex-col items-center gap-5">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg,#f59e0b22,#f9731622)' }}>
                                <Newspaper size={32} className="text-amber-400" />
                            </div>
                            <Loader2 size={20} className="absolute -top-2 -right-2 text-amber-400 animate-spin" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-slate-800 dark:text-white">
                                {t('A IA está criando seu encarte...', 'AI is creating your flyer...')}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-white/40 mt-1 transition-all">
                                {LOADING_MSGS[loadingMsg]}
                            </p>
                        </div>
                        <div className="flex gap-1">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === loadingMsg % 4 ? 'bg-amber-400 scale-125' : 'bg-amber-400/30'}`} />
                            ))}
                        </div>
                    </div>
                )}

                {generatedUrl && !isGenerating && (
                    <div className="glass-surface rounded-2xl overflow-hidden" data-tour="encarte-result">
                        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-200 dark:border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-sm font-bold text-slate-800 dark:text-white">
                                    {t('Encarte gerado!', 'Flyer generated!')}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleReset}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50 hover:border-primary-500/30 hover:text-primary-500 transition-all cursor-pointer">
                                    <RefreshCw size={12} /> {t('Novo', 'New')}
                                </button>
                                <button onClick={handleDownload}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all cursor-pointer"
                                    style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                                    <Download size={12} /> {t('Baixar', 'Download')}
                                </button>
                            </div>
                        </div>
                        <div className="cursor-pointer p-4 group relative overflow-hidden" 
                             onClick={() => setSelectedImage(generatedUrl)}>
                            <img src={generatedUrl} alt={products[0].name}
                                className="w-full rounded-xl object-contain max-h-[600px] shadow-2xl group-hover:scale-[1.02] transition-transform duration-500" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Sparkles size={32} className="text-white" />
                            </div>
                        </div>
                    </div>
                )}
                <div className="pb-8" />
                    </>
                )}
            </div>
            </div>

            {/* ── SIDEBAR DE HISTÓRICO ── */}
            <aside data-tour="encarte-history" className="hidden lg:flex flex-col w-72 bg-white/5 border-l border-white/10 h-full fixed right-0 top-0 backdrop-blur-xl z-20">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-amber-400" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">{t('Histórico', 'History')}</h3>
                    </div>
                    {history.length > 0 && (
                        <button onClick={handleClearHistory} 
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-white/40 hover:text-rose-400 transition-all cursor-pointer"
                            title={t('Limpar histórico', 'Clear history')}>
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {history.map((item) => (
                        <div key={item.id} className="group relative flex flex-col rounded-2xl bg-white/5 border border-white/10 overflow-hidden hover:border-amber-500/40 transition-all">
                            <div className="relative aspect-square overflow-hidden bg-slate-900">
                                <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-100" />
                                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                    <div className="flex gap-2 w-full">
                                        <button 
                                            onClick={() => setSelectedImage(item.image_url)}
                                            className="flex-1 py-1.5 rounded-lg bg-white/10 backdrop-blur-md text-white text-[10px] font-bold border border-white/20 hover:bg-white/20 transition-all cursor-pointer">
                                            {t('Ver', 'View')}
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const a = document.createElement('a');
                                                a.href = item.image_url;
                                                a.download = `encarte-${item.product_name}.png`;
                                                a.click();
                                            }}
                                            className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-all">
                                            <Download size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="p-3">
                                <p className="text-xs font-bold text-white truncate">{item.product_name}</p>
                                <div className="flex items-center justify-between mt-1">
                                    <p className="text-[10px] text-white/40">{new Date(item.created_at).toLocaleDateString()}</p>
                                    <div className="flex items-center gap-1">
                                        <FileImage size={10} className="text-white/20" />
                                        <span className="text-[10px] text-white/20 uppercase font-black tracking-tighter">HD</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {history.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <div className="p-4 rounded-full bg-white/5">
                                <Clock size={24} className="text-white/10" />
                            </div>
                            <p className="text-xs text-white/30 italic">
                                {t('Nenhum encarte gerado ainda.', 'No flyers generated yet.')}
                            </p>
                        </div>
                    )}
                </div>
            </aside>

            {/* ── MODAL DE VISUALIZAÇÃO ── */}
            {selectedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-10 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setSelectedImage(null)} />
                    
                    <div className="relative w-full max-w-5xl max-h-full flex flex-col items-center gap-4 z-10">
                        {/* Botões de Ação Superiores */}
                        <div className="absolute -top-12 right-0 flex items-center gap-3">
                            <button 
                                onClick={() => forceDownload(selectedImage, `encarte-${Date.now()}.png`)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-all cursor-pointer shadow-lg">
                                <Download size={14} />
                                {t('Baixar Encarte', 'Download Flyer')}
                            </button>
                            <button 
                                onClick={() => setSelectedImage(null)}
                                className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <img 
                            src={selectedImage} 
                            alt="View" 
                            className="max-w-full max-h-[80vh] lg:max-h-[85vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300" 
                        />
                    </div>
                </div>
            )}
        </div>
    );
}






