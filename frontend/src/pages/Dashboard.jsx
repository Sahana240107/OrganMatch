import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import KPICard from '../components/ui/KPICard';
import ViabilityRing from '../components/ui/ViabilityRing';
import OrganPill from '../components/ui/OrganPill';
import { useApi } from '../hooks/useApi';
import { formatTime, formatDistance, timeAgo } from '../utils/formatters';

export default function Dashboard() {
    const navigate = useNavigate();
    const { get: getAnalytics, data: analyticsData, loading } = useApi();
    const { get: getOrgans, data: organsData } = useApi();
    const { get: getDonors, data: donorsData } = useApi();
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const refresh = useCallback(() => {
        getAnalytics('/analytics/summary');
        getOrgans('/donors/organs/available');
        getDonors('/donors');
        setLastUpdated(new Date());
    }, [getAnalytics, getOrgans, getDonors]);

    useEffect(() => {
        refresh();
        const t = setInterval(refresh, 30000);
        return () => clearInterval(t);
    }, []);

    // Real DB fields from vw_analytics_summary / analytics controller
    const stats = analyticsData?.data || {};
    const organs = organsData?.data || [];
    const donors = donorsData?.data || [];

    const critical = organs.filter(o => o.viability_pct != null && o.viability_pct < 30).length;

    const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <div className="dashboard">
            <div className="dash-main">
                {/* Header */}
                <div className="dash-header">
                    <div>
                        <div className="dash-title">National Overview</div>
                        <div className="dash-sub">
                            {loading ? 'Refreshing…' : `Live · updated ${timeAgo(lastUpdated.toISOString())}`}
                            &nbsp;·&nbsp;{dateStr}
                        </div>
                    </div>
                    <div className="dash-actions">
                        <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: 12 }} onClick={() => navigate('/donors/register')}>
                            + Register Donor
                        </button>
                        <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 12 }} onClick={() => navigate('/matching')}>
                            Run Match
                        </button>
                    </div>
                </div>

                {/* KPIs — uses real analytics fields */}
                <div className="kpi-grid">
                    <KPICard label="Available Organs" value={stats.organs_available ?? '—'} delta="Live from DB" color="teal" barPct={Math.min(100, (stats.organs_available || 0) / 80 * 100)} />
                    <KPICard label="Recipients Waiting" value={stats.recipients_waiting ?? '—'} delta="On national waiting list" color="steel" barPct={Math.min(100, (stats.recipients_waiting || 0) / 500 * 100)} />
                    <KPICard label="Total Transplants" value={stats.total_transplants ?? '—'} delta="All time" color="sienna" barPct={60} />
                    <KPICard label="Organs Expiring Soon" value={critical} delta="Viability below 30%" color="coral" barPct={Math.min(100, critical / 10 * 100)} />
                </div>

                <div className="two-col">
                    {/* Available organs panel */}
                    <div className="panel">
                        <div className="panel-header">
                            <div className="panel-title">Available Organs</div>
                            <span className="panel-badge pb-teal">{organs.length} active</span>
                        </div>
                        {organs.length === 0 && !loading && (
                            <div className="empty-state"><div className="empty-icon">🫀</div>No available organs right now</div>
                        )}
                        {organs.slice(0, 8).map(o => (
                            <div key={o.organ_id} className="match-item" onClick={() => navigate(`/matching/${o.organ_id}`)}>
                                <OrganPill organId={o.organ_type} />
                                <div className="match-info">
                                    <div className="match-title">{o.donor_hospital}</div>
                                    <div className="match-meta">Blood: {o.blood_group} · {o.donor_city}</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                                    <div className="score-bar-outer">
                                        <div className="score-bar-fill" style={{ width: `${o.viability_pct || 0}%` }} />
                                    </div>
                                    <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                                        {o.hours_remaining != null ? `${Number(o.hours_remaining).toFixed(1)}h left` : '—'}
                                    </div>
                                </div>
                                <div className="timer-chip">Match →</div>
                            </div>
                        ))}
                        {organs.length > 8 && (
                            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)' }}>
                                <button className="btn-ghost" onClick={() => navigate('/matching')}>View all {organs.length} organs →</button>
                            </div>
                        )}
                    </div>

                    {/* Right column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* Viability rings */}
                        <div className="panel">
                            <div className="panel-header">
                                <div className="panel-title">Viability Windows</div>
                                {critical > 0 && <span className="panel-badge pb-red">{critical} critical</span>}
                            </div>
                            <div className="viability-col">
                                {organs.slice(0, 5).map(o => (
                                    <div key={o.organ_id} className="viab-item">
                                        <ViabilityRing remainingHours={Number(o.hours_remaining) || 0} maxHours={Number(o.viability_hours) || 24} size={44} />
                                        <div>
                                            <div className="viab-organ">{o.organ_type?.replace('_', ' ')} · {o.blood_group}</div>
                                            <div className="viab-time">{o.hours_remaining != null ? `${Number(o.hours_remaining).toFixed(1)}h remaining` : ''} · {o.donor_city}</div>
                                        </div>
                                    </div>
                                ))}
                                {organs.length === 0 && <div style={{ padding: '12px 0', color: 'var(--text-3)', fontSize: 12 }}>No organs available</div>}
                            </div>
                        </div>

                        {/* Offer statistics */}
                        <div className="panel">
                            <div className="panel-header"><div className="panel-title">Offer Statistics</div></div>
                            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {[
                                    { label: 'Pending', value: stats.offer_stats?.pending_offers || 0, color: 'var(--amber)' },
                                    { label: 'Accepted', value: stats.offer_stats?.accepted_offers || 0, color: 'var(--forest)' },
                                    { label: 'Declined', value: stats.offer_stats?.declined_offers || 0, color: 'var(--burgundy)' },
                                    { label: 'Expired', value: stats.offer_stats?.expired_offers || 0, color: 'var(--text-3)' },
                                ].map(s => (
                                    <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                                        <span style={{ color: 'var(--text-2)' }}>{s.label}</span>
                                        <span style={{ fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent donors */}
                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-title">Recent Donors</div>
                        <button className="btn-ghost" onClick={() => navigate('/donors/register')}>+ Register →</button>
                    </div>
                    {donors.length === 0 ? (
                        <div className="empty-state"><div className="empty-icon">❤️</div>No donors registered yet</div>
                    ) : (
                        <table className="data-table">
                            <thead><tr>
                                <th>Name</th><th>Blood</th><th>Type</th><th>Hospital</th><th>Status</th><th>Registered</th>
                            </tr></thead>
                            <tbody>
                                {donors.slice(0, 6).map(d => (
                                    <tr key={d.donor_id}>
                                        <td style={{ fontWeight: 600 }}>{d.full_name}</td>
                                        <td style={{ fontFamily: 'var(--font-mono)' }}>{d.blood_group}</td>
                                        <td style={{ textTransform: 'capitalize' }}>{d.donor_type}</td>
                                        <td style={{ color: 'var(--text-2)', fontSize: 12 }}>{d.hospital_name}</td>
                                        <td><span className={`chip ${d.status === 'active' ? 'chip-teal' : d.status === 'deceased' ? 'chip-coral' : 'chip-muted'}`}>{d.status}</span></td>
                                        <td style={{ color: 'var(--text-3)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{new Date(d.created_at).toLocaleDateString('en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Quick actions */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
                    {[
                        { label: 'Register Recipient', icon: '🏥', to: '/recipients/register', color: 'var(--steel)' },
                        { label: 'Waiting List', icon: '📋', to: '/waiting-list', color: 'var(--sienna)' },
                        { label: 'Location Map', icon: '📍', to: '/map', color: 'var(--forest)' },
                        { label: 'Analytics', icon: '📊', to: '/analytics', color: 'var(--amber)' },
                    ].map(q => (
                        <div key={q.to} onClick={() => navigate(q.to)} style={{
                            background: 'var(--surface)', border: '1px solid var(--border)',
                            borderRadius: 'var(--r-lg)', padding: '14px 16px',
                            cursor: 'pointer', transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', gap: 12,
                        }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.background = 'var(--surface-hover)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
                        >
                            <div style={{
                                width: 34, height: 34, borderRadius: 8,
                                background: `color-mix(in srgb, ${q.color} 12%, transparent)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0,
                            }}>{q.icon}</div>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{q.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}