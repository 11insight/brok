import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function privateV4(ip) {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224
  );
}

function privateV6(ip) {
  const low = ip.toLowerCase();
  if (low === "::" || low === "::1") return true;
  if (low.startsWith("::ffff:")) return privateV4(low.slice(7));
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(low);
}

// A page address the reader may fetch: http or https, a public host.
export async function assertPublicUrl(raw) {
  let url;
  try {
    url = new URL(String(raw || ""));
  } catch {
    throw fail(400, "That is not a web address.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw fail(400, "That is not a web address.");
  if (url.username || url.password) throw fail(400, "That is not a web address.");
  if (url.port && url.port !== "80" && url.port !== "443") throw fail(400, "That port is not allowed.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true }).catch(() => []);
  if (!addresses.length) throw fail(404, "That site did not answer.");
  for (const { address, family } of addresses) {
    if (family === 4 ? privateV4(address) : privateV6(address)) throw fail(400, "That address is not public.");
  }
  return url;
}

const MAX_BYTES = 3 * 1024 * 1024;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";

// Follows redirects by hand so every hop is checked, and caps the size.
export async function fetchPage(raw) {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; hop < 5; hop += 1) {
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml", "accept-language": "en-US,en;q=0.8" },
      signal: AbortSignal.timeout(12000),
    }).catch(() => {
      throw fail(502, "That site did not answer.");
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = await assertPublicUrl(new URL(res.headers.get("location"), url).href);
      continue;
    }
    if (!res.ok) throw fail(502, `That site said ${res.status}.`);
    const type = res.headers.get("content-type") || "";
    if (!/html|xml/i.test(type)) throw fail(415, "That is not a web page.");
    const reader = res.body.getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        reader.cancel().catch(() => {});
        break;
      }
      chunks.push(value);
    }
    const charset = /charset=([^;]+)/i.exec(type)?.[1]?.trim() || "utf-8";
    let html;
    try {
      html = new TextDecoder(charset).decode(Buffer.concat(chunks));
    } catch {
      html = new TextDecoder("utf-8").decode(Buffer.concat(chunks));
    }
    return { url: url.href, html };
  }
  throw fail(502, "That page moved too many times.");
}

export function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(data));
}

export async function readBody(req, limit = 200000) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw fail(413, "Too much text.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw fail(400, "Bad request.");
  }
}
