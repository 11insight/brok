export const quotes = [
  { symbol: "NSPN", name: "Northspan", price: "18.40", change: "+0.30" },
  { symbol: "HBR", name: "Harbor Board", price: "6.10", change: "−0.05" },
  { symbol: "ORB", name: "Orbital Glass", price: "41.00", change: "+0.12" },
];

export function quotesFor(article) {
  return quotes
    .map((quote) => ({
      ...quote,
      pinned: quote.symbol === article.company.symbol,
    }))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));
}
