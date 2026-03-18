import { organClass } from '../../utils/formatters'

const LABELS = {
    kidney: 'Kidney', heart: 'Heart', liver: 'Liver',
    lung: 'Lung', pancreas: 'Pancreas', cornea: 'Cornea',
    bone: 'Bone', small_intestine: 'Sm. Intestine',
}

export default function OrganPill({ type }) {
    return (
        <span className={`organ-pill ${organClass(type)}`}>
            {LABELS[type] || type}
        </span>
    )
}