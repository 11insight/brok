import { splitClaims } from "./claims.js";
import { readBody, sendJson } from "./net.js";
import { readPage } from "./read.js";
import { searchWeb } from "../src/sidecar/web-search.js";

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
