import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const MasterPoin = sequelize.define("MasterPoin", {
  id_poin: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  kode_keg: {
    type: DataTypes.STRING(4),
    allowNull: false,
    unique: true,
    validate: {
      is: {
        args: /^[A-Z0-9]{4}$/,
        msg: "Kode_Keg harus terdiri dari 4 karakter (huruf/angka, kapital semua).",
      },
      len: {
        args: [4, 4],
        msg: "Kode_Keg harus tepat 4 karakter.",
      },
    },
  },
  jenis_kegiatan: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  posisi: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  bobot_poin: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: {
        args: [1],
        msg: "Bobot poin minimal 1.",
      },
    },
  },
});

export default MasterPoin;
