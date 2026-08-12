import { MessageSquare, Newspaper, Tags, MapPinned, type LucideIcon } from 'lucide-react';

export interface Tool {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
}

// Novas ferramentas da plataforma entram aqui — aparecem tanto no launcher
// quanto no menu lateral (Sidebar.tsx).
export const tools: Tool[] = [
  {
    title: 'Chat IA',
    description: 'Terminal de atendimento farmacêutico com IA — a ferramenta principal do Balconista Pro.',
    href: '/chat',
    icon: MessageSquare,
  },
  {
    title: 'Gerador de Encarte',
    description: 'Monte encartes promocionais para a farmácia em minutos.',
    href: '/encarte',
    icon: Newspaper,
    disabled: true,
  },
  {
    title: 'Precificação',
    description: 'Sugestão de preços competitivos com base na região e no mercado.',
    href: '/precificacao',
    icon: Tags,
    disabled: true,
  },
  {
    title: 'Análise de Potencial da Região',
    description: 'Avalie o potencial de uma região antes de abrir ou expandir uma unidade.',
    href: '/analise-regiao',
    icon: MapPinned,
    disabled: true,
  },
];
