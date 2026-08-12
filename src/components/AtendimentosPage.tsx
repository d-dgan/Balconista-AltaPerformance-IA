import { useState, useCallback, useEffect, useRef } from 'react';
import NotificationToast, { useNotificationToast } from './NotificationToast';
import NewTicketModal from './NewTicketModal';
import TicketPanel from './TicketPanel';
import ChatWindow from './ChatWindow';
import ContextSidebar from './ContextSidebar';
import { tickets as initialTickets } from '../data/mockData';
import { 
    CheckCircle2, Search, UserMinus, ShoppingBag, XCircle, 
    MessageSquareMore, CalendarClock, UserPlus, Layers, Building2,
    Users, Ticket, Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useBrowserNotifications } from '../contexts/BrowserNotificationsContext';
import * as ticketService from '../services/ticketService';
import * as api from '../services/api';
import * as userService from '../services/userService';
import { supabase } from '../services/supabase';
import type { Contact, Tag } from '../services/api';
import type { Connection } from '../services/connectionService';
import { useTour } from '../contexts/TourContext';

const TRAINING_TICKET: TicketExtended = {
    id: 'tk_treinamento',
    contact: {
        id: 'ct_treinamento',
        name: 'Sr. João da Farmácia (Treinamento)',
        phone: '5511999999999',
        avatar: 'https://i.pravatar.cc/150?img=11',
        tags: [],
        email: 'joao.silva@exemplo.com',
        notes: 'Paciente recorrente, busca insulina Lantus todos os meses. Sempre muito gentil.',
        lastSeen: new Date().toISOString(),
    } as any,
    status: 'active',
    assigned_to: 'agent_id',
    channel: 'whatsapp',
    lastMessage: 'Olá, gostaria de saber se minha insulina já chegou?',
    lastMessageTime: new Date().toISOString(),
    unreadCount: 1,
    tags: [
        { label: 'Treinamento', color: 'indigo' } as any,
        { label: 'Diabetes', color: 'blue' } as any
    ],
    createdAt: new Date().toISOString(),
};

// Check if Supabase is configured
const isSupabaseConfigured = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    return url && url !== 'https://your-project.supabase.co' && !url.includes('your-project');
};

// Check if a ticket ID is from mock data (not a real Supabase UUID)
const isMockId = (id: string) => typeof id === 'string' && id.startsWith('tk_');

// Only persist to Supabase if configured AND data is real (not mock)
const shouldPersist = (ticketId: string) => isSupabaseConfigured() && !isMockId(ticketId);

// Format contact display name: if 'name' is a phone number, return it formatted
const formatContactName = (name: string | null | undefined, phone: string | null | undefined, t: any): string => {
    if (!name) return phone ? formatPhone(phone) : t('Contato', 'Contact');
    // Detect if name looks like a phone number (only digits, +, -, spaces)
    const isPhoneNumber = /^[\d\+\-\s\(\)]+$/.test(name.trim()) && name.trim().length >= 8;
    if (isPhoneNumber) return formatPhone(name);
    return name;
};

const formatPhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    // Brazilian number with country code: +55 (11) 9xxxx-xxxx
    if (digits.length === 13 && digits.startsWith('55')) {
        return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    // Brazilian number without country code
    if (digits.length === 11) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return phone; // Return as-is if pattern doesn't match
};

export interface TicketExtended {
    id: string;
    contact: Contact & { avatar?: string };
    status: string;
    assigned_to?: string | null;
    channel: string;
    lastMessage?: string;
    lastMessageTime?: string;
    unreadCount: number;
    tags: Tag[];
    createdAt: string;
    orderPlaced?: boolean;
    resolvedAt?: string | null;
    isGroup?: boolean;
}

const getCurrentMonthTagLabel = () => {
    const date = new Date();
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const mmm = months[date.getMonth()];
    const aa = date.getFullYear().toString().slice(-2);
    return `${mmm}-${aa}`;
};

export default function AtendimentosPage({ initialTicketId }: { initialTicketId?: string | null }) {
    const { user } = useAuth();
    const { t } = useLanguage();
    const { sendNotification, incrementUnread, isSoundEnabled } = useBrowserNotifications();
    const [tickets, setTickets] = useState<TicketExtended[]>(() => user?.role === 'super_admin' ? initialTickets as any : []);
    const [groups, setGroups] = useState<TicketExtended[]>([]);
    const [orgUsers, setOrgUsers] = useState<any[]>([]);
    const [isUsersLoading, setIsUsersLoading] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<TicketExtended | null>(null);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [ticketToResolve, setTicketToResolve] = useState<TicketExtended | null>(null);
    const [showContextSidebar, setShowContextSidebar] = useState(true);
    const [aiSuggestionText, setAiSuggestionText] = useState<string | null>(null);
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [lastIncomingMsgId, setLastIncomingMsgId] = useState<string | null>(null);
    const [lastIncomingMsgTicketId, setLastIncomingMsgTicketId] = useState<string | null>(null);
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [orgConnection, setOrgConnection] = useState<Connection[] | null>(null);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(new Audio('/notification.mp3'));
    const { notifications: toastNotifications, addNotification, dismissNotification } = useNotificationToast();

    // Refs to always have fresh ticket/group data in realtime callbacks
    const ticketsRef = useRef<TicketExtended[]>([]);
    const groupsRef = useRef<TicketExtended[]>([]);
    const { isActive, currentTour, currentStepIndex, checkAndStartTour } = useTour();
    const isTrainingActive = isActive && currentTour?.id === 'atendimentos';

    useEffect(() => {
        checkAndStartTour('atendimentos');
    }, [checkAndStartTour]);

    useEffect(() => {
        if (isTrainingActive && currentStepIndex >= 11 && currentStepIndex <= 14) {
            setTicketToResolve(TRAINING_TICKET);
        } else if (!isTrainingActive || currentStepIndex < 11 || currentStepIndex > 14) {
            setTicketToResolve(prev => (prev?.id === 'tk_treinamento' ? null : prev));
        }
    }, [isTrainingActive, currentStepIndex]);

    useEffect(() => { ticketsRef.current = tickets; }, [tickets]);
    useEffect(() => { groupsRef.current = groups; }, [groups]);

    // ---- Training Tour Logic: Inject Mock Ticket ----
    useEffect(() => {
        if (isTrainingActive) {
            setTickets(prev => {
                const alreadyHas = prev.some(t => t.id === TRAINING_TICKET.id);
                if (alreadyHas) return prev;
                return [TRAINING_TICKET, ...prev];
            });
            setSelectedTicket(TRAINING_TICKET);
        } else {
            setTickets(prev => prev.filter(t => t.id !== TRAINING_TICKET.id));
            setSelectedTicket(prev => prev?.id === TRAINING_TICKET.id ? null : prev);
        }
    }, [isTrainingActive]);


    // ---- Load tickets and groups from Supabase ----
    useEffect(() => {
        if (!isSupabaseConfigured() || !user?.organization?.id) return;

        const loadData = async () => {
            // 1. Fetch Tickets
            const { data: ticketData, error: ticketError } = await ticketService.fetchTickets(user.organization?.id as string);
            if (!ticketError && ticketData) {
                const transformedTickets: TicketExtended[] = ticketData.map((t: any) => ({
                    id: t.id,
                    contact: {
                        ...t.contact,
                        avatar: t.contact?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.contact?.name || 'User')}&background=random`
                    },
                    status: t.status,
                    assigned_to: t.assigned_to,
                    channel: t.channel,
                    lastMessage: t.last_message,
                    lastMessageTime: t.last_message_time || t.updated_at,
                    unreadCount: t.unread_count || 0,
                    tags: t.tags || [],
                    orderPlaced: t.order_placed,
                    resolvedAt: t.resolved_at,
                    createdAt: t.created_at,
                }));
                setTickets(transformedTickets);
            }

            // 2. Fetch Groups
            const { data: groupData, error: groupError } = await ticketService.fetchWhatsAppGroups(user.organization?.id as string);
            if (!groupError && groupData) {
                const transformedGroups: TicketExtended[] = groupData.map((g: any) => ({
                    id: g.id,
                    isGroup: true,
                    contact: {
                        name: g.name,
                        phone: g.group_jid,
                        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(g.name)}&background=random`,
                    } as any,
                    status: 'groups',
                    assigned_to: null,
                    channel: 'whatsapp',
                    lastMessage: g.last_message,
                    lastMessageTime: g.last_message_time || g.created_at,
                    unreadCount: g.unread_count || 0,
                    tags: [],
                    createdAt: g.created_at,
                }));
                setGroups(transformedGroups);
                try {
                    const tags = await api.fetchTags(user.organization?.id as string);
                    setAllTags(tags || []);
                } catch (err) {
                    console.error("Error loading tags:", err);
                }
            }

            // 3. Fetch Organization Users for Transfer
            try {
                setIsUsersLoading(true);
                const { data: users, error } = await userService.listUsers(user.organization?.id as string);
                if (!error && users) {
                    setOrgUsers(users);
                }
            } catch (err) {
                console.error("Error loading org users:", err);
            } finally {
                setIsUsersLoading(false);
            }

            // 4. Cache the org connection once
            try {
                const connService = await import('../services/connectionService');
                const { data: conns } = await connService.listOrgConnections(user.organization?.id as string);
                if (conns?.length) setOrgConnection(conns);
            } catch (err) {
                console.error("Error loading org connections:", err);
            }
        };

        loadData();
    }, [user?.organization?.id]);

    // ---- Realtime: subscribe to ticket & group changes ----
    useEffect(() => {
        if (!isSupabaseConfigured() || !user?.organization?.id) return;

        const ticketChannel = ticketService.subscribeToTicketChanges(
            user.organization.id,
            (payload) => {
                const { eventType, new: newRecord, old: oldRecord } = payload;

                if (eventType === 'UPDATE') {
                    // If ticket exists in list, update it. If not, fetch it full (it might be an old ticket receiving a new message)
                    const existing = ticketsRef.current.find(t => t.id === newRecord.id);
                    
                    if (existing) {
                        const updated: Partial<TicketExtended> = {
                            id: newRecord.id,
                            status: newRecord.status,
                            assigned_to: newRecord.assigned_to,
                            channel: newRecord.channel,
                            lastMessage: newRecord.last_message,
                            lastMessageTime: newRecord.last_message_time || newRecord.updated_at,
                            unreadCount: newRecord.unread_count || 0,
                            tags: newRecord.tags || [],
                            orderPlaced: newRecord.order_placed,
                            resolvedAt: newRecord.resolved_at,
                            createdAt: newRecord.created_at,
                        };

                        setTickets((prev) =>
                            prev.map((t) =>
                                t.id === updated.id ? { ...t, ...updated } : t
                            )
                        );

                        setSelectedTicket((prev) => {
                            if (!prev || prev.id !== updated.id) return prev;
                            return { ...prev, ...updated } as TicketExtended;
                        });
                    } else {
                        // Ticket not in current top list, fetch it full
                        ticketService.fetchTicketById(newRecord.id).then(({ data, error }) => {
                            if (data && !error) {
                                const ticket: TicketExtended = {
                                    id: data.id,
                                    contact: {
                                        ...data.contact,
                                        avatar: data.contact?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.contact?.name || 'User')}&background=random`
                                    } as any,
                                    status: data.status,
                                    assigned_to: data.assigned_to,
                                    channel: data.channel,
                                    lastMessage: data.last_message,
                                    lastMessageTime: data.last_message_time || data.updated_at,
                                    unreadCount: data.unread_count || 0,
                                    tags: data.tags || [],
                                    orderPlaced: data.order_placed,
                                    resolvedAt: data.resolved_at,
                                    createdAt: data.created_at,
                                };
                                setTickets((prev) => prev.some(t => t.id === ticket.id) ? prev : [ticket, ...prev]);
                            }
                        });
                    }
                } else if (eventType === 'INSERT') {
                    ticketService.fetchTicketById(newRecord.id).then(({ data, error }) => {
                        if (error) console.error("Error fetching new ticket:", error);
                        if (data) {
                            const ticket: TicketExtended = {
                                id: data.id,
                                contact: {
                                    ...data.contact,
                                    avatar: data.contact?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.contact?.name || 'User')}&background=random`
                                } as any,
                                status: data.status,
                                assigned_to: data.assigned_to,
                                channel: data.channel,
                                lastMessage: data.last_message,
                                lastMessageTime: data.last_message_time || data.updated_at,
                                unreadCount: data.unread_count || 0,
                                tags: data.tags || [],
                                orderPlaced: data.order_placed,
                                resolvedAt: data.resolved_at,
                                createdAt: data.created_at,
                            };
                            setTickets((prev) => prev.some(t => t.id === ticket.id) ? prev : [ticket, ...prev]);

                            // Toast in-app notification
                            addNotification(
                                t('Novo Chamado', 'New Ticket') + `: ${ticket.contact.name}`,
                                ticket.lastMessage || t('Nova mensagem recebida', 'New message received'),
                                ticket.channel
                            );
                        } else {
                            console.warn("New ticket inserted but fetchById returned no data. Check RLS.", newRecord.id);
                        }
                    });
                } else if (eventType === 'DELETE') {
                    setTickets((prev) => prev.filter((t) => t.id !== oldRecord.id));
                    setSelectedTicket((prev) =>
                        prev?.id === oldRecord.id ? null : prev
                    );
                }
            }
        );

        const groupChannel = ticketService.subscribeToWhatsAppGroups(
            user.organization.id,
            (payload) => {
                const { eventType, new: newRecord, old: oldRecord } = payload;
                if (eventType === 'UPDATE') {
                    setGroups(prev => {
                        const existing = prev.find(g => g.id === newRecord.id);
                        const updatedGroup: TicketExtended = {
                            ...(existing || {} as TicketExtended),
                            id: newRecord.id,
                            isGroup: true,
                            contact: { ...(existing?.contact || {} as any), name: newRecord.name, phone: newRecord.group_jid },
                            status: 'groups',
                            channel: 'whatsapp',
                            lastMessage: newRecord.last_message,
                            lastMessageTime: newRecord.last_message_time || newRecord.created_at,
                            unreadCount: newRecord.unread_count
                        } as TicketExtended;
                        const filtered = prev.filter(g => g.id !== newRecord.id);
                        return [updatedGroup, ...filtered];
                    });

                    setSelectedTicket((prev) => {
                        if (!prev || prev.id !== newRecord.id) return prev;
                        return {
                            ...prev,
                            contact: { ...prev.contact, name: newRecord.name, phone: newRecord.group_jid } as any,
                            lastMessage: newRecord.last_message,
                            lastMessageTime: newRecord.last_message_time || newRecord.created_at,
                            unreadCount: newRecord.unread_count
                        } as TicketExtended;
                    });
                } else if (eventType === 'INSERT') {
                    setGroups(prev => [{
                        id: newRecord.id,
                        isGroup: true,
                        contact: {
                            name: newRecord.name,
                            phone: newRecord.group_jid,
                            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newRecord.name)}&background=random`,
                        } as any,
                        status: 'groups',
                        assigned_to: null,
                        channel: 'whatsapp',
                        lastMessage: newRecord.last_message,
                        lastMessageTime: newRecord.last_message_time || newRecord.created_at,
                        unreadCount: newRecord.unread_count || 0,
                        tags: [],
                        createdAt: newRecord.created_at,
                    }, ...prev]);

                    addNotification(t('Novo Grupo', 'New Group') + `: ${newRecord.name}`, newRecord.last_message || t('Nova mensagem em grupo', 'New message in group'), 'whatsapp');

                } else if (eventType === 'DELETE') {
                    setGroups((prev) => prev.filter((g) => g.id !== oldRecord.id));
                    setSelectedTicket((prev) =>
                        prev?.id === oldRecord.id ? null : prev
                    );
                }
            }
        );

        // ---- Notification Sound & Toasts ----
        const messagesChannel = ticketService.subscribeToAllOrgMessages(
            user.organization.id,
            async (payload) => {
                if (payload.eventType === 'INSERT') {
                    const msg = payload.new;
                    // Strict check: only notify if the sender is 'contact'
                    // This prevents notifications for agent-sent messages (sender='agent' or sender='user')
                    if (msg.sender === 'contact') {
                        // Sound — respects user preference
                        if (isSoundEnabled) {
                            audioRef.current.currentTime = 0;
                            audioRef.current.play().catch(e => console.log('Audio autoplay blocked', e));
                        }

                        // Track last incoming message for AI copilot trigger
                        setLastIncomingMsgId(msg.id);
                        setLastIncomingMsgTicketId(msg.ticket_id);

                        // Find ticket contact name via ref (avoids stale closure)
                        let ticket = ticketsRef.current.find(t => t.id === msg.ticket_id);
                        
                        // If ticket not found in local state (e.g. it's very new), try to fetch its name
                        let contactName = '';
                        if (ticket) {
                            contactName = formatContactName(ticket.contact?.name, ticket.contact?.phone, t);
                        } else {
                            // If it's a new ticket, the ticket INSERT event might be handled shortly.
                            // To avoid "Mensagem de Contato", we try a quick direct fetch
                            const { data } = await ticketService.fetchTicketById(msg.ticket_id);
                            if (data) {
                                contactName = formatContactName(data.contact?.name, data.contact?.phone, t);
                                // Note: we don't add to setTickets here, the ticket INSERT handler does that properly
                            } else {
                                contactName = t('Contato', 'Contact');
                            }
                        }

                        // In-app toast
                        addNotification(t('Mensagem de', 'Message from') + ` ${contactName}`, msg.body || msg.content || t('Nova mensagem recebida', 'New message received'), ticket?.channel);

                        // Native OS browser push (fires only when tab is unfocused)
                        sendNotification(
                            t('Mensagem de', 'Message from') + ` ${contactName}`,
                            msg.body || msg.content || t('Nova mensagem recebida', 'New message received'),
                            { channel: ticket?.channel, focusTab: true }
                        );

                        // Increment title badge
                        incrementUnread();
                    }
                }
            }
        );

        const groupMessagesChannel = ticketService.subscribeToAllOrgGroupMessages(user.organization.id, (payload) => {
            if (payload.eventType === 'INSERT') {
                const msg = payload.new;
                if (msg.from_me === false) {
                    if (isSoundEnabled) {
                        audioRef.current.currentTime = 0;
                        audioRef.current.play().catch(e => console.log('Audio autoplay blocked', e));
                    }

                    const group = groupsRef.current.find(g => g.id === msg.group_id);
                    const groupName = group?.contact?.name || t('Grupo', 'Group');

                    addNotification(t('Grupo', 'Group') + `: ${groupName}`, msg.body || msg.content || t('Nova mensagem no grupo', 'New message in group'), 'whatsapp');

                    // Native push for group messages
                    sendNotification(
                        `💬 ${groupName}`,
                        msg.body || msg.content || t('Nova mensagem no grupo', 'New message in group'),
                        { channel: 'whatsapp', focusTab: true }
                    );

                    incrementUnread();
                }
            }
        });

        return () => {
            ticketService.unsubscribeFromTickets(ticketChannel);
            ticketService.unsubscribeFromTickets(groupChannel);
            if (messagesChannel) supabase.removeChannel(messagesChannel);
            if (groupMessagesChannel) supabase.removeChannel(groupMessagesChannel);
        };
    }, [user?.organization?.id]);

    // ---- Assign ticket to current user ----
    const handleAssignTicket = useCallback(async (ticketId: string) => {
        const activeCount = ticketsRef.current.filter(t => t.assigned_to === user?.id && t.status === 'active').length;
        if (activeCount >= 5) {
            addNotification(t('Limite Atingido', 'Limit Reached'), t('Você atingiu o máximo de 5 chamados simultâneos.', 'You reached the max limit of 5 active tickets.'), 'system');
            return;
        }

        setTickets((prev) =>
            prev.map((t) =>
                t.id === ticketId
                    ? { ...t, status: 'active', assigned_to: user?.id as string }
                    : t
            )
        );
        setSelectedTicket((prev) => {
            if (!prev || prev.id !== ticketId) return prev;
            return { ...prev, status: 'active', assigned_to: user?.id || null } as TicketExtended;
        });

        if (shouldPersist(ticketId)) {
            const { error } = await ticketService.assignTicket(ticketId, user?.id as string);
            if (error) {
                console.error('Error assigning ticket in Supabase:', error);
                setTickets((prev) =>
                    prev.map((t) =>
                        t.id === ticketId
                            ? { ...t, status: 'waiting', assigned_to: null }
                            : t
                    )
                );
            }
        }
    }, [user?.id]);

    // ---- Transfer ticket to another user ----
    const handleTransfer = useCallback(async (ticketId: string, targetUserId: string) => {
        const targetUser = orgUsers.find((u) => u.id === targetUserId);
        if (!targetUser) return;

        setTickets((prev) =>
            prev.map((t) =>
                t.id === ticketId
                    ? { ...t, assigned_to: targetUserId }
                    : t
            )
        );
        setSelectedTicket((prev) =>
            prev?.id === ticketId
                ? { ...prev, assigned_to: targetUserId }
                : prev
        );
        setShowTransferModal(false);

        if (shouldPersist(ticketId)) {
            const { error } = await ticketService.transferTicket(ticketId, targetUserId);
            if (error) {
                console.error('Erro ao transferir ticket:', error);
            }
        }
    }, [orgUsers]);

    // ---- Send back to waiting queue ----
    const handleReturnToQueue = useCallback(async (ticketId: string) => {
        setTickets((prev) =>
            prev.map((t) =>
                t.id === ticketId
                    ? { ...t, status: 'waiting', assigned_to: null }
                    : t
            )
        );
        setSelectedTicket((prev) =>
            prev?.id === ticketId
                ? { ...prev, status: 'waiting', assigned_to: null }
                : prev
        );

        if (shouldPersist(ticketId)) {
            const { error } = await ticketService.returnTicketToQueue(ticketId);
            if (error) {
                console.error('Error returning ticket:', error);
            }
        }
    }, []);

    // ---- Resolve / close ticket ----
    const handleResolve = useCallback(async (ticketId: string, orderPlaced: boolean = false, postSale?: { text: string; date: string }, continuous?: { text: string; date: string }) => {
        const hasSchedule = (postSale && postSale.text.trim() !== '') || (continuous && continuous.text.trim() !== '');

        // Optimistic update: se tem agendamento, ticket vai para 'flow' visualmente
        // Se não, vai para 'resolved' e some da lista ativa
        setTickets((prev) =>
            prev.map((t) =>
                t.id === ticketId
                    ? { ...t, status: hasSchedule ? 'flow' : 'resolved' }
                    : t
            )
        );
        setSelectedTicket((prev) =>
            prev?.id === ticketId ? (hasSchedule ? { ...prev, status: 'flow' } as TicketExtended : null) : prev
        );
        setTicketToResolve(null);

        const persist = shouldPersist(ticketId);


        const ticketName = ticketToResolve?.contact?.name || 'Ticket';

        if (persist) {

            const { data, error } = await ticketService.resolveTicket(ticketId, orderPlaced);
            if (error) {
                console.error('[DEBUG] Error resolving ticket:', error);
                const errorMsg = typeof error === 'string' ? error : (error as any).message || JSON.stringify(error);
                alert(t('Erro ao salvar no banco: ', 'Error saving to database: ') + errorMsg);
            } else {

                if (orderPlaced) {
                    addNotification(t('Pedido Registrado', 'Order Registered'), t('Atendimento de ', 'Service for ') + `${ticketName}` + t(' concluído com pedido realizado! 🛒', ' completed with order placed! 🛒'), 'system');
                } else {
                    addNotification(t('Atendimento Resolvido', 'Service Resolved'), t('O atendimento de ', 'The service for ') + `${ticketName}` + t(' foi resolvido.', ' was resolved.'), 'system');
                }

                // ---- AUTO-TAGGING LOGIC (mmm-aa) ----
                if (orderPlaced && user?.organization?.id) {
                    try {
                        const tagLabel = getCurrentMonthTagLabel();
                        let targetTag = allTags.find(t => t.label.toLowerCase() === tagLabel.toLowerCase());

                        if (!targetTag) {
                            // Create the tag if it doesn't exist
                            targetTag = await api.createTag({
                                organization_id: user.organization.id,
                                label: tagLabel,
                                color: 'emerald',
                                icon: '💰'
                            });
                            // Update global tags list
                            setAllTags(prev => [...prev, targetTag as Tag]);
                        }

                        // Add to ticket tags if not already present
                        const currentTicketTags = ticketToResolve?.tags || [];
                        if (!currentTicketTags.some(t => t.label.toLowerCase() === tagLabel.toLowerCase())) {
                            const newTags = [...currentTicketTags, targetTag as Tag];
                            
                            // Update locally
                            setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, tags: newTags } : t));
                            
                            // Save to DB
                            await api.updateTicketTags(ticketId, newTags);
                        }
                    } catch (tagErr) {
                        console.error("Error in auto-tagging:", tagErr);
                    }
                }
                
                if (postSale && postSale.text.trim() !== '' && user?.organization?.id) {
                    try {
                        await ticketService.saveScheduledMessage(
                            ticketId,
                            user.organization.id,
                            user.id,
                            user.name || 'Agente',
                            postSale.text,
                            'text',
                            new Date(postSale.date).toISOString()
                        );
                        // Garantir que ticket está em 'flow' no estado local
                        setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: 'flow' } : t));
                        addNotification(t('Agendamento', 'Schedule'), t('Mensagem de pós-venda agendada!', 'Post-sale message scheduled!'), 'success');
                    } catch (e) {
                        console.error('Error scheduling post-sale:', e);
                        addNotification(t('Erro', 'Error'), t('Não foi possível agendar o pós-venda', 'Could not schedule post-sale message'), 'system');
                    }
                }

                if (continuous && continuous.text.trim() !== '' && user?.organization?.id) {
                    try {
                        await ticketService.saveScheduledMessage(
                            ticketId,
                            user.organization.id,
                            user.id,
                            user.name || 'Agente',
                            continuous.text,
                            'text',
                            new Date(continuous.date).toISOString()
                        );
                        // Garantir que ticket está em 'flow' no estado local
                        setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: 'flow' } : t));
                        addNotification(t('Agendamento', 'Schedule'), t('Lembrete de uso contínuo agendado!', 'Continuous use reminder scheduled!'), 'success');
                    } catch (e) {
                        console.error('Error scheduling continuous reminder:', e);
                        addNotification(t('Erro', 'Error'), t('Não foi possível agendar o lembrete contínuo', 'Could not schedule continuous reminder'), 'system');
                    }
                }
            }
        } else {
            addNotification(t('Simulação Concluída', 'Simulation Completed'), `${ticketName} ` + t('marcado como ', 'marked as ') + (orderPlaced ? t('pedido realizado', 'order placed') : t('resolvido', 'resolved')) + ' (Demo).', 'system');
        }
    }, [ticketToResolve, addNotification, user?.organization?.id, user?.id, allTags, t]);

    const handleSelectTicket = useCallback((ticket: TicketExtended | null) => {
        setSelectedTicket(ticket);

        if (ticket && ticket.unreadCount > 0) {
            if (ticket.isGroup) {
                setGroups((prev) =>
                    prev.map((g) => (g.id === ticket.id ? { ...g, unreadCount: 0 } : g))
                );
            } else {
                setTickets((prev) =>
                    prev.map((t) => (t.id === ticket.id ? { ...t, unreadCount: 0 } : t))
                );
            }
        }
    }, []);

    // ---- Effect to handle initialTicketId (deep-linking) ----
    useEffect(() => {
        if (!initialTicketId || !user?.organization?.id) return;

        const selectInitialTicket = async () => {
            const { data, error } = await ticketService.fetchTicketById(initialTicketId);
            if (!error && data) {
                const fullTicket: TicketExtended = {
                    id: data.id,
                    contact: {
                        ...data.contact,
                        avatar: data.contact?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.contact?.name || 'User')}&background=random`
                    } as any,
                    status: data.status,
                    assigned_to: data.assigned_to,
                    channel: data.channel,
                    lastMessage: data.last_message,
                    lastMessageTime: data.last_message_time || data.updated_at,
                    unreadCount: data.unread_count || 0,
                    tags: data.tags || [],
                    orderPlaced: data.order_placed,
                    resolvedAt: data.resolved_at,
                    createdAt: data.created_at,
                };

                setTickets(prev => prev.some(t => t.id === fullTicket.id) ? prev : [fullTicket, ...prev]);
                handleSelectTicket(fullTicket);
            }
        };

        selectInitialTicket();
    }, [initialTicketId, user?.organization?.id, handleSelectTicket]);

    const handleContactUpdate = useCallback((contactId: string, updates: Partial<Contact>) => {
        setTickets(prev => prev.map(t => t.contact.id === contactId ? { ...t, contact: { ...t.contact, ...updates } } : t));
        setGroups(prev => prev.map(g => g.contact.id === contactId ? { ...g, contact: { ...g.contact, ...updates } } : g));
        setSelectedTicket(prev => prev?.contact?.id === contactId ? { ...prev, contact: { ...prev.contact, ...updates } } : (prev as any));
    }, []);

    const handleUpdateTags = useCallback((ticketId: string, newTags: Tag[]) => {
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, tags: newTags } : t));
        setGroups(prev => prev.map(g => g.id === ticketId ? { ...g, tags: newTags } : g));
        setSelectedTicket(prev => prev?.id === ticketId ? { ...prev, tags: newTags } : (prev as any));
    }, []);

    const handleTagsRefresh = useCallback((newTags: Tag[]) => {
        setAllTags(newTags);
    }, []);

    return (
        <div className="flex-1 flex h-full overflow-hidden bg-slate-50 dark:bg-void-950 transition-colors duration-300">
            <TicketPanel
                tickets={[...tickets, ...groups]}
                selectedTicket={selectedTicket}
                onSelectTicket={handleSelectTicket}
                onAssignTicket={handleAssignTicket}
                allTags={allTags}
                onNewChat={() => setShowNewChatModal(true)}
            />
            <ChatWindow
                ticket={selectedTicket}
                orgConnections={orgConnection || undefined}
                onTransfer={() => setShowTransferModal(true)}
                onResolve={(id) => setTicketToResolve(selectedTicket)}
                onAssignTicket={handleAssignTicket}
                onReturnToQueue={handleReturnToQueue}
                onBack={() => handleSelectTicket(null)}
                showContextSidebar={showContextSidebar}
                onToggleContextSidebar={() => setShowContextSidebar(!showContextSidebar)}
                externalInputText={aiSuggestionText}
                aiSuggestions={aiSuggestions}
                onUseSuggestion={(text: string) => {
                    setAiSuggestionText(text);
                    setTimeout(() => setAiSuggestionText(null), 100);
                }}
            />
            {showContextSidebar && (
                <ContextSidebar
                    ticket={selectedTicket}
                    allTags={allTags}
                    onContactUpdate={handleContactUpdate}
                    onUpdateTags={handleUpdateTags}
                    onTagsChange={handleTagsRefresh}
                    lastIncomingMessageId={lastIncomingMsgId}
                    lastIncomingMessageTicketId={lastIncomingMsgTicketId}
                    onUseSuggestion={(text) => {
                        setAiSuggestionText(text);
                        setTimeout(() => setAiSuggestionText(null), 100);
                    }}
                    onHintChange={(hint) => {
                        const sug = hint?.suggestions?.length ? hint.suggestions : (hint?.suggestion ? [hint.suggestion] : []);
                        setAiSuggestions(sug);
                    }}
                />
            )}

            {/* Transfer Modal */}
            {showTransferModal && selectedTicket && (
                <TransferModal
                    ticket={selectedTicket}
                    tickets={[...tickets, ...groups]}
                    currentUserId={user?.id as string}
                    orgUsers={orgUsers}
                    isLoading={isUsersLoading}
                    onTransfer={handleTransfer}
                    onClose={() => setShowTransferModal(false)}
                />
            )}

            {/* Resolve Modal */}
            {ticketToResolve && (
                <ResolveModal
                    ticket={ticketToResolve}
                    organizationName={user?.organization?.name}
                    onResolve={handleResolve}
                    onClose={() => setTicketToResolve(null)}
                />
            )}

            {/* New Chat / Ticket Modal */}
            {showNewChatModal && (
                <NewTicketModal
                    orgConnections={orgConnection || []}
                    onClose={() => setShowNewChatModal(false)}
                    onTicketCreated={async (ticketId) => {
                        setShowNewChatModal(false);
                        // Fetch the full ticket from Supabase to get contact.phone populated
                        const { data } = await ticketService.fetchTicketById(ticketId);
                        if (data) {
                            const fullTicket: TicketExtended = {
                                id: data.id,
                                contact: {
                                    ...data.contact,
                                    avatar: data.contact?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.contact?.name || 'User')}&background=random`
                                } as any,
                                status: data.status,
                                assigned_to: data.assigned_to,
                                channel: data.channel,
                                lastMessage: data.last_message,
                                lastMessageTime: data.last_message_time || data.updated_at,
                                unreadCount: data.unread_count || 0,
                                tags: data.tags || [],
                                orderPlaced: data.order_placed,
                                resolvedAt: data.resolved_at,
                                createdAt: data.created_at,
                            };
                            // Add to tickets list if not already there
                            setTickets(prev => prev.some(t => t.id === fullTicket.id) ? prev : [fullTicket, ...prev]);
                            handleSelectTicket(fullTicket);
                        }
                    }}
                />
            )}

            {/* In-app notification toasts */}
            <NotificationToast
                notifications={toastNotifications}
                onDismiss={dismissNotification}
            />
        </div>
    );
}

// ---- Transfer Modal Component ----
interface TransferModalProps {
    ticket: TicketExtended;
    tickets: TicketExtended[];
    currentUserId: string;
    orgUsers: any[];
    isLoading?: boolean;
    onTransfer: (ticketId: string, targetUserId: string) => void;
    onClose: () => void;
}

function TransferModal({ ticket, tickets, currentUserId, orgUsers, isLoading, onTransfer, onClose }: TransferModalProps) {
    const { t } = useLanguage();
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const availableUsers = orgUsers.filter((u) => u.id !== currentUserId);
    const filteredUsers = availableUsers.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md rounded-4xl glass-panel shadow-3xl overflow-hidden scale-in border border-white/10 flex flex-col">
                {/* Header */}
                <div className="px-8 py-6 border-b border-white/5 shrink-0">
                    <h3 className="text-xl font-bold text-white tracking-tight uppercase">{t('Transferir Atendimento', 'Transfer Ticket')}</h3>
                    <p className="text-xs text-white/40 font-medium mt-1">
                        {t('Selecione o atendente para', 'Select the agent for')} {ticket.contact.name}
                    </p>
                </div>

                {/* Search Bar */}
                {availableUsers.length > 5 && (
                    <div className="px-6 py-4 border-b border-white/5 shrink-0">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                            <input
                                type="text"
                                placeholder={t('Buscar atendente...', 'Search agent...')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500/50 transition-all"
                                autoFocus
                            />
                        </div>
                    </div>
                )}

                {/* User List */}
                <div className="px-6 py-2 space-y-2 overflow-y-auto min-h-[200px] max-h-[350px] scrollbar-thin flex-1">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/20">{t('Carregando atendentes...', 'Loading agents...')}</p>
                        </div>
                    ) : availableUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20">
                                <UserMinus size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white uppercase tracking-tight">{t('Nenhum outro atendente', 'No other agents')}</p>
                                <p className="text-[10px] text-white/30 mt-1">{t('Você é o único atendente disponível nesta organização.', 'You are the only agent available in this organization.')}</p>
                            </div>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-white/20">
                            <Search size={24} className="mb-2 opacity-50" />
                            <p className="text-[10px] font-black uppercase tracking-widest">{t('Nenhum resultado para', 'No results for')} "{search}"</p>
                        </div>
                    ) : (
                        filteredUsers.map((u) => {
                            const isOnline = u.status === 'online';
                            const activeCount = tickets.filter(t => t.assigned_to === u.id && t.status === 'active').length;
                            const isLotado = activeCount >= 5;
                            const isBusy = u.status === 'busy' || u.status === 'ocupado';
                            const statusColorClass = isLotado ? 'bg-rose-500' : isOnline ? 'bg-emerald-500' : isBusy ? 'bg-amber-500' : 'bg-gray-500';
                            const statusText = isLotado ? t('Lotado', 'Full') : isOnline ? t('Online', 'Online') : isBusy ? t('Ocupado', 'Busy') : t('Offline', 'Offline');

                            return (
                                <button
                                    key={u.id}
                                    onClick={() => !isLotado && setSelectedUser(u.id)}
                                    disabled={isLotado}
                                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all border ${
                                        isLotado
                                            ? 'opacity-50 cursor-not-allowed bg-white/2 border-transparent hover:border-rose-500/30 hover:bg-rose-500/5'
                                            : selectedUser === u.id
                                                ? 'bg-primary-500/10 border-primary-500/30 shadow-lg cursor-pointer'
                                                : 'bg-white/3 border-transparent hover:bg-white/8 cursor-pointer'
                                        }`}
                                >
                                    <div className="relative shrink-0">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-bold ring-2 ring-white/10 shadow-md"
                                            style={{
                                                background: `hsl(${(u.name?.charCodeAt(0) || 65) * 11 % 360}, 50%, 30%)`,
                                                color: `hsl(${(u.name?.charCodeAt(0) || 65) * 11 % 360}, 80%, 75%)`
                                            }}
                                        >
                                            {u.name?.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
                                        </div>
                                        <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ring-2 ring-[#0c0c11] ${statusColorClass} shadow-lg`} title={statusText} />
                                    </div>
                                    <div className="flex-1 text-left min-w-0 flex justify-between items-center">
                                        <div>
                                            <p className="text-xs font-bold text-white uppercase tracking-tight truncate">{u.name}</p>
                                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{u.role === 'super_admin' ? '🛡️ ' + t('Administrador', 'Administrator') : '👤 ' + t('Atendente', 'Agent')}</p>
                                        </div>
                                        {isLotado ? (
                                            <span className="text-[9px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-md ml-2 shrink-0">
                                                {t('Lotado', 'Full')} (5/5)
                                            </span>
                                        ) : (
                                            <span className="text-[9px] font-bold text-white/30 tracking-wider">
                                                ({activeCount}/5)
                                            </span>
                                        )}
                                    </div>
                                    {selectedUser === u.id && !isLotado && <CheckCircle2 size={16} className="text-primary-400 shrink-0" />}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-white/5 flex items-center justify-end gap-4 bg-white/2 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-all cursor-pointer"
                    >
                        {t('Cancelar', 'Cancel')}
                    </button>
                    <button
                        onClick={() => selectedUser && onTransfer(ticket.id, selectedUser)}
                        disabled={!selectedUser}
                        className={`px-8 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all cursor-pointer shadow-xl ${selectedUser
                            ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-primary-500/25 border border-primary-400/20 active:scale-95'
                            : 'bg-white/5 text-white/10 cursor-not-allowed'
                            }`}
                    >
                        {t('Efetuar Transferência', 'Perform Transfer')}
                    </button>
                </div>
            </div>
        </div>
    );
}


// ---- Resolve Modal Component ----
interface ResolveModalProps {
    ticket: TicketExtended;
    organizationName?: string;
    onResolve: (ticketId: string, orderPlaced: boolean, postSale?: { text: string; date: string }, continuous?: { text: string; date: string }) => void;
    onClose: () => void;
}

function ResolveModal({ ticket, organizationName, onResolve, onClose }: ResolveModalProps) {
    const { t } = useLanguage();
    
    // Verificação de canal e API Oficial (igual ao ChatWindow)
    const isRestrictedChannel = ['instagram', 'messenger'].includes(ticket?.channel || '');
    const isOfficialApi = ticket?.channel === 'whatsapp' && ticket.id && !ticket.id.includes('-') && ticket.id.length > 20; // Heurística simples ou passar flag via props
    
    // Na verdade, o ResolveModal pode receber a flag via props ou calcular baseado no ticket
    // Para ser mais preciso, vamos usar o ticket.channel e considerar que se for API Oficial, as mensagens agendadas via n8n/supabase podem ter limitações de janela
    const canSchedule = !isRestrictedChannel && (ticket?.channel === 'whatsapp') && !ticket?.isGroup;

    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    const tzOffset = defaultDate.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(defaultDate.getTime() - tzOffset)).toISOString().slice(0, 16);

    const contactName = ticket?.contact?.name?.split(' ')[0] || t('Cliente', 'Customer');
    const farmaciaNome = organizationName || t('Farmácia', 'Pharmacy');
    
    const defaultMessage = t(
        `Olá, ${contactName}! 😊 Tudo bem? Aqui é da ${farmaciaNome}. Passando pra saber se o medicamento que você levou está te ajudando. Já sentiu alguma melhora? Se precisar de algo, estou por aqui! 💊💙`,
        `Hello, ${contactName}! 😊 How are you? This is from ${farmaciaNome}. Just checking in to see if the medication you took is helping. Any improvement yet? If you need anything, I'm here! 💊💙`
    );

    const default28Date = new Date();
    default28Date.setDate(default28Date.getDate() + 28);
    const localISOTime28 = (new Date(default28Date.getTime() - tzOffset)).toISOString().slice(0, 16);

    const defaultContinuousMessage = t(
        `Olá, ${contactName}! 😊 Tudo bem? Aqui é da ${farmaciaNome}. Nosso sistema de saúde registrou que seu medicamento de uso contínuo pode estar chegando ao fim. Vamos já adiantar o seu pedido para não interromper seu tratamento? Estou por aqui! 💊💙`,
        `Hello, ${contactName}! 😊 How are you? This is from ${farmaciaNome}. Our health system noticed that your continuous medication might be running low. Shall we prepare your next order to ensure your treatment isn't interrupted? I'm here! 💊💙`
    );

    const [schedulePostSale, setSchedulePostSale] = useState(false);
    const [postSaleMessage, setPostSaleMessage] = useState(defaultMessage);
    const [postSaleDate, setPostSaleDate] = useState(localISOTime);

    const [scheduleContinuous, setScheduleContinuous] = useState(false);
    const [continuousMessage, setContinuousMessage] = useState(defaultContinuousMessage);
    const [continuousDate, setContinuousDate] = useState(localISOTime28);

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-sm rounded-4xl glass-panel shadow-3xl overflow-hidden scale-in border border-white/10 flex flex-col">
                <div data-tour="resolve-modal-header" className="px-8 py-6 border-b border-white/5 bg-white/2">
                    <h3 className="text-xl font-bold text-white tracking-tight uppercase">{t('Análise de Atendimento', 'Care Analysis')}</h3>
                    <p className="text-[11px] text-white/50 font-medium mt-1 uppercase tracking-widest">
                        {t('Ao finalizar o atendimento de', 'When finishing care for')} {ticket.contact.name}
                    </p>
                </div>

                <div className="px-8 py-5 flex flex-col items-center justify-center text-center">
                    <div data-tour="resolve-conversion-icon" className="w-16 h-16 rounded-full bg-primary-500/10 text-primary-400 flex items-center justify-center mb-4 border border-primary-500/20 shadow-lg shadow-primary-500/5">
                        <ShoppingBag size={32} />
                    </div>
                    <p className="text-sm font-bold text-white mb-2 uppercase tracking-wide">{t('O pedido foi concluído?', 'Was the order completed?')}</p>
                    <p className="text-[10px] text-white/40 max-w-[200px] leading-relaxed">
                        {t('Esta métrica ajuda a compor as estatísticas de conversão no dashboard.', 'This metric helps build conversion statistics in the dashboard.')}
                    </p>
                </div>
                
                <div className="px-8 pb-5 flex flex-col items-stretch text-left border-b border-white/5">
                    {canSchedule && (
                        <label data-tour="resolve-post-sale-section" className="flex items-center gap-2 mb-2 text-xs font-bold text-white uppercase tracking-wide cursor-pointer transition-all hover:text-primary-400 w-fit">
                            <input 
                                type="checkbox" 
                                checked={schedulePostSale} 
                                onChange={(e) => setSchedulePostSale(e.target.checked)}
                                className="w-4 h-4 rounded bg-white/5 border-white/20 text-primary-500 focus:ring-primary-500/20 cursor-pointer"
                            />
                            <span>{t('Agendar Pós-venda (3 dias)', 'Schedule Post-sale (3 days)')}</span>
                        </label>
                    )}
                    
                    {canSchedule && schedulePostSale && (
                        <div className="flex flex-col gap-3 mt-3 animate-in fade-in slide-in-from-top-2">
                            <div>
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <MessageSquareMore size={12} />
                                    {t('Mensagem', 'Message')}
                                </label>
                                <textarea 
                                    value={postSaleMessage}
                                    onChange={(e) => setPostSaleMessage(e.target.value)}
                                    placeholder={t('Sua mensagem de pós-venda aqui...', 'Your post-sale message here...')}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500/50 transition-all min-h-[90px] resize-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <CalendarClock size={12} />
                                    {t('Data e Hora do Envio', 'Date and Time to Send')}
                                </label>
                                <input 
                                    type="datetime-local" 
                                    value={postSaleDate}
                                    onChange={(e) => setPostSaleDate(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500/50 transition-all"
                                />
                            </div>
                        </div>
                    )}

                    <div data-tour="resolve-continuous-section" className="mt-4 border-t border-white/5 pt-4">
                        {canSchedule && (
                            <label className="flex items-center gap-2 mb-2 text-xs font-bold text-white uppercase tracking-wide cursor-pointer transition-all hover:text-primary-400 w-fit">
                                <input 
                                    type="checkbox" 
                                    checked={scheduleContinuous} 
                                    onChange={(e) => setScheduleContinuous(e.target.checked)}
                                    className="w-4 h-4 rounded bg-white/5 border-white/20 text-primary-500 focus:ring-primary-500/20 cursor-pointer"
                                />
                                <span>{t('Uso Contínuo (28 dias)', 'Continuous Use (28 days)')}</span>
                            </label>
                        )}
                        
                        {canSchedule && scheduleContinuous && (
                            <div className="flex flex-col gap-3 mt-3 animate-in fade-in slide-in-from-top-2">
                                <div>
                                    <label className="flex text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1 items-center gap-1">
                                        <MessageSquareMore size={12} />
                                        {t('Mensagem', 'Message')}
                                    </label>
                                    <textarea 
                                        value={continuousMessage}
                                        onChange={(e) => setContinuousMessage(e.target.value)}
                                        placeholder={t('Sua mensagem de uso contínuo aqui...', 'Your continuous use message here...')}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500/50 transition-all min-h-[90px] resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="flex text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1 items-center gap-1">
                                        <CalendarClock size={12} />
                                        {t('Data e Hora do Envio', 'Date and Time to Send')}
                                    </label>
                                    <input 
                                        type="datetime-local" 
                                        value={continuousDate}
                                        onChange={(e) => setContinuousDate(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500/50 transition-all"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-4 py-4 border-t-0 flex gap-3 bg-white/5">
                    <button
                        onClick={() => onResolve(ticket.id, false, schedulePostSale ? { text: postSaleMessage, date: postSaleDate } : undefined, scheduleContinuous ? { text: continuousMessage, date: continuousDate } : undefined)}
                        className="flex-1 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-rose-400 hover:text-white hover:bg-rose-500 transition-all cursor-pointer border border-rose-500/20"
                    >
                        {t('Não foi Feito', 'Not Done')}
                    </button>
                    <button
                        onClick={() => onResolve(ticket.id, true, schedulePostSale ? { text: postSaleMessage, date: postSaleDate } : undefined, scheduleContinuous ? { text: continuousMessage, date: continuousDate } : undefined)}
                        className="flex-1 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-white hover:bg-emerald-500 transition-all cursor-pointer border border-emerald-500/20 shadow-lg"
                    >
                        {t('Sim, Pedido Feito', 'Yes, Order Placed')}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-3 py-3 rounded-xl text-white/40 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                        title={t('Cancelar', 'Cancel')}
                    >
                        <XCircle size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
