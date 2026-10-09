// Brok reads a page only if the site's robots.txt allows it. Rules are kept
// for an hour per site.
import { AGENT_TOKEN } from "./net.js";

const cache = new Map();
const HOUR = 60 * 60 * 1000;

function parse(text) {
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const match = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!match) continue;
    const field = match[1].toLowerCase();
    const value = match[2].trim();
    if (field === "user-agent") {
      if (!lastWasAgent || !current) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (current && (field === "allow" || field === "disallow")) current.rules.push({ allow: field === "allow", path: value });
    }
  }
  const mine = groups.filter((group) => group.agents.some((agent) => agent !== "*" && AGENT_TOKEN.toLowerCase().includes(agent)));
  const chosen = mine.length ? mine : groups.filter((group) => group.agents.includes("*"));
  return chosen.flatMap((group) => group.rules);
}

function toRegex(path) {
  const anchored = path.endsWith("$");
  const body = (anchored ? path.slice(0, -1) : path).replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}

// Longest matching rule wins; a tie goes to Allow. No rules means allowed.
export function allowed(rules, pathAndQuery) {
  let best = null;
  for (const rule of rules) {
    if (!rule.path) continue;
    if (!toRegex(rule.path).test(pathAndQuery)) continue;
    if (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.allow)) best = rule;
  }
  return !best || best.allow;
}

export async function robotsAllow(url, fetchText) {
  const key = url.origin;
  let entry = cache.get(key);
  if (!entry || Date.now() - entry.at > HOUR) {
    let rules = [];
    try {
      const text = await fetchText(new URL("/robots.txt", url).href);
      rules = text == null ? [] : parse(text);
    } catch {
      rules = [];
    }
    entry = { at: Date.now(), rules };
    cache.set(key, entry);
  }
  return allowed(entry.rules, url.pathname + url.search);
}
