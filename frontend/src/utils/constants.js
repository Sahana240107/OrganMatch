export const ORGAN_TYPES = [
  { id: 'heart',          label: 'Heart',       icon: '❤️',  maxHours: 4,   color: '#e05c3a', cssClass: 'op-heart'    },
  { id: 'kidney_l',       label: 'Kidney (L)',  icon: '🫘',  maxHours: 36,  color: '#4f9cf9', cssClass: 'op-kidney'   },
  { id: 'kidney_r',       label: 'Kidney (R)',  icon: '🫘',  maxHours: 36,  color: '#4f9cf9', cssClass: 'op-kidney'   },
  { id: 'liver',          label: 'Liver',       icon: '🫀',  maxHours: 24,  color: '#30d9a0', cssClass: 'op-liver'    },
  { id: 'lung_l',         label: 'Lung (L)',    icon: '🫁',  maxHours: 6,   color: '#b478ff', cssClass: 'op-lung'     },
  { id: 'lung_r',         label: 'Lung (R)',    icon: '🫁',  maxHours: 6,   color: '#b478ff', cssClass: 'op-lung'     },
  { id: 'cornea',         label: 'Cornea',      icon: '👁',  maxHours: 168, color: '#f0a940', cssClass: 'op-cornea'   },
  { id: 'bone',           label: 'Bone',        icon: '🦴',  maxHours: 720, color: '#8a9ab5', cssClass: 'op-bone'     },
  { id: 'pancreas',       label: 'Pancreas',    icon: '🟤',  maxHours: 12,  color: '#e8956d', cssClass: 'op-pancreas' },
  { id: 'small_intestine',label: 'Small Intestine', icon:'🩹', maxHours: 10, color: '#c9a87c', cssClass: 'op-intestine'},
];

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const BLOOD_COMPATIBILITY = {
  'O-':  ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+':  ['O+', 'A+', 'B+', 'AB+'],
  'A-':  ['A-', 'A+', 'AB-', 'AB+'],
  'A+':  ['A+', 'AB+'],
  'B-':  ['B-', 'B+', 'AB-', 'AB+'],
  'B+':  ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

export const URGENCY_LABELS = {
  '1A': { label: 'Status 1A — Critical', sub: 'ICU, mechanical support',       color: '#e05c3a', dot: 'ud-red'   },
  '1B': { label: 'Status 1B — Urgent',   sub: 'Hospitalised, deteriorating',   color: '#f0a940', dot: 'ud-amber' },
  '2':  { label: 'Status 2 — Stable',    sub: 'Outpatient, monitoring',         color: '#30d9a0', dot: 'ud-green' },
  '3':  { label: 'Status 3 — Routine',   sub: 'Scheduled, non-urgent',          color: '#4f9cf9', dot: 'ud-blue'  },
};

export const HLA_ANTIGENS = ['A1', 'A2', 'B7', 'B8', 'DR3', 'DR4'];

// ── ROLES — must match backend exactly ────────────────────────────────────────
export const ROLES = {
  NATIONAL_ADMIN:          'national_admin',
  TRANSPLANT_COORDINATOR:  'transplant_coordinator',
  HOSPITAL_STAFF:          'hospital_staff',
  AUDITOR:                 'auditor',
};

export const OFFER_STATUS = {
  PENDING:  'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  TIMEOUT:  'timeout',
  CANCELLED:'cancelled',
};

export const MATCH_WEIGHTS = {
  blood_abo: 35,
  hla_score: 30,
  urgency:   20,
  distance:  10,
  wait_time:  5,
};

export const WS_EVENTS = {
  MATCH_FOUND:    'match_found',
  OFFER_ACCEPTED: 'offer_accepted',
  OFFER_DECLINED: 'offer_declined',
  ORGAN_EXPIRING: 'organ_expiring',
  STATUS_UPDATE:  'status_update',
};

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const WS_BASE  = import.meta.env.VITE_WS_URL  || 'ws://localhost:5000';