import React, { useEffect, useState, useRef } from 'react';
import { formatCountdown } from '../../utils/formatters';

/**
 * OfferTimer — countdown ring + accept/decline for active offer
 * @param {number}   deadlineTs    - Unix timestamp (ms) of offer deadline
 * @param {boolean}  canAct        - show accept/decline buttons
 * @param {function} onAccept
 * @param {function} onDecline
 * @param {boolean}  loading
 */
export default function OfferTimer({ deadlineTs, canAct, onAccept, onDecline, loading }) {
    const [remaining, setRemaining] = useState(0);
    const timerRef = useRef(null);

    useEffect(() => {
        function tick() {
            const diff = Math.max(0, Math.floor((deadlineTs - Date.now()) / 1000));
            setRemaining(diff);
        }
        tick();
        timerRef.current = setInterval(tick, 1000);
        return () => clearInterval(timerRef.current);
    }, [deadlineTs]);

    const totalSecs = 2 * 60 * 60; // 2-hour window
    const pct = Math.max(0, Math.min(1, remaining / totalSecs));
    const r = 34;
    const circ = 2 * Math.PI * r; // ~213.6
    const offset = circ * (1 - pct);

    const color = remaining > 3600 ? '#30d9a0' : remaining > 1800 ? '#f0a940' : '#e05c3a';
    const expired = remaining === 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            {/* Ring */}
            <svg width={80} height={80} viewBox="0 0 80 80">
                <circle cx={40} cy={40} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
                <circle
                    cx={40} cy={40} r={r}
                    fill="none"
                    stroke={expired ? '#555' : color}
                    strokeWidth={4}
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform="rotate(-90 40 40)"
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease' }}
                />
                <text x={40} y={36} textAnchor="middle" fill="white" fontSize={13} fontWeight={700} fontFamily="var(--font-display)">
                    {expired ? 'Expired' : formatCountdown(remaining)}
                </text>
                <text x={40} y={50} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={9} fontFamily="var(--font-body)">
                    {expired ? '' : 'remaining'}
                </text>
            </svg>

            {!expired && canAct && (
                <>
                    <button
                        onClick={onAccept}
                        disabled={loading}
                        style={{
                            width: '100%', padding: '10px 0',
                            background: 'var(--accent)', border: 'none', borderRadius: 10,
                            color: 'white', fontSize: 13, fontWeight: 700,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1,
                            fontFamily: 'var(--font-body)', transition: 'all 0.2s',
                        }}
                    >
                        {loading ? 'Processing…' : '✓ Accept Offer'}
                    </button>
                    <button
                        onClick={onDecline}
                        disabled={loading}
                        style={{
                            width: '100%', padding: '9px 0',
                            background: 'var(--surface)', border: '1px solid var(--border-bright)',
                            borderRadius: 10, color: 'var(--text)',
                            fontSize: 12, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                            fontFamily: 'var(--font-body)', transition: 'all 0.2s',
                        }}
                    >
                        ✗ Decline → Auto-cascade
                    </button>
                </>
            )}

            {expired && (
                <div style={{ fontSize: 12, color: '#e05c3a', textAlign: 'center' }}>
                    Offer window closed. Cascaded to next.
                </div>
            )}
        </div>
    );
}