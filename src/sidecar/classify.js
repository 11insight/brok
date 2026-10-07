// Fixture panes stand in for a live pass.
// The prompt file next to this one is not imported.

export function panesFromFixture(article) {
  return {
    fact: article.panes.fact,
    opinion: article.panes.opinion,
    notFact: article.panes.notFact,
  };
}
