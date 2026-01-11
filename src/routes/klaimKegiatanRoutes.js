import express from "express";

import {
  createKlaim,
  getAllKlaim,
  getKlaimById,
  updateKlaim,
  deleteKlaim,
  approveKlaim,
  streamBuktiKlaim,
  importKlaimExcel, // 🔥 TAMBAH INI
} from "../controllers/klaimKegiatanController.js";

import {
  authMiddleware,
  adminOnly,
  mahasiswaOnly,
} from "../middleware/authMiddleware.js";

import upload from "../middleware/uploadMiddleware.js"; // pdf / image
import uploadExcel from "../middleware/uploadExcelMiddleware.js"; // 🔥 excel

const router = express.Router();

/**
 * =====================================================
 *  SEMUA ROUTE WAJIB LOGIN
 * =====================================================
 */

// ===============================
// GET ALL KLAIM
// ===============================
router.get("/", authMiddleware, getAllKlaim);

// ===============================
// STREAM BUKTI
// ===============================
router.get("/:id/bukti", authMiddleware, streamBuktiKlaim);

// ===============================
// GET KLAIM BY ID
// ===============================
router.get("/:id", authMiddleware, getKlaimById);

// ===============================
// MAHASISWA: CREATE KLAIM
// ===============================
router.post(
  "/",
  authMiddleware,
  mahasiswaOnly,
  upload.single("bukti_kegiatan"),
  createKlaim
);

// ===============================
// MAHASISWA: UPDATE KLAIM
// ===============================
router.put(
  "/:id",
  authMiddleware,
  mahasiswaOnly,
  upload.single("bukti_kegiatan"),
  updateKlaim
);

// ===============================
// ADMIN: APPROVE / REVISI / TOLAK
// ===============================
router.patch("/:id/status", authMiddleware, adminOnly, approveKlaim);

// ===============================
// ADMIN: DELETE KLAIM
// ===============================
router.delete("/:id", authMiddleware, adminOnly, deleteKlaim);

// ==================================================
// 🔥 ADMIN: IMPORT KLAIM DARI EXCEL
// ==================================================
router.post(
  "/import-excel",
  authMiddleware,
  adminOnly,
  uploadExcel.single("file"),
  importKlaimExcel
);

export default router;
