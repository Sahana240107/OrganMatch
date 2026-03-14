/**
 * Format remaining hours/minutes into a human-readable string
 * @param {number} totalMinutes
 */
export function formatTime(totalMinutes) {
  if (totalMinutes <= 0) return 'Expired';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Format seconds into mm:ss countdown
 */
export function formatCountdown(totalSeconds) {
  if (totalSeconds <= 0) return '00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Format distance in km
 */
export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toLocaleString('en-IN')} km`;
}

/**
 * Format a match score (0-100) with color class
 */
export function formatScore(score) {
  const num = Number(score);
  if (num >= 90) return { text: num.toFixed(1), colorClass: 'score-excellent' };
  if (num >= 75) return { text: num.toFixed(1), colorClass: 'score-good' };
  if (num >= 60) return { text: num.toFixed(1), colorClass: 'score-fair' };
  return { text: num.toFixed(1), colorClass: 'score-poor' };
}

/**
 * Format ISO date string to readable
 */
export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

/**
 * Format date to time-only
 */
export function formatTimeOnly(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

/**
 * Get viability percentage given remaining hours and max hours
 */
export function getViabilityPct(remainingHours, maxHours) {
  if (!maxHours || maxHours === 0) return 0;
  return Math.max(0, Math.min(100, Math.round((remainingHours / maxHours) * 100)));
}

/**
 * Get viability color based on percentage
 */
export function getViabilityColor(pct) {
  if (pct > 60) return '#30d9a0';
  if (pct > 30) return '#f0a940';
  return '#e05c3a';
}

/**
 * Calculate stroke-dashoffset for SVG ring
 * @param {number} pct - 0 to 100
 * @param {number} circumference - SVG circle circumference
 */
export function ringOffset(pct, circumference = 113) {
  return circumference * (1 - pct / 100);
}

/**
 * Format Indian phone number
 */
export function formatPhone(phone) {
  if (!phone) return '—';
  const clean = String(phone).replace(/\D/g, '');
  if (clean.length === 10) return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  return phone;
}

/**
 * Truncate text
 */
export function truncate(str, n = 30) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

/**
 * Get relative time (e.g. "2 mins ago")
 */
export function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return formatDate(iso);
}