import { externalLink, esc } from "./dom.js";
import {
  RPC_HOST,
  broadcastSend,
  clearSend,
  createWallet,
  dropAccount,
  forgetPhrase,
  formatSepolia,
  getAddress,
  getPhraseWords,
  hasAccount,
  importPhrase,
  inspectSend,
  readBalance,
} from "../sidecar/wallet-keys.js";

const FAUCET = "https://sepolia-faucet.pk910.de/";

let host = null;
let onEgress = null;
let mode = "locked";
let note = "";
let balanceLabel = "";
let balanceState = "idle";
let draftTo = "";
let draftAmount = "";
let pause = null;
let txHash = "";
let busy = false;
let balanceToken = 0;
let balanceLogged = false;

export function mount(node, options = {}) {
  host = node;
  onEgress = options.onEgress || null;
  if (getPhraseWords()) mode = "reveal";
  else if (hasAccount()) mode = "ready";
  else mode = "locked";
  clearSend();
  pause = null;
  paint();
  if (mode === "ready") refreshBalance();
}

export function destroy() {
  const input = host?.querySelector("#import-phrase");
  if (input) input.value = "";
  host = null;
}

function blankSecrets() {
  host?.querySelectorAll("[data-secret]").forEach((node) => {
    node.textContent = "";
    node.remove();
  });
}

function rememberDrafts() {
  const to = host?.querySelector("#send-to");
  const amount = host?.querySelector("#send-amount");
  if (to) draftTo = to.value;
  if (amount) draftAmount = amount.value;
}

function paint() {
  if (!host) return;
  rememberDrafts();
  blankSecrets();
  host.innerHTML = `<div class="wallet">
    <div class="wallet-top">
      <button type="button" data-action="go" data-route="back">Back</button>
      <p class="kicker">Sepolia</p>
    </div>
    ${body()}
    <p class="fine wallet-foot">The recovery phrase is not saved in this browser.</p>
  </div>`;
}

function body() {
  if (mode === "reveal") return revealHtml();
  if (mode === "pause" && pause) return pauseHtml();
  if (mode === "ready") return readyHtml();
  return lockedHtml();
}

function lockedHtml() {
  return `<section class="phrase">
    <h2>Wallet</h2>
    <p>A 12-word phrase is created on this device. It is shown once and not saved here.</p>
    <button type="button" class="primary" data-action="wallet-create">Create wallet</button>
    <form id="import-form" autocomplete="off">
      <div class="field">
        <label for="import-phrase">Import a recovery phrase</label>
        <input id="import-phrase" name="brok-import" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" data-1p-ignore data-lpignore="true" data-form-type="other" />
      </div>
      <button type="submit" class="primary">Import</button>
    </form>
    <p class="fine">${esc(note)}</p>
  </section>`;
}

function revealHtml() {
  const words = getPhraseWords() || [];
  const list = words
    .map((word, index) => `<li data-secret translate="no"><span>${index + 1}</span> ${esc(word)}</li>`)
    .join("");
  return `<section class="phrase">
    <h2>Recovery phrase</h2>
    <p>Write these 12 words down. They leave this page when you continue, and they are not saved here.</p>
    <ol class="words">${list}</ol>
    <p class="addr">${esc(getAddress())}</p>
    <button type="button" class="go-on" data-action="wallet-copy">Copy address</button>
    <button type="button" class="primary" data-action="wallet-clear">I have stored it elsewhere</button>
  </section>`;
}

function readyHtml() {
  const address = getAddress();
  const balance =
    balanceState === "loading" ? "Reading balance." : balanceState === "error" ? "Balance did not come back." : balanceLabel;
  const sent = txHash
    ? `<p class="fine">Sent. ${externalLink(`https://sepolia.etherscan.io/tx/${txHash}`, "View transaction")}</p>`
    : "";
  return `<section class="phrase">
    <p class="balance" data-balance>${esc(balance)}</p>
    <p class="addr">${esc(address)}</p>
    <p class="links">
      ${externalLink(`https://sepolia.etherscan.io/address/${address}`, "Etherscan")}
      ${externalLink(FAUCET, "Sepolia faucet")}
      <button type="button" data-action="wallet-copy">Copy address</button>
    </p>
    <form id="send-form" autocomplete="off">
      <div class="field">
        <label for="send-to">To</label>
        <input id="send-to" type="text" autocomplete="off" spellcheck="false" value="${esc(draftTo)}" />
      </div>
      <div class="field">
        <label for="send-amount">Amount</label>
        <input id="send-amount" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" value="${esc(draftAmount)}" />
      </div>
      <button type="submit" class="primary" ${busy ? "disabled" : ""}>Review send</button>
    </form>
    <p class="fine">${esc(note)}</p>
    ${sent}
    <button type="button" class="go-on" data-action="wallet-lock">Use a different phrase</button>
    <p class="fine">This address lasts until you reload the page.</p>
  </section>`;
}

function pauseHtml() {
  return `<section class="pause" aria-labelledby="pause-title">
    <p class="eyebrow">Paused</p>
    <h1 id="pause-title">${esc(pause.title)}</h1>
    <p class="reason">${esc(pause.reason)}</p>
    <dl class="facts">
      <div><dt>Amount</dt><dd>${esc(pause.amount)} Sepolia ETH</dd></div>
      <div><dt>Destination</dt><dd>${esc(pause.to)}</dd></div>
      <div><dt>Balance</dt><dd>${esc(pause.balance)} Sepolia ETH</dd></div>
      <div><dt>Network</dt><dd>Sepolia</dd></div>
    </dl>
    <div class="pause-actions">
      <button type="button" class="stop" data-action="wallet-cancel" ${busy ? "disabled" : ""}>Cancel</button>
      <button type="button" class="go-on" data-action="wallet-continue" ${busy ? "disabled" : ""}>Continue anyway</button>
    </div>
    <p class="fine">Cancel is the default. Continue signs this Sepolia transaction.</p>
  </section>`;
}

function logEgress(row) {
  onEgress?.(row);
}

async function refreshBalance() {
  const token = ++balanceToken;
  balanceState = "loading";
  const node = host?.querySelector("[data-balance]");
  if (node) node.textContent = "Reading balance.";
  else paint();
  try {
    const value = await readBalance();
    if (token !== balanceToken || !host || mode !== "ready") return;
    balanceLabel = formatSepolia(value);
    balanceState = "done";
    const live = host.querySelector("[data-balance]");
    if (live) live.textContent = balanceLabel;
    if (!balanceLogged) {
      balanceLogged = true;
      logEgress({
        id: "wallet-balance",
        klass: "low",
        kind: "Balance",
        host: RPC_HOST,
        result: "allowed",
        detail: "Sepolia balance read. No phrase was sent.",
      });
    }
  } catch {
    if (token !== balanceToken || !host || mode !== "ready") return;
    balanceState = "error";
    const live = host.querySelector("[data-balance]");
    if (live) live.textContent = "Balance did not come back.";
  }
}

function publicError(error) {
  const text = String(error?.shortMessage || error?.message || "The send failed.");
  if (/exceeds the balance/i.test(text)) return "This send needs more Sepolia ETH than this address has.";
  if (/private key|mnemonic|seed/i.test(text)) return "The send failed.";
  return text.split("\n")[0].slice(0, 180);
}

export function handle(action) {
  if (busy) return;
  if (action === "wallet-create") {
    note = "";
    txHash = "";
    createWallet();
    mode = "reveal";
    paint();
    return;
  }
  if (action === "wallet-clear") {
    blankSecrets();
    forgetPhrase();
    mode = "ready";
    note = "";
    paint();
    refreshBalance();
    return;
  }
  if (action === "wallet-lock") {
    dropAccount();
    mode = "locked";
    note = "";
    txHash = "";
    draftTo = "";
    draftAmount = "";
    balanceLabel = "";
    balanceState = "idle";
    paint();
    return;
  }
  if (action === "wallet-copy") {
    const address = getAddress();
    if (!address || !navigator.clipboard) {
      note = "Copy the address from the page.";
      paint();
      return;
    }
    navigator.clipboard.writeText(address).then(
      () => {
        note = "Address copied.";
        paint();
      },
      () => {
        note = "Copy the address from the page.";
        paint();
      },
    );
    return;
  }
  if (action === "wallet-cancel") {
    clearSend();
    pause = null;
    mode = "ready";
    note = "Cancelled. Nothing was signed.";
    paint();
    return;
  }
  if (action === "wallet-continue") {
    signAndSend();
  }
}

async function signAndSend() {
  if (mode !== "pause" || !pause) return;
  busy = true;
  paint();
  try {
    const hash = await broadcastSend();
    txHash = hash;
    pause = null;
    mode = "ready";
    draftAmount = "";
    note = "";
    logEgress({
      id: `wallet-tx-${hash}`,
      klass: "medium",
      kind: "Transaction",
      host: RPC_HOST,
      result: "allowed",
      detail: "Sepolia transaction signed and sent. No phrase was sent.",
    });
  } catch (error) {
    pause = null;
    mode = "ready";
    txHash = "";
    note = publicError(error);
  } finally {
    busy = false;
    if (host) {
      paint();
      if (mode === "ready") refreshBalance();
    }
  }
}

export function submitWallet(form) {
  if (form.id === "import-form") {
    const input = form.querySelector("#import-phrase");
    const value = input ? input.value : "";
    if (input) input.value = "";
    const result = importPhrase(value);
    if (!result.ok) {
      note = result.error;
      mode = "locked";
      paint();
      return;
    }
    note = "";
    txHash = "";
    mode = "ready";
    paint();
    refreshBalance();
    return;
  }
  if (form.id === "send-form") reviewFrom(form);
}

async function reviewFrom(form) {
  if (busy || mode !== "ready") return;
  const to = form.querySelector("#send-to");
  const amount = form.querySelector("#send-amount");
  draftTo = to ? to.value : "";
  draftAmount = amount ? amount.value : "";
  busy = true;
  note = "";
  paint();
  const result = await inspectSend({ to: draftTo, amount: draftAmount });
  busy = false;
  if (!host) return;
  if (!result.ok) {
    clearSend();
    note = result.error;
    mode = "ready";
    paint();
    return;
  }
  pause = result.pause;
  mode = "pause";
  note = "";
  paint();
}
