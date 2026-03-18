import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import OrganPill from '../components/ui/OrganPill'
import { formatTime } from '../utils/formatters'

const STATUS_BADGE={declined:'badge-red',pending:'badge-amber',timeout:'badge-red',accepted:'badge-green',cancelled:'badge-gray'}
const STATUS_LABEL={declined:'Declined',pending:'Pending',timeout:'Timed Out',accepted:'Accepted',cancelled:'Cancelled'}
const STATUS_ICON ={declined:'✗',pending:'⏳',timeout:'⏰',accepted:'✓',cancelled:'—'}

function parseJson(val){if(!val||typeof val==='object')return val||{};try{return JSON.parse(val)}catch{return{}}}
function normalize(o){return{...o,organ:parseJson(o.organ),recipient:parseJson(o.recipient),receiving_hospital:parseJson(o.receiving_hospital)}}

function LiveTimer({deadlineISO}){
  const [secs,setSecs]=useState(0)
  useEffect(()=>{
    if(!deadlineISO)return
    const calc=()=>setSecs(Math.max(0,Math.floor((new Date(deadlineISO)-Date.now())/1000)))
    calc();const id=setInterval(calc,1000);return()=>clearInterval(id)
  },[deadlineISO])
  if(!deadlineISO)return<span style={{fontFamily:'var(--mono)'}}>——</span>
  if(secs===0)return<span style={{fontFamily:'var(--mono)',color:'var(--red)',fontWeight:700}}>EXPIRED</span>
  const color=secs<3600?'var(--red)':secs<7200?'var(--amber)':'var(--text)'
  return<span style={{fontFamily:'var(--mono)',color,fontWeight:700}}>{formatTime(secs)}</span>
}

function Spinner(){return<div className="spinner-page"><div className="spinner"/><span>Loading…</span></div>}

export default function OfferWorkflow(){
  const {request}=useApi()
  const [offers,setOffers]=useState([])
  const [activeOffer,setActiveOffer]=useState(null)
  const [cascade,setCascade]=useState([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [actionLoading,setActionLoading]=useState(false)

  async function loadOffers(){
    setLoading(true);setError('')
    try{
      const data=await request('GET','/api/offers?limit=20')
      const raw=data?.offers||[]
      const norm=raw.map(normalize)
      setOffers(norm)
      const pending=norm.find(o=>o.status==='pending')
      if(pending){
        setActiveOffer(pending)
        const cascData=await request('GET',`/api/offers/${pending.offer_id}/cascade`).catch(()=>({offers:[]}))
        setCascade(cascData?.offers||[])
      }
    }catch(e){setError(e.message)}
    finally{setLoading(false)}
  }

  useEffect(()=>{loadOffers()},[])

  async function handleAccept(offerId){
    if(!window.confirm('Accept this offer? This will allocate the organ and create a transplant record.'))return
    setActionLoading(true)
    try{
      await request('POST',`/api/offers/${offerId}/accept`,{surgeon_name:'Dr. On-Call'})
      await loadOffers()
    }catch(e){alert('Accept failed: '+(e.message||'Unknown error'))}
    finally{setActionLoading(false)}
  }

  async function handleDecline(offerId){
    if(!window.confirm('Decline this offer?'))return
    setActionLoading(true)
    try{
      await request('POST',`/api/offers/${offerId}/decline`,{reason:'Hospital capacity unavailable'})
      await loadOffers()
    }catch(e){alert('Decline failed: '+(e.message||'Unknown error'))}
    finally{setActionLoading(false)}
  }

  const pendingOffers=offers.filter(o=>o.status==='pending')
  const historyOffers=offers.filter(o=>o.status!=='pending')

  return(
    <div>
      <div className="page-header mb-24">
        <div>
          <h1 className="page-title">Offer <span>Workflow</span></h1>
          <p className="page-subtitle">Accept or decline organ offers · 4-hour response window enforced</p>
        </div>
        {pendingOffers.length>0&&(
          <span className="badge badge-amber" style={{fontSize:13,padding:'6px 14px'}}>
            {pendingOffers.length} offer{pendingOffers.length>1?'s':''} awaiting response
          </span>
        )}
      </div>

      {error&&<div style={{background:'var(--red-bg)',border:'1px solid #fca5a5',borderRadius:12,padding:'12px 16px',color:'var(--red)',fontSize:13,marginBottom:16}}>{error}</div>}

      <div className="grid-2-1" style={{alignItems:'start'}}>
        {/* Offer list */}
        <div>
          {/* Active offers */}
          {pendingOffers.length>0&&(
            <>
              <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'var(--text3)',marginBottom:12}}>
                Active Offers — Awaiting Response
              </div>
              {pendingOffers.map(offer=>{
                const organ=offer.organ||{}
                const recip=offer.recipient||{}
                const hosp =offer.receiving_hospital||{}
                return(
                  <div key={offer.offer_id} className="card mb-16" style={{borderLeft:'4px solid var(--amber)',boxShadow:'0 4px 20px rgba(217,119,6,0.12)'}}>
                    <div className="card-header" style={{background:'rgba(217,119,6,0.04)'}}>
                      <div className="flex items-center gap-10">
                        <span style={{fontWeight:700,fontSize:14}}>Offer #{offer.offer_id}</span>
                        <span className="badge badge-amber">Pending Response</span>
                        <OrganPill type={organ.organ_type||offer.organ_type}/>
                      </div>
                      <div className="flex items-center gap-8">
                        <span style={{fontSize:11,color:'var(--text3)'}}>Time remaining:</span>
                        <LiveTimer deadlineISO={offer.response_deadline}/>
                      </div>
                    </div>
                    <div style={{padding:'16px 20px'}}>
                      <div className="donor-recip-grid mb-16">
                        <div className="data-card">
                          <div className="data-card-title"><span style={{width:8,height:8,borderRadius:'50%',background:'var(--blue)',display:'inline-block'}}/>Offering Hospital</div>
                          <div className="data-row"><span className="data-row-key">Hospital</span><span className="data-row-val" style={{fontSize:12}}>{offer.offering_hospital?.name||`H-${offer.offering_hospital_id}`}</span></div>
                          <div className="data-row"><span className="data-row-key">Organ ID</span><span className="data-row-val" style={{fontFamily:'var(--mono)',fontSize:12}}>ORG-{offer.organ_id}</span></div>
                        </div>
                        <div className="data-card">
                          <div className="data-card-title"><span style={{width:8,height:8,borderRadius:'50%',background:'var(--green)',display:'inline-block'}}/>Your Recipient</div>
                          <div className="data-row"><span className="data-row-key">Recipient</span><span className="data-row-val">{recip.full_name||`R-${offer.recipient_id}`}</span></div>
                          <div className="data-row"><span className="data-row-key">Hospital</span><span className="data-row-val" style={{fontSize:12}}>{hosp.name||`H-${offer.receiving_hospital_id}`}</span></div>
                        </div>
                      </div>
                      <div className="flex gap-12 justify-end">
                        <button className="btn btn-red" onClick={()=>handleDecline(offer.offer_id)} disabled={actionLoading}>
                          {actionLoading?'…':'✗ Decline'}
                        </button>
                        <button className="btn btn-green" onClick={()=>handleAccept(offer.offer_id)} disabled={actionLoading}>
                          {actionLoading?'…':'✓ Accept Offer'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {pendingOffers.length===0&&!loading&&(
            <div className="card mb-20" style={{padding:'20px'}}>
              <div className="empty-state" style={{padding:'16px 0'}}>
                <div style={{fontSize:28}}>📭</div>
                <div className="empty-title" style={{fontSize:13}}>No active offers</div>
                <div className="empty-sub" style={{fontSize:11}}>New organ offers will appear here automatically when matched organs become available.</div>
              </div>
            </div>
          )}

          {/* History */}
          {historyOffers.length>0&&(
            <>
              <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:'var(--text3)',margin:'20px 0 12px'}}>
                Offer History
              </div>
              <div className="card">
                <div className="table-wrap" style={{border:'none'}}>
                  <table>
                    <thead><tr><th>Offer</th><th>Organ</th><th>Recipient</th><th>Status</th><th>Responded</th></tr></thead>
                    <tbody>
                      {historyOffers.map(o=>{
                        const organ=o.organ||{}
                        const recip=o.recipient||{}
                        return(
                          <tr key={o.offer_id}>
                            <td style={{fontFamily:'var(--mono)',fontWeight:700,fontSize:12}}>#{o.offer_id}</td>
                            <td><OrganPill type={organ.organ_type||o.organ_type}/></td>
                            <td>
                              <div style={{fontSize:13,fontWeight:600}}>{recip.full_name||`R-${o.recipient_id}`}</div>
                              <div style={{fontSize:11,color:'var(--text3)'}}>{o.receiving_hospital?.name||''}</div>
                            </td>
                            <td>
                              <span className={`badge ${STATUS_BADGE[o.status]||'badge-gray'}`}>
                                {STATUS_ICON[o.status]} {STATUS_LABEL[o.status]||o.status}
                              </span>
                            </td>
                            <td style={{fontSize:12,color:'var(--text2)'}}>
                              {o.responded_at?new Date(o.responded_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {loading&&<Spinner/>}
        </div>

        {/* Right panel: cascade timeline */}
        <div className="flex flex-col gap-16">
          <div className="card">
            <div className="card-header"><span className="card-title">Offer Cascade Timeline</span></div>
            <div style={{padding:'16px 20px'}}>
              {activeOffer?(
                <div className="offer-timeline">
                  {[activeOffer,...(cascade||[])].map((o,i)=>{
                    const isDone=o.status==='accepted'||o.status==='declined'||o.status==='timeout'
                    const isActive=o.status==='pending'
                    const dotCls=isDone&&o.status==='accepted'?'done':isDone?'declined':isActive?'active':''
                    return(
                      <div key={i} className="timeline-item">
                        <div className={`timeline-dot ${dotCls}`}>
                          {o.status==='accepted'&&<svg viewBox="0 0 12 12" fill="white" style={{width:8,height:8}}><path d="M10 3L5 8 2 5"/></svg>}
                          {(o.status==='declined'||o.status==='timeout')&&<svg viewBox="0 0 12 12" fill="white" style={{width:8,height:8}}><path d="M9 3L3 9M3 3l6 6"/></svg>}
                        </div>
                        <div style={{paddingLeft:4}}>
                          <div className="flex items-center gap-8 mb-3">
                            <span style={{fontSize:13,fontWeight:600}}>Offer #{o.offer_id}</span>
                            <span className={`badge ${STATUS_BADGE[o.status]||'badge-gray'}`} style={{fontSize:10}}>{STATUS_LABEL[o.status]||o.status}</span>
                            {isActive&&<span className="badge badge-amber" style={{fontSize:10}}>ACTIVE</span>}
                          </div>
                          <div style={{fontSize:12,color:'var(--text2)'}}>
                            {o.receiving_hospital?.name||`Hospital #${o.receiving_hospital_id}`}
                          </div>
                          {isActive&&<div style={{marginTop:8}}><LiveTimer deadlineISO={o.response_deadline}/></div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ):(
                <div className="empty-state" style={{padding:'20px 0'}}>
                  <div style={{fontSize:24}}>📊</div>
                  <div className="empty-title">No active cascade</div>
                </div>
              )}
            </div>
          </div>

          {/* How it works */}
          <div className="card">
            <div className="card-header"><span className="card-title">How Offers Work</span></div>
            <div style={{padding:'14px 18px'}}>
              {[
                {icon:'🎯',text:'Match engine ranks recipients by score'},
                {icon:'📨',text:'Offer sent to top-ranked hospital'},
                {icon:'⏰',text:'4-hour response window starts'},
                {icon:'✅',text:'Accept → organ allocated, transplant record created'},
                {icon:'❌',text:'Decline or timeout → offer cascades to #2'},
                {icon:'🔒',text:'Accept is ACID-guaranteed via stored procedure'},
              ].map((s,i)=>(
                <div key={i} className="flex items-center gap-10" style={{padding:'7px 0',borderBottom:i<5?'1px solid var(--border)':'none',fontSize:12.5}}>
                  <span style={{fontSize:16,flexShrink:0}}>{s.icon}</span>
                  <span style={{color:'var(--text2)'}}>{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}