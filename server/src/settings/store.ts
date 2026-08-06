import fs from "node:fs";
import path from "node:path";
import { DEFAULT_SETTINGS } from "./defaults";
import { writeJsonAtomically } from "./atomicWriter";
import { BrMediaSettings } from "./types";
import {
  SettingsValidationError,
  UnknownSettingReport,
  validateSettings,
} from "./validation";

export const DEFAULT_SETTINGS_DIRECTORY = path.resolve(process.cwd(), "server", "data", "settings");
export const DEFAULT_SETTINGS_PATH = path.join(DEFAULT_SETTINGS_DIRECTORY, "brmedia-settings.json");
export const DEFAULT_SETTINGS_BACKUP_PATH = `${DEFAULT_SETTINGS_PATH}.lkg`;

export type SettingsStoreState = "defaults" | "healthy" | "recovered-from-backup" | "invalid";

export interface SettingsStoreHealth {
  state: SettingsStoreState;
  settingsPath: string;
  backupPath: string;
  mainExists: boolean;
  backupExists: boolean;
  source: "defaults" | "main" | "backup";
  writable: boolean;
  message: string;
  errors: SettingsValidationError[];
}

export interface SettingsStoreSnapshot {
  settings: BrMediaSettings;
  unknownSettings: UnknownSettingReport[];
  health: SettingsStoreHealth;
}

export interface SettingsStoreOptions {
  settingsPath?: string;
  backupPath?: string;
  now?: () => Date;
}

interface ParsedSettings {
  settings: BrMediaSettings;
  unknownSettings: UnknownSettingReport[];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeOverDefaults(defaultValue: unknown, savedValue: unknown): unknown {
  if (!isRecord(defaultValue) || !isRecord(savedValue)) return clone(savedValue);
  const merged: Record<string, unknown> = clone(defaultValue);
  for (const [key, value] of Object.entries(savedValue)) {
    merged[key] = Object.prototype.hasOwnProperty.call(defaultValue, key)
      ? mergeOverDefaults(defaultValue[key], value)
      : clone(value);
  }
  return merged;
}

function parseSettingsFile(filePath: string): ParsedSettings {
  const parsed: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const validation = validateSettings(mergeOverDefaults(DEFAULT_SETTINGS, parsed));
  if (!validation.valid) {
    const error = new Error(`Settings validation failed for ${filePath}.`);
    Object.assign(error, { validationErrors: validation.errors });
    throw error;
  }
  return {
    settings: validation.value as unknown as BrMediaSettings,
    unknownSettings: validation.unknownSettings,
  };
}

function validationErrorsFrom(error: unknown): SettingsValidationError[] {
  if (isRecord(error) && Array.isArray(error.validationErrors)) {
    return error.validationErrors as SettingsValidationError[];
  }
  return [{
    path: "",
    code: "INVALID_TYPE",
    message: error instanceof Error ? error.message : String(error),
  }];
}

export class SettingsStore {
  readonly settingsPath: string;
  readonly backupPath: string;
  private readonly now: () => Date;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(options: SettingsStoreOptions = {}) {
    this.settingsPath = options.settingsPath ?? DEFAULT_SETTINGS_PATH;
    this.backupPath = options.backupPath ?? `${this.settingsPath}.lkg`;
    this.now = options.now ?? (() => new Date());
  }

  read(): SettingsStoreSnapshot {
    const mainExists = fs.existsSync(this.settingsPath);
    const backupExists = fs.existsSync(this.backupPath);
    if (!mainExists) {
      return {
        settings: clone(DEFAULT_SETTINGS),
        unknownSettings: [],
        health: {
          state: "defaults",
          settingsPath: this.settingsPath,
          backupPath: this.backupPath,
          mainExists,
          backupExists,
          source: "defaults",
          writable: true,
          message: "No persistent settings file exists; defaults are active.",
          errors: [],
        },
      };
    }

    try {
      const parsed = parseSettingsFile(this.settingsPath);
      return {
        ...parsed,
        health: {
          state: "healthy",
          settingsPath: this.settingsPath,
          backupPath: this.backupPath,
          mainExists,
          backupExists,
          source: "main",
          writable: true,
          message: "Persistent settings loaded successfully.",
          errors: [],
        },
      };
    } catch (mainError) {
      if (backupExists) {
        try {
          const parsed = parseSettingsFile(this.backupPath);
          return {
            ...parsed,
            health: {
              state: "recovered-from-backup",
              settingsPath: this.settingsPath,
              backupPath: this.backupPath,
              mainExists,
              backupExists,
              source: "backup",
              writable: false,
              message: "Main settings are invalid; last-known-good settings are active. The corrupt file was preserved.",
              errors: validationErrorsFrom(mainError),
            },
          };
        } catch (backupError) {
          return {
            settings: clone(DEFAULT_SETTINGS),
            unknownSettings: [],
            health: {
              state: "invalid",
              settingsPath: this.settingsPath,
              backupPath: this.backupPath,
              mainExists,
              backupExists,
              source: "defaults",
              writable: false,
              message: "Main and last-known-good settings are invalid. Defaults are active in memory; no files were changed.",
              errors: [...validationErrorsFrom(mainError), ...validationErrorsFrom(backupError)],
            },
          };
        }
      }
      return {
        settings: clone(DEFAULT_SETTINGS),
        unknownSettings: [],
        health: {
          state: "invalid",
          settingsPath: this.settingsPath,
          backupPath: this.backupPath,
          mainExists,
          backupExists,
          source: "defaults",
          writable: false,
          message: "Main settings are invalid and no backup is available. Defaults are active in memory; the corrupt file was preserved.",
          errors: validationErrorsFrom(mainError),
        },
      };
    }
  }

  getNow(): Date { return this.now(); }

  async recover(replacement: BrMediaSettings): Promise<SettingsStoreSnapshot> {
    let result: SettingsStoreSnapshot | undefined;
    let failure: unknown;
    this.writeQueue = this.writeQueue.then(async () => {
      const validation = validateSettings(replacement);
      if (!validation.valid) {
        const error = new Error("Settings recovery failed validation.");
        Object.assign(error, { validationErrors: validation.errors });
        throw error;
      }
      if (fs.existsSync(this.settingsPath)) {
        const corruptCopy = `${this.settingsPath}.corrupt-${this.now().toISOString().replace(/[:.]/g, "-")}`;
        fs.copyFileSync(this.settingsPath, corruptCopy, fs.constants.COPYFILE_EXCL);
      }
      writeJsonAtomically(
        { targetPath: this.settingsPath, backupPath: this.backupPath },
        validation.value,
        (value) => validateSettings(mergeOverDefaults(DEFAULT_SETTINGS, value)).valid,
      );
      result = this.read();
    }).catch((error: unknown) => { failure = error; });
    await this.writeQueue;
    if (failure) throw failure;
    if (!result) throw new Error("Settings recovery did not produce a result.");
    return result;
  }
  async update(transform: (current: BrMediaSettings) => BrMediaSettings): Promise<SettingsStoreSnapshot> {
    let result: SettingsStoreSnapshot | undefined;
    let failure: unknown;
    this.writeQueue = this.writeQueue.then(async () => {
      const current = this.read();
      if (!current.health.writable) throw new Error(current.health.message);

      const validation = validateSettings(transform(clone(current.settings)));
      if (!validation.valid) {
        const error = new Error("Settings update failed validation.");
        Object.assign(error, { validationErrors: validation.errors });
        throw error;
      }

      const next = validation.value as unknown as BrMediaSettings;
      const timestamp = this.now().toISOString();
      next.metadata = {
        ...next.metadata,
        createdAt: current.settings.metadata.createdAt === "1970-01-01T00:00:00.000Z"
          ? timestamp
          : current.settings.metadata.createdAt,
        updatedAt: timestamp,
        revision: current.settings.metadata.revision + 1,
      };
      writeJsonAtomically(
        { targetPath: this.settingsPath, backupPath: this.backupPath },
        next,
        (value) => validateSettings(mergeOverDefaults(DEFAULT_SETTINGS, value)).valid,
      );
      result = this.read();
    }).catch((error: unknown) => {
      failure = error;
    });

    await this.writeQueue;
    if (failure) throw failure;
    if (!result) throw new Error("Settings update did not produce a result.");
    return result;
  }
}
