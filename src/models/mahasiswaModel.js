import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Mahasiswa = sequelize.define("Mahasiswa", {
  id_mhs: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  nim: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: "NIM harus diisi" },
    },
  },

  nama_mhs: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: "Nama mahasiswa harus diisi" },
    },
  },

  prodi: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: "Program studi harus diisi" },
    },
  },

  angkatan: {
    type: DataTypes.STRING,
    validate: {
      isNumeric: { msg: "Angkatan harus berupa angka" },
      len: {
        args: [4, 4],
        msg: "Angkatan harus 4 digit",
      },
    },
  },

  tempat_lahir: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  tgl_lahir: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    isDate: true,
  },

  jenis_kelamin: {
    type: DataTypes.ENUM("L", "P"),
    allowNull: true,
  },

  pekerjaan: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  alamat: {
    type: DataTypes.STRING,
    validate: {
      notEmpty: { msg: "Alamat harus diisi" },
    },
  },

  asal_sekolah: {
    type: DataTypes.STRING,
    validate: {
      notEmpty: { msg: "Asal sekolah harus diisi" },
    },
  },

  thn_lulus: {
    type: DataTypes.STRING,
    validate: {
      isNumeric: { msg: "Tahun lulus harus berupa angka" },
      len: {
        args: [4, 4],
        msg: "Tahun lulus harus 4 digit",
      },
    },
  },

  tlp_saya: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  tlp_rumah: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: { msg: "Format email tidak valid" },
    },
  },

  target_poin: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    validate: {
      isInt: { msg: "Target poin harus berupa angka" },
      min: {
        args: [0],
        msg: "Target poin tidak boleh negatif",
      },
    },
  },

  total_poin: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      isInt: { msg: "Total poin harus berupa angka" },
      min: {
        args: [0],
        msg: "Total poin tidak boleh negatif",
      },
    },
  },

  foto_file_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  order_index: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
});

export default Mahasiswa;
