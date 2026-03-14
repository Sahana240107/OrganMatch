export const ORGAN_TYPES = ['kidney','heart','liver','lung','pancreas','cornea','bone','small_intestine'];

export const ORGAN_LABELS = {
  kidney: 'Kidney', heart: 'Heart', liver: 'Liver',
  lung: 'Lung', pancreas: 'Pancreas', cornea: 'Cornea',
  bone: 'Bone', small_intestine: 'Small Intestine'
};

export const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

export const URGENCY_LABELS = {
  status_1a: 'Status 1A — Critical',
  status_1b: 'Status 1B — Urgent',
  status_2:  'Status 2 — Stable',
  status_3:  'Status 3 — Outpatient'
};

export const ORGAN_VIABILITY = {
  heart: 4, lung: 8, liver: 24, pancreas: 12,
  kidney: 36, cornea: 168, bone: 720, small_intestine: 12
};
