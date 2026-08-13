import { Trash2, ArrowLeft, ShieldAlert, UserX } from 'lucide-react';
import ParticleCanvas from './ParticleCanvas';
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface DeletionStep {
    icon: React.ReactNode;
    title: string;
    content: string;
}

export default function DeletionPage() {
    const { t } = useLanguage();
    const handleBack = () => {
        window.location.href = '/';
    };

    const steps: DeletionStep[] = [
        {
            icon: <ShieldAlert className="text-rose-400" size={24} />,
            title: t("Instruções de Exclusão de Dados", "Data Deletion Instructions"),
            content: t("De acordo com as regras da Plataforma Meta, fornecemos as instruções para que você solicite a exclusão de seus dados pessoais processados pela nossa plataforma.", "In accordance with Meta Platform rules, we provide instructions for you to request the deletion of your personal data processed by our platform.")
        },
        {
            icon: <UserX className="text-orange-400" size={24} />,
            title: t("Como Solicitar", "How to Request"),
            content: t("Para excluir seus dados de nossa plataforma, basta enviar um e-mail para contato@expervivenciafarma.com.br com o assunto 'Solicitação de Exclusão de Dados'. Inclua seu nome de usuário e e-mail vinculado.", "To delete your data from our platform, simply send an email to contato@expervivenciafarma.com.br with the subject 'Data Deletion Request'. Include your username and linked email.")
        },
        {
            icon: <Trash2 className="text-red-400" size={24} />,
            title: t("O que acontece depois?", "What happens next?"),
            content: t("Nossa equipe processará sua solicitação em até 48 horas úteis. Todos os seus dados de perfil, histórico de mensagens armazenado e conexões de terceiros serão removidos permanentemente de nossos servidores.", "Our team will process your request within 48 business hours. All your profile data, stored message history, and third-party connections will be permanently removed from our servers.")
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
                {/* Header */}
                <header className="flex flex-col items-center text-center mb-16 fade-up">
                    <button
                        onClick={handleBack}
                        className="group flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors mb-12 bg-white/5 px-4 py-2 rounded-full border border-white/10"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        {t('Voltar para o Início', 'Back to Home')}
                    </button>

                    <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
                        {t('Exclusão de', 'Data')}{' '}
                        <span style={{
                            background: 'linear-gradient(90deg, #f43f5e, #fb923c, #facc15)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>
                            {t('Dados', 'Deletion')}
                        </span>
                    </h1>
                </header>

                <main className="space-y-6">
                    {steps.map((step, idx) => (
                        <section key={idx} className="p-8 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-xl">
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                                    {step.icon}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold mb-3 text-slate-100">{step.title}</h2>
                                    <p className="text-slate-400 leading-relaxed">{step.content}</p>
                                </div>
                            </div>
                        </section>
                    ))}
                </main>

                <footer className="mt-20 text-center text-slate-500">
                    <p className="text-sm font-mono">{t('Suporte: contato@expervivenciafarma.com.br', 'Support: contato@expervivenciafarma.com.br')}</p>
                </footer>
            </div>
        </div>
    );
}
