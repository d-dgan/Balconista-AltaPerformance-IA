import React, { useState, useEffect } from 'react';

import {
    MessageSquare,
    Clock,
    CheckCircle2,
    Timer,
    BarChart3,
    Activity,
    Zap,
    ArrowUpRight,
    CalendarDays,
    ChevronDown,
    TrendingDown,
    ShoppingBag,
    Users
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTour } from '../contexts/TourContext';
import { getDashboardStatsFixed as getDashboardStats } from '../services/dashboardServiceFixed';

/* ── Animated counter hook ── */
function useCountUp(target: string | number, duration = 900) {
    const [value, setValue] = useState<number | string>(0);

    useEffect(() => {
        const numTarget = parseFloat(String(target).replace(/[^0-9.]/g, ''));
        if (isNaN(numTarget)) { setValue(target); return; }

        let start: number | null = null;
        const step = (ts: number) => {
            if (!start) start = ts;
            const progress = Math.min((ts - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            const current = Math.floor(eased * numTarget);
            setValue(current);
            if (progress < 1) requestAnimationFrame(step);
            else setValue(target);
        };
        requestAnimationFrame(step);
    }, [target, duration]);

    return value;
}

/* ── Bento Stat Card ── */
interface StatCardProps {
    icon: any;
    label: string;
    value: string | number;
    color: string;
    trend?: string;
    trendUp?: boolean;
    large?: boolean;
    delay?: number;
}

function StatCard({ icon: Icon, label, value, color, trend, trendUp = true, large = false, delay = 0 }: StatCardProps) {
    const animVal = useCountUp(value);

    return (
        <div
            className="glass-surface rounded-2xl p-5 hover-lift relative overflow-hidden fade-up group h-full"
            style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
        >
            {/* Ambient glow blob behind icon */}
            <div
                className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: color.replace('from-', '').split(' ')[0], opacity: '0.07' }}
            />

            <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{
                            background: `linear-gradient(135deg, ${color})`,
                        }}
                    >
                        <Icon size={17} className="text-white" strokeWidth={2} />
                    </div>
                    {trend && (
                        <span
                            className="flex items-center gap-0.5 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full"
                            style={{
                                background: trendUp ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
                                color: trendUp ? '#34d399' : '#fb7185',
                            }}
                        >
                            {trendUp ? <ArrowUpRight size={10} /> : <TrendingDown size={10} />}
                            {trend}
                        </span>
                    )}
                </div>

                <p
                    className="font-mono font-bold tracking-tight"
                    style={{ fontSize: large ? '2.25rem' : '1.75rem', lineHeight: 1.1 }}
                >
                    {animVal}
                </p>
                <p className="text-[11px] font-medium mt-1.5 opacity-40">{label}</p>

                {large && (
                    <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                                width: '72%',
                                background: 'linear-gradient(90deg, #4f46e5, #8b5cf6)',
                                boxShadow: '0 0 8px rgba(99,102,241,0.5)',
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Mini Bar Chart ── */
interface MiniBarChartProps {
    data: number[];
    labels?: string[];
    mode?: 'hour' | 'day';
}

function MiniBarChart({ data, labels, mode }: MiniBarChartProps) {
    const { t } = useLanguage();
    const max = Math.max(...data, 1);
    const total = data.reduce((a, b) => a + b, 0);
    // Máx 10 labels visíveis para não sobrepor
    const step = data.length <= 10 ? 1 : Math.ceil(data.length / 10);

    return (
        <div className="w-full flex flex-col gap-1">
            {/* Resumo rápido */}
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono opacity-30">
                    {total} {t('ticket', 'ticket')}{total !== 1 ? 's' : ''} {t('no período', 'in period')}
                </span>
                <span className="text-[10px] font-mono opacity-20">{t('pico', 'peak')}: {max}</span>
            </div>

            {/* Barras */}
            <div className="flex items-end w-full" style={{ height: '64px', gap: '2px' }}>
                {data.map((val, i) => {
                    const isHighlight = mode === 'hour'
                        ? i === new Date().getHours()
                        : i === data.length - 1;
                    // Zeros ficam com 5% (rastro sutil), valores reais mínimo 10%
                    const heightPct = val === 0 ? 5 : Math.max((val / max) * 100, 10);
                    return (
                        <div
                            key={i}
                            className="flex-1 rounded-t-sm cursor-pointer"
                            title={`${labels?.[i] ?? i}: ${val} ${t('ticket', 'ticket')}${val !== 1 ? 's' : ''}`}
                            style={{
                                height: `${heightPct}%`,
                                transition: 'background 0.15s, box-shadow 0.15s',
                                background: val === 0
                                    ? 'rgba(255,255,255,0.05)'
                                    : isHighlight
                                        ? 'linear-gradient(180deg, #a5b4fc, #6366f1)'
                                        : 'rgba(99,102,241,0.4)',
                                boxShadow: isHighlight && val > 0
                                    ? '0 0 10px rgba(99,102,241,0.5)'
                                    : 'none',
                            }}
                        />
                    );
                })}
            </div>

            {/* Labels eixo X */}
            <div className="flex w-full" style={{ gap: '2px' }}>
                {data.map((_, i) => (
                    <div key={i} className="flex-1 flex justify-center overflow-hidden">
                        {i % step === 0 && (
                            <span className="text-[8px] font-mono opacity-30 whitespace-nowrap">
                                {labels?.[i] ?? i}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Channel Bar ── */
interface ChannelBarProps {
    label: string;
    icon: React.ReactNode;
    value: number;
    total: number;
    gradient: string;
}


function ChannelBar({ label, icon, value, total, gradient }: ChannelBarProps) {
    const [width, setWidth] = useState(0);
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;

    useEffect(() => {
        const t = setTimeout(() => setWidth(pct), 200);
        return () => clearTimeout(t);
    }, [pct]);

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium flex items-center gap-1.5">
                    <span>{icon}</span> {label}
                </span>
                <span className="font-mono text-[11px] opacity-40">{value} · {pct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${width}%`, background: gradient }}
                />
            </div>
        </div>
    );
}

/* ── Attendant Ranking ── */
interface AttendantRankingProps {
    data: { id: string; name: string; avatar_url?: string; count: number }[];
    delay?: number;
}

function AttendantRanking({ data, delay = 0 }: AttendantRankingProps) {
    const { t } = useLanguage();
    const maxCount = Math.max(...data.map(d => d.count), 1);

    return (
        <div
            className="glass-surface rounded-2xl p-5 hover-lift fade-up h-full flex flex-col"
            style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
        >
            <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <Users size={15} className="text-indigo-400" />
                </div>
                <h3 className="text-[13px] font-bold">{t('Ranking de Atendentes', 'Agent Ranking')}</h3>
            </div>

            <div className="space-y-5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {data.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                        <Users size={32} strokeWidth={1} />
                        <p className="text-[10px] mt-2 font-medium">{t('Sem dados no período', 'No data for period')}</p>
                    </div>
                ) : (
                    data.map((attendant, i) => {
                        const pct = Math.round((attendant.count / maxCount) * 100);
                        return (
                            <div key={attendant.id} className="group/item">
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="relative">
                                            {attendant.avatar_url ? (
                                                <img
                                                    src={attendant.avatar_url}
                                                    alt={attendant.name}
                                                    className="w-7 h-7 rounded-full object-cover border border-white/5"
                                                />
                                            ) : (
                                                <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold uppercase">
                                                    {attendant.name.charAt(0)}
                                                </div>
                                            )}
                                            {i < 3 && (
                                                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold shadow-lg"
                                                    style={{
                                                        background: i === 0 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' :
                                                                    i === 1 ? 'linear-gradient(135deg, #cbd5e1, #94a3b8)' :
                                                                              'linear-gradient(135deg, #d97706, #b45309)',
                                                        color: '#fff'
                                                    }}>
                                                    {i + 1}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold leading-none group-hover/item:text-indigo-400 transition-colors uppercase tracking-tight">
                                                {attendant.name.split(' ')[0]}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="font-mono text-[11px] font-bold opacity-40">{attendant.count}</span>
                                </div>
                                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000 ease-out"
                                        style={{
                                            width: `${pct}%`,
                                            background: i === 0 ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' : 'rgba(99,102,241,0.4)',
                                            boxShadow: i === 0 ? '0 0 8px rgba(99,102,241,0.3)' : 'none'
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { isDark } = useTheme();
    const { user } = useAuth();
    const { t } = useLanguage();
    const { checkAndStartTour } = useTour();
    const [dateFilter, setDateFilter] = useState('today');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkAndStartTour('dashboard');
    }, [checkAndStartTour]);
    const [stats, setStats] = useState({
        totalTickets: 0,
        activeTickets: 0,
        resolvedToday: 0,
        ordersPlaced: 0,
        avgResponseTime: '0m',
        avgResolutionTime: '—',
        ticketsByHour: Array(24).fill(0),
        chartLabels: Array.from({ length: 24 }, (_, i) => `${i}h`),
        chartMode: 'hour' as 'hour' | 'day',
        ticketsByChannel: { whatsapp: 0, instagram: 0, messenger: 0 },
        topTags: [] as { label: string; count: number }[],
        topAttendants: [] as { id: string; name: string; avatar_url?: string; count: number }[]
    });

    useEffect(() => {
        if (!user?.organization?.id) return;

        let isMounted = true;
        const loadStats = async () => {
            setIsLoading(true);
            try {
                const data = await getDashboardStats(user!.organization!.id, dateFilter);
                if (isMounted) {

                    setStats(data as any);
                }
            } catch (error) {
                console.error('Erro ao carregar dashboard stats', error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadStats();

        return () => { isMounted = false; };
    }, [user?.organization?.id, dateFilter]);

    const totalByChannel = stats.ticketsByChannel.whatsapp + stats.ticketsByChannel.instagram + stats.ticketsByChannel.messenger;

    return (
        <div className="flex-1 overflow-y-auto p-6 fade-up">
            {/* Header */}
            <div className="mb-7 flex items-end justify-between">
                <div data-tour="dashboard-header">
                    <p className="text-[11px] font-mono font-semibold mb-1 uppercase tracking-widest"
                        style={{ color: isDark ? 'rgba(139,92,246,0.7)' : 'rgba(99,102,241,0.7)' }}>
                        sys.overview
                    </p>
                    <h1 className="text-2xl font-bold tracking-tight">{t('Dashboard', 'Dashboard')}</h1>
                    <p className="text-sm opacity-35 mt-0.5">{t('Visão geral do atendimento em tempo real', 'Real-time support overview')}</p>
                </div>
                <div className="flex items-center gap-3" data-tour="dashboard-filters">
                    <div className="relative group">
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="appearance-none bg-transparent hover:bg-white/5 pl-9 pr-8 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors outline-none border border-white/10"
                            style={{ color: isDark ? '#e2e8f0' : '#475569' }}
                        >
                            <option value="today" className="bg-slate-900 text-white">{t('Hoje', 'Today')}</option>
                            <option value="yesterday" className="bg-slate-900 text-white">{t('Ontem', 'Yesterday')}</option>
                            <option value="last7days" className="bg-slate-900 text-white">{t('Últimos 7 dias', 'Last 7 days')}</option>
                            <option value="last30days" className="bg-slate-900 text-white">{t('Últimos 30 dias', 'Last 30 days')}</option>
                            <option value="thisMonth" className="bg-slate-900 text-white">{t('Este mês', 'This Month')}</option>
                            <option value="lastMonth" className="bg-slate-900 text-white">{t('Mês passado', 'Last Month')}</option>
                        </select>
                        <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
                    </div>

                    <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-mono font-semibold"
                        style={{
                            background: isLoading ? 'rgba(255,255,255,0.05)' : 'rgba(16,185,129,0.1)',
                            border: isLoading ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(16,185,129,0.2)',
                            color: isLoading ? '#94a3b8' : '#34d399',
                        }}
                    >
                        {isLoading ? (
                            <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
                        )}
                        {isLoading ? t('atualizando...', 'updating...') : 'live'}
                    </div>
                </div>
            </div>

            {/* ── BENTO GRID ── */}
            <div
                className="grid gap-3"
                style={{
                    gridTemplateColumns: 'repeat(8, 1fr)',
                    gridTemplateRows: 'auto',
                }}
            >
                {/* Stat Cards */}
                <div style={{ gridColumn: 'span 2' }}>
                    <StatCard
                        icon={MessageSquare}
                        label={t('Total de Tickets', 'Total Tickets')}
                        value={stats.totalTickets}
                        color="#4f46e5, #6366f1"
                        trend="+12%"
                        trendUp
                        delay={0}
                    />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                    <StatCard
                        icon={Zap}
                        label={t('Tickets Ativos', 'Active Tickets')}
                        value={stats.activeTickets}
                        color="#f59e0b, #fbbf24"
                        delay={40}
                    />
                </div>

                <div style={{ gridColumn: 'span 2' }} data-tour="dashboard-stats">
                    <StatCard
                        icon={CheckCircle2}
                        label={t('Resolvidos Hoje', 'Resolved Today')}
                        value={stats.resolvedToday}
                        color="#10b981, #34d399"
                        trend="+5%"
                        trendUp
                        delay={80}
                    />
                </div>

                {/* Attendant Ranking */}
                <div style={{ gridColumn: 'span 2', gridRow: 'span 3' }} data-tour="dashboard-ranking">
                    <AttendantRanking data={stats.topAttendants} delay={100} />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                    <div
                        className="glass-surface rounded-2xl p-5 hover-lift fade-up h-full"
                        style={{ animationDelay: '120ms', animationFillMode: 'both' }}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center"
                                style={{
                                    background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                                }}
                            >
                                <Clock size={17} className="text-white" strokeWidth={2} />
                            </div>
                        </div>
                        <p className="font-mono font-bold text-2xl tracking-tight">{stats.avgResponseTime}</p>
                        <p className="text-[11px] font-medium mt-1.5 opacity-40">{t('Tempo Médio de Resposta', 'Avg Response Time')}</p>
                    </div>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                    <div
                        className="glass-surface rounded-2xl p-5 hover-lift fade-up h-full"
                        style={{ animationDelay: '160ms', animationFillMode: 'both' }}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg, #e11d48, #fb7185)' }}
                            >
                                <Timer size={17} className="text-white" strokeWidth={2} />
                            </div>
                        </div>
                        <p className="font-mono font-bold text-2xl tracking-tight">{stats.avgResolutionTime}</p>
                        <p className="text-[11px] font-medium mt-1.5 opacity-40">{t('Tempo Médio de Resolução', 'Avg Resolution Time')}</p>
                    </div>
                </div>

                <div style={{ gridColumn: 'span 2' }} data-tour="dashboard-averages">
                    <div
                        className="glass-surface rounded-2xl p-5 hover-lift fade-up h-full"
                        style={{ animationDelay: '180ms', animationFillMode: 'both' }}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                            >
                                <ShoppingBag size={17} className="text-white" strokeWidth={2} />
                            </div>
                            <span className="flex items-center gap-0.5 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399' }}>
                                {t('Conversão', 'Conversion')}: {stats.resolvedToday > 0 ? Math.round(((stats.ordersPlaced || 0) / stats.resolvedToday) * 100) : 0}%
                            </span>
                        </div>
                        <p className="font-mono font-bold text-2xl tracking-tight">{stats.ordersPlaced || 0}</p>
                        <p className="text-[11px] font-medium mt-1.5 opacity-40">{t('Pedidos Feitos (Resolvidos)', 'Orders Placed (Resolved)')}</p>
                    </div>
                </div>

                {/* Hourly chart */}
                <div style={{ gridColumn: 'span 3' }} data-tour="dashboard-charts">
                    <div
                        className="glass-surface rounded-2xl p-5 hover-lift fade-up h-full"
                        style={{ animationDelay: '200ms', animationFillMode: 'both' }}
                    >
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <BarChart3 size={15} style={{ color: '#818cf8' }} />
                                <h3 className="text-[13px] font-bold">
                                    {stats.chartMode === 'day' ? t('Tickets por Dia', 'Tickets per Day') : t('Tickets por Hora', 'Tickets per Hour')}
                                </h3>
                            </div>
                        </div>
                        <MiniBarChart data={stats.ticketsByHour} labels={stats.chartLabels} mode={stats.chartMode} />
                    </div>
                </div>

                {/* Channel breakdown */}
                <div style={{ gridColumn: 'span 3' }} data-tour="dashboard-channels">
                    <div
                        className="glass-surface rounded-2xl p-5 hover-lift fade-up h-full"
                        style={{ animationDelay: '240ms', animationFillMode: 'both' }}
                    >
                        <div className="flex items-center gap-2 mb-5">
                            <Activity size={15} style={{ color: '#818cf8' }} />
                            <h3 className="text-[13px] font-bold">{t('Canais de Atendimento', 'Support Channels')}</h3>
                        </div>
                        <div className="space-y-4">
                            <ChannelBar
                                label="WhatsApp"
                                icon={
                                    <span className="w-5 h-5 rounded-md flex items-center justify-center bg-emerald-500 shadow">
                                        <svg viewBox="0 0 24 24" width="12" height="12" fill="white">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.119 1.532 5.843L0 24l6.334-1.51A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.5-5.223-1.374l-.374-.222-3.881.925.974-3.769-.244-.389A9.945 9.945 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                                        </svg>
                                    </span>
                                }
                                value={stats.ticketsByChannel.whatsapp}
                                total={totalByChannel}
                                gradient="linear-gradient(90deg, #10b981, #34d399)"
                            />
                            <ChannelBar
                                label="Instagram"
                                icon={
                                    <span className="w-5 h-5 rounded-md flex items-center justify-center bg-linear-to-br from-orange-400 via-pink-500 to-purple-600 shadow">
                                        <svg viewBox="0 0 24 24" width="12" height="12" fill="white">
                                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                        </svg>
                                    </span>
                                }
                                value={stats.ticketsByChannel.instagram}
                                total={totalByChannel}
                                gradient="linear-gradient(90deg, #e11d48, #fb7185)"
                            />
                            <ChannelBar
                                label="Messenger"
                                icon={
                                    <span className="w-5 h-5 rounded-md flex items-center justify-center bg-blue-500 shadow">
                                        <svg viewBox="0 0 24 24" width="12" height="12" fill="white">
                                            <path d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z" />
                                        </svg>
                                    </span>
                                }
                                value={stats.ticketsByChannel.messenger}
                                total={totalByChannel}
                                gradient="linear-gradient(90deg, #4f46e5, #818cf8)"
                            />
                        </div>
                    </div>
                </div>

                {/* Top Tags */}
                <div style={{ gridColumn: 'span 8' }} data-tour="dashboard-tags">
                    <div
                        className="glass-surface rounded-2xl p-5 hover-lift fade-up"
                        style={{ animationDelay: '280ms', animationFillMode: 'both' }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[13px] font-bold">{t('Top Etiquetas', 'Top Tags')}</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {stats.topTags.map((tag, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-default transition-all duration-150"
                                    style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                    }}
                                >
                                    <span
                                        className="w-1.5 h-1.5 rounded-full"
                                        style={{ background: `hsl(${(i * 47 + 240) % 360}, 70%, 65%)` }}
                                    />
                                    <span className="text-[12px] font-medium">{tag.label}</span>
                                    <span className="font-mono text-[10px] opacity-35">{tag.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
