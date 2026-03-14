import React from 'react';
import { HLA_ANTIGENS } from '../../utils/constants';

/**
 * HLAInput — 6-field HLA antigen grid
 * @param {object}   value    - { A1: '', A2: '', B7: '', B8: '', DR3: '', DR4: '' }
 * @param {function} onChange - (newValue) => void
 * @param {boolean}  disabled
 */
export default function HLAInput({ value = {}, onChange, disabled = false }) {
    function handleChange(antigen, v) {
        onChange({ ...value, [antigen]: v });
    }

    return (
        <div>
            <div style={{ fontSize: 11, color: 'var(--faint)', marginBottom: 10, lineHeight: 1.6 }}>
                Enter HLA antigen values. Leave blank if not typed.
            </div>
            <div className="hla-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8 }}>
                {HLA_ANTIGENS.map((ag) => (
                    <div key={ag} className="hla-item" style={{
                        background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 8, textAlign: 'center',
                        border: value[ag] ? '1px solid rgba(79,156,249,0.3)' : '1px solid transparent',
                        transition: 'border-color 0.2s',
                    }}>
                        <div style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 4 }}>{ag}</div>
                        <input
                            type="text"
                            value={value[ag] || ''}
                            onChange={(e) => handleChange(ag, e.target.value)}
                            disabled={disabled}
                            placeholder="—"
                            maxLength={5}
                            style={{
                                width: '100%', background: 'none', border: 'none', outline: 'none',
                                textAlign: 'center', fontSize: 13, fontWeight: 700,
                                color: '#4f9cf9', fontFamily: 'var(--font-body)',
                                cursor: disabled ? 'not-allowed' : 'text',
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}