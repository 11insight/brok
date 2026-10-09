import { getVercelOidcToken } from "@vercel/oidc";
import { ANSWER_PROMPT, ANSWER_VERSION, answerInput, readAnswer } from "../src/prompts/answer.js";
import { cleanUrl } from "../src/sidecar/clean-url.js";
import { searchNews } from "../src/sidecar/web-search.js";
import { fail } from "./net.js";
import { readPage } from "./read.js";

const GATEWAY = "https://ai-gateway.vercel.sh/v1/chat/completions";
const MODEL = process.env.BROK_SPLIT_MODEL || "spacexai/grok-4.1-fast-non-reasoning";
const MAX_PAGES = 6;

async function gatewayToken() {
  if (process.env.AI_GATEWAY_API_KEY) return process.env.AI_GATEWAY_API_KEY;
  try {
    return await getVercelOidcToken();
  } catch {
    return null;
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// The pages an answer reads: fresh news first, then the top search results,
// one page per site, read by BrokReader the same way the reader does.
export async function gatherSources(body) {
  const question = String(body?.q || "").trim().slice(0, 240);
  if (!question) throw fail(400, "Type a search.");
  const news = await searchNews(question, 6);
  const given = (Array.isArray(body?.urls) ? body.urls : []).slice(0, 6).map((url) => ({ url: String(url) }));
  const seen = new Set();
  const picks = [];
  // Alternate the top web results with fresh news, so "what is" questions
  // get reference pages and "today" questions get news.
  const mixed = [];
  for (let i = 0; i < Math.max(news.length, given.length); i += 1) {
    if (given[i]) mixed.push(given[i]);
    if (news[i]) mixed.push(news[i]);
  }
  for (const item of mixed) {
    const url = cleanUrl(item.url);
    const site = hostOf(url);
    if (!site || seen.has(site)) continue;
    seen.add(site);
    picks.push({ url, title: item.title || "", date: item.age || "", snippet: item.snippet || "" });
    if (picks.length >= MAX_PAGES + 2) break;
  }
  const read = await Promise.all(
    picks.map((pick) =>
      Promise.race([
        readPage(pick.url).catch(() => null),
        new Promise((resolve) => setTimeout(() => resolve(null), 9000)),
      ]).then((page) => {
        const dated = Date.parse(pick.date) ? new Date(pick.date).toISOString() : "";
        const text = page ? page.blocks.map((block) => block.text).join("\n") : "";
        if (text.length >= 200) {
          return { url: page.url, title: page.title || pick.title, site: page.site || hostOf(page.url), published: page.published || dated, text, read: "page" };
        }
        // Many news sites keep readers like Brok out. Their headline and
        // summary from the news search still count, and the source says so.
        if (pick.snippet && pick.title) {
          return { url: pick.url, title: pick.title, site: hostOf(pick.url), published: dated, text: `${pick.title}. ${pick.snippet}`, read: "summary" };
        }
        return null;
      }),
    ),
  );
  // Keep the search engine's order: the best match first, news before web.
  const pages = read.filter(Boolean).slice(0, MAX_PAGES);
  return { question, pages };
}

export async function answerQuestion(body) {
  const { question, pages } = await gatherSources(body);
  if (!pages.length) throw fail(404, "Brok could not read any pages for this. Try the results below.");
  const token = await gatewayToken();
  if (!token) throw fail(503, "Grok is not set up here. Use your own key in Settings.");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ANSWER_PROMPT },
        { role: "user", content: answerInput(question, pages) },
      ],
    }),
    signal: AbortSignal.timeout(40000),
  }).catch(() => {
    throw fail(502, "Grok did not answer.");
  });
  if (!res.ok) throw fail(502, `Grok said ${res.status}.`);
  const data = await res.json().catch(() => ({}));
  const answer = readAnswer(data?.choices?.[0]?.message?.content, pages.length);
  if (!answer) throw fail(502, "Grok sent back something unreadable.");
  return {
    model: MODEL,
    promptVersion: ANSWER_VERSION,
    answer: answer.text,
    cited: answer.cited,
    sources: pages.map(({ url, title, site, published, read }) => ({ url, title, site, published, read })),
  };
}

// For your own model: the pages only, so the browser can ask the model itself.
export async function sourcesOnly(body) {
  const { question, pages } = await gatherSources(body);
  return { question, pages };
}
