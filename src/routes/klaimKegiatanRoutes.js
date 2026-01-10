// src/routes/klaimKegiatanRoutes.js
import express from "express";

import {
  createKlaim,
  getAllKlaim,
  getKlaimById,
  updateKlaim,
  deleteKlaim,
  approveKlaim,
  streamBuktiKlaim, // 🔥 STREAM PRIVATE DRIVE
  importKlaimKegiatanExcel, // 🔥 IMPORT EXCEL
} from "../controllers/klaimKegiatanController.js";

import {
  authMiddleware,
  adminOnly,
  mahasiswaOnly,
} from "../middleware/authMiddleware.js";

import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

/**
 * =====================================================
 *  SEMUA ROUTE WAJIB LOGIN
 * =====================================================
 */

// ===============================
// GET ALL KLAIM
// Admin  : semua klaim
// Mhs    : klaim miliknya
// ===============================
router.get("/", authMiddleware, getAllKlaim);

// ===============================
// STREAM / VIEW BUKTI KLAIM
// 🔥 HARUS DI ATAS /:id
// ===============================
router.get("/:id/bukti", authMiddleware, streamBuktiKlaim);

// ===============================
// GET KLAIM BY ID
// ===============================
router.get("/:id", authMiddleware, getKlaimById);

// ===============================
// MAHASISWA: CREATE KLAIM
// upload bukti (pdf / image)
// ===============================
router.post(
  "/",
  authMiddleware,
  mahasiswaOnly,
  upload.single("bukti_kegiatan"),
  createKlaim
);

// ===============================
// MAHASISWA: UPDATE KLAIM (REVISI)
// ===============================
router.put(
  "/:id",
  authMiddleware,
  mahasiswaOnly,
  upload.single("bukti_kegiatan"),
  updateKlaim
);

// ===============================
// ADMIN: APPROVE / REJECT / REVISI
// ===============================
router.patch("/:id/status", authMiddleware, adminOnly, approveKlaim);

// ===============================
// ADMIN: DELETE KLAIM
// ===============================
router.delete("/:id", authMiddleware, adminOnly, deleteKlaim);

// ===============================
// ADMIN: IMPORT EXCEL KLAIM KEGIATAN
// upload file Excel (.xlsx)
// ===============================
router.post(
  "/import",
  authMiddleware,
  adminOnly,
  upload.single("file"), // ⚡ samakan dengan mahasiswa import
  importKlaimKegiatanExcel
);

export default router;
