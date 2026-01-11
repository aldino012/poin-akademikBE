// src/controllers/klaimKegiatanController.js
import KlaimKegiatan from "../models/klaimKegiatanModel.js";
import Mahasiswa from "../models/mahasiswaModel.js";
import MasterPoin from "../models/masterpoinModel.js";
import db from "../config/db.js";
import XLSX from "xlsx";
import { Op } from "sequelize";

import {
  uploadToDrive,
  bufferToTempFile,
  deleteLocalFile,
  deleteFromDrive,
  DRIVE_FOLDER_FILES,
  streamFileFromDrive,
} from "../utils/uploadToDrive.js";

// ===============================
// CREATE KLAIM (Mahasiswa)
// ===============================
export const createKlaim = async (req, res) => {
  try {
    console.log("\n================= [CREATE KLAIM] =================");
    console.log("[CREATE] user:", {
      role: req.user?.role,
      mahasiswa_id: req.user?.mahasiswa_id,
    });
    console.log("[CREATE] body keys:", Object.keys(req.body || {}));
    console.log("[CREATE] req.file exists:", !!req.file);

    if (req.file) {
      console.log("[CREATE] file meta:", {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        hasBuffer: !!req.file.buffer,
      });
    }

    const mahasiswa_id = req.user?.mahasiswa_id;

    if (!mahasiswa_id) {
      console.warn("[CREATE] mahasiswa_id tidak ditemukan di token");
      return res.status(401).json({
        message: "Token tidak valid (mahasiswa_id tidak ditemukan)",
      });
    }

    const {
      masterpoin_id,
      periode_pengajuan,
      tanggal_pengajuan,
      rincian_acara,
      tingkat,
      tempat,
      tanggal_pelaksanaan,
      mentor,
      narasumber,
    } = req.body;

    if (
      !masterpoin_id ||
      !periode_pengajuan ||
      !tanggal_pengajuan ||
      !rincian_acara ||
      !tingkat ||
      !tempat ||
      !tanggal_pelaksanaan
    ) {
      console.warn("[CREATE] validasi field gagal:", {
        masterpoin_id: !!masterpoin_id,
        periode_pengajuan: !!periode_pengajuan,
        tanggal_pengajuan: !!tanggal_pengajuan,
        rincian_acara: !!rincian_acara,
        tingkat: !!tingkat,
        tempat: !!tempat,
        tanggal_pelaksanaan: !!tanggal_pelaksanaan,
      });
      return res.status(400).json({ message: "Semua field wajib diisi." });
    }

    // ===============================
    // UPLOAD BUKTI KE GOOGLE DRIVE
    // ===============================
    if (!req.file) {
      console.warn(
        "[CREATE] req.file kosong -> frontend kemungkinan salah formData key / multer"
      );
      return res
        .status(400)
        .json({ message: "File bukti kegiatan wajib diupload" });
    }

    console.log("[CREATE] mulai bufferToTempFile...");
    const tempFile = bufferToTempFile(req.file.buffer, req.file.originalname);
    console.log("[CREATE] tempFile path:", tempFile);

    console.log("[CREATE] mulai uploadToDrive...", {
      folder: DRIVE_FOLDER_FILES,
      mimetype: req.file.mimetype,
    });

    const uploaded = await uploadToDrive(
      tempFile,
      req.file.mimetype,
      DRIVE_FOLDER_FILES
    );

    console.log("[CREATE] uploadToDrive sukses:", uploaded);

    // 🔥 SIMPAN FILE ID SAJA
    const buktiFileId = uploaded.id;

    deleteLocalFile(tempFile);
    console.log("[CREATE] deleteLocalFile done");

    // ===============================
    // VALIDASI DATA
    // ===============================
    const mahasiswa = await Mahasiswa.findByPk(mahasiswa_id);
    if (!mahasiswa) {
      console.warn("[CREATE] Mahasiswa tidak ditemukan:", mahasiswa_id);
      return res.status(400).json({ message: "Mahasiswa tidak ditemukan" });
    }

    const master = await MasterPoin.findByPk(masterpoin_id);
    if (!master) {
      console.warn("[CREATE] Master poin tidak ditemukan:", masterpoin_id);
      return res.status(400).json({ message: "Master poin tidak ditemukan" });
    }

    // ===============================
    // SIMPAN KLAIM
    // ===============================
    const klaim = await KlaimKegiatan.create({
      mahasiswa_id,
      masterpoin_id,
      periode_pengajuan,
      tanggal_pengajuan,
      rincian_acara,
      tingkat,
      tempat,
      tanggal_pelaksanaan,
      mentor,
      narasumber,
      bukti_file_id: buktiFileId,
      poin: master.bobot_poin,
      status: "Diajukan",
    });

    console.log("[CREATE] klaim created:", {
      id: klaim.id,
      bukti_file_id: klaim.bukti_file_id,
    });
    console.log("=================================================\n");

    return res.status(201).json({
      message: "Klaim berhasil dibuat",
      data: klaim,
    });
  } catch (err) {
    console.error("CREATE KLAIM ERROR:", err);
    console.error("=================================================\n");
    return res.status(500).json({ message: err.message });
  }
};

// ===============================
// GET ALL KLAIM
// ===============================
export const getAllKlaim = async (req, res) => {
  try {
    const role = req.user.role;
    const whereCondition = {};

    if (role === "mahasiswa") {
      if (!req.user.mahasiswa_id) {
        return res.status(403).json({
          success: false,
          message: "Mahasiswa ID tidak ditemukan.",
        });
      }
      whereCondition.mahasiswa_id = req.user.mahasiswa_id;
    }

    if (role !== "admin" && role !== "mahasiswa") {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
    }

    const data = await KlaimKegiatan.findAll({
      where: whereCondition,
      include: [
        {
          model: Mahasiswa,
          as: "mahasiswa",
          attributes: [
            "id_mhs",
            "nim",
            "nama_mhs",
            "angkatan",
            "prodi",
            "foto_file_id",
            "total_poin",
          ],
        },
        {
          model: MasterPoin,
          as: "masterPoin",
          attributes: ["id_poin", "kode_keg", "jenis_kegiatan", "bobot_poin"],
        },
      ],
      order: [["id", "DESC"]],
    });

    return res.json({
      success: true,
      message: "Data klaim berhasil diambil.",
      total: data.length,
      data,
    });
  } catch (err) {
    console.error("ERROR getAllKlaim:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ===============================
// GET KLAIM BY ID
// ===============================
export const getKlaimById = async (req, res) => {
  try {
    const { id } = req.params;

    const klaim = await KlaimKegiatan.findByPk(id, {
      include: [
        {
          model: Mahasiswa,
          as: "mahasiswa",
          attributes: ["id_mhs", "nim", "nama_mhs"],
        },
        {
          model: MasterPoin,
          as: "masterPoin",
          attributes: ["id_poin", "kode_keg", "jenis_kegiatan", "bobot_poin"],
        },
      ],
    });

    if (!klaim) {
      return res.status(404).json({ message: "Klaim tidak ditemukan." });
    }

    // mahasiswa hanya boleh melihat klaim miliknya sendiri
    if (
      req.user.role === "mahasiswa" &&
      klaim.mahasiswa_id !== req.user.mahasiswa_id
    ) {
      return res.status(403).json({ message: "Akses klaim ditolak." });
    }

    res.json({ message: "Data klaim ditemukan.", data: klaim });
  } catch (err) {
    console.error("ERROR getKlaimById:", err);
    res.status(500).json({ message: err.message });
  }
};

// ===============================
// UPDATE KLAIM (Mahasiswa revisi)
// ===============================
export const updateKlaim = async (req, res) => {
  try {
    console.log("\n================= [UPDATE KLAIM] =================");
    console.log("[UPDATE] params:", req.params);
    console.log("[UPDATE] user:", {
      role: req.user?.role,
      mahasiswa_id: req.user?.mahasiswa_id,
    });
    console.log("[UPDATE] body keys:", Object.keys(req.body || {}));
    console.log("[UPDATE] req.file exists:", !!req.file);

    if (req.file) {
      console.log("[UPDATE] file meta:", {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        hasBuffer: !!req.file.buffer,
      });
    }

    const { id } = req.params;

    const klaim = await KlaimKegiatan.findByPk(id);
    if (!klaim) {
      console.warn("[UPDATE] Klaim tidak ditemukan:", id);
      return res.status(404).json({ message: "Klaim tidak ditemukan." });
    }

    console.log("[UPDATE] klaim found:", {
      id: klaim.id,
      status: klaim.status,
      mahasiswa_id: klaim.mahasiswa_id,
      bukti_file_id: klaim.bukti_file_id,
    });

    // ===============================
    // VALIDASI AKSES
    // ===============================
    if (req.user.role !== "mahasiswa") {
      console.warn("[UPDATE] role bukan mahasiswa:", req.user.role);
      return res.status(403).json({
        message: "Hanya mahasiswa yang boleh update klaim ini.",
      });
    }

    if (klaim.mahasiswa_id !== req.user.mahasiswa_id) {
      console.warn(
        "[UPDATE] akses ditolak - klaim.mahasiswa_id != req.user.mahasiswa_id",
        {
          klaim_mahasiswa_id: klaim.mahasiswa_id,
          user_mahasiswa_id: req.user.mahasiswa_id,
        }
      );
      return res.status(403).json({ message: "Akses ditolak." });
    }

    if (klaim.status !== "Revisi") {
      console.warn("[UPDATE] status bukan Revisi:", klaim.status);
      return res.status(400).json({
        message: "Hanya klaim berstatus Revisi yang boleh diperbarui.",
      });
    }

    // ===============================
    // FIELD YANG BOLEH DIUBAH
    // ===============================
    const allowed = [
      "periode_pengajuan",
      "tanggal_pengajuan",
      "rincian_acara",
      "tingkat",
      "tempat",
      "tanggal_pelaksanaan",
      "mentor",
      "narasumber",
    ];

    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    });

    console.log("[UPDATE] updates fields:", updates);

    // ===============================
    // 🔥 REPLACE BUKTI KLAIM
    // ===============================
    if (req.file && req.file.buffer) {
      console.log("[UPDATE] mulai replace bukti...");

      // 1️⃣ HAPUS FILE LAMA DI GOOGLE DRIVE
      if (klaim.bukti_file_id) {
        console.log("[UPDATE] deleteFromDrive old file:", klaim.bukti_file_id);
        const deleted = await deleteFromDrive(klaim.bukti_file_id);
        console.log("[UPDATE] deleteFromDrive result:", deleted);

        if (!deleted) {
          console.warn(
            "[INFO] File lama tidak ditemukan / sudah terhapus:",
            klaim.bukti_file_id
          );
        }
      } else {
        console.log(
          "[UPDATE] tidak ada bukti_file_id lama, langsung upload baru"
        );
      }

      // 2️⃣ BUFFER → TEMP FILE
      const tempFile = bufferToTempFile(req.file.buffer, req.file.originalname);
      console.log("[UPDATE] tempFile path:", tempFile);

      // 3️⃣ UPLOAD FILE BARU
      console.log("[UPDATE] uploadToDrive...", {
        folder: DRIVE_FOLDER_FILES,
        mimetype: req.file.mimetype,
      });

      const uploaded = await uploadToDrive(
        tempFile,
        req.file.mimetype,
        DRIVE_FOLDER_FILES
      );

      console.log("[UPDATE] uploadToDrive sukses:", uploaded);

      // 4️⃣ SIMPAN FILE ID BARU
      updates.bukti_file_id = uploaded.id;
      console.log("[UPDATE] new bukti_file_id:", updates.bukti_file_id);

      // 5️⃣ HAPUS FILE TEMP LOKAL
      deleteLocalFile(tempFile);
      console.log("[UPDATE] deleteLocalFile done");
    } else {
      console.log(
        "[UPDATE] tidak ada file baru di request (req.file kosong) -> tidak replace bukti"
      );
    }

    // ===============================
    // RESET STATUS & CATATAN
    // ===============================
    updates.status = "Diajukan ulang";
    updates.catatan = null;

    console.log("[UPDATE] final updates:", updates);

    // ===============================
    // SIMPAN KE DATABASE
    // ===============================
    await klaim.update(updates);

    console.log("[UPDATE] klaim updated:", {
      id: klaim.id,
      bukti_file_id: klaim.bukti_file_id,
      status: klaim.status,
    });
    console.log("=================================================\n");

    return res.json({
      message: "Klaim berhasil diperbarui dan diajukan ulang.",
      data: klaim,
    });
  } catch (err) {
    console.error("ERROR updateKlaim:", err);
    console.error("=================================================\n");
    return res.status(500).json({ message: err.message });
  }
};


// ===============================
// ADMIN APPROVAL
// ===============================
export const approveKlaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, catatan } = req.body;

    const allowedStatus = ["Disetujui", "Ditolak", "Revisi"];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: "Status tidak valid." });
    }

    const klaim = await KlaimKegiatan.findByPk(id);
    if (!klaim) {
      return res.status(404).json({ message: "Klaim tidak ditemukan." });
    }

    // FINAL status — tidak boleh diubah lagi
    if (klaim.status === "Disetujui" || klaim.status === "Ditolak") {
      return res.status(403).json({
        message: "Status sudah final dan tidak dapat diubah kembali.",
      });
    }

    // Catatan wajib untuk Revisi & Ditolak
    if ((status === "Revisi" || status === "Ditolak") && !catatan) {
      return res.status(400).json({
        message: "Catatan wajib diisi untuk status Revisi atau Ditolak.",
      });
    }

    // Status = Disetujui → Tambah poin hanya sekali
    if (status === "Disetujui") {
      const mahasiswa = await Mahasiswa.findByPk(klaim.mahasiswa_id);

      mahasiswa.total_poin = (mahasiswa.total_poin || 0) + (klaim.poin || 0);

      await mahasiswa.save();
      klaim.catatan = null;
    }

    // Update status & catatan
    klaim.status = status;
    if (status === "Revisi" || status === "Ditolak") {
      klaim.catatan = catatan;
    }

    await klaim.save();

    return res.json({
      success: true,
      message: `Klaim diupdate menjadi ${klaim.status}.`,
      data: klaim,
    });
  } catch (err) {
    console.error("ERROR approveKlaim:", err);
    return res.status(500).json({ message: err.message });
  }
};

// ===============================
// DELETE KLAIM
// ===============================
export const deleteKlaim = async (req, res) => {
  try {
    const { id } = req.params;

    const klaim = await KlaimKegiatan.findByPk(id);
    if (!klaim) {
      return res.status(404).json({ message: "Klaim tidak ditemukan." });
    }

    // ===============================
    // HAPUS FILE DI GOOGLE DRIVE
    // ===============================
    if (klaim.bukti_file_id) {
      try {
        await deleteFromDrive(klaim.bukti_file_id);
      } catch (err) {
        console.warn(
          "Gagal menghapus file Drive:",
          klaim.bukti_file_id,
          err.message
        );
      }
    }

    // ===============================
    // HAPUS DATA DB
    // ===============================
    await klaim.destroy();

    return res.json({
      success: true,
      message: "Klaim dan file bukti berhasil dihapus.",
    });
  } catch (err) {
    console.error("ERROR deleteKlaim:", err);
    return res.status(500).json({ message: err.message });
  }
};

// ===============================
// STREAM/VIEW BUKTI KLAIM (Mahasiswa/Admin)
// ===============================
export const streamBuktiKlaim = async (req, res) => {
  try {
    const { id } = req.params;

    const klaim = await KlaimKegiatan.findByPk(id);
    if (!klaim) {
      return res.status(404).json({ message: "Klaim tidak ditemukan." });
    }

    // mahasiswa hanya boleh akses bukti miliknya
    if (
      req.user.role === "mahasiswa" &&
      klaim.mahasiswa_id !== req.user.mahasiswa_id
    ) {
      return res.status(403).json({ message: "Akses ditolak." });
    }

    if (!klaim.bukti_file_id) {
      return res.status(404).json({ message: "Bukti tidak tersedia." });
    }

    // 🔥 STREAM DARI HELPER (BUKAN drive langsung)
    const { stream, headers } = await streamFileFromDrive(klaim.bukti_file_id);

    res.setHeader(
      "Content-Type",
      headers["content-type"] || "application/octet-stream"
    );

    res.setHeader("Content-Disposition", "inline");

    stream.on("error", (err) => {
      console.error("STREAM DRIVE ERROR:", err);
      if (!res.headersSent) {
        res.status(500).end("Gagal stream file");
      }
    });

    stream.pipe(res);
  } catch (err) {
    console.error("STREAM BUKTI ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};

const parseTanggalIndonesia = (value) => {
  if (!value) return null;

  // 🔥 Kalau Excel kirim Date object
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const bulanMap = {
    januari: "01",
    februari: "02",
    maret: "03",
    april: "04",
    mei: "05",
    juni: "06",
    juli: "07",
    agustus: "08",
    september: "09",
    oktober: "10",
    november: "11",
    desember: "12",
  };

  const cleaned = value.toString().toLowerCase().replace(/\s+/g, " ").trim();
  const parts = cleaned.split(" ");

  if (parts.length < 3) return null;

  const day = parts[0];
  const monthStr = parts[1];
  const year = parts[2];

  const month = bulanMap[monthStr];
  if (!month) return null;

  return `${year}-${month}-${day.padStart(2, "0")}`;
};

// ===============================
// IMPORT KLAIM DARI EXCEL (ADMIN)
// ===============================
export const importKlaimExcel = async (req, res) => {
  console.log("\n================= [IMPORT EXCEL] =================");

  if (!req.file || !req.file.buffer) {
    return res.status(400).json({
      message: "File Excel wajib diupload",
    });
  }

  const normalize = (str) =>
    String(str).replace(/\s+/g, " ").trim().toLowerCase();

  const success = [];
  const failed = [];

  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rowsRaw = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: true,
    });

    // 🔥 FILTER HANYA BARIS YANG ADA NIM
    const rows = rowsRaw.filter(
      (row) => row["NIM"] && String(row["NIM"]).trim() !== ""
    );

    console.log("[IMPORT] total rows valid:", rows.length);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const excelRow = i + 2;
      const transaction = await db.transaction();

      try {
        // ===============================
        // NIM
        // ===============================
        const nim = String(row["NIM"]).trim();

        const mahasiswa = await Mahasiswa.findOne({
          where: { nim },
          transaction,
        });

        if (!mahasiswa) {
          throw new Error(`Mahasiswa dengan NIM ${nim} tidak ditemukan`);
        }

        // ===============================
        // KODE KEGIATAN (🔥 PAKAI KODE SAJA)
        // ===============================
        const kodeRaw = row["Kode Kegiatan"];
        if (!kodeRaw || !kodeRaw.includes(" - ")) {
          throw new Error("Format Kode Kegiatan tidak valid");
        }

        const kode_keg = normalize(kodeRaw.split(" - ")[0]);

        const masterpoin = await MasterPoin.findOne({
          where: db.where(db.fn("lower", db.col("kode_keg")), kode_keg),
          transaction,
        });

        if (!masterpoin) {
          throw new Error(
            `MasterPoin ${kode_keg.toUpperCase()} tidak ditemukan`
          );
        }

        // ===============================
        // TANGGAL
        // ===============================
        const tanggal_pengajuan = parseTanggalIndonesia(
          row["Tanggal Pengajuan"]
        );
        const tanggal_pelaksanaan = parseTanggalIndonesia(
          row["Tanggal Pelaksanaan"]
        );

        if (!tanggal_pengajuan || !tanggal_pelaksanaan) {
          throw new Error("Format tanggal tidak valid");
        }

        // ===============================
        // INSERT KLAIM
        // ===============================
        await KlaimKegiatan.create(
          {
            mahasiswa_id: mahasiswa.id_mhs,
            masterpoin_id: masterpoin.id_poin,
            periode_pengajuan: row["Periode Pengajuan (semester)"],
            tanggal_pengajuan,
            rincian_acara:
              row["Rincian Acara"] || row["Deskripsi Kegiatan"] || "-",
            tingkat: row["Tingkat"] || "-",
            tempat: row["Tempat"],
            tanggal_pelaksanaan,
            mentor: row["Mentor"] || null,
            narasumber: row["Narasumber"] || null,
            bukti_file_id: "IMPORT_EXCEL",
            poin: masterpoin.bobot_poin,
            status: "Disetujui",
          },
          { transaction }
        );

        // ===============================
        // UPDATE TOTAL POIN
        // ===============================
        mahasiswa.total_poin =
          (mahasiswa.total_poin || 0) + masterpoin.bobot_poin;

        await mahasiswa.save({ transaction });

        await transaction.commit();
        success.push(nim);
      } catch (err) {
        await transaction.rollback();
        failed.push({
          row: excelRow,
          nim: row["NIM"],
          error: err.message,
        });
      }
    }

    return res.json({
      success: true,
      inserted: success.length,
      failed: failed.length,
      errors: failed,
    });
  } catch (err) {
    console.error("IMPORT EXCEL FATAL ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};
