import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

const MAP_W = 900, MAP_H = 520;
const LAT_MIN = 8, LAT_MAX = 37, LNG_MIN = 68, LNG_MAX = 98;

function project(lat, lng) {
    return {
        x: ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * MAP_W,
        y: ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * MAP_H,
    };
}

const LEVEL_COLORS = {
    national: 'var(--coral)',
    zonal: 'var(--amber)',
    regional: 'var(--blue)',
    state: 'var(--teal)',
    district: 'var(--purple)',
};

export default function LocationMap() {
    const { get, data, loading, error } = useApi();
    const [selected, setSelected] = useState(null);
    const [filter, setFilter] = useState('all');

    useEffect(() => { get('/hospitals'); }, []);

    const hospitals = (data?.data || []).filter(h => h.latitude && h.longitude);
    const allHospitals = data?.data || [];
    const types = ['all', ...new Set(hospitals.map(h => h.level).filter(Boolean))];
    const filtered = filter === 'all' ? hospitals : hospitals.filter(h => h.level === filter);
    const selHosp = selected != null ? hospitals.find(h => h.hospital_id === selected) : null;

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 58px)', flexDirection: 'column' }}>
            {/* Top bar */}
            <div style={{
                padding: '12px 22px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'rgba(6,11,20,0.95)', backdropFilter: 'blur(16px)',
                flexWrap: 'wrap',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: 'var(--teal)', boxShadow: '0 0 8px var(--teal)',
                        animation: 'pulse-dot 2s ease-in-out infinite',
                        flexShrink: 0,
                    }} />
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700 }}>Hospital Network Map</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                    {loading ? 'Loading hospitals…' :
                        error ? <span style={{ color: 'var(--coral)' }}>Failed to load — check backend connection</span> :
                            `${hospitals.filter(h => h.is_active).length} active · ${hospitals.length} with coordinates · ${allHospitals.length} total`
                    }
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {types.map(t => (
                        <button key={t} onClick={() => setFilter(t)} style={{
                            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                            cursor: 'pointer', border: '1px solid',
                            background: filter === t ? 'var(--coral)' : 'rgba(255,255,255,0.04)',
                            borderColor: filter === t ? 'transparent' : 'var(--border)',
                            color: filter === t ? '#fff' : 'var(--text-2)',
                            fontFamily: 'var(--font-body)', transition: 'all 0.15s', textTransform: 'capitalize',
                        }}>
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Map body */}
            <div style={{ flex: 1, position: 'relative', background: '#060d1a', overflow: 'hidden' }}>

                {/* Empty state — no data or no coordinates */}
                {!loading && allHospitals.length === 0 && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 14, color: 'var(--text-2)',
                    }}>
                        <div style={{ fontSize: 48, opacity: 0.3 }}>📍</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>No hospitals in database</div>
                        <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', maxWidth: 320 }}>
                            Add hospitals with latitude/longitude coordinates via the backend to see them on this map.
                        </div>
                    </div>
                )}

                {!loading && allHospitals.length > 0 && hospitals.length === 0 && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 14, color: 'var(--text-2)',
                    }}>
                        <div style={{ fontSize: 48, opacity: 0.3 }}>🗺️</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{allHospitals.length} hospitals loaded</div>
                        <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', maxWidth: 320 }}>
                            None have latitude/longitude coordinates yet. Update hospital records with coordinates to plot them here.
                        </div>
                    </div>
                )}

                <svg width="100%" height="100%" viewBox={`0 0 ${MAP_W} ${MAP_H}`}
                    preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0 }}>
                    <defs>
                        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
                        </pattern>
                        <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="rgba(15,212,164,0.05)" />
                            <stop offset="100%" stopColor="transparent" />
                        </radialGradient>
                        <filter id="glow2">
                            <feGaussianBlur stdDeviation="3" result="b" />
                            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                        <filter id="softGlow">
                            <feGaussianBlur stdDeviation="6" result="b" />
                            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                    </defs>
                    <rect width={MAP_W} height={MAP_H} fill="url(#grid)" />
                    <rect width={MAP_W} height={MAP_H} fill="url(#mapGlow)" />

                    {/* India outline simplified */}
                    <polygon
                        points="230,40 380,10 520,20 620,80 700,160 720,260 680,360 600,430 480,490 350,500 200,460 100,380 60,260 80,150 150,80"
                        fill="rgba(15,212,164,0.02)" stroke="rgba(15,212,164,0.07)" strokeWidth="1.5" />

                    {filtered.map(h => {
                        const { x, y } = project(Number(h.latitude), Number(h.longitude));
                        const color = LEVEL_COLORS[h.level] || 'var(--blue)';
                        const isSel = selected === h.hospital_id;
                        return (
                            <g key={h.hospital_id}
                                onClick={() => setSelected(selected === h.hospital_id ? null : h.hospital_id)}
                                style={{ cursor: 'pointer' }}
                                filter={isSel ? 'url(#softGlow)' : undefined}>
                                {h.is_active && (
                                    <circle cx={x} cy={y} r="10" fill="none" stroke={color} strokeWidth="1" opacity="0.5">
                                        <animate attributeName="r" from="10" to="26" dur="2s" repeatCount="indefinite" />
                                        <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
                                    </circle>
                                )}
                                <circle cx={x} cy={y} r={isSel ? 13 : 8}
                                    fill={`${color}18`} stroke={color} strokeWidth={isSel ? 2 : 1.5}
                                    style={{ transition: 'r 0.2s' }} />
                                <circle cx={x} cy={y} r={h.is_active ? 4 : 2.5}
                                    fill={h.is_active ? color : 'rgba(255,255,255,0.2)'} />
                                <text x={x} y={y + 20} textAnchor="middle"
                                    fill={h.is_active ? 'rgba(232,240,255,0.6)' : 'rgba(232,240,255,0.2)'}
                                    fontSize="8" fontFamily="Outfit,sans-serif">{h.name}</text>
                            </g>
                        );
                    })}
                </svg>

                {/* Legend */}
                <div style={{
                    position: 'absolute', bottom: 20, left: 20,
                    background: 'rgba(6,11,20,0.92)', backdropFilter: 'blur(16px)',
                    border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
                    padding: '12px 16px', minWidth: 150,
                }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Hospital Level</div>
                    {Object.entries(LEVEL_COLORS).map(([k, c]) => (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--text-2)', marginBottom: 5 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0, boxShadow: `0 0 4px ${c}` }} />
                            <span style={{ textTransform: 'capitalize' }}>{k}</span>
                        </div>
                    ))}
                </div>

                {/* Stats */}
                <div style={{ position: 'absolute', top: 20, left: 20, display: 'flex', gap: 10 }}>
                    {[
                        { label: 'Active', value: hospitals.filter(h => h.is_active).length, color: 'var(--teal)' },
                        { label: 'Total', value: allHospitals.length, color: 'var(--blue)' },
                        { label: 'On Map', value: filtered.length, color: 'var(--amber)' },
                    ].map(s => (
                        <div key={s.label} style={{
                            background: 'rgba(6,11,20,0.88)', backdropFilter: 'blur(12px)',
                            border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '8px 14px',
                        }}>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3 }}>{s.label}</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                        </div>
                    ))}
                </div>

                {/* Hospital detail panel */}
                {selHosp && (
                    <div style={{
                        position: 'absolute', top: 20, right: 20, width: 270,
                        background: 'rgba(6,11,20,0.97)', backdropFilter: 'blur(20px)',
                        border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
                        overflow: 'hidden', animation: 'fade-up 0.2s ease',
                        boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                    }}>
                        <div style={{
                            padding: '12px 14px', borderBottom: '1px solid var(--border)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{selHosp.name}</div>
                            <button onClick={() => setSelected(null)} style={{
                                background: 'none', border: 'none',
                                color: 'var(--text-3)', cursor: 'pointer', fontSize: 18, lineHeight: 1,
                                padding: '0 4px',
                            }}>×</button>
                        </div>
                        {[
                            { k: 'City / State', v: `${selHosp.city || '—'}, ${selHosp.state || '—'}` },
                            { k: 'Level', v: selHosp.level, cap: true },
                            {
                                k: 'Status', v: selHosp.is_active ? 'Active' : 'Inactive',
                                color: selHosp.is_active ? 'var(--teal)' : 'var(--coral)'
                            },
                            { k: 'ICU Beds', v: selHosp.icu_beds_available != null ? `${selHosp.icu_beds_available} / ${selHosp.icu_beds_total}` : '—' },
                            { k: 'Phone', v: selHosp.phone || '—' },
                        ].map(row => (
                            <div key={row.k} style={{
                                padding: '8px 14px', borderBottom: '1px solid var(--border)',
                                display: 'flex', justifyContent: 'space-between', fontSize: 11,
                            }}>
                                <span style={{ color: 'var(--text-3)' }}>{row.k}</span>
                                <span style={{
                                    fontWeight: 600, color: row.color || 'var(--text)',
                                    textTransform: row.cap ? 'capitalize' : 'none',
                                    textAlign: 'right', maxWidth: 160,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>{row.v}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Loading overlay */}
                {loading && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 12, background: 'rgba(6,11,20,0.6)', backdropFilter: 'blur(4px)',
                    }}>
                        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
                        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Loading hospital network…</div>
                    </div>
                )}
            </div>
        </div>
    );
}