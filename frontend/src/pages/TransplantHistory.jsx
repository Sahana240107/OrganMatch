import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import OrganPill from '../components/ui/OrganPill'

function Spinner(){return<div className="spinner-page"><div className="spinner"/><span>Loading…</span></div>}

const GRAFT_CLS={functioning:'badge-green',failed:'badge-red',patient_died:'badge-red',pending:'badge-amber',lost_to_follow_up:'badge-gray'}
const GRAFT_LABEL={functioning:'Functioning',failed:'Graft Failed',patient_died:'Patient Died',pending:'Pending',lost_to_follow_up:'Lost to Follow-up'}

export default function TransplantHistory(){
  const {request}=useApi()
  const [records,setRecords]=useState([])
  const [summary,setSummary]=useState(null)
  const [organFilter,setOrganFilter]=useState('')
  const [statusFilter,setStatusFilter]=useState('')
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  useEffect(()=>{
    async function load(){
      setLoading(true);setError('')
      try{
        const [histData,sumData]=await Promise.all([
          request('GET','/api/transplants?limit=50'),
          request('GET','/api/analytics/transplant-summary'),
        ])
        setRecords(histData?.records||histData?.transplants||[])
        setSummary(sumData)
      }catch(e){setError(e.message)}
      finally{setLoading(false)}
    }
    load()
  },[])

  const filtered=records.filter(r=>{
    if(organFilter&&r.organ_type!==organFilter)return false
    if(statusFilter&&r.graft_status!==statusFilter)return false
    return true
  })

  return(
    <div>
      <div className="page-header mb-24">
        <div>
          <h1 className="page-title">Transplant <span>History</span></h1>
          <p className="page-subtitle">Complete record of all transplants performed on this platform</p>
        </div>
      </div>

      {summary&&(
        <div className="grid-4 mb-24">
          {[
            {label:'Total Transplants',value:summary.total??'—',color:'#0d6efd'},
            {label:'Graft Survival',value:summary.survival_rate!=null?`${summary.survival_rate}%`:'—',color:'#16a34a'},
            {label:'Avg Cold Ischemia',value:summary.avg_ischemic_hours?`${summary.avg_ischemic_hours}h`:'—',color:'#d97706'},
            {label:'Graft Failures',value:summary.graft_failures??'—',color:'#dc2626'},
          ].map((k,i)=>(
            <div key={i} className="kpi-card" style={{'--kpi-color':k.color,animationDelay:`${i*0.06}s`}}>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value">{k.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            Transplant Records
            {filtered.length>0&&<span style={{color:'var(--text3)',fontWeight:400,fontSize:12}}> · {filtered.length} records</span>}
          </span>
          <div className="flex gap-8">
            <select className="form-control" style={{width:'auto',fontSize:12,padding:'6px 12px'}} value={organFilter} onChange={e=>setOrganFilter(e.target.value)}>
              <option value="">All Organs</option>
              {['kidney','heart','liver','lung','pancreas','cornea','bone','small_intestine'].map(o=><option key={o} value={o}>{o}</option>)}
            </select>
            <select className="form-control" style={{width:'auto',fontSize:12,padding:'6px 12px'}} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="functioning">Functioning</option>
              <option value="failed">Graft Failed</option>
              <option value="rejected">Rejected</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {error&&<div style={{color:'var(--red)',fontSize:12,padding:'12px 20px'}}>{error}</div>}

        {loading?<Spinner/>:(
          <div className="table-wrap" style={{border:'none'}}>
            <table>
              <thead><tr><th>TX ID</th><th>Organ</th><th>Donor</th><th>Recipient</th><th>Surgeon</th><th>Date</th><th>Score</th><th>Graft Status</th></tr></thead>
              <tbody>
                {filtered.map((r,i)=>(
                  <tr key={r.transplant_id||i}>
                    <td style={{fontFamily:'var(--mono)',fontWeight:700,fontSize:12}}>TX-{r.transplant_id}</td>
                    <td><OrganPill type={r.organ_type}/></td>
                    <td style={{fontSize:12}}>
                      <div style={{fontWeight:600}}>D-{r.donor_id}</div>
                      <div style={{color:'var(--text3)',fontSize:11}}>{r.donor_hospital||''}</div>
                    </td>
                    <td style={{fontSize:12}}>
                      <div style={{fontWeight:600}}>R-{r.recipient_id}</div>
                      <div style={{color:'var(--text3)',fontSize:11}}>{r.recipient_hospital||''}</div>
                    </td>
                    <td style={{fontSize:12,color:'var(--text2)'}}>{r.surgeon_name||'—'}</td>
                    <td style={{fontSize:12}}>{r.transplant_date?new Date(r.transplant_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—'}</td>
                    <td style={{fontFamily:'var(--mono)',fontWeight:700,fontSize:13}}>{r.total_score_at_match?Number(r.total_score_at_match).toFixed(1):'—'}</td>
                    <td><span className={`badge ${GRAFT_CLS[r.graft_status]||'badge-gray'}`}>{GRAFT_LABEL[r.graft_status]||r.graft_status||'—'}</span></td>
                  </tr>
                ))}
                {!filtered.length&&(
                  <tr><td colSpan={8}><div className="empty-state" style={{padding:'40px 0'}}><div style={{fontSize:24}}>📄</div><div className="empty-title">No transplant records</div><div className="empty-sub">Records appear here after offers are accepted</div></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
