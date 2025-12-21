import { google } from "googleapis";
import path from "path";
import fs from "fs";

// =============================================================
//  BUFFER → TEMP FILE
// =============================================================
export function bufferToTempFile(buffer, originalName) {
  const safeName = originalName.replace(/\s+/g, "_");
  const tempPath = path.join(process.cwd(), `temp_${Date.now()}_${safeName}`);
  fs.writeFileSync(tempPath, buffer);
  return tempPath;
}

// =============================================================
//  GOOGLE DRIVE CONFIG
// =============================================================
const KEYFILE_PATH = path.join(
  process.cwd(),
  "src/config/gdrive-service-account.json"
);

export const DRIVE_FOLDER_FILES = "1t40n6b7lyDa25V8Dv3lLmpZHrTLstiQA"; // /Uploads/Files
export const DRIVE_FOLDER_IMAGES = "12iLOetnVLDSz677mSUk1dyxEaMMCpfLF"; // /Uploads/Images

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILE_PATH,
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

// =============================================================
//  HELPER: Hapus file lokal
// =============================================================
export function deleteLocalFile(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    console.error("Gagal menghapus file lokal:", error);
  }
}

// =============================================================
//  UPLOAD FILE KE GOOGLE DRIVE + PUBLIC IMAGE URL
// =============================================================
export async function uploadToDrive(filePath, mimeType, folderId) {
  try {
    const fileName = path.basename(filePath);

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType,
      body: fs.createReadStream(filePath),
    };

    const createRes = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id, name",
      supportsAllDrives: true,
    });

    const fileId = createRes.data.id;

    return {
      id: fileId,
      name: fileName,
    };
  } catch (error) {
    throw new Error("Upload gagal: " + error.message);
  }
}
// =============================================================
//  DELETE FILE FROM DRIVE
// =============================================================
export async function deleteFromDrive(fileId) {
  if (!fileId) return false;

  try {
    await drive.files.delete({
      fileId,
      supportsAllDrives: true,
    });
    return true;
  } catch (error) {
    // 404 = file tidak ada / tidak punya akses (EXPECTED)
    if (error?.code === 404) {
      console.warn(
        "[INFO] Drive delete dilewati (file tidak ditemukan / tidak ada akses):",
        fileId
      );
      return false;
    }

    // error lain (misalnya network)
    console.error("[ERROR] Drive delete error:", error.message);
    return false;
  }
}

// =============================================================
//  RENAME FILE
// =============================================================
export async function renameFile(fileId, newName) {
  try {
    await drive.files.update({
      fileId,
      requestBody: { name: newName },
    });
    return true;
  } catch (error) {
    console.error("Gagal rename file:", error);
    return false;
  }
}

// =============================================================
//  GET INFO FILE
// =============================================================
export async function getFileInfo(fileId) {
  try {
    const res = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, size, webViewLink, webContentLink",
      supportsAllDrives: true,
    });
    return res.data;
  } catch (error) {
    console.error("Gagal mengambil info file:", error);
    return null;
  }
}

// =============================================================
//  UPDATE FILE (Ganti isi tanpa ganti ID)
// =============================================================
export async function updateFile(fileId, newFilePath, mimeType) {
  try {
    const media = {
      mimeType,
      body: fs.createReadStream(newFilePath),
    };

    const res = await drive.files.update({
      fileId,
      media,
      fields: "id, name, webViewLink, webContentLink",
      supportsAllDrives: true,
    });

    return res.data;
  } catch (error) {
    throw new Error("Gagal update file: " + error.message);
  }
}

// =============================================================
//  COPY FILE
// =============================================================
export async function copyFile(fileId, newName) {
  try {
    const res = await drive.files.copy({
      fileId,
      requestBody: { name: newName },
      supportsAllDrives: true,
    });
    return res.data;
  } catch (error) {
    console.error("Gagal menyalin file:", error);
    return null;
  }
}

// =============================================================
//  MOVE FILE KE FOLDER LAIN
// =============================================================
export async function moveFile(fileId, newFolderId) {
  try {
    const file = await drive.files.get({
      fileId,
      fields: "parents",
      supportsAllDrives: true,
    });

    const prevParents = file.data.parents.join(",");

    const res = await drive.files.update({
      fileId,
      addParents: newFolderId,
      removeParents: prevParents,
      fields: "id, parents",
      supportsAllDrives: true,
    });

    return res.data;
  } catch (error) {
    console.error("Gagal memindahkan file:", error);
    return null;
  }
}


export async function streamFileFromDrive(fileId) {
  if (!fileId) throw new Error("File ID tidak valid");

  const res = await drive.files.get(
    {
      fileId,
      alt: "media",
      supportsAllDrives: true,
    },
    { responseType: "stream" }
  );

  return {
    stream: res.data,
    headers: res.headers,
  };
}
