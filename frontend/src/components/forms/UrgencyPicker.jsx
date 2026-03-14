import React from 'react';
import { URGENCY_LABELS } from '../../utils/constants';

/**
 * UrgencyPicker — 1A / 1B / 2 / 3 urgency selector
 * @param {string}   value    - selected urgency key
 * @param {function} onChange - (key) => void
 * @param {boolean}  disabled
 */
export default function UrgencyPicker({ value, onChange, disabled = false }) {
    return (
        <div style={{ display: 'flex', gap: 10 }}>
            {Object.entries(URGENCY_LABELS).map(([key, info]) => {
                const selected = value === key;
                return (
                    <div
                        key={key}
                        onClick={() => !disabled && onChange(key)}
                        style={{
                            flex: 1,
                            background: selected ? `${info.color}18` : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${selected ? info.color : 'var(--border)'}`,
                            borderRadius: 10, padding: '10px 14px',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8,
                            transition: 'all 0.2s', opacity: disabled ? 0.5 : 1,
                            userSelect: 'none',
                        }}
                    >
                        <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: info.color, flexShrink: 0,
                            boxShadow: selected ? `0 0 6px ${info.color}` : 'none',
                            transition: 'box-shadow 0.2s',
                        }} />
                        <div>
                            <div style={{ fontWeight: 600, fontSize: 12, color: selected ? info.color : 'var(--text)' }}>
                                {info.label}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                                {info.sub}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}