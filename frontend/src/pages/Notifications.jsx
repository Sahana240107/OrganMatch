import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import { useNotifications } from '../context/NotificationContext'

const TYPE_CONFIG = {
  new_match:           { icon:'🎯', bg:'var(--blue-bg)',   color:'var(--blue)',   label:'New Match' },
  offer_sent:          { icon:'📨', bg:'var(--amber-bg)',  color:'var(--amber)',  label:'Offer Sent' },
  offer_accepted:      { icon:'✅', bg:'var(--green-bg)',  color:'var(--green)',  label:'Accepted' },
  offer_declined:      { icon:'❌', bg:'var(--red-bg)',    color:'var(--red)',    label:'Declined' },
  offer_timeout:       { icon:'⏰', bg:'var(--red-bg)',    color:'var(--red)',    label:'Timed Out' },
  donor_registered:    { icon:'👤', bg:'var(--purple-bg)', color:'var(--purple)', label:'Donor Registered' },
  urgency_updated:     { icon:'🚨', bg:'var(--amber-bg)',  color:'var(--amber)',  label:'Urgency Updated' },
  transplant_complete: { icon:'🏥', bg:'var(--green-bg)',  color:'var(--green)',  label:'Transplant Complete' },
  default:             { icon:'🔔', bg:'var(--bg3)',        color:'var(--text2)', label:'Notification' },
}

function timeAgo(iso){
  if(!iso)return''
  const diff=Date.now()-new Date(iso).getTime()
  const mins=Math.floor(diff/60000)
  if(mins<1)return'just now'
  if(mins<60)return`${mins}m ago`
  const hrs=Math.floor(mins/60)
  if(hrs<24)return`${hrs}h ago`
  return`${Math.floor(hrs/24)}d ago`
}

function Spinner(){return<div className="spinner-page"><div className="spinner"/><span>Loading…</span></div>}

export default function Notifications(){
  const {request}=useApi()
  const {markAllRead}=useNotifications()
  const [notifications,setNotifications]=useState([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [page,setPage]=useState(1)
  const [hasMore,setHasMore]=useState(false)

  async function load(p=1){
    if(p===1)setLoading(true)
    setError('')
    try{
      const data=await request('GET',`/api/notifications?page=${p}&limit=20`)
      const list=data?.notifications||[]
      setNotifications(prev=>p===1?list:[...prev,...list])
      setHasMore(data?.has_more||false)
    }catch(e){setError(e.message)}
    finally{setLoading(false)}
  }

  useEffect(()=>{load(1)},[])

  async function handleMarkAllRead(){
    try{
      await request('PATCH','/api/notifications/read-all')
      markAllRead()
      setNotifications(prev=>prev.map(n=>({...n,is_read:true})))
    }catch(e){console.error(e)}
  }

  async function handleMarkRead(id){
    try{
      await request('PATCH',`/api/notifications/${id}/read`)
      setNotifications(prev=>prev.map(n=>n.notification_id===id?{...n,is_read:true}:n))
    }catch(e){console.error(e)}
  }

  const unread=notifications.filter(n=>!n.is_read).length

  return(
    <div>
      <div className="page-header mb-24">
        <div>
          <h1 className="page-title">Notifications <span>Feed</span></h1>
          <p className="page-subtitle">Real-time alerts for matches, offers and transplant events</p>
        </div>
        <div className="flex gap-8 items-center">
          {unread>0&&<span className="badge badge-red">{unread} unread</span>}
          {unread>0&&(
            <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead}>
              Mark all read
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={()=>load(1)}>
            <svg viewBox="0 0 20 20" fill="currentColor" style={{width:13,height:13}}>
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {error&&<div style={{background:'var(--red-bg)',border:'1px solid #fca5a5',borderRadius:12,padding:'12px 16px',color:'var(--red)',fontSize:13,marginBottom:16}}>{error}</div>}

      <div className="card">
        {loading?<Spinner/>:(
          <>
            {notifications.length===0&&(
              <div className="empty-state" style={{padding:'60px 0'}}>
                <div className="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg></div>
                <div className="empty-title">No notifications yet</div>
                <div className="empty-sub">Register a donor to trigger the matching engine and receive alerts</div>
              </div>
            )}

            {notifications.map((n,i)=>{
              const cfg=TYPE_CONFIG[n.type]||TYPE_CONFIG.default
              const isUnread=!n.is_read
              return(
                <div
                  key={n.notification_id||i}
                  onClick={()=>!n.is_read&&handleMarkRead(n.notification_id)}
                  style={{
                    display:'flex',gap:14,padding:'14px 20px',
                    borderBottom:'1px solid var(--border)',
                    background:isUnread?'rgba(13,110,253,0.025)':'transparent',
                    cursor:isUnread?'pointer':'default',
                    transition:'background 0.15s',
                    borderLeft:isUnread?'3px solid var(--accent)':'3px solid transparent',
                  }}
                  onMouseEnter={e=>{if(isUnread)e.currentTarget.style.background='rgba(13,110,253,0.05)'}}
                  onMouseLeave={e=>{if(isUnread)e.currentTarget.style.background='rgba(13,110,253,0.025)'}}
                >
                  {/* Icon */}
                  <div style={{width:40,height:40,borderRadius:12,background:cfg.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>
                    {cfg.icon}
                  </div>

                  {/* Content */}
                  <div style={{flex:1,minWidth:0}}>
                    <div className="flex items-center gap-8 mb-3">
                      <span style={{fontSize:13.5,fontWeight:isUnread?700:600,color:'var(--text)'}}>{n.title}</span>
                      <span className="badge" style={{background:cfg.bg,color:cfg.color,fontSize:10}}>{cfg.label}</span>
                      {isUnread&&<span style={{width:6,height:6,borderRadius:'50%',background:'var(--accent)',flexShrink:0}}/>}
                    </div>
                    <div style={{fontSize:12.5,color:'var(--text2)',lineHeight:1.5}}>{n.body}</div>
                    {(n.related_organ_id||n.related_offer_id)&&(
                      <div className="flex gap-8 mt-6">
                        {n.related_organ_id&&<span className="info-pill">Organ #{n.related_organ_id}</span>}
                        {n.related_offer_id&&<span className="info-pill">Offer #{n.related_offer_id}</span>}
                      </div>
                    )}
                  </div>

                  {/* Time */}
                  <div style={{fontSize:11,color:'var(--text3)',whiteSpace:'nowrap',paddingTop:2,flexShrink:0}}>
                    {timeAgo(n.created_at||n.sent_at)}
                  </div>
                </div>
              )
            })}

            {hasMore&&(
              <div style={{textAlign:'center',padding:'16px'}}>
                <button className="btn btn-ghost btn-sm" onClick={()=>{const np=page+1;setPage(np);load(np)}}>
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
