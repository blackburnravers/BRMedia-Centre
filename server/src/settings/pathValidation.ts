import fs from "node:fs";
import path from "node:path";
import { LibrarySourcePreference } from "./types";

export type PathAccess = "read" | "write";
export type PathValidationCode =
  | "EMPTY_PATH"
  | "TRAVERSAL"
  | "UNSUPPORTED_PATH"
  | "NETWORK_PATH"
  | "SYSTEM_PATH"
  | "OUTSIDE_APPROVED_ROOTS"
  | "MISSING"
  | "NOT_DIRECTORY"
  | "UNREADABLE"
  | "UNWRITABLE";

export interface LocalPathValidationOptions {
  access?: PathAccess;
  approvedRoots?: readonly string[];
  requireApprovedRoot?: boolean;
  requireExisting?: boolean;
  projectRoot?: string;
}

export interface LocalPathValidationResult {
  valid: boolean;
  input: string;
  normalizedPath: string | null;
  exists: boolean;
  directory: boolean | null;
  readable: boolean;
  writable: boolean;
  approved: boolean;
  code?: PathValidationCode;
  message: string;
}

export interface LibrarySourcesValidationResult {
  valid: boolean;
  sources: LibrarySourcePreference[];
  errors: Array<{ path: string; code: string; message: string }>;
  statuses: LocalPathValidationResult[];
}

function isWindowsAbsolute(value: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(value);
}

function isApplicationRelative(value: string): boolean {
  return /^(server[\\/]data)([\\/]|$)/i.test(value);
}

function containsTraversal(value: string): boolean {
  return value.split(/[\\/]+/).some((segment) => segment === "..");
}

function comparable(value: string): string {
  return value.replace(/[\\/]+$/, "").toLowerCase();
}

function isWithin(candidate: string, root: string): boolean {
  const child = comparable(candidate);
  const parent = comparable(root);
  return child === parent || child.startsWith(`${parent}${path.sep}`) ||
    child.startsWith(`${parent}\\`) || child.startsWith(`${parent}/`);
}

function failure(
  input: string,
  code: PathValidationCode,
  message: string,
  normalizedPath: string | null = null,
): LocalPathValidationResult {
  return {
    valid: false,
    input,
    normalizedPath,
    exists: false,
    directory: null,
    readable: false,
    writable: false,
    approved: false,
    code,
    message,
  };
}

export function validateLocalSettingsPath(
  rawValue: unknown,
  options: LocalPathValidationOptions = {},
): LocalPathValidationResult {
  const input = typeof rawValue === "string" ? rawValue.trim() : "";
  if (!input) return failure(input, "EMPTY_PATH", "Choose a non-empty folder path.");
  if (containsTraversal(input)) return failure(input, "TRAVERSAL", "Parent-directory traversal is not allowed.");
  if (/^(\\\\|\/\/)/.test(input)) {
    return failure(input, "NETWORK_PATH", "Network and UNC paths are not approved for settings-controlled storage.");
  }
  if (!isWindowsAbsolute(input) && !isApplicationRelative(input)) {
    return failure(input, "UNSUPPORTED_PATH", "Use an absolute Windows path or a BRMedia server/data path.");
  }

  const projectRoot = options.projectRoot ?? process.cwd();
  const normalizedPath = isWindowsAbsolute(input)
    ? path.win32.normalize(input)
    : path.resolve(projectRoot, input.replace(/[\\/]+/g, path.sep));

  if (isWindowsAbsolute(input)) {
    const win = comparable(path.win32.normalize(input));
    const root = comparable(path.win32.parse(input).root);
    const protectedRoots = [
      `${root}windows`,
      `${root}program files`,
      `${root}program files (x86)`,
      `${root}programdata`,
    ];
    if (win === root || protectedRoots.some((protectedRoot) => win === protectedRoot || win.startsWith(`${protectedRoot}\\`))) {
      return failure(input, "SYSTEM_PATH", "Windows system roots cannot be used as BRMedia storage.", normalizedPath);
    }
  }

  const resolvedApprovedRoots = (options.approvedRoots ?? [])
    .filter((entry) => typeof entry === "string" && entry.trim())
    .map((entry) => isWindowsAbsolute(entry)
      ? path.win32.normalize(entry)
      : path.resolve(projectRoot, entry.replace(/[\\/]+/g, path.sep)));
  const applicationDataRoot = path.resolve(projectRoot, "server", "data");
  const approved = isWithin(normalizedPath, applicationDataRoot) ||
    resolvedApprovedRoots.some((root) => isWithin(normalizedPath, root));

  if (options.requireApprovedRoot && !approved) {
    return failure(input, "OUTSIDE_APPROVED_ROOTS", "Writable destinations must be inside an approved root.", normalizedPath);
  }

  const exists = fs.existsSync(normalizedPath);
  if (!exists) {
    const result = failure(input, "MISSING", "The folder does not currently exist.", normalizedPath);
    result.approved = approved;
    return options.requireExisting === false ? { ...result, valid: true } : result;
  }

  let directory = false;
  try {
    directory = fs.statSync(normalizedPath).isDirectory();
  } catch {
    return failure(input, "UNREADABLE", "The path could not be inspected.", normalizedPath);
  }
  if (!directory) return failure(input, "NOT_DIRECTORY", "The selected path is not a directory.", normalizedPath);

  let readable = false;
  let writable = false;
  try {
    fs.accessSync(normalizedPath, fs.constants.R_OK);
    readable = true;
  } catch {}
  try {
    fs.accessSync(normalizedPath, fs.constants.W_OK);
    writable = true;
  } catch {}

  const requiredAccess = options.access ?? "read";
  if (requiredAccess === "read" && !readable) {
    return { ...failure(input, "UNREADABLE", "The server cannot read this folder.", normalizedPath), exists, directory, writable, approved };
  }
  if (requiredAccess === "write" && !writable) {
    return { ...failure(input, "UNWRITABLE", "The server cannot write to this folder.", normalizedPath), exists, directory, readable, approved };
  }

  return {
    valid: true,
    input,
    normalizedPath,
    exists,
    directory,
    readable,
    writable,
    approved,
    message: "Path is available.",
  };
}

export function validateLibrarySources(
  value: unknown,
  approvedRoots: readonly string[],
  projectRoot = process.cwd(),
): LibrarySourcesValidationResult {
  const sources = Array.isArray(value) ? value : [];
  const errors: LibrarySourcesValidationResult["errors"] = [];
  const statuses: LocalPathValidationResult[] = [];
  const output: LibrarySourcePreference[] = [];
  const seen = new Set<string>();

  if (!Array.isArray(value)) {
    errors.push({ path: "library.sources", code: "INVALID_TYPE", message: "Library sources must be an array." });
    return { valid: false, sources: output, errors, statuses };
  }

  sources.forEach((raw, index) => {
    const item = typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? raw as Record<string, unknown>
      : {};
    const type = item.type;
    if (type !== "audio" && type !== "video" && type !== "both") {
      errors.push({ path: `library.sources.${index}.type`, code: "INVALID_SOURCE_TYPE", message: "Source type must be audio, video, or both." });
    }
    const status = validateLocalSettingsPath(item.path, {
      access: "read",
      approvedRoots,
      requireExisting: true,
      projectRoot,
    });
    statuses.push(status);
    if (!status.valid) {
      errors.push({ path: `library.sources.${index}.path`, code: status.code ?? "INVALID_PATH", message: status.message });
    }
    const key = status.normalizedPath ? comparable(status.normalizedPath) : String(item.path ?? "").toLowerCase();
    if (seen.has(key)) {
      errors.push({ path: `library.sources.${index}.path`, code: "DUPLICATE_SOURCE", message: "That library source path is already listed." });
    }
    seen.add(key);
    output.push({
      id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : `source-${index + 1}`,
      label: typeof item.label === "string" ? item.label.trim().slice(0, 100) : "",
      path: status.normalizedPath ?? String(item.path ?? ""),
      type: type === "video" || type === "both" ? type : "audio",
      enabled: item.enabled !== false,
      includeSubfolders: item.includeSubfolders !== false,
    });
  });

  return { valid: errors.length === 0, sources: output, errors, statuses };
}
