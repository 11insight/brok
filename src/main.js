import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "./styles/tokens.css";
import "./styles/app.css";

import { posts } from "./fixtures/cites.js";
import { ledgerSeed } from "./fixtures/ledger-seed.js";
import { loadArticle } from "./sidecar/article.js";
import { createLedger } from "./sidecar/ledger.js";
import { readSplit, writeSplit } from "./sidecar/split-memory.js";
import { fillPosts } from "./ui/article-html.js";
import { commands, filteredCommands } from "./ui/commands.js";
import { fillShell, mountSplit, shellHtml, syncShell } from "./ui/shell.js";
import { destroy as destroyWallet, handle as walletHandle, mount as mountWallet, submitImport } from "./ui/wallet.js";

const article = loadArticle();
const ledger = createLedger(ledgerSeed);
const SEND_PREVIEW = "The coating eliminates corrosion forever.";

const state = {
  route: "browser",
  split: readSplit(article.id),
  article,
  accounts: { grok: false, x: false, starlink: false },
  onDevice: true,
  ledgerOpen: false,
  ledgerFilter: "all",
  signinOpen: false,
  securityOpen: false,
  shelfOpen: false,
  pendingSend: false,
  sendPreview: SEND_PREVIEW,
  sendResult: "",
  commandOpen: false,
  commandStage: "list",
  commandQuery: "",
  commandIndex: 0,
  commandId: "",
  commandEgress: null,
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
  app.innerHTML = shellHtml(article);
  fillShell(app, article, posts);
  mountSplit(app, state.split);
  fillPosts(app, posts, article.published, state.accounts.x);
  watchChrome();
  sync();
}

function paintWallet() {
  destroyWallet();
  app.innerHTML = "";
  mountWallet(app);
  document.title = "Wallet · BROK";
}

function closeOverlays() {
  state.ledgerOpen = false;
  state.signinOpen = false;
  state.securityOpen = false;
  state.shelfOpen = false;
  state.commandOpen = false;
  state.commandStage = "list";
  state.pendingSend = false;
  sync();
}

function routeFromPath(path) {
  if (path.startsWith("/wallet")) return "wallet";
  if (path.startsWith("/original")) return "original";
  return "browser";
}

function go(route) {
  const path = route === "browser" ? "/" : `/${route}`;
  if (location.pathname !== path) history.pushState({ route }, "", path);
  const leavingWallet = state.route === "wallet" && route !== "wallet";
  if (leavingWallet) destroyWallet();
  state.route = route;
  state.ledgerOpen = false;
  state.signinOpen = false;
  state.securityOpen = false;
  state.shelfOpen = false;
  state.commandOpen = false;
  state.commandStage = "list";
  state.pendingSend = false;
  if (route === "wallet") paintWallet();
  else if (!document.querySelector(".window")) paintShell();
  else sync();
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
  writeSplit(article.id, on);
  const button = win.querySelector(".hamburger");
  if (button) {
    button.setAttribute("aria-pressed", String(on));
    button.setAttribute("aria-label", on ? "Collapse to one pane" : "Split into three panes");
  }
  fillPosts(app, posts, article.published, state.accounts.x);
  sync();
}

function toggleCommand() {
  if (state.commandOpen) {
    closeOverlays();
    return;
  }
  state.ledgerOpen = false;
  state.signinOpen = false;
  state.securityOpen = false;
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
    if (!state.onDevice) {
      wouldHave("xai", "Claim text", "api.x.ai", "Not sent. Claim text only. The split stayed in the tab.");
    }
    if (state.route === "original") go("browser");
    setSplit(!state.split);
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
  fillPosts(app, posts, article.published, state.accounts.x);
  sync();
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target || !app.contains(target)) return;
  const action = target.dataset.action;
  if (action.startsWith("wallet-")) {
    walletHandle(action, target);
    return;
  }
  if (action === "go") {
    const route = target.dataset.route;
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
  if (action === "open-command") {
    toggleCommand();
    return;
  }
  if (action === "close-overlays") {
    closeOverlays();
    return;
  }
  if (action === "ledger-filter") {
    state.ledgerFilter = target.dataset.filter || "all";
    sync();
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
    wouldHave("send", "Claim text", "api.x.ai", "Not sent. Claim text only.");
    state.pendingSend = false;
    state.sendResult = "Recorded as would-have. Not sent.";
    sync();
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
  if (event.target?.id !== "import-form") return;
  event.preventDefault();
  submitImport(event.target);
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

window.addEventListener("popstate", () => {
  const route = routeFromPath(location.pathname);
  if (state.route === "wallet" && route !== "wallet") destroyWallet();
  state.route = route;
  if (route === "wallet") paintWallet();
  else if (!document.querySelector(".window")) paintShell();
  else sync();
});

ledger.on(() => {
  if (document.querySelector(".window")) sync();
});

state.route = routeFromPath(location.pathname);
if (state.route === "wallet") paintWallet();
else paintShell();
