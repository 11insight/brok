import { accountLayers } from "../fixtures/accounts.js";
import { filteredCommands } from "./commands.js";
import { blockedListHtml } from "./blocked.js";
import { esc, externalLink } from "./dom.js";
import { grokMark, xMark } from "./official-marks.js";
import { closeIcon, LOGO_INNER } from "./icons.js";
import { ACCENTS } from "../sidecar/accent.js";
import { PROMPT_URL, PROMPT_VERSION } from "../prompts/claims.js";
import { PRESETS, currentOwnModel } from "../sidecar/own-model.js";

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

function timeOf(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function sentHtml(rows) {
  if (!rows.length) return `<p class="empty">Nothing has left this device yet.</p>`;
  const items = rows
    .map(
      (row) => `<li class="inset-row sent-row">
        <span class="kind">${esc(row.kind)}<time>${esc(timeOf(row.at))}</time></span>
        <span class="host">${esc(row.host)}</span>
        <span class="what">${esc(row.detail)}</span>
      </li>`,
    )
    .join("");
  return `<ul class="inset">${items}</ul>`;
}

// Two lists in one panel: what Brok stopped, and everything that left.
export function drawerHtml(rows, tab = "blocked") {
  const blocked = rows.filter((row) => row.result === "would-have");
  const sent = rows.filter((row) => row.result === "allowed");
  const tabs = `<div class="seg drawer-seg" role="tablist" aria-label="List">
      <button type="button" role="tab" data-action="ledger-tab" data-tab="blocked" aria-selected="${tab === "blocked"}">Blocked ${blocked.length}</button>
      <button type="button" role="tab" data-action="ledger-tab" data-tab="sent" aria-selected="${tab === "sent"}">Sent ${sent.length}</button>
    </div>`;
  const body =
    tab === "sent"
      ? `<p class="fine">Every request that left this device, newest first. Kept in this tab only.</p>${sentHtml(sent)}`
      : blockedListHtml(blocked, "Nothing blocked yet. Open a page to see what it tries to load.");
  return `${head(tab === "sent" ? "Sent" : "Blocked")}
    ${tabs}
    <div class="drawer-list">${body}</div>`;
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
    <div class="accounts">${rows}</div>`;
}

export function securityHtml(state) {
  return `${head("Security")}
    <ul class="checks">
      <li>Ads, pixels and replay never reach your device.</li>
      <li>Pages are read on BROK’s server, with no cookies.</li>
      <li>Page text goes to Grok only when you split it.</li>
    </ul>
    <div class="group">${switchHtml("toggle-device", "Ask before each split", state.onDevice)}</div>
    <p class="fine">Turn this off and Split sends each new page to Grok without asking.</p>`;
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
  const list = filteredCommands(state.commandQuery, state.article?.status === "done");
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

const REPO = "https://github.com/11insight/brok";

// Which code this page runs, so anyone can check it against the source.
function sourceHtml() {
  const full = typeof __BROK_COMMIT__ === "string" ? __BROK_COMMIT__ : "";
  const sha = full.replace("+changes", "");
  const build = sha
    ? externalLink(`${REPO}/tree/${sha}`, `${sha.slice(0, 7)}${full.endsWith("+changes") ? " plus local changes" : ""}`)
    : "Not known";
  return `<section class="source">
      <h3>Open source</h3>
      <dl class="source-facts">
        <div><dt>This build</dt><dd>${build}</dd></div>
        <div><dt>Code</dt><dd>${externalLink(REPO, "github.com/11insight/brok")}</dd></div>
        <div><dt>License</dt><dd>${externalLink(`${REPO}/blob/main/LICENSE`, "AGPL 3.0")}</dd></div>
        <div><dt>Grok prompt</dt><dd>${externalLink(PROMPT_URL, `Version ${PROMPT_VERSION}`)}</dd></div>
        <div><dt>Run it at home</dt><dd>${externalLink(`${REPO}#run-it-at-home`, "How")}</dd></div>
      </dl>
    </section>`;
}

// Split with Brok's Grok, or your own model called straight from this browser.
function modelHtml(state) {
  const own = currentOwnModel() || {};
  const mode = state.modelMode || (own.on ? "own" : "brok");
  const tabs = `<div class="seg model-seg" role="tablist" aria-label="Split with">
      <button type="button" role="tab" data-action="model-mode" data-mode="brok" aria-selected="${mode === "brok"}">Brok's Grok</button>
      <button type="button" role="tab" data-action="model-mode" data-mode="own" aria-selected="${mode === "own"}">Your own</button>
    </div>`;
  if (mode !== "own") {
    return `<p class="eyebrow">Split with</p>${tabs}
      <p class="fine model-note">Page text goes through Brok's server to Grok. Brok pays for it.</p>`;
  }
  const presets = PRESETS.map(
    (preset) => `<button type="button" class="btn sm" data-action="model-preset" data-preset="${esc(preset.id)}">${esc(preset.label)}</button>`,
  ).join("");
  return `<p class="eyebrow">Split with</p>${tabs}
    <form class="model-form" id="model-form" autocomplete="off">
      <div class="model-presets">${presets}</div>
      <label>Address<input name="endpoint" type="url" spellcheck="false" placeholder="https://api.x.ai/v1" value="${esc(own.endpoint || "")}" /></label>
      <label>Model<input name="model" list="model-list" spellcheck="false" placeholder="Tap Check to list them" value="${esc(own.model || "")}" /></label>
      <datalist id="model-list"></datalist>
      <label>Key<input name="key" type="password" spellcheck="false" placeholder="Not needed on your own computer" value="${esc(own.key || "")}" data-1p-ignore data-lpignore="true" /></label>
      <label class="model-remember"><input name="remember" type="checkbox" ${own.remember ? "checked" : ""} /> Remember on this device</label>
      <p class="fine model-status" id="model-status">${own.on ? `On. Splits go straight to ${esc(own.endpoint)}.` : "Your key stays in this browser. Brok's server never sees it."}</p>
      <div class="model-actions">
        <button type="button" class="btn" data-action="model-check">Check</button>
        <button type="submit" class="btn primary">Use it</button>
      </div>
      ${own.on || own.key ? `<button type="button" class="btn ghost block" data-action="model-forget">Forget this and use Brok's Grok</button>` : ""}
    </form>`;
}

function settingsCommands(state) {
  return filteredCommands("", state.article?.status === "done")
    .filter((command) => command.id !== "settings")
    .map(
      (command) => `<li><button type="button" class="settings-row" data-action="command-arm" data-command="${esc(command.id)}">${esc(command.title)}</button></li>`,
    )
    .join("");
}

export function settingsHtml(state) {
  const swatches = ACCENTS.map(
    (accent) => `<button type="button" class="swatch${state.accent === accent.id ? " is-on" : ""}" data-action="set-accent" data-accent="${esc(accent.id)}" aria-pressed="${state.accent === accent.id}" style="--swatch: ${esc(accent.color)}">
        <svg viewBox="0 0 32 32" aria-hidden="true">${LOGO_INNER.replaceAll("brok-cut", `cut-${accent.id}`)}</svg>
        <span>${esc(accent.label)}</span>
      </button>`,
  ).join("");
  return `${head("Settings")}
    <p class="eyebrow">Color</p>
    <div class="swatches">${swatches}</div>
    ${modelHtml(state)}
    <ul class="inset settings-list">${settingsCommands(state)}</ul>
    <details class="howto">
      <summary>How to use Brok</summary>
      <h3>Why sign in</h3>
      <dl>
        <div><dt>Grok</dt><dd>Brok can use your Grok to sort pages into fact and opinion.</dd></div>
        <div><dt>X</dt><dd>Brok can show posts that talk about the page you are reading.</dd></div>
        <div><dt>Starlink</dt><dd>Brok can tell you if your area has an outage.</dd></div>
      </dl>
      <p class="fine">These are not linked to Brok yet. Each button opens its own site for now.</p>
      <h3>How to</h3>
      <ol>
        <li>Type what you want to know. Tap the arrow.</li>
        <li>Tap a result. You read it with no ads.</li>
        <li>Tap Split. Grok sorts the page into fact, opinion and not fact.</li>
        <li>Tap Original. See what the page tried to load.</li>
        <li>Tap Wallet for a test wallet. It is not real money.</li>
      </ol>
    </details>
    <details class="howto">
      <summary>Who sees what</summary>
      <dl>
        <div><dt>When you search</dt><dd>Brok's server asks Bing for you. Bing sees Brok, not you.</dd></div>
        <div><dt>When you open a page</dt><dd>Brok's server gets the page. The site sees Brok, not you. Its trackers never load.</dd></div>
        <div><dt>When you split</dt><dd>The page text goes to Vercel and xAI, the maker of Grok. Not your name or accounts. Pick your own model above and it goes straight from your browser to that model instead.</dd></div>
        <div><dt>The wallet</dt><dd>Your address goes to publicnode.com to read your balance and send. Your phrase never leaves this tab.</dd></div>
        <div><dt>Vercel, our host</dt><dd>Sees your internet address when you load Brok. Not your searches or the pages you read.</dd></div>
        <div><dt>Brok keeps</dt><dd>Nothing. No accounts, no list of what you search or read.</dd></div>
        <div><dt>This browser keeps</dt><dd>Your color and your view choice. Nothing else.</dd></div>
      </dl>
      <p class="fine">Open the Sent list to see each one as it happens.</p>
    </details>
    ${sourceHtml()}`;
}

export function blockedCount(rows) {
  return rows.filter((row) => row.result === "would-have").length;
}
