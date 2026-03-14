import React, { useMemo } from 'react';
import { getViabilityColor, getViabilityPct, ringOffset } from '../../utils/formatters';

/**
 * ViabilityRing — SVG circular progress ring showing organ viability
 * @param {number}  remainingHours
 * @param {number}  maxHours
 * @param {number}  size         - ring diameter in px (default 44)
 * @param {number}  strokeWidth  - (default 3)
 * @param {boolean} showLabel    - show percentage text inside ring
 */
export default function ViabilityRing({
    remainingHours,
    maxHours,
    size = 44,
    strokeWidth = 3,
    showLabel = true,
}) {
    const r = (size - strokeWidth * 2) / 2;
    const circ = 2 * Math.PI * r;
    const cx = size / 2;
    const cy = size / 2;

    const pct = useMemo(() => getViabilityPct(remainingHours, maxHours), [remainingHours, maxHours]);
    const color = useMemo(() => getViabilityColor(pct), [pct]);
    const offset = useMemo(() => ringOffset(pct, circ), [pct, circ]);

    const fontSize = size < 40 ? 9 : size < 60 ? 11 : 13;

    return (
        <div className="viab-ring" style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                style={{ transform: 'rotate(-90deg)' }}
            >
                {/* Track */}
                <circle
                    cx={cx} cy={cy} r={r}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={strokeWidth}
                />
                {/* Progress */}
                <circle
                    cx={cx} cy={cy} r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
                />
            </svg>
            {showLabel && (
                <div
                    style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize, fontWeight: 700, color,
                    }}
                >
                    {pct}%
                </div>
            )}
        </div>
    );
}