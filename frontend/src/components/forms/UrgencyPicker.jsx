const OPTIONS = [
    { value: 'status_1a', label: '1A', cls: 'sel-1a', desc: 'Critical / ICU' },
    { value: 'status_1b', label: '1B', cls: 'sel-1b', desc: 'Serious' },
    { value: 'status_2', label: '2', cls: 'sel-2', desc: 'Moderate' },
    { value: 'status_3', label: '3', cls: 'sel-3', desc: 'Stable' },
]

export default function UrgencyPicker({ value, onChange }) {
    return (
        <div style={{ display: 'flex', gap: 6 }}>
            {OPTIONS.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    className={`urgency-btn${value === opt.value ? ` ${opt.cls}` : ''}`}
                    onClick={() => onChange?.(opt.value)}
                    title={opt.desc}
                >
                    {opt.label}
                    <div style={{ fontSize: 9, fontWeight: 400, marginTop: 1, opacity: 0.8 }}>{opt.desc}</div>
                </button>
            ))}
        </div>
    )
}