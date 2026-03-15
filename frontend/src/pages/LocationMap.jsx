import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

/* ─── Mock hospital network data ─────────────────────────────────── */
const MOCK_HOSPITALS = [
    { id: 1, name: 'AIIMS Delhi', city: 'Delhi', lat: 28.5672, lng: 77.2100, type: 'zonal', organs: 3, capacity: 'high', blood: ['O+', 'A+', 'B+'], active: true },
    { id: 2, name: 'PGIMER Chandigarh', city: 'Chandigarh', lat: 30.7652, lng: 76.7812, type: 'regional', organs: 2, capacity: 'medium', blood: ['O-', 'AB+'], active: true },
    { id: 3, name: 'Fortis Gurgaon', city: 'Gurgaon', lat: 28.4595, lng: 77.0266, type: 'private', organs: 1, capacity: 'medium', blood: ['A+', 'B-'], active: true },
    { id: 4, name: 'Apollo Chennai', city: 'Chennai', lat: 13.0827, lng: 80.2707, type: 'private', organs: 1, capacity: 'high', blood: ['O+', 'A+'], active: true },
    { id: 5, name: 'Medanta Gurgaon', city: 'Gurgaon', lat: 28.4458, lng: 77.0347, type: 'private', organs: 0, capacity: 'high', blood: ['O+', 'B+', 'AB+'], active: false },
    { id: 6, name: 'Max Delhi', city: 'Delhi', lat: 28.6878, lng: 77.1525, type: 'private', organs: 0, capacity: 'low', blood: ['A-', 'B+'], active: false },
    { id: 7, name: 'KEM Mumbai', city: 'Mumbai', lat: 19.0020, lng: 72.8418, type: 'government', organs: 2, capacity: 'high', blood: ['O+', 'A+', 'B+'], active: true },
    { id: 8, name: 'NIMHANS Bangalore', city: 'Bangalore', lat: 12.9381, lng: 77.5933, type: 'government', organs: 1, capacity: 'medium', blood: ['B+', 'AB-'], active: true },
];

const ACTIVE_ROUTE = {
    from: { id: 2, name: 'PGIMER Chandigarh' },
    to: { id: 1, name: 'AIIMS Delhi' },
    organ: 'Kidney', distance: 267, eta: '3h 45m', transport: 'Air ambulance',
};

/* SVG coordinate mapping (simple equirectangular for India viewport) */
const MAP_W = 900, MAP_H = 520;
const LAT_MIN = 8, LAT_MAX = 37, LNG_MIN = 68, LNG_MAX = 98;

function project(lat, lng) {
    const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * MAP_W;
    const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * MAP_H;
    return { x, y };
}

const TYPE_COLORS = {
    zonal: '#e05c3a',
    regional: '#4f9cf9',
    private: '#30d9a0',
    government: '#b478ff',
};

export default function LocationMap() {
    const { get, data } = useApi();
    const [selected, setSelected] = useState(null);
    const [filter, setFilter] = useState('all');
    const hospitals = data?.hospitals || MOCK_HOSPITALS;

    useEffect(() => { get('/hospital/network'); }, [get]);

    const filtered = filter === 'all' ? hospitals : hospitals.filter(h => h.type === filter);

    const selHosp = selected != null ? hospitals.find(h => h.id === selected) : null;

    /* Route line coords */
    const routeFrom = project(MOCK_HOSPITALS[1].lat, MOCK_HOSPITALS[1].lng);
    const routeTo = project(MOCK_HOSPITALS[0].lat, MOCK_HOSPITALS[0].lng);

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 56px)', flexDirection: 'column' }}>
            {/* Top bar */}
            <div style={{
                padding: '14px 24px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'rgba(8,14,26,0.8)', backdropFilter: 'blur(12px)',
            }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>
                    Hospital Network Map
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {hospitals.filter(h => h.active).length} active · {hospitals.length} total
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    {['all', 'zonal', 'regional', 'private', 'government'].map(t => (
                        <button
                            key={t}
                            onClick={() => setFilter(t)}
                            style={{
                                padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                                cursor: 'pointer', border: '1px solid',
                                background: filter === t ? 'var(--accent)' : 'transparent',
                                borderColor: filter === t ? 'transparent' : 'var(--border)',
                                color: filter === t ? 'white' : 'var(--muted)',
                                fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                                textTransform: 'capitalize',
                            }}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Map area */}
            <div style={{ flex: 1, position: 'relative', background: '#0a1420', overflow: 'hidden' }}>
                <svg
                    width="100%" height="100%"
                    viewBox={`0 0 ${MAP_W} ${MAP_H}`}
                    preserveAspectRatio="xMidYMid meet"
                    style={{ position: 'absolute', inset: 0 }}
                >
                    {/* Grid */}
                    <defs>
                        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                        </pattern>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                    </defs>
                    <rect width={MAP_W} height={MAP_H} fill="url(#grid)" />

                    {/* India outline (simplified polygon) */}
                    <polygon
                        points="230,40 380,10 520,20 620,80 700,160 720,260 680,360 600,430 480,490 350,500 200,460 100,380 60,260 80,150 150,80"
                        fill="rgba(255,255,255,0.012)"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="1.5"
                    />

                    {/* Active transport route */}
                    <line
                        x1={routeFrom.x} y1={routeFrom.y}
                        x2={routeTo.x} y2={routeTo.y}
                        stroke="#30d9a0" strokeWidth="1.5"
                        strokeDasharray="6 4" opacity="0.7"
                    />
                    {/* Route label midpoint */}
                    <text
                        x={(routeFrom.x + routeTo.x) / 2}
                        y={(routeFrom.y + routeTo.y) / 2 - 8}
                        textAnchor="middle"
                        fill="rgba(48,217,160,0.8)" fontSize="10"
                        fontFamily="var(--font-body)" fontWeight="600"
                    >
                        ✈ Kidney · {ACTIVE_ROUTE.distance} km · ETA {ACTIVE_ROUTE.eta}
                    </text>

                    {/* Hospital nodes */}
                    {filtered.map(h => {
                        const { x, y } = project(h.lat, h.lng);
                        const color = TYPE_COLORS[h.type] || '#fff';
                        const isSel = selected === h.id;
                        return (
                            <g
                                key={h.id}
                                onClick={() => setSelected(selected === h.id ? null : h.id)}
                                style={{ cursor: 'pointer' }}
                                filter={isSel ? 'url(#glow)' : undefined}
                            >
                                {/* Pulse rings for active hospitals */}
                                {h.active && h.organs > 0 && (
                                    <>
                                        <circle cx={x} cy={y} r="12" fill="none" stroke={color} strokeWidth="1" opacity="0.5">
                                            <animate attributeName="r" from="12" to="28" dur="2s" repeatCount="indefinite" />
                                            <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
                                        </circle>
                                        <circle cx={x} cy={y} r="12" fill="none" stroke={color} strokeWidth="1" opacity="0.3">
                                            <animate attributeName="r" from="12" to="28" dur="2s" begin="0.7s" repeatCount="indefinite" />
                                            <animate attributeName="opacity" from="0.3" to="0" dur="2s" begin="0.7s" repeatCount="indefinite" />
                                        </circle>
                                    </>
                                )}
                                {/* Outer ring */}
                                <circle cx={x} cy={y} r={isSel ? 14 : 10}
                                    fill={`${color}20`} stroke={color} strokeWidth={isSel ? 2 : 1.5}
                                    style={{ transition: 'r 0.2s' }}
                                />
                                {/* Inner dot */}
                                <circle cx={x} cy={y} r={h.active ? 5 : 3}
                                    fill={h.active ? color : 'rgba(255,255,255,0.2)'}
                                />
                                {/* Organ count badge */}
                                {h.organs > 0 && (
                                    <text x={x + 10} y={y - 10} fill={color} fontSize="9" fontWeight="700" fontFamily="var(--font-body)">
                                        {h.organs}
                                    </text>
                                )}
                                {/* Label */}
                                <text x={x} y={y + 20} textAnchor="middle"
                                    fill={h.active ? 'rgba(240,244,255,0.7)' : 'rgba(240,244,255,0.3)'}
                                    fontSize="9" fontFamily="var(--font-body)"
                                >
                                    {h.name}
                                </text>
                            </g>
                        );
                    })}
                </svg>

                {/* Legend */}
                <div style={{
                    position: 'absolute', bottom: 20, left: 20,
                    background: 'rgba(8,14,26,0.88)', backdropFilter: 'blur(16px)',
                    border: '1px solid var(--border)', borderRadius: 12,
                    padding: '14px 16px', minWidth: 160,
                }}>
                    <div style={{ fontSize: 10, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                        Hospital Type
                    </div>
                    {Object.entries(TYPE_COLORS).map(([type, color]) => (
                        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                            <span style={{ textTransform: 'capitalize' }}>{type}</span>
                        </div>
                    ))}
                    <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--muted)' }}>
                            <div style={{ width: 20, height: 1, background: '#30d9a0', borderTop: '1px dashed #30d9a0' }} />
                            Active transport
                        </div>
                    </div>
                </div>

                {/* Hospital detail panel */}
                {selHosp && (
                    <div style={{
                        position: 'absolute', top: 20, right: 20,
                        width: 260, background: 'rgba(8,14,26,0.95)',
                        backdropFilter: 'blur(20px)', border: '1px solid var(--border)',
                        borderRadius: 14, overflow: 'hidden',
                        animation: 'fade-up 0.2s ease',
                    }}>
                        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>{selHosp.name}</div>
                            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer', fontSize: 16 }}>×</button>
                        </div>
                        {[
                            { k: 'City', v: selHosp.city },
                            { k: 'Type', v: selHosp.type, cap: true },
                            {
                                k: 'Status', v: selHosp.active ? 'Active' : 'Inactive',
                                color: selHosp.active ? '#30d9a0' : '#e05c3a'
                            },
                            { k: 'Available organs', v: selHosp.organs },
                            { k: 'ICU Capacity', v: selHosp.capacity, cap: true },
                            { k: 'Blood bank', v: selHosp.blood.join(' · ') },
                        ].map(row => (
                            <div key={row.k} style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                                <span style={{ color: 'var(--muted)' }}>{row.k}</span>
                                <span style={{ fontWeight: 600, color: row.color || 'var(--text)', textTransform: row.cap ? 'capitalize' : 'none' }}>{row.v}</span>
                            </div>
                        ))}
                        <div style={{ padding: '10px 14px' }}>
                            <button style={{
                                width: '100%', padding: '8px', background: 'var(--accent)',
                                border: 'none', borderRadius: 8, color: 'white', fontSize: 11,
                                fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
                            }}>
                                View Hospital Profile →
                            </button>
                        </div>
                    </div>
                )}

                {/* Stats overlay top-left */}
                <div style={{
                    position: 'absolute', top: 20, left: 20,
                    display: 'flex', gap: 10,
                }}>
                    {[
                        { label: 'Active Hospitals', value: hospitals.filter(h => h.active).length, color: '#30d9a0' },
                        { label: 'Organs in Transit', value: 3, color: '#f0a940' },
                        { label: 'Network Coverage', value: '312 hospitals', color: '#4f9cf9' },
                    ].map(s => (
                        <div key={s.label} style={{
                            background: 'rgba(8,14,26,0.85)', backdropFilter: 'blur(12px)',
                            border: '1px solid var(--border)', borderRadius: 10,
                            padding: '10px 14px',
                        }}>
                            <div style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 4 }}>{s.label}</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}