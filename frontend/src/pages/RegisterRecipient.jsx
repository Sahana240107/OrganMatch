import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import HLAInput from '../components/forms/HLAInput'
import UrgencyPicker from '../components/forms/UrgencyPicker'
import { BLOOD_GROUPS, ORGAN_TYPES } from '../utils/constants'
import { useApi } from '../hooks/useApi'

const INIT = {
  hospital_id: '', full_name: '', primary_diagnosis: '', age: '', sex: '', blood_group: '',
  organ_needed: '', registration_date: new Date().toISOString().split('T')[0],
  medical_urgency: 'status_3', pra_percent: 0, crossmatch_required: false,
  hiv_status: 'negative', hepatitis_b: 'negative', hepatitis_c: 'negative', notes: '',
}

export default function RegisterRecipient() {
  const navigate             = useNavigate()
  const { request, loading } = useApi()
  const [form, setForm]      = useState(INIT)
  const [hla, setHla]        = useState({})
  const [hospitals, setHospitals] = useState([])
  const [error, setError]    = useState('')
  const [success, setSuccess] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // ── Load hospitals from DB on mount ────────────────────────────────────────
  useEffect(() => {
    request('GET', '/api/hospitals')
      .then(data => setHospitals(data?.data || []))
      .catch(e => console.error('Failed to load hospitals:', e.message))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Frontend validation
    if (!form.hospital_id)          { setError('Please select a hospital.'); return }
    if (!form.full_name.trim())     { setError('Full name is required.'); return }
    if (!form.age)                  { setError('Age is required.'); return }
    if (!form.sex)                  { setError('Sex is required.'); return }
    if (!form.blood_group)          { setError('Blood group is required.'); return }
    if (!form.organ_needed)         { setError('Organ needed is required.'); return }
    if (!form.primary_diagnosis.trim()) { setError('Primary diagnosis is required.'); return }

    try {
      // Build flat payload — backend recipientSchema expects these exact fields
      const payload = {
        full_name:          form.full_name.trim(),
        age:                parseInt(form.age),
        sex:                form.sex,
        blood_group:        form.blood_group,
        organ_needed:       form.organ_needed,
        primary_diagnosis:  form.primary_diagnosis.trim(),
        registration_date:  form.registration_date,   // YYYY-MM-DD from <input type="date">
        medical_urgency:    form.medical_urgency,
        hospital_id:        parseInt(form.hospital_id),
        pra_percent:        parseInt(form.pra_percent) || 0,
        crossmatch_required: form.crossmatch_required ? 1 : 0,
        hiv_status:         form.hiv_status,
        hepatitis_b:        form.hepatitis_b,
        hepatitis_c:        form.hepatitis_c,
        notes:              form.notes || null,
        // HLA — send as flat fields (controller supports both flat + nested)
        hla_a1:  hla.hla_a1  || null,
        hla_a2:  hla.hla_a2  || null,
        hla_b1:  hla.hla_b1  || null,
        hla_b2:  hla.hla_b2  || null,
        hla_dr1: hla.hla_dr1 || null,
        hla_dr2: hla.hla_dr2 || null,
        hla_dq1: hla.hla_dq1 || null,
        hla_dq2: hla.hla_dq2 || null,
      }

      await request('POST', '/api/recipients', payload)
      setSuccess('Recipient registered successfully!')
      setTimeout(() => navigate('/recipients'), 1000)
    } catch (err) {
      setError(err.message || 'Failed to register recipient.')
    }
  }

  return (
    <div>
      <div className="page-header mb-24">
        <div>
          <h1 className="page-title">Register <span>Recipient</span></h1>
          <p className="page-subtitle">Add a new patient to the waiting list — urgency score calculated automatically</p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--red-bg)', border: '1px solid #fca5a5', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: 'var(--red)', marginBottom: 16 }}>
          ⚠ {error}
        </div>
      )}
      {success && (
        <div style={{ background: 'var(--green-bg)', border: '1px solid #86efac', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: 'var(--green)', marginBottom: 16 }}>
          ✓ {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid-2">

          {/* ── Left: identity + clinical ────────────────────────────────── */}
          <div className="card">
            <div className="card-header"><span className="card-title">Recipient Details</span></div>
            <div style={{ padding: 16 }}>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-control" placeholder="Patient full name"
                    value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Primary Diagnosis *</label>
                  <input className="form-control" placeholder="e.g. ESRD, DCM, Cirrhosis"
                    value={form.primary_diagnosis} onChange={e => set('primary_diagnosis', e.target.value)} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Age *</label>
                  <input className="form-control" type="number" min="1" max="120" placeholder="Years"
                    value={form.age} onChange={e => set('age', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Sex *</label>
                  <select className="form-control" value={form.sex} onChange={e => set('sex', e.target.value)} required>
                    <option value="">Select</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Blood Group *</label>
                  <select className="form-control" value={form.blood_group} onChange={e => set('blood_group', e.target.value)} required>
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Organ Needed *</label>
                  <select className="form-control" value={form.organ_needed} onChange={e => set('organ_needed', e.target.value)} required>
                    <option value="">Select organ</option>
                    {ORGAN_TYPES.map(o => (
                      <option key={o} value={o}>
                        {o.charAt(0).toUpperCase() + o.slice(1).replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Medical Urgency *</label>
                <UrgencyPicker value={form.medical_urgency} onChange={v => set('medical_urgency', v)} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">PRA %</label>
                  <input className="form-control" type="number" min="0" max="100" placeholder="0–100"
                    value={form.pra_percent} onChange={e => set('pra_percent', Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Crossmatch Required</label>
                  <select className="form-control"
                    value={form.crossmatch_required ? 'yes' : 'no'}
                    onChange={e => set('crossmatch_required', e.target.value === 'yes')}>
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
              </div>

              {/* ── Hospital — loaded live from DB ───────────────────────── */}
              <div className="form-group">
                <label className="form-label">Hospital *</label>
                <select className="form-control" value={form.hospital_id}
                  onChange={e => set('hospital_id', e.target.value)} required>
                  <option value="">
                    {hospitals.length === 0 ? 'Loading hospitals…' : 'Select hospital'}
                  </option>
                  {hospitals.map(h => (
                    <option key={h.hospital_id} value={h.hospital_id}>
                      {h.name} — {h.city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Registration Date</label>
                <input className="form-control" type="date"
                  value={form.registration_date} onChange={e => set('registration_date', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows={3} placeholder="Additional clinical notes…"
                  value={form.notes} onChange={e => set('notes', e.target.value)} />
              </div>

              <div className="flex gap-8 justify-end mt-8">
                <button type="button" className="btn btn-ghost" onClick={() => navigate('/recipients')}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Registering…' : 'Register Recipient'}
                </button>
              </div>
            </div>
          </div>

          {/* ── Right: HLA + serology ─────────────────────────────────────── */}
          <div className="card">
            <div className="card-header"><span className="card-title">HLA & Serology</span></div>
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10, fontWeight: 500 }}>
                HLA Typing
              </div>
              <HLAInput value={hla} onChange={setHla} />

              <div style={{ fontSize: 12, color: 'var(--text2)', margin: '16px 0 10px', fontWeight: 500 }}>
                Recipient Serology
              </div>
              {[
                ['hiv_status',  'HIV'],
                ['hepatitis_b', 'Hepatitis B'],
                ['hepatitis_c', 'Hepatitis C'],
              ].map(([k, label]) => (
                <div key={k} className="flex items-center justify-between mb-8"
                  style={{ padding: '8px 10px', background: 'var(--bg3)', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
                  <select className="form-control"
                    style={{ width: 'auto', fontSize: 11, padding: '3px 8px' }}
                    value={form[k]} onChange={e => set(k, e.target.value)}>
                    <option value="negative">Negative</option>
                    <option value="positive">Positive</option>
                    <option value="unknown">Unknown</option>
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