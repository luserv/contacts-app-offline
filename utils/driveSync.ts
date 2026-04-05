/**
 * Google Drive API utilities — backup / restore de la base de datos.
 * Estructura: contacts/db/backup-YYYY-MM-DDTHH-MM-SS.db
 * Usa drive.file scope: solo accede a archivos creados por esta app.
 */

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const FOLDER_PATH = ['contacts', 'db'];

async function driveJSON(url: string, token: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers as object ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (err?.error?.code === 401) throw new Error('TOKEN_EXPIRED');
    throw new Error(`Drive error: ${res.status}`);
  }
  return res.json();
}

async function findFolder(token: string, name: string, parentId: string): Promise<string | null> {
  const q = encodeURIComponent(
    `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
  );
  const data = await driveJSON(`${DRIVE_API}?q=${q}&fields=files(id)`, token);
  return data.files?.[0]?.id ?? null;
}

async function createFolder(token: string, name: string, parentId: string): Promise<string> {
  const data = await driveJSON(DRIVE_API, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });
  return data.id;
}

async function getOrCreateFolderPath(token: string): Promise<string> {
  let parentId = 'root';
  for (const name of FOLDER_PATH) {
    const existing = await findFolder(token, name, parentId);
    parentId = existing ?? await createFolder(token, name, parentId);
  }
  return parentId;
}

function timestampFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  return `backup-${date}T${time}.db`;
}

const MAX_BACKUPS = 2;

interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
}

async function listBackupsInFolder(token: string, folderId: string): Promise<DriveFile[]> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const data = await driveJSON(
    `${DRIVE_API}?q=${q}&orderBy=createdTime asc&fields=files(id,name,createdTime)&pageSize=100`,
    token
  );
  return data.files ?? [];
}

async function deleteFile(token: string, fileId: string): Promise<void> {
  const res = await fetch(`${DRIVE_API}/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    if (res.status === 401) throw new Error('TOKEN_EXPIRED');
    throw new Error(`Error al eliminar respaldo: ${res.status}`);
  }
}

/** Sube la DB (en base64) a contacts/db/backup-fecha-hora.db en Google Drive.
 *  Mantiene un máximo de MAX_BACKUPS respaldos eliminando el más antiguo si es necesario. */
export async function uploadDB(token: string, base64: string): Promise<void> {
  let binary: Uint8Array;
  try {
    binary = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  } catch {
    throw new Error('Error al leer la base de datos local');
  }

  const folderId = await getOrCreateFolderPath(token);

  // Eliminar los más antiguos si ya se alcanzó el límite
  const existing = await listBackupsInFolder(token, folderId);
  const toDelete = existing.slice(0, Math.max(0, existing.length - MAX_BACKUPS + 1));
  for (const file of toDelete) {
    await deleteFile(token, file.id);
  }

  const fileName = timestampFilename();
  const boundary = 'contacts_boundary';
  const meta = JSON.stringify({
    name: fileName,
    mimeType: 'application/x-sqlite3',
    parents: [folderId],
  });

  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`,
    `--${boundary}\r\nContent-Type: application/x-sqlite3\r\n\r\n`,
    binary,
    `\r\n--${boundary}--`,
  ]);

  await driveJSON(`${DRIVE_UPLOAD}?uploadType=multipart`, token, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
}

/** Descarga el backup más reciente desde contacts/db/ en Google Drive. Retorna base64. */
export async function downloadDB(token: string): Promise<string> {
  const folderId = await getOrCreateFolderPath(token);

  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const data = await driveJSON(
    `${DRIVE_API}?q=${q}&orderBy=createdTime desc&fields=files(id,name)&pageSize=1`,
    token
  );
  if (!data.files?.length) throw new Error('NO_BACKUP');

  const fileId = data.files[0].id;
  const res = await fetch(`${DRIVE_API}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (err?.error?.code === 401) throw new Error('TOKEN_EXPIRED');
    throw new Error(`Error al descargar: ${res.status}`);
  }

  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
