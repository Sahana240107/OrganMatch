import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import OfferTimer from '../components/ui/OfferTimer';
import OrganPill from '../components/ui/OrganPill';
import { useApi } from '../hooks/useApi';
import { OFFER_STATUS } from '../utils/constants';
import { formatDate } from '../utils/formatters';

const MOCK_OFFER = {
    id: 1,
    organCode: 'DH-2024-029', organId: 'kidney_l',
    donorName: 'Arjun Sharma', donorHospital: 'PGIMER Chandigarh',
    blood: 'O+', viabilityHours: 31.9,
    currentOffer: {
        recipient: 'Rajan Mehta', hospital: 'AIIMS Delhi',
        score: 94.2, status: OFFER_STATUS.PENDING,
        deadlineTs: Date.now() + 82 * 60 * 1000, // 1h 22m from now
    },
    timeline: [
        {
            id: 1, time: '08:42 AM', title: 'Organ Registered — Matching Triggered',
            meta: 'DB Trigger: AFTER INSERT ON organs → CALL match_organ(29)', status: 'system', dot: 'green'
        },
        {
            id: 2, time: '08:43 AM', title: 'Match scores computed',
            meta: '5 recipients ranked · Stored procedure completed in 48ms', status: 'done', dot: 'green'
        },
        {
            id: 3, time: '08:45 AM', title: 'Offer #1 → Max Delhi (Rank #3 at time)',
            meta: 'Declined — insufficient ICU capacity', status: 'declined', dot: 'red'
        },
        {
            id: 4, time: '09:10 AM', title: 'Offer #2 → AIIMS Delhi — Rajan Mehta',
            meta: 'Score 94.2 · Awaiting transplant coordinator response', status: 'pending', dot: 'amber', active: true
        },
        {
            id: 5, time: '—', title: 'Offer #3 → Fortis Gurgaon (if declined)',
            meta: 'Anita Sharma · Score 87.8', status: 'standby', dot: 'gray', dimmed: true
        },
        {
            id: 6, time: '—', title: 'Offer #4 → Max Delhi — Vikram Nair',
            meta: 'Score 81.4', status: 'standby', dot: 'gray', dimmed: 2
        },
    ],
};

const DOT_COLORS = { green: '#30d9a0', amber: '#f0a940', red: '#e05c3a', gray: 'rgba(255,255,255,0.2)' };
const STATUS_CHIP = {
    system: { color: '#30d9a0', bg: 'rgba(48,217,160,0.12)', label: 'System' },
    done: { color: '#30d9a0', bg: 'rgba(48,217,160,0.12)', label: 'Done' },
    declined: { color: '#e05c3a', bg: 'rgba(224,92,58,0.12)', label: 'Declined' },
    pending: { color: '#f0a940', bg: 'rgba(240,169,64,0.12)', label: 'Pending' },
    standby: { color: 'rgba(240,244,255,0.25)', bg: 'rgba(255,255,255,0.06)', label: 'Standby' },
    accepted: { color: '#4f9cf9', bg: 'rgba(79,156,249,0.12)', label: 'Accepted' },
};

export default function OfferWorkflow() {
    const { offerId } = useParams();
    const navigate = useNavigate();
    const { get, post, loading } = useApi();
    const [offer, setOffer] = useState(MOCK_OFFER);
    const [actioned, setActioned] = useState(false);

    useEffect(() => {
        if (offerId) {
            get(`/offers/${offerId}`).then(res => {
                if (res?.success) setOffer(res.data);
            });
        }
    }, [offerId, get]);

    const handleAccept = useCallback(async () => {
        const res = await post(`/offers/${offer.id}/accept`);
        if (res?.success) {
            setActioned('accepted');
            setOffer(prev => ({
                ...prev,
                currentOffer: { ...prev.currentOffer, status: OFFER_STATUS.ACCEPTED },
                timeline: prev.timeline.map(t =>
                    t.active ? { ...t, status: 'accepted', dot: 'green', active: false } : t
                ),
            }));
        }
    }, [offer, post]);

    const handleDecline = useCallback(async () => {
        const res = await post(`/offers/${offer.id}/decline`);
        if (res?.success) {
            setActioned('declined');
            setOffer(prev => ({
                ...prev,
                currentOffer: { ...prev.currentOffer, status: OFFER_STATUS.DECLINED },
                timeline: prev.timeline.map(t =>
                    t.active ? { ...t, status: 'declined', dot: 'red', active: false } : t
                ),
            }));
        }
    }, [offer, post]);

    const cur = offer.currentOffer;

    return (
        <div className="offer-page">
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', color: 'var(--muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                        ← Back
                    </button>
                    <OrganPill organId={offer.organId} />
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{offer.organCode}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: -0.5, marginBottom: 6 }}>
                    Offer Cascade — {MOCK_OFFER.organId.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} {offer.organCode}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    NOTTO protocol: Timed offers with 2-hour acceptance window per hospital. Auto-cascade on decline/timeout.
                </div>
            </div>

            {/* Organ status chips */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
                {[
                    { label: 'Donor', value: offer.donorName, color: 'var(--text)' },
                    { label: 'Blood', value: offer.blood, color: 'var(--text)' },
                    { label: 'Hospital', value: offer.donorHospital, color: 'var(--text)' },
                    { label: 'Viability', value: `${offer.viabilityHours.toFixed(1)}h left`, color: '#30d9a0' },
                    {
                        label: 'Status', value: cur.status === OFFER_STATUS.PENDING ? 'Offer Pending' : cur.status,
                        color: cur.status === OFFER_STATUS.ACCEPTED ? '#30d9a0' : cur.status === OFFER_STATUS.DECLINED ? '#e05c3a' : '#f0a940'
                    },
                ].map(item => (
                    <div key={item.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px' }}>
                        <div style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 3 }}>{item.label}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: item.color }}>{item.value}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
                {/* Timeline */}
                <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
                        Offer History
                    </div>
                    <div className="offer-timeline">
                        {offer.timeline.map(item => {
                            const chipStyle = STATUS_CHIP[item.status] || STATUS_CHIP.standby;
                            return (
                                <div key={item.id} className="timeline-item">
                                    <div className="tl-dot" style={{ background: DOT_COLORS[item.dot] || DOT_COLORS.gray }} />
                                    <div
                                        className={`tl-card${item.active ? ' active' : ''}`}
                                        style={item.dimmed ? { opacity: item.dimmed === 2 ? 0.3 : 0.45 } : undefined}
                                    >
                                        <div className="tl-time">{item.time}</div>
                                        <div className="tl-content">
                                            <div className="tl-title">{item.title}</div>
                                            <div className="tl-meta">{item.meta}</div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                            {item.active && cur.status === OFFER_STATUS.PENDING && (
                                                <svg width="36" height="36" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
                                                    <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                                                    <circle cx="20" cy="20" r="16" fill="none" stroke="#f0a940" strokeWidth="3"
                                                        strokeDasharray="101" strokeDashoffset="35" strokeLinecap="round" />
                                                </svg>
                                            )}
                                            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: chipStyle.bg, color: chipStyle.color, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
                                                {item.active && cur.status === OFFER_STATUS.PENDING
                                                    ? `${Math.floor((cur.deadlineTs - Date.now()) / 60000)}m left`
                                                    : chipStyle.label
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Current offer status */}
                    <div className="panel">
                        <div className="panel-header">
                            <div className="panel-title">Current Offer Status</div>
                            <span className="panel-badge" style={{
                                background: cur.status === OFFER_STATUS.ACCEPTED ? 'rgba(48,217,160,0.12)' :
                                    cur.status === OFFER_STATUS.DECLINED ? 'rgba(224,92,58,0.12)' : 'rgba(240,169,64,0.12)',
                                color: cur.status === OFFER_STATUS.ACCEPTED ? '#30d9a0' :
                                    cur.status === OFFER_STATUS.DECLINED ? '#e05c3a' : '#f0a940',
                            }}>
                                {cur.status === OFFER_STATUS.PENDING ? 'Awaiting' :
                                    cur.status === OFFER_STATUS.ACCEPTED ? 'Accepted' : 'Declined'}
                            </span>
                        </div>
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                            {/* Recipient info */}
                            <div style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, marginBottom: 4 }}>
                                <div style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Current Recipient</div>
                                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{cur.recipient}</div>
                                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{cur.hospital}</div>
                                <div style={{ fontSize: 11, color: '#30d9a0', marginTop: 4 }}>Match Score: {cur.score}</div>
                            </div>

                            {actioned === 'accepted' ? (
                                <div style={{ textAlign: 'center', color: '#30d9a0', fontSize: 13, fontWeight: 600 }}>
                                    ✓ Offer Accepted — Transplant team notified
                                </div>
                            ) : actioned === 'declined' ? (
                                <div style={{ textAlign: 'center', color: '#f0a940', fontSize: 13, fontWeight: 600 }}>
                                    ✗ Declined — Cascading to next recipient
                                </div>
                            ) : cur.status === OFFER_STATUS.PENDING ? (
                                <OfferTimer
                                    deadlineTs={cur.deadlineTs}
                                    canAct={true}
                                    onAccept={handleAccept}
                                    onDecline={handleDecline}
                                    loading={loading}
                                />
                            ) : null}
                        </div>
                    </div>

                    {/* Organ status */}
                    <div className="panel">
                        <div className="panel-header"><div className="panel-title">Organ Status</div></div>
                        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                { label: 'Status', value: cur.status === OFFER_STATUS.PENDING ? 'Offer Pending' : cur.status, color: '#f0a940' },
                                { label: 'Viability', value: `${offer.viabilityHours.toFixed(1)}h left`, color: '#30d9a0' },
                                { label: 'Transport', value: 'Pending acceptance', color: 'var(--faint)' },
                                { label: 'Blood bank', value: '✓ O+ stocked at AIIMS', color: '#30d9a0' },
                                { label: 'Donor hospital', value: offer.donorHospital, color: 'var(--text)' },
                            ].map(row => (
                                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                    <span style={{ color: 'var(--muted)' }}>{row.label}</span>
                                    <span style={{ fontWeight: 600, color: row.color }}>{row.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Queue preview */}
                    <div className="panel">
                        <div className="panel-header">
                            <div className="panel-title">Next in Queue</div>
                            <span className="panel-badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--faint)' }}>Standby</span>
                        </div>
                        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[
                                { rank: 3, name: 'Anita Sharma', hospital: 'Fortis Gurgaon', score: 87.8 },
                                { rank: 4, name: 'Vikram Nair', hospital: 'Max Delhi', score: 81.4 },
                            ].map(q => (
                                <div key={q.rank} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.5 }}>
                                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                                        {q.rank}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600 }}>{q.name}</div>
                                        <div style={{ fontSize: 10, color: 'var(--muted)' }}>{q.hospital}</div>
                                    </div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--faint)' }}>{q.score}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}