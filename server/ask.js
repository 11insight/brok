import { ASK_PROMPT, ASK_VERSION, askInput, readAsk } from "../src/prompts/ask.js";
import { CHECK_PROMPT, CHECK_VERSION, checkInput, readChecks } from "../src/prompts/check.js";
import { searchNews, searchWeb } from "../src/sidecar/web-search.js";
import { MODEL, askGrok } from "./grok.js";
import { fail } from "./net.js";

function pageFrom(body) {
  const blocks = (Array.isArray(body?.blocks) ? body.blocks : []).slice(0, 400).map((block) => ({ text: String(block?.text || "") }));
  if (!blocks.length) throw fail(400, "No page text.");
  return { title: String(body?.title || ""), blocks };
}

// Ask about the page you are reading.
export async function askPage(body) {
  const article = pageFrom(body);
  const question = String(body?.question || "").trim();
  if (!question) throw fail(400, "Type a question.");
  const content = await askGrok(ASK_PROMPT, askInput(article, body?.history, question), 700);
  const reply = readAsk(content, article);
  if (!reply) throw fail(502, "Grok sent back something unreadable.");
  return { model: MODEL, promptVersion: ASK_VERSION, ...reply };
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Sources for each claim, from web and news search. Never the page's own site,
// so a page cannot back itself.
export async function claimEvidence(body) {
  const claims = (Array.isArray(body?.claims) ? body.claims : []).map((claim) => String(claim || "").slice(0, 300)).filter(Boolean).slice(0, 6);
  if (!claims.length) throw fail(400, "No claims to check.");
  const home = hostOf(body?.url || "");
  const evidence = [];
  for (let i = 0; i < claims.length; i += 3) {
    const batch = await Promise.all(
      claims.slice(i, i + 3).map(async (claim) => {
        const [web, news] = await Promise.all([
          searchWeb(claim).then((data) => data.results).catch(() => []),
          searchNews(claim, 3),
        ]);
        const seen = new Set([home]);
        const out = [];
        for (const item of [...news, ...web]) {
          const site = hostOf(item.url);
          if (!site || seen.has(site)) continue;
          seen.add(site);
          out.push({ url: item.url, title: item.title, site, date: Date.parse(item.age) ? new Date(item.age).toISOString() : "", text: `${item.title}. ${item.snippet || ""}` });
          if (out.length >= 4) break;
        }
        return out;
      }),
    );
    evidence.push(...batch);
  }
  return { claims, evidence };
}

export async function checkClaims(body) {
  const { claims, evidence } = await claimEvidence(body);
  const content = await askGrok(CHECK_PROMPT, checkInput(String(body?.title || ""), claims, evidence), 1500);
  const checks = readChecks(content, claims, evidence);
  if (!checks) throw fail(502, "Grok sent back something unreadable.");
  return { model: MODEL, promptVersion: CHECK_VERSION, checks };
}
