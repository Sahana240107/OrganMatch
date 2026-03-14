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

    // Close on outside click
    useEffect(() => {
        function handler(e) {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setShowNotifs(false);
            }
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <header className="topbar">
            {/* Logo */}
            <div
                className="logo"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/dashboard')}
            >
                <div className="logo-icon">🫀</div>
                OrganMatch
                <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--muted)', marginLeft: 2 }}>2.0</span>
            </div>

            {/* Right side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Live indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
                    <span style={{
                        display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                        background: '#30d9a0', boxShadow: '0 0 6px #30d9a0',
                        animation: 'pulse-dot 2s ease-in-out infinite',
                    }} />
                    Live
                </div>

                {/* Notifications bell */}
                <div ref={panelRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => { setShowNotifs(v => !v); if (unreadCount) markAllRead(); }}
                        style={{
                            position: 'relative',
                            background: showNotifs ? 'var(--surface-hover)' : 'none',
                            border: '1px solid var(--border)',
                            borderRadius: 8, width: 34, height: 34,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', fontSize: 16, transition: 'background 0.15s',
                        }}
                    >
                        🔔
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute', top: -4, right: -4,
                                width: 17, height: 17, borderRadius: '50%',
                                background: '#e05c3a', color: 'white',
                                fontSize: 9, fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '1.5px solid var(--bg)',
                            }}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Dropdown panel */}
                    {showNotifs && (
                        <div style={{
                            position: 'absolute', top: 42, right: 0,
                            width: 320, zIndex: 500,
                            background: 'rgba(8,14,26,0.97)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid var(--border)',
                            borderRadius: 14, overflow: 'hidden',
                            boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
                            animation: 'fade-up 0.2s ease',
                        }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>Notifications</div>
                                <button
                                    onClick={markAllRead}
                                    style={{ fontSize: 10, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    Mark all read
                                </button>
                            </div>
                            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                                {notifications.length === 0 ? (
                                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
                                        No notifications yet
                                    </div>
                                ) : (
                                    notifications.slice(0, 20).map((n) => (
                                        <div
                                            key={n.id}
                                            onClick={() => markRead(n.id)}
                                            style={{
                                                padding: '12px 16px',
                                                borderBottom: '1px solid var(--border)',
                                                cursor: 'pointer',
                                                background: n.read ? 'transparent' : 'rgba(255,255,255,0.02)',
                                                transition: 'background 0.15s',
                                            }}
                                        >
                                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3, color: n.read ? 'var(--muted)' : 'var(--text)' }}>
                                                {n.title}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--faint)', lineHeight: 1.5 }}>{n.body}</div>
                                            <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 4 }}>{timeAgo(n.ts)}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* User avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{user?.hospital || ''}</div>
                    <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: 'rgba(79,156,249,0.15)', border: '1px solid rgba(79,156,249,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: '#4f9cf9',
                    }}>
                        {user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'OM'}
                    </div>
                </div>
            </div>
        </header>
    );
}