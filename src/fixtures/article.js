export const article = {
  id: "northspan-harbor-coating",
  url: "https://harbor.example.test/2026/09/28/northspan-coating",
  source: "Harbor Desk",
  title: "Northspan tells the harbor board a coating ends rust for good",
  published: "2026-09-28T15:00:00Z",
  publishedLabel: "28 Sep 2026, 15:00 UTC",
  company: { name: "Northspan", symbol: "NSPN" },
  grokipedia: "https://grokipedia.com/page/Northspan",
  grokipediaLabel: "Northspan",
  figures: {
    inspection: {
      src: "/figures/inspection.svg",
      alt: "Line diagram of 14 inspection stations on pier 4",
      flag: "Sourced",
      caption: "Stations named in the 2 September 2026 inspection report.",
    },
    poster: {
      src: "/figures/opinion-plate.svg",
      alt: "Plate repeating a commissioner's evaluative line",
      flag: "Opinion",
      caption: "The line is evaluative. It is not a finding from the report.",
    },
    pair: {
      src: "/figures/unsourced-pair.svg",
      alt: "Unlabeled before-and-after pair with no document name",
      flag: "Unsourced",
      caption: "No named source. Unverified by this pass.",
    },
  },
  blocks: [
    {
      type: "p",
      parts: [
        {
          text: "The Harbor Commission voted 7–2 on 12 September 2026 to fund the pier 4 inspection. The vote is recorded in the commission minutes, item 14. ",
        },
        {
          text: "The inspection report is dated 2 September 2026 and lists 14 stations along the pier.",
        },
      ],
    },
    { type: "figure", id: "inspection" },
    {
      type: "p",
      parts: [
        {
          text: "Northspan, listed here as NSPN, described coating NS-14 in a product note dated 1 August 2026.",
        },
      ],
    },
    {
      type: "p",
      parts: [
        {
          text: "Commissioner Ade told the board the coating is the only responsible choice for a wet climate. ",
        },
        {
          text: "Engineer Okonkwo told the board a competing sealant would have cost less and still met the written spec.",
        },
      ],
    },
    { type: "figure", id: "poster" },
    {
      type: "p",
      parts: [
        {
          text: "The coating eliminates corrosion forever.",
          unverified: true,
        },
        { text: " " },
        {
          text: "Independent tests show a 100% cure rate on marine steel.",
          unverified: true,
        },
        { text: " " },
        {
          text: "The stock doubles once the contract is signed.",
          unverified: true,
        },
      ],
    },
    { type: "figure", id: "pair" },
    {
      type: "p",
      parts: [
        {
          text: "The commission has not awarded a contract. The next hearing is set for 19 October 2026, according to the clerk's calendar posted with the minutes.",
        },
      ],
    },
  ],
  panes: {
    fact: {
      label: "Verified fact",
      note: "Provisional. Grok sorts. It does not verify. A named document can still be wrong.",
      items: [
        {
          id: "vote",
          text: "The Harbor Commission voted 7–2 on 12 September 2026 to fund the pier 4 inspection.",
          source: "Harbor Commission minutes, item 14.",
        },
        {
          id: "report",
          text: "The inspection report is dated 2 September 2026 and lists 14 stations.",
          source: "Inspection report, cover date.",
        },
        {
          id: "filing",
          text: "Northspan's product note dated 1 August 2026 describes coating NS-14. The fixture symbol is NSPN.",
          source: "Northspan product note, 1 August 2026.",
        },
        {
          id: "hearing",
          text: "The next hearing is set for 19 October 2026. No contract has been awarded.",
          source: "Clerk's calendar, posted with the minutes.",
        },
      ],
    },
    opinion: {
      label: "Opinion",
      note: "Equal weight. No side score.",
      items: [
        {
          id: "ade",
          speaker: "Commissioner Ade",
          text: "The coating is the only responsible choice for a wet climate.",
        },
        {
          id: "okonkwo",
          speaker: "Engineer Okonkwo",
          text: "A competing sealant would have cost less and still met the written spec.",
        },
      ],
    },
    notFact: {
      label: "Not fact",
      note: "Underlined. Unverified by this pass. Not a false mark.",
      items: [
        { id: "forever", text: "The coating eliminates corrosion forever." },
        { id: "cure", text: "Independent tests show a 100% cure rate on marine steel." },
        { id: "doubles", text: "The stock doubles once the contract is signed." },
      ],
    },
  },
};
