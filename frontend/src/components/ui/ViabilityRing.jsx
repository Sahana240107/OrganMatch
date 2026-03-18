export default function ViabilityRing({ pct = 75, hours = 18, size = 72, strokeWidth = 6, label = '' }) {
  const r     = (size - strokeWidth) / 2
  const circ  = 2 * Math.PI * r
  const dash  = (pct / 100) * circ
  const color = pct > 60 ? '#16a34a' : pct > 30 ? '#d97706' : '#dc2626'
  const bgCol = pct > 60 ? '#dcfce7' : pct > 30 ? '#fef3c7' : '#fee2e2'

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
      <div style={{ position:'relative', width:size, height:size }}>
        <svg width={size} height={size} style={{ transform:'rotate(-90deg)', display:'block' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bgCol} strokeWidth={strokeWidth} />
          <circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            style={{ transition:'stroke-dasharray 0.8s cubic-bezier(0,0,0.2,1)' }}
          />
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:size>60?15:11, fontWeight:800, fontFamily:'var(--mono)', color, lineHeight:1 }}>
            {hours}h
          </span>
          <span style={{ fontSize:8, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>
            left
          </span>
        </div>
      </div>
      {label && (
        <span style={{ fontSize:10, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px' }}>
          {label}
        </span>
      )}
    </div>
  )
}
