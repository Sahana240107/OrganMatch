import { useState, useEffect, useCallback, useRef } from 'react'
import { useApi } from '../hooks/useApi'

// ── Constants ────────────────────────────────────────────────────────────────
const SCORE_KEYS = [
  'score_hla', 'score_abo', 'score_urgency',
  'score_wait_time', 'score_distance', 'score_pra', 'score_age',
]
const SCORE_LABELS = {
  score_hla:       'HLA Match',
  score_abo:       'ABO Compat.',
  score_urgency:   'Urgency',
  score_wait_time: 'Wait Time',
  score_distance:  'Distance',
  score_pra:       'PRA Sensitiz.',
  score_age:       'Age Match',
}
const SCORE_COLORS = {
  score_hla:       '#0d6efd',
  score_abo:       '#0891b2',
  score_urgency:   '#dc2626',
  score_wait_time: '#7c3aed',
  score_distance:  '#16a34a',
  score_pra:       '#d97706',
  score_age:       '#e11d48',
}
const SCORE_MAX = {
  score_hla: 30, score_abo: 20, score_urgency: 25,
  score_wait_time: 15, score_distance: 20, score_pra: 5, score_age: 10,
}
const URGENCY_LABEL = {
  status_1a: '1A', status_1b: '1B', status_2: '2', status_3: '3',
}
const URGENCY_CLS = {
  status_1a: 'badge urg-1a',
  status_1b: 'badge urg-1b',
  status_2:  'badge urg-2',
  status_3:  'badge urg-3',
}
const ORGAN_ICONS = {
  kidney:'🫘', heart:'❤️', liver:'🫀', lung:'🫁',
  pancreas:'🧬', cornea:'👁️', bone:'🦴', small_intestine:'🔬',
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function hlaLabel(n) {
  if (n >= 6) return { cls: 'hla-badge hla-full',    text: `${n}/6 Full` }
  if (n >= 4) return { cls: 'hla-badge hla-partial', text: `${n}/6 Partial` }
  if (n >= 2) return { cls: 'hla-badge hla-low',     text: `${n}/6 Low` }
  return             { cls: 'hla-badge hla-none',    text: `${n}/6 None` }
}

function viabilityColor(pct) {
  if (pct > 60) return '#16a34a'
  if (pct > 30) return '#d97706'
  return '#dc2626'
}

function Spinner() {
  return (
    <div className="spinner-page">
      <div className="spinner" />
      <span>Loading…</span>
    </div>
  )
}

// ── Score Bar Component ───────────────────────────────────────────────────────
function ScoreRow({ k, val, animate }) {
  const max = SCORE_MAX[k] || 30
  const abs = Math.abs(val)
  const pct = Math.min(100, (abs / max) * 100)
  const neg = val < 0
  const color = neg ? '#dc2626' : SCORE_COLORS[k]
  return (
    <div className="breakdown-row">
      <span className="breakdown-label">{SCORE_LABELS[k]}</span>
      <div className="breakdown-bar-wrap">
        <div className="score-bar">
          <div
            className="score-bar-fill"
            style={{
              width: animate ? `${pct}%` : '0%',
              background: `linear-gradient(90deg, ${color}cc, ${color})`,
              transition: 'width 0.7s cubic-bezier(0.0, 0.0, 0.2, 1)',
            }}
          />
        </div>
      </div>
      <span className="breakdown-val" style={{ color }}>
        {neg ? val.toFixed(1) : `+${val.toFixed(1)}`}
      </span>
    </div>
  )
}

// ── HLA Comparison Grid ───────────────────────────────────────────────────────
function HLAComparison({ donor, recipient }) {
  const loci = [
    { label: 'A', d1: donor?.donor_hla_a1, d2: donor?.donor_hla_a2, r1: recipient?.recip_hla_a1, r2: recipient?.recip_hla_a2 },
    { label: 'B', d1: donor?.donor_hla_b1, d2: donor?.donor_hla_b2, r1: recipient?.recip_hla_b1, r2: recipient?.recip_hla_b2 },
    { label: 'DR', d1: donor?.donor_hla_dr1, d2: donor?.donor_hla_dr2, r1: recipient?.recip_hla_dr1, r2: recipient?.recip_hla_dr2 },
  ]

  function isMatch(a, b) {
    if (!a || !b) return false
    return a.toUpperCase() === b.toUpperCase()
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ padding: '6px 8px', textAlign: 'left', background: 'var(--bg3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text3)' }}>Locus</th>
            <th style={{ padding: '6px 8px', background: 'var(--bg3)', textAlign: 'center', color: 'var(--blue)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px' }} colSpan={2}>Donor</th>
            <th style={{ padding: '6px 8px', background: 'var(--bg3)', textAlign: 'center', color: 'var(--green)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px' }} colSpan={2}>Recipient</th>
          </tr>
        </thead>
        <tbody>
          {loci.map(l => (
            <tr key={l.label} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '6px 8px', fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--text2)' }}>HLA-{l.label}</td>
              {[l.d1, l.d2].map((allele, i) => (
                <td key={i} style={{ padding: '6px 8px', textAlign: 'center' }}>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 600,
                    padding: '2px 7px', borderRadius: 6,
                    background: allele ? 'var(--blue-bg)' : 'var(--bg3)',
                    color: allele ? 'var(--blue)' : 'var(--text3)',
                  }}>
                    {allele || '—'}
                  </span>
                </td>
              ))}
              {[l.r1, l.r2].map((allele, i) => {
                const matched = (i === 0 && (isMatch(l.d1, allele) || isMatch(l.d2, allele))) ||
                                (i === 1 && (isMatch(l.d1, allele) || isMatch(l.d2, allele)))
                return (
                  <td key={i} style={{ padding: '6px 8px', textAlign: 'center' }}>
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 600,
                      padding: '2px 7px', borderRadius: 6,
                      background: matched ? '#dcfce7' : (allele ? 'var(--bg3)' : 'var(--bg3)'),
                      color: matched ? '#15803d' : (allele ? 'var(--text2)' : 'var(--text3)'),
                      border: matched ? '1px solid #86efac' : 'none',
                    }}>
                      {allele || '—'}
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MatchingEngine() {
  const { request } = useApi()

  const [organs,       setOrgans]       = useState([])
  const [selectedId,   setSelectedId]   = useState('')
  const [candidates,   setCandidates]   = useState([])
  const [selected,     setSelected]     = useState(null)
  const [kpis,         setKpis]         = useState(null)
  const [weights,      setWeights]      = useState(null)
  const [running,      setRunning]      = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [matchLoading, setMatchLoading] = useState(false)
  const [barAnimate,   setBarAnimate]   = useState(false)
  const [error,        setError]        = useState('')
  const [runMsg,       setRunMsg]       = useState('')

  // Ref so async callbacks always see latest selectedId without being re-created
  const selectedIdRef = useRef('')
  useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])

  // loadMatches takes an explicit id param — no stale closure, no loop
  const loadMatches = useCallback(async (id) => {
    const organId = id || selectedIdRef.current
    if (!organId) return
    setMatchLoading(true)
    setError('')
    setCandidates([])
    setSelected(null)
    setBarAnimate(false)
    try {
      const data = await request('GET', `/api/matches/${organId}`)
      const list = data?.data || []
      setCandidates(list)
      if (list.length) {
        setSelected(list[0])
        setTimeout(() => setBarAnimate(true), 100)
      }
    } catch (e) {
      setError(e.message || 'Failed to load matches')
    } finally {
      setMatchLoading(false)
    }
  }, [request])

  // Load organs + KPIs — runs once on mount only
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const [organData, kpiData] = await Promise.all([
          request('GET', '/api/donors/organs?status=available'),
          request('GET', '/api/matches/kpis'),
        ])
        if (cancelled) return
        const list = organData?.organs || []
        setOrgans(list)
        setKpis(kpiData)
        if (list.length) setSelectedId(String(list[0].organ_id))
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, []) // eslint-disable-line

  // Fetch matches when selected organ changes
  useEffect(() => {
    if (!selectedId) return
    loadMatches(selectedId)
  }, [selectedId]) // eslint-disable-line

  // Fetch scoring weights when selected organ changes
  useEffect(() => {
    if (!selectedId || !organs.length) return
    const organ = organs.find(o => String(o.organ_id) === String(selectedId))
    if (!organ?.organ_type) return
    request('GET', `/api/matches/scoring-weights/${organ.organ_type}`)
      .then(d => setWeights(d?.weights || null))
      .catch(() => setWeights(null))
  }, [selectedId, organs]) // eslint-disable-line

  const handleSelect = (c) => {
    setSelected(c)
    setBarAnimate(false)
    setTimeout(() => setBarAnimate(true), 80)
  }

  const handleRunMatching = async () => {
    if (!selectedId) return
    setRunning(true)
    setRunMsg('')
    setError('')
    try {
      const data = await request('POST', `/api/matches/${selectedId}/run`)
      setRunMsg(data?.message || 'Matching complete')
      await loadMatches(selectedId)
    } catch (e) {
      setError(e.message || 'Failed to run matching')
    } finally {
      setRunning(false)
    }
  }

  const handleSendOffer = async (match) => {
    try {
      await request('POST', '/api/offers', { match_id: match.match_id })
      await loadMatches(selectedId)
    } catch (e) {
      alert('Failed to send offer: ' + (e.message || 'Unknown error'))
    }
  }

  const selectedOrgan = organs.find(o => String(o.organ_id) === String(selectedId))

  // Viability %
  const viabilityPct = selectedOrgan
    ? Math.max(0, Math.min(100, Math.round(
        ((new Date(selectedOrgan.expires_at) - Date.now()) / (selectedOrgan.viability_hours * 3600000)) * 100
      )))
    : null

  if (loading) return <Spinner />

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Matching <span>Engine</span></h1>
          <p className="page-subtitle">7-component weighted scoring — ABO · HLA · Urgency · Wait · Distance · PRA · Age</p>
        </div>
        <div className="flex items-center gap-8">
          {organs.length > 0 && (
            <select
              className="form-control"
              style={{ width: 'auto', fontSize: 13 }}
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
            >
              {organs.map(o => (
                <option key={o.organ_id} value={o.organ_id}>
                  {ORGAN_ICONS[o.organ_type] || '🫀'} {o.organ_type?.toUpperCase()} · ORG-{o.organ_id}
                </option>
              ))}
            </select>
          )}
          <button
            className="btn btn-primary"
            onClick={handleRunMatching}
            disabled={running || !selectedId}
          >
            {running ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Running…</> : <>
              <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/></svg>
              Run Matching
            </>}
          </button>
        </div>
      </div>

      {/* ── KPI row ── */}
      {kpis && (
        <div className="grid-4 mb-24">
          {[
            { label: 'Available Organs', value: kpis.available_organs, color: '#0d6efd', icon: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 14a6 6 0 110-12A6 6 0 0110 16z"/></svg> },
            { label: 'Feasible Matches', value: kpis.feasible_matches, color: '#16a34a', icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg> },
            { label: 'Avg Match Score', value: kpis.avg_score, color: '#7c3aed', icon: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg> },
            { label: 'Match Rate', value: kpis.match_rate, color: '#0891b2', icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg> },
          ].map((k, i) => (
            <div key={i} className="kpi-card" style={{ '--kpi-color': k.color }}>
              <div className="flex items-center justify-between">
                <div className="kpi-label">{k.label}</div>
                <div className="kpi-icon">{k.icon}</div>
              </div>
              <div className="kpi-value">{k.value ?? '—'}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Organ info bar ── */}
      {selectedOrgan && (
        <div className="card mb-20" style={{ padding: '14px 20px' }}>
          <div className="flex items-center gap-16 flex-wrap">
            <div className="flex items-center gap-10">
              <span style={{ fontSize: 28 }}>{ORGAN_ICONS[selectedOrgan.organ_type] || '🫀'}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, textTransform:'capitalize' }}>{selectedOrgan.organ_type}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>ORG-{selectedOrgan.organ_id}</div>
              </div>
            </div>
            <div className="flex gap-20 flex-wrap" style={{ fontSize: 13 }}>
              <div><span style={{ color: 'var(--text3)' }}>Blood Group </span><strong>{selectedOrgan.donor_blood || '—'}</strong></div>
              <div><span style={{ color: 'var(--text3)' }}>Viability </span><strong>{selectedOrgan.viability_hours}h</strong></div>
              <div><span style={{ color: 'var(--text3)' }}>Status </span><span className="badge badge-green">{selectedOrgan.status || 'available'}</span></div>
            </div>
            {viabilityPct !== null && (
              <div className="flex items-center gap-8 ml-auto">
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>Viability</span>
                <div style={{ width: 80, height: 8, background: 'var(--bg3)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ width: `${viabilityPct}%`, height: '100%', background: viabilityColor(viabilityPct), borderRadius: 10, transition: 'width 1s' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: viabilityColor(viabilityPct) }}>{viabilityPct}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-16" style={{ background: 'var(--red-bg)', border: '1px solid #fca5a5', borderRadius: 12, padding: '12px 16px', color: 'var(--red)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {runMsg && (
        <div className="mb-16" style={{ background: 'var(--green-bg)', border: '1px solid #86efac', borderRadius: 12, padding: '12px 16px', color: 'var(--green)', fontSize: 13 }}>
          ✓ {runMsg}
        </div>
      )}

      {/* ── Main layout ── */}
      <div className="grid-2-1" style={{ alignItems: 'start' }}>

        {/* ── Candidate list ── */}
        <div>
          <div className="flex items-center justify-between mb-16">
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                Ranked Candidates
                {candidates.length > 0 && <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 12 }}> — {candidates.length} feasible</span>}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 2 }}>Click a candidate to see full score breakdown</div>
            </div>
            {!matchLoading && candidates.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={loadMatches}>
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 13, height: 13 }}>
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
                </svg>
                Refresh
              </button>
            )}
          </div>

          {matchLoading ? <Spinner /> : (
            <>
              {candidates.length === 0 && !matchLoading && (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803M10.5 7.5v6m3-3h-6"/>
                    </svg>
                  </div>
                  <div className="empty-title">No feasible matches</div>
                  <div className="empty-sub">No compatible recipients found within transport range. Click Run Matching to search.</div>
                </div>
              )}

              {candidates.map((c, idx) => {
                const rank = c.rank_position || (idx + 1)
                const hla  = hlaLabel(c.hla_antigen_matches || 0)
                const isSel = selected?.match_id === c.match_id
                const isTop = rank === 1
                const rankCls = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-n'
                const urgCls  = URGENCY_CLS[c.medical_urgency] || 'badge badge-gray'

                return (
                  <div
                    key={c.match_id}
                    className={`match-card${isSel ? ' selected' : ''}${isTop ? ' top-match' : ''}`}
                    onClick={() => handleSelect(c)}
                    style={{ animationDelay: `${idx * 0.04}s` }}
                  >
                    <div className={`rank-badge ${rankCls}`}>{rank}</div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-8 mb-6 flex-wrap">
                        <span className="fw-700" style={{ fontSize: 14 }}>
                          {c.recipient_name || `R-${c.recipient_id}`}
                        </span>
                        <span className={urgCls}>
                          Status {URGENCY_LABEL[c.medical_urgency] || '?'}
                        </span>
                        {isTop && <span className="badge badge-green">Top Match</span>}
                        {c.ischemic_time_feasible === 0 && (
                          <span className="badge badge-red">Infeasible</span>
                        )}
                      </div>

                      <div className="flex gap-12 mb-8 flex-wrap" style={{ fontSize: 12, color: 'var(--text2)' }}>
                        <span>{c.recipient_hospital || '—'}</span>
                        <span>·</span>
                        <span>{c.recipient_city || '—'}</span>
                        <span>·</span>
                        <span style={{ fontFamily: 'var(--mono)' }}>{c.recipient_blood || '—'}</span>
                        <span>·</span>
                        <span>{c.distance_km ? `${Math.round(c.distance_km)} km` : '—'}</span>
                        {c.estimated_transport_hrs && (
  <><span>·</span><span>{Number(c.estimated_transport_hrs || 0).toFixed(1)}h transport</span></>
)}
                      </div>

                      {/* Mini score bars */}
                      <div className="flex items-center gap-10">
                        <div style={{ flex: 1 }}>
                          <div className="score-bar">
                            <div
                              className="score-bar-fill"
                              style={{
                                width: `${Math.min(100, (c.total_score / 100) * 100)}%`,
                                background: `linear-gradient(90deg, ${isTop ? '#16a34a' : '#0d6efd'}99, ${isTop ? '#16a34a' : '#0d6efd'})`,
                              }}
                            />
                          </div>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--mono)', color: isTop ? 'var(--green)' : 'var(--accent)', minWidth: 36 }}>
                          {Number(c.total_score).toFixed(0)}
                        </span>
                        <span className={hla.cls}>{hla.text}</span>
                      </div>
                    </div>

                    {isTop ? (
                      <button
                        className="btn btn-green btn-sm"
                        style={{ alignSelf: 'center', flexShrink: 0 }}
                        onClick={e => { e.stopPropagation(); handleSendOffer(c) }}
                      >
                        Send Offer
                      </button>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ alignSelf: 'center', flexShrink: 0 }}
                        onClick={e => { e.stopPropagation(); handleSelect(c) }}
                      >
                        Details
                      </button>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* ── Right panel ── */}
        <div className="flex flex-col gap-16">

          {/* Score Breakdown */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                Score Breakdown
                {selected && <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 12 }}> · {selected.recipient_name || `R-${selected.recipient_id}`}</span>}
              </span>
              {selected && (
                <span className="badge badge-blue" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
                  #{selected.rank_position || '—'}
                </span>
              )}
            </div>

            <div style={{ padding: '16px 20px' }}>
              {!selected ? (
                <div className="empty-state" style={{ padding: '28px 0' }}>
                  <div style={{ fontSize: 28 }}>🎯</div>
                  <div className="empty-title">Select a candidate</div>
                </div>
              ) : (
                <>
                  {/* Donor vs Recipient comparison */}
                  <div className="donor-recip-grid mb-16">
                    <div className="data-card">
                      <div className="data-card-title">
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', display: 'inline-block' }} />
                        Donor
                      </div>
                      <div className="data-row"><span className="data-row-key">Blood</span><span className="data-row-val" style={{ fontFamily: 'var(--mono)' }}>{selected.donor_blood}</span></div>
                      <div className="data-row"><span className="data-row-key">Age</span><span className="data-row-val">{selected.donor_age || '—'}</span></div>
                      <div className="data-row"><span className="data-row-key">Hospital</span><span className="data-row-val" style={{ fontSize: 11 }}>{selected.donor_hospital || '—'}</span></div>
                    </div>
                    <div className="data-card">
                      <div className="data-card-title">
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                        Recipient
                      </div>
                      <div className="data-row"><span className="data-row-key">Blood</span><span className="data-row-val" style={{ fontFamily: 'var(--mono)' }}>{selected.recipient_blood}</span></div>
                      <div className="data-row"><span className="data-row-key">Age</span><span className="data-row-val">{selected.recipient_age || '—'}</span></div>
                      <div className="data-row"><span className="data-row-key">PRA</span><span className="data-row-val">{selected.pra_percent || 0}%</span></div>
                    </div>
                  </div>

                  {/* 7-component score bars */}
                  {SCORE_KEYS.map(k => (
                    <ScoreRow
                      key={k}
                      k={k}
                      val={parseFloat(selected[k] || 0)}
                      animate={barAnimate}
                    />
                  ))}

                  <div className="score-total-box mt-16">
                    <div className="score-total-label">Total Match Score</div>
                    <div className="score-total-val">{Number(selected.total_score).toFixed(1)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>/ 100 maximum</div>
                    <div className="flex justify-center gap-8 mt-8">
                      <span className={`badge ${selected.ischemic_time_feasible ? 'badge-green' : 'badge-red'}`}>
                        {selected.ischemic_time_feasible ? '✓ Transport Feasible' : '✗ Ischemia Exceeded'}
                      </span>
                    </div>
                  </div>

                  {/* Transport info */}
                  {selected.distance_km && (
                    <div className="flex gap-12 mt-12 flex-wrap" style={{ fontSize: 12 }}>
                      <div className="info-pill">📍 {Math.round(selected.distance_km)} km</div>
                      {selected.estimated_transport_hrs && (
  <div className="info-pill">🚁 {Number(selected.estimated_transport_hrs || 0).toFixed(1)}h transport</div>
)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* HLA Comparison */}
          {selected && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">HLA Antigen Comparison</span>
                <span className={hlaLabel(selected.hla_antigen_matches || 0).cls}>
                  {hlaLabel(selected.hla_antigen_matches || 0).text}
                </span>
              </div>
              <div style={{ padding: '14px 18px' }}>
                <HLAComparison donor={selected} recipient={selected} />
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10, lineHeight: 1.5 }}>
                  Matching antigens highlighted in green. HLA-A, B, DR loci (6 antigens total). 6/6 match provides ~20% better 5-year graft survival.
                </div>
              </div>
            </div>
          )}

          {/* Organ weights reference */}
          {weights && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Scoring Weights — {selectedOrgan?.organ_type?.toUpperCase()}</span>
              </div>
              <div style={{ padding: '12px 18px' }}>
                {[
                  { label: 'HLA Match',  val: `${weights.w_hla_match} pts max` },
                  { label: 'ABO Identical', val: `+${weights.w_abo_identical} pts` },
                  { label: 'ABO Compatible', val: `+${weights.w_abo_compatible} pts` },
                  { label: 'Urgency 1A', val: `+${weights.w_urgency_1a} pts` },
                  { label: 'Distance Max', val: `${weights.w_distance_max_km?.toLocaleString()} km` },
                  { label: 'PRA Low Bonus', val: `+${weights.w_pra_low_bonus} pts` },
                  { label: 'PRA High Penalty', val: `−${weights.w_pra_high_penalty} pts` },
                ].map((r, i) => (
                  <div key={i} className="data-row" style={{ borderBottom: i < 6 ? '1px solid var(--border)' : 'none', padding: '7px 0', fontSize: 12 }}>
                    <span className="data-row-key">{r.label}</span>
                    <span className="data-row-val" style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}