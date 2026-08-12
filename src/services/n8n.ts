import { supabase } from './supabase';

const N8N_BASE_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.expervivenciafarma.com.br/webhook';
const N8N_KEY = import.meta.env.VITE_N8N_WEBHOOK_KEY || '9A7E3C1B2A5D4F6E8B9C0D1E2A3F4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1';

async function n8nFetch(endpoint: string, payload: any) {
    const url = `${N8N_BASE_URL}${endpoint}`;

    // Tenta pegar o usuário e a sessão atual de forma segura
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (authError || !user || !session) {
        console.error('Erro de autenticação ao chamar n8n:', authError);
        throw new Error('Sessão expirada. Por favor, recarregue a página e faça login novamente.');
    }

    const token = session.access_token;

    const headers: Record<string, string> = { 
        'Content-Type': 'application/json',
        'apikey': N8N_KEY
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Injeta metadados de infraestrutura para o n8n ser dinâmico
    const fullPayload = {
        ...payload,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
    };

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(fullPayload),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`n8n webhook error: ${error}`);
    }

    return { success: true };
}

export async function scheduleMessage(payload: any) {
    return n8nFetch('/schedule-message', {
        contactPhone: payload.contactPhone,
        contactName: payload.contactName,
        message: payload.message,
        scheduledFor: payload.scheduledFor,
        instanceName: payload.instanceName,
        organizationId: payload.organizationId,
        userId: payload.userId,
    });
}

export async function cancelSchedule(scheduleId: string | number) {
    return n8nFetch('/cancel-schedule', {
        scheduleId,
    });
}

export async function sendMessageViaN8N(payload: any) {
    let endpoint = '/send-message';
    if (payload.method === 'meta_api') {
        endpoint = payload.channel === 'whatsapp' ? '/whatsapp_official' : '/meta-send-message';
    }

    return n8nFetch(endpoint, {
        ticketId: payload.ticketId,
        contactPhone: payload.contactPhone,
        message: payload.message,
        type: payload.type || 'text',
        mediaUrl: payload.mediaUrl,
        instanceName: payload.instanceName,
        organizationId: payload.organizationId,
        agentId: payload.agentId,
        agentName: payload.agentName,
        method: payload.method || 'evolution',
        quotedMsgId: payload.quotedMsgId,
        connectionId: payload.connectionId,
        scheduledAt: payload.scheduledAt || null,
        tag: payload.tag || null,
    });
}

export async function sendTemplate(payload: any) {
    return n8nFetch('/whatsapp-template', {
        connectionId: payload.connectionId,
        contactPhone: payload.contactPhone,
        templateName: payload.templateName,
        languageCode: payload.languageCode || 'pt_BR',
        variables: payload.variables || [],
        ticketId: payload.ticketId,
        organizationId: payload.organizationId,
        agentId: payload.agentId,
        agentName: payload.agentName,
    });
}

export async function startAutomation(payload: any) {
    return n8nFetch('/start-automation', {
        flowId: payload.flowId,
        contactPhone: payload.contactPhone,
        contactName: payload.contactName,
        instanceName: payload.instanceName,
        organizationId: payload.organizationId,
        variables: payload.variables || {},
    });
}

export async function stopAutomation(executionId: string | number) {
    return n8nFetch('/stop-automation', {
        executionId,
    });
}

export async function startCampaign(payload: any) {
    return n8nFetch('/start-campaign', {
        campaignId: payload.campaignId,
        message: payload.message,
        contacts: payload.contacts,
        instanceName: payload.instanceName,
        organizationId: payload.organizationId,
        delayBetweenMessages: payload.delay || 5000,
    });
}

export async function importContactsViaN8N(payload: any) {
    return n8nFetch('/import-contacts', {
        contacts: payload.contacts,
        organizationId: payload.organizationId,
        userId: payload.userId,
    });
}

export async function triggerAiCopilot(payload: {
    ticketId: string;
    organizationId: string;
    contactId?: string;
}) {
    return n8nFetch('/ai-copilot', {
        ticketId: payload.ticketId,
        organizationId: payload.organizationId,
        contactId: payload.contactId || null,
    });
}

export async function stopCampaign(campaignId: string | number) {
    return n8nFetch('/stop-campaign', {
        campaignId,
    });
}

export async function healthCheck() {
    try {
        await n8nFetch('/health', {});
        return true;
    } catch {
        return false;
    }
}
