import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'

const NAV = [
  { to: '/',           label: 'Dashboard'         },
  { section: 'Clinical' },
  { to: '/matching',   label: 'Matching Engine',  children: [
    { to: '/matching',         label: 'Find Match'    },
    { to: '/matching/results', label: 'Match Results' },
  ]},
  { to: '/donors',     label: 'Donors'            },
  { to: '/recipients', label: 'Recipients'        },
  { to: '/waiting',    label: 'Waiting List'      },
  { to: '/emergency',  label: 'Emergency Alerts'  },
  { to: '/offers',     label: 'Offer Workflow'    },
  { section: 'Network' },
  { to: '/map',        label: 'Location Map'      },
  { to: '/hospitals',  label: 'Hospitals'         },
  { to: '/blood-bank', label: 'Blood Bank'        },
  { section: 'Records' },
  { to: '/history',    label: 'Transplant History'},
  { to: '/analytics',  label: 'Analytics'         },
  { to: '/notifications', label: 'Notifications'  },
]

export default function Sidebar() {
  const { user, logout }     = useAuth()
  const { unreadCount }      = useNotifications()
  const { pathname }         = useLocation()
  const [open, setOpen]      = useState(false)

  const isMatchingActive = pathname.startsWith('/matching')

  function handleNavClick() { setOpen(false) }

  return (
    <>
      {/* ── Hamburger button (always visible top-left) ──────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', top: 12, left: 14, zIndex: 200,
          width: 36, height: 36, borderRadius: 9,
          background: open ? 'var(--accent)' : 'var(--bg2)',
          border: '1px solid var(--border2)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 4,
          cursor: 'pointer', transition: 'background 0.2s, transform 0.2s',
          boxShadow: 'var(--shadow-sm)',
          padding: 0,
        }}
        title={open ? 'Close menu' : 'Open menu'}
      >
        {open ? (
          <svg viewBox="0 0 20 20" fill="white" width="16" height="16">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
          </svg>
        ) : (
          <>
            <span style={{ width:16, height:2, background:'var(--text2)', borderRadius:2, display:'block' }}/>
            <span style={{ width:16, height:2, background:'var(--text2)', borderRadius:2, display:'block' }}/>
            <span style={{ width:16, height:2, background:'var(--text2)', borderRadius:2, display:'block' }}/>
          </>
        )}
      </button>

      {/* ── Backdrop ────────────────────────────────────────────────────── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,30,70,0.35)',
            zIndex: 150, backdropFilter: 'blur(2px)',
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      {/* ── Sidebar drawer ──────────────────────────────────────────────── */}
      <aside
        className="sidebar"
        style={{
          position: 'fixed', top: 0, left: 0, height: '100vh',
          zIndex: 160,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          boxShadow: open ? 'var(--shadow-xl)' : 'none',
        }}
      >
        <div className="sidebar-logo" style={{ paddingLeft: 56 }}>
          <div className="logo-mark">
            <svg viewBox="0 0 24 24" fill="white" width="20" height="20">
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
            </svg>
          </div>
          <div>
            <div className="logo-text">OrganMatch</div>
            <div className="logo-sub">2.0 Platform</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((item, i) => {
            if (item.section) return (
              <div key={i} className="nav-section">{item.section}</div>
            )

            if (item.children) {
              return (
                <div key={item.to}>
                  <NavLink
                    to={item.to}
                    end
                    className={({ isActive }) => `nav-item${isActive || isMatchingActive ? ' active' : ''}`}
                    onClick={handleNavClick}
                  >
                    {ICONS[item.label]}{item.label}
                  </NavLink>
                  {isMatchingActive && (
                    <div style={{ marginLeft:16, borderLeft:'2px solid var(--border2)', paddingLeft:12, marginBottom:2 }}>
                      {item.children.map(child => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          end
                          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                          style={{ fontSize:12.5, paddingTop:6, paddingBottom:6 }}
                          onClick={handleNavClick}
                        >
                          {SUB_ICONS[child.label]}{child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            const isNotif    = item.to === '/notifications'
            const badgeCount = isNotif ? unreadCount : null
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                onClick={handleNavClick}
              >
                {ICONS[item.label]}
                {item.label}
                {badgeCount > 0 && (
                  <span className="nav-badge">{badgeCount > 99 ? '99+' : badgeCount}</span>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="user-card" onClick={() => { logout(); setOpen(false) }} title="Click to logout">
            <div className="avatar">{user?.full_name?.slice(0,2).toUpperCase() || 'TC'}</div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:12.5, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {user?.full_name || 'Coordinator'}
              </div>
              <div style={{ fontSize:11, color:'var(--text3)', textTransform:'capitalize' }}>
                {user?.role?.replace(/_/g,' ') || 'Staff'}
              </div>
            </div>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{width:14,height:14,color:'var(--text3)',marginLeft:'auto',flexShrink:0}}>
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
          </div>
        </div>
      </aside>
    </>
  )
}

const SUB_ICONS = {
  'Find Match':   <svg viewBox="0 0 20 20" fill="currentColor" style={{width:13,height:13,flexShrink:0}}><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/></svg>,
  'Match Results':<svg viewBox="0 0 20 20" fill="currentColor" style={{width:13,height:13,flexShrink:0}}><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>,
}

const ICONS = {
  'Dashboard':          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>,
  'Matching Engine':    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z"/></svg>,
  'Donors':             <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>,
  'Recipients':         <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17.555 16.549A9.97 9.97 0 0110 19a9.97 9.97 0 01-7.555-3.451A2 2 0 014 13h12a2 2 0 012 3l-.445-.451z"/></svg>,
  'Waiting List':       <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/></svg>,
  'Emergency Alerts':   <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>,
  'Offer Workflow':     <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg>,
  'Location Map':       <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>,
  'Hospitals':          <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-5L9 4H4zm7 5a1 1 0 10-2 0v1H8a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V9z" clipRule="evenodd"/></svg>,
  'Blood Bank':         <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/></svg>,
  'Transplant History': <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/></svg>,
  'Analytics':          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>,
  'Notifications':      <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>,
}