import { Sequelize } from "sequelize";

let sequelize;

/**
 * =========================
 * PRODUCTION (RAILWAY)
 * =========================
 * Railway SUDAH inject env sendiri:
 * MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT
 * ❌ JANGAN pakai dotenv di sini
 */
if (process.env.NODE_ENV === "production") {
  sequelize = new Sequelize(
    process.env.MYSQLDATABASE,
    process.env.MYSQLUSER,
    process.env.MYSQLPASSWORD,
    {
      host: process.env.MYSQLHOST,
      port: process.env.MYSQLPORT || 3306,
      dialect: "mysql",
      logging: false,
    }
  );

  console.log("🚀 Running with Railway MySQL");
}

/**
 * =========================
 * LOCAL (XAMPP / localhost)
 * =========================
 */
else {
  const dotenv = await import("dotenv");
  dotenv.default.config();

  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      dialect: "mysql",
      logging: false,
    }
  );

  console.log("💻 Running with local MySQL");
}

export default sequelize;
