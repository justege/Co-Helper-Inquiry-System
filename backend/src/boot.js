import http from "node:http";

const PORT = Number(process.env.PORT) || 8000;

console.log("[boot] starting", {
  port: process.env.PORT || `(fallback ${PORT})`,
  nodeEnv: process.env.NODE_ENV,
  hasDatabase: Boolean(process.env.DATABASE_URL),
  hasFirebase: Boolean(process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID),
});

let app = null;
let loadError = null;

const server = http.createServer((req, res) => {
  const url = (req.url || "/").split("?")[0];
  if (url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
  if (app) {
    app(req, res);
    return;
  }
  res.writeHead(loadError ? 500 : 503, { "content-type": "application/json" });
  res.end(JSON.stringify({
    error: loadError ? loadError.message : "starting",
  }));
});

function bind() {
  server.on("error", (err) => {
    console.error("[boot] listen error", err);
    if (err.code === "EAFNOSUPPORT" || err.code === "EADDRNOTAVAIL") {
      server.listen(PORT, "0.0.0.0", () => {
        console.log("[boot] listening on 0.0.0.0:" + PORT);
      });
      return;
    }
    process.exit(1);
  });
  server.listen(PORT, () => {
    console.log("[boot] listening", server.address());
  });
}

bind();

import("./index.js")
  .then((mod) => {
    app = mod.app;
    console.log("[boot] app loaded");
  })
  .catch((err) => {
    loadError = err;
    console.error("[boot] app failed to load");
    console.error(err);
  });
