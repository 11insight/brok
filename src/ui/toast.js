// One short message at the top, gone after a moment. Borrowed from Play Crypto.
let timer = 0;

export function toast(text) {
  let node = document.getElementById("toast");
  if (!node) {
    node = document.createElement("div");
    node.id = "toast";
    node.className = "toast";
    node.setAttribute("role", "status");
    node.setAttribute("aria-live", "polite");
    document.body.append(node);
  }
  node.textContent = text;
  node.classList.add("is-on");
  window.clearTimeout(timer);
  timer = window.setTimeout(() => node.classList.remove("is-on"), 2300);
}

// A small tap on phones that support it. Silent everywhere else.
export function buzz(ms = 8) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // No vibration here.
  }
}
