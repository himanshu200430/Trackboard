import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres@127.0.0.1:5433/tackboard',
});

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

