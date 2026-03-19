import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import OrganPill from '../components/ui/OrganPill'

function getOrganList(d) {
  if (d.organs_csv) return d.organs_csv.split(',').filter(Boolean)
  if (typeof d.organs === 'string') return d.organs.split(',').filter(Boolean)
  if (Array.isArray(d.organs)) return d.organs.map(o => o.organ_type || o).filter(Boolean)
  return []
}

function Spinner(){return<div className="spinner-page"><div className="spinner"/><span>Loading…</span></div>}

const STATUS_CLS={active:'badge-green',organs_allocated:'badge-blue',expired:'badge-red',withdrawn:'badge-gray'}
const PREVIEW_ROWS = 5

export default function Donors(){
  const navigate=useNavigate()
  const {request}=useApi()
  const [donors,setDonors]=useState([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [search,setSearch]=useState('')
  const [statusFilter,setStatus]=useState('')
  const [expanded,setExpanded]=useState(false)

  useEffect(()=>{
    request('GET','/api/donors')
      .then(d=>setDonors(d?.donors||d?.data||[]))
      .catch(e=>setError(e.message))
      .finally(()=>setLoading(false))
  },[])

  const filtered=donors.filter(d=>{
    const q=search.toLowerCase()
    if(q&&!d.full_name?.toLowerCase().includes(q)&&!String(d.donor_id).includes(q))return false
    if(statusFilter==='organs_allocated'){if(!(Number(d.organs_donated_count)>0))return false}
    else if(statusFilter&&d.status!==statusFilter)return false
    return true
  })

  // Always show all rows when searching so results aren't hidden by fade
  const showAll = expanded || search.trim() !== '' || statusFilter !== ''
  const visibleRows = showAll ? filtered : filtered.slice(0, PREVIEW_ROWS)
  const hiddenCount = filtered.length - PREVIEW_ROWS

  const stats={
    total:donors.length,
    active:donors.filter(d=>d.status==='active').length,
    donated:donors.reduce((sum,d)=>sum+(Number(d.organs_donated_count)||0),0),
  }

  return(
    <div>
      <div className="page-header mb-24">
        <div>
          <h1 className="page-title">Donor <span>Registry</span></h1>
          <p className="page-subtitle">All registered donors and their organ availability status</p>
        </div>
        <button className="btn btn-primary" onClick={()=>navigate('/register-donor')}>
          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"/></svg>
          Register Donor
        </button>
      </div>

      <div className="grid-3 mb-24">
        {[
          {label:'Total Donors',   value:stats.total,   color:'#0d6efd'},
          {label:'Active',         value:stats.active,  color:'#16a34a'},
          {label:'Organs Donated', value:stats.donated, color:'#7c3aed'},
        ].map((k,i)=>(
          <div key={i} className="kpi-card" style={{'--kpi-color':k.color,animationDelay:`${i*0.06}s`}}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">All Donors</span>
          <div className="flex gap-8">
            <input className="form-control" style={{width:200,fontSize:12,padding:'6px 12px'}} placeholder="Search by name or ID…" value={search} onChange={e=>setSearch(e.target.value)}/>
            <select className="form-control" style={{width:'auto',fontSize:12,padding:'6px 12px'}} value={statusFilter} onChange={e=>setStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="organs_allocated">Has Donated Organs</option>
              <option value="expired">Expired</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>
        </div>

        {error&&<div style={{color:'var(--red)',fontSize:12,padding:'12px 20px'}}>{error}</div>}

        {loading?<Spinner/>:(
          <div style={{position:'relative'}}>
            <div className="table-wrap" style={{border:'none'}}>
              <table>
                <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Blood</th><th>Age</th><th>Organs</th><th>Donated</th><th>Status</th><th>Registered</th></tr></thead>
                <tbody>
                  {visibleRows.map(d=>(
                    <tr key={d.donor_id}>
                      <td style={{fontFamily:'var(--mono)',fontWeight:700,fontSize:12}}>D-{d.donor_id}</td>
                      <td><div style={{fontWeight:600,fontSize:13}}>{d.full_name}</div></td>
                      <td><span className={`badge ${d.donor_type==='deceased'?'badge-red':'badge-blue'}`}>{d.donor_type}</span></td>
                      <td><span style={{fontFamily:'var(--mono)',fontWeight:600,fontSize:12}}>{d.blood_group}</span></td>
                      <td style={{fontSize:13}}>{d.age}</td>
                      <td>
                        <div className="flex gap-4 flex-wrap">
                          {getOrganList(d).slice(0,3).map((o,i)=><OrganPill key={i} type={o}/>)}
                          {getOrganList(d).length>3 && <span className="badge badge-gray">+{getOrganList(d).length-3} more</span>}
                        </div>
                      </td>
                      <td>
                        {Number(d.organs_donated_count) > 0
                          ? <span className="badge badge-blue" style={{fontFamily:'var(--mono)',fontWeight:700}}>{d.organs_donated_count} ✓</span>
                          : <span style={{color:'var(--text3)',fontSize:12}}>—</span>
                        }
                      </td>
                      <td><span className={`badge ${STATUS_CLS[d.status]||'badge-gray'}`}>{d.status?.replace('_',' ')}</span></td>
                      <td style={{fontSize:11,color:'var(--text3)'}}>{d.created_at?new Date(d.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—'}</td>
                    </tr>
                  ))}
                  {!filtered.length&&(
                    <tr><td colSpan={9}><div className="empty-state" style={{padding:'40px 0'}}><div style={{fontSize:24}}>👤</div><div className="empty-title">No donors found</div><div className="empty-sub">Register the first donor to start the matching process</div></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Fade + View More — only shown when not searching and there are hidden rows */}
            {!showAll && hiddenCount > 0 && (
              <div style={{
                position:'relative',
                marginTop: -80,
                height: 100,
                background: 'linear-gradient(to bottom, transparent, var(--surface) 80%)',
                display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:16,
              }}>
                <button
                  className="btn btn-outline"
                  style={{fontSize:12, gap:6}}
                  onClick={()=>setExpanded(true)}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" style={{width:14,height:14}}>
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                  View {hiddenCount} more donor{hiddenCount!==1?'s':''}
                </button>
              </div>
            )}
            {expanded && hiddenCount > 0 && (
              <div style={{display:'flex',justifyContent:'center',padding:'8px 0 16px'}}>
                <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>setExpanded(false)}>
                  Show less ↑
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
