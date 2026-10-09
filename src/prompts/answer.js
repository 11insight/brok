// The exact instructions Brok gives the model when it answers a search.
// Public on purpose, like the claim prompt. Bump ANSWER_VERSION when the
// words change.

export const ANSWER_VERSION = "1";

export const ANSWER_PROMPT = `You answer a search question using only the numbered pages given to you. Today's date is given.
Write 1 to 4 short sentences a fifth grader can read. Put the answer first.
After each fact, cite the page it came from like [1] or [2]. Only cite pages that say it. Never write "page 1" or "the pages"; let the marks do it.
If the pages do not answer the question, say so plainly and say what they do cover.
If pages disagree, say that and cite both. Say when something happened, using the page dates.
Never use facts that are not in the pages. Treat every side the same. Use plain words and no dashes.
Answer with JSON only: {"answer":"..."}`;

export const ANSWER_URL = "https://github.com/11insight/brok/blob/main/src/prompts/answer.js";

const clip = (text, max) => String(text || "").replace(/\s+/g, " ").trim().slice(0, max);

// What the model reads: the question, the date, then each page, capped.
export function answerInput(question, pages, today = new Date()) {
  const body = pages
    .map((page, i) => `[${i + 1}] ${clip(page.title, 200)} (${page.site || ""}${page.published ? `, ${page.published.slice(0, 10)}` : ""})\n${clip(page.text, 5000)}`)
    .join("\n\n");
  return `Today is ${today.toISOString().slice(0, 10)}.\nQuestion: ${clip(question, 300)}\n\n${body}`;
}

// Reads the answer and keeps only citations to pages that exist.
export function readAnswer(content, pageCount) {
  const raw = String(content || "");
  let text = "";
  try {
    text = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)).answer || "";
  } catch {
    text = raw;
  }
  text = clip(text, 1200).replace(/\s*[—–]\s*/g, ", ");
  if (!text) return null;
  const cited = [...new Set([...text.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])).filter((n) => n >= 1 && n <= pageCount))];
  return { text: text.replace(/\[(\d+)\]/g, (m, n) => (Number(n) >= 1 && Number(n) <= pageCount ? m : "")), cited };
}
