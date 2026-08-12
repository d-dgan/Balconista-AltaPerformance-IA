import { supabase } from './supabase';



export interface Contact {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    avatar_url?: string;
    channel?: string;
    notes?: string;
    messenger_id?: string;
    instagram_id?: string;
    address?: string;
    tags?: any[];
    lastSeen?: string;
    created_at?: string;
}

export interface Ticket {
    id: string;
    status: string;
    channel: string;
    assigned_to?: string | null;
    connection_id: string;
    last_message?: string;
    last_message_time?: string;
    unread_count?: number;
    tags?: any[];
    created_at: string;
    updated_at: string;
    contact?: Contact;
}

export interface Message {
    id: string;
    ticket_id: string;
    sender: 'agent' | 'contact' | 'system';
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker';
    content: string;
    caption?: string;
    media_url?: string;
    media_mime_type?: string;
    created_at: string;
}

export interface Tag {
    id: string;
    label: string;
    color: string;
    icon?: string;
    organization_id: string;
}

// ==========================================
// TICKETS
// ==========================================
export async function fetchTickets(orgId: string | number, filters: any = {}) {
    let query = supabase
        .from('tickets')
        .select('id, status, channel, assigned_to, connection_id, last_message, last_message_time, unread_count, tags, created_at, updated_at, contact:contacts(id, name, phone, avatar_url, messenger_id, instagram_id, address)')
        .eq('organization_id', orgId)
        .order('last_message_time', { ascending: false })
        .limit(200);

    if (filters.status) query = (query as any).eq('status', filters.status);
    if (filters.assigned_to) query = (query as any).eq('assigned_to', filters.assigned_to);
    if (filters.assigned_to === null) query = (query as any).is('assigned_to', null);

    const { data, error } = await query;
    if (error) throw error;

    // Suporte para junção que retorna array
    return (data as any[]).map(ticket => ({
        ...ticket,
        contact: Array.isArray(ticket.contact) ? ticket.contact[0] : ticket.contact
    })) as Ticket[];
}

export async function assignTicket(ticketId: string | number, userId: string | number) {
    const { data, error } = await supabase
        .from('tickets')
        .update({ assigned_to: userId, status: 'active' })
        .eq('id', ticketId)
        .select()
        .single();

    if (error) throw error;
    return data as Ticket;
}

export async function resolveTicket(ticketId: string | number) {
    const { data, error } = await supabase
        .from('tickets')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', ticketId)
        .select()
        .single();

    if (error) throw error;
    return data as Ticket;
}

export async function transferTicket(ticketId: string | number, toUserId: string | number) {
    const { data, error } = await supabase
        .from('tickets')
        .update({ assigned_to: toUserId })
        .eq('id', ticketId)
        .select()
        .single();

    if (error) throw error;
    return data as Ticket;
}

// ==========================================
// MESSAGES
// ==========================================
export async function fetchMessages(ticketId: string | number) {
    const { data, error } = await supabase
        .from('messages')
        .select('id, ticket_id, sender, type, content, caption, media_url, media_mime_type, created_at')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) throw error;
    return (data as Message[] || []).reverse();
}

export async function sendMessage(ticketId: string | number, content: string, type: string = 'text') {
    const { data, error } = await supabase
        .from('messages')
        .insert({ ticket_id: ticketId, content, type, sender: 'agent' })
        .select()
        .single();

    if (error) throw error;
    return data as Message;
}

// ==========================================
// TAGS
// ==========================================
export async function fetchTags(orgId: string | number) {
    const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('organization_id', orgId)
        .order('label');

    if (error) throw error;
    return data as Tag[];
}

export async function createTag(tagData: any) {
    const { data, error } = await supabase
        .from('tags')
        .insert(tagData)
        .select()
        .single();

    if (error) throw error;
    return data as Tag;
}

export async function deleteTag(tagId: string | number) {
    const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId);

    if (error) throw error;
}

// ==========================================
// CONTACTS
// ==========================================
export async function fetchContacts(
    orgId: string | number,
    page: number = 0,
    pageSize: number = 16,
    search: string = '',
    channel: string = 'all'
) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
        .from('contacts')
        .select('id, name, phone, email, avatar_url, channel, notes, messenger_id, instagram_id, address, created_at')
        .eq('organization_id', orgId)
        .order('name', { ascending: true })
        .range(from, to);

    if (channel !== 'all') {
        query = query.eq('channel', channel);
    }

    if (search) {
        // Normaliza a busca: remove espaços extras e substitui espaços por % para evitar problemas na URL e no PostgREST
        const cleanSearch = search.trim().replace(/\s+/g, '%');
        const term = `%${cleanSearch}%`;
        query = query.or(`name.ilike.${term},phone.ilike.${term},email.ilike.${term},instagram_id.ilike.${term},messenger_id.ilike.${term}`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as Contact[];
}

export async function createContact(orgId: string | number, contactData: any) {
    const { data, error } = await supabase
        .from('contacts')
        .insert({
            organization_id: orgId,
            name: contactData.name,
            phone: contactData.phone || '',
            email: contactData.email || '',
            notes: contactData.notes || '',
            instagram_id: contactData.instagram_id || '',
            messenger_id: contactData.messenger_id || '',
            channel: contactData.channel || 'whatsapp',
        })
        .select()
        .single();

    if (error) throw error;
    return data as Contact;
}

export async function importContacts(orgId: string | number, contactsData: any[]) {
    const formatted = contactsData.map((c) => {
        let channel = 'whatsapp';
        if (c.Instagram && !c.WhatsApp) channel = 'instagram';
        else if (c.MessengerID && !c.WhatsApp) channel = 'messenger';

        return {
            organization_id: orgId,
            name: c.Nome,
            country_code: c.DDI || '',
            area_code: c.DDD || '',
            phone: c.WhatsApp || '',
            instagram_id: c.Instagram || '',
            messenger_id: c.MessengerID || '',
            channel,
        };
    });

    const { data, error } = await supabase
        .from('contacts')
        .upsert(formatted, { onConflict: 'phone,organization_id' })
        .select();

    if (error) throw error;
    return data as Contact[];
}

export async function updateContact(contactId: string | number, updates: any) {
    const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', contactId)
        .select()
        .single();

    if (error) throw error;
    return data as Contact;
}

export async function deleteContact(contactId: string | number) {
    const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

    if (error) throw error;
}

// ==========================================
// USERS
// ==========================================
export async function fetchOrgUsers(orgId: string | number) {
    const { data, error } = await supabase
        .from('users')
        .select('id, name, role, email, avatar_url, status, organization_id')
        .eq('organization_id', orgId)
        .order('name');

    if (error) throw error;
    return data;
}

export async function createOrgUser(userData: any) {
    const { data, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteOrgUser(userId: string | number) {
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

    if (error) throw error;
}

// ==========================================
// CONNECTIONS
// ==========================================
export async function fetchConnections(orgId: string | number) {
    const { data, error } = await supabase
        .from('connections')
        .select('*')
        .eq('organization_id', orgId);

    if (error) throw error;
    return data;
}

export async function setDefaultConnection(connectionId: string | number, orgId: string | number) {
    await supabase
        .from('connections')
        .update({ is_default: false })
        .eq('organization_id', orgId);

    const { data, error } = await supabase
        .from('connections')
        .update({ is_default: true })
        .eq('id', connectionId)
        .select()
        .single();

    if (error) throw error;
    return data;
}



// ==========================================
// ORGANIZATION PLAN
// ==========================================
export async function checkPlanLimits(orgId: string | number) {
    const { data, error } = await supabase
        .from('organizations')
        .select('plan, max_users, current_users')
        .eq('id', orgId)
        .single();

    if (error) throw error;
    const orgData = data as any;
    return {
        ...orgData,
        canCreateUser: orgData.current_users < orgData.max_users,
    };
}

// ==========================================
// WHATSAPP CLOUD API (Official)
// ==========================================
const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

export async function sendWhatsAppMessage(phoneNumberId: string, accessToken: string, to: string, text: string) {
    const response = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'text',
            text: { preview_url: false, body: text },
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to send WhatsApp message');
    }

    return response.json();
}

export async function verifyWhatsAppToken(phoneNumberId: string, accessToken: string) {
    const response = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Invalid token or Phone Number ID');
    }

    return response.json();
}

export async function getWhatsAppTemplates(wabaId: string, accessToken: string) {
    const response = await fetch(
        `${GRAPH_API_BASE}/${wabaId}/message_templates?status=APPROVED&limit=50&fields=name,language,status,category,components`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch templates');
    }

    return response.json();
}

export async function getWhatsAppPhoneInfo(businessAccountId: string, accessToken: string) {
    const response = await fetch(
        `${GRAPH_API_BASE}/${businessAccountId}/phone_numbers`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch phone numbers');
    }

    return response.json();
}

export async function sendWhatsAppTemplate(phoneNumberId: string, accessToken: string, to: string, templateName: string, languageCode: string = 'pt_BR', components: any[] = []) {
    const response = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'template',
            template: {
                name: templateName,
                language: { code: languageCode },
                components,
            },
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to send template message');
    }

    return response.json();
}

export async function uploadWhatsAppMedia(phoneNumberId: string, accessToken: string, file: File) {
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('file', file);
    formData.append('type', file.type);

    const response = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/media`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to upload media');
    }

    return response.json();
}

// ==========================================
// WHATSAPP API CONNECTION MANAGEMENT
// ==========================================
export async function saveConnection(orgId: string | number, connectionData: any) {
    const { data, error } = await supabase
        .from('connections')
        .insert({
            organization_id: orgId,
            type: connectionData.type,
            name: connectionData.name,
            method: connectionData.method,
            phone_number_id: connectionData.phoneNumberId,
            business_account_id: connectionData.businessAccountId,
            access_token: connectionData.accessToken,
            webhook_verify_token: connectionData.webhookVerifyToken,
            webhook_url: connectionData.webhookUrl,
            api_base_url: connectionData.apiBaseUrl,
            status: 'disconnected',
            is_default: false,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateConnectionStatus(connectionId: string | number, status: string) {
    const { data, error } = await supabase
        .from('connections')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', connectionId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteConnection(connectionId: string | number) {
    const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId);

    if (error) throw error;
}

export async function updateTicketTags(ticketId: string | number, tags: any[]) {
    const { data, error } = await supabase
        .from('tickets')
        .update({ tags, updated_at: new Date().toISOString() })
        .eq('id', ticketId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ==========================================
// INTERNAL NOTES (Paciente/Prontuário)
// ==========================================
export async function fetchInternalNotes(contactId: string | number) {
    const { data, error } = await supabase
        .from('internal_notes')
        .select(`
            id,
            content,
            created_at,
            user:users(name)
        `)
        .eq('contact_id', contactId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
}

export async function createInternalNote(noteData: { 
    contact_id: string; 
    organization_id: string; 
    user_id: string; 
    content: string 
}) {
    const { data, error } = await supabase
        .from('internal_notes')
        .insert(noteData)
        .select(`
            id,
            content,
            created_at,
            user:users(name)
        `)
        .single();

    if (error) throw error;
    return data;
}
