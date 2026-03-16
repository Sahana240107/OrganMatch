/**
 * SVG countdown ring — shows remaining viability as a circular progress.
 * remainingHours / totalHours determines the arc fill.
 */
export default function ViabilityRing({ remainingHours, totalHours, size = 56 }) {
    const pct = Math.max(0, Math.min(1, remainingHours / totalHours))
    const r = (size - 8) / 2
    const circ = 2 * Math.PI * r
    const dash = pct * circ
    const color = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444'

    return (
        <div className="viability-ring" style={{ width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
                <circle
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${circ}`}
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                />
            </svg>
            <span className="ring-text" style={{ color, fontSize: size < 48 ? 10 : 12 }}>
                {Math.round(remainingHours)}h
            </span>
        </div>
    )
}