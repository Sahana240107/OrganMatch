import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MatchCard from '../components/ui/MatchCard';
import OrganPill from '../components/ui/OrganPill';
import { useApi } from '../hooks/useApi';

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
    const matches = matchData?.data || [];

    const filtered = filterBlood === 'all' ? matches : matches.filter(m => m.recipient_blood === filterBlood);
    const bloodGroups = ['all', ...new Set(matches.map(m => m.recipient_blood).filter(Boolean))];

    const handleRunMatch = async () => {
        if (!selectedOrgan) return;
        const res = await runMatch(`/matches/${selectedOrgan}/run`);
        if (res?.success) {
            setMsg(`✓ Matching complete — ${res.data?.data?.match_count || 0} feasible matches found`);
            getMatches(`/matches/${selectedOrgan}`);
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
                            <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: 12 }}
                                onClick={handleRunMatch} disabled={running}>
                                {running ? 'Running…' : '↺ Re-run Match'}
                            </button>
                        )}
                        <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 12 }} onClick={() => navigate('/donors/register')}>+ New Organ</button>
                    </div>
                </div>
            </div>

            {msg && (
                <div style={{
                    padding: '10px 16px', borderRadius: 'var(--r-md)', marginBottom: 16, fontSize: 12, fontWeight: 600,
                    background: msg.startsWith('✓') ? 'var(--teal-dim)' : 'var(--coral-dim)',
                    color: msg.startsWith('✓') ? 'var(--teal)' : 'var(--coral)',
                    border: `1px solid ${msg.startsWith('✓') ? 'rgba(15,212,164,0.2)' : 'rgba(240,90,53,0.2)'}`
                }}>
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
                    <div style={{ padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {organs.map(o => {
                            const sel = String(selectedOrgan) === String(o.organ_id);
                            return (
                                <div key={o.organ_id} onClick={() => setSelectedOrgan(o.organ_id)}
                                    style={{
                                        padding: '10px 16px', borderRadius: 'var(--r-md)', cursor: 'pointer',
                                        border: `1px solid ${sel ? 'var(--teal)' : 'var(--border)'}`,
                                        background: sel ? 'var(--teal-dim)' : 'var(--surface)',
                                        transition: 'all 0.15s',
                                    }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: sel ? 'var(--teal)' : 'var(--text)', marginBottom: 3 }}>
                                        {o.organ_type?.replace(/_/g, ' ')} · {o.blood_group}
                                    </div>
                                    <div style={{ fontSize: 10, color: 'var(--text-2)' }}>
                                        {o.donor_hospital} · {o.hours_remaining != null ? `${Number(o.hours_remaining).toFixed(1)}h left` : ''}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedOrgan && (
                <>
                    {/* Donor details */}
                    {organs.find(o => String(o.organ_id) === String(selectedOrgan)) && (() => {
                        const o = organs.find(o => String(o.organ_id) === String(selectedOrgan));
                        return (
                            <div style={{
                                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 20px', marginBottom: 20,
                                display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16
                            }}>
                                {[
                                    { label: 'Organ', value: o.organ_type?.replace(/_/g, ' ') },
                                    { label: 'Blood', value: o.blood_group },
                                    { label: 'Hospital', value: o.donor_hospital },
                                    { label: 'City', value: o.donor_city },
                                    {
                                        label: 'Viability', value: `${Number(o.hours_remaining || 0).toFixed(1)}h left`,
                                        color: (o.viability_pct || 100) < 30 ? 'var(--coral)' : 'var(--teal)'
                                    },
                                ].map(item => (
                                    <div key={item.label}>
                                        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{item.label}</div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: item.color || 'var(--text)', textTransform: 'capitalize' }}>{item.value}</div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}

                    {/* Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Blood filter:</span>
                        {bloodGroups.map(bg => (
                            <button key={bg} onClick={() => setFilterBlood(bg)} style={{
                                padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: '1px solid',
                                background: filterBlood === bg ? 'var(--coral)' : 'transparent',
                                borderColor: filterBlood === bg ? 'transparent' : 'var(--border)',
                                color: filterBlood === bg ? '#fff' : 'var(--text-2)',
                                fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                            }}>{bg === 'all' ? 'All' : bg}</button>
                        ))}
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-2)' }}>{filtered.length} recipient{filtered.length !== 1 ? 's' : ''} ranked</span>
                    </div>

                    {/* Match cards */}
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
                    ) : filtered.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">🔬</div>
                            No matches found. Try running the matching algorithm or check blood type filters.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {filtered.map((m, i) => (
                                <MatchCard key={m.match_id} rank={m.rank_position} isTop={i === 0}
                                    donor={{
                                        name: m.donor_hospital, blood: m.donor_blood,
                                        hospital: m.donor_hospital, city: m.donor_city,
                                        organId: m.organ_type,
                                        remainingHours: organs.find(o => String(o.organ_id) === String(selectedOrgan))?.hours_remaining,
                                        maxHours: organs.find(o => String(o.organ_id) === String(selectedOrgan))?.viability_hours,
                                    }}
                                    recipient={{
                                        name: m.recipient_name, blood: m.recipient_blood,
                                        hospital: m.recipient_hospital, city: m.recipient_city,
                                        urgency: m.medical_urgency,
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
                            ))}
                        </div>
                    )}
                </>
            )}

            {!selectedOrgan && organs.length > 0 && (
                <div className="empty-state">
                    <div className="empty-icon">🔬</div>
                    Select an organ above to view ranked recipients
                </div>
            )}
        </div>
    );
}