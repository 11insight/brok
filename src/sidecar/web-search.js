const ENDPOINT = "https://www.bing.com/search";
const LIMIT = 8;

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function decode(value) {
  return value
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
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
    const target = new URL(href);
    if (target.protocol !== "https:" && target.protocol !== "http:") return "";
    if (target.hostname === "bing.com" || target.hostname.endsWith(".bing.com")) return "";
    return target.href;
  } catch {
    return "";
  }
}

function tag(block, name) {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return match ? match[1].trim() : "";
}

function parseRss(xml) {
  const results = [];
  const seen = new Set();
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = match[1];
    const url = cleanUrl(decode(tag(block, "link")));
    const title = decode(tag(block, "title"));
    const snippet = decode(tag(block, "description"));
    if (!url || !title || seen.has(url)) continue;
    seen.add(url);
    results.push({ title, url, snippet });
    if (results.length >= LIMIT) break;
  }
  return results;
}

export async function searchWeb(raw) {
  const query = String(raw || "")
    .replace(/[\u0000-\u001f]/g, " ")
    .trim()
    .slice(0, 240);
  if (!query) throw fail(400, "Type a search.");
  const url = new URL(ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "rss");
  url.searchParams.set("count", String(LIMIT));
  const response = await fetch(url, {
    headers: {
      accept: "application/rss+xml, application/xml, text/xml",
      "user-agent": "Mozilla/5.0",
    },
    signal: AbortSignal.timeout(8000),
    redirect: "follow",
  });
  if (!response.ok) throw fail(502, "Search failed.");
  const xml = await response.text();
  if (!xml.includes("<item>")) throw fail(502, "Search failed.");
  const results = parseRss(xml);
  if (!results.length) throw fail(502, "Search failed.");
  return { query, source: "bing.com", results };
}
