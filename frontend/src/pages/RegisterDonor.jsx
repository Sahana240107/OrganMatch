import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HLAInput from '../components/forms/HLAInput'
import OrganSelector from '../components/forms/OrganSelector'
import { BLOOD_GROUPS, ORGAN_VIABILITY_HOURS } from '../utils/constants'
import { useApi } from '../hooks/useApi'

const STEPS = ['Identity', 'Medical', 'HLA & Serology', 'Organs', 'Consent']

const INIT = {
  hospital_id:'', donor_type:'', full_name:'', age:'', sex:'', blood_group:'',
  weight_kg:'', height_cm:'', cause_of_death:'', brain_death_time:'', medical_history:'',
  consent_document:'',
}
const INIT_HLA      = {}
const INIT_SEROLOGY = { hiv_status:'unknown', hepatitis_b:'unknown', hepatitis_c:'unknown', syphilis:'unknown', cmv_status:'unknown', ebv_status:'unknown' }

export default function RegisterDonor() {
  const navigate       = useNavigate()
  const { request, loading } = useApi()
  const [step, setStep]   = useState(0)
  const [form, setForm]   = useState(INIT)
  const [hla,  setHla]    = useState(INIT_HLA)
  const [serology, setSer] = useState(INIT_SEROLOGY)
  const [organs, setOrgans] = useState([])
  const [error, setError]  = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit() {
    setError('')
    try {
      await request('POST', '/api/donors', { ...form, hla_typing: hla, serology, organs })
      navigate('/donors')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="step-indicator mb-20">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div className={`step ${i < step ? 'done' : i === step ? 'active' : 'idle'}`}>
              <div className="step-num">{i < step ? '✓' : i + 1}</div>
              <span style={{ fontSize:12 }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className="step-line" />}
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:8, padding:'8px 12px', fontSize:12, color:'var(--red)', marginBottom:14 }}>
          {error}
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          {/* Step 0 — Identity */}
          {step === 0 && (
            <div>
              <div className="card-header"><span className="card-title">Step 1 — Donor Identity</span></div>
              <div style={{ padding:16 }}>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Full Name *</label><input className="form-control" placeholder="As per Aadhaar" value={form.full_name} onChange={(e)=>set('full_name',e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Donor Type *</label>
                    <select className="form-control" value={form.donor_type} onChange={(e)=>set('donor_type',e.target.value)}>
                      <option value="">Select type</option><option value="deceased">Deceased</option><option value="living">Living</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Age *</label><input className="form-control" type="number" placeholder="Years" value={form.age} onChange={(e)=>set('age',e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Sex *</label>
                    <select className="form-control" value={form.sex} onChange={(e)=>set('sex',e.target.value)}>
                      <option value="">Select</option><option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Blood Group *</label>
                    <select className="form-control" value={form.blood_group} onChange={(e)=>set('blood_group',e.target.value)}>
                      <option value="">Select</option>{BLOOD_GROUPS.map(b=><option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Hospital *</label>
                    <select className="form-control" value={form.hospital_id} onChange={(e)=>set('hospital_id',e.target.value)}>
                      <option value="">Select hospital</option>
                      <option value="1">AIIMS Delhi</option><option value="2">Fortis Hyderabad</option>
                      <option value="3">PGIMER Chandigarh</option><option value="4">KEM Mumbai</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Weight (kg)</label><input className="form-control" type="number" placeholder="72" value={form.weight_kg} onChange={(e)=>set('weight_kg',e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Height (cm)</label><input className="form-control" type="number" placeholder="172" value={form.height_cm} onChange={(e)=>set('height_cm',e.target.value)} /></div>
                </div>
                <div className="form-group"><label className="form-label">Cause of Death</label>
                  <select className="form-control" value={form.cause_of_death} onChange={(e)=>set('cause_of_death',e.target.value)}>
                    <option value="">Select (if deceased)</option>
                    <option value="traumatic_brain_injury">Traumatic Brain Injury</option>
                    <option value="stroke">Stroke</option><option value="anoxia">Anoxia</option>
                    <option value="other_cns">Other CNS</option><option value="living_donor">Living Donor</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Brain Death Time</label><input className="form-control" type="datetime-local" value={form.brain_death_time} onChange={(e)=>set('brain_death_time',e.target.value)} /></div>
              </div>
            </div>
          )}

          {/* Step 1 — Medical */}
          {step === 1 && (
            <div>
              <div className="card-header"><span className="card-title">Step 2 — Medical History</span></div>
              <div style={{ padding:16 }}>
                <div className="form-group"><label className="form-label">Medical History</label><textarea className="form-control" rows={4} placeholder="Relevant medical conditions, medications, allergies..." value={form.medical_history} onChange={(e)=>set('medical_history',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Consent Document URL / Reference</label><input className="form-control" placeholder="e.g. consent_2041.pdf" value={form.consent_document} onChange={(e)=>set('consent_document',e.target.value)} /></div>
              </div>
            </div>
          )}

          {/* Step 2 — HLA & Serology */}
          {step === 2 && (
            <div>
              <div className="card-header"><span className="card-title">Step 3 — HLA Typing & Serology</span></div>
              <div style={{ padding:16 }}>
                <div style={{ fontSize:12, color:'var(--text2)', marginBottom:10, fontWeight:500 }}>HLA Typing</div>
                <HLAInput value={hla} onChange={setHla} />
                <div style={{ fontSize:12, color:'var(--text2)', margin:'16px 0 10px', fontWeight:500 }}>Serology</div>
                {[['hiv_status','HIV'],['hepatitis_b','Hepatitis B'],['hepatitis_c','Hepatitis C'],['syphilis','Syphilis'],['cmv_status','CMV'],['ebv_status','EBV']].map(([k,label])=>(
                  <div key={k} className="flex items-center justify-between mb-8" style={{ padding:'8px 10px', background:'var(--bg3)', borderRadius:8 }}>
                    <span style={{ fontSize:12, fontWeight:500 }}>{label}</span>
                    <select className="form-control" style={{ width:'auto', fontSize:11, padding:'3px 8px' }} value={serology[k]} onChange={(e)=>setSer(s=>({...s,[k]:e.target.value}))}>
                      <option value="negative">Negative</option><option value="positive">Positive</option><option value="unknown">Unknown</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Organs */}
          {step === 3 && (
            <div>
              <div className="card-header"><span className="card-title">Step 4 — Select Organs</span></div>
              <div style={{ padding:16 }}>
                <div style={{ fontSize:12, color:'var(--text2)', marginBottom:12 }}>Select all organs available for donation</div>
                <OrganSelector selected={organs} onChange={setOrgans} />
                {organs.length > 0 && (
                  <div style={{ marginTop:16, padding:12, background:'rgba(34,197,94,0.06)', borderRadius:8, border:'1px solid rgba(34,197,94,0.2)' }}>
                    <div style={{ fontSize:11, color:'var(--text2)', marginBottom:8 }}>Selected viability windows</div>
                    {organs.map(o=>(
                      <div key={o} className="flex items-center justify-between mb-4">
                        <span style={{ fontSize:12 }}>{o}</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--accent)' }}>{ORGAN_VIABILITY_HOURS[o]}h</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4 — Consent */}
          {step === 4 && (
            <div>
              <div className="card-header"><span className="card-title">Step 5 — Review & Submit</span></div>
              <div style={{ padding:16 }}>
                <div style={{ fontSize:12, color:'var(--text2)', marginBottom:12 }}>Please review all details before final submission.</div>
                <div style={{ background:'var(--bg3)', borderRadius:8, padding:12, fontSize:12, marginBottom:16 }}>
                  <div className="flex justify-between mb-8"><span className="text-muted">Name</span><span>{form.full_name || '—'}</span></div>
                  <div className="flex justify-between mb-8"><span className="text-muted">Type</span><span>{form.donor_type || '—'}</span></div>
                  <div className="flex justify-between mb-8"><span className="text-muted">Blood Group</span><strong>{form.blood_group || '—'}</strong></div>
                  <div className="flex justify-between mb-8"><span className="text-muted">Organs</span><span>{organs.join(', ') || '—'}</span></div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                  <input type="checkbox" id="consent-check" />
                  <label htmlFor="consent-check" style={{ fontSize:12, color:'var(--text2)', cursor:'pointer' }}>
                    I confirm that informed consent has been obtained and all clinical data is accurate.
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div style={{ padding:'0 16px 16px', display:'flex', gap:8, justifyContent:'flex-end' }}>
            {step > 0 && <button className="btn btn-ghost" onClick={()=>setStep(s=>s-1)}>← Back</button>}
            <button className="btn btn-ghost" onClick={()=>navigate('/donors')}>Cancel</button>
            {step < STEPS.length - 1
              ? <button className="btn btn-primary" onClick={()=>setStep(s=>s+1)}>Next: {STEPS[step+1]} →</button>
              : <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>{loading ? 'Submitting…' : '✓ Register Donor'}</button>
            }
          </div>
        </div>

        {/* Right: organ selector preview */}
        <div className="flex flex-col gap-16">
          <div className="card">
            <div className="card-header"><span className="card-title">Organ Selector</span></div>
            <div style={{ padding:14 }}>
              <OrganSelector selected={organs} onChange={setOrgans} />
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Viability Windows</span></div>
            <div style={{ padding:14, display:'flex', flexDirection:'column', gap:8 }}>
              {['kidney','heart','liver','lung','pancreas'].map(o => {
                const h = ORGAN_VIABILITY_HOURS[o]
                const color = h <= 6 ? 'var(--red)' : h <= 12 ? 'var(--amber)' : 'var(--accent)'
                return (
                  <div key={o} className="flex items-center justify-between" style={{ padding:'8px 10px', background:'var(--bg3)', borderRadius:8 }}>
                    <span className={`organ-pill organ-${o}`}>{o}</span>
                    <span style={{ fontFamily:'var(--mono)', fontWeight:600, color }}>{h}h</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
