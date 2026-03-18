import { useState, useEffect, useRef } from 'react'
import { useApi } from '../hooks/useApi'

function Spinner(){return<div className="spinner-page"><div className="spinner"/><span>Loading map data…</span></div>}

export default function LocationMap(){
  const {request}=useApi()
  const mapRef=useRef(null)
  const mapInstance=useRef(null)
  const [hospitals,setHospitals]=useState([])
  const [organs,setOrgans]=useState([])
  const [selected,setSelected]=useState(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  useEffect(()=>{
    async function load(){
      try{
        const [hData,oData]=await Promise.all([
          request('GET','/api/hospitals'),
          request('GET','/api/donors/organs?status=available'),
        ])
        setHospitals(hData?.data||hData?.hospitals||[])
        setOrgans(oData?.organs||[])
      }catch(e){setError(e.message)}
      finally{setLoading(false)}
    }
    load()
  },[])

  // Leaflet map
  useEffect(()=>{
    if(loading||!mapRef.current||hospitals.length===0)return
    if(mapInstance.current)return

    const L=window.L
    if(!L){
      const script=document.createElement('script')
      script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload=()=>initMap()
      document.head.appendChild(script)
      const link=document.createElement('link')
      link.rel='stylesheet'
      link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    } else {
      initMap()
    }

    function initMap(){
      if(mapInstance.current)return
      // FIX: Always center on India (lat 20.5937, lng 78.9629) at zoom 5 — hospitals are all in India
      const center=[20.5937,78.9629]
      mapInstance.current=window.L.map(mapRef.current,{zoomControl:true}).setView(center,5)
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        attribution:'© OpenStreetMap contributors',maxZoom:18,
      }).addTo(mapInstance.current)

      hospitals.forEach(h=>{
        const organCount=organs.filter(o=>
          // FIX: organs now include hospital_id and donor_hospital_id from the fixed API
          o.hospital_id===h.hospital_id ||
          o.donor_hospital_id===h.hospital_id ||
          // fallback: match by name string for organs from vw_available_organs
          o.donor_hospital===h.name
        ).length
        const color=organCount>0?'#0d6efd':h.level==='level1'?'#dc2626':'#16a34a'
        const icon=window.L.divIcon({
          className:'',
          html:`<div style="width:32px;height:32px;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:700;">${organCount>0?organCount:'H'}</div>`,
          iconSize:[32,32],iconAnchor:[16,16],
        })
        const marker=window.L.marker([h.latitude,h.longitude],{icon}).addTo(mapInstance.current)
        marker.bindPopup(`
          <div style="font-family:DM Sans,sans-serif;min-width:200px;">
            <div style="font-weight:700;font-size:14px;margin-bottom:6px;">${h.name}</div>
            <div style="font-size:12px;color:#4a5980;">${h.city}, ${h.state}</div>
            <div style="font-size:12px;margin-top:6px;"><strong>${organCount}</strong> active organ(s)</div>
            <div style="font-size:11px;color:#666;margin-top:4px;">${h.level?.toUpperCase()} Centre</div>
          </div>
        `)
        if(organCount>0){
          window.L.circle([h.latitude,h.longitude],{
            radius:500000,color:'#0d6efd',fillColor:'#0d6efd',fillOpacity:0.04,weight:1,dashArray:'6 4',
          }).addTo(mapInstance.current)
        }
      })
    }
    return()=>{if(mapInstance.current){mapInstance.current.remove();mapInstance.current=null}}
  },[loading,hospitals])

  const organsWithLocations=organs.filter(o=>o.hospital_lat||o.latitude)

  return(
    <div>
      <div className="page-header mb-24">
        <div>
          <h1 className="page-title">Location <span>Map</span></h1>
          <p className="page-subtitle">Hospital network with active organ availability and ischemic radius circles</p>
        </div>
      </div>

      {error&&<div style={{background:'var(--red-bg)',border:'1px solid #fca5a5',borderRadius:12,padding:'12px 16px',color:'var(--red)',fontSize:13,marginBottom:16}}>{error}</div>}

      <div className="grid-3 mb-20">
        {[
          {label:'Hospitals',value:hospitals.length,color:'#0d6efd'},
          {label:'Active Organs',value:organs.length,color:'#16a34a'},
          {label:'States Covered',value:new Set(hospitals.map(h=>h.state)).size,color:'#7c3aed'},
        ].map((k,i)=>(
          <div key={i} className="kpi-card" style={{'--kpi-color':k.color}}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="card mb-20">
        <div className="card-header">
          <span className="card-title">Interactive Hospital Network Map</span>
          <div className="flex gap-10">
            <div className="legend-item"><div className="legend-dot" style={{background:'#0d6efd'}}/> Has Active Organ</div>
            <div className="legend-item"><div className="legend-dot" style={{background:'#16a34a'}}/> Level 3 Centre</div>
            <div className="legend-item"><div className="legend-dot" style={{background:'#dc2626'}}/> Level 1 Centre</div>
          </div>
        </div>
        <div style={{height:480,position:'relative'}}>
          {loading?<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text3)'}}>Loading map…</div>
          :<div ref={mapRef} style={{height:'100%',width:'100%',borderRadius:'0 0 16px 16px'}}/>}
        </div>
      </div>

      {/* Hospital list */}
      <div className="card">
        <div className="card-header"><span className="card-title">Hospital Locations</span></div>
        <div className="table-wrap" style={{border:'none'}}>
          <table>
            <thead><tr><th>Hospital</th><th>City / State</th><th>Coordinates</th><th>Level</th><th>ICU Available</th></tr></thead>
            <tbody>
              {hospitals.map(h=>(
                <tr key={h.hospital_id}>
                  <td><div style={{fontWeight:600,fontSize:13}}>{h.name}</div><div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--text3)'}}>{h.code}</div></td>
                  <td style={{fontSize:12,color:'var(--text2)'}}>{h.city}, {h.state}</td>
                  <td style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--text3)'}}>{h.latitude}, {h.longitude}</td>
                  <td><span className={`badge ${h.level==='level1'?'badge-red':h.level==='level2'?'badge-blue':'badge-green'}`}>{h.level}</span></td>
                  <td style={{fontSize:12}}>{h.capacity?`${h.capacity.icu_beds_available}/${h.capacity.icu_beds_total} beds`:'—'}</td>
                </tr>
              ))}
              {!hospitals.length&&<tr><td colSpan={5}><div className="empty-state" style={{padding:'30px 0'}}><div style={{color:'var(--text3)',fontSize:12}}>No hospitals loaded</div></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}