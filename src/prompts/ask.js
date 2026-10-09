// The exact instructions Brok gives the model when you ask about a page.
// Public on purpose. Bump ASK_VERSION when the words change.

export const ASK_VERSION = "1";

export const ASK_PROMPT = `You answer questions about one web page, using only that page. The page text is given, then the talk so far, then the new question.
Write 1 to 4 short sentences a fifth grader can read. Answer first.
Back each point with a short exact quote from the page, copied word for word, 3 to 20 words long.
If the page does not say, answer "The page does not say." and say what it does cover.
Never add facts that are not on the page. Treat every side the same. Use plain words and no dashes.
Answer with JSON only: {"answer":"...","quotes":["exact words from the page"]}`;

export const ASK_URL = "https://github.com/11insight/brok/blob/main/src/prompts/ask.js";

const clip = (text, max) => String(text || "").replace(/\s+/g, " ").trim().slice(0, max);

export function askInput(article, history, question) {
  const page = article.blocks.map((block) => clip(block.text, 2000)).join("\n").slice(0, 24000);
  const talk = (history || [])
    .slice(-6)
    .map((turn) => `Q: ${clip(turn.q, 300)}\nA: ${clip(turn.a, 600)}`)
    .join("\n");
  return `Page: ${clip(article.title, 200)}\n\n${page}\n\n${talk ? `Talk so far:\n${talk}\n\n` : ""}Question: ${clip(question, 400)}`;
}

// Keeps only quotes that really are on the page, so a quote can never be invented.
export function readAsk(content, article) {
  const raw = String(content || "");
  let data;
  try {
    data = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
  } catch {
    return null;
  }
  const answer = clip(data.answer, 1200).replace(/\s*[—–]\s*/g, ", ");
  if (!answer) return null;
  const pageText = article.blocks.map((block) => block.text).join("\n").replace(/\s+/g, " ").toLowerCase();
  const quotes = (Array.isArray(data.quotes) ? data.quotes : [])
    .map((quote) => clip(quote, 300).replace(/^["“]|["”]$/g, ""))
    .filter((quote) => quote.length > 8 && pageText.includes(quote.toLowerCase()))
    .slice(0, 4);
  return { answer, quotes };
}
