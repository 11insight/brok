// Drawn for BROK. Stroke icons use currentColor so they follow the text.

// Brok, drawn in parts so it can move: a body that bends, two eyes that
// change shape, a shadow, and a layer for sparkles. character.js draws the
// frames; this is the resting pose.
let charId = 0;
const BODY = "M5 3h22v14.2a3 3 0 0 1-1.5 2.6l-8 4.6a3 3 0 0 1-3 0l-8-4.6A3 3 0 0 1 5 17.2Z";
const EYE = '<g class="eye"><rect class="eye-open" x="-2.2" y="-1.25" width="4.4" height="2.5" rx="1.25"/><path class="eye-happy" d="M-2 .9Q0-1.5 2 .9" fill="none" stroke-width="1.15" stroke-linecap="round" opacity="0"/></g>';
export function brandMarkHtml() {
  charId += 1;
  const clip = `brok-body-${charId}`;
  const blur = `brok-blur-${charId}`;
  return `<svg class="brand-mark brok-char" aria-hidden="true" viewBox="4 2 24 24"><defs><clipPath id="${clip}"><path class="char-clip" d="${BODY}"/></clipPath><filter id="${blur}" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation=".6"/></filter></defs><rect class="char-shadow" x="10" y="25.4" width="12" height="1.2" rx=".6" filter="url(#${blur})"/><g class="char-rig"><path class="char-body" d="${BODY}" fill="currentColor"/><g clip-path="url(#${clip})"><g class="char-eyes"><g class="eye-slot" transform="translate(19.5 12.8) rotate(-30)">${EYE}</g><g class="eye-slot" transform="translate(24.5 10) rotate(-30)">${EYE}</g></g></g><g class="char-think" opacity="0"><rect x="21" y="-1.6" width="1.4" height="1.4" rx=".35"/><rect x="23.4" y="-2.6" width="1.4" height="1.4" rx=".35"/><rect x="25.8" y="-3.6" width="1.4" height="1.4" rx=".35"/></g></g><g class="char-fx"></g></svg>`;
}

export const brandMark = brandMarkHtml();

export const LOGO_INNER = `<mask id="brok-cut"><rect width="32" height="32" fill="#fff"/><rect x="17.3" y="11.55" width="4.4" height="2.5" rx="1.25" transform="rotate(-30 19.5 12.8)" fill="#000"/><rect x="22.3" y="8.75" width="4.4" height="2.5" rx="1.25" transform="rotate(-30 24.5 10)" fill="#000"/></mask><path d="M5 3h22v14.2a3 3 0 0 1-1.5 2.6l-8 4.6a3 3 0 0 1-3 0l-8-4.6A3 3 0 0 1 5 17.2Z" fill="currentColor" mask="url(#brok-cut)"/>`;

export const gearIcon = `<svg class="ico" aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

export const searchIcon = `<svg class="ico" aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.7"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;

export const arrowIcon = `<svg class="ico" aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export const closeIcon = `<svg class="ico" aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

export const backIcon = `<svg class="ico" aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export const shieldIcon = `<svg class="ico" aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M12 3.5 5 6v5.5c0 4.2 3 7.6 7 9 4-1.4 7-4.8 7-9V6l-7-2.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
