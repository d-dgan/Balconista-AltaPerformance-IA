import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Ticket {
    id: string;
    status: string;
    channel: string;
    assigned_to?: string | null;
    connection_id: string;
    last_message?: string;
    last_message_time?: string;
    unread_count?: number;
    order_placed?: boolean;
    resolved_at?: string | null;
    created_at: string;
    updated_at: string;
    tags?: any[];
    contact?: {
        id: string;
        name: string;
        phone: string;
        avatar_url?: string;
        messenger_id?: string;
        instagram_id?: string;
    };
    organization_id?: string;
}

export interface WhatsAppGroup {
    id: string;
    name: string;
    group_jid: string;
    last_message?: string;
    last_message_time?: string;
    unread_count?: number;
    created_at: string;
}

const isSupabaseConfigured = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    return url && url !== 'https://your-project.supabase.co' && !url.includes('your-project');
};

// ==========================================
// FETCH TICKETS
// ==========================================

export async function fetchTickets(organizationId: string | number) {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    const { data, error } = await supabase
        .from('tickets')
        .select(`
            id, status, channel, assigned_to, connection_id, last_message, last_message_time, unread_count, created_at, updated_at, tags, order_placed, resolved_at,
            contact:contacts(id, name, phone, avatar_url, messenger_id, instagram_id, address)
        `)
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false })
        .limit(200);

    return { data: data as Ticket[] | null, error };
}

export async function fetchTicketById(ticketId: string | number) {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    const { data, error } = await supabase
        .from('tickets')
        .select(`
            id, status, channel, assigned_to, connection_id, last_message, last_message_time, unread_count, tags, created_at, updated_at, organization_id, order_placed, resolved_at,
            contact:contacts(id, name, phone, avatar_url, messenger_id, instagram_id, address)
        `)
        .eq('id', ticketId)
        .single();

    return { data: data as Ticket | null, error };
}

// ==========================================
// FETCH WHATSAPP GROUPS
// ==========================================

export async function fetchWhatsAppGroups(organizationId: string | number) {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    const { data, error } = await supabase
        .from('whatsapp_groups')
        .select('id, name, group_jid, last_message, last_message_time, unread_count, created_at')
        .eq('organization_id', organizationId)
        .order('last_message_time', { ascending: false })
        .limit(100);

    return { data: data as WhatsAppGroup[] | null, error };
}

// ==========================================
// ATRIBUIÇÃO (ASSIGN)
// ==========================================

export async function assignTicket(ticketId: string | number, userId: string | number) {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    const { data, error } = await supabase
        .from('tickets')
        .update({
            status: 'active',
            assigned_to: userId,
            updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId)
        .select()
        .single();

    return { data: data as Ticket | null, error };
}

// ==========================================
// TRANSFERÊNCIA
// ==========================================

export async function transferTicket(ticketId: string | number, targetUserId: string | number) {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    const { data, error } = await supabase
        .from('tickets')
        .update({
            assigned_to: targetUserId,
            updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId)
        .select()
        .single();

    return { data: data as Ticket | null, error };
}

// ==========================================
// DEVOLVER À FILA
// ==========================================

export async function returnTicketToQueue(ticketId: string | number) {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    const { data, error } = await supabase
        .from('tickets')
        .update({
            status: 'waiting',
            assigned_to: null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId)
        .select()
        .single();

    return { data: data as Ticket | null, error };
}

// ==========================================
// RESOLVER / FECHAR
// ==========================================

export async function resolveTicket(ticketId: string | number, orderPlaced: boolean = false) {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    const { data, error } = await supabase
        .from('tickets')
        .update({
            status: 'resolved',
            order_placed: orderPlaced,
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId)
        .select()
        .single();

    return { data: data as Ticket | null, error };
}

export async function reopenTicket(ticketId: string | number, userId: string | number) {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    const { data, error } = await supabase
        .from('tickets')
        .update({
            status: 'active',
            assigned_to: userId,
            resolved_at: null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId)
        .select()
        .single();

    return { data: data as Ticket | null, error };
}

// ==========================================
// REALTIME SUBSCRIPTIONS
// ==========================================

export function subscribeToTicketChanges(organizationId: string | number, callback: (payload: any) => void): RealtimeChannel | null {
    if (!isSupabaseConfigured()) return null;

    return supabase
        .channel(`tickets_realtime_${organizationId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'tickets',
                filter: `organization_id=eq.${organizationId}`,
            },
            (payload) => callback(payload)
        )
        .subscribe();
}

export function unsubscribeFromTickets(channel: RealtimeChannel | null) {
    if (channel) {
        supabase.removeChannel(channel);
    }
}

export function subscribeToAllOrgMessages(organizationId: string | number, callback: (payload: any) => void): RealtimeChannel | null {
    if (!isSupabaseConfigured()) return null;
    return supabase
        .channel(`all_messages_realtime_${organizationId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `organization_id=eq.${organizationId}`,
            },
            (payload) => callback(payload)
        )
        .subscribe();
}

export function subscribeToAllOrgGroupMessages(organizationId: string | number, callback: (payload: any) => void): RealtimeChannel | null {
    if (!isSupabaseConfigured()) return null;
    return supabase
        .channel(`all_group_messages_realtime_${organizationId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'whatsapp_group_messages' },
            (payload) => callback(payload)
        )
        .subscribe();
}

export function subscribeToWhatsAppGroups(organizationId: string | number, callback: (payload: any) => void): RealtimeChannel | null {
    if (!isSupabaseConfigured()) return null;

    return supabase
        .channel(`whatsapp_groups_realtime_${organizationId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'whatsapp_groups',
                filter: `organization_id=eq.${organizationId}`,
            },
            (payload) => callback(payload)
        )
        .subscribe();
}

// ==========================================
// MENSAGENS E ATENDIMENTOS
// ==========================================

export async function fetchMessagesByContact(contactId: string | number) {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    const { data, error } = await supabase
        .from('messages')
        .select('*, tickets!inner(contact_id)')
        .eq('tickets.contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(20);

    const sortedData = data ? [...data].reverse() : data;
    return { data: sortedData, error };
}

export async function fetchMessages(ticketId: string | number) {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    const { data, error } = await supabase
        .from('messages')
        .select('id, ticket_id, from_me, sender, sender_id, sender_name, type, content, caption, media_url, media_mime_type, is_read, external_id, reply_to, created_at, quoted_msg_content, quoted_msg_author')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false })
        .limit(20);

    const sortedData = data ? [...data].reverse() : data;
    return { data: sortedData, error };
}

export async function fetchMessagesBefore(ticketId: string | number, beforeTimestamp: string) {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    const { data, error } = await supabase
        .from('messages')
        .select('id, ticket_id, sender, sender_id, sender_name, type, content, caption, media_url, media_mime_type, is_read, external_id, reply_to, created_at')
        .eq('ticket_id', ticketId)
        .lt('created_at', beforeTimestamp)
        .order('created_at', { ascending: false })
        .limit(30);

    const sortedData = data ? [...data].reverse() : data;
    return { data: sortedData, error };
}

export async function fetchMessagesBeforeByContact(contactId: string | number, beforeTimestamp: string) {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    const { data, error } = await supabase
        .from('messages')
        .select('*, tickets!inner(contact_id)')
        .eq('tickets.contact_id', contactId)
        .lt('created_at', beforeTimestamp)
        .order('created_at', { ascending: false })
        .limit(30);

    const sortedData = data ? [...data].reverse() : data;
    return { data: sortedData, error };
}

export async function fetchGroupMessagesBefore(groupId: string | number, beforeTimestamp: string) {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    const { data, error } = await supabase
        .from('whatsapp_group_messages')
        .select('id, group_id, sender_name, sender_jid, type, content, caption, media_url, media_mime_type, from_me, external_id, reply_to, created_at')
        .eq('group_id', groupId)
        .lt('created_at', beforeTimestamp)
        .order('created_at', { ascending: false })
        .limit(30);

    const sortedData = data ? [...data].reverse() : data;
    return { data: sortedData, error };
}

export async function markTicketAsRead(ticketId: string | number, isGroup: boolean = false) {
    if (!isSupabaseConfigured()) return;

    if (isGroup) {
        await supabase
            .from('whatsapp_groups')
            .update({ unread_count: 0 })
            .eq('id', ticketId);
    } else {
        await Promise.all([
            supabase
                .from('messages')
                .update({ is_read: true })
                .eq('ticket_id', ticketId)
                .eq('is_read', false)
                .eq('sender', 'contact'),
            supabase
                .from('tickets')
                .update({ unread_count: 0 })
                .eq('id', ticketId),
        ]);
    }
}

export async function saveAgentMessage(ticketId: string | number, userId: string | number, content: string, type: string = 'text') {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    const { error } = await supabase
        .from('messages')
        .insert({
            ticket_id: ticketId,
            sender: 'agent',
            sender_id: userId,
            type,
            content,
            created_at: new Date().toISOString(),
        });

    // Note: no .select() — no SELECT RLS policy for authenticated users on messages
    const data = null;

    if (!error) {
        await supabase
            .from('tickets')
            .update({
                last_message: content,
                last_message_time: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', ticketId);
    }

    return { data, error };
}

export async function saveScheduledMessage(
    ticketId: string | number,
    organizationId: string | number,
    userId: string | number,
    userName: string,
    content: string,
    type: string = 'text',
    scheduledAt: string,
    mediaUrl?: string | null,
    replyTo?: string | null
) {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    const { error } = await supabase
        .from('messages')
        .insert({
            ticket_id: ticketId,
            organization_id: organizationId,
            sender: 'agent',
            sender_id: userId,
            sender_name: userName,
            type,
            content,
            media_url: mediaUrl,
            reply_to: replyTo,
            status: 'pending',
            scheduled_at: scheduledAt,
            created_at: new Date().toISOString(),
        });

    if (!error) {
        await supabase
            .from('tickets')
            .update({
                status: 'flow',
                updated_at: new Date().toISOString(),
            })
            .eq('id', ticketId);
    }

    return { data: null, error };
}

export async function deleteScheduledMessage(msgId: string | number) {
    if (!isSupabaseConfigured()) return;

    // We only delete if it's pending to be safe
    const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', msgId)
        .eq('status', 'pending');

    if (error) throw error;
}

export function subscribeToMessages(ticketId: string | number, callback: (payload: any) => void): RealtimeChannel | null {
    if (!isSupabaseConfigured()) return null;

    return supabase
        .channel(`messages_realtime_${ticketId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `ticket_id=eq.${ticketId}`,
            },
            (payload) => callback(payload)
        )
        .subscribe();
}

export async function fetchGroupMessages(groupId: string | number) {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    const { data, error } = await supabase
        .from('whatsapp_group_messages')
        .select('id, group_id, sender_name, sender_jid, type, content, caption, media_url, media_mime_type, from_me, external_id, reply_to, created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(20);

    const sortedData = data ? [...data].reverse() : data;
    return { data: sortedData, error };
}

export function subscribeToGroupMessages(groupId: string | number, callback: (payload: any) => void): RealtimeChannel | null {
    if (!isSupabaseConfigured()) return null;

    return supabase
        .channel(`group_messages_realtime_${groupId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'whatsapp_group_messages',
                filter: `group_id=eq.${groupId}`,
            },
            (payload) => callback(payload)
        )
        .subscribe();
}

export async function saveGroupMessage(groupId: string | number, organizationId: string | number, agentName: string, agentId: string, content: string, type: string = 'text') {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    const { data, error } = await supabase
        .from('whatsapp_group_messages')
        .insert({
            group_id: groupId,
            sender_name: agentName,
            sender_jid: agentId,
            type,
            content,
            created_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (!error) {
        await supabase
            .from('whatsapp_groups')
            .update({
                last_message: content,
                last_message_time: new Date().toISOString(),
            })
            .eq('id', groupId);
    }

    return { data, error };
}

// ==========================================
// UPLOAD DE MÍDIA
// ==========================================

export async function uploadMedia(file: File | Blob) {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    let fileExt = '';
    const fileNameAttr = (file as any).name;
    if (fileNameAttr && fileNameAttr.includes('.')) {
        fileExt = fileNameAttr.split('.').pop() || '';
    } else {
        fileExt = file.type.split('/')[1] || 'bin';
        if (fileExt.includes('webm')) fileExt = 'webm';
        else if (fileExt.includes('ogg')) fileExt = 'ogg';
    }

    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { data, error } = await supabase.storage
        .from('chat_media')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) return { data: null, error };

    const { data: publicURLData } = supabase.storage
        .from('chat_media')
        .getPublicUrl(filePath);

    return { data: { url: publicURLData.publicUrl }, error: null };
}

// ==========================================
// RESPOSTAS RÁPIDAS (QUICK REPLIES)
// ==========================================

export async function fetchQuickReplies(organizationId: string | number) {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    const { data, error } = await supabase
        .from('quick_replies')
        .select('*')
        .eq('organization_id', organizationId)
        .order('shortcut', { ascending: true });

    return { data, error };
}

export async function createQuickReply(organizationId: string | number, shortcut: string, text: string) {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    const { data, error } = await supabase
        .from('quick_replies')
        .insert({
            organization_id: organizationId,
            shortcut,
            text,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    return { data, error };
}

export async function updateQuickReply(id: string, shortcut: string, text: string) {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    const { data, error } = await supabase
        .from('quick_replies')
        .update({
            shortcut,
            text,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    return { data, error };
}

export async function deleteQuickReply(id: string) {
    if (!isSupabaseConfigured()) return { data: null, error: 'demo-mode' };

    const { data, error } = await supabase
        .from('quick_replies')
        .delete()
        .eq('id', id);

    return { data, error };
}
