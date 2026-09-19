/**
 * Apply backend/sql/schema.sql to the DigitalOcean Postgres URL in .env.
 *
 *   cd backend
 *   npm run db:setup
 *
 * Optional:
 *   node src/scripts/setupDb.js --reset          drop public schema, then apply
 *   node src/scripts/setupDb.js sql/other.sql    apply a different file
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "../..");

const envPath = path.join(backendRoot, ".env");
dotenv.config({ path: envPath, override: true });

const argv = process.argv.slice(2);
const reset = argv.includes("--reset");
const schemaArg = argv.find((a) => a !== "--reset");
const schemaPath = path.resolve(
  backendRoot,
  schemaArg || "sql/schema.sql"
);

function redactUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = "****";
    return parsed.toString();
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

function sslOption() {
  if (process.env.DATABASE_SSL === "disable") return false;
  return { rejectUnauthorized: false };
}

function splitSqlStatements(sql) {
  const statements = [];
  let buf = "";
  let i = 0;

  while (i < sql.length) {
    if (sql[i] === "-" && sql[i + 1] === "-") {
      const end = sql.indexOf("\n", i);
      const chunk = end === -1 ? sql.slice(i) : sql.slice(i, end + 1);
      buf += chunk;
      i += chunk.length;
      continue;
    }

    if (sql[i] === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2);
      if (end === -1) {
        buf += sql.slice(i);
        break;
      }
      buf += sql.slice(i, end + 2);
      i = end + 2;
      continue;
    }

    if (sql[i] === "$") {
      const match = sql.slice(i).match(/^(\$[A-Za-z0-9_]*\$)/);
      if (match) {
        const tag = match[1];
        const close = sql.indexOf(tag, i + tag.length);
        if (close === -1) {
          buf += sql.slice(i);
          break;
        }
        buf += sql.slice(i, close + tag.length);
        i = close + tag.length;
        continue;
      }
    }

    if (sql[i] === "'") {
      buf += sql[i++];
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          buf += "''";
          i += 2;
          continue;
        }
        buf += sql[i];
        if (sql[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    if (sql[i] === ";") {
      const stmt = buf.trim();
      if (stmt) statements.push(stmt);
      buf = "";
      i++;
      continue;
    }

    buf += sql[i++];
  }

  const tail = buf.trim();
  if (tail) statements.push(tail);
  return statements.filter((s) => !/^\s*$/.test(s.replace(/^\s*--.*$/gm, "")));
}

function connectionString(url) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("sslmode");
    return parsed.toString();
  } catch {
    return url;
  }
}

function clientConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: connectionString(process.env.DATABASE_URL),
      ssl: sslOption(),
    };
  }

  const host = process.env.PGHOST || process.env.DATABASE_HOST;
  const user = process.env.PGUSER || process.env.DATABASE_USER;
  const password = process.env.PGPASSWORD || process.env.DATABASE_PASSWORD;
  const database = process.env.PGDATABASE || process.env.DATABASE_NAME;
  const port = Number(process.env.PGPORT || process.env.DATABASE_PORT || 25060);

  if (!host || !user || !password || !database) {
    throw new Error(
      "Database is not configured. Set DATABASE_URL in backend/.env " +
        "(DigitalOcean connection URI, sslmode=require)."
    );
  }

  return { host, port, user, password, database, ssl: sslOption() };
}

if (!fs.existsSync(schemaPath)) {
  console.error(`Schema file not found: ${schemaPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(schemaPath, "utf8");
const statements = splitSqlStatements(sql);
const config = clientConfig();
const target = process.env.DATABASE_URL
  ? redactUrl(process.env.DATABASE_URL)
  : `${config.host}:${config.port}/${config.database}`;

console.log(`Applying ${path.relative(backendRoot, schemaPath)} (${statements.length} statements)`);
console.log(`Target: ${target}`);
if (reset) console.log("Reset: DROP SCHEMA public CASCADE");

const client = new Client(config);

try {
  await client.connect();
  if (reset) {
    await client.query("DROP SCHEMA public CASCADE");
    await client.query("CREATE SCHEMA public");
    await client.query("GRANT ALL ON SCHEMA public TO public");
    await client.query("GRANT ALL ON SCHEMA public TO CURRENT_USER");
  }
  for (let i = 0; i < statements.length; i++) {
    try {
      await client.query(statements[i]);
    } catch (err) {
      const preview = statements[i].replace(/\s+/g, " ").slice(0, 160);
      console.error(`Failed at statement ${i + 1}/${statements.length}: ${preview}`);
      throw err;
    }
  }

  const tables = await client.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  console.log(`Schema applied. ${tables.rowCount} public tables:`);
  for (const row of tables.rows) {
    console.log(`  - ${row.tablename}`);
  }
} catch (err) {
  console.error("Failed to apply schema:", err.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
