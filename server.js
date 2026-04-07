import express from "express";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(resolve(__dirname, "dist")));

app.get("/api/data", (_req, res) => {
  const dataDir = resolve(__dirname, "data");
  const standardsPath = resolve(dataDir, "standards.json");
  const gamesPath = resolve(dataDir, "games.json");

  const standards = existsSync(standardsPath)
    ? JSON.parse(readFileSync(standardsPath, "utf-8"))
    : [];
  const games = existsSync(gamesPath)
    ? JSON.parse(readFileSync(gamesPath, "utf-8"))
    : [];

  res.json({ standards, games });
});

app.post("/api/sync", async (_req, res) => {
  try {
    const mod = await import("./sync.mjs");
    const counts = await mod.syncAll();
    res.json({ success: true, ...counts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/game-details", async (req, res) => {
  const hashid = req.query.hashid;
  if (!hashid) {
    return res.status(400).json({ error: "Missing hashid parameter" });
  }
  try {
    const cookies = process.env.PADLET_COOKIES || "";
    const upstream = await fetch(
      `https://arcade.padlet.com/api/admin/past-prompt-details?hashid=${encodeURIComponent(hashid)}`,
      {
        headers: {
          Cookie: cookies,
          Referer: "https://arcade.padlet.com/admin/view-past-prompt",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
        },
      },
    );
    const data = await upstream.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get("/{*splat}", (_req, res) => {
  res.sendFile(resolve(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
