import { useEffect, useRef, useCallback } from 'react'

/**
 * useWebSocket — connects to ws://:5000/ws with auto-reconnect.
 *
 * @param {function} onMessage  called with parsed JSON on every message
 */
export function useWebSocket(onMessage) {
    const wsRef = useRef(null)
    const retryRef = useRef(null)
    const mountedRef = useRef(true)

    const connect = useCallback(() => {
        if (!mountedRef.current) return
        const ws = new WebSocket(`ws://${window.location.hostname}:5000/ws`)
        wsRef.current = ws

        ws.onopen = () => { clearTimeout(retryRef.current) }
        ws.onmessage = (e) => {
            try { onMessage(JSON.parse(e.data)) } catch (_) { }
        }
        ws.onclose = () => {
            if (mountedRef.current) {
                retryRef.current = setTimeout(connect, 3000)
            }
        }
        ws.onerror = () => ws.close()
    }, [onMessage])

    useEffect(() => {
        mountedRef.current = true
        connect()
        return () => {
            mountedRef.current = false
            clearTimeout(retryRef.current)
            wsRef.current?.close()
        }
    }, [connect])

    const send = useCallback((payload) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(payload))
        }
    }, [])

    return { send }
}