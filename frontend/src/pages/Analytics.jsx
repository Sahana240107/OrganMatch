import React, { useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function Analytics() {
    const { get, data, loading } = useApi();

    useEffect(() => { get('/analytics/summary'); }, []);

    // Real DB fields from analytics controller:
    // organs_available, organs_allocated, organs_transplanted, organs_expired,
    // recipients_waiting, critical_patients, transplants_today,
    // avg_cold_ischemia_hrs, graft_success_pct, total_donors, total_transplants,
    // offer_stats { pending_offers, accepted_offers, declined_offers, expired_offers },
    // transplants_by_organ [ { organ_type, count } ],
    // avg_wait_days_by_organ [ { organ_needed, avg_wait_days } ]
    const d = data?.data || {};
    const byOrgan = d.transplants_by_organ || [];
    const avgWait = d.avg_wait_days_by_organ || [];
    const maxOrganCount = Math.max(...byOrgan.map(o => o.count), 1);

    const ORGAN_COLORS = {
        kidney: 'var(--steel)', liver: 'var(--forest)', heart: 'var(--burgundy)',
        lung: 'var(--sienna)', cornea: 'var(--amber)', pancreas: 'var(--amber)',
        bone: 'var(--text-3)', small_intestine: 'var(--text-3)',
    };

    return (
        <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: -0.3, marginBottom: 4 }}>Analytics</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>Platform-wide statistics · Live from database</div>

            {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>}

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', marginBottom: 20 }}>
                {[
                    { label: 'Total Donors', value: d.total_donors ?? '—', color: 'var(--burgundy)' },
                    { label: 'Waiting Patients', value: d.recipients_waiting ?? '—', color: 'var(--steel)' },
                    { label: 'Available Organs', value: d.organs_available ?? '—', color: 'var(--forest)' },
                    { label: 'Total Transplants', value: d.total_transplants ?? '—', color: 'var(--sienna)' },
                ].map(k => (
                    <div key={k.label} className="kpi-card">
                        <div className="kpi-label">{k.label}</div>
                        <div className="kpi-val" style={{ color: k.color, fontSize: 26 }}>{k.value}</div>
                    </div>
                ))}
            </div>

            {/* Organ stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', marginBottom: 20 }}>
                {[
                    { label: 'Organs Allocated', value: d.organs_allocated ?? '—', color: 'var(--amber)' },
                    { label: 'Organs Transplanted', value: d.organs_transplanted ?? '—', color: 'var(--forest)' },
                    { label: 'Organs Expired', value: d.organs_expired ?? '—', color: 'var(--burgundy)' },
                    { label: 'Critical Patients', value: d.critical_patients ?? '—', color: 'var(--burgundy)' },
                ].map(k => (
                    <div key={k.label} className="kpi-card">
                        <div className="kpi-label">{k.label}</div>
                        <div className="kpi-val" style={{ color: k.color, fontSize: 24 }}>{k.value}</div>
                    </div>
                ))}
            </div>

            <div className="two-col" style={{ marginBottom: 18 }}>
                {/* Transplants by organ */}
                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-title">Transplants by Organ Type</div>
                        <span className="panel-badge pb-teal">All time</span>
                    </div>
                    <div style={{ padding: '16px 18px' }}>
                        {byOrgan.length === 0 && !loading && (
                            <div style={{ color: 'var(--text-3)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No transplant data yet</div>
                        )}
                        {byOrgan.map(o => {
                            const color = ORGAN_COLORS[o.organ_type] || 'var(--steel)';
                            return (
                                <div key={o.organ_type} style={{ marginBottom: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 12, fontWeight: 500, textTransform: 'capitalize' }}>{o.organ_type}</span>
                                        <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{o.count}</span>
                                    </div>
                                    <div style={{ height: 5, background: 'var(--border-2)', borderRadius: 2, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${(o.count / maxOrganCount) * 100}%`, background: color, borderRadius: 2, transition: 'width 0.8s ease' }} />
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
                    <div style={{ padding: '16px 18px' }}>
                        {[
                            { label: 'Pending', value: d.offer_stats?.pending_offers || 0, color: 'var(--amber)' },
                            { label: 'Accepted', value: d.offer_stats?.accepted_offers || 0, color: 'var(--forest)' },
                            { label: 'Declined', value: d.offer_stats?.declined_offers || 0, color: 'var(--burgundy)' },
                            { label: 'Expired', value: d.offer_stats?.expired_offers || 0, color: 'var(--text-3)' },
                        ].map(s => (
                            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                                <span style={{ color: 'var(--text-2)' }}>{s.label} Offers</span>
                                <span style={{ fontWeight: 700, fontSize: 18, color: s.color, fontFamily: 'var(--font-mono)', letterSpacing: -0.5 }}>{s.value}</span>
                            </div>
                        ))}

                        {/* Graft success */}
                        {d.graft_success_pct != null && (
                            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Graft Success Rate</div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--forest)', fontFamily: 'var(--font-mono)' }}>{d.graft_success_pct}%</div>
                            </div>
                        )}
                    </div>

                    {/* Avg wait by organ */}
                    {avgWait.length > 0 && (
                        <>
                            <div style={{ padding: '10px 18px 4px', fontSize: 11, fontWeight: 600, borderTop: '1px solid var(--border)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Avg Wait Days by Organ</div>
                            <div style={{ padding: '0 18px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {avgWait.map(w => (
                                    <div key={w.organ_needed} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                        <span style={{ color: 'var(--text-2)', textTransform: 'capitalize' }}>{w.organ_needed}</span>
                                        <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{w.avg_wait_days ? `${Number(w.avg_wait_days).toFixed(0)} days` : '—'}</span>
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