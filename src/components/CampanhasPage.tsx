import { Megaphone, Rocket, ShieldCheck, Sparkles, Lock, MessageSquarePlus, Zap, Target, Layout, BarChart } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Feature {
    title: string;
    description: string;
    icon: any;
    isOfficialOnly: boolean;
}

export default function CampanhasPage() {
    const { t } = useLanguage();

    const features: Feature[] = [
        {
            title: t('Disparos Automáticos', 'Automatic Broadcasts'),
            description: t('Envie promoções para milhares de clientes com agendamento inteligente.', 'Send promotions to thousands of customers with smart scheduling.'),
            icon: Rocket,
            isOfficialOnly: true,
        },
        {
            title: t('Segmentação Avançada', 'Advanced Segmentation'),
            description: t('Filtre por tags, comportamento de compra e tipo de medicamento.', 'Filter by tags, purchase behavior and medication type.'),
            icon: Target,
            isOfficialOnly: false,
        },
        {
            title: t('Mensagens Interativas', 'Interactive Messages'),
            description: t('Templates com botões de ação e listas para agilizar o pedido.', 'Templates with action buttons and lists to speed up ordering.'),
            icon: Layout,
            isOfficialOnly: true,
        },
        {
            title: t('Dashboard de ROI', 'ROI Dashboard'),
            description: t('Métricas reais de conversão e engajamento das suas campanhas.', 'Real conversion and engagement metrics of your campaigns.'),
            icon: BarChart,
            isOfficialOnly: false,
        }
    ];

    return (
        <div className="flex-1 overflow-hidden bg-white dark:bg-[#0c0c11] fade-in relative flex flex-col">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-linear-to-bl from-primary-500/5 to-transparent pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 lg:p-12">
                <div className="max-w-4xl w-full">
                    {/* Header Item */}
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-primary-500/10 border border-primary-500/20 text-primary-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6" data-tour="campanhas-intro">
                            <Sparkles size={14} />
                            Marketing Omnichannel
                        </div>
                        <h2 className="text-4xl lg:text-6xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic leading-none mb-6">
                            Gestão de <span className="text-primary-500">Campanhas</span>
                        </h2>
                        <p className="text-base text-slate-500 dark:text-white/40 font-medium max-w-2xl mx-auto leading-relaxed">
                            {t('Transforme seu atendimento em uma máquina de vendas com disparos segmentados e automações de fidelização.', 'Turn your service into a sales machine with segmented broadcasts and loyalty automations.')}
                        </p>
                    </div>

                    {/* Features Grid Area */}
                    <div className="relative group" data-tour="campanhas-features">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {features.map((feat, i) => (
                                <div key={i} className="glass-panel p-10 rounded-[3rem] border border-slate-200 dark:border-white/5 flex flex-col gap-6 hover-lift">
                                    <div className="w-16 h-16 rounded-3xl bg-primary-500/5 dark:bg-white/3 flex items-center justify-center text-primary-500/40 dark:text-white/10 shrink-0">
                                        <feat.icon size={32} />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tight italic">{feat.title}</h4>
                                        <p className="text-xs text-slate-400 dark:text-white/30 font-semibold leading-relaxed">{feat.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* BLOCKING OVERLAY (THE GATE) */}
                        <div className="absolute -inset-px rounded-[3.2rem] bg-white/60 dark:bg-black/70 backdrop-blur-xl border-2 border-primary-500/40 flex flex-col items-center justify-center text-center p-12 transition-all duration-700 shadow-[0_0_80px_rgba(99,102,241,0.15)] group-hover:backdrop-blur-2xl" data-tour="campanhas-lock">
                            {/* Animated Background for the Gate */}
                            <div className="absolute inset-0 bg-radial-at-t from-primary-500/10 via-transparent to-transparent opacity-50" />
                            
                            <div className="relative z-10 flex flex-col items-center max-w-md">
                                <div className="w-24 h-24 rounded-[2.5rem] bg-primary-500/20 flex items-center justify-center mb-8 ring-8 ring-primary-500/5 animate-bounce-slow">
                                    <Lock size={42} className="text-primary-400" />
                                </div>
                                <div className="space-y-6">
                                    <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-amber-500 text-black text-[11px] font-black uppercase tracking-[0.3em] shadow-[0_0_30px_rgba(245,158,11,0.4)]">
                                        {t('Módulo em Desenvolvimento', 'Module Under Development')}
                                    </div>
                                    <h3 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                                        Privatizado para <br />
                                        <span className="text-primary-500 underline decoration-primary-500/30 underline-offset-8">API Oficial</span>
                                    </h3>
                                    <p className="text-sm text-slate-600 dark:text-white/40 font-bold leading-relaxed px-4">
                                        {t('Agendamentos em massa e métricas de ROI são exclusivos para contas registradas no Cloud Hub da Meta.', 'Mass scheduling and ROI metrics are exclusive to accounts registered in Meta\'s Cloud Hub.')}
                                    </p>
                                    
                                    <div className="pt-10 flex flex-col sm:flex-row items-center justify-center gap-5">
                                        <button className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 rounded-4xl bg-primary-500 text-white text-xs font-black uppercase tracking-[0.15em] hover:bg-primary-600 transition-all cursor-pointer shadow-2xl shadow-primary-500/40 border border-primary-400/30 active:scale-95 group/btn">
                                            <Zap size={16} className="fill-current group-hover/btn:animate-pulse" />
                                            {t('Solicitar Acesso Antecipado', 'Request Early Access')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="mt-16 flex items-center justify-center gap-12 opacity-30">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Antiban System</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Zap size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Instant Delivery</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Megaphone size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Meta Verified</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
