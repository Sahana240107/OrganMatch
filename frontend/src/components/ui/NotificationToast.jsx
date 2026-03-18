import { useEffect, useState } from 'react'

const TYPE_CONFIG = {
  new_match:    { icon:'🎯', bg:'var(--blue-bg)',  color:'var(--blue)'  },
  offer_sent:   { icon:'📨', bg:'var(--amber-bg)', color:'var(--amber)' },
  accepted:     { icon:'✅', bg:'var(--green-bg)', color:'var(--green)' },
  declined:     { icon:'❌', bg:'var(--red-bg)',   color:'var(--red)'   },
  default:      { icon:'🔔', bg:'var(--bg3)',       color:'var(--text2)' },
}

export default function NotificationToast({ title, body, type = 'default', onClose, duration = 5000 }) {
  const [visible, setVisible] = useState(true)
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.default

  useEffect(() => {
    const id = setTimeout(() => { setVisible(false); setTimeout(onClose, 300) }, duration)
    return () => clearTimeout(id)
  }, [])

  return (
    <div className="toast" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : 'translateX(20px)', transition:'all 0.3s' }}>
      <div className="toast-icon" style={{ background: cfg.bg, color: cfg.color }}>{cfg.icon}</div>
      <div style={{ flex:1 }}>
        <div className="toast-title">{title}</div>
        {body && <div className="toast-body">{body}</div>}
      </div>
      <button onClick={() => { setVisible(false); setTimeout(onClose, 300) }}
        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', padding:4, fontSize:16 }}>×</button>
    </div>
  )
}
