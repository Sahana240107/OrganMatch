import { scoreColor } from '../../utils/formatters'

export default function ScoreBar({ score, max = 100, showValue = true }) {
    const pct = Math.min(100, (score / max) * 100)
    const color = scoreColor(score)
    return (
        <div className="score-bar-wrap">
            <div className="score-bar" style={{ flex: 1 }}>
                <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
            {showValue && (
                <span className="score-val" style={{ color }}>{Number(score).toFixed(1)}</span>
            )}
        </div>
    )
}