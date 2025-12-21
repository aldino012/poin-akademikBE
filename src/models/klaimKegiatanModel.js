import { DataTypes } from "sequelize";
import db from "../config/db.js";

const KlaimKegiatan = db.define("KlaimKegiatan", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  mahasiswa_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  masterpoin_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  periode_pengajuan: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  tanggal_pengajuan: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },

  rincian_acara: {
    type: DataTypes.TEXT,
    allowNull: false,
  },

  tingkat: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  tempat: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  tanggal_pelaksanaan: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },

  mentor: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  narasumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // 🔥 SIMPAN FILE ID GOOGLE DRIVE (BUKAN URL)
  bukti_file_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  poin: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  status: {
    type: DataTypes.ENUM(
      "Diajukan",
      "Revisi",
      "Diajukan ulang",
      "Disetujui",
      "Ditolak"
    ),
    defaultValue: "Diajukan",
  },

  catatan: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});

export default KlaimKegiatan;
