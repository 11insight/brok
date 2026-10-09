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
import { buzz, toast } from "./ui/toast.js";
import { createCharacter } from "./ui/character.js";
import { cleanUrl } from "./sidecar/clean-url.js";
import { PRESETS, forgetOwnModel, listModels, saveOwnModel } from "./sidecar/own-model.js";
import { finishXSignIn, isXCallback, signOutX, startXSignIn, xPostsFor, xSession } from "./sidecar/x-auth.js";
import { fillShell, mountSplit, shellHtml, syncShell } from "./ui/shell.js";
import { destroy as destroyWallet, handle as walletHandle, mount as mountWallet, submitWallet } from "./ui/wallet.js";

const ledger = createLedger([]);

const state = {
  route: "search",
  back: "search",
  split: false,
  article: emptyArticle(),
  accounts: { grok: false, x: false, starlink: false },
  config: { search: "", xClientId: "" },
  xSession: xSession(),
  xPosts: { status: "idle" },
  onDevice: true,
  ledgerOpen: false,
  ledgerTab: "blocked",
  signinOpen: false,
  securityOpen: false,
  settingsOpen: false,
  modelMode: "",
  modelRev: 0,
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

// The big Brok on the search page, and the small one in the top bar.
let brok = null;
let brokMini = null;

function mountCharacters() {
  brok?.stop();
  brokMini?.stop();
  const big = app.querySelector(".hero .brok-char");
  const small = app.querySelector(".brand .brok-char");
  brok = big ? createCharacter(big) : null;
  brokMini = small ? createCharacter(small) : null;
}

// A win: the big Brok spins if you can see it, otherwise the small one does.
function celebrate() {
  if (state.route === "search" && brok) brok.spin();
  else brokMini?.spin();
}

function wiggle() {
  if (state.route === "search" && brok) brok.wiggle();
  else brokMini?.wiggle();
}

function paintShell() {
  app.innerHTML = shellHtml(state.article);
  fillShell(app, state.article, posts);
  mountSplit(app, state.split);
  fillPosts(app, posts, state.article.published, state.accounts.x);
  watchChrome();
  mountCharacters();
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
  const page = state.article.url ? `#u=${encodeURIComponent(state.article.url)}` : "";
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
  if (location.pathname + location.hash !== path) history.pushState({ route }, "", path);
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
  enter();
  focusRoute();
}

// Each screen eases in, 10px up, the way Play Crypto pushes a page.
function enter() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const node = state.route === "wallet" ? app.querySelector(".wallet") : app.querySelector(".stage");
  node?.animate(
    [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }],
    { duration: 380, easing: "cubic-bezier(.2,.9,.25,1)" },
  );
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

async function openPage(raw, { push = true } = {}) {
  const url = cleanUrl(raw);
  const token = ++pageToken;
  const path = `/read#u=${encodeURIComponent(url)}`;
  if (push && location.pathname + location.hash !== path) history.pushState({ route: "browser" }, "", path);
  state.article = emptyArticle(url, "loading");
  state.xPosts = { status: "idle" };
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
  if (article.status === "done") celebrate();
  state.split = article.status === "done" && readSplit(article.id);
  mountSplit(app, state.split);
  let host = "";
  try { host = new URL(url).hostname; } catch { host = url; }
  ledger.add({
    id: `read-${token}`,
    klass: "medium",
    kind: "Page address",
    host: `Brok's server, then ${host}`,
    result: "allowed",
    detail: article.status === "done"
      ? `Brok's server fetched the page. ${host} saw Brok, not you. No cookies, no account.`
      : `Brok's server asked for the page. ${article.error}`,
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
    host: result.sentTo || "Brok's server, then Vercel AI Gateway, then xAI",
    result: "allowed",
    detail: `${words} words of page text, to sort it. No account.${result.status === "error" ? ` ${result.error}` : ""}`,
  });
  if (state.article !== article) return;
  buzz(30);
  toast(result.status === "done" ? "Split done." : result.error || "The split failed.");
  if (result.status === "done") celebrate();
  if (result.status === "done") {
    article.panes.fact.items = result.fact;
    article.panes.opinion.items = result.opinion;
    article.panes.notFact.items = result.notFact;
    article.split = { status: "done", model: result.model, promptVersion: result.promptVersion, via: result.label };
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
  const egress = command.egress?.(state);
  state.commandId = command.id;
  if (!egress) {
    runCommand();
    return;
  }
  closeOverlays();
  state.commandOpen = true;
  state.commandStage = "egress";
  state.commandEgress = { title: command.title, ...egress };
  sync();
}

function showView(view) {
  buzz(5);
  if (view === "original") {
    go("original");
    return;
  }
  if (state.route !== "browser") go("browser");
  if (state.split !== (view === "split")) setSplit(view === "split");
  if (view === "split" && !state.onDevice) runSplit();
}

function runCommand() {
  const id = state.commandId;
  closeOverlays();
  if (id === "search") {
    go("search");
    return;
  }
  if (id === "reader" || id === "original") {
    showView(id);
    return;
  }
  if (id === "split") {
    showView("split");
    runSplit();
    return;
  }
  if (id === "wallet") {
    go("wallet");
    return;
  }
  if (id === "ledger" || id === "sent") {
    state.ledgerOpen = true;
    state.ledgerTab = id === "sent" ? "sent" : "blocked";
  }
  if (id === "security") state.securityOpen = true;
  if (id === "settings") state.settingsOpen = true;
  sync();
}

function toggleAccount(id) {
  state.accounts = { ...state.accounts, [id]: !state.accounts[id] };
  fillPosts(app, posts, state.article.published, state.accounts.x);
  sync();
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target || !app.contains(target)) return;
  const action = target.dataset.action;
  if (action === "view") {
    showView(target.dataset.view);
    return;
  }
  if (action === "split-now") {
    buzz(8);
    if (state.route !== "browser") go("browser");
    if (!state.split) setSplit(true);
    runSplit();
    return;
  }
  if (action === "reload-page") {
    if (state.article.url) openPage(state.article.url, { push: false });
    return;
  }
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
  if (action === "ledger-tab") {
    state.ledgerTab = target.dataset.tab;
    sync();
    return;
  }
  if (action === "open-ledger") {
    const next = !state.ledgerOpen;
    closeOverlays();
    state.ledgerOpen = next;
    state.ledgerTab = target.dataset.tab || "blocked";
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
  if (action === "x-signin") {
    if (!state.config.xClientId) return;
    ledger.add({
      id: `x-signin-${Date.now()}`,
      klass: "low",
      kind: "Sign in",
      host: "x.com",
      result: "allowed",
      detail: "Your browser went to X to sign in. Brok never sees your password.",
    });
    startXSignIn(state.config.xClientId);
    return;
  }
  if (action === "x-signout") {
    signOutX().then(() => {
      state.xSession = null;
      state.xPosts = { status: "idle" };
      sync();
      toast("Signed out of X.");
    });
    return;
  }
  if (action === "x-posts") {
    loadXPosts();
    return;
  }
  if (action === "model-mode") {
    state.modelMode = target.dataset.mode;
    if (state.modelMode === "brok") {
      const form = readModelForm();
      saveOwnModel({ ...form, on: false });
    }
    state.modelRev += 1;
    refill();
    return;
  }
  if (action === "model-preset") {
    const preset = PRESETS.find((item) => item.id === target.dataset.preset);
    const form = document.getElementById("model-form");
    if (!preset || !form) return;
    form.endpoint.value = preset.endpoint;
    form.model.value = preset.model;
    modelStatus(preset.needsKey ? "Paste your key, then tap Check." : "Tap Check to see the models on your computer.");
    return;
  }
  if (action === "model-check") {
    checkModels();
    return;
  }
  if (action === "model-forget") {
    forgetOwnModel();
    state.modelMode = "brok";
    state.modelRev += 1;
    refill();
    toast("Forgotten. Splits use Brok's Grok.");
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

async function loadXPosts() {
  const article = state.article;
  if (!article.url || state.xPosts.status === "loading") return;
  state.xPosts = { status: "loading" };
  sync();
  const result = await xPostsFor(article.url);
  ledger.add({
    id: `x-posts-${Date.now()}`,
    klass: "medium",
    kind: "Posts on X",
    host: "Brok's server, then api.x.com",
    result: "allowed",
    detail: "Your X sign-in and this page address, to find posts that link to it. Brok keeps neither.",
  });
  if (state.article !== article) return;
  state.xSession = xSession();
  state.xPosts = result;
  if (result.status === "error") toast(result.error);
  sync();
}

async function loadConfig() {
  try {
    const res = await fetch("/api/config", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    if (res.ok) state.config = await res.json();
  } catch {
    // Offline. X sign-in stays hidden.
  }
  sync();
}

function readModelForm() {
  const form = document.getElementById("model-form");
  if (!form) return {};
  return {
    endpoint: form.endpoint.value,
    model: form.model.value,
    key: form.key.value,
    remember: form.remember.checked,
  };
}

function modelStatus(text) {
  const node = document.getElementById("model-status");
  if (node) node.textContent = text;
}

async function checkModels() {
  const config = readModelForm();
  config.endpoint = String(config.endpoint || "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//.test(config.endpoint)) return modelStatus("Type the address first.");
  modelStatus("Checking.");
  const result = await listModels(config);
  ledger.add({
    id: `models-${Date.now()}`,
    klass: "low",
    kind: "Model list",
    host: `${new URL(config.endpoint).host}, straight from your browser`,
    result: "allowed",
    detail: config.key ? "Your key, to list the models it can use. Not through Brok." : "A request to list the models. No page text.",
  });
  if (!result.ok) return modelStatus(result.error);
  const list = document.getElementById("model-list");
  if (list) list.innerHTML = result.models.map((id) => `<option value="${id.replace(/"/g, "&quot;")}"></option>`).join("");
  const form = document.getElementById("model-form");
  if (form && !form.model.value && result.models.length) form.model.value = result.models[0];
  modelStatus(result.models.length ? `${result.models.length} models found. Pick one, then tap Use it.` : "It answered, but listed no models.");
}

app.addEventListener("submit", (event) => {
  if (event.target?.id !== "model-form") return;
  event.preventDefault();
  const config = readModelForm();
  if (!/^https?:\/\//.test(String(config.endpoint || "").trim())) return modelStatus("Type the address first.");
  if (!String(config.model || "").trim()) return modelStatus("Pick a model first. Tap Check to list them.");
  const saved = saveOwnModel({ ...config, on: true });
  state.modelMode = "own";
  state.modelRev += 1;
  refill();
  buzz(8);
  toast(`Splits now go straight to ${new URL(saved.endpoint).host}.`);
  wiggle();
});

// Brok watches the search box: eyes on the cursor while you type, a squint
// when you pause to think it over.
let typingTimer = 0;
let measure = null;

function caretPoint(input) {
  measure = measure || document.createElement("canvas").getContext("2d");
  const style = getComputedStyle(input);
  measure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const before = input.value.slice(0, input.selectionStart ?? input.value.length);
  const box = input.getBoundingClientRect();
  const x = box.left + parseFloat(style.paddingLeft) + measure.measureText(before).width - input.scrollLeft;
  return { x: Math.min(box.right, x), y: box.top + box.height / 2 };
}

function watchTyping(input) {
  if (!brok || state.route !== "search") return;
  const point = caretPoint(input);
  brok.lookAt(point.x, point.y);
  brok.squint(false);
  window.clearTimeout(typingTimer);
  if (input.value.trim().length >= 3) {
    typingTimer = window.setTimeout(() => brok?.squint(true), 900);
  }
}

app.addEventListener("input", (event) => {
  if (event.target?.id === "q") watchTyping(event.target);
});
app.addEventListener("keyup", (event) => {
  if (event.target?.id === "q" && /Arrow|Home|End/.test(event.key)) watchTyping(event.target);
});
app.addEventListener("focusin", (event) => {
  if (event.target?.id === "q") watchTyping(event.target);
});
app.addEventListener("focusout", (event) => {
  if (event.target?.id !== "q") return;
  window.clearTimeout(typingTimer);
  if (state.search.status !== "loading") brok?.squint(false);
  brok?.rest();
});
app.addEventListener("click", (event) => {
  if (event.target.closest?.(".hero .brok-char")) {
    buzz(5);
    if (Math.random() < 0.35) brok?.spin();
    else brok?.wiggle();
  }
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
  const list = filteredCommands(state.commandQuery, state.article?.status === "done");
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

// The page address lives after the #, which a browser never sends to a
// server. Old links with ?u= are moved behind the # on load.
function pageParam() {
  return new URLSearchParams(location.hash.slice(1)).get("u") || new URLSearchParams(location.search).get("u") || "";
}

if (new URLSearchParams(location.search).get("u")) {
  history.replaceState(null, "", `${location.pathname}#u=${encodeURIComponent(pageParam())}`);
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
  enter();
  focusRoute();
});

// A link that opens in a new tab goes straight from your browser to that site.
document.addEventListener("click", (event) => {
  const link = event.target.closest?.('a[target="_blank"]');
  if (!link) return;
  let host = "";
  try { host = new URL(link.href).hostname; } catch { return; }
  ledger.add({
    id: `link-${Date.now()}`,
    klass: "low",
    kind: "Link opened",
    host,
    result: "allowed",
    detail: `Your browser went to ${host} in a new tab. Brok was not in between.`,
  });
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
  let engine = "the search engine";
  window.clearTimeout(typingTimer);
  brok?.think(true);
  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ q: query }),
    });
    const data = await response.json().catch(() => ({}));
    if (token !== searchToken) return;
    if (!response.ok) failed = true;
    if (data.source) engine = data.source;
    brok?.think(false);
    if (response.ok && (data.results || []).length) celebrate();
    else wiggle();
    state.search = {
      query,
      status: failed ? "error" : "done",
      results: failed ? [] : data.results || [],
      error: failed ? data.error || "Search failed." : "",
    };
  } catch {
    if (token !== searchToken) return;
    failed = true;
    brok?.think(false);
    state.search = { query, status: "error", results: [], error: "Search failed." };
  }
  ledger.add({
    id: `search-${token}`,
    klass: "medium",
    kind: "Search",
    host: `Brok's server, then ${engine}`,
    result: "allowed",
    detail: `"${query.slice(0, 80)}". ${engine} saw Brok's server, not you.${failed ? " No results came back." : ""}`,
  });
}

app.addEventListener("submit", (event) => {
  if (!event.target?.classList?.contains("search")) return;
  event.preventDefault();
  const query = document.getElementById("q")?.value.trim() || "";
  if (!query) return;
  runSearch(query);
});

const backFromX = isXCallback();
if (backFromX) {
  finishXSignIn().then((result) => {
    state.xSession = xSession();
    toast(result.ok ? `Signed in to X as @${result.username}.` : result.error);
    if (result.ok) celebrate();
    const start = routeFromPath(location.pathname);
    if (pageParam()) {
      openPage(pageParam(), { push: false });
      if (start === "original") go("original");
    } else {
      sync();
    }
  });
}
loadConfig();

state.route = routeFromPath(location.pathname);
if (state.route === "wallet") paintWallet();
else paintShell();
if (!backFromX && state.route !== "wallet" && pageParam()) {
  const start = state.route;
  openPage(pageParam(), { push: false });
  if (start === "original") go("original");
}
focusRoute();
