import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import OrganPill from '../components/ui/OrganPill'
import { urgencyClass } from '../utils/formatters'
import { ORGAN_TYPES } from '../utils/constants'

function Spinner(){return<div className="spinner-page"><div className="spinner"/><span>Loading…</span></div>}

const BLOOD_GROUPS=['A+','A-','B+','B-','AB+','AB-','O+','O-']

export default function WaitingList(){
  const {request}=useApi()
  const [recipients,setRecipients]=useState([])
  const [counts,setCounts]=useState({})
  const [organFilter,setOrgan]=useState('')
  const [bgFilter,setBg]=useState('')
  const [urgFilter,setUrg]=useState('')
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  useEffect(()=>{
    async function load(){
      setLoading(true);setError('')
      try{
        const [listData,countData]=await Promise.all([
          request('GET','/api/recipients/waiting-list'),
          request('GET','/api/analytics/waiting-list-counts'),
        ])
        setRecipients(listData?.recipients||[])
        setCounts(countData?.counts||{})
      }catch(e){setError(e.message)}
      finally{setLoading(false)}
    }
    load()
  },[])

  const filtered=recipients.filter(r=>{
    if(organFilter&&r.organ_needed!==organFilter)return false
    if(bgFilter&&r.blood_group!==bgFilter)return false
    if(urgFilter&&r.medical_urgency!==urgFilter)return false
    return true
  })

  const urgColors={status_1a:'#fef2f2',status_1b:'#fffbeb',status_2:'#eff6ff',status_3:'transparent'}
  const urgBorder={status_1a:'#fecaca',status_1b:'#fde68a',status_2:'#bfdbfe',status_3:'transparent'}

  return(
    <div>
      <div className="page-header mb-24">
        <div>
          <h1 className="page-title">Waiting <span>List</span></h1>
          <p className="page-subtitle">Priority-ordered recipients awaiting transplant by urgency score</p>
        </div>
      </div>

      {/* Organ KPI row */}
      <div className="grid-4 mb-24">
        {[
          {label:'Kidney',value:counts.kidney??'—',wait:counts.kidney_avg_wait,color:'#0d6efd'},
          {label:'Heart', value:counts.heart??'—', wait:counts.heart_avg_wait, color:'#dc2626'},
          {label:'Liver', value:counts.liver??'—', wait:counts.liver_avg_wait, color:'#d97706'},
          {label:'Lung',  value:counts.lung??'—',  wait:counts.lung_avg_wait,  color:'#7c3aed'},
        ].map((k,i)=>(
          <div key={i} className="kpi-card" style={{'--kpi-color':k.color,animationDelay:`${i*0.06}s`}}>
            <div className="kpi-label">{k.label} Recipients</div>
            <div className="kpi-value">{k.value}</div>
            {k.wait?<div className="kpi-delta warn">Avg wait: {k.wait} mo</div>:null}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            Waiting List — Priority Order
            {filtered.length>0&&<span style={{color:'var(--text3)',fontWeight:400,fontSize:12}}> · {filtered.length} recipients</span>}
          </span>
          <div className="flex gap-8 flex-wrap">
            <select className="form-control" style={{width:'auto',fontSize:12,padding:'6px 12px'}} value={organFilter} onChange={e=>setOrgan(e.target.value)}>
              <option value="">All Organs</option>
              {ORGAN_TYPES.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
            <select className="form-control" style={{width:'auto',fontSize:12,padding:'6px 12px'}} value={bgFilter} onChange={e=>setBg(e.target.value)}>
              <option value="">All Blood Groups</option>
              {BLOOD_GROUPS.map(b=><option key={b}>{b}</option>)}
            </select>
            <select className="form-control" style={{width:'auto',fontSize:12,padding:'6px 12px'}} value={urgFilter} onChange={e=>setUrg(e.target.value)}>
              <option value="">All Urgency</option>
              <option value="status_1a">Status 1A</option>
              <option value="status_1b">Status 1B</option>
              <option value="status_2">Status 2</option>
              <option value="status_3">Status 3</option>
            </select>
          </div>
        </div>

        {error&&<div style={{color:'var(--red)',fontSize:12,padding:'12px 20px'}}>{error}</div>}

        {loading?<Spinner/>:(
          <div className="table-wrap" style={{border:'none'}}>
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Recipient</th><th>Organ</th><th>Urgency</th>
                  <th>Blood</th><th>PRA</th><th>Hospital</th><th>Wait</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r,idx)=>{
                  const rank=idx+1
                  const isUrgent=r.medical_urgency==='status_1a'
                  return(
                    <tr key={r.recipient_id} style={{background:urgColors[r.medical_urgency]||'',borderLeft:isUrgent?`3px solid #dc2626`:'3px solid transparent'}}>
                      <td style={{fontFamily:'var(--mono)',fontWeight:800,fontSize:13,color:isUrgent?'var(--red)':'var(--text3)'}}>{rank}</td>
                      <td>
                        <div style={{fontWeight:600,fontSize:13}}>R-{r.recipient_id}</div>
                        <div style={{fontSize:11,color:'var(--text3)'}}>{r.full_name}</div>
                      </td>
                      <td><OrganPill type={r.organ_needed}/></td>
                      <td>
                        <span className={urgencyClass(r.medical_urgency)}>
                          {r.medical_urgency?.replace('status_','STATUS ').toUpperCase()}
                        </span>
                      </td>
                      <td><span style={{fontFamily:'var(--mono)',fontWeight:600,fontSize:12}}>{r.blood_group}</span></td>
                      <td>
                        <span className={`badge ${r.pra_percent>=70?'badge-red':r.pra_percent>=30?'badge-amber':'badge-green'}`}>
                          {r.pra_percent}%
                        </span>
                      </td>
                      <td style={{fontSize:12,color:'var(--text2)'}}>{r.hospital_name||r.hospital?.name||'—'}</td>
                      <td style={{fontFamily:'var(--mono)',fontSize:12}}>{r.wait_months!=null?`${r.wait_months}mo`:'—'}</td>
                    </tr>
                  )
                })}
                {!filtered.length&&(
                  <tr><td colSpan={8}><div className="empty-state" style={{padding:'40px 0'}}><div style={{fontSize:24}}>📋</div><div className="empty-title">No recipients found</div><div className="empty-sub">Try adjusting the filters</div></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
