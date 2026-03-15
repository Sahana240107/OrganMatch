import { useEffect, useState } from 'react'

/**
 * NotificationToast — ephemeral toast that auto-dismisses after `duration` ms.
 * Used by NotificationContext to surface live WebSocket events.
 */
export default function NotificationToast({ message, type = 'info', duration = 4000, onDismiss }) {
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        const id = setTimeout(() => {
            setVisible(false)
            setTimeout(onDismiss, 300)
        }, duration)
        return () => clearTimeout(id)
    }, [duration, onDismiss])

    const colors = {
        info: { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)', color: 'var(--blue)' },
        success: { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)', color: 'var(--accent)' },
        warning: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', color: 'var(--amber)' },
        error: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', color: 'var(--red)' },
    }
    const c = colors[type] || colors.info

    return (
        <div style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            background: c.bg, border: `1px solid ${c.border}`,
            borderRadius: 12, padding: '12px 16px',
            maxWidth: 340, backdropFilter: 'blur(8px)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.3s, transform 0.3s',
            display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0, marginTop: 4 }} />
            <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{message.title}</div>
                {message.body && (
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{message.body}</div>
                )}
            </div>
            <button
                onClick={() => { setVisible(false); setTimeout(onDismiss, 300) }}
                style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', marginLeft: 'auto', fontSize: 14, lineHeight: 1 }}
            >✕</button>
        </div>
    )
}