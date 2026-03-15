/**
 * HLAInput — 6-field HLA antigen grid (A, B, DR, DQ).
 * value: { hla_a1, hla_a2, hla_b1, hla_b2, hla_dr1, hla_dr2, hla_dq1, hla_dq2 }
 */
export default function HLAInput({ value = {}, onChange }) {
    const fields = [
        { locus: 'HLA-A', keys: ['hla_a1', 'hla_a2'], placeholders: ['A*01', 'A*02'] },
        { locus: 'HLA-B', keys: ['hla_b1', 'hla_b2'], placeholders: ['B*07', 'B*35'] },
        { locus: 'HLA-DR', keys: ['hla_dr1', 'hla_dr2'], placeholders: ['DR3', 'DR7'] },
        { locus: 'HLA-DQ', keys: ['hla_dq1', 'hla_dq2'], placeholders: ['DQ1', 'DQ2'] },
    ]

    function handleChange(key, val) {
        onChange?.({ ...value, [key]: val })
    }

    function matchStatus(k1, k2) {
        const v1 = value[k1], v2 = value[k2]
        if (!v1 && !v2) return { cls: 'hla-none', label: '— No data' }
        if (v1 && v2) return { cls: 'hla-full', label: '✓ Both alleles' }
        return { cls: 'hla-partial', label: '~ Partial' }
    }

    return (
        <div className="hla-grid">
            {fields.map(({ locus, keys, placeholders }) => {
                const ms = matchStatus(keys[0], keys[1])
                return (
                    <div key={locus} className="hla-input-group">
                        <div className="hla-locus">{locus}</div>
                        <div className="hla-fields">
                            {keys.map((k, i) => (
                                <input
                                    key={k}
                                    className="hla-field"
                                    value={value[k] || ''}
                                    placeholder={placeholders[i]}
                                    onChange={(e) => handleChange(k, e.target.value.toUpperCase())}
                                />
                            ))}
                        </div>
                        <div className={`hla-match ${ms.cls}`}>{ms.label}</div>
                    </div>
                )
            })}
        </div>
    )
}