import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BLOOD_GROUPS, ORGAN_TYPES } from '../utils/constants'
import { useApi } from '../hooks/useApi'

const STEPS = ['Identity', 'Clinical', 'HLA & Serology', 'Review']
const STEP_ICONS = ['👤', '🏥', '🧬', '✅']

const INIT = {
  hospital_id: '', full_name: '', primary_diagnosis: '', age: '', sex: '', blood_group: '',
  organ_needed: '', registration_date: new Date().toISOString().split('T')[0],
  medical_urgency: 'status_3', pra_percent: 0, crossmatch_required: false,
  hiv_status: 'negative', hepatitis_b: 'negative', hepatitis_c: 'negative', notes: '',
}

const URGENCY_INFO = {
  status_1a: { label:'Status 1A', desc:'Life support — immediate', color:'var(--red)',    bg:'var(--red-bg)'   },
  status_1b: { label:'Status 1B', desc:'ICU — urgent',            color:'#d97706',       bg:'#fef3c7'         },
  status_2:  { label:'Status 2',  desc:'Hospitalised — stable',   color:'var(--accent)', bg:'var(--blue-bg)'  },
  status_3:  { label:'Status 3',  desc:'Outpatient — elective',   color:'var(--green)',  bg:'var(--green-bg)' },
}

// ── Shared inline styles ─────────────────────────────────────────────────────
const row = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }
const col = { display:'flex', flexDirection:'column', gap:6 }
const lbl = { fontSize:12, fontWeight:600, color:'var(--text2)' }
const inp = { width:'100%', padding:'10px 14px', background:'var(--bg2)', border:'1.5px solid var(--border2)', borderRadius:10, fontSize:13, fontFamily:'var(--font)', color:'var(--text)', outline:'none', boxSizing:'border-box' }
const sel = { ...inp, cursor:'pointer', backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 16 16'%3E%3Cpath stroke='%234a5980' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")", backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center', backgroundSize:16, paddingRight:36, appearance:'none' }

export default function RegisterRecipient() {
  const navigate             = useNavigate()
  const { request, loading } = useApi()
  const [step,      setStep]    = useState(0)
  const [form,      setForm]    = useState(INIT)
  const [hla,       setHla]     = useState({})
  const [hospitals, setHospitals] = useState([])
  const [error,     setError]   = useState('')
  const [success,   setSuccess] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    request('GET', '/api/hospitals')
      .then(data => setHospitals(data?.data || []))
      .catch(e => console.error('Failed to load hospitals:', e.message))
  }, [])

  async function handleSubmit() {
    setError(''); setSuccess('')
    if (!form.hospital_id)              { setError('Please select a hospital.'); return }
    if (!form.full_name.trim())         { setError('Full name is required.'); return }
    if (!form.age)                      { setError('Age is required.'); return }
    if (!form.sex)                      { setError('Sex is required.'); return }
    if (!form.blood_group)              { setError('Blood group is required.'); return }
    if (!form.organ_needed)             { setError('Organ needed is required.'); return }
    if (!form.primary_diagnosis.trim()) { setError('Primary diagnosis is required.'); return }
    try {
      await request('POST', '/api/recipients', {
        full_name: form.full_name.trim(), age: parseInt(form.age), sex: form.sex,
        blood_group: form.blood_group, organ_needed: form.organ_needed,
        primary_diagnosis: form.primary_diagnosis.trim(),
        registration_date: form.registration_date, medical_urgency: form.medical_urgency,
        hospital_id: parseInt(form.hospital_id), pra_percent: parseInt(form.pra_percent)||0,
        crossmatch_required: form.crossmatch_required ? 1 : 0,
        hiv_status: form.hiv_status, hepatitis_b: form.hepatitis_b, hepatitis_c: form.hepatitis_c,
        notes: form.notes || null,
        hla_a1: hla.hla_a1||null, hla_a2: hla.hla_a2||null,
        hla_b1: hla.hla_b1||null, hla_b2: hla.hla_b2||null,
        hla_dr1: hla.hla_dr1||null, hla_dr2: hla.hla_dr2||null,
        hla_dq1: hla.hla_dq1||null, hla_dq2: hla.hla_dq2||null,
      })
      setSuccess('Recipient registered successfully!')
      setTimeout(() => navigate('/recipients'), 1000)
    } catch (err) { setError(err.message || 'Failed to register recipient.') }
  }

  const urgInfo = URGENCY_INFO[form.medical_urgency] || URGENCY_INFO.status_3

  return (
    <div>
      <div className="page-header mb-24">
        <div>
          <h1 className="page-title">Add <span>Recipient</span></h1>
          <p className="page-subtitle">Register a patient to the organ waiting list</p>
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
              <span className="card-title">Patient Identity</span>
              <span style={{ fontSize:11, color:'var(--text3)' }}>Step 1 of 4</span>
            </div>
            <div style={{ padding:24 }}>
              <div style={row}>
                <div style={col}><label style={lbl}>Full Name *</label><input style={inp} placeholder="Patient full name" value={form.full_name} onChange={e=>set('full_name',e.target.value)}/></div>
                <div style={col}><label style={lbl}>Primary Diagnosis *</label><input style={inp} placeholder="e.g. ESRD, DCM, Cirrhosis" value={form.primary_diagnosis} onChange={e=>set('primary_diagnosis',e.target.value)}/></div>
              </div>
              <div style={row}>
                <div style={col}><label style={lbl}>Age *</label><input style={inp} type="number" min="1" max="120" placeholder="Years" value={form.age} onChange={e=>set('age',e.target.value)}/></div>
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
                <div style={col}><label style={lbl}>Organ Needed *</label>
                  <select style={sel} value={form.organ_needed} onChange={e=>set('organ_needed',e.target.value)}>
                    <option value="">Select organ</option>
                    {ORGAN_TYPES.map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1).replace('_',' ')}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </>}

          {/* ── Step 1 — Clinical ─────────────────────────────────────── */}
          {step === 1 && <>
            <div className="card-header">
              <span className="card-title">Clinical Details</span>
              <span style={{ fontSize:11, color:'var(--text3)' }}>Step 2 of 4</span>
            </div>
            <div style={{ padding:24 }}>
              <div style={{ ...col, marginBottom:20 }}>
                <label style={lbl}>Medical Urgency *</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:6 }}>
                  {Object.entries(URGENCY_INFO).map(([key, info]) => (
                    <div key={key} onClick={() => set('medical_urgency', key)} style={{
                      padding:'12px 16px', borderRadius:10, cursor:'pointer',
                      border: form.medical_urgency===key ? `2px solid ${info.color}` : '1px solid var(--border)',
                      background: form.medical_urgency===key ? info.bg : 'var(--bg3)',
                      transition:'all 0.15s',
                    }}>
                      <div style={{ fontSize:13, fontWeight:600, color: form.medical_urgency===key ? info.color : 'var(--text)' }}>{info.label}</div>
                      <div style={{ fontSize:11, color:'var(--text3)', marginTop:3 }}>{info.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={row}>
                <div style={col}><label style={lbl}>Hospital *</label>
                  <select style={sel} value={form.hospital_id} onChange={e=>set('hospital_id',e.target.value)}>
                    <option value="">{hospitals.length===0?'Loading…':'Select hospital'}</option>
                    {hospitals.map(h=><option key={h.hospital_id} value={h.hospital_id}>{h.name} — {h.city}</option>)}
                  </select>
                </div>
                <div style={col}><label style={lbl}>Registration Date</label><input style={inp} type="date" value={form.registration_date} onChange={e=>set('registration_date',e.target.value)}/></div>
              </div>
              <div style={row}>
                <div style={col}><label style={lbl}>PRA %</label><input style={inp} type="number" min="0" max="100" placeholder="0–100" value={form.pra_percent} onChange={e=>set('pra_percent',Number(e.target.value))}/></div>
                <div style={col}><label style={lbl}>Crossmatch Required</label>
                  <select style={sel} value={form.crossmatch_required?'yes':'no'} onChange={e=>set('crossmatch_required',e.target.value==='yes')}>
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
              </div>
              <div style={{ ...col, marginBottom:0 }}>
                <label style={lbl}>Notes</label>
                <textarea style={{ ...inp, minHeight:90, resize:'vertical' }} placeholder="Additional clinical notes…" value={form.notes} onChange={e=>set('notes',e.target.value)}/>
              </div>
            </div>
          </>}

          {/* ── Step 2 — HLA & Serology ───────────────────────────────── */}
          {step === 2 && <>
            <div className="card-header">
              <span className="card-title">HLA Typing & Serology</span>
              <span style={{ fontSize:11, color:'var(--text3)' }}>Step 3 of 4</span>
            </div>
            <div style={{ padding:24 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text2)', marginBottom:14 }}>HLA Typing</div>
              {/* 2×2 grid — pure inline, zero class dependency */}
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
                {[['hiv_status','HIV'],['hepatitis_b','Hepatitis B'],['hepatitis_c','Hepatitis C']].map(([k, label]) => (
                  <div key={k} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg3)', borderRadius:8, gap:8 }}>
                    <span style={{ fontSize:13, fontWeight:500, color:'var(--text)', flexShrink:0 }}>{label}</span>
                    <select style={{ ...sel, width:'auto', minWidth:110, padding:'5px 32px 5px 10px', fontSize:12 }}
                      value={form[k]} onChange={e=>set(k,e.target.value)}>
                      <option value="negative">Negative</option>
                      <option value="positive">Positive</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </>}

          {/* ── Step 3 — Review ───────────────────────────────────────── */}
          {step === 3 && <>
            <div className="card-header">
              <span className="card-title">Review & Submit</span>
              <span style={{ fontSize:11, color:'var(--text3)' }}>Step 4 of 4</span>
            </div>
            <div style={{ padding:24 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:12, background:urgInfo.bg, border:`1px solid ${urgInfo.color}`, marginBottom:20 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:urgInfo.color, flexShrink:0 }}/>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:urgInfo.color }}>{urgInfo.label}</div>
                  <div style={{ fontSize:12, color:'var(--text2)' }}>{urgInfo.desc}</div>
                </div>
              </div>
              <div style={{ background:'var(--bg3)', borderRadius:12, padding:16, fontSize:13 }}>
                {[
                  ['Name',        form.full_name||'—'],
                  ['Diagnosis',   form.primary_diagnosis||'—'],
                  ['Organ',       form.organ_needed||'—'],
                  ['Blood Group', form.blood_group||'—'],
                  ['Hospital',    hospitals.find(h=>String(h.hospital_id)===String(form.hospital_id))?.name||'—'],
                  ['PRA',         `${form.pra_percent}%`],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:10, paddingBottom:10, borderBottom:'1px solid var(--border)' }}>
                    <span style={{ color:'var(--text2)', fontWeight:500 }}>{k}</span>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
            </div>
          </>}

          {/* Navigation */}
          <div style={{ padding:'0 24px 24px', display:'flex', gap:8, justifyContent:'flex-end' }}>
            {step > 0 && <button className="btn btn-ghost" onClick={()=>setStep(s=>s-1)}>← Back</button>}
            <button className="btn btn-ghost" onClick={()=>navigate('/recipients')}>Cancel</button>
            {step < STEPS.length-1
              ? <button className="btn btn-primary" onClick={()=>setStep(s=>s+1)}>Next: {STEPS[step+1]} →</button>
              : <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Registering…' : 'Register Recipient'}
                </button>
            }
          </div>
        </div>
      </div>
    </div>
  )
}