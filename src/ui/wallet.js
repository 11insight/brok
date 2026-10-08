import { fixturePhrase, transactions } from "../fixtures/wallet.js";
import { esc } from "./dom.js";

let host = null;
let slots = null;
let shown = false;
let cleared = false;
let current = "scam";
let decisions = [];
let importNote = "";

// Strings are immutable, so this drops our references. It does not scrub
// every copy a JS engine may still hold. The fixture is not a real phrase.
function wipeSlots() {
  if (!slots) return;
  for (let i = 0; i < slots.length; i += 1) slots[i] = "";
  slots.length = 0;
  slots = null;
}

export function mount(node) {
  host = node;
  paint();
}

export function destroy() {
  const input = host?.querySelector("#import-phrase");
  if (input) input.value = "";
  if (shown) {
    wipeSlots();
    cleared = true;
  }
  host = null;
}

function paint() {
  if (!host) return;
  const tx = transactions.find((item) => item.id === current) || transactions[0];
  const choices = transactions
    .map((item) => {
      const on = item.id === tx.id;
      return `<button type="button" data-action="wallet-tx" data-tx="${esc(item.id)}" aria-pressed="${on}">${esc(item.title)}</button>`;
    })
    .join("");
  const log = decisions.length
    ? `<ul class="decisions">${decisions
        .map((item) => {
          const follow =
            item.choice === "continue"
              ? "Not signed. This prototype cannot sign."
              : "Cancelled. The warning stays.";
          return `<li>${esc(item.reason)} · ${esc(follow)}</li>`;
        })
        .join("")}</ul>`
    : "";
  host.innerHTML = `<div class="wallet">
    <div class="wallet-top">
      <button type="button" data-action="go" data-route="browser">Back</button>
      <p class="kicker">Testnet fixture</p>
    </div>
    <section class="pause" aria-labelledby="pause-title">
      <p class="eyebrow">Paused</p>
      <h1 id="pause-title">${esc(tx.reasonTitle)}</h1>
      <p class="reason">${esc(tx.reason)}</p>
      <div class="tx-switch">${choices}</div>
      <dl class="facts">
        <div><dt>Token</dt><dd>${esc(tx.token)}</dd></div>
        <div><dt>Amount</dt><dd>${esc(tx.amount)}</dd></div>
        <div><dt>Contract</dt><dd>${esc(tx.contract)}</dd></div>
        <div><dt>Destination</dt><dd>${esc(tx.destination)}</dd></div>
      </dl>
      <div class="pause-actions">
        <button type="button" class="stop" data-action="wallet-cancel">Cancel</button>
        <button type="button" class="go-on" data-action="wallet-continue">Continue anyway</button>
      </div>
      <p class="fine">Inference. A false positive can cost real money, so this is not a silent block. Cancel is the default.</p>
      ${log}
    </section>
    ${phraseBlock()}
    <p class="fine wallet-foot">This screen cannot sign, and it cannot store a seed.</p>
  </div>`;
}

function phraseBlock() {
  if (shown && slots && slots.length) {
    const words = slots
      .map(
        (word, index) =>
          `<li data-secret translate="no"><span>${index + 1}</span> ${esc(word)}</li>`,
      )
      .join("");
    return `<section class="phrase">
      <h2>Recovery phrase</h2>
      <p>Fixture phrase. Invalid on purpose. Do not import it into a wallet. It will be cleared from this page and was never written to storage.</p>
      <ol class="words">${words}</ol>
      <button type="button" data-action="wallet-clear">I have stored it elsewhere</button>
    </section>`;
  }
  if (cleared) {
    return `<section class="phrase">
      <h2>Recovery phrase</h2>
      <p>Recovery phrase cleared from this page. It was not written to storage.</p>
      <form id="import-form" autocomplete="off">
        <label for="import-phrase">Import to continue the fixture. The value is wiped on submit and is not checked, because nothing was stored.</label>
        <input id="import-phrase" name="brok-import" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" data-1p-ignore data-lpignore="true" data-form-type="other" />
        <button type="submit">Wipe and continue</button>
      </form>
      <p class="fine">${esc(importNote)}</p>
    </section>`;
  }
  return `<section class="phrase">
    <h2>Recovery phrase</h2>
    <p>A real build generates a BIP-39 phrase on device, shows it once, and never stores it. This button reveals an invalid fixture instead.</p>
    <button type="button" data-action="wallet-show">Show recovery phrase</button>
  </section>`;
}

export function handle(action, target) {
  if (action === "wallet-show") {
    if (shown || cleared) return;
    shown = true;
    slots = fixturePhrase.slice();
    paint();
    return;
  }
  if (action === "wallet-clear") {
    const nodes = host?.querySelectorAll("[data-secret]") || [];
    nodes.forEach((node) => {
      node.textContent = "";
      node.remove();
    });
    wipeSlots();
    cleared = true;
    paint();
    return;
  }
  if (action === "wallet-tx") {
    current = target.dataset.tx || current;
    paint();
    return;
  }
  if (action === "wallet-cancel" || action === "wallet-continue") {
    const tx = transactions.find((item) => item.id === current);
    if (!tx) return;
    decisions = [
      { id: tx.id, choice: action === "wallet-continue" ? "continue" : "cancel", reason: tx.reasonTitle },
      ...decisions,
    ].slice(0, 6);
    paint();
  }
}

export function submitImport(form) {
  const input = form.querySelector("#import-phrase");
  if (!input) return;
  const empty = input.value.trim().length === 0;
  input.value = "";
  importNote = empty
    ? "Type any fixture import. It is wiped on submit and not stored."
    : "Wiped. Not stored. Not checked against a phrase, because none was kept. This screen still cannot sign.";
  paint();
}
