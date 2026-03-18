const OPTIONS = [
  { value:'status_1a', label:'1A', bg:'#fee2e2', color:'#991b1b', border:'#fca5a5', desc:'Critical / ICU' },
  { value:'status_1b', label:'1B', bg:'#fef3c7', color:'#92400e', border:'#fcd34d', desc:'Serious' },
  { value:'status_2',  label:'2',  bg:'#dbeafe', color:'#1d4ed8', border:'#93c5fd', desc:'Moderate' },
  { value:'status_3',  label:'3',  bg:'#f1f5f9', color:'#475569', border:'#cbd5e1', desc:'Stable' },
]

export default function UrgencyPicker({ value, onChange }) {
  return (
    <div style={{ display:'flex', gap:8 }}>
      {OPTIONS.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange?.(opt.value)}
            style={{
              flex:1, padding:'8px 4px', borderRadius:10,
              border:`1.5px solid ${active ? opt.border : 'var(--border2)'}`,
              background: active ? opt.bg : 'var(--bg3)',
              color: active ? opt.color : 'var(--text2)',
              cursor:'pointer', transition:'all 0.15s',
              fontFamily:'var(--font)', fontWeight: active ? 700 : 500,
              transform: active ? 'scale(1.04)' : 'scale(1)',
              boxShadow: active ? `0 2px 8px ${opt.border}` : 'none',
            }}
          >
            <div style={{ fontSize:16, fontWeight:800, lineHeight:1 }}>{opt.label}</div>
            <div style={{ fontSize:9, marginTop:3, opacity:0.8, textTransform:'uppercase', letterSpacing:'0.4px' }}>{opt.desc}</div>
          </button>
        )
      })}
    </div>
  )
}
