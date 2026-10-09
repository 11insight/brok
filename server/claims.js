import { CLAIM_PROMPT, PROMPT_VERSION, claimText, readClaims } from "../src/prompts/claims.js";
import { MODEL, askGrok } from "./grok.js";
import { fail } from "./net.js";

export async function splitClaims(body) {
  const input = claimText(body?.title, body?.blocks);
  if (!input) throw fail(400, "No page text.");
  const content = await askGrok(CLAIM_PROMPT, input, 2000);
  const claims = readClaims(content);
  if (!claims) throw fail(502, "Grok sent back something unreadable.");
  return { model: MODEL, promptVersion: PROMPT_VERSION, ...claims };
}
