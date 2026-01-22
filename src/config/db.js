import dotenv from "dotenv";
import { Sequelize } from "sequelize";

dotenv.config();

// Cek apakah Railway menyediakan DATABASE_URL (biasanya PostgreSQL/MySQL plugin)
const isRailway = !!process.env.DATABASE_URL;

let sequelize;

if (isRailway) {
  // 🌐 Mode Railway (pakai database bawaan Railway)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: process.env.DB_DIALECT || "mysql",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    logging: false,
  });
  console.log("🚀 Running with Railway database");
} else {
  // 💻 Mode lokal (pakai XAMPP / localhost)
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      dialect: process.env.DB_DIALECT,
      port: process.env.DB_PORT || 3306,
      logging: false,
    },
  );
  console.log("💻 Running with local database");
}

export default sequelize;
