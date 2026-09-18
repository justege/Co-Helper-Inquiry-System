import pg from "pg";

const { Pool } = pg;

function sslOption() {
  if (process.env.DATABASE_SSL === "disable") return false;
  // DigitalOcean managed Postgres requires SSL. Their CA isn't in Node's
  // default trust store, so we connect with TLS but skip CA pinning.
  return { rejectUnauthorized: false };
}

function connectionString(url) {
  // sslmode=require is treated as verify-full in current node-pg and fails
  // against DigitalOcean's chain. We set ssl ourselves instead.
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("sslmode");
    return parsed.toString();
  } catch {
    return url;
  }
}

function poolConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: connectionString(process.env.DATABASE_URL),
      ssl: sslOption(),
      max: 10,
    };
  }

  const host = process.env.PGHOST || process.env.DATABASE_HOST;
  const user = process.env.PGUSER || process.env.DATABASE_USER;
  const password = process.env.PGPASSWORD || process.env.DATABASE_PASSWORD;
  const database = process.env.PGDATABASE || process.env.DATABASE_NAME;
  const port = Number(process.env.PGPORT || process.env.DATABASE_PORT || 25060);

  if (!host || !user || !password || !database) {
    throw new Error(
      "Database is not configured. Set DATABASE_URL (DigitalOcean connection URI) " +
        "or PGHOST, PGPORT, PGUSER, PGPASSWORD, and PGDATABASE in backend/.env"
    );
  }

  return { host, port, user, password, database, ssl: sslOption(), max: 10 };
}

export const pool = new Pool(poolConfig());

pool.on("error", (err) => {
  console.error("[db] idle client error", err);
});

export async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result.rows;
}

export async function queryOne(text, params = []) {
  const rows = await query(text, params);
  return rows[0] ?? null;
}

export async function execute(text, params = []) {
  return pool.query(text, params);
}

/** Build `col = $n` fragments for a dynamic UPDATE. */
export function buildSet(fields, start = 1) {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
  const set = entries.map(([k], i) => `${k} = $${start + i}`).join(", ");
  return { set, values: entries.map(([, v]) => v), next: start + entries.length };
}

export default { pool, query, queryOne, execute, buildSet };
