import { getVercelOidcToken } from "@vercel/oidc";
import { fail } from "./net.js";

// Grok through Vercel AI Gateway: on Vercel the deployment's OIDC token signs
// the call, on a laptop AI_GATEWAY_API_KEY does. No xAI key lives here.
const GATEWAY = "https://ai-gateway.vercel.sh/v1/chat/completions";
const MODEL = process.env.BROK_SPLIT_MODEL || "spacexai/grok-4.1-fast-non-reasoning";

// The repo is public. The tuned prompt lives in BROK_CLAIM_PROMPT; this plain
// default only keeps the route working without it.
const DEFAULT_PROMPT = `You sort the claims in a news page into three lists.
fact: a checkable statement that the page backs with a named source, record or document. Give the source as the page names it.
opinion: a view, judgment, prediction or value statement. Give who holds it as the page names them.
notFact: a checkable statement the page does not back with a source. This does not mean it is false.
Only full sentences that state something. Skip headings, product names and captions. Quote or closely restate the page. Never add facts the page does not contain. Treat every side the same. Use plain words and no dashes.
Answer with JSON only: {"fact":[{"text":"","source":""}],"opinion":[{"speaker":"","text":""}],"notFact":[{"text":""}]}. At most 8 items per list.`;

async function gatewayToken() {
  if (process.env.AI_GATEWAY_API_KEY) return process.env.AI_GATEWAY_API_KEY;
  try {
    return await getVercelOidcToken();
  } catch {
    return null;
  }
}

const str = (value, max = 600) => String(value || "").replace(/\s*[—–]\s*/g, ", ").replace(/\s+/g, " ").trim().slice(0, max);

const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);

function shape(raw) {
  const list = (value) => (Array.isArray(value) ? value.slice(0, 8) : []);
  const facts = list(raw.fact).map((item) => ({ text: str(item.text), source: str(item.source, 160) })).filter((item) => item.text);
  // A fact needs a named source. Without one it is not fact, whatever the model said.
  return {
    fact: facts.filter((item) => item.source),
    opinion: list(raw.opinion).map((item) => ({ speaker: cap(str(item.speaker, 120)), text: str(item.text) })).filter((item) => item.text),
    notFact: [
      ...list(raw.notFact).map((item) => ({ text: str(item.text) })).filter((item) => item.text),
      ...facts.filter((item) => !item.source).map(({ text }) => ({ text })),
    ],
  };
}

export async function splitClaims(body) {
  const title = str(body?.title, 300);
  const text = (Array.isArray(body?.blocks) ? body.blocks : [])
    .map((block) => str(block?.text, 2000))
    .filter(Boolean)
    .join("\n")
    .slice(0, 24000);
  if (!text) throw fail(400, "No page text.");
  const token = await gatewayToken();
  if (!token) throw fail(503, "Grok is not set up here.");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: process.env.BROK_CLAIM_PROMPT || DEFAULT_PROMPT },
        { role: "user", content: `Title: ${title}\n\n${text}` },
      ],
    }),
    signal: AbortSignal.timeout(45000),
  }).catch(() => {
    throw fail(502, "Grok did not answer.");
  });
  if (!res.ok) throw fail(502, `Grok said ${res.status}.`);
  const data = await res.json().catch(() => ({}));
  const content = data?.choices?.[0]?.message?.content || "";
  const json = content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1);
  try {
    return { model: MODEL, ...shape(JSON.parse(json)) };
  } catch {
    throw fail(502, "Grok sent back something unreadable.");
  }
}
