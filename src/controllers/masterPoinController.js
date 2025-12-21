import MasterPoin from "../models/masterPoinModel.js";
import xlsx from "xlsx";
import fs from "fs";

// 🔹 CREATE
export const createMasterPoin = async (req, res) => {
  try {
    const { kode_keg, jenis_kegiatan, posisi, bobot_poin } = req.body;

    if (!kode_keg || !jenis_kegiatan || !posisi || !bobot_poin) {
      return res.status(400).json({ message: "Semua field wajib diisi." });
    }

    const existing = await MasterPoin.findOne({ where: { kode_keg } });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Kode kegiatan sudah digunakan." });
    }

    const newData = await MasterPoin.create({
      kode_keg,
      jenis_kegiatan,
      posisi,
      bobot_poin,
    });

    res.status(201).json({
      message: "Data master poin berhasil ditambahkan.",
      data: newData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 READ (All)
export const getAllMasterPoin = async (req, res) => {
  try {
    const data = await MasterPoin.findAll();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 READ (By ID)
export const getMasterPoinById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await MasterPoin.findByPk(id);
    if (!data)
      return res.status(404).json({ message: "Data tidak ditemukan." });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 UPDATE
export const updateMasterPoin = async (req, res) => {
  try {
    const { id } = req.params;
    const { kode_keg, jenis_kegiatan, posisi, bobot_poin } = req.body;

    const data = await MasterPoin.findByPk(id);
    if (!data)
      return res.status(404).json({ message: "Data tidak ditemukan." });

    await data.update({ kode_keg, jenis_kegiatan, posisi, bobot_poin });
    res.json({ message: "Data berhasil diperbarui.", data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 DELETE
export const deleteMasterPoin = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await MasterPoin.findByPk(id);
    if (!data)
      return res.status(404).json({ message: "Data tidak ditemukan." });

    await data.destroy();
    res.json({ message: "Data berhasil dihapus." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ======================================================
// IMPORT EXCEL
// ======================================================
export const importMasterPoinExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File Excel belum diupload." });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const dataExcel = xlsx.utils.sheet_to_json(sheet);

    if (dataExcel.length === 0) {
      return res.status(400).json({ message: "File Excel kosong." });
    }

    // =================================================================
    // FILTER BERSIH (UPPERCASE & CLEANSING)
    // =================================================================
    const cleanUP = (text) => {
      if (!text) return "";
      return text
        .toString()
        .replace(/[-_/]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
    };

    const cleanNumber = (n) => Number(n) || 0;

    let inserted = 0;
    let skipped = 0;
    let errors = [];

    for (let i = 0; i < dataExcel.length; i++) {
      const row = dataExcel[i];

      // 🔥 Ambil & filter nilai excel
      const kode_keg = cleanUP(row["Kode Keg (WAJIB 4 HURUF)"]);
      const jenis_kegiatan = cleanUP(row["Jenis Kegiatan"]);
      const posisi = cleanUP(row["Deskripsi"]);
      const bobot_poin = cleanNumber(row["Bobot Poin"]);

      // ============================
      // VALIDASI WAJIB
      // ============================
      if (!kode_keg || !jenis_kegiatan || !posisi || !bobot_poin) {
        errors.push({
          row: i + 2,
          error:
            "Kolom tidak lengkap. Kolom wajib: Kode Keg (WAJIB 4 HURUF), Jenis Kegiatan, Deskripsi, Bobot Poin",
        });
        skipped++;
        continue;
      }

      // ============================
      // CEK DUPLIKAT (kode_keg)
      // ============================
      const exist = await MasterPoin.findOne({
        where: { kode_keg },
      });

      if (exist) {
        skipped++;
        continue;
      }

      // =============================
      // SIMPAN DATA
      // =============================
      try {
        await MasterPoin.create({
          kode_keg,
          jenis_kegiatan,
          posisi,
          bobot_poin,
        });
        inserted++;
      } catch (err) {
        errors.push({
          row: i + 2,
          error: err.message,
        });
        skipped++;
      }
    }

    // Hapus file excel setelah selesai
    fs.unlinkSync(req.file.path);

    return res.status(200).json({
      message: "Import Master Poin selesai",
      total_data: dataExcel.length,
      berhasil: inserted,
      gagal: skipped,
      errors,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


// ======================================================
// EXPORT EXCEL
// ======================================================
export const exportMasterPoinExcel = async (req, res) => {
  try {
    const data = await MasterPoin.findAll();

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Tidak ada data untuk diexport." });
    }

    // Buat array JSON sesuai header Excel
    const exportData = data.map((item) => ({
      "Kode Keg (WAJIB 4 HURUF)": item.kode_keg,
      "Jenis Kegiatan": item.jenis_kegiatan,
      "Deskripsi": item.posisi,
      "Bobot Poin": item.bobot_poin,
    }));

    // Buat worksheet
    const worksheet = xlsx.utils.json_to_sheet(exportData);

    // Buat workbook
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Master Poin");

    // Buat nama file
    const fileName = `master_poin_export_${Date.now()}.xlsx`;
    const filePath = `./exports/${fileName}`;

    // Pastikan folder exports ada
    if (!fs.existsSync("./exports")) {
      fs.mkdirSync("./exports");
    }

    // Simpan file
    xlsx.writeFile(workbook, filePath);

    // Kirim file ke client
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.log("Download error:", err);
      }

      // Hapus file setelah dikirim
      fs.unlinkSync(filePath);
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

