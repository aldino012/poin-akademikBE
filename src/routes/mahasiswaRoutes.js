import express from "express";
import {
  getAllMahasiswa,
  getMahasiswaById,
  createMahasiswa,
  updateMahasiswa,
  deleteMahasiswa,
  getMahasiswaMe,
  getMahasiswaCV,
  getMahasiswaKegiatan,
  importMahasiswaExcel,
  exportMahasiswaExcel,
  cetakCvPdf,

  // 🔥 TAMBAHAN WAJIB
  streamFotoMahasiswa,
} from "../controllers/mahasiswaController.js";

import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import uploadExcel from "../middleware/uploadExcelMiddleware.js";

const router = express.Router();
import {
  validateCreateMahasiswa,
  validateUpdateMahasiswa,
} from "../validates/mahasiswa.validate.js";



/**
 * ================================
 *  ROUTES MAHASISWA
 * ================================
 */

/* =========================================================
   🔹 PUBLIC — CV HTML (dipakai frontend Next.js)
   ========================================================= */
router.get("/cv/:id", getMahasiswaCV);

/* =========================================================
   🔹 PUBLIC — PDF CV (Puppeteer)
   ========================================================= */
router.get("/cv/:id/pdf", cetakCvPdf);

/* =========================================================
   🔹 PUBLIC — DATA KEGIATAN (MODAL DETAIL)
   ========================================================= */
router.get("/kegiatan/:id", getMahasiswaKegiatan);

/* =========================================================
   🔥 PRIVATE — STREAM FOTO MAHASISWA (PROXY IMAGE)
   🔐 Drive tetap restricted
   ========================================================= */
router.get("/foto/:fileId", streamFotoMahasiswa);


/* =========================================================
   🔥 IMPORT EXCEL MAHASISWA (ADMIN)
   ========================================================= */
router.post(
  "/import-excel",
  authMiddleware,
  adminOnly,
  uploadExcel.single("file"),
  importMahasiswaExcel
);

/* =========================================================
   🔥 EXPORT EXCEL MAHASISWA (ADMIN)
   ========================================================= */
router.get("/export-excel", authMiddleware, adminOnly, exportMahasiswaExcel);

/* =========================================================
   🔹 PRIVATE — KHUSUS ADMIN
   ========================================================= */
router.get("/", authMiddleware, adminOnly, getAllMahasiswa);

/* =========================================================
   🔹 MAHASISWA LOGIN (PROFILE SENDIRI)
   ========================================================= */
router.get("/me", authMiddleware, getMahasiswaMe);

/* =========================================================
   🔹 DETAIL MAHASISWA BY ID (ADMIN)
   ⚠️ HARUS SETELAH route spesifik
   ========================================================= */
router.get("/:id", authMiddleware, adminOnly, getMahasiswaById);

/* =========================================================
   🔹 CREATE MAHASISWA (ADMIN)
   ========================================================= */
router.post(
  "/",
  authMiddleware,
  adminOnly,
  upload.single("foto"),
  validateCreateMahasiswa,
  createMahasiswa
);

/* =========================================================
   🔹 UPDATE MAHASISWA (ADMIN)
   ========================================================= */
router.put(
  "/:id",
  authMiddleware,
  adminOnly,
  upload.single("foto"),
  validateUpdateMahasiswa,
  updateMahasiswa
);

/* =========================================================
   🔹 DELETE MAHASISWA (ADMIN)
   ========================================================= */
router.delete("/:id", authMiddleware, adminOnly, deleteMahasiswa);

export default router;
