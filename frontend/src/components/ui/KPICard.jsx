import React from 'react';

export default function KPICard({ label, value, delta, color = 'teal', barPct = 0, barColor, onClick }) {
    const colorMap = {
        teal: 'var(--forest)',
        green: 'var(--forest)',
        coral: 'var(--burgundy)',
        red: 'var(--burgundy)',
        blue: 'var(--steel)',
        amber: 'var(--amber)',
        yellow: 'var(--amber)',
        purple: 'var(--sienna)',
    };
    const borderMap = {
        teal: 'var(--forest)',
        green: 'var(--forest)',
        coral: 'var(--burgundy)',
        red: 'var(--burgundy)',
        blue: 'var(--steel)',
        amber: 'var(--amber)',
        yellow: 'var(--amber)',
        purple: 'var(--sienna)',
    };
    const c = colorMap[color] || color || 'var(--forest)';
    const bc = borderMap[color] || c;

    return (
        <div
            className="kpi-card"
            onClick={onClick}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
            {/* top accent rule */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                background: bc, opacity: 0.7,
            }} />

            <div className="kpi-label">{label}</div>
            <div className="kpi-val" style={{ color: c }}>{value}</div>
            {delta && <div className="kpi-delta">{delta}</div>}
            <div className="kpi-bar">
                <div
                    className="kpi-bar-fill"
                    style={{
                        width: `${Math.min(100, Math.max(0, barPct))}%`,
                        background: barColor || bc,
                    }}
                />
            </div>
        </div>
    );
}