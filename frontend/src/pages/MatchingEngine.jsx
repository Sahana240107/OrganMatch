import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'

const ORGAN_OPTIONS = [
  { type: 'kidney', label: 'Kidney', icon: '🫘' },
  { type: 'heart',  label: 'Heart',  icon: '❤️' },
  { type: 'liver',  label: 'Liver',  icon: '🫀' },
  { type: 'lung',   label: 'Lung',   icon: '🫁' },
]
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const ALGORITHM_WEIGHTS = [
  { label: 'HLA Compatibility',           pct: 30, color: '#3b82f6' },
  { label: 'ABO Blood Match',             pct: 20, color: '#ef4444' },
  { label: 'Medical Urgency (MELD/UNOS)', pct: 20, color: '#f59e0b' },
  { label: 'Wait Time',                   pct: 10, color: '#8b5cf6' },
  { label: 'Distance / Ischemic Time',    pct: 10, color: '#22c55e' },
  { label: 'PRA Sensitization',           pct:  5, color: '#ec4899' },
  { label: 'Age Match',                   pct:  5, color: '#06b6d4' },
]
const URGENCY_STYLE = {
  status_1a: { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444', text: 'Status 1A' },
  status_1b: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', text: 'Status 1B' },
  status_2:  { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', text: 'Status 2'  },
  status_3:  { bg: 'rgba(156,163,175,0.15)',color: '#9ca3af', text: 'Status 3'  },
}

function CriticalCard({ patient, isSelected, onClick }) {
  const urg = URGENCY_STYLE[patient.medical_urgency] || URGENCY_STYLE.status_3
  const pid = String(patient.recipient_id || '0000').padStart(4, '0')
  return (
    <div onClick={onClick} style={{
      flex: '0 0 270px', background: isSelected ? 'rgba(239,68,68,0.07)' : 'var(--bg3)',
      border: `1.5px solid ${isSelected ? 'rgba(239,68,68,0.45)' : 'var(--border)'}`,
      borderRadius: 12, padding: '16px 18px', cursor: 'pointer', transition: 'all 0.18s',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>P-{pid}</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: urg.bg, color: urg.color }}>
          {urg.text}
        </span>
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{patient.full_name}</div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>
        {patient.organ_needed} · {patient.blood_group} · {patient.hospital_name}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{patient.donor_count ?? 0} donors</span>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#22c55e', lineHeight: 1 }}>
            {Number(patient.top_score || 0).toFixed(1)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>top score</div>
        </div>
      </div>
    </div>
  )
}

export default function MatchingEngine() {
  const { request } = useApi()
  const navigate = useNavigate()

  const [criticalPatients, setCriticalPatients] = useState([])
  const [selectedCritical, setSelectedCritical] = useState(null)
  const [loadingCritical,  setLoadingCritical]  = useState(true)

  const [searchQuery,     setSearchQuery]     = useState('')
  const [searchResults,   setSearchResults]   = useState([])
  const [searching,       setSearching]       = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [selectedOrgan,   setSelectedOrgan]   = useState('kidney')
  const [selectedBlood,   setSelectedBlood]   = useState('')
  const [finding,         setFinding]         = useState(false)
  const [findError,       setFindError]       = useState('')
  const [showDropdown,    setShowDropdown]    = useState(false)

  // Load Status 1A critical candidates from waiting list
  useEffect(() => {
    async function load() {
      setLoadingCritical(true)
      try {
        const data = await request('GET', '/api/recipients/waiting-list?medical_urgency=status_1a')
        // getWaitingList returns { recipients: [...] }
        const list = (data?.recipients || data?.data || []).slice(0, 3)
        // For each, try to get top score from recent matches
        const enriched = await Promise.all(list.map(async (r) => {
          try {
            const md = await request('GET', `/api/matches/recent`)
            const myMatch = (md?.matches || []).find(m => String(m.recipient_id) === String(r.recipient_id))
            return {
              ...r,
              top_score: myMatch ? Number(myMatch.total_score) : 0,
              donor_count: 0,
            }
          } catch {
            return { ...r, top_score: 0, donor_count: 0 }
          }
        }))
        setCriticalPatients(enriched)
        if (enriched.length) setSelectedCritical(enriched[0])
      } catch {
        setCriticalPatients([])
      } finally {
        setLoadingCritical(false)
      }
    }
    load()
  }, []) // eslint-disable-line

  // Patient search — API returns { recipients: [...] }
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setShowDropdown(false); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await request('GET', `/api/recipients?search=${encodeURIComponent(searchQuery)}&limit=6`)
        // Controller returns { recipients: [...] }
        const list = data?.recipients || data?.data || []
        setSearchResults(list)
        setShowDropdown(list.length > 0)
      } catch { setSearchResults([]) }
      finally { setSearching(false) }
    }, 350)
    return () => clearTimeout(t)
  }, [searchQuery]) // eslint-disable-line

  const handleSelectPatient = (r) => {
    setSelectedPatient(r)
    setSearchQuery('')
    setSearchResults([])
    setShowDropdown(false)
    if (r.organ_needed) setSelectedOrgan(r.organ_needed)
    if (r.blood_group)  setSelectedBlood(r.blood_group)
  }

  // Find Matching Donors:
  // 1. Find an available organ of the selected type (or use patient's organ)
  // 2. Run matching on that organ
  // 3. Navigate to results
  const handleFindMatch = async () => {
    if (!selectedPatient) {
      setFindError('Please select a patient first.')
      return
    }
    setFinding(true)
    setFindError('')
    try {
      // Run matching for this recipient across all available organs of their needed type
      try {
        await request('POST', `/api/matches/for-recipient/${selectedPatient.recipient_id}/run`)
      } catch (e) {
        console.warn('Pre-run warning:', e.message)
      }
      // Navigate to recipient-centric results
      navigate(`/matching/results?recipient_id=${selectedPatient.recipient_id}&organ=${selectedPatient.organ_needed || selectedOrgan}`)
    } catch (e) {
      setFindError(e.message || 'Failed to find matches. Please try again.')
    } finally {
      setFinding(false)
    }
  }

  const handleCriticalClick = async (p) => {
    setSelectedCritical(p)
    try {
      // Pre-run matching for this recipient
      await request('POST', `/api/matches/for-recipient/${p.recipient_id}/run`)
    } catch { /* non-fatal */ }
    navigate(`/matching/results?recipient_id=${p.recipient_id}&organ=${p.organ_needed || 'kidney'}&from=critical`)
  }

  return (
    <div style={{ animation: 'pageIn 0.3s var(--ease)' }}>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Matching <span>Engine</span></h1>
          <p className="page-subtitle">AI-powered organ matching with HLA + ABO + urgency + proximity scoring</p>
        </div>
        <div style={{
          display:'flex', alignItems:'center', gap: 8,
          background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)',
          borderRadius: 20, padding:'6px 14px',
        }}>
          <span style={{ width: 8, height: 8, borderRadius:'50%', background:'#22c55e', display:'inline-block' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color:'#22c55e' }}>Engine Active</span>
        </div>
      </div>

      {/* Critical Candidates */}
      <div className="card mb-20">
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
            <svg viewBox="0 0 20 20" fill="#ef4444" width="16" height="16">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Critical Match Candidates</span>
          </div>
          <span style={{ fontSize: 12, color:'var(--text3)' }}>Auto-ranked by compatibility</span>
        </div>
        <div style={{ padding:'16px 20px' }}>
          {loadingCritical ? (
            <div style={{ textAlign:'center', padding:'20px 0', color:'var(--text3)', fontSize: 13 }}>Loading critical candidates…</div>
          ) : criticalPatients.length === 0 ? (
            <div style={{ textAlign:'center', padding:'20px 0', color:'var(--text3)', fontSize: 13 }}>No Status 1A patients at this time</div>
          ) : (
            <div style={{ display:'flex', gap: 14, overflowX:'auto', paddingBottom: 4 }}>
              {criticalPatients.map(p => (
                <CriticalCard
                  key={p.recipient_id}
                  patient={p}
                  isSelected={selectedCritical?.recipient_id === p.recipient_id}
                  onClick={() => handleCriticalClick(p)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Find Donors + Algorithm */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap: 20, alignItems:'start' }}>

        {/* Find Compatible Donors */}
        <div className="card">
          <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Find Compatible Donors</span>
          </div>
          <div style={{ padding:'22px' }}>

            {/* Patient search */}
            <div style={{ marginBottom: 22, position: 'relative' }}>
              <label style={{ fontSize: 11, fontWeight: 600, letterSpacing:'0.8px', textTransform:'uppercase', color:'var(--text3)', display:'block', marginBottom: 8 }}>
                Patient Name or ID
              </label>
              <div style={{ position:'relative' }}>
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ position:'absolute', left: 12, top:'50%', transform:'translateY(-50%)', width: 16, height: 16, color:'var(--text3)', pointerEvents:'none' }}>
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                </svg>
                <input
                  className="form-control"
                  style={{ paddingLeft: 38, fontSize: 14 }}
                  placeholder={selectedPatient ? selectedPatient.full_name : 'Search patient...'}
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); if (selectedPatient) setSelectedPatient(null) }}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                />
                {searching && <div className="spinner" style={{ position:'absolute', right: 12, top:'50%', transform:'translateY(-50%)', width: 14, height: 14, borderWidth: 2 }} />}
              </div>

              {showDropdown && searchResults.length > 0 && (
                <div style={{
                  position:'absolute', zIndex: 200, background:'var(--surface)', top:'calc(100% + 2px)',
                  border:'1px solid var(--border2)', borderRadius: 10, width:'100%',
                  boxShadow:'var(--shadow)', maxHeight: 240, overflowY:'auto',
                }}>
                  {searchResults.map(r => (
                    <div key={r.recipient_id} onMouseDown={() => handleSelectPatient(r)}
                      style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid var(--border)', fontSize: 13, transition:'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <div style={{ fontWeight: 600 }}>{r.full_name}</div>
                      <div style={{ fontSize: 11, color:'var(--text3)', marginTop: 2 }}>
                        {r.organ_needed} · {r.blood_group} · {r.hospital_name || r.hospital_city}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedPatient && (
                <div style={{ marginTop: 8, padding:'8px 12px', background:'var(--blue-bg)', borderRadius: 8, fontSize: 12, color:'var(--blue)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span>✓ <strong>{selectedPatient.full_name}</strong> · {selectedPatient.organ_needed} · {selectedPatient.blood_group}</span>
                  <button onClick={() => setSelectedPatient(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--blue)', fontSize: 18, lineHeight: 1, marginLeft: 8 }}>×</button>
                </div>
              )}
            </div>

            {/* Organ selector */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 11, fontWeight: 600, letterSpacing:'0.8px', textTransform:'uppercase', color:'var(--text3)', display:'block', marginBottom: 10 }}>
                Organ Required
              </label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 10 }}>
                {ORGAN_OPTIONS.map(o => (
                  <button key={o.type} onClick={() => setSelectedOrgan(o.type)} style={{
                    padding:'14px 8px', borderRadius: 12, border:'1.5px solid',
                    borderColor: selectedOrgan === o.type ? 'var(--accent)' : 'var(--border)',
                    background: selectedOrgan === o.type ? 'rgba(13,110,253,0.08)' : 'var(--bg3)',
                    cursor:'pointer', transition:'all 0.18s',
                    display:'flex', flexDirection:'column', alignItems:'center', gap: 6,
                  }}>
                    <span style={{ fontSize: 28 }}>{o.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: selectedOrgan === o.type ? 'var(--accent)' : 'var(--text)' }}>
                      {o.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Blood group */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ fontSize: 11, fontWeight: 600, letterSpacing:'0.8px', textTransform:'uppercase', color:'var(--text3)', display:'block', marginBottom: 10 }}>
                Blood Group
              </label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 8 }}>
                {BLOOD_GROUPS.map(bg => (
                  <button key={bg} onClick={() => setSelectedBlood(selectedBlood === bg ? '' : bg)} style={{
                    padding:'10px 8px', borderRadius: 10, border:'1.5px solid',
                    borderColor: selectedBlood === bg ? 'var(--accent)' : 'var(--border)',
                    background: selectedBlood === bg ? 'rgba(13,110,253,0.08)' : 'var(--bg3)',
                    cursor:'pointer', transition:'all 0.18s',
                    fontWeight: 600, fontSize: 13,
                    color: selectedBlood === bg ? 'var(--accent)' : 'var(--text)',
                  }}>{bg}</button>
                ))}
              </div>
            </div>

            {findError && (
              <div style={{ marginBottom: 14, padding:'10px 14px', background:'var(--red-bg)', border:'1px solid #fca5a5', borderRadius: 8, color:'var(--red)', fontSize: 13 }}>
                {findError}
              </div>
            )}

            {/* CTA */}
            <button
              className="btn btn-primary"
              style={{ width:'100%', padding:'14px', fontSize: 15, fontWeight: 700, borderRadius: 12, justifyContent:'center' }}
              onClick={handleFindMatch}
              disabled={finding}
            >
              {finding ? (
                <><div className="spinner" style={{ width:16,height:16,borderWidth:2,borderColor:'rgba(255,255,255,0.3)',borderTopColor:'#fff' }}/> Finding Matches…</>
              ) : (
                <><svg viewBox="0 0 20 20" fill="currentColor" style={{width:16,height:16}}><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/></svg> Find Matching Donors →</>
              )}
            </button>
          </div>
        </div>

        {/* Matching Algorithm */}
        <div className="card">
          <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Matching Algorithm</span>
          </div>
          <div style={{ padding:'18px 22px' }}>
            <p style={{ fontSize: 12, color:'var(--text3)', marginBottom: 20, lineHeight: 1.5 }}>
              7-component weighted scoring system used by the matching engine
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap: 15 }}>
              {ALGORITHM_WEIGHTS.map(w => (
                <div key={w.label} style={{ display:'flex', alignItems:'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius:'50%', background: w.color, flexShrink: 0 }}/>
                  <span style={{ flex: 1, fontSize: 13 }}>{w.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color:'var(--text2)', minWidth: 36, textAlign:'right' }}>{w.pct}%</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 22, padding:'12px 14px', background:'rgba(59,130,246,0.07)', border:'1px solid rgba(59,130,246,0.2)', borderRadius: 10 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 5 }}>
                <svg viewBox="0 0 20 20" fill="#3b82f6" width="14" height="14"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/></svg>
                <span style={{ fontSize: 12, fontWeight: 700, color:'#3b82f6' }}>AI-Enhanced</span>
              </div>
              <p style={{ fontSize: 11.5, color:'var(--text3)', lineHeight: 1.5 }}>
                Machine learning model trained on 50K+ historical transplant outcomes for refined scoring accuracy.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}