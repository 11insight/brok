import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { fetchPage } from "./net.js";

// Known trackers by domain suffix. A third party not on this list is still
// stopped; it is logged as "Third party" so the count stays honest.
const TRACKERS = [
  ["doubleclick.net", "Ad exchange", "high"],
  ["googlesyndication.com", "Ad exchange", "high"],
  ["googleadservices.com", "Ad exchange", "high"],
  ["adnxs.com", "Ad exchange", "high"],
  ["amazon-adsystem.com", "Ad exchange", "high"],
  ["rubiconproject.com", "Ad exchange", "high"],
  ["pubmatic.com", "Ad exchange", "high"],
  ["openx.net", "Ad exchange", "high"],
  ["criteo.com", "Ad exchange", "high"],
  ["criteo.net", "Ad exchange", "high"],
  ["taboola.com", "Ad exchange", "high"],
  ["outbrain.com", "Ad exchange", "high"],
  ["casalemedia.com", "Ad exchange", "high"],
  ["moatads.com", "Ad exchange", "high"],
  ["doubleverify.com", "Ad exchange", "high"],
  ["googletagservices.com", "Ad exchange", "high"],
  ["2mdn.net", "Ad exchange", "high"],
  ["sharethrough.com", "Ad exchange", "high"],
  ["33across.com", "Ad exchange", "high"],
  ["indexww.com", "Ad exchange", "high"],
  ["adsrvr.org", "Ad exchange", "high"],
  ["facebook.net", "Pixel", "high"],
  ["connect.facebook.net", "Pixel", "high"],
  ["analytics.tiktok.com", "Pixel", "high"],
  ["ads-twitter.com", "Pixel", "high"],
  ["static.ads-twitter.com", "Pixel", "high"],
  ["snap.licdn.com", "Pixel", "high"],
  ["bat.bing.com", "Pixel", "high"],
  ["quantserve.com", "Pixel", "high"],
  ["scorecardresearch.com", "Pixel", "high"],
  ["hotjar.com", "Session replay", "high"],
  ["fullstory.com", "Session replay", "high"],
  ["clarity.ms", "Session replay", "high"],
  ["mouseflow.com", "Session replay", "high"],
  ["logrocket.com", "Session replay", "high"],
  ["google-analytics.com", "Analytics", "medium"],
  ["googletagmanager.com", "Analytics", "medium"],
  ["segment.com", "Analytics", "medium"],
  ["segment.io", "Analytics", "medium"],
  ["chartbeat.com", "Analytics", "medium"],
  ["chartbeat.net", "Analytics", "medium"],
  ["parsely.com", "Analytics", "medium"],
  ["newrelic.com", "Analytics", "medium"],
  ["nr-data.net", "Analytics", "medium"],
  ["mixpanel.com", "Analytics", "medium"],
  ["amplitude.com", "Analytics", "medium"],
  ["permutive.com", "Analytics", "medium"],
  ["skimresources.com", "Affiliate click", "medium"],
  ["viglink.com", "Affiliate click", "medium"],
  ["onetrust.com", "Consent popup", "low"],
  ["cookielaw.org", "Consent popup", "low"],
  ["cookiebot.com", "Consent popup", "low"],
  ["disqus.com", "Comments", "low"],
];

function siteOf(host) {
  const parts = host.split(".");
  return parts.slice(-2).join(".");
}

function classify(host) {
  for (const [suffix, kind, klass] of TRACKERS) {
    if (host === suffix || host.endsWith(`.${suffix}`)) return { kind, klass };
  }
  return { kind: "Third party", klass: "low" };
}

// Everything outside the page's own site that the page asked a browser to load.
function thirdParties(document, pageUrl) {
  const home = siteOf(pageUrl.hostname);
  const seen = new Map();
  const add = (raw, tag) => {
    if (!raw) return;
    let host;
    try {
      host = new URL(raw, pageUrl).hostname;
    } catch {
      return;
    }
    if (!host || siteOf(host) === home || seen.has(host)) return;
    seen.set(host, { host, tag, ...classify(host) });
  };
  document.querySelectorAll("script[src]").forEach((n) => add(n.getAttribute("src"), "script"));
  document.querySelectorAll("iframe[src]").forEach((n) => add(n.getAttribute("src"), "frame"));
  document.querySelectorAll("img[src]").forEach((n) => {
    const w = n.getAttribute("width");
    const h = n.getAttribute("height");
    if (w === "1" || h === "1" || w === "0" || h === "0") add(n.getAttribute("src"), "pixel");
  });
  document.querySelectorAll('link[rel~="preconnect"],link[rel~="dns-prefetch"]').forEach((n) => add(n.getAttribute("href"), "link"));
  // Inline loaders name their hosts in the script text.
  document.querySelectorAll("script:not([src])").forEach((n) => {
    const text = n.textContent || "";
    for (const [suffix] of TRACKERS) {
      if (!text.includes(suffix) || [...seen.keys()].some((h) => h === suffix || h.endsWith(`.${suffix}`))) continue;
      add(`https://${suffix}/`, "inline");
    }
  });
  return [...seen.values()]
    .filter((row) => row.kind !== "Third party" || row.tag !== "link")
    .sort((a, b) => "high medium low".indexOf(a.klass) - "high medium low".indexOf(b.klass));
}

function meta(document, ...names) {
  for (const name of names) {
    const node = document.querySelector(`meta[property="${name}"],meta[name="${name}"],meta[itemprop="${name}"]`);
    const value = node?.getAttribute("content")?.trim();
    if (value) return value;
  }
  return "";
}

const clean = (text) => String(text || "").replace(/\s+/g, " ").trim();

function blocksFrom(html) {
  const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`);
  const blocks = [];
  document.querySelectorAll("h2, h3, h4, p, blockquote, li, pre").forEach((node) => {
    if (node.closest("blockquote") && node.tagName !== "BLOCKQUOTE") return;
    if (node.tagName === "P" && node.closest("li")) return;
    const text = clean(node.textContent);
    if (!text) return;
    const tag = node.tagName.toLowerCase();
    if (tag.startsWith("h")) blocks.push({ type: "h", text });
    else if (tag === "blockquote") blocks.push({ type: "quote", text });
    else if (tag === "li") blocks.push({ type: "li", text });
    else if (text.length > 1) blocks.push({ type: "p", text });
  });
  return blocks;
}

export async function readPage(raw) {
  const { url, html } = await fetchPage(raw);
  const pageUrl = new URL(url);
  const { document } = parseHTML(html);
  const blocked = thirdParties(document, pageUrl);
  const published = meta(document, "article:published_time", "datePublished", "pubdate", "date", "parsely-pub-date") ||
    document.querySelector("time[datetime]")?.getAttribute("datetime") || "";
  const site = meta(document, "og:site_name", "application-name") || pageUrl.hostname.replace(/^www\./, "");
  const parsed = new Readability(document, { charThreshold: 200 }).parse();
  const blocks = parsed?.content ? blocksFrom(parsed.content) : [];
  const title = clean(parsed?.title || meta(document, "og:title") || document.title || pageUrl.hostname);
  return {
    url,
    site,
    title,
    byline: clean(parsed?.byline || meta(document, "author")),
    published: Number.isNaN(Date.parse(published)) ? "" : new Date(published).toISOString(),
    blocks: blocks.slice(0, 400),
    blocked,
  };
}
