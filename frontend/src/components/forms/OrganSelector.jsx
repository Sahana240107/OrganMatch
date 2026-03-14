import React from 'react';
import { ORGAN_TYPES } from '../../utils/constants';

/**
 * OrganSelector — clickable organ grid (multi-select)
 * @param {string[]} value    - array of selected organ IDs
 * @param {function} onChange - (newArray) => void
 * @param {boolean}  single   - single select mode
 * @param {boolean}  disabled
 */
export default function OrganSelector({ value = [], onChange, single = false, disabled = false }) {
    function toggle(id) {
        if (disabled) return;
        if (single) {
            onChange(value[0] === id ? [] : [id]);
            return;
        }
        if (value.includes(id)) {
            onChange(value.filter(v => v !== id));
        } else {
            onChange([...value, id]);
        }
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {ORGAN_TYPES.map((organ) => {
                const selected = value.includes(organ.id);
                return (
                    <div
                        key={organ.id}
                        onClick={() => toggle(organ.id)}
                        style={{
                            background: selected ? `${organ.color}18` : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${selected ? organ.color : 'var(--border)'}`,
                            borderRadius: 12, padding: '12px 10px', textAlign: 'center',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s', opacity: disabled ? 0.5 : 1,
                            userSelect: 'none',
                        }}
                    >
                        <span style={{
                            fontSize: 22, display: 'block', marginBottom: 5,
                            transform: selected ? 'scale(1.2)' : 'scale(1)',
                            transition: 'transform 0.2s',
                        }}>
                            {organ.icon}
                        </span>
                        <div style={{
                            fontSize: 11, fontWeight: 500,
                            color: selected ? organ.color : 'var(--muted)',
                            transition: 'color 0.2s',
                        }}>
                            {organ.label}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}