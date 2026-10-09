const KEY = "brok.view";

// One remembered choice, reader or split. Not stored per page, so this
// browser keeps no list of what you read.
export function readSplit() {
  try {
    localStorage.removeItem("brok.pane.");
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith("brok.pane.")) localStorage.removeItem(key);
    }
    return localStorage.getItem(KEY) === "split";
  } catch {
    return false;
  }
}

export function writeSplit(_id, split) {
  try {
    localStorage.setItem(KEY, split ? "split" : "reader");
  } catch {
    // Private mode. The toggle still works for this paint.
  }
}
