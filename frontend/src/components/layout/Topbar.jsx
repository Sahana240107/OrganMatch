import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { timeAgo } from '../../utils/formatters';

export default function Topbar() {
    const { user } = useAuth();
    const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
    const [showNotifs, setShowNotifs] = useState(false);
    const panelRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        function handler(e) {
            if (panelRef.current && !panelRef.current.contains(e.target)) setShowNotifs(false);
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'OM';

    return (
        <header className="topbar">
            {/* Logo */}
            <div className="logo" onClick={() => navigate('/dashboard')}>
                <div className="logo-icon">🫀</div>
                OrganMatch
                <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(245,240,232,0.28)', marginLeft: 2 }}>2.0</span>
            </div>

            {/* Right */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

                {/* Live indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(245,240,232,0.38)' }}>
                    <span style={{
                        display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                        background: '#267044',
                        boxShadow: '0 0 0 0 rgba(38,112,68,0.6)',
                        animation: 'pulse-dot 2.4s ease-in-out infinite',
                        flexShrink: 0,
                    }} />
                    Live
                </div>

                <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />

                {/* Notifications */}
                <div ref={panelRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => { setShowNotifs(v => !v); if (unreadCount) markAllRead(); }}
                        style={{
                            position: 'relative',
                            background: showNotifs ? 'rgba(255,255,255,0.08)' : 'transparent',
                            border: '1px solid',
                            borderColor: showNotifs ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)',
                            borderRadius: 6, width: 32, height: 32,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', fontSize: 14, transition: 'all 0.12s',
                        }}
                    >
                        🔔
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute', top: -4, right: -4,
                                minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
                                background: '#9e2840', color: '#fff',
                                fontSize: 9, fontWeight: 800,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '1.5px solid var(--bg-inv)',
                                fontFamily: 'var(--font-mono)',
                            }}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifs && (
                        <div style={{
                            position: 'absolute', top: 40, right: 0, width: 310, zIndex: 500,
                            background: 'var(--surface)',
                            border: '1px solid var(--border-2)',
                            borderRadius: 'var(--r-md)', overflow: 'hidden',
                            boxShadow: 'var(--shadow-xl)',
                            animation: 'fade-up 0.16s ease',
                        }}>
                            <div style={{
                                padding: '9px 13px', borderBottom: '1px solid var(--border)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                background: 'var(--surface-2)',
                            }}>
                                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--text-2)' }}>
                                    Notifications
                                </div>
                                {notifications.length > 0 && (
                                    <button onClick={markAllRead} className="btn-ghost" style={{ fontSize: 10 }}>
                                        Mark all read
                                    </button>
                                )}
                            </div>
                            <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                                {notifications.length === 0 ? (
                                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
                                        No notifications
                                    </div>
                                ) : (
                                    notifications.slice(0, 20).map(n => (
                                        <div key={n.id} onClick={() => markRead(n.id)}
                                            style={{
                                                padding: '9px 13px', borderBottom: '1px solid var(--border)',
                                                cursor: 'pointer', transition: 'background 0.1s',
                                                display: 'flex', gap: 9, alignItems: 'flex-start',
                                                background: n.read ? 'transparent' : 'var(--amber-dim)',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                                            onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : 'var(--amber-dim)'}
                                        >
                                            {!n.read && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0, marginTop: 5 }} />}
                                            <div style={{ flex: 1, marginLeft: n.read ? 14 : 0 }}>
                                                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2, color: 'var(--text)' }}>{n.title}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>{n.body}</div>
                                                <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>{timeAgo(n.ts)}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* User */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(245,240,232,0.8)', lineHeight: 1.3 }}>{user?.name || 'User'}</div>
                        <div style={{ fontSize: 10, color: 'rgba(245,240,232,0.32)', lineHeight: 1.3, fontFamily: 'var(--font-mono)' }}>{user?.hospital || ''}</div>
                    </div>
                    <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(124,29,46,0.6), rgba(124,29,46,0.3))',
                        border: '1px solid rgba(158,40,64,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: '#e8c4b8',
                        fontFamily: 'var(--font-mono)',
                    }}>
                        {initials}
                    </div>
                </div>
            </div>
        </header>
    );
}