import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    Search,
    MessageSquareMore,
    Clock4,
    Sparkles,
    Hash,
    ChevronRight,
    X,
    Check,
    Calendar,
    Tag as TagIcon,
    Wifi,
    Layers,
    Scan,
    Plus,
    ArrowDownAz,
    SlidersHorizontal,
    UserPlus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { connections as mockConnections } from '../data/mockData';
import Avatar from './Avatar';
import type { TicketExtended } from './AtendimentosPage';
import type { Tag } from '../services/api';

const getTabDefs = (t: any) => [
    { id: 'active', label: t('Atendimento', 'Assigned'), icon: MessageSquareMore },
    { id: 'waiting', label: t('Aguardando', 'Waiting'), icon: Clock4 },
    { id: 'flow', label: t('Fluxo', 'Flow'), icon: Sparkles },
    { id: 'groups', label: t('Grupos', 'Groups'), icon: Hash },
] as const;

type TabId = 'active' | 'waiting' | 'flow' | 'groups' | 'resolved';

function ChannelBadge({ channel }: { channel: string }) {
    const configs: Record<string, { bg: string; border: string; svg: React.ReactNode }> = {
        whatsapp: {
            bg: 'bg-emerald-500',
            border: 'border-emerald-600/50',
            svg: (
                <svg viewBox="0 0 24 24" width="11" height="11" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.119 1.532 5.843L0 24l6.334-1.51A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.5-5.223-1.374l-.374-.222-3.881.925.974-3.769-.244-.389A9.945 9.945 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                </svg>
            ),
        },
        instagram: {
            bg: 'bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600',
            border: 'border-pink-600/50',
            svg: (
                <svg viewBox="0 0 24 24" width="11" height="11" fill="white">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
            ),
        },
        messenger: {
            bg: 'bg-blue-500',
            border: 'border-blue-600/50',
            svg: (
                <svg viewBox="0 0 24 24" width="11" height="11" fill="white">
                    <path d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z" />
                </svg>
            ),
        },
    };

    const cfg = configs[channel];
    if (!cfg) return null;

    return (
        <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center ${cfg.bg} border-2 border-white dark:border-[#161623] shadow-md`}>
            {cfg.svg}
        </span>
    );
}

// Queue options
const getQueueOptions = (t: any) => [
    { id: 'all', label: t('Todas as filas', 'All Queues') },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'messenger', label: 'Messenger' },
];

// Period options
const getPeriodOptions = (t: any) => [
    { id: 'all', label: t('Todo o período', 'All Time') },
    { id: 'today', label: t('Hoje', 'Today') },
    { id: 'yesterday', label: t('Ontem', 'Yesterday') },
    { id: 'week', label: t('Últimos 7 dias', 'Last 7 days') },
    { id: 'month', label: t('Últimos 30 dias', 'Last 30 days') },
];

function TimeAgo({ timestamp }: { timestamp?: string }) {
    const { t } = useLanguage();
    if (!timestamp) return null;
    const diff = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 60000);
    if (diff < 1) return <span>{t('agora', 'now')}</span>;
    if (diff < 60) return <span>{diff}m</span>;
    if (diff < 1440) return <span>{Math.floor(diff / 60)}h</span>;
    return <span>{Math.floor(diff / 1440)}d</span>;
}

function ShimmerCard() {
    return (
        <div className="px-3 py-3 space-y-3">
            <div className="flex items-center gap-3">
                <div className="shimmer-aurora w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                    <div className="shimmer-aurora h-3 w-28 rounded-lg" />
                    <div className="shimmer-aurora h-2.5 w-40 rounded-lg" />
                </div>
            </div>
        </div>
    );
}

interface TicketFilters {
    view: 'mine' | 'all' | 'resolved';
    queue: string;
    tag: string | null;
    connection: string;
    period: string;
}

// ---- Filter Dropdown Component ----
interface FilterDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    filters: TicketFilters;
    onFilterChange: (filters: TicketFilters) => void;
    onClearFilters: () => void;
    hasActiveFilters: boolean;
    allTags: Tag[];
    allConnections: any[];
}

function FilterDropdown({
    isOpen,
    onClose,
    filters,
    onFilterChange,
    onClearFilters,
    hasActiveFilters,
    allTags,
    allConnections
}: FilterDropdownProps) {
    const { t } = useLanguage();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                onClose();
                setOpenSubmenu(null);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div ref={dropdownRef} className="absolute right-0 top-full mt-1.5 z-50 w-56 py-1.5 rounded-xl glass-panel shadow-xl shadow-black/20 border border-white/10">
            <button
                onClick={() => { onFilterChange({ ...filters, view: 'all' }); onClose(); }}
                className={`w-full text-left px-3.5 py-2 text-[13px] transition-colors cursor-pointer ${filters.view === 'all' ? 'text-primary-400 font-semibold bg-primary-500/5' : 'hover:bg-white/5'}`}
            >
                {t('Todos os atendimentos', 'All tickets')}
            </button>
            <button
                onClick={() => { onFilterChange({ ...filters, view: 'mine' }); onClose(); }}
                className={`w-full text-left px-3.5 py-2 text-[13px] transition-colors cursor-pointer ${filters.view === 'mine' ? 'text-primary-400 font-semibold bg-primary-500/5' : 'hover:bg-white/5'}`}
            >
                {t('Meus atendimentos', 'My tickets')}
            </button>
            <button
                onClick={() => { onFilterChange({ ...filters, view: 'resolved' }); onClose(); }}
                className={`w-full text-left px-3.5 py-2 text-[13px] transition-colors cursor-pointer ${filters.view === 'resolved' ? 'text-primary-400 font-semibold bg-primary-500/5' : 'hover:bg-white/5'}`}
            >
                {t('Atendimentos Resolvidos', 'Resolved Tickets')}
            </button>

            <div className="my-1.5 border-t border-white/5" />

            {/* Submenus */}
            {[
                { id: 'queues', label: t('Filas', 'Queues'), icon: Layers, items: getQueueOptions(t), selectedId: filters.queue, onSelect: (id: string) => onFilterChange({ ...filters, queue: id }) },
                { id: 'tags', label: t('Etiquetas', 'Labels'), icon: TagIcon, items: allTags.map(t => ({ id: t.label, label: t.label, color: t.color })), selectedId: filters.tag, onSelect: (id: string) => onFilterChange({ ...filters, tag: filters.tag === id ? null : id }) },
                { id: 'connections', label: t('Conexões', 'Connections'), icon: Wifi, items: [{ id: 'all', label: t('Todas', 'All') }, ...allConnections.map(c => ({ id: c.id, label: c.name }))], selectedId: filters.connection, onSelect: (id: string) => onFilterChange({ ...filters, connection: id }) },
                { id: 'period', label: t('Período', 'Period'), icon: Calendar, items: getPeriodOptions(t), selectedId: filters.period, onSelect: (id: string) => onFilterChange({ ...filters, period: id }) },
            ].map((menu) => {
                const Icon = menu.icon;
                const isSubmenuOpen = openSubmenu === menu.id;
                return (
                    <div key={menu.id} className="relative">
                        <button
                            onClick={() => setOpenSubmenu(isSubmenuOpen ? null : menu.id)}
                            className="w-full flex items-center justify-between px-3.5 py-2 text-[13px] hover:bg-white/5 transition-colors cursor-pointer"
                        >
                            <span className="flex items-center gap-2">
                                <Icon size={14} className="opacity-50" />
                                {menu.label}
                            </span>
                            <ChevronRight size={14} className={`opacity-40 transition-transform duration-200 ${isSubmenuOpen ? 'rotate-90' : ''}`} />
                        </button>
                        {isSubmenuOpen && (
                            <div className="py-0.5 mx-2 mb-1 rounded-lg bg-black/40 border border-white/5">
                                {menu.items.map((sub: any) => (
                                    <button
                                        key={sub.id}
                                        onClick={() => { menu.onSelect(sub.id); setOpenSubmenu(null); }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-white/5 transition-colors cursor-pointer"
                                    >
                                        {menu.selectedId === sub.id ? <Check size={12} className="text-primary-400 shrink-0" /> : <span className="w-3 shrink-0" />}
                                        {sub.color ? (
                                            <span className={`tag-${sub.color} text-[9px] font-semibold px-1.5 py-0.5 rounded-md`}>{sub.label}</span>
                                        ) : <span>{sub.label}</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}

            {hasActiveFilters && (
                <>
                    <div className="my-1.5 border-t border-white/5" />
                    <button
                        onClick={() => { onClearFilters(); onClose(); }}
                        className="w-full text-left px-3.5 py-2 text-[13px] text-rose-400 font-semibold hover:bg-rose-500/5 transition-colors cursor-pointer"
                    >
                        {t('Limpar filtros', 'Clear filters')}
                    </button>
                </>
            )}
        </div>
    );
}

// ---- Active Filter Badges ----
function ActiveFilterBadges({ filters, onFilterChange, allConnections }: { filters: TicketFilters, onFilterChange: (f: TicketFilters) => void, allConnections: any[] }) {
    const { t } = useLanguage();
    const badges: { label: string, key: keyof TicketFilters, reset: any }[] = [];

    if (filters.view === 'all') badges.push({ label: t('Todos', 'All'), key: 'view', reset: 'mine' });
    if (filters.view === 'resolved') badges.push({ label: t('Resolvidos', 'Resolved'), key: 'view', reset: 'mine' });
    if (filters.queue && filters.queue !== 'all') {
        const q = getQueueOptions(t).find(o => o.id === filters.queue);
        badges.push({ label: q?.label || filters.queue, key: 'queue', reset: 'all' });
    }
    if (filters.tag) badges.push({ label: filters.tag, key: 'tag', reset: null });
    if (filters.connection && filters.connection !== 'all') {
        const conn = allConnections.find(c => c.id === filters.connection);
        badges.push({ label: conn?.name || filters.connection, key: 'connection', reset: 'all' });
    }
    if (filters.period && filters.period !== 'all') {
        const p = getPeriodOptions(t).find(o => o.id === filters.period);
        badges.push({ label: p?.label || filters.period, key: 'period', reset: 'all' });
    }

    if (badges.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1 px-4 pb-2">
            {badges.map((badge, i) => (
                <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-400 border border-primary-500/20"
                >
                    {badge.label}
                    <button
                        onClick={() => onFilterChange({ ...filters, [badge.key]: badge.reset })}
                        className="hover:text-white transition-colors cursor-pointer"
                    >
                        <X size={10} />
                    </button>
                </span>
            ))}
        </div>
    );
}

interface TicketPanelProps {
    tickets: TicketExtended[];
    selectedTicket: TicketExtended | null;
    onSelectTicket: (ticket: TicketExtended | null) => void;
    onAssignTicket: (ticketId: string) => void;
    allTags?: Tag[];
    onNewChat?: () => void;
}

export default function TicketPanel({ tickets: allTickets, selectedTicket, onSelectTicket, onAssignTicket, allTags = [], onNewChat }: TicketPanelProps) {
    const [activeTab, setActiveTab] = useState<TabId>('active');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const { user } = useAuth();
    const { t } = useLanguage();

    const allConnections = user?.role === 'super_admin' ? mockConnections : [];

    // Dynamic badge counts
    const tabs = useMemo(() => {
        const counts = {
            active: allTickets.filter((t) => t.status === 'active' && (t.channel !== 'whatsapp' || !t.contact?.phone?.includes('@g.us'))).length,
            waiting: allTickets.filter((t) => t.status === 'waiting' && t.assigned_to === null && (t.channel !== 'whatsapp' || !t.contact?.phone?.includes('@g.us'))).length,
            flow: allTickets.filter((t) => t.status === 'flow' && (t.channel !== 'whatsapp' || !t.contact?.phone?.includes('@g.us'))).length,
            groups: allTickets.filter((t) => t.channel === 'whatsapp' && t.contact?.phone?.includes('@g.us') && t.status !== 'resolved' && t.status !== 'closed').length,
        };
        return getTabDefs(t).map((tab) => ({
            ...tab,
            badge: counts[tab.id as keyof typeof counts] || 0,
        }));
    }, [allTickets, t]);

    // Filter state
    const defaultFilters: TicketFilters = { view: 'mine', queue: 'all', tag: null, connection: 'all', period: 'all' };
    const [filters, setFilters] = useState<TicketFilters>(defaultFilters);

    const hasActiveFilters = filters.view !== 'mine' || filters.queue !== 'all' || filters.tag !== null || filters.connection !== 'all' || filters.period !== 'all';

    const filteredTickets = useMemo(() => {
        let result = [...allTickets];

        // Base separation: Groups vs 1-on-1
        if (activeTab === 'groups') {
            result = result.filter((t) => t.channel === 'whatsapp' && t.contact?.phone?.includes('@g.us') && t.status !== 'resolved' && t.status !== 'closed');
        } else {
            // Include everything that is NOT a WhatsApp group
            result = result.filter((t) => t.channel !== 'whatsapp' || !t.contact?.phone?.includes('@g.us'));
        }

        // Tab filtering
        if (activeTab === 'active') {
            result = result.filter((t) => t.status === 'active');
        } else if (activeTab === 'waiting') {
            result = result.filter((t) => t.assigned_to === null && t.status === 'waiting');
        } else if (activeTab === 'flow') {
            result = result.filter((t) => t.status === 'flow');
        }

        // View filter
        if (filters.view === 'mine') {
            if (activeTab === 'active') {
                result = result.filter((t) => t.assigned_to === user?.id);
            }
        } else if (filters.view === 'resolved') {
            result = allTickets.filter((t) => t.status === 'resolved' || t.status === 'closed');
            if (activeTab === 'groups') {
                result = result.filter((t) => t.channel === 'whatsapp' && t.contact?.phone?.includes('@g.us'));
            } else {
                result = result.filter((t) => t.channel !== 'whatsapp' || !t.contact?.phone?.includes('@g.us'));
            }
        }

        // Other filters
        if (filters.queue && filters.queue !== 'all') result = result.filter((t) => t.channel === filters.queue);
        if (filters.tag) result = result.filter((t) => (t.tags || []).some(tag => tag.label === filters.tag));
        if (filters.connection && filters.connection !== 'all') {
            const conn = allConnections.find(c => c.id === filters.connection);
            if (conn) result = result.filter((t) => t.channel === conn.type);
        }

        // Period filter
        if (filters.period && filters.period !== 'all') {
            const now = new Date();
            let startDate: Date | null = null;
            let endDate: Date | null = null;

            switch (filters.period) {
                case 'today': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
                case 'yesterday':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
                case 'month': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
            }
            if (startDate) {
                result = result.filter((t) => {
                    const tDate = new Date(t.lastMessageTime || t.createdAt);
                    if (endDate) return tDate >= startDate! && tDate < endDate;
                    return tDate >= startDate!;
                });
            }
        }

        // Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter((t) =>
                t.contact?.name?.toLowerCase().includes(q) ||
                t.lastMessage?.toLowerCase().includes(q) ||
                t.contact?.phone?.includes(q)
            );
        }

        // Sort
        result.sort((a, b) => {
            const dateA = new Date(a.lastMessageTime || a.createdAt).getTime();
            const dateB = new Date(b.lastMessageTime || b.createdAt).getTime();
            return dateB - dateA;
        });

        return result;
    }, [allTickets, activeTab, searchQuery, user?.id, filters, allConnections]);

    return (
        <div data-tour="ticket-panel" className={`flex flex-col h-full w-full lg:w-[380px] lg:min-w-[380px] bg-slate-50 dark:bg-void-900 border-r border-slate-200 dark:border-white/5 ${selectedTicket ? 'hidden lg:flex' : 'flex'} transition-colors duration-300`}>
            {/* Top scanning icon bar */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                <div className="w-10 h-10 flex items-center justify-center border-2 border-primary-500/50 rounded-xl text-primary-400 bg-primary-500/10 shadow-lg shadow-primary-500/5 hover:border-primary-400 transition-all cursor-pointer">
                    <Scan size={22} />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onNewChat}
                        data-tour="new-ticket-button"
                        title={t('Novo Ticket', 'New Ticket')}
                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40 hover:text-primary-500 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer border border-slate-200 dark:border-white/5">
                        <Plus size={20} />
                    </button>
                    <button className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40 hover:text-primary-500 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer border border-slate-200 dark:border-white/5">
                        <ArrowDownAz size={20} />
                    </button>
                </div>
            </div>

            {/* Tabs Container */}
            <div data-tour="ticket-tabs" className="flex overflow-x-auto scrollbar-hide snap-x gap-2 px-4 lg:px-6 py-4 lg:py-6 bg-slate-100/50 dark:bg-void-950/50 border-b border-slate-200/50 dark:border-white/5">
                {tabs.map((tab: any) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`min-w-[80px] lg:min-w-0 flex-1 snap-center relative flex flex-col items-center justify-center p-3 lg:aspect-square rounded-2xl transition-all duration-300 cursor-pointer border shrink-0 ${isActive
                                ? 'bg-primary-500/10 border-primary-500/30 shadow-xl shadow-primary-500/5 ring-1 ring-primary-500/20'
                                : 'bg-white dark:bg-void-800 border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-void-700'
                                }`}
                        >
                            <Icon
                                size={24}
                                className={`mb-1.5 transition-all ${isActive ? 'text-primary-500 dark:text-primary-400 scale-110' : 'text-slate-400 dark:text-white/20'}`}
                            />
                            <span className={`text-[9px] font-bold uppercase tracking-widest ${isActive ? 'text-primary-500 dark:text-primary-400' : 'text-slate-400 dark:text-white/20'}`}>
                                {tab.label}
                            </span>

                            {tab.badge > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 text-white text-[9px] font-black rounded-lg flex items-center justify-center bg-rose-500 shadow-lg shadow-rose-500/30 animate-in zoom-in-50">
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Search and Action Row */}
            <div className="px-6 pb-4">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 group">
                        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/20 group-focus-within:text-primary-500 dark:group-focus-within:text-primary-400 transition-colors" />
                        <input
                            type="text"
                            data-tour="search-tickets"
                            placeholder={t('Buscar atendimentos...', 'Search tickets...')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-void-950 border border-slate-200 dark:border-white/5 text-[13px] font-medium text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-slate-500 dark:placeholder:text-white/30 shadow-sm"
                        />
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowFilter(!showFilter)}
                            data-tour="filter-tickets"
                            className={`flex items-center gap-2 px-3 lg:px-4 py-3 rounded-2xl border transition-all cursor-pointer font-bold text-[12px] uppercase tracking-widest shrink-0 ${hasActiveFilters || showFilter
                                ? 'bg-primary-500/10 border-primary-500/30 text-primary-500 dark:text-primary-400 shadow-lg shadow-primary-500/5'
                                : 'bg-white dark:bg-void-800 border-slate-200 dark:border-white/5 text-slate-400 dark:text-white/40 hover:bg-slate-50 dark:hover:bg-void-700 hover:text-primary-500 dark:hover:text-white'
                                }`}
                        >
                            <SlidersHorizontal size={14} />
                            <span className="hidden sm:inline">{t('Filtros', 'Filters')}</span>
                        </button>
                        <FilterDropdown
                            isOpen={showFilter}
                            onClose={() => setShowFilter(false)}
                            filters={filters}
                            onFilterChange={setFilters}
                            onClearFilters={() => setFilters(defaultFilters)}
                            hasActiveFilters={hasActiveFilters}
                            allTags={allTags}
                            allConnections={allConnections}
                        />
                    </div>
                </div>
            </div>

            <ActiveFilterBadges filters={filters} onFilterChange={setFilters} allConnections={allConnections} />

            {/* Ticket List */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 scrollbar-thin">
                {isLoading ? (
                    <div className="space-y-2">
                        <ShimmerCard /><ShimmerCard /><ShimmerCard />
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20 italic">
                        <MessageSquareMore size={32} className="mb-4" />
                        <p className="text-xs font-bold uppercase tracking-widest text-center">{t('Nenhum atendimento', 'No tickets found')}</p>
                    </div>
                ) : (
                    filteredTickets.map((ticket) => (
                        <div
                            key={ticket.id}
                            onClick={() => onSelectTicket(ticket)}
                            className={`group relative p-4 rounded-2xl cursor-pointer transition-all border ${selectedTicket?.id === ticket.id
                                ? 'bg-primary-500/10 border-primary-500/30 shadow-lg'
                                : 'bg-white dark:bg-void-800/40 border-slate-200/60 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-void-800 hover:border-primary-500/30 dark:hover:border-white/10'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className="relative shrink-0">
                                    <Avatar
                                        src={ticket.contact?.avatar}
                                        name={ticket.contact?.name || 'User'}
                                        size="w-12 h-12"
                                        className={`rounded-xl ring-2 ${ticket.channel === 'whatsapp' ? 'ring-emerald-500/20' : ticket.channel === 'instagram' ? 'ring-pink-500/20' : 'ring-blue-500/20'}`}
                                    />
                                    <ChannelBadge channel={ticket.channel} />
                                </div>

                                <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate uppercase tracking-tight">{ticket.contact?.name || t('Assinatura', 'Signature')}</h3>
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-tighter">
                                            <TimeAgo timestamp={ticket.lastMessageTime} />
                                        </span>
                                    </div>
                                    <p className="text-[11px] font-medium text-slate-600 dark:text-white/60 truncate leading-relaxed">{ticket.lastMessage || '...'}</p>

                                    <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                                        {(ticket.tags || []).slice(0, 2).map((tag, i) => (
                                            <span
                                                key={i}
                                                className={`tag-${tag.color} text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter border border-slate-200 dark:border-white/5`}
                                            >
                                                {tag.label}
                                            </span>
                                        ))}
                                        {ticket.orderPlaced && (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-tighter border border-emerald-500/20 shadow-lg shadow-emerald-500/10 animate-in zoom-in-50">
                                                🛒 {t('Pedido', 'Order')}
                                            </span>
                                        )}
                                        {ticket.unreadCount > 0 && (
                                            <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-lg bg-primary-500 text-white text-[9px] font-black flex items-center justify-center shadow-lg shadow-primary-500/30">
                                                {ticket.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {activeTab === 'waiting' && ticket.status === 'waiting' && ticket.assigned_to === null && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAssignTicket(ticket.id); }}
                                    className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-500 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-primary-600 transition-all cursor-pointer shadow-lg shadow-primary-500/20 border border-primary-400/20 active:scale-[0.98]"
                                >
                                    <UserPlus size={14} />
                                    {t('Assumir Atendimento', 'Take Over Care')}
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div >
    );
}
