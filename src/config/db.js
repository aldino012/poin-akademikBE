import { Sequelize } from "sequelize";

let sequelize;

if (process.env.NODE_ENV === "production") {
  sequelize = new Sequelize(
    process.env.MYSQL_DATABASE,
    process.env.MYSQL_USER,
    process.env.MYSQL_PASSWORD,
    {
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT || 3306,
      dialect: "mysql",
      logging: false,
    }
  );

  console.log("🚀 Running with Railway MySQL");
} else {
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
