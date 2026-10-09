// Sign in with X. The sign-in lives in this tab only (sessionStorage) and is
// gone when the tab closes. Brok's server passes calls to X and keeps nothing.

const SESSION = "brok.x";
const PENDING = "brok.x.pending";
const CALLBACK = "/auth/x/callback";
const SCOPES = "tweet.read users.read offline.access";

function read(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value == null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked. The sign-in lasts until this page reloads.
  }
}

async function post(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || "X failed.");
    error.status = res.status;
    throw error;
  }
  return data;
}

function randomString(bytes = 48) {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...raw)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function challengeFor(verifier) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function xSession() {
  return read(SESSION);
}

export function isXCallback() {
  return location.pathname === CALLBACK;
}

export async function startXSignIn(clientId) {
  const verifier = randomString();
  const state = randomString(24);
  write(PENDING, { verifier, state, back: location.pathname + location.hash });
  const url = new URL("https://x.com/i/oauth2/authorize");
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: location.origin + CALLBACK,
    scope: SCOPES,
    state,
    code_challenge: await challengeFor(verifier),
    code_challenge_method: "S256",
  }).toString();
  location.assign(url.href);
}

// Back from X. Wipes the code from the address bar first, then trades it.
export async function finishXSignIn() {
  const params = new URLSearchParams(location.search);
  const pending = read(PENDING);
  write(PENDING, null);
  const back = pending?.back || "/";
  history.replaceState(null, "", back);
  if (params.get("error")) return { ok: false, error: "You did not sign in to X." };
  if (!pending || params.get("state") !== pending.state || !params.get("code")) {
    return { ok: false, error: "That X sign in did not match. Try again." };
  }
  try {
    const tokens = await post("/api/x/token", {
      code: params.get("code"),
      verifier: pending.verifier,
      redirectUri: location.origin + CALLBACK,
    });
    const session = { ...tokens, expiresAt: Date.now() + tokens.expiresIn * 1000 };
    write(SESSION, session);
    const me = await post("/api/x/me", { token: session.accessToken });
    write(SESSION, { ...session, username: me.username, name: me.name });
    return { ok: true, username: me.username };
  } catch (error) {
    write(SESSION, null);
    return { ok: false, error: error.message };
  }
}

async function freshToken() {
  const session = xSession();
  if (!session) return "";
  if (Date.now() < session.expiresAt - 60000 || !session.refreshToken) return session.accessToken;
  try {
    const tokens = await post("/api/x/token", { refreshToken: session.refreshToken });
    const next = { ...session, ...tokens, expiresAt: Date.now() + tokens.expiresIn * 1000 };
    write(SESSION, next);
    return next.accessToken;
  } catch {
    write(SESSION, null);
    return "";
  }
}

export async function xPostsFor(url) {
  const token = await freshToken();
  if (!token) return { status: "error", error: "Sign in to X again." };
  try {
    const data = await post("/api/x/posts", { token, url });
    return { status: "done", items: data.posts || [] };
  } catch (error) {
    if (error.status === 401) write(SESSION, null);
    return { status: "error", error: error.message };
  }
}

export async function signOutX() {
  const session = xSession();
  write(SESSION, null);
  if (session?.accessToken) await post("/api/x/revoke", { token: session.accessToken }).catch(() => null);
}
