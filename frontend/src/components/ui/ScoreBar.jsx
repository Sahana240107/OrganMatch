import React from 'react';

/**
 * ScoreBar — horizontal bar showing a single score dimension
 * @param {string}  label    - dimension name e.g. "Blood ABO"
 * @param {number}  value    - 0-100
 * @param {number}  weight   - weight percentage for this factor
 * @param {string}  color    - bar fill color
 * @param {boolean} showPct
 */
export default function ScoreBar({ label, value = 0, weight, color = '#30d9a0', showPct = true, height = 5 }) {
    const pct = Math.min(100, Math.max(0, value));

    return (
        <div className="score-bar-row" style={{ marginBottom: 8 }}>
            {label && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'rgba(240,244,255,0.5)' }}>
                        {label}
                        {weight !== undefined && (
                            <span style={{ color: 'rgba(240,244,255,0.25)', marginLeft: 4 }}>({weight}%)</span>
                        )}
                    </span>
                    {showPct && (
                        <span style={{ fontSize: 11, fontWeight: 700, color }}>{pct.toFixed(0)}</span>
                    )}
                </div>
            )}
            <div
                style={{
                    width: '100%', height,
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: height,
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                        borderRadius: height,
                        transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                    }}
                />
            </div>
        </div>
    );
}