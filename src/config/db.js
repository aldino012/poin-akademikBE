import dotenv from "dotenv";
import { Sequelize } from "sequelize";

dotenv.config();

let sequelize;

/**
 * ================================
 * PRIORITAS MUTLAK: POSTGRES (RAILWAY)
 * ================================
 */
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // wajib untuk Railway
      },
    },
  });

  console.log("🚀 Running with PostgreSQL (DATABASE_URL)");
} else {
  console.error("❌ DATABASE_URL not found");
  throw new Error("Database configuration is missing");
}

export default sequelize;
