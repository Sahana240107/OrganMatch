import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'

const NAV = [
  { to: '/',           label: 'Dashboard',        section: null },
  { section: 'Clinical' },
  { to: '/matching',   label: 'Matching Engine',  badge: null },
  { to: '/donors',     label: 'Donors' },
  { to: '/recipients', label: 'Recipients',       badge: '12' },
  { to: '/waiting',    label: 'Waiting List' },
  { to: '/offers',     label: 'Offer Workflow',   badge: '3', badgeColor: '#f59e0b' },
  { section: 'Network' },
  { to: '/map',        label: 'Location Map' },
  { to: '/hospitals',  label: 'Hospitals' },
  { section: 'Records' },
  { to: '/history',    label: 'Transplant History' },
  { to: '/analytics',  label: 'Analytics' },
]

const ICONS = {
  'Dashboard':         <DashIcon />,
  'Matching Engine':   <MatchIcon />,
  'Donors':            <PersonIcon />,
  'Recipients':        <GroupIcon />,
  'Waiting List':      <ListIcon />,
  'Offer Workflow':    <OfferIcon />,
  'Location Map':      <MapIcon />,
  'Hospitals':         <HospIcon />,
  'Transplant History':<ClockIcon />,
  'Analytics':         <ChartIcon />,
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { unreadCount }  = useNotifications()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
            <path d="M12 2C8 2 5 5 5 8.5c0 2 1 3.8 2.5 5L12 22l4.5-8.5C18 12.3 19 10.5 19 8.5 19 5 16 2 12 2zm0 9a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
          </svg>
        </div>
        <div>
          <div className="logo-text">OrganMatch</div>
          <div className="logo-sub">v2.0 Platform</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((item, i) => {
          if (item.section) return <div key={i} className="nav-section">{item.section}</div>
          const badgeCount = item.to === '/notifications' ? unreadCount : item.badge
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              {ICONS[item.label]}
              {item.label}
              {badgeCount ? (
                <span className="nav-badge" style={item.badgeColor ? { background: item.badgeColor } : {}}>
                  {badgeCount}
                </span>
              ) : null}
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="user-card" onClick={logout} title="Click to logout">
          <div className="avatar">{user?.full_name?.slice(0,2).toUpperCase() || 'TC'}</div>
          <div>
            <div className="user-name" style={{ fontSize: 12, fontWeight: 500 }}>{user?.full_name || 'Coordinator'}</div>
            <div className="user-role" style={{ fontSize: 10, color: 'var(--text2)' }}>{user?.role?.replace('_',' ')}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

/* ── Inline SVG icons ── */
function DashIcon()  { return <svg viewBox="0 0 20 20" fill="currentColor"><rect x="2" y="2" width="7" height="7" rx="1"/><rect x="11" y="2" width="7" height="7" rx="1"/><rect x="2" y="11" width="7" height="7" rx="1"/><rect x="11" y="11" width="7" height="7" rx="1"/></svg> }
function MatchIcon() { return <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 14a6 6 0 110-12A6 6 0 0110 16zM9 7l5 3-5 3V7z"/></svg> }
function PersonIcon(){ return <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/></svg> }
function GroupIcon() { return <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17.555 16.549A9.97 9.97 0 0110 19a9.97 9.97 0 01-7.555-3.451A2 2 0 014 13h12a2 2 0 012 3l-.445-.451z"/></svg> }
function ListIcon()  { return <svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 100 2 1 1 0 000-2zm4 0a1 1 0 100 2 1 1 0 000-2zm4 0a1 1 0 100 2 1 1 0 000-2z"/></svg> }
function OfferIcon() { return <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a3 3 0 000 6H4a3 3 0 000-6zm10 0h3a3 3 0 000 6h-3a3 3 0 000-6zm-7 7a1 1 0 100 2h6a1 1 0 100-2H7z"/></svg> }
function MapIcon()   { return <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg> }
function HospIcon()  { return <svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a1 1 0 000 2h1v10H4a1 1 0 100 2h12a1 1 0 100-2h-1V5h1a1 1 0 100-2H4zm3 2h6v10H7V5zm2 3a1 1 0 011-1h0a1 1 0 011 1v2a1 1 0 01-1 1h0a1 1 0 01-1-1V8z"/></svg> }
function ClockIcon() { return <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg> }
function ChartIcon() { return <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-4a1 1 0 011-1h2a1 1 0 011 1v13a1 1 0 01-1 1h-2a1 1 0 01-1-1V3z"/></svg> }
