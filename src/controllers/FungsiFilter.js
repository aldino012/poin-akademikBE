// ======================================================================
//  CLEANSING & NORMALISASI DATA MAHASISWA
// ======================================================================

// 🔠 Bersihkan string + UPPERCASE
export function cleanStringUPPER(text) {
  if (!text) return "";
  return text
    .toString()
    .replace(/[-_/]+/g, " ") // hilangkan -, _, /
    .replace(/\s+/g, " ") // hilangkan spasi beruntun
    .trim()
    .toUpperCase();
}

// 🔤 Bersihkan string tanpa uppercase (untuk email)
export function cleanString(text) {
  if (!text) return "";
  return text
    .toString()
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// 🔢 Bersihkan nomor HP → menyisakan angka saja
export function cleanPhone(val) {
  if (!val) return "";
  return val.toString().replace(/\D/g, "");
}

// 🧑‍🏫 Konversi PRODI
export function convertProdi(kode) {
  if (!kode) return "";
  const k = kode.toString().trim().toUpperCase();

  if (k === "01TI") return "S1";
  if (k === "02MI") return "D3";

  return k; // fallback jika format tidak dikenali
}

// 🧍 Konversi jenis kelamin → L / P
export function convertGender(val) {
  if (!val) return "";
  const g = val
    .toString()
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();

  if (g === "L") return "L";
  if (g === "P") return "P";

  return "";
}

// 📧 Validasi email (email tidak uppercase)
export function normalizeEmail(email) {
  if (!email) return null;

  let cleaned = email.toString().trim();
  cleaned = cleaned.replace(/[-/ ]+$/g, ""); // hapus karakter aneh di akhir

  if (!cleaned.includes("/") && /^\S+@\S+\.\S+$/.test(cleaned)) {
    return cleaned.toLowerCase();
  }

  return null;
}

// 📅 Konversi tanggal berbagai format → YYYY-MM-DD (STRICT)
export function convertTanggal(input) {
  if (!input) return null;

  // ======================================================
  //  EXCEL TIMESTAMP (ANGKA)
  // ======================================================
  if (typeof input === "number" && !isNaN(input)) {
    const excelDate = new Date((input - 25569) * 86400 * 1000);

    if (isNaN(excelDate.getTime())) return null;

    const year = excelDate.getFullYear();
    const month = String(excelDate.getMonth() + 1).padStart(2, "0");
    const day = String(excelDate.getDate()).padStart(2, "0");

    const iso = `${year}-${month}-${day}`;
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
  }

  // ======================================================
  //  STRING INPUT
  // ======================================================
  let text = input.toString().trim().toLowerCase();

  // INVALID DASAR
  if (!text || text === "-" || text.length < 5) return null;
  if (/^[-]/.test(text)) return null;

  const bulanMap = {
    januari: "01",
    februari: "02",
    maret: "03",
    april: "04",
    mei: "05",
    juni: "06",
    juli: "07",
    agustus: "08",
    september: "09",
    oktober: "10",
    november: "11",
    desember: "12",
  };

  // ======================================================
  //  FORMAT INDONESIA → 22-juni-2003
  // ======================================================
  if (text.includes("-")) {
    const parts = text.split("-");
    if (parts.length === 3) {
      const [day, monthName, year] = parts;
      const month = bulanMap[monthName];

      if (
        month &&
        /^\d{1,2}$/.test(day) &&
        /^\d{4}$/.test(year)
      ) {
        const iso = `${year}-${month}-${day.padStart(2, "0")}`;
        return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
      }
    }
  }

  // ======================================================
  //  FORMAT 07/03/2003 atau 07-03-2003
  // ======================================================
  const cleaned = text.replace(/\//g, "-");
  const parts = cleaned.split("-");
  if (parts.length === 3) {
    const [d, m, y] = parts;

    if (
      /^\d{1,2}$/.test(d) &&
      /^\d{1,2}$/.test(m) &&
      /^\d{4}$/.test(y)
    ) {
      const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
    }
  }

  // ======================================================
  //  FORMAT ISO MURNI → 2003-06-22
  // ======================================================
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  // ======================================================
  //  SEMUA FORMAT LAIN DITOLAK
  // ======================================================
  return null;
}

// ======================================================================
//  NORMALISASI DATA UNTUK IMPORT EXCEL
// ======================================================================
export function normalizeMahasiswaRow(r) {
  return {
    nim: cleanString(r.nim).toUpperCase(),

    nama_mhs: cleanStringUPPER(r.nama_mhs),
    prodi: convertProdi(r.prodi),
    angkatan: cleanString(r.angkatan),

    tempat_lahir: cleanStringUPPER(r.tempat_lahir),
    tgl_lahir: convertTanggal(r.tgl_lahir), // ✅ SUDAH AMAN

    pekerjaan: cleanStringUPPER(r.pekerjaan),
    alamat: cleanStringUPPER(r.alamat),
    asal_sekolah: cleanStringUPPER(r.asal_sekolah),
    thn_lulus: cleanString(r.thn_lulus),

    tlp_saya: cleanPhone(r.tlp_saya),
    tlp_rumah: cleanPhone(r.tlp_rumah),

    email: normalizeEmail(r.email),

    jenis_kelamin: convertGender(r.jenis_kelamin),

    target_poin: 50, // sesuai aturan
    total_poin: Number(r.total_poin) || 0,

    foto: r.foto || null,
  };
}
// ======================================================================
//  NORMALISASI DATA UNTUK EXPORT EXCEL
// ======================================================================
export function normalizeExportRow(m) {
  return {
    nim: m.nim,
    nama_mhs: cleanStringUPPER(m.nama_mhs),
    prodi: m.prodi,
    angkatan: m.angkatan,

    tempat_lahir: cleanStringUPPER(m.tempat_lahir),
    tgl_lahir: m.tgl_lahir,

    target_poin: Number(m.target_poin) || 50,
    total_poin: Number(m.total_poin) || 0,

    pekerjaan: cleanStringUPPER(m.pekerjaan),
    alamat: cleanStringUPPER(m.alamat),
    asal_sekolah: cleanStringUPPER(m.asal_sekolah),
    thn_lulus: m.thn_lulus,

    tlp_saya: cleanPhone(m.tlp_saya),
    tlp_rumah: cleanPhone(m.tlp_rumah),

    email: m.email ? cleanString(m.email).toLowerCase() : null,
    jenis_kelamin: convertGender(m.jenis_kelamin),

    foto: m.foto || "",
  };
}
