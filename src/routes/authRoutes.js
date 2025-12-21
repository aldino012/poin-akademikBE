import express from "express";
import {
  login,
  getProfile,
  changePassword,
  logout, // <── tambahin ini
} from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { Mahasiswa, User } from "../models/associations.js";

const router = express.Router();
router.get("/test", (req, res) => {
  res.send("Auth route OK");
});
router.post("/login", login);
router.get("/profile", authMiddleware, getProfile);
router.put("/change-password", authMiddleware, changePassword);
router.post("/logout", authMiddleware, logout); // <── ini route logout

export default router;