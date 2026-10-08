const pane = (label, note) => ({ label, note, items: [] });

// No sample article. A page appears only after a real document is loaded.
export const article = {
  id: "",
  url: "",
  source: "",
  title: "",
  published: "",
  publishedLabel: "",
  company: { name: "", symbol: "" },
  grokipedia: "",
  grokipediaLabel: "",
  figures: {},
  blocks: [],
  panes: {
    fact: pane("Verified fact", "Provisional. A named source can still be wrong."),
    opinion: pane("Opinion", "Equal weight. No side score."),
    notFact: pane("Not fact", "Unverified by this pass. Not marked false."),
  },
};
