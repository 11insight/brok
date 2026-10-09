import { fail } from "./net.js";

// Sign in with X (OAuth 2.0 with PKCE) and posts that link to a page.
// X does not let a browser call it directly, so these routes pass requests
// through. Brok's server keeps nothing: tokens go back to your tab, and each
// call carries the token it needs.

const API = "https://api.x.com/2";
const REDIRECT_PATH = "/auth/x/callback";
const ORIGINS = ["https://brok-olive.vercel.app", "http://127.0.0.1:5190", "http://localhost:5190"]
  .concat((process.env.BROK_ORIGINS || "").split(",").map((origin) => origin.trim()).filter(Boolean));

export function xClientId() {
  return process.env.X_CLIENT_ID || "";
}

function clientHeaders() {
  const headers = { "content-type": "application/x-www-form-urlencoded" };
  if (process.env.X_CLIENT_SECRET) {
    const basic = Buffer.from(`${xClientId()}:${process.env.X_CLIENT_SECRET}`).toString("base64");
    headers.authorization = `Basic ${basic}`;
  }
  return headers;
}

function needClient() {
  if (!xClientId()) throw fail(503, "Sign in with X is not set up yet.");
}

function xError(status) {
  if (status === 401) return fail(401, "Sign in to X again.");
  if (status === 402 || status === 403) return fail(402, "X has not turned on post search for Brok yet.");
  if (status === 429) return fail(429, "X says to slow down. Try again in a few minutes.");
  return fail(502, `X said ${status}.`);
}

// Trades the one time code, or a refresh token, for tokens that go back to the tab.
export async function xToken(body) {
  needClient();
  const params = new URLSearchParams({ client_id: xClientId() });
  if (body?.refreshToken) {
    params.set("grant_type", "refresh_token");
    params.set("refresh_token", String(body.refreshToken));
  } else {
    const redirect = String(body?.redirectUri || "");
    if (!ORIGINS.some((origin) => redirect === origin + REDIRECT_PATH)) throw fail(400, "That return address is not allowed.");
    params.set("grant_type", "authorization_code");
    params.set("code", String(body?.code || ""));
    params.set("redirect_uri", redirect);
    params.set("code_verifier", String(body?.verifier || ""));
  }
  const res = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: clientHeaders(),
    body: params,
    signal: AbortSignal.timeout(10000),
  }).catch(() => {
    throw fail(502, "X did not answer.");
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw fail(401, "X did not sign you in. Try again.");
  return { accessToken: data.access_token, refreshToken: data.refresh_token || "", expiresIn: data.expires_in || 7200 };
}

export async function xRevoke(body) {
  if (!xClientId() || !body?.token) return { ok: true };
  await fetch(`${API}/oauth2/revoke`, {
    method: "POST",
    headers: clientHeaders(),
    body: new URLSearchParams({ token: String(body.token), token_type_hint: "access_token", client_id: xClientId() }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  return { ok: true };
}

async function xGet(path, token) {
  if (!token) throw fail(401, "Sign in to X first.");
  const res = await fetch(`${API}${path}`, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  }).catch(() => {
    throw fail(502, "X did not answer.");
  });
  if (!res.ok) throw xError(res.status);
  return res.json();
}

export async function xMe(body) {
  const data = await xGet("/users/me?user.fields=name,username", String(body?.token || ""));
  return { name: data?.data?.name || "", username: data?.data?.username || "" };
}

// Posts from the last week that link to this page, newest first. Likes do not
// change the order.
export async function xPosts(body) {
  let url;
  try {
    url = new URL(String(body?.url || ""));
  } catch {
    throw fail(400, "No page address.");
  }
  const target = `${url.host}${url.pathname}`.replace(/\/$/, "").replace(/"/g, "");
  const query = `url:"${target}" -is:retweet`;
  if (query.length > 512) throw fail(400, "That address is too long for X search.");
  const params = new URLSearchParams({
    query,
    max_results: "20",
    "tweet.fields": "created_at,author_id,note_tweet",
    expansions: "author_id",
    "user.fields": "name,username",
  });
  const data = await xGet(`/tweets/search/recent?${params}`, String(body?.token || ""));
  const people = new Map((data?.includes?.users || []).map((user) => [user.id, user]));
  const posts = (data?.data || [])
    .map((post) => {
      const person = people.get(post.author_id) || {};
      return {
        id: post.id,
        text: post.note_tweet?.text || post.text || "",
        time: post.created_at || "",
        name: person.name || "",
        username: person.username || "",
      };
    })
    .sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
  return { posts };
}
