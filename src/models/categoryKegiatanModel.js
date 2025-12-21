import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const CategoryKegiatan = sequelize.define("category_kegiatan", {
  id_category: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },

  tgl: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },

  deskripsi_kegiatan: {
    type: DataTypes.TEXT,
    allowNull: false,
  },

  jenis_kegiatan: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
});

export default CategoryKegiatan;
