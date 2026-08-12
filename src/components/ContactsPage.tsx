import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Users,
    Search,
    Upload,
    Phone,
    Mail,
    Tag as TagIcon,
    MessageSquare,
    Loader2,
    Edit2,
    Trash2,
    Save,
    X,
    Camera as Instagram,
    Globe as Facebook,
    Filter,
    UserPlus,
    Zap,
    RefreshCw,
    AlertCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { fetchContacts, createContact, updateContact, deleteContact } from '../services/api';
import type { Tag, Contact } from '../services/api';
import ImportContacts from './ImportContacts';
import TemplateModal from './TemplateModal';
import NewTicketModal from './NewTicketModal';
import Avatar from './Avatar';
import type { Connection } from '../services/connectionService';
import { useTour } from '../contexts/TourContext';

import { useLanguage } from '../contexts/LanguageContext';

/* Small channel badge shown on contact cards */
function ChannelBadge({ channel, label }: { channel: string, label: string }) {
    const { t } = useLanguage();
    
    const CHANNELS_ICONS: Record<string, any> = {
        all: { icon: Users, color: 'text-primary-400', bg: 'bg-primary-500/10' },
        whatsapp: { icon: Phone, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        instagram: { icon: Instagram, color: 'text-pink-400', bg: 'bg-pink-500/10' },
        messenger: { icon: Facebook, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    };

    const ch = CHANNELS_ICONS[channel] || CHANNELS_ICONS.whatsapp;
    const Icon = ch.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg ${ch.bg} ${ch.color} border border-current/10 shadow-sm`}>
            <Icon size={11} />
            {label}
        </span>
    );
}

export default function ContactsPage({ onNavigate }: { onNavigate: (view: string, ticketId?: string) => void }) {
    const { user } = useAuth();
    const { t } = useLanguage();

    const CHANNELS: Record<string, any> = {
        all: { label: t('Todos', 'All'), icon: Users, color: 'text-primary-400', bg: 'bg-primary-500/10' },
        whatsapp: { label: t('WhatsApp', 'WhatsApp'), icon: Phone, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        instagram: { label: t('Instagram', 'Instagram'), icon: Instagram, color: 'text-pink-400', bg: 'bg-pink-500/10' },
        messenger: { label: t('Messenger', 'Messenger'), icon: Facebook, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    };
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [channelFilter, setChannelFilter] = useState('all');
    const [searchError, setSearchError] = useState<string | null>(null);
    const [showImport, setShowImport] = useState(false);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const searchRequestId = useRef(0);

    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState({
        name: '', phone: '', email: '', notes: '',
        instagram_id: '', messenger_id: '', channel: 'whatsapp'
    });
    const [isSaving, setIsSaving] = useState(false);

    // --- Enviar mensagem rápida (Via NewTicketModal) ---
    const [showNewTicketModal, setShowNewTicketModal] = useState(false);

    // --- Criar novo contato ---
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createFormData, setCreateFormData] = useState({
        name: '', phone: '', email: '', notes: '',
        instagram_id: '', messenger_id: '', channel: 'whatsapp' as 'whatsapp' | 'instagram' | 'messenger'
    });
    const [createError, setCreateError] = useState('');

    // --- Enviar Template ---
    const [globalConnection, setGlobalConnection] = useState<Connection | null>(null);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templateTicketId, setTemplateTicketId] = useState<string | null>(null);

    const handleSelectContact = (contact: Contact) => {
        setSelectedContact(contact);
        setIsEditing(false);
        setEditFormData({
            name: contact.name || '',
            phone: contact.phone || '',
            email: contact.email || '',
            notes: contact.notes || '',
            instagram_id: contact.instagram_id || '',
            messenger_id: contact.messenger_id || '',
            channel: contact.channel || 'whatsapp',
        });
    };

    const handleDeleteContact = async () => {
        if (!selectedContact) return;
        if (!window.confirm(t(`Tem certeza que deseja excluir o contato "${selectedContact.name}"?`, `Are you sure you want to delete the contact "${selectedContact.name}"?`))) return;

        try {
            await deleteContact(selectedContact.id);
            setContacts(prev => prev.filter(c => c.id !== selectedContact.id));
            setSelectedContact(null);
            setIsEditing(false);
        } catch (error) {
            console.error("Erro ao deletar contato:", error);
            alert(t("Não foi possível excluir o contato.", "Could not delete contact."));
        }
    };

    const handleSaveContact = async () => {
        if (!selectedContact) return;
        try {
            setIsSaving(true);
            const updated = await updateContact(selectedContact.id, editFormData);
            setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
            setSelectedContact(updated);
            setIsEditing(false);
        } catch (error) {
            console.error("Erro ao atualizar contato:", error);
            alert(t("Não foi possível atualizar o contato.", "Could not update contact."));
        } finally {
            setIsSaving(false);
        }
    };

    // --- Tour Logic ---
    const { currentTour, currentStepIndex, isActive: isTourActive } = useTour();

    useEffect(() => {
        if (isTourActive && currentTour?.id === 'contacts') {
            if (currentStepIndex >= 5) {
                // Mock contact for sidebar steps
                const mockContact: Contact = {
                    id: 'mock-ana-maria',
                    name: 'Dra. Ana Maria (Pediatra)',
                    phone: '5511999998888',
                    email: 'ana.maria@exemplo.com.br',
                    avatar_url: 'https://images.unsplash.com/photo-1559839734-2b71f1536783?q=80&w=2070&auto=format&fit=crop',
                    channel: 'whatsapp',
                    notes: 'Paciente super atenciosa. Prefere genéricos de alta qualidade. Notificar quando chegar o xarope infantil da marca X.',
                    instagram_id: '@dra.anamaria',
                    messenger_id: 'dra.anamaria.messenger',
                    tags: [
                        { label: 'Uso Contínuo', color: 'blue' },
                        { label: 'VIP', color: 'amber', icon: '⭐' }
                    ]
                } as any;

                setContacts(prev => {
                    if (prev.some(c => c.id === mockContact.id)) return prev;
                    return [mockContact, ...prev];
                });

                if (currentStepIndex >= 6 && (!selectedContact || selectedContact.id !== mockContact.id)) {
                    handleSelectContact(mockContact);
                }
            }
        }
    }, [isTourActive, currentTour?.id, currentStepIndex]);

    const handleCreateContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createFormData.name.trim()) { setCreateError(t('O nome é obrigatório.', 'Name is required.')); return; }
        setIsCreating(true);
        setCreateError('');
        try {
            const newContact = await createContact(user?.organization?.id as string, createFormData);
            setContacts(prev => [newContact, ...prev]);
            setShowCreateModal(false);
            setCreateFormData({ name: '', phone: '', email: '', notes: '', instagram_id: '', messenger_id: '', channel: 'whatsapp' });
            handleSelectContact(newContact);
        } catch (err: any) {
            setCreateError(err.message || t('Erro ao criar contato.', 'Error creating contact.'));
        } finally {
            setIsCreating(false);
        }
    };

    const handleOpenQuickMessage = () => {
        if (!selectedContact) return;
        setShowNewTicketModal(true);
    };

    const handleTicketCreated = (ticketId: string) => {
        setShowNewTicketModal(false);
        onNavigate('atendimentos', ticketId);
    };

    // Debounce search query
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Fetch Contacts from Supabase
    const loadContacts = useCallback(async (pageNum: number, isInitial: boolean = false) => {
        if (!user?.organization?.id) return;

        const requestId = ++searchRequestId.current;

        try {
            setSearchError(null);
            if (isInitial) {
                setLoading(true);
                setContacts([]); // Limpa a lista imediatamente em nova busca/filtro
            } else {
                setLoadingMore(true);
            }

            const data = await fetchContacts(
                user.organization.id,
                pageNum,
                16,
                debouncedSearchQuery,
                channelFilter
            );

            // Se uma nova busca foi iniciada enquanto esta carregava, ignore o resultado
            if (requestId !== searchRequestId.current) return;

            if (data) {
                if (isInitial) {
                    setContacts(data);
                } else {
                    setContacts(prev => [...prev, ...data]);
                }
                setHasMore(data.length === 16);
            }
        } catch (error: any) {
            if (requestId !== searchRequestId.current) return;
            console.error("Erro ao buscar contatos:", error);
            setSearchError(t("Erro ao consultar o banco de dados.", "Error querying database."));
            if (isInitial) setContacts([]);
        } finally {
            if (requestId === searchRequestId.current) {
                setLoading(false);
                setLoadingMore(false);
            }
        }
    }, [user?.organization?.id, debouncedSearchQuery, channelFilter]);

    useEffect(() => {
        setPage(0);
        loadContacts(0, true);
    }, [debouncedSearchQuery, channelFilter, loadContacts]);

    // Infinite Scroll Observer
    const observer = useRef<IntersectionObserver | null>(null);
    const lastContactRef = useCallback((node: HTMLDivElement) => {
        if (loading || loadingMore) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prev => {
                    const nextPage = prev + 1;
                    loadContacts(nextPage);
                    return nextPage;
                });
            }
        });

        if (node) observer.current.observe(node);
    }, [loading, loadingMore, hasMore, loadContacts]);

    const [connections, setConnections] = useState<Connection[]>([]);

    useEffect(() => {
        const loadConn = async () => {
            if (!user?.organization?.id) return;
            try {
                const connService = await import('../services/connectionService');
                const { data: conns } = await connService.listOrgConnections(user?.organization?.id as string);
                if (conns && conns.length > 0) {
                    setConnections(conns);
                    setGlobalConnection(conns.find(c => c.channel === 'whatsapp') || null);
                }
            } catch (err) { }
        };
        loadConn();
    }, [user?.organization?.id]);

    const handleSwitchToTemplate = async () => {
        if (!selectedContact) return;
        try {
            const { data: ticketId } = await supabase.rpc('process_incoming_message', {
                p_phone: selectedContact.phone,
                p_name: selectedContact.name || t('Contato', 'Contact'),
                p_org_id: user?.organization?.id,
                p_last_msg: t('[Nova Conversa Iniciada / Template]', '[New Conversation Started / Template]')
            });
            if (ticketId) {
                setTemplateTicketId(ticketId);
                setShowNewTicketModal(false);
                setShowTemplateModal(true);
            }
        } catch (err) {
            console.error('Erro ao preparar template:', err);
        }
    };

    // Channel counts for filter pills (Note: these will only count loaded contacts now)
    const channelCounts: Record<string, number> = {
        all: contacts.length,
        whatsapp: contacts.filter(c => (c.channel || 'whatsapp') === 'whatsapp').length,
        instagram: contacts.filter(c => c.channel === 'instagram').length,
        messenger: contacts.filter(c => c.channel === 'messenger').length,
    };

    return (
        <div className="flex-1 flex h-full fade-in bg-slate-50 dark:bg-[#0c0c11]/50">
            {/* Contact List */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="p-8 pb-5">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-2xl bg-primary-500/10 flex items-center justify-center">
                                    <Users size={22} className="text-primary-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight" data-tour="contacts-title">{t('Agenda Corporativa', 'Corporate Agenda')}</h2>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-white/40 font-medium uppercase tracking-[0.2em]">{contacts.length} {t('contatos sincronizados', 'synchronized contacts')}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/10 transition-all cursor-pointer text-slate-600 dark:text-white/80 shadow-sm dark:shadow-none"
                                data-tour="new-contact-button"
                            >
                                <UserPlus size={16} />
                                {t('Novo Registro', 'New Record')}
                            </button>
                            <button
                                onClick={() => setShowImport(true)}
                                className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-primary-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-primary-600 transition-all cursor-pointer shadow-xl shadow-primary-500/25 border border-primary-400/20"
                                data-tour="import-csv-button"
                            >
                                <Upload size={16} />
                                {t('Importar CSV', 'Import CSV')}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1 group">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/20 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t("Pequise por nome, telefone, email ou redes sociais...", "Search by name, phone, email or social networks...")}
                                className="w-full pl-12 pr-6 py-4 rounded-[1.25rem] bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 text-sm text-slate-800 dark:text-white font-medium outline-none focus:ring-1 focus:ring-primary-500/40 placeholder:text-slate-400 dark:placeholder:text-white/20 transition-all shadow-sm dark:shadow-none"
                                data-tour="contacts-search"
                            />
                        </div>

                        <div className="flex items-center gap-2 px-2" data-tour="channel-filters">
                            {Object.entries(CHANNELS).map(([key, ch]) => {
                                const Icon = ch.icon;
                                const isActive = channelFilter === key;
                                const count = channelCounts[key] || 0;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => setChannelFilter(key)}
                                        className={`flex items-center gap-2.5 px-4 py-3.5 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all cursor-pointer border ${isActive
                                            ? `${ch.bg} ${ch.color} border-current/20 ring-1 ring-current/10 shadow-lg`
                                            : 'bg-white dark:bg-white/3 text-slate-500 dark:text-white/30 border-slate-200 dark:border-transparent shadow-sm dark:shadow-none hover:bg-slate-50 dark:hover:bg-white/8 hover:text-slate-700 dark:hover:text-white/60'
                                            }`}
                                    >
                                        <Icon size={14} />
                                        {ch.label}
                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${isActive ? 'bg-current/10' : 'bg-slate-100 dark:bg-white/5'}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Contact Grid */}
                <div className="flex-1 overflow-y-auto px-8 pb-8 scrollbar-thin">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <div key={i} className="h-44 rounded-3xl bg-slate-100 dark:bg-white/5 animate-pulse border border-slate-200 dark:border-white/5" />
                            ))}
                        </div>
                    ) : contacts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 opacity-20 italic">
                            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-6">
                                <Users size={40} />
                            </div>
                            <p className="text-lg font-bold tracking-widest uppercase">
                                {searchError ? t("Erro na busca", "Search error") : t("Nenhum resultado encontrado", "No results found")}
                            </p>
                            {searchError && <p className="text-xs mt-2 opacity-50 not-italic uppercase tracking-wider">{searchError}</p>}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                            {contacts.map((contact, index) => (
                                <div
                                    key={contact.id}
                                    ref={index === contacts.length - 1 ? lastContactRef : null}
                                    onClick={() => handleSelectContact(contact)}
                                    className={`group relative p-6 rounded-4xl cursor-pointer transition-all duration-300 border ${selectedContact?.id === contact.id
                                        ? 'bg-primary-500/10 border-primary-500/30 ring-1 ring-primary-500/20 shadow-2xl'
                                        : 'bg-white dark:bg-black/40 border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none hover:border-slate-300 dark:hover:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 hover:translate-y-[-4px]'
                                        }`}
                                    data-tour={index === 0 ? "contact-card-v1" : undefined}
                                >
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="relative">
                                            <Avatar
                                                src={contact.avatar_url}
                                                name={contact.name}
                                                size="w-14 h-14"
                                                className="ring-[3px] ring-slate-100 dark:ring-white/5 shadow-xl rounded-2xl"
                                            />
                                            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center border-2 border-white dark:border-[#161623] shadow-lg ${CHANNELS[contact.channel || 'whatsapp'].bg} ${CHANNELS[contact.channel || 'whatsapp'].color}`}>
                                                {(() => {
                                                    const Icon = CHANNELS[contact.channel || 'whatsapp'].icon;
                                                    return <Icon size={12} />;
                                                })()}
                                            </div>
                                        </div>
                                        <div className="min-w-0 flex-1 pt-1">
                                            <h3 className="text-[15px] font-bold text-slate-800 dark:text-white truncate leading-tight group-hover:text-primary-400 transition-colors uppercase tracking-tight">{contact.name}</h3>
                                            {contact.phone && (
                                                <p className="text-[11px] text-slate-500 dark:text-white/30 font-bold mt-1 tracking-wider">
                                                    {contact.phone}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex flex-wrap gap-2">
                                            {(contact.tags || []).map((tag: any, i) => (
                                                <span key={i} className={`tag-${tag.color || 'blue'} text-[9px] font-black px-2 py-1 rounded-lg uppercase border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-transparent shadow-sm`}>
                                                    {tag.icon && <span className="mr-1">{tag.icon}</span>}
                                                    {tag.label || tag}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-3 opacity-30 group-hover:opacity-60 transition-opacity">
                                            {contact.email && <Mail size={12} className="text-slate-400 dark:text-white" />}
                                            {contact.instagram_id && <Instagram size={12} className="text-pink-400" />}
                                            {contact.messenger_id && <Facebook size={12} className="text-blue-400" />}
                                        </div>
                                    </div>

                                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all translate-x-3 group-hover:translate-x-0">
                                        <Zap size={14} className="text-primary-400 animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {loadingMore && (
                        <div className="flex justify-center py-8">
                            <Loader2 size={32} className="text-primary-500 animate-spin" />
                        </div>
                    )}
                </div>
            </div>

            {/* Contact Detail Sidebar */}
            {selectedContact && (
                <div className="w-[380px] min-w-[380px] bg-white dark:bg-[#0c0c11] border-l border-slate-200 dark:border-white/5 h-full flex flex-col slide-in-right relative overflow-hidden shadow-[-20px_0_50px_rgba(0,0,0,0.05)] dark:shadow-[-20px_0_50px_rgba(0,0,0,0.5)]" data-tour="contact-sidebar">
                    {/* Background Glow */}
                    <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary-500/5 rounded-full blur-[100px]" />

                    {/* Header Actions */}
                    <div className="relative z-10 flex justify-end gap-3 p-6 pb-2" data-tour="contact-actions">
                        {!isEditing ? (
                            <>
                                <button onClick={() => setIsEditing(true)} className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:bg-primary-500/10 dark:hover:bg-primary-500/20 hover:text-primary-500 dark:hover:text-primary-400 hover:border-primary-500/30 transition-all text-slate-400 dark:text-white/40 cursor-pointer" title="Editar">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={handleDeleteContact} className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:bg-rose-500/10 dark:hover:bg-rose-500/20 hover:text-rose-500 dark:hover:text-rose-400 hover:border-rose-500/30 transition-all text-slate-400 dark:text-white/40 cursor-pointer" title="Excluir">
                                    <Trash2 size={16} />
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setIsEditing(false)} className="px-4 py-2 flex items-center justify-center bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-white/60 cursor-pointer">
                                    {t('Cancelar', 'Cancel')}
                                </button>
                                <button onClick={handleSaveContact} disabled={isSaving} className="px-6 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all disabled:opacity-50 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-primary-500/25 cursor-pointer">
                                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    {t('Salvar', 'Save')}
                                </button>
                            </>
                        )}
                        <button onClick={() => setSelectedContact(null)} className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/15 transition-all text-slate-400 dark:text-white/40 cursor-pointer ml-auto">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="relative z-10 flex-1 overflow-y-auto p-8 pt-4 scrollbar-thin">
                        <div className="text-center mb-10">
                            <div className="relative inline-block mb-6">
                                <Avatar
                                    src={selectedContact.avatar_url}
                                    name={selectedContact.name}
                                    size="w-32 h-32"
                                    className="ring-[6px] ring-primary-500/20 dark:ring-primary-500/10 shadow-3xl rounded-[2.5rem]"
                                />
                                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl flex items-center justify-center border-4 border-white dark:border-[#0c0c11] shadow-2xl bg-primary-500 text-white" data-tour="contact-avatar-identity">
                                    <Users size={18} />
                                </div>
                            </div>

                            {isEditing ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <input
                                        type="text"
                                        value={editFormData.name}
                                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                        className="w-full text-center text-xl font-bold bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 outline-none focus:ring-1 focus:ring-primary-500/40 text-slate-800 dark:text-white tracking-tight"
                                        placeholder={t("Nome do contato", "Contact name")}
                                    />
                                    <div className="grid grid-cols-3 gap-2">
                                        {['whatsapp', 'instagram', 'messenger'].map(ch => {
                                            const cfg = CHANNELS[ch];
                                            const Icon = cfg.icon;
                                            const isActive = editFormData.channel === ch;
                                            return (
                                                <button
                                                    key={ch}
                                                    type="button"
                                                    onClick={() => setEditFormData({ ...editFormData, channel: ch })}
                                                    className={`flex flex-col items-center gap-2 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border ${isActive
                                                        ? `${cfg.bg} ${cfg.color} border-current/20 ring-1 ring-current/10`
                                                        : 'bg-slate-50 dark:bg-white/3 text-slate-400 dark:text-white/20 border-transparent hover:bg-slate-100 dark:hover:bg-white/8'
                                                        }`}
                                                >
                                                    <Icon size={14} />
                                                    {cfg.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight uppercase">{selectedContact.name}</h3>
                                    <div className="flex justify-center flex-wrap gap-2">
                                        <ChannelBadge channel={selectedContact.channel || 'whatsapp'} label={CHANNELS[selectedContact.channel || 'whatsapp'].label} />
                                        {(selectedContact.tags || []).map((tag: any, i) => (
                                            <span key={i} className={`tag-${tag.color || 'blue'} text-[9px] font-black px-2 py-1 rounded-lg uppercase border border-slate-200 dark:border-white/5`}>
                                                {tag.label || tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {!isEditing && selectedContact.phone && (
                            <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-500" data-tour="quick-message-contact">
                                <button
                                    onClick={handleOpenQuickMessage}
                                    className="w-full py-4 rounded-[1.25rem] text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 cursor-pointer transition-all bg-emerald-500 text-white hover:bg-emerald-600 shadow-xl shadow-emerald-500/25 border border-emerald-400/20 active:scale-95"
                                >
                                    <MessageSquare size={18} />
                                    {t('Enviar Mensagem Rapidamente', 'Send Message Quickly')}
                                </button>
                            </div>
                        )}

                        <div className="space-y-6">
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-white/20 flex items-center gap-4" data-tour="contact-info-sections">
                                {t('Informações de Contato', 'Contact Information')}
                                <div className="flex-1 h-px bg-slate-200 dark:bg-white/5" />
                            </h4>

                            <div className="grid gap-4">
                                {/* Phone */}
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/3 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-3 mb-2 font-bold uppercase tracking-widest text-[10px] text-slate-400 dark:text-white/30">
                                        <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                            <Phone size={12} className="text-emerald-400" />
                                        </div>
                                        {t('WhatsApp / Telefone', 'WhatsApp / Phone')}
                                    </div>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editFormData.phone}
                                            onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                            className="w-full text-sm font-bold bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-primary-500/50 text-slate-800 dark:text-white"
                                            placeholder="+55 11 99999-9999"
                                        />
                                    ) : (
                                        <p className="text-sm font-bold text-slate-700 dark:text-white/90 ml-9">{selectedContact.phone || '—'}</p>
                                    )}
                                </div>

                                {/* Instagram ID */}
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/3 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-3 mb-2 font-bold uppercase tracking-widest text-[10px] text-slate-400 dark:text-white/30">
                                        <div className="w-6 h-6 rounded-lg bg-pink-500/10 flex items-center justify-center">
                                            <Instagram size={12} className="text-pink-400" />
                                        </div>
                                        {t('Instagram Personalizado', 'Custom Instagram')}
                                    </div>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editFormData.instagram_id}
                                            onChange={(e) => setEditFormData({ ...editFormData, instagram_id: e.target.value })}
                                            className="w-full text-sm font-bold bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-primary-500/50 text-slate-800 dark:text-white"
                                            placeholder="@id_do_usuario"
                                        />
                                    ) : (
                                        <p className="text-sm font-bold text-slate-700 dark:text-white/90 ml-9">{selectedContact.instagram_id || '—'}</p>
                                    )}
                                </div>

                                {/* Facebook / Messenger */}
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/3 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-3 mb-2 font-bold uppercase tracking-widest text-[10px] text-slate-400 dark:text-white/30">
                                        <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                            <Facebook size={12} className="text-blue-400" />
                                        </div>
                                        {t('Facebook Messenger ID', 'Facebook Messenger ID')}
                                    </div>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editFormData.messenger_id}
                                            onChange={(e) => setEditFormData({ ...editFormData, messenger_id: e.target.value })}
                                            className="w-full text-sm font-bold bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-primary-500/50 text-slate-800 dark:text-white"
                                            placeholder="PSID - Page Scoped ID"
                                        />
                                    ) : (
                                        <p className="text-sm font-bold text-slate-700 dark:text-white/90 ml-9">{selectedContact.messenger_id || '—'}</p>
                                    )}
                                </div>

                                {/* Email */}
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/3 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-3 mb-2 font-bold uppercase tracking-widest text-[10px] text-slate-400 dark:text-white/30">
                                        <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                            <Mail size={12} className="text-indigo-400" />
                                        </div>
                                        {t('E-mail de Contato', 'Contact Email')}
                                    </div>
                                    {isEditing ? (
                                        <input
                                            type="email"
                                            value={editFormData.email}
                                            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                            className="w-full text-sm font-bold bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 outline-none focus:border-primary-500/50 text-slate-800 dark:text-white"
                                            placeholder="contato@empresa.com"
                                        />
                                    ) : (
                                        <p className="text-sm font-bold text-slate-700 dark:text-white/90 ml-9">{selectedContact.email || '—'}</p>
                                    )}
                                </div>

                                {/* Notes */}
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/3 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors col-span-1" data-tour="contact-notes-crm">
                                    <div className="flex items-center gap-3 mb-2 font-bold uppercase tracking-widest text-[10px] text-slate-400 dark:text-white/30">
                                        <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                            <MessageSquare size={12} className="text-amber-400" />
                                        </div>
                                        {t('Anotações Internas', 'Internal Notes')}
                                    </div>
                                    {isEditing ? (
                                        <textarea
                                            value={editFormData.notes}
                                            onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                                            className="w-full text-xs font-medium bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-3 outline-none focus:border-primary-500/50 text-slate-800 dark:text-white min-h-[120px] resize-none"
                                            placeholder={t("Detalhes relevantes sobre o atendimento deste contato...", "Relevant details about this contact's service...")}
                                        />
                                    ) : (
                                        <p className="text-xs font-medium text-slate-500 dark:text-white/50 ml-9 leading-relaxed italic">
                                            {selectedContact.notes ? `"${selectedContact.notes}"` : t('Sem anotações registradas.', 'No notes recorded.')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImport && <ImportContacts onClose={() => setShowImport(false)} />}

            {/* Create Contact Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-110 flex items-center justify-center p-4 fade-in">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => { setShowCreateModal(false); setCreateError(''); }} />
                    <form onSubmit={handleCreateContact} className="relative w-full max-w-lg bg-white dark:bg-transparent glass-panel rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-3xl flex flex-col max-h-[90vh] overflow-hidden scale-in">
                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-primary-500/10 flex items-center justify-center">
                                    <UserPlus size={20} className="text-primary-400" />
                                </div>
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-widest">{t('Novo Registro de Contato', 'New Contact Record')}</h2>
                            </div>
                            <button type="button" onClick={() => { setShowCreateModal(false); setCreateError(''); }} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin">
                            {createError && (
                                <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs animate-shake">
                                    <AlertCircle size={16} className="shrink-0 text-rose-500 dark:text-rose-400" />
                                    <span className="font-medium">{createError}</span>
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] text-slate-500 dark:text-white/30 font-bold uppercase tracking-[0.25em] block mb-3">{t('Canal de Origem', 'Source Channel')}</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {(['whatsapp', 'instagram', 'messenger'] as const).map(ch => {
                                        const cfg = CHANNELS[ch];
                                        const Icon = cfg.icon;
                                        const isActive = createFormData.channel === ch;
                                        return (
                                            <button key={ch} type="button"
                                                onClick={() => setCreateFormData({ ...createFormData, channel: ch })}
                                                className={`flex flex-col items-center gap-2 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border ${isActive ? `${cfg.bg} ${cfg.color} border-current/20 ring-1 ring-current/10 shadow-lg` : 'bg-slate-50 dark:bg-white/3 text-slate-400 dark:text-white/20 border-slate-200 dark:border-transparent hover:bg-slate-100 dark:hover:bg-white/8 hover:text-slate-600 dark:hover:text-white/40'}`}>
                                                <Icon size={18} />{cfg.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="grid gap-5 mt-5">
                                    <div>
                                        <label className="text-[10px] text-slate-500 dark:text-white/30 font-bold uppercase tracking-[0.25em] block mb-2">{t('Nome Completo *', 'Full Name *')}</label>
                                        <input required value={createFormData.name}
                                            onChange={e => setCreateFormData({ ...createFormData, name: e.target.value })}
                                            placeholder={t("Assinatura ou Nome do Cliente", "Signature or Client Name")} className="w-full px-5 py-3.5 rounded-2xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 text-sm text-slate-800 dark:text-white font-medium outline-none focus:ring-1 focus:ring-primary-500/40 placeholder:text-slate-400 dark:placeholder:text-white/10 shadow-sm dark:shadow-none" />
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-slate-500 dark:text-white/30 font-bold uppercase tracking-[0.25em] block mb-2">{t('WhatsApp / Telefone', 'WhatsApp / Phone')}</label>
                                        <input value={createFormData.phone}
                                            onChange={e => setCreateFormData({ ...createFormData, phone: e.target.value })}
                                            placeholder="+55 11 99999-9999" className="w-full px-5 py-3.5 rounded-2xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 text-sm text-slate-800 dark:text-white font-medium outline-none focus:ring-1 focus:ring-primary-500/40 placeholder:text-slate-400 dark:placeholder:text-white/10 shadow-sm dark:shadow-none" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] text-slate-500 dark:text-white/30 font-bold uppercase tracking-[0.25em] block mb-2">{t('Instagram @', 'Instagram @')}</label>
                                            <input value={createFormData.instagram_id}
                                                onChange={e => setCreateFormData({ ...createFormData, instagram_id: e.target.value })}
                                                placeholder="@username" className="w-full px-5 py-3.5 rounded-2xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 text-sm text-slate-800 dark:text-white font-medium outline-none focus:ring-1 focus:ring-primary-500/40 placeholder:text-slate-400 dark:placeholder:text-white/10 shadow-sm dark:shadow-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-500 dark:text-white/30 font-bold uppercase tracking-[0.25em] block mb-2">{t('Messenger ID', 'Messenger ID')}</label>
                                            <input value={createFormData.messenger_id}
                                                onChange={e => setCreateFormData({ ...createFormData, messenger_id: e.target.value })}
                                                placeholder="PSID" className="w-full px-5 py-3.5 rounded-2xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 text-sm text-slate-800 dark:text-white font-medium outline-none focus:ring-1 focus:ring-primary-500/40 placeholder:text-slate-400 dark:placeholder:text-white/10 shadow-sm dark:shadow-none" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-slate-500 dark:text-white/30 font-bold uppercase tracking-[0.25em] block mb-2">{t('Email', 'Email')}</label>
                                        <input type="email" value={createFormData.email}
                                            onChange={e => setCreateFormData({ ...createFormData, email: e.target.value })}
                                            placeholder="email@exemplo.com" className="w-full px-5 py-3.5 rounded-2xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 text-sm text-slate-800 dark:text-white font-medium outline-none focus:ring-1 focus:ring-primary-500/40 placeholder:text-slate-400 dark:placeholder:text-white/10 shadow-sm dark:shadow-none" />
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-slate-500 dark:text-white/30 font-bold uppercase tracking-[0.25em] block mb-2">{t('Notas e Observações', 'Notes and Observations')}</label>
                                        <textarea value={createFormData.notes} rows={4}
                                            onChange={e => setCreateFormData({ ...createFormData, notes: e.target.value })}
                                            placeholder={t("Informações relevantes para o primeiro contato...", "Relevant information for the first contact...")} className="w-full px-5 py-3.5 rounded-2xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5 text-sm text-slate-800 dark:text-white font-medium outline-none focus:ring-1 focus:ring-primary-500/40 resize-none placeholder:text-slate-400 dark:placeholder:text-white/10 shadow-sm dark:shadow-none" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2">
                            <button type="submit" disabled={isCreating}
                                className="w-full py-4 rounded-2xl text-[11px] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 transition-all bg-primary-500 text-white shadow-xl shadow-primary-500/25 border border-primary-400/20 active:scale-[0.98]">
                                {isCreating ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                                {isCreating ? t('Sincronizando...', 'Synchronizing...') : t('Confirmar Registro', 'Confirm Record')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* New Ticket Modal Integration */}
            {showNewTicketModal && selectedContact && (
                <NewTicketModal
                    orgConnections={connections}
                    onClose={() => setShowNewTicketModal(false)}
                    onTicketCreated={handleTicketCreated}
                    initialContact={selectedContact}
                />
            )}

            {/* Template Modal Integration */}
            {
                showTemplateModal && selectedContact && (
                    <TemplateModal
                        isOpen={showTemplateModal}
                        onClose={() => setShowTemplateModal(false)}
                        connection={globalConnection}
                        contactPhone={selectedContact.phone || ''}
                        ticketId={templateTicketId || ''}
                        user={user}
                        onTemplateSent={() => {
                            // Sucesso tratado internamente ou com toast de notificação
                        }}
                    />
                )
            }
        </div >
    );
}
