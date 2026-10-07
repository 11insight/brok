export function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function externalLink(href, text, className = "") {
  let safe = "#";
  try {
    const url = new URL(href);
    if (url.protocol === "https:" || url.protocol === "http:") safe = url.href;
  } catch {
    safe = "#";
  }
  const cls = className ? ` class="${esc(className)}"` : "";
  return `<a${cls} href="${esc(safe)}" target="_blank" rel="noreferrer">${esc(text)}</a>`;
}
