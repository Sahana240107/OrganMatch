import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'

function Spinner(){return<div className="spinner-page"><div className="spinner"/><span>Loading…</span></div>}

const ORGAN_ICONS={kidney:'🫘',heart:'❤️',liver:'🫀',lung:'🫁',pancreas:'🧬',cornea:'👁️',bone:'🦴',small_intestine:'🔬'}
const LEVEL_CLS={level1:'badge-red',level2:'badge-blue',level3:'badge-green'}

export default function Hospitals(){
  const {request}=useApi()
  const [hospitals,setHospitals]=useState([])
  const [selected,setSelected]=useState(null)
  const [caps,setCaps]=useState([])
  const [bloodBank,setBloodBank]=useState(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [search,setSearch]=useState('')

  useEffect(()=>{
    request('GET','/api/hospitals')
      .then(d=>setHospitals(d?.data||d?.hospitals||[]))
      .catch(e=>setError(e.message))
      .finally(()=>setLoading(false))
  },[])

  async function selectHospital(h){
    setSelected(h);setCaps([]);setBloodBank(null)
    try{
      const [capData,bbData]=await Promise.all([
        request('GET',`/api/hospitals/${h.hospital_id}/capabilities`).catch(()=>({capabilities:[]})),
        request('GET',`/api/hospitals/${h.hospital_id}/blood-bank`).catch(()=>null),
      ])
      // FIX: backend returns capabilities at top-level AND under data.capabilities — use top-level
      setCaps(capData?.capabilities||capData?.data?.capabilities||[])
      // FIX: backend returns full bbData object with inventory array; pass whole response
      setBloodBank(bbData||null)
    }catch(e){console.error(e)}
  }

  const filtered=hospitals.filter(h=>{
    const q=search.toLowerCase()
    return!q||h.name?.toLowerCase().includes(q)||h.city?.toLowerCase().includes(q)
  })

  return(
    <div>
      <div className="page-header mb-24">
        <div>
          <h1 className="page-title">Hospital <span>Network</span></h1>
          <p className="page-subtitle">All registered transplant centres and their capabilities</p>
        </div>
      </div>

      <div className="grid-2-1" style={{alignItems:'start'}}>
        <div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Hospitals <span style={{color:'var(--text3)',fontWeight:400,fontSize:12}}>· {filtered.length}</span></span>
              <input className="form-control" style={{width:200,fontSize:12,padding:'6px 12px'}} placeholder="Search by name or city…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            {error&&<div style={{color:'var(--red)',fontSize:12,padding:'12px 20px'}}>{error}</div>}
            {loading?<Spinner/>:(
              <div className="table-wrap" style={{border:'none'}}>
                <table>
                  <thead><tr><th>Hospital</th><th>Level</th><th>City</th><th>ICU</th><th></th></tr></thead>
                  <tbody>
                    {filtered.map(h=>(
                      <tr key={h.hospital_id} style={{cursor:'pointer',background:selected?.hospital_id===h.hospital_id?'rgba(13,110,253,0.05)':'',borderLeft:selected?.hospital_id===h.hospital_id?'3px solid var(--accent)':'3px solid transparent'}} onClick={()=>selectHospital(h)}>
                        <td>
                          <div style={{fontWeight:600,fontSize:13}}>{h.name}</div>
                          <div style={{fontSize:11,color:'var(--text3)',fontFamily:'var(--mono)'}}>{h.code}</div>
                        </td>
                        <td><span className={`badge ${LEVEL_CLS[h.level]||'badge-gray'}`}>{h.level}</span></td>
                        <td style={{fontSize:12,color:'var(--text2)'}}>{h.city}, {h.state}</td>
                        <td>
                          {/* FIX: backend returns both flat icu_beds_* AND capacity sub-object */}
                          {(h.capacity || h.icu_beds_total != null) ? (
                            <span style={{fontSize:12,fontFamily:'var(--mono)'}}>
                              {(h.capacity?.icu_beds_available ?? h.icu_beds_available)}/
                              {(h.capacity?.icu_beds_total ?? h.icu_beds_total)}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          <span style={{color:'var(--accent)',fontSize:11,fontWeight:600}}>
                            {selected?.hospital_id===h.hospital_id?'Selected':'View →'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!filtered.length&&(
                      <tr><td colSpan={5}><div className="empty-state" style={{padding:'30px 0'}}><div style={{color:'var(--text3)',fontSize:12}}>No hospitals found</div></div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Hospital detail panel */}
        <div className="flex flex-col gap-16">
          {selected?(
            <>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">{selected.name}</span>
                  <span className={`badge ${LEVEL_CLS[selected.level]||'badge-gray'}`}>{selected.level?.toUpperCase()}</span>
                </div>
                <div style={{padding:'14px 18px'}}>
                  {[
                    {label:'Code',value:selected.code},
                    {label:'City',value:`${selected.city}, ${selected.state}`},
                    {label:'Pincode',value:selected.pincode},
                    {label:'Phone',value:selected.phone},
                    {label:'Email',value:selected.email},
                    {label:'Coordinates',value:`${selected.latitude}, ${selected.longitude}`},
                    {label:'Status',value:selected.is_active?'✓ Active':'Inactive'},
                  ].map((r,i)=>(
                    <div key={i} className="data-row" style={{borderBottom:i<6?'1px solid var(--border)':'none',padding:'7px 0',fontSize:12}}>
                      <span className="data-row-key">{r.label}</span>
                      <span className="data-row-val" style={{fontSize:12,textAlign:'right',maxWidth:160,wordBreak:'break-all'}}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {caps.length>0&&(
                <div className="card">
                  <div className="card-header"><span className="card-title">Organ Capabilities</span></div>
                  <div style={{padding:'10px 16px'}}>
                    {caps.map((c,i)=>(
                      <div key={i} className="flex items-center justify-between" style={{padding:'7px 0',borderBottom:i<caps.length-1?'1px solid var(--border)':'none'}}>
                        <span style={{fontSize:13}}>{ORGAN_ICONS[c.organ_type]||'🫀'} {c.organ_type}</span>
                        <div className="flex gap-6">
                          {c.can_harvest&&<span className="badge badge-blue" style={{fontSize:10}}>Harvest</span>}
                          {c.can_transplant&&<span className="badge badge-green" style={{fontSize:10}}>Transplant</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bloodBank&&(
                <div className="card">
                  <div className="card-header"><span className="card-title">Blood Bank Inventory</span></div>
                  <div style={{padding:'10px 16px'}}>
                    {/* FIX: backend returns { inventory:[{blood_group,units_available},...], blood_bank:{...} }
                        Support array format (inventory) first, fall back to flat object */}
                    {(bloodBank.inventory||[]).length>0
                      ? (bloodBank.inventory||[]).map((item,i,arr)=>(
                          <div key={i} className="flex items-center justify-between" style={{padding:'7px 0',borderBottom:i<arr.length-1?'1px solid var(--border)':'none',fontSize:12}}>
                            <span style={{fontFamily:'var(--mono)',fontWeight:600}}>{item.blood_group}</span>
                            <span className={`badge ${Number(item.units_available)>5?'badge-green':Number(item.units_available)>0?'badge-amber':'badge-red'}`}>{item.units_available} units</span>
                          </div>
                        ))
                      : Object.entries(bloodBank).filter(([k])=>!['bank_id','hospital_id','hospital','inventory'].includes(k)).map(([bg,units],i,arr)=>(
                          <div key={i} className="flex items-center justify-between" style={{padding:'7px 0',borderBottom:i<arr.length-1?'1px solid var(--border)':'none',fontSize:12}}>
                            <span style={{fontFamily:'var(--mono)',fontWeight:600}}>{bg.replace('_units','').replace('_pos','+').replace('_neg','-')}</span>
                            <span className={`badge ${Number(units)>5?'badge-green':Number(units)>0?'badge-amber':'badge-red'}`}>{units} units</span>
                          </div>
                        ))
                    }
                  </div>
                </div>
              )}
            </>
          ):(
            <div className="card" style={{padding:'40px 20px'}}>
              <div className="empty-state">
                <div style={{fontSize:32}}>🏥</div>
                <div className="empty-title">Select a hospital</div>
                <div className="empty-sub">Click any hospital to view capabilities, ICU capacity, and blood bank inventory</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
