import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
    const { token, isAuthenticated } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [liveToast, setLiveToast] = useState(null);
    const wsRef = useRef(null);
    const retryRef = useRef(null);
    const toastRef = useRef(null);

    const push = useCallback((notif) => {
        const entry = { ...notif, id: Date.now(), ts: new Date().toISOString(), read: false };
        setNotifications(prev => [entry, ...prev].slice(0, 50));
        setUnreadCount(c => c + 1);
        setLiveToast(entry);
        clearTimeout(toastRef.current);
        toastRef.current = setTimeout(() => setLiveToast(null), 7000);
    }, []);

    const markRead = useCallback(id => { setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n)); setUnreadCount(c => Math.max(0, c - 1)); }, []);
    const markAllRead = useCallback(() => { setNotifications(p => p.map(n => ({ ...n, read: true }))); setUnreadCount(0); }, []);
    const dismissToast = useCallback(() => { setLiveToast(null); clearTimeout(toastRef.current); }, []);

    useEffect(() => {
        if (!isAuthenticated || !token) return;
        const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';

        function connect() {
            const ws = new WebSocket(`${WS_URL}?token=${token}`);
            wsRef.current = ws;

            ws.onopen = () => { clearTimeout(retryRef.current); };

            ws.onmessage = e => {
                try {
                    const msg = JSON.parse(e.data);
                    // Backend broadcasts: donor_registered, organ_available, match_completed,
                    // offer_sent, offer_accepted, offer_declined_next_notified, organ_status_changed
                    const MAP = {
                        match_completed: { type: 'match', title: `Match Complete — ${msg.match_count || 0} found`, body: `Organ #${msg.organ_id}` },
                        offer_accepted: { type: 'offer_accepted', title: 'Offer Accepted', body: `Offer #${msg.offer_id} accepted` },
                        offer_declined_next_notified: { type: 'offer_declined', title: 'Offer Declined', body: 'Cascading to next recipient' },
                        organ_available: { type: 'match', title: `Organ Available — ${msg.organ_type}`, body: `Viability: ${msg.viability_hours}h` },
                        donor_registered: { type: 'match', title: 'Donor Registered', body: msg.full_name },
                    };
                    const notif = MAP[msg.event];
                    if (notif) push({ ...notif, data: msg });
                } catch (_) { }
            };

            ws.onclose = () => { retryRef.current = setTimeout(connect, 5000); };
            ws.onerror = () => ws.close();
        }

        connect();
        return () => { clearTimeout(retryRef.current); wsRef.current?.close(1000, 'unmount'); };
    }, [isAuthenticated, token, push]);

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, liveToast, markRead, markAllRead, dismissToast }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be inside NotificationProvider');
    return ctx;
}