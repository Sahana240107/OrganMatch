import React, { useState, useEffect } from 'react';
import OrganPill from '../components/ui/OrganPill';
import { useApi } from '../hooks/useApi';
import { formatDate } from '../utils/formatters';

const GRAFT_COLOR = {
    functioning: 'var(--forest)',
    failed: 'var(--burgundy)',
    patient_died: 'var(--burgundy)',
    lost_to_followup: 'var(--amber)',
    pending: 'var(--text-3)',
};
const GRAFT_LABEL = {
    functioning: 'Functioning', failed: 'Failed',
    patient_died: 'Patient Died', lost_to_followup: 'Lost to Follow-up', pending: 'Pending',
};

export default function TransplantHistory() {
    const { get, data, loading } = useApi();
    const [filterOutcome, setFilterOutcome] = useState('');
    const [filterOrgan, setFilterOrgan] = useState('');

    useEffect(() => {
        const params = {};
        if (filterOrgan) params.organ_type = filterOrgan;
        get('/transplants', params);
    }, [filterOrgan]);

    // Real DB fields: transplant_id, transplant_date, organ_type, graft_status,
    //   donor_name, donor_blood, recipient_name, recipient_blood,
    //   donor_hospital, recipient_hospital, cold_ischemia_hrs, total_score_at_match
    const records = data?.data || [];
    const filtered = filterOutcome ? records.filter(r => r.graft_status === filterOutcome) : records;

    const stats = {
        total: records.length,
        functioning: records.filter(r => r.graft_status === 'functioning').length,
        failed: records.filter(r => r.graft_status === 'failed' || r.graft_status === 'patient_died').length,
        avgScore: records.length ? (records.reduce((s, r) => s + (r.total_score_at_match || 0), 0) / records.length).toFixed(1) : '—',
    };

    const organTypes = [...new Set(records.map(r => r.organ_type).filter(Boolean))];

    return (
        <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: -0.3, marginBottom: 4 }}>
                Transplant History
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>Completed transplant records · Live from database</div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', marginBottom: 20 }}>
                {[
                    { label: 'Total', value: stats.total, color: 'var(--steel)' },
                    { label: 'Functioning', value: stats.functioning, color: 'var(--forest)' },
                    { label: 'Failed', value: stats.failed, color: 'var(--burgundy)' },
                    { label: 'Avg Match Score', value: stats.avgScore, color: 'var(--sienna)' },
                ].map(s => (
                    <div key={s.label} className="kpi-card">
                        <div className="kpi-label">{s.label}</div>
                        <div className="kpi-val" style={{ color: s.color, fontSize: 24 }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                {['', 'functioning', 'failed', 'patient_died', 'pending'].map(o => (
                    <button key={o || 'all'} onClick={() => setFilterOutcome(o)} style={{
                        padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: '1px solid',
                        background: filterOutcome === o ? 'var(--burgundy)' : 'transparent',
                        borderColor: filterOutcome === o ? 'transparent' : 'var(--border)',
                        color: filterOutcome === o ? '#fff' : 'var(--text-3)',
                        fontFamily: 'var(--font-body)', transition: 'all 0.12s', textTransform: 'capitalize',
                    }}>{o === '' ? 'All Outcomes' : GRAFT_LABEL[o] || o}</button>
                ))}
                <div style={{ marginLeft: 'auto' }}>
                    <select value={filterOrgan} onChange={e => setFilterOrgan(e.target.value)} className="form-input" style={{ padding: '4px 10px', fontSize: 11, width: 'auto' }}>
                        <option value="">All Organ Types</option>
                        {organTypes.map(o => <option key={o} value={o} style={{ textTransform: 'capitalize' }}>{o}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="panel">
                {loading && <div style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>}
                {!loading && filtered.length === 0 && (
                    <div className="empty-state"><div className="empty-icon">🏆</div>No transplant records found</div>
                )}
                {!loading && filtered.length > 0 && (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-2)' }}>
                                    {['Organ', 'Donor → Recipient', 'Hospitals', 'Date', 'Cold Ischemia', 'Score', 'Graft Status'].map(h => (
                                        <th key={h} style={{ padding: '8px 13px', textAlign: 'left', fontSize: 9.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.8, background: 'var(--surface-2)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(r => {
                                    const col = GRAFT_COLOR[r.graft_status] || 'var(--text-3)';
                                    return (
                                        <tr key={r.transplant_id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '9px 13px' }}><OrganPill organId={r.organ_type} size="sm" /></td>
                                            <td style={{ padding: '9px 13px' }}>
                                                <div style={{ fontSize: 12, fontWeight: 600 }}>{r.donor_name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>→ {r.recipient_name}</div>
                                            </td>
                                            <td style={{ padding: '9px 13px' }}>
                                                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.donor_hospital}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>→ {r.recipient_hospital}</div>
                                            </td>
                                            <td style={{ padding: '9px 13px', fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                                                {r.transplant_date ? new Date(r.transplant_date).toLocaleDateString('en-IN') : '—'}
                                            </td>
                                            <td style={{ padding: '9px 13px', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                                                {r.cold_ischemia_hrs != null ? `${Number(r.cold_ischemia_hrs).toFixed(1)}h` : '—'}
                                            </td>
                                            <td style={{ padding: '9px 13px', fontSize: 12, fontWeight: 700, color: 'var(--forest)', fontFamily: 'var(--font-mono)' }}>
                                                {r.total_score_at_match != null ? Number(r.total_score_at_match).toFixed(1) : '—'}
                                            </td>
                                            <td style={{ padding: '9px 13px' }}>
                                                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 3, background: `${col}18`, color: col, fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'capitalize' }}>
                                                    {GRAFT_LABEL[r.graft_status] || r.graft_status}
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