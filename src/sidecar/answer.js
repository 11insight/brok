import { ANSWER_PROMPT, ANSWER_VERSION, answerInput, readAnswer } from "../prompts/answer.js";
import { askOwnModel, currentOwnModel, hostOf } from "./own-model.js";

async function post(path, body) {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

// A quick answer with sources. With your own model, Brok's server only reads
// the pages; the question and page text go from this browser to your model.
export async function getAnswer(question, urls) {
  const own = currentOwnModel();
  if (own?.on && own.endpoint && own.model) {
    const { ok, data } = await post("/api/sources", { q: question, urls });
    if (!ok) return { status: "error", error: data.error || "Brok could not read the pages." };
    if (!data.pages?.length) return { status: "error", error: "Brok could not read any pages for this." };
    const reply = await askOwnModel(own, ANSWER_PROMPT, answerInput(question, data.pages), 600);
    if (!reply.ok) return { status: "error", error: reply.error };
    const answer = readAnswer(reply.content, data.pages.length);
    if (!answer) return { status: "error", error: "The model sent back something unreadable." };
    return {
      status: "done",
      model: own.model,
      promptVersion: ANSWER_VERSION,
      answer: answer.text,
      cited: answer.cited,
      sources: data.pages.map(({ url, title, site, published, read }) => ({ url, title, site, published, read })),
      sentTo: `${hostOf(own.endpoint)}, straight from your browser`,
    };
  }
  const { ok, data } = await post("/api/answer", { q: question, urls });
  if (!ok) return { status: "error", error: data.error || "The answer failed." };
  return { status: "done", ...data };
}
