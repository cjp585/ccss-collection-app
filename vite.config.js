import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, ".."), "PADLET_");

  return {
  plugins: [
    react(),
    {
      name: "sync-api",
      configureServer(server) {
        server.middlewares.use("/api/sync", async (req, res) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: "Method not allowed" }));
            return;
          }
          try {
            const mod = await import("./sync.mjs");
            const { syncAll } = mod;
            const counts = await syncAll();
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: true, ...counts }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });

        server.middlewares.use("/api/data", (_req, res) => {
          const dataDir = resolve("data");
          const standardsPath = resolve(dataDir, "standards.json");
          const gamesPath = resolve(dataDir, "games.json");

          const standards = existsSync(standardsPath)
            ? JSON.parse(readFileSync(standardsPath, "utf-8"))
            : [];
          const games = existsSync(gamesPath)
            ? JSON.parse(readFileSync(gamesPath, "utf-8"))
            : [];

          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ standards, games }));
        });

        server.middlewares.use("/api/game-details", async (req, res) => {
          const url = new URL(req.url, "http://localhost");
          const hashid = url.searchParams.get("hashid");
          if (!hashid) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Missing hashid parameter" }));
            return;
          }
          try {
            const cookies = env.PADLET_COOKIES || "";
            const upstream = await fetch(
              `https://arcade.padlet.com/api/admin/past-prompt-details?hashid=${encodeURIComponent(hashid)}`,
              {
                headers: {
                  "Cookie": cookies,
                  "Referer": "https://arcade.padlet.com/admin/view-past-prompt",
                  "User-Agent":
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
                },
              },
            );
            const data = await upstream.json();
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(data));
          } catch (err) {
            res.statusCode = 502;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      },
    },
  ],
};
});
