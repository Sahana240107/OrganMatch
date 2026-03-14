import { useEffect, useRef, useCallback, useState } from 'react';
import { WS_BASE } from '../utils/constants';

/**
 * useWebSocket — connects to the OrganMatch WS server
 * Auto-reconnects on drop. Exposes send() and connection state.
 *
 * @param {string}   path       - WS path, default '/'
 * @param {function} onMessage  - callback(parsedData)
 * @param {boolean}  enabled    - connect only when true (e.g. isAuthenticated)
 */
export function useWebSocket(path = '/', onMessage, enabled = true) {
    const wsRef = useRef(null);
    const retryRef = useRef(null);
    const onMsgRef = useRef(onMessage);
    const [status, setStatus] = useState('disconnected'); // 'connected' | 'connecting' | 'disconnected'

    // Keep callback ref fresh without re-running effect
    useEffect(() => { onMsgRef.current = onMessage; }, [onMessage]);

    const connect = useCallback(() => {
        if (!enabled) return;
        const token = localStorage.getItem('om_token');
        const url = `${WS_BASE}${path}${token ? `?token=${token}` : ''}`;

        setStatus('connecting');
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            setStatus('connected');
            clearTimeout(retryRef.current);
        };

        ws.onmessage = (e) => {
            try {
                const parsed = JSON.parse(e.data);
                onMsgRef.current?.(parsed);
            } catch {
                onMsgRef.current?.(e.data);
            }
        };

        ws.onclose = (e) => {
            setStatus('disconnected');
            if (e.code !== 1000) {
                // Abnormal close — retry with backoff
                retryRef.current = setTimeout(connect, 3000);
            }
        };

        ws.onerror = () => ws.close();
    }, [path, enabled]);

    useEffect(() => {
        if (!enabled) return;
        connect();
        return () => {
            clearTimeout(retryRef.current);
            wsRef.current?.close(1000, 'Component unmounted');
        };
    }, [connect, enabled]);

    const send = useCallback((data) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
        }
    }, []);

    return { send, status, isConnected: status === 'connected' };
}

export default useWebSocket;