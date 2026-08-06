import type { SettingsModuleName } from "./service";
import { BrMediaSettings } from "./types";
import { SettingsValidationError } from "./validation";
import { validateLocalSettingsPath } from "./pathValidation";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function relationship(path: string, message: string, received: unknown): SettingsValidationError {
  return { path, code: "INVALID_RELATIONSHIP", message, received };
}

export function validateU7ModuleUpdate(
  module: SettingsModuleName,
  update: unknown,
  candidate: BrMediaSettings,
): SettingsValidationError[] {
  if (module !== "diagnostics" || !isRecord(update)) return [];
  const errors: SettingsValidationError[] = [];
  const automatic = candidate.diagnostics.automaticRefreshSeconds;
  if (automatic > 0 && automatic < 60) {
    errors.push(relationship(
      "diagnostics.automaticRefreshSeconds",
      "Automatic health refresh must be off (0) or at least 60 seconds.",
      automatic,
    ));
  }
  if (candidate.diagnostics.storageCriticalFreePercent >=
      candidate.diagnostics.storageWarningFreePercent) {
    errors.push(relationship(
      "diagnostics.storageCriticalFreePercent",
      "Critical free-space percentage must be lower than the warning percentage.",
      candidate.diagnostics.storageCriticalFreePercent,
    ));
  }
  return errors;
}
