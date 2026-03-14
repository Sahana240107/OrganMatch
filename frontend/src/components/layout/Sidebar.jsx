import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';

const NAV = [
    {
        section: 'Overview',
        items: [
            { icon: '◉', label: 'Live Dashboard', to: '/dashboard' },
            { icon: '📋', label: 'Active Matches', to: '/matches' },
        ],
    },
    {
        section: 'Registry',
        items: [
            { icon: '❤️', label: 'Donors', to: '/donors' },
            { icon: '🏥', label: 'Waiting List', to: '/waiting-list' },
            { icon: '🩸', label: 'Blood Bank', to: '/blood-bank' },
        ],
    },
    {
        section: 'Operations',
        items: [
            { icon: '🔬', label: 'Matching Engine', to: '/matching' },
            { icon: '📍', label: 'Location Map', to: '/map' },
            { icon: '🚁', label: 'Transport', to: '/transport' },
            { icon: '📬', label: 'Offers', to: '/offers' },
        ],
    },
    {
        section: 'Reports',
        items: [
            { icon: '📊', label: 'Analytics', to: '/analytics' },
            { icon: '📁', label: 'Audit Log', to: '/audit', roles: [ROLES.NATIONAL_ADMIN] },
            { icon: '🏆', label: 'Transplant History', to: '/history' },
        ],
    },
];

export default function Sidebar() {
    const { user, logout, hasRole } = useAuth();
    const navigate = useNavigate();

    return (
        <aside className="sidebar">
            {NAV.map((group) => (
                <div key={group.section}>
                    <div className="sidebar-section">{group.section}</div>
                    {group.items
                        .filter(item => !item.roles || hasRole(...item.roles))
                        .map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
                                style={{ textDecoration: 'none' }}
                            >
                                <span className="si-icon">{item.icon}</span>
                                {item.label}
                            </NavLink>
                        ))}
                </div>
            ))}

            {/* User info at bottom */}
            <div style={{ marginTop: 'auto', padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'rgba(79,156,249,0.15)', border: '1px solid rgba(79,156,249,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: '#4f9cf9', flexShrink: 0,
                    }}>
                        {user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'JK'}
                    </div>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{user?.name || 'User'}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)' }}>{user?.hospital || 'System'}</div>
                    </div>
                </div>
                <button
                    onClick={logout}
                    style={{
                        width: '100%', padding: '7px 12px',
                        background: 'rgba(224,92,58,0.08)', border: '1px solid rgba(224,92,58,0.2)',
                        borderRadius: 8, color: '#e05c3a', fontSize: 11, fontWeight: 500,
                        cursor: 'pointer', fontFamily: 'var(--font-body)',
                        transition: 'all 0.2s',
                    }}
                >
                    Sign Out
                </button>
            </div>
        </aside>
    );
}