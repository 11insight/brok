const PREFIX = "brok.pane.";

// View mode only. Accounts, page text, and secrets are not written here.
export function readSplit(articleId) {
  try {
    return localStorage.getItem(PREFIX + articleId) === "split";
  } catch {
    return false;
  }
}

export function writeSplit(articleId, split) {
  try {
    localStorage.setItem(PREFIX + articleId, split ? "split" : "single");
  } catch {
    // Private mode. The toggle still works for this paint.
  }
}
