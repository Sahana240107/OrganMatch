import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import OfferTimer from '../components/ui/OfferTimer';
import OrganPill from '../components/ui/OrganPill';
import { useApi } from '../hooks/useApi';
import { OFFER_STATUS } from '../utils/constants';
import { formatDate } from '../utils/formatters';

// Real schema offer.status ENUM: 'pending','accepted','declined','timeout','cancelled'
const DOT_COLORS = { accepted: 'var(--forest)', declined: 'var(--burgundy)', pending: 'var(--amber)', system: 'var(--forest)', timeout: 'var(--burgundy)' };

export default function OfferWorkflow() {
    const { offerId } = useParams();
    const navigate = useNavigate();
    const { get, loading } = useApi();
    const { post: accept, loading: accepting } = useApi();
    const { post: decline, loading: declining } = useApi();
    const [offer, setOffer] = useState(null);
    const [msg, setMsg] = useState(null);

    useEffect(() => {
        if (offerId) {
            get(`/offers/${offerId}`).then(res => {
                if (res?.success) setOffer(res.data?.data);
            });
        }
    }, [offerId]);

    const handleAccept = useCallback(async () => {
        const res = await accept(`/offers/${offerId}/accept`, {});
        if (res?.success) { setMsg('✓ Offer accepted. Transplant record created.'); setOffer(o => ({ ...o, status: 'accepted' })); }
        else setMsg(`✗ ${res?.message || 'Failed to accept'}`);
    }, [offerId, accept]);

    const handleDecline = useCallback(async () => {
        const reason = window.prompt('Decline reason (required):');
        if (!reason) return;
        const res = await decline(`/offers/${offerId}/decline`, { decline_reason: reason });
        if (res?.success) { setMsg('Offer declined. Cascading to next recipient.'); setOffer(o => ({ ...o, status: 'declined' })); }
        else setMsg(`✗ ${res?.message || 'Failed to decline'}`);
    }, [offerId, decline]);

    // No offerId — show landing state
    if (!offerId) {
        return (
            <div className="offer-page">
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Offer Workflow</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>Offers are created from the Matching Engine. Select an organ and send an offer to a recipient.</div>
                <button className="btn-primary" onClick={() => navigate('/matching')}>Go to Matching Engine →</button>
            </div>
        );
    }

    if (loading && !offer) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>;
    }

    if (!offer) {
        return (
            <div className="offer-page">
                <div className="empty-state">
                    <div className="empty-icon">📬</div>
                    Offer #{offerId} not found or access denied.
                    <br /><br />
                    <button className="btn-secondary" onClick={() => navigate(-1)}>← Go Back</button>
                </div>
            </div>
        );
    }

    const deadline = offer.response_deadline ? new Date(offer.response_deadline).getTime() : Date.now() + 3600000;
    const isPending = offer.status === 'pending';

    return (
        <div className="offer-page">
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <button className="btn-ghost" onClick={() => navigate(-1)}>← Back</button>
                    <OrganPill organId={offer.organ_type} />
                    <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Offer #{offer.offer_id}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
                    Offer Workflow
                </div>
            </div>

            {msg && (
                <div style={{ padding: '9px 14px', borderRadius: 'var(--r-sm)', marginBottom: 18, fontSize: 12, fontWeight: 600, background: msg.startsWith('✓') ? 'var(--forest-dim)' : msg.startsWith('✗') ? 'var(--burgundy-dim)' : 'var(--amber-dim)', color: msg.startsWith('✓') ? 'var(--forest)' : msg.startsWith('✗') ? 'var(--burgundy)' : 'var(--amber)', border: `1px solid ${msg.startsWith('✓') ? 'var(--forest-border)' : 'var(--burgundy-border)'}` }}>
                    {msg}
                </div>
            )}

            {/* Info chips */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
                {[
                    { label: 'Donor Hospital', value: offer.donor_hospital || '—' },
                    { label: 'Blood', value: offer.donor_blood || '—' },
                    { label: 'Recipient', value: offer.recipient_name || '—' },
                    { label: 'Recipient Hospital', value: offer.recipient_hospital || '—' },
                    { label: 'Status', value: offer.status, color: DOT_COLORS[offer.status] || 'var(--text)' },
                    { label: 'Deadline', value: formatDate(offer.response_deadline) },
                ].map(item => (
                    <div key={item.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '8px 12px' }}>
                        <div style={{ fontSize: 9.5, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{item.label}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: item.color || 'var(--text)', textTransform: 'capitalize' }}>{item.value}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
                {/* Score breakdown */}
                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-title">Match Score Breakdown</div>
                        {offer.total_score != null && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--forest)' }}>{Number(offer.total_score).toFixed(1)}</span>
                        )}
                    </div>
                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                            { label: 'ABO Blood', value: offer.score_abo, color: 'var(--burgundy)' },
                            { label: 'HLA Match', value: offer.score_hla, color: 'var(--steel)' },
                            { label: 'Urgency', value: offer.score_urgency, color: 'var(--amber)' },
                            { label: 'Distance', value: offer.score_distance, color: 'var(--forest)' },
                            { label: 'Wait Time', value: offer.score_wait_time, color: 'var(--sienna)' },
                        ].map(s => (
                            <div key={s.label}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{s.label}</span>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>
                                        {s.value != null ? Number(s.value).toFixed(1) : '—'}
                                    </span>
                                </div>
                                <div style={{ height: 4, background: 'var(--border-2)', borderRadius: 2, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.min(100, s.value || 0)}%`, background: s.color, borderRadius: 2, transition: 'width 0.6s ease' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Timer + actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="panel">
                        <div className="panel-header">
                            <div className="panel-title">Response Window</div>
                            <span className={`panel-badge ${isPending ? 'pb-amber' : offer.status === 'accepted' ? 'pb-teal' : 'pb-red'}`}>
                                {offer.status}
                            </span>
                        </div>
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: '100%', padding: 12, background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', marginBottom: 4 }}>
                                <div style={{ fontSize: 9.5, color: 'var(--text-4)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Current Recipient</div>
                                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{offer.recipient_name || '—'}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{offer.recipient_hospital}</div>
                                {offer.total_score != null && <div style={{ fontSize: 10.5, color: 'var(--forest)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>Score: {Number(offer.total_score).toFixed(1)}</div>}
                            </div>

                            {isPending ? (
                                <OfferTimer
                                    deadlineTs={deadline}
                                    canAct={true}
                                    onAccept={handleAccept}
                                    onDecline={handleDecline}
                                    loading={accepting || declining}
                                />
                            ) : (
                                <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: offer.status === 'accepted' ? 'var(--forest)' : 'var(--amber)', padding: '8px 0' }}>
                                    {offer.status === 'accepted' && '✓ Offer Accepted — Transplant record created'}
                                    {offer.status === 'declined' && '✗ Declined — Cascaded to next recipient'}
                                    {offer.status === 'timeout' && '⏱ Offer timed out — Cascaded automatically'}
                                    {offer.status === 'cancelled' && 'Offer cancelled'}
                                </div>
                            )}
                        </div>
                    </div>

                    {offer.decline_reason && (
                        <div className="panel">
                            <div className="panel-header"><div className="panel-title">Decline Reason</div></div>
                            <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>{offer.decline_reason}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}