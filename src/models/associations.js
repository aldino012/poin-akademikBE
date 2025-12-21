import Mahasiswa from "./mahasiswaModel.js";
import User from "./userModel.js";
import MasterPoin from "./masterPoinModel.js";
import KlaimKegiatan from "./klaimKegiatanModel.js";
import CategoryKegiatan from "./categoryKegiatanModel.js";

// ========== USER <-> MAHASISWA ==========
Mahasiswa.hasOne(User, { foreignKey: "nim", sourceKey: "nim" });
User.belongsTo(Mahasiswa, { foreignKey: "nim", targetKey: "nim" });

// ========== MAHASISWA <-> KLAIM ==========
Mahasiswa.hasMany(KlaimKegiatan, {
  foreignKey: "mahasiswa_id",
  as: "klaim",
});

KlaimKegiatan.belongsTo(Mahasiswa, {
  foreignKey: "mahasiswa_id",
  as: "mahasiswa",
});

// ========== MASTERPOIN <-> KLAIM ==========
MasterPoin.hasMany(KlaimKegiatan, {
  foreignKey: "masterpoin_id",
  as: "klaimMaster",
});

KlaimKegiatan.belongsTo(MasterPoin, {
  foreignKey: "masterpoin_id",
  as: "masterPoin",
});

export { Mahasiswa, User, MasterPoin, KlaimKegiatan, CategoryKegiatan };
