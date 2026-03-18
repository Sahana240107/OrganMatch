import { scoreColor } from '../../utils/formatters'

export default function ScoreBar({ score, max = 100, showValue = true }) {
  const pct   = Math.min(100, ((score || 0) / max) * 100)
  const color = scoreColor(score)
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div className="score-bar" style={{ flex:1 }}>
        <div className="score-bar-fill" style={{ width:`${pct}%`, background:`linear-gradient(90deg,${color}99,${color})` }} />
      </div>
      {showValue && (
        <span style={{ fontSize:12, fontWeight:700, fontFamily:'var(--mono)', color, minWidth:32 }}>
          {Number(score || 0).toFixed(1)}
        </span>
      )}
    </div>
  )
}
