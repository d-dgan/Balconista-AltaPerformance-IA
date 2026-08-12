import { supabase } from './supabase';

/**
 * Converte minutos em string legível: "5m", "1h 30m", etc.
 */
const formatMinutes = (minutes: number): string => {
    if (!minutes || minutes <= 0) return '—';
    const m = Math.round(minutes);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
};

/**
 * Retorna as datas de início e fim baseadas no filtro
 */
export const getDateRange = (filter: string) => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    switch (filter) {
        case 'yesterday':
            start.setDate(now.getDate() - 1);
            end.setDate(now.getDate() - 1);
            break;
        case 'last7days':
            start.setDate(now.getDate() - 6);
            break;
        case 'last30days':
            start.setDate(now.getDate() - 29);
            break;
        case 'thisMonth':
            start.setDate(1);
            break;
        case 'lastMonth':
            start.setMonth(now.getMonth() - 1);
            start.setDate(1);
            end.setMonth(now.getMonth());
            end.setDate(0);
            break;
        case 'today':
        default:
            break;
    }

    return { start: start.toISOString(), end: end.toISOString() };
};

export const getDashboardStatsFixed = async (organizationId: string | number, dateFilter: string = 'today', signal: AbortSignal | null = null) => {
    if (!organizationId) throw new Error('organizationId é obrigatório para acessar o dashboard');

    const isCancelled = () => signal?.aborted === true;
    const { start, end } = getDateRange(dateFilter);



    try {
        // Buscamos TODOS os tickets da organização uma única vez
        const [allTicketsRes, tagsDataRes, avgTimeRes] = await Promise.all([
            supabase.from('tickets').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(5000),
            supabase.from('tickets').select(`id, ticket_tags(tag_id, tags(id, label, color))`).eq('organization_id', organizationId).gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false }).limit(500),
            supabase.rpc('get_avg_response_time', { p_org_id: organizationId, p_start_date: start, p_end_date: end })
        ]);

        if (isCancelled()) return null;

        if (allTicketsRes.error) console.error('[DEBUG Dashboard FIXED] Erro ao buscar tickets:', allTicketsRes.error);

        const allTickets = allTicketsRes.data || [];
        const tagsData = tagsDataRes.data || [];
        const avgMinutes = avgTimeRes.data || 0;

        // Filtramos em memória usando milissegundos para precisão absoluta
        const startTs = new Date(start).getTime();
        const endTs = new Date(end).getTime();

        const timeData = allTickets.filter(t => {
            const ticketTs = new Date(t.created_at).getTime();
            return ticketTs >= startTs && ticketTs <= endTs;
        });

        const totalTickets = timeData.length;
        const activeTickets = allTickets.filter(t => ['waiting', 'active', 'flow'].includes(t.status?.toLowerCase())).length;

        const resolvedToday = allTickets.filter(t => {
            if (!t.resolved_at) return false;
            const resTs = new Date(t.resolved_at).getTime();
            const isResolvedStatus = ['resolved', 'closed'].includes(t.status?.toLowerCase());
            return isResolvedStatus && resTs >= startTs && resTs <= endTs;
        }).length;

        const ordersPlaced = allTickets.filter(t => {
            if (!t.resolved_at || !t.order_placed) return false;
            const resTs = new Date(t.resolved_at).getTime();
            return resTs >= startTs && resTs <= endTs;
        }).length;

        // Tempo Médio de Resolução (created_at → resolved_at)
        const resolvedTicketsInPeriod = allTickets.filter(t => {
            if (!t.resolved_at || !t.created_at) return false;
            const resTs = new Date(t.resolved_at).getTime();
            const isResolved = ['resolved', 'closed'].includes(t.status?.toLowerCase());
            return isResolved && resTs >= startTs && resTs <= endTs;
        });

        let avgResolutionMinutes = 0;
        if (resolvedTicketsInPeriod.length > 0) {
            const totalMinutes = resolvedTicketsInPeriod.reduce((sum, t) => {
                const created = new Date(t.created_at).getTime();
                const resolved = new Date(t.resolved_at).getTime();
                return sum + (resolved - created) / (1000 * 60); // ms → minutos
            }, 0);
            avgResolutionMinutes = totalMinutes / resolvedTicketsInPeriod.length;
        }



        // Canais
        const ticketsByChannel = {
            whatsapp: timeData.filter(t => t.channel === 'whatsapp').length,
            instagram: timeData.filter(t => t.channel === 'instagram').length,
            messenger: timeData.filter(t => t.channel === 'messenger').length
        };

        // Gráfico
        const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        let chartValues: number[] = [];
        let chartLabels: string[] = [];
        let chartMode: 'hour' | 'day' = 'hour';

        const startDate = new Date(start);
        const endDate = new Date(end);

        if (dateFilter === 'today' || dateFilter === 'yesterday') {
            chartMode = 'hour';
            chartValues = Array(24).fill(0);
            chartLabels = Array.from({ length: 24 }, (_, i) => `${i}h`);
            timeData.forEach((t: any) => {
                const h = new Date(t.created_at).getHours();
                chartValues[h]++;
            });
        } else {
            chartMode = 'day';
            const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            chartValues = Array(totalDays).fill(0);
            chartLabels = Array.from({ length: totalDays }, (_, i) => {
                const d = new Date(startDate);
                d.setDate(startDate.getDate() + i);
                if (totalDays <= 7) return DAY_NAMES[d.getDay()];
                if (totalDays <= 31) return `${d.getDate()}/${d.getMonth() + 1}`;
                return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
            });
            timeData.forEach((t: any) => {
                const diff = new Date(t.created_at).getTime() - startDate.getTime();
                const dayIdx = Math.floor(diff / (1000 * 60 * 60 * 24));
                if (dayIdx >= 0 && dayIdx < totalDays) chartValues[dayIdx]++;
            });
        }

        // Etiquetas
        let topTags: any[] = [];
        if (tagsData) {
            const counts: Record<string, number> = {};
            const tagInfo: Record<string, any> = {};

            tagsData.forEach((tick: any) => {
                if (tick.ticket_tags) {
                    tick.ticket_tags.forEach((tt: any) => {
                        if (tt.tags?.id) {
                            counts[tt.tags.id] = (counts[tt.tags.id] || 0) + 1;
                            tagInfo[tt.tags.id] = tt.tags;
                        }
                    });
                }
            });

            topTags = Object.keys(counts)
                .map(id => ({
                    id,
                    label: tagInfo[id]?.label || 'Desconhecida',
                    color: tagInfo[id]?.color || '#4f46e5',
                    count: counts[id]
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
        }

        // Usuários para o ranking
        const { data: usersData } = await supabase.from('users').select('id, name, avatar_url').eq('organization_id', organizationId);

        // Ranking de Atendentes
        let topAttendants: any[] = [];
        if (usersData && timeData.length > 0) {
            const counts: Record<string, number> = {};
            timeData.forEach((t: any) => {
                if (t.assigned_to) {
                    counts[t.assigned_to] = (counts[t.assigned_to] || 0) + 1;
                }
            });

            topAttendants = usersData
                .map(u => ({
                    id: u.id,
                    name: u.name,
                    avatar_url: u.avatar_url,
                    count: counts[u.id] || 0
                }))
                .filter(a => a.count > 0)
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);
        }

        return {
            totalTickets,
            activeTickets,
            resolvedToday,
            ordersPlaced,
            avgResponseTime: formatMinutes(avgMinutes),
            avgResolutionTime: formatMinutes(avgResolutionMinutes),
            ticketsByHour: chartValues,
            chartLabels,
            chartMode,
            ticketsByChannel,
            topTags,
            topAttendants
        };
    } catch (error) {
        console.error('[DEBUG Dashboard FIXED] Erro crítico no service:', error);
        throw error;
    }
};
