import { searchWeb } from "../src/sidecar/web-search.js";

export default async function handler(req, res) {
  const url = new URL(req.url, "http://127.0.0.1");
  try {
    const data = await searchWeb(url.searchParams.get("q") || "");
    res.statusCode = 200;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("cache-control", "no-store");
    res.end(JSON.stringify(data));
  } catch (error) {
    res.statusCode = error.status || 502;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("cache-control", "no-store");
    res.end(JSON.stringify({ error: "Search failed." }));
  }
}
