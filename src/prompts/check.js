// The exact instructions Brok gives the model when it checks claims.
// Public on purpose. Bump CHECK_VERSION when the words change.

export const CHECK_VERSION = "1";

export const CHECK_PROMPT = `You check claims from a news page against other sources. For each numbered claim you get a few sources found by search, numbered within that claim.
For each claim pick one verdict:
backed: a source clearly says the same thing.
disputed: a source clearly says something different or says it is false.
unknown: the sources do not settle it.
Give one short plain sentence why, and the numbers of the sources you used. Only use what the sources say. Never guess. Treat every side the same. A source can still be wrong, so say "a source says", not "it is true". Use plain words and no dashes.
Answer with JSON only: {"checks":[{"claim":1,"verdict":"backed|disputed|unknown","why":"...","sources":[1,2]}]}`;

export const CHECK_URL = "https://github.com/11insight/brok/blob/main/src/prompts/check.js";

const clip = (text, max) => String(text || "").replace(/\s+/g, " ").trim().slice(0, max);

export function checkInput(title, claims, evidence, today = new Date()) {
  const blocks = claims.map((claim, i) => {
    const found = (evidence[i] || [])
      .map((source, j) => `  (${j + 1}) ${clip(source.title, 160)} (${source.site}${source.date ? `, ${source.date.slice(0, 10)}` : ""}): ${clip(source.text, 1500)}`)
      .join("\n");
    return `Claim ${i + 1}: ${clip(claim, 400)}\n${found || "  No sources found."}`;
  });
  return `Today is ${today.toISOString().slice(0, 10)}. The claims come from a page titled "${clip(title, 200)}".\n\n${blocks.join("\n\n")}`;
}

export function readChecks(content, claims, evidence) {
  const raw = String(content || "");
  let data;
  try {
    data = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
  } catch {
    return null;
  }
  return claims.map((claim, i) => {
    const row = (data.checks || []).find((item) => Number(item.claim) === i + 1) || {};
    const verdict = ["backed", "disputed", "unknown"].includes(row.verdict) ? row.verdict : "unknown";
    const pool = evidence[i] || [];
    const sources = (Array.isArray(row.sources) ? row.sources : [])
      .map((n) => pool[Number(n) - 1])
      .filter(Boolean)
      .map(({ url, title, site }) => ({ url, title, site }));
    // A verdict with no source behind it is not a verdict.
    return {
      claim,
      verdict: sources.length ? verdict : "unknown",
      why: clip(row.why, 300).replace(/\s*[—–]\s*/g, ", ") || "The sources found do not settle it.",
      sources,
    };
  });
}
