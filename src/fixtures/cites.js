export const posts = [
  {
    id: "mina",
    claimId: "forever",
    pane: "not",
    name: "Mina Cho",
    handle: "mina.fixture",
    time: "2026-09-28T18:40:00Z",
    text: "The report says 15 years in salt spray. Forever is not in the document.",
    note: null,
    identity: false,
  },
  {
    id: "harbor",
    claimId: "forever",
    pane: "not",
    name: "Harbor Watch",
    handle: "harbor.fixture",
    time: "2026-09-28T16:05:00Z",
    text: "Northspan is right. This coating ends rust for good.",
    note: "The inspection report gives a service range. It does not say forever.",
    identity: true,
  },
  {
    id: "ivo",
    claimId: "vote",
    pane: "fact",
    name: "Ivo Pell",
    handle: "ivo.fixture",
    time: "2026-09-28T15:22:00Z",
    text: "Minutes item 14 shows the inspection vote as 7–2.",
    note: null,
    identity: false,
  },
  {
    id: "tape",
    claimId: "doubles",
    pane: "not",
    name: "Old Tape",
    handle: "tape.fixture",
    time: "2026-01-04T12:00:00Z",
    text: "Someone will say the stock doubles when a coating contract shows up. They said it in January too.",
    note: null,
    identity: false,
  },
];

export const claimLabels = {
  forever: "Eliminates corrosion forever",
  vote: "The 7–2 vote",
  doubles: "The stock doubles",
  cure: "100% cure rate",
};

export function railBlocks(list) {
  const sorted = list.slice().sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
  const seen = new Set();
  const blocks = [];
  for (const post of sorted) {
    if (seen.has(post.id)) continue;
    const siblings = sorted.filter((item) => item.claimId === post.claimId);
    if (siblings.length > 1) {
      siblings.forEach((item) => seen.add(item.id));
      const chronological = siblings
        .slice()
        .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
      blocks.push({ type: "columns", posts: chronological, claimId: post.claimId });
    } else {
      seen.add(post.id);
      blocks.push({ type: "single", posts: [post], claimId: post.claimId });
    }
  }
  return blocks;
}
