import { Pool, QueryArrayConfig } from "pg";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

if (
  process.env.PGHOST === undefined ||
  process.env.PGUSER === undefined ||
  process.env.PGPASSWORD == undefined
) {
  throw new Error("Missing database environment variables");
}

process.env.PGHOST = fs.existsSync(process.env.PGHOST)
  ? fs.readFileSync(process.env.PGHOST, "utf-8").trim()
  : process.env.PGHOST;
process.env.PGUSER = fs.existsSync(process.env.PGUSER)
  ? fs.readFileSync(process.env.PGUSER, "utf-8").trim()
  : process.env.PGUSER;
process.env.PGPASSWORD = fs.existsSync(process.env.PGPASSWORD)
  ? fs.readFileSync(process.env.PGPASSWORD, "utf-8").trim()
  : process.env.PGPASSWORD;

// pools will use environment variables
// for connection information
const pool = new Pool({
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.query(
  "CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, display_name TEXT, password TEXT, role TEXT);"
);

export const query = async (
  text: string | QueryArrayConfig<any>,
  params: string[]
) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log("executed query", { text, duration, rows: res.rowCount });
  return res;
};
