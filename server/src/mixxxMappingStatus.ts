import fs from "node:fs";
import path from "node:path";

export const MIXXX_MAPPING_XML = "BRMedia-Mixxx-M7-Live-Engine.midi.xml";
export const MIXXX_MAPPING_SCRIPT = "BRMedia-Mixxx-M7-Live-Engine-scripts.js";
export const MIXXX_MAPPING_VERSION = 5;

export type MixxxMappingState =
  | "mapping-missing"
  | "mapping-installed"
  | "mapping-version-mismatch"
  | "mapping-file-invalid";

export interface MixxxMappingStatus {
  state: MixxxMappingState;
  installed: boolean;
  valid: boolean;
  version: number | null;
  expectedVersion: number;
  restartRequired: boolean;
  files: string[];
}

function protocolVersion(script: string) {
  const match = script.match(/midi\.sendShortMsg\(\s*0x90\s*,\s*0x71\s*,\s*(\d+)\s*\)/);
  return match ? Number(match[1]) : null;
}

export function inspectMixxxMapping(
  controllerDirectory: string,
  options: { mixxxRunning?: boolean; protocolHealthy?: boolean } = {},
): MixxxMappingStatus {
  const base = {
    expectedVersion: MIXXX_MAPPING_VERSION,
    files: [MIXXX_MAPPING_XML, MIXXX_MAPPING_SCRIPT],
  };
  const xmlPath = path.join(controllerDirectory, MIXXX_MAPPING_XML);
  const scriptPath = path.join(controllerDirectory, MIXXX_MAPPING_SCRIPT);
  if (!fs.existsSync(xmlPath) || !fs.existsSync(scriptPath)) {
    return { ...base, state: "mapping-missing", installed: false, valid: false, version: null, restartRequired: false };
  }
  try {
    const xml = fs.readFileSync(xmlPath, "utf8");
    const script = fs.readFileSync(scriptPath, "utf8");
    const validXml = /<MixxxControllerPreset\b[^>]*mixxxVersion="2\.5"[^>]*schemaVersion="1"/.test(xml)
      && /<\/MixxxControllerPreset>\s*$/.test(xml)
      && /<controller id="BRMedia Mixxx Remote">/.test(xml)
      && new RegExp(`filename="${MIXXX_MAPPING_SCRIPT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(xml)
      && /functionprefix="BRMediaMixxxM7"/.test(xml);
    const version = protocolVersion(script);
    const validScript = /var BRMediaMixxxM7 = \{\}/.test(script)
      && /beginTimer\(2000,[\s\S]*sendShortMsg\(0x90, 0x70/.test(script);
    if (!validXml || !validScript || version === null) {
      return { ...base, state: "mapping-file-invalid", installed: true, valid: false, version, restartRequired: false };
    }
    if (version !== MIXXX_MAPPING_VERSION) {
      return { ...base, state: "mapping-version-mismatch", installed: true, valid: false, version, restartRequired: false };
    }
    return {
      ...base,
      state: "mapping-installed",
      installed: true,
      valid: true,
      version,
      restartRequired: options.mixxxRunning === true && options.protocolHealthy !== true,
    };
  } catch {
    return { ...base, state: "mapping-file-invalid", installed: true, valid: false, version: null, restartRequired: false };
  }
}

export function defaultMixxxControllerDirectory() {
  const root = String(process.env.BRMEDIA_MIXXX_PROFILE || process.env.LOCALAPPDATA || "").trim();
  return root ? path.join(root, "Mixxx", "controllers") : "";
}
