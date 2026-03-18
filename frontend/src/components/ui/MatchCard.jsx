import OrganPill from './OrganPill'
import ScoreBar  from './ScoreBar'
import { urgencyClass } from '../../utils/formatters'
import { URGENCY_LABELS } from '../../utils/constants'

function hlaLabel(n) {
  if (n >= 6) return { cls: 'hla-badge hla-full',    text: `${n}/6` }
  if (n >= 4) return { cls: 'hla-badge hla-partial', text: `${n}/6` }
  if (n >= 2) return { cls: 'hla-badge hla-low',     text: `${n}/6` }
  return             { cls: 'hla-badge hla-none',    text: `${n}/6` }
}

export default function MatchCard({ match, rank = 1, selected = false, onSelect, onSendOffer }) {
  const isTop  = rank === 1
  const rankCls = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-n'
  const hla    = hlaLabel(match.hla_antigen_matches || 0)

  return (
    <div
      className={`match-card${selected ? ' selected' : ''}${isTop ? ' top-match' : ''}`}
      onClick={() => onSelect?.(match)}
    >
      <div className={`rank-badge ${rankCls}`}>{rank}</div>

      <div style={{ flex:1, minWidth:0 }}>
        <div className="flex items-center gap-8 mb-6 flex-wrap">
          <span style={{ fontWeight:700, fontSize:14 }}>
            {match.recipient_name || `R-${match.recipient_id}`}
          </span>
          <span className={urgencyClass(match.medical_urgency)}>
            {URGENCY_LABELS?.[match.medical_urgency] || match.medical_urgency}
          </span>
          {isTop && <span className="badge badge-green">Top Match</span>}
        </div>

        <div className="flex gap-12 mb-8 flex-wrap" style={{ fontSize:12, color:'var(--text2)' }}>
          <span>{match.recipient_hospital || '—'}</span>
          <span>·</span>
          <span style={{ fontFamily:'var(--mono)' }}>{match.recipient_blood || '—'}</span>
          {match.distance_km && <><span>·</span><span>{Math.round(match.distance_km)} km</span></>}
        </div>

        <div className="flex items-center gap-10">
          <ScoreBar score={match.total_score} />
          <span className={hla.cls}>{hla.text} HLA</span>
        </div>
      </div>

      {isTop ? (
        <button
          className="btn btn-green btn-sm"
          style={{ alignSelf:'center', flexShrink:0 }}
          onClick={e => { e.stopPropagation(); onSendOffer?.(match) }}
        >
          Send Offer
        </button>
      ) : (
        <button
          className="btn btn-ghost btn-sm"
          style={{ alignSelf:'center', flexShrink:0 }}
          onClick={e => { e.stopPropagation(); onSelect?.(match) }}
        >
          Details
        </button>
      )}
    </div>
  )
}
