import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OrganPill from '../components/ui/OrganPill'
import { formatDate } from '../utils/formatters'
import { BLOOD_GROUPS } from '../utils/constants'

const MOCK = [
  { donor_id:2041, full_name:'Ramesh Patel',   donor_type:'deceased', age:42, sex:'M', blood_group:'B+', hospital:'AIIMS Delhi',       organs:['kidney','liver'],     status:'active',      created_at:'2026-03-14' },
  { donor_id:2040, full_name:'Sunita Rao',      donor_type:'deceased', age:38, sex:'F', blood_group:'O+', hospital:'Fortis Hyderabad',  organs:['heart','lung'],       status:'active',      created_at:'2026-03-14' },
  { donor_id:2039, full_name:'Ajay Bhatt',      donor_type:'living',   age:29, sex:'M', blood_group:'A+', hospital:'PGIMER Chandigarh', organs:['kidney'],             status:'organs_allocated', created_at:'2026-03-12' },
  { donor_id:2038, full_name:'Kavitha Nair',    donor_type:'deceased', age:54, sex:'F', blood_group:'AB+',hospital:'KEM Mumbai',        organs:['liver','pancreas'],   status:'organs_allocated', created_at:'2026-03-11' },
  { donor_id:2037, full_name:'Mohan Verma',     donor_type:'deceased', age:61, sex:'M', blood_group:'O-', hospital:'Apollo Mumbai',     organs:['cornea'],             status:'expired',     created_at:'2026-03-09' },
]

const STATUS_MAP = {
  active:            { cls:'badge-green',  label:'Active' },
  organs_allocated:  { cls:'badge-blue',   label:'Allocated' },
  expired:           { cls:'badge-gray',   label:'Expired' },
  withdrawn:         { cls:'badge-red',    label:'Withdrawn' },
}

export default function Donors() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [typeFilter, setType] = useState('')
  const [bgFilter, setBg]     = useState('')

  const filtered = MOCK.filter((d) => {
    if (typeFilter && d.donor_type !== typeFilter) return false
    if (bgFilter   && d.blood_group !== bgFilter)  return false
    if (search && !d.full_name.toLowerCase().includes(search.toLowerCase()) && !String(d.donor_id).includes(search)) return false
    return true
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-16">
        <div className="flex gap-8">
          <input className="form-control" placeholder="Search donors…" style={{ width:200 }} value={search} onChange={(e)=>setSearch(e.target.value)} />
          <select className="form-control" style={{ width:'auto' }} value={typeFilter} onChange={(e)=>setType(e.target.value)}>
            <option value="">All Types</option><option value="deceased">Deceased</option><option value="living">Living</option>
          </select>
          <select className="form-control" style={{ width:'auto' }} value={bgFilter} onChange={(e)=>setBg(e.target.value)}>
            <option value="">All Blood Groups</option>{BLOOD_GROUPS.map(b=><option key={b}>{b}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={()=>navigate('/register-donor')}>+ Register Donor</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Donor ID</th><th>Name</th><th>Type</th><th>Age / Sex</th><th>Blood</th><th>Hospital</th><th>Organs</th><th>Status</th><th>Registered</th></tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const s = STATUS_MAP[d.status] || { cls:'badge-gray', label:d.status }
                return (
                  <tr key={d.donor_id} style={{ cursor:'pointer' }} onClick={()=>{}}>
                    <td style={{ fontFamily:'var(--mono)', color:'var(--text2)' }}>D-{d.donor_id}</td>
                    <td style={{ fontWeight:500 }}>{d.full_name}</td>
                    <td><span className={`badge ${d.donor_type==='deceased' ? 'badge-red' : 'badge-blue'}`}>{d.donor_type.charAt(0).toUpperCase()+d.donor_type.slice(1)}</span></td>
                    <td>{d.age} / {d.sex}</td>
                    <td><strong>{d.blood_group}</strong></td>
                    <td>{d.hospital}</td>
                    <td className="flex gap-4" style={{ flexWrap:'wrap', gap:4 }}>{d.organs.map(o=><OrganPill key={o} type={o} />)}</td>
                    <td><span className={`badge ${s.cls} badge-dot`}>{s.label}</span></td>
                    <td className="text-muted">{d.created_at}</td>
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
