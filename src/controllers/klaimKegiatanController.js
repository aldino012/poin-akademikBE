// src/controllers/klaimKegiatanController.js
import KlaimKegiatan from "../models/klaimKegiatanModel.js";
import Mahasiswa from "../models/mahasiswaModel.js";
import MasterPoin from "../models/masterpoinModel.js";
import XLSX from "xlsx";
import fs from "fs";

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

// ===============================
// IMPORT KLAIM KEGIATAN DARI EXCEL (ADMIN ONLY)
// ===============================
export const importKlaimFromExcel = async (req, res) => {
  try {
    console.log("\n================= [IMPORT KLAIM FROM EXCEL] =================");
    console.log("[IMPORT] user:", {
      role: req.user?.role,
      mahasiswa_id: req.user?.mahasiswa_id,
    });
    console.log("[IMPORT] req.file exists:", !!req.file);
    console.log("[IMPORT] file path:", req.file?.path);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File Excel wajib diupload",
      });
    }

    // Hanya admin yang boleh import
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Hanya admin yang dapat melakukan import",
      });
    }

    // Baca file Excel dari path yang sudah disimpan
    console.log("[IMPORT] Reading Excel file from:", req.file.path);
    
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON dengan header yang diharapkan
    const excelData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`[IMPORT] Total rows in Excel: ${excelData.length}`);
    
    if (excelData.length === 0) {
      // Hapus file temp
      try {
        await fs.promises.unlink(req.file.path);
      } catch (unlinkErr) {
        console.warn("[IMPORT] Gagal hapus temp file:", unlinkErr.message);
      }
      
      return res.status(400).json({
        success: false,
        message: "File Excel kosong",
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [],
      details: []
    };

    // Import fs untuk menghapus file temp
    import('fs').then(async (fs) => {
      // Process each row
      for (let i = 0; i < excelData.length; i++) {
        const row = excelData[i];
        const rowNumber = i + 2; // +2 karena header di row 1 dan index mulai dari 0
        
        try {
          console.log(`[IMPORT] Processing row ${rowNumber}`);
          
          // Validasi field required
          const requiredFields = [
            'NIM', 
            'Kode Kegiatan',
            'Periode Pengajuan (semester)',
            'Tanggal Pengajuan',
            'Rincian Acara',
            'Tingkat',
            'Tempat',
            'Tanggal Pelaksanaan'
          ];
          
          const missingFields = [];
          requiredFields.forEach(field => {
            if (!row[field] || row[field].toString().trim() === '') {
              missingFields.push(field);
            }
          });
          
          if (missingFields.length > 0) {
            throw new Error(`Field wajib kosong: ${missingFields.join(', ')}`);
          }

          // Cari mahasiswa berdasarkan NIM
          const nim = row['NIM'].toString().trim();
          const mahasiswa = await Mahasiswa.findOne({ where: { nim } });
          
          if (!mahasiswa) {
            throw new Error(`Mahasiswa dengan NIM ${nim} tidak ditemukan`);
          }

          // Cari master poin berdasarkan kode_keg
          const kodeKegiatan = row['Kode Kegiatan'].toString().trim();
          const masterPoin = await MasterPoin.findOne({ 
            where: { kode_keg: kodeKegiatan } 
          });
          
          if (!masterPoin) {
            throw new Error(`Master poin dengan kode ${kodeKegiatan} tidak ditemukan`);
          }

          // Validasi tanggal format
          const parseDate = (dateStr) => {
            if (!dateStr) return null;
            
            // Coba parse berbagai format tanggal
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
              throw new Error(`Format tanggal tidak valid: ${dateStr}`);
            }
            return date;
          };

          // Mapping data dari Excel ke struktur klaim kegiatan
          const klaimData = {
            mahasiswa_id: mahasiswa.id_mhs,
            masterpoin_id: masterPoin.id_poin,
            periode_pengajuan: row['Periode Pengajuan (semester)'].toString().trim(),
            tanggal_pengajuan: parseDate(row['Tanggal Pengajuan']),
            rincian_acara: row['Rincian Acara'].toString().trim(),
            tingkat: row['Tingkat'].toString().trim(),
            tempat: row['Tempat'].toString().trim(),
            tanggal_pelaksanaan: parseDate(row['Tanggal Pelaksanaan']),
            mentor: row['Mentor'] ? row['Mentor'].toString().trim() : null,
            narasumber: row['Narasumber'] ? row['Narasumber'].toString().trim() : null,
            poin: masterPoin.bobot_poin,
            status: row['Status'] ? row['Status'].toString().trim() : 'Diajukan',
            catatan: null
          };

          // Validasi status yang diperbolehkan
          const allowedStatuses = ['Diajukan', 'Disetujui', 'Ditolak', 'Revisi', 'Diajukan ulang'];
          if (klaimData.status && !allowedStatuses.includes(klaimData.status)) {
            throw new Error(`Status tidak valid: ${klaimData.status}. Status yang diperbolehkan: ${allowedStatuses.join(', ')}`);
          }

          // Jika status Disetujui, update total poin mahasiswa
          let poinDitambahkan = 0;
          if (klaimData.status === 'Disetujui') {
            // Pastikan poin belum pernah ditambahkan sebelumnya
            const existingApprovedKlaim = await KlaimKegiatan.findOne({
              where: {
                mahasiswa_id: mahasiswa.id_mhs,
                masterpoin_id: masterPoin.id_poin,
                status: 'Disetujui'
              }
            });
            
            if (!existingApprovedKlaim) {
              mahasiswa.total_poin = (mahasiswa.total_poin || 0) + masterPoin.bobot_poin;
              await mahasiswa.save();
              poinDitambahkan = masterPoin.bobot_poin;
            }
          }

          // Buat klaim kegiatan
          const klaim = await KlaimKegiatan.create(klaimData);
          
          results.success++;
          results.details.push({
            row: rowNumber,
            nim: nim,
            nama_mahasiswa: row['Nama Mahasiswa'] || mahasiswa.nama_mhs,
            kode_kegiatan: kodeKegiatan,
            jenis_kegiatan: row['Jenis Kegiatan'] || masterPoin.jenis_kegiatan,
            status: klaimData.status,
            poin: masterPoin.bobot_poin,
            poin_ditambahkan: poinDitambahkan,
            message: "Berhasil diimport"
          });

          console.log(`[IMPORT] Row ${rowNumber} SUCCESS: Klaim created with ID ${klaim.id}`);

        } catch (error) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            nim: row['NIM'] || 'N/A',
            nama_mahasiswa: row['Nama Mahasiswa'] || 'N/A',
            error: error.message
          });
          
          console.error(`[IMPORT] Row ${rowNumber} ERROR:`, error.message);
        }
      }

      // Hapus file temp setelah selesai
      try {
        await fs.promises.unlink(req.file.path);
        console.log("[IMPORT] Temp file deleted:", req.file.path);
      } catch (unlinkErr) {
        console.warn("[IMPORT] Gagal hapus temp file:", unlinkErr.message);
      }

      console.log(`[IMPORT] Import completed: ${results.success} success, ${results.failed} failed`);
      console.log("=================================================\n");

      return res.status(200).json({
        success: true,
        message: `Import selesai: ${results.success} data berhasil, ${results.failed} data gagal`,
        summary: {
          total_rows: excelData.length,
          success: results.success,
          failed: results.failed
        },
        details: results.details,
        errors: results.failed > 0 ? results.errors : undefined
      });

    }).catch(async (fsErr) => {
      // Hapus file temp jika error
      try {
        const fs = await import('fs');
        await fs.promises.unlink(req.file.path);
      } catch (unlinkErr) {
        console.warn("[IMPORT] Gagal hapus temp file:", unlinkErr.message);
      }
      
      throw fsErr;
    });

  } catch (err) {
    console.error("IMPORT KLAIM ERROR:", err);
    console.error("=================================================\n");
    
    // Hapus file temp jika error
    if (req.file?.path) {
      try {
        const fs = await import('fs');
        await fs.promises.unlink(req.file.path);
      } catch (unlinkErr) {
        console.warn("[IMPORT] Gagal hapus temp file:", unlinkErr.message);
      }
    }
    
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat import",
      error: err.message
    });
  }
};