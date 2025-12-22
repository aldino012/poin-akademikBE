// src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import Mahasiswa from "../models/mahasiswaModel.js";

const JWT_SECRET = process.env.JWT_SECRET || "please-change-this";

/* =================================================
   AUTH MIDDLEWARE (COOKIE + HEADER SAFE)
================================================= */
export const authMiddleware = async (req, res, next) => {
  try {
    // =================================================
    // Ambil token (prioritas COOKIE)
    // =================================================
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: token tidak ditemukan.",
      });
    }

    // =================================================
    // Verify token
    // =================================================
    const decoded = jwt.verify(token, JWT_SECRET);

    // =================================================
    // Set req.user dari JWT
    // =================================================
    req.user = {
      id: decoded.id,
      role: decoded.role,
      nim: decoded.nim,
      nip: decoded.nip,
      mahasiswa_id: decoded.mahasiswa_id || null,
    };

    // =================================================
    // Fallback: fetch mahasiswa_id jika belum ada
    // =================================================
    if (req.user.role === "mahasiswa" && !req.user.mahasiswa_id) {
      try {
        const user = await User.findByPk(req.user.id, {
          include: { model: Mahasiswa },
        });

        req.user.mahasiswa_id = user?.Mahasiswa?.id_mhs || null;
      } catch (e) {
        console.warn("⚠️ authMiddleware fallback mahasiswa gagal:", e.message);
        req.user.mahasiswa_id = null;
      }
    }

    next();
  } catch (err) {
    console.error("❌ authMiddleware error:", err.message);
    return res.status(403).json({
      success: false,
      message: "Token tidak valid atau sudah kadaluarsa.",
    });
  }
};

/* =================================================
   ADMIN ONLY
================================================= */
export const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Harus login dulu.",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Akses ditolak. Khusus admin.",
    });
  }

  next();
};

/* =================================================
   MAHASISWA ONLY
================================================= */
export const mahasiswaOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Harus login dulu.",
    });
  }

  if (req.user.role !== "mahasiswa") {
    return res.status(403).json({
      success: false,
      message: "Akses ditolak. Khusus mahasiswa.",
    });
  }

  next();
};
