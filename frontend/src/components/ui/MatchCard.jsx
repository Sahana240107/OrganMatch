import OrganPill from './OrganPill'
import ScoreBar from './ScoreBar'
import { urgencyClass, monthsSince } from '../../utils/formatters'
import { URGENCY_LABELS } from '../../utils/constants'

const HLA_LABEL = { full: 'hla-full', partial: 'hla-partial', none: 'hla-none' }

function hlaCategory(matches) {
    if (matches >= 6) return { cls: 'hla-full', label: `${matches}/8 HLA` }
    if (matches >= 3) return { cls: 'hla-partial', label: `${matches}/8 HLA` }
    return { cls: 'hla-none', label: `${matches}/8 HLA` }
}

const RANK_CLS = ['rank-1', 'rank-2', 'rank-3']

export default function MatchCard({ match, rank, onSendOffer, onDetails }) {
    const isTop = rank === 1
    const rankCls = RANK_CLS[rank - 1] || 'rank-n'
    const hla = hlaCategory(match.hla_antigen_matches ?? 0)
    const urgLabel = URGENCY_LABELS[match.recipient?.medical_urgency] || '—'
    const urgCls = urgencyClass(match.recipient?.medical_urgency)
    const waitMo = match.recipient?.registration_date
        ? monthsSince(match.recipient.registration_date)
        : '—'

    return (
        <div className={`match-card${isTop ? ' top' : ''}`}>
            <div className={`rank-badge ${rankCls}`}>{rank}</div>

            <div style={{ flex: 1 }}>
                <div className="flex items-center gap-8 mb-4">
                    <span className="fw-600" style={{ fontSize: 14 }}>
                        R-{match.recipient_id} · {match.recipient?.full_name || '—'}
                    </span>
                    <span className={urgCls}>STATUS {urgLabel}</span>
                    {isTop && <span className="badge badge-green">Top Match</span>}
                </div>

                <div className="flex gap-12 text-sm text-muted mb-8">
                    <span>{match.recipient?.hospital?.name || '—'}</span>
                    <span>·</span>
                    <span>{match.recipient?.blood_group} donor</span>
                    <span>·</span>
                    <span>{match.distance_km ? `${Math.round(match.distance_km)} km` : '—'}</span>
                    <span>·</span>
                    <span>Wait: {waitMo} mo</span>
                </div>

                <div className="flex gap-8 items-center">
                    <ScoreBar score={match.total_score} />
                    <span className={`hla-match ${hla.cls}`}>{hla.label}</span>
                </div>
            </div>

            {isTop ? (
                <button className="btn btn-primary" style={{ alignSelf: 'center' }} onClick={() => onSendOffer?.(match)}>
                    Send Offer
                </button>
            ) : (
                <button className="btn btn-ghost" style={{ alignSelf: 'center', fontSize: 12 }} onClick={() => onDetails?.(match)}>
                    Details
                </button>
            )}
        </div>
    )
}