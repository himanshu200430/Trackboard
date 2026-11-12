import pg from 'pg';
import dns from 'dns/promises';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:himanshu2004@127.0.0.1:5432/tackboard';
const isCloudDb = !dbUrl.includes('127.0.0.1') && !dbUrl.includes('localhost');

let poolConfig;

if (isCloudDb) {
  const parsed = new URL(dbUrl);

  let targetHost = parsed.hostname;
  try {
    // Resolve IPv4 addresses to bypass dead DNS entries and IPv6 timeouts
    const ips = await dns.resolve4(parsed.hostname);
    const preferredIp = ips.find((ip) => ip.startsWith('3.')) || ips.find((ip) => !ip.startsWith('77.')) || ips[0];
    if (preferredIp) {
      targetHost = preferredIp;
    }
  } catch (err) {
    // fallback to hostname if DNS resolve fails
  }

  poolConfig = {
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    host: targetHost,
    port: parseInt(parsed.port || '5432', 10),
    database: parsed.pathname.replace(/^\//, ''),
    ssl: {
      rejectUnauthorized: false,
      servername: parsed.hostname,
    },
    connectionTimeoutMillis: 15000,
  };
} else {
  poolConfig = {
    connectionString: dbUrl,
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]:', err.message);
});

/**
 * Executes a parameterized SQL query ($1, $2, etc.)
 * Strictly avoids SQL string concatenation to prevent SQL injection.
 * @param {string} text 
 * @param {Array} [params] 
 * @returns {Promise<pg.QueryResult>}
 */
export const query = (text, params = []) => {
  return pool.query(text, params);
};

/**
 * Runs an atomic database transaction
 * @param {Function} callback 
 */
export const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export default pool;
