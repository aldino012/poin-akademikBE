import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Mahasiswa from "./mahasiswaModel.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    nim: {
      type: DataTypes.STRING,
      allowNull: true, // mahasiswa pakai NIM
      unique: true,
      references: {
        model: Mahasiswa,
        key: "nim",
      },
      index: true,
    },

    nip: {
      type: DataTypes.STRING,
      allowNull: true, // admin pakai NIP
      unique: true,
      index: true,
    },

    nama: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // 🔥 Email DIBUAT BEBAS, TANPA VALIDASI isEmail
    email: {
      type: DataTypes.STRING,
      allowNull: true, // mahasiswa bisa tidak punya email
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    role: {
      type: DataTypes.ENUM("admin", "mahasiswa"),
      defaultValue: "mahasiswa",
    },
  },
  {
    tableName: "users",
  }
);

export default User;
