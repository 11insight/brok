import { esc } from "./dom.js";

const GROUPS = [
  ["high", "High risk", "Ads, pixels and session replay. These follow you across sites."],
  ["medium", "Medium", "Analytics and affiliate links. These count and tag your visit."],
  ["low", "Low", "Other third parties. Fonts, embeds, consent popups."],
];

// Everything a page asked for, grouped by risk, as one inset list per group.
export function blockedListHtml(rows, empty = "Nothing blocked.") {
  if (!rows.length) return `<p class="empty">${esc(empty)}</p>`;
  return GROUPS.map(([klass, title, note]) => {
    const group = rows.filter((row) => (row.klass || "low") === klass);
    if (!group.length) return "";
    const items = group
      .map(
        (row) => `<li class="inset-row">
          <span class="kind">${esc(row.kind)}</span>
          <span class="host">${esc(row.host)}</span>
        </li>`,
      )
      .join("");
    return `<section class="risk-group" data-class="${klass}">
      <header><h3>${esc(title)}</h3><span class="count">${group.length}</span></header>
      <p class="fine">${esc(note)}</p>
      <ul class="inset">${items}</ul>
    </section>`;
  }).join("");
}

export function blockedSummary(rows) {
  const high = rows.filter((row) => row.klass === "high").length;
  if (!rows.length) return "Nothing to block on this page.";
  return high
    ? `${rows.length} blocked, ${high} high risk.`
    : `${rows.length} blocked.`;
}
