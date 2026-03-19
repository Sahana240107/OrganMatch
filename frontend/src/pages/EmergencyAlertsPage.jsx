import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'

const ORGAN_VIABILITY = {
  heart: 4, lung: 6, liver: 12, pancreas: 12,
  kidney: 24, small_intestine: 8, cornea: 336, bone: 168,
}
const ORGAN_ICONS = {
  kidney:'🫘', heart:'❤️', liver:'🫀', lung:'🫁',
  pancreas:'🧬', cornea:'👁️', bone:'🦴', small_intestine:'🔬',
}

function fmt(secs) {
  if (secs <= 0) return '00:00:00'
  return [Math.floor(secs/3600), Math.floor((secs%3600)/60), secs%60]
    .map(n => String(n).padStart(2,'0')).join(':')
}

function CountdownTimer({ registrationDate, organType }) {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    const hrs = ORGAN_VIABILITY[organType] || 24
    const deadline = new Date(registrationDate).getTime() + hrs * 3600 * 1000
    const calc = () => setSecs(Math.max(0, Math.floor((deadline - Date.now()) / 1000)))
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [registrationDate, organType])
  return (
    <span style={{
      fontFamily: 'var(--mono, monospace)',
      fontSize: 13, fontWeight: 700, color: '#1e293b', letterSpacing: 1,
    }}>
      {fmt(secs)}
    </span>
  )
}

// ── Map ──────────────────────────────────────────────────────────────────────
function CriticalMap({ alerts, hospitalMap, selectedId, onSelectPatient }) {
  const mapRef      = useRef(null)
  const mapInstance = useRef(null)
  const markersRef  = useRef({})

  useEffect(() => {
    if (!mapRef.current || alerts.length === 0) return
    if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null }
    markersRef.current = {}

    function initMap() {
      if (mapInstance.current || !mapRef.current) return
      const L = window.L
      mapInstance.current = L.map(mapRef.current, { zoomControl: true }).setView([20.5937, 78.9629], 5)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 18,
      }).addTo(mapInstance.current)

      const byHospital = {}
      alerts.forEach(r => {
        const hid = r.hospital_id
        const h   = hospitalMap[hid]
        if (!h?.latitude || !h?.longitude) return
        if (!byHospital[hid]) byHospital[hid] = { h, patients: [] }
        byHospital[hid].patients.push(r)
      })

      Object.entries(byHospital).forEach(([hid, { h, patients }]) => {
        const lat = parseFloat(h.latitude)
        const lon = parseFloat(h.longitude)
        if (isNaN(lat) || isNaN(lon)) return

        L.circle([lat, lon], {
          radius: 100000, color: '#dc2626', fillColor: '#dc2626',
          fillOpacity: 0.07, weight: 1.5, dashArray: '5 4',
        }).addTo(mapInstance.current)

        const icon = L.divIcon({
          className: '',
          html: `<div style="background:#dc2626;color:#fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;border:3px solid #fff;box-shadow:0 2px 8px rgba(220,38,38,0.5);cursor:pointer;">${patients.length}</div>`,
          iconSize: [34, 34], iconAnchor: [17, 17],
        })

        const organList = [...new Set(patients.map(p => p.organ_needed))].join(', ')
        const patientRows = patients.map(p =>
          `<div style="padding:5px 0;border-top:1px solid #f1f5f9;cursor:pointer;font-size:11px" onclick="window.__selectPatient(${p.recipient_id})">
            ${ORGAN_ICONS[p.organ_needed]||'🫀'} R-${p.recipient_id} · ${p.organ_needed} · ${p.blood_group||'—'}
          </div>`
        ).join('')

        const marker = L.marker([lat, lon], { icon })
          .addTo(mapInstance.current)
          .bindPopup(`
            <div style="min-width:200px;font-family:sans-serif;padding:4px">
              <div style="font-weight:700;font-size:13px;margin-bottom:6px">🏥 ${h.name}</div>
              <div style="color:#dc2626;font-weight:600;font-size:12px;margin-bottom:8px">🚨 ${patients.length} Critical Patient${patients.length>1?'s':''}</div>
              <div style="font-size:11px;color:#666;margin-bottom:6px">Needs: ${organList}</div>
              <div style="font-size:11px;font-weight:600;color:#374151;margin-bottom:4px">Click to select:</div>
              ${patientRows}
            </div>
          `)

        patients.forEach(p => { markersRef.current[p.recipient_id] = marker })
        marker.on('click', () => { if (patients.length === 1) onSelectPatient(patients[0].recipient_id) })
      })

      window.__selectPatient = (rid) => { onSelectPatient(rid); mapInstance.current?.closePopup() }
    }

    if (window.L) { initMap() }
    else {
      const link = document.createElement('link')
      link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = initMap; document.head.appendChild(script)
    }

    return () => { delete window.__selectPatient; if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null } }
  }, [alerts, hospitalMap])

  useEffect(() => {
    if (!selectedId || !mapInstance.current) return
    const marker = markersRef.current[selectedId]
    if (marker) { mapInstance.current.setView(marker.getLatLng(), 6, { animate: true }); marker.openPopup() }
  }, [selectedId])

  return <div ref={mapRef} style={{ height: '100%', width: '100%', borderRadius: '0 0 12px 12px' }} />
}

// ── Hospital accordion group ─────────────────────────────────────────────────
function HospitalGroup({ hospitalName, patients, selectedId, onSelect, groupIndex }) {
  const [open, setOpen] = useState(false)   // closed by default
  const hasSelected = patients.some(p => p.recipient_id === selectedId)

  return (
    <div style={{
      border: `1.5px solid ${hasSelected ? '#0d6efd' : 'var(--border, #e2e8f0)'}`,
      borderRadius: 12, overflow: 'hidden', background: '#fff',
      boxShadow: hasSelected ? '0 0 0 3px rgba(13,110,253,0.08)' : '0 1px 3px rgba(0,0,0,0.05)',
      transition: 'all 0.18s',
      animation: 'fadeSlideIn 0.3s ease both',
      animationDelay: `${groupIndex * 0.07}s`,
    }}>
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', cursor: 'pointer',
          background: hasSelected ? 'rgba(13,110,253,0.04)' : 'var(--bg2, #f8fafc)',
          borderBottom: open ? '1px solid var(--border, #e2e8f0)' : 'none',
          transition: 'background 0.15s',
        }}
      >
        <span style={{ fontSize: 15 }}>🏥</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text, #1e293b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {hospitalName}
          </div>
        </div>

        {/* Patient count badge */}
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
          background: 'rgba(220,38,38,0.08)', color: '#dc2626',
          border: '1px solid rgba(220,38,38,0.18)', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {patients.length} critical
        </span>

        {hasSelected && (
          <span style={{ fontSize: 10, color: '#0d6efd', fontWeight: 700, whiteSpace: 'nowrap' }}>✓</span>
        )}

        <span style={{ fontSize: 11, color: 'var(--text3, #94a3b8)', marginLeft: 2 }}>
          {open ? '▲' : '▼'}
        </span>
      </div>

      {/* Patient rows */}
      {open && patients.map((r, i) => {
        const isSelected = selectedId === r.recipient_id
        const organName  = r.organ_needed ? r.organ_needed.charAt(0).toUpperCase() + r.organ_needed.slice(1) : 'Organ'
        return (
          <div
            key={r.recipient_id}
            onClick={() => onSelect(r.recipient_id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 16px',
              borderBottom: i < patients.length - 1 ? '1px solid var(--border, #f1f5f9)' : 'none',
              background: isSelected ? 'rgba(13,110,253,0.04)' : '#fff',
              cursor: 'pointer', transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg3, #f8fafc)' }}
            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '#fff' }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: isSelected ? 'rgba(13,110,253,0.1)' : 'rgba(100,116,139,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
            }}>
              {ORGAN_ICONS[r.organ_needed] || '🫀'}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #1e293b)' }}>
                  {organName} · R-{r.recipient_id}
                </span>
                {isSelected && <span style={{ fontSize: 10, color: '#0d6efd', fontWeight: 700 }}>✓ selected</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3, #94a3b8)', marginTop: 2, display: 'flex', gap: 8 }}>
                {r.blood_group && <span>🩸 {r.blood_group}</span>}
                {r.pra_percent != null && <span>PRA {r.pra_percent}%</span>}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <CountdownTimer registrationDate={r.registration_date} organType={r.organ_needed} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function EmergencyAlertsPage() {
  const { request }   = useApi()
  const navigate      = useNavigate()
  const [alerts,      setAlerts]      = useState([])
  const [hospitalMap, setHospitalMap] = useState({})
  const [loading,     setLoading]     = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [selectedId,  setSelectedId]  = useState(null)
  const [finding,     setFinding]     = useState(false)

  const fetchAlerts = useCallback(async () => {
    try {
      const [data1a, hData] = await Promise.all([
        request('GET', '/api/recipients/waiting-list?medical_urgency=status_1a&limit=20'),
        request('GET', '/api/hospitals'),
      ])
      const recipients = data1a?.recipients || []
      setAlerts(recipients)
      const hospitals = hData?.data || hData?.hospitals || []
      const hMap = {}
      hospitals.forEach(h => { hMap[h.hospital_id] = h })
      setHospitalMap(hMap)
      setLastUpdated(new Date())
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [request])

  useEffect(() => {
    fetchAlerts()
    const refresh = setInterval(fetchAlerts, 15000)
    return () => { clearInterval(refresh) }
  }, [fetchAlerts])

  // Group + sort by patient count descending
  const groups = useMemo(() => {
    const g = {}
    alerts.forEach(r => {
      const key = r.hospital_id
      if (!g[key]) g[key] = { name: r.hospital_name || `Hospital #${r.hospital_id}`, patients: [] }
      g[key].patients.push(r)
    })
    return Object.entries(g)
      .sort(([,a],[,b]) => b.patients.length - a.patients.length)
  }, [alerts])

  const selectedPatient = alerts.find(a => a.recipient_id === selectedId)

  async function handleFindMatch() {
    if (!selectedPatient) return
    setFinding(true)
    try { await request('POST', `/api/matches/for-recipient/${selectedPatient.recipient_id}/run`) }
    catch { /* results page handles */ }
    finally { setFinding(false) }
    navigate(`/matching/results?recipient_id=${selectedPatient.recipient_id}&organ=${selectedPatient.organ_needed || 'kidney'}&from=emergency`)
  }

  function secondsAgo(date) {
    if (!date) return ''
    const s = Math.floor((Date.now() - date) / 1000)
    if (s < 60) return `${s}s ago`
    return `${Math.floor(s / 60)}m ago`
  }

  return (
    <div>
      <style>{`
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes alertPulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }
      `}</style>

      {/* Header */}
      <div className="page-header mb-24">
        <div>
          <h1 className="page-title">Emergency <span>Alerts</span></h1>
          <p className="page-subtitle">
            Status 1A critical patients — select a patient then click Find Match
            {lastUpdated && ` · Updated ${secondsAgo(lastUpdated)}`}
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchAlerts}>↻ Refresh</button>
      </div>

      {/* Alert bar */}
      {!loading && alerts.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 18px', borderRadius: 10, marginBottom: 22,
          background: 'rgba(71,85,105,0.05)', border: '1px solid rgba(71,85,105,0.15)',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#64748b', flexShrink: 0, animation: 'alertPulse 1.5s ease-in-out infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
            {alerts.length} patient{alerts.length !== 1 ? 's' : ''} across {groups.length} hospital{groups.length !== 1 ? 's' : ''} — immediate match required
          </span>
          {selectedPatient && (
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
              ✓ R-{selectedPatient.recipient_id} selected
            </span>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card" style={{ padding: '60px 0', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>Loading critical alerts...</div>
        </div>
      )}

      {/* Empty */}
      {!loading && alerts.length === 0 && (
        <div className="card" style={{ padding: '80px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>All Clear</div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>No Status 1A critical patients right now</div>
        </div>
      )}

      {!loading && alerts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

          {/* Left — hospital groups sorted by count, all collapsed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {groups.map(([hid, group], gi) => (
              <HospitalGroup
                key={hid}
                groupIndex={gi}
                hospitalName={group.name}
                patients={group.patients}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            ))}
          </div>

          {/* Right — map + selected info + button */}
          <div style={{ position: 'sticky', top: 24 }}>

            {/* Selected patient reminder */}
            {selectedPatient && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10, marginBottom: 12,
                background: 'rgba(13,110,253,0.05)', border: '1px solid rgba(13,110,253,0.18)',
                animation: 'fadeSlideIn 0.2s ease',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(13,110,253,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                }}>
                  {ORGAN_ICONS[selectedPatient.organ_needed] || '🫀'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0d6efd' }}>
                    R-{selectedPatient.recipient_id} · {selectedPatient.organ_needed?.charAt(0).toUpperCase() + selectedPatient.organ_needed?.slice(1)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                    {selectedPatient.blood_group && `🩸 ${selectedPatient.blood_group} · `}{selectedPatient.hospital_name}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  style={{ fontSize: 14, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
                >✕</button>
              </div>
            )}

            {/* Map */}
            <div className="card" style={{ overflow: 'hidden', marginBottom: 14 }}>
              <div className="card-header">
                <span className="card-title">Hospital Locations</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: 'rgba(100,116,139,0.08)', color: '#64748b',
                  border: '1px solid rgba(100,116,139,0.18)',
                }}>
                  {groups.length} hospitals · {alerts.length} patients
                </span>
              </div>
              <div style={{ height: 360, position: 'relative' }}>
                <CriticalMap
                  alerts={alerts}
                  hospitalMap={hospitalMap}
                  selectedId={selectedId}
                  onSelectPatient={setSelectedId}
                />
              </div>
              {!selectedId && (
                <div style={{
                  padding: '9px 16px', background: 'rgba(217,119,6,0.04)',
                  borderTop: '1px solid rgba(217,119,6,0.12)',
                  fontSize: 11, color: '#d97706', fontWeight: 500, textAlign: 'center',
                }}>
                  👆 Click a hospital group on the left or a map marker to select a patient
                </div>
              )}
            </div>

            {/* Find Match button */}
            <button
              onClick={handleFindMatch}
              disabled={!selectedPatient || finding}
              style={{
                width: '100%', padding: '13px 0',
                fontSize: 14, fontWeight: 700,
                borderRadius: 10, border: 'none',
                cursor: selectedPatient ? 'pointer' : 'not-allowed',
                background: selectedPatient ? '#0d6efd' : '#e2e8f0',
                color: selectedPatient ? '#fff' : '#94a3b8',
                transition: 'background 0.2s',
                letterSpacing: '0.3px',
              }}
              onMouseEnter={e => { if (selectedPatient) e.currentTarget.style.background = '#0a58ca' }}
              onMouseLeave={e => { if (selectedPatient) e.currentTarget.style.background = '#0d6efd' }}
            >
              {finding ? '⏳ Finding matches...'
                : selectedPatient ? `🔍 Find Match for R-${selectedPatient.recipient_id}`
                : '🔍 Find Match — select a patient first'}
            </button>

            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', marginTop: 7 }}>
              {selectedPatient
                ? `Matching ${selectedPatient.organ_needed} · ${selectedPatient.blood_group || '—'} · ${selectedPatient.hospital_name}`
                : 'Expand a hospital group and select a patient'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}