import { defineConfig } from "vite";
import { searchWeb } from "./src/sidecar/web-search.js";

function searchApi() {
  return {
    name: "brok-search",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url || "/", "http://127.0.0.1");
        if (url.pathname !== "/api/search") return next();
        searchWeb(url.searchParams.get("q") || "")
          .then((data) => {
            res.statusCode = 200;
            res.setHeader("content-type", "application/json; charset=utf-8");
            res.setHeader("cache-control", "no-store");
            res.end(JSON.stringify(data));
          })
          .catch((error) => {
            res.statusCode = error.status || 502;
            res.setHeader("content-type", "application/json; charset=utf-8");
            res.setHeader("cache-control", "no-store");
            res.end(JSON.stringify({ error: "Search failed." }));
          });
      });
    },
  };
}

export default defineConfig({
  plugins: [searchApi()],
  server: {
    host: "127.0.0.1",
    port: 5190,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 5190,
    strictPort: true,
  },
});
