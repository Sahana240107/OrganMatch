const COLOR_MAP = {
  green:'#16a34a', blue:'#0d6efd', red:'#dc2626',
  amber:'#d97706', teal:'#0891b2', purple:'#7c3aed',
}

export default function KPICard({ label, value, sub, trend, trendDir = 'up', color = 'blue', icon }) {
  const hex = COLOR_MAP[color] || COLOR_MAP.blue
  return (
    <div className="kpi-card" style={{ '--kpi-color': hex }}>
      <div className="flex items-center justify-between">
        <div className="kpi-label">{label}</div>
        {icon && <div className="kpi-icon">{icon}</div>}
      </div>
      <div className="kpi-value">{value}</div>
      {(sub || trend) && (
        <div className="flex items-center gap-6">
          {trend && (
            <span className={`kpi-delta ${trendDir === 'up' ? 'up' : trendDir === 'down' ? 'down' : 'warn'}`}>
              {trendDir === 'up' ? '↑' : '↓'} {trend}
            </span>
          )}
          {sub && <span style={{ fontSize: 12, color: 'var(--text3)' }}>{sub}</span>}
        </div>
      )}
    </div>
  )
}