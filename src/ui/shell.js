import { starlinkFixture } from "../fixtures/accounts.js";
import { quotesFor } from "../fixtures/ticker.js";
import { columnsHtml, fillPosts, originalHtml, railHtml, singleHtml } from "./article-html.js";
import { esc } from "./dom.js";
import { arrowIcon, brandMark, gearIcon, searchIcon } from "./icons.js";
import { blockedCount, commandHtml, drawerHtml, securityHtml, settingsHtml, shelfHtml, signinHtml } from "./overlays.js";

function resultsHtml(search) {
  if (!search || search.status === "idle") return "";
  if (search.status === "loading") {
    return `<ol class="hits is-loading" aria-label="Searching">${"<li><span class=\"hit hit-ghost\"><i></i><i></i><i></i></span></li>".repeat(3)}</ol>`;
  }
  if (search.status === "error") return `<p class="results-note">${esc(search.error || "Search failed.")}</p>`;
  if (!search.results?.length) return `<p class="results-note">No results.</p>`;
  const items = search.results
    .map((hit) => {
      let host = "";
      try { host = new URL(hit.url).host.replace(/^www\./, ""); } catch { host = ""; }
      return `<li>
        <a class="hit" href="${esc(hit.url)}" data-action="open-page" rel="noreferrer">
          <p class="host">${esc(host)}</p>
          <h2>${esc(hit.title)}</h2>
          <p>${esc(hit.snippet)}</p>
        </a>
      </li>`;
    })
    .join("");
  return `<ol class="hits">${items}</ol>`;
}

export function paintSearch(root, search) {
  const form = root.querySelector("form.search");
  const box = root.querySelector("#results");
  if (!form || !box) return;
  const active = Boolean(search && search.status && search.status !== "idle");
  form.classList.toggle("has-results", active);
  if (!active) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  box.hidden = false;
  box.innerHTML = resultsHtml(search);
}

export function shellHtml(article) {
  const stocks = quotesFor(article)
    .map((quote) => {
      const why = quote.pinned ? `Pinned because this article names ${article.company.name}. ` : "";
      return `<span class="quote" title="${esc(`${why}Fixture quote. Not a live price. Not polled.`)}">
        <span class="sym">${esc(quote.symbol)}</span>
        <span>${esc(quote.price)}</span>
        <span class="chg">${esc(quote.change)}</span>
      </span>`;
    })
    .join("");
  return `<div class="window" data-route="browser">
    <div class="chrome">
      <div class="toolbar">
        <button type="button" class="brand" data-action="go" data-route="search" aria-label="BROK home">${brandMark}<span>BROK</span></button>
        <button type="button" class="hamburger icon-btn" data-action="toggle-split" aria-pressed="false" aria-label="Split into three panes">
          <span class="hb" aria-hidden="true"><i></i><i></i><i></i></span>
        </button>
        <p class="omnibox">${esc(article.url)}</p>
        <nav class="tools" aria-label="Tools">
          <button type="button" class="tool" data-action="open-ledger"><span class="count" data-blocked>0</span><span class="tool-word">Blocked</span></button>
          <button type="button" class="tool" data-action="open-signin">Sign in</button>
          <button type="button" class="tool" data-action="go" data-route="wallet">Wallet</button>
          <button type="button" class="tool gear" data-action="open-settings" aria-label="Settings">${gearIcon}</button>
        </nav>
      </div>
    </div>
    <div class="meta">
      <div class="stocks">${stocks}</div>
      <p class="strip" id="starlink" hidden></p>
      <p class="strip" id="quiet">Cite rail quiet. No X account. Posts are not invented.</p>
    </div>
    <div class="body">
      <div class="stage">
        <form class="search" id="search">
          <div class="hero" aria-hidden="true">${brandMark}<p class="wordmark">BROK</p></div>
          <label for="q">Search</label>
          <div class="field-search">
            ${searchIcon}
            <input id="q" name="q" type="text" enterkeyhint="search" autocomplete="off" spellcheck="false" placeholder="What do you want to know?" />
            <button type="submit" class="go" aria-label="Search">${arrowIcon}</button>
          </div>
          <p class="fine">Searches go to Bing. Your accounts stay here.</p>
          <div class="results" id="results" hidden></div>
        </form>
        <div class="single" id="single"></div>
        <div class="columns" id="columns"></div>
        <div id="original"></div>
      </div>
      <aside class="rail" id="rail" hidden></aside>
    </div>
    <aside class="drawer" id="drawer" hidden></aside>
    <div class="popover" id="signin" hidden></div>
    <div class="popover" id="security" hidden></div>
    <div class="popover" id="shelf" hidden></div>
    <div class="popover" id="settings" hidden></div>
    <div id="command"></div>
  </div>`;
}

export function fillShell(root, article, posts) {
  root.querySelector("#single").innerHTML = singleHtml(article);
  root.querySelector("#columns").innerHTML = columnsHtml(article);
  root.querySelector("#original").innerHTML = originalHtml(article);
  root.querySelector("#rail").innerHTML = railHtml(posts, article.published);
}

export function syncShell(root, state, rows) {
  const win = root.querySelector(".window");
  if (!win) return;
  win.dataset.route = state.route === "wallet" ? "browser" : state.route;
  win.classList.toggle("drawer-open", state.ledgerOpen);
  const splitBtn = win.querySelector(".hamburger");
  if (splitBtn && !win.classList.contains("is-closing")) {
    splitBtn.setAttribute("aria-pressed", String(state.split));
    splitBtn.setAttribute(
      "aria-label",
      state.split ? "Collapse to one pane" : "Split into three panes",
    );
  }
  const star = win.querySelector("#starlink");
  if (state.accounts.starlink) {
    star.hidden = false;
    star.textContent = `Cell ${starlinkFixture.cell}, ${starlinkFixture.tier}, ${starlinkFixture.outage}. ${starlinkFixture.note} Logged because it shows a place.`;
  } else {
    star.hidden = true;
  }
  const closing = win.classList.contains("is-closing");
  const pageOn = Boolean(state.article?.url);
  const omnibox = win.querySelector(".omnibox");
  if (omnibox) {
    omnibox.hidden = !pageOn;
    omnibox.textContent = state.article?.url || "";
  }
  const hamburger = win.querySelector(".hamburger");
  if (hamburger) hamburger.hidden = !pageOn;
  const meta = win.querySelector(".meta");
  if (meta) meta.hidden = !pageOn;
  const quiet = win.querySelector("#quiet");
  quiet.hidden = state.accounts.x || state.split || closing;
  const rail = win.querySelector("#rail");
  rail.hidden = !state.accounts.x || state.split || closing || state.route === "original" || state.route === "search";
  win.querySelector("[data-blocked]").textContent = String(blockedCount(rows));
  const drawer = win.querySelector("#drawer");
  drawer.hidden = !state.ledgerOpen;
  if (state.ledgerOpen) drawer.innerHTML = drawerHtml(rows);
  const signin = win.querySelector("#signin");
  signin.hidden = !state.signinOpen;
  if (state.signinOpen) signin.innerHTML = signinHtml(state.accounts);
  const security = win.querySelector("#security");
  security.hidden = !state.securityOpen;
  if (state.securityOpen) security.innerHTML = securityHtml(state);
  const settings = win.querySelector("#settings");
  settings.hidden = !state.settingsOpen;
  if (state.settingsOpen) settings.innerHTML = settingsHtml(state);
  const shelf = win.querySelector("#shelf");
  shelf.hidden = !state.shelfOpen;
  if (state.shelfOpen) shelf.innerHTML = shelfHtml(state.article);
  const command = win.querySelector("#command");
  const commandSig = JSON.stringify({
    open: state.commandOpen,
    stage: state.commandStage,
    query: state.commandQuery,
    index: state.commandIndex,
    title: state.commandEgress?.title || "",
    note: state.commandEgress?.note || "",
    onDevice: state.onDevice,
  });
  if (commandSig !== command.dataset.sig) {
    const had = document.activeElement?.id === "cmd-q";
    const caret = had ? document.getElementById("cmd-q").selectionStart : null;
    command.dataset.sig = commandSig;
    command.innerHTML = commandHtml(state);
    if (state.commandOpen && state.commandStage === "list") {
      const input = document.getElementById("cmd-q");
      if (input) {
        input.focus();
        if (had && caret != null) input.setSelectionRange(caret, caret);
      }
    } else if (state.commandOpen && state.commandStage === "egress") {
      document.querySelector("[data-action='command-run']")?.focus();
    }
  }
  document.title = state.route === "original" ? "BROK Original" : state.route === "search" ? "BROK" : "BROK Reader";
  paintSearch(root, state.search);
}

export function mountSplit(root, split) {
  const win = root.querySelector(".window");
  win.classList.add("no-motion");
  win.classList.toggle("is-split", split);
  requestAnimationFrame(() => win.classList.remove("no-motion"));
}

export { fillPosts };
