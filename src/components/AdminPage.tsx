import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Plug, Settings, Users, ChevronRight } from 'lucide-react';
import UserManagement from './UserManagement';
import ConnectionsPanel from './ConnectionsPanel';
import { useLanguage } from '../contexts/LanguageContext';

interface AdminSection {
    id: string;
    label: string;
    description: string;
    icon: any;
}

export default function AdminPage() {
    const { t } = useLanguage();
    const [activeSection, setActiveSection] = useState<string | null>(null);

    useEffect(() => {
        const handleTourAction = (e: any) => {
            if (e.detail?.action === 'open-users') setActiveSection('users');
            if (e.detail?.action === 'open-connections') setActiveSection('connections');
            if (e.detail?.action === 'go-back') setActiveSection(null);
        };
        window.addEventListener('tour:action', handleTourAction);
        return () => window.removeEventListener('tour:action', handleTourAction);
    }, []);

    const adminSections: AdminSection[] = [
        { id: 'users', label: t('Gestão de Usuários', 'User Management'), description: t('Listar, criar e gerenciar utilizadores', 'List, create and manage users'), icon: Users },
        { id: 'connections', label: t('Conexões', 'Connections'), description: t('WhatsApp, Instagram e Messenger', 'WhatsApp, Instagram and Messenger'), icon: Plug },
    ];

    const renderContent = () => {
        if (activeSection === 'users') return <UserManagement />;
        if (activeSection === 'connections') return <ConnectionsPanel />;

        return (
            <div className="space-y-3">
                {adminSections.map((section) => {
                    const Icon = section.icon;
                    return (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            data-tour={section.id === 'users' ? "admin-users-card" : "admin-connections-card"}
                            className="w-full glass-surface rounded-2xl p-5 flex items-center gap-4 hover:scale-[1.005] transition-all cursor-pointer group text-left"
                        >
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/25 transition-colors">
                                <Icon size={22} className="text-indigo-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-bold mb-0.5">{section.label}</h3>
                                <p className="text-xs opacity-40">{section.description}</p>
                            </div>
                            <ChevronRight size={18} className="opacity-30 group-hover:opacity-60 transition-opacity" />
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {activeSection && (
                            <button
                                onClick={() => setActiveSection(null)}
                                data-tour="admin-back-button"
                                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <div data-tour="admin-info">
                            <h2 className="text-lg font-bold flex items-center gap-2" data-tour="admin-title">
                                <Settings size={20} className="text-indigo-400" />
                                {activeSection === 'users' ? t('Gestão de Usuários', 'User Management') :
                                    activeSection === 'connections' ? t('Conexões', 'Connections') :
                                        t('Administração', 'Administration')}
                            </h2>
                            <p className="text-[10px] uppercase tracking-wider opacity-40 mt-0.5 font-medium" data-tour="admin-description">
                                {activeSection ? t('Configurações do Sistema', 'System Settings') : t('Configurações da organização e integrações', 'Organization settings and integrations')}
                            </p>
                        </div>
                    </div>
                </div>

                {renderContent()}
            </div>
        </div>
    );
}
