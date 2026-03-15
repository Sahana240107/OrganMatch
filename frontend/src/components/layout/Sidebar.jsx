import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';

const NAV = [
    {
        section: 'Overview',
        items: [
            { icon: '◉', label: 'Live Dashboard', to: '/dashboard' },
            { icon: '📋', label: 'Waiting List', to: '/waiting-list' },
        ],
    },
    {
        section: 'Registry',
        items: [
            { icon: '❤️', label: 'Register Donor', to: '/donors/register', roles: [ROLES.HOSPITAL_STAFF, ROLES.NATIONAL_ADMIN] },
            { icon: '🏥', label: 'Register Recipient', to: '/recipients/register', roles: [ROLES.HOSPITAL_STAFF, ROLES.NATIONAL_ADMIN] },
        ],
    },
    {
        section: 'Operations',
        items: [
            { icon: '🔬', label: 'Matching Engine', to: '/matching' },
            { icon: '📍', label: 'Location Map', to: '/map' },
            { icon: '📬', label: 'Offer Workflow', to: '/offers', roles: [ROLES.TRANSPLANT_COORDINATOR, ROLES.NATIONAL_ADMIN] },
        ],
    },
    {
        section: 'Reports',
        items: [
            { icon: '🏆', label: 'Transplant History', to: '/history' },
            { icon: '📊', label: 'Analytics', to: '/analytics', roles: [ROLES.NATIONAL_ADMIN] },
        ],
    },
];

export default function Sidebar() {
    const { user, logout, hasRole } = useAuth();

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

            <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '12px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
                    <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, rgba(124,29,46,0.5), rgba(124,29,46,0.2))',
                        border: '1px solid rgba(158,40,64,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: '#e8c4b8',
                        fontFamily: 'var(--font-mono)',
                    }}>
                        {user?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'OM'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(245,240,232,0.78)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user?.full_name || 'User'}
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(245,240,232,0.28)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', textTransform: 'capitalize' }}>
                            {user?.role?.replace(/_/g, ' ') || 'System'}
                        </div>
                    </div>
                </div>
                <button
                    onClick={logout}
                    style={{
                        width: '100%', padding: '6px 10px',
                        background: 'rgba(124,29,46,0.15)', border: '1px solid rgba(124,29,46,0.28)',
                        borderRadius: 5, color: '#c8707a', fontSize: 11, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,29,46,0.25)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,29,46,0.15)'; }}
                >
                    Sign Out
                </button>
            </div>
        </aside>
    );
}