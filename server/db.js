const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: false,
});

pool.on("error", (err) => {
  console.error("Unexpected pool error:", err);
});

// Test connection on startup
pool.query("SELECT NOW()").then(() => {
  console.log("[DB] PostgreSQL connected");
}).catch((err) => {
  console.error("[DB] PostgreSQL connection failed:", err.message);
});

module.exports = pool;
