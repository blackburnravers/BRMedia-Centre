import { DJ_BEAT_JUMP_SIZES, DJ_LOOP_LENGTHS } from "./defaults";
import { validateLocalSettingsPath } from "./pathValidation";
import type { SettingsModuleName } from "./service";
import { BrMediaSettings } from "./types";
import { SettingsValidationError } from "./validation";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function error(path: string, message: string, received: unknown): SettingsValidationError {
  return { path, code: "INVALID_RELATIONSHIP", message, received };
}

function sameAllowed(value: unknown, allowed: readonly number[]): boolean {
  return Array.isArray(value) && value.length > 0 &&
    value.every((entry) => typeof entry === "number" && allowed.includes(entry));
}

export function validateU6ModuleUpdate(
  module: SettingsModuleName,
  update: unknown,
  candidate: BrMediaSettings,
): SettingsValidationError[] {
  if (module !== "dj" || !isRecord(update)) return [];
  const errors: SettingsValidationError[] = [];


  if (isRecord(update.audioRouting) && "mode" in update.audioRouting &&
      update.audioRouting.mode !== "pc-only") {
    errors.push(error(
      "dj.audioRouting.mode",
      "iPhone and combined audio routing are planned and unavailable in U6. PC-only remains active.",
      update.audioRouting.mode,
    ));
  }

  if (isRecord(update.loops)) {
    if ("availableLengths" in update.loops &&
        !sameAllowed(update.loops.availableLengths, DJ_LOOP_LENGTHS)) {
      errors.push(error("dj.loops.availableLengths", "Loop sizes must use the existing supported 1/512–512 beat values.", update.loops.availableLengths));
    }
    if (!candidate.dj.loops.availableLengths.includes(candidate.dj.loops.defaultLengthBeats)) {
      errors.push(error("dj.loops.defaultLengthBeats", "Default loop length must be present in the available loop-size list.", candidate.dj.loops.defaultLengthBeats));
    }
  }
  if (isRecord(update.beatJump)) {
    if ("availableSizes" in update.beatJump &&
        !sameAllowed(update.beatJump.availableSizes, DJ_BEAT_JUMP_SIZES)) {
      errors.push(error("dj.beatJump.availableSizes", "Beat Jump sizes must use the existing supported 1–512 beat values.", update.beatJump.availableSizes));
    }
    if (!candidate.dj.beatJump.availableSizes.includes(candidate.dj.beatJump.defaultBeats)) {
      errors.push(error("dj.beatJump.defaultBeats", "Default Beat Jump size must be present in the available size list.", candidate.dj.beatJump.defaultBeats));
    }
  }

  const pathUpdates: Array<[string, unknown]> = [];
  if (isRecord(update.stems) && "cacheRoot" in update.stems) {
    pathUpdates.push(["dj.stems.cacheRoot", update.stems.cacheRoot]);
  }
  if (isRecord(update.recordingArchive) && "root" in update.recordingArchive) {
    pathUpdates.push(["dj.recordingArchive.root", update.recordingArchive.root]);
  }
  for (const [settingPath, value] of pathUpdates) {
    const status = validateLocalSettingsPath(value, {
      access: "write",
      approvedRoots: candidate.storage.approvedRoots,
      requireApprovedRoot: true,
      requireExisting: false,
    });
    if (!status.valid) {
      errors.push(error(settingPath, `${status.code ?? "INVALID_PATH"}: ${status.message}`, value));
    }
  }

  return errors;
}
