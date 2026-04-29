/**
 * One-time DB migration script.
 * Usage: DB_PASSWORD=<your-password> node scripts/migrate.mjs
 */
import pg from "pg";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, "../supabase/schema.sql"), "utf8");

const REF = process.env.SUPABASE_PROJECT_REF;
const PASSWORD = process.env.DB_PASSWORD;

if (!REF || !PASSWORD) {
  console.error("Usage: SUPABASE_PROJECT_REF=xxx DB_PASSWORD=xxx node scripts/migrate.mjs");
  process.exit(1);
}

const configs = [
  { host: `db.${REF}.supabase.co`, port: 5432, user: "postgres" },
  ...["ap-southeast-1","us-east-1","eu-west-1","ap-northeast-1","us-west-1"].map(r => ({
    host: `aws-0-${r}.pooler.supabase.com`, port: 6543, user: `postgres.${REF}`
  })),
];

async function tryConnect(config) {
  const client = new pg.Client({ ...config, database: "postgres", password: PASSWORD, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 4000 });
  try { await client.connect(); return client; } catch { return null; }
}

async function migrate() {
  let client = null;
  for (const cfg of configs) {
    process.stdout.write(`Trying ${cfg.host}:${cfg.port}... `);
    client = await tryConnect(cfg);
    if (client) { console.log("Connected!"); break; }
    console.log("failed");
  }
  if (!client) { console.error("All connections failed."); process.exit(1); }

  for (const stmt of sql.split(";").map(s => s.trim()).filter(s => s && !s.startsWith("--"))) {
    try {
      await client.query(stmt);
      console.log(`✓ ${stmt.replace(/\s+/g, " ").slice(0, 70)}`);
    } catch (err) {
      if (err.message.includes("already exists")) console.log("⚠ already exists");
      else console.error(`✗ ${err.message.slice(0, 100)}`);
    }
  }
  await client.end();
  console.log("Migration complete.");
}

migrate().catch(console.error);
