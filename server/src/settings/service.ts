import { SETTINGS_METADATA } from "./metadata";
import { validateU4ModuleUpdate } from "./u4Validation";
import { validateU5ModuleUpdate } from "./u5Validation";
import { validateU6ModuleUpdate } from "./u6Validation";
import { validateU7ModuleUpdate } from "./u7Validation";
import { getDjApplyMode } from "./djAdapters";
import { SettingsStore, SettingsStoreHealth } from "./store";
import { BrMediaSettings } from "./types";
import {
  SettingsValidationError,
  UnknownSettingReport,
  validateSettings,
} from "./validation";

export const SETTINGS_MODULES = [
  "universal", "server", "storage", "library", "audioPlayer", "videoPlayer",
  "converter", "tagger", "mastering", "torrents", "profiles", "notifications",
  "backup", "diagnostics", "dj",
] as const;

export type SettingsModuleName = typeof SETTINGS_MODULES[number];
export type SettingsModuleValue<M extends SettingsModuleName> = BrMediaSettings[M];

export interface SettingsRequirements {
  serverRestartRequired: boolean;
  pageReloadRequired: boolean;
  mixerRestartRequired: boolean;
  paths: string[];
  applicationModes: Record<string, string[]>;
}

export interface SettingsServiceResult<T> {
  ok: true;
  data: T;
  unknownSettings: UnknownSettingReport[];
  requirements: SettingsRequirements;
  health: SettingsStoreHealth;
}

export interface SettingsServiceFailure {
  ok: false;
  code: "INVALID_UPDATE" | "STORE_UNAVAILABLE";
  message: string;
  errors: SettingsValidationError[];
}

export interface SettingsValidationPreview {
  valid: boolean;
  errors: SettingsValidationError[];
  unknownSettings: UnknownSettingReport[];
  requirements: SettingsRequirements;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function mergePartial(current: unknown, update: unknown): unknown {
  if (!isRecord(current) || !isRecord(update)) return clone(update);
  const merged: Record<string, unknown> = clone(current);
  for (const [key, value] of Object.entries(update)) {
    merged[key] = isRecord(value) && isRecord(current[key])
      ? mergePartial(current[key], value)
      : clone(value);
  }
  return merged;
}

export function isSettingsModuleName(value: string): value is SettingsModuleName {
  return (SETTINGS_MODULES as readonly string[]).includes(value);
}

function moduleUnknownSettings(
  module: SettingsModuleName,
  entries: UnknownSettingReport[],
): UnknownSettingReport[] {
  return entries.filter((entry) => entry.path === module || entry.path.startsWith(`${module}.`));
}

function requirementsForChanges(
  before: unknown,
  after: unknown,
  pathPrefix: string,
): SettingsRequirements {
  const changedPaths: string[] = [];
  const visit = (left: unknown, right: unknown, currentPath: string): void => {
    if (isRecord(left) && isRecord(right)) {
      const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
      keys.forEach((key) => visit(left[key], right[key], currentPath ? `${currentPath}.${key}` : key));
      return;
    }
    if (JSON.stringify(left) !== JSON.stringify(right)) changedPaths.push(currentPath);
  };
  visit(before, after, pathPrefix);

  return {
    serverRestartRequired: changedPaths.some((path) =>
      SETTINGS_METADATA[path]?.restartRequired === "server-restart"
    ),
    pageReloadRequired: changedPaths.some((path) =>
      SETTINGS_METADATA[path]?.pageReloadRequired === true ||
      SETTINGS_METADATA[path]?.restartRequired === "page-reload"
    ),
    mixerRestartRequired: changedPaths.some((path) =>
      SETTINGS_METADATA[path]?.restartRequired === "mixer-restart"
    ),
    paths: changedPaths,
    applicationModes: changedPaths.reduce<Record<string, string[]>>((modes, path) => {
      if (!path.startsWith("dj.")) return modes;
      const mode = getDjApplyMode(path);
      (modes[mode] ??= []).push(path);
      return modes;
    }, {}),
  };
}

function redactNode(value: unknown, pathPrefix = ""): unknown {
  if (!isRecord(value)) return clone(value);
  const redacted: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    const childPath = pathPrefix ? `${pathPrefix}.${key}` : key;
    redacted[key] = SETTINGS_METADATA[childPath]?.sensitive
      ? "[REDACTED]"
      : redactNode(child, childPath);
  }
  return redacted;
}

export class SettingsService {
  constructor(private readonly store: SettingsStore = new SettingsStore()) {}

  readAll(browserSafe = false): SettingsServiceResult<BrMediaSettings> {
    const snapshot = this.store.read();
    return {
      ok: true,
      data: (browserSafe ? redactNode(snapshot.settings) : clone(snapshot.settings)) as BrMediaSettings,
      unknownSettings: snapshot.unknownSettings,
      requirements: requirementsForChanges(snapshot.settings, snapshot.settings, ""),
      health: snapshot.health,
    };
  }

  readModule<M extends SettingsModuleName>(
    module: M,
    browserSafe = false,
  ): SettingsServiceResult<SettingsModuleValue<M>> {
    const snapshot = this.store.read();
    const value = snapshot.settings[module];
    return {
      ok: true,
      data: (browserSafe ? redactNode(value, module) : clone(value)) as SettingsModuleValue<M>,
      unknownSettings: moduleUnknownSettings(module, snapshot.unknownSettings),
      requirements: requirementsForChanges(value, value, module),
      health: snapshot.health,
    };
  }

  validateModuleUpdate<M extends SettingsModuleName>(
    module: M,
    update: unknown,
  ): SettingsValidationPreview {
    const snapshot = this.store.read();
    if (!isRecord(update)) {
      return {
        valid: false,
        errors: [{
          path: module,
          code: "INVALID_TYPE",
          message: `${module} update must be an object.`,
          expected: "object",
          received: update,
        }],
        unknownSettings: [],
        requirements: requirementsForChanges(snapshot.settings[module], snapshot.settings[module], module),
      };
    }

    const candidate = clone(snapshot.settings);
    candidate[module] = mergePartial(candidate[module], update) as BrMediaSettings[M];
    const validation = validateSettings(candidate);
    const u4Errors = validateU4ModuleUpdate(module, update, candidate);
    const u5Errors = validateU5ModuleUpdate(module, update, candidate);
    const u6Errors = validateU6ModuleUpdate(module, update, candidate);
    const u7Errors = validateU7ModuleUpdate(module, update, candidate);
    return {
      valid: validation.valid && u4Errors.length === 0 && u5Errors.length === 0 && u6Errors.length === 0 && u7Errors.length === 0,
      errors: [...validation.errors, ...u4Errors, ...u5Errors, ...u6Errors, ...u7Errors],
      unknownSettings: moduleUnknownSettings(module, validation.unknownSettings),
      requirements: requirementsForChanges(snapshot.settings[module], candidate[module], module),
    };
  }

  async updateModule<M extends SettingsModuleName>(
    module: M,
    update: unknown,
  ): Promise<SettingsServiceResult<SettingsModuleValue<M>> | SettingsServiceFailure> {
    const preview = this.validateModuleUpdate(module, update);
    if (!preview.valid) {
      return {
        ok: false,
        code: "INVALID_UPDATE",
        message: "Settings update failed validation.",
        errors: preview.errors,
      };
    }

    try {
      const snapshot = await this.store.update((current) => {
        const next = clone(current);
        next[module] = mergePartial(next[module], update) as BrMediaSettings[M];
        return next;
      });
      return {
        ok: true,
        data: clone(snapshot.settings[module]),
        unknownSettings: moduleUnknownSettings(module, snapshot.unknownSettings),
        requirements: preview.requirements,
        health: snapshot.health,
      };
    } catch (error) {
      const errors = isRecord(error) && Array.isArray(error.validationErrors)
        ? error.validationErrors as SettingsValidationError[]
        : [];
      return {
        ok: false,
        code: errors.length ? "INVALID_UPDATE" : "STORE_UNAVAILABLE",
        message: error instanceof Error ? error.message : String(error),
        errors,
      };
    }
  }

  getStore(): SettingsStore { return this.store; }

  health(): SettingsStoreHealth {
    return this.store.read().health;
  }
}

export function redactSensitiveSettings(value: BrMediaSettings): BrMediaSettings {
  return redactNode(value) as BrMediaSettings;
}
