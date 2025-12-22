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

// Routes
import mahasiswaRoutes from "./routes/mahasiswaRoutes.js";
import masterPoinRoutes from "./routes/masterpoinRoutes.js";
import klaimKegiatanRoutes from "./routes/klaimKegiatanRoutes.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5050;

// =================================================
// TRUST PROXY (WAJIB UNTUK COOKIE SECURE DI PROD)
// =================================================
app.set("trust proxy", 1);

// =================================================
// CORS CONFIG (AMAN UNTUK MOBILE + LAN + VERCEL)
// =================================================
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://poin-akademik-fe.vercel.app",
];

// regex untuk preview vercel
const vercelPreviewRegex = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

// regex untuk LAN (akses FE dari HP)
const lanRegex = /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:3000$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // request internal / curl / server-to-server
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      if (vercelPreviewRegex.test(origin)) {
        return callback(null, true);
      }

      if (lanRegex.test(origin)) {
        return callback(null, true);
      }

      console.warn("❌ CORS blocked origin:", origin);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ❌ JANGAN gunakan app.options("*", cors())
// Express 5 + Node 20 bisa crash

// =================================================
// MIDDLEWARE UTAMA
// =================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// =================================================
// TEST ROUTES
// =================================================
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "poin-akademikBE",
    env: process.env.NODE_ENV || "development",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    time: new Date().toISOString(),
  });
});

// =================================================
// API ROUTES
// =================================================
app.use("/api/auth", authRoutes);
app.use("/api/mahasiswa", mahasiswaRoutes);
app.use("/api/masterpoin", masterPoinRoutes);
app.use("/api/klaim", klaimKegiatanRoutes);

// =================================================
// STATIC FILES (UPLOADS)
// =================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// =================================================
// DB INIT + SERVER START
// =================================================
(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    await sequelize.sync({ alter: false, force: false });
    console.log("✅ Database synced");

    const adminExist = await User.findOne({
      where: { role: "admin" },
    });

    if (!adminExist) {
      const hashed = await bcrypt.hash(
        process.env.ADMIN_PASSWORD || "admin123",
        10
      );

      await User.create({
        nip: "1234567890",
        nama: "Admin Kemahasiswaan",
        email: "kemahasiswaan@kampus.ac.id",
        password: hashed,
        role: "admin",
      });

      console.log("✅ Admin default dibuat");
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Server crash:", err);
    process.exit(1);
  }
})();
