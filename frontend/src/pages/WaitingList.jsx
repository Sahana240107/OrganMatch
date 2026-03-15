import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrganPill from '../components/ui/OrganPill';
import { useApi } from '../hooks/useApi';
import { ORGAN_TYPES, BLOOD_GROUPS } from '../utils/constants';

const URGENCY_COLOR = {
    status_1a: 'var(--coral)', status_1b: 'var(--amber)',
    status_2: 'var(--teal)', status_3: 'var(--blue)',
};
const URGENCY_LABEL = {
    status_1a: '1A – Critical', status_1b: '1B – Urgent',
    status_2: '2 – Stable', status_3: '3 – Routine',
};

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

    let displayed = rows.filter(r =>
        !search || r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.hospital_name?.toLowerCase().includes(search.toLowerCase())
    );

    displayed = [...displayed].sort((a, b) => {
        if (sortBy === 'urgency_score') return (b.urgency_score || 0) - (a.urgency_score || 0);
        if (sortBy === 'wait_months') return (b.wait_months || 0) - (a.wait_months || 0);
        return 0;
    });

    const urgencyCounts = {};
    rows.forEach(r => { urgencyCounts[r.medical_urgency] = (urgencyCounts[r.medical_urgency] || 0) + 1; });

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
                <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, letterSpacing: -0.5 }}>Waiting List</div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>{rows.length} patients registered</div>
                </div>
                <button className="btn-primary" style={{ padding: '8px 18px', fontSize: 12 }} onClick={() => navigate('/recipients/register')}>+ Register Recipient</button>
            </div>

            {/* Urgency summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                {Object.entries(URGENCY_LABEL).map(([key, label]) => {
                    const color = URGENCY_COLOR[key];
                    const count = urgencyCounts[key] || 0;
                    return (
                        <div key={key} onClick={() => { }} style={{
                            background: 'var(--surface)', border: `1px solid var(--border)`,
                            borderRadius: 'var(--r-lg)', padding: '14px 16px', cursor: 'default',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
                                <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
                            </div>
                            <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: 'var(--font-body)', letterSpacing: -1 }}>{count}</div>
                        </div>
                    );
                })}
            </div>

            {/* Filters */}
            <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
                padding: '12px 16px', marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center'
            }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient or hospital…"
                    style={{
                        background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
                        padding: '7px 12px', fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none', minWidth: 200
                    }} />
                <select value={filterOrgan} onChange={e => setFilterOrgan(e.target.value)}
                    style={{
                        background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
                        padding: '7px 12px', fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-body)', cursor: 'pointer'
                    }}>
                    <option value="">All Organs</option>
                    {ORGAN_TYPES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
                <select value={filterBlood} onChange={e => setFilterBlood(e.target.value)}
                    style={{
                        background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
                        padding: '7px 12px', fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-body)', cursor: 'pointer'
                    }}>
                    <option value="">All Blood Groups</option>
                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-2)' }}>Sort:</span>
                    {[['urgency_score', 'Urgency'], ['wait_months', 'Wait Time']].map(([val, lbl]) => (
                        <button key={val} onClick={() => setSortBy(val)} style={{
                            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: '1px solid',
                            background: sortBy === val ? 'var(--coral)' : 'transparent',
                            borderColor: sortBy === val ? 'transparent' : 'var(--border)',
                            color: sortBy === val ? '#fff' : 'var(--text-2)',
                            fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                        }}>{lbl}</button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="panel">
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
                ) : displayed.length === 0 ? (
                    <div className="empty-state"><div className="empty-icon">📋</div>No patients found</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead><tr>
                                <th>#</th><th>Patient</th><th>Organ</th><th>Blood</th>
                                <th>Urgency</th><th>Wait</th><th>Hospital</th><th>Score</th><th></th>
                            </tr></thead>
                            <tbody>
                                {displayed.map((p, i) => {
                                    const uc = URGENCY_COLOR[p.medical_urgency] || 'var(--text-2)';
                                    return (
                                        <tr key={p.recipient_id} onClick={() => navigate(`/matching?recipient=${p.recipient_id}`)}>
                                            <td style={{ color: 'var(--text-3)', fontSize: 11 }}>{i + 1}</td>
                                            <td style={{ fontWeight: 600 }}>{p.full_name}</td>
                                            <td><OrganPill organId={p.organ_needed} size="sm" /></td>
                                            <td>{p.blood_group}</td>
                                            <td>
                                                <span className="chip" style={{ background: `color-mix(in srgb, ${uc} 15%, transparent)`, color: uc }}>
                                                    {URGENCY_LABEL[p.medical_urgency] || p.medical_urgency}
                                                </span>
                                            </td>
                                            <td style={{ color: p.wait_months > 12 ? 'var(--amber)' : 'var(--text)', fontWeight: 600 }}>
                                                {p.wait_months != null ? `${p.wait_months}mo` : '—'}
                                            </td>
                                            <td style={{ color: 'var(--text-2)', fontSize: 12 }}>{p.hospital_name}</td>
                                            <td>
                                                {p.urgency_score != null ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <div style={{ width: 50, height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', width: `${Math.min(100, p.urgency_score)}%`, background: 'linear-gradient(90deg,var(--teal),var(--blue))', borderRadius: 2 }} />
                                                        </div>
                                                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)' }}>{Number(p.urgency_score).toFixed(0)}</span>
                                                    </div>
                                                ) : '—'}
                                            </td>
                                            <td>
                                                <button onClick={e => { e.stopPropagation(); navigate('/matching'); }}
                                                    style={{
                                                        fontSize: 11, color: 'var(--text-2)', background: 'none',
                                                        border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px',
                                                        cursor: 'pointer', fontFamily: 'var(--font-body)'
                                                    }}>Match →</button>
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