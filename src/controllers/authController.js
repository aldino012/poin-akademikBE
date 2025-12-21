import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import Mahasiswa from "../models/mahasiswaModel.js";
import { Op } from "sequelize";

const JWT_SECRET = process.env.JWT_SECRET || "please-change-this";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

// 🔹 LOGIN (bisa pakai NIM atau NIP)
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

    if (!user)
      return res.status(404).json({ message: "User tidak ditemukan." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Password salah." });

    let mahasiswaId = null;

    // jika role mahasiswa, pastikan kita punya id_mhs
    if (user.role === "mahasiswa") {
      if (user.Mahasiswa && user.Mahasiswa.id_mhs) {
        mahasiswaId = user.Mahasiswa.id_mhs;
      } else {
        const m = await Mahasiswa.findOne({ where: { nim: user.nim } });
        mahasiswaId = m ? m.id_mhs : null;
      }
    }

    // Buat token JWT
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

    // Set token sebagai httpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 hari
      sameSite: "lax",
    });

    res.json({
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
    res.status(500).json({ message: err.message });
  }
};  

// 🔹 GET PROFILE (berdasarkan token)
export const getProfile = async (req, res) => {
  try {
    const { role, nim, nip } = req.user;

    let data;
    if (role === "mahasiswa") {
      data = await Mahasiswa.findOne({ where: { nim } });
    } else {
      data = await User.findOne({ where: { nip } });
    }   

    if (!data)
      return res.status(404).json({ message: "Data tidak ditemukan." });

    res.json({ message: "Profile ditemukan.", data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔹 GANTI PASSWORD
export const changePassword = async (req, res) => {
  try {
    const { id } = req.user;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword)
      return res
        .status(400)
        .json({ message: "Old & new password wajib diisi." });

    const user = await User.findByPk(id);
    if (!user)
      return res.status(404).json({ message: "User tidak ditemukan." });

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(401).json({ message: "Old password salah." });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password berhasil diubah." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 🔹 LOGOUT
export const logout = async (req, res) => {
  try {
    // Kalau nanti pakai cookie jwt, ini kepake
    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    return res.status(200).json({ message: "Logout berhasil (JWT removed)." });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ message: "Gagal logout." });
  }
};

