import { accountLayers } from "../fixtures/accounts.js";
import { filteredCommands } from "./commands.js";
import { esc, externalLink } from "./dom.js";
import { grokMark, xMark } from "./official-marks.js";
import { closeIcon } from "./icons.js";

function head(title, meta = "") {
  const sub = meta ? `<p class="pop-meta">${esc(meta)}</p>` : "";
  return `<header class="pop-head">
      <div><h2>${esc(title)}</h2>${sub}</div>
      <button type="button" class="icon-btn" data-action="close-overlays" aria-label="Close">${closeIcon}</button>
    </header>`;
}

function klassLabel(klass) {
  if (klass === "high") return "High";
  if (klass === "medium") return "Medium";
  if (klass === "low") return "Low";
  return "Call";
}

export function drawerHtml(rows) {
  const blocked = rows.filter((row) => row.result === "would-have");
  const list = blocked.length
    ? blocked
        .map(
          (row) => `<article class="ledger-row" data-class="${esc(row.klass || "")}">
            <div class="ledger-top"><h3>${esc(row.kind)}</h3><span class="chip">${esc(klassLabel(row.klass))}</span></div>
            <p class="host">${esc(row.host)}</p>
            <p>${esc(row.detail)}</p>
          </article>`,
        )
        .join("")
    : `<p class="empty">Nothing blocked.</p>`;
  return `${head("Blocked", `${blocked.length} stopped before they loaded`)}
    <div class="drawer-list">${list}</div>`;
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
  starlink: {
    label: "Sign in with Starlink",
    mark: `<img class="starlink-mark" src="/starlink-icon.png" alt="" width="24" height="24" />`,
    href: "https://starlink.com/auth/login",
  },
};

function accountControl(layer, on) {
  const official = officialButtons[layer.id];
  if (!official) {
    return switchHtml("toggle-account", `${layer.name}`, on, `data-account="${esc(layer.id)}"`);
  }
  return `<a class="official" href="${esc(official.href)}" target="_blank" rel="noreferrer">${official.mark}<span>${official.label}</span></a>`;
}

export function signinHtml(accounts) {
  const rows = accountLayers
    .map((layer) => {
      const on = Boolean(accounts[layer.id]);
      return `<div class="account">
        ${accountControl(layer, on)}
      </div>`;
    })
    .join("");
  return `${head("Sign in")}
    <div class="accounts">${rows}</div>
    <p class="fine">Each one opens its own sign in page.</p>`;
}

export function securityHtml(state) {
  const confirm = state.pendingSend
    ? `<div class="egress">
        <p class="eyebrow">Leaves this device</p>
        <dl class="facts">
          <div><dt>To</dt><dd>Grok, through Vercel</dd></div>
          <div><dt>What</dt><dd>The page text only</dd></div>
        </dl>
        <p class="payload">${esc(state.article?.title || "")}</p>
        <button type="button" class="btn primary" data-action="confirm-send">Send it</button>
      </div>`
    : `<button type="button" class="btn" data-action="ask-send" ${state.onDevice || !state.article?.blocks?.length ? "disabled" : ""}>Send page to Grok</button>`;
  return `${head("Security", state.onDevice ? "On device" : "Grok allowed")}
    <ul class="checks">
      <li>Trackers, pixels and replay are stopped first.</li>
      <li>The reader never clicks, types or reads cookies.</li>
      <li>Page text goes to Grok only when you send it.</li>
    </ul>
    <div class="group">${switchHtml("toggle-device", "Keep it on this device", state.onDevice)}</div>
    ${confirm}
    <p class="fine" id="send-result">${esc(state.sendResult || "")}</p>`;
}

function switchHtml(action, label, on, extra = "") {
  return `<button type="button" class="switch-row" role="switch" aria-checked="${on}" aria-pressed="${on}" data-action="${action}" ${extra}>
      <span>${esc(label)}</span><span class="switch" aria-hidden="true"><i></i></span>
    </button>`;
}

export function shelfHtml(article) {
  const link = article.grokipedia
    ? externalLink(article.grokipedia, article.grokipediaLabel)
    : "No page loaded.";
  return `${head("Grokipedia", "Written by Grok")}
    <p>A reference, not a verdict.</p>
    <p class="shelf-link">${link}</p>
    <p class="fine">Opening the link asks grokipedia.com.</p>`;
}

export function commandHtml(state) {
  if (!state.commandOpen) return "";
  if (state.commandStage === "egress" && state.commandEgress) {
    const egress = state.commandEgress;
    return `<div class="scrim" data-action="close-overlays"></div>
      <div class="command" role="dialog" aria-label="Command egress">
        <p class="eyebrow">Before this runs</p>
        <h2>${esc(egress.title)}</h2>
        <dl class="facts">
          <div><dt>Goes to</dt><dd>${esc(egress.destination)}</dd></div>
          <div><dt>Leaves</dt><dd>${esc(egress.leaves)}</dd></div>
        </dl>
        <p class="fine">${esc(egress.note)}</p>
        <div class="command-actions">
          <button type="button" class="btn" data-action="command-back">Back</button>
          <button type="button" class="btn primary" data-action="command-run">Run</button>
        </div>
      </div>`;
  }
  const list = filteredCommands(state.commandQuery);
  const items = list.length
    ? list
        .map((command, index) => {
          const on = index === state.commandIndex;
          return `<button type="button" class="cmd${on ? " is-on" : ""}" data-action="command-arm" data-command="${esc(command.id)}" aria-selected="${on}"><span>${esc(command.title)}</span>${on ? "<kbd>Enter</kbd>" : ""}</button>`;
        })
        .join("")
    : `<p class="empty">No matching command.</p>`;
  return `<div class="scrim" data-action="close-overlays"></div>
    <div class="command" role="dialog" aria-label="Commands">
      <input id="cmd-q" type="text" placeholder="Type a command" value="${esc(state.commandQuery)}" autocomplete="off" spellcheck="false" aria-label="Filter commands" />
      <div class="cmd-list" role="listbox">${items}</div>
    </div>`;
}

export function blockedCount(rows) {
  return rows.filter((row) => row.result === "would-have").length;
}
