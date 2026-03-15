import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MatchCard from '../components/ui/MatchCard';
import OrganPill from '../components/ui/OrganPill';
import { useApi } from '../hooks/useApi';
import { BLOOD_GROUPS } from '../utils/constants';

export default function MatchingEngine() {
    const { organId } = useParams();
    const navigate = useNavigate();
    const { get: getOrgans, data: organsData } = useApi();
    const { get: getMatches, data: matchData, loading } = useApi();
    const { post: sendOffer, loading: sending } = useApi();
    const { post: runMatch, loading: running } = useApi();

    const [selectedOrgan, setSelectedOrgan] = useState(organId || null);
    const [filterBlood, setFilterBlood] = useState('all');
    const [msg, setMsg] = useState(null);

    useEffect(() => { getOrgans('/donors/organs/available'); }, []);
    useEffect(() => {
        if (selectedOrgan) getMatches(`/matches/${selectedOrgan}`);
    }, [selectedOrgan]);

    const organs = organsData?.data || [];
    // Real DB view fields: match_id, total_score, rank_position, recipient_name, recipient_blood,
    //   medical_urgency, donor_blood, donor_hospital, score_hla, score_abo, score_urgency,
    //   score_wait_time, score_distance, distance_km, estimated_transport_hrs
    const matches = matchData?.data || [];
    const filtered = filterBlood === 'all' ? matches : matches.filter(m => m.recipient_blood === filterBlood);
    const bloodGroups = ['all', ...new Set(matches.map(m => m.recipient_blood).filter(Boolean))];

    const handleRunMatch = async () => {
        if (!selectedOrgan) return;
        const res = await runMatch(`/matches/${selectedOrgan}/run`);
        if (res?.success) {
            setMsg(`✓ Matching complete — ${res.data?.data?.match_count || 0} feasible matches found`);
            getMatches(`/matches/${selectedOrgan}`);
        } else {
            setMsg(`✗ ${res?.message || 'Matching failed'}`);
        }
    };

    const handleSendOffer = useCallback(async (matchId) => {
        const res = await sendOffer('/offers', { match_id: matchId });
        if (res?.success) {
            setMsg('✓ Offer sent successfully');
            setTimeout(() => navigate(`/offers/${res.data?.data?.offer_id}`), 800);
        } else {
            setMsg(`✗ ${res?.message || 'Failed to send offer'}`);
        }
    }, [sendOffer, navigate]);

    return (
        <div className="matching-page">
            <div className="mp-header">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                        <div className="mp-title">Organ Matching Engine</div>
                        <div className="mp-sub">Select an organ to view ranked recipients</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {selectedOrgan && (
                            <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: 12 }} onClick={handleRunMatch} disabled={running}>
                                {running ? 'Running…' : '↺ Re-run Match'}
                            </button>
                        )}
                        <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 12 }} onClick={() => navigate('/donors/register')}>+ New Organ</button>
                    </div>
                </div>
            </div>

            {msg && (
                <div style={{ padding: '9px 14px', borderRadius: 'var(--r-sm)', marginBottom: 16, fontSize: 12, fontWeight: 600, background: msg.startsWith('✓') ? 'var(--forest-dim)' : 'var(--burgundy-dim)', color: msg.startsWith('✓') ? 'var(--forest)' : 'var(--burgundy)', border: `1px solid ${msg.startsWith('✓') ? 'var(--forest-border)' : 'var(--burgundy-border)'}` }}>
                    {msg}
                </div>
            )}

            {/* Organ selector */}
            <div className="panel" style={{ marginBottom: 20 }}>
                <div className="panel-header">
                    <div className="panel-title">Select Organ to Match</div>
                    <span className="panel-badge pb-teal">{organs.length} available</span>
                </div>
                {organs.length === 0 ? (
                    <div className="empty-state"><div className="empty-icon">🫀</div>No available organs in database</div>
                ) : (
                    <div style={{ padding: '12px 14px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {organs.map(o => {
                            const sel = String(selectedOrgan) === String(o.organ_id);
                            return (
                                <div key={o.organ_id} onClick={() => setSelectedOrgan(o.organ_id)} style={{
                                    padding: '9px 14px', borderRadius: 'var(--r-sm)', cursor: 'pointer',
                                    border: `1px solid ${sel ? 'var(--burgundy)' : 'var(--border)'}`,
                                    background: sel ? 'var(--burgundy-dim)' : 'var(--surface)',
                                    transition: 'all 0.12s',
                                }}>
                                    <OrganPill organId={o.organ_type} size="sm" />
                                    <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                                        {o.blood_group} · {o.hours_remaining != null ? `${Number(o.hours_remaining).toFixed(1)}h` : '—'} · {o.donor_city}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Results */}
            {selectedOrgan && (
                <>
                    {/* Blood filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Filter blood:</div>
                        {bloodGroups.map(bg => (
                            <button key={bg} onClick={() => setFilterBlood(bg)} style={{
                                padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                                cursor: 'pointer', border: '1px solid',
                                background: filterBlood === bg ? 'var(--burgundy)' : 'transparent',
                                borderColor: filterBlood === bg ? 'transparent' : 'var(--border)',
                                color: filterBlood === bg ? '#fff' : 'var(--text-3)',
                                fontFamily: 'var(--font-body)', transition: 'all 0.12s',
                            }}>{bg === 'all' ? 'All' : `🩸 ${bg}`}</button>
                        ))}
                        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                            {filtered.length} match{filtered.length !== 1 ? 'es' : ''} ranked
                        </div>
                    </div>

                    {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>}

                    {!loading && filtered.length === 0 && (
                        <div className="empty-state"><div className="empty-icon">🔬</div>No matches found — try running the matching algorithm</div>
                    )}

                    {/* Match cards using vw_match_results_detail fields */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {filtered.map((m, i) => {
                            // Find the organ details for this match
                            const organ = organs.find(o => String(o.organ_id) === String(selectedOrgan));
                            return (
                                <MatchCard
                                    key={m.match_id}
                                    rank={m.rank_position}
                                    isTop={i === 0}
                                    donor={{
                                        name: m.donor_hospital,
                                        blood: m.donor_blood,
                                        hospital: m.donor_hospital,
                                        city: m.donor_city,
                                        organId: m.organ_type,
                                        remainingHours: organ?.hours_remaining,
                                        maxHours: organ?.viability_hours,
                                    }}
                                    recipient={{
                                        name: m.recipient_name,
                                        blood: m.recipient_blood,
                                        hospital: m.recipient_hospital,
                                        city: m.recipient_city,
                                        urgency: m.medical_urgency?.replace('status_', '').toUpperCase(),
                                        waitDays: null,
                                    }}
                                    scores={{
                                        total: m.total_score,
                                        abo: m.score_abo,
                                        hla: m.score_hla,
                                        urgency: m.score_urgency,
                                        distance: m.score_distance,
                                        waitTime: m.score_wait_time,
                                    }}
                                    onOffer={() => handleSendOffer(m.match_id)}
                                />
                            );
                        })}
                    </div>
                </>
            )}

            {!selectedOrgan && organs.length > 0 && (
                <div className="empty-state" style={{ border: '1px dashed var(--border)', borderRadius: 'var(--r-md)' }}>
                    <div className="empty-icon">🔬</div>
                    Select an organ above to view ranked recipient matches
                </div>
            )}
        </div>
    );
}