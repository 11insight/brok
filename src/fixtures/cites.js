// Citing posts come from a real X query. This prototype does not invent them.
export const posts = [];

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
