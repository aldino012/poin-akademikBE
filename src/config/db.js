import dotenv from "dotenv";
import { Sequelize } from "sequelize";

dotenv.config();

let sequelize;

if (process.env.NODE_ENV === "production") {
  // ===== RAILWAY MYSQL =====
  sequelize = new Sequelize(
    process.env.MYSQLDATABASE,
    process.env.MYSQLUSER,
    process.env.MYSQLPASSWORD,
    {
      host: process.env.MYSQLHOST,
      port: process.env.MYSQLPORT,
      dialect: "mysql",
      logging: false,
    }
  );

  console.log("🚀 Connected to Railway MySQL");
} else {
  // ===== LOCAL MYSQL =====
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

  console.log("💻 Connected to Local MySQL");
}

export default sequelize;
