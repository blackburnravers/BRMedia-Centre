import path from "node:path";

export function validateLocalPathAllowed(
  filePath: string,
  allowedBases: string[]
): { ok: true } | { ok: false; reason: string } {
  const abs = path.resolve(filePath);

  // If no allowlist is set, block by default (safer).
  if (!allowedBases || allowedBases.length === 0) {
    return {
      ok: false,
      reason:
        "Local streaming is disabled until LOCAL_ALLOWED_BASES is set (comma-separated allowed folders).",
    };
  }

  const isAllowed = allowedBases.some((base) => {
    const b = path.resolve(base);
    // Ensure base ends with separator to prevent prefix tricks like C:\Music2
    const withSep = b.endsWith(path.sep) ? b : b + path.sep;
    return abs === b || abs.startsWith(withSep);
  });

  if (!isAllowed) {
    return { ok: false, reason: "Path not allowed by LOCAL_ALLOWED_BASES." };
  }

  return { ok: true };
}