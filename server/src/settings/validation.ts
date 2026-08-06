import { DEFAULT_SETTINGS } from "./defaults";
import { SETTINGS_METADATA, SettingMetadata } from "./metadata";
import { BrMediaSettings, UnknownSettings } from "./types";

export type ValidationErrorCode =
  | "MISSING_SETTING"
  | "INVALID_TYPE"
  | "INVALID_ENUM"
  | "BELOW_MINIMUM"
  | "ABOVE_MAXIMUM"
  | "INVALID_RELATIONSHIP";

export interface SettingsValidationError {
  path: string;
  code: ValidationErrorCode;
  message: string;
  expected?: string;
  received?: unknown;
}

export interface UnknownSettingReport {
  path: string;
  value: unknown;
}

export interface SettingsValidationResult {
  valid: boolean;
  value: Record<string, unknown>;
  unknown: UnknownSettings;
  unknownSettings: UnknownSettingReport[];
  errors: SettingsValidationError[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneUnknown(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneUnknown);
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, cloneUnknown(child)]));
  }
  return value;
}

function validateLeaf(
  path: string,
  value: unknown,
  metadata: SettingMetadata,
  errors: SettingsValidationError[],
): void {
  const actualType = Array.isArray(value)
    ? "array"
    : typeof value === "number" && Number.isInteger(value)
      ? "integer"
      : typeof value;

  const correctType =
    metadata.type === "number"
      ? typeof value === "number" && Number.isFinite(value)
      : metadata.type === "integer"
        ? typeof value === "number" && Number.isSafeInteger(value)
        : metadata.type === actualType;

  if (!correctType) {
    errors.push({
      path,
      code: "INVALID_TYPE",
      message: `${metadata.label} must be ${metadata.type}.`,
      expected: metadata.type,
      received: value,
    });
    return;
  }

  if (metadata.allowedValues && !metadata.allowedValues.some((allowed) => Object.is(allowed, value))) {
    errors.push({
      path,
      code: "INVALID_ENUM",
      message: `${metadata.label} must be one of: ${metadata.allowedValues.join(", ")}.`,
      expected: metadata.allowedValues.join(" | "),
      received: value,
    });
    return;
  }

  if (typeof value === "number") {
    if (metadata.minimum !== undefined && value < metadata.minimum) {
      errors.push({
        path,
        code: "BELOW_MINIMUM",
        message: `${metadata.label} must be at least ${metadata.minimum}.`,
        expected: `>= ${metadata.minimum}`,
        received: value,
      });
    }
    if (metadata.maximum !== undefined && value > metadata.maximum) {
      errors.push({
        path,
        code: "ABOVE_MAXIMUM",
        message: `${metadata.label} must be no more than ${metadata.maximum}.`,
        expected: `<= ${metadata.maximum}`,
        received: value,
      });
    }
  }
}

function validateNode(
  candidate: Record<string, unknown>,
  defaults: Record<string, unknown>,
  path: string,
  output: Record<string, unknown>,
  unknownOutput: Record<string, unknown>,
  unknownSettings: UnknownSettingReport[],
  errors: SettingsValidationError[],
): void {
  Object.entries(defaults).forEach(([key, defaultValue]) => {
    const childPath = path ? `${path}.${key}` : key;

    if (!Object.prototype.hasOwnProperty.call(candidate, key)) {
      errors.push({
        path: childPath,
        code: "MISSING_SETTING",
        message: `${childPath} is required.`,
        received: undefined,
      });
      output[key] = cloneUnknown(defaultValue);
      return;
    }

    const candidateValue = candidate[key];

    if (isRecord(defaultValue)) {
      if (!isRecord(candidateValue)) {
        errors.push({
          path: childPath,
          code: "INVALID_TYPE",
          message: `${childPath} must be an object.`,
          expected: "object",
          received: candidateValue,
        });
        output[key] = cloneUnknown(defaultValue);
        return;
      }

      const childOutput: Record<string, unknown> = {};
      const childUnknown: Record<string, unknown> = {};
      validateNode(
        candidateValue,
        defaultValue,
        childPath,
        childOutput,
        childUnknown,
        unknownSettings,
        errors,
      );
      output[key] = childOutput;
      if (Object.keys(childUnknown).length) unknownOutput[key] = childUnknown;
      return;
    }

    const metadata = SETTINGS_METADATA[childPath];
    if (!metadata) {
      throw new Error(`Missing settings metadata for ${childPath}`);
    }
    validateLeaf(childPath, candidateValue, metadata, errors);
    output[key] = cloneUnknown(candidateValue);
  });

  Object.entries(candidate).forEach(([key, value]) => {
    if (Object.prototype.hasOwnProperty.call(defaults, key)) return;
    const childPath = path ? `${path}.${key}` : key;
    const preserved = cloneUnknown(value);
    output[key] = preserved;
    unknownOutput[key] = preserved;
    unknownSettings.push({ path: childPath, value: preserved });
  });
}

function validateRelationships(value: Record<string, unknown>, errors: SettingsValidationError[]): void {
  const dj = isRecord(value.dj) ? value.dj : {};
  const decks = isRecord(dj.decks) ? dj.decks : {};
  const grid = isRecord(dj.grid) ? dj.grid : {};
  const sync = isRecord(dj.sync) ? dj.sync : {};
  const loops = isRecord(dj.loops) ? dj.loops : {};
  const beatJump = isRecord(dj.beatJump) ? dj.beatJump : {};

  if (
    typeof decks.minimumPlaybackRate === "number" &&
    typeof decks.maximumPlaybackRate === "number" &&
    decks.minimumPlaybackRate > decks.maximumPlaybackRate
  ) {
    errors.push({
      path: "dj.decks.maximumPlaybackRate",
      code: "INVALID_RELATIONSHIP",
      message: "Maximum playback rate must be at least the minimum playback rate.",
    });
  }

  if (
    typeof grid.minimumBpm === "number" &&
    typeof grid.maximumBpm === "number" &&
    grid.minimumBpm >= grid.maximumBpm
  ) {
    errors.push({
      path: "dj.grid.maximumBpm",
      code: "INVALID_RELATIONSHIP",
      message: "Maximum BPM must be greater than minimum BPM.",
    });
  }

  if (
    typeof sync.phaseLockToleranceMs === "number" &&
    typeof sync.phaseReleaseToleranceMs === "number" &&
    sync.phaseReleaseToleranceMs < sync.phaseLockToleranceMs
  ) {
    errors.push({
      path: "dj.sync.phaseReleaseToleranceMs",
      code: "INVALID_RELATIONSHIP",
      message: "Sync release tolerance must be at least the lock tolerance.",
    });
  }

  if (
    typeof loops.defaultLengthBeats === "number" &&
    Array.isArray(loops.availableLengths) &&
    !loops.availableLengths.includes(loops.defaultLengthBeats)
  ) {
    errors.push({
      path: "dj.loops.defaultLengthBeats",
      code: "INVALID_RELATIONSHIP",
      message: "Default loop length must be included in available loop lengths.",
    });
  }

  if (
    typeof beatJump.defaultBeats === "number" &&
    Array.isArray(beatJump.availableSizes) &&
    !beatJump.availableSizes.includes(beatJump.defaultBeats)
  ) {
    errors.push({
      path: "dj.beatJump.defaultBeats",
      code: "INVALID_RELATIONSHIP",
      message: "Default Beat Jump must be included in available Beat Jump sizes.",
    });
  }
}

export function validateSettings(input: unknown): SettingsValidationResult {
  const errors: SettingsValidationError[] = [];
  const unknownSettings: UnknownSettingReport[] = [];
  const value: Record<string, unknown> = {};
  const unknown: UnknownSettings = {};

  if (!isRecord(input)) {
    return {
      valid: false,
      value,
      unknown,
      unknownSettings,
      errors: [{
        path: "",
        code: "INVALID_TYPE",
        message: "Settings must be an object.",
        expected: "object",
        received: input,
      }],
    };
  }

  validateNode(
    input,
    DEFAULT_SETTINGS as unknown as Record<string, unknown>,
    "",
    value,
    unknown,
    unknownSettings,
    errors,
  );
  validateRelationships(value, errors);

  return {
    valid: errors.length === 0,
    value,
    unknown,
    unknownSettings,
    errors,
  };
}

export function isValidSettings(input: unknown): input is BrMediaSettings {
  return validateSettings(input).valid;
}
