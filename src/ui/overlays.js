import { accountLayers } from "../fixtures/accounts.js";
import { filteredCommands } from "./commands.js";
import { esc, externalLink } from "./dom.js";
import { grokMark, xMark } from "./official-marks.js";

const FILTERS = [
  ["all", "All"],
  ["high", "High"],
  ["medium", "Medium"],
  ["low", "Low"],
  ["would-have", "Would-have"],
];

function matches(row, filter) {
  if (filter === "all") return true;
  if (filter === "would-have") return row.result === "would-have";
  return row.klass === filter;
}

export function drawerHtml(rows, filter) {
  const counts = {
    high: rows.filter((row) => row.klass === "high").length,
    medium: rows.filter((row) => row.klass === "medium").length,
    low: rows.filter((row) => row.klass === "low").length,
    would: rows.filter((row) => row.result === "would-have").length,
  };
  const chips = FILTERS.map(
    ([id, label]) =>
      `<button type="button" data-action="ledger-filter" data-filter="${id}" aria-pressed="${filter === id}">${label}</button>`,
  ).join("");
  const visible = rows.filter((row) => matches(row, filter));
  const list = visible.length
    ? visible
        .map((row) => {
          const outcome = row.result === "would-have" ? "Would-have" : labelFor(row.klass);
          const extra = row.result === "would-have" ? `<span>${esc(labelFor(row.klass))}</span>` : "";
          return `<article class="ledger-row">
            <p class="row-class">${outcome} ${extra}</p>
            <h3>${esc(row.kind)}</h3>
            <p class="host">${esc(row.host)}</p>
            <p>${esc(row.detail)}</p>
          </article>`;
        })
        .join("")
    : `<p class="empty">Nothing in this class.</p>`;
  return `<header class="drawer-head">
      <h2>Egress ledger</h2>
      <button type="button" data-action="close-overlays">Close</button>
    </header>
    <p class="estimator">Destination-class estimator. Not a packet trace. No identity in this log.</p>
    <p class="counts">High ${counts.high} · Medium ${counts.medium} · Low ${counts.low} · Would-have ${counts.would}</p>
    <div class="filters">${chips}</div>
    <div class="drawer-list">${list}</div>
    <p class="estimator">A public aggregate would publish destination classes and block counts only. This copy lives in the tab. A sidecar would append a local log. Refresh clears it.</p>`;
}

function labelFor(klass) {
  if (klass === "high") return "High";
  if (klass === "medium") return "Medium";
  if (klass === "low") return "Low";
  return klass;
}

const officialButtons = {
  grok: {
    label: "Sign into Grok",
    mark: grokMark,
    href: "https://accounts.x.ai/sign-in?redirect=grok-com",
  },
  x: {
    label: "Login with 𝕏",
    mark: xMark,
    href: "https://x.com/i/flow/login",
  },
};

function accountControl(layer, on) {
  const official = officialButtons[layer.id];
  if (!official) {
    return `<button type="button" data-action="toggle-account" data-account="${esc(layer.id)}" aria-pressed="${on}">
          ${esc(layer.name)} · ${on ? "On" : "Off"}
        </button>`;
  }
  return `<a class="official" href="${esc(official.href)}" target="_blank" rel="noreferrer">${official.mark}<span>${official.label}</span></a>`;
}

export function signinHtml(accounts) {
  const rows = accountLayers
    .map((layer) => {
      const on = Boolean(accounts[layer.id]);
      return `<div class="account">
        ${accountControl(layer, on)}
        <p>${esc(layer.unlocks)}</p>
      </div>`;
    })
    .join("");
  return `<header class="pop-head">
      <h2>Sign in</h2>
      <button type="button" data-action="close-overlays">Close</button>
    </header>
    <p>Sign into Grok and Login with X open the official pages. A session cannot come back to this page.</p>
    ${rows}
    <p class="fine">X sign-in is not a location log. Starlink sign-in is. Nothing here is written to disk.</p>`;
}

export function securityHtml(state) {
  const sendNote = state.onDevice
    ? "On-device mode is on. Send pane to Grok stays off."
    : "On-device mode is off. Confirming records a would-have call to api.x.ai. Claim text only. It is not sent.";
  const confirm = state.pendingSend
    ? `<div class="egress">
        <p class="flag">Egress</p>
        <p>Destination: api.x.ai</p>
        <p>Leaves the device: claim text only, if this were live.</p>
        <p class="payload">${esc(state.sendPreview)}</p>
        <button type="button" data-action="confirm-send">Record as would-have</button>
      </div>`
    : `<button type="button" data-action="ask-send" ${state.onDevice ? "disabled" : ""}>Send pane to Grok</button>`;
  return `<header class="pop-head">
      <h2>Security</h2>
      <button type="button" data-action="close-overlays">Close</button>
    </header>
    <ul class="plain">
      <li>Trackers, pixels, and session replay are blocked before the request.</li>
      <li>The reader does not click, type, or read cookies.</li>
      <li>The claim split stays in the tab.</li>
      <li>The only inference egress is Send pane to Grok, and only if on-device mode is off.</li>
    </ul>
    <button type="button" data-action="toggle-device" aria-pressed="${state.onDevice}">
      On-device mode · ${state.onDevice ? "On" : "Off"}
    </button>
    <p>${sendNote}</p>
    ${confirm}
    <p class="fine" id="send-result">${esc(state.sendResult || "")}</p>`;
}

export function shelfHtml(article) {
  const link = externalLink(article.grokipedia, article.grokipediaLabel);
  return `<header class="pop-head">
      <h2>Grokipedia</h2>
      <button type="button" data-action="close-overlays">Close</button>
    </header>
    <p>Reference shelf. Grok-written. Opening it does not promote a claim. On a contested page it is not a neutral primary source.</p>
    <p>Page: ${link}</p>
    <p class="fine">The shelf is local. Following the link requests grokipedia.com.</p>`;
}

export function commandHtml(state) {
  if (!state.commandOpen) return "";
  if (state.commandStage === "egress" && state.commandEgress) {
    const egress = state.commandEgress;
    return `<div class="scrim" data-action="close-overlays"></div>
      <div class="command" role="dialog" aria-label="Command egress">
        <p class="flag">Egress before this runs</p>
        <h2>${esc(egress.title)}</h2>
        <dl>
          <div><dt>Destination</dt><dd>${esc(egress.destination)}</dd></div>
          <div><dt>Leaves device</dt><dd>${esc(egress.leaves)}</dd></div>
        </dl>
        <p>${esc(egress.note)}</p>
        <div class="command-actions">
          <button type="button" data-action="command-back">Back</button>
          <button type="button" data-action="command-run">Run</button>
        </div>
      </div>`;
  }
  const list = filteredCommands(state.commandQuery);
  const items = list.length
    ? list
        .map((command, index) => {
          const on = index === state.commandIndex;
          return `<button type="button" class="cmd${on ? " is-on" : ""}" data-action="command-arm" data-command="${esc(command.id)}" aria-selected="${on}">${esc(command.title)}</button>`;
        })
        .join("")
    : `<p class="empty">No matching command.</p>`;
  return `<div class="scrim" data-action="close-overlays"></div>
    <div class="command" role="dialog" aria-label="Commands">
      <input id="cmd-q" type="text" placeholder="Command" value="${esc(state.commandQuery)}" autocomplete="off" spellcheck="false" aria-label="Filter commands" />
      <div class="cmd-list" role="listbox">${items}</div>
    </div>`;
}

export function blockedCount(rows) {
  return rows.filter((row) => row.result === "would-have").length;
}
