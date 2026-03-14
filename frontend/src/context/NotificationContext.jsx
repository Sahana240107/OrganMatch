import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { WS_EVENTS } from '../utils/constants';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
    const { token, isAuthenticated } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [liveToast, setLiveToast] = useState(null);
    const wsRef = useRef(null);
    const toastRef = useRef(null);

    const push = useCallback((notif) => {
        const entry = { ...notif, id: Date.now(), ts: new Date().toISOString(), read: false };
        setNotifications(prev => [entry, ...prev].slice(0, 50));
        setUnreadCount(c => c + 1);
        setLiveToast(entry);
        clearTimeout(toastRef.current);
        toastRef.current = setTimeout(() => setLiveToast(null), 7000);
    }, []);

    const markRead = useCallback((id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(c => Math.max(0, c - 1));
    }, []);

    const markAllRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    }, []);

    const dismissToast = useCallback(() => {
        setLiveToast(null);
        clearTimeout(toastRef.current);
    }, []);

    // WebSocket connection
    useEffect(() => {
        if (!isAuthenticated || !token) return;

        const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
        let ws;
        let reconnectTimer;

        function connect() {
            ws = new WebSocket(`${WS_URL}?token=${token}`);
            wsRef.current = ws;

            ws.onopen = () => console.log('[WS] Connected');

            ws.onmessage = (e) => {
                try {
                    const msg = JSON.parse(e.data);
                    switch (msg.event) {
                        case WS_EVENTS.MATCH_FOUND:
                            push({
                                type: 'match',
                                title: `Match Found — ${msg.data.organType}`,
                                body: `${msg.data.recipientName} — ${msg.data.score} score. Ischemic window: ${msg.data.viabilityHours}h remaining.`,
                                data: msg.data,
                            });
                            break;
                        case WS_EVENTS.OFFER_ACCEPTED:
                            push({
                                type: 'offer_accepted',
                                title: 'Offer Accepted',
                                body: `${msg.data.hospitalName} accepted offer for ${msg.data.organType}`,
                                data: msg.data,
                            });
                            break;
                        case WS_EVENTS.OFFER_DECLINED:
                            push({
                                type: 'offer_declined',
                                title: 'Offer Declined — Cascading',
                                body: `${msg.data.hospitalName} declined. Next recipient in queue notified.`,
                                data: msg.data,
                            });
                            break;
                        case WS_EVENTS.ORGAN_EXPIRING:
                            push({
                                type: 'urgent',
                                title: `⚠ Organ Expiring — ${msg.data.organType}`,
                                body: `Only ${msg.data.remainingHours}h left. Immediate action required.`,
                                data: msg.data,
                            });
                            break;
                        default:
                            break;
                    }
                } catch (err) {
                    console.warn('[WS] Parse error', err);
                }
            };

            ws.onclose = () => {
                console.log('[WS] Disconnected — reconnecting in 3s');
                reconnectTimer = setTimeout(connect, 3000);
            };

            ws.onerror = (err) => {
                console.warn('[WS] Error', err);
                ws.close();
            };
        }

        connect();

        return () => {
            clearTimeout(reconnectTimer);
            if (wsRef.current) wsRef.current.close();
        };
    }, [isAuthenticated, token, push]);

    return (
        <NotificationContext.Provider value={{
            notifications, unreadCount, liveToast,
            markRead, markAllRead, dismissToast,
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
    return ctx;
}