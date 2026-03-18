import { useEffect, useRef, useState, useCallback } from 'react'
import { Chart, registerables } from 'chart.js'
import { useApi } from '../hooks/useApi'

Chart.register(...registerables)

const CHART_COLORS = ['#0d6efd','#dc2626','#d97706','#0891b2','#7c3aed','#e11d48','#64748b','#16a34a']
const GRID_COLOR   = 'rgba(15,30,70,0.06)'
const TICK_COLOR   = '#9aa3bc'

function Spinner() {
  return <div className="spinner-page"><div className="spinner"/><span>Loading…</span></div>
}
function StatRow({ label, value, color='var(--accent)' }) {
  return (
    <div className="flex items-center justify-between" style={{padding:'9px 0',borderBottom:'1px solid var(--border)'}}>
      <span style={{fontSize:13,color:'var(--text2)'}}>{label}</span>
      <span style={{fontSize:14,fontWeight:700,color,fontFamily:'var(--mono)'}}>{value}</span>
    </div>
  )
}

// FIX: Chart helper that ALWAYS renders the canvas (never conditionally).
// Conditional canvas rendering causes Chart.js useEffect to fire before the DOM node exists.
// Instead we always render the canvas and toggle visibility with CSS.
function ChartBox({ title, badge, height=240, hasData, loading, emptyMsg, children, canvasRef }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{title}</span>
        {badge}
      </div>
      <div style={{padding:'16px 20px', height, position:'relative'}}>
        {loading
          ? <Spinner/>
          : <>
              {/* Canvas is ALWAYS in the DOM — Chart.js needs a stable ref */}
              <canvas ref={canvasRef} style={{display: hasData ? 'block' : 'none'}}/>
              {!hasData && (
                <div className="empty-state">
                  <div style={{color:'var(--text3)',fontSize:12}}>{emptyMsg}</div>
                </div>
              )}
            </>
        }
      </div>
    </div>
  )
}

export default function Analytics() {
  const { request } = useApi()
  const lineRef  = useRef(null)
  const barRef   = useRef(null)
  const donutRef = useRef(null)
  const hlaRef   = useRef(null)
  const lineChart  = useRef(null)
  const barChart   = useRef(null)
  const donutChart = useRef(null)
  const hlaChart   = useRef(null)

  const [kpis,         setKpis]         = useState(null)
  const [monthlyTrend, setMonthlyTrend] = useState([])
  const [organBreak,   setOrganBreak]   = useState([])
  const [urgencyDist,  setUrgencyDist]  = useState([])
  const [topHospitals, setTopHospitals] = useState([])
  const [hlaStats,     setHlaStats]     = useState([])
  const [transplantSum,setTransplantSum]= useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    async function safe(p) { try { return await p } catch { return null } }
    const [fullData, trendsData, transplantData, hlaData] = await Promise.all([
      safe(request('GET', '/api/analytics/full')),
      safe(request('GET', '/api/analytics/trends')),
      safe(request('GET', '/api/analytics/transplant-summary')),
      safe(request('GET', '/api/matches/hla-stats')),
    ])
    const s = fullData?.summary || {}
    setKpis({
      total_transplants: s.total_transplants ?? transplantData?.total ?? '—',
      avg_score:         s.avg_match_score   ?? '—',
      survival_rate:     transplantData?.survival_rate  ?? '—',
      graft_failures:    transplantData?.graft_failures ?? '—',
    })
    setTopHospitals(fullData?.top_hospitals || [])
    setMonthlyTrend(trendsData?.daily_trend  || [])
    setOrganBreak(  trendsData?.organ_counts || [])
    setTransplantSum(transplantData)
    setUrgencyDist([
      { label:'Status 1A', count: s.total_1a ?? 0 },
      { label:'Status 1B', count: s.total_1b ?? 0 },
      { label:'Status 2',  count: s.total_2  ?? 0 },
      { label:'Status 3',  count: s.total_3  ?? 0 },
    ].filter(u => u.count > 0))
    setHlaStats(hlaData?.distribution || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // LINE CHART — activity trend
  useEffect(() => {
    if (!lineRef.current) return
    lineChart.current?.destroy()
    if (!monthlyTrend.length) return
    lineChart.current = new Chart(lineRef.current, {
      type: 'line',
      data: {
        labels: monthlyTrend.map(t => t.label),
        datasets: [
          { label:'Transplants', data: monthlyTrend.map(t => t.transplants), borderColor:'#0d6efd', backgroundColor:'rgba(13,110,253,0.08)', tension:0.4, fill:true, pointBackgroundColor:'#0d6efd', pointRadius:3, borderWidth:2 },
          { label:'New Donors',  data: monthlyTrend.map(t => t.donors||0),   borderColor:'#16a34a', backgroundColor:'rgba(22,163,74,0.06)',  tension:0.4, fill:true, pointBackgroundColor:'#16a34a', pointRadius:3, borderWidth:2 },
        ],
      },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ color:TICK_COLOR,font:{size:11},boxWidth:10 }}}, scales:{ x:{ ticks:{color:TICK_COLOR,font:{size:10}}, grid:{color:GRID_COLOR} }, y:{ ticks:{color:TICK_COLOR,font:{size:10}}, grid:{color:GRID_COLOR}, beginAtZero:true }}},
    })
  }, [monthlyTrend, loading])

  // BAR CHART — organ breakdown
  useEffect(() => {
    if (!barRef.current) return
    barChart.current?.destroy()
    if (!organBreak.length) return
    barChart.current = new Chart(barRef.current, {
      type: 'bar',
      data: { labels: organBreak.map(o => o.organ_type), datasets: [{ label:'Transplants', data: organBreak.map(o => o.count), backgroundColor: CHART_COLORS, borderRadius:6, borderSkipped:false }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false} }, scales:{ x:{ ticks:{color:TICK_COLOR,font:{size:10}}, grid:{display:false} }, y:{ ticks:{color:TICK_COLOR,font:{size:10}}, grid:{color:GRID_COLOR}, beginAtZero:true }}},
    })
  }, [organBreak, loading])

  // DONUT CHART — urgency
  useEffect(() => {
    if (!donutRef.current) return
    donutChart.current?.destroy()
    if (!urgencyDist.length) return
    donutChart.current = new Chart(donutRef.current, {
      type: 'doughnut',
      data: { labels: urgencyDist.map(u => u.label), datasets: [{ data: urgencyDist.map(u => u.count), backgroundColor:['#dc2626','#d97706','#0d6efd','#64748b'], borderColor:'#ffffff', borderWidth:3 }] },
      options: { responsive:true, maintainAspectRatio:false, cutout:'65%', plugins:{ legend:{ position:'bottom', labels:{ color:TICK_COLOR,font:{size:10},boxWidth:10,padding:10 }}}},
    })
  }, [urgencyDist, loading])

  // HLA BAR CHART
  useEffect(() => {
    if (!hlaRef.current) return
    hlaChart.current?.destroy()
    if (!hlaStats.length) return
    hlaChart.current = new Chart(hlaRef.current, {
      type: 'bar',
      data: { labels: hlaStats.map(h => `${h.matches}/6`), datasets: [{ label:'Pairs', data: hlaStats.map(h => h.count), backgroundColor: hlaStats.map(h => h.matches>=5?'#16a34a':h.matches>=3?'#0d6efd':h.matches>=1?'#d97706':'#dc2626'), borderRadius:6, borderSkipped:false }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false} }, scales:{ x:{ ticks:{color:TICK_COLOR,font:{size:11}}, grid:{display:false} }, y:{ ticks:{color:TICK_COLOR,font:{size:10}}, grid:{color:GRID_COLOR}, beginAtZero:true }}},
    })
  }, [hlaStats, loading])

  const maxHosp = topHospitals[0]?.transplants || topHospitals[0]?.count || 1

  return (
    <div>
      <div className="page-header mb-24">
        <div>
          <h1 className="page-title">Analytics <span>Report</span></h1>
          <p className="page-subtitle">Platform-wide transplant outcomes, matching performance & waiting list data</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4 mb-24">
        {[
          { label:'Total Transplants', value: kpis?.total_transplants ?? '—', color:'#0d6efd' },
          { label:'Graft Survival',    value: kpis?.survival_rate != null ? `${kpis.survival_rate}%` : '—', color:'#16a34a' },
          { label:'Avg Match Score',   value: kpis?.avg_score ?? '—', color:'#7c3aed' },
          { label:'Graft Failures',    value: kpis?.graft_failures ?? '—', color:'#dc2626' },
        ].map((k,i) => (
          <div key={i} className="kpi-card" style={{'--kpi-color':k.color, animationDelay:`${i*0.06}s`}}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Trend + Organ charts */}
      <div className="grid-2 mb-20">
        <ChartBox title="Daily Activity — Last 30 Days" height={240} hasData={monthlyTrend.length>0} loading={loading} emptyMsg="No trend data yet" canvasRef={lineRef}/>
        <ChartBox title="Transplants by Organ Type"    height={240} hasData={organBreak.length>0}   loading={loading} emptyMsg="No data yet"       canvasRef={barRef}/>
      </div>

      {/* Urgency + HLA + Outcomes */}
      <div className="grid-3 mb-20">
        <ChartBox title="Urgency Distribution" height={220} hasData={urgencyDist.length>0} loading={loading} emptyMsg="No data yet" canvasRef={donutRef}/>
        <ChartBox title="HLA Match Distribution" height={220} hasData={hlaStats.length>0} loading={loading} emptyMsg="No match data yet" canvasRef={hlaRef}
          badge={<span className="badge badge-blue" style={{fontSize:10}}>M3 Engine</span>}/>
        <div className="card">
          <div className="card-header"><span className="card-title">Transplant Outcomes</span></div>
          <div style={{padding:'16px 20px'}}>
            {loading ? <Spinner/> : transplantSum ? (
              <>
                <StatRow label="Total Transplants" value={transplantSum.total??'—'}                                                      color="var(--blue)"/>
                <StatRow label="Graft Survival"    value={transplantSum.survival_rate!=null?`${transplantSum.survival_rate}%`:'—'}      color="var(--green)"/>
                <StatRow label="Avg Cold Ischemia" value={transplantSum.avg_ischemic_hours?`${transplantSum.avg_ischemic_hours}h`:'—'}  color="var(--amber)"/>
                <StatRow label="Graft Failures"    value={transplantSum.graft_failures??'—'}                                             color="var(--red)"/>
              </>
            ) : <div className="empty-state" style={{padding:'20px 0'}}><div style={{color:'var(--text3)',fontSize:12}}>No records yet</div></div>}
          </div>
        </div>
      </div>

      {/* Top Hospitals */}
      <div className="card">
        <div className="card-header"><span className="card-title">Top Hospitals by Transplant Volume</span></div>
        <div style={{padding:'8px 0'}}>
          {loading ? <Spinner/> : topHospitals.length > 0 ? topHospitals.map((h,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:16,padding:'11px 20px',borderBottom:i<topHospitals.length-1?'1px solid var(--border)':'none'}}>
              <div style={{width:28,height:28,borderRadius:8,background:`${CHART_COLORS[i]}18`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,color:CHART_COLORS[i],flexShrink:0}}>{i+1}</div>
              <span style={{flex:1,fontSize:13,fontWeight:500}}>{h.hospital||h.name}</span>
              <div style={{width:200}}><div className="score-bar"><div className="score-bar-fill" style={{width:`${((h.transplants||h.count||0)/maxHosp)*100}%`,background:CHART_COLORS[i]}}/></div></div>
              <span style={{fontFamily:'var(--mono)',fontWeight:700,fontSize:13,color:CHART_COLORS[i],minWidth:28,textAlign:'right'}}>{h.transplants||h.count||0}</span>
              {h.success_rate!=null&&<span className="badge badge-green" style={{fontSize:10}}>{h.success_rate}% survival</span>}
            </div>
          )) : <div className="empty-state" style={{padding:'32px 0'}}><div style={{color:'var(--text3)',fontSize:12}}>No hospital data yet</div></div>}
        </div>
      </div>
    </div>
  )
}