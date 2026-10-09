// Which Brok you see on the search page: drawn, 3D, or animated (Rive).
// Kept in this browser only.
const KEY = "brok.style";

export function readStyle() {
  try {
    return localStorage.getItem(KEY) || "drawn";
  } catch {
    return "drawn";
  }
}

export function writeStyle(style) {
  try {
    localStorage.setItem(KEY, style);
  } catch {
    // Storage blocked. It still applies until reload.
  }
}
