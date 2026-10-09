import { getVercelOidcToken } from "@vercel/oidc";
import { fail } from "./net.js";

// One way to ask Brok's Grok, through Vercel AI Gateway. On Vercel the
// deployment's OIDC token signs the call; locally AI_GATEWAY_API_KEY does.
const GATEWAY = "https://ai-gateway.vercel.sh/v1/chat/completions";
export const MODEL = process.env.BROK_SPLIT_MODEL || "spacexai/grok-4.1-fast-non-reasoning";

async function gatewayToken() {
  if (process.env.AI_GATEWAY_API_KEY) return process.env.AI_GATEWAY_API_KEY;
  try {
    return await getVercelOidcToken();
  } catch {
    return null;
  }
}

export async function askGrok(system, user, maxTokens = 1500, timeoutMs = 45000) {
  const token = await gatewayToken();
  if (!token) throw fail(503, "Grok is not set up here. Use your own key in Settings.");
  // Grok can say 429 (too many at once) for a moment. Wait and try twice more.
  let res;
  for (const wait of [0, 1500, 4000]) {
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    res = await call(token, system, user, maxTokens, timeoutMs);
    if (res.status !== 429) break;
  }
  if (res.status === 429) throw fail(429, "Grok is busy right now. Try again in a minute.");
  if (!res.ok) throw fail(502, `Grok said ${res.status}.`);
  const data = await res.json().catch(() => ({}));
  return data?.choices?.[0]?.message?.content || "";
}

function call(token, system, user, maxTokens, timeoutMs) {
  return fetch(GATEWAY, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  }).catch(() => {
    throw fail(502, "Grok did not answer.");
  });
}
