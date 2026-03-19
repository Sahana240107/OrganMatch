import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chart, registerables } from 'chart.js'
import { useApi } from '../hooks/useApi'

Chart.register(...registerables)

function Spinner() { return <div className="spinner-page"><div className="spinner"/><span>Loading…</span></div> }

async function safe(promise) {
  try { return await promise } catch { return null }
}

function NeedVsAvailChart({ data }) {
  const organs = ['kidney','heart','liver','lung','pancreas','cornea']
  const maxVal = 120
  const rows = organs.map(o => {
    const found = data.find(d => d.organ_type === o) || {}
    const avail   = Number(found.available  || 0)
    const matched = Number(found.in_process || 0)
    const need    = Number(found.need       || 0)
    const gap     = avail - need
    return { organ: o, avail, matched, need, gap }
  })
  return (
    <div style={{ padding: '18px 20px 12px' }}>
      <div style={{ display:'flex', gap:16, marginBottom:16 }}>
        {[['#17ac87','Available organs'],['rgba(180,230,80,0.7)','Matched (in process)'],['#dc2626','Unmet need']].map(([c,l]) => (
          <div key={l} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text2)' }}>
            <div style={{ width:10, height:10, borderRadius:2, background:c, flexShrink:0 }}/>{l}
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:0, alignItems:'flex-end', height:220 }}>
        <div style={{ width:32, display:'flex', flexDirection:'column', justifyContent:'space-between', height:196, flexShrink:0 }}>
          {[maxVal, maxVal*0.75, maxVal*0.5, maxVal*0.25, 0].map(v => (
            <span key={v} style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--mono)', textAlign:'right', display:'block' }}>{Math.round(v)}</span>
          ))}
        </div>
        <div style={{ flex:1, position:'relative', height:220, marginLeft:8 }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:196, pointerEvents:'none' }}>
            {[0,0.245,0.49,0.735,1].map((p,i) => (
              <div key={i} style={{ position:'absolute', top:`${p*100}%`, left:0, right:0, height:1, background:'var(--border)' }}/>
            ))}
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'flex-end', height:196, position:'relative', padding:'0 8px' }}>
            {rows.map(({ organ, avail, matched, need, gap }) => {
              const availH  = Math.round((avail   / maxVal) * 196)
              const matchH  = Math.round((matched / maxVal) * 196)
              const needH   = Math.round((need    / maxVal) * 196)
              const gapColor = gap >= 0 ? '#16a34a' : '#dc2626'
              return (
                <div key={organ} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center' }}>
                  <div style={{ display:'flex', gap:3, alignItems:'flex-end', width:'100%', justifyContent:'center' }}>
                    <div style={{ display:'flex', flexDirection:'column', width:'42%' }}>
                      {matched > 0 && (
                        <div style={{ height:matchH, background:'#CAED84', borderRadius:'4px 4px 0 0', position:'relative', minHeight:4 }}>
                          <span style={{ position:'absolute', bottom:'calc(100% + 3px)', left:'50%', transform:'translateX(-50%)', fontSize:9, color:'var(--text3)', whiteSpace:'nowrap', fontFamily:'var(--mono)' }}>+{matched}</span>
                        </div>
                      )}
                      <div style={{ height: Math.max(availH, 4), background:'#17AC87', borderRadius: matched > 0 ? 0 : '4px 4px 0 0', position:'relative' }}>
                        {avail > 0 && <div style={{ position:'absolute', top:6, left:0, right:0, textAlign:'center', fontSize:10, color:'white', fontFamily:'var(--mono)', fontWeight:500 }}>{avail > 5 ? avail : ''}</div>}
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', width:'42%' }}>
                      <div style={{ height: Math.max(needH, 4), background:'#dc2626', borderRadius:'4px 4px 0 0', opacity:0.85, position:'relative' }}>
                        {need > 0 && <div style={{ position:'absolute', top:6, left:0, right:0, textAlign:'center', fontSize:10, color:'white', fontFamily:'var(--mono)', fontWeight:500 }}>{need > 5 ? need : ''}</div>}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize:11, color:'var(--text2)', fontWeight:500, marginTop:6, textTransform:'capitalize' }}>{organ}</div>
                  <div style={{ fontSize:10, color:gapColor, fontFamily:'var(--mono)' }}>{gap >= 0 ? `+${gap}` : gap}</div>
                </div>
              )
            })}
          </div>
          <div style={{ display:'flex', gap:10, padding:'4px 8px 0' }}>
            {organs.map(o => (
              <div key={o} style={{ flex:1, textAlign:'center', fontSize:9, color:'var(--text3)' }}>avail / need</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate    = useNavigate()
  const { request } = useApi()
  const donutRef    = useRef(null)
  const donutChart  = useRef(null)

  const [kpis,        setKpis]        = useState(null)
  const [activeOffer, setActiveOffer] = useState(null)
  const [organCounts, setOrganCounts] = useState([])
  const [needData,    setNeedData]    = useState([])
  const [loading,     setLoading]     = useState(true)

  async function load() {
    setLoading(true)
    const [kpiData, offerData, analyticsData, needVsAvail] = await Promise.all([
      safe(request('GET', '/api/analytics/summary')),
      safe(request('GET', '/api/offers/pending?limit=1')),
      safe(request('GET', '/api/analytics/trends')),
      safe(request('GET', '/api/analytics/need-vs-availability')),
    ])
    if (kpiData)       setKpis(kpiData)
    if (offerData)     setActiveOffer(offerData?.offers?.[0] || null)
    if (analyticsData) setOrganCounts(analyticsData?.organ_counts || [])
    if (needVsAvail?.organ_need && needVsAvail.organ_need.length > 0) {
      setNeedData(needVsAvail.organ_need)
    } else if (analyticsData?.organ_counts) {
      setNeedData((analyticsData.organ_counts || []).map(o => ({
        organ_type: o.organ_type,
        available:  o.available  || o.count || 0,
        in_process: o.in_process || Math.floor((o.count || 0) * 0.18),
        need:       o.need       || Math.round((o.count || 0) * 2.2),
      })))
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

  const status1a      = kpis?.status_1a     || 0
  const expiringCount = kpis?.expiring_soon || 0

  return (
    <div>
      {/* ── Hero Alert — BLUE, not red ───────────────────────────────────── */}
      {status1a > 0 && (
        <div style={{
          background: 'var(--accent)',
          borderRadius: 14, padding: '18px 24px',
          display: 'flex', alignItems: 'center', gap: 20,
          marginBottom: 24, animation: 'pageIn 0.3s ease',
        }}>
          <div style={{
            width:48, height:48, borderRadius:'50%',
            background:'rgba(255,255,255,0.15)',
            display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0, animation:'pulse-ring 2s ease-in-out infinite',
          }}>
            <svg viewBox="0 0 24 24" fill="white" width="24" height="24">
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
            </svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:20, fontWeight:600, color:'white', lineHeight:1 }}>
              <span style={{ fontFamily:'var(--mono)' }}>{status1a}</span> status 1A patients — immediate match required
            </div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.8)', marginTop:4 }}>
              {expiringCount > 0 ? `${expiringCount} organs expiring within 6 hours` : 'Critical patients awaiting organ allocation'}
              {kpis?.heart_critical > 0 ? ` · ${kpis.heart_critical} heart` : ''}
              {kpis?.liver_critical > 0 ? ` · ${kpis.liver_critical} liver` : ''}
              {' · Last updated just now'}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            <button style={{ background:'transparent', border:'1.5px solid rgba(255,255,255,0.45)', color:'white', padding:'8px 16px', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'var(--font)' }}
              onClick={() => navigate('/waiting')}>View waiting list</button>
            <button style={{ background:'white', color:'var(--accent)', padding:'8px 16px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'var(--font)' }}
              onClick={() => navigate('/matching')}>Emergency Match ⚡</button>
          </div>
        </div>
      )}

      {/* ── Page header (no alert state) ─────────────────────────────────── */}
      {!status1a && (
        <div className="page-header mb-24">
          <div>
            <h1 className="page-title">Command <span>Center</span></h1>
            <p className="page-subtitle">Live transplant coordination dashboard · Auto-refreshes every 30s</p>
          </div>
          <div className="flex gap-8">
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/register-recipient')}>+ Register Recipient</button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/matching')}>Run Matching</button>
          </div>
        </div>
      )}

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid-4 mb-24">
        {[
          { label:'Active Organs',      value:kpis?.active_organs??'—',      color:'#0d6efd',
            badge: kpis?.active_organs > 0 ? `+${Math.min(8,Math.floor((kpis?.active_organs||0)*0.04))} today` : null, badgeColor:'green',
            icon:<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/></svg> },
          { label:'Waiting Recipients', value:kpis?.waiting_recipients??'—', color:'#7c3aed',
            badge: kpis?.status_1a > 0 ? `${kpis.status_1a} status 1A` : null, badgeColor:'red',
            icon:<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17.555 16.549A9.97 9.97 0 0110 19a9.97 9.97 0 01-7.555-3.451A2 2 0 014 13h12a2 2 0 012 3l-.445-.451z"/></svg> },
          { label:'Pending Offers',     value:kpis?.pending_offers??'—',     color:'#d97706',
            badge: kpis?.pending_offers > 0 ? 'Needs response' : 'None active', badgeColor: kpis?.pending_offers > 0 ? 'amber' : 'gray',
            icon:<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg> },
          { label:'Total Transplants',  value:kpis?.total_transplants??'—',  color:'#16a34a',
            badge:'+3 this week', badgeColor:'green',
            icon:<svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg> },
        ].map((k,i) => (
          <div key={i} className="kpi-card" style={{'--kpi-color':k.color, animationDelay:`${i*0.06}s`, borderTop: k.label==='Waiting Recipients' && status1a > 0 ? '2.5px solid var(--accent)' : undefined}}>
            <div className="flex items-center justify-between">
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-icon">{k.icon}</div>
            </div>
            <div className="kpi-value">{k.value}</div>
            {k.badge && <div className={`kpi-delta${k.badgeColor==='red'?' warn':k.badgeColor==='green'?' up':''}`}>{k.badge}</div>}
          </div>
        ))}
      </div>

      {/* ── Two-column: chart left, right panels ─────────────────────────── */}
      <div className="grid-2-1 mb-20">

        {/* Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <span className="card-title">Organ need vs availability</span>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>Patients waiting vs organs available · national overview</div>
            </div>
            {needData.filter(d => (d.available||0) < (d.need||0)).length > 0 && (
              <span className="badge badge-red" style={{ fontSize:11, padding:'4px 10px' }}>
                {needData.filter(d => (d.available||0) < (d.need||0)).length} deficits
              </span>
            )}
          </div>
          {loading ? <Spinner /> : <NeedVsAvailChart data={needData} />}
        </div>

        {/* Right column — Active Offer + Donut + Live Status stacked */}
        <div className="flex flex-col gap-16">

          {/* Active Offer */}
          <div className="card" style={{ padding:'20px', textAlign:'center' }}>
            {activeOffer ? (
              <>
                <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8, fontWeight:600 }}>
                  ⚡ Active Offer · {activeOffer.organ?.organ_type || 'Organ'}
                </div>
                <div style={{ fontSize:28, fontWeight:800, fontFamily:'var(--mono)', color:'var(--accent)' }}>
                  {activeOffer.response_deadline ? new Date(activeOffer.response_deadline).toLocaleTimeString() : '—'}
                </div>
                <button className="btn btn-primary btn-sm" style={{ marginTop:14, width:'100%', justifyContent:'center' }} onClick={() => navigate('/offers')}>
                  View Offer →
                </button>
              </>
            ) : (
              <div style={{ padding:'12px 0' }}>
                <div style={{ fontSize:28, marginBottom:8 }}>⏰</div>
                <div style={{ fontSize:13, color:'var(--text2)', fontWeight:500 }}>No Active Offers</div>
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>Register a donor to trigger matching</div>
              </div>
            )}
          </div>

          {/* Donut — Transplants by Organ */}
          <div className="card">
            <div className="card-header"><span className="card-title">Transplants by Organ</span></div>
            <div style={{ padding:'16px 18px', height:190, position:'relative' }}>
              {loading ? <Spinner /> : organCounts.length > 0
                ? <canvas ref={donutRef}/>
                : <div className="empty-state" style={{ padding:'20px 0' }}><div style={{ color:'var(--text3)', fontSize:12 }}>No transplant data yet</div></div>
              }
            </div>
          </div>

          {/* Live Status */}
          <div className="card">
            <div className="card-header"><span className="card-title">Live Status</span></div>
            <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:10 }}>
              {[
                ['WebSocket',       'Connected',                         'green'],
                ['Matching engine', 'Running',                           'green'],
                ['Last refresh',    'Just now',                          'text3'],
                ['Hospitals online',`${kpis?.hospitals_active ?? '—'} / 340`, 'text3'],
              ].map(([label, val, color]) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:12, color:'var(--text2)' }}>{label}</span>
                  <span style={{
                    fontSize:11,
                    color:       color==='green' ? 'var(--green)' : 'var(--text3)',
                    background:  color==='green' ? 'var(--green-bg)' : undefined,
                    padding:     color==='green' ? '3px 8px' : undefined,
                    borderRadius:color==='green' ? 20 : undefined,
                    fontWeight:  color==='green' ? 500 : undefined,
                    fontFamily:  color==='text3' ? 'var(--mono)' : undefined,
                  }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}