const ENDPOINT = "https://html.duckduckgo.com/html/";
const LIMIT = 8;

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function decode(value) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanUrl(href) {
  try {
    const url = new URL(href, "https://duckduckgo.com");
    const wrapped = url.searchParams.get("uddg");
    const target = wrapped ? new URL(wrapped) : url;
    if (target.protocol !== "https:" && target.protocol !== "http:") return "";
    if (target.hostname.endsWith("duckduckgo.com")) return "";
    return target.href;
  } catch {
    return "";
  }
}

function parseResults(html) {
  const results = [];
  const seen = new Set();
  const pattern = /<a rel="nofollow" class="result__a" href="([^"]+)">([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  for (const match of html.matchAll(pattern)) {
    const url = cleanUrl(decode(match[1]));
    const title = decode(match[2]);
    const snippet = decode(match[3]);
    if (!url || !title || seen.has(url)) continue;
    seen.add(url);
    results.push({ title, url, snippet });
    if (results.length >= LIMIT) break;
  }
  return results;
}

export async function searchWeb(raw) {
  const query = String(raw || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 240);
  if (!query) throw fail(400, "Type a search.");
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "text/html",
      "user-agent": "Mozilla/5.0",
    },
    body: `q=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(8000),
    redirect: "follow",
  });
  if (!response.ok) throw fail(502, "Search failed.");
  const html = await response.text();
  if (!html.includes("result__a")) throw fail(502, "Search failed.");
  return { query, source: "duckduckgo.com", results: parseResults(html) };
}
