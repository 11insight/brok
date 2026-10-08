// The UI color follows the logo the person picks. Kept in this browser only.
export const ACCENTS = [
  { id: "orange", label: "Orange", color: "#b84a0a" },
  { id: "blue", label: "Blue", color: "#3fb5fc" },
];

const KEY = "brok.accent";

export function readAccent() {
  try {
    const value = localStorage.getItem(KEY);
    return ACCENTS.some((accent) => accent.id === value) ? value : "orange";
  } catch {
    return "orange";
  }
}

function favicon(color) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><mask id="m"><rect width="32" height="32" fill="#fff"/><rect x="17.3" y="11.55" width="4.4" height="2.5" rx="1.25" transform="rotate(-30 19.5 12.8)"/><rect x="22.3" y="8.75" width="4.4" height="2.5" rx="1.25" transform="rotate(-30 24.5 10)"/></mask><path d="M5 3h22v14.2a3 3 0 0 1-1.5 2.6l-8 4.6a3 3 0 0 1-3 0l-8-4.6A3 3 0 0 1 5 17.2Z" fill="${color}" mask="url(#m)"/></svg>`)}`;
}

export function applyAccent(id) {
  const accent = ACCENTS.find((item) => item.id === id) || ACCENTS[0];
  document.documentElement.dataset.accent = accent.id;
  const link = document.querySelector('link[rel="icon"]');
  if (link) link.href = favicon(accent.color);
  try {
    localStorage.setItem(KEY, accent.id);
  } catch {
    // Private mode. The color still applies until reload.
  }
  return accent.id;
}
