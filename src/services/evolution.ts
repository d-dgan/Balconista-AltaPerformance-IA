import { supabase } from './supabase';

async function evolutionFetch(endpoint: string, options: any = {}) {
    const { method = 'POST', body, ...restOptions } = options;
    
    // Roteia a solicitação para a Edge Function segura no Supabase
    // A Edge Function terá as chaves de API secretas (EVOLUTION_API_KEY) e validará se o usuário está logado
    // [DEV BYPASS] Se estiver no localhost, chama a Evolution diretamente
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const evoUrl = import.meta.env.VITE_EVOLUTION_API_URL;
        const evoKey = import.meta.env.VITE_EVOLUTION_API_KEY;
        if (evoUrl && evoKey) {
            try {
                const response = await fetch(`${evoUrl}${endpoint}`, {
                    method,
                    headers: { 'Content-Type': 'application/json', 'apikey': evoKey },
                    body
                });
                return await response.json();
            } catch (err) {
                console.warn('⚠️ Erro no bypass local, tentando via Supabase...', err);
            }
        }
    }

    // [PRO] Chama o Proxy da Vercel (Serverless Function)
    // Isso evita CORS e mantém a API Key segura.
    try {
        const response = await fetch('/api/evolution-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                endpoint,
                method,
                payload: body ? JSON.parse(body) : undefined,
            })
        });
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP Error ${response.status}`);
        }

        return await response.json();
    } catch (err: any) {
        console.error('❌ Erro no Proxy da Vercel:', err.message);
        throw err;
    }
}

export async function createInstance(instanceName: string, options: any = {}) {
    return evolutionFetch('/instance/create', {
        method: 'POST',
        body: JSON.stringify({
            instanceName,
            integration: 'WHATSAPP-BAILEYS',
            qrcode: true,
            webhook: {
                url: options.webhookUrl || '',
                enabled: true,
                webhookByEvents: false,
                base64: options.webhookBase64 || false,
                headers: { 
                    'apikey': import.meta.env.VITE_N8N_WEBHOOK_KEY,
                    ...options.webhookHeaders 
                },
                events: options.events || [
                    'MESSAGES_UPSERT',
                    'MESSAGES_UPDATE',
                    'MESSAGES_DELETE',
                    'SEND_MESSAGE',
                    'CONNECTION_UPDATE',
                    'TYPEBOT_START',
                    'TYPEBOT_UNKNOWN',
                    'QRCODE_UPDATED',
                    'CALL',
                ],
            },
            rejectCall: options.rejectCall || false,
            msgCall: options.msgCall || '',
            groupsIgnore: options.groupsIgnore || false,
            alwaysOnline: options.alwaysOnline || true,
            readMessages: options.readMessages || false,
            readStatus: options.readStatus || false,
            ...options,
        }),
    });
}

export async function fetchInstances() {
    return evolutionFetch('/instance/fetchInstances', { method: 'GET' });
}

export async function getInstance(instanceName: string) {
    return evolutionFetch(`/instance/connectionState/${instanceName}`, { method: 'GET' });
}

export async function connectInstance(instanceName: string) {
    return evolutionFetch(`/instance/connect/${instanceName}`, { method: 'GET' });
}

export async function logoutInstance(instanceName: string) {
    return evolutionFetch(`/instance/logout/${instanceName}`, {
        method: 'DELETE',
    });
}

export async function deleteInstance(instanceName: string) {
    return evolutionFetch(`/instance/delete/${instanceName}`, {
        method: 'DELETE',
    });
}

export async function restartInstance(instanceName: string) {
    return evolutionFetch(`/instance/restart/${instanceName}`, {
        method: 'PUT',
    });
}

export async function getQRCode(instanceName: string) {
    return evolutionFetch(`/instance/connect/${instanceName}`, { method: 'GET' });
}

export async function sendText(instanceName: string, number: string, text: string) {
    return evolutionFetch(`/message/sendText/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({
            number,
            text,
            delay: 1200,
        }),
    });
}

export async function sendImage(instanceName: string, number: string, imageUrl: string, caption: string = '') {
    return evolutionFetch(`/message/sendMedia/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({
            number,
            mediatype: 'image',
            media: imageUrl,
            caption,
        }),
    });
}

export async function sendDocument(instanceName: string, number: string, documentUrl: string, fileName: string, caption: string = '') {
    return evolutionFetch(`/message/sendMedia/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({
            number,
            mediatype: 'document',
            media: documentUrl,
            fileName,
            caption,
        }),
    });
}

export async function sendAudio(instanceName: string, number: string, audioUrl: string) {
    return evolutionFetch(`/message/sendWhatsAppAudio/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({
            number,
            audio: audioUrl,
            delay: 1200,
        }),
    });
}

export async function sendVideo(instanceName: string, number: string, videoUrl: string, caption: string = '') {
    return evolutionFetch(`/message/sendMedia/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({
            number,
            mediatype: 'video',
            media: videoUrl,
            caption,
        }),
    });
}

export async function sendLocation(instanceName: string, number: string, lat: number, lng: number, name: string = '', address: string = '') {
    return evolutionFetch(`/message/sendLocation/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({
            number,
            latitude: lat,
            longitude: lng,
            name,
            address,
        }),
    });
}

export async function sendButtons(instanceName: string, number: string, title: string, description: string, buttons: string[], footerText: string = '') {
    return evolutionFetch(`/message/sendButtons/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({
            number,
            title,
            description,
            footer: footerText,
            buttons: buttons.map((btn, i) => ({
                buttonId: `btn_${i}`,
                buttonText: { displayText: btn },
                type: 1,
            })),
        }),
    });
}

export async function sendList(instanceName: string, number: string, title: string, description: string, buttonText: string, sections: any[]) {
    return evolutionFetch(`/message/sendList/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({
            number,
            title,
            description,
            buttonText,
            footerText: '',
            sections,
        }),
    });
}

export async function checkWhatsAppNumber(instanceName: string, numbers: string | string[]) {
    return evolutionFetch(`/chat/whatsappNumbers/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({
            numbers: Array.isArray(numbers) ? numbers : [numbers],
        }),
    });
}

export async function getProfilePicture(instanceName: string, number: string) {
    return evolutionFetch(`/chat/fetchProfilePictureUrl/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({ number }),
    });
}

export async function markAsRead(instanceName: string, remoteJid: string, messageId: string) {
    return evolutionFetch(`/chat/markMessageAsRead/${instanceName}`, {
        method: 'PUT',
        body: JSON.stringify({
            readMessages: [{ remoteJid, id: messageId }],
        }),
    });
}

export async function sendPresence(instanceName: string, number: string, presence: 'composing' | 'recording' | 'paused' = 'composing') {
    return evolutionFetch(`/chat/sendPresence/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({
            number,
            delay: 3000,
            presence,
        }),
    });
}

export async function setWebhook(instanceName: string, webhookUrl: string, events: string[] = []) {
    return evolutionFetch(`/webhook/set/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({
            enabled: true,
            url: webhookUrl,
            webhookByEvents: false,
            webhookBase64: false,
            events: events.length > 0 ? events : [
                'MESSAGES_UPSERT',
                'MESSAGES_UPDATE',
                'SEND_MESSAGE',
                'CONNECTION_UPDATE',
                'QRCODE_UPDATED',
            ],
        }),
    });
}

export async function getWebhook(instanceName: string) {
    return evolutionFetch(`/webhook/find/${instanceName}`, { method: 'GET' });
}
