export const quotes = [];

export function quotesFor(article) {
  return quotes
    .map((quote) => ({
      ...quote,
      pinned: quote.symbol === article.company?.symbol,
    }))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));
}
