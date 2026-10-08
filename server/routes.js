import { splitClaims } from "./claims.js";
import { readBody, sendJson } from "./net.js";
import { readPage } from "./read.js";

export async function readRoute(req, res) {
  const url = new URL(req.url, "http://127.0.0.1");
  try {
    sendJson(res, 200, await readPage(url.searchParams.get("u")));
  } catch (error) {
    sendJson(res, error.status || 502, { error: error.status ? error.message : "That page could not be read." });
  }
}

export async function splitRoute(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST." });
  try {
    sendJson(res, 200, await splitClaims(await readBody(req)));
  } catch (error) {
    sendJson(res, error.status || 502, { error: error.status ? error.message : "The split failed." });
  }
}
