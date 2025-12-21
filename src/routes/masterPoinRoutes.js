import express from "express";
import {
  createMasterPoin,
  getAllMasterPoin,
  getMasterPoinById,
  updateMasterPoin,
  deleteMasterPoin,
  importMasterPoinExcel,
  exportMasterPoinExcel,
} from "../controllers/masterPoinController.js";

import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";
import uploadExcel from "../middleware/uploadExcelMiddleware.js";

const router = express.Router();

// =======================
// ROUTES SPESIFIK DULU
// =======================

// IMPORT EXCEL
router.post(
  "/import-excel",
  authMiddleware,
  adminOnly,
  uploadExcel.single("file"),
  importMasterPoinExcel
);

// EXPORT EXCEL
router.get("/export-excel", authMiddleware, adminOnly, exportMasterPoinExcel);

// =======================
// ROUTES BIASA
// =======================

// GET ALL
router.get("/", authMiddleware, getAllMasterPoin);

// GET BY ID → TARUH PALING BAWAH
router.get("/:id", authMiddleware, getMasterPoinById);

// ADMIN CRUD
router.post("/", authMiddleware, adminOnly, createMasterPoin);
router.put("/:id", authMiddleware, adminOnly, updateMasterPoin);
router.delete("/:id", authMiddleware, adminOnly, deleteMasterPoin);

export default router;
