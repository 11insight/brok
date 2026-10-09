import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import {
  answerRoute,
  configRoute,
  sourcesRoute,
  readRoute,
  searchRoute,
  splitRoute,
  xMeRoute,
  xPostsRoute,
  xRevokeRoute,
  xTokenRoute,
} from "./server/routes.js";

const ROUTES = {
  "/api/search": searchRoute,
  "/api/read": readRoute,
  "/api/split": splitRoute,
  "/api/config": configRoute,
  "/api/answer": answerRoute,
  "/api/sources": sourcesRoute,
  "/api/x/token": xTokenRoute,
  "/api/x/me": xMeRoute,
  "/api/x/posts": xPostsRoute,
  "/api/x/revoke": xRevokeRoute,
};

function serve(req, res, next) {
  const route = ROUTES[new URL(req.url || "/", "http://127.0.0.1").pathname];
  if (!route) return next();
  route(req, res);
}

// The same routes run on your own computer, in dev and in preview.
function api() {
  return {
    name: "brok-api",
    configureServer(server) {
      server.middlewares.use(serve);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serve);
    },
  };
}

// The commit this build came from, shown in Settings so anyone can match the
// live site to its source. Vercel sets the env var; a local build asks git.
function commit() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    const sha = execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    const dirty = execSync("git status --porcelain", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    return dirty ? `${sha}+changes` : sha;
  } catch {
    return "";
  }
}

export default defineConfig({
  define: { __BROK_COMMIT__: JSON.stringify(commit()) },
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
