import React, { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';

export interface ToastNotification {
    id: string;
    title: string;
    body: string;
    channel?: string;
    timestamp: number;
}

interface NotificationToastProps {
    notifications: ToastNotification[];
    onDismiss: (id: string) => void;
}

const CHANNEL_CONFIG: Record<string, { bg: string; icon: React.ReactNode }> = {
    whatsapp: {
        bg: 'rgba(37, 211, 102, 0.15)',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.119 1.532 5.843L0 24l6.334-1.51A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.5-5.223-1.374l-.374-.222-3.881.925.974-3.769-.244-.389A9.945 9.945 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
            </svg>
        ),
    },
    instagram: {
        bg: 'rgba(214, 41, 118, 0.15)',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20">
                <defs>
                    <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f09433" />
                        <stop offset="25%" stopColor="#e6683c" />
                        <stop offset="50%" stopColor="#dc2743" />
                        <stop offset="75%" stopColor="#cc2366" />
                        <stop offset="100%" stopColor="#bc1888" />
                    </linearGradient>
                </defs>
                <path fill="url(#ig-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
        ),
    },
    messenger: {
        bg: 'rgba(0, 120, 255, 0.15)',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#0078FF">
                <path d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z" />
            </svg>
        ),
    },
    default: {
        bg: 'rgba(99, 102, 241, 0.15)',
        icon: (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#6366f1">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
        ),
    },
};

function ToastItem({ notif, onDismiss }: { notif: ToastNotification; onDismiss: (id: string) => void }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Animate in
        const showTimer = setTimeout(() => setVisible(true), 10);
        // Auto-dismiss after 5s
        const dismissTimer = setTimeout(() => {
            setVisible(false);
            setTimeout(() => onDismiss(notif.id), 400);
        }, 5000);
        return () => {
            clearTimeout(showTimer);
            clearTimeout(dismissTimer);
        };
    }, [notif.id, onDismiss]);

    const channelKey = notif.channel || 'default';
    const { bg, icon } = CHANNEL_CONFIG[channelKey] || CHANNEL_CONFIG.default;

    return (
        <div
            className="flex items-start gap-3 w-80 rounded-2xl p-4 shadow-2xl border border-white/10 cursor-pointer select-none relative overflow-hidden"
            style={{
                background: 'rgba(18, 18, 28, 0.92)',
                backdropFilter: 'blur(20px)',
                transform: visible ? 'translateX(0)' : 'translateX(110%)',
                opacity: visible ? 1 : 0,
                transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
            }}
            onClick={() => {
                setVisible(false);
                setTimeout(() => onDismiss(notif.id), 400);
            }}
        >
            {/* Channel Icon */}
            <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: bg }}>
                {icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white/90 truncate">{notif.title}</p>
                <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{notif.body}</p>
            </div>

            {/* Dismiss button */}
            <button
                className="shrink-0 text-white/30 hover:text-white/70 transition-colors pt-0.5"
                onClick={(e) => {
                    e.stopPropagation();
                    setVisible(false);
                    setTimeout(() => onDismiss(notif.id), 400);
                }}
            >
                <X size={14} />
            </button>

            {/* Progress bar */}
            <div
                className="absolute bottom-0 left-0 h-0.5 rounded-full"
                style={{
                    background: 'rgba(99, 102, 241, 0.6)',
                    width: visible ? '0%' : '100%',
                    transition: visible ? 'width 5s linear' : 'none',
                    marginLeft: '1px',
                }}
            />
        </div>
    );
}

export default function NotificationToast({ notifications, onDismiss }: NotificationToastProps) {
    if (notifications.length === 0) return null;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '1.5rem',
                right: '1.5rem',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column-reverse',
                gap: '0.75rem',
                pointerEvents: 'none',
            }}
        >
            {notifications.map((notif) => (
                <div key={notif.id} style={{ pointerEvents: 'auto' }}>
                    <ToastItem notif={notif} onDismiss={onDismiss} />
                </div>
            ))}
        </div>
    );
}

// Hook for managing toast notifications
export function useNotificationToast() {
    const [notifications, setNotifications] = useState<ToastNotification[]>([]);

    const addNotification = useCallback((title: string, body: string, channel?: string) => {
        const id = `${Date.now()}-${Math.random()}`;
        setNotifications(prev => [...prev, { id, title, body, channel, timestamp: Date.now() }]);
    }, []);

    const dismissNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    return { notifications, addNotification, dismissNotification };
}
