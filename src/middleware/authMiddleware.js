// src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import Mahasiswa from "../models/mahasiswaModel.js"; // tambahkan import

const JWT_SECRET = process.env.JWT_SECRET || "please-change-this";

export const authMiddleware = async (req, res, next) => {
  let token =
    req.cookies.token ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null);

  if (!token) {
    return res.status(401).json({ message: "Harus login dulu." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // set user dari decoded dulu
    req.user = {
      id: decoded.id,
      role: decoded.role,
      nim: decoded.nim,
      nip: decoded.nip,
      mahasiswa_id: decoded.mahasiswa_id || null,
    };

    // fallback: jika role mahasiswa tapi mahasiswa_id belum ada, fetch dari DB
    if (req.user.role === "mahasiswa" && !req.user.mahasiswa_id) {
      try {
        const user = await User.findByPk(req.user.id, {
          include: { model: Mahasiswa }, // memakai association
        });
        req.user.mahasiswa_id = user?.Mahasiswa?.id_mhs || null;
      } catch (e) {
        console.warn(
          "authMiddleware: gagal fetch Mahasiswa fallback",
          e.message
        );
        req.user.mahasiswa_id = null;
      }
    }

    next();
  } catch (err) {
    return res
      .status(403)
      .json({ message: "Token tidak valid atau kadaluarsa." });
  }
};



// 🔹 Middleware khusus admin
export const adminOnly = (req, res, next) => {
  if (!req.user)
    return res.status(401).json({
      success: false,
      message: "Harus login dulu.",
    });

  if (req.user.role !== "admin")
    return res.status(403).json({
      success: false,
      message: "Akses ditolak. Hanya admin yang bisa melakukan aksi ini.",
    });

  next();
};

// 🔹 Middleware khusus mahasiswa
export const mahasiswaOnly = (req, res, next) => {
  if (!req.user)
    return res.status(401).json({
      success: false,
      message: "Harus login dulu.",
    });

  if (req.user.role !== "mahasiswa")
    return res.status(403).json({
      success: false,
      message: "Akses ditolak. Hanya mahasiswa yang bisa melakukan aksi ini.",
    });

  next();
};
