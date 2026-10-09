// The exact instructions Brok gives the model when you split a page.
// Public on purpose: anyone can read how Brok sorts claims and check it for
// bias. Change PROMPT_VERSION whenever the words change, so every split can
// say which version made it.

export const PROMPT_VERSION = "1";

export const CLAIM_PROMPT = `You sort the claims in a news page into three lists.
fact: a checkable statement that the page backs with a named source, record or document. Give the source as the page names it.
opinion: a view, judgment, prediction or value statement. Give who holds it as the page names them.
notFact: a checkable statement the page does not back with a source. This does not mean it is false.
Only full sentences that state something. Skip headings, product names and captions. Quote or closely restate the page. Never add facts the page does not contain. Treat every side the same. Use plain words and no dashes.
Answer with JSON only: {"fact":[{"text":"","source":""}],"opinion":[{"speaker":"","text":""}],"notFact":[{"text":""}]}. At most 8 items per list.`;

export const PROMPT_URL = "https://github.com/11insight/brok/blob/main/src/prompts/claims.js";

const str = (value, max = 600) =>
  String(value || "").replace(/\s*[—–]\s*/g, ", ").replace(/\s+/g, " ").trim().slice(0, max);

const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// What the model reads: the title, then the page text, capped.
export function claimText(title, blocks) {
  const text = (Array.isArray(blocks) ? blocks : [])
    .map((block) => str(block?.text, 2000))
    .filter(Boolean)
    .join("\n")
    .slice(0, 24000);
  return text ? `Title: ${str(title, 300)}\n\n${text}` : "";
}

// Reads the model's answer the same way wherever it ran. Null if unreadable.
export function readClaims(content) {
  const raw = String(content || "");
  let data;
  try {
    data = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
  } catch {
    return null;
  }
  const list = (value) => (Array.isArray(value) ? value.slice(0, 8) : []);
  const facts = list(data.fact).map((item) => ({ text: str(item?.text), source: str(item?.source, 160) })).filter((item) => item.text);
  // A fact needs a named source. Without one it is not fact, whatever the model said.
  return {
    fact: facts.filter((item) => item.source),
    opinion: list(data.opinion).map((item) => ({ speaker: cap(str(item?.speaker, 120)), text: str(item?.text) })).filter((item) => item.text),
    notFact: [
      ...list(data.notFact).map((item) => ({ text: str(item?.text) })).filter((item) => item.text),
      ...facts.filter((item) => !item.source).map(({ text }) => ({ text })),
    ],
  };
}
