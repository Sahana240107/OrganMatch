/**
 * HLAInput — 6-field HLA antigen grid (A, B, DR, DQ).
 * Compatible with light theme CSS variables.
 */
export default function HLAInput({ value = {}, onChange }) {
  const fields = [
    { locus: 'HLA-A',  keys: ['hla_a1','hla_a2'],   placeholders: ['A*01','A*02'] },
    { locus: 'HLA-B',  keys: ['hla_b1','hla_b2'],   placeholders: ['B*07','B*35'] },
    { locus: 'HLA-DR', keys: ['hla_dr1','hla_dr2'], placeholders: ['DR3','DR7'] },
    { locus: 'HLA-DQ', keys: ['hla_dq1','hla_dq2'], placeholders: ['DQ1','DQ2'] },
  ]

  function handleChange(key, val) {
    onChange?.({ ...value, [key]: val })
  }

  return (
    <div className="hla-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
      {fields.map(({ locus, keys, placeholders }) => {
        const filled = keys.filter(k => value[k]).length
        const statusCls = filled === 2 ? 'hla-full' : filled === 1 ? 'hla-partial' : 'hla-none'
        const statusTxt = filled === 2 ? '✓ Both alleles' : filled === 1 ? '~ Partial' : '— No data'
        return (
          <div key={locus} className="hla-locus">
            <div className="hla-locus-label">{locus}</div>
            <div className="hla-allele-row">
              {keys.map((k, i) => (
                <input
                  key={k}
                  value={value[k] || ''}
                  placeholder={placeholders[i]}
                  onChange={e => handleChange(k, e.target.value.toUpperCase())}
                  maxLength={10}
                />
              ))}
            </div>
            <div style={{ marginTop: 5 }}>
              <span className={`hla-badge ${statusCls}`} style={{ fontSize: 10 }}>{statusTxt}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
