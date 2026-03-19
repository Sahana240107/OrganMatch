import { useState, useEffect, useRef } from 'react'
import { useApi } from '../hooks/useApi'

function Spinner(){return<div className="spinner-page"><div className="spinner"/><span>Loading…</span></div>}

const ORGAN_ICONS={kidney:'🫘',heart:'❤️',liver:'🫀',lung:'🫁',pancreas:'🧬',cornea:'👁️',bone:'🦴',small_intestine:'🔬'}
const LEVEL_CLS={level1:'badge-red',level2:'badge-blue',level3:'badge-green'}

// ── Leaflet map picker with search bar ───────────────────────────────────────
function MapPicker({ lat, lng, onChange }) {
  const mapRef      = useRef(null)
  const mapInst     = useRef(null)   // Leaflet map instance
  const markerInst  = useRef(null)   // Leaflet marker instance
  const Lref        = useRef(null)   // Leaflet library ref — avoids window.L timing issues
  const [searchQ,   setSearchQ]   = useState('')
  const [searching, setSearching] = useState(false)
  const [searchErr, setSearchErr] = useState('')
  const [ready,     setReady]     = useState(false) // true once map is initialised

  // ── Place / move marker and fire onChange ─────────────────────────────────
  function placeMarker(la, lo) {
    const L = Lref.current
    if (!L || !mapInst.current) return
    la = parseFloat(la); lo = parseFloat(lo)
    if (markerInst.current) {
      markerInst.current.setLatLng([la, lo])
    } else {
      markerInst.current = L.marker([la, lo], { draggable: true }).addTo(mapInst.current)
      markerInst.current.on('dragend', ev => {
        const p = ev.target.getLatLng()
        onChange(Number(p.lat.toFixed(6)), Number(p.lng.toFixed(6)))
      })
    }
    mapInst.current.setView([la, lo], 15)
    onChange(Number(la.toFixed(6)), Number(lo.toFixed(6)))
  }

  // ── Geocode search using Photon (CORS-safe, no API key) ───────────────────
  async function handleSearch(e) {
    if (e && e.preventDefault) e.preventDefault()
    const q = searchQ.trim()
    if (!q) return
    if (!mapInst.current) { setSearchErr('Map not ready yet — please wait a moment.'); return }
    setSearching(true); setSearchErr('')
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=en`
      const res  = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const features = data.features || []
      if (!features.length) { setSearchErr('Location not found — try a more specific name.'); setSearching(false); return }
      // Prefer India result; fall back to first
      const hit = features.find(f => f.properties?.country === 'India') || features[0]
      const [lo, la] = hit.geometry.coordinates   // GeoJSON is [lng, lat]
      placeMarker(la, lo)
    } catch (err) {
      setSearchErr('Search failed — check your connection and try again.')
    }
    setSearching(false)
  }

  // ── Initialise Leaflet once the script has loaded ─────────────────────────
  function initMap() {
    if (mapInst.current || !mapRef.current || !window.L) return
    const L = window.L
    Lref.current = L
    const initLat = lat || 20.5937
    const initLng = lng || 78.9629
    const zoom    = (lat && lng) ? 13 : 5
    mapInst.current = L.map(mapRef.current).setView([initLat, initLng], zoom)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapInst.current)
    if (lat && lng) placeMarker(lat, lng)
    mapInst.current.on('click', ev => {
      placeMarker(ev.latlng.lat, ev.latlng.lng)
    })
    setReady(true)
  }

  useEffect(() => {
    if (window.L) {
      // Leaflet already loaded (e.g. opened modal a second time)
      initMap()
    } else {
      // Lazy-load Leaflet — modal handles CSS/JS injection in AddHospitalModal
      // Poll until window.L appears (script loads asynchronously)
      const id = setInterval(() => { if (window.L) { clearInterval(id); initMap() } }, 100)
      return () => clearInterval(id)
    }
    return () => {
      mapInst.current?.remove()
      mapInst.current  = null
      markerInst.current = null
      Lref.current = null
    }
  }, [])

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
      {/* Search bar — plain div, NOT a form (avoids nested-form conflict with modal form) */}
      <div style={{ display:'flex', gap:8, padding:'10px 12px', background:'var(--bg3)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ position:'relative', flex:1 }}>
          <svg viewBox="0 0 20 20" fill="currentColor" style={{ width:14, height:14, position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', pointerEvents:'none' }}>
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
          </svg>
          <input
            value={searchQ}
            onChange={e => { setSearchQ(e.target.value); setSearchErr('') }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch() } }}
            placeholder="Search location… e.g. AIIMS New Delhi, Chennai"
            style={{ width:'100%', padding:'7px 10px 7px 30px', background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:7, fontSize:12, color:'var(--text)', outline:'none', fontFamily:'var(--font)' }}
          />
        </div>
        <button type="button" onClick={handleSearch} className="btn btn-primary" style={{ padding:'7px 14px', fontSize:12, flexShrink:0 }} disabled={searching}>
          {searching ? '…' : 'Search'}
        </button>
      </div>
      {searchErr && <div style={{ padding:'6px 12px', background:'var(--red-bg)', fontSize:11, color:'var(--red)' }}>{searchErr}</div>}
      <div ref={mapRef} style={{ height: 240, width: '100%' }} />
      <div style={{ padding: '8px 12px', background: 'var(--bg3)', fontSize: 11, color: 'var(--text3)', borderTop:'1px solid var(--border)' }}>
        {ready ? '📍 Search or click the map to set location · Drag the marker to fine-tune' : '⏳ Loading map…'}
        {lat && lng ? ` · ${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}` : ''}
      </div>
    </div>
  )
}

// ── Add Hospital Modal ────────────────────────────────────────────────────────
const ALL_ORGANS = ['kidney','heart','liver','lung','pancreas','cornea','bone','small_intestine']
const BLOOD_GROUPS_LIST = ['A+','A-','B+','B-','AB+','AB-','O+','O-']

const FORM_INIT = {
  name: '', code: '', address: '', city: '', state: '', pincode: '',
  phone: '', email: '', level: 'level2', latitude: '', longitude: '',
  organ_capabilities: {},
  blood_inventory: Object.fromEntries(BLOOD_GROUPS_LIST.map(bg => [bg, ''])),
}

// Shared input style for AddHospitalModal — avoids form-control class dependency
const INP = { width:'100%', padding:'10px 14px', background:'var(--bg2)', border:'1.5px solid var(--border2)', borderRadius:10, fontSize:13, fontFamily:'var(--font)', color:'var(--text)', outline:'none', boxSizing:'border-box' }

function AddHospitalModal({ onClose, onSaved }) {
  const { request, loading } = useApi()
  const [form, setForm] = useState(FORM_INIT)
  const [error, setError] = useState('')
  const [leafletLoaded, setLeafletLoaded] = useState(!!window.L)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Lazy-load Leaflet CSS + JS
  useEffect(() => {
    if (window.L) { setLeafletLoaded(true); return }
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => setLeafletLoaded(true)
    document.head.appendChild(script)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim())    { setError('Hospital name is required.'); return }
    if (!form.code.trim())    { setError('Hospital code is required.'); return }
    if (!form.address.trim()) { setError('Address is required.'); return }
    if (!form.city.trim())    { setError('City is required.'); return }
    if (!form.state.trim())   { setError('State is required.'); return }
    if (!form.pincode.trim()) { setError('Pincode is required.'); return }
    if (!form.phone.trim())   { setError('Phone is required.'); return }
    if (!form.email.trim())   { setError('Email is required.'); return }
    if (!form.latitude || !form.longitude) { setError('Please select a location on the map.'); return }

    try {
      const res = await request('POST', '/api/hospitals', {
        name: form.name, code: form.code, address: form.address,
        city: form.city, state: form.state, pincode: form.pincode.trim(),
        phone: form.phone, email: form.email, level: form.level,
        latitude:  parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        is_active: 1,
      })
      // POST /api/hospitals returns { hospital: newHosp, data: newHosp }
      const hospitalId = res?.hospital?.hospital_id || res?.data?.hospital_id

      if (hospitalId) {
        // Save organ capabilities
        const capEntries = Object.entries(form.organ_capabilities)
          .filter(([, v]) => v.harvest || v.transplant)
        for (const [organ, v] of capEntries) {
          await request('POST', `/api/hospitals/${hospitalId}/capabilities`, {
            organ_type: organ, can_harvest: v.harvest ? 1 : 0, can_transplant: v.transplant ? 1 : 0,
          }).catch(() => {})
        }
        // Save blood bank inventory
        for (const [blood_group, units] of Object.entries(form.blood_inventory)) {
          if (units !== '' && !isNaN(Number(units))) {
            await request('POST', `/api/hospitals/${hospitalId}/blood-bank`, {
              blood_group, units_available: parseInt(units),
            }).catch(() => {})
          }
        }
      }
      onSaved()
    } catch (err) {
      setError(err.message || 'Failed to add hospital.')
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,30,70,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20,
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 16,
        width: '100%', maxWidth: 760, maxHeight: '90vh',
        overflow: 'auto', boxShadow: 'var(--shadow-xl)',
        animation: 'scaleIn 0.2s ease',
      }}>
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10,
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Add Hospital</h2>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Register a new transplant centre to the network</p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', cursor: 'pointer', fontSize: 16, color: 'var(--text2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding:24, display:'flex', flexDirection:'column', gap:20 }}>
            {error && (
              <div style={{ background:'var(--red-bg)', border:'1px solid #fca5a5', borderRadius:10, padding:'10px 14px', fontSize:13, color:'var(--red)' }}>
                ⚠ {error}
              </div>
            )}

            {/* ── Basic Information ─────────────────────────────────── */}
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.05em' }}>Basic Information</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--text2)' }}>Hospital Name *</label>
                  <input style={INP} placeholder="e.g. AIIMS New Delhi" value={form.name} onChange={e=>set('name',e.target.value)} required/>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--text2)' }}>Code *</label>
                  <input style={INP} placeholder="e.g. AIIMS-DEL" value={form.code} onChange={e=>set('code',e.target.value.toUpperCase())} required maxLength={20}/>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--text2)' }}>Phone *</label>
                  <input style={INP} placeholder="+91 11 2658 8500" value={form.phone} onChange={e=>set('phone',e.target.value)} required/>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--text2)' }}>Email *</label>
                  <input style={INP} type="email" placeholder="coordinator@hospital.in" value={form.email} onChange={e=>set('email',e.target.value)} required/>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--text2)' }}>Level *</label>
                <div style={{ display:'flex', gap:10, marginTop:2 }}>
                  {[['level1','Level 1','Top-tier transplant centre'],['level2','Level 2','Regional centre'],['level3','Level 3','District centre']].map(([val, lbl, desc]) => (
                    <div key={val} onClick={() => set('level', val)} style={{
                      flex:1, padding:'10px 14px', borderRadius:10, cursor:'pointer',
                      border: form.level===val ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: form.level===val ? 'var(--blue-bg)' : 'var(--bg3)',
                      transition:'all 0.15s',
                    }}>
                      <div style={{ fontSize:12, fontWeight:600, color: form.level===val ? 'var(--accent)' : 'var(--text)' }}>{lbl}</div>
                      <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Address ───────────────────────────────────────────── */}
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.05em' }}>Address</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--text2)' }}>Street Address *</label>
                <input style={INP} placeholder="e.g. Ansari Nagar, Ring Road" value={form.address} onChange={e=>set('address',e.target.value)} required/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--text2)' }}>City *</label>
                  <input style={INP} placeholder="New Delhi" value={form.city} onChange={e=>set('city',e.target.value)} required/>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--text2)' }}>State *</label>
                  <input style={INP} placeholder="Delhi" value={form.state} onChange={e=>set('state',e.target.value)} required/>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--text2)' }}>Pincode *</label>
                  <input style={INP} placeholder="110029" maxLength={6} value={form.pincode} onChange={e=>set('pincode',e.target.value)} required/>
                </div>
              </div>
            </div>

            {/* ── Map ───────────────────────────────────────────────── */}
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Location on Map *</div>
              <div style={{ fontSize:12, color:'var(--text3)', marginBottom:10 }}>
                Click on the map to pin the hospital location. This is used for distance calculations and route planning across all pages.
              </div>
              {leafletLoaded ? (
                <MapPicker
                  lat={form.latitude ? parseFloat(form.latitude) : null}
                  lng={form.longitude ? parseFloat(form.longitude) : null}
                  onChange={(lat, lng) => { set('latitude', String(lat)); set('longitude', String(lng)) }}
                />
              ) : (
                <div style={{ height:240, background:'var(--bg3)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontSize:13 }}>
                  Loading map…
                </div>
              )}
              {form.latitude && form.longitude && (
                <div style={{ marginTop:8, padding:'7px 12px', background:'var(--green-bg)', borderRadius:8, fontSize:12, color:'var(--green)', fontFamily:'var(--mono)' }}>
                  ✓ Location set: {form.latitude}, {form.longitude}
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginTop:12 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--text2)' }}>Latitude (manual)</label>
                  <input style={INP} type="number" step="0.000001" placeholder="e.g. 28.568600" value={form.latitude} onChange={e=>set('latitude',e.target.value)}/>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'var(--text2)' }}>Longitude (manual)</label>
                  <input style={INP} type="number" step="0.000001" placeholder="e.g. 77.211100" value={form.longitude} onChange={e=>set('longitude',e.target.value)}/>
                </div>
              </div>
            </div>

            {/* ── Organ Capabilities ────────────────────────────────── */}
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.05em' }}>Organ Capabilities</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {ALL_ORGANS.map(organ => {
                  const cap = form.organ_capabilities[organ] || {}
                  return (
                    <div key={organ} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg3)', borderRadius:8 }}>
                      <span style={{ fontSize:13, fontWeight:500 }}>{ORGAN_ICONS[organ]||'🫀'} {organ}</span>
                      <div style={{ display:'flex', gap:12 }}>
                        <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, cursor:'pointer' }}>
                          <input type="checkbox" checked={!!cap.harvest}
                            onChange={e => set('organ_capabilities', { ...form.organ_capabilities, [organ]: { ...cap, harvest: e.target.checked } })}
                          /> Harvest
                        </label>
                        <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, cursor:'pointer' }}>
                          <input type="checkbox" checked={!!cap.transplant}
                            onChange={e => set('organ_capabilities', { ...form.organ_capabilities, [organ]: { ...cap, transplant: e.target.checked } })}
                          /> Transplant
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Blood Bank Inventory ───────────────────────────────── */}
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.05em' }}>Blood Bank Inventory (units)</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8 }}>
                {BLOOD_GROUPS_LIST.map(bg => (
                  <div key={bg} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <label style={{ fontSize:11, fontWeight:600, color:'var(--text2)', fontFamily:'var(--mono)' }}>{bg}</label>
                    <input
                      style={{ ...INP, padding:'8px 10px', textAlign:'center' }}
                      type="number" min="0" placeholder="0"
                      value={form.blood_inventory[bg]}
                      onChange={e => set('blood_inventory', { ...form.blood_inventory, [bg]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div style={{ padding:'16px 24px', borderTop:'1px solid var(--border)', display:'flex', gap:8, justifyContent:'flex-end', position:'sticky', bottom:0, background:'var(--surface)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving…' : '+ Add Hospital'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Hospitals Page ───────────────────────────────────────────────────────
export default function Hospitals(){
  const {request}=useApi()
  const [hospitals,setHospitals]=useState([])
  const [selected,setSelected]=useState(null)
  const [caps,setCaps]=useState([])
  const [bloodBank,setBloodBank]=useState(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [search,setSearch]=useState('')
  const [showAdd,setShowAdd]=useState(false)

  function loadHospitals() {
    setLoading(true)
    request('GET','/api/hospitals')
      .then(d=>setHospitals(d?.data||d?.hospitals||[]))
      .catch(e=>setError(e.message))
      .finally(()=>setLoading(false))
  }

  useEffect(()=>{ loadHospitals() },[])

  async function selectHospital(h){
    setSelected(h);setCaps([]);setBloodBank(null)
    try{
      const [capData,bbData]=await Promise.all([
        request('GET',`/api/hospitals/${h.hospital_id}/capabilities`).catch(()=>null),
        request('GET',`/api/hospitals/${h.hospital_id}/blood-bank`).catch(()=>null),
      ])

      // Normalize capabilities — handle any response shape
      const rawCaps = capData?.capabilities ?? capData?.data?.capabilities ?? capData?.data ?? []
      setCaps(Array.isArray(rawCaps) ? rawCaps : [])

      // Normalize blood bank — extract inventory array regardless of response shape.
      // API may return: { inventory:[...] } or { hospital:{}, inventory:[...] } or flat object
      if (!bbData) {
        setBloodBank(null)
      } else {
        const inv = bbData.inventory ?? bbData.data?.inventory ?? null
        if (Array.isArray(inv)) {
          // Has a proper inventory array — use it directly
          setBloodBank({ inventory: inv })
        } else {
          // Flat object like { 'A+': 12, 'B-': 3, ... } — strip non-blood-group keys
          const flat = Object.fromEntries(
            Object.entries(bbData).filter(([k]) =>
              !['bank_id','hospital_id','hospital','inventory','data'].includes(k) &&
              typeof bbData[k] !== 'object'
            )
          )
          setBloodBank(Object.keys(flat).length > 0 ? flat : null)
        }
      }
    }catch(e){console.error(e)}
  }

  const filtered=hospitals.filter(h=>{
    const q=search.toLowerCase()
    return!q||h.name?.toLowerCase().includes(q)||h.city?.toLowerCase().includes(q)
  })

  return(
    <div>
      <div className="page-header mb-24">
        <div>
          <h1 className="page-title">Hospital <span>Network</span></h1>
          <p className="page-subtitle">All registered transplant centres and their capabilities</p>
        </div>
        <button className="btn btn-primary" onClick={()=>setShowAdd(true)}>
          <svg viewBox="0 0 20 20" fill="currentColor" style={{width:14,height:14}}>
            <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"/>
          </svg>
           Hospital
        </button>
      </div>

      <div className="grid-2-1" style={{alignItems:'start'}}>
        <div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Hospitals <span style={{color:'var(--text3)',fontWeight:400,fontSize:12}}>· {filtered.length}</span></span>
              <input className="form-control" style={{width:200,fontSize:12,padding:'6px 12px'}} placeholder="Search by name or city…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            {error&&<div style={{color:'var(--red)',fontSize:12,padding:'12px 20px'}}>{error}</div>}
            {loading?<Spinner/>:(
              <div className="table-wrap" style={{border:'none'}}>
                <table>
                  <thead><tr><th>Hospital</th><th>Level</th><th>City</th><th>ICU</th><th></th></tr></thead>
                  <tbody>
                    {filtered.map(h=>(
                      <tr key={h.hospital_id} style={{cursor:'pointer',background:selected?.hospital_id===h.hospital_id?'rgba(13,110,253,0.05)':'',borderLeft:selected?.hospital_id===h.hospital_id?'3px solid var(--accent)':'3px solid transparent'}} onClick={()=>selectHospital(h)}>
                        <td>
                          <div style={{fontWeight:600,fontSize:13}}>{h.name}</div>
                          <div style={{fontSize:11,color:'var(--text3)',fontFamily:'var(--mono)'}}>{h.code}</div>
                        </td>
                        <td><span className={`badge ${LEVEL_CLS[h.level]||'badge-gray'}`}>{h.level}</span></td>
                        <td style={{fontSize:12,color:'var(--text2)'}}>{h.city}, {h.state}</td>
                        <td>
                          {(h.capacity || h.icu_beds_total != null) ? (
                            <span style={{fontSize:12,fontFamily:'var(--mono)'}}>
                              {(h.capacity?.icu_beds_available ?? h.icu_beds_available)}/
                              {(h.capacity?.icu_beds_total ?? h.icu_beds_total)}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          <span style={{color:'var(--accent)',fontSize:11,fontWeight:600}}>
                            {selected?.hospital_id===h.hospital_id?'Selected':'View →'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!filtered.length&&(
                      <tr><td colSpan={5}><div className="empty-state" style={{padding:'30px 0'}}><div style={{color:'var(--text3)',fontSize:12}}>No hospitals found</div></div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Hospital detail panel */}
        <div className="flex flex-col gap-16">
          {selected?(
            <>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">{selected.name}</span>
                  <span className={`badge ${LEVEL_CLS[selected.level]||'badge-gray'}`}>{selected.level?.toUpperCase()}</span>
                </div>
                <div style={{padding:'14px 18px'}}>
                  {[
                    {label:'Code',value:selected.code},
                    {label:'City',value:`${selected.city}, ${selected.state}`},
                    {label:'Pincode',value:selected.pincode},
                    {label:'Phone',value:selected.phone},
                    {label:'Email',value:selected.email},
                    {label:'Coordinates',value:`${selected.latitude}, ${selected.longitude}`},
                    {label:'Status',value:selected.is_active?'✓ Active':'Inactive'},
                  ].map((r,i)=>(
                    <div key={i} className="data-row" style={{borderBottom:i<6?'1px solid var(--border)':'none',padding:'7px 0',fontSize:12}}>
                      <span className="data-row-key">{r.label}</span>
                      <span className="data-row-val" style={{fontSize:12,textAlign:'right',maxWidth:160,wordBreak:'break-all'}}>{r.value}</span>
                    </div>
                  ))}
                </div>
                {/* Mini map showing hospital location */}
                {selected.latitude && selected.longitude && (
                  <div style={{padding:'0 16px 16px'}}>
                    <div style={{fontSize:11,color:'var(--text3)',marginBottom:6,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>Location</div>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${selected.latitude}&mlon=${selected.longitude}&zoom=15`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display:'block', padding:'10px 14px', borderRadius:10,
                        background:'var(--blue-bg)', border:'1px solid var(--blue)',
                        color:'var(--accent)', fontSize:12, fontWeight:600,
                        textDecoration:'none', textAlign:'center',
                      }}
                    >
                      📍 View on OpenStreetMap →
                    </a>
                  </div>
                )}
              </div>

              {caps.length>0&&(
                <div className="card">
                  <div className="card-header"><span className="card-title">Organ Capabilities</span></div>
                  <div style={{padding:'10px 16px'}}>
                    {caps.map((c,i)=>(
                      <div key={i} className="flex items-center justify-between" style={{padding:'7px 0',borderBottom:i<caps.length-1?'1px solid var(--border)':'none'}}>
                        <span style={{fontSize:13}}>{ORGAN_ICONS[c.organ_type]||'🫀'} {c.organ_type}</span>
                        <div className="flex gap-6">
                          {c.can_harvest&&<span className="badge badge-blue" style={{fontSize:10}}>Harvest</span>}
                          {c.can_transplant&&<span className="badge badge-green" style={{fontSize:10}}>Transplant</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bloodBank&&(
                <div className="card">
                  <div className="card-header"><span className="card-title">Blood Bank Inventory</span></div>
                  <div style={{padding:'10px 16px'}}>
                    {(bloodBank.inventory||[]).length>0
                      ? (bloodBank.inventory||[]).map((item,i,arr)=>(
                          <div key={i} className="flex items-center justify-between" style={{padding:'7px 0',borderBottom:i<arr.length-1?'1px solid var(--border)':'none',fontSize:12}}>
                            <span style={{fontFamily:'var(--mono)',fontWeight:600}}>{item.blood_group}</span>
                            <span className={`badge ${Number(item.units_available)>5?'badge-green':Number(item.units_available)>0?'badge-amber':'badge-red'}`}>{item.units_available} units</span>
                          </div>
                        ))
                      : Object.entries(bloodBank).filter(([k])=>!['bank_id','hospital_id','hospital','inventory'].includes(k)).map(([bg,units],i,arr)=>(
                          <div key={i} className="flex items-center justify-between" style={{padding:'7px 0',borderBottom:i<arr.length-1?'1px solid var(--border)':'none',fontSize:12}}>
                            <span style={{fontFamily:'var(--mono)',fontWeight:600}}>{bg.replace('_units','').replace('_pos','+').replace('_neg','-')}</span>
                            <span className={`badge ${Number(units)>5?'badge-green':Number(units)>0?'badge-amber':'badge-red'}`}>{units} units</span>
                          </div>
                        ))
                    }
                  </div>
                </div>
              )}
            </>
          ):(
            <div className="card" style={{padding:'40px 20px'}}>
              <div className="empty-state">
                <div style={{fontSize:32}}>🏥</div>
                <div className="empty-title">Select a hospital</div>
                <div className="empty-sub">Click any hospital to view capabilities, ICU capacity, and blood bank inventory</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <AddHospitalModal
          onClose={()=>setShowAdd(false)}
          onSaved={()=>{ setShowAdd(false); loadHospitals() }}
        />
      )}
    </div>
  )
}