import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OrganPill from '../components/ui/OrganPill'
import { urgencyClass } from '../utils/formatters'
import { URGENCY_LABELS, ORGAN_TYPES, BLOOD_GROUPS } from '../utils/constants'

const MOCK = [
  { recipient_id:5512, full_name:'Vikram Mehta',   age:35, sex:'M', blood_group:'B+', organ_needed:'kidney',  medical_urgency:'status_1a', pra_percent:8,  hospital:'AIIMS Delhi',       wait_months:14, status:'waiting' },
  { recipient_id:4821, full_name:'Deepa Krishnan', age:28, sex:'F', blood_group:'O+', organ_needed:'heart',   medical_urgency:'status_1a', pra_percent:42, hospital:'Fortis Hyderabad',  wait_months:6,  status:'offer_received' },
  { recipient_id:4409, full_name:'Anjali Singh',   age:45, sex:'F', blood_group:'B-', organ_needed:'kidney',  medical_urgency:'status_1b', pra_percent:12, hospital:'PGIMER Chandigarh', wait_months:8,  status:'waiting' },
  { recipient_id:5001, full_name:'Suresh Iyer',    age:52, sex:'M', blood_group:'A+', organ_needed:'liver',   medical_urgency:'status_2',  pra_percent:5,  hospital:'PGIMER Chandigarh', wait_months:22, status:'waiting' },
  { recipient_id:4490, full_name:'Rekha Pillai',   age:39, sex:'F', blood_group:'AB+',organ_needed:'lung',    medical_urgency:'status_2',  pra_percent:78, hospital:'Apollo Mumbai',     wait_months:18, status:'waiting' },
  { recipient_id:3887, full_name:'Harish Gupta',   age:63, sex:'M', blood_group:'O+', organ_needed:'pancreas',medical_urgency:'status_3',  pra_percent:3,  hospital:'KEM Mumbai',        wait_months:31, status:'transplanted' },
]

const STATUS_MAP = {
  waiting:          { cls:'badge-blue',   label:'Waiting' },
  offer_received:   { cls:'badge-amber',  label:'Offer Recv.' },
  transplanted:     { cls:'badge-green',  label:'Transplanted' },
  suspended:        { cls:'badge-gray',   label:'Suspended' },
  removed:          { cls:'badge-red',    label:'Removed' },
}

const PRA_CLS = (p) => p >= 70 ? 'badge-red' : p >= 30 ? 'badge-amber' : 'badge-green'

export default function Recipients() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [organFilter, setOrgan] = useState('')
  const [urgencyFilter, setUrgency] = useState('')

  const filtered = MOCK.filter((r) => {
    if (organFilter  && r.organ_needed !== organFilter) return false
    if (urgencyFilter && r.medical_urgency !== urgencyFilter) return false
    if (search && !r.full_name.toLowerCase().includes(search.toLowerCase()) && !String(r.recipient_id).includes(search)) return false
    return true
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-16">
        <div className="flex gap-8">
          <input className="form-control" placeholder="Search recipients…" style={{ width:200 }} value={search} onChange={(e)=>setSearch(e.target.value)} />
          <select className="form-control" style={{ width:'auto' }} value={organFilter} onChange={(e)=>setOrgan(e.target.value)}>
            <option value="">All Organs</option>{ORGAN_TYPES.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
          <select className="form-control" style={{ width:'auto' }} value={urgencyFilter} onChange={(e)=>setUrgency(e.target.value)}>
            <option value="">All Urgencies</option>
            <option value="status_1a">1A</option><option value="status_1b">1B</option>
            <option value="status_2">2</option><option value="status_3">3</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={()=>navigate('/register-recipient')}>+ Register Recipient</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Name</th><th>Age/Sex</th><th>Blood</th><th>Organ Needed</th><th>Urgency</th><th>PRA%</th><th>Hospital</th><th>Wait</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const s = STATUS_MAP[r.status] || { cls:'badge-gray', label:r.status }
                return (
                  <tr key={r.recipient_id}>
                    <td style={{ fontFamily:'var(--mono)', color:'var(--text2)' }}>R-{r.recipient_id}</td>
                    <td style={{ fontWeight:500 }}>{r.full_name}</td>
                    <td>{r.age} / {r.sex}</td>
                    <td><strong>{r.blood_group}</strong></td>
                    <td><OrganPill type={r.organ_needed} /></td>
                    <td><span className={urgencyClass(r.medical_urgency)}>{URGENCY_LABELS[r.medical_urgency]}</span></td>
                    <td><span className={`badge ${PRA_CLS(r.pra_percent)}`}>{r.pra_percent}%</span></td>
                    <td>{r.hospital}</td>
                    <td>{r.wait_months} mo</td>
                    <td><span className={`badge ${s.cls} badge-dot`}>{s.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
