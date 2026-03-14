import React from 'react';
import OrganPill from './OrganPill';
import ViabilityRing from './ViabilityRing';
import ScoreBar from './ScoreBar';
import { formatDistance, formatTime } from '../../utils/formatters';
import { MATCH_WEIGHTS } from '../../utils/constants';

/**
 * MatchCard — full donor+recipient comparison card for the Matching Engine
 * @param {object} donor       - { name, blood, hospital, city, hla, organId, remainingHours, maxHours }
 * @param {object} recipient   - { name, blood, hospital, city, hla, urgency, waitDays, meld, las }
 * @param {object} scores      - { total, abo, hla, urgency, distance, waitTime }
 * @param {number} rank
 * @param {boolean} isTop
 * @param {function} onOffer
 */
export default function MatchCard({ donor, recipient, scores = {}, rank, isTop, onOffer }) {
    const total = scores.total ?? 0;

    const scoreColor = total >= 90 ? '#30d9a0' : total >= 75 ? '#4f9cf9' : total >= 60 ? '#f0a940' : '#e05c3a';

    return (
        <div
            style={{
                background: isTop ? 'rgba(48,217,160,0.04)' : 'var(--surface)',
                border: `1px solid ${isTop ? 'rgba(48,217,160,0.2)' : 'var(--border)'}`,
                borderRadius: 16,
                overflow: 'hidden',
                transition: 'border-color 0.2s',
            }}
        >
            {/* Header */}
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: isTop ? 'rgba(48,217,160,0.15)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${isTop ? 'rgba(48,217,160,0.3)' : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700,
                        color: isTop ? '#30d9a0' : 'var(--muted)',
                    }}>
                        {rank}
                    </div>
                    {isTop && (
                        <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                            background: 'rgba(48,217,160,0.12)', color: '#30d9a0',
                        }}>
                            BEST MATCH
                        </span>
                    )}
                </div>

                {/* Total score ring */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: scoreColor, lineHeight: 1 }}>
                            {total.toFixed(1)}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--faint)' }}>match score</div>
                    </div>
                    <ViabilityRing remainingHours={donor?.remainingHours} maxHours={donor?.maxHours} size={44} />
                </div>
            </div>

            {/* Donor / Recipient row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: 0 }}>
                {/* Donor */}
                <div style={{ padding: '14px 16px', borderRight: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 10, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Donor</div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{donor?.name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{donor?.hospital}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'var(--muted)' }}>
                            🩸 {donor?.blood}
                        </span>
                        {donor?.organId && <OrganPill organId={donor.organId} size="sm" />}
                    </div>
                    {donor?.remainingHours && (
                        <div style={{ marginTop: 8, fontSize: 11, color: '#f0a940' }}>
                            ⏱ {formatTime(donor.remainingHours * 60)} viability left
                        </div>
                    )}
                </div>

                {/* Arrow */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#30d9a0', fontSize: 16 }}>
                    →
                </div>

                {/* Recipient */}
                <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Recipient</div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{recipient?.name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{recipient?.hospital}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'var(--muted)' }}>
                            🩸 {recipient?.blood}
                        </span>
                        {recipient?.urgency && (
                            <span style={{
                                fontSize: 10, padding: '2px 8px', borderRadius: 20,
                                background: recipient.urgency === '1A' ? 'rgba(224,92,58,0.12)' : 'rgba(240,169,64,0.12)',
                                color: recipient.urgency === '1A' ? '#e05c3a' : '#f0a940',
                            }}>
                                Status {recipient.urgency}
                            </span>
                        )}
                    </div>
                    {recipient?.waitDays && (
                        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
                            Wait: {recipient.waitDays} days
                        </div>
                    )}
                </div>
            </div>

            {/* Score breakdown */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Score Breakdown</div>
                <ScoreBar label="Blood ABO" value={scores.abo} weight={MATCH_WEIGHTS.blood_abo} color="#e05c3a" height={4} />
                <ScoreBar label="HLA Match" value={scores.hla} weight={MATCH_WEIGHTS.hla_score} color="#4f9cf9" height={4} />
                <ScoreBar label="Urgency" value={scores.urgency} weight={MATCH_WEIGHTS.urgency} color="#f0a940" height={4} />
                <ScoreBar label="Distance" value={scores.distance} weight={MATCH_WEIGHTS.distance} color="#30d9a0" height={4} />
                <ScoreBar label="Wait Time" value={scores.waitTime} weight={MATCH_WEIGHTS.wait_time} color="#b478ff" height={4} />
            </div>

            {/* Action */}
            {onOffer && (
                <div style={{ padding: '0 16px 14px' }}>
                    <button
                        onClick={onOffer}
                        style={{
                            width: '100%', padding: '10px',
                            background: isTop ? 'var(--accent)' : 'var(--surface)',
                            border: `1px solid ${isTop ? 'transparent' : 'var(--border-bright)'}`,
                            borderRadius: 10, color: 'white', fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.2s',
                            fontFamily: 'var(--font-body)',
                        }}
                    >
                        {isTop ? '✓ Send Offer' : 'Send Offer'}
                    </button>
                </div>
            )}
        </div>
    );
}