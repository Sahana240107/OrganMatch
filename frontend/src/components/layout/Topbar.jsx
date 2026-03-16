import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../../context/NotificationContext'

const PAGE_META = {
    '/': { title: 'Dashboard', sub: 'Overview' },
    '/matching': { title: 'Matching Engine', sub: 'Real-time Organ Matching · AI-Ranked Candidates' },
    '/donors': { title: 'Donors', sub: 'Active Donor Registry' },
    '/recipients': { title: 'Recipients', sub: 'Waiting List Management' },
    '/waiting': { title: 'Waiting List', sub: 'Priority-Ordered Queue' },
    '/offers': { title: 'Offer Workflow', sub: 'Timed Offer Cascade' },
    '/map': { title: 'Location Map', sub: 'Geographic Network · Transport Radius' },
    '/hospitals': { title: 'Hospitals', sub: '24 Active Hospitals · Pan-India' },
    '/history': { title: 'Transplant History', sub: 'Outcomes Database' },
    '/analytics': { title: 'Analytics', sub: 'National Statistics · Trends' },
    '/notifications': { title: 'Notifications', sub: 'Alerts & Updates' },
    '/register-donor': { title: 'Register Donor', sub: 'Multi-Step Donor Registration' },
    '/register-recipient': { title: 'Register Recipient', sub: 'New Recipient Enrollment' },
}

export default function Topbar({ path }) {
    const navigate = useNavigate()
    const { unreadCount } = useNotifications()
    const meta = PAGE_META[path] || { title: path.replace('/', ''), sub: '' }
    const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })

    return (
        <div className="topbar">
            <div style={{ flex: 1 }}>
                <div className="topbar-title">{meta.title}</div>
                <div className="topbar-sub">{meta.sub} · {dateStr}</div>
            </div>
            <div className="flex items-center gap-8">
                <div className="relative">
                    <button className="icon-btn" onClick={() => navigate('/notifications')} title="Notifications">
                        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" /></svg>
                    </button>
                    {unreadCount > 0 && (
                        <span style={{ position: 'absolute', top: -2, right: -2, width: 7, height: 7, background: 'var(--red)', borderRadius: '50%', border: '2px solid var(--bg2)' }} />
                    )}
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/register-donor')}>
                    + Register Donor
                </button>
            </div>
        </div>
    )
}