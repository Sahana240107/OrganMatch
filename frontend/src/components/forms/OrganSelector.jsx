import { ORGAN_TYPES, ORGAN_VIABILITY_HOURS } from '../../utils/constants'

const ORGAN_META = {
    kidney: { emoji: '🫘', color: '#60a5fa', border: 'rgba(96,165,250,0.3)', bg: 'rgba(96,165,250,0.12)' },
    heart: { emoji: '❤️', color: '#f87171', border: 'rgba(248,113,113,0.3)', bg: 'rgba(248,113,113,0.12)' },
    liver: { emoji: '🍂', color: '#fbbf24', border: 'rgba(251,191,36,0.3)', bg: 'rgba(251,191,36,0.12)' },
    lung: { emoji: '🫁', color: '#2dd4bf', border: 'rgba(45,212,191,0.3)', bg: 'rgba(45,212,191,0.12)' },
    pancreas: { emoji: '🟣', color: '#a78bfa', border: 'rgba(167,139,250,0.3)', bg: 'rgba(167,139,250,0.12)' },
    cornea: { emoji: '👁', color: '#fb7185', border: 'rgba(251,113,133,0.3)', bg: 'rgba(251,113,133,0.12)' },
    bone: { emoji: '🦴', color: '#94a3b8', border: 'rgba(148,163,184,0.3)', bg: 'rgba(148,163,184,0.12)' },
    small_intestine: { emoji: '🔵', color: '#34d399', border: 'rgba(52,211,153,0.3)', bg: 'rgba(52,211,153,0.12)' },
}

const LABELS = {
    kidney: 'Kidney', heart: 'Heart', liver: 'Liver', lung: 'Lung',
    pancreas: 'Pancreas', cornea: 'Cornea', bone: 'Bone', small_intestine: 'Sm. Intestine',
}

export default function OrganSelector({ selected = [], onChange }) {
    function toggle(organ) {
        if (selected.includes(organ)) {
            onChange?.(selected.filter((o) => o !== organ))
        } else {
            onChange?.([...selected, organ])
        }
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ORGAN_TYPES.map((organ) => {
                const meta = ORGAN_META[organ]
                const sel = selected.includes(organ)
                return (
                    <button
                        key={organ}
                        type="button"
                        onClick={() => toggle(organ)}
                        style={{
                            padding: '10px 8px',
                            borderRadius: 8,
                            border: `1px solid ${sel ? meta.border : 'var(--border)'}`,
                            background: sel ? meta.bg : 'var(--bg3)',
                            color: sel ? meta.color : 'var(--text2)',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.15s', textAlign: 'center',
                            fontFamily: 'var(--font)',
                        }}
                    >
                        <span style={{ marginRight: 4 }}>{meta.emoji}</span>
                        {LABELS[organ]}
                        <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2, opacity: 0.7 }}>
                            {ORGAN_VIABILITY_HOURS[organ]}h viability
                        </div>
                    </button>
                )
            })}
        </div>
    )
}