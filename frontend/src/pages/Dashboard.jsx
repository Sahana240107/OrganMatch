import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chart, registerables } from 'chart.js'
import { useApi } from '../hooks/useApi'

Chart.register(...registerables)

const URGENCY_CLS = {
  status_1a:'badge urg-1a', status_1b:'badge urg-1b',
  status_2:'badge urg-2',   status_3:'badge urg-3',
}
const URGENCY_LABEL = { status_1a:'1A', status_1b:'1B', status_2:'2', status_3:'3' }
const ORGAN_ICONS   = { kidney:'🫘', heart:'❤️', liver:'🫀', lung:'🫁', pancreas:'🧬', cornea:'👁️', bone:'🦴', small_intestine:'🔬' }
const ORGAN_CLS     = { kidney:'organ-kidney', heart:'organ-heart', liver:'organ-liver', lung:'organ-lung', pancreas:'organ-pancreas', cornea:'organ-cornea', bone:'organ-bone', small_intestine:'organ-small_intestine' }

function Spinner() { return <div className="spinner-page"><div className="spinner"/><span>Loading…</span></div> }

function fmt(secs) {
  if (secs <= 0) return '00:00:00'
  return [Math.floor(secs/3600), Math.floor((secs%3600)/60), secs%60]
    .map(n => String(n).padStart(2,'0')).join(':')
}

// Safe fetch — never throws, returns null on error
async function safe(promise) {
  try { return await promise } catch { return null }
}

export default function Dashboard() {
  const navigate    = useNavigate()
  const { request } = useApi()
  const donutRef    = useRef(null); const lineRef      = useRef(null)
  const donutChart  = useRef(null); const lineChart    = useRef(null)

  const [kpis,        setKpis]        = useState(null)
  const [matches,     setMatches]     = useState([])
  const [activity,    setActivity]    = useState([])
  const [activeOffer, setActiveOffer] = useState(null)
  const [organCounts, setOrganCounts] = useState([])
  const [trend,       setTrend]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [secs,        setSecs]        = useState(0)

  useEffect(() => {
    if (!activeOffer?.response_deadline) return
    const calc = () => setSecs(Math.max(0, Math.floor((new Date(activeOffer.response_deadline) - Date.now()) / 1000)))
    calc(); const id = setInterval(calc, 1000); return () => clearInterval(id)
  }, [activeOffer])

  async function load() {
    setLoading(true)
    // Each request is independent — one failure won't block others
    const [kpiData, matchData, notifData, offerData, analyticsData] = await Promise.all([
      safe(request('GET', '/api/analytics/summary')),
      safe(request('GET', '/api/matches/recent')),
      safe(request('GET', '/api/notifications?limit=6')),
      safe(request('GET', '/api/offers/pending?limit=1')),
      safe(request('GET', '/api/analytics/trends')),
    ])
    if (kpiData)       setKpis(kpiData)
    if (matchData)     setMatches(matchData?.matches || [])
    if (notifData)     setActivity(notifData?.notifications || [])
    if (offerData)     setActiveOffer(offerData?.offers?.[0] || null)
    if (analyticsData) {
      setOrganCounts(analyticsData?.organ_counts || [])
      setTrend(analyticsData?.daily_trend || [])
    }
    setLoading(false)
  }

  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id) }, [])

  useEffect(() => {
    if (!organCounts.length || !donutRef.current) return
    donutChart.current?.destroy()
    const colors = ['#0d6efd','#dc2626','#d97706','#0891b2','#7c3aed','#e11d48','#64748b','#16a34a']
    donutChart.current = new Chart(donutRef.current, {
      type: 'doughnut',
      data: {
        labels: organCounts.map(o => o.organ_type),
        datasets: [{ data: organCounts.map(o => o.count), backgroundColor: colors, borderColor:'#fff', borderWidth:2 }],
      },
      options: { responsive:true, maintainAspectRatio:false, cutout:'68%',
        plugins: { legend: { position:'right', labels:{ color:'#4a5980', font:{size:11}, boxWidth:10, padding:10 } } } },
    })
    return () => { donutChart.current?.destroy(); donutChart.current = null }
  }, [organCounts])

  useEffect(() => {
    if (!trend.length || !lineRef.current) return
    lineChart.current?.destroy()
    lineChart.current = new Chart(lineRef.current, {
      type: 'line',
      data: {
        labels: trend.map(t => t.label),
        datasets: [
          { label:'Transplants', data:trend.map(t=>t.transplants), borderColor:'#0d6efd', backgroundColor:'rgba(13,110,253,0.08)', borderWidth:2, fill:true, tension:0.4, pointBackgroundColor:'#0d6efd', pointRadius:3 },
          { label:'Donors',      data:trend.map(t=>t.donors||0),   borderColor:'#16a34a', backgroundColor:'rgba(22,163,74,0.06)',  borderWidth:2, fill:true, tension:0.4, pointBackgroundColor:'#16a34a', pointRadius:3 },
        ],
      },
      options: { responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ labels:{ color:'#4a5980', font:{size:11}, boxWidth:10 } } },
        scales:{
          x:{ grid:{ color:'rgba(15,30,70,0.06)' }, ticks:{ color:'#9aa3bc', font:{size:10} } },
          y:{ grid:{ color:'rgba(15,30,70,0.06)' }, ticks:{ color:'#9aa3bc', font:{size:10} }, beginAtZero:true },
        },
      },
    })
    return () => { lineChart.current?.destroy(); lineChart.current = null }
  }, [trend])

  return (
    <div>
      <div className="page-header mb-24">
        <div>
          <h1 className="page-title">Command <span>Center</span></h1>
          <p className="page-subtitle">Live transplant coordination dashboard · Auto-refreshes every 30s</p>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/register-donor')}>+ Register Donor</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/matching')}>Run Matching</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4 mb-24">
        {[
          { label:'Active Organs',       value:kpis?.active_organs??'—',      color:'#0d6efd',
            icon:<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/></svg> },
          { label:'Waiting Recipients',  value:kpis?.waiting_recipients??'—', color:'#7c3aed',
            icon:<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17.555 16.549A9.97 9.97 0 0110 19a9.97 9.97 0 01-7.555-3.451A2 2 0 014 13h12a2 2 0 012 3l-.445-.451z"/></svg> },
          { label:'Pending Offers',      value:kpis?.pending_offers??'—',     color:'#d97706',
            icon:<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg> },
          { label:'Total Transplants',   value:kpis?.total_transplants??'—',  color:'#16a34a',
            icon:<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg> },
        ].map((k,i) => (
          <div key={i} className="kpi-card" style={{'--kpi-color':k.color, animationDelay:`${i*0.06}s`}}>
            <div className="flex items-center justify-between">
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-icon">{k.icon}</div>
            </div>
            <div className="kpi-value">{k.value}</div>
            {k.label==='Waiting Recipients' && kpis?.status_1a > 0 && (
              <div className="kpi-delta warn">🚨 {kpis.status_1a} Status 1A critical</div>
            )}
          </div>
        ))}
      </div>

      <div className="grid-2-1 mb-20">
        {/* Recent Matches */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Matches</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/matching')}>View All →</button>
          </div>
          {loading ? <Spinner /> : (
            <div className="table-wrap" style={{border:'none'}}>
              <table>
                <thead><tr><th>Organ</th><th>Recipient</th><th>Hospital</th><th>Score</th><th>Urgency</th></tr></thead>
                <tbody>
                  {matches.map((m,i) => (
                    <tr key={i} style={{cursor:'pointer'}} onClick={() => navigate('/matching')}>
                      <td><span className={`organ-pill ${ORGAN_CLS[m.organ_type]||''}`}>{ORGAN_ICONS[m.organ_type]||'🫀'} {m.organ_type}</span></td>
                      <td><div style={{fontWeight:600,fontSize:13}}>R-{m.recipient_id}</div><div style={{fontSize:11,color:'var(--text3)'}}>{m.recipient_blood||'—'}</div></td>
                      <td style={{fontSize:12,color:'var(--text2)'}}>{m.hospital}</td>
                      <td>
                        <div className="flex items-center gap-8">
                          <div style={{width:60}}><div className="score-bar"><div className="score-bar-fill" style={{width:`${Math.min(100,m.total_score)}%`,background:'#0d6efd'}}/></div></div>
                          <span style={{fontFamily:'var(--mono)',fontSize:12,fontWeight:700}}>{Number(m.total_score).toFixed(0)}</span>
                        </div>
                      </td>
                      <td><span className={URGENCY_CLS[m.medical_urgency]||'badge badge-gray'}>{URGENCY_LABEL[m.medical_urgency]||'—'}</span></td>
                    </tr>
                  ))}
                  {!matches.length && !loading && (
                    <tr><td colSpan={5} style={{textAlign:'center',color:'var(--text3)',padding:32,fontSize:13}}>
                      No matches yet — register a donor organ to trigger matching
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-16">
          {/* Offer countdown */}
          <div className="card" style={{padding:'20px',textAlign:'center'}}>
            {activeOffer ? (
              <>
                <div style={{fontSize:11,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:8,fontWeight:600}}>
                  ⚡ Active Offer · {activeOffer.organ?.organ_type || 'Organ'}
                </div>
                <div className={`timer-time${secs<3600?' timer-critical':''}`} style={{fontSize:28,fontWeight:800,fontFamily:'var(--mono)',color:secs<3600?'var(--red)':'var(--text)'}}>
                  {fmt(secs)}
                </div>
                <div style={{fontSize:11,color:'var(--text3)',marginTop:6,textTransform:'uppercase',letterSpacing:'0.8px'}}>Time Remaining to Respond</div>
                <button className="btn btn-primary btn-sm" style={{marginTop:14,width:'100%',justifyContent:'center'}} onClick={() => navigate('/offers')}>
                  View Offer →
                </button>
              </>
            ) : (
              <div style={{padding:'16px 0'}}>
                <div style={{fontSize:32,marginBottom:8}}>⏰</div>
                <div style={{fontSize:13,color:'var(--text2)',fontWeight:500}}>No Active Offers</div>
                <div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>Register a donor to trigger matching</div>
              </div>
            )}
          </div>

          {/* Donut chart */}
          <div className="card">
            <div className="card-header"><span className="card-title">Transplants by Organ</span></div>
            <div style={{padding:'16px 18px',height:200,position:'relative'}}>
              {loading ? <Spinner /> : organCounts.length > 0
                ? <canvas ref={donutRef}/>
                : <div className="empty-state" style={{padding:'20px 0'}}><div style={{color:'var(--text3)',fontSize:12}}>No transplant data yet</div></div>
              }
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Activity Feed */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Activity Feed</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/notifications')}>All →</button>
          </div>
          <div style={{padding:'4px 0'}}>
            {loading ? <Spinner /> : activity.length > 0 ? activity.map((n,i) => (
              <div key={i} style={{display:'flex',gap:12,padding:'11px 20px',borderBottom:'1px solid var(--border)'}}
                onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'}
                onMouseLeave={e=>e.currentTarget.style.background=''}>
                <div style={{width:32,height:32,borderRadius:10,background:'var(--blue-bg)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <svg viewBox="0 0 20 20" fill="currentColor" style={{width:14,height:14,color:'var(--blue)'}}>
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
                  </svg>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600}}>{n.title}</div>
                  <div style={{fontSize:12,color:'var(--text2)',marginTop:2,lineHeight:1.4}}>{n.body}</div>
                </div>
                <div style={{fontSize:11,color:'var(--text3)',whiteSpace:'nowrap',marginTop:2}}>
                  {n.created_at ? new Date(n.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : ''}
                </div>
              </div>
            )) : (
              <div className="empty-state" style={{padding:'32px 0'}}>
                <div style={{fontSize:24}}>🔔</div>
                <div className="empty-title">No recent activity</div>
                <div className="empty-sub">Activity appears after seeding data and running matching</div>
              </div>
            )}
          </div>
        </div>

        {/* Trend chart */}
        <div className="card">
          <div className="card-header"><span className="card-title">Transplants — Last 30 Days</span></div>
          <div style={{padding:'16px 18px',height:260,position:'relative'}}>
            {loading ? <Spinner /> : trend.length > 0
              ? <canvas ref={lineRef}/>
              : <div className="empty-state"><div style={{color:'var(--text3)',fontSize:12}}>Chart populates after seeding data</div></div>
            }
          </div>
        </div>
      </div>
    </div>
  )
}
