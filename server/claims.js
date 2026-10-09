import { getVercelOidcToken } from "@vercel/oidc";
import { CLAIM_PROMPT, PROMPT_VERSION, claimText, readClaims } from "../src/prompts/claims.js";
import { fail } from "./net.js";

// Grok through Vercel AI Gateway: on Vercel the deployment's OIDC token signs
// the call, on a laptop AI_GATEWAY_API_KEY does. No xAI key lives here.
const GATEWAY = "https://ai-gateway.vercel.sh/v1/chat/completions";
const MODEL = process.env.BROK_SPLIT_MODEL || "spacexai/grok-4.1-fast-non-reasoning";

async function gatewayToken() {
  if (process.env.AI_GATEWAY_API_KEY) return process.env.AI_GATEWAY_API_KEY;
  try {
    return await getVercelOidcToken();
  } catch {
    return null;
  }
}

export async function splitClaims(body) {
  const input = claimText(body?.title, body?.blocks);
  if (!input) throw fail(400, "No page text.");
  const token = await gatewayToken();
  if (!token) throw fail(503, "Grok is not set up here. Use your own key in Settings.");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: CLAIM_PROMPT },
        { role: "user", content: input },
      ],
    }),
    signal: AbortSignal.timeout(45000),
  }).catch(() => {
    throw fail(502, "Grok did not answer.");
  });
  if (!res.ok) throw fail(502, `Grok said ${res.status}.`);
  const data = await res.json().catch(() => ({}));
  const claims = readClaims(data?.choices?.[0]?.message?.content);
  if (!claims) throw fail(502, "Grok sent back something unreadable.");
  return { model: MODEL, promptVersion: PROMPT_VERSION, ...claims };
}
