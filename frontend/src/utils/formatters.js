export function formatViability(hoursLeft) {
  if (hoursLeft <= 0) return 'Expired';
  const h = Math.floor(hoursLeft);
  const m = Math.round((hoursLeft - h) * 60);
  return m > 0 ? \h \m : \h;
}

export function formatScore(score) {
  return Number(score).toFixed(1);
}

export function formatDistance(km) {
  return km >= 1000 ? \ Mm : \ km;
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}
