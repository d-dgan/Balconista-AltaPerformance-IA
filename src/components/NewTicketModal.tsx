import { useState, useEffect, useRef } from 'react';
import {
    X,
    Search,
    Phone,
    ChevronDown,
    Plus,
    Loader2,
    MessageSquare,
    Camera as Instagram,
    Globe as Facebook,
    UserPlus,
    Check,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchContacts, createContact } from '../services/api';
import type { Contact } from '../services/api';
import { supabase } from '../services/supabase';
import type { Connection } from '../services/connectionService';
import Avatar from './Avatar';
import { useLanguage } from '../contexts/LanguageContext';

const CHANNEL_ICONS: Record<string, any> = {
    whatsapp: Phone,
    instagram: Instagram,
    messenger: Facebook,
};

interface NewTicketModalProps {
    onClose: () => void;
    onTicketCreated: (ticketId: string) => void;
    orgConnections: Connection[];
    initialContact?: Contact;
}

export default function NewTicketModal({ onClose, onTicketCreated, orgConnections, initialContact }: NewTicketModalProps) {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [selectedConnection, setSelectedConnection] = useState<Connection | null>(
        orgConnections.length === 1 ? orgConnections[0] : null
    );
    const [showConnDropdown, setShowConnDropdown] = useState(false);
    const [searchQuery, setSearchQuery] = useState(initialContact?.name || '');
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(initialContact || null);
    const [phoneInput, setPhoneInput] = useState(initialContact?.phone || '');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Quick contact creation
    const [showQuickCreate, setShowQuickCreate] = useState(false);
    const [quickName, setQuickName] = useState('');
    const [quickPhone, setQuickPhone] = useState('');
    const [quickDdi, setQuickDdi] = useState('55');
    const [isSavingContact, setIsSavingContact] = useState(false);
    const [quickCreateError, setQuickCreateError] = useState('');

    const COUNTRIES = [
        { code: '55', flag: '🇧🇷', label: 'Brasil' },
        { code: '1',  flag: '🇺🇸', label: 'EUA / Canadá' },
        { code: '351', flag: '🇵🇹', label: 'Portugal' },
        { code: '54',  flag: '🇦🇷', label: 'Argentina' },
        { code: '56',  flag: '🇨🇱', label: 'Chile' },
        { code: '57',  flag: '🇨🇴', label: 'Colômbia' },
        { code: '58',  flag: '🇻🇪', label: 'Venezuela' },
        { code: '52',  flag: '🇲🇽', label: 'México' },
        { code: '598', flag: '🇺🇾', label: 'Uruguai' },
        { code: '595', flag: '🇵🇾', label: 'Paraguai' },
        { code: '591', flag: '🇧🇴', label: 'Bolívia' },
        { code: '593', flag: '🇪🇨', label: 'Equador' },
        { code: '51',  flag: '🇵🇪', label: 'Peru' },
        { code: '34',  flag: '🇪🇸', label: 'Espanha' },
        { code: '39',  flag: '🇮🇹', label: 'Itália' },
        { code: '49',  flag: '🇩🇪', label: 'Alemanha' },
        { code: '33',  flag: '🇫🇷', label: 'França' },
        { code: '44',  flag: '🇬🇧', label: 'Reino Unido' },
        { code: '81',  flag: '🇯🇵', label: 'Japão' },
        { code: '86',  flag: '🇨🇳', label: 'China' },
        { code: '91',  flag: '🇮🇳', label: 'Índia' },
        { code: '27',  flag: '🇿🇦', label: 'África do Sul' },
        { code: '234', flag: '🇳🇬', label: 'Nigéria' },
        { code: '973', flag: '🇧🇭', label: 'Bahrein' },
        { code: '966', flag: '🇸🇦', label: 'Arábia Saudita' },
        { code: '971', flag: '🇦🇪', label: 'Emirados Árabes' },
    ];

    // Load contacts on search
    useEffect(() => {
        if (!user?.organization?.id) return;
        const handler = setTimeout(async () => {
            setLoadingContacts(true);
            try {
                const data = await fetchContacts(user.organization!.id, 0, 8, searchQuery, 'all');
                setContacts(data || []);
            } catch { setContacts([]); }
            finally { setLoadingContacts(false); }
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery, user?.organization?.id]);

    // Click outside conn dropdown
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowConnDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSave = async () => {
        if (!selectedConnection) { setError(t('Selecione uma conexão.', 'Select a connection.')); return; }
        const contact = selectedContact;
        const phone = selectedContact?.phone || phoneInput.trim();
        if (!contact && !phoneInput.trim()) { setError(t('Selecione um contato ou informe um número.', 'Select a contact or enter a number.')); return; }

        setIsCreating(true);
        setError('');
        try {
            let contactPhone = phone.replace(/\D/g, '');

            // Create contact if not exists
            let contactId = contact?.id;
            if (!contactId && user?.organization?.id) {
                const newContact = await createContact(user.organization.id, {
                    name: contactPhone,
                    phone: contactPhone,
                    channel: selectedConnection.channel,
                });
                contactId = newContact.id;
            }

            // Create/find ticket via Supabase RPC
            const { data: ticketId, error: rpcError } = await supabase.rpc('process_incoming_message', {
                p_phone: contactPhone,
                p_name: contact?.name || contactPhone,
                p_org_id: user?.organization?.id,
                p_last_msg: t('[Novo atendimento iniciado]', '[New service started]'),
            });

            if (rpcError || !ticketId) throw new Error(t('Falha ao criar ticket.', 'Failed to create ticket.'));

            onTicketCreated(ticketId);
            onClose();
        } catch (err: any) {
            setError(err.message || t('Erro ao criar ticket.', 'Error creating ticket.'));
        } finally {
            setIsCreating(false);
        }
    };

    const handleQuickCreateContact = async () => {
        if (!quickName.trim() || !quickPhone.trim()) {
            setQuickCreateError(t('Preencha o nome e o WhatsApp.', 'Please fill in the name and WhatsApp.'));
            return;
        }
        if (!user?.organization?.id) return;
        setIsSavingContact(true);
        setQuickCreateError('');
        try {
            const cleanPhone = quickDdi + quickPhone.replace(/\D/g, '');
            const newContact = await createContact(user.organization.id, {
                name: quickName.trim(),
                phone: cleanPhone,
                channel: 'whatsapp',
            });
            // Auto-select the newly created contact
            setSelectedContact(newContact);
            setSearchQuery(newContact.name);
            setPhoneInput(newContact.phone || '');
            setShowQuickCreate(false);
            setQuickName('');
            setQuickPhone('');
        } catch (err: any) {
            setQuickCreateError(err.message || t('Erro ao salvar contato.', 'Error saving contact.'));
        } finally {
            setIsSavingContact(false);
        }
    };

    const connChannelBg: Record<string, string> = {
        whatsapp: 'bg-emerald-500/10 text-emerald-400',
        instagram: 'bg-pink-500/10 text-pink-400',
        messenger: 'bg-blue-500/10 text-blue-400',
    };

    return (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4 fade-in">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white dark:bg-[#12121f] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col scale-in overflow-hidden">
                {/* Header */}
                <div className="px-7 pt-7 pb-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center">
                            <Plus size={18} className="text-primary-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-tight">{t('Criar ticket', 'Create ticket')}</h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer">
                        <X size={18} />
                    </button>
                </div>

                <div className="px-7 py-6 space-y-5">
                    {/* Connection Selector */}
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-white/30 block mb-2">
                            {t('Conexões', 'Connections')}
                        </label>
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setShowConnDropdown(!showConnDropdown)}
                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/3 text-sm font-medium text-slate-700 dark:text-white hover:border-primary-500/50 transition-all cursor-pointer"
                            >
                                {selectedConnection ? (
                                    <span className="flex items-center gap-2.5">
                                        {(() => {
                                            const Icon = CHANNEL_ICONS[selectedConnection.channel] || MessageSquare;
                                            return <Icon size={15} className={connChannelBg[selectedConnection.channel]?.split(' ')[1] || 'text-primary-400'} />;
                                        })()}
                                        {selectedConnection.name}
                                    </span>
                                ) : (
                                    <span className="text-slate-400 dark:text-white/20">{t('Selecione a conexão', 'Select connection')}</span>
                                )}
                                <ChevronDown size={16} className={`text-slate-400 dark:text-white/30 transition-transform ${showConnDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {showConnDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] shadow-xl overflow-hidden">
                                    {orgConnections.length === 0 ? (
                                        <p className="px-4 py-3 text-xs text-slate-400 dark:text-white/30">{t('Nenhuma conexão disponível', 'No connections available')}</p>
                                    ) : orgConnections.map((conn) => {
                                        const Icon = CHANNEL_ICONS[conn.channel] || MessageSquare;
                                        const colorClass = connChannelBg[conn.channel] || 'bg-primary-500/10 text-primary-400';
                                        return (
                                            <button
                                                key={conn.id}
                                                onClick={() => { setSelectedConnection(conn); setShowConnDropdown(false); }}
                                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-left cursor-pointer transition-all ${selectedConnection?.id === conn.id ? `${colorClass.split(' ')[0]} font-bold` : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                            >
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorClass.split(' ')[0]}`}>
                                                    <Icon size={14} className={colorClass.split(' ')[1]} />
                                                </div>
                                                <span className="text-slate-700 dark:text-white">{conn.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Contact Search */}
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-white/30 block mb-2">
                            {t('Contato ou Número', 'Contact or Number')}
                        </label>
                        <div className="relative group">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/20 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setPhoneInput(e.target.value);
                                    setSelectedContact(null);
                                }}
                                placeholder={t('Buscar contato ou digitar número...', 'Search contact or type number...')}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/3 text-sm font-medium text-slate-700 dark:text-white outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 placeholder:text-slate-400 dark:placeholder:text-white/20 transition-all"
                                autoFocus
                            />
                        </div>

                        {/* Contact results */}
                        {(contacts.length > 0 || loadingContacts) && !selectedContact && (
                            <div className="mt-2 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-[#1a1a2e] shadow-lg max-h-48 overflow-y-auto">
                                {loadingContacts ? (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader2 size={20} className="animate-spin text-primary-500" />
                                    </div>
                                ) : contacts.map(contact => (
                                    <button
                                        key={contact.id}
                                        onClick={() => { setSelectedContact(contact); setSearchQuery(contact.name); setPhoneInput(contact.phone || ''); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-all"
                                    >
                                        <Avatar src={contact.avatar_url} name={contact.name} size="w-8 h-8" className="rounded-lg shrink-0" />
                                        <div className="text-left min-w-0">
                                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{contact.name}</p>
                                            <p className="text-[11px] text-slate-500 dark:text-white/30 truncate">{contact.phone}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {selectedContact && (
                            <div className="mt-2 flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-500/10 border border-primary-500/20">
                                <Avatar src={selectedContact.avatar_url} name={selectedContact.name} size="w-8 h-8" className="rounded-lg shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-primary-400 truncate">{selectedContact.name}</p>
                                    <p className="text-[11px] text-primary-400/60 truncate">{selectedContact.phone}</p>
                                </div>
                                <button onClick={() => { setSelectedContact(null); setSearchQuery(''); setPhoneInput(''); }} className="p-1 rounded-lg hover:bg-primary-500/20 text-primary-400 cursor-pointer transition-all">
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Quick create contact */}
                    {!selectedContact && (
                        <div className="mt-1">
                            <button
                                type="button"
                                onClick={() => { setShowQuickCreate(v => !v); setQuickCreateError(''); }}
                                className="flex items-center gap-1.5 text-[11px] font-bold text-primary-400 hover:text-primary-300 transition-colors cursor-pointer"
                            >
                                <UserPlus size={13} />
                                {showQuickCreate ? t('Cancelar cadastro', 'Cancel registration') : t('Cadastrar novo contato', 'Register new contact')}
                            </button>

                            {showQuickCreate && (
                                <div className="mt-3 p-4 rounded-xl border border-primary-500/20 bg-primary-500/5 space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-white/30 block mb-1">{t('Nome', 'Name')}</label>
                                            <input
                                                type="text"
                                                value={quickName}
                                                onChange={e => setQuickName(e.target.value)}
                                                placeholder={t('Ex: João Silva', 'Ex: John Doe')}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-800 dark:text-white outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 placeholder:text-slate-400 dark:placeholder:text-white/20 transition-all"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-white/30 block mb-1">{t('WhatsApp', 'WhatsApp')}</label>
                                            <div className="flex gap-1.5">
                                                <select
                                                    value={quickDdi}
                                                    onChange={e => setQuickDdi(e.target.value)}
                                                    className="shrink-0 w-[120px] px-2 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-800 dark:text-white outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all cursor-pointer"
                                                >
                                                    {COUNTRIES.map(c => (
                                                        <option key={c.code} value={c.code}>
                                                            {c.flag} +{c.code}
                                                        </option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="tel"
                                                    value={quickPhone}
                                                    onChange={e => setQuickPhone(e.target.value.replace(/\D/g, ''))}
                                                    placeholder="11999999999"
                                                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-800 dark:text-white outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 placeholder:text-slate-400 dark:placeholder:text-white/20 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    {quickCreateError && (
                                        <p className="text-[11px] text-rose-500 font-semibold">{quickCreateError}</p>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleQuickCreateContact}
                                        disabled={isSavingContact}
                                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary-500 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-primary-600 disabled:opacity-50 transition-all cursor-pointer active:scale-95"
                                    >
                                        {isSavingContact ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                        {isSavingContact ? t('Salvando...', 'Saving...') : t('Salvar contato', 'Save contact')}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <p className="text-xs text-rose-500 font-semibold">{error}</p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-7 py-5 border-t border-slate-200 dark:border-white/5 flex items-center justify-end gap-3 bg-slate-50 dark:bg-white/2">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all cursor-pointer"
                    >
                        {t('Cancelar', 'Cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isCreating || !selectedConnection}
                        className={`px-7 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all cursor-pointer shadow-lg ${isCreating || !selectedConnection
                            ? 'bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-white/20 cursor-not-allowed shadow-none'
                            : 'bg-primary-500 text-white hover:bg-primary-600 shadow-primary-500/25 border border-primary-400/20 active:scale-95'
                            }`}
                    >
                        {isCreating ? <Loader2 size={14} className="animate-spin" /> : t('Salvar', 'Save')}
                    </button>
                </div>
            </div>
        </div>
    );
}
