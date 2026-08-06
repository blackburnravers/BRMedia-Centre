import fs from "node:fs";
import path from "node:path";

export interface AtomicWritePaths {
  targetPath: string;
  backupPath: string;
}

export interface AtomicWriteResult {
  targetPath: string;
  backupPath: string;
  backupCreated: boolean;
}

function syncDirectory(directoryPath: string): void {
  let handle: number | undefined;
  try {
    handle = fs.openSync(directoryPath, "r");
    fs.fsyncSync(handle);
  } catch {
    // Directory fsync is not supported consistently on Windows.
  } finally {
    if (handle !== undefined) fs.closeSync(handle);
  }
}

function writeSyncedFile(filePath: string, contents: string): void {
  const handle = fs.openSync(filePath, "wx");
  try {
    fs.writeFileSync(handle, contents, "utf8");
    fs.fsyncSync(handle);
  } finally {
    fs.closeSync(handle);
  }
}

function uniqueTemporaryPath(targetPath: string): string {
  return `${targetPath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
}

function replaceWithSyncedTemporary(targetPath: string, contents: string): void {
  const temporaryPath = uniqueTemporaryPath(targetPath);
  try {
    writeSyncedFile(temporaryPath, contents);
    fs.renameSync(temporaryPath, targetPath);
    syncDirectory(path.dirname(targetPath));
  } finally {
    try {
      if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
    } catch {
      // Leave an unremovable temporary file for diagnosis.
    }
  }
}

export function cleanupAbandonedTemporaryFiles(targetPath: string): string[] {
  const directoryPath = path.dirname(targetPath);
  if (!fs.existsSync(directoryPath)) return [];

  const prefix = `${path.basename(targetPath)}.`;
  const removed: string[] = [];
  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.startsWith(prefix) || !entry.name.endsWith(".tmp")) continue;
    const candidate = path.join(directoryPath, entry.name);
    try {
      fs.unlinkSync(candidate);
      removed.push(candidate);
    } catch {
      // Cleanup is best effort and never blocks a valid requested update.
    }
  }
  return removed;
}

export function writeJsonAtomically(
  paths: AtomicWritePaths,
  value: unknown,
  isExistingFileValid: (value: unknown) => boolean,
): AtomicWriteResult {
  const directoryPath = path.dirname(paths.targetPath);
  fs.mkdirSync(directoryPath, { recursive: true });
  cleanupAbandonedTemporaryFiles(paths.targetPath);

  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  let backupCreated = false;

  if (fs.existsSync(paths.targetPath)) {
    try {
      const existingText = fs.readFileSync(paths.targetPath, "utf8");
      const existingValue: unknown = JSON.parse(existingText);
      if (isExistingFileValid(existingValue)) {
        replaceWithSyncedTemporary(paths.backupPath, existingText);
        backupCreated = true;
      }
    } catch {
      // Never copy corrupt current data over the last-known-good backup.
    }
  }

  replaceWithSyncedTemporary(paths.targetPath, serialized);

  if (!fs.existsSync(paths.backupPath)) {
    replaceWithSyncedTemporary(paths.backupPath, serialized);
    backupCreated = true;
  }

  return {
    targetPath: paths.targetPath,
    backupPath: paths.backupPath,
    backupCreated,
  };
}
