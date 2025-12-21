import Mahasiswa from "../models/mahasiswaModel.js";
import User from "../models/userModel.js";
import KlaimKegiatan from "../models/klaimKegiatanModel.js";
import MasterPoin from "../models/masterpoinModel.js";
import { generateCVPdf } from "../utils/puppeteerCV.js";
import { google } from "googleapis";
import XLSX from "xlsx";

import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import {
  normalizeMahasiswaRow,
  normalizeExportRow,
} from "../controllers/FungsiFilter.js";

import {
  uploadToDrive,
  deleteFromDrive,
  bufferToTempFile,
  updateFile,
  deleteLocalFile,
  DRIVE_FOLDER_IMAGES,
} from "../utils/uploadToDrive.js";

// ======================================================
// ✅ GET SEMUA MAHASISWA (fix normalisasi angka)
// ======================================================
export const getAllMahasiswa = async (req, res) => {
  try {
    const raw = await Mahasiswa.findAll();

    const data = raw.map((m) => ({
      ...m.dataValues,

      // ❌ JANGAN KIRIM URL DRIVE
      foto: null,

      // ✅ KIRIM FILE ID SAJA
      foto_file_id: m.foto_file_id,

      total_poin: Number(m.total_poin) || 0,
      target_poin: Number(m.target_poin) || 0,
    }));

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ======================================================
// ✅ GET BIODATA MAHASISWA LOGIN
// ======================================================
export const getMahasiswaMe = async (req, res) => {
  try {
    const { nim, role } = req.user;

    if (role !== "mahasiswa") {
      return res
        .status(403)
        .json({ message: "Hanya mahasiswa yang dapat mengakses endpoint ini" });
    }

    const mhs = await Mahasiswa.findOne({ where: { nim } });
    if (!mhs) {
      return res.status(404).json({ message: "Mahasiswa tidak ditemukan" });
    }

    const result = {
      id: mhs.id_mhs,
      nim: mhs.nim,
      nama_mhs: mhs.nama_mhs,
      prodi: mhs.prodi,
      angkatan: mhs.angkatan,

      tempat_lahir: mhs.tempat_lahir,
      tgl_lahir: mhs.tgl_lahir,
      alamat: mhs.alamat,

      tlp_saya: mhs.tlp_saya,
      email: mhs.email,
      jenis_kelamin: mhs.jenis_kelamin,

      // 🔥 INI KUNCI UTAMA
      foto_file_id: mhs.foto_file_id || null,

      target_poin: Number(mhs.target_poin) || 0,
      total_poin: Number(mhs.total_poin) || 0,
    };

    return res.json({ message: "OK", data: result });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ======================================================
// ✅ GET MAHASISWA BY ID
// ======================================================
export const getMahasiswaById = async (req, res) => {
  try {
    const data = await Mahasiswa.findByPk(req.params.id);
    if (!data) return res.status(404).json({ message: "Mahasiswa not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getMahasiswaCV = async (req, res) => {
  try {
    const { id } = req.params;

    // =========================
    // AMBIL DATA MAHASISWA
    // =========================
    const mhs = await Mahasiswa.findByPk(id);
    if (!mhs) {
      return res.status(404).json({ message: "Mahasiswa not found" });
    }

    // =========================
    // AMBIL KEGIATAN DISETUJUI
    // =========================
    const kegiatan = await KlaimKegiatan.findAll({
      where: {
        mahasiswa_id: id,
        status: "disetujui", // ✅ lowercase sesuai DB
      },
      include: [
        {
          model: MasterPoin,
          as: "masterPoin",
        },
      ],
      order: [["tanggal_pelaksanaan", "DESC"]],
    });

    // =========================
    // FORMAT DATA KEGIATAN
    // =========================
    const formatData = kegiatan.map((item) => ({
      id: item.id,
      kode: item.masterPoin?.kode_keg || "",
      namaKegiatan:
        item.masterPoin?.nama_kegiatan ||
        item.masterPoin?.jenis_kegiatan ||
        item.rincian_acara ||
        "-",
      jenis: item.masterPoin?.jenis_kegiatan || "",
      posisi: item.masterPoin?.posisi || "-",
      tingkat: item.tingkat || "-",
      tanggal: item.tanggal_pelaksanaan,
      poin: Number(item.poin) || 0,
    }));

    // =========================
    // PREFIX FILTER
    // =========================
    const ORGANISASI_PREFIX = [
      "BEM",
      "UKM",
      "PIK",
      "OKS",
      "PKK",
      "PMS",
      "PNL",
      "MNT",
    ];
    const PRESTASI_PREFIX = ["MDB"];

    const organisasi = formatData.filter((item) =>
      ORGANISASI_PREFIX.some((p) => item.kode.toUpperCase().startsWith(p))
    );

    const prestasi = formatData.filter((item) =>
      PRESTASI_PREFIX.some((p) => item.kode.toUpperCase().startsWith(p))
    );

    // =========================
    // FORMAT TANGGAL INDONESIA
    // =========================
    const formatTanggalIndo = (dateStr) => {
      if (!dateStr) return "-";
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    };

    // =========================
    // BIODATA (INI KUNCI UTAMA)
    // =========================
    const biodata = {
      id_mhs: mhs.id_mhs,
      nim: mhs.nim,
      nama_mhs: mhs.nama_mhs,
      email: mhs.email,
      tlp_saya: mhs.tlp_saya,
      alamat: mhs.alamat,
      prodi: mhs.prodi,
      angkatan: mhs.angkatan,
      jenis_kelamin: mhs.jenis_kelamin,

      // 🔥 WAJIB ADA UNTUK FOTO CV
      foto_file_id: mhs.foto_file_id || null,

      // TTL siap pakai
      ttl: `${mhs.tempat_lahir || "-"}, ${formatTanggalIndo(mhs.tgl_lahir)}`,
    };

    return res.json({
      message: "OK",
      biodata,
      organisasi,
      prestasi,
    });
  } catch (err) {
    console.error("❌ getMahasiswaCV error:", err);
    res.status(500).json({ message: "Gagal mengambil data CV" });
  }
};


// ======================================================
// ✅ CREATE MAHASISWA + USER OTOMATIS (VERSI RINGKAS)
// ======================================================
export const createMahasiswa = async (req, res) => {
  try {
    const payload = req.body;

    // ================================
    // CEK DUPLIKAT NIM
    // ================================
    const exist = await Mahasiswa.findOne({
      where: { nim: payload.nim },
    });

    if (exist) {
      return res.status(400).json({
        message: "Validasi gagal",
        errors: {
          nim: "NIM sudah terdaftar",
        },
      });
    }

    // ================================
    // UPLOAD FOTO KE GOOGLE DRIVE
    // ================================
    let fotoFileId = null;

    if (req.file && req.file.buffer) {
      const tempFile = bufferToTempFile(req.file.buffer, req.file.originalname);

      const uploaded = await uploadToDrive(
        tempFile,
        req.file.mimetype,
        DRIVE_FOLDER_IMAGES
      );

      fotoFileId = uploaded.id;
      deleteLocalFile(tempFile);
    }

    // ================================
    // CREATE MAHASISWA
    // ================================
    const mahasiswa = await Mahasiswa.create({
      ...payload,
      tempat_lahir: payload.tempat_lahir || null,
      foto_file_id: fotoFileId,
      target_poin: Number(payload.target_poin) || 0,
      total_poin: Number(payload.total_poin) || 0,
    });

    // ================================
    // CREATE USER OTOMATIS
    // ================================
    const hashedPassword = await bcrypt.hash(mahasiswa.nim, 10);

    await User.create({
      nim: mahasiswa.nim,
      password: hashedPassword,
      role: "mahasiswa",
    });

    return res.status(201).json({
      message: "Mahasiswa & akun berhasil dibuat",
      mahasiswa,
    });
  } catch (err) {
    console.error("CREATE MAHASISWA ERROR:", err);

    return res.status(500).json({
      message: "Terjadi kesalahan server",
    });
  }
};


// ======================================================
// ✅ UPDATE MAHASISWA
// ======================================================
export const updateMahasiswa = async (req, res) => {
  try {
    // ===============================
    // AMBIL DATA MAHASISWA
    // ===============================
    const data = await Mahasiswa.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Mahasiswa tidak ditemukan",
      });
    }

    // ===============================
    // WHITELIST FIELD YANG BOLEH DIUPDATE
    // ===============================
    const allowedFields = [
      "nim",
      "nama_mhs",
      "prodi",
      "angkatan",
      "alamat",
      "asal_sekolah",
      "email",
      "jenis_kelamin",
      "tempat_lahir",
      "thn_lulus",
      "target_poin",
      "total_poin",
    ];

    let updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // ===============================
    // CEK DUPLIKAT NIM (JIKA DIUBAH)
    // ===============================
    if (updates.nim && updates.nim !== data.nim) {
      const exist = await Mahasiswa.findOne({
        where: { nim: updates.nim },
      });

      if (exist) {
        return res.status(400).json({
          message: "Validasi gagal",
          errors: {
            nim: "NIM sudah digunakan mahasiswa lain",
          },
        });
      }
    }

    // ===============================
    // 🔥 UPDATE FOTO (REPLACE / UPLOAD BARU)
    // ===============================
    if (req.file && req.file.buffer) {
      const tempFile = bufferToTempFile(req.file.buffer, req.file.originalname);

      if (data.foto_file_id) {
        // GANTI ISI FILE (ID TETAP)
        await updateFile(data.foto_file_id, tempFile, req.file.mimetype);

        updates.foto_file_id = data.foto_file_id;
      } else {
        // UPLOAD BARU
        const uploaded = await uploadToDrive(
          tempFile,
          req.file.mimetype,
          DRIVE_FOLDER_IMAGES
        );

        updates.foto_file_id = uploaded.id;
      }

      deleteLocalFile(tempFile);
    }

    // ===============================
    // NORMALISASI FIELD NUMERIC
    // ===============================
    if (updates.target_poin !== undefined) {
      updates.target_poin = Number(updates.target_poin);
    }

    if (updates.total_poin !== undefined) {
      updates.total_poin = Number(updates.total_poin);
    }

    // ===============================
    // SIMPAN KE DATABASE
    // ===============================
    await data.update(updates);

    const updated = await Mahasiswa.findByPk(req.params.id);

    return res.json({
      message: "Mahasiswa berhasil diupdate",
      mahasiswa: updated,
    });
  } catch (err) {
    console.error("UPDATE MAHASISWA ERROR:", err);

    return res.status(500).json({
      message: "Terjadi kesalahan server",
    });
  }
};


// ======================================================
// ✅ DELETE MAHASISWA
// ======================================================
export const deleteMahasiswa = async (req, res) => {
  try {
    const data = await Mahasiswa.findByPk(req.params.id);
    if (!data) {
      return res.status(404).json({ message: "Mahasiswa not found" });
    }

    // ============================
    // HAPUS FOTO DI GOOGLE DRIVE
    // (BEST-EFFORT, JANGAN BLOKIR)
    // ============================
    if (data.foto_file_id) {
      try {
        await deleteFromDrive(data.foto_file_id);
      } catch (err) {
        console.warn(
          "[INFO] Drive cleanup dilewati (akses terbatas):",
          data.foto_file_id
        );
      }
    }

    // ============================
    // HAPUS USER TERKAIT
    // ============================
    await User.destroy({ where: { nim: data.nim } });

    // ============================
    // HAPUS DATA MAHASISWA
    // ============================
    await data.destroy();

    return res.json({
      message:
        "Mahasiswa berhasil dihapus (file Drive dihapus jika memiliki akses)",
    });
  } catch (err) {
    console.error("DELETE MAHASISWA ERROR:", err);
    return res.status(500).json({ message: "Gagal menghapus mahasiswa" });
  }
};


// ======================================================
// ✅ GET KEGIATAN DETAIL UNTUK MODAL (ORGANISASI + PRESTASI + SEMUA)
// ======================================================
export const getMahasiswaKegiatan = async (req, res) => {
  try {
    const { id } = req.params;

    const mahasiswa = await Mahasiswa.findByPk(id);
    if (!mahasiswa) {
      return res.status(404).json({ message: "Mahasiswa tidak ditemukan" });
    }

    const kegiatan = await KlaimKegiatan.findAll({
      where: {
        mahasiswa_id: id,
        status: "disetujui", // 🔥 HANYA VALID
      },
      include: [
        {
          model: MasterPoin,
          as: "masterPoin",
        },
      ],
      order: [["tanggal_pelaksanaan", "DESC"]],
    });

    /* ================= FORMAT DATA ================= */
    const formatData = kegiatan.map((item) => ({
      id: item.id,
      kode: item.masterPoin?.kode_keg || "", // 🔥 KUNCI UTAMA
      namaKegiatan:
        item.masterPoin?.nama_kegiatan ||
        item.masterPoin?.jenis_kegiatan ||
        item.rincian_acara ||
        "-",
      jenis: item.masterPoin?.jenis_kegiatan || "",
      posisi: item.masterPoin?.posisi || "-",
      tingkat: item.tingkat || "-",
      tanggal: item.tanggal_pelaksanaan,
      poin: Number(item.poin) || 0,
    }));

    /* ================= PREFIX RESMI ================= */
    const ORGANISASI_PREFIX = [
      "BEM",
      "UKM",
      "PIK",
      "OKS",
      "PKK",
      "PMS",
      "PNL",
      "MNT",
    ];

    const PRESTASI_PREFIX = ["MDB"]; // 🔥 KHUSUS PRESTASI

    /* ================= FILTER ORGANISASI ================= */
    const organisasi = formatData.filter((item) =>
      ORGANISASI_PREFIX.some((p) => item.kode.toUpperCase().startsWith(p))
    );

    /* ================= FILTER PRESTASI ================= */
    const prestasi = formatData.filter((item) =>
      PRESTASI_PREFIX.some((p) => item.kode.toUpperCase().startsWith(p))
    );

    return res.json({
      message: "OK",
      organisasi,
      prestasi,
      kegiatan: formatData, // 🔥 semua kegiatan tetap ada
    });
  } catch (err) {
    console.error("❌ getMahasiswaKegiatan error:", err);
    res.status(500).json({
      message: "Gagal mengambil data kegiatan mahasiswa",
    });
  }
};

export const importMahasiswaExcel = async (req, res) => {
  try {
    // ======================================================
    //  VALIDASI FILE
    // ======================================================
    if (!req.file) {
      return res.status(400).json({ message: "File Excel belum diupload" });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: "File Excel kosong" });
    }

    let inserted = 0;
    let skipped = 0;

    // ======================================================
    //  LOOP DATA EXCEL
    // ======================================================
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];

      // ❗ WAJIB ADA NIM & NAMA
      if (!r.nim || !r.nama_mhs) {
        skipped++;
        continue;
      }

      // ======================================================
      //  NORMALISASI DATA (FILTER)
      // ======================================================
      const row = normalizeMahasiswaRow(r);

      // ❗ CEK DUPLIKAT NIM
      const exist = await Mahasiswa.findOne({ where: { nim: row.nim } });
      if (exist) {
        skipped++;
        continue;
      }

      // ======================================================
      //  GUARD TANGGAL (🔥 KUNCI HILANGKAN WARNING MOMENT)
      // ======================================================
      const safeTanggalLahir =
        row.tgl_lahir && /^\d{4}-\d{2}-\d{2}$/.test(row.tgl_lahir)
          ? row.tgl_lahir
          : null;

      // ======================================================
      //  SIMPAN DATA MAHASISWA
      // ======================================================
      const created = await Mahasiswa.create({
        nim: row.nim,
        nama_mhs: row.nama_mhs,
        prodi: row.prodi,
        angkatan: row.angkatan,

        tempat_lahir: row.tempat_lahir,
        tgl_lahir: safeTanggalLahir, // ✅ SUDAH AMAN

        target_poin: row.target_poin,
        total_poin: row.total_poin,

        pekerjaan: row.pekerjaan,
        alamat: row.alamat,
        asal_sekolah: row.asal_sekolah,
        thn_lulus: row.thn_lulus,

        tlp_saya: row.tlp_saya,
        tlp_rumah: row.tlp_rumah,

        email: row.email,
        jenis_kelamin: row.jenis_kelamin,

        foto: row.foto,
      });

      // ======================================================
      //  BUAT USER LOGIN (password = NIM)
      // ======================================================
      const userExist = await User.findOne({ where: { nim: row.nim } });

      if (!userExist) {
        const hashedPassword = await bcrypt.hash(row.nim.toString(), 10);

        await User.create({
          nim: row.nim,
          nama: row.nama_mhs,
          email: row.email,
          password: hashedPassword,
          role: "mahasiswa",
        });
      }

      inserted++;
    }

    // ======================================================
    //  HAPUS FILE SETELAH SELESAI
    // ======================================================
    fs.unlink(req.file.path, () => {});

    return res.json({
      message: "Import Mahasiswa selesai",
      total: rows.length,
      berhasil: inserted,
      gagal: skipped,
    });
  } catch (err) {
    console.error("IMPORT ERROR:", err);

    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }

    return res.status(500).json({ message: err.message });
  }
};

export const exportMahasiswaExcel = async (req, res) => {
  try {
    const data = await Mahasiswa.findAll();

    // =========================================================
    // NORMALISASI ROW MENGGUNAKAN FILTER
    // =========================================================
    const rows = data.map((m) => {
      const row = normalizeExportRow(m);

      // 🔥 Foto: hanya tampilkan nama file tanpa /uploads/
      if (row.foto) {
        row.foto = row.foto.replace("/uploads/", "").trim();
      } else {
        row.foto = ""; // excel tidak suka null
      }

      return row;
    });

    // =========================================================
    // BUAT SHEET XLSX
    // =========================================================
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Mahasiswa");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Mahasiswa_Export.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    return res.send(buffer);
  } catch (err) {
    console.error("❌ EXPORT ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const cetakCvPdf = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔥 Ambil data mahasiswa
    const mhs = await Mahasiswa.findByPk(id);

    if (!mhs) {
      return res.status(404).json({ message: "Mahasiswa tidak ditemukan" });
    }

    // 🔹 Normalisasi nama file
    const nim = mhs.nim;
    const nama = mhs.nama_mhs
      .toUpperCase()
      .replace(/\s+/g, "_") // spasi → _
      .replace(/[^A-Z0-9_]/g, ""); // hapus karakter aneh

    const filename = `CV_${nim}_${nama}.pdf`;

    // 🔥 URL halaman CV (print-only)
    const cvUrl = `http://localhost:3000/cv/${id}`;

    console.log("🖨️ Generate CV:", filename);
    console.log("🔗 From URL:", cvUrl);

    const pdfBuffer = await generateCVPdf(cvUrl);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    res.send(pdfBuffer);
  } catch (error) {
    console.error("❌ Gagal generate PDF:", error);
    res.status(500).json({
      message: "Gagal generate CV PDF",
    });
  }
};

// ===============================
// GOOGLE DRIVE CLIENT (SELERAS)
// ===============================
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(process.cwd(), "src/config/gdrive-service-account.json"),
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

// ===============================
// STREAM FOTO MAHASISWA (PRIVATE)
// ===============================
export const streamFotoMahasiswa = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({ message: "File ID tidak valid" });
    }

    const driveRes = await drive.files.get(
      {
        fileId,
        alt: "media",
        supportsAllDrives: true,
      },
      { responseType: "stream" }
    );

    // Header penting agar <img> bisa render
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "private, max-age=3600");

    driveRes.data.pipe(res);
  } catch (error) {
    console.error("Stream foto gagal:", error.message);
    res.status(404).end();
  }
};
