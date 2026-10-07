const STALE_BEFORE_MS = 14 * 24 * 60 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatWhen(iso) {
  const date = new Date(iso);
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}, ${hh}:${mm} UTC`;
}

function span(ms) {
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 90) return `${mins} min`;
  if (mins < 36 * 60) {
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem ? `${hours} hr ${rem} min` : `${hours} hr`;
  }
  const days = Math.round(mins / (60 * 24));
  return `${days} days`;
}

export function againstPage(postIso, pageIso) {
  const delta = Date.parse(postIso) - Date.parse(pageIso);
  const direction = delta >= 0 ? "after the page" : "before the page";
  const stale = delta < 0 && Math.abs(delta) > STALE_BEFORE_MS;
  return { label: `${span(Math.abs(delta))} ${direction}`, stale };
}
