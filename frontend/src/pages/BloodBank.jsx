import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useApi } from '../hooks/useApi'

// ─── Constants ───────────────────────────────────────────────────────────────
const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']

const BG_META = {
  'O+':  { color: '#e53e3e', glow: 'rgba(229,62,62,0.28)',   label: 'Universal Donor',    gradient: 'linear-gradient(135deg,#fc5c5c,#e53e3e)' },
  'O-':  { color: '#7c3aed', glow: 'rgba(124,58,237,0.28)',  label: 'Rarest Universal',   gradient: 'linear-gradient(135deg,#9f67ff,#7c3aed)' },
  'A+':  { color: '#0284c7', glow: 'rgba(2,132,199,0.28)',   label: 'Most Common',        gradient: 'linear-gradient(135deg,#38bdf8,#0284c7)' },
  'A-':  { color: '#d53f8c', glow: 'rgba(213,63,140,0.28)',  label: 'Less Common',        gradient: 'linear-gradient(135deg,#f472b6,#d53f8c)' },
  'B+':  { color: '#059669', glow: 'rgba(5,150,105,0.28)',   label: 'Common',             gradient: 'linear-gradient(135deg,#34d399,#059669)' },
  'B-':  { color: '#c2410c', glow: 'rgba(194,65,12,0.28)',   label: 'Rare',               gradient: 'linear-gradient(135deg,#fb923c,#c2410c)' },
  'AB+': { color: '#0e7490', glow: 'rgba(14,116,144,0.28)',  label: 'Universal Recipient',gradient: 'linear-gradient(135deg,#22d3ee,#0e7490)' },
  'AB-': { color: '#a16207', glow: 'rgba(161,98,7,0.28)',    label: 'Rarest Type',        gradient: 'linear-gradient(135deg,#fbbf24,#a16207)' },
}

// ─── Summary Bar ─────────────────────────────────────────────────────────────
function SummaryBar({ inventory, loading }) {
  const allEntries = useMemo(() => BLOOD_GROUPS.map(bg => ({
    bg,
    units: inventory[bg]?.total || 0,
  })), [inventory])

  const totalUnits  = allEntries.reduce((s, e) => s + e.units, 0)
  const mostAvail   = useMemo(() => [...allEntries].sort((a,b) => b.units - a.units)[0], [allEntries])
  const leastAvail  = useMemo(() => [...allEntries].sort((a,b) => a.units - b.units)[0], [allEntries])

  const shimmer = `
    background: linear-gradient(90deg, var(--bg3) 25%, var(--bg4) 50%, var(--bg3) 75%);
    background-size: 600px 100%;
    animation: shimmer 1.4s infinite;
    border-radius: 8px;
  `

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      boxShadow: 'var(--shadow-sm)',
      marginBottom: 24,
      overflow: 'hidden',
    }}>
      {/* Total Units */}
      <div style={{ padding: '22px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#3d4f70', marginBottom: 6 }}>
          Total Stock
        </div>
        {loading ? (
          <div style={{ height: 40, width: 120, margin: '0 auto 6px', ...Object.fromEntries(shimmer.split(';').filter(Boolean).map(s => s.trim().split(':').map(p=>p.trim()))) }} />
        ) : (
          <div style={{ fontSize: 38, fontWeight: 900, color: 'var(--text)', letterSpacing: '-2px', lineHeight: 1, marginBottom: 4 }}>
            {totalUnits.toLocaleString()}
          </div>
        )}
        <div style={{ fontSize: 12, color: '#3d4f70', fontWeight: 500 }}>units across all types</div>
      </div>

      {/* Divider */}
      <div style={{ background: 'var(--border)', margin: '16px 0' }} />

      {/* Most Available */}
      <div style={{ padding: '22px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#3d4f70', marginBottom: 6 }}>
          Most Available
        </div>
        {loading ? (
          <div style={{ height: 40, width: 80, margin: '0 auto 6px', ...Object.fromEntries(shimmer.split(';').filter(Boolean).map(s => s.trim().split(':').map(p=>p.trim()))) }} />
        ) : (
          <>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--bg3)',
              border: '1px solid var(--border2)',
              borderRadius: 12, padding: '6px 16px', marginBottom: 4,
            }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: BG_META[mostAvail?.bg]?.color, letterSpacing: '-1px', lineHeight: 1 }}>
                {mostAvail?.bg || '—'}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: BG_META[mostAvail?.bg]?.color }}>
                {(mostAvail?.units || 0).toLocaleString()} u
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#3d4f70', fontWeight: 500 }}>{BG_META[mostAvail?.bg]?.label}</div>
          </>
        )}
      </div>

      {/* Divider */}
      <div style={{ background: 'var(--border)', margin: '16px 0' }} />

      {/* Least Available */}
      <div style={{ padding: '22px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#3d4f70', marginBottom: 6 }}>
          Least Available
        </div>
        {loading ? (
          <div style={{ height: 40, width: 80, margin: '0 auto 6px', ...Object.fromEntries(shimmer.split(';').filter(Boolean).map(s => s.trim().split(':').map(p=>p.trim()))) }} />
        ) : (
          <>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--bg3)',
              border: '1px solid var(--border2)',
              borderRadius: 12, padding: '6px 16px', marginBottom: 4,
            }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: BG_META[leastAvail?.bg]?.color, letterSpacing: '-1px', lineHeight: 1 }}>
                {leastAvail?.bg || '—'}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: BG_META[leastAvail?.bg]?.color }}>
                {(leastAvail?.units || 0).toLocaleString()} u
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#3d4f70', fontWeight: 500 }}>{BG_META[leastAvail?.bg]?.label}</div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Hospital Search Dropdown ─────────────────────────────────────────────────
function HospitalDropdown({ hospitals, selected, onSelect }) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const ref               = useRef()
  const inputRef          = useRef()

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const filtered = hospitals.filter(h =>
    h.name.toLowerCase().includes(query.toLowerCase())
  )

  const selectedName = selected === 'all' ? 'All Hospitals' : selected

  return (
    <div ref={ref} style={{ position: 'relative', width: 280 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          border: `1.5px solid ${open ? 'var(--accent)' : 'var(--border2)'}`,
          borderRadius: 12, cursor: 'pointer',
          background: 'var(--surface)',
          boxShadow: open ? '0 0 0 3px rgba(13,110,253,0.1)' : 'var(--shadow-sm)',
          transition: 'all 0.18s',
          userSelect: 'none',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: selected === 'all' ? '#64748b' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedName}
        </span>
        {selected !== 'all' && (
          <span
            onClick={e => { e.stopPropagation(); onSelect('all'); setQuery('') }}
            style={{ fontSize: 11, color: '#3d4f70', padding: '1px 5px', borderRadius: 6, background: 'var(--bg3)', cursor: 'pointer' }}
          >✕</span>
        )}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.18s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', width: '100%',
          background: 'var(--surface)',
          border: '1.5px solid var(--border2)',
          borderRadius: 14,
          boxShadow: 'var(--shadow-lg)',
          zIndex: 50, overflow: 'hidden',
          animation: 'scaleIn 0.12s var(--ease-out) both',
        }}>
          {/* Search input */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              ref={inputRef}
              placeholder="Search hospital..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                flex: 1, border: 'none', outline: 'none', fontSize: 13,
                background: 'transparent', color: 'var(--text)', fontFamily: 'var(--font)',
              }}
            />
            {query && (
              <span onClick={() => setQuery('')} style={{ cursor: 'pointer', fontSize: 11, color: '#3d4f70' }}>✕</span>
            )}
          </div>

          {/* Options */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            <div
              onClick={() => { onSelect('all'); setOpen(false); setQuery('') }}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: 13.5,
                fontWeight: selected === 'all' ? 700 : 500,
                color: selected === 'all' ? 'var(--accent)' : 'var(--text)',
                background: selected === 'all' ? 'rgba(13,110,253,0.05)' : 'transparent',
                display: 'flex', alignItems: 'center', gap: 8,
                borderBottom: '1px solid var(--border)',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              </svg>
              All Hospitals
              {selected === 'all' && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, color: 'var(--accent)' }}>✓</span>}
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: 12, color: '#3d4f70' }}>No hospitals found</div>
            ) : filtered.map(h => (
              <div
                key={h.hospital_id}
                onClick={() => { onSelect(h.name); setOpen(false); setQuery('') }}
                style={{
                  padding: '10px 14px', cursor: 'pointer', fontSize: 13.5,
                  fontWeight: selected === h.name ? 700 : 400,
                  color: selected === h.name ? 'var(--accent)' : 'var(--text)',
                  background: selected === h.name ? 'rgba(13,110,253,0.05)' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (selected !== h.name) e.currentTarget.style.background = 'var(--bg3)' }}
                onMouseLeave={e => { if (selected !== h.name) e.currentTarget.style.background = 'transparent' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                </svg>
                {h.name}
                {selected === h.name && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, color: 'var(--accent)' }}>✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Mini Sparkline (last 8 blood groups as bars) ──────────────────────────
function MiniChart({ values, color, critical }) {
  const max = Math.max(...values, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28 }}>
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            width: 5, borderRadius: 3,
            height: `${Math.max(8, (v / max) * 28)}px`,
            background: critical && v < 50
              ? `rgba(220,38,38,${0.4 + (i / values.length) * 0.6})`
              : `${color}${Math.round((0.35 + (i / values.length) * 0.65) * 255).toString(16).padStart(2,'0')}`,
            transition: 'height 0.6s var(--ease-spring)',
          }}
        />
      ))}
    </div>
  )
}

// ─── Blood Group Row ──────────────────────────────────────────────────────────
function BloodRow({ bg, data, max, index, hospitalBreakdown }) {
  const [open, setOpen] = useState(false)
  const units    = data?.total || 0
  const hospitals = data?.hospitals || {}
  const meta     = BG_META[bg]
  const pct      = Math.max(3, (units / Math.max(max, 1)) * 100)
  const isLow    = units < 50
  const hospEntries = Object.entries(hospitals).sort(([,a],[,b]) => b - a)

  // mini chart values: per-hospital sorted desc
  const chartVals = hospEntries.map(([,v]) => v)

  return (
    <div
      style={{
        borderRadius: 14,
        border: '1.5px solid var(--border)',
        background: 'var(--surface)',
        overflow: 'hidden',
        transition: 'all 0.18s var(--ease)',
        animation: `slideUp 0.35s var(--ease) both`,
        animationDelay: `${index * 0.05}s`,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Main row */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 18px', cursor: 'pointer',
        }}
      >
        {/* Blood group badge */}
        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: meta.gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 14px ${meta.glow}`,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Shine overlay */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
            background: 'rgba(255,255,255,0.18)', borderRadius: '14px 14px 40% 40%',
          }} />
          <span style={{ fontSize: 14, fontWeight: 900, color: '#fff', letterSpacing: '-0.3px', position: 'relative', zIndex: 1 }}>
            {bg}
          </span>
        </div>

        {/* Label + bar */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#3d4f70' }}>
              {meta.label}
            </span>
            {isLow && (
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: '#64748b',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: 5, padding: '1px 6px',
                letterSpacing: '0.2px',
              }}>
                low stock
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: meta.gradient,
              borderRadius: 999,
              boxShadow: `0 0 8px ${meta.glow}`,
              transition: 'width 0.8s var(--ease-spring)',
              animation: 'progressFill 0.8s var(--ease) both',
            }} />
          </div>
        </div>

        {/* Right side: chart + count + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {chartVals.length > 1 && (
            <MiniChart values={chartVals} color={meta.color} />
          )}
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 22, fontWeight: 900, lineHeight: 1,
              color: 'var(--text)',
              letterSpacing: '-1px',
            }}>
              {units.toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: units < 50 ? '#64748b' : '#64748b', fontWeight: units < 50 ? 700 : 600 }}>
              {units < 50 ? 'low stock' : 'units'}
            </div>
          </div>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="#64748b" strokeWidth="2.5"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {/* Expanded breakdown */}
      {open && (
        <div style={{
          borderTop: '1px solid var(--border)',
          background: 'var(--bg3)',
          padding: '12px 18px 14px',
          animation: 'fadeIn 0.18s ease both',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#3d4f70', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>
            Hospital Breakdown
          </div>
          {hospEntries.length === 0 ? (
            <div style={{ fontSize: 12, color: '#3d4f70', fontStyle: 'italic' }}>No data available</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {hospEntries.map(([name, val]) => {
                const hospPct = Math.max(4, (val / Math.max(units, 1)) * 100)
                return (
                  <div key={name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: '#3d4f70', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{val}</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--bg4)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${hospPct}%`,
                        background: meta.gradient,
                        borderRadius: 999, transition: 'width 0.6s var(--ease)',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Low Stock Chart ──────────────────────────────────────────────────────────
function LowStockChart({ inventory }) {
  const lowItems = BLOOD_GROUPS
    .map(bg => ({ bg, units: inventory[bg]?.total || 0 }))
    .filter(e => e.units < 50)
    .sort((a, b) => a.units - b.units)

  if (lowItems.length === 0) return (
    <div style={{ padding: '28px 0', textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>All blood groups well stocked</div>
      <div style={{ fontSize: 11, color: '#3d4f70', marginTop: 4 }}>No types below 50 units</div>
    </div>
  )

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ fontSize: 11, color: '#3d4f70', fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', animation: 'pulse-ring 1.5s infinite' }} />
        {lowItems.length} type{lowItems.length > 1 ? 's' : ''} below threshold (50 units)
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lowItems.map(({ bg, units }) => {
          const meta = BG_META[bg]
          const pct  = Math.max(4, (units / 50) * 100)
          return (
            <div key={bg}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: meta.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 900, color: '#fff',
                  boxShadow: `0 2px 8px ${meta.glow}`,
                }}>
                  {bg}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ height: 10, background: 'var(--bg3)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: meta.gradient,
                      borderRadius: 999,
                      boxShadow: `0 0 8px ${meta.glow}`,
                      transition: 'width 0.8s var(--ease-spring)',
                    }} />
                    <div style={{
                      position: 'absolute', right: 0, top: 0, bottom: 0, width: 2,
                      background: 'rgba(0,0,0,0.12)', borderRadius: 1,
                    }} />
                  </div>
                </div>
                <div style={{ width: 34, textAlign: 'right', fontSize: 13, fontWeight: 800, color: meta.color }}>
                  {units}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BloodBank() {
  const { request } = useApi()

  const [inventory,    setInventory]    = useState({})
  const [hospitals,    setHospitals]    = useState([])
  const [selected,     setSelected]     = useState('all')
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const [lastUpdated,  setLastUpdated]  = useState(null)

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const hData = await request('GET', '/api/hospitals')
      const hosps = hData?.data || hData?.hospitals || []
      setHospitals(hosps)

      const agg = {}
      BLOOD_GROUPS.forEach(bg => agg[bg] = { total: 0, hospitals: {} })

      await Promise.all(hosps.map(async h => {
        try {
          const res = await request('GET', `/api/hospitals/${h.hospital_id}/blood-bank`)
          const items = res?.inventory || []
          items.forEach(item => {
            const bg = item.blood_group
            const u  = item.units_available || 0
            if (agg[bg]) {
              agg[bg].total += u
              agg[bg].hospitals[h.name] = (agg[bg].hospitals[h.name] || 0) + u
            }
          })
        } catch { /* skip hospitals with no data */ }
      }))

      setInventory(agg)
      setLastUpdated(new Date())
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false) }
  }, [request])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => fetchAll(true), 30000)
    return () => clearInterval(id)
  }, [fetchAll])

  const maxUnits = useMemo(() =>
    Math.max(...BLOOD_GROUPS.map(bg => inventory[bg]?.total || 0), 1),
    [inventory]
  )

  const displayInventory = useMemo(() => {
    if (selected === 'all') return inventory
    return Object.fromEntries(BLOOD_GROUPS.map(bg => {
      const u = inventory[bg]?.hospitals?.[selected] || 0
      return [bg, { total: u, hospitals: { [selected]: u } }]
    }))
  }, [inventory, selected])

  const displayMax = useMemo(() =>
    Math.max(...BLOOD_GROUPS.map(bg => displayInventory[bg]?.total || 0), 1),
    [displayInventory]
  )

  function timeAgo(date) {
    if (!date) return ''
    const s = Math.floor((Date.now() - date) / 1000)
    if (s < 60) return `${s}s ago`
    return `${Math.floor(s / 60)}m ago`
  }

  return (
    <div style={{ animation: 'pageIn 0.4s var(--ease) both' }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: 600px 0; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Page Header ── */}
      <div className="page-header mb-24" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Blood <span>Bank</span></h1>
          <p className="page-subtitle" style={{ marginTop: 4 }}>
            Real-time inventory across all hospitals — every drop counts
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginTop: 4 }}>
          {lastUpdated && (
            <span style={{ fontSize: 11.5, color: '#3d4f70', fontWeight: 500 }}>
              Updated {timeAgo(lastUpdated)}
            </span>
          )}
          <button
            onClick={() => fetchAll(true)}
            disabled={refreshing || loading}
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}
            >
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Summary Bar ── */}
      <SummaryBar inventory={displayInventory} loading={loading} />

      {/* ── Controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <HospitalDropdown
          hospitals={hospitals}
          selected={selected}
          onSelect={setSelected}
        />
        <div style={{ fontSize: 12.5, color: '#3d4f70', fontWeight: 500 }}>
          {selected === 'all'
            ? `${hospitals.length} hospital${hospitals.length !== 1 ? 's' : ''} · ${BLOOD_GROUPS.length} blood types`
            : `Showing: ${selected}`
          }
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* Left: Blood group rows */}
        <div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {BLOOD_GROUPS.map(bg => (
                <div key={bg} style={{
                  height: 82, borderRadius: 14, border: '1px solid var(--border)',
                  background: 'linear-gradient(90deg, var(--bg3) 25%, var(--bg4) 50%, var(--bg3) 75%)',
                  backgroundSize: '600px 100%',
                  animation: 'shimmer 1.4s infinite',
                }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {BLOOD_GROUPS.map((bg, i) => (
                <BloodRow
                  key={bg}
                  bg={bg}
                  data={displayInventory[bg]}
                  max={displayMax}
                  index={i}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Low stock chart */}
        <div style={{ position: 'sticky', top: 24 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Low Stock</span>
              <span style={{
                fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: 'var(--amber-bg)', color: 'var(--amber)',
                border: '1px solid rgba(217,119,6,0.2)',
              }}>
                &lt; 50 units
              </span>
            </div>
            <div className="card-body">
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{
                      height: 36, borderRadius: 8,
                      background: 'linear-gradient(90deg, var(--bg3) 25%, var(--bg4) 50%, var(--bg3) 75%)',
                      backgroundSize: '400px 100%',
                      animation: 'shimmer 1.4s infinite',
                    }} />
                  ))}
                </div>
              ) : (
                <LowStockChart inventory={displayInventory} />
              )}
            </div>
          </div>

          {/* Distribution mini summary */}
          {!loading && (
            <div className="card" style={{ marginTop: 14 }}>
              <div className="card-header">
                <span className="card-title">Distribution</span>
              </div>
              <div className="card-body" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {BLOOD_GROUPS.map(bg => {
                    const units = displayInventory[bg]?.total || 0
                    const meta  = BG_META[bg]
                    return (
                      <div key={bg} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        padding: '8px 10px', borderRadius: 12,
                        border: 'var(--border)',
                        background: 'var(--bg3)',
                        minWidth: 56, flex: 1,
                        cursor: 'default',
                        transition: 'all 0.15s',
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: meta.gradient,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9.5, fontWeight: 900, color: '#fff', marginBottom: 4,
                          boxShadow: `0 2px 8px ${meta.glow}`,
                        }}>
                          {bg}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1, color: 'var(--text)' }}>
                          {units}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}