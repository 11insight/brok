import { claimLabels, railBlocks } from "../fixtures/cites.js";
import { againstPage, formatWhen } from "./format.js";
import { blockedListHtml, blockedSummary } from "./blocked.js";
import { esc, externalLink } from "./dom.js";
import { PROMPT_URL } from "../prompts/claims.js";
import { CHECK_URL } from "../prompts/check.js";
import { currentOwnModel, hostOf } from "../sidecar/own-model.js";

function hasPage(article) {
  return Boolean(article?.title || article?.blocks?.length);
}

function emptyHtml(article) {
  if (article?.status === "loading") {
    const lines = [92, 100, 96, 64, 0, 100, 88, 97, 72].map((w) => (w ? `<i style="width:${w}%"></i>` : "<b></b>")).join("");
    return `<article class="reader skeleton" aria-busy="true" aria-label="Reading the page">
      <i class="sk-kicker"></i><i class="sk-title"></i><i class="sk-title short"></i>${lines}
    </article>`;
  }
  if (article?.status === "error") {
    const link = article.url
      ? `<a class="btn" href="${esc(article.url)}" target="_blank" rel="noreferrer">Open the original</a>`
      : "";
    return `<article class="reader empty problem">
      <h2>Can’t read this page</h2>
      <p>${esc(article.error || "That page could not be read.")}</p>
      <div class="problem-actions"><button type="button" class="btn primary" data-action="reload-page">Try again</button>${link}</div>
    </article>`;
  }
  return `<article class="reader empty"><p>No page loaded.</p></article>`;
}

function blockHtml(block) {
  const text = esc(block.text);
  if (block.type === "h") return `<h2>${text}</h2>`;
  if (block.type === "quote") return `<blockquote>${text}</blockquote>`;
  if (block.type === "li") return `<p class="li">${text}</p>`;
  return `<p>${text}</p>`;
}

function kicker(article) {
  return [article.source, article.publishedLabel].filter(Boolean).map(esc).join(", ");
}

export function singleHtml(article) {
  if (!hasPage(article)) return emptyHtml(article);
  const body = article.blocks.length
    ? article.blocks.map(blockHtml).join("")
    : `<p class="empty">This page has no article text BROK can pull out.</p>`;
  const byline = article.byline ? `<p class="kicker">${esc(article.byline)}</p>` : "";
  return `<article class="reader">
    <p class="kicker">${kicker(article)}</p>
    <h1>${esc(article.title)}</h1>
    ${byline}
    ${body}
    <p class="legend">Text only. Images, scripts and ${esc(String(article.blocked?.length || 0))} third parties were left out.</p>
  </article>`;
}
function postHtml(post, pageIso) {
  const when = againstPage(post.time, pageIso);
  const stale = when.stale ? `<span class="stale">Stale</span>` : "";
  const identity = post.identity
    ? `<p class="identity">Identity flag. Not a fact flag.</p>`
    : "";
  const note = post.note
    ? `<blockquote class="note"><span class="flag">Community Note</span>${esc(post.note)}</blockquote>`
    : "";
  return `<article class="post">
    <header class="post-top">
      <p class="post-name">${esc(post.name)} <span>@${esc(post.handle)}</span></p>
      <p class="post-time">${esc(formatWhen(post.time))} · ${esc(when.label)} ${stale}</p>
    </header>
    <p class="post-claim">${esc(claimLabels[post.claimId] || post.claimId)}</p>
    <p>${esc(post.text)}</p>
    ${identity}
    ${note}
  </article>`;
}

function blocksHtml(list, pageIso) {
  if (!list.length) return `<p class="empty">No posts cite these lines.</p>`;
  return railBlocks(list)
    .map((block) => {
      if (block.type === "columns") {
        const cols = block.posts.map((post) => postHtml(post, pageIso)).join("");
        return `<div class="equal">${cols}</div><p class="equal-note">Chronological. Equal columns. No rank.</p>`;
      }
      return postHtml(block.posts[0], pageIso);
    })
    .join("");
}

export function postsRegion(posts, pageIso, xOn) {
  if (!xOn || !posts.length) return "";
  return blocksHtml(posts, pageIso);
}

// "spacexai/grok-4.1-fast-non-reasoning" reads as "Grok 4.1 Fast".
export function modelName(model) {
  const name = String(model || "Grok")
    .replace(/^[^/]+\//, "")
    .replace(/-non-reasoning$/, "")
    .split("-")
    .map((word) => (/^\d/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
  return name || "Grok";
}

function splitAsk() {
  const own = currentOwnModel();
  if (own?.on) {
    return `<strong>Sort this page with ${esc(own.model)}.</strong> The page text goes straight from your browser to ${esc(hostOf(own.endpoint))}.`;
  }
  return "<strong>Sort this page with Grok.</strong> The page text goes to Grok. Your accounts do not.";
}

function splitBar(article) {
  const split = article.split || {};
  if (split.status === "loading") {
    return `<div class="split-bar" id="inference"><p><span class="spin" aria-hidden="true"></span>Grok is reading the page.</p></div>`;
  }
  if (split.status === "error") {
    return `<div class="split-bar is-problem" id="inference"><p>${esc(split.error || "The split failed.")}</p><button type="button" class="btn sm" data-action="split-now">Try again</button></div>`;
  }
  if (split.status === "done") {
    const prompt = split.promptVersion ? `, prompt version ${esc(split.promptVersion)}` : "";
    return `<div class="split-bar is-done" id="inference"><p>Sorted by ${esc(modelName(split.model))}${prompt}${split.via ? `, ${esc(split.via)}` : ""}. A first pass, not a ruling. ${externalLink(PROMPT_URL, "See the prompt")}</p></div>`;
  }
  return `<div class="split-bar is-ask" id="inference">
    <p>${splitAsk()}</p>
    <button type="button" class="btn primary sm" data-action="split-now">${currentOwnModel()?.on ? "Split it" : "Split with Grok"}</button>
  </div>`;
}

export function columnsHtml(article) {
  if (!hasPage(article)) return emptyHtml(article);
  const panes = article.panes;
  const factItems = panes.fact.items
    .map(
      (item) => `<article class="claim">
        <p>${esc(item.text)}</p>
        <p class="source">${esc(item.source)}</p>
      </article>`,
    )
    .join("");
  const opinionItems = panes.opinion.items.length
    ? `<div class="equal">${panes.opinion.items
        .map(
          (item) => `<article class="claim">
            <p class="speaker">${esc(item.speaker)}</p>
            <p>${esc(item.text)}</p>
          </article>`,
        )
        .join("")}</div>`
    : "";
  const check = article.check || { status: "idle" };
  const verdictFor = (text) => (check.checks || []).find((row) => row.claim === text);
  const LABEL = { backed: "Backed by a source", disputed: "Disputed by a source", unknown: "Not settled" };
  const notItems = panes.notFact.items
    .map((item) => {
      const row = verdictFor(item.text);
      const verdict = row
        ? `<div class="verdict" data-verdict="${esc(row.verdict)}">
            <p class="verdict-label">${esc(LABEL[row.verdict])}</p>
            <p>${esc(row.why)}</p>
            ${row.sources.length ? `<p class="verdict-src">${row.sources.map((src) => `<a href="${esc(src.url)}" data-action="open-page">${esc(src.site)}</a>`).join("")}</p>` : ""}
          </div>`
        : check.status === "loading"
          ? `<div class="claim-ghost"><i></i><i></i></div>`
          : "";
      return `<article class="claim">
        <p class="unverified">${esc(item.text)}</p>
        ${verdict}
      </article>`;
    })
    .join("");
  const checkBar =
    article.split?.status === "done" && panes.notFact.items.length
      ? check.status === "done"
        ? `<p class="check-note">Checked against other sites by ${esc(modelName(check.model))}, check prompt version ${esc(check.promptVersion || "1")}. ${externalLink(CHECK_URL, "See the prompt")}</p>`
        : check.status === "loading"
          ? `<p class="check-note"><span class="spin" aria-hidden="true"></span>Searching other sites for each line</p>`
          : `<div class="check-ask">${check.status === "error" ? `<p>${esc(check.error)}</p>` : "<p>Search other sites for each line here.</p>"}<button type="button" class="btn sm" data-action="check-claims">${check.status === "error" ? "Try again" : "Check these"}</button></div>`
      : "";
  const loading = article.split?.status === "loading";
  const ghost = `<div class="claim-ghost"><i></i><i></i><i></i></div>`.repeat(3);
  const pane = (key, data, items) => `<section class="pane" data-pane="${key}">
      <header class="pane-head">
        <h2>${esc(data.label)}</h2>
        <p>${esc(data.note)}</p>
      </header>
      <div class="pane-body">
        ${key === "not" ? checkBar : ""}
        ${loading ? ghost : items || `<p class="empty">${article.split?.status === "done" ? "None on this page." : "Nothing here yet."}</p>`}
        <div class="pane-posts" data-posts="${key}"></div>
      </div>
    </section>`;
  return `${splitBar(article)}
    <div class="panes">
    ${pane("fact", panes.fact, factItems)}
    ${pane("opinion", panes.opinion, opinionItems)}
    ${pane("not", panes.notFact, notItems)}
    </div>`;
}

export function fillPosts(root, posts, pageIso, xOn) {
  const byPane = {
    fact: posts.filter((post) => post.pane === "fact"),
    opinion: posts.filter((post) => post.pane === "opinion"),
    not: posts.filter((post) => post.pane === "not"),
  };
  root.querySelectorAll("[data-posts]").forEach((node) => {
    node.innerHTML = postsRegion(byPane[node.dataset.posts] || [], pageIso, xOn);
  });
}

export function railHtml(posts, pageIso) {
  return `<header class="rail-head">
      <h2>Posts citing this URL</h2>
      <p>None loaded. This screen does not invent posts.</p>
    </header>
    <div class="rail-body">${blocksHtml(posts, pageIso)}</div>`;
}

export function originalHtml(article) {
  if (!hasPage(article)) return emptyHtml(article);
  const blocked = article.blocked || [];
  return `<div class="original">
    <section class="receipt">
      <p class="kicker">${kicker(article)}</p>
      <h1>${esc(article.title)}</h1>
      <p class="receipt-sum">${esc(blockedSummary(blocked))}</p>
      <p>BROK read this page on its server and kept only the text. Nothing below ever reached your device.</p>
      <a class="btn" href="${esc(article.url)}" target="_blank" rel="noreferrer">Open the original in a new tab</a>
      <p class="fine">Its trackers will load there.</p>
    </section>
    <div class="receipt-list">${blockedListHtml(blocked, "This page asked for no third parties.")}</div>
  </div>`;
}
