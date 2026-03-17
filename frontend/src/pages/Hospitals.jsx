import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import KPICard from '../components/ui/KPICard'

const LEVEL_MAP = {
  level1: { cls: 'badge-red',   label: 'L1' },
  level2: { cls: 'badge-amber', label: 'L2' },
  level3: { cls: 'badge-blue',  label: 'L3' },
}
const ORG_ABBR = { kidney:'K', heart:'H', liver:'Li', lung:'Lu', pancreas:'P', cornea:'C', bone:'B', small_intestine:'SI' }
const ORG_CLS  = { kidney:'organ-kidney', heart:'organ-heart', liver:'organ-liver', lung:'organ-lung', pancreas:'organ-pancreas', cornea:'organ-cornea' }

function Spinner() {
  return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
}

export default function Hospitals() {
  const { request } = useApi()
  const [hospitals,    setHospitals]    = useState([])
  const [capabilities, setCapabilities] = useState({})
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [search,       setSearch]       = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await request('GET', '/api/hospitals')
        const list = data?.data || []
        setHospitals(list)

        const capResults = await Promise.allSettled(
          list.map(h => request('GET', `/api/hospitals/${h.hospital_id}/capabilities`))
        )
        const capMap = {}
        capResults.forEach((res, i) => {
          if (res.status === 'fulfilled') {
            const caps = res.value?.data?.capabilities || []
            capMap[list[i].hospital_id] = caps.filter(c => c.can_transplant).map(c => c.organ_type)
          } else {
            capMap[list[i].hospital_id] = []
          }
        })
        setCapabilities(capMap)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = hospitals.filter(h =>
    !search ||
    h.name?.toLowerCase().includes(search.toLowerCase()) ||
    h.city?.toLowerCase().includes(search.toLowerCase()) ||
    h.code?.toLowerCase().includes(search.toLowerCase())
  )

  const totalICU     = hospitals.reduce((s, h) => s + (h.icu_beds_total     || 0), 0)
  const availableICU = hospitals.reduce((s, h) => s + (h.icu_beds_available || 0), 0)
  const states       = new Set(hospitals.map(h => h.state).filter(Boolean)).size

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        <KPICard label="Active Hospitals" value={hospitals.length || '—'} sub={`Level 1: ${hospitals.filter(h=>h.level==='level1').length} · L2: ${hospitals.filter(h=>h.level==='level2').length} · L3: ${hospitals.filter(h=>h.level==='level3').length}`} color="blue" />
        <KPICard label="Total ICU Beds"   value={totalICU || '—'} trend={`↑ ${availableICU}`} sub="available now" color="green" />
        <KPICard label="Network States"   value={states || '—'} sub="Pan-India coverage" color="amber" />
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Hospital Network</span>
          <input
            className="form-control"
            placeholder="Search hospitals…"
            style={{ width: 220, fontSize: 12 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {error && (
          <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'var(--red)', margin:'0 18px 14px' }}>
            {error}
          </div>
        )}

        {loading ? <Spinner /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Hospital</th><th>Code</th><th>Level</th><th>City / State</th>
                  <th>ICU Available</th><th>Capabilities</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(h => {
                  const lvl      = LEVEL_MAP[h.level] || { cls:'badge-gray', label: h.level || '—' }
                  const icuColor = (h.icu_beds_available||0) < 5 ? 'var(--red)' : (h.icu_beds_available||0) < 10 ? 'var(--amber)' : 'var(--accent)'
                  const caps     = capabilities[h.hospital_id] || []
                  return (
                    <tr key={h.hospital_id}>
                      <td style={{ fontWeight:500 }}>{h.name}</td>
                      <td style={{ fontFamily:'var(--mono)', color:'var(--text2)', fontSize:11 }}>{h.code || '—'}</td>
                      <td><span className={`badge ${lvl.cls}`}>{lvl.label}</span></td>
                      <td>{h.city}{h.state ? `, ${h.state}` : ''}</td>
                      <td>
                        {h.icu_beds_total != null
                          ? <><span style={{ color:icuColor, fontWeight:600 }}>{h.icu_beds_available ?? '—'}</span><span className="text-muted">/{h.icu_beds_total}</span></>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        <div className="flex gap-4" style={{ flexWrap:'wrap' }}>
                          {caps.length > 0
                            ? caps.map(c => (
                              <span key={c} className={`organ-pill ${ORG_CLS[c]||'badge-gray'}`} style={{ fontSize:10, padding:'2px 6px' }}>
                                {ORG_ABBR[c]||c}
                              </span>
                            ))
                            : <span className="text-muted" style={{ fontSize:11 }}>—</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`status-chip badge-dot ${h.is_active ? 'status-active' : 'status-inactive'}`}>
                          {h.is_active ? 'Online' : 'Offline'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {!filtered.length && !loading && (
                  <tr><td colSpan={7} style={{ textAlign:'center', color:'var(--text3)', padding:40 }}>No hospitals found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}