import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────
export type NotificationPermission = 'default' | 'granted' | 'denied';

interface BrowserNotificationsContextType {
    permission: NotificationPermission;
    isEnabled: boolean;
    unreadCount: number;
    requestPermission: () => Promise<void>;
    sendNotification: (title: string, body: string, options?: BrowserNotifOptions) => void;
    incrementUnread: () => void;
    resetUnread: () => void;
    toggleEnabled: () => void;
    isSoundEnabled: boolean;
    toggleSound: () => void;
}

interface BrowserNotifOptions {
    channel?: string;
    icon?: string;
    tag?: string;
    /** If true, clicking the notification focuses the tab */
    focusTab?: boolean;
}

const STORAGE_KEY_ENABLED = 'experchat_push_enabled';
const STORAGE_KEY_SOUND = 'experchat_sound_enabled';

const DEFAULT_ICON = '/app_icon.png';

// ── Context ────────────────────────────────────────────────────────────────
const BrowserNotificationsContext = createContext<BrowserNotificationsContextType | null>(null);

export function BrowserNotificationsProvider({ children }: { children: ReactNode }) {
    const [permission, setPermission] = useState<NotificationPermission>(() => {
        if (typeof Notification === 'undefined') return 'denied';
        return Notification.permission as NotificationPermission;
    });

    const [isEnabled, setIsEnabled] = useState(() => {
        try { return localStorage.getItem(STORAGE_KEY_ENABLED) === 'true'; }
        catch { return false; }
    });

    const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_SOUND);
            return stored === null ? true : stored === 'true'; // default ON
        } catch { return true; }
    });

    const [unreadCount, setUnreadCount] = useState(0);
    const originalTitle = useRef(document.title);

    // ── Sync Notification.permission on mount ──────────────────────────────
    useEffect(() => {
        if (typeof Notification !== 'undefined') {
            setPermission(Notification.permission as NotificationPermission);
        }
    }, []);

    // ── Update document title with badge ──────────────────────────────────
    useEffect(() => {
        if (unreadCount > 0) {
            document.title = `(${unreadCount}) Exper Chat`;
        } else {
            document.title = originalTitle.current;
        }
    }, [unreadCount]);

    // ── Reset unread when tab regains focus ───────────────────────────────
    useEffect(() => {
        const handleFocus = () => {
            setUnreadCount(0);
            document.title = originalTitle.current;
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    // ── Request permission ─────────────────────────────────────────────────
    const requestPermission = useCallback(async () => {
        if (typeof Notification === 'undefined') return;
        try {
            const result = await Notification.requestPermission();
            setPermission(result as NotificationPermission);
            if (result === 'granted') {
                setIsEnabled(true);
                localStorage.setItem(STORAGE_KEY_ENABLED, 'true');
            }
        } catch (err) {
            console.warn('[BrowserNotifs] requestPermission failed:', err);
        }
    }, []);

    // ── Toggle enabled ─────────────────────────────────────────────────────
    const toggleEnabled = useCallback(async () => {
        if (!isEnabled && permission !== 'granted') {
            // Need to ask permission first
            await requestPermission();
            return;
        }
        setIsEnabled(prev => {
            const next = !prev;
            localStorage.setItem(STORAGE_KEY_ENABLED, String(next));
            return next;
        });
    }, [isEnabled, permission, requestPermission]);

    // ── Toggle sound ───────────────────────────────────────────────────────
    const toggleSound = useCallback(() => {
        setIsSoundEnabled(prev => {
            const next = !prev;
            localStorage.setItem(STORAGE_KEY_SOUND, String(next));
            return next;
        });
    }, []);

    // ── Send a native push notification ───────────────────────────────────
    const sendNotification = useCallback((title: string, body: string, options: BrowserNotifOptions = {}) => {
        // Only fire if tab is NOT focused (no need to double-notify)
        if (document.hasFocus()) return;
        if (!isEnabled || permission !== 'granted') return;
        if (typeof Notification === 'undefined') return;

        try {
            const notif = new Notification(title, {
                body,
                icon: options.icon || DEFAULT_ICON,
                badge: DEFAULT_ICON,
                tag: options.tag || 'experchat-msg',
                requireInteraction: false,
                silent: true, // we handle sound ourselves
            });

            if (options.focusTab !== false) {
                notif.onclick = () => {
                    window.focus();
                    notif.close();
                };
            }

            // Auto-close after 6s
            setTimeout(() => notif.close(), 6000);
        } catch (err) {
            console.warn('[BrowserNotifs] Notification() failed:', err);
        }
    }, [isEnabled, permission]);

    // ── Unread badge helpers ───────────────────────────────────────────────
    const incrementUnread = useCallback(() => {
        if (!document.hasFocus()) {
            setUnreadCount(prev => prev + 1);
        }
    }, []);

    const resetUnread = useCallback(() => {
        setUnreadCount(0);
        document.title = originalTitle.current;
    }, []);

    return (
        <BrowserNotificationsContext.Provider value={{
            permission,
            isEnabled,
            unreadCount,
            requestPermission,
            sendNotification,
            incrementUnread,
            resetUnread,
            toggleEnabled,
            isSoundEnabled,
            toggleSound,
        }}>
            {children}
        </BrowserNotificationsContext.Provider>
    );
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useBrowserNotifications() {
    const ctx = useContext(BrowserNotificationsContext);
    if (!ctx) throw new Error('useBrowserNotifications must be used inside BrowserNotificationsProvider');
    return ctx;
}
