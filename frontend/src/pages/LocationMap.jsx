import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'

function Spinner() {
  return <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
}

// Simple lat/lng → relative % position within India bounding box
// India approx: lat 8–37, lng 68–97
function toMapPos(lat, lng) {
  const left = ((lng - 68) / (97 - 68)) * 80 + 10  // 10–90%
  const top  = ((37 - lat) / (37 - 8))  * 80 + 10  // 10–90%
  return { left: `${left.toFixed(1)}%`, top: `${top.toFixed(1)}%` }
}

export default function LocationMap() {
  const { request } = useApi()

  const [hospitals,    setHospitals]    = useState([])
  const [selected,     setSelected]     = useState(null)
  const [donorHospId,  setDonorHospId]  = useState(null)
  const [radius,       setRadius]       = useState(1500)
  const [organFilter,  setOrgan]        = useState('kidney')
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [hospData, activeData] = await Promise.all([
          request('GET', '/api/hospitals/network'),
          request('GET', '/api/donors/organs?status=available&limit=1'),
        ])
        const hosps = hospData?.hospitals || []
        setHospitals(hosps)
        // Mark first hospital with an active donor as the donor hospital
        const activeDonorHospId = activeData?.organs?.[0]?.donor?.hospital_id || hosps[0]?.hospital_id || null
        setDonorHospId(activeDonorHospId)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Calculate distance between two lat/lng points (Haversine)
  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  const donorHosp = hospitals.find(h => h.hospital_id === donorHospId)

  const nearby = donorHosp
    ? hospitals
        .filter(h => h.hospital_id !== donorHospId)
        .map(h => ({
          ...h,
          dist: Math.round(haversine(donorHosp.latitude, donorHosp.longitude, h.latitude, h.longitude)),
        }))
        .filter(h => h.dist <= radius)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 5)
    : []

  return (
    <div className="grid-2-1">
      <div>
        <div className="card mb-16">
          <div className="card-header">
            <span className="card-title">Hospital Network Map — India</span>
            <div className="flex gap-8 items-center" style={{ fontSize: 11 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
              <span className="text-muted">Donor Hospital</span>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', display: 'inline-block', marginLeft: 8 }} />
              <span className="text-muted">Recipient Hospital</span>
            </div>
          </div>

          <div className="map-area" style={{ height: 420 }}>
            <div className="map-grid" />

            {error && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', fontSize: 12 }}>{error}</div>}
            {loading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>Loading hospitals…</div>}

            {!loading && hospitals.map(h => {
              if (!h.latitude || !h.longitude) return null
              const pos     = toMapPos(h.latitude, h.longitude)
              const isDonor = h.hospital_id === donorHospId
              const color   = isDonor ? 'var(--accent)' : 'var(--blue)'
              return (
                <div key={h.hospital_id} className="map-node" style={pos} onClick={() => setSelected(h)}>
                  {isDonor && <div className="map-pulse" style={{ background: 'rgba(34,197,94,0.4)' }} />}
                  <div className="map-dot" style={{ background: color, borderColor: color + '80' }} />
                  <div className="map-label" style={{ color: isDonor ? 'var(--accent)' : 'var(--text)' }}>
                    {h.name}{isDonor ? ' ★' : ''}
                  </div>
                </div>
              )
            })}

            <div style={{ position: 'absolute', bottom: 12, left: 12, fontSize: 10, color: 'var(--text3)' }}>
              {hospitals.length} hospitals · Transport radius: {radius.toLocaleString()} km
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-12">
        <div className="card">
          <div className="card-header"><span className="card-title">Filter Radius</span></div>
          <div style={{ padding: 14 }}>
            <div className="form-group">
              <label className="form-label">Max Distance: {radius.toLocaleString()} km</label>
              <input type="range" min="100" max="5000" step="100" value={radius} onChange={e => setRadius(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Organ Type</label>
              <div className="flex gap-6" style={{ flexWrap: 'wrap' }}>
                {['kidney','heart','liver','lung'].map(o => (
                  <button key={o} onClick={() => setOrgan(o)}
                    className={`organ-pill organ-${o}`}
                    style={{ cursor: 'pointer', border: organFilter === o ? '2px solid currentColor' : '1px solid transparent' }}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Nearby Hospitals ({nearby.length})</span></div>
          <div>
            {loading ? <Spinner /> : nearby.map((h, i) => {
              const distColor  = h.dist < 600 ? 'badge-green' : h.dist < 1500 ? 'badge-amber' : 'badge-red'
              const icuColor   = h.capacity?.icu_beds_available < 5 ? 'var(--red)' : h.capacity?.icu_beds_available < 10 ? 'var(--amber)' : 'var(--accent)'
              const caps       = h.capabilities?.map(c => c.organ_type.slice(0,1).toUpperCase()).join(', ') || '—'
              return (
                <div key={h.hospital_id} style={{ padding: '10px 14px', borderBottom: i < nearby.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }} onClick={() => setSelected(h)}>
                  <div className="flex items-center justify-between mb-4">
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{h.name}</span>
                    <span className={`badge ${distColor}`}>{h.dist.toLocaleString()} km</span>
                  </div>
                  <div className="text-sm text-muted">
                    ICU: <span style={{ color: icuColor, fontWeight: 600 }}>{h.capacity?.icu_beds_available ?? '?'}</span>/{h.capacity?.icu_beds_total ?? '?'} avail · {caps}
                  </div>
                </div>
              )
            })}
            {!loading && !nearby.length && donorHosp && (
              <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>
                No hospitals within {radius.toLocaleString()} km
              </div>
            )}
          </div>
        </div>

        {selected && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">{selected.name}</span>
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setSelected(null)}>✕</button>
            </div>
            <div style={{ padding: 12, fontSize: 12 }}>
              <div className="flex justify-between mb-6"><span className="text-muted">City</span><span>{selected.city}, {selected.state}</span></div>
              <div className="flex justify-between mb-6"><span className="text-muted">Level</span><span>{selected.level}</span></div>
              <div className="flex justify-between mb-6"><span className="text-muted">ICU</span>
                <span style={{ color: selected.capacity?.icu_beds_available < 5 ? 'var(--red)' : 'var(--accent)', fontWeight: 600 }}>
                  {selected.capacity?.icu_beds_available ?? '?'}/{selected.capacity?.icu_beds_total ?? '?'}
                </span>
              </div>
              <div className="flex justify-between mb-6"><span className="text-muted">Phone</span><span>{selected.phone}</span></div>
              <div className="flex justify-between"><span className="text-muted">Email</span><span style={{ fontSize: 11 }}>{selected.email}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
