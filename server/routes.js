import { splitClaims } from "./claims.js";
import { readBody, sendJson } from "./net.js";
import { readPage } from "./read.js";
import { searchWeb } from "../src/sidecar/web-search.js";
import { xClientId, xMe, xPosts, xRevoke, xToken } from "./x.js";

// Every route takes POST with a JSON body. Searches and page addresses never
// sit in a URL, so they never land in a request log.
function post(handler, failure) {
  return async (req, res) => {
    if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST." });
    try {
      sendJson(res, 200, await handler(await readBody(req)));
    } catch (error) {
      sendJson(res, error.status || 502, { error: error.status ? error.message : failure });
    }
  };
}

export const searchRoute = post((body) => searchWeb(body.q), "Search failed.");
export const readRoute = post((body) => readPage(body.u), "That page could not be read.");
export const splitRoute = post((body) => splitClaims(body), "The split failed.");

// What this server is set up for, so the app never shows something that is not true.
export const configRoute = post(
  () => ({ search: process.env.BRAVE_API_KEY ? "Brave Search" : "Bing", xClientId: xClientId() }),
  "Settings failed.",
);
export const xTokenRoute = post(xToken, "X sign in failed.");
export const xMeRoute = post(xMe, "X failed.");
export const xPostsRoute = post(xPosts, "X failed.");
export const xRevokeRoute = post(xRevoke, "X failed.");
