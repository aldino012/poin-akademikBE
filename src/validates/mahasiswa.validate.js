// src/validates/mahasiswa.validate.js

const isEmpty = (v) => v === undefined || v === null || String(v).trim() === "";

const isEmail = (email) => /^\S+@\S+\.\S+$/.test(email);
const isNumeric = (v) => /^\d+$/.test(String(v));

export const validateCreateMahasiswa = (req, res, next) => {
  const errors = {};
  const {
    nim,
    nama_mhs,
    prodi,
    alamat,
    asal_sekolah,
    angkatan,
    email,
    jenis_kelamin,
    thn_lulus,
    tempat_lahir,
    tgl_lahir,
    pekerjaan,
    tlp_saya,
    tlp_rumah,
  } = req.body;

  // ===== WAJIB =====
  if (isEmpty(nim)) errors.nim = "NIM wajib diisi";
  else if (!isNumeric(nim)) errors.nim = "NIM harus angka";

  if (isEmpty(nama_mhs)) errors.nama_mhs = "Nama mahasiswa wajib diisi";
  if (isEmpty(prodi)) errors.prodi = "Program studi wajib diisi";
  if (isEmpty(alamat)) errors.alamat = "Alamat wajib diisi";
  if (isEmpty(asal_sekolah)) errors.asal_sekolah = "Asal sekolah wajib diisi";
  if (isEmpty(tempat_lahir)) errors.tempat_lahir = "Tempat lahir wajib diisi";
  if (isEmpty(tgl_lahir)) errors.tgl_lahir = "Tanggal lahir wajib diisi";
  if (isEmpty(email)) errors.email = "Email wajib diisi";
  if (isEmpty(pekerjaan)) errors.pekerjaan = "Pekerjaan wajib diisi";
  if (isEmpty(thn_lulus)) errors.thn_lulus = "Tahun lulus wajib diisi";
  if (isEmpty(tlp_saya)) errors.tlp_saya = "Telepon pribadi wajib diisi";
  if (isEmpty(tlp_rumah)) errors.tlp_rumah = "Telepon rumah wajib diisi";

  if (isEmpty(jenis_kelamin))
    errors.jenis_kelamin = "Jenis kelamin wajib diisi";
  else if (!["L", "P"].includes(jenis_kelamin))
    errors.jenis_kelamin = "Jenis kelamin harus L atau P";

  if (isEmpty(angkatan)) errors.angkatan = "Angkatan wajib diisi";
  else if (!/^\d{4}$/.test(angkatan))
    errors.angkatan = "Angkatan harus 4 digit";

  // ===== OPTIONAL =====
  if (email && !isEmail(email)) {
    errors.email = "Format email tidak valid";
  }

  if (thn_lulus && !/^\d{4}$/.test(thn_lulus)) {
    errors.thn_lulus = "Tahun lulus harus 4 digit";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      message: "Validasi gagal",
      errors,
    });
  }

  next();
};

export const validateUpdateMahasiswa = (req, res, next) => {
  next();
};
