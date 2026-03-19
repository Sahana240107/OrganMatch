import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import OrganPill from '../components/ui/OrganPill'
import { urgencyClass } from '../utils/formatters'

function Spinner(){return<div className="spinner-page"><div className="spinner"/><span>Loading…</span></div>}

const UL={'status_1a':'1A','status_1b':'1B','status_2':'2','status_3':'3'}
const STATUS_CLS={waiting:'badge-amber',offer_received:'badge-blue',transplanted:'badge-green',suspended:'badge-gray',removed:'badge-red'}
const PREVIEW_ROWS = 5

export default function Recipients(){
  const navigate=useNavigate()
  const {request}=useApi()
  const [recipients,setRecipients]=useState([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [search,setSearch]=useState('')
  const [urgFilter,setUrg]=useState('')
  const [organFilter,setOrgan]=useState('')
  const [expanded,setExpanded]=useState(false)

  const fetchRecipients = useCallback(() => {
    setLoading(true)
    const params = { limit: 500 }
    if (organFilter)  params.organ_needed    = organFilter
    if (urgFilter)    params.medical_urgency = urgFilter
    if (search)       params.search          = search
    request('GET', '/api/recipients', null, params)
      .then(d => setRecipients(d?.recipients || d?.data || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [organFilter, urgFilter, search, request])

  useEffect(() => {
    const timer = setTimeout(fetchRecipients, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [fetchRecipients])

  // Reset expanded when filters change
  useEffect(() => { setExpanded(false) }, [search, urgFilter, organFilter])

  const critical=recipients.filter(r=>r.medical_urgency==='status_1a'&&r.status==='waiting').length

  const showAll = expanded || search.trim() !== '' || urgFilter !== '' || organFilter !== ''
  const visibleRows = showAll ? recipients : recipients.slice(0, PREVIEW_ROWS)
  const hiddenCount = recipients.length - PREVIEW_ROWS

  return(
    <div>
      <div className="page-header mb-24">
        <div>
          <h1 className="page-title">Recipient <span>Registry</span></h1>
          <p className="page-subtitle">All patients awaiting organ transplant</p>
        </div>
        <div className="flex gap-8 items-center">
          {critical>0&&<span className="badge urg-1a" style={{fontSize:12,padding:'5px 12px'}}>🚨 {critical} Status 1A</span>}
          <button className="btn btn-primary" onClick={()=>navigate('/register-recipient')}>
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"/></svg>
            Add Recipient
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">All Recipients <span style={{color:'var(--text3)',fontWeight:400,fontSize:12}}>· {recipients.length}</span></span>
          <div className="flex gap-8">
            <input className="form-control" style={{width:200,fontSize:12,padding:'6px 12px'}} placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
            <select className="form-control" style={{width:'auto',fontSize:12,padding:'6px 12px'}} value={urgFilter} onChange={e=>setUrg(e.target.value)}>
              <option value="">All Urgency</option>
              <option value="status_1a">Status 1A</option>
              <option value="status_1b">Status 1B</option>
              <option value="status_2">Status 2</option>
              <option value="status_3">Status 3</option>
            </select>
            <select className="form-control" style={{width:'auto',fontSize:12,padding:'6px 12px'}} value={organFilter} onChange={e=>setOrgan(e.target.value)}>
              <option value="">All Organs</option>
              {['kidney','heart','liver','lung','pancreas','cornea'].map(o=>(
                <option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {error&&<div style={{color:'var(--red)',fontSize:12,padding:'12px 20px'}}>{error}</div>}

        {loading?<Spinner/>:(
          <div style={{position:'relative'}}>
            <div className="table-wrap" style={{border:'none'}}>
              <table>
                <thead><tr><th>ID</th><th>Name</th><th>Organ Needed</th><th>Urgency</th><th>Blood</th><th>PRA</th><th>Hospital</th><th>Waiting</th><th>Status</th></tr></thead>
                <tbody>
                  {visibleRows.map(r=>(
                    <tr key={r.recipient_id} style={{background:r.medical_urgency==='status_1a'?'#fef2f2':'',borderLeft:r.medical_urgency==='status_1a'?'3px solid #dc2626':'3px solid transparent'}}>
                      <td style={{fontFamily:'var(--mono)',fontWeight:700,fontSize:12}}>R-{r.recipient_id}</td>
                      <td><div style={{fontWeight:600,fontSize:13}}>{r.full_name}</div><div style={{fontSize:11,color:'var(--text3)'}}>{r.primary_diagnosis}</div></td>
                      <td><OrganPill type={r.organ_needed}/></td>
                      <td><span className={urgencyClass(r.medical_urgency)}>Status {UL[r.medical_urgency]||'?'}</span></td>
                      <td><span style={{fontFamily:'var(--mono)',fontWeight:600,fontSize:12}}>{r.blood_group}</span></td>
                      <td><span className={`badge ${r.pra_percent>=70?'badge-red':r.pra_percent>=30?'badge-amber':'badge-green'}`}>{r.pra_percent}%</span></td>
                      <td style={{fontSize:12,color:'var(--text2)'}}>{r.hospital_name||r.hospital?.name||`H-${r.hospital_id}`}</td>
                      <td style={{fontFamily:'var(--mono)',fontSize:12}}>{r.wait_months!=null?`${r.wait_months}mo`:'—'}</td>
                      <td><span className={`badge ${STATUS_CLS[r.status]||'badge-gray'}`}>{r.status}</span></td>
                    </tr>
                  ))}
                  {!recipients.length&&(
                    <tr><td colSpan={9}><div className="empty-state" style={{padding:'40px 0'}}><div style={{fontSize:24}}>👥</div><div className="empty-title">No recipients found</div></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {!showAll && hiddenCount > 0 && (
              <div style={{
                position:'relative', marginTop:-80, height:100,
                background:'linear-gradient(to bottom, transparent, var(--surface) 80%)',
                display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:16,
              }}>
                <button className="btn btn-outline" style={{fontSize:12,gap:6}} onClick={()=>setExpanded(true)}>
                  <svg viewBox="0 0 20 20" fill="currentColor" style={{width:14,height:14}}>
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                  View {hiddenCount} more recipient{hiddenCount!==1?'s':''}
                </button>
              </div>
            )}
            {expanded && hiddenCount > 0 && (
              <div style={{display:'flex',justifyContent:'center',padding:'8px 0 16px'}}>
                <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>setExpanded(false)}>Show less ↑</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
