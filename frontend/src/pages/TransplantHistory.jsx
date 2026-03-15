import React, { useState, useEffect } from 'react';
import OrganPill from '../components/ui/OrganPill';
import { useApi } from '../hooks/useApi';
import { formatDate } from '../utils/formatters';

export default function TransplantHistory() {
    const { get, data, loading } = useApi();
    const [filterOutcome, setFilterOutcome] = useState('');
    const [filterOrgan, setFilterOrgan] = useState('');

    useEffect(() => {
        const params = {};
        if (filterOrgan) params.organ_type = filterOrgan;
        get('/transplants', params);
    }, [filterOrgan]);

    const records = data?.data || [];
    const filtered = filterOutcome ? records.filter(r => r.graft_status === filterOutcome) : records;

    const stats = {
        total: records.length,
        functioning: records.filter(r => r.graft_status === 'functioning').length,
        failed: records.filter(r => r.graft_status === 'failed').length,
        avgScore: records.length ? (records.reduce((s, r) => s + (r.total_score_at_match || 0), 0) / records.length).toFixed(1) : '—',
    };

    const GRAFT_COLOR = {
        functioning: 'var(--teal)', failed: 'var(--coral)',
        primary_non_function: 'var(--amber)', unknown: 'var(--text-3)',
    };

    return (
        <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, letterSpacing: -0.5, marginBottom: 6 }}>
                Transplant History
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 22 }}>Completed transplant records from database</div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
                {[
                    { label: 'Total', value: stats.total, color: 'var(--blue)' },
                    { label: 'Functioning', value: stats.functioning, color: 'var(--teal)' },
                    { label: 'Failed', value: stats.failed, color: 'var(--coral)' },
                    { label: 'Avg Match Score', value: stats.avgScore, color: 'var(--purple)' },
                ].map(s => (
                    <div key={s.label} className="kpi-card">
                        <div className="kpi-label">{s.label}</div>
                        <div className="kpi-val" style={{ color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                {['', 'functioning', 'failed', 'primary_non_function'].map(o => (
                    <button key={o || 'all'} onClick={() => setFilterOutcome(o)}
                        style={{
                            padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: '1px solid',
                            background: filterOutcome === o ? 'var(--coral)' : 'transparent',
                            borderColor: filterOutcome === o ? 'transparent' : 'var(--border)',
                            color: filterOutcome === o ? '#fff' : 'var(--text-2)',
                            fontFamily: 'var(--font-body)', transition: 'all 0.15s', textTransform: 'capitalize'
                        }}>
                        {o || 'All Outcomes'}
                    </button>
                ))}
            </div>

            <div className="panel">
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state"><div className="empty-icon">🏆</div>No transplant records found</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead><tr>
                                <th>Organ</th><th>Donor → Recipient</th><th>Hospitals</th>
                                <th>Date</th><th>Score</th><th>Cold Ischemia</th><th>Surgeon</th><th>Graft</th>
                            </tr></thead>
                            <tbody>
                                {filtered.map(r => {
                                    const gc = GRAFT_COLOR[r.graft_status] || 'var(--text-2)';
                                    return (
                                        <tr key={r.transplant_id}>
                                            <td><OrganPill organId={r.organ_type} size="sm" /></td>
                                            <td>
                                                <div style={{ fontSize: 12, fontWeight: 600 }}>{r.donor_name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-2)' }}>→ {r.recipient_name}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{r.donor_hospital}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-2)' }}>→ {r.recipient_hospital}</div>
                                            </td>
                                            <td style={{ fontSize: 11, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{formatDate(r.transplant_date)}</td>
                                            <td style={{ fontWeight: 700, color: 'var(--teal)' }}>{r.total_score_at_match ? Number(r.total_score_at_match).toFixed(1) : '—'}</td>
                                            <td style={{ fontSize: 12 }}>{r.cold_ischemia_hrs != null ? `${r.cold_ischemia_hrs}h` : '—'}</td>
                                            <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.surgeon_name || '—'}</td>
                                            <td>
                                                <span className="chip" style={{ background: `color-mix(in srgb, ${gc} 15%, transparent)`, color: gc, textTransform: 'capitalize' }}>
                                                    {r.graft_status || '—'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}