import { useState, useEffect } from 'react';
import { X, Plus, Tag as TagIcon, Trash2, Check, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';
import type { Tag } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const COLORS = (t: any) => [
    { name: 'blue', label: t('Azul', 'Blue'), hex: '#6366f1' },
    { name: 'green', label: t('Verde', 'Green'), hex: '#10b981' },
    { name: 'amber', label: t('Âmbar', 'Amber'), hex: '#f59e0b' },
    { name: 'rose', label: t('Rosa', 'Rose'), hex: '#f43f5e' },
    { name: 'purple', label: t('Roxo', 'Purple'), hex: '#8b5cf6' },
    { name: 'cyan', label: t('Ciano', 'Cyan'), hex: '#06b6d4' },
    { name: 'pink', label: t('Pink', 'Pink'), hex: '#ec4899' },
    { name: 'orange', label: t('Laranja', 'Orange'), hex: '#f97316' },
    { name: 'emerald', label: t('Esmeralda', 'Emerald'), hex: '#10b981' },
    { name: 'gray', label: t('Cinza', 'Gray'), hex: '#6b7280' },
    { name: 'slate', label: t('Ardosia', 'Slate'), hex: '#64748b' },
    { name: 'teal', label: t('Azul Petróleo', 'Teal'), hex: '#14b8a6' },
    { name: 'indigo', label: t('Índigo', 'Indigo'), hex: '#4f46e5' },
    { name: 'violet', label: t('Violeta', 'Violet'), hex: '#8b5cf6' },
];

interface ManageTagsModalProps {
    onClose: () => void;
    currentTags: Tag[];
    onTagsChange: (tags: Tag[]) => void;
}

export default function ManageTagsModal({ onClose, currentTags, onTagsChange }: ManageTagsModalProps) {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);
    
    const colors = COLORS(t);

    // New Tag Form State
    const [isCreating, setIsCreating] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const [newIcon, setNewIcon] = useState('🏷️');
    const [newColor, setNewColor] = useState(colors[0].name);

    // Prevent scrolling when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const handleCreateTag = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLabel.trim()) return;

        setIsLoading(true);
        try {
            const addedTag = await api.createTag({
                organization_id: user?.organization?.id as string,
                label: newLabel.trim(),
                icon: newIcon.trim(),
                color: newColor
            });
            onTagsChange([...currentTags, addedTag]);

            // Reset form
            setNewLabel('');
            setNewIcon('🏷️');
            setIsCreating(false);
        } catch (error) {
            console.error('Error creating tag:', error);
            alert(t('Erro ao criar etiqueta. Tente novamente.', 'Error creating tag. Please try again.'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteTag = async (tagId: string) => {
        if (!window.confirm(t('Tem certeza que deseja excluir esta etiqueta? Ela não será removida dos tickets antigos, mas não aparecerá mais na lista.', 'Are you sure you want to delete this tag? It will not be removed from old tickets, but will no longer appear in the list.'))) return;

        setIsLoading(true);
        try {
            await api.deleteTag(tagId);
            onTagsChange(currentTags.filter(t => t.id !== tagId));
        } catch (error) {
            console.error('Error deleting tag:', error);
            alert(t('Erro ao excluir etiqueta. Tente novamente.', 'Error deleting tag. Please try again.'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Box */}
            <div className="relative w-full max-w-lg mx-4 rounded-xl glass-panel shadow-2xl flex flex-col max-h-[85vh] scale-in">

                {/* Header */}
                <div className="px-5 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                            <TagIcon size={16} className="text-primary-400" />
                        </div>
                        <div>
                            <h2 className="text-[15px] font-bold">{t('Gerenciar Etiquetas', 'Manage Tags')}</h2>
                            <p className="text-xs opacity-50 font-medium italic"> {t('Organize seus contatos com rótulos visuais', 'Organize your contacts with visual labels')}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors opacity-40 hover:opacity-100 cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">

                    {/* Create New Toggle */}
                    {!isCreating ? (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="w-full flex items-center justify-center gap-2 p-4 border border-dashed border-white/15 rounded-2xl hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-widest opacity-60 hover:opacity-100 cursor-pointer mb-6"
                        >
                            <Plus size={16} /> {t('Criar Nova Etiqueta', 'Create New Tag')}
                        </button>
                    ) : (
                        <form onSubmit={handleCreateTag} className="mb-6 p-5 rounded-2xl glass-surface border border-primary-500/30 animate-in slide-in-from-top-2">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-4">{t('Configurar Etiqueta', 'Configure Tag')}</h3>

                            <div className="flex gap-4 mb-4">
                                <div className="w-20">
                                    <label className="block text-[10px] font-bold opacity-30 mb-1.5 uppercase tracking-wider">{t('Emoji', 'Emoji')}</label>
                                    <input
                                        type="text"
                                        value={newIcon}
                                        onChange={(e) => setNewIcon(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 outline-none focus:border-primary-500/50 text-center text-xl shadow-inner"
                                        maxLength={3}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold opacity-30 mb-1.5 uppercase tracking-wider">{t('Identificação', 'Identification')}</label>
                                    <input
                                        type="text"
                                        value={newLabel}
                                        onChange={(e) => setNewLabel(e.target.value)}
                                        placeholder={t('VIP, Urgente, etc', 'VIP, Urgent, etc')}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 outline-none focus:border-primary-500/50 text-sm font-medium"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <label className="block text-[10px] font-bold opacity-30 mb-2 uppercase tracking-wider">{t('Cor da Marcação', 'Marker Color')}</label>
                            <div className="grid grid-cols-7 gap-2 mb-6">
                                {colors.map((color) => (
                                    <button
                                        key={color.name}
                                        type="button"
                                        onClick={() => setNewColor(color.name)}
                                        className={`w-full aspect-square rounded-full flex items-center justify-center transition-all cursor-pointer border ${newColor === color.name ? 'ring-2 ring-white/70 scale-110 shadow-lg' : 'opacity-40 hover:opacity-100 border-transparent hover:scale-105'}`}
                                        style={{ backgroundColor: color.hex }}
                                        title={color.label}
                                    >
                                        {newColor === color.name && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}
                                    </button>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="px-4 py-2 text-[10px] font-bold opacity-40 hover:opacity-100 hover:bg-white/5 rounded-xl cursor-pointer transition-all uppercase tracking-widest"
                                >
                                    {t('Cancelar', 'Cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || !newLabel.trim()}
                                    className="px-5 py-2 text-[10px] font-bold bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/25 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest"
                                >
                                    {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                    {t('Finalizar', 'Finalize')}
                                </button>
                            </div>
                        </form>
                    )}

                    <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-30 mb-4 flex items-center gap-2">
                        {t('Listagem Atual', 'Current List')}
                        <div className="flex-1 h-px bg-white/5" />
                    </h3>

                    <div className="space-y-2">
                        {currentTags.length === 0 && !isLoading ? (
                            <div className="flex flex-col items-center py-10 opacity-20 italic">
                                <TagIcon size={32} className="mb-2" />
                                <p className="text-xs font-medium">{t('Nenhuma etiqueta cadastrada', 'No tags registered')}</p>
                            </div>
                        ) : (
                            currentTags.map((tag: any) => (
                                <div key={tag.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all group border border-transparent hover:border-white/5">
                                    <div className="flex items-center">
                                        <span className={`tag-${tag.color} px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-2 border border-white/10 cursor-default shadow-sm uppercase tracking-tight`}>
                                            {tag.icon && <span className="text-sm">{tag.icon}</span>} {tag.label}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteTag(tag.id)}
                                        disabled={isLoading}
                                        className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 opacity-0 group-hover:opacity-100 transition-all cursor-pointer disabled:opacity-50"
                                        title={t('Remover', 'Remove')}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="p-5 border-t border-white/5">
                    <button
                        onClick={onClose}
                        className="w-full py-3 text-xs font-bold bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all cursor-pointer border border-white/5 uppercase tracking-widest"
                    >
                        {t('Concluir e Voltar', 'Finish and Go Back')}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Loader2({ size, className }: { size: number, className: string }) {
    return <RefreshCw size={size} className={className} />;
}
