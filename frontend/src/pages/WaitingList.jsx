import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrganPill from '../components/ui/OrganPill';
import { useApi } from '../hooks/useApi';
import { URGENCY_LABELS, ORGAN_TYPES, BLOOD_GROUPS } from '../utils/constants';

// Urgency key mapper: DB uses 'status_1a' format, constants use '1A'
const DB_TO_KEY = { status_1a: '1A', status_1b: '1B', status_2: '2', status_3: '3' };

export default function WaitingList() {
    const navigate = useNavigate();
    const { get, data, loading } = useApi();
    const [filterOrgan, setFilterOrgan] = useState('');
    const [filterBlood, setFilterBlood] = useState('');
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('urgency_score');

    useEffect(() => {
        const params = {};
        if (filterOrgan) params.organ_type = filterOrgan;
        if (filterBlood) params.blood_group = filterBlood;
        get('/recipients/waiting-list', params);
    }, [filterOrgan, filterBlood]);

    const rows = data?.data || [];

    // Map DB urgency format to display key
    const displayRows = rows.map(r => ({
        ...r,
        urgencyKey: DB_TO_KEY[r.medical_urgency] || r.medical_urgency || '3',
    }));

    let displayed = displayRows.filter(r =>
        !search ||
        r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.hospital_name?.toLowerCase().includes(search.toLowerCase())
    );

    displayed = [...displayed].sort((a, b) => {
        if (sortBy === 'urgency_score') return (b.urgency_score || 0) - (a.urgency_score || 0);
        if (sortBy === 'wait_months') return (b.wait_months || 0) - (a.wait_months || 0);
        return 0;
    });

    const urgencyCounts = { '1A': 0, '1B': 0, '2': 0, '3': 0 };
    displayRows.forEach(r => { if (urgencyCounts[r.urgencyKey] !== undefined) urgencyCounts[r.urgencyKey]++; });

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: -0.3 }}>Waiting List</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{rows.length} patients registered</div>
                </div>
                <button className="btn-primary" style={{ padding: '8px 18px', fontSize: 12 }} onClick={() => navigate('/recipients/register')}>
                    + Register Recipient
                </button>
            </div>

            {/* Urgency summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
                {Object.entries(URGENCY_LABELS).map(([key, info]) => {
                    const count = urgencyCounts[key] || 0;
                    return (
                        <div key={key} style={{
                            background: 'var(--surface)', border: `1px solid var(--border)`,
                            borderRadius: 'var(--r-md)', padding: '12px 14px',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: info.color }} />
                                <span style={{ fontSize: 10, fontWeight: 700, color: info.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>Status {key}</span>
                            </div>
                            <div style={{ fontSize: 26, fontWeight: 700, color: info.color, fontFamily: 'var(--font-mono)', letterSpacing: -1 }}>{count}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{info.sub}</div>
                        </div>
                    );
                })}
            </div>

            {/* Filters */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '10px 14px', marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search patient or hospital…"
                    className="form-input" style={{ minWidth: 200, padding: '6px 10px', fontSize: 12 }}
                />
                <select value={filterOrgan} onChange={e => setFilterOrgan(e.target.value)} className="form-input" style={{ padding: '6px 10px', fontSize: 12, width: 'auto' }}>
                    <option value="">All Organs</option>
                    {ORGAN_TYPES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
                <select value={filterBlood} onChange={e => setFilterBlood(e.target.value)} className="form-input" style={{ padding: '6px 10px', fontSize: 12, width: 'auto' }}>
                    <option value="">All Blood Groups</option>
                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    {[['urgency_score', 'Urgency'], ['wait_months', 'Wait Time']].map(([val, lbl]) => (
                        <button key={val} onClick={() => setSortBy(val)} style={{
                            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: '1px solid',
                            background: sortBy === val ? 'var(--burgundy)' : 'transparent',
                            borderColor: sortBy === val ? 'transparent' : 'var(--border)',
                            color: sortBy === val ? '#fff' : 'var(--text-3)',
                            fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                        }}>{lbl}</button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="panel">
                {loading && <div style={{ padding: '20px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>}
                {!loading && displayed.length === 0 && (
                    <div className="empty-state"><div className="empty-icon">📋</div>No patients match current filters</div>
                )}
                {!loading && displayed.length > 0 && (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-2)' }}>
                                    {['#', 'Patient', 'Organ', 'Blood', 'Urgency', 'Wait', 'Hospital', 'Score', ''].map(h => (
                                        <th key={h} style={{ padding: '9px 13px', textAlign: 'left', fontSize: 9.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.8, whiteSpace: 'nowrap', background: 'var(--surface-2)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {displayed.map((r, i) => {
                                    const urg = URGENCY_LABELS[r.urgencyKey] || URGENCY_LABELS['3'];
                                    return (
                                        <tr key={r.recipient_id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s', cursor: 'pointer' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            onClick={() => navigate(`/matching?recipientId=${r.recipient_id}`)}>
                                            <td style={{ padding: '9px 13px', fontSize: 11, color: 'var(--text-4)', fontFamily: 'var(--font-mono)' }}>{i + 1}</td>
                                            <td style={{ padding: '9px 13px', fontSize: 12.5, fontWeight: 600 }}>{r.full_name}</td>
                                            <td style={{ padding: '9px 13px' }}><OrganPill organId={r.organ_needed} size="sm" /></td>
                                            <td style={{ padding: '9px 13px', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{r.blood_group}</td>
                                            <td style={{ padding: '9px 13px' }}>
                                                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, background: `${urg.color}18`, color: urg.color, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{r.urgencyKey}</span>
                                            </td>
                                            <td style={{ padding: '9px 13px', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color: r.wait_months > 24 ? 'var(--amber)' : 'var(--text)' }}>
                                                {r.wait_months != null ? `${r.wait_months}m` : '—'}
                                            </td>
                                            <td style={{ padding: '9px 13px', fontSize: 11, color: 'var(--text-3)' }}>{r.hospital_name}</td>
                                            <td style={{ padding: '9px 13px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div style={{ width: 44, height: 3, background: 'var(--border-2)', borderRadius: 1, overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${Math.min(100, r.urgency_score || 0)}%`, background: 'var(--forest)', borderRadius: 1 }} />
                                                    </div>
                                                    <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--forest)', fontFamily: 'var(--font-mono)' }}>{r.urgency_score ? Number(r.urgency_score).toFixed(0) : '—'}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '9px 13px' }}>
                                                <button onClick={e => { e.stopPropagation(); navigate(`/matching?recipientId=${r.recipient_id}`); }} style={{ fontSize: 11, color: 'var(--text-3)', background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 9px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                                                    Match →
                                                </button>
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