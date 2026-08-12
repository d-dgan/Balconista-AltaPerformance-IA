import { useState } from 'react';
import {
    LayoutDashboard,
    MessageSquare,
    Users,
    Megaphone,
    Settings,
    Newspaper,
    GraduationCap,
    Lock,
    ChevronLeft,
    ChevronRight,
    Moon,
    Sun,
    LogOut,
    Zap,
    Bot,
    Bell,
    BellOff,
    Volume2,
    VolumeX,
    Tags,
    MapPinned,
    type LucideIcon,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useBrowserNotifications } from '../contexts/BrowserNotificationsContext';

interface NavItem {
    id: string;
    label: string;
    icon: LucideIcon;
    roles: string[];
    locked?: boolean;
}

interface SidebarProps {
    activeView: string;
    onNavigate: (view: string, ticketId?: string) => void;
    isMobileOpen?: boolean;
    onCloseMobile?: () => void;
}

export default function Sidebar({ activeView, onNavigate, isMobileOpen = false, onCloseMobile }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false);
    const { isDark, toggleTheme } = useTheme();
    const { user, isAdmin, isSuperAdmin, logout } = useAuth();
    const { t } = useLanguage();
    const { permission, isEnabled, unreadCount, toggleEnabled, isSoundEnabled, toggleSound } = useBrowserNotifications();

    const navItems: NavItem[] = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['user', 'admin', 'super_admin'] },
        { id: 'chat-ia', label: 'Chat IA', icon: MessageSquare, roles: ['user', 'admin', 'super_admin'] },
        { id: 'atendimentos', label: t('Atendimentos', 'Conversations'), icon: MessageSquare, roles: ['user', 'admin', 'super_admin'] },
        { id: 'contatos', label: t('Contatos', 'Contacts'), icon: Users, roles: ['user', 'admin', 'super_admin'] },
        { id: 'campanhas', label: t('Campanhas', 'Campaigns'), icon: Megaphone, roles: ['admin', 'super_admin'] },
        { id: 'admin', label: t('Administração', 'Settings'), icon: Settings, roles: ['admin', 'super_admin'] },
        { id: 'ia-copiloto', label: t('IA Copiloto', 'AI Copilot'), icon: Bot, roles: ['admin', 'super_admin'] },
        { id: 'tella', label: 'Balconista Admin', icon: Zap, roles: ['super_admin'] },
        { id: 'encarte', label: 'Gerador de Encarte', icon: Newspaper, roles: ['admin', 'super_admin'] },
        { id: 'precificacao', label: 'Precificação', icon: Tags, roles: ['user', 'admin', 'super_admin'], locked: true },
        { id: 'analise-regiao', label: 'Análise de Região', icon: MapPinned, roles: ['user', 'admin', 'super_admin'], locked: true },
        { id: 'academy', label: t('Treinamento', 'Academy'), icon: GraduationCap, roles: ['user', 'admin', 'super_admin'] },
    ];

    const currentRole = user?.role || 'user';
    const visibleNavItems = navItems.filter(item => item.roles?.includes(currentRole));
    const initials = user?.name?.split(' ').map(n => n[0]).slice(0, 2).join('') || '?';

    return (
        <>
            {/* Mobile Backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40 lg:hidden transition-opacity"
                    onClick={onCloseMobile}
                />
            )}

            <aside
                className={`flex flex-col h-full bg-white dark:bg-void-950 fixed lg:relative inset-y-0 left-0 z-50 shrink-0 transition-transform duration-300 ease-in-out ${isMobileOpen
                    ? 'translate-x-0 shadow-2xl shadow-indigo-500/10'
                    : '-translate-x-full lg:translate-x-0'
                    } ${collapsed ? 'w-[68px]' : 'w-[240px]'}`}
                style={{
                    background: isDark
                        ? 'rgba(7, 8, 22, 0.96)'
                        : 'rgba(255,255,255,1)',
                    borderRight: isDark
                        ? '1px solid rgba(255,255,255,0.055)'
                        : '1px solid rgba(148, 163, 184, 0.18)',
                }}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-4 py-5 mb-1">
                    <div className="w-9 h-9 shrink-0 flex items-center justify-center overflow-hidden">
                        <img src="/logo-tecvancel.png" alt="Balconista Pro" className="w-full h-full object-contain scale-110" />
                    </div>
                    {!collapsed && (
                        <div className="fade-in min-w-0">
                            <h1 className="text-[13px] font-bold tracking-tight truncate"
                                style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}>
                                Balconista
                            </h1>
                            <p className="text-[10px] font-semibold tracking-wider uppercase"
                                style={{ color: isDark ? 'rgba(139,92,246,0.8)' : 'rgba(79,70,229,0.7)' }}>
                                Pro IA
                            </p>
                        </div>
                    )}
                </div>

                {/* Nav separator */}
                <div style={{ height: '1px', background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(148,163,184,0.15)', margin: '0 12px 8px' }} />

                {/* Nav Items */}
                <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
                    {visibleNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeView === item.id;
                        const isLocked = item.locked;

                        return (
                            <button
                                key={item.id}
                                onClick={() => !isLocked && onNavigate(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group relative cursor-pointer ${isLocked ? 'opacity-35 cursor-not-allowed' : ''
                                    }`}
                                style={{
                                    background: isActive
                                        ? isDark
                                            ? 'rgba(99,102,241,0.12)'
                                            : 'rgba(99,102,241,0.09)'
                                        : 'transparent',
                                    color: isActive
                                        ? isDark ? '#a5b4fc' : '#4f46e5'
                                        : isDark ? 'rgba(226,232,240,0.55)' : 'rgba(30,41,59,0.55)',
                                    boxShadow: isActive
                                        ? isDark
                                            ? 'inset 3px 0 0 #6366f1, 0 0 20px rgba(99,102,241,0.08)'
                                            : 'inset 3px 0 0 #6366f1'
                                        : 'none',
                                }}
                                title={collapsed ? item.label : ''}
                                onMouseEnter={e => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = isDark
                                            ? 'rgba(255,255,255,0.04)'
                                            : 'rgba(99,102,241,0.04)';
                                        e.currentTarget.style.color = isDark ? '#e2e8f0' : '#1e293b';
                                        e.currentTarget.style.transform = 'translateX(2px)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = isDark ? 'rgba(226,232,240,0.55)' : 'rgba(30,41,59,0.55)';
                                        e.currentTarget.style.transform = 'translateX(0)';
                                    }
                                }}
                            >
                                <Icon
                                    size={18}
                                    className="shrink-0"
                                    style={{ strokeWidth: isActive ? 2.2 : 1.8 }}
                                />
                                {!collapsed && (
                                    <span className="fade-in flex-1 text-left">{item.label}</span>
                                )}
                                {!collapsed && isLocked && (
                                    <Lock size={12} style={{ color: '#fbbf24', opacity: 0.7 }} className="fade-in" />
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Bottom Controls */}
                <div style={{ height: '1px', background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(148,163,184,0.15)', margin: '0 12px 8px' }} />
                <div className="px-2 pb-2 space-y-0.5">
                    {/* Dark / Light Mode */}
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] font-medium transition-all duration-150 cursor-pointer"
                        style={{ color: isDark ? 'rgba(226,232,240,0.4)' : 'rgba(30,41,59,0.4)' }}
                        title={isDark ? 'Light Mode' : 'Dark Mode'}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
                            e.currentTarget.style.color = isDark ? '#e2e8f0' : '#1e293b';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = isDark ? 'rgba(226,232,240,0.4)' : 'rgba(30,41,59,0.4)';
                        }}
                    >
                        {isDark ? <Sun size={16} strokeWidth={1.8} /> : <Moon size={16} strokeWidth={1.8} />}
                        {!collapsed && <span className="fade-in">{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
                    </button>

                    {/* Push Notifications Toggle */}
                    <button
                        onClick={toggleEnabled}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] font-medium transition-all duration-150 cursor-pointer relative"
                        style={{
                            color: isEnabled
                                ? isDark ? '#a5b4fc' : '#4f46e5'
                                : isDark ? 'rgba(226,232,240,0.4)' : 'rgba(30,41,59,0.4)',
                            background: isEnabled
                                ? isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)'
                                : 'transparent',
                        }}
                        title={
                            permission === 'denied'
                                ? t('Notificações bloqueadas pelo browser', 'Notifications blocked by browser')
                                : isEnabled
                                    ? t('Desativar notificações push', 'Disable push notifications')
                                    : t('Ativar notificações push', 'Enable push notifications')
                        }
                        onMouseEnter={e => {
                            if (!isEnabled) {
                                e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
                                e.currentTarget.style.color = isDark ? '#e2e8f0' : '#1e293b';
                            }
                        }}
                        onMouseLeave={e => {
                            if (!isEnabled) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = isDark ? 'rgba(226,232,240,0.4)' : 'rgba(30,41,59,0.4)';
                            }
                        }}
                    >
                        <div className="relative shrink-0">
                            {isEnabled
                                ? <Bell size={16} strokeWidth={1.8} />
                                : <BellOff size={16} strokeWidth={1.8} />
                            }
                            {/* Unread badge */}
                            {isEnabled && unreadCount > 0 && (
                                <span
                                    className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-black text-white"
                                    style={{ background: '#ef4444', padding: '0 2px' }}
                                >
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                            {/* Dot for 'permission not yet asked' */}
                            {permission === 'default' && !isEnabled && (
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-void-950" />
                            )}
                        </div>
                        {!collapsed && (
                            <span className="fade-in flex-1 text-left">
                                {isEnabled
                                    ? t('Notificações ativas', 'Notifications on')
                                    : permission === 'denied'
                                        ? t('Notif. bloqueadas', 'Notifs. blocked')
                                        : t('Ativar notificações', 'Enable notifications')
                                }
                            </span>
                        )}
                        {/* Status dot */}
                        {!collapsed && (
                            <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{
                                    background: permission === 'denied'
                                        ? '#ef4444'
                                        : isEnabled
                                            ? '#10b981'
                                            : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                                }}
                            />
                        )}
                    </button>

                    {/* Sound Toggle — only shown when notifications are enabled */}
                    {isEnabled && (
                        <button
                            onClick={toggleSound}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] font-medium transition-all duration-150 cursor-pointer"
                            style={{ color: isSoundEnabled ? (isDark ? 'rgba(226,232,240,0.6)' : 'rgba(30,41,59,0.6)') : (isDark ? 'rgba(226,232,240,0.3)' : 'rgba(30,41,59,0.3)') }}
                            title={isSoundEnabled ? t('Desativar som', 'Mute sound') : t('Ativar som', 'Enable sound')}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
                                e.currentTarget.style.color = isDark ? '#e2e8f0' : '#1e293b';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = isSoundEnabled ? (isDark ? 'rgba(226,232,240,0.6)' : 'rgba(30,41,59,0.6)') : (isDark ? 'rgba(226,232,240,0.3)' : 'rgba(30,41,59,0.3)');
                            }}
                        >
                            {isSoundEnabled
                                ? <Volume2 size={16} strokeWidth={1.8} className="shrink-0" />
                                : <VolumeX size={16} strokeWidth={1.8} className="shrink-0" />
                            }
                            {!collapsed && (
                                <span className="fade-in">
                                    {isSoundEnabled ? t('Som ativo', 'Sound on') : t('Som desativado', 'Sound off')}
                                </span>
                            )}
                        </button>
                    )}
                </div>

                {/* User Profile */}
                <div
                    className="px-3 pb-4 pt-2 mx-2 mb-1 rounded-xl"
                    style={{ background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.03)' }}
                >
                    <div className="flex items-center gap-2.5">
                        {/* Avatar with animated conic gradient ring */}
                        <div className="relative shrink-0">
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center"
                                style={{
                                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                    boxShadow: '0 0 12px rgba(99,102,241,0.3)',
                                }}
                            >
                                <span className="text-white text-[11px] font-bold">{initials}</span>
                            </div>
                            {/* Online dot */}
                            <div
                                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                                style={{
                                    background: '#10b981',
                                    borderColor: isDark ? '#070816' : '#f8fafc',
                                }}
                            />
                        </div>

                        {!collapsed && (
                            <div className="fade-in flex-1 min-w-0">
                                <p className="text-[12px] font-semibold truncate"
                                    style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}>
                                    {user?.name}
                                </p>
                                <p className="text-[10px] font-mono truncate"
                                    style={{ color: isSuperAdmin ? '#f59e0b' : isDark ? 'rgba(139,92,246,0.7)' : 'rgba(99,102,241,0.7)' }}>
                                    {isSuperAdmin ? '★ super admin' : isAdmin ? '⯁ admin' : '◈ user'}
                                </p>
                            </div>
                        )}

                        {!collapsed && (
                            <button
                                onClick={() => logout()}
                                className="transition-all duration-150 cursor-pointer rounded-lg p-1"
                                title="Sair"
                                style={{ color: isDark ? 'rgba(226,232,240,0.3)' : 'rgba(30,41,59,0.3)' }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.color = '#fb7185';
                                    e.currentTarget.style.background = 'rgba(244,63,94,0.1)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.color = isDark ? 'rgba(226,232,240,0.3)' : 'rgba(30,41,59,0.3)';
                                    e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <LogOut size={14} strokeWidth={1.8} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Collapse Toggle (Desktop only) */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="hidden lg:flex absolute -right-3.5 top-6 w-7 h-7 rounded-full items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110"
                    style={{
                        background: isDark ? '#0d0f23' : 'white',
                        border: isDark ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(148,163,184,0.3)',
                        boxShadow: '0 0 12px rgba(99,102,241,0.15)',
                        color: isDark ? '#818cf8' : '#6366f1',
                    }}
                >
                    {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
                </button>
            </aside>
        </>
    );
}
