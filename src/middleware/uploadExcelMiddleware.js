import multer from "multer";
import path from "path";
import os from "os";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // tempatkan file di temp OS
    cb(null, os.tmpdir());
  },

  filename: function (req, file, cb) {
    cb(
      null,
      Date.now() +
        "-excel-" +
        Math.round(Math.random() * 1e9) +
        path.extname(file.originalname)
    );
  },
});

const excelFilter = (req, file, cb) => {
  const allowed =
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.mimetype === "application/vnd.ms-excel";

  if (!allowed) {
    return cb(new Error("Hanya file Excel (.xls / .xlsx) yang diperbolehkan!"));
  }

  cb(null, true);
};

const uploadExcel = multer({
  storage,
  fileFilter: excelFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5MB
});

export default uploadExcel;
