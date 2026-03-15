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
    const retryCount = useRef(0);
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
            // Exponential backoff — max 30s, stop after 5 failures silently
            const delay = Math.min(30000, 2000 * Math.pow(2, retryCount.current));

            try {
                const ws = new WebSocket(`${WS_URL}/?token=${token}`);
                wsRef.current = ws;

                ws.onopen = () => {
                    retryCount.current = 0;
                    clearTimeout(retryRef.current);
                };

                ws.onmessage = e => {
                    try {
                        const msg = JSON.parse(e.data);
                        const MAP = {
                            match_completed: { title: `Match Complete — ${msg.data?.match_count || 0} found`, body: `Organ #${msg.data?.organ_id}` },
                            offer_accepted: { title: 'Offer Accepted', body: `Offer #${msg.data?.offer_id} accepted` },
                            offer_declined_next_notified: { title: 'Offer Declined', body: 'Cascading to next recipient' },
                            organ_available: { title: `Organ Available — ${msg.data?.organ_type}`, body: `Viability: ${msg.data?.viability_hours}h` },
                            donor_registered: { title: 'Donor Registered', body: msg.data?.full_name || '' },
                        };
                        const notif = MAP[msg.event];
                        if (notif) push({ ...notif, data: msg.data });
                    } catch (_) { }
                };

                ws.onclose = (e) => {
                    // Only retry if it's not a clean close and backend might be up
                    if (e.code !== 1000 && retryCount.current < 5) {
                        retryCount.current += 1;
                        retryRef.current = setTimeout(connect, delay);
                    }
                };

                // Suppress error noise in console — onclose fires right after
                ws.onerror = () => { };

            } catch (_) {
                // WebSocket constructor can throw if URL is invalid
            }
        }

        connect();
        return () => {
            clearTimeout(retryRef.current);
            retryCount.current = 99; // prevent reconnect on unmount
            wsRef.current?.close(1000, 'unmount');
        };
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