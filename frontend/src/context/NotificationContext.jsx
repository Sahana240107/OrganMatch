import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
    const { token } = useAuth()
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const wsRef = useRef(null)

    const addNotification = useCallback((notif) => {
        setNotifications((prev) => [notif, ...prev].slice(0, 50))
        setUnreadCount((c) => c + 1)
    }, [])

    const markAllRead = useCallback(() => setUnreadCount(0), [])

    useEffect(() => {
        if (!token) return

        function connect() {
            const ws = new WebSocket(`ws://${window.location.hostname}:5000/ws`)
            wsRef.current = ws

            ws.onopen = () => {
                ws.send(JSON.stringify({ type: 'subscribe' }))
            }

            ws.onmessage = (e) => {
                try {
                    const msg = JSON.parse(e.data)
                    if (msg.type === 'match_computed' || msg.type === 'offer_update' || msg.type === 'notification') {
                        addNotification({ ...msg.data, _type: msg.type, _ts: msg.ts })
                    }
                } catch (_) { }
            }

            ws.onclose = () => {
                // Auto-reconnect after 3s
                setTimeout(connect, 3000)
            }
        }

        connect()
        return () => wsRef.current?.close()
    }, [token, addNotification])

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead }}>
            {children}
        </NotificationContext.Provider>
    )
}

export const useNotifications = () => useContext(NotificationContext)