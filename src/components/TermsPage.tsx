import { FileText, ArrowLeft, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import ParticleCanvas from './ParticleCanvas';
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface TermsSection {
    icon: React.ReactNode;
    title: string;
    content: string;
}

export default function TermsPage() {
    const { t } = useLanguage();
    const handleBack = () => {
        window.location.href = '/';
    };

    const sections: TermsSection[] = [
        {
            icon: <FileText className="text-indigo-400" size={24} />,
            title: t("1. Aceitação dos Termos", "1. Acceptance of Terms"),
            content: t("Ao acessar e utilizar a plataforma Balconista Pro, você concorda em cumprir e estar vinculado a estes Termos de Serviço. Se você não concordar com qualquer parte destes termos, não deverá utilizar nossa plataforma.", "By accessing and using the Balconista Pro platform, you agree to comply with and be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use our platform.")
        },
        {
            icon: <ShieldCheck className="text-purple-400" size={24} />,
            title: t("2. Descrição do Serviço", "2. Service Description"),
            content: t("O Balconista Pro é uma solução omnichannel que permite a gestão de atendimentos via WhatsApp, Instagram e Facebook. O serviço é fornecido 'como está' e sua disponibilidade depende das APIs de terceiros (como as da Meta).", "Balconista Pro is an omnichannel solution that allows handling through WhatsApp, Instagram, and Facebook. The service is provided 'as is' and its availability depends on third-party APIs (such as Meta's).")
        },
        {
            icon: <CheckCircle className="text-cyan-400" size={24} />,
            title: t("3. Responsabilidades do Usuário", "3. User Responsibilities"),
            content: t("O usuário é responsável por manter a confidencialidade de sua conta e senha, bem como por todas as atividades que ocorrem sob sua conta. O uso indevido da plataforma para envio de spam ou conteúdo ilegal resultará no cancelamento imediato.", "The user is responsible for maintaining the confidentiality of their account and password, as well as for all activities that occur under their account. Improper use of the platform for sending spam or illegal content will result in immediate cancellation.")
        },
        {
            icon: <AlertCircle className="text-amber-400" size={24} />,
            title: t("4. Limitação de Responsabilidade", "4. Limitation of Liability"),
            content: t("Não nos responsabilizamos por perdas de dados ou interrupções de serviço causadas por falhas em serviços de terceiros ou problemas técnicos fora do nosso controle direto. Garantimos o melhor esforço para manter a estabilidade do sistema.", "We are not responsible for data loss or service interruptions caused by failures in third-party services or technical problems beyond our direct control. We guarantee our best effort to maintain system stability.")
        }
    ];

    return (
        <div className="h-screen w-full relative bg-void-950 text-white selection:bg-indigo-500/30 overflow-x-hidden overflow-y-auto">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0" style={{
                    background: `radial-gradient(circle at 50% -20%, rgba(99,102,241,0.15) 0%, transparent 60%)`,
                }} />
                <div className="absolute inset-0 opacity-50">
                    <ParticleCanvas />
                </div>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 lg:py-20">
                <header className="flex flex-col items-center text-center mb-16 fade-up">
                    <button
                        onClick={handleBack}
                        className="group flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors mb-12 bg-white/5 px-4 py-2 rounded-full border border-white/10"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        {t('Voltar para o Início', 'Back to Home')}
                    </button>

                    <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
                        {t('Termos de', 'Terms of')}{' '}
                        <span style={{
                            background: 'linear-gradient(90deg, #818cf8, #a78bfa, #67e8f9)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>
                            {t('Serviço', 'Service')}
                        </span>
                    </h1>
                </header>

                <main className="space-y-6">
                    {sections.map((section, idx) => (
                        <section key={idx} className="p-8 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-xl">
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                                    {section.icon}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold mb-3 text-slate-100">{section.title}</h2>
                                    <p className="text-slate-400 leading-relaxed">{section.content}</p>
                                </div>
                            </div>
                        </section>
                    ))}
                </main>

                <footer className="mt-20 text-center text-slate-500">
                    <p className="text-sm font-mono">{t('Última atualização: 18 de Março de 2026', 'Last updated: March 18, 2026')}</p>
                </footer>
            </div>
        </div>
    );
}
