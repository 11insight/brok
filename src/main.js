import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "./styles/tokens.css";
import "./styles/app.css";

import { posts } from "./fixtures/cites.js";
import { applyAccent, readAccent } from "./sidecar/accent.js";
import { emptyArticle, loadArticle, splitArticle } from "./sidecar/article.js";
import { createLedger } from "./sidecar/ledger.js";
import { readSplit, writeSplit } from "./sidecar/split-memory.js";
import { fillPosts } from "./ui/article-html.js";
import { commands, filteredCommands } from "./ui/commands.js";
import { fillShell, mountSplit, shellHtml, syncShell } from "./ui/shell.js";
import { destroy as destroyWallet, handle as walletHandle, mount as mountWallet, submitWallet } from "./ui/wallet.js";

const ledger = createLedger([]);

const state = {
  route: "search",
  back: "search",
  split: false,
  article: emptyArticle(),
  accounts: { grok: false, x: false, starlink: false },
  onDevice: true,
  ledgerOpen: false,
  signinOpen: false,
  securityOpen: false,
  settingsOpen: false,
  accent: applyAccent(readAccent()),
  shelfOpen: false,
  pendingSend: false,
  sendResult: "",
  commandOpen: false,
  commandStage: "list",
  commandQuery: "",
  commandIndex: 0,
  commandId: "",
  commandEgress: null,
  search: { query: "", status: "idle", results: [], error: "" },
};

const app = document.querySelector("#app");
let splitTimer = 0;

function rows() {
  return ledger.list();
}

function sync() {
  if (!document.querySelector(".window")) return;
  syncShell(app, state, rows());
}

function watchChrome() {
  const chrome = document.querySelector(".chrome");
  if (!chrome || chrome.dataset.watched === "1") return;
  const apply = () => {
    document.documentElement.style.setProperty("--chrome-h", `${chrome.offsetHeight}px`);
  };
  apply();
  new ResizeObserver(apply).observe(chrome);
  chrome.dataset.watched = "1";
}

function paintShell() {
  app.innerHTML = shellHtml(state.article);
  fillShell(app, state.article, posts);
  mountSplit(app, state.split);
  fillPosts(app, posts, state.article.published, state.accounts.x);
  watchChrome();
  sync();
}

function paintWallet() {
  destroyWallet();
  app.innerHTML = "";
  mountWallet(app, {
    onEgress(row) {
      ledger.add(row);
    },
  });
  document.title = "Wallet · BROK";
}

function closeOverlays() {
  state.ledgerOpen = false;
  state.signinOpen = false;
  state.securityOpen = false;
  state.settingsOpen = false;
  state.shelfOpen = false;
  state.commandOpen = false;
  state.commandStage = "list";
  state.pendingSend = false;
  sync();
}

function routeFromPath(path) {
  if (path.startsWith("/wallet")) return "wallet";
  if (path.startsWith("/original")) return "original";
  if (path.startsWith("/read")) return "browser";
  return "search";
}

function pathFor(route) {
  if (route === "search") return "/";
  const page = state.article.url ? `?u=${encodeURIComponent(state.article.url)}` : "";
  if (route === "browser") return `/read${page}`;
  if (route === "original") return `/original${page}`;
  return `/${route}`;
}

function focusRoute() {
  if (state.route === "search") document.getElementById("q")?.focus();
}

function go(route) {
  if (route === "wallet" && state.route !== "wallet") state.back = state.route;
  const path = pathFor(route);
  if (location.pathname + location.search !== path) history.pushState({ route }, "", path);
  const leavingWallet = state.route === "wallet" && route !== "wallet";
  if (leavingWallet) destroyWallet();
  state.route = route;
  state.ledgerOpen = false;
  state.signinOpen = false;
  state.securityOpen = false;
  state.settingsOpen = false;
  state.shelfOpen = false;
  state.commandOpen = false;
  state.commandStage = "list";
  state.pendingSend = false;
  if (route === "wallet") paintWallet();
  else if (!document.querySelector(".window")) paintShell();
  else sync();
  focusRoute();
}

function setSplit(on) {
  const win = document.querySelector(".window");
  if (!win) return;
  window.clearTimeout(splitTimer);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  win.classList.remove("animate");
  if (!on && !reduce && win.classList.contains("is-split")) {
    win.classList.add("is-closing", "animate");
    win.classList.remove("is-split");
    splitTimer = window.setTimeout(() => {
      win.classList.remove("is-closing", "animate");
    }, 480);
  } else {
    win.classList.remove("is-closing");
    win.classList.toggle("is-split", on);
    if (on && !reduce) {
      win.classList.add("animate");
      splitTimer = window.setTimeout(() => win.classList.remove("animate"), 640);
    }
  }
  state.split = on;
  writeSplit(state.article.id, on);
  const button = win.querySelector(".hamburger");
  if (button) {
    button.setAttribute("aria-pressed", String(on));
    button.setAttribute("aria-label", on ? "Collapse to one pane" : "Split into three panes");
  }
  fillPosts(app, posts, state.article.published, state.accounts.x);
  sync();
}

// Repaints the page regions after the article changes.
function refill() {
  if (!document.querySelector(".window")) return;
  fillShell(app, state.article, posts);
  fillPosts(app, posts, state.article.published, state.accounts.x);
  sync();
}

let pageToken = 0;

async function openPage(url, { push = true } = {}) {
  const token = ++pageToken;
  const path = `/read?u=${encodeURIComponent(url)}`;
  if (push && location.pathname + location.search !== path) history.pushState({ route: "browser" }, "", path);
  state.article = emptyArticle(url, "loading");
  state.split = false;
  if (state.route === "wallet") destroyWallet();
  state.route = "browser";
  closeOverlays();
  if (!document.querySelector(".window")) paintShell();
  mountSplit(app, false);
  refill();
  const article = await loadArticle(url);
  if (token !== pageToken) return;
  state.article = article;
  state.split = article.status === "done" && readSplit(article.id);
  mountSplit(app, state.split);
  let host = "";
  try { host = new URL(url).hostname; } catch { host = url; }
  ledger.add({
    id: `read-${token}`,
    klass: "medium",
    kind: "Page fetch",
    host,
    result: "allowed",
    detail: article.status === "done"
      ? "BROK's server fetched the page for you. No cookies or account were sent."
      : `BROK's server asked for the page. ${article.error}`,
  });
  // The ledger shows newest first, so add low risk first and high risk lands on top.
  for (const row of [...article.blocked].reverse()) {
    ledger.add({
      id: `read-${token}-${row.host}`,
      klass: row.klass,
      kind: row.kind,
      host: row.host,
      result: "would-have",
      detail: `The page asked for this ${row.tag === "pixel" ? "pixel" : row.tag === "frame" ? "frame" : "script"}. It never loaded.`,
    });
  }
  refill();
  if (state.split && !state.onDevice) runSplit();
}

async function runSplit() {
  const article = state.article;
  if (!article.blocks.length || article.split.status === "loading" || article.split.status === "done") return;
  article.split = { status: "loading" };
  refill();
  const words = article.blocks.reduce((n, block) => n + block.text.split(/\s+/).length, 0);
  const result = await splitArticle(article);
  ledger.add({
    id: `split-${Date.now()}`,
    klass: "medium",
    kind: "Page text",
    host: "Grok (ai-gateway.vercel.sh)",
    result: "allowed",
    detail: `You sent ${words} words of page text. No account was sent.${result.status === "error" ? ` ${result.error}` : ""}`,
  });
  if (state.article !== article) return;
  if (result.status === "done") {
    article.panes.fact.items = result.fact;
    article.panes.opinion.items = result.opinion;
    article.panes.notFact.items = result.notFact;
    article.split = { status: "done", model: result.model };
  } else {
    article.split = result;
  }
  refill();
}

function toggleCommand() {
  if (state.commandOpen) {
    closeOverlays();
    return;
  }
  state.ledgerOpen = false;
  state.signinOpen = false;
  state.securityOpen = false;
  state.settingsOpen = false;
  state.shelfOpen = false;
  state.commandOpen = true;
  state.commandStage = "list";
  state.commandQuery = "";
  state.commandIndex = 0;
  state.commandEgress = null;
  sync();
}

function arm(command) {
  if (!command) return;
  const egress = command.egress(state);
  state.commandId = command.id;
  state.commandStage = "egress";
  state.commandEgress = { title: command.title, ...egress };
  sync();
}

function wouldHave(id, kind, host, detail) {
  ledger.add({
    id: `${id}-${Date.now()}`,
    klass: "api",
    kind,
    host,
    result: "would-have",
    detail,
  });
}

function runCommand() {
  const id = state.commandId;
  state.commandOpen = false;
  state.commandStage = "list";
  if (id === "split") {
    if (state.route === "original") go("browser");
    setSplit(!state.split);
    if (state.split && !state.onDevice) runSplit();
    return;
  }
  if (id === "posts") {
    wouldHave("xapi", "Post text", "api.x.com", "Not sent. Post text only.");
    sync();
    return;
  }
  if (id === "grokipedia") {
    state.shelfOpen = true;
    sync();
    return;
  }
  if (id === "ledger") {
    state.ledgerOpen = true;
    sync();
    return;
  }
  if (id === "security") {
    state.securityOpen = true;
    sync();
  }
}

function toggleAccount(id) {
  state.accounts = { ...state.accounts, [id]: !state.accounts[id] };
  if (id === "starlink" && state.accounts.starlink) {
    ledger.add({
      id: "starlink-signin",
      klass: "medium",
      kind: "Account lookup",
      host: "account.starlink.test",
      result: "allowed",
      detail:
        "Starlink sign-in reveals a dish cell, which is a location. Logged for that reason. Estimator, not a packet trace.",
    });
  }
  fillPosts(app, posts, state.article.published, state.accounts.x);
  sync();
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target || !app.contains(target)) return;
  const action = target.dataset.action;
  if (action === "open-page") {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    openPage(target.getAttribute("href"));
    return;
  }
  if (action.startsWith("wallet-")) {
    walletHandle(action, target);
    return;
  }
  if (action === "go") {
    let route = target.dataset.route;
    if (route === "back") route = state.back || "search";
    if (state.route === "original" && route === "browser" && target.classList.contains("hamburger")) {
      go("browser");
      setSplit(!state.split);
      return;
    }
    go(route);
    return;
  }
  if (action === "toggle-split") {
    if (state.route === "original") {
      go("browser");
      setSplit(!state.split);
      return;
    }
    setSplit(!state.split);
    return;
  }
  if (action === "open-ledger") {
    const next = !state.ledgerOpen;
    closeOverlays();
    state.ledgerOpen = next;
    sync();
    return;
  }
  if (action === "open-signin") {
    const next = !state.signinOpen;
    closeOverlays();
    state.signinOpen = next;
    sync();
    return;
  }
  if (action === "open-settings") {
    const next = !state.settingsOpen;
    closeOverlays();
    state.settingsOpen = next;
    sync();
    return;
  }
  if (action === "set-accent") {
    state.accent = applyAccent(target.dataset.accent);
    sync();
    return;
  }
  if (action === "open-command") {
    toggleCommand();
    return;
  }
  if (action === "close-overlays") {
    closeOverlays();
    return;
  }
  if (action === "toggle-account") {
    toggleAccount(target.dataset.account);
    return;
  }
  if (action === "toggle-device") {
    state.onDevice = !state.onDevice;
    state.pendingSend = false;
    state.sendResult = "";
    sync();
    return;
  }
  if (action === "ask-send") {
    state.pendingSend = true;
    state.sendResult = "";
    sync();
    return;
  }
  if (action === "confirm-send") {
    state.pendingSend = false;
    state.securityOpen = false;
  state.settingsOpen = false;
    if (state.route === "original") go("browser");
    if (!state.split) setSplit(true);
    runSplit();
    return;
  }
  if (action === "command-arm") {
    arm(commands.find((command) => command.id === target.dataset.command));
    return;
  }
  if (action === "command-back") {
    state.commandStage = "list";
    sync();
    return;
  }
  if (action === "command-run") {
    runCommand();
  }
});

app.addEventListener("submit", (event) => {
  const form = event.target;
  if (form?.id !== "import-form" && form?.id !== "send-form") return;
  event.preventDefault();
  submitWallet(form);
});

app.addEventListener("input", (event) => {
  if (event.target?.id !== "cmd-q") return;
  state.commandQuery = event.target.value;
  state.commandIndex = 0;
  sync();
});

document.addEventListener("keydown", (event) => {
  const meta = event.metaKey || event.ctrlKey;
  if (meta && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (state.route === "wallet") return;
    toggleCommand();
    return;
  }
  if (event.key === "Escape") {
    closeOverlays();
    return;
  }
  if (!state.commandOpen) return;
  if (event.key === "Enter" && event.target.closest("button")) return;
  if (state.commandStage === "egress") {
    if (event.key === "Enter") {
      event.preventDefault();
      runCommand();
    }
    return;
  }
  const list = filteredCommands(state.commandQuery);
  if (event.key === "ArrowDown") {
    event.preventDefault();
    const last = Math.max(list.length - 1, 0);
    state.commandIndex = Math.min(last, state.commandIndex + 1);
    sync();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    state.commandIndex = Math.max(0, state.commandIndex - 1);
    sync();
  } else if (event.key === "Enter") {
    event.preventDefault();
    arm(list[state.commandIndex]);
  }
});

function pageParam() {
  return new URLSearchParams(location.search).get("u") || "";
}

window.addEventListener("popstate", () => {
  const route = routeFromPath(location.pathname);
  if ((route === "browser" || route === "original") && pageParam() && pageParam() !== state.article.url) {
    openPage(pageParam(), { push: false });
    if (route === "original") go("original");
    return;
  }
  if (state.route === "wallet" && route !== "wallet") destroyWallet();
  state.route = route;
  if (route === "wallet") paintWallet();
  else if (!document.querySelector(".window")) paintShell();
  else sync();
  focusRoute();
});

ledger.on(() => {
  if (document.querySelector(".window")) sync();
});

let searchToken = 0;

async function runSearch(query) {
  const token = ++searchToken;
  state.search = { query, status: "loading", results: [], error: "" };
  sync();
  let failed = false;
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await response.json().catch(() => ({}));
    if (token !== searchToken) return;
    if (!response.ok) failed = true;
    state.search = {
      query,
      status: failed ? "error" : "done",
      results: failed ? [] : data.results || [],
      error: failed ? "Search failed." : "",
    };
  } catch {
    if (token !== searchToken) return;
    failed = true;
    state.search = { query, status: "error", results: [], error: "Search failed." };
  }
  ledger.add({
    id: `search-${token}`,
    klass: "medium",
    kind: "Web search",
    host: "bing.com",
    result: "allowed",
    detail: failed
      ? `Query sent. Results did not come back. "${query.slice(0, 80)}"`
      : `Query sent. No account was sent. "${query.slice(0, 80)}"`,
  });
}

app.addEventListener("submit", (event) => {
  if (!event.target?.classList?.contains("search")) return;
  event.preventDefault();
  const query = document.getElementById("q")?.value.trim() || "";
  if (!query) return;
  runSearch(query);
});

state.route = routeFromPath(location.pathname);
if (state.route === "wallet") paintWallet();
else paintShell();
if (state.route !== "wallet" && pageParam()) {
  const start = state.route;
  openPage(pageParam(), { push: false });
  if (start === "original") go("original");
}
focusRoute();
