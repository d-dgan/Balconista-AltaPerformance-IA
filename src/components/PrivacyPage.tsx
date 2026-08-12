import { Shield, ArrowLeft, Mail, Lock, UserCheck, MessageSquare } from 'lucide-react';
import ParticleCanvas from './ParticleCanvas';
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface PrivacySection {
    icon: React.ReactNode;
    title: string;
    content: string;
}

export default function PrivacyPage() {
    const { t } = useLanguage();
    const handleBack = () => {
        window.location.href = '/';
    };

    const sections: PrivacySection[] = [
        {
            icon: <UserCheck className="text-indigo-400" size={24} />,
            title: t("Coleta de Informações", "Information Collection"),
            content: t("Coletamos apenas os dados essenciais para a prestação de nossos serviços, como seu nome, endereço de e-mail e informações de perfil público quando você se conecta através de plataformas de terceiros.", "We collect only the essential data for the provision of our services, such as your name, email address, and public profile information when you connect through third-party platforms.")
        },
        {
            icon: <MessageSquare className="text-purple-400" size={24} />,
            title: t("Uso de Dados de Mensagens", "Use of Message Data"),
            content: t("Para o funcionamento do Exper Chat, processamos o conteúdo das mensagens enviadas e recebidas através das integrações conectadas (WhatsApp, Instagram e Facebook). Esses dados são utilizados exclusivamente para permitir o atendimento omnichannel.", "For the operation of Exper Chat, we process the content of messages sent and received through the connected integrations (WhatsApp, Instagram, and Facebook). These data are used exclusively to allow omnichannel service.")
        },
        {
            icon: <Shield className="text-cyan-400" size={24} />,
            title: t("Integração com Meta (Facebook/Instagram)", "Meta Integration (Facebook/Instagram)"),
            content: t("Nosso aplicativo utiliza as APIs Oficiais da Meta para gerenciar mensagens de Instagram Direct e Facebook Messenger. Ao utilizar estas funcionalidades, os dados são processados em conformidade com as Políticas de Dados da Meta e os Termos de Serviço da Plataforma Meta.", "Our application uses Meta's Official APIs to manage Instagram Direct and Facebook Messenger messages. By using these features, data is processed in compliance with Meta's Data Policies and Meta Platform Terms of Service.")
        },
        {
            icon: <Lock className="text-emerald-400" size={24} />,
            title: t("Segurança e Retenção", "Security and Retention"),
            content: t("Implementamos protocolos de segurança rigorosos para proteger suas informações. Seus dados são armazenados de forma segura e retenção ocorre apenas pelo período necessário para cumprir as finalidades descritas nesta política.", "We implement rigorous security protocols to protect your information. Your data is stored securely, and retention occurs only for the period necessary to fulfill the purposes described in this policy.")
        },
        {
            icon: <Mail className="text-amber-400" size={24} />,
            title: t("Seus Direitos", "Your Rights"),
            content: t("Você possui o direito de acessar, retificar ou solicitar a exclusão de seus dados pessoais a qualquer momento. Para exercer esses direitos ou tirar dúvidas, entre em contato com nossa equipe de suporte.", "You have the right to access, rectify, or request the deletion of your personal data at any time. To exercise these rights or ask questions, please contact our support team.")
        }
    ];

    return (
        <div className="h-screen w-full relative bg-void-950 text-white selection:bg-indigo-500/30 overflow-x-hidden overflow-y-auto">
            {/* ── BACKGROUND ── */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0" style={{
                    background: `radial-gradient(circle at 50% -20%, rgba(99,102,241,0.15) 0%, transparent 60%)`,
                }} />
                <div className="absolute inset-0 opacity-30" style={{
                    backgroundImage: `linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px)`,
                    backgroundSize: '64px 64px',
                }} />
                <div className="absolute inset-0 opacity-50">
                    <ParticleCanvas />
                </div>
            </div>

            {/* ── CONTENT ── */}
            <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 lg:py-20">
                {/* Header */}
                <header className="flex flex-col items-center text-center mb-16 fade-up">
                    <button
                        onClick={handleBack}
                        className="group flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors mb-12 bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:border-white/20"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        {t('Voltar para o Início', 'Back to Home')}
                    </button>

                    <div className="w-20 h-20 shrink-0 flex items-center justify-center overflow-hidden mb-8">
                        <img src="/logo-tecvancel.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>

                    <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
                        {t('Política de', 'Privacy')}{' '}
                        <span style={{
                            background: 'linear-gradient(90deg, #818cf8, #a78bfa, #67e8f9)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>
                            {t('Privacidade', 'Policy')}
                        </span>
                    </h1>
                    <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
                        {t('Transparência e respeito com seus dados são pilares fundamentais da nossa plataforma. Saiba como protegemos e utilizamos suas informações.', 'Transparency and respect for your data are fundamental pillars of our platform. Learn how we protect and use your information.')}
                    </p>
                </header>

                {/* Main Content */}
                <main className="space-y-6">
                    {sections.map((section, idx) => (
                        <section
                            key={idx}
                            className="p-8 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-xl hover:border-white/10 transition-all duration-300 group fade-up"
                            style={{ animationDelay: `${idx * 100}ms` }}
                        >
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500 border border-white/10">
                                    {section.icon}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold mb-3 text-slate-100">{section.title}</h2>
                                    <p className="text-slate-400 leading-relaxed">
                                        {section.content}
                                    </p>
                                </div>
                            </div>
                        </section>
                    ))}
                </main>

                <footer className="mt-20 text-center text-slate-500 space-y-4 fade-up" style={{ animationDelay: '600ms' }}>
                    <p className="text-sm font-mono">
                        {t('Última atualização: 18 de Março de 2026', 'Last updated: March 18, 2026')}
                    </p>
                    <div className="flex justify-center gap-6">
                        <a href="mailto:contato@expervivenciafarma.com.br" className="hover:text-indigo-400 transition-colors">contato@expervivenciafarma.com.br</a>
                    </div>
                    <p className="text-xs pt-8 border-t border-white/5">
                        {t('© 2026 Exper Chat. Todos os direitos reservados.', '© 2026 Exper Chat. All rights reserved.')}
                    </p>
                </footer>
            </div>
        </div>
    );
}
