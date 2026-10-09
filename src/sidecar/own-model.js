import { CLAIM_PROMPT, PROMPT_VERSION, claimText, readClaims } from "../prompts/claims.js";

// Split with your own model. The call goes straight from this browser to the
// address you pick, so Brok's server never sees the page text or your key.
// Any service that speaks the OpenAI chat format works: xAI, or a model on
// your own computer through Ollama or LM Studio.

export const PRESETS = [
  { id: "xai", label: "xAI", endpoint: "https://api.x.ai/v1", model: "", needsKey: true },
  { id: "ollama", label: "Ollama", endpoint: "http://localhost:11434/v1", model: "llama3.2", needsKey: false },
  { id: "lmstudio", label: "LM Studio", endpoint: "http://localhost:1234/v1", model: "", needsKey: false },
];

const KEY = "brok.model";

function stores() {
  const out = [];
  try { out.push(sessionStorage); } catch { /* blocked */ }
  try { out.push(localStorage); } catch { /* blocked */ }
  return out;
}

// The key stays in this tab unless you ask Brok to remember it on this device.
export function readOwnModel() {
  for (const store of stores().reverse()) {
    try {
      const raw = store.getItem(KEY);
      if (raw) return { ...JSON.parse(raw), remember: store === stores()[1] };
    } catch {
      // Unreadable. Treat it as not set.
    }
  }
  return null;
}

export function saveOwnModel(config) {
  forgetOwnModel();
  const clean = {
    on: Boolean(config.on),
    endpoint: String(config.endpoint || "").trim().replace(/\/+$/, ""),
    model: String(config.model || "").trim(),
    key: String(config.key || "").trim(),
  };
  const [session, local] = stores();
  try {
    (config.remember ? local : session)?.setItem(KEY, JSON.stringify(clean));
  } catch {
    // Storage blocked. It still works until the tab closes.
  }
  memory = clean;
  return clean;
}

let memory = null;

export function currentOwnModel() {
  return memory || readOwnModel();
}

export function forgetOwnModel() {
  memory = null;
  for (const store of stores()) {
    try { store.removeItem(KEY); } catch { /* blocked */ }
  }
}

export function hostOf(endpoint) {
  try {
    return new URL(endpoint).host;
  } catch {
    return endpoint;
  }
}

function headers(config) {
  const out = { "content-type": "application/json" };
  if (config.key) out.authorization = `Bearer ${config.key}`;
  return out;
}

function reachError(config) {
  const local = /localhost|127\.0\.0\.1/.test(config.endpoint);
  return local
    ? "Could not reach your computer. Is the model running, and does it allow this site? See How to run it at home."
    : `Could not reach ${hostOf(config.endpoint)}.`;
}

// Lists the models the address offers, to fill the model box.
export async function listModels(config) {
  let res;
  try {
    res = await fetch(`${config.endpoint}/models`, { headers: headers(config), signal: AbortSignal.timeout(10000) });
  } catch {
    return { ok: false, error: reachError(config) };
  }
  if (res.status === 401 || res.status === 403) return { ok: false, error: "That key was not accepted." };
  if (!res.ok) return { ok: false, error: `${hostOf(config.endpoint)} said ${res.status}.` };
  const data = await res.json().catch(() => ({}));
  const models = (data.data || data.models || []).map((item) => item.id || item.name).filter(Boolean).sort();
  return { ok: true, models };
}

// Asks your model one question with a system prompt. Returns the reply text.
export async function askOwnModel(config, system, user, maxTokens = 2000) {
  const body = {
    model: config.model,
    temperature: 0,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  const call = (payload) =>
    fetch(`${config.endpoint}/chat/completions`, {
      method: "POST",
      headers: headers(config),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120000),
    });
  let res;
  try {
    res = await call(body);
    if (res.status === 400) {
      const { response_format: _skip, ...plain } = body;
      res = await call(plain);
    }
  } catch {
    return { ok: false, error: reachError(config) };
  }
  if (res.status === 401 || res.status === 403) return { ok: false, error: "That key was not accepted." };
  if (!res.ok) return { ok: false, error: `${hostOf(config.endpoint)} said ${res.status}.` };
  const data = await res.json().catch(() => ({}));
  return { ok: true, content: data?.choices?.[0]?.message?.content || "" };
}

export async function splitWithOwnModel(config, article) {
  const input = claimText(article.title, article.blocks);
  if (!input) return { status: "error", error: "No page text." };
  const body = {
    model: config.model,
    temperature: 0,
    max_tokens: 2000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: CLAIM_PROMPT },
      { role: "user", content: input },
    ],
  };
  const call = (payload) =>
    fetch(`${config.endpoint}/chat/completions`, {
      method: "POST",
      headers: headers(config),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120000),
    });
  let res;
  try {
    res = await call(body);
    // Some local servers do not know response_format. Ask once more without it.
    if (res.status === 400) {
      const { response_format: _skip, ...plain } = body;
      res = await call(plain);
    }
  } catch {
    return { status: "error", error: reachError(config) };
  }
  if (res.status === 401 || res.status === 403) return { status: "error", error: "That key was not accepted." };
  if (!res.ok) return { status: "error", error: `${hostOf(config.endpoint)} said ${res.status}.` };
  const data = await res.json().catch(() => ({}));
  const claims = readClaims(data?.choices?.[0]?.message?.content);
  if (!claims) return { status: "error", error: "The model sent back something unreadable." };
  return {
    status: "done",
    model: config.model,
    promptVersion: PROMPT_VERSION,
    label: `straight from your browser to ${hostOf(config.endpoint)}`,
    ...claims,
  };
}
