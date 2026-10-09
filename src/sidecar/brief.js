// Your briefing topics, and today's briefing once made. Kept in this browser
// only, so Brok's server never holds a list of what you follow.
const TOPICS = "brok.topics";
const BRIEF = "brok.brief";

const today = () => new Date().toISOString().slice(0, 10);

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked. It still works until reload.
  }
}

export const SUGGESTED = ["World news", "Tech", "Markets", "Space", "Sports", "Science"];

export function readTopics() {
  const topics = read(TOPICS, []);
  return Array.isArray(topics) ? topics.slice(0, 8) : [];
}

export function writeTopics(topics) {
  write(TOPICS, topics.slice(0, 8));
}

// Only today's briefing is kept. Yesterday's is dropped.
export function readBrief() {
  const brief = read(BRIEF, null);
  return brief && brief.date === today() ? brief : null;
}

export function writeBrief(items) {
  write(BRIEF, { date: today(), items: items.filter((item) => item.status === "done") });
}
