import { ASK_PROMPT, ASK_VERSION, askInput, readAsk } from "../prompts/ask.js";
import { CHECK_PROMPT, CHECK_VERSION, checkInput, readChecks } from "../prompts/check.js";
import { askOwnModel, currentOwnModel, hostOf } from "./own-model.js";

async function post(path, body) {
  try {
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: { error: "Brok could not reach its server." } };
  }
}

const ownModel = () => {
  const own = currentOwnModel();
  return own?.on && own.endpoint && own.model ? own : null;
};

// Ask about the page you are reading. Quotes are checked against the page.
export async function askAboutPage(article, history, question) {
  const own = ownModel();
  if (own) {
    const reply = await askOwnModel(own, ASK_PROMPT, askInput(article, history, question), 700);
    if (!reply.ok) return { status: "error", error: reply.error };
    const parsed = readAsk(reply.content, article);
    if (!parsed) return { status: "error", error: "The model sent back something unreadable." };
    return { status: "done", model: own.model, promptVersion: ASK_VERSION, ...parsed, sentTo: `${hostOf(own.endpoint)}, straight from your browser` };
  }
  const { ok, data } = await post("/api/ask", { title: article.title, blocks: article.blocks, history, question });
  if (!ok) return { status: "error", error: data.error || "Asking failed." };
  return { status: "done", ...data };
}

// Checks claims against other sources. Brok's server finds the sources;
// your own model, if you picked one, judges them from this browser.
export async function checkPageClaims(article, claims) {
  const own = ownModel();
  if (own) {
    const { ok, data } = await post("/api/evidence", { title: article.title, url: article.url, claims });
    if (!ok) return { status: "error", error: data.error || "Brok could not find sources." };
    const reply = await askOwnModel(own, CHECK_PROMPT, checkInput(article.title, data.claims, data.evidence), 1500);
    if (!reply.ok) return { status: "error", error: reply.error };
    const checks = readChecks(reply.content, data.claims, data.evidence);
    if (!checks) return { status: "error", error: "The model sent back something unreadable." };
    return { status: "done", model: own.model, promptVersion: CHECK_VERSION, checks, sentTo: `${hostOf(own.endpoint)}, straight from your browser` };
  }
  const { ok, data } = await post("/api/check", { title: article.title, url: article.url, claims });
  if (!ok) return { status: "error", error: data.error || "The check failed." };
  return { status: "done", ...data };
}
