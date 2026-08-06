import { validateLocalSettingsPath } from "./pathValidation";
import type { SettingsModuleName } from "./service";
import { BrMediaSettings } from "./types";
import { SettingsValidationError } from "./validation";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pathError(path: string, code: "INVALID_RELATIONSHIP", message: string, received: unknown): SettingsValidationError {
  return { path, code, message, expected: "approved local directory", received };
}

export function validateU5ModuleUpdate(
  module: SettingsModuleName,
  update: unknown,
  candidate: BrMediaSettings,
): SettingsValidationError[] {
  if (module !== "torrents" || !isRecord(update)) return [];
  const errors: SettingsValidationError[] = [];

  if ("engineUrl" in update) {
    const value = update.engineUrl;
    try {
      const parsed = new URL(String(value));
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        errors.push(pathError("torrents.engineUrl", "INVALID_RELATIONSHIP", "qBittorrent URL must use HTTP or HTTPS.", value));
      }
    } catch {
      errors.push(pathError("torrents.engineUrl", "INVALID_RELATIONSHIP", "Enter a valid qBittorrent HTTP or HTTPS URL.", value));
    }
  }

  for (const key of ["savePath", "quarantineFolder"] as const) {
    if (!(key in update)) continue;
    const status = validateLocalSettingsPath(update[key], {
      access: "write",
      approvedRoots: candidate.storage.approvedRoots,
      requireApprovedRoot: true,
      requireExisting: false,
    });
    if (!status.valid) {
      errors.push(pathError(`torrents.${key}`, "INVALID_RELATIONSHIP", `${status.code ?? "INVALID_PATH"}: ${status.message}`, update[key]));
    }
  }

  return errors;
}
