import dotenv from "dotenv";
import { Sequelize } from "sequelize";

dotenv.config();

/**
 * ================================
 * LOCAL DB (DEV ONLY)
 * ================================
 * Dipakai HANYA kalau DATABASE_URL tidak ada
 */
function buildFromLocalVars() {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
  const user = process.env.DB_USER;
  const pass = process.env.DB_PASS;
  const name = process.env.DB_NAME;

  if (!host || !user || !name) return null;

  return new Sequelize(name, user, pass, {
    host,
    port,
    dialect: "mysql",
    logging: false,
  });
}

let sequelize;

/**
 * ================================
 * PRIORITAS MUTLAK: DATABASE_URL
 * ================================
 * Railway, Render, Vercel, dll
 */
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "mysql",
    logging: false,
  });

  console.log("🚀 Running with DATABASE_URL");
} else {
  /**
   * ================================
   * FALLBACK: LOCAL ONLY
   * ================================
   */
  const local = buildFromLocalVars();

  if (local) {
    sequelize = local;
    console.log("💻 Running with local DB variables");
  } else {
    console.error("❌ Database env variables not found.");
    throw new Error("Database configuration is missing");
  }
}

export default sequelize;
