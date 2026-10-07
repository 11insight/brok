import { panesFromFixture } from "../sidecar/classify.js";
import { claimLabels, railBlocks } from "../fixtures/cites.js";
import { againstPage, formatWhen } from "./format.js";
import { esc } from "./dom.js";

function figureHtml(figure) {
  return `<figure class="figure">
    <img src="${esc(figure.src)}" alt="${esc(figure.alt)}" width="800" height="420" />
    <figcaption>
      <span class="flag">${esc(figure.flag)}</span>
      ${esc(figure.caption)}
      <span class="proxy">Fixture figure, standing in for the original image. Logged as an image proxy.</span>
    </figcaption>
  </figure>`;
}

function paragraphHtml(block) {
  const inner = block.parts
    .map((part) => {
      const text = esc(part.text);
      return part.unverified ? `<span class="unverified">${text}</span>` : text;
    })
    .join("");
  return `<p>${inner}</p>`;
}

export function singleHtml(article) {
  const body = article.blocks
    .map((block) => (block.type === "figure" ? figureHtml(article.figures[block.id]) : paragraphHtml(block)))
    .join("");
  return `<article class="reader">
    <div class="article-top">
      <p class="kicker">${esc(article.source)} · ${esc(article.publishedLabel)}</p>
      <button type="button" data-action="go" data-route="original">Original page</button>
    </div>
    <h1>${esc(article.title)}</h1>
    ${body}
    <p class="legend">Underline means unverified by this pass. It does not mean false.</p>
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
  if (!xOn) return `<p class="empty">No X account. Citing posts stay hidden.</p>`;
  return blocksHtml(posts, pageIso);
}

export function columnsHtml(article) {
  const panes = panesFromFixture(article);
  const fact = panes.fact;
  const opinion = panes.opinion;
  const notFact = panes.notFact;
  const factItems = fact.items
    .map(
      (item) => `<article class="claim" data-claim="${esc(item.id)}">
        <p>${esc(item.text)}</p>
        <p class="source">${esc(item.source)}</p>
      </article>`,
    )
    .join("");
  const opinionItems = `<div class="equal">${opinion.items
    .map(
      (item) => `<article class="claim">
        <p class="speaker">${esc(item.speaker)}</p>
        <p>${esc(item.text)}</p>
      </article>`,
    )
    .join("")}</div>`;
  const notItems = notFact.items
    .map(
      (item) => `<article class="claim">
        <p class="unverified">${esc(item.text)}</p>
      </article>`,
    )
    .join("");

  return `<p class="inference" id="inference"></p>
    <div class="panes">
    <section class="pane" data-pane="fact">
      <header class="pane-head">
        <h2>${esc(fact.label)}</h2>
        <p>${esc(fact.note)}</p>
      </header>
      <div class="pane-body">
        ${figureHtml(article.figures.inspection)}
        ${factItems}
        <div class="pane-posts" data-posts="fact"></div>
      </div>
    </section>
    <section class="pane" data-pane="opinion">
      <header class="pane-head">
        <h2>${esc(opinion.label)}</h2>
        <p>${esc(opinion.note)}</p>
      </header>
      <div class="pane-body">
        ${figureHtml(article.figures.poster)}
        ${opinionItems}
        <div class="pane-posts" data-posts="opinion"></div>
      </div>
    </section>
    <section class="pane" data-pane="not">
      <header class="pane-head">
        <h2>${esc(notFact.label)}</h2>
        <p>${esc(notFact.note)}</p>
      </header>
      <div class="pane-body">
        ${figureHtml(article.figures.pair)}
        ${notItems}
        <div class="pane-posts" data-posts="not"></div>
      </div>
    </section>
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
      <p>Fixture posts. Newest first. Post text only. No For You rank. Handles are not links.</p>
    </header>
    <div class="rail-body">${blocksHtml(posts, pageIso)}</div>`;
}

export function originalHtml(article) {
  const slots = [
    ["High", "Ad exchange"],
    ["High", "Pixel"],
    ["High", "Session replay"],
    ["Medium", "Affiliate click"],
  ]
    .map(
      ([klass, kind]) => `<div class="blocked-slot">
        <p class="flag">${esc(klass)} · Would-have</p>
        <p>${esc(kind)}</p>
        <p>Did not render. See the ledger.</p>
      </div>`,
    )
    .join("");
  const body = article.blocks
    .map((block) => (block.type === "figure" ? figureHtml(article.figures[block.id]) : paragraphHtml(block)))
    .join("");
  return `<div class="original">
    <p class="original-banner">Original fixture. The rebuild is a rendering, not this page. Third parties did not render.</p>
    <div class="original-grid">
      <article class="messy">
        <button type="button" data-action="go" data-route="browser">Rebuilt page</button>
        <p class="messy-tools">Share widgets blocked · comment host blocked</p>
        <p class="kicker">${esc(article.source)}</p>
        <h1>${esc(article.title)}</h1>
        ${body}
      </article>
      <aside class="clutter">
        <div class="blocked-slot">
          <p class="flag">Would-have</p>
          <p>A third-party notice would have loaded here. It was blocked before the request.</p>
        </div>
        ${slots}
      </aside>
    </div>
  </div>`;
}
