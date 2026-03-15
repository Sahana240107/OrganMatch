import KPICard from '../components/ui/KPICard'

const MOCK = [
  { id:1, name:'AIIMS Delhi',        code:'AIIMS-DL',  level:'level1', city:'New Delhi',   state:'DL', icu_avail:18, icu_total:24, caps:['kidney','heart','liver','lung'],     blood_bank:'active',  status:'active' },
  { id:2, name:'Fortis Hyderabad',   code:'FH-HYD',    level:'level2', city:'Hyderabad',   state:'TS', icu_avail:8,  icu_total:14, caps:['heart','lung','kidney'],             blood_bank:'active',  status:'active' },
  { id:3, name:'PGIMER Chandigarh',  code:'PGIMC-CHD', level:'level1', city:'Chandigarh',  state:'PB', icu_avail:12, icu_total:18, caps:['kidney','liver','pancreas'],         blood_bank:'active',  status:'active' },
  { id:4, name:'KEM Mumbai',         code:'KEM-MUM',   level:'level2', city:'Mumbai',      state:'MH', icu_avail:4,  icu_total:22, caps:['kidney','liver','pancreas'],         blood_bank:'active',  status:'active' },
  { id:5, name:'Apollo Mumbai',      code:'APO-MUM',   level:'level3', city:'Mumbai',      state:'MH', icu_avail:6,  icu_total:10, caps:['cornea','kidney'],                   blood_bank:'partial', status:'active' },
  { id:6, name:'Medanta Gurgaon',    code:'MED-GGN',   level:'level2', city:'Gurgaon',     state:'HR', icu_avail:14, icu_total:20, caps:['kidney','liver','heart'],            blood_bank:'active',  status:'active' },
]

const LEVEL_MAP = {
  level1: { cls:'badge-red',   label:'L1' },
  level2: { cls:'badge-amber', label:'L2' },
  level3: { cls:'badge-blue',  label:'L3' },
}

const ORG_ABBR = { kidney:'K', heart:'H', liver:'Li', lung:'Lu', pancreas:'P', cornea:'C', bone:'B', small_intestine:'SI' }
const ORG_CLS  = { kidney:'organ-kidney', heart:'organ-heart', liver:'organ-liver', lung:'organ-lung', pancreas:'organ-pancreas', cornea:'organ-cornea' }

export default function Hospitals() {
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        <KPICard label="Active Hospitals" value="24"  sub="Level 1: 6 · L2: 12 · L3: 6"       color="blue" />
        <KPICard label="Total ICU Beds"   value="842" trend="↑ 312" sub="available now"         color="green" />
        <KPICard label="Network States"   value="18"  sub="Pan-India coverage"                  color="amber" />
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hospital</th><th>Code</th><th>Level</th><th>City / State</th>
                <th>ICU Available</th><th>Capabilities</th><th>Blood Bank</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK.map((h) => {
                const lvl = LEVEL_MAP[h.level] || { cls:'badge-gray', label:h.level }
                const icuColor = h.icu_avail < 5 ? 'var(--red)' : h.icu_avail < 10 ? 'var(--amber)' : 'var(--accent)'
                return (
                  <tr key={h.id}>
                    <td style={{ fontWeight:500 }}>{h.name}</td>
                    <td style={{ fontFamily:'var(--mono)', color:'var(--text2)', fontSize:11 }}>{h.code}</td>
                    <td><span className={`badge ${lvl.cls}`}>{lvl.label}</span></td>
                    <td>{h.city}, {h.state}</td>
                    <td>
                      <span style={{ color:icuColor, fontWeight:600 }}>{h.icu_avail}</span>
                      <span className="text-muted">/{h.icu_total}</span>
                    </td>
                    <td>
                      <div className="flex gap-4" style={{ flexWrap:'wrap' }}>
                        {h.caps.map((c) => (
                          <span key={c} className={`organ-pill ${ORG_CLS[c] || 'badge-gray'}`} style={{ fontSize:10, padding:'2px 6px' }}>
                            {ORG_ABBR[c] || c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${h.blood_bank==='active' ? 'badge-green' : 'badge-amber'}`}>
                        {h.blood_bank==='active' ? 'Active' : 'Partial'}
                      </span>
                    </td>
                    <td><span className="status-chip status-active badge-dot">Online</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
