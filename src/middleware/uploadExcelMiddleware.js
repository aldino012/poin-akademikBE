import multer from "multer";

// ===============================
// FILTER FILE EXCEL
// ===============================
const excelFilter = (req, file, cb) => {
  console.log("[UPLOAD EXCEL] mimetype:", file.mimetype);

  const allowed =
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.mimetype === "application/vnd.ms-excel";

  if (!allowed) {
    console.error("[UPLOAD EXCEL] ❌ mimetype tidak diizinkan");
    return cb(new Error("Hanya file Excel (.xls / .xlsx) yang diperbolehkan!"));
  }

  cb(null, true);
};

// ===============================
// MULTER CONFIG (MEMORY STORAGE)
// ===============================
const uploadExcel = multer({
  storage: multer.memoryStorage(), // 🔥 WAJIB untuk XLSX.read(buffer)
  fileFilter: excelFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export default uploadExcel;
