import { useState, useEffect } from 'react'
import { formatTime } from '../../utils/formatters'

export default function OfferTimer({ deadlineISO, onAccept, onDecline, offer }) {
    const [secs, setSecs] = useState(0)

    useEffect(() => {
        function calc() {
            const diff = Math.max(0, Math.floor((new Date(deadlineISO) - Date.now()) / 1000))
            setSecs(diff)
        }
        calc()
        const id = setInterval(calc, 1000)
        return () => clearInterval(id)
    }, [deadlineISO])

    const isUrgent = secs < 3600
    const color = secs < 1800 ? 'var(--red)' : isUrgent ? 'var(--amber)' : 'var(--amber)'

    return (
        <div className="offer-timer">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                        Round {offer?.cascade_round} · R-{offer?.recipient_id}
                    </div>
                    <div className="text-muted" style={{ fontSize: 11 }}>
                        {offer?.receiving_hospital?.name} · {offer?.recipient?.medical_urgency?.toUpperCase()}
                    </div>
                </div>
                {offer?.organ?.organ_type && (
                    <span className={`organ-pill organ-${offer.organ.organ_type}`}>
                        {offer.organ.organ_type}
                    </span>
                )}
            </div>

            <div className="timer-display" style={{ color }}>{formatTime(secs)}</div>
            <div className="timer-label">Time Remaining to Respond</div>

            <div className="flex gap-8 mt-12">
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onAccept?.(offer)}>
                    ✓ Accept Offer
                </button>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => onDecline?.(offer)}>
                    ✕ Decline
                </button>
            </div>
        </div>
    )
}