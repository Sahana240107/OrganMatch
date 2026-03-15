import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HLAInput from '../components/forms/HLAInput'
import UrgencyPicker from '../components/forms/UrgencyPicker'
import { BLOOD_GROUPS, ORGAN_TYPES } from '../utils/constants'
import { useApi } from '../hooks/useApi'

const INIT = {
  hospital_id:'', full_name:'', primary_diagnosis:'', age:'', sex:'', blood_group:'',
  organ_needed:'', registration_date: new Date().toISOString().split('T')[0],
  medical_urgency:'status_3', pra_percent:0, crossmatch_required:false,
  hiv_status:'negative', hepatitis_b:'negative', hepatitis_c:'negative', notes:'',
}

export default function RegisterRecipient() {
  const navigate          = useNavigate()
  const { request, loading } = useApi()
  const [form, setForm]   = useState(INIT)
  const [hla, setHla]     = useState({})
  const [error, setError] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await request('POST', '/api/recipients', { ...form, hla_typing: hla })
      navigate('/recipients')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:8, padding:'8px 12px', fontSize:12, color:'var(--red)', marginBottom:14 }}>
            {error}
          </div>
        )}
        <div className="grid-2">
          {/* Left — identity + clinical */}
          <div className="card">
            <div className="card-header"><span className="card-title">Recipient Details</span></div>
            <div style={{ padding:16 }}>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Full Name *</label><input className="form-control" placeholder="Patient name" value={form.full_name} onChange={(e)=>set('full_name',e.target.value)} required /></div>
                <div className="form-group"><label className="form-label">Primary Diagnosis *</label><input className="form-control" placeholder="e.g. ESRD, DCM" value={form.primary_diagnosis} onChange={(e)=>set('primary_diagnosis',e.target.value)} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Age *</label><input className="form-control" type="number" value={form.age} onChange={(e)=>set('age',e.target.value)} required /></div>
                <div className="form-group"><label className="form-label">Sex *</label>
                  <select className="form-control" value={form.sex} onChange={(e)=>set('sex',e.target.value)} required>
                    <option value="">Select</option><option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Blood Group *</label>
                  <select className="form-control" value={form.blood_group} onChange={(e)=>set('blood_group',e.target.value)} required>
                    <option value="">Select</option>{BLOOD_GROUPS.map(b=><option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Organ Needed *</label>
                  <select className="form-control" value={form.organ_needed} onChange={(e)=>set('organ_needed',e.target.value)} required>
                    <option value="">Select organ</option>{ORGAN_TYPES.map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1).replace('_',' ')}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Medical Urgency *</label>
                <UrgencyPicker value={form.medical_urgency} onChange={(v)=>set('medical_urgency',v)} />
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">PRA % *</label><input className="form-control" type="number" min="0" max="100" placeholder="0–100" value={form.pra_percent} onChange={(e)=>set('pra_percent',Number(e.target.value))} /></div>
                <div className="form-group"><label className="form-label">Crossmatch Required</label>
                  <select className="form-control" value={form.crossmatch_required ? 'yes' : 'no'} onChange={(e)=>set('crossmatch_required',e.target.value==='yes')}>
                    <option value="no">No</option><option value="yes">Yes</option>
                  </select>
                </div>
              </div>
              <div className="form-group"><label className="form-label">Hospital *</label>
                <select className="form-control" value={form.hospital_id} onChange={(e)=>set('hospital_id',e.target.value)} required>
                  <option value="">Select hospital</option>
                  <option value="1">AIIMS Delhi</option><option value="2">Fortis Hyderabad</option>
                  <option value="3">PGIMER Chandigarh</option><option value="4">KEM Mumbai</option><option value="5">Apollo Mumbai</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Registration Date</label><input className="form-control" type="date" value={form.registration_date} onChange={(e)=>set('registration_date',e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" rows={3} value={form.notes} onChange={(e)=>set('notes',e.target.value)} /></div>
              <div className="flex gap-8 justify-end mt-8">
                <button type="button" className="btn btn-ghost" onClick={()=>navigate('/recipients')}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Registering…' : 'Register Recipient'}</button>
              </div>
            </div>
          </div>

          {/* Right — HLA + serology */}
          <div className="card">
            <div className="card-header"><span className="card-title">HLA & Serology</span></div>
            <div style={{ padding:16 }}>
              <div style={{ fontSize:12, color:'var(--text2)', marginBottom:10, fontWeight:500 }}>HLA Typing</div>
              <HLAInput value={hla} onChange={setHla} />
              <div style={{ fontSize:12, color:'var(--text2)', margin:'16px 0 10px', fontWeight:500 }}>Recipient Serology</div>
              {[['hiv_status','HIV'],['hepatitis_b','Hepatitis B'],['hepatitis_c','Hepatitis C']].map(([k,label])=>(
                <div key={k} className="flex items-center justify-between mb-8" style={{ padding:'8px 10px', background:'var(--bg3)', borderRadius:8 }}>
                  <span style={{ fontSize:12, fontWeight:500 }}>{label}</span>
                  <select className="form-control" style={{ width:'auto', fontSize:11, padding:'3px 8px' }} value={form[k]} onChange={(e)=>set(k,e.target.value)}>
                    <option value="negative">Negative</option><option value="positive">Positive</option><option value="unknown">Unknown</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
