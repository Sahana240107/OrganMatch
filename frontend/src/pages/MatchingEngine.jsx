import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import OrganPill from '../components/ui/OrganPill'
import ScoreBar from '../components/ui/ScoreBar'
import HLAInput from '../components/forms/HLAInput'
import KPICard from '../components/ui/KPICard'
import { urgencyClass } from '../utils/formatters'
import { URGENCY_LABELS } from '../utils/constants'

const BREAKDOWN_KEYS   = ['score_hla','score_abo','score_urgency','score_wait_time','score_distance','score_pra','score_age']
const BREAKDOWN_LABELS = { score_hla:'HLA Match', score_abo:'ABO', score_urgency:'Urgency', score_wait_time:'Wait Time', score_distance:'Distance', score_pra:'PRA Bonus', score_age:'Age Match' }
const BREAKDOWN_COLORS = { score_hla:'var(--accent)', score_abo:'var(--teal)', score_urgency:'var(--red)', score_wait_time:'var(--blue)', score_distance:'var(--purple)', score_pra:'var(--amber)', score_age:'var(--coral)' }
const RANK_CLS         = ['rank-1','rank-2','rank-3']

function hlaLabel(n) {
  if (n >= 6) return { cls: 'hla-full',    text: `${n}/8 HLA` }
  if (n >= 3) return { cls: 'hla-partial', text: `${n}/8 HLA` }
  return             { cls: 'hla-none',    text: `${n}/8 HLA` }
}

function Spinner() {
  return <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
}

export default function MatchingEngine() {
  const { request } = useApi()

  const [availableOrgans, setAvailableOrgans] = useState([])
  const [selectedOrganId, setSelectedOrganId] = useState('')
  const [candidates,      setCandidates]      = useState([])
  const [selected,        setSelected]        = useState(null)
  const [breakdown,       setBreakdown]       = useState(null)
  const [hlaValue,        setHlaValue]        = useState({})
  const [kpis,            setKpis]            = useState(null)
  const [loading,         setLoading]         = useState(false)
  const [organsLoading,   setOrgansLoading]   = useState(true)
  const [error,           setError]           = useState('')

  // Load available organs and KPIs on mount
  useEffect(() => {
    async function load() {
      try {
        const [organData, kpiData] = await Promise.all([
          request('GET', '/api/donors/organs?status=available'),
          request('GET', '/api/analytics/matching-kpis'),
        ])
        const organs = organData?.organs || []
        setAvailableOrgans(organs)
        setKpis(kpiData)
        if (organs.length) setSelectedOrganId(organs[0].organ_id)
      } catch (e) {
        setError(e.message)
      } finally {
        setOrgansLoading(false)
      }
    }
    load()
  }, [])

  // Load match candidates when organ selection changes
  useEffect(() => {
    if (!selectedOrganId) return
    async function loadMatches() {
      setLoading(true)
      setError('')
      setCandidates([])
      setSelected(null)
      setBreakdown(null)
      try {
        const data = await request('GET', `/api/matches/organ/${selectedOrganId}`)
        const list = data?.matches || []
        setCandidates(list)
        if (list.length) {
          setSelected(list[0])
          // Load donor HLA for top match organ
          const donorHla = await request('GET', `/api/donors/${list[0].donor_id}/hla`)
          setHlaValue(donorHla?.hla || {})
        }
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    loadMatches()
  }, [selectedOrganId])

  // Load score breakdown when a candidate is selected
  useEffect(() => {
    if (!selected?.match_id) return
    request('GET', `/api/matches/${selected.match_id}/breakdown`)
      .then(data => setBreakdown(data?.breakdown || null))
      .catch(() => setBreakdown(null))
  }, [selected])

  async function handleSendOffer(match) {
    try {
      const deadline = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
      await request('POST', '/api/offers', {
        match_id:              match.match_id,
        organ_id:              match.organ_id,
        recipient_id:          match.recipient_id,
        offering_hospital_id:  match.donor_hospital_id,
        receiving_hospital_id: match.recipient_hospital_id,
        response_deadline:     deadline,
      })
      // Refresh matches
      const data = await request('GET', `/api/matches/organ/${selectedOrganId}`)
      setCandidates(data?.matches || [])
    } catch (e) {
      alert('Failed to send offer: ' + e.message)
    }
  }

  const selectedOrgan = availableOrgans.find(o => o.organ_id === Number(selectedOrganId))

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        <KPICard label="Organs Available" value={kpis?.available_organs ?? '—'} color="blue" />
        <KPICard label="Match Rate"       value={kpis?.match_rate       ?? '—'} color="green" />
        <KPICard label="Avg Match Score"  value={kpis?.avg_score        ?? '—'} color="amber" />
      </div>

      <div className="grid-2-1">
        <div>
          <div className="flex items-center justify-between mb-12">
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              Ranked Matches{selectedOrgan ? ` — ${selectedOrgan.organ_type} ORG-${selectedOrgan.organ_id}` : ''}
            </span>
            {organsLoading ? (
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>Loading organs…</span>
            ) : (
              <select
                className="form-control"
                style={{ width: 'auto', fontSize: 12, padding: '6px 10px' }}
                value={selectedOrganId}
                onChange={e => setSelectedOrganId(e.target.value)}
              >
                {availableOrgans.map(o => (
                  <option key={o.organ_id} value={o.organ_id}>
                    {o.organ_type} · ORG-{o.organ_id}
                  </option>
                ))}
                {!availableOrgans.length && <option value="">No available organs</option>}
              </select>
            )}
          </div>

          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</div>}

          {loading ? <Spinner /> : (
            <>
              {candidates.map((c, idx) => {
                const rank    = idx + 1
                const rankCls = RANK_CLS[idx] || 'rank-n'
                const hla     = hlaLabel(c.hla_antigen_matches || 0)
                const isSel   = selected?.match_id === c.match_id
                const isTop   = rank === 1
                return (
                  <div
                    key={c.match_id}
                    className={`match-card${isTop ? ' top' : ''}`}
                    style={isSel ? { borderColor: 'rgba(59,130,246,0.4)', background: 'rgba(59,130,246,0.05)' } : {}}
                    onClick={() => setSelected(c)}
                  >
                    <div className={`rank-badge ${rankCls}`}>{rank}</div>
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-8 mb-4">
                        <span className="fw-600" style={{ fontSize: 14 }}>R-{c.recipient_id} · {c.recipient?.full_name || '—'}</span>
                        <span className={urgencyClass(c.recipient?.medical_urgency)}>
                          STATUS {URGENCY_LABELS[c.recipient?.medical_urgency] || '—'}
                        </span>
                        {isTop && <span className="badge badge-green">Top Match</span>}
                      </div>
                      <div className="flex gap-12 text-sm text-muted mb-8">
                        <span>{c.recipient?.hospital?.name || '—'}</span>
                        <span>·</span>
                        <span>{c.recipient?.blood_group}</span>
                        <span>·</span>
                        <span>{c.distance_km ? `${Math.round(c.distance_km)} km` : '—'}</span>
                      </div>
                      <div className="flex gap-8 items-center">
                        <ScoreBar score={c.total_score} />
                        <span className={`hla-match ${hla.cls}`}>{hla.text}</span>
                      </div>
                    </div>
                    {isTop
                      ? <button className="btn btn-primary" style={{ alignSelf: 'center' }} onClick={e => { e.stopPropagation(); handleSendOffer(c) }}>Send Offer</button>
                      : <button className="btn btn-ghost"   style={{ alignSelf: 'center', fontSize: 12 }} onClick={e => { e.stopPropagation(); setSelected(c) }}>Details</button>
                    }
                  </div>
                )
              })}
              {!candidates.length && !loading && (
                <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 40, fontSize: 13 }}>
                  No compatible recipients found for this organ
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col gap-16">
          {/* Score breakdown */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Score Breakdown{selected ? ` · R-${selected.recipient_id}` : ''}</span>
            </div>
            <div style={{ padding: '16px 18px' }}>
              {!selected ? (
                <div style={{ color: 'var(--text3)', fontSize: 12, textAlign: 'center', padding: 16 }}>Select a candidate</div>
              ) : breakdown ? (
                <>
                  {BREAKDOWN_KEYS.map(k => {
                    const val = breakdown[k] || 0
                    const abs = Math.abs(val)
                    const pct = Math.min(100, (abs / 30) * 100)
                    const neg = val < 0
                    return (
                      <div key={k} className="flex items-center gap-10 mb-10">
                        <span style={{ fontSize: 12, color: 'var(--text2)', minWidth: 90 }}>{BREAKDOWN_LABELS[k]}</span>
                        <div className="score-bar" style={{ flex: 1 }}>
                          <div className="score-bar-fill" style={{ width: `${pct}%`, background: neg ? 'var(--red)' : BREAKDOWN_COLORS[k] }} />
                        </div>
                        <span className="score-val" style={{ color: neg ? 'var(--red)' : BREAKDOWN_COLORS[k] }}>
                          {neg ? val : `+${val}`}
                        </span>
                      </div>
                    )
                  })}
                  <div className="score-total-box">
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>TOTAL SCORE</div>
                    <div className="score-total-val">{Number(selected.total_score).toFixed(1)}</div>
                  </div>
                </>
              ) : (
                <Spinner />
              )}
            </div>
          </div>

          {/* HLA typing */}
          <div className="card">
            <div className="card-header"><span className="card-title">HLA Typing — Donor</span></div>
            <div style={{ padding: 12 }}>
              <HLAInput value={hlaValue} onChange={setHlaValue} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
