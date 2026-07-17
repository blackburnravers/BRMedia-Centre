import fs from "node:fs";
import path from "node:path";
import { getAllEnabledLibrarySourcePaths } from "../librarySources";

export type ServerConfig = {
  port: number;
  rangeStreaming: boolean;
  localAllowedBases: string[]; // absolute folder paths
};

function readDefaultsJson(): Partial<ServerConfig> {
  try {
    const p = path.join(__dirname, "defaults.json");
    const raw = fs.readFileSync(p, "utf-8");
    return JSON.parse(raw) as Partial<ServerConfig>;
  } catch {
    return {};
  }
}

function parseAllowedBases(envValue: string | undefined): string[] {
  if (!envValue) return [];

  return envValue
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((p) => path.resolve(p));
}

function uniquePaths(paths: string[]): string[] {
  return Array.from(new Set(paths.map((p) => path.resolve(p))));
}

function loadServerEnvFile() {
  const candidates = [
    path.resolve(process.cwd(), "server", ".env"),
    path.resolve(process.cwd(), ".env"),
  ];

  const envPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!envPath) return;

  const raw = fs.readFileSync(envPath, "utf-8");

  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) return;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex <= 0) return;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

export function loadConfig(): ServerConfig {
  loadServerEnvFile();

  const defaults = readDefaultsJson();

  const port =
    (process.env.PORT ? Number(process.env.PORT) : undefined) ??
    defaults.port ??
    8787;

  const rangeStreaming =
    (process.env.RANGE_STREAMING
      ? process.env.RANGE_STREAMING === "true"
      : undefined) ??
    defaults.rangeStreaming ??
    true;

  const localAllowedBases = uniquePaths([
    ...parseAllowedBases(defaults.localAllowedBases?.join(";")),
    ...parseAllowedBases(process.env.BRMEDIA_AUDIO_DIRS || "C:\\DJMixes"),
    ...parseAllowedBases(process.env.BRMEDIA_VIDEO_DIRS || process.env.VIDEO_LIBRARY_DIRS || "C:\\Videos"),
    ...parseAllowedBases(process.env.LOCAL_ALLOWED_BASES),
    ...getAllEnabledLibrarySourcePaths(),
  ]);

  return {
    port,
    rangeStreaming,
    localAllowedBases,
  };
}