import { useEffect, useState } from 'react'
import { formatTime } from '../../utils/formatters'

export default function OfferTimer({ deadline, size = 96, strokeWidth = 7, totalSeconds = 14400 }) {
  const [secs, setSecs] = useState(0)

  useEffect(() => {
    if (!deadline) return
    const calc = () => setSecs(Math.max(0, Math.floor((new Date(deadline) - Date.now()) / 1000)))
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [deadline])

  const pct    = Math.min(100, (secs / totalSeconds) * 100)
  const r      = (size - strokeWidth) / 2
  const circ   = 2 * Math.PI * r
  const dash   = (pct / 100) * circ
  const color  = pct > 50 ? '#16a34a' : pct > 20 ? '#d97706' : '#dc2626'
  const urgent = pct < 20

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <div style={{ position:'relative', width:size, height:size }}>
        <svg width={size} height={size} style={{ transform:'rotate(-90deg)', display:'block' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg3)" strokeWidth={strokeWidth} />
          <circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
          />
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:14, fontWeight:800, fontFamily:'var(--mono)', color, lineHeight:1, animation: urgent ? 'viabilityPulse 1s infinite' : 'none' }}>
            {deadline ? formatTime(secs) : '——'}
          </span>
          <span style={{ fontSize:9, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginTop:2 }}>
            remaining
          </span>
        </div>
      </div>
      <div style={{ fontSize:11, color: urgent ? 'var(--red)' : 'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px' }}>
        {urgent ? '⚠ Urgent' : 'Response Window'}
      </div>
    </div>
  )
}
