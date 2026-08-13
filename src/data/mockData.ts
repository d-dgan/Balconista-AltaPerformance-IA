export interface Contact {
    id: string;
    name: string;
    phone: string;
    avatar: string;
    tags: { label: string; color: string }[];
    email: string;
    notes: string;
    lastSeen: string;
}

export interface Ticket {
    id: string;
    contact: Contact;
    status: 'active' | 'waiting' | 'resolved' | 'flow';
    assigned_to: string | null;
    channel: 'whatsapp' | 'instagram' | 'messenger';
    lastMessage: string;
    lastMessageTime: string;
    unreadCount: number;
    tags: { label: string; color: string }[];
    createdAt: string;
}

export interface Message {
    id: string;
    sender: 'contact' | 'agent' | 'system';
    type: 'text' | 'image' | 'video' | 'audio' | 'document';
    content: string;
    caption?: string;
    timestamp: string;
}

export const contacts: Contact[] = [
    {
        id: 'ct_001',
        name: 'Maria Silva',
        phone: '+55 11 99876-5432',
        avatar: 'https://i.pravatar.cc/150?img=1',
        tags: [{ label: 'VIP', color: 'purple' }, { label: 'Diabetes', color: 'blue' }],
        email: 'maria.silva@email.com',
        notes: 'Paciente frequente, solicita insulina mensalmente.',
        lastSeen: '2026-02-28T10:30:00',
    },
    {
        id: 'ct_002',
        name: 'João Pereira',
        phone: '+55 21 98765-4321',
        avatar: 'https://i.pravatar.cc/150?img=3',
        tags: [{ label: 'Novo', color: 'green' }],
        email: 'joao.pereira@email.com',
        notes: '',
        lastSeen: '2026-02-28T09:15:00',
    },
    {
        id: 'ct_003',
        name: 'Ana Beatriz',
        phone: '+55 31 97654-3210',
        avatar: 'https://i.pravatar.cc/150?img=5',
        tags: [{ label: 'Urgente', color: 'rose' }, { label: 'Hipertensão', color: 'amber' }],
        email: 'ana.beatriz@email.com',
        notes: 'Precisa de receita renovada para Losartana.',
        lastSeen: '2026-02-28T11:00:00',
    },
    {
        id: 'ct_004',
        name: 'Carlos Eduardo',
        phone: '+55 41 96543-2109',
        avatar: 'https://i.pravatar.cc/150?img=8',
        tags: [{ label: 'Recorrente', color: 'cyan' }],
        email: 'carlos.edu@email.com',
        notes: 'Compra suplementos toda semana.',
        lastSeen: '2026-02-27T16:45:00',
    },
    {
        id: 'ct_005',
        name: 'Fernanda Lima',
        phone: '+55 51 95432-1098',
        avatar: 'https://i.pravatar.cc/150?img=9',
        tags: [{ label: 'Gestante', color: 'rose' }, { label: 'VIP', color: 'purple' }],
        email: 'fernanda.lima@email.com',
        notes: 'Acompanhamento pré-natal, ácido fólico.',
        lastSeen: '2026-02-28T08:20:00',
    },
    {
        id: 'ct_006',
        name: 'Roberto Santos',
        phone: '+55 61 94321-0987',
        avatar: 'https://i.pravatar.cc/150?img=12',
        tags: [{ label: 'Diabetes', color: 'blue' }],
        email: 'roberto.santos@email.com',
        notes: '',
        lastSeen: '2026-02-27T14:10:00',
    },
];

export const tickets: Ticket[] = [
    {
        id: 'tk_001',
        contact: contacts[0],
        status: 'active',
        assigned_to: 'usr_001',
        channel: 'whatsapp',
        lastMessage: 'Olá, preciso da minha insulina Lantus. Ainda tem em estoque?',
        lastMessageTime: '2026-02-28T11:25:00',
        unreadCount: 2,
        tags: [{ label: 'VIP', color: 'purple' }],
        createdAt: '2026-02-28T10:00:00',
    },
    {
        id: 'tk_002',
        contact: contacts[1],
        status: 'waiting',
        assigned_to: null,
        channel: 'whatsapp',
        lastMessage: 'Bom dia! Vocês fazem entrega?',
        lastMessageTime: '2026-02-28T11:20:00',
        unreadCount: 1,
        tags: [{ label: 'Novo', color: 'green' }],
        createdAt: '2026-02-28T11:18:00',
    },
    {
        id: 'tk_003',
        contact: contacts[2],
        status: 'active',
        assigned_to: 'usr_001',
        channel: 'instagram',
        lastMessage: 'Preciso renovar minha receita de Losartana, podem me ajudar?',
        lastMessageTime: '2026-02-28T11:10:00',
        unreadCount: 0,
        tags: [{ label: 'Urgente', color: 'rose' }, { label: 'Hipertensão', color: 'amber' }],
        createdAt: '2026-02-28T09:30:00',
    },
    {
        id: 'tk_004',
        contact: contacts[3],
        status: 'waiting',
        assigned_to: null,
        channel: 'messenger',
        lastMessage: 'Boa tarde! Quero saber o preço do Whey Protein.',
        lastMessageTime: '2026-02-28T10:45:00',
        unreadCount: 3,
        tags: [{ label: 'Recorrente', color: 'cyan' }],
        createdAt: '2026-02-28T10:40:00',
    },
    {
        id: 'tk_005',
        contact: contacts[4],
        status: 'active',
        assigned_to: 'usr_002',
        channel: 'whatsapp',
        lastMessage: 'O ácido fólico que comprei é de 5mg, certo?',
        lastMessageTime: '2026-02-28T09:30:00',
        unreadCount: 0,
        tags: [{ label: 'Gestante', color: 'rose' }],
        createdAt: '2026-02-28T08:00:00',
    },
    {
        id: 'tk_006',
        contact: contacts[5],
        status: 'flow',
        assigned_to: null,
        channel: 'whatsapp',
        lastMessage: '[Automação] Lembrete de medicação enviado.',
        lastMessageTime: '2026-02-28T08:00:00',
        unreadCount: 0,
        tags: [{ label: 'Automação', color: 'blue' }],
        createdAt: '2026-02-27T12:00:00',
    },
];

export const messages: Record<string, Message[]> = {
    tk_001: [
        { id: 'm1', sender: 'contact', type: 'text', content: 'Bom dia! Tudo bem?', timestamp: '2026-02-28T10:00:00' },
        { id: 'm2', sender: 'agent', type: 'text', content: 'Bom dia, Maria! Tudo ótimo. Como posso ajudá-la hoje?', timestamp: '2026-02-28T10:01:00' },
        { id: 'm3', sender: 'contact', type: 'text', content: 'Preciso da minha insulina Lantus. Ainda tem em estoque?', timestamp: '2026-02-28T10:02:00' },
        { id: 'm4', sender: 'agent', type: 'text', content: 'Sim, temos a Lantus SoloStar 100UI/mL disponível! Deseja que eu separe para retirada ou prefere entrega?', timestamp: '2026-02-28T10:03:00' },
        { id: 'm5', sender: 'contact', type: 'image', content: '/receita_maria.enc', caption: 'Segue minha receita atualizada', timestamp: '2026-02-28T10:05:00' },
        { id: 'm6', sender: 'agent', type: 'text', content: 'Receita recebida e validada! ✅ Vou preparar seu pedido. Prefere retirar ou entrega?', timestamp: '2026-02-28T10:10:00' },
        { id: 'm7', sender: 'contact', type: 'text', content: 'Entrega, por favor! Mesmo endereço de sempre.', timestamp: '2026-02-28T11:20:00' },
        { id: 'm8', sender: 'contact', type: 'text', content: 'Olá, preciso da minha insulina Lantus. Ainda tem em estoque?', timestamp: '2026-02-28T11:25:00' },
    ],
    tk_002: [
        { id: 'm1', sender: 'contact', type: 'text', content: 'Bom dia! Vocês fazem entrega?', timestamp: '2026-02-28T11:18:00' },
    ],
    tk_003: [
        { id: 'm1', sender: 'contact', type: 'text', content: 'Bom dia! Preciso renovar minha receita de Losartana.', timestamp: '2026-02-28T09:30:00' },
        { id: 'm2', sender: 'agent', type: 'text', content: 'Bom dia, Ana! Claro, posso verificar isso para você. A receita anterior foi emitida pelo Dr. Marcos?', timestamp: '2026-02-28T09:32:00' },
        { id: 'm3', sender: 'contact', type: 'text', content: 'Isso mesmo! Dr. Marcos Oliveira.', timestamp: '2026-02-28T09:35:00' },
        { id: 'm4', sender: 'agent', type: 'text', content: 'Perfeito! Vou entrar em contato com o consultório para solicitar a renovação. Assim que tiver retorno, aviso aqui.', timestamp: '2026-02-28T09:40:00' },
        { id: 'm5', sender: 'contact', type: 'document', content: '/exame_ana.pdf.enc', caption: 'Meus últimos exames', timestamp: '2026-02-28T10:00:00' },
        { id: 'm6', sender: 'contact', type: 'text', content: 'Preciso renovar minha receita de Losartana, podem me ajudar?', timestamp: '2026-02-28T11:10:00' },
    ],
    tk_004: [
        { id: 'm1', sender: 'contact', type: 'text', content: 'Boa tarde! Quero saber o preço do Whey Protein.', timestamp: '2026-02-28T10:40:00' },
        { id: 'm2', sender: 'contact', type: 'text', content: 'Tem o sabor chocolate?', timestamp: '2026-02-28T10:41:00' },
        { id: 'm3', sender: 'contact', type: 'text', content: 'E a creatina? Tem também?', timestamp: '2026-02-28T10:45:00' },
    ],
    tk_005: [
        { id: 'm1', sender: 'contact', type: 'text', content: 'Oi! O ácido fólico que comprei é de 5mg, certo?', timestamp: '2026-02-28T08:05:00' },
        { id: 'm2', sender: 'agent', type: 'text', content: 'Olá, Fernanda! Sim, o ácido fólico que levou é de 5mg. É a dosagem que seu médico prescreveu?', timestamp: '2026-02-28T08:10:00' },
        { id: 'm3', sender: 'contact', type: 'text', content: 'Sim, perfeito! Obrigada!', timestamp: '2026-02-28T09:30:00' },
    ],
    tk_006: [
        { id: 'm1', sender: 'system', type: 'text', content: '🤖 Lembrete automático de medicação enviado para Roberto.', timestamp: '2026-02-28T08:00:00' },
        { id: 'm2', sender: 'system', type: 'text', content: '🤖 Aguardando confirmação do paciente...', timestamp: '2026-02-28T08:01:00' },
    ],
};

export const orgUsers = [
    { id: 'usr_001', name: 'Dr. Rafael Mendes', email: 'rafael@balconistapro.com.br', role: 'admin', status: 'online', avatar: 'https://i.pravatar.cc/150?img=60' },
    { id: 'usr_002', name: 'Ana Costa', email: 'ana@balconistapro.com.br', role: 'user', status: 'online', avatar: 'https://i.pravatar.cc/150?img=47' },
    { id: 'usr_003', name: 'Lucas Martins', email: 'lucas@balconistapro.com.br', role: 'user', status: 'offline', avatar: 'https://i.pravatar.cc/150?img=33' },
    { id: 'usr_004', name: 'Juliana Rocha', email: 'juliana@balconistapro.com.br', role: 'user', status: 'busy', avatar: 'https://i.pravatar.cc/150?img=44' },
];

export const connections = [
    { id: 'conn_001', type: 'whatsapp' as const, name: 'WhatsApp Principal', number: '+55 11 99999-0001', status: 'connected', isDefault: true, method: 'api' },
    { id: 'conn_002', type: 'whatsapp' as const, name: 'WhatsApp Vendas', number: '+55 11 99999-0002', status: 'disconnected', isDefault: false, method: 'qrcode' },
    { id: 'conn_003', type: 'instagram' as const, name: 'Instagram @balconistapro', number: '@balconistapro', status: 'connected', isDefault: false, method: 'api' },
    { id: 'conn_004', type: 'messenger' as const, name: 'Facebook Messenger', number: 'Balconista Pro', status: 'connected', isDefault: false, method: 'api' },
];

export const schedules = [
    { id: 'sch_001', contactName: 'Maria Silva', message: 'Lembrete: sua insulina está pronta para retirada!', scheduledFor: '2026-03-01T09:00:00', status: 'pending' },
    { id: 'sch_002', contactName: 'Roberto Santos', message: 'Hora do medicamento para diabetes. Tome sua metformina.', scheduledFor: '2026-03-01T08:00:00', status: 'pending' },
];

export const dashboardStats = {
    totalTickets: 156,
    activeTickets: 23,
    resolvedToday: 18,
    avgResponseTime: '3m 24s',
    satisfaction: 94.5,
    ticketsByChannel: { whatsapp: 120, instagram: 22, messenger: 14 },
    ticketsByHour: [3, 5, 8, 15, 22, 28, 35, 30, 25, 18, 12, 8],
    topTags: [
        { label: 'Diabetes', count: 34 },
        { label: 'Hipertensão', count: 28 },
        { label: 'Gestante', count: 15 },
        { label: 'VIP', count: 12 },
        { label: 'Urgente', count: 8 },
    ],
};
