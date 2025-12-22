import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import Mahasiswa from "../models/mahasiswaModel.js";
import { Op } from "sequelize";

const JWT_SECRET = process.env.JWT_SECRET || "please-change-this";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

/* =================================================
   LOGIN (NIM / NIP)
================================================= */
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: "NIM/NIP dan password wajib diisi." });
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [{ nim: identifier }, { nip: identifier }],
      },
      include: { model: Mahasiswa },
    });

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Password salah." });
    }

    let mahasiswaId = null;

    if (user.role === "mahasiswa") {
      if (user.Mahasiswa?.id_mhs) {
        mahasiswaId = user.Mahasiswa.id_mhs;
      } else {
        const mhs = await Mahasiswa.findOne({
          where: { nim: user.nim },
        });
        mahasiswaId = mhs ? mhs.id_mhs : null;
      }
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        nim: user.nim,
        nip: user.nip,
        mahasiswa_id: mahasiswaId,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    /* =================================================
       COOKIE (WAJIB BEGINI UNTUK VERCEL)
    ================================================= */
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,        // ⬅ WAJIB (https)
      sameSite: "none",    // ⬅ WAJIB (cross-site)
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 hari
    });

    return res.json({
      message: "Login berhasil.",
      role: user.role,
      user: {
        id: user.id,
        nim: user.nim,
        nip: user.nip,
        nama: user.nama || user.Mahasiswa?.nama_mhs || "",
        email: user.email || user.Mahasiswa?.email || "",
        foto: user.Mahasiswa?.foto || null,
        total_poin: user.Mahasiswa?.total_poin || 0,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error saat login." });
  }
};

/* =================================================
   GET PROFILE
================================================= */
export const getProfile = async (req, res) => {
  try {
    const { role, nim, nip } = req.user;

    let data;
    if (role === "mahasiswa") {
      data = await Mahasiswa.findOne({ where: { nim } });
    } else {
      data = await User.findOne({ where: { nip } });
    }

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan." });
    }

    return res.json({
      message: "Profile ditemukan.",
      data,
    });
  } catch (err) {
    return res.status(500).json({ message: "Gagal mengambil profile." });
  }
};

/* =================================================
   CHANGE PASSWORD
================================================= */
export const changePassword = async (req, res) => {
  try {
    const { id } = req.user;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Old & new password wajib diisi." });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan." });
    }

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
      return res.status(401).json({ message: "Old password salah." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: "Password berhasil diubah." });
  } catch (err) {
    return res.status(500).json({ message: "Gagal mengganti password." });
  }
};

/* =================================================
   LOGOUT
================================================= */
export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    return res.json({ message: "Logout berhasil." });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ message: "Gagal logout." });
  }
};
