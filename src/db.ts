import "dotenv/config";
import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './db/schema';

type DbInstance = NeonHttpDatabase<typeof schema>;

if (!process.env["DATABASE_URL"]) {
  throw new Error("DATABASE_URL is required in environment variables");
}

const globalForDb = globalThis as typeof globalThis & {
  sql?: ReturnType<typeof neon>;
  db?: DbInstance;
};

const sql = globalForDb.sql ?? neon(process.env["DATABASE_URL"]);
const db = globalForDb.db ?? drizzle({ client: sql, schema });

if (process.env["NODE_ENV"] !== "production") {
  globalForDb.sql = sql;
  globalForDb.db = db;
}

export { db };