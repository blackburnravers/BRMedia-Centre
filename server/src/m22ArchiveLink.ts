import fs from "node:fs";
import path from "node:path";

export type M22ArchiveLink = {
  setPlanId: string;
  finalTracklistId: string;
  completionTimestamp: number;
  tracks: unknown[];
  unmatched: unknown[];
};

type TransactionTarget = {
  recordingId: string;
  manifestPath: string;
  archiveDirectory: string;
};

function atomicWrite(filePath: string, content: string) {
  const temporary = `${filePath}.m22-${process.pid}.tmp`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(temporary, content, "utf8");
  fs.renameSync(temporary, filePath);
}

function text(link: M22ArchiveLink) {
  return link.tracks.map((item: any, index) => {
    const snapshot = item?.track?.snapshot || {};
    return `${String(index + 1).padStart(2, "0")}. ${snapshot.artist || "Unknown artist"} - ${snapshot.title || "Untitled"}`;
  }).join("\n") + "\n";
}

export function updateM22ArchiveLink(target: TransactionTarget, link: M22ArchiveLink | null) {
  const manifestPath = path.resolve(target.manifestPath);
  const archiveDirectory = path.resolve(target.archiveDirectory);
  if (!fs.existsSync(manifestPath)) throw new Error("Recording manifest is unavailable");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (String(manifest.id) !== target.recordingId) throw new Error("Recording identity mismatch");
  if (!archiveDirectory || !fs.existsSync(archiveDirectory)) throw new Error("Recording archive directory is unavailable");
  const currentId = String(manifest.setPlan?.setPlanId || "");
  if (link && currentId && currentId !== link.setPlanId) throw new Error("Recording is linked to another Set Plan");
  if (link && currentId === link.setPlanId && manifest.setPlan?.finalTracklistId === link.finalTracklistId) return { changed: false, linked: true };
  if (!link && !currentId) return { changed: false, linked: false };

  const jsonPath = path.join(archiveDirectory, "set-plan.json");
  const txtPath = path.join(archiveDirectory, "tracklist.txt");
  const journalPath = `${manifestPath}.m22-link-journal.json`;
  const originals = new Map<string, Buffer | null>();
  for (const filePath of [manifestPath, jsonPath, txtPath]) originals.set(filePath, fs.existsSync(filePath) ? fs.readFileSync(filePath) : null);
  atomicWrite(journalPath, JSON.stringify({ version: 1, recordingId: target.recordingId, setPlanId: link?.setPlanId || null, startedAt: Date.now() }));
  try {
    if (link) {
      const setPlan = { ...link, linkedAt: Date.now() };
      manifest.setPlan = setPlan;
      manifest.sidecarFiles = Array.from(new Set([...(Array.isArray(manifest.sidecarFiles) ? manifest.sidecarFiles : []), jsonPath, txtPath]));
      atomicWrite(jsonPath, `${JSON.stringify({ version: 1, recordingId: target.recordingId, ...setPlan }, null, 2)}\n`);
      atomicWrite(txtPath, text(link));
    } else {
      manifest.setPlan = {};
      manifest.sidecarFiles = (Array.isArray(manifest.sidecarFiles) ? manifest.sidecarFiles : []).filter((item: unknown) => path.resolve(String(item)) !== jsonPath);
      if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
    }
    atomicWrite(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    fs.unlinkSync(journalPath);
    return { changed: true, linked: Boolean(link) };
  } catch (error) {
    for (const [filePath, original] of originals) {
      try { if (original === null) { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } else { fs.writeFileSync(filePath, original); } } catch {}
    }
    try { if (fs.existsSync(journalPath)) fs.unlinkSync(journalPath); } catch {}
    throw error;
  }
}
