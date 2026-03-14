import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

const MONTHLY_TRANSPLANTS = [
    { month: 'Oct', count: 312, success: 298 },
    { month: 'Nov', count: 287, success: 271 },
    { month: 'Dec', count: 334, success: 319 },
    { month: 'Jan', count: 356, success: 341 },
    { month: 'Feb', count: 298, success: 285 },
    { month: 'Mar', count: 218, success: 209 }, // partial month
];

const ORGAN_DISTRIBUTION = [
    { organ: 'Kidney', count: 1842, color: '#4f9cf9', pct: 44 },
    { organ: 'Liver', count: 832, color: '#30d9a0', pct: 20 },
    { organ: 'Cornea', count: 724, color: '#f0a940', pct: 17 },
    { organ: 'Heart', count: 418, color: '#e05c3a', pct: 10 },
    { organ: 'Lung', count: 248, color: '#b478ff', pct: 6 },
    { organ: 'Other', count: 154, color: '#8a9ab5', pct: 3 },
];

const HOSPITAL_STATS = [
    { name: 'AIIMS Delhi', transplants: 412, successRate: 97.1, avgMatchTime: '2.1h' },
    { name: 'PGIMER Chandigarh', transplants: 334, successRate: 96.4, avgMatchTime: '2.4h' },
    { name: 'Apollo Chennai', transplants: 287, successRate: 95.8, avgMatchTime: '3.1h' },
    { name: 'KEM Mumbai', transplants: 264, successRate: 94.2, avgMatchTime: '2.8h' },
    { name: 'Medanta Gurgaon', transplants: 218, successRate: 96.8, avgMatchTime: '1.9h' },
];

const BAR_MAX = Math.max(...MONTHLY_TRANSPLANTS.map(m => m.count));

export default function Analytics() {
    const { get, data } = useApi();

    useEffect(() => { get('/analytics/summary'); }, [get]);

    return (
        <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: -0.5, marginBottom: 6 }}>
                Analytics
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
                Platform-wide performance metrics · Last 6 months
            </div>

            {/* Top KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
                {[
                    { label: 'Transplants This Year', value: '4,218', delta: '↑ 12% vs last year', color: '#30d9a0' },
                    { label: 'Success Rate', value: '96.2%', delta: 'Above NOTTO target', color: '#4f9cf9' },
                    { label: 'Avg Match Time', value: '2.4h', delta: '↓ 38% this month', color: '#b478ff' },
                    { label: '1-Year Graft Survival', value: '94.2%', delta: 'HLA + ABO combined', color: '#f0a940' },
                ].map(k => (
                    <div key={k.label} className="kpi-card">
                        <div className="kpi-label">{k.label}</div>
                        <div className="kpi-val" style={{ color: k.color }}>{k.value}</div>
                        <div className="kpi-delta">{k.delta}</div>
                    </div>
                ))}
            </div>

            <div className="two-col" style={{ marginBottom: 20 }}>
                {/* Monthly chart */}
                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-title">Monthly Transplants</div>
                        <span className="panel-badge pb-green">Oct–Mar 2026</span>
                    </div>
                    <div style={{ padding: '20px 20px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 140 }}>
                            {MONTHLY_TRANSPLANTS.map(m => {
                                const totalH = (m.count / BAR_MAX) * 130;
                                const successH = (m.success / BAR_MAX) * 130;
                                return (
                                    <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                        <div style={{ fontSize: 10, color: '#30d9a0', fontWeight: 700 }}>{m.count}</div>
                                        <div style={{ position: 'relative', width: '100%', height: totalH, background: 'rgba(79,156,249,0.15)', borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'flex-end' }}>
                                            <div style={{ width: '100%', height: successH, background: 'linear-gradient(to top, #30d9a0, #4f9cf9)', borderRadius: '4px 4px 0 0', transition: 'height 0.6s ease' }} />
                                        </div>
                                        <div style={{ fontSize: 10, color: 'var(--muted)' }}>{m.month}</div>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
                                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'linear-gradient(135deg,#30d9a0,#4f9cf9)' }} />
                                Successful
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
                                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(79,156,249,0.15)', border: '1px solid rgba(79,156,249,0.3)' }} />
                                Total
                            </div>
                        </div>
                    </div>
                </div>

                {/* Organ distribution */}
                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-title">Organ Distribution</div>
                        <span className="panel-badge pb-blue">This Year</span>
                    </div>
                    <div style={{ padding: '16px 20px' }}>
                        {ORGAN_DISTRIBUTION.map(o => (
                            <div key={o.organ} style={{ marginBottom: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                    <span style={{ fontSize: 12, fontWeight: 500 }}>{o.organ}</span>
                                    <span style={{ fontSize: 11, color: o.color, fontWeight: 700 }}>{o.count.toLocaleString()} ({o.pct}%)</span>
                                </div>
                                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${o.pct}%`, background: `linear-gradient(90deg, ${o.color}, ${o.color}99)`, borderRadius: 3, transition: 'width 0.8s ease' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Hospital leaderboard */}
            <div className="panel">
                <div className="panel-header">
                    <div className="panel-title">Top Hospitals by Transplant Volume</div>
                    <span className="panel-badge pb-green">This Year</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            {['#', 'Hospital', 'Transplants', 'Success Rate', 'Avg Match Time', 'Volume'].map(h => (
                                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {HOSPITAL_STATS.map((h, i) => (
                            <tr key={h.name} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <td style={{ padding: '12px 16px', fontSize: 12, color: i === 0 ? '#f0a940' : 'var(--faint)', fontWeight: 700 }}>{i + 1}</td>
                                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{h.name}</td>
                                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#4f9cf9' }}>{h.transplants}</td>
                                <td style={{ padding: '12px 16px', fontSize: 12, color: '#30d9a0', fontWeight: 600 }}>{h.successRate}%</td>
                                <td style={{ padding: '12px 16px', fontSize: 12, color: '#b478ff', fontWeight: 600 }}>{h.avgMatchTime}</td>
                                <td style={{ padding: '12px 16px', minWidth: 120 }}>
                                    <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${(h.transplants / HOSPITAL_STATS[0].transplants) * 100}%`, background: 'linear-gradient(90deg,#4f9cf9,#30d9a0)', borderRadius: 3 }} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Trend note */}
            <div style={{ marginTop: 20, padding: '14px 18px', background: 'rgba(48,217,160,0.05)', border: '1px solid rgba(48,217,160,0.15)', borderRadius: 12, fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
                📊 <strong style={{ color: '#30d9a0' }}>Performance note:</strong> Average match time has decreased by 38% since deployment of the HLA+ABO algorithm in November 2025. Kidney transplants account for 44% of volume, with a 97.1% one-year graft survival at AIIMS Delhi.
            </div>
        </div>
    );
}