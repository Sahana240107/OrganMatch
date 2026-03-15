import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import OfferTimer from '../components/ui/OfferTimer';
import OrganPill from '../components/ui/OrganPill';
import { useApi } from '../hooks/useApi';
import { formatDate } from '../utils/formatters';

const DOT = { accepted: 'var(--teal)', declined: 'var(--coral)', pending: 'var(--amber)', system: 'var(--teal)', done: 'var(--teal)', standby: 'rgba(255,255,255,0.2)' };

export default function OfferWorkflow() {
    const { offerId } = useParams();
    const navigate = useNavigate();
    const { get, data, loading } = useApi();
    const { post: accept, loading: accepting } = useApi();
    const { post: decline, loading: declining } = useApi();
    const [msg, setMsg] = useState(null);
    const [localOffer, setLocalOffer] = useState(null);

    useEffect(() => {
        if (offerId) get(`/offers/${offerId}`).then(res => {
            if (res?.success) setLocalOffer(res.data?.data);
        });
    }, [offerId]);

    const offer = localOffer || data?.data;

    const handleAccept = useCallback(async () => {
        const res = await accept(`/offers/${offerId}/accept`, {});
        if (res?.success) { setMsg('✓ Offer accepted. Transplant record created.'); }
        else setMsg(`✗ ${res?.message || 'Failed to accept'}`);
    }, [offerId, accept]);

    const handleDecline = useCallback(async () => {
        const reason = prompt('Decline reason (required):');
        if (!reason) return;
        const res = await decline(`/offers/${offerId}/decline`, { decline_reason: reason });
        if (res?.success) { setMsg('Offer declined. Cascading to next recipient.'); }
        else setMsg(`✗ ${res?.message || 'Failed to decline'}`);
    }, [offerId, decline]);

    if (!offerId) {
        return (
            <div className="offer-page">
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, marginBottom: 8 }}>Offer Workflow</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 24 }}>
                    Offers are created from the Matching Engine. Select an organ and send an offer to a recipient.
                </div>
                <button className="btn-primary" onClick={() => navigate('/matching')}>Go to Matching Engine →</button>
            </div>
        );
    }

    if (loading && !offer) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div>;
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
                    <OrganPill organId={offer.organ_type || offer.organ_id} />
                    <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Offer #{offer.offer_id}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, letterSpacing: -0.5, marginBottom: 6 }}>
                    Offer Cascade
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                    NOTTO protocol: Timed offers with acceptance window. Auto-cascade on decline/timeout.
                </div>
            </div>

            {msg && (
                <div style={{
                    padding: '10px 16px', borderRadius: 'var(--r-md)', marginBottom: 16, fontSize: 12, fontWeight: 600,
                    background: msg.startsWith('✓') ? 'var(--teal-dim)' : 'var(--coral-dim)',
                    color: msg.startsWith('✓') ? 'var(--teal)' : 'var(--coral)',
                    border: `1px solid ${msg.startsWith('✓') ? 'rgba(15,212,164,0.2)' : 'rgba(240,90,53,0.2)'}`
                }}>
                    {msg}
                </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
                {[
                    { label: 'Organ ID', value: `#${offer.organ_id}` },
                    { label: 'Status', value: offer.status, color: offer.status === 'accepted' ? 'var(--teal)' : offer.status === 'declined' ? 'var(--coral)' : 'var(--amber)' },
                    { label: 'Deadline', value: formatDate(offer.response_deadline) },
                    { label: 'Sent at', value: formatDate(offer.created_at) },
                ].filter(i => i.value).map(item => (
                    <div key={item.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '8px 14px' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3 }}>{item.label}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: item.color || 'var(--text)', textTransform: 'capitalize' }}>{item.value}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
                {/* Info panel */}
                <div className="panel">
                    <div className="panel-header"><div className="panel-title">Offer Details</div></div>
                    <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                            { k: 'Offer ID', v: `#${offer.offer_id}` },
                            { k: 'Organ', v: offer.organ_type || `#${offer.organ_id}` },
                            { k: 'Recipient ID', v: `#${offer.recipient_id}` },
                            { k: 'Sending Hospital', v: offer.offering_hospital_id ? `Hospital #${offer.offering_hospital_id}` : '—' },
                            { k: 'Receiving Hosp.', v: offer.receiving_hospital_id ? `Hospital #${offer.receiving_hospital_id}` : '—' },
                            { k: 'Cascade Round', v: offer.cascade_round },
                            { k: 'Offered By', v: `User #${offer.offered_by}` },
                        ].map(row => (
                            <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ color: 'var(--text-2)' }}>{row.k}</span>
                                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{row.v ?? '—'}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Timer + actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="panel">
                        <div className="panel-header">
                            <div className="panel-title">Response Window</div>
                            <span className="panel-badge" style={{
                                background: isPending ? 'var(--amber-dim)' : offer.status === 'accepted' ? 'var(--teal-dim)' : 'var(--coral-dim)',
                                color: isPending ? 'var(--amber)' : offer.status === 'accepted' ? 'var(--teal)' : 'var(--coral)',
                            }}>{offer.status}</span>
                        </div>
                        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                            <OfferTimer
                                deadlineTs={deadline}
                                canAct={isPending}
                                onAccept={handleAccept}
                                onDecline={handleDecline}
                                loading={accepting || declining}
                            />
                        </div>
                    </div>

                    {offer.decline_reason && (
                        <div style={{ background: 'var(--coral-dim)', border: '1px solid rgba(240,90,53,0.2)', borderRadius: 'var(--r-md)', padding: '12px 16px' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--coral)', marginBottom: 4 }}>Decline Reason</div>
                            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{offer.decline_reason}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}