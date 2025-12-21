import dotenv from "dotenv";
import { Sequelize } from "sequelize";

dotenv.config();

function buildFromMysqlVars() {
  const host = process.env.MYSQLHOST;
  const port = process.env.MYSQLPORT ? Number(process.env.MYSQLPORT) : 3306;
  const user = process.env.MYSQLUSER;
  const pass = process.env.MYSQLPASSWORD;
  const name = process.env.MYSQLDATABASE;

  if (!host || !user || !name) return null;

  return new Sequelize(name, user, pass, {
    host,
    port,
    dialect: "mysql",
    logging: false,
    // Railway internal network biasanya tidak butuh SSL.
    // Kalau nanti kamu pakai provider yang butuh SSL, baru kita aktifkan.
  });
}

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
    dialect: process.env.DB_DIALECT || "mysql",
    logging: false,
  });
}

let sequelize;

// 1) Kalau Railway kasih DATABASE_URL
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: process.env.DB_DIALECT || "mysql",
    logging: false,
  });
  console.log("🚀 Running with DATABASE_URL");
} else {
  // 2) Railway MySQL plugin vars
  const railwayMysql = buildFromMysqlVars();
  if (railwayMysql) {
    sequelize = railwayMysql;
    console.log("🚀 Running with Railway MySQL variables");
  } else {
    // 3) Lokal
    const local = buildFromLocalVars();
    if (local) {
      sequelize = local;
      console.log("💻 Running with local DB variables");
    } else {
      console.log("❌ Database env variables not found. Check Railway Variables.");
      // Biar jelas fail-nya
      throw new Error("Database configuration is missing");
    }
  }
}

export default sequelize;
