import React, { useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';

export default function Analytics() {
    const { get, data, loading } = useApi();
    const { hasRole } = useAuth();

    useEffect(() => { get('/analytics/summary'); }, []);

    const d = data?.data || {};
    const byOrgan = d.transplants_by_organ || [];
    const maxOrganCount = Math.max(...byOrgan.map(o => o.count), 1);
    const avgWait = d.avg_wait_days_by_organ || [];

    const ORGAN_COLORS = {
        kidney: 'var(--blue)', liver: 'var(--teal)', heart: 'var(--coral)',
        lung: 'var(--purple)', cornea: 'var(--amber)',
    };

    return (
        <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, letterSpacing: -0.5, marginBottom: 6 }}>Analytics</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 24 }}>Platform-wide statistics · Live from database</div>

            {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>}

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
                {[
                    { label: 'Total Donors', value: d.total_donors ?? '—', color: 'var(--coral)' },
                    { label: 'Recipients Waiting', value: d.recipients_waiting ?? '—', color: 'var(--blue)' },
                    { label: 'Available Organs', value: d.organs_available ?? '—', color: 'var(--teal)' },
                    { label: 'Total Transplants', value: d.total_transplants ?? '—', color: 'var(--purple)' },
                ].map(k => (
                    <div key={k.label} className="kpi-card">
                        <div className="kpi-label">{k.label}</div>
                        <div className="kpi-val" style={{ color: k.color }}>{k.value}</div>
                    </div>
                ))}
            </div>

            <div className="two-col" style={{ marginBottom: 20 }}>
                {/* Transplants by organ */}
                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-title">Transplants by Organ Type</div>
                        <span className="panel-badge pb-green">All time</span>
                    </div>
                    <div style={{ padding: '18px 20px' }}>
                        {byOrgan.length === 0 && !loading && (
                            <div style={{ color: 'var(--text-2)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No transplant data yet</div>
                        )}
                        {byOrgan.map(o => {
                            const color = ORGAN_COLORS[o.organ_type] || 'var(--blue)';
                            return (
                                <div key={o.organ_type} style={{ marginBottom: 14 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                        <span style={{ fontSize: 12, fontWeight: 500, textTransform: 'capitalize' }}>{o.organ_type}</span>
                                        <span style={{ fontSize: 11, fontWeight: 700, color }}>{o.count}</span>
                                    </div>
                                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%', width: `${(o.count / maxOrganCount) * 100}%`,
                                            background: `linear-gradient(90deg,${color},${color}99)`, borderRadius: 3, transition: 'width 0.8s ease'
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Offer stats */}
                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-title">Offer Statistics</div>
                        <span className="panel-badge pb-blue">All time</span>
                    </div>
                    <div style={{ padding: '18px 20px' }}>
                        {[
                            { label: 'Pending', value: d.offer_stats?.pending_offers || 0, color: 'var(--amber)' },
                            { label: 'Accepted', value: d.offer_stats?.accepted_offers || 0, color: 'var(--teal)' },
                            { label: 'Declined', value: d.offer_stats?.declined_offers || 0, color: 'var(--coral)' },
                            { label: 'Expired', value: d.offer_stats?.expired_offers || 0, color: 'var(--text-3)' },
                        ].map(s => (
                            <div key={s.label} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13
                            }}>
                                <span style={{ color: 'var(--text-2)' }}>{s.label} Offers</span>
                                <span style={{ fontWeight: 800, fontSize: 20, color: s.color, fontFamily: 'var(--font-body)', letterSpacing: -1 }}>{s.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Avg wait */}
                    {avgWait.length > 0 && (
                        <>
                            <div style={{ padding: '12px 20px 4px', fontSize: 12, fontWeight: 600, borderTop: '1px solid var(--border)' }}>
                                Avg Wait Days by Organ
                            </div>
                            <div style={{ padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {avgWait.map(w => (
                                    <div key={w.organ_needed} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                        <span style={{ color: 'var(--text-2)', textTransform: 'capitalize' }}>{w.organ_needed}</span>
                                        <span style={{ fontWeight: 600 }}>{w.avg_wait_days ? `${Number(w.avg_wait_days).toFixed(0)} days` : '—'}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}