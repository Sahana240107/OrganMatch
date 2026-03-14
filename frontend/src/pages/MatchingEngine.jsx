import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MatchCard from '../components/ui/MatchCard';
import OrganPill from '../components/ui/OrganPill';
import ScoreBar from '../components/ui/ScoreBar';
import { useApi } from '../hooks/useApi';
import { ORGAN_TYPES, MATCH_WEIGHTS } from '../utils/constants';
import { formatDistance } from '../utils/formatters';

const MOCK_ORGAN = {
    id: 29, code: 'DH-2024-029', organId: 'kidney_l',
    donor: { name: 'Arjun Sharma', blood: 'O+', hospital: 'PGIMER Chandigarh', city: 'Chandigarh' },
    remainingHours: 18.1, maxHours: 36,
    hla: { A1: '02', A2: '24', B7: '07', B8: '08', DR3: '03', DR4: '04' },
};

const MOCK_MATCHES = [
    {
        rank: 1, recipientId: 101,
        recipient: { name: 'Rajan Mehta', blood: 'O+', hospital: 'AIIMS Delhi', city: 'Delhi', urgency: '1A', waitDays: 412, hla: { A1: '02', A2: '24', B7: '07', B8: '08', DR3: '03', DR4: '04' } },
        scores: { total: 94.2, abo: 100, hla: 100, urgency: 100, distance: 72, waitTime: 80 },
        distance: 267,
    },
    {
        rank: 2, recipientId: 102,
        recipient: { name: 'Anita Sharma', blood: 'O+', hospital: 'Fortis Gurgaon', city: 'Gurgaon', urgency: '1B', waitDays: 280, hla: { A1: '02', A2: '11', B7: '07', B8: '44', DR3: '03', DR4: '07' } },
        scores: { total: 87.8, abo: 100, hla: 67, urgency: 75, distance: 80, waitTime: 65 },
        distance: 230,
    },
    {
        rank: 3, recipientId: 103,
        recipient: { name: 'Vikram Nair', blood: 'A+', hospital: 'Max Delhi', city: 'Delhi', urgency: '1B', waitDays: 190, hla: { A1: '03', A2: '24', B7: '07', B8: '35', DR3: '11', DR4: '04' } },
        scores: { total: 81.4, abo: 80, hla: 50, urgency: 75, distance: 70, waitTime: 50 },
        distance: 271,
    },
    {
        rank: 4, recipientId: 104,
        recipient: { name: 'Meera Patel', blood: 'O-', hospital: 'Apollo Delhi', city: 'Delhi', urgency: '2', waitDays: 520, hla: { A1: '02', A2: '24', B7: '07', B8: '08', DR3: '01', DR4: '04' } },
        scores: { total: 76.1, abo: 85, hla: 83, urgency: 50, distance: 68, waitTime: 90 },
        distance: 258,
    },
    {
        rank: 5, recipientId: 105,
        recipient: { name: 'Suresh Kumar', blood: 'B+', hospital: 'Medanta', city: 'Gurgaon', urgency: '2', waitDays: 145, hla: { A1: '01', A2: '24', B7: '07', B8: '57', DR3: '03', DR4: '13' } },
        scores: { total: 68.3, abo: 0, hla: 33, urgency: 50, distance: 75, waitTime: 35 },
        distance: 240,
    },
];

export default function MatchingEngine() {
    const { organId } = useParams();
    const navigate = useNavigate();
    const { get, post, loading } = useApi();

    const [organ, setOrgan] = useState(MOCK_ORGAN);
    const [matches, setMatches] = useState(MOCK_MATCHES);
    const [selected, setSelected] = useState(null);
    const [sending, setSending] = useState(false);
    const [filterBlood, setFilterBlood] = useState('all');

    useEffect(() => {
        if (organId) {
            get(`/match/${organId}`).then(res => {
                if (res?.success) { setOrgan(res.data.organ); setMatches(res.data.matches); }
            });
        }
    }, [organId, get]);

    const handleSendOffer = useCallback(async (recipientId) => {
        setSending(true);
        const res = await post('/offers', { organId: organ.id, recipientId });
        setSending(false);
        if (res?.success) navigate(`/offers/${res.data.offerId}`);
    }, [organ, post, navigate]);

    const filtered = filterBlood === 'all'
        ? matches
        : matches.filter(m => m.recipient.blood === filterBlood);

    const bloodGroups = ['all', ...new Set(matches.map(m => m.recipient.blood))];

    return (
        <div className="matching-page">
            {/* Header */}
            <div className="mp-header">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                        <div className="mp-title">Organ Matching Engine</div>
                        <div className="mp-sub">
                            Ranked recipients for{' '}
                            <OrganPill organId={organ.organId} size="sm" />
                            {' '}— Donor code <strong style={{ color: 'var(--text)' }}>{organ.code}</strong>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/donors/register')}
                        className="btn-secondary"
                        style={{ padding: '8px 18px', fontSize: 12 }}
                    >
                        + New Organ
                    </button>
                </div>
            </div>

            {/* Organ info bar */}
            <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '16px 20px', marginBottom: 24,
                display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16,
            }}>
                {[
                    { label: 'Donor', value: organ.donor?.name },
                    { label: 'Blood Type', value: organ.donor?.blood },
                    { label: 'Hospital', value: organ.donor?.hospital },
                    { label: 'Viability', value: `${organ.remainingHours}h left`, color: organ.remainingHours < 6 ? '#e05c3a' : '#30d9a0' },
                    { label: 'Organ', value: ORGAN_TYPES.find(o => o.id === organ.organId)?.label || organ.organId },
                ].map(item => (
                    <div key={item.label}>
                        <div style={{ fontSize: 10, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{item.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: item.color || 'var(--text)' }}>{item.value}</div>
                    </div>
                ))}
            </div>

            {/* HLA row */}
            <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '14px 20px', marginBottom: 24,
            }}>
                <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                    Donor HLA Profile
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {Object.entries(organ.hla || {}).map(([ag, val]) => (
                        <div key={ag} style={{ textAlign: 'center', background: 'rgba(79,156,249,0.06)', borderRadius: 8, padding: '6px 14px' }}>
                            <div style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 3 }}>{ag}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#4f9cf9' }}>{val}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Filter bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginRight: 4 }}>Filter:</div>
                {bloodGroups.map(bg => (
                    <button
                        key={bg}
                        onClick={() => setFilterBlood(bg)}
                        style={{
                            padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                            cursor: 'pointer', border: '1px solid',
                            background: filterBlood === bg ? 'var(--accent)' : 'transparent',
                            borderColor: filterBlood === bg ? 'transparent' : 'var(--border)',
                            color: filterBlood === bg ? 'white' : 'var(--muted)',
                            fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                        }}
                    >
                        {bg === 'all' ? 'All Blood Types' : `🩸 ${bg}`}
                    </button>
                ))}
                <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>
                    {filtered.length} recipient{filtered.length !== 1 ? 's' : ''} ranked
                </div>
            </div>

            {/* Match cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {filtered.map((m, i) => (
                    <MatchCard
                        key={m.recipientId}
                        rank={m.rank}
                        isTop={i === 0}
                        donor={{
                            ...organ.donor,
                            organId: organ.organId,
                            remainingHours: organ.remainingHours,
                            maxHours: organ.maxHours,
                            hla: organ.hla,
                        }}
                        recipient={{ ...m.recipient, hla: m.recipient.hla }}
                        scores={m.scores}
                        onOffer={() => handleSendOffer(m.recipientId)}
                    />
                ))}
            </div>

            {filtered.length === 0 && (
                <div style={{
                    textAlign: 'center', padding: 48,
                    color: 'var(--muted)', fontSize: 14,
                }}>
                    No compatible recipients found for this blood type filter.
                </div>
            )}
        </div>
    );
}