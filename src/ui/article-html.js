import { claimLabels, railBlocks } from "../fixtures/cites.js";
import { againstPage, formatWhen } from "./format.js";
import { esc } from "./dom.js";

function hasPage(article) {
  return Boolean(article?.title || article?.blocks?.length);
}

function emptyHtml(article) {
  if (article?.status === "loading") {
    return `<article class="reader empty" aria-busy="true"><p>Reading the page.</p></article>`;
  }
  if (article?.status === "error") {
    const link = article.url
      ? `<p><a href="${esc(article.url)}" target="_blank" rel="noreferrer">Open the original page</a></p>`
      : "";
    return `<article class="reader empty"><p>${esc(article.error || "That page could not be read.")}</p>${link}</article>`;
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
    <div class="article-top">
      <p class="kicker">${kicker(article)}</p>
      <button type="button" data-action="go" data-route="original">Original page</button>
    </div>
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

function paneNote(article) {
  const split = article.split || {};
  if (split.status === "loading") return "Grok is reading the page.";
  if (split.status === "error") return split.error || "The split failed.";
  if (split.status === "done") return `Split by ${split.model || "Grok"}. A first pass, not a ruling.`;
  return "Not split yet. Turn off Keep it on this device in Security, then send the page to Grok.";
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
  const notItems = panes.notFact.items
    .map(
      (item) => `<article class="claim">
        <p class="unverified">${esc(item.text)}</p>
      </article>`,
    )
    .join("");
  const pane = (key, data, items) => `<section class="pane" data-pane="${key}">
      <header class="pane-head">
        <h2>${esc(data.label)}</h2>
        <p>${esc(data.note)}</p>
      </header>
      <div class="pane-body">
        ${items || `<p class="empty">Nothing here yet.</p>`}
        <div class="pane-posts" data-posts="${key}"></div>
      </div>
    </section>`;
  return `<p class="inference" id="inference">${esc(paneNote(article))}</p>
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
  const slots = blocked.length
    ? blocked
        .map(
          (row) => `<div class="blocked-slot">
        <p class="flag">${esc(row.kind)}</p>
        <p>${esc(row.host)}</p>
      </div>`,
        )
        .join("")
    : `<p class="empty">This page asked for no third parties.</p>`;
  return `<div class="original">
    <p class="original-banner">BROK rebuilt this page from its text. These third parties never loaded.</p>
    <div class="original-grid">
      <article class="messy">
        <button type="button" data-action="go" data-route="browser">Rebuilt page</button>
        <p class="kicker">${kicker(article)}</p>
        <h1>${esc(article.title)}</h1>
        <p><a href="${esc(article.url)}" target="_blank" rel="noreferrer">Open the original in a new tab</a>. Its trackers will load there.</p>
      </article>
      <aside class="clutter">${slots}</aside>
    </div>
  </div>`;
}
