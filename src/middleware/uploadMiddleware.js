// src/middleware/uploadMiddleware.js
import multer from "multer";

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
    "application/pdf",
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    cb(new Error("Tipe file tidak didukung"), false);
  } else {
    cb(null, true);
  }
};

const upload = multer({
  storage: multer.memoryStorage(), // 🔥 INI KUNCI UTAMA
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export default upload;
