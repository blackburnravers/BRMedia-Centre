import type { IncomingMessage, ServerResponse } from "node:http";
import { json } from "../utils/json";
import { isSettingsModuleName, SettingsService } from "./service";
import { validateLocalSettingsPath } from "./pathValidation";
import { getSettingsSystemHealth } from "./systemHealth";
import { getMediaModuleCompatibility } from "./mediaAdapters";
import { getDjCompatibility } from "./djAdapters";
import { buildDiagnosticsReport, getDiagnosticsSection, isDiagnosticsSection } from "./diagnostics";
import { SettingsManagementService } from "./settingsManagement";

const settingsService = new SettingsService();
const settingsManagement = new SettingsManagementService(settingsService);
const SETTINGS_API_PREFIX = "/api/settings";
const MAX_BODY_BYTES = 1024 * 1024;

function apiError(
  res: ServerResponse,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): boolean {
  return json(res, status, {
    ok: false,
    error: { code, message, ...(details === undefined ? {} : { details }) },
  });
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    req.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > MAX_BODY_BYTES) {
        reject(new Error("REQUEST_TOO_LARGE"));
        req.destroy();
        return;
      }
      chunks.push(buffer);
    });
    req.on("end", () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {});
      } catch {
        reject(new Error("INVALID_JSON"));
      }
    });
    req.on("error", reject);
  });
}

function moduleFromPath(pathname: string): string | null {
  const suffix = pathname.slice(`${SETTINGS_API_PREFIX}/`.length);
  const segments = suffix.split("/").filter(Boolean);
  if (segments.length === 1) return segments[0];
  if (segments.length === 2 && segments[1] === "validate") return segments[0];
  return null;
}

export async function handleSettingsRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<boolean> {
  if (url.pathname !== SETTINGS_API_PREFIX && !url.pathname.startsWith(`${SETTINGS_API_PREFIX}/`)) {
    return false;
  }

  if (req.method === "GET" && url.pathname === SETTINGS_API_PREFIX) {
    return json(res, 200, { ...settingsService.readAll(true) });
  }
  if (req.method === "GET" && url.pathname === `${SETTINGS_API_PREFIX}/health`) {
    return json(res, 200, { ok: true, data: settingsService.health() });
  }

  if (req.method === "GET" && url.pathname === `${SETTINGS_API_PREFIX}/u4/health`) {
    const data = await getSettingsSystemHealth({
      force: url.searchParams.get("refresh") === "1",
      httpsActive: Boolean((req.socket as { encrypted?: boolean }).encrypted),
    });
    return json(res, 200, { ok: true, data });
  }

  if (req.method === "GET" && url.pathname === `${SETTINGS_API_PREFIX}/health/diagnostics`) {
    const data = await buildDiagnosticsReport({
      httpsActive: Boolean((req.socket as { encrypted?: boolean }).encrypted),
    });
    return json(res, 200, { ok: true, data });
  }

  if (req.method === "POST" && url.pathname === `${SETTINGS_API_PREFIX}/health/diagnostics/refresh`) {
    const data = await buildDiagnosticsReport({
      force: true,
      httpsActive: Boolean((req.socket as { encrypted?: boolean }).encrypted),
    });
    return json(res, 200, { ok: true, data });
  }

  if (req.method === "GET" && url.pathname.startsWith(`${SETTINGS_API_PREFIX}/health/diagnostics/`)) {
    const sectionName = url.pathname.slice(`${SETTINGS_API_PREFIX}/health/diagnostics/`.length);
    if (!sectionName || sectionName.includes("/") || !isDiagnosticsSection(sectionName)) {
      return apiError(res, 404, "UNKNOWN_DIAGNOSTICS_SECTION", "Unknown diagnostics section.");
    }
    const data = await getDiagnosticsSection(sectionName, {
      httpsActive: Boolean((req.socket as { encrypted?: boolean }).encrypted),
    });
    return json(res, 200, { ok: true, data });
  }
  if (req.method === "GET" && url.pathname === `${SETTINGS_API_PREFIX}/u6/compatibility`) {
    return json(res, 200, { ok: true, data: getDjCompatibility() });
  }

  if (req.method === "GET" && url.pathname === `${SETTINGS_API_PREFIX}/u5/compatibility`) {
    return json(res, 200, { ok: true, data: getMediaModuleCompatibility() });
  }

  if (req.method === "POST" && url.pathname === `${SETTINGS_API_PREFIX}/u4/validate-path`) {
    try {
      const body = await readJsonBody(req);
      const input = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
      const storage = settingsService.readModule("storage").data;
      const data = validateLocalSettingsPath(input.path, {
        access: input.access === "write" ? "write" : "read",
        approvedRoots: storage.approvedRoots,
        requireApprovedRoot: input.requireApprovedRoot === true,
        requireExisting: input.requireExisting !== false,
      });
      return json(res, data.valid ? 200 : 422, { ok: data.valid, data });
    } catch (error) {
      return apiError(res, 400, "INVALID_JSON", "Request body must be valid JSON.");
    }
  }

  try {
    if (req.method === "GET" && url.pathname === `${SETTINGS_API_PREFIX}/export`) return json(res, 200, { ok: true, data: settingsManagement.export() });
    const moduleExport = url.pathname.match(/^\/api\/settings\/([^/]+)\/export$/);
    if (req.method === "GET" && moduleExport) {
      if (!isSettingsModuleName(moduleExport[1])) return apiError(res, 404, "UNKNOWN_MODULE", "Unknown settings module.");
      return json(res, 200, { ok: true, data: settingsManagement.export(moduleExport[1]) });
    }
    if (req.method === "POST" && url.pathname === `${SETTINGS_API_PREFIX}/import/preview`) { const b=await readJsonBody(req) as Record<string,unknown>; const data=settingsManagement.preview(b.content,b.modules as string[]|undefined); return json(res,data.valid?200:422,{ok:data.valid,data}); }
    if (req.method === "POST" && url.pathname === `${SETTINGS_API_PREFIX}/import/apply`) { const b=await readJsonBody(req) as Record<string,unknown>; const data=await settingsManagement.apply(b.content,b.modules as string[]|undefined); return json(res,data.ok?200:422,{ok:data.ok,data}); }
    if (req.method === "GET" && url.pathname === `${SETTINGS_API_PREFIX}/backups`) return json(res,200,{ok:true,data:settingsManagement.listBackups()});
    const backupPreview=url.pathname.match(/^\/api\/settings\/backups\/([^/]+)\/preview$/);
    if(req.method==="GET"&&backupPreview)return json(res,200,{ok:true,data:settingsManagement.previewBackup(backupPreview[1])});
    const backupRestore=url.pathname.match(/^\/api\/settings\/backups\/([^/]+)\/restore$/);
    if(req.method==="POST"&&backupRestore)return json(res,200,{ok:true,data:await settingsManagement.restore(backupRestore[1])});
    if(req.method==="POST"&&url.pathname===`${SETTINGS_API_PREFIX}/reset/field`){const b=await readJsonBody(req) as Record<string,unknown>;if(b.confirm!==true)return apiError(res,409,"CONFIRMATION_REQUIRED","Explicit confirmation is required.");return json(res,200,{ok:true,data:await settingsManagement.reset(String(b.path))});}
    if(req.method==="POST"&&url.pathname===`${SETTINGS_API_PREFIX}/reset/module`){const b=await readJsonBody(req) as Record<string,unknown>;if(b.confirm!==true)return apiError(res,409,"CONFIRMATION_REQUIRED","Explicit confirmation is required.");return json(res,200,{ok:true,data:await settingsManagement.reset(String(b.module))});}
    if(req.method==="POST"&&url.pathname===`${SETTINGS_API_PREFIX}/reset/all`){const b=await readJsonBody(req) as Record<string,unknown>;if(b.confirm!=="RESET ALL SETTINGS")return apiError(res,409,"CONFIRMATION_REQUIRED","Multi-step confirmation is required.");return json(res,200,{ok:true,data:await settingsManagement.resetAll(b.preserveUnknown!==false)});}
    if(req.method==="GET"&&url.pathname===`${SETTINGS_API_PREFIX}/recovery/status`)return json(res,200,{ok:true,data:settingsManagement.recoveryStatus()});
    if(req.method==="POST"&&url.pathname===`${SETTINGS_API_PREFIX}/recovery/apply`){const b=await readJsonBody(req) as Record<string,unknown>;if(b.confirm!==true)return apiError(res,409,"CONFIRMATION_REQUIRED","Explicit confirmation is required.");return json(res,200,{ok:true,data:await settingsManagement.recover(String(b.source) as "last-known-good"|"defaults"|"historical",typeof b.id==="string"?b.id:undefined)});}
  } catch(error) {
    const message=error instanceof Error?error.message:String(error);return apiError(res,message==="REQUEST_TOO_LARGE"?413:422,"SETTINGS_MANAGEMENT_ERROR",message);
  }
  const moduleName = moduleFromPath(url.pathname);
  if (!moduleName || !isSettingsModuleName(moduleName)) {
    return apiError(res, 404, "UNKNOWN_MODULE", "Unknown settings module.");
  }

  if (req.method === "GET" && url.pathname === `${SETTINGS_API_PREFIX}/${moduleName}`) {
    return json(res, 200, { ...settingsService.readModule(moduleName, true) });
  }

  if (req.method === "POST" && url.pathname === `${SETTINGS_API_PREFIX}/${moduleName}/validate`) {
    try {
      const preview = settingsService.validateModuleUpdate(moduleName, await readJsonBody(req));
      return json(res, preview.valid ? 200 : 422, { ok: preview.valid, data: preview });
    } catch (error) {
      const tooLarge = error instanceof Error && error.message === "REQUEST_TOO_LARGE";
      return apiError(
        res,
        tooLarge ? 413 : 400,
        tooLarge ? "REQUEST_TOO_LARGE" : "INVALID_JSON",
        tooLarge ? "Settings request body is too large." : "Request body must be valid JSON.",
      );
    }
  }

  if (req.method === "PATCH" && url.pathname === `${SETTINGS_API_PREFIX}/${moduleName}`) {
    try {
      const result = await settingsService.updateModule(moduleName, await readJsonBody(req));
      if (!result.ok) {
        return apiError(
          res,
          result.code === "INVALID_UPDATE" ? 422 : 503,
          result.code,
          result.message,
          result.errors,
        );
      }
      return json(res, 200, { ...result });
    } catch (error) {
      const tooLarge = error instanceof Error && error.message === "REQUEST_TOO_LARGE";
      return apiError(
        res,
        tooLarge ? 413 : 400,
        tooLarge ? "REQUEST_TOO_LARGE" : "INVALID_JSON",
        tooLarge ? "Settings request body is too large." : "Request body must be valid JSON.",
      );
    }
  }

  return apiError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed for this settings route.");
}
