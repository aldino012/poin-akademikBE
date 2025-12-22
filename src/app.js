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

// Penting untuk Railway / reverse proxy (cookies, ip, https)
app.set("trust proxy", 1);

// ======================
// CORS (VERCEL + RAILWAY FIX)
// ======================
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",

  // domain vercel production kamu (isi yang bener)
  "https://poin-akademik-fe.vercel.app",

  // kalau kamu pakai domain preview tertentu, boleh tambah manual:
  // "https://poin-akademik-a13z5put-aldinos-projects-ea7e2f5e.vercel.app",
];

// izinkan semua subdomain vercel preview: https://xxxxx.vercel.app
const vercelPreviewRegex = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

const corsOptions = {
  origin: (origin, callback) => {
    // Postman / server-to-server tidak punya origin
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (vercelPreviewRegex.test(origin)) return callback(null, true);

    console.log("❌ CORS blocked origin:", origin);
    // Jangan lempar error ke preflight, cukup tolak dengan callback(null,false)
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
// preflight harus aman
app.options("*", cors(corsOptions));

// ======================
// Middleware
// ======================
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ======================
// Test Routes
// ======================
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "poin-akademikBE",
    env: process.env.NODE_ENV,
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    time: new Date().toISOString(),
  });
});

// ======================
// API Routes
// ======================
app.use("/api/auth", authRoutes);
app.use("/api/mahasiswa", mahasiswaRoutes);
app.use("/api/masterpoin", masterPoinRoutes);
app.use("/api/klaim", klaimKegiatanRoutes);

// ======================
// Static uploads
// ======================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// pastikan folder uploads memang ada di root project (sesuai struktur kamu)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ======================
// 404 handler (biar jelas)
// ======================
app.use((req, res) => {
  res.status(404).json({
    message: "Not Found",
    path: req.originalUrl,
  });
});

// ======================
// Error handler (biar error kebaca di log railway)
// ======================
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "production" ? "SERVER_ERROR" : err.message,
  });
});

// ======================
// DB Init + Server
// ======================
(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    await sequelize.sync({ alter: false, force: false });
    console.log("✅ Database synced");

    const adminExist = await User.findOne({ where: { role: "admin" } });

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
