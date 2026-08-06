import crypto from "node:crypto";
import { MasterStreamError } from "./mixxxMasterStream";

export type M26DjTrustHeaders = Record<string, string | string[] | undefined>;

export function resolveM26DjPerformanceContext(headers: M26DjTrustHeaders, origin: string) {
  const fetchSite = String(headers["sec-fetch-site"] || "").toLowerCase();
  const refererHeader = String(headers.referer || "");
  const browserToken = String(headers["x-brmedia-dj-session"] || "");
  let referer: URL;
  try { referer = new URL(refererHeader); } catch {
    throw new MasterStreamError("forbidden", "DJ Performance context is required");
  }
  if (fetchSite !== "same-origin" || referer.origin.toLowerCase() !== origin.toLowerCase() ||
      referer.pathname !== "/dj-mixer/performance.html" || !/^[A-Za-z0-9_-]{32,128}$/.test(browserToken)) {
    throw new MasterStreamError("forbidden", "DJ Performance context is required");
  }
  return {
    ownerId: `dj:${crypto.createHash("sha256").update(browserToken).digest("hex").slice(0, 32)}`,
    ownerSource: "dj-performance-local-trust" as const,
  };
}
