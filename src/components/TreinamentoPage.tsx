import { GraduationCap, Play, Clock, BookOpen, Zap, Users, Settings, Sparkles, Newspaper, Stethoscope } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTour } from '../contexts/TourContext';
import { useNavigate } from 'react-router-dom';

interface Course {
    title: string;
    description: string;
    duration: string;
    level: string;
    progress: number;
}

const getCourses = (t: any): Course[] => [
    {
        title: t('Exper Chat: A Nova Era da Farmácia', 'Exper Chat: The New Era of Pharmacy'),
        description: t('Conheça o impacto comercial e a visão estratégica por trás da plataforma.', 'Learn about the commercial impact and strategic vision behind the platform.'),
        duration: t('5 min', '5 min'),
        level: t('Iniciante', 'Beginner'),
        progress: 100,
    },
    {
        title: t('Configuração e Inteligência (IA)', 'Configuration and Intelligence (AI)'),
        description: t('Aprenda a treinar seu Copiloto IA com a alma da sua farmácia.', 'Learn how to train your AI Copilot with the soul of your pharmacy.'),
        duration: t('15 min', '15 min'),
        level: t('Intermediário', 'Intermediate'),
        progress: 60,
    },
    {
        title: t('Fluxo de Atendimento e Resolução', 'Service Flow and Resolution'),
        description: t('Domine o cockpit de atendimentos e ferramentas de triagem clínica.', 'Master the service cockpit and clinical triaging tools.'),
        duration: t('20 min', '20 min'),
        level: t('Avançado', 'Advanced'),
        progress: 0,
    },
    {
        title: t('Administração e Conexões Oficiais', 'Administration and Official Connections'),
        description: t('Gerencie sua equipe e mantenha suas APIs WhatsApp sempre ativas.', 'Manage your team and keep your WhatsApp APIs always active.'),
        duration: t('15 min', '15 min'),
        level: t('Intermediário', 'Intermediate'),
        progress: 0,
    },
];

interface TreinamentoPageProps {
    onNavigate?: (view: string) => void;
}

export default function TreinamentoPage({ onNavigate }: TreinamentoPageProps) {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const { startTour } = useTour();
    const courses = getCourses(t);

    const handleStartDashboardTour = () => {
        if (onNavigate) {
            onNavigate('dashboard');
            // Give a small delay for navigation to complete before starting tour
            setTimeout(() => {
                startTour('dashboard');
            }, 500);
        } else {
            startTour('dashboard');
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 fade-in">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                            <GraduationCap size={20} className="text-indigo-400" />
                            {t('Centro de Treinamento', 'Training Center')}
                        </h2>
                        <p className="text-xs opacity-40 mt-1 dark:text-white/40">
                            {t('Cursos e tutoriais interativos para dominar a plataforma', 'Interactive courses and tutorials to master the platform')}
                        </p>
                    </div>
                </div>

                {/* Interactive Tours Section */}
                <div className="mb-8">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 px-1">
                        {t('Tours Interativos', 'Interactive Tours')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="glass-surface rounded-2xl p-5 border border-white/5 hover:border-indigo-500/30 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Zap size={48} className="text-indigo-500" />
                            </div>
                            <h4 className="text-sm font-bold mb-1">{t('Guia do Dashboard', 'Dashboard Guide')}</h4>
                            <p className="text-[11px] opacity-50 mb-4 leading-relaxed">
                                {t('Conheça todos os indicadores e ferramentas de análise da sua tela principal.', 'Learn about all indicators and analysis tools on your main screen.')}
                            </p>
                            <button
                                onClick={handleStartDashboardTour}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white text-[11px] font-bold transition-all cursor-pointer w-full justify-center"
                            >
                                <Play size={12} /> {t('Iniciar Tour', 'Start Tour')}
                            </button>
                        </div>

                        <div className="glass-surface rounded-2xl p-5 border border-white/5 hover:border-indigo-500/30 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Zap size={48} className="text-indigo-500" />
                            </div>
                            <h4 className="text-sm font-bold mb-1">{t('Módulo de Atendimentos', 'Service Module')}</h4>
                            <p className="text-[11px] opacity-50 mb-4 leading-relaxed">
                                {t('Aprenda a gerenciar tickets, usar o copiloto e finalizar conversas.', 'Learn to manage tickets, use the copilot, and finalize conversations.')}
                            </p>
                            <button
                                onClick={() => {
                                    if (onNavigate) {
                                        onNavigate('atendimentos');
                                        setTimeout(() => {
                                            startTour('atendimentos');
                                        }, 600);
                                    } else {
                                        startTour('atendimentos');
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white text-[11px] font-bold transition-all cursor-pointer w-full justify-center"
                            >
                                <Play size={12} /> {t('Iniciar Tour', 'Start Tour')}
                            </button>
                        </div>

                        <div className="glass-surface rounded-2xl p-5 border border-white/5 hover:border-emerald-500/30 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Users size={48} className="text-emerald-500" />
                            </div>
                            <h4 className="text-sm font-bold mb-1">{t('Agenda Omnichannel', 'Omnichannel Agenda')}</h4>
                            <p className="text-[11px] opacity-50 mb-4 leading-relaxed">
                                {t('Gestão completa de pacientes, CRM farmacêutico e importação de bases.', 'Complete patient management, pharmaceutical CRM and base imports.')}
                            </p>
                            <button
                                onClick={() => {
                                    if (onNavigate) {
                                        onNavigate('contatos');
                                        setTimeout(() => {
                                            startTour('contacts');
                                        }, 600);
                                    } else {
                                        startTour('contacts');
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-indigo-500 text-emerald-500 hover:text-white text-[11px] font-bold transition-all cursor-pointer w-full justify-center"
                            >
                                <Play size={12} /> {t('Iniciar Tour', 'Start Tour')}
                            </button>
                        </div>

                        <div className="glass-surface rounded-2xl p-5 border border-white/5 hover:border-indigo-500/30 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Settings size={48} className="text-indigo-400" />
                            </div>
                            <h4 className="text-sm font-bold mb-1">{t('Gestão do Sistema', 'System Management')}</h4>
                            <p className="text-[11px] opacity-50 mb-4 leading-relaxed">
                                {t('Aprenda a gerenciar sua equipe, perfis de acesso e todas as conexões oficiais.', 'Learn how to manage your team, access profiles, and all official connections.')}
                            </p>
                            <button
                                onClick={() => {
                                    if (onNavigate) {
                                        onNavigate('admin');
                                        setTimeout(() => {
                                            startTour('gerenciamento');
                                        }, 600);
                                    } else {
                                        startTour('gerenciamento');
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white text-[11px] font-bold transition-all cursor-pointer w-full justify-center"
                            >
                                <Play size={12} /> {t('Iniciar Tour', 'Start Tour')}
                            </button>
                        </div>

                        <div className="glass-surface rounded-2xl p-5 border border-white/5 hover:border-violet-500/30 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Sparkles size={48} className="text-violet-400" />
                            </div>
                            <h4 className="text-sm font-bold mb-1">{t('Copiloto IA', 'AI Copilot')}</h4>
                            <p className="text-[11px] opacity-50 mb-4 leading-relaxed">
                                {t('Configure o cérebro do seu atendimento, treine a IA com dados da farmácia e refine o tom de voz.', 'Configure your service brain, train the AI with pharmacy data and refine the tone of voice.')}
                            </p>
                            <button
                                onClick={() => {
                                    if (onNavigate) {
                                        onNavigate('ia-copiloto');
                                        setTimeout(() => {
                                            startTour('ia-copiloto');
                                        }, 600);
                                    } else {
                                        startTour('ia-copiloto');
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500 text-violet-500 hover:text-white text-[11px] font-bold transition-all cursor-pointer w-full justify-center"
                            >
                                <Play size={12} /> {t('Iniciar Tour', 'Start Tour')}
                            </button>
                        </div>



                        <div className="glass-surface rounded-2xl p-5 border border-white/5 hover:border-indigo-500/30 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Stethoscope size={48} className="text-indigo-400" />
                            </div>
                            <h4 className="text-sm font-bold mb-1">{t('Especialista Farma', 'Pharmacy Specialist')}</h4>
                            <p className="text-[11px] opacity-50 mb-4 leading-relaxed">
                                {t('Consultoria clínica avançada, interações medicamentosas e análise inteligente de prescrições.', 'Advanced clinical consulting, drug interactions and intelligent prescription analysis.')}
                            </p>
                            <button
                                onClick={() => {
                                    if (onNavigate) {
                                        onNavigate('especialista');
                                        setTimeout(() => {
                                            startTour('ia-especialista');
                                        }, 600);
                                    } else {
                                        startTour('ia-especialista');
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white text-[11px] font-bold transition-all cursor-pointer w-full justify-center"
                            >
                                <Play size={12} /> {t('Iniciar Tour', 'Start Tour')}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-white/5 mb-8" />

                {/* Training Video Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">
                            {t('Masterclass de Treinamento', 'Training Masterclass')}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20">
                            LIVE GRAVADA
                        </span>
                    </div>
                    
                    <div className="glass-surface rounded-2xl overflow-hidden border border-white/5 shadow-2xl group transition-all duration-500 hover:border-indigo-500/30">
                        <div className="relative aspect-video w-full bg-void-950 flex items-center justify-center">
                            <iframe 
                                src="https://drive.google.com/file/d/1q1y5UoJ6FLXvrA-bXDnLf-dfJJONoMDs/preview" 
                                width="100%" 
                                height="100%" 
                                allow="autoplay" 
                                className="border-none"
                                title="Masterclass Treinamento Exper Chat"
                            />
                        </div>
                        <div className="p-5 bg-white/5 backdrop-blur-md">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-1">
                                        {t('Treinamento Completo: Dominando o Exper Chat', 'Complete Training: Mastering Exper Chat')}
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-white/40 leading-relaxed max-w-2xl">
                                        {t(
                                            'Assista à gravação da nossa live exclusiva onde demonstramos todas as funcionalidades, desde a configuração da IA até a gestão avançada de tickets e criação de encartes.',
                                            'Watch our exclusive live recording where we demonstrate all features, from AI configuration to advanced ticket management and flyer creation.'
                                        )}
                                    </p>
                                </div>
                                <div className="shrink-0 flex flex-col items-end gap-1">
                                    <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                                        <Clock size={12} /> 1h 20min
                                    </span>
                                    <span className="text-[10px] text-slate-400 dark:text-white/20">
                                        {new Date().toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-white/5 mb-8" />

                <div className="relative overflow-hidden rounded-3xl">
                    {/* Coming Soon Overlay */}
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
                        <div className="backdrop-blur-md bg-white/5 dark:bg-void-950/20 absolute inset-0 z-0" />
                        <div className="relative z-10 p-6 rounded-2xl bg-void-950/40 border border-white/10 flex flex-col items-center gap-3 shadow-2xl scale-110">
                            <div className="p-3 bg-indigo-500/20 rounded-xl">
                                <Clock size={24} className="text-indigo-400 animate-pulse" />
                            </div>
                            <div className="text-center">
                                <h4 className="text-lg font-black text-white uppercase tracking-tighter">
                                    {t('Aulas em Breve', 'Classes Coming Soon')}
                                </h4>
                                <p className="text-[10px] font-bold text-indigo-300/60 uppercase tracking-widest mt-1">
                                    {t('Conteúdo em Produção', 'Content in Production')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content to be blurred */}
                    <div className="opacity-40 grayscale-[0.8] select-none filter blur-[2px] space-y-6">
                        <div className="mb-4">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">
                                {t('Cursos em Vídeo', 'Video Courses')}
                            </h3>
                        </div>

                        {/* Featured Course */}
                        <div className="glass-surface rounded-2xl p-6 mb-6 relative overflow-hidden">
                            <div className="absolute inset-0 bg-linear-to-r from-indigo-600/20 to-purple-600/20 opacity-50" />
                            <div className="relative z-10">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-2 inline-block">
                                    ⭐ {t('Em Destaque', 'Featured')}
                                </span>
                                <h3 className="text-lg font-bold mb-2">Masterclass: {t('Atendimento Farmacêutico Digital', 'Digital Pharmaceutical Customer Service')}</h3>
                                <p className="text-sm opacity-50 mb-4 max-w-lg dark:text-white/50">
                                    {t('Aprenda todas as funcionalidades do Exper Chat e transforme o atendimento da sua farmácia com estratégias omnichannel.', 'Learn all the features of Exper Chat and transform your pharmacy\'s customer service with omnichannel strategies.')}
                                </p>
                                <div className="flex items-center gap-4">
                                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-semibold">
                                        <Play size={16} /> {t('Assistir Agora', 'Watch Now')}
                                    </button>
                                    <span className="text-xs opacity-40 flex items-center gap-1 dark:text-white/40">
                                        <Clock size={12} /> 1h 20min
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Course List */}
                        <div className="space-y-3">
                            {courses.map((course, i) => (
                                <div key={i} className="glass-surface rounded-2xl p-5 flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-xl bg-linear-to-br from-indigo-500/15 to-purple-500/15 flex items-center justify-center shrink-0">
                                        <BookOpen size={22} className="text-indigo-400 opacity-60" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold mb-0.5 text-slate-800 dark:text-white">{course.title}</h4>
                                        <p className="text-xs opacity-40 truncate dark:text-white/40">{course.description}</p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-[10px] opacity-30 flex items-center gap-1 dark:text-white/30">
                                                <Clock size={10} /> {course.duration}
                                            </span>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                                course.level === t('Iniciante', 'Beginner') ? 'tag-green' :
                                                course.level === t('Intermediário', 'Intermediate') ? 'tag-amber' : 'tag-rose'
                                            }`}>
                                                {course.level}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 w-20">
                                        {course.progress > 0 ? (
                                            <div>
                                                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-1">
                                                    <div
                                                        className="h-full rounded-full bg-linear-to-r from-indigo-500 to-indigo-400"
                                                        style={{ width: `${course.progress}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] opacity-40 dark:text-white/40">{course.progress}%</span>
                                            </div>
                                        ) : (
                                            <div className="w-full py-1.5 rounded-lg glass-surface text-[10px] font-semibold flex items-center justify-center gap-1">
                                                <Play size={10} /> {t('Iniciar', 'Start')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
