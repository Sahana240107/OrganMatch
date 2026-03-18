/**
 * Format seconds → HH:MM:SS
 */
export function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

/**
 * Format km distance with unit
 */
export function formatDistance(km) {
  if (km == null) return '—'
  return km >= 1000 ? `${(km / 1000).toFixed(1)} k km` : `${Math.round(km)} km`
}

/**
 * Format a match score to 1 decimal place
 */
export function formatScore(score) {
  return score != null ? Number(score).toFixed(1) : '—'
}

/**
 * Format ISO date string → human readable
 */
export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

/**
 * Format ISO datetime → date + time
 */
export function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/**
 * Months since a date string
 */
export function monthsSince(dateStr) {
  const start = new Date(dateStr)
  const now = new Date()
  const diff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  return diff
}

/**
 * Return CSS class for organ type
 */
export function organClass(type) {
  const map = {
    kidney: 'organ-kidney',
    heart: 'organ-heart',
    liver: 'organ-liver',
    lung: 'organ-lung',
    pancreas: 'organ-pancreas',
    cornea: 'organ-cornea',
    bone: 'organ-bone',
    small_intestine: 'organ-small_intestine',
  }
  return map[type] || 'badge-gray'
}

/**
 * Return CSS class for urgency
 */
export function urgencyClass(u) {
  const map = {
    status_1a: 'badge urg-1a',
    status_1b: 'badge urg-1b',
    status_2: 'badge urg-2',
    status_3: 'badge urg-3',
  }
  return map[u] || 'badge urg-3'
}

/**
 * Score → color hex for chart fills
 */
export function scoreColor(score) {
  if (score >= 80) return '#16a34a'
  if (score >= 60) return '#0d6efd'
  if (score >= 40) return '#f59e0b'
  return '#dc2626'
}