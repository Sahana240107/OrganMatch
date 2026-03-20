import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApi } from '../hooks/useApi'

const URGENCY_STYLE = {
  status_1a: { bg:'rgba(239,68,68,0.15)',  color:'#ef4444', text:'Status 1A' },
  status_1b: { bg:'rgba(245,158,11,0.15)', color:'#f59e0b', text:'Status 1B' },
  status_2:  { bg:'rgba(59,130,246,0.15)', color:'#3b82f6', text:'Status 2'  },
  status_3:  { bg:'rgba(156,163,175,0.15)',color:'#9ca3af', text:'Status 3'  },
}
const SCORE_KEYS   = ['score_hla','score_abo','score_urgency','score_wait_time','score_distance','score_pra','score_age']
const SCORE_LABELS = { score_hla:'HLA', score_abo:'ABO', score_urgency:'Urgency', score_wait_time:'Wait', score_distance:'Dist', score_pra:'PRA', score_age:'Age' }
const SCORE_COLORS = { score_hla:'#3b82f6', score_abo:'#ef4444', score_urgency:'#f59e0b', score_wait_time:'#8b5cf6', score_distance:'#22c55e', score_pra:'#ec4899', score_age:'#06b6d4' }
const ORGAN_ICONS  = { kidney:'🫘', heart:'❤️', liver:'🫀', lung:'🫁', pancreas:'🧬', cornea:'👁️', bone:'🦴', small_intestine:'🔬' }

// ── Score Circle ──────────────────────────────────────────────────────────────
function ScoreCircle({ score, size = 64 }) {
  const r      = (size - 6) / 2
  const circ   = 2 * Math.PI * r
  const pct    = Math.min(100, Math.max(0, score))
  const offset = circ * (1 - pct / 100)
  const color  = score >= 85 ? '#22c55e' : score >= 70 ? '#3b82f6' : score >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg3)" strokeWidth="5"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition:'stroke-dashoffset 0.8s ease' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:13, fontWeight:800, color }}>{Math.round(score)}</span>
      </div>
    </div>
  )
}

// ── Leaflet Map: recipient = red dot (fixed), donors = blue dots ──────────────
const HOSPITAL_COORDS = {
  'aiims new delhi':[28.5672,77.2100],'aiims':[28.5672,77.2100],
  'apollo hospital chennai':[13.0569,80.2425],'apollo chennai':[13.0569,80.2425],
  'apollo mumbai':[19.1037,72.8897],'apollo hyderabad':[17.4435,78.3772],
  'apollo kolkata':[22.5726,88.3639],
  'cmc vellore':[12.9246,79.1348],'christian medical college':[12.9246,79.1348],
  'fortis hospital mumbai':[19.0728,72.8826],'fortis mumbai':[19.0728,72.8826],
  'fortis bangalore':[12.9716,77.5946],'fortis noida':[28.5355,77.3910],
  'pgimer chandigarh':[30.7650,76.7787],'pgimer':[30.7650,76.7787],
  'medanta gurugram':[28.4467,77.0436],'medanta gurgaon':[28.4467,77.0436],'medanta':[28.4467,77.0436],
  'manipal bangalore':[12.9358,77.6010],
  'ruby hall pune':[18.5204,73.8567],
  'sanjay gandhi lucknow':[26.8467,80.9462],
  'kokilaben mumbai':[19.1297,72.8339],
  'vellore':[12.9246,79.1348],
  'chennai':[13.0827,80.2707],'mumbai':[19.0760,72.8777],
  'delhi':[28.6139,77.2090],'new delhi':[28.6139,77.2090],
  'bangalore':[12.9716,77.5946],'bengaluru':[12.9716,77.5946],
  'chandigarh':[30.7333,76.7794],'gurugram':[28.4595,77.0266],'gurgaon':[28.4595,77.0266],
  'hyderabad':[17.3850,78.4867],'kolkata':[22.5726,88.3639],
  'pune':[18.5204,73.8567],'lucknow':[26.8467,80.9462],
  'noida':[28.5355,77.3910],'ahmedabad':[23.0225,72.5714],
}

function resolveCoord(text) {
  if (!text) return null
  const k = text.toLowerCase().trim()
  if (HOSPITAL_COORDS[k]) return HOSPITAL_COORDS[k]
  for (const [key, val] of Object.entries(HOSPITAL_COORDS)) {
    if (k.includes(key)) return val
  }
  for (const word of k.split(/[\s,]+/)) {
    if (word.length > 3 && HOSPITAL_COORDS[word]) return HOSPITAL_COORDS[word]
  }
  return null
}

function LeafletMap({ donors, recipientHospital, recipientCity }) {
  const mapRef      = useRef(null)
  const instanceRef = useRef(null)
  const layersRef   = useRef([])

  const recipCoord = resolveCoord(recipientHospital) || resolveCoord(recipientCity)

  function renderMarkers(L) {
    if (!instanceRef.current) return
    layersRef.current.forEach(l => { try { instanceRef.current.removeLayer(l) } catch {} })
    layersRef.current = []

    const bounds = []

    // Recipient red dot (fixed center)
    if (recipCoord) {
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:22px;height:22px;background:#ef4444;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
        iconSize:[22,22], iconAnchor:[11,11],
      })
      const m = L.marker(recipCoord, { icon }).addTo(instanceRef.current)
        .bindTooltip(`<strong>Recipient</strong><br/>${recipientHospital || recipientCity}`, { direction:'top' })
      layersRef.current.push(m)
      bounds.push(recipCoord)
    }

    // Donor blue dots + lines
    const seen = new Set()
    donors.slice(0, 10).forEach((d, i) => {
      // Use lat/lon from API if available, otherwise resolve by name
      let coord = null
      if (d.donor_lat && d.donor_lon) {
        coord = [parseFloat(d.donor_lat), parseFloat(d.donor_lon)]
      } else {
        coord = resolveCoord(d.donor_hospital) || resolveCoord(d.donor_city)
      }
      if (!coord) return
      const key = `${coord[0]},${coord[1]}`
      if (seen.has(key)) return
      seen.add(key)

      const rank  = i + 1
      const isTop = rank === 1
      const size  = isTop ? 22 : 16
      const color = isTop ? '#3b82f6' : '#60a5fa'
      const distKm = d.distance_km ? Math.round(d.distance_km) : null

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:white;font-size:9px;font-weight:800;">${rank <= 3 ? rank : ''}</div>`,
        iconSize:[size,size], iconAnchor:[size/2,size/2],
      })
      const tooltipHtml = [
        `<strong>#${rank} ${d.donor_name || 'Donor'}</strong>`,
        `${d.donor_hospital || d.donor_city}`,
        distKm ? `📍 ${distKm} km away` : '',
        `Score: ${Number(d.total_score||0).toFixed(1)}`,
        `HLA: ${d.hla_antigen_matches||0}/6 · Blood: ${d.donor_blood}`,
      ].filter(Boolean).join('<br/>')

      const marker = L.marker(coord, { icon }).addTo(instanceRef.current).bindTooltip(tooltipHtml, { direction:'top' })
      layersRef.current.push(marker)
      bounds.push(coord)

      if (recipCoord) {
        const line = L.polyline([recipCoord, coord], {
          color: isTop ? '#3b82f6' : 'rgba(96,165,250,0.5)',
          weight: isTop ? 2.5 : 1.5,
          dashArray: isTop ? null : '6,5',
        }).addTo(instanceRef.current)
        layersRef.current.push(line)

        // Distance label at midpoint
        if (distKm) {
          const mid = [(recipCoord[0]+coord[0])/2, (recipCoord[1]+coord[1])/2]
          const label = L.marker(mid, {
            icon: L.divIcon({
              className: '',
              html: `<div style="background:white;border:1px solid #ddd;border-radius:4px;padding:1px 5px;font-size:10px;font-weight:600;color:#374151;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.15);">${distKm} km</div>`,
              iconAnchor:[20,8],
            }),
            interactive: false,
          }).addTo(instanceRef.current)
          layersRef.current.push(label)
        }
      }
    })

    if (bounds.length > 1) instanceRef.current.fitBounds(bounds, { padding:[40,40] })
    else if (bounds.length === 1) instanceRef.current.setView(bounds[0], 6)
  }

  useEffect(() => {
    if (!document.getElementById('leaflet-css-mr')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css-mr'; link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    function initMap() {
      if (!mapRef.current || instanceRef.current) return
      const L = window.L
      const center = recipCoord || [20.5937, 78.9629]
      instanceRef.current = L.map(mapRef.current, { zoomControl:true, scrollWheelZoom:true })
        .setView(center, 5)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:'© OpenStreetMap contributors', maxZoom:18,
      }).addTo(instanceRef.current)
      renderMarkers(L)
    }

    if (window.L) { initMap() }
    else if (!document.getElementById('leaflet-js-mr')) {
      const s = document.createElement('script')
      s.id = 'leaflet-js-mr'; s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      s.onload = initMap; document.head.appendChild(s)
    } else {
      const t = setInterval(() => { if (window.L) { clearInterval(t); initMap() } }, 100)
    }
  }, []) // eslint-disable-line

  // Re-render markers when donors change (map already initialized)
  useEffect(() => {
    if (!instanceRef.current || !window.L) return
    renderMarkers(window.L)
  }, [donors, recipientHospital, recipientCity]) // eslint-disable-line

  return (
    <div style={{ borderRadius:10, overflow:'hidden', border:'1px solid var(--border)' }}>
      <div ref={mapRef} style={{ width:'100%', height:340 }} />
      <div style={{ padding:'9px 14px', background:'var(--surface)', borderTop:'1px solid var(--border)', display:'flex', gap:16, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <span style={{ width:11,height:11,borderRadius:'50%',background:'#ef4444',display:'inline-block',border:'2px solid white',flexShrink:0 }}/>
          <span style={{ color:'var(--text2)', fontSize:11 }}>Recipient — {recipientHospital || recipientCity || '—'}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <span style={{ width:11,height:11,borderRadius:'50%',background:'#3b82f6',display:'inline-block',border:'2px solid white',flexShrink:0 }}/>
          <span style={{ color:'var(--text2)', fontSize:11 }}>Matched Donors</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="#3b82f6" strokeWidth="2.5"/></svg>
          <span style={{ color:'var(--text2)', fontSize:11 }}>Route · hover for distance</span>
        </div>
      </div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [msg, onClose])
  if (!msg) return null
  const isOk = type === 'success'
  return (
    <div style={{
      position:'fixed', bottom:24, right:24, zIndex:9999,
      background: isOk ? 'var(--green-bg)' : 'var(--red-bg)',
      border:`1px solid ${isOk ? '#86efac' : '#fca5a5'}`,
      borderRadius:12, padding:'14px 18px',
      color: isOk ? 'var(--green)' : 'var(--red)',
      fontSize:13, fontWeight:600, boxShadow:'var(--shadow-lg)', maxWidth:360,
      display:'flex', alignItems:'center', gap:10, animation:'slideUp 0.25s ease',
    }}>
      <span>{isOk ? '✓' : '✗'} {msg}</span>
      <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:'inherit',fontSize:18,lineHeight:1,marginLeft:'auto' }}>×</button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MatchResults() {
  const { request }  = useApi()
  const navigate     = useNavigate()
  const [searchParams] = useSearchParams()

  const recipientId = searchParams.get('recipient_id')
  const organType   = searchParams.get('organ') || 'kidney'

  const [donors,    setDonors]    = useState([])   // each row = one donor/organ
  const [recipient, setRecipient] = useState(null) // the fixed patient
  const [loading,   setLoading]   = useState(true)
  const [running,   setRunning]   = useState(false)
  const [error,     setError]     = useState('')
  const [runMsg,    setRunMsg]    = useState('')
  const [offerSent, setOfferSent] = useState({})
  const [toast,     setToast]     = useState({ msg:'', type:'success' })

  const showToast = (msg, type = 'success') => setToast({ msg, type })

  const loadDonors = useCallback(async () => {
    if (!recipientId) return
    setLoading(true); setError('')
    try {
      const data = await request('GET', `/api/matches/for-recipient/${recipientId}`)
      // offer_status comes from DB now — no need for local offerSent state sync
      const rows = data?.data || []
      // Clear offerSent for any match that now has a real offer_status from DB
      setOfferSent(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(mid => {
          const row = rows.find(r => String(r.match_id) === String(mid))
          if (row?.offer_status) delete next[mid] // DB has authoritative status now
        })
        return next
      })
      setDonors(rows)
      if (data?.recipient) setRecipient(data.recipient)
      else if ((data?.data||[]).length > 0) {
        const r = data.data[0]
        setRecipient({
          full_name: r.recipient_name, blood_group: r.recipient_blood,
          medical_urgency: r.medical_urgency, organ_needed: r.organ_type,
          recipient_hospital: r.recipient_hospital, recipient_city: r.recipient_city,
          recipient_lat: r.recipient_lat, recipient_lon: r.recipient_lon,
        })
      }
    } catch (e) {
      setError(e.message || 'Failed to load donor matches')
      setDonors([])
    } finally {
      setLoading(false)
    }
  }, [recipientId]) // eslint-disable-line

  useEffect(() => {
    if (!recipientId) {
      setLoading(false)
      setError('No recipient selected. Go back and select a patient.')
      return
    }
    loadDonors()
  }, []) // eslint-disable-line

  const handleRerun = async () => {
    if (!recipientId) return
    setRunning(true); setRunMsg(''); setError('')
    try {
      const data = await request('POST', `/api/matches/for-recipient/${recipientId}/run`)
      setRunMsg(data?.message || 'Matching complete')
      await loadDonors()
    } catch (e) {
      setError(e.message || 'Failed to run matching')
    } finally {
      setRunning(false)
    }
  }

  const handleSendOffer = async (match) => {
    if (!match.match_id) { showToast('No match ID', 'error'); return }
    try {
      await request('POST', '/api/offers', { match_id: match.match_id })
      setOfferSent(prev => ({ ...prev, [match.match_id]: true }))
      showToast(`Offer sent to ${match.donor_hospital || 'donor hospital'}!`, 'success')
      setTimeout(loadDonors, 1500)
    } catch (e) {
      showToast(e.message || 'Failed to send offer', 'error')
    }
  }

  const dispOrgan    = recipient?.organ_needed || organType
  const urgStyle     = URGENCY_STYLE[recipient?.medical_urgency] || {}
  const pid          = String(recipientId || '0000').padStart(4, '0')
  const pageTitle    = `Matching Results — ${dispOrgan.charAt(0).toUpperCase()+dispOrgan.slice(1)} P-${pid}`
  const topDonor     = donors[0]

  return (
    <div style={{ animation:'pageIn 0.3s var(--ease)' }}>
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg:'', type:'success' })}/>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, marginBottom:20, flexWrap:'wrap' }}>
        <div>
          <button onClick={() => navigate('/matching')} style={{
            background:'none', border:'1px solid var(--border)', borderRadius:8,
            padding:'5px 12px', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6,
            fontSize:12, color:'var(--text2)', marginBottom:10, transition:'all 0.15s',
          }}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"/>
            </svg>
            Back
          </button>
          <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>{pageTitle}</h1>
          <p style={{ fontSize:13, color:'var(--text3)', marginTop:4 }}>
            {loading ? 'Loading…' : `${donors.length} compatible donor(s) · ABO + HLA + urgency + proximity`}
          </p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
          <button className="btn btn-ghost" onClick={handleRerun} disabled={running} style={{ fontSize:12 }}>
            {running ? <><div className="spinner" style={{width:13,height:13,borderWidth:2}}/> Running…</> : <>↺ Re-run Matching</>}
          </button>
          {topDonor && !offerSent[topDonor.match_id] && (
            <button className="btn btn-primary" onClick={() => handleSendOffer(topDonor)} style={{ fontSize:13 }}>
              📡 Send Offer to #1
            </button>
          )}
        </div>
      </div>

      {/* Recipient info bar (fixed subject) */}
      {recipient && (
        <div className="card mb-16" style={{ padding:'14px 20px', borderLeft:'3px solid var(--accent)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
            <span style={{ fontSize:28 }}>{ORGAN_ICONS[dispOrgan] || '🫀'}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:15 }}>
                {recipient.full_name}
                {recipient.medical_urgency && (
                  <span style={{ marginLeft:10, padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, background:urgStyle.bg, color:urgStyle.color }}>
                    {urgStyle.text}
                  </span>
                )}
              </div>
              <div style={{ fontSize:12, color:'var(--text3)', marginTop:3, display:'flex', gap:12, flexWrap:'wrap' }}>
                <span>Needs: <strong>{dispOrgan}</strong></span>
                {recipient.blood_group && <span>Blood: <strong style={{color:'var(--accent)'}}>{recipient.blood_group}</strong></span>}
                {recipient.recipient_hospital && <span>· {recipient.recipient_hospital}</span>}
                {recipient.pra_percent != null && <span>· PRA {recipient.pra_percent}%</span>}
              </div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontSize:11, color:'var(--text3)' }}>Top match score</div>
              <div style={{ fontSize:26, fontWeight:800, color:'#22c55e' }}>
                {topDonor ? Number(topDonor.total_score||0).toFixed(1) : '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-16" style={{ background:'var(--red-bg)', border:'1px solid #fca5a5', borderRadius:12, padding:'12px 16px', color:'var(--red)', fontSize:13 }}>
          {error}
        </div>
      )}
      {runMsg && (
        <div className="mb-16" style={{ background:'var(--green-bg)', border:'1px solid #86efac', borderRadius:12, padding:'12px 16px', color:'var(--green)', fontSize:13 }}>
          ✓ {runMsg}
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:20, alignItems:'start' }}>

        {/* Donor cards */}
        <div>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:14 }}>
            Ranked Donors
            {!loading && <span style={{ color:'var(--text3)', fontWeight:400, fontSize:12 }}> — {donors.length} compatible</span>}
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:'60px 0' }}>
              <div className="spinner" style={{ margin:'0 auto 12px' }}/>
              <div style={{ color:'var(--text3)', fontSize:13 }}>Finding compatible donors…</div>
            </div>
          ) : donors.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803M10.5 7.5v6m3-3h-6"/>
                </svg>
              </div>
              <div className="empty-title">No compatible donors found</div>
              <div className="empty-sub">Run the matching engine to find available organs for this patient.</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop:16 }} onClick={handleRerun} disabled={running}>
                {running ? 'Running…' : 'Run Matching Engine'}
              </button>
            </div>
          ) : (
            donors.map((d, idx) => {
              const rank    = idx + 1
              const score   = Number(d.total_score || 0)
              const isTop   = rank === 1
              const isSent  = offerSent[d.match_id] && !d.offer_status
              const hlaCount = d.hla_antigen_matches || 0
              const hoursLeft = d.hours_remaining != null ? Number(d.hours_remaining) : null

              return (
                <div key={d.match_id || idx} style={{
                  background:'var(--surface)', borderRadius:14, marginBottom:12, overflow:'hidden',
                  border: isTop ? '1.5px solid rgba(34,197,94,0.45)' : '1.5px solid var(--border)',
                }}>
                  <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}>

                    {/* Score circle + rank badge */}
                    <div style={{ position:'relative', flexShrink:0 }}>
                      <ScoreCircle score={score} size={64}/>
                      <div style={{
                        position:'absolute', top:-4, right:-4,
                        width:20, height:20, borderRadius:'50%',
                        background: isTop ? '#22c55e' : rank === 2 ? '#3b82f6' : 'var(--bg3)',
                        color: (isTop||rank===2) ? '#fff' : 'var(--text3)',
                        fontSize:10, fontWeight:800,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        border:'2px solid var(--bg2)',
                      }}>{rank}</div>
                    </div>

                    {/* Donor info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:15, marginBottom:3 }}>
                        {ORGAN_ICONS[d.organ_type] || '🫀'} {d.donor_name || 'Anonymous Donor'}
                      </div>
                      <div style={{ fontSize:13, color:'var(--text2)', marginBottom:10 }}>
                        {d.donor_hospital} · {d.organ_type}
                      </div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                        {d.donor_blood && (
                          <span style={{ padding:'2px 9px', borderRadius:20, background:'var(--bg3)', border:'1px solid var(--border)', fontSize:12, fontWeight:600 }}>
                            {d.donor_blood}
                          </span>
                        )}
                        {hoursLeft != null && hoursLeft > 0 && (
                          <span style={{ padding:'2px 9px', borderRadius:20, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', fontSize:12, color:'#16a34a' }}>
                            ⏱ {hoursLeft.toFixed(1)}h viability left
                          </span>
                        )}
                        {d.distance_km > 0 && (
                          <span style={{ padding:'2px 9px', borderRadius:20, background:'var(--bg3)', border:'1px solid var(--border)', fontSize:12 }}>
                            📍 {Math.round(d.distance_km)} km
                          </span>
                        )}
                        {hlaCount > 0 && (
                          <span style={{ padding:'2px 9px', borderRadius:20, background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.3)', fontSize:12, color:'#3b82f6', fontWeight:600 }}>
                            HLA {hlaCount}/6
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Send Offer button — reflects real DB offer status */}
                    {(() => {
                      const offerStatus = d.offer_status || (isSent ? 'offer_sent' : d.status)
                      if (offerStatus === 'accepted') return (
                        <div style={{ padding:'10px 18px', borderRadius:10, background:'rgba(34,197,94,0.12)',
                          border:'1.5px solid rgba(34,197,94,0.4)', color:'#16a34a',
                          fontWeight:700, fontSize:13, flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
                          ✓ Accepted
                        </div>
                      )
                      if (offerStatus === 'declined') return (
                        <div style={{ padding:'10px 18px', borderRadius:10, background:'rgba(239,68,68,0.10)',
                          border:'1.5px solid rgba(239,68,68,0.35)', color:'#ef4444',
                          fontWeight:700, fontSize:13, flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
                          ✗ Declined
                        </div>
                      )
                      if (offerStatus === 'offer_sent' || offerStatus === 'pending_response') return (
                        <div style={{ padding:'10px 18px', borderRadius:10, background:'var(--bg3)',
                          border:'1.5px solid var(--border)', color:'var(--text3)',
                          fontWeight:700, fontSize:13, flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
                          📡 Offer Sent
                        </div>
                      )
                      return (
                        <button
                          onClick={() => handleSendOffer(d)}
                          style={{ padding:'10px 18px', borderRadius:10, border:'none',
                            cursor:'pointer', background:'#3b82f6', color:'#fff',
                            fontWeight:700, fontSize:13, flexShrink:0, transition:'all 0.15s',
                            display:'flex', alignItems:'center', gap:6 }}
                        >
                          <span>📡</span> Send Offer
                        </button>
                      )
                    })()}
                  </div>

                  {/* Score breakdown bars */}
                  {score > 0 && (
                    <div style={{ padding:'10px 20px 14px', borderTop:'1px solid var(--border)', display:'flex', gap:6 }}>
                      {SCORE_KEYS.map(k => {
                        const val = Number(d[k] || 0)
                        return (
                          <div key={k} style={{ flex:1, textAlign:'center' }} title={`${SCORE_LABELS[k]}: ${val.toFixed(1)}`}>
                            <div style={{ fontSize:9, color:'var(--text3)', marginBottom:3, fontWeight:600 }}>{SCORE_LABELS[k]}</div>
                            <div style={{ height:4, background:'var(--bg3)', borderRadius:4, overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${Math.min(100, Math.abs(val)/30*100)}%`, background: val < 0 ? '#ef4444' : SCORE_COLORS[k], borderRadius:4 }}/>
                            </div>
                            <div style={{ fontSize:10, color: val < 0 ? '#ef4444' : SCORE_COLORS[k], fontWeight:700, marginTop:2 }}>
                              {val.toFixed(0)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Map — recipient is red, donors are blue */}
        <div style={{ position:'sticky', top:20 }}>
          <div className="card">
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:14 }}>
              Location Map
            </div>
            <div style={{ padding:14 }}>
              <LeafletMap
                donors={donors}
                recipientHospital={recipient?.recipient_hospital || ''}
                recipientCity={recipient?.recipient_city || ''}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}