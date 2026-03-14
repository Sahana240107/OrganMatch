import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import KPICard from '../components/ui/KPICard';
import ViabilityRing from '../components/ui/ViabilityRing';
import OrganPill from '../components/ui/OrganPill';
import { useApi } from '../hooks/useApi';
import { formatTime, formatDistance, timeAgo } from '../utils/formatters';

/* ── Fallback mock data so the UI always renders ── */
const MOCK_KPI = {
    availableOrgans: 47,
    criticalPatients: 12,
    matchesToday: 9,
    expiringSoon: 5,
};

const MOCK_MATCHES = [
    { id: 1, organId: 'heart', donor: 'Ramesh K.', recipient: 'AIIMS Delhi', blood: 'B+', hla: '5/6', distance: 284, score: 92, timer: '3h 12m', status: 'pending' },
    { id: 2, organId: 'kidney_l', donor: 'Priya S.', recipient: 'PGI Chandigarh', blood: 'O+', hla: '6/6', distance: 142, score: 97, timer: null, status: 'confirmed' },
    { id: 3, organId: 'liver', donor: 'Mohan R.', recipient: 'Apollo Chennai', blood: 'A+', hla: '4/6', distance: 68, score: 88, timer: '6h 45m', status: 'pending' },
    { id: 4, organId: 'lung_r', donor: 'Sunita T.', recipient: 'Fortis Mumbai', blood: 'AB+', hla: '3/6', distance: 510, score: 79, timer: '5h 20m', status: 'pending' },
    { id: 5, organId: 'cornea', donor: 'Kavitha N.', recipient: 'Sankara Netralaya', blood: 'B+', hla: 'N/A', distance: 12, score: 95, timer: null, status: 'confirmed' },
];

const MOCK_VIABILITY = [
    { id: 'DH-031', organId: 'heart', remaining: 3.2, max: 4 },
    { id: 'DH-029', organId: 'kidney_l', remaining: 18.1, max: 36 },
    { id: 'DH-030', organId: 'liver', remaining: 9.75, max: 24 },
    { id: 'DH-032', organId: 'lung_r', remaining: 2.1, max: 6 },
    { id: 'DH-033', organId: 'cornea', remaining: 96, max: 168 },
];

const MOCK_ACTIVITY = [
    { id: 1, type: 'match', msg: 'New match: Kidney → AIIMS Delhi (97.2)', ts: new Date(Date.now() - 120000).toISOString() },
    { id: 2, type: 'accept', msg: 'Offer accepted: Liver → Apollo Chennai', ts: new Date(Date.now() - 600000).toISOString() },
    { id: 3, type: 'register', msg: 'Donor registered: DH-2024-034 at PGIMER', ts: new Date(Date.now() - 1800000).toISOString() },
    { id: 4, type: 'decline', msg: 'Offer declined by Max Delhi — cascading', ts: new Date(Date.now() - 3600000).toISOString() },
    { id: 5, type: 'expire', msg: 'Organ DH-028 viability < 10% — urgent', ts: new Date(Date.now() - 7200000).toISOString() },
];

const ACTIVITY_COLORS = {
    match: '#30d9a0',
    accept: '#4f9cf9',
    register: '#b478ff',
    decline: '#f0a940',
    expire: '#e05c3a',
};

export default function Dashboard() {
    const navigate = useNavigate();
    const { get, data, loading } = useApi();
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const kpi = data?.kpi || MOCK_KPI;
    const matches = data?.matches || MOCK_MATCHES;
    const viability = data?.viability || MOCK_VIABILITY;
    const activity = data?.activity || MOCK_ACTIVITY;

    const refresh = useCallback(() => {
        get('/dashboard/summary');
        setLastUpdated(new Date());
    }, [get]);

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 30000);
        return () => clearInterval(interval);
    }, [refresh]);

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <div className="dashboard">
            <div className="dash-main">
                {/* Header */}
                <div className="dash-header">
                    <div>
                        <div className="dash-title">National Overview</div>
                        <div className="dash-sub">
                            {loading ? 'Refreshing…' : `Live · updated ${timeAgo(lastUpdated.toISOString())}`}
                            &nbsp;•&nbsp;{dateStr}
                        </div>
                    </div>
                    <div className="dash-actions">
                        <button
                            className="btn-secondary"
                            style={{ padding: '8px 16px', fontSize: 12 }}
                            onClick={() => navigate('/donors/register')}
                        >
                            + Register Donor
                        </button>
                        <button
                            className="btn-primary"
                            style={{ padding: '8px 16px', fontSize: 12 }}
                            onClick={() => navigate('/matching')}
                        >
                            Run Match
                        </button>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="kpi-grid">
                    <KPICard
                        label="Available Organs"
                        value={kpi.availableOrgans}
                        delta="↑ 8 in last 24 hrs"
                        color="green"
                        barPct={Math.round((kpi.availableOrgans / 80) * 100)}
                    />
                    <KPICard
                        label="Critical Patients (1A)"
                        value={kpi.criticalPatients}
                        delta="3 heart · 5 liver · 4 lung"
                        color="red"
                        barPct={Math.round((kpi.criticalPatients / 50) * 100)}
                    />
                    <KPICard
                        label="Matches Today"
                        value={kpi.matchesToday}
                        delta="6 confirmed · 3 pending offer"
                        color="blue"
                        barPct={Math.round((kpi.matchesToday / 20) * 100)}
                    />
                    <KPICard
                        label="Organs Expiring Soon"
                        value={kpi.expiringSoon}
                        delta="Within next 6 hours"
                        color="amber"
                        barPct={Math.round((kpi.expiringSoon / 30) * 100)}
                    />
                </div>

                {/* Main two-col */}
                <div className="two-col">
                    {/* Active Matches */}
                    <div className="panel">
                        <div className="panel-header">
                            <div className="panel-title">Active Matches — Pending Offers</div>
                            <span className="panel-badge pb-red">
                                {matches.filter(m => m.status === 'pending').length} urgent
                            </span>
                        </div>
                        {matches.map(m => (
                            <div
                                key={m.id}
                                className="match-item"
                                onClick={() => navigate(`/offers/${m.id}`)}
                            >
                                <OrganPill organId={m.organId} />
                                <div className="match-info">
                                    <div className="match-title">{m.donor} → {m.recipient}</div>
                                    <div className="match-meta">
                                        Blood: {m.blood} · HLA: {m.hla} · {formatDistance(m.distance)}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                    <div className="score-bar-outer">
                                        <div className="score-bar-fill" style={{ width: `${m.score}%` }} />
                                    </div>
                                    <div className="match-score">{m.score}</div>
                                </div>
                                {m.status === 'confirmed' ? (
                                    <div className="timer-chip" style={{ color: '#30d9a0', background: 'rgba(48,217,160,0.1)' }}>
                                        ✓ Confirmed
                                    </div>
                                ) : (
                                    <div className="timer-chip">⏱ {m.timer}</div>
                                )}
                            </div>
                        ))}
                        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)' }}>
                            <button
                                onClick={() => navigate('/matches')}
                                style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                            >
                                View all active matches →
                            </button>
                        </div>
                    </div>

                    {/* Right column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* Viability */}
                        <div className="panel">
                            <div className="panel-header">
                                <div className="panel-title">Viability Windows</div>
                                <span className="panel-badge pb-red">
                                    {viability.filter(v => (v.remaining / v.max) < 0.3).length} critical
                                </span>
                            </div>
                            <div className="viability-col">
                                {viability.map(v => {
                                    const organ = { heart: '❤️', kidney_l: '🫘', kidney_r: '🫘', liver: '🫀', lung_r: '🫁', lung_l: '🫁', cornea: '👁' };
                                    return (
                                        <div key={v.id} className="viab-item">
                                            <ViabilityRing remainingHours={v.remaining} maxHours={v.max} size={44} />
                                            <div>
                                                <div className="viab-organ">
                                                    {organ[v.organId] || '🫀'} {v.organId.charAt(0).toUpperCase() + v.organId.slice(1).replace('_', ' ')} — {v.id}
                                                </div>
                                                <div className="viab-time">
                                                    {formatTime(Math.round(v.remaining * 60))} remaining · Max {v.max}h
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Activity Feed */}
                        <div className="panel">
                            <div className="panel-header">
                                <div className="panel-title">Recent Activity</div>
                                <span className="panel-badge pb-green">Live</span>
                            </div>
                            <div style={{ padding: '4px 0' }}>
                                {activity.map(a => (
                                    <div
                                        key={a.id}
                                        style={{
                                            padding: '10px 16px',
                                            borderBottom: '1px solid var(--border)',
                                            display: 'flex', alignItems: 'flex-start', gap: 10,
                                        }}
                                    >
                                        <div style={{
                                            width: 6, height: 6, borderRadius: '50%',
                                            background: ACTIVITY_COLORS[a.type] || '#fff',
                                            marginTop: 5, flexShrink: 0,
                                        }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>{a.msg}</div>
                                            <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 3 }}>{timeAgo(a.ts)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom quick-actions row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
                    {[
                        { label: 'Register Recipient', icon: '🏥', to: '/recipients/register', color: '#4f9cf9' },
                        { label: 'View Waiting List', icon: '📋', to: '/waiting-list', color: '#b478ff' },
                        { label: 'Location Map', icon: '📍', to: '/map', color: '#30d9a0' },
                        { label: 'Analytics', icon: '📊', to: '/analytics', color: '#f0a940' },
                    ].map(q => (
                        <div
                            key={q.to}
                            onClick={() => navigate(q.to)}
                            style={{
                                background: 'var(--surface)', border: '1px solid var(--border)',
                                borderRadius: 14, padding: '16px 18px',
                                cursor: 'pointer', transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', gap: 12,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.background = 'var(--surface-hover)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
                        >
                            <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: `${q.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 18, flexShrink: 0,
                            }}>
                                {q.icon}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{q.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}