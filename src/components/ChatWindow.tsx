import { useState, useRef, useEffect, useMemo } from 'react';
import {
    ArrowLeftRight,
    CheckCircle2,
    Paperclip,
    Smile,
    Mic,
    Send,
    CalendarClock,
    ImageIcon,
    FileText,
    Play,
    Download,
    X,
    Hourglass,
    Volume2,
    Clock,
    Zap,
    ChevronRight,
    ChevronLeft,
    MessageSquare,
    Edit2,
    Trash2,
    CornerUpLeft,
    UserPlus,
    Sparkles,
    Forward,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import * as ticketService from '../services/ticketService';
import * as n8nService from '../services/n8n';
import TemplateModal from './TemplateModal';
import Avatar from './Avatar';
import type { TicketExtended } from './AtendimentosPage';
import type { Connection } from '../services/connectionService';

const TRAINING_MESSAGES: Message[] = [
    {
        id: 'tm_1',
        sender: 'contact',
        type: 'text',
        content: 'Bom dia! Vocês têm a insulina Lantus disponível?',
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    },
    {
        id: 'tm_2',
        sender: 'agent',
        type: 'text',
        senderName: 'IA Copilot',
        content: 'Bom dia, Sr. João! Sim, temos a Lantus SoloStar em estoque. Deseja que eu reserve para o senhor?',
        timestamp: new Date(Date.now() - 3500000).toISOString(),
    },
    {
        id: 'tm_3',
        sender: 'contact',
        type: 'text',
        content: 'Sim, por favor! E teria como entregar no meu endereço?',
        timestamp: new Date(Date.now() - 3000000).toISOString(),
    },
    {
        id: 'tm_4',
        sender: 'agent',
        type: 'text',
        senderName: 'IA Copilot',
        content: 'Claro! Vou organizar a entrega. O senhor gostaria de aproveitar a entrega para adicionar algum outro item recarregável?',
        timestamp: new Date(Date.now() - 2500000).toISOString(),
    },
    {
        id: 'tm_5',
        sender: 'contact',
        type: 'text',
        content: 'Não, por enquanto apenas a insulina mesmo. Obrigado!',
        timestamp: new Date(Date.now() - 2000000).toISOString(),
    },
    {
        id: 'tm_6',
        sender: 'contact',
        type: 'text',
        content: 'Olá, gostaria de saber se minha insulina já chegou?',
        timestamp: new Date().toISOString(),
    },
];

const defaultQuickReplies = [
    { shortcut: 'obrigado', text: 'Agradecemos por utilizar nossos serviços! Esperamos trabalhar com você novamente em breve.' },
    { shortcut: 'horario', text: 'Estamos *abertos* agora.\nNosso horário de atendimento é de segunda a sexta, das 8h às 18h.' },
    { shortcut: 'pix', text: 'Nossa chave PIX é: 00.000.000/0001-00 (Nome da Empresa Ltda)' },
    { shortcut: 'ola', text: 'Olá! Como posso ajudar você hoje?' },
    { shortcut: 'aguarde', text: 'Por favor, aguarde um momento enquanto verifico essa informação para você.' },
];

const defaultQuickRepliesEn = [
    { shortcut: 'thanks', text: 'Thank you for using our services! We hope to work with you again soon.' },
    { shortcut: 'hours', text: 'We are *open* now.\nOur office hours are Monday to Friday, from 8 AM to 6 PM.' },
    { shortcut: 'hello', text: 'Hello! How can I help you today?' },
    { shortcut: 'wait', text: 'Please wait a moment while I check this information for you.' },
];

export interface Message {
    id: string;
    sender: 'agent' | 'contact' | 'system';
    senderName?: string;
    isGroup?: boolean;
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template' | 'contact' | 'reaction';
    content: string;
    caption?: string;
    mediaUrl?: string | null;
    mimeType?: string | null;
    externalId?: string;
    replyTo?: string | null;
    quotedMsgContent?: string;
    quotedMsgAuthor?: string;
    timestamp: string;
    metadata?: string | null;
    status?: string;
    scheduledAt?: string;
}

interface MessageBubbleProps {
    message: Message;
    onImageClick: (url: string) => void;
    onReply: (msg: Message) => void;
    onCancelSchedule?: (msgId: string) => void;
    msgs: Message[];
}

function MessageBubble({ message, onImageClick, onReply, msgs, onCancelSchedule }: MessageBubbleProps) {
    const isSent = message.sender === 'agent';
    const isSystem = message.sender === 'system';
    const [imgError, setImgError] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);

    const MEDIA_EXPIRY_DAYS = 7;
    const isMediaExpired = message.mediaUrl &&
        ((Date.now() - new Date(message.timestamp).getTime()) > MEDIA_EXPIRY_DAYS * 86400000);

    const ExpiredPlaceholder = ({ icon: Icon, label }: { icon: any, label: string }) => (
        <div
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-1 bg-slate-100 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10"
        >
            <Icon size={16} className="text-slate-400 dark:text-white/30" />
            <span className="text-[11px] text-slate-500 dark:text-white/40 italic">{label} {t('expirada após', 'expired after')} {MEDIA_EXPIRY_DAYS} {t('dias', 'days')} 🗓️</span>
        </div>
    );

    if (isSystem) {
        return (
            <div className="flex justify-center my-3 animate-in fade-in zoom-in-95">
                <span className="text-[11px] text-slate-500 dark:text-white/40 px-3 py-1 rounded-full bg-slate-200/50 dark:bg-white/5 font-bold border border-slate-200 dark:border-white/5 uppercase tracking-widest">
                    {message.content}
                </span>
            </div>
        );
    }

    const { t } = useLanguage();
    const formatTime = (ts: string) => {
        const date = new Date(ts);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();
        const timeStr = date.toLocaleTimeString(t('pt-BR', 'en-US'), { hour: '2-digit', minute: '2-digit' });
        if (isToday) return `${t('hoje', 'today')} - ${timeStr}`;
        if (isYesterday) return `${t('ontem', 'yesterday')} - ${timeStr}`;
        return `${date.toLocaleDateString(t('pt-BR', 'en-US'))} - ${timeStr}`;
    };

    const senderColor = message.isGroup && !isSent && message.senderName
        ? `hsl(${[...message.senderName].reduce((a, c) => a + c.charCodeAt(0), 0) % 360}, 65%, 60%)`
        : null;

    const handleDownload = (url: string, filename: string) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'download';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.click();
    };

    const DownloadBtn = ({ url, filename, label = t('Baixar', 'Download') }: { url: string, filename: string, label?: string }) => (
        <button
            onClick={() => handleDownload(url, filename)}
            className="flex items-center gap-1.5 mt-2 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all bg-primary-500/10 text-primary-400 border border-primary-500/20 hover:bg-primary-500/20"
        >
            <Download size={11} />
            {label}
        </button>
    );

    const showSenderName = isSent ? !!message.senderName : (message.isGroup && !!message.senderName);

    return (
        <div className={`flex mb-4 animate-in fade-in slide-in-from-bottom-2 ${isSent ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-4 py-3 shadow-sm relative group rounded-2xl ${isSent ? 'bg-primary-500 text-white rounded-br-sm' : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white rounded-bl-sm'}`} id={`msg-${message.id || message.externalId}`}>

                {/* Forwarded Badge */}
                {(() => {
                    let isForwarded = false;
                    try {
                        if (message.metadata?.includes('isForwarded')) {
                            const meta = JSON.parse(message.metadata);
                            isForwarded = meta.isForwarded === true;
                        }
                    } catch (e) {}
                    
                    if (!isForwarded) return null;
                    return (
                        <div className={`flex items-center gap-1.5 mb-2 text-[10px] italic font-semibold ${isSent ? 'text-white/60' : 'text-slate-400 dark:text-white/40'}`}>
                            <Forward size={12} className="opacity-70" />
                            {t('Encaminhada', 'Forwarded')}
                        </div>
                    );
                })()}

                {/* Quoted Message Preview */}
                {message.replyTo && (() => {
                    const originalMsg = msgs.find(m => m.id === message.replyTo || m.externalId === message.replyTo);
                    const quotedAuthor = message.quotedMsgAuthor || originalMsg?.senderName || t('Mensagem', 'Message');
                    const quotedText = message.quotedMsgContent || originalMsg?.content || (originalMsg?.type === 'image' ? t('Foto', 'Photo') : t('[Mídia]', '[Media]'));
                    const quotedImage = originalMsg?.type === 'image' ? originalMsg.mediaUrl : null;

                    return (
                        <div
                            className="mb-3 p-2.5 rounded-xl border-l-4 bg-black/5 dark:bg-black/20 transition-all cursor-pointer hover:bg-black/10 dark:hover:bg-black/30 flex gap-3 items-center"
                            style={{ borderLeftColor: senderColor || (isSent ? '#e0e7ff' : '#6366f1') }}
                            onClick={() => {
                                const el = document.getElementById(`msg-${message.replyTo}`);
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                        >
                            <div className="flex-1 min-w-0">
                                <p className={`text-[10px] font-black mb-1 uppercase tracking-wider ${isSent ? 'text-white/70' : 'text-slate-500 dark:text-white/40'}`}>
                                    {quotedAuthor}
                                </p>
                                <p className={`text-[11px] line-clamp-2 italic ${isSent ? 'text-white/90' : 'text-slate-600 dark:text-white/60'}`}>
                                    {quotedText}
                                </p>
                            </div>
                            {quotedImage && (
                                <div className="w-12 h-12 rounded-lg bg-black/10 dark:bg-black/20 shrink-0 overflow-hidden border border-white/10">
                                    <img src={quotedImage} alt="Quoted" className="w-full h-full object-cover opacity-90" />
                                </div>
                            )}
                        </div>
                    );
                })()}

                {showSenderName && (
                    <span
                        className="text-[10px] font-black block mb-1 uppercase tracking-widest opacity-40"
                        style={{ color: senderColor || undefined }}
                    >
                        {message.senderName}
                    </span>
                )}

                {/* Types */}
                {message.type === 'image' && (
                    <div className="space-y-2">
                        {isMediaExpired ? (
                            <ExpiredPlaceholder icon={ImageIcon} label={t('Imagem', 'Image')} />
                        ) : message.mediaUrl && !imgError ? (
                            <div className="relative">
                                {!imgLoaded && <div className="w-full h-40 rounded-xl bg-slate-200 dark:bg-white/5 animate-pulse" />}
                                <img
                                    src={message.mediaUrl}
                                    alt={message.caption || 'Imagem'}
                                    className="w-full max-h-80 rounded-xl object-cover cursor-zoom-in hover:opacity-95 transition-all shadow-md"
                                    style={{ display: imgLoaded ? 'block' : 'none' }}
                                    onLoad={() => setImgLoaded(true)}
                                    onError={() => setImgError(true)}
                                    onClick={() => onImageClick(message.mediaUrl!)}
                                />
                                {imgLoaded && <DownloadBtn url={message.mediaUrl} filename="imagem.jpg" label={t('Abrir Imagem', 'Open Image')} />}
                            </div>
                        ) : (
                            <div className="w-full h-36 rounded-xl flex flex-col items-center justify-center gap-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30">
                                <ImageIcon size={24} />
                                <span className="text-[10px]">{t('Imagem carregando ou indisponível', 'Image loading or unavailable')}</span>
                            </div>
                        )}
                        {message.caption && <p className={`text-sm mt-2 leading-relaxed ${isSent ? 'text-white' : 'text-slate-700 dark:text-white/90'}`}>{message.caption}</p>}
                    </div>
                )}

                {message.type === 'video' && (
                    <div className="space-y-2">
                        {isMediaExpired ? (
                            <ExpiredPlaceholder icon={Play} label={t('Vídeo', 'Video')} />
                        ) : message.mediaUrl ? (
                            <div>
                                <video src={message.mediaUrl} controls className="w-full max-h-72 rounded-xl bg-black shadow-md" />
                                <DownloadBtn url={message.mediaUrl} filename="video.mp4" label={t('Baixar Vídeo', 'Download Video')} />
                            </div>
                        ) : <div className="h-36 bg-slate-200 dark:bg-white/5 rounded-xl border border-slate-300 dark:border-white/10" />}
                        {message.caption && <p className={`text-sm mt-2 leading-relaxed ${isSent ? 'text-white' : 'text-slate-700 dark:text-white/90'}`}>{message.caption}</p>}
                    </div>
                )}

                {message.type === 'audio' && (
                    <div className="min-w-[240px] space-y-2">
                        {isMediaExpired ? (
                            <ExpiredPlaceholder icon={Volume2} label={t('Áudio', 'Audio')} />
                        ) : message.mediaUrl ? (
                            <div className="bg-black/5 dark:bg-black/20 p-2 rounded-xl border border-slate-200 dark:border-white/5">
                                <audio src={message.mediaUrl} controls className={`w-full h-8 ${isSent ? 'brightness-110 filter invert' : 'dark:brightness-110 dark:filter dark:invert'}`} />
                                <DownloadBtn url={message.mediaUrl} filename="audio.ogg" label={t('Baixar Áudio', 'Download Audio')} />
                            </div>
                        ) : <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl text-center text-slate-400 dark:text-white/30 text-[10px]">{t('Áudio não disponível', 'Audio not available')}</div>}
                    </div>
                )}

                {message.type === 'document' && (
                    <div className="space-y-2">
                        {isMediaExpired ? (
                            <ExpiredPlaceholder icon={FileText} label={t('Documento', 'Document')} />
                        ) : (
                            <div
                                className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all ${isSent ? 'bg-primary-600 border-primary-400 hover:bg-primary-700' : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-black/40'}`}
                                onClick={() => message.mediaUrl && window.open(message.mediaUrl, '_blank')}
                            >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSent ? 'bg-white/20 text-white' : 'bg-primary-50 text-primary-500 dark:bg-primary-500/20 dark:text-primary-400'}`}>
                                    <FileText size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-bold truncate ${isSent ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{message.content || t('Documento', 'Document')}</p>
                                    <p className={`text-[10px] uppercase font-black ${isSent ? 'text-white/70' : 'text-slate-400 dark:text-white/40'}`}>{message.mimeType?.split('/')[1] || t('arquivo', 'file')}</p>
                                </div>
                                <Download size={14} className="opacity-40" />
                            </div>
                        )}
                    </div>
                )}

                {message.type === 'text' && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap selection:bg-primary-500/30">
                        {message.content?.replace(/\\n/g, '\n')}
                    </p>
                )}

                {message.type === 'contact' && (() => {
                    // Parse phone from vCard
                    const phone = (() => {
                        const rawPhoneMatch = message.metadata?.match(/waid=(\d+)/) || message.metadata?.match(/TEL.*:([+\-\s\d]+)/);
                        if (!rawPhoneMatch) return null;
                        const numericalPhone = rawPhoneMatch[1].replace(/\D/g, '');
                        return numericalPhone.length >= 10 
                            ? `+${numericalPhone.replace(/^55/, '55 ').replace(/(\d{2})(\d{4,5})(\d{4})$/, '$1 $2-$3')}` 
                            : `+${numericalPhone}`;
                    })();
                    return (
                        <div className={`flex flex-col gap-2 p-3 rounded-xl border min-w-[220px] ${
                            isSent
                                ? 'bg-primary-600/60 border-primary-400/30'
                                : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10'
                        }`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                    isSent ? 'bg-white/20 text-white' : 'bg-primary-100 text-primary-500 dark:bg-primary-500/20 dark:text-primary-400'
                                }`}>
                                    <UserPlus size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-bold truncate ${isSent ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                                        {message.content || t('Contato', 'Contact')}
                                    </p>
                                    {phone && (
                                        <p className={`text-[11px] mt-0.5 ${isSent ? 'text-white/60' : 'text-slate-400 dark:text-white/40'}`}>
                                            {phone}
                                        </p>
                                    )}
                                    <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${
                                        isSent ? 'text-white/40' : 'text-slate-300 dark:text-white/20'
                                    }`}>{t('Contato compartilhado', 'Shared contact')}</p>
                                </div>
                            </div>
                            
                            {phone && (
                                <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200/50 dark:border-white/5">
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(phone.replace(/\D/g, ''));
                                        }}
                                        className={`w-full py-1.5 flex items-center justify-center gap-1.5 rounded-lg text-[10px] uppercase font-bold transition-all ${
                                            isSent
                                                ? 'bg-white/10 text-white hover:bg-white/20'
                                                : 'bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 dark:text-primary-400'
                                        }`}
                                        title={t('Copiar número', 'Copy number')}
                                    >
                                        <MessageSquare size={12} className="opacity-70" />
                                        {t('Copiar Número', 'Copy Number')}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })()}

                <div className={`flex items-center gap-1.5 mt-2 ${isSent ? 'justify-end' : 'justify-start'}`}>
                    {message.status === 'pending' && (
                        <div className="flex items-center gap-2">
                            <Hourglass size={10} className="text-amber-400 opacity-80" aria-label={t('Agendada', 'Scheduled')} />
                            {onCancelSchedule && (
                                <button
                                    onClick={() => onCancelSchedule(message.id)}
                                    title={t('Cancelar Agendamento', 'Cancel Schedule')}
                                    className="p-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 cursor-pointer transition-all"
                                >
                                    <X size={10} />
                                </button>
                            )}
                        </div>
                    )}
                    <span className="text-[9px] font-black opacity-30 uppercase tracking-tighter">
                        {formatTime(message.timestamp)}
                    </span>
                    {isSent && message.status !== 'pending' && <CheckCircle2 size={10} className="text-primary-400 opacity-60" />}
                </div>

                {!isSystem && (
                    <button
                        onClick={() => onReply(message)}
                        className={`absolute top-0 ${isSent ? 'right-full mr-3' : 'left-full ml-3'} p-2 rounded-full bg-white/5 border border-white/10 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 hover:scale-110 text-white/40 hover:text-white cursor-pointer`}
                        title={t('Responder', 'Reply')}
                    >
                        <CornerUpLeft size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}

interface AudioRecorderProps {
    onStop: (blob: Blob) => void;
}

function AudioRecorder({ onStop }: AudioRecorderProps) {
    const { t } = useLanguage();
    const [isRecording, setIsRecording] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const intervalRef = useRef<any>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const cancelledRef = useRef(false);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];
            cancelledRef.current = false;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
                if (!cancelledRef.current) {
                    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                    onStop?.(blob);
                }
                chunksRef.current = [];
            };

            mediaRecorder.start();
            setIsRecording(true);
            setSeconds(0);
            intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
        } catch (err) {
            console.error('Erro ao acessar microfone:', err);
            alert(t('Não foi possível acessar o microfone.', 'Could not access the microphone.'));
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
        setIsRecording(false);
        clearInterval(intervalRef.current);
    };

    const cancelRecording = () => {
        cancelledRef.current = true;
        if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
        setIsRecording(false);
        clearInterval(intervalRef.current);
        setSeconds(0);
    };

    if (isRecording) {
        return (
            <div className="flex items-center gap-4 flex-1 animate-in slide-in-from-right-2">
                <button onClick={cancelRecording} className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 cursor-pointer transition-all">
                    <X size={18} />
                </button>
                <div className="flex-1 flex items-center justify-center gap-3 bg-rose-500/10 rounded-2xl py-2 border border-rose-500/20">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-xs font-black font-mono text-rose-500">{Math.floor(seconds / 60)}:{((seconds % 60)).toString().padStart(2, '0')}</span>
                </div>
                <button onClick={stopRecording} className="p-2.5 rounded-xl bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/20 cursor-pointer transition-all">
                    <Send size={16} />
                </button>
            </div>
        );
    }

    return (
        <button onClick={startRecording} className="p-2.5 rounded-xl bg-white/5 text-white/30 hover:text-white hover:bg-white/10 transition-all cursor-pointer border border-white/5">
            <Mic size={20} />
        </button>
    );
}

function MessageSkeleton() {
    return (
        <div className="space-y-6 px-6 py-6 opacity-30">
            {[['w-48', 'justify-start'], ['w-64', 'justify-end'], ['w-36', 'justify-start'], ['w-56', 'justify-end']].map(([w, dir], i) => (
                <div key={i} className={`flex ${dir}`}>
                    <div className={`h-12 rounded-2xl bg-white/5 border border-white/10 animate-pulse ${w}`} />
                </div>
            ))}
        </div>
    );
}

interface ChatWindowProps {
    ticket: TicketExtended | null;
    orgConnections?: Connection[];
    onTransfer?: (id: string) => void;
    onResolve?: (id: string) => void;
    onAssignTicket?: (id: string) => void;
    onReturnToQueue?: (id: string) => void;
    onBack: () => void;
    showContextSidebar?: boolean;
    onToggleContextSidebar?: () => void;
    externalInputText?: string | null;
    aiSuggestions?: string[];
    onUseSuggestion?: (text: string) => void;
}

export default function ChatWindow({
    ticket,
    orgConnections,
    onTransfer,
    onResolve,
    onAssignTicket,
    onReturnToQueue,
    onBack,
    showContextSidebar,
    onToggleContextSidebar,
    externalInputText,
    aiSuggestions = [],
    onUseSuggestion,
}: ChatWindowProps) {
    const { user } = useAuth();
    const { t, isEnglish } = useLanguage();
    const [messageText, setMessageText] = useState('');
    const [showEmoji, setShowEmoji] = useState(false);
    const [scheduledAt, setScheduledAt] = useState('');
    const [showSchedule, setShowSchedule] = useState(false);
    
    // States for Image Confirmation
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [pendingCaption, setPendingCaption] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [msgs, setMsgs] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const messageCursorRef = useRef<string | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [isZoomedIn, setIsZoomedIn] = useState(false);
    const [zoomPosition, setZoomPosition] = useState({ x: '50%', y: '50%' });
    const [pastedImageFile, setPastedImageFile] = useState<File | null>(null);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const [quickReplyFilter, setQuickReplyFilter] = useState('');
    const [selectedQuickReplyIndex, setSelectedQuickReplyIndex] = useState(0);
    const [showManageQuickReplies, setShowManageQuickReplies] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
        }
    };

    // Handle external input text from AI suggestion
    useEffect(() => {
        if (externalInputText) {
            setMessageText(externalInputText);
        }
    }, [externalInputText]);

    const lastMessageIdRef = useRef<string | null>(null);

    useEffect(() => {
        lastMessageIdRef.current = null;
    }, [ticket?.id]);

    // Força o scroll em múltiplos estágios apenas para NOVAS MENSAGENS recebidas ou aberturas inéditas.
    useEffect(() => {
        if (!msgs || msgs.length === 0) return;

        const latestMsg = msgs[msgs.length - 1]; // O último elemento do array é a mensagem cronologicamente mais nova

        // Se a mensagem que está cravada lá embaixo for a mesma, é porque foi um LOAD MORE (histórico de cima)
        if (latestMsg.id !== lastMessageIdRef.current) {
            lastMessageIdRef.current = latestMsg.id;

            scrollToBottom();
            const t1 = setTimeout(scrollToBottom, 150);
            const t2 = setTimeout(scrollToBottom, 500);
            const t3 = setTimeout(scrollToBottom, 1000);
            return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
        }
    }, [msgs, ticket?.id]);

    const [quickReplies, setQuickReplies] = useState<any[]>(isEnglish ? defaultQuickRepliesEn : defaultQuickReplies);

    useEffect(() => {
        if (!user?.organization?.id) return;
        ticketService.fetchQuickReplies(user.organization.id).then(({ data, error }) => {
            if (!error && data && data.length > 0) {
                setQuickReplies(data);
            }
        });
    }, [user?.organization?.id]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Conexão e Janela 24h
    const connection = useMemo(() => {
        if (!orgConnections?.length || !ticket?.id) return null;
        return orgConnections.find(c => c.channel === (ticket.channel || 'whatsapp')) || orgConnections[0];
    }, [ticket?.id, ticket?.channel, orgConnections]);

    const isOfficialApi = connection?.method === 'meta_api';
    const isWindowExpired = useMemo(() => {
        if (!isOfficialApi) return false;
        let lastContactTimeStr = msgs.slice().reverse().find(m => m.sender === 'contact')?.timestamp || ticket?.lastMessageTime;
        if (!lastContactTimeStr) return true;
        return (Date.now() - new Date(lastContactTimeStr).getTime()) > 24 * 60 * 60 * 1000;
    }, [isOfficialApi, ticket?.lastMessageTime, msgs]);

    // Load messages
    useEffect(() => {
        if (!ticket?.id) { setMsgs([]); return; }
        
        if (ticket.id === 'tk_treinamento') {
            setMsgs(TRAINING_MESSAGES);
            setIsLoading(false);
            return;
        }

        const loadMessages = async () => {
            setIsLoading(true);
            try {
                let res;
                if (ticket.isGroup) res = await ticketService.fetchGroupMessages(ticket.id);
                else if (ticket.contact?.id) res = await ticketService.fetchMessagesByContact(ticket.contact.id);
                else res = await ticketService.fetchMessages(ticket.id);

                if (res.error) throw res.error;
                if (res.data) {
                    setHasMoreMessages(res.data.length >= 20);
                    messageCursorRef.current = res.data.length > 0 ? res.data[0].created_at : null;
                    const formatted: Message[] = res.data.map((m: any) => ({
                        id: m.id,
                        sender: (m.from_me || m.sender === 'agent' || m.sender === 'user' || m.sender === 'admin') ? 'agent' : (m.sender === 'system' ? 'system' : 'contact'),
                        senderName: m.sender_name || m.sender_agent?.name || '',
                        isGroup: !!ticket.isGroup,
                        type: m.type || 'text',
                        content: m.content || '',
                        caption: m.caption,
                        mediaUrl: m.media_url,
                        mimeType: m.media_mime_type || m.mime_type,
                        externalId: m.external_id,
                        replyTo: m.reply_to,
                        quotedMsgContent: m.quoted_msg_content,
                        quotedMsgAuthor: m.quoted_msg_author,
                        timestamp: m.created_at,
                        metadata: m.metadata,
                        status: m.status || 'sent',
                        scheduledAt: m.scheduled_at,
                    }));
                    setMsgs(formatted);
                    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
                }
            } catch (err) {
                console.error(err);
            } finally { setIsLoading(false); }
        };

        loadMessages();

        // Attach function to ref or expose globally if needed. For now we will keep it local or just bring `handleLoadMore` outside `useEffect`.
        // Wait, handleLoadMore needs to be outside `useEffect` so the UI button can call it!

        const onMessageInsert = (payload: any) => {
            if (payload.eventType === 'INSERT') {
                const newMsg = payload.new;
                setMsgs(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, {
                        id: newMsg.id,
                        sender: (newMsg.from_me || newMsg.sender === 'agent' || newMsg.sender === 'user' || newMsg.sender === 'admin') ? 'agent' : 'contact',
                        senderName: newMsg.sender_name || (newMsg.sender_id === user?.id ? user?.name : ''),
                        isGroup: !!ticket.isGroup,
                        type: newMsg.type || 'text',
                        content: newMsg.content || '',
                        caption: newMsg.caption,
                        mediaUrl: newMsg.media_url,
                        mimeType: newMsg.media_mime_type || newMsg.mime_type,
                        externalId: newMsg.external_id,
                        replyTo: newMsg.reply_to,
                        timestamp: newMsg.created_at,
                        metadata: newMsg.metadata,
                        status: newMsg.status || 'sent',
                        scheduledAt: newMsg.scheduled_at,
                    }];
                });
            }
        };

        const channel = ticket.isGroup
            ? ticketService.subscribeToGroupMessages(ticket.id, onMessageInsert)
            : ticketService.subscribeToMessages(ticket.id, onMessageInsert);

        return () => { if (channel) ticketService.unsubscribeFromTickets(channel); };
    }, [ticket?.id, user?.id]);

    const handleLoadMore = async () => {
        if (!ticket?.id || !messageCursorRef.current || isLoadingMore) return;
        setIsLoadingMore(true);
        try {
            let res;
            if (ticket.isGroup) {
                res = await ticketService.fetchGroupMessagesBefore(ticket.id, messageCursorRef.current);
            } else if (ticket.contact?.id) {
                res = await ticketService.fetchMessagesBeforeByContact(ticket.contact.id, messageCursorRef.current);
            } else {
                res = await ticketService.fetchMessagesBefore(ticket.id, messageCursorRef.current);
            }
            if (res.error) throw res.error;
            if (res.data) {
                setHasMoreMessages(res.data.length >= 30);
                if (res.data.length > 0) {
                    messageCursorRef.current = res.data[0].created_at;
                    const formatted: Message[] = res.data.map((m: any) => ({
                        id: m.id,
                        sender: (m.from_me || m.sender === 'agent' || m.sender === 'user' || m.sender === 'admin') ? 'agent' : (m.sender === 'system' ? 'system' : 'contact'),
                        senderName: m.sender_name || m.sender_agent?.name || '',
                        isGroup: !!ticket.isGroup,
                        type: m.type || 'text',
                        content: m.content || '',
                        caption: m.caption,
                        mediaUrl: m.media_url,
                        mimeType: m.media_mime_type || m.mime_type,
                        externalId: m.external_id,
                        replyTo: m.reply_to,
                        quotedMsgContent: m.quoted_msg_content,
                        quotedMsgAuthor: m.quoted_msg_author,
                        timestamp: m.created_at,
                        metadata: m.metadata,
                        status: m.status || 'sent',
                        scheduledAt: m.scheduled_at,
                    }));

                    const scrollNode = chatContainerRef.current;
                    const prevScrollHeight = scrollNode?.scrollHeight || 0;
                    const prevScrollTop = scrollNode?.scrollTop || 0;

                    setMsgs(prev => [...formatted, ...prev]);

                    requestAnimationFrame(() => {
                        if (scrollNode) {
                            scrollNode.scrollTop = prevScrollTop + (scrollNode.scrollHeight - prevScrollHeight);
                        }
                    });
                } else {
                    setHasMoreMessages(false);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingMore(false);
        }
    };

    const sendToWebhook = async (content: string, type: 'text' | 'image' | 'video' | 'audio' | 'document', mediaUrl: string | null = null) => {
        if (!ticket || !user) return;
        try {
            const apiMethod = connection?.method || 'evolution';
            const safePhone = ticket.contact?.phone?.replace(/\D/g, '') || '';

            const payload = {
                ticketId: ticket.id,
                contactPhone: safePhone,
                message: content,
                type,
                mediaUrl,
                instanceName: connection?.instance_name || user.organization?.slug || 'expervivencia',
                organizationId: user.organization?.id,
                agentId: user.id,
                agentName: user.name,
                isGroup: !!ticket.isGroup,
                method: apiMethod,
                channel: ticket.channel || 'whatsapp', // Adicionado para direcionar ao webhook correto
                connectionId: connection?.id,
                quotedMsgId: replyingTo?.externalId || null,
                quotedMsgContent: replyingTo?.content || (replyingTo?.type === 'image' ? t('Foto', 'Photo') : t('[Mídia]', '[Media]')),
                quotedMsgAuthor: replyingTo?.senderName || t('Contato', 'Contact'),
                scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
                tag: (['meta', 'messenger', 'instagram'].includes(apiMethod)) ? 'human_agent' : null,
            };

            if (scheduledAt) {
                await ticketService.saveScheduledMessage(
                    ticket.id,
                    user.organization?.id as string,
                    user.id,
                    user.name,
                    content,
                    type,
                    new Date(scheduledAt).toISOString(),
                    mediaUrl,
                    replyingTo?.externalId || null
                );
            } else {
                await n8nService.sendMessageViaN8N(payload);
            }

            setReplyingTo(null);
            setScheduledAt('');
            setShowSchedule(false);
        } catch (error) {
            console.error(error);
        }
    };

    const handleCancelSchedule = async (msgId: string) => {
        try {
            await ticketService.deleteScheduledMessage(msgId);
            setMsgs(prev => prev.filter(m => m.id !== msgId));
        } catch (error) {
            console.error('Erro ao cancelar agendamento', error);
        }
    };

    const handleSend = async () => {
        if (!messageText.trim()) return;
        const text = messageText.trim();
        setMessageText('');
        await sendToWebhook(text, 'text');
    };

    const handleFileUpload = async (filesOrFile: FileList | File[] | File | null) => {
        let file: File | null = null;
        if (filesOrFile instanceof FileList || Array.isArray(filesOrFile)) {
            file = filesOrFile[0] || null;
        } else {
            file = filesOrFile;
        }

        if (!file || !ticket || !user) return;

        // Ao selecionar arquivo, abrimos o modal de confirmação em vez de enviar direto
        const url = URL.createObjectURL(file);
        setPendingFile(file);
        setPreviewUrl(url);
        setPendingCaption('');
    };

    const handleConfirmSend = async () => {
        if (!pendingFile || !ticket || !user || isUploading) return;
        
        setIsUploading(true);
        const file = pendingFile;
        const caption = pendingCaption.trim();

        let type: 'text' | 'image' | 'video' | 'audio' | 'document' = 'document';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';

        try {
            const { data, error } = await ticketService.uploadMedia(file);
            if (error) throw error;
            if (data?.url) await sendToWebhook(caption || file.name, type, data.url);
            
            // Limpar estados
            handleCancelPending();
        } catch (error) {
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleCancelPending = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPendingFile(null);
        setPreviewUrl(null);
        setPendingCaption('');
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    // Prevenir o comportamento padrão de colar o texto se for uma imagem
                    e.preventDefault();
                    await handleFileUpload(file);
                }
            }
        }
    };

    const handleAudioUpload = async (audioBlob: Blob) => {
        if (!ticket?.id || !user?.id) return;
        try {
            const { data, error } = await ticketService.uploadMedia(audioBlob);
            if (error) throw error;
            if (data?.url) await sendToWebhook('', 'audio', data.url);
        } catch (error) {
            console.error('Erro ao processar áudio', error);
        }
    };

    const filteredQuickReplies = useMemo(() => {
        if (!showQuickReplies) return [];
        return quickReplies.filter((qr: any) =>
            qr.shortcut.toLowerCase().includes(quickReplyFilter) ||
            qr.text.toLowerCase().includes(quickReplyFilter)
        );
    }, [showQuickReplies, quickReplyFilter, quickReplies]);

    const insertQuickReply = (qr: any) => {
        const val = messageText.replace(/(?:^|\s)\/([^\s]*)$/, (match) => match.startsWith(' ') ? ' ' + qr.text : qr.text);
        setMessageText(val);
        setShowQuickReplies(false);
    };

    const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setMessageText(val);
        const match = val.match(/(?:^|\s)\/([^\s]*)$/);
        if (match) {
            setShowQuickReplies(true);
            setQuickReplyFilter(match[1].toLowerCase());
            setSelectedQuickReplyIndex(0);
        } else {
            setShowQuickReplies(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showQuickReplies && filteredQuickReplies.length > 0) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedQuickReplyIndex(p => (p + 1) % filteredQuickReplies.length); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedQuickReplyIndex(p => (p - 1 + filteredQuickReplies.length) % filteredQuickReplies.length); return; }
            if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertQuickReply(filteredQuickReplies[selectedQuickReplyIndex]); return; }
            if (e.key === 'Escape') { e.preventDefault(); setShowQuickReplies(false); return; }
        }
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    if (!ticket) {
        return (
            <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-12 text-center bg-slate-50 dark:bg-[#0c0c11]">
                <div className="w-20 h-20 rounded-3xl bg-primary-500/10 flex items-center justify-center text-primary-500 dark:text-primary-400 mb-8 border border-primary-500/20 shadow-2xl shadow-primary-500/5">
                    <MessageSquare size={40} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-widest text-slate-800 dark:text-white mb-2">{t('Selecione um atendimento', 'Select a conversation')}</h3>
                <p className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-widest">{t('Inicie uma conversa agora mesmo', 'Start a conversation right now')}</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full min-w-0 bg-white dark:bg-void-950 relative transition-colors duration-300">
            {/* Header */}
            <div data-tour="chat-header" className="px-3 lg:px-6 py-3 lg:py-4 flex items-center justify-between border-b border-slate-200 dark:border-white/5 bg-white/90 dark:bg-void-950/90 backdrop-blur-xl sticky top-0 z-40 gap-2">
                <div className="flex items-center gap-2 lg:gap-4 min-w-0 flex-1 pr-2">
                    <button onClick={onBack} className="lg:hidden p-1.5 lg:p-2 -ml-2 rounded-xl text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all shrink-0">
                        <ChevronLeft size={24} />
                    </button>
                    <Avatar src={ticket.contact?.avatar} name={ticket.contact?.name} size="w-10 h-10 lg:w-11 lg:h-11" className="rounded-xl ring-2 ring-primary-500/20 shrink-0" />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                            <h3 className="text-sm font-black text-slate-800 dark:text-white truncate uppercase tracking-tight">{ticket.contact?.name}</h3>
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border border-slate-200 dark:border-white/5 ${ticket.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                                {ticket.status}
                            </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-white/30 tracking-widest uppercase">{ticket.contact?.phone}</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
                    {ticket.status === 'waiting' && onAssignTicket && (
                        <button
                            onClick={() => onAssignTicket(ticket.id)}
                            className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 bg-primary-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/20 mr-1 lg:mr-2 shrink-0"
                        >
                            <UserPlus size={14} />
                            <span className="hidden sm:inline">{t('Assumir', 'Assign')}</span>
                        </button>
                    )}
                    {!ticket.isGroup && (
                        <button 
                            data-tour="transfer-ticket"
                            onClick={() => onTransfer?.(ticket.id)} 
                            className="p-2 lg:p-2.5 rounded-xl bg-slate-100 dark:bg-white/3 border border-slate-200 dark:border-white/5 text-slate-400 dark:text-white/40 hover:text-primary-500 dark:hover:text-white hover:bg-white/10 transition-all cursor-pointer shrink-0" 
                            title={t('Transferir', 'Transfer')}
                        >
                            <ArrowLeftRight size={16} className="lg:w-[18px] lg:h-[18px]" />
                        </button>
                    )}
                    {!ticket.isGroup && (
                        <button 
                            data-tour="resolve-ticket"
                            onClick={() => onResolve?.(ticket.id)} 
                            className="p-2 lg:p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer shrink-0" 
                            title={t('Resolver', 'Resolve')}
                        >
                            <CheckCircle2 size={16} className="lg:w-[18px] lg:h-[18px]" />
                        </button>
                    )}
                </div>

                {onToggleContextSidebar && (
                    <button onClick={onToggleContextSidebar} className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 rounded-l-xl bg-white dark:bg-void-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 dark:text-white/20 hover:text-primary-500 dark:hover:text-white transition-all cursor-pointer z-50 shadow-md">
                        {showContextSidebar ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                )}
            </div>

            {/* Expired Window Banner */}
            {isWindowExpired && (
                <div className="mx-4 lg:mx-6 mt-4 p-3 lg:p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between shadow-lg shadow-rose-500/5 animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-2 lg:gap-3 text-rose-400">
                        <Clock size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('Janela de 24h fechada - Apenas Templates', '24h Window Closed - Templates Only')}</span>
                    </div>
                    <button onClick={() => setShowTemplateModal(true)} className="px-4 py-2 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 cursor-pointer">
                        {t('Ver Templates', 'View Templates')}
                    </button>
                </div>
            )}

            {/* Chat Messages */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 lg:px-6 scrollbar-thin scroll-smooth py-4 lg:py-6">
                {isLoading ? <MessageSkeleton /> : msgs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-10">
                        <MessageSquare size={64} className="mb-4" />
                        <p className="text-xs font-black uppercase tracking-[0.2em]">{t('Inicie a conversa', 'Start the conversation')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {hasMoreMessages && (
                            <div className="flex justify-center mb-6 mt-2">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={isLoadingMore}
                                    className="px-6 py-2.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest hover:text-primary-500 hover:bg-white dark:hover:text-primary-400 dark:hover:bg-white/10 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                >
                                    {isLoadingMore ? t('Buscando do arquivo...', 'Fetching from archive...') : t('Carregar Mensagens Antigas', 'Load Old Messages')}
                                </button>
                            </div>
                        )}
                        {msgs.map(m => (
                            <MessageBubble key={m.id} message={m} onImageClick={setZoomedImage} onReply={setReplyingTo} msgs={msgs} onCancelSchedule={handleCancelSchedule} />
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                )}
            </div>

            {/* Input Area */}
            {ticket.status === 'waiting' && !ticket.isGroup ? (
                <div className="px-6 py-8 bg-white/95 dark:bg-void-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/5 flex flex-col items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="w-16 h-16 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500 dark:text-primary-400 group-hover:scale-110 transition-transform">
                        <UserPlus size={32} />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest">{t('Atendimento em Espera', 'Waiting Care')}</p>
                        <p className="text-xs text-slate-500 dark:text-white/40 mt-1 max-w-[280px]">{t('Você precisa assumir este atendimento para poder enviar mensagens ao contato.', 'You need to assign this care to be able to send messages to the contact.')}</p>
                    </div>
                    {onAssignTicket && (
                        <button
                            onClick={() => onAssignTicket(ticket.id)}
                            className="flex items-center gap-2 px-8 py-4 bg-primary-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-primary-600 transition-all shadow-xl shadow-primary-500/20 active:scale-95 cursor-pointer hover:ring-4 hover:ring-primary-500/10"
                        >
                            <UserPlus size={18} />
                            {t('Assumir Atendimento', 'Assign Care')}
                        </button>
                    )}
                </div>
            ) : (
                <div className="px-3 lg:px-6 pb-4 lg:pb-6 pt-2 bg-white/95 dark:bg-void-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/5">
                    {replyingTo && (
                        <div className="mb-4 p-4 rounded-2xl bg-primary-500/10 border-l-4 border-primary-500 flex items-center justify-between animate-in slide-in-from-bottom-2">
                            <div className="min-w-0">
                                <p className="text-[9px] font-black text-primary-400 uppercase tracking-widest mb-1">{t('Respondendo a', 'Replying to')} {replyingTo.senderName}</p>
                                <p className="text-xs text-white/50 truncate font-medium">{replyingTo.content || `[${t(replyingTo.type, replyingTo.type)}]`}</p>
                            </div>
                            <button onClick={() => setReplyingTo(null)} className="p-2 text-white/20 hover:text-white cursor-pointer"><X size={16} /></button>
                        </div>
                    )}

                    {/* ── AI SUGGESTION CHIPS ── */}
                    {aiSuggestions.length > 0 && (
                        <div data-tour="ai-suggestions" className="mb-3 flex items-start gap-2">
                            <Sparkles size={13} className="text-primary-400 shrink-0 mt-1" />
                            <div className="flex gap-2 flex-wrap">
                                {aiSuggestions.map((text, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            if (onUseSuggestion) onUseSuggestion(text);
                                            else setMessageText(text);
                                        }}
                                        title={text}
                                        className="text-left text-[11px] leading-snug px-3 py-1.5 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-600 dark:text-primary-300 hover:bg-primary-500/20 hover:border-primary-500/40 transition-all cursor-pointer max-w-[260px] line-clamp-2 font-medium"
                                    >
                                        {i + 1}. {text.length > 80 ? text.slice(0, 80) + '…' : text}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className={`p-2 rounded-3xl bg-slate-100 dark:bg-void-950/40 border border-slate-200 dark:border-white/5 flex items-center gap-3 transition-all ${isWindowExpired ? 'opacity-20 pointer-events-none' : 'focus-within:border-primary-500/50 focus-within:ring-4 focus-within:ring-primary-500/5'}`}>
                        <div className="relative">
                            <button onClick={() => setShowEmoji(!showEmoji)} className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/40 hover:text-primary-500 dark:hover:text-white transition-all cursor-pointer"><Smile size={20} /></button>
                            {showEmoji && (
                                <div className="absolute bottom-14 left-0 p-4 rounded-2xl bg-white dark:bg-void-800 border border-slate-200 dark:border-white/10 shadow-2xl z-50 w-64 grid grid-cols-6 gap-2">
                                    {['😊', '😂', '👍', '🙏', '❤️', '🔥', '🚀', '✨', '✅', '❌', '📞', '💡'].map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => { setMessageText(prev => prev + emoji); setShowEmoji(false); }}
                                            className="text-xl p-2 hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e.target.files)} className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/40 hover:text-primary-500 dark:hover:text-white transition-all cursor-pointer"><Paperclip size={20} /></button>

                        {(!isOfficialApi && !(['instagram', 'messenger'].includes(ticket?.channel || '')) && !ticket?.isGroup) && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowSchedule(!showSchedule)}
                                    data-tour="schedule-button"
                                    className={`p-2.5 rounded-xl transition-all cursor-pointer ${scheduledAt ? 'bg-primary-500/10 text-primary-500 border border-primary-500/20' : 'bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/40 hover:text-primary-500 dark:hover:text-white'}`}
                                >
                                    <CalendarClock size={20} />
                                </button>
                                {showSchedule && (
                                    <div className="absolute bottom-14 left-0 p-4 rounded-2xl bg-white dark:bg-void-800 border border-slate-200 dark:border-white/10 shadow-2xl z-50 w-64">
                                        <p className="text-xs font-black uppercase text-slate-800 dark:text-white mb-3 tracking-widest">{t('Agendar Mensagem', 'Schedule Message')}</p>
                                        <input
                                            type="datetime-local"
                                            value={scheduledAt}
                                            onChange={e => setScheduledAt(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary-500/50 text-slate-700 dark:text-white mb-3"
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={() => { setScheduledAt(''); setShowSchedule(false); }} className="flex-1 py-2 text-xs font-black uppercase rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 hover:bg-slate-200 dark:hover:bg-white/10">{t('Cancelar', 'Cancel')}</button>
                                            <button onClick={() => setShowSchedule(false)} className="flex-1 py-2 text-xs font-black uppercase rounded-lg bg-primary-500 text-white hover:bg-primary-600">{t('Ok', 'Ok')}</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex-1 relative">
                            <textarea
                                value={messageText}
                                data-tour="chat-input"
                                onChange={handleMessageChange}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                                placeholder={t('Mensagem...', 'Message...')}
                                rows={1}
                                className="w-full bg-transparent border-none outline-none text-sm text-slate-700 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/10 resize-none py-2.5 max-h-32 font-medium"
                            />
                            {showQuickReplies && filteredQuickReplies.length > 0 && (
                                <div className="absolute bottom-full left-0 mb-4 w-80 bg-white dark:bg-void-800 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                                    <div className="px-4 py-2 bg-slate-50 dark:bg-void-900 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary-500 dark:text-primary-400 flex items-center gap-2"><Zap size={12} /> {t('Respostas Rápidas', 'Quick Replies')}</span>
                                        <button onClick={() => setShowManageQuickReplies(true)} className="p-1 hover:text-primary-500 dark:hover:text-white text-slate-400 dark:text-white/40 cursor-pointer transition-colors"><Edit2 size={12} /></button>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                                        {filteredQuickReplies.map((qr: any, i: number) => (
                                            <button
                                                key={qr.shortcut}
                                                onClick={() => insertQuickReply(qr)}
                                                onMouseEnter={() => setSelectedQuickReplyIndex(i)}
                                                className={`w-full text-left p-3 rounded-xl transition-all ${i === selectedQuickReplyIndex ? 'bg-primary-500/10 border border-primary-500/20' : 'hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent'}`}
                                            >
                                                <p className="text-xs font-black text-slate-800 dark:text-white">/{qr.shortcut}</p>
                                                <p className="text-[11px] text-slate-400 dark:text-white/40 line-clamp-1">{qr.text}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {messageText.trim() ? (
                            <button onClick={handleSend} className="p-3 rounded-2xl bg-primary-500 text-white hover:bg-primary-600 shadow-xl shadow-primary-500/20 active:scale-95 transition-all cursor-pointer"><Send size={20} /></button>
                        ) : (
                            <AudioRecorder onStop={handleAudioUpload} />
                        )}
                    </div>
                </div>
            )}

            <TemplateModal isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)} connection={connection} contactPhone={ticket.contact?.phone || ''} ticketId={ticket.id as string} user={user} />

            {showManageQuickReplies && (
                <ManageQuickRepliesModal
                    quickReplies={quickReplies}
                    setQuickReplies={setQuickReplies}
                    onClose={() => setShowManageQuickReplies(false)}
                />
            )}

            {zoomedImage && (
                <div className="fixed inset-0 z-100 bg-black/95 backdrop-blur-sm flex items-center justify-center animate-in fade-in" onClick={() => setZoomedImage(null)}>
                    <button className="absolute top-8 right-8 p-3 bg-white/10 rounded-2xl text-white hover:bg-white/20 transition-all cursor-pointer"><X size={24} /></button>
                    <img src={zoomedImage} className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl" alt="Zoom" />
                </div>
            )}

            {/* Image Confirmation Modal */}
            {previewUrl && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 lg:p-8 animate-in fade-in zoom-in-95 duration-200">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={handleCancelPending} />
                    <div className="relative z-10 w-full max-w-2xl bg-[#0c0c11] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
                        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/2">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Confirmar Envio</h3>
                            <button onClick={handleCancelPending} className="p-2 text-white/40 hover:text-white transition-all cursor-pointer"><X size={24} /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 lg:p-8 flex flex-col items-center justify-center bg-black/20">
                            <div className="relative group max-w-full">
                                <img src={previewUrl} alt="Preview" className="max-h-[50vh] rounded-2xl shadow-2xl border border-white/5 object-contain" />
                                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 group-hover:ring-white/20 transition-all" />
                            </div>
                        </div>

                        <div className="p-6 lg:p-8 border-t border-white/5 bg-[#08080c]">
                            <div className="mb-6">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 block ml-1">Legenda da Imagem</label>
                                <textarea 
                                    autoFocus
                                    value={pendingCaption}
                                    onChange={(e) => setPendingCaption(e.target.value)}
                                    placeholder="Escreva uma legenda... (opcional)"
                                    className="w-full bg-white/3 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-primary-500/50 transition-all resize-none h-20 font-medium"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleConfirmSend();
                                        }
                                    }}
                                />
                            </div>

                            <div className="flex items-center justify-end gap-4">
                                <button
                                    onClick={handleCancelPending}
                                    className="px-6 py-3 text-xs font-black text-white/40 uppercase tracking-widest hover:text-white transition-all cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmSend}
                                    disabled={isUploading}
                                    className="flex items-center gap-2 px-10 py-3 bg-primary-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary-600 transition-all shadow-xl shadow-primary-500/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                >
                                    {isUploading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} />
                                            Enviar Agora
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ManageQuickRepliesModal({ quickReplies, setQuickReplies, onClose }: { quickReplies: any[], setQuickReplies: any, onClose: () => void }) {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [editingIndex, setEditingIndex] = useState(-1);
    const [shortcut, setShortcut] = useState('');
    const [text, setText] = useState('');
    const [list, setList] = useState(quickReplies);

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!shortcut.trim() || !text.trim() || !user?.organization?.id || isSaving) return;
        setIsSaving(true);
        try {
            const orgId = user.organization.id;
            const itemShortcut = shortcut.replace(/^\//, '').toLowerCase();
            const itemText = text.trim();
            const existingItem = list[editingIndex];
            
            let savedItem;
            if (existingItem?.id) {
                const { data } = await ticketService.updateQuickReply(existingItem.id, itemShortcut, itemText);
                if (data) savedItem = data;
            } else {
                const { data } = await ticketService.createQuickReply(orgId, itemShortcut, itemText);
                if (data) savedItem = data;
            }

            if (savedItem) {
                const newList = [...list];
                if (editingIndex >= 0) newList[editingIndex] = savedItem;
                else newList.push(savedItem);
                
                setList(newList);
                setQuickReplies(newList);
                setShortcut(''); setText(''); setEditingIndex(-1);
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-110 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-[#161623] border border-slate-200 dark:border-white/10 rounded-4xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-8 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                    <h3 className="text-lg font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-3"><Zap className="text-amber-500 dark:text-amber-400" /> {t('Respostas Rápidas', 'Quick Replies')}</h3>
                    <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40 hover:text-primary-500 dark:hover:text-white cursor-pointer"><X size={24} /></button>
                </div>
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    <div className="md:w-1/2 p-4 overflow-y-auto space-y-2 border-r border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20">
                        {list.map((qr, i) => (
                            <div key={i} className="p-4 rounded-2xl bg-white/3 border border-white/5 hover:border-white/10 transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-black text-primary-400 uppercase tracking-widest">/{qr.shortcut}</span>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => { setEditingIndex(i); setShortcut(qr.shortcut); setText(qr.text); }} className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white cursor-pointer"><Edit2 size={12} /></button>
                                        <button onClick={async () => {
                                            const item = list[i];
                                            if (item.id) await ticketService.deleteQuickReply(item.id);
                                            const nl = list.filter((_, idx) => idx !== i);
                                            setList(nl);
                                            setQuickReplies(nl);
                                        }} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 cursor-pointer"><Trash2 size={12} /></button>
                                    </div>
                                </div>
                                <p className="text-[11px] text-white/40 line-clamp-3 leading-relaxed">{qr.text}</p>
                            </div>
                        ))}
                    </div>
                    <div className="md:w-1/2 p-8 space-y-6 flex flex-col">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-1">{t('Atalho', 'Shortcut')}</label>
                            <input value={shortcut} onChange={e => setShortcut(e.target.value)} placeholder="vendas" className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary-500/50" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-1">{t('Mensagem', 'Message')}</label>
                            <textarea value={text} onChange={e => setText(e.target.value)} placeholder={t('Olá, como posso ajudar?', 'Hello, how can I help you?')} className="w-full h-full min-h-[120px] bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary-500/50 resize-none" />
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button onClick={() => { setEditingIndex(-1); setShortcut(''); setText(''); }} disabled={isSaving} className="flex-1 py-3 rounded-xl bg-white/3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5 transition-all cursor-pointer">{t('Cancelar', 'Cancel')}</button>
                            <button onClick={handleSave} disabled={isSaving} className="flex-1 py-3 rounded-xl bg-primary-500 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-all cursor-pointer disabled:opacity-50">{isSaving ? t('Salvando...', 'Saving...') : t('Salvar', 'Save')}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

