import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface TourStep {
    target: string; // CSS selector
    title: string;
    description: string;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
    action?: () => void;
}

export interface Tour {
    id: string;
    steps: TourStep[];
}

interface TourContextType {
    currentTour: Tour | null;
    currentStepIndex: number;
    isActive: boolean;
    startTour: (tourId: string) => void;
    endTour: () => void;
    nextStep: () => void;
    prevStep: () => void;
    goToStep: (index: number) => void;
    checkAndStartTour: (tourId: string) => void;
    autoStartDisabled: boolean;
    setAutoStartDisabled: (disabled: boolean) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

// Define tours data
const TOURS: Record<string, Tour> = {
    dashboard: {
        id: 'dashboard',
        steps: [
            {
                target: '[data-tour="dashboard-header"]',
                title: 'Bem-vindo ao Dashboard',
                description: 'Aqui você tem uma visão geral em tempo real de toda a sua operação de atendimento.',
                position: 'bottom'
            },
            {
                target: '[data-tour="dashboard-filters"]',
                title: 'Filtros de Período',
                description: 'Altere o período para visualizar dados de hoje, ontem, últimos 7 dias ou períodos personalizados.',
                position: 'bottom'
            },
            {
                target: '[data-tour="dashboard-stats"]',
                title: 'Indicadores Principais',
                description: 'Acompanhe o volume de tickets totais, ativos e resolvidos instantaneamente.',
                position: 'bottom'
            },
            {
                target: '[data-tour="dashboard-averages"]',
                title: 'Eficiência de Atendimento',
                description: 'Monitore o tempo médio de resposta e resolução para garantir a satisfação do cliente.',
                position: 'bottom'
            },
            {
                target: '[data-tour="dashboard-charts"]',
                title: 'Fluxo de Atendimento',
                description: 'Visualize os horários de pico e o volume de tickets por hora ou dia.',
                position: 'top'
            },
            {
                target: '[data-tour="dashboard-channels"]',
                title: 'Canais Conectados',
                description: 'Veja por onde seus clientes estão entrando em contato e a distribuição por canal.',
                position: 'top'
            },
            {
                target: '[data-tour="dashboard-ranking"]',
                title: 'Ranking de Atendentes',
                description: 'Acompanhe o desempenho da sua equipe e os atendentes mais produtivos.',
                position: 'left'
            },
            {
                target: '[data-tour="dashboard-tags"]',
                title: 'Temas Recorrentes',
                description: 'Identifique rapidamente quais as etiquetas (tags) mais utilizadas nos atendimentos.',
                position: 'top'
            }
        ]
    },
    atendimentos: {
        id: 'atendimentos',
        steps: [
            {
                target: '[data-tour="ticket-panel"]',
                title: 'Painel de Atendimentos',
                description: 'Este é o centro de controle dos seus atendimentos. Aqui você visualiza todas as conversas em andamento.',
                position: 'right'
            },
            {
                target: '[data-tour="ticket-tabs"]',
                title: 'Gerenciamento de Abas',
                description: 'Alterne entre atendimentos Ativos (seus), Aguardando (fila), Fluxos (agendados) e Grupos.',
                position: 'bottom'
            },
            {
                target: '[data-tour="search-tickets"]',
                title: 'Busca Inteligente',
                description: 'Localize rapidamente qualquer contato ou conversa através do nome ou telefone.',
                position: 'bottom'
            },
            {
                target: '[data-tour="filter-tickets"]',
                title: 'Filtros Avançados',
                description: 'Refine sua lista por etiquetas, período, conexões ou visualize atendimentos já resolvidos.',
                position: 'bottom'
            },
            {
                target: '[data-tour="new-ticket-button"]',
                title: 'Iniciar Novo Chat',
                description: 'Clique aqui para buscar um contato na sua agenda e iniciar uma nova conversa manualmente.',
                position: 'bottom'
            },
            {
                target: '[data-tour="chat-header"]',
                title: 'Controle do Ticket',
                description: 'Visualize o nome do cliente e utilize as ações rápidas para transferir ou resolver o atendimento.',
                position: 'bottom'
            },
            {
                target: '[data-tour="ai-suggestions"]',
                title: 'Sugestões Mentais (IA)',
                description: 'Nossa IA analisa o contexto e sugere respostas rápidas. Basta clicar para preencher o campo de texto.',
                position: 'top'
            },
            {
                target: '[data-tour="chat-input"]',
                title: 'Área de Mensagens',
                description: 'Envie textos, arquivos, imagens e áudios. Utilize o "/" para atalhos de respostas rápidas.',
                position: 'top'
            },
            {
                target: '[data-tour="schedule-button"]',
                title: 'Agendamento de Mensagens',
                description: 'Programe mensagens para serem enviadas automaticamente em uma data e hora específica.',
                position: 'top'
            },
            {
                target: '[data-tour="transfer-ticket"]',
                title: 'Transferência de Atendimento',
                description: 'Precisa de ajuda? Você pode transferir esta conversa para outro atendente ou setor específico em segundos.',
                position: 'bottom'
            },
            {
                target: '[data-tour="resolve-ticket"]',
                title: 'Finalização e Pós-Venda',
                description: 'Ao resolver, o sistema abre a Análise de Atendimento para capturarmos dados importantes sobre este contato.',
                position: 'bottom'
            },
            {
                target: '[data-tour="resolve-modal-header"]',
                title: 'Análise de Atendimento',
                description: 'Esta tela permite registrar o resultado deste contato e agendar acompanhamentos automáticos.',
                position: 'center'
            },
            {
                target: '[data-tour="resolve-conversion-icon"]',
                title: 'Métricas e Etiquetas Automáticas',
                description: 'Ao marcar "Sim, Pedido Feito", o sistema gera métricas no dashboard e adiciona automaticamente uma etiqueta com o mês (ex: abr-26) para seu controle de vendas.',
                position: 'bottom'
            },
            {
                target: '[data-tour="resolve-post-sale-section"]',
                title: 'Fidelização (Pós-Venda)',
                description: 'Agende uma mensagem automática para daqui a 3 dias para saber se o cliente está satisfeito.',
                position: 'bottom'
            },
            {
                target: '[data-tour="resolve-continuous-section"]',
                title: 'Uso Contínuo',
                description: 'Para medicamentos de uso contínuo, agende um lembrete para 28 dias e nunca perca uma renovação de receita.',
                position: 'top'
            },
            {
                target: '[data-tour="filter-tickets"]',
                title: 'Acesso ao Histórico',
                description: 'Tudo pronto! Seus atendimentos finalizados ficam seguros aqui no filtro de "Resolvidos" para consultas futuras.',
                position: 'bottom'
            },
            {
                target: '[data-tour="ai-copilot-section"]',
                title: 'Copiloto IA',
                description: 'Insights em tempo real, sugestões de etiquetas e informações contextuais sobre o cliente.',
                position: 'left'
            },
            {
                target: '[data-tour="tags-section"]',
                title: 'Organização com Etiquetas',
                description: 'Categorize seus atendimentos com tags coloridas para facilitar a gestão e relatórios.',
                position: 'left'
            },
            {
                target: '[data-tour="notes-section"]',
                title: 'Notas Internas',
                description: 'Registre observações sobre o cliente que ficam visíveis apenas para sua equipe interna.',
                position: 'top'
            }
        ]
    },
    contacts: {
        id: 'contacts',
        steps: [
            {
                target: '[data-tour="contacts-title"]',
                title: 'Agenda Omnichannel',
                description: 'Aqui você gerencia todos os pacientes da sua farmácia, centralizando WhatsApp, Instagram e Messenger.',
                position: 'bottom'
            },
            {
                target: '[data-tour="channel-filters"]',
                title: 'Filtros por Canal',
                description: 'Filtre rapidamente quem veio pelo WhatsApp, Direct do Instagram ou Messenger do Facebook.',
                position: 'bottom'
            },
            {
                target: '[data-tour="contacts-search"]',
                title: 'Busca Global',
                description: 'Pesquise por nome, telefone, e-mail ou até mesmo @ do Instagram em uma única barra.',
                position: 'bottom'
            },
            {
                target: '[data-tour="new-contact-button"]',
                title: 'Novo Cadastro Manual',
                description: 'Registre novos pacientes manualmente antes mesmo do primeiro contato acontecer.',
                position: 'bottom'
            },
            {
                target: '[data-tour="import-csv-button"]',
                title: 'Importação em Massa',
                description: 'Já tem uma lista de clientes? Importe centenas de contatos de uma vez via arquivo CSV.',
                position: 'bottom'
            },
            {
                target: '[data-tour="contact-card-v1"]',
                title: 'Cartão do Paciente',
                description: 'Visualize rapidamente o nome, telefone, canal de origem e etiquetas de cada pessoa.',
                position: 'right'
            },
            {
                target: '[data-tour="contact-sidebar"]',
                title: 'Prontuário Digital (CRM)',
                description: 'Ao selecionar um contato, você abre o prontuário completo com histórico e informações detalhadas.',
                position: 'left'
            },
            {
                target: '[data-tour="contact-avatar-identity"]',
                title: 'Identidade Visual',
                description: 'O sistema identifica automaticamente o canal e o avatar do cliente para facilitar o reconhecimento.',
                position: 'bottom'
            },
            {
                target: '[data-tour="quick-message-contact"]',
                title: 'Ação Imediata',
                description: 'Inicie uma nova conversa instantaneamente sem precisar procurar o contato no celular.',
                position: 'top'
            },
            {
                target: '[data-tour="contact-info-sections"]',
                title: 'Dados Omnichannel',
                description: 'Gerencie E-mail, IDs de redes sociais e Telefone em um único lugar.',
                position: 'top'
            },
            {
                target: '[data-tour="contact-notes-crm"]',
                title: 'Anotações Estratégicas',
                description: 'Guarde preferências, alergias ou detalhes de atendimento para um serviço personalizado.',
                position: 'top'
            },
            {
                target: '[data-tour="contact-actions"]',
                title: 'Gestão de Registro',
                description: 'Edite informações ou exclua registros duplicados para manter sua base sempre limpa.',
                position: 'bottom'
            }
        ]
    },
    gerenciamento: {
        id: 'gerenciamento',
        steps: [
            {
                target: '[data-tour="admin-title"]',
                title: 'Portal de Administração',
                description: 'Este é o cérebro da sua organização. Aqui você configura quem pode acessar o sistema e como os canais se conectam.',
                position: 'bottom',
                action: () => {
                    window.dispatchEvent(new CustomEvent('tour:action', { detail: { action: 'go-back' } }));
                }
            },
            {
                target: '[data-tour="admin-users-card"]',
                title: 'Gestão de Equipe',
                description: 'Crie novos acessos para seus atendentes e defina quem terá permissões administrativas.',
                position: 'bottom',
                action: () => {
                    window.dispatchEvent(new CustomEvent('tour:action', { detail: { action: 'go-back' } }));
                }
            },
            {
                target: '[data-tour="admin-connections-card"]',
                title: 'Hub de Conexões',
                description: 'Configure seu WhatsApp (via QR ou API Cloud), Instagram e Facebook Messenger.',
                position: 'bottom',
                action: () => {
                    window.dispatchEvent(new CustomEvent('tour:action', { detail: { action: 'go-back' } }));
                }
            },
            {
                target: '[data-tour="team-title"]',
                title: 'Gestão de Agentes',
                description: 'Visualize e gerencie todos os membros da sua equipe em um único lugar.',
                position: 'bottom',
                action: () => {
                    window.dispatchEvent(new CustomEvent('tour:action', { detail: { action: 'open-users' } }));
                    window.dispatchEvent(new CustomEvent('tour:action', { detail: { action: 'close-user-modal' } }));
                }
            },
            {
                target: '[data-tour="team-add-button"]',
                title: 'Cadastrar Novo Membro',
                description: 'Clique aqui para abrir o formulário de convite para um novo atendente ou administrador.',
                position: 'bottom'
            },
            {
                target: '[data-tour="user-modal-title"]',
                title: 'Formulário de Convite',
                description: 'Preencha os dados do novo membro. O sistema enviará as credenciais automaticamente por e-mail.',
                position: 'bottom',
                action: () => {
                    window.dispatchEvent(new CustomEvent('tour:action', { detail: { action: 'open-user-modal' } }));
                }
            },
            {
                target: '[data-tour="user-form-name"]',
                title: 'Identificação',
                description: 'Insira o nome completo do colaborador para identificação nos atendimentos.',
                position: 'bottom'
            },
            {
                target: '[data-tour="user-form-email"]',
                title: 'E-mail de Acesso',
                description: 'Este e-mail será usado para login e para receber notificações do sistema.',
                position: 'bottom'
            },
            {
                target: '[data-tour="user-form-role-user"]',
                title: 'Perfil Atendente',
                description: 'Ideal para quem fará apenas o suporte técnico e atendimento direto aos clientes.',
                position: 'bottom'
            },
            {
                target: '[data-tour="user-form-role-admin"]',
                title: 'Perfil Administrador',
                description: 'Dá acesso completo às configurações do sistema, faturamento e gestão de toda a equipe.',
                position: 'bottom'
            },
            {
                target: '[data-tour="user-form-submit"]',
                title: 'Finalizar Convite',
                description: 'Ao confirmar, o convite é enviado e o novo membro já aparece na sua lista de equipe.',
                position: 'top'
            },
            {
                target: '[data-tour="team-role-badge"]',
                title: 'Controle Visual',
                description: 'Diferencie rapidamente o nível de acesso de cada membro através destas etiquetas.',
                position: 'bottom',
                action: () => {
                    window.dispatchEvent(new CustomEvent('tour:action', { detail: { action: 'close-user-modal' } }));
                }
            },
            {
                target: '[data-tour="team-status"]',
                title: 'Status em Tempo Real',
                description: 'Acompanhe quem está Online, Ocupado ou Offline para melhor distribuição de carga.',
                position: 'bottom'
            },
            {
                target: '[data-tour="connections-title"]',
                title: 'Integrações Ativas',
                description: 'Centralize a gestão de todos os seus pontos de contato digitais.',
                position: 'bottom',
                action: () => {
                    window.dispatchEvent(new CustomEvent('tour:action', { detail: { action: 'open-connections' } }));
                    window.dispatchEvent(new CustomEvent('tour:action', { detail: { action: 'close-user-modal' } }));
                    window.dispatchEvent(new CustomEvent('tour:action', { detail: { action: 'close-conn-form' } }));
                }
            },
            {
                target: '[data-tour="connections-add-button"]',
                title: 'Vincular Novo Canal',
                description: 'Adicione instâncias de WhatsApp ou conecte suas Fanpages do Instagram e Facebook.',
                position: 'left'
            },
            {
                target: '[data-tour="conn-method-whatsapp"]',
                title: 'Escolha o Canal',
                description: 'Selecione WhatsApp para usar a Evolution API ou Instagram/Messenger para a API Oficial da Meta.',
                position: 'bottom',
                action: () => {
                    window.dispatchEvent(new CustomEvent('tour:action', { detail: { action: 'open-conn-form' } }));
                }
            },
            {
                target: '[data-tour="conn-method-evolution"]',
                title: 'Método Evolution API',
                description: 'A forma mais rápida de conectar: gera um QR Code que você escaneia direto no seu celular.',
                position: 'bottom'
            },
            {
                target: '[data-tour="conn-form-name"]',
                title: 'Nome da Conexão',
                description: 'Dê um nome amigável para identificar esta conta no sistema (ex: Suporte Vendas).',
                position: 'bottom',
                action: () => {
                    window.dispatchEvent(new CustomEvent('tour:action', { detail: { action: 'mock-conn-data' } }));
                }
            },
            {
                target: '[data-tour="conn-form-instance-name"]',
                title: 'ID da Instância',
                description: 'Este é o identificador técnico usado para comunicar com o servidor de mensagens.',
                position: 'bottom'
            },
            {
                target: '[data-tour="conn-form-webhook"]',
                title: 'Webhook de Integração',
                description: 'O endereço onde as mensagens recebidas serão processadas pelo cérebro do sistema (n8n).',
                position: 'top'
            },
            {
                target: '[data-tour="conn-form-submit"]',
                title: 'Finalizar Cadastro',
                description: 'Ao confirmar, o sistema criará a instância e ela estará pronta para gerar o QR Code.',
                position: 'top'
            },
            {
                target: '[data-tour="connections-stats"]',
                title: 'Painel de Controle',
                description: 'Visão rápida da saúde dos seus canais e quantas conexões estão ativas no momento.',
                position: 'bottom',
                action: () => {
                    window.dispatchEvent(new CustomEvent('tour:action', { detail: { action: 'close-conn-form' } }));
                }
            },
            {
                target: '[data-tour="connection-item"]',
                title: 'Gerenciar Instância',
                description: 'Aqui você gera o QR Code, reinicia a conexão ou remove canais antigos.',
                position: 'top'
            }
        ]
    },
    'ia-copiloto': {
        id: 'ia-copiloto',
        steps: [
            {
                target: '.flex-1.overflow-y-auto.p-6',
                title: 'O Cérebro da Operação',
                description: 'Nesta tela você configura a inteligência artificial da sua farmácia. A IA ajuda seus atendentes a serem mais rápidos e técnicos.',
                position: 'center'
            },
            {
                target: '[data-tour="ai-toggle"]',
                title: 'Ativar a Inteligência',
                description: 'Este botão liga ou desliga as sugestões automáticas no chat em tempo real.',
                position: 'bottom'
            },
            {
                target: '[data-tour="ai-gemini-key"]',
                title: 'Modelo Principal (Google)',
                description: 'A chave do Google Gemini é o motor que gera as respostas no chat e cria os encartes promocionais.',
                position: 'bottom'
            },
            {
                target: '[data-tour="ai-openai-key"]',
                title: 'Cérebro Técnico (GPT)',
                description: 'A OpenAI (ChatGPT) atua como o Especialista Farma, realizando análises clínicas profundas de receitas e interações.',
                position: 'bottom'
            },
            {
                target: '[data-tour="ai-serpapi-key"]',
                title: 'Buscador de Imagens',
                description: 'A SerpApi permite que o sistema busque fotos reais das embalagens dos medicamentos para os seus encartes.',
                position: 'bottom'
            },
            {
                target: '[data-tour="ai-pharmacy-data"]',
                title: 'Contexto da Farmácia',
                description: 'Preencha os dados da sua unidade. A IA usará isso para informar o cliente sobre seu endereço e telefones.',
                position: 'top',
                action: () => { window.dispatchEvent(new CustomEvent('tour:action', { detail: { action: 'mock-ai-data' } })); }
            },
            {
                target: '[data-tour="ai-logo-upload"]',
                title: 'Branding e Logo',
                description: 'Suba sua logo em PNG (sem fundo). Ela será aplicada automaticamente em todos os encartes gerados pela IA.',
                position: 'top'
            },
            {
                target: '[data-tour="ai-delivery"]',
                title: 'Taxas e Entregas',
                description: 'Defina aqui valores e áreas de cobertura. Se o cliente perguntar "quanto é o frete?", a IA saberá responder.',
                position: 'top'
            },
            {
                target: '[data-tour="ai-services"]',
                title: 'Menu de Serviços',
                description: 'Marque quais serviços sua farmácia oferece (Aferição, Injeções, etc). A IA oferecerá esses serviços proativamente.',
                position: 'top'
            },
            {
                target: '[data-tour="ai-behaviors"]',
                title: 'Regras de Conduta',
                description: 'Configure como a IA deve se comportar: oferecer genéricos, fazer perguntas de investigação ou combos de venda.',
                position: 'top'
            },
            {
                target: '[data-tour="ai-tone"]',
                title: 'Tom de Voz',
                description: 'Sua farmácia é Formal ou Descontraída? Defina a "personalidade" das mensagens sugeridas.',
                position: 'top'
            },
            {
                target: '[data-tour="ai-partners"]',
                title: 'Parceiros e Prioridades',
                description: 'Cadastre laboratórios parceiros para que a IA priorize sugerir esses produtos nas vendas consultivas.',
                position: 'top'
            },
            {
                target: '[data-tour="ai-pricing"]',
                title: 'Convênios e Descontos',
                description: 'Registre suas regras de preço e convênios para que a IA informe os descontos disponíveis corretamente.',
                position: 'top'
            },
            {
                target: '[data-tour="ai-advanced-toggle"]',
                title: 'Prompt Estratégico',
                description: 'Clique aqui para ver a "receita" final que enviamos para a IA. É aqui que a mágica acontece!',
                position: 'top',
                action: () => { window.dispatchEvent(new CustomEvent('tour:action', { detail: { action: 'open-ai-advanced' } })); }
            },
            {
                target: '[data-tour="ai-advanced-prompt"]',
                title: 'Cérebro Personalizado',
                description: 'Você pode refinar as instruções brutas da IA. Se mudar algo aqui, a IA seguirá suas ordens customizadas.',
                position: 'top'
            },
            {
                target: '[data-tour="ai-save-button"]',
                title: 'Sincronizar Inteligência',
                description: 'Pronto! Ao salvar, todo o conhecimento da sua farmácia é atualizado instantaneamente no cérebro do Copiloto.',
                position: 'bottom'
            }
        ]
    },
    'ia-encartes': {
        id: 'ia-encartes',
        steps: [
            {
                target: '[data-tour="encarte-header"]',
                title: 'Encarte Farma IA',
                description: 'Bem-vindo ao gerador de encartes! Aqui a IA cria artes profissionais para suas redes sociais em segundos.',
                position: 'bottom'
            },
            {
                target: '[data-tour="encarte-layout"]',
                title: 'Layout do Encarte',
                description: 'Escolha se quer destacar apenas 1 produto principal ou criar um encarte com 4 ofertas simultâneas.',
                position: 'bottom'
            },
            {
                target: '[data-tour="encarte-theme"]',
                title: 'Tema da Campanha',
                description: 'Digite o tema (ex: Black Friday, Dia das Mães). A IA usará isso para criar o fundo e os elementos decorativos.',
                position: 'bottom'
            },
            {
                target: '[data-tour="encarte-validity"]',
                title: 'Data de Validade',
                description: 'Informe até quando as ofertas são válidas. Isso aparecerá de forma elegante no rodapé do encarte.',
                position: 'bottom'
            },
            {
                target: '[data-tour="encarte-palette"]',
                title: 'Identidade Visual',
                description: 'Escolha a cor predominante. A IA adaptará todo o design para combinar com a cor da sua marca.',
                position: 'top'
            },
            {
                target: '[data-tour="encarte-product-card"]',
                title: 'Dados do Produto',
                description: 'Preencha o nome ou EAN e os preços. A IA buscará automaticamente a melhor foto deste produto na internet.',
                position: 'top'
            },
            {
                target: '[data-tour="encarte-product-prescription"]',
                title: 'Regra de Medicamentos',
                description: 'Para remédios tarjados, a ANVISA proíbe fotos. Ao marcar esta opção, a IA usará uma arte técnica seguindo a lei.',
                position: 'top'
            },
            {
                target: '[data-tour="encarte-product-image"]',
                title: 'Foto Personalizada',
                description: 'Se você tiver uma foto específica do produto na prateleira, pode subir aqui para um resultado ainda mais real.',
                position: 'top'
            },
            {
                target: '[data-tour="encarte-format"]',
                title: 'Formato da Arte',
                description: 'Feed (quadrado) para o Instagram ou Story (vertical) para o WhatsApp. A IA ajusta toda a diagramação.',
                position: 'top'
            },
            {
                target: '[data-tour="encarte-style"]',
                title: 'Estilo de Design',
                description: 'Moderno, Minimalista ou Clínico? Escolha o estilo que mais combina com o público da sua farmácia.',
                position: 'top'
            },
            {
                target: '[data-tour="encarte-generate-btn"]',
                title: 'Mágica da IA',
                description: 'Tudo pronto? Clique aqui e aguarde alguns segundos enquanto a IA desenha seu encarte exclusivo.',
                position: 'bottom'
            },
            {
                target: '[data-tour="encarte-history"]',
                title: 'Seu Histórico',
                description: 'Todos os seus encartes ficam salvos aqui. Você pode baixar ou reutilizar artes antigas a qualquer momento.',
                position: 'left'
            }
        ]
    }
};

export function TourProvider({ children }: { children: ReactNode }) {
    const [currentTour, setCurrentTour] = useState<Tour | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [autoStartDisabled, setAutoStartToggle] = useState(() => {
        return localStorage.getItem('tour_auto_start_disabled') === 'true';
    });

    const setAutoStartDisabled = useCallback((disabled: boolean) => {
        localStorage.setItem('tour_auto_start_disabled', disabled ? 'true' : 'false');
        setAutoStartToggle(disabled);
    }, []);

    const startTour = useCallback((tourId: string) => {
        const tour = TOURS[tourId];
        if (tour) {
            setCurrentTour(tour);
            setCurrentStepIndex(0);
            setIsActive(true);
        }
    }, []);

    const endTour = useCallback(() => {
        if (currentTour) {
            localStorage.setItem(`tour_completed_${currentTour.id}`, 'true');
        }
        setIsActive(false);
        setCurrentTour(null);
        setCurrentStepIndex(0);
    }, [currentTour]);

    const checkAndStartTour = useCallback((tourId: string) => {
        if (autoStartDisabled) return;

        const isCompleted = localStorage.getItem(`tour_completed_${tourId}`);
        if (!isCompleted) {
            startTour(tourId);
        }
    }, [startTour, autoStartDisabled]);

    const nextStep = useCallback(() => {
        if (currentTour && currentStepIndex < currentTour.steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            endTour();
        }
    }, [currentTour, currentStepIndex, endTour]);

    const prevStep = useCallback(() => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    }, [currentStepIndex]);

    const goToStep = useCallback((index: number) => {
        if (currentTour && index >= 0 && index < currentTour.steps.length) {
            setCurrentStepIndex(index);
        }
    }, [currentTour]);

    return (
        <TourContext.Provider value={{
            currentTour,
            currentStepIndex,
            isActive,
            startTour,
            endTour,
            nextStep,
            prevStep,
            goToStep,
            checkAndStartTour,
            autoStartDisabled,
            setAutoStartDisabled
        }}>
            {children}
        </TourContext.Provider>
    );
}

export function useTour() {
    const context = useContext(TourContext);
    if (context === undefined) {
        throw new Error('useTour must be used within a TourProvider');
    }
    return context;
}
