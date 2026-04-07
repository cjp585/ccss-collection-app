import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { parse } from "csv-parse/sync";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(__dirname, "../.env") });

const AIRTABLE_BASE_ID = "appMbMW3rzbXTlgWq";
const AIRTABLE_TABLE_NAME = "Resources";
const AIRTABLE_VIEW_NAME = "ccss collection PUBLIC";
const CSV_PATH = resolve(__dirname, "../common_core_standards_k12_march_19_2026.csv");
const DATA_DIR = resolve(__dirname, "data");

function parseStandardsCSV() {
  const csv = readFileSync(CSV_PATH, "utf-8");
  return parse(csv, { columns: true, skip_empty_lines: true });
}

async function fetchAirtableRecords() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) throw new Error("AIRTABLE_API_KEY not set in .env");

  const records = [];
  let offset = undefined;

  do {
    const params = new URLSearchParams({ view: AIRTABLE_VIEW_NAME });
    if (offset) params.set("offset", offset);

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}?${params}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable API error ${res.status}: ${body}`);
    }

    const data = await res.json();
    for (const rec of data.records) {
      records.push({ id: rec.id, ...rec.fields });
    }
    offset = data.offset;
  } while (offset);

  return records;
}

export async function syncAll() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  console.log("Syncing standards from Common Standards Project CSV...");
  const standards = parseStandardsCSV();
  writeFileSync(
    resolve(DATA_DIR, "standards.json"),
    JSON.stringify(standards, null, 2),
  );
  console.log(`  Saved ${standards.length} standards`);

  console.log(`Syncing games from Airtable view "${AIRTABLE_VIEW_NAME}"...`);
  const games = await fetchAirtableRecords();
  writeFileSync(
    resolve(DATA_DIR, "games.json"),
    JSON.stringify(games, null, 2),
  );
  console.log(`  Saved ${games.length} games`);

  return { success: true, standards: standards.length, games: games.length };
}

const isDirectRun =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  syncAll()
    .then((c) =>
      console.log(`\nDone — ${c.standards} standards, ${c.games} games`),
    )
    .catch((err) => {
      console.error("Sync failed:", err.message);
      process.exit(1);
    });
}
