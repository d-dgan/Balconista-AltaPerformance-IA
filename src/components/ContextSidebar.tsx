import { useState, useEffect } from 'react';
import {
    ChevronDown,
    ChevronUp,
    User,
    Tag,
    Clock,
    StickyNote,
    CalendarClock,
    Phone,
    Mail,
    X,
    Check,
    Edit2,
    Plus,
    Bot,
    MapPin,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { schedules as mockSchedules } from '../data/mockData';
import ManageTagsModal from './ManageTagsModal';
import * as api from '../services/api';
import Avatar from './Avatar';
import AiCopilotPanel from './AiCopilotPanel';
import type { TicketExtended } from './AtendimentosPage';
import type { Tag as TagType } from '../services/api';

interface AccordionProps {
    title: string;
    icon: any;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

function Accordion({ title, icon: Icon, children, defaultOpen = false }: AccordionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-slate-200 dark:border-white/5 last:border-b-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-void-800 transition-colors cursor-pointer text-slate-700 dark:text-white/90"
            >
                <Icon size={16} className="text-primary-500 dark:text-primary-400 shrink-0" />
                <span className="flex-1 text-left uppercase tracking-widest text-[10px] font-black">{title}</span>
                {isOpen ? <ChevronUp size={14} className="text-slate-400 dark:text-white/40" /> : <ChevronDown size={14} className="text-slate-400 dark:text-white/40" />}
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-4 pb-3">{children}</div>
            </div>
        </div>
    );
}

interface Note {
    id: number | string;
    text: string;
    author: string;
    time: string;
}

interface ContextSidebarProps {
    ticket: TicketExtended | null;
    allTags?: TagType[];
    onContactUpdate?: (id: string, updates: Partial<import('../services/api').Contact>) => void;
    onUpdateTags?: (ticketId: string, tags: any[]) => void;
    onTagsChange?: (tags: TagType[]) => void;
    onUseSuggestion?: (text: string) => void;
    onHintChange?: (hint: any) => void;
    lastIncomingMessageId?: string | null;
    lastIncomingMessageTicketId?: string | null;
}

export default function ContextSidebar({
    ticket,
    allTags = [],
    onContactUpdate,
    onUpdateTags,
    onTagsChange,
    onUseSuggestion,
    onHintChange,
    lastIncomingMessageId,
    lastIncomingMessageTicketId
}: ContextSidebarProps) {
    const { user } = useAuth();
    const { t } = useLanguage();
    const schedules = user?.role === 'super_admin' ? mockSchedules : [];
    const [newNote, setNewNote] = useState('');
    const [notes, setNotes] = useState<Note[]>([]);

    useEffect(() => {
        if (ticket?.id === 'tk_treinamento') {
            setNotes([
                { id: 'tn1', text: 'Paciente frequente, busca insulina Lantus todos os meses. Sempre muito gentil.', author: 'Ana Costa', time: '10:30' },
                { id: 'tn2', text: 'Prefere entrega no período da manhã.', author: 'Dr. Rafael Mendes', time: '09:15' }
            ]);
            return;
        }

        if (ticket?.contact?.id) {
            const loadNotes = async () => {
                try {
                    const data = await api.fetchInternalNotes(ticket.contact.id);
                    if (data) {
                        const mappedNotes = data.map((n: any) => ({
                            id: n.id,
                            text: n.content,
                            author: n.user?.name || t('Sistema', 'System'),
                            time: new Date(n.created_at).toLocaleTimeString(t('pt-BR', 'en-US'), { hour: '2-digit', minute: '2-digit' })
                        }));
                        setNotes(mappedNotes);
                    }
                } catch (err) {
                    console.error("Error loading notes:", err);
                }
            };
            loadNotes();
        } else {
            setNotes([]);
        }
    }, [ticket?.contact?.id, t]);

    const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
    const [isSavingTag, setIsSavingTag] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);

    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [isSavingName, setIsSavingName] = useState(false);

    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [editedAddress, setEditedAddress] = useState('');
    const [isSavingAddress, setIsSavingAddress] = useState(false);

    useEffect(() => {
        if (ticket?.contact?.name) {
            setEditedName(ticket.contact.name);
            setIsEditingName(false);
        }
        if (ticket?.contact?.address) {
            setEditedAddress(ticket.contact.address);
            setIsEditingAddress(false);
        } else {
            setEditedAddress('');
            setIsEditingAddress(false);
        }
    }, [ticket?.contact?.id, ticket?.contact?.name, ticket?.contact?.address]);

    if (!ticket) {
        return (
            <div className="hidden lg:flex w-[320px] min-w-[320px] bg-slate-50 dark:bg-void-950 h-full flex-col items-center justify-center opacity-30">
                <p className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-white/20">{t('Selecione um atendimento', 'Select a conversation')}</p>
            </div>
        );
    }

    const contact = ticket.contact;

    const tagColorMap: Record<string, string> = {
        blue: '#6366f1', green: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
        purple: '#8b5cf6', cyan: '#06b6d4', pink: '#ec4899', orange: '#f97316',
        emerald: '#10b981', gray: '#6b7280', slate: '#64748b', teal: '#14b8a6',
        indigo: '#4f46e5', violet: '#8b5cf6',
    };

    const addNote = async () => {
        if (!newNote.trim() || !ticket?.contact?.id || !user?.organization?.id || !user?.id) return;
        
        try {
            const data = await api.createInternalNote({
                contact_id: String(ticket.contact.id),
                organization_id: String(user.organization.id),
                user_id: String(user.id),
                content: newNote
            });
            
            if (data) {
                const mappedNote = {
                    id: data.id,
                    text: data.content,
                    author: (data as any).user?.name || user.name || t('Você', 'You'),
                    time: new Date(data.created_at).toLocaleTimeString(t('pt-BR', 'en-US'), { hour: '2-digit', minute: '2-digit' })
                };
                setNotes(prev => [...prev, mappedNote]);
                setNewNote('');
            }
        } catch (err) {
            console.error("Error creating note:", err);
        }
    };

    const handleSaveName = async () => {
        if (!editedName.trim() || editedName === contact?.name) {
            setIsEditingName(false);
            return;
        }
        if (!contact?.id) return;

        setIsSavingName(true);
        try {
            await api.updateContact(contact.id, { name: editedName });
            if (onContactUpdate) {
                onContactUpdate(contact.id, { name: editedName });
            }
        } catch (error) {
            console.error('Failed to update contact name', error);
        } finally {
            setIsSavingName(false);
            setIsEditingName(false);
        }
    };

    const handleSaveAddress = async () => {
        if (!contact?.id) return;

        let safeAddress = editedAddress
            .trim()
            .replace(/<[^>]*>?/gm, '') // Remove typical HTML elements to prevent DOM/XSS injection
            .substring(0, 255);        // Hard max limit

        setIsSavingAddress(true);
        try {
            await api.updateContact(contact.id, { address: safeAddress });
            if (onContactUpdate) {
                onContactUpdate(contact.id, { address: safeAddress });
            }
        } catch (error) {
            console.error('Failed to update contact address', error);
        } finally {
            setIsSavingAddress(false);
            setIsEditingAddress(false);
        }
    };

    const handleAddTag = async (tag: TagType) => {
        if (!ticket || isSavingTag) return;
        const currentTags = ticket.tags || [];
        if (currentTags.some(t => t.label === tag.label)) {
            setIsTagMenuOpen(false);
            return;
        }

        setIsSavingTag(true);
        const newTagsList = [...currentTags, { label: tag.label, color: tag.color, icon: tag.icon }];

        try {
            if (onUpdateTags) onUpdateTags(ticket.id, newTagsList);
            await api.updateTicketTags(ticket.id, newTagsList);
        } catch (error) {
            console.error('Failed to add tag to ticket', error);
        } finally {
            setIsSavingTag(false);
            setIsTagMenuOpen(false);
        }
    };

    const handleRemoveTag = async (tagLabel: string) => {
        if (!ticket || isSavingTag) return;
        setIsSavingTag(true);
        const newTagsList = (ticket.tags || []).filter(t => t.label !== tagLabel);

        try {
            if (onUpdateTags) onUpdateTags(ticket.id, newTagsList);
            await api.updateTicketTags(ticket.id, newTagsList);
        } catch (error) {
            console.error('Failed to remove tag from ticket', error);
        } finally {
            setIsSavingTag(false);
        }
    };

    return (
        <div className="hidden lg:block w-[320px] min-w-[320px] bg-slate-50 dark:bg-void-950 h-full overflow-y-auto slide-in-right border-l border-slate-200 dark:border-white/5 transition-colors duration-300">
            {/* Contact Header */}
            <div className="p-4 text-center border-b border-slate-200 dark:border-white/5">
                <Avatar
                    src={contact?.avatar}
                    name={contact?.name}
                    size="w-16 h-16"
                    className="ring-3 ring-primary-500/20 mx-auto mb-3"
                />

                <div className="flex items-center justify-center gap-1 group min-h-[28px]">
                    {isEditingName ? (
                        <div className="flex items-center gap-1">
                            <input
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                                disabled={isSavingName}
                                className="px-2 py-1 bg-white dark:bg-void-800 rounded outline-none text-sm font-bold w-40 text-center border border-slate-200 dark:border-white/10 focus:border-primary-500/50 text-slate-800 dark:text-white"
                            />
                            <button onClick={handleSaveName} disabled={isSavingName} className="p-1 rounded text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer">
                                <Check size={14} />
                            </button>
                            <button onClick={() => { setIsEditingName(false); setEditedName(contact?.name || ''); }} disabled={isSavingName} className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer">
                                <X size={14} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <h3 className="text-sm font-bold px-1 truncate max-w-[180px] text-slate-800 dark:text-white" title={contact?.name}>
                                {contact?.name}
                            </h3>
                            <button
                                onClick={() => setIsEditingName(true)}
                                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                title={t('Editar nome', 'Edit name')}
                            >
                                <Edit2 size={12} />
                            </button>
                        </>
                    )}
                </div>

                <p className="text-[11px] text-slate-400 dark:text-white/40 mt-1 font-bold">{contact?.phone}</p>
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                    {(ticket?.tags || []).map((tag, i) => (
                        <span key={i} className={`tag-${tag.color} text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1`}>
                            {tag.icon} {tag.label}
                        </span>
                    ))}
                </div>
            </div>

            {/* Accordion Sections */}
            <div data-tour="ai-copilot-section">
                <Accordion title={t('Copiloto IA', 'AI Copilot')} icon={Bot} defaultOpen={true}>
                <AiCopilotPanel
                    ticketId={ticket?.id || null}
                    organizationId={user?.organization?.id ? String(user.organization.id) : null}
                    contactId={ticket?.contact?.id || null}
                    onUseSuggestion={onUseSuggestion}
                    onHintChange={onHintChange}
                    lastIncomingMessageId={lastIncomingMessageId}
                    lastIncomingMessageTicketId={lastIncomingMessageTicketId}
                />
                </Accordion>
            </div>

            <div data-tour="contact-info-section">
                <Accordion title={t('Informações do Contato', 'Contact Info')} icon={User} defaultOpen={true}>
                <div className="space-y-2.5">
                    <div className="flex items-center gap-2.5">
                        <Phone size={14} className="text-slate-400 dark:text-white/40 shrink-0" />
                        <span className="text-xs text-slate-600 dark:text-white/80">{contact?.phone}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Mail size={14} className="text-slate-400 dark:text-white/40 shrink-0" />
                        <span className="text-xs text-slate-600 dark:text-white/80">{contact?.email || t('Nenhum e-mail', 'No email')}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Clock size={14} className="text-slate-400 dark:text-white/40 shrink-0" />
                        <span className="text-xs text-slate-500 dark:text-white/60 text-[10px]">
                            {t('Visto em', 'Seen at')}: {contact?.lastSeen ? new Date(contact.lastSeen).toLocaleString(t('pt-BR', 'en-US'), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : t('Indisponível', 'Unavailable')}
                        </span>
                    </div>
                    {/* Address Block */}
                    <div className="mt-3 group relative border border-transparent hover:border-slate-200 dark:hover:border-white/5 p-1.5 -mx-1.5 rounded-lg transition-colors">
                        {isEditingAddress ? (
                            <div className="flex flex-col gap-1.5">
                                <textarea
                                    value={editedAddress}
                                    maxLength={255}
                                    onChange={(e) => setEditedAddress(e.target.value.substring(0, 255))}
                                    autoFocus
                                    placeholder={t('Digite o endereço...', 'Enter address...')}
                                    disabled={isSavingAddress}
                                    className="w-full px-2.5 py-2 bg-white dark:bg-void-800 rounded-lg outline-none text-xs border border-slate-200 dark:border-white/10 focus:border-primary-500/50 text-slate-800 dark:text-white resize-none h-20 shadow-sm"
                                />
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-[9px] font-bold opacity-30 px-1 dark:text-white/40">
                                        {editedAddress.length} / 255
                                    </span>
                                    <div className="flex gap-1 justify-end">
                                        <button onClick={() => { setIsEditingAddress(false); setEditedAddress(contact?.address || ''); }} disabled={isSavingAddress} className="px-2 py-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-bold transition-colors">
                                            {t('Cancelar', 'Cancel')}
                                        </button>
                                        <button onClick={handleSaveAddress} disabled={isSavingAddress} className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] font-black tracking-widest uppercase transition-colors shadow-lg shadow-emerald-500/20">
                                            {t('Salvar', 'Save')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-2.5">
                                <MapPin size={14} className="text-slate-400 dark:text-white/40 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    {contact?.address ? (
                                        <p className="text-xs text-slate-600 dark:text-white/80 whitespace-pre-wrap leading-relaxed">{contact.address}</p>
                                    ) : (
                                        <span className="text-xs text-slate-400 dark:text-white/40 italic cursor-pointer" onClick={() => setIsEditingAddress(true)}>
                                            + {t('Adicionar endereço', 'Add address')}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setIsEditingAddress(true)}
                                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer bg-slate-100 dark:bg-void-800"
                                    title={t('Editar endereço', 'Edit address')}
                                >
                                    <Edit2 size={12} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </Accordion>
            </div>

            <div data-tour="tags-section">
                <Accordion title={t('Etiquetas Coloridas', 'Colorful Labels')} icon={Tag} defaultOpen={true}>
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {(ticket?.tags || []).map((tag, i) => (
                        <span key={i} className={`tag-${tag.color} text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1`}>
                            {tag.icon} {tag.label}
                            <button
                                onClick={() => handleRemoveTag(tag.label)}
                                disabled={isSavingTag}
                                className="ml-1 opacity-50 hover:opacity-100 transition-opacity cursor-pointer p-0.5 hover:bg-slate-900/10 dark:hover:bg-white/10 rounded"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
                <div className="relative">
                    <button
                        onClick={() => setIsTagMenuOpen(!isTagMenuOpen)}
                        disabled={isSavingTag}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-void-800 border border-slate-200 dark:border-white/5 text-[11px] text-left hover:bg-slate-50 dark:hover:bg-void-700 transition-colors cursor-pointer shadow-sm"
                    >
                        <span className="text-slate-400 dark:text-white/70 font-medium">{t('Adicionar etiqueta...', 'Add label...')}</span>
                        <ChevronDown size={14} className={`text-slate-400 dark:text-white/40 transition-transform ${isTagMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isTagMenuOpen && (
                        <div className="w-full mt-1 bg-white dark:bg-void-800 border border-slate-200 dark:border-white/10 rounded-lg p-1 flex flex-col gap-0.5 max-h-48 overflow-y-auto z-50 shadow-2xl">
                            {allTags.map((tag, i) => {
                                const isSelected = (ticket?.tags || []).some(t => t.label === tag.label);
                                if (isSelected) return null;

                                return (
                                    <button
                                        key={tag.id || i}
                                        onClick={() => handleAddTag(tag)}
                                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 text-left transition-colors cursor-pointer w-full text-slate-700 dark:text-white"
                                    >
                                        <span
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ backgroundColor: tagColorMap[tag.color] || '#6366f1' }}
                                        />
                                        <span className="text-[11px] font-semibold">{tag.icon} {tag.label}</span>
                                    </button>
                                );
                            })}
                            <div className="mt-1 pt-1 border-t border-slate-200 dark:border-white/10">
                                <button
                                    onClick={() => {
                                        setIsTagMenuOpen(false);
                                        setIsManageModalOpen(true);
                                    }}
                                    className="w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-primary-500 dark:text-primary-400 transition-colors cursor-pointer"
                                >
                                    <Plus size={14} /> {t('Gerenciar Etiquetas', 'Manage Labels')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Accordion>
            </div>

            <Accordion title={t('Histórico de Atendimentos', 'Attendance History')} icon={Clock}>
                <div className="space-y-2">
                    {[
                        { id: '#tk_019', date: '25/02/2026', subject: 'Pedido de Insulina', status: 'Resolvido' },
                        { id: '#tk_012', date: '18/02/2026', subject: 'Consulta de preço', status: 'Resolvido' },
                        { id: '#tk_008', date: '10/02/2026', subject: 'Receita vencida', status: 'Resolvido' },
                    ].map((h) => (
                        <div key={h.id} className="p-2.5 rounded-lg bg-white dark:bg-void-900 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-void-800 transition-colors">
                            <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[10px] font-mono text-slate-400 dark:text-white/50">{h.id}</span>
                                <span className="text-[10px] text-slate-400 dark:text-white/40">{h.date}</span>
                            </div>
                            <p className="text-xs font-medium text-slate-700 dark:text-white">{t(h.subject, h.subject === 'Pedido de Insulina' ? 'Insulin Order' : h.subject === 'Consulta de preço' ? 'Price Inquiry' : 'Expired Prescription')}</p>
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">✓ {t('Resolvido', 'Resolved')}</span>
                        </div>
                    ))}
                </div>
            </Accordion>

            <div data-tour="notes-section">
                <Accordion title={t('Notas Internas', 'Internal Notes')} icon={StickyNote}>
                <div className="space-y-2 mb-2">
                    {notes.map((note) => (
                        <div key={note.id} className="p-2.5 rounded-lg bg-white dark:bg-void-900 border border-slate-200 dark:border-white/5">
                            <p className="text-xs leading-relaxed text-slate-700 dark:text-white/90">{note.text}</p>
                            <div className="flex items-center justify-between mt-1.5">
                                <span className="text-[9px] text-slate-400 dark:text-white/40">{note.author}</span>
                                <span className="text-[9px] text-slate-400 dark:text-white/30">{note.time}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex gap-1.5">
                    <input
                        type="text"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addNote()}
                        placeholder={t('Escrever nota...', 'Write note...')}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-void-900 border border-slate-200 dark:border-white/5 text-[11px] outline-none focus:border-primary-500/40 text-slate-700 dark:text-white shadow-sm"
                    />
                    <button onClick={addNote} className="p-1.5 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500/20 transition-colors cursor-pointer border border-primary-500/20">
                        <Plus size={14} />
                    </button>
                </div>
            </Accordion>
            </div>

            <Accordion title={t('Agendamentos', 'Schedules')} icon={CalendarClock}>
                <div className="space-y-2">
                    {schedules
                        .filter((s) => s.contactName === contact?.name)
                        .map((sch) => (
                            <div key={sch.id} className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                                <p className="text-xs font-medium">{sch.message}</p>
                                <div className="flex items-center justify-between mt-1.5">
                                    <span className="text-[10px] text-amber-400 font-semibold">
                                        📅 {new Date(sch.scheduledFor).toLocaleString(t('pt-BR', 'en-US'), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className={`text-[9px] font-semibold ${sch.status === 'pending' ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {sch.status === 'pending' ? t('Pendente', 'Pending') : t('Enviado', 'Sent')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    {schedules.filter((s) => s.contactName === contact?.name).length === 0 && (
                        <p className="text-[11px] text-slate-400 dark:text-white/40 text-center py-2 italic">{t('Nenhum agendamento', 'No schedules')}</p>
                    )}
                </div>
            </Accordion>

            {isManageModalOpen && (
                <ManageTagsModal
                    currentTags={allTags}
                    onTagsChange={onTagsChange || (() => { })}
                    onClose={() => setIsManageModalOpen(false)}
                />
            )}
        </div>
    );
}
