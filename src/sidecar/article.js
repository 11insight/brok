const pane = (label, note) => ({ label, note, items: [] });

function panes() {
  return {
    fact: pane("Verified fact", "Backed by a source the page names. A source can still be wrong."),
    opinion: pane("Opinion", "Equal weight. No side score."),
    notFact: pane("Not fact", "No source on the page. Not marked false."),
  };
}

export function emptyArticle(url = "", status = "idle", error = "") {
  return {
    id: url,
    url,
    source: "",
    title: "",
    byline: "",
    published: "",
    publishedLabel: "",
    blocks: [],
    blocked: [],
    panes: panes(),
    split: { status: "idle" },
    status,
    error,
  };
}

function dateLabel(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// The server fetches the page, keeps the text and drops everything else.
export async function loadArticle(url) {
  let response;
  try {
    response = await fetch("/api/read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ u: url }),
    });
  } catch {
    return emptyArticle(url, "error", "BROK could not reach that page.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return emptyArticle(url, "error", data.error || "That page could not be read.");
  return {
    ...emptyArticle(data.url, "done"),
    id: data.url,
    source: data.site,
    title: data.title,
    byline: data.byline,
    published: data.published,
    publishedLabel: dateLabel(data.published),
    blocks: data.blocks || [],
    blocked: data.blocked || [],
  };
}

// Sends the page text to Grok. Only called after the person allows it.
export async function splitArticle(article) {
  try {
    const response = await fetch("/api/split", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: article.title, blocks: article.blocks }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { status: "error", error: data.error || "The split failed." };
    return { status: "done", model: data.model, fact: data.fact, opinion: data.opinion, notFact: data.notFact };
  } catch {
    return { status: "error", error: "Grok did not answer." };
  }
}
