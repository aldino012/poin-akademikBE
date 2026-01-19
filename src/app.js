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
// TRUST PROXY (WAJIB UNTUK RAILWAY + COOKIE SECURE)
// =================================================
app.set("trust proxy", 1);

// =================================================
// CORS (FINAL – NO THROW ERROR)
// =================================================
const FRONTEND_PROD = "https://poin-akademik-fe.vercel.app";
const vercelPreviewRegex =
  /^https:\/\/poin-akademik-[a-z0-9-]+-aldinos-projects-ea7e2f5e\.vercel\.app$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // allow server-to-server / curl
      if (!origin) return callback(null, true);

      if (origin === FRONTEND_PROD) {
        return callback(null, origin);
      }

      if (vercelPreviewRegex.test(origin)) {
        return callback(null, origin);
      }

      console.warn("❌ CORS blocked origin:", origin);
      return callback(null, false); // ⬅️ PENTING (JANGAN THROW ERROR)
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204, // 🔥 penting untuk mobile & safari
  })
);

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
    env: process.env.NODE_ENV,
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
// STATIC FILES
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
        process.env.ADMIN_PASSWORD || "nantidulumas",
        10,
      );

      await User.create({
        nip: " 0718128501",
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
