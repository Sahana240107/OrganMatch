import React from 'react';

/**
 * KPICard — dashboard metric card
 * @param {string}  label
 * @param {string|number} value
 * @param {string}  delta    - subtitle text e.g. "↑ 8 in last 24 hrs"
 * @param {string}  color    - 'green' | 'red' | 'blue' | 'amber' | 'purple'
 * @param {number}  barPct   - 0-100 fill percentage for bottom bar
 * @param {string}  barColor - CSS color for bar fill
 * @param {function} onClick
 */
export default function KPICard({ label, value, delta, color = 'green', barPct = 0, barColor, onClick }) {
    const colorMap = {
        green: '#30d9a0',
        red: '#e05c3a',
        blue: '#4f9cf9',
        amber: '#f0a940',
        purple: '#b478ff',
    };
    const c = colorMap[color] || colorMap.green;

    return (
        <div className="kpi-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-val" style={{ color: c }}>{value}</div>
            {delta && <div className="kpi-delta">{delta}</div>}
            <div className="kpi-bar">
                <div
                    className="kpi-bar-fill"
                    style={{ width: `${Math.min(100, Math.max(0, barPct))}%`, background: barColor || c }}
                />
            </div>
        </div>
    );
}