// ================================
// src/app.js
// ================================

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import sequelize from "./config/db.js";
import bcrypt from "bcryptjs";
import "./models/associations.js";
import User from "./models/userModel.js";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

// ================================
// ROUTES
// ================================
import mahasiswaRoutes from "./routes/mahasiswaRoutes.js";
import masterPoinRoutes from "./routes/masterpoinRoutes.js";
import klaimKegiatanRoutes from "./routes/klaimKegiatanRoutes.js";
import authRoutes from "./routes/authRoutes.js";

// ================================
// INIT
// ================================
dotenv.config();
const app = express();

// ================================
// TRUST PROXY (WAJIB DI CPANEL)
// ================================
app.set("trust proxy", 1);

// ================================
// CORS (AMAN UNTUK VERCEL)
// ================================
const FRONTEND_PROD = "https://poin-akademik-fe.vercel.app";
const vercelPreviewRegex =
  /^https:\/\/poin-akademik-[a-z0-9-]+-aldinos-projects-ea7e2f5e\.vercel\.app$/;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin === FRONTEND_PROD) return callback(null, true);
      if (vercelPreviewRegex.test(origin)) return callback(null, true);

      console.warn("❌ CORS blocked origin:", origin);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  }),
);

// ================================
// MIDDLEWARE
// ================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ================================
// TEST ROUTES (WAJIB ADA)
// ================================
app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "poin-akademikBE",
    env: process.env.NODE_ENV,
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    time: new Date().toISOString(),
  });
});

// ================================
// API ROUTES
// ================================
app.use("/api/auth", authRoutes);
app.use("/api/mahasiswa", mahasiswaRoutes);
app.use("/api/masterpoin", masterPoinRoutes);
app.use("/api/klaim", klaimKegiatanRoutes);

// ================================
// STATIC FILES
// ================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ================================
// DB INIT + SERVER START (CPANEL FIX)
// ================================
(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    await sequelize.sync({ alter: false, force: false });
    console.log("✅ Database synced");

    // ================================
    // CREATE DEFAULT ADMIN
    // ================================
    const adminExist = await User.findOne({ where: { role: "admin" } });

    if (!adminExist) {
      const adminPassword = process.env.ADMIN_PASSWORD || "nantidulumas";
      const hashed = await bcrypt.hash(adminPassword, 10);

      await User.create({
        nip: "0718128501",
        nama: "Admin Kemahasiswaan",
        email: "kemahasiswaan@kampus.ac.id",
        password: hashed,
        role: "admin",
      });

      console.log("✅ Admin default dibuat");
    }

    // ================================
    // START SERVER (INI KUNCI CPANEL)
    // ================================
    const PORT = process.env.PORT;

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Server crash:", err);
    process.exit(1);
  }
})();
