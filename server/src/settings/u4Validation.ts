import { BrMediaSettings } from "./types";
import { validateLibrarySources, validateLocalSettingsPath } from "./pathValidation";
import { SettingsValidationError } from "./validation";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function error(path: string, message: string, received?: unknown): SettingsValidationError {
  return { path, code: "INVALID_RELATIONSHIP", message, received };
}

function validateRootArray(
  key: "audioRoots" | "videoRoots" | "approvedRoots",
  value: unknown,
  projectRoot: string,
): SettingsValidationError[] {
  if (!Array.isArray(value)) {
    return [{ path: key === "approvedRoots" ? `storage.${key}` : `library.${key}`, code: "INVALID_TYPE", message: `${key} must be an array.`, received: value }];
  }
  const prefix = key === "approvedRoots" ? "storage" : "library";
  const seen = new Set<string>();
  const errors: SettingsValidationError[] = [];
  value.forEach((entry, index) => {
    const status = validateLocalSettingsPath(entry, { requireExisting: true, projectRoot });
    if (!status.valid) errors.push(error(`${prefix}.${key}.${index}`, status.message, entry));
    const comparable = status.normalizedPath?.toLowerCase() ?? String(entry).toLowerCase();
    if (seen.has(comparable)) errors.push(error(`${prefix}.${key}.${index}`, "Duplicate paths are not allowed.", entry));
    seen.add(comparable);
  });
  return errors;
}

export function validateU4ModuleUpdate(
  module: string,
  update: unknown,
  candidate: BrMediaSettings,
  projectRoot = process.cwd(),
): SettingsValidationError[] {
  if (!isRecord(update)) return [];
  const errors: SettingsValidationError[] = [];

  if (module === "server") {
    if (Object.prototype.hasOwnProperty.call(update, "host") && (typeof update.host !== "string" || !update.host.trim())) {
      errors.push(error("server.host", "Server host must not be empty.", update.host));
    }
    if (Object.prototype.hasOwnProperty.call(update, "publicBaseUrl") && update.publicBaseUrl !== "") {
      try {
        const parsed = new URL(String(update.publicBaseUrl));
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
      } catch {
        errors.push(error("server.publicBaseUrl", "Public base URL must be an HTTP or HTTPS URL.", update.publicBaseUrl));
      }
    }
  }

  if (module === "storage") {
    if (Object.prototype.hasOwnProperty.call(update, "approvedRoots")) {
      errors.push(...validateRootArray("approvedRoots", update.approvedRoots, projectRoot));
    }
    const writableKeys = [
      "temporaryRoot", "cacheRoot", "recordingTemporaryRoot", "recordingArchiveRoot", "logsRoot",
    ] as const;
    writableKeys.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(update, key)) return;
      const value = update[key];
      const status = validateLocalSettingsPath(value, {
        access: "write",
        approvedRoots: candidate.storage.approvedRoots,
        requireApprovedRoot: true,
        requireExisting: true,
        projectRoot,
      });
      if (!status.valid) errors.push(error(`storage.${key}`, status.message, value));
    });
  }

  if (module === "library") {
    if (Object.prototype.hasOwnProperty.call(update, "audioRoots")) {
      errors.push(...validateRootArray("audioRoots", update.audioRoots, projectRoot));
    }
    if (Object.prototype.hasOwnProperty.call(update, "videoRoots")) {
      errors.push(...validateRootArray("videoRoots", update.videoRoots, projectRoot));
    }
    if (Object.prototype.hasOwnProperty.call(update, "sources")) {
      const validation = validateLibrarySources(update.sources, candidate.storage.approvedRoots, projectRoot);
      validation.errors.forEach((item) => errors.push(error(item.path, item.message)));
    }
  }

  return errors;
}
