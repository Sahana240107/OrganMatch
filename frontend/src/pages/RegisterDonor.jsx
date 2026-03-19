import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import OrganSelector from '../components/forms/OrganSelector'
import { BLOOD_GROUPS, ORGAN_VIABILITY_HOURS } from '../utils/constants'
import { useApi } from '../hooks/useApi'

const STEPS = ['Identity', 'Medical', 'HLA & Serology', 'Organs', 'Review']
const STEP_ICONS = ['👤', '📋', '🧬', '🫀', '✅']

const INIT = {
  donor_type: '', full_name: '', age: '', sex: '', blood_group: '',
  weight_kg: '', height_cm: '', cause_of_death: '', brain_death_time: '',
  medical_history: '', consent_document: '',
  hospital_id: '',   // ← added
}
const INIT_SEROLOGY = {
  hiv_status: 'unknown', hepatitis_b: 'unknown', hepatitis_c: 'unknown',
  syphilis: 'unknown', cmv_status: 'unknown', ebv_status: 'unknown',
}

// ── Shared inline styles ─────────────────────────────────────────────────────
const row  = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }
const col  = { display:'flex', flexDirection:'column', gap:6 }
const lbl  = { fontSize:12, fontWeight:600, color:'var(--text2)' }
const inp  = { width:'100%', padding:'10px 14px', background:'var(--bg2)', border:'1.5px solid var(--border2)', borderRadius:10, fontSize:13, fontFamily:'var(--font)', color:'var(--text)', outline:'none', boxSizing:'border-box' }
const sel  = { ...inp, cursor:'pointer', backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 16 16'%3E%3Cpath stroke='%234a5980' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")", backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center', backgroundSize:16, paddingRight:36, appearance:'none' }

export default function RegisterDonor() {
  const navigate             = useNavigate()
  const { request, loading } = useApi()

  const [step,      setStep]     = useState(0)
  const [form,      setForm]     = useState(INIT)
  const [hla,       setHla]      = useState({})
  const [serology,  setSer]      = useState(INIT_SEROLOGY)
  const [organs,    setOrgans]   = useState([])
  const [error,     setError]    = useState('')
  const [success,   setSuccess]  = useState('')
  const [hospitals, setHospitals]= useState([])   // ← added

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // ── Fetch hospitals on mount ─────────────────────────────────────────────
  useEffect(() => {
    request('GET', '/api/hospitals')
      .then(data => setHospitals(data?.hospitals || data?.data || []))
      .catch(() => setHospitals([]))
  }, [])

  async function handleSubmit() {
    setError(''); setSuccess('')
    if (!form.donor_type)       { setError('Please select donor type.'); return }
    if (!form.full_name.trim()) { setError('Full name is required.'); return }
    if (!form.age)              { setError('Age is required.'); return }
    if (!form.sex)              { setError('Sex is required.'); return }
    if (!form.blood_group)      { setError('Blood group is required.'); return }
    if (!form.hospital_id)      { setError('Please select a hospital.'); return }   // ← added
    if (organs.length === 0)    { setError('Please select at least one organ.'); return }
    try {
      await request('POST', '/api/donors', {
        donor_type:       form.donor_type,
        full_name:        form.full_name.trim(),
        age:              parseInt(form.age),
        sex:              form.sex,
        blood_group:      form.blood_group,
        hospital_id:      parseInt(form.hospital_id),   // ← added
        weight_kg:        form.weight_kg ? parseFloat(form.weight_kg) : null,
        height_cm:        form.height_cm ? parseFloat(form.height_cm) : null,
        cause_of_death:   form.cause_of_death || null,
        brain_death_time: form.brain_death_time || null,
        medical_history:  form.medical_history || null,
        hla_typing: hla, serology, organs,
      })
      setSuccess('Donor registered! Matching triggered automatically.')
      setTimeout(() => navigate('/donors'), 1200)
    } catch (e) { setError(e.message || 'Failed to register donor.') }
  }

  return (
    <div>
      <div className="page-header mb-24">
        <div>
          <h1 className="page-title">Register <span>Donor</span></h1>
          <p className="page-subtitle">Complete all 5 steps — matching triggers automatically on organ entry</p>
        </div>
      </div>

      {/* ── Step timeline ───────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', background:'var(--surface)', borderRadius:14, padding:'16px 24px', border:'1px solid var(--border)', marginBottom:28 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ flex: i < STEPS.length-1 ? 1 : 'none', display:'flex', alignItems:'center' }}>
            <div onClick={() => i < step && setStep(i)} style={{
              display:'flex', alignItems:'center', gap:10,
              cursor: i < step ? 'pointer' : 'default',
              padding:'8px 12px', borderRadius:10, whiteSpace:'nowrap',
              background: i===step ? 'var(--accent)' : i<step ? 'var(--green-bg)' : 'transparent',
              transition:'all 0.2s',
            }}>
              <div style={{
                width:30, height:30, borderRadius:'50%', flexShrink:0,
                background: i===step ? 'rgba(255,255,255,0.2)' : i<step ? 'var(--green)' : 'var(--bg3)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize: i<step ? 14 : 13, fontWeight:600,
                color: i<=step ? 'white' : 'var(--text3)',
              }}>
                {i < step ? '✓' : STEP_ICONS[i]}
              </div>
              <div>
                <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', color: i===step?'white':i<step?'var(--green)':'var(--text3)' }}>Step {i+1}</div>
                <div style={{ fontSize:13, fontWeight: i===step?600:400, color: i===step?'white':i<step?'var(--text)':'var(--text3)' }}>{s}</div>
              </div>
            </div>
            {i < STEPS.length-1 && <div style={{ flex:1, height:2, background: i<step?'var(--green)':'var(--border)', margin:'0 4px', borderRadius:2 }}/>}
          </div>
        ))}
      </div>

      {error   && <div style={{ background:'var(--red-bg)', border:'1px solid #fca5a5', borderRadius:12, padding:'12px 16px', fontSize:13, color:'var(--red)', marginBottom:16 }}>⚠ {error}</div>}
      {success && <div style={{ background:'var(--green-bg)', border:'1px solid #86efac', borderRadius:12, padding:'12px 16px', fontSize:13, color:'var(--green)', marginBottom:16 }}>✓ {success}</div>}

      <div style={{ maxWidth:700, margin:'0 auto' }}>
        <div className="card">

          {/* ── Step 0 — Identity ─────────────────────────────────────── */}
          {step === 0 && <>
            <div className="card-header">
              <span className="card-title">Donor Identity</span>
              <span style={{ fontSize:11, color:'var(--text3)' }}>Step 1 of 5</span>
            </div>
            <div style={{ padding:24 }}>
              <div style={row}>
                <div style={col}><label style={lbl}>Full Name *</label><input style={inp} placeholder="As per Aadhaar" value={form.full_name} onChange={e=>set('full_name',e.target.value)}/></div>
                <div style={col}><label style={lbl}>Donor Type *</label>
                  <select style={sel} value={form.donor_type} onChange={e=>set('donor_type',e.target.value)}>
                    <option value="">Select type</option>
                    <option value="deceased">Deceased</option>
                    <option value="living">Living</option>
                  </select>
                </div>
              </div>
              <div style={row}>
                <div style={col}><label style={lbl}>Age *</label><input style={inp} type="number" placeholder="Years" value={form.age} onChange={e=>set('age',e.target.value)}/></div>
                <div style={col}><label style={lbl}>Sex *</label>
                  <select style={sel} value={form.sex} onChange={e=>set('sex',e.target.value)}>
                    <option value="">Select</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
              </div>
              <div style={row}>
                <div style={col}><label style={lbl}>Blood Group *</label>
                  <select style={sel} value={form.blood_group} onChange={e=>set('blood_group',e.target.value)}>
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map(b=><option key={b}>{b}</option>)}
                  </select>
                </div>
                <div style={col}><label style={lbl}>Weight (kg)</label><input style={inp} type="number" placeholder="72" value={form.weight_kg} onChange={e=>set('weight_kg',e.target.value)}/></div>
              </div>

              {/* ── Hospital dropdown ── */}
              <div style={row}>
                <div style={col}>
                  <label style={lbl}>Hospital *</label>
                  <select style={sel} value={form.hospital_id} onChange={e=>set('hospital_id',e.target.value)}>
                    <option value="">Select hospital</option>
                    {hospitals.map(h => (
                      <option key={h.hospital_id} value={h.hospital_id}>
                        {h.name}{h.city ? ` — ${h.city}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={col}><label style={lbl}>Height (cm)</label><input style={inp} type="number" placeholder="172" value={form.height_cm} onChange={e=>set('height_cm',e.target.value)}/></div>
              </div>

              <div style={row}>
                <div style={col}><label style={lbl}>Cause of Death</label>
                  <select style={sel} value={form.cause_of_death} onChange={e=>set('cause_of_death',e.target.value)}>
                    <option value="">Select (if deceased)</option>
                    <option value="traumatic_brain_injury">Traumatic Brain Injury</option>
                    <option value="stroke">Stroke</option>
                    <option value="anoxia">Anoxia</option>
                    <option value="other_cns">Other CNS</option>
                    <option value="living_donor">Living Donor</option>
                  </select>
                </div>
                <div style={col}><label style={lbl}>Brain Death Time</label><input style={inp} type="datetime-local" value={form.brain_death_time} onChange={e=>set('brain_death_time',e.target.value)}/></div>
              </div>
            </div>
          </>}

          {/* ── Step 1 — Medical ──────────────────────────────────────── */}
          {step === 1 && <>
            <div className="card-header">
              <span className="card-title">Medical History</span>
              <span style={{ fontSize:11, color:'var(--text3)' }}>Step 2 of 5</span>
            </div>
            <div style={{ padding:24 }}>
              <div style={{ ...col, marginBottom:16 }}>
                <label style={lbl}>Medical History</label>
                <textarea style={{ ...inp, minHeight:120, resize:'vertical' }} placeholder="Relevant conditions, medications, allergies…" value={form.medical_history} onChange={e=>set('medical_history',e.target.value)}/>
              </div>
              <div style={col}>
                <label style={lbl}>Consent Document Reference</label>
                <input style={inp} placeholder="e.g. consent_2041.pdf" value={form.consent_document} onChange={e=>set('consent_document',e.target.value)}/>
              </div>
            </div>
          </>}

          {/* ── Step 2 — HLA & Serology ───────────────────────────────── */}
          {step === 2 && <>
            <div className="card-header">
              <span className="card-title">HLA Typing & Serology</span>
              <span style={{ fontSize:11, color:'var(--text3)' }}>Step 3 of 5</span>
            </div>
            <div style={{ padding:24 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text2)', marginBottom:14 }}>HLA Typing</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:28 }}>
                {[
                  { locus:'HLA-A',  keys:['hla_a1','hla_a2'],   ph:['A*01','A*02'] },
                  { locus:'HLA-B',  keys:['hla_b1','hla_b2'],   ph:['B*07','B*35'] },
                  { locus:'HLA-DR', keys:['hla_dr1','hla_dr2'], ph:['DR3','DR7']   },
                  { locus:'HLA-DQ', keys:['hla_dq1','hla_dq2'], ph:['DQ1','DQ2']  },
                ].map(({ locus, keys, ph }) => {
                  const filled = keys.filter(k => hla[k]).length
                  const badge  = filled===2 ? { bg:'#dcfce7', color:'#15803d', border:'#86efac', txt:'✓ Both alleles' }
                               : filled===1 ? { bg:'#fef3c7', color:'#92400e', border:'#fcd34d', txt:'~ Partial' }
                               :              { bg:'var(--bg4)', color:'var(--text3)', border:'transparent', txt:'— No data' }
                  return (
                    <div key={locus} style={{ background:'var(--bg3)', borderRadius:10, padding:'14px 16px', minWidth:0 }}>
                      <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1.2px', color:'var(--text3)', marginBottom:10 }}>{locus}</div>
                      <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                        {keys.map((k,i) => (
                          <input key={k}
                            style={{ flex:1, minWidth:0, padding:'8px 10px', background:'var(--bg2)', border:'1.5px solid var(--border2)', borderRadius:7, fontFamily:'var(--mono)', fontSize:13, color:'var(--text)', outline:'none', textTransform:'uppercase', boxSizing:'border-box' }}
                            value={hla[k]||''} placeholder={ph[i]} maxLength={10}
                            onFocus={e=>e.target.style.borderColor='var(--accent)'}
                            onBlur={e=>e.target.style.borderColor='var(--border2)'}
                            onChange={e=>setHla(h=>({...h,[k]:e.target.value.toUpperCase()}))}
                          />
                        ))}
                      </div>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:6, fontSize:10, fontWeight:700, fontFamily:'var(--mono)', background:badge.bg, color:badge.color, border:`1px solid ${badge.border}` }}>{badge.txt}</span>
                    </div>
                  )
                })}
              </div>

              <div style={{ fontSize:13, fontWeight:600, color:'var(--text2)', marginBottom:14 }}>Serology</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  ['hiv_status','HIV'],['hepatitis_b','Hepatitis B'],
                  ['hepatitis_c','Hepatitis C'],['syphilis','Syphilis'],
                  ['cmv_status','CMV'],['ebv_status','EBV'],
                ].map(([k, label]) => (
                  <div key={k} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg3)', borderRadius:8, gap:8 }}>
                    <span style={{ fontSize:13, fontWeight:500, color:'var(--text)', flexShrink:0 }}>{label}</span>
                    <select style={{ ...sel, width:'auto', minWidth:110, padding:'5px 32px 5px 10px', fontSize:12 }}
                      value={serology[k]} onChange={e=>setSer(s=>({...s,[k]:e.target.value}))}>
                      <option value="negative">Negative</option>
                      <option value="positive">Positive</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </>}

          {/* ── Step 3 — Organs ───────────────────────────────────────── */}
          {step === 3 && <>
            <div className="card-header">
              <span className="card-title">Select Organs</span>
              <span style={{ fontSize:11, color:'var(--text3)' }}>Step 4 of 5</span>
            </div>
            <div style={{ padding:24 }}>
              <div style={{ fontSize:13, color:'var(--text2)', marginBottom:16 }}>Select all organs available for donation</div>
              <OrganSelector selected={organs} onChange={setOrgans}/>
              {organs.length > 0 && (
                <div style={{ marginTop:20, padding:16, background:'rgba(22,163,74,0.06)', borderRadius:10, border:'1px solid rgba(22,163,74,0.2)' }}>
                  <div style={{ fontSize:12, color:'var(--text2)', marginBottom:10, fontWeight:600 }}>Selected viability windows</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {organs.map(o => (
                      <div key={o} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'var(--bg2)', borderRadius:8 }}>
                        <span className={`organ-pill organ-${o}`}>{o}</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--accent)', fontWeight:600 }}>{ORGAN_VIABILITY_HOURS[o]}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>}

          {/* ── Step 4 — Review ───────────────────────────────────────── */}
          {step === 4 && <>
            <div className="card-header">
              <span className="card-title">Review & Submit</span>
              <span style={{ fontSize:11, color:'var(--text3)' }}>Step 5 of 5</span>
            </div>
            <div style={{ padding:24 }}>
              <div style={{ background:'var(--bg3)', borderRadius:12, padding:16, fontSize:13, marginBottom:20 }}>
                {[
                  ['Name',        form.full_name||'—'],
                  ['Type',        form.donor_type||'—'],
                  ['Blood Group', form.blood_group||'—'],
                  ['Age',         form.age||'—'],
                  ['Hospital',    hospitals.find(h=>h.hospital_id==form.hospital_id)?.name||'—'],
                  ['Organs',      organs.join(', ')||'—'],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:10, paddingBottom:10, borderBottom:'1px solid var(--border)' }}>
                    <span style={{ color:'var(--text2)', fontWeight:500 }}>{k}</span>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'14px 16px', background:'var(--amber-bg)', borderRadius:10 }}>
                <input type="checkbox" id="consent-check" style={{ marginTop:3 }}/>
                <label htmlFor="consent-check" style={{ fontSize:13, color:'var(--text2)', cursor:'pointer', lineHeight:1.5 }}>
                  I confirm that informed consent has been obtained and all clinical data is accurate and verified.
                </label>
              </div>
            </div>
          </>}

          {/* Navigation */}
          <div style={{ padding:'0 24px 24px', display:'flex', gap:8, justifyContent:'flex-end' }}>
            {step > 0 && <button className="btn btn-ghost" onClick={()=>setStep(s=>s-1)}>← Back</button>}
            <button className="btn btn-ghost" onClick={()=>navigate('/donors')}>Cancel</button>
            {step < STEPS.length-1
              ? <button className="btn btn-primary" onClick={()=>setStep(s=>s+1)}>Next: {STEPS[step+1]} →</button>
              : <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Submitting…' : '✓ Register Donor'}
                </button>
            }
          </div>
        </div>
      </div>
    </div>
  )
}