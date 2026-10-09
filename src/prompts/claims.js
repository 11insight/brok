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
