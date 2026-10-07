import { article } from "../fixtures/article.js";

export function loadArticle() {
  // Already fetched. This prototype makes no network request for the page.
  return article;
}
