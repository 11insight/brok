import { defineConfig } from "vite";
import { readRoute, splitRoute } from "./server/routes.js";
import { searchWeb } from "./src/sidecar/web-search.js";

function searchRoute(req, res) {
  const url = new URL(req.url || "/", "http://127.0.0.1");
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
}

const ROUTES = { "/api/search": searchRoute, "/api/read": readRoute, "/api/split": splitRoute };

function api() {
  return {
    name: "brok-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const route = ROUTES[new URL(req.url || "/", "http://127.0.0.1").pathname];
        if (!route) return next();
        route(req, res);
      });
    },
  };
}

export default defineConfig({
  plugins: [api()],
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
