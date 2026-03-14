import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrganPill from '../components/ui/OrganPill';
import { useApi } from '../hooks/useApi';
import { URGENCY_LABELS, ORGAN_TYPES, BLOOD_GROUPS } from '../utils/constants';

const MOCK_PATIENTS = [
    { id: 1, name: 'Rajan Mehta', blood: 'O+', organId: 'kidney_l', urgency: '1A', waitDays: 412, hospital: 'AIIMS Delhi', meld: null, score: 94.2, status: 'active' },
    { id: 2, name: 'Anita Sharma', blood: 'O+', organId: 'kidney_l', urgency: '1B', waitDays: 280, hospital: 'Fortis Gurgaon', meld: null, score: 87.8, status: 'active' },
    { id: 3, name: 'Vikram Nair', blood: 'A+', organId: 'liver', urgency: '1A', waitDays: 190, hospital: 'Max Delhi', meld: 34, score: 88.1, status: 'active' },
    { id: 4, name: 'Sunita Trivedi', blood: 'AB+', organId: 'lung_r', urgency: '1B', waitDays: 95, hospital: 'Fortis Mumbai', meld: null, score: 79.4, status: 'active' },
    { id: 5, name: 'Meera Patel', blood: 'O-', organId: 'kidney_r', urgency: '2', waitDays: 520, hospital: 'Apollo Delhi', meld: null, score: 76.1, status: 'active' },
    { id: 6, name: 'Suresh Kumar', blood: 'B+', organId: 'heart', urgency: '1A', waitDays: 145, hospital: 'Medanta', meld: null, score: 68.3, status: 'active' },
    { id: 7, name: 'Priya Singh', blood: 'A-', organId: 'liver', urgency: '1B', waitDays: 330, hospital: 'PGI Chandigarh', meld: 28, score: 72.5, status: 'active' },
    { id: 8, name: 'Kavya Nair', blood: 'B-', organId: 'cornea', urgency: '2', waitDays: 88, hospital: 'Sankara Chennai', meld: null, score: 95.0, status: 'matched' },
    { id: 9, name: 'Arun Joshi', blood: 'O+', organId: 'lung_l', urgency: '1A', waitDays: 210, hospital: 'AIIMS Bhopal', meld: null, score: 81.2, status: 'active' },
    { id: 10, name: 'Deepa Rao', blood: 'A+', organId: 'kidney_l', urgency: '3', waitDays: 640, hospital: 'Manipal Bangalore', meld: null, score: 61.7, status: 'active' },
];

const STATUS_STYLES = {
    active: { color: '#4f9cf9', bg: 'rgba(79,156,249,0.1)' },
    matched: { color: '#30d9a0', bg: 'rgba(48,217,160,0.1)' },
    inactive: { color: '#f0a940', bg: 'rgba(240,169,64,0.1)' },
};

export default function WaitingList() {
    const navigate = useNavigate();
    const { get, data } = useApi();
    const [patients, setPatients] = useState(MOCK_PATIENTS);
    const [filterOrgan, setFilterOrgan] = useState('all');
    const [filterUrgency, setFilterUrgency] = useState('all');
    const [filterBlood, setFilterBlood] = useState('all');
    const [sortBy, setSortBy] = useState('urgency');
    const [search, setSearch] = useState('');

    useEffect(() => {
        get('/recipients/waiting-list').then(res => {
            if (res?.success && res.data?.length) setPatients(res.data);
        });
    }, [get]);

    let filtered = patients.filter(p => {
        if (filterOrgan !== 'all' && p.organId !== filterOrgan) return false;
        if (filterUrgency !== 'all' && p.urgency !== filterUrgency) return false;
        if (filterBlood !== 'all' && p.blood !== filterBlood) return false;
        if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
            !p.hospital.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    filtered = [...filtered].sort((a, b) => {
        if (sortBy === 'urgency') return a.urgency.localeCompare(b.urgency);
        if (sortBy === 'wait') return b.waitDays - a.waitDays;
        if (sortBy === 'score') return b.score - a.score;
        return 0;
    });

    const urgencyCounts = { '1A': 0, '1B': 0, '2': 0, '3': 0 };
    patients.forEach(p => { if (urgencyCounts[p.urgency] !== undefined) urgencyCounts[p.urgency]++; });

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>
                        Waiting List
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                        {patients.length} patients · {patients.filter(p => p.status === 'active').length} active
                    </div>
                </div>
                <button className="btn-primary" style={{ padding: '8px 18px', fontSize: 12 }}
                    onClick={() => navigate('/recipients/register')}>
                    + Register Recipient
                </button>
            </div>

            {/* Urgency summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                {Object.entries(URGENCY_LABELS).map(([key, info]) => (
                    <div
                        key={key}
                        onClick={() => setFilterUrgency(filterUrgency === key ? 'all' : key)}
                        style={{
                            background: filterUrgency === key ? `${info.color}18` : 'var(--surface)',
                            border: `1px solid ${filterUrgency === key ? info.color : 'var(--border)'}`,
                            borderRadius: 12, padding: '14px 16px',
                            cursor: 'pointer', transition: 'all 0.2s',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <div style={{
                                width: 8, height: 8, borderRadius: '50%', background: info.color,
                                boxShadow: filterUrgency === key ? `0 0 6px ${info.color}` : 'none'
                            }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: info.color }}>Status {key}</span>
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)', color: info.color }}>
                            {urgencyCounts[key]}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{info.sub}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '14px 16px', marginBottom: 16,
                display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
            }}>
                <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search patient or hospital…"
                    style={{
                        background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '7px 12px', fontSize: 12, color: 'var(--text)',
                        fontFamily: 'var(--font-body)', outline: 'none', minWidth: 200,
                    }}
                />
                <select value={filterOrgan} onChange={e => setFilterOrgan(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
                    <option value="all">All Organs</option>
                    {ORGAN_TYPES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
                <select value={filterBlood} onChange={e => setFilterBlood(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
                    <option value="all">All Blood Groups</option>
                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>Sort:</span>
                    {[['urgency', 'Urgency'], ['wait', 'Wait Time'], ['score', 'Score']].map(([val, lbl]) => (
                        <button key={val} onClick={() => setSortBy(val)}
                            style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: '1px solid', background: sortBy === val ? 'var(--accent)' : 'transparent', borderColor: sortBy === val ? 'transparent' : 'var(--border)', color: sortBy === val ? 'white' : 'var(--muted)', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}>
                            {lbl}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="panel">
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                {['#', 'Patient', 'Organ Needed', 'Blood', 'Urgency', 'Wait (days)', 'Hospital', 'Match Score', 'Status', ''].map(h => (
                                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((p, i) => {
                                const urgInfo = URGENCY_LABELS[p.urgency];
                                const st = STATUS_STYLES[p.status] || STATUS_STYLES.active;
                                return (
                                    <tr
                                        key={p.id}
                                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        onClick={() => navigate(`/matching?recipientId=${p.id}`)}
                                    >
                                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--faint)' }}>{i + 1}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{p.name}</td>
                                        <td style={{ padding: '12px 16px' }}><OrganPill organId={p.organId} size="sm" /></td>
                                        <td style={{ padding: '12px 16px', fontSize: 12 }}>{p.blood}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: `${urgInfo.color}18`, color: urgInfo.color, fontWeight: 700 }}>
                                                {p.urgency}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: p.waitDays > 365 ? '#f0a940' : 'var(--text)' }}>
                                            {p.waitDays}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted)' }}>{p.hospital}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <div style={{ width: 50, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${p.score}%`, background: 'linear-gradient(90deg,#30d9a0,#4f9cf9)', borderRadius: 2 }} />
                                                </div>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: '#30d9a0' }}>{p.score}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: st.bg, color: st.color, fontWeight: 600, textTransform: 'capitalize' }}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <button
                                                onClick={e => { e.stopPropagation(); navigate(`/matching?recipientId=${p.id}`); }}
                                                style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                                            >
                                                Match →
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                            No patients found matching current filters.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}