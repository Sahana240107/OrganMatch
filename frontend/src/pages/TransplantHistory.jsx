import React, { useState, useEffect } from 'react';
import OrganPill from '../components/ui/OrganPill';
import { useApi } from '../hooks/useApi';
import { formatDate } from '../utils/formatters';

const MOCK_HISTORY = [
    { id: 1, organId: 'kidney_l', donor: 'Arjun S.', recipient: 'Rajan M.', donorHosp: 'PGIMER', recipientHosp: 'AIIMS Delhi', date: '2026-03-10T09:30:00Z', outcome: 'successful', graftSurviving: true, score: 97.2 },
    { id: 2, organId: 'heart', donor: 'Priya D.', recipient: 'Suresh K.', donorHosp: 'AIIMS Delhi', recipientHosp: 'Medanta Gurgaon', date: '2026-03-09T14:20:00Z', outcome: 'successful', graftSurviving: true, score: 92.1 },
    { id: 3, organId: 'liver', donor: 'Mohan V.', recipient: 'Deepa R.', donorHosp: 'Apollo Chennai', recipientHosp: 'KEM Mumbai', date: '2026-03-08T11:10:00Z', outcome: 'successful', graftSurviving: true, score: 88.5 },
    { id: 4, organId: 'cornea', donor: 'Kavitha N.', recipient: 'Arun P.', donorHosp: 'Sankara', recipientHosp: 'Sankara Chennai', date: '2026-03-07T16:45:00Z', outcome: 'successful', graftSurviving: true, score: 95.0 },
    { id: 5, organId: 'lung_r', donor: 'Sunita T.', recipient: 'Meera J.', donorHosp: 'Fortis Mumbai', recipientHosp: 'Kokilaben Mumbai', date: '2026-03-06T08:00:00Z', outcome: 'complications', graftSurviving: true, score: 79.4 },
    { id: 6, organId: 'kidney_r', donor: 'Vikram N.', recipient: 'Kavya S.', donorHosp: 'Max Delhi', recipientHosp: 'Fortis Delhi', date: '2026-03-05T13:30:00Z', outcome: 'successful', graftSurviving: true, score: 81.2 },
    { id: 7, organId: 'liver', donor: 'Anita G.', recipient: 'Sanjay R.', donorHosp: 'Manipal', recipientHosp: 'Apollo Bangalore', date: '2026-03-04T10:15:00Z', outcome: 'successful', graftSurviving: true, score: 74.8 },
    { id: 8, organId: 'heart', donor: 'Ramesh K.', recipient: 'Pooja V.', donorHosp: 'AIIMS Delhi', recipientHosp: 'PGI Chandigarh', date: '2026-03-03T07:45:00Z', outcome: 'failed', graftSurviving: false, score: 68.0 },
];

const OUTCOME_STYLES = {
    successful: { color: '#30d9a0', label: 'Successful' },
    complications: { color: '#f0a940', label: 'Complications' },
    failed: { color: '#e05c3a', label: 'Failed' },
};

export default function TransplantHistory() {
    const { get, data } = useApi();
    const [records, setRecords] = useState(MOCK_HISTORY);
    const [filterOutcome, setFilterOutcome] = useState('all');

    useEffect(() => {
        get('/transplant/history').then(res => {
            if (res?.success && res.data?.length) setRecords(res.data);
        });
    }, [get]);

    const filtered = filterOutcome === 'all' ? records : records.filter(r => r.outcome === filterOutcome);

    const stats = {
        total: records.length,
        successful: records.filter(r => r.outcome === 'successful').length,
        surviving: records.filter(r => r.graftSurviving).length,
        avgScore: (records.reduce((s, r) => s + r.score, 0) / records.length).toFixed(1),
    };

    return (
        <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: -0.5, marginBottom: 6 }}>
                Transplant History
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
                Completed transplants and outcomes
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
                {[
                    { label: 'Total Transplants', value: stats.total, color: '#4f9cf9' },
                    { label: 'Successful', value: stats.successful, color: '#30d9a0' },
                    { label: 'Grafts Surviving', value: `${stats.surviving}/${stats.total}`, color: '#30d9a0' },
                    { label: 'Avg Match Score', value: stats.avgScore, color: '#b478ff' },
                ].map(s => (
                    <div key={s.label} className="kpi-card">
                        <div className="kpi-label">{s.label}</div>
                        <div className="kpi-val" style={{ color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {['all', 'successful', 'complications', 'failed'].map(o => (
                    <button key={o} onClick={() => setFilterOutcome(o)}
                        style={{ padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: '1px solid', background: filterOutcome === o ? 'var(--accent)' : 'transparent', borderColor: filterOutcome === o ? 'transparent' : 'var(--border)', color: filterOutcome === o ? 'white' : 'var(--muted)', fontFamily: 'var(--font-body)', transition: 'all 0.15s', textTransform: 'capitalize' }}>
                        {o === 'all' ? 'All Outcomes' : o}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="panel">
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                {['Organ', 'Donor → Recipient', 'Hospitals', 'Date', 'Score', 'Outcome', 'Graft'].map(h => (
                                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(r => {
                                const oc = OUTCOME_STYLES[r.outcome] || OUTCOME_STYLES.successful;
                                return (
                                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '12px 16px' }}><OrganPill organId={r.organId} size="sm" /></td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ fontSize: 12, fontWeight: 600 }}>{r.donor}</div>
                                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>→ {r.recipient}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.donorHosp}</div>
                                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>→ {r.recipientHosp}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                                            {formatDate(r.date)}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#30d9a0' }}>{r.score}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: `${oc.color}18`, color: oc.color, fontWeight: 700 }}>{oc.label}</span>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, color: r.graftSurviving ? '#30d9a0' : '#e05c3a' }}>
                                            {r.graftSurviving ? '✓ Surviving' : '✗ Failed'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}