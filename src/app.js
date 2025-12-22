import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import sequelize from "./config/db.js";
import bcrypt from "bcryptjs";
import "./models/associations.js";
import User from "./models/userModel.js";
import cookieParser from "cookie-parser";
import path from "path";

// Routes
import mahasiswaRoutes from "./routes/mahasiswaRoutes.js";
import masterPoinRoutes from "./routes/masterPoinRoutes.js";
import klaimKegiatanRoutes from "./routes/klaimKegiatanRoutes.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

/* ======================
   CORS (DEV + PROD + VERCEL)
====================== */
const allowedOrigins = [
  "http://localhost:3000",
  "https://poin-akademikfe-production.up.railway.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow server-to-server / postman / curl
      if (!origin) return callback(null, true);

      // allow explicit origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // 🔥 allow ALL vercel preview & production domains
      if (origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }

      return callback(new Error("CORS not allowed"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 🔥 WAJIB: handle preflight
app.options("*", cors());

/* ======================
   Middleware
====================== */
app.use(express.json());
app.use(cookieParser());

/* ======================
   Test Routes
====================== */
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

/* ======================
   API Routes
====================== */
app.use("/api/auth", authRoutes);
app.use("/api/mahasiswa", mahasiswaRoutes);
app.use("/api/masterpoin", masterPoinRoutes);
app.use("/api/klaim", klaimKegiatanRoutes);

/* ======================
   Static Uploads
====================== */
app.use("/uploads", express.static(path.resolve("uploads")));

/* ======================
   DB Init + Seed
====================== */
(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    await sequelize.sync({ alter: false, force: false });
    console.log("✅ Database synced (no auto-alter)");

    const adminExist = await User.findOne({ where: { role: "admin" } });
    if (!adminExist) {
      const adminPass = process.env.ADMIN_PASSWORD || "admin123";
      const hashed = await bcrypt.hash(adminPass, 10);

      await User.create({
        nip: "1234567890",
        nama: "Admin Kemahasiswaan",
        email: "kemahasiswaan@kampus.ac.id",
        password: hashed,
        role: "admin",
      });

      console.log("✅ Admin default dibuat (nip: 1234567890 / pass: admin123)");
    } else {
      console.log("ℹ️ Admin sudah ada, skip seed.");
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Gagal konek ke database:", err);
    process.exit(1);
  }
})();
