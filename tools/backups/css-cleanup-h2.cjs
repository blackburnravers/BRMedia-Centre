const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const serverRoot = fs.existsSync(path.join(projectRoot, "server", "public"))
  ? path.join(projectRoot, "server")
  : projectRoot;

const publicDir = path.join(serverRoot, "public");
const backupDir = path.join(projectRoot, "tools", "backups", "css-before-h2");
const modulesDir = path.join(publicDir, "modules");
const modulesCssPath = path.join(modulesDir, "styles.css");
const modulesLegacyCssPath = path.join(modulesDir, "styles.legacy-before-h2.css");
const sharedModuleShellPath = path.join(publicDir, "shared", "module-shell.css");

if (!fs.existsSync(publicDir)) throw new Error("Could not find server/public. Run this from BRMedia-Centre root or server root.");
if (!fs.existsSync(modulesCssPath) && !fs.existsSync(modulesLegacyCssPath)) throw new Error("Could not find modules/styles.css or modules/styles.legacy-before-h2.css.");

function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const rel = path.relative(serverRoot, filePath);
  const out = path.join(backupDir, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(filePath, out);
}

function readSourceCss() {
  const primary = fs.existsSync(modulesCssPath) ? fs.readFileSync(modulesCssPath, "utf8") : "";
  if (primary.includes("/* BRMedia Tagger v1 */") && primary.includes("/* BRMedia Converter V1")) return primary;

  if (fs.existsSync(modulesLegacyCssPath)) {
    const legacy = fs.readFileSync(modulesLegacyCssPath, "utf8");
    if (legacy.includes("/* BRMedia Tagger v1 */") && legacy.includes("/* BRMedia Converter V1")) return legacy;
  }

  throw new Error("Could not find the old full module CSS markers. Restore from tools/backups or modules/styles.legacy-before-h2.css first.");
}

const sourceCss = readSourceCss();

function idx(marker) {
  const i = sourceCss.indexOf(marker);
  if (i < 0) throw new Error(`Missing CSS marker: ${marker}`);
  return i;
}

function between(startMarker, endMarker) {
  const start = idx(startMarker);
  const end = endMarker ? idx(endMarker) : sourceCss.length;
  if (end < start) throw new Error(`CSS markers are in the wrong order: ${startMarker} -> ${endMarker}`);
  return sourceCss.slice(start, end).trim();
}

function getModuleCss(folder) {
  const filePath = path.join(publicDir, folder, "styles.css");
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function fromModule(folder, startMarker, endMarker) {
  const css = getModuleCss(folder);
  if (!css) return "";
  const start = css.indexOf(startMarker);
  if (start < 0) return "";
  let end = endMarker ? css.indexOf(endMarker, start) : css.length;
  if (end < 0) end = css.length;
  return css.slice(start, end).trim();
}

function countLines(text) {
  return String(text || "").split(/\r?\n/).length;
}

function fittedIconBlock(classNames) {
  return `/* BRMedia H2 fitted module icons */
${classNames.map((name) => `.${name}`).join(",\n")} {
  overflow: hidden;
}

${classNames.map((name) => `.${name} .brSvgIconHost,\n.${name} svg`).join(",\n")} {
  max-width: 70% !important;
  max-height: 70% !important;
  width: 30px !important;
  height: 30px !important;
  object-fit: contain;
}

${classNames.map((name) => `.${name} i`).join(",\n")} {
  font-size: 22px !important;
  line-height: 1 !important;
}`;
}

const f4Handoff = fromModule("converter", "/* BRMedia split F4") || fromModule("mastering", "/* BRMedia split F4") || "";

const sharedModuleShellCss = [
  "/* BRMedia H2 shared module shell. Extracted from old duplicated /modules CSS. */",
  sourceCss.slice(0, idx("/* BRMedia Tagger v1 */")).trim(),
  between("/* BRMedia modules: iPhone-safe local icon masks */", "/* BRMedia modules V5 shell/icon polish */"),
  between("/* BRMedia modules V5 shell/icon polish */", ".taggerSaveModePanel"),
  between("/* BRMedia module sidebar: keep close button outside edge + stop background scroll drift */", "/* BRMedia Tagger V6"),
  between("/* BRMedia shared library picker for Tagger + Converter */", "/* BRMedia Converter final controls */"),
  between("/* BRMedia mastering tabs, module cleanup, fitted icons and video sidebar polish */", ".masteringTabs {"),
  f4Handoff,
].filter(Boolean).join("\n\n").trim() + "\n";

const moduleImport = '@import url("/shared/module-shell.css?v=20260510-h2");\n\n';

const moduleCss = {
  converter: [
    "/* BRMedia H2 Converter-only CSS */",
    between("/* BRMedia Converter V1", "/* BRMedia shared library picker"),
    between("/* BRMedia Converter final controls", "/* BRMedia Video Player V1"),
    fittedIconBlock(["converterHeroIcon"]),
  ],
  tagger: [
    "/* BRMedia H2 Tagger-only CSS */",
    between("/* BRMedia Tagger v1", "/* BRMedia modules: iPhone-safe local icon masks */"),
    between(".taggerSaveModePanel", "/* BRMedia module sidebar: keep close button outside edge + stop background scroll drift */"),
    between("/* BRMedia Tagger V6", "/* BRMedia Converter V1"),
  ],
  mastering: [
    "/* BRMedia H2 Mastering-only CSS */",
    between("/* BRMedia Mastering V1", "/* BRMedia mastering tabs, module cleanup"),
    between(".masteringTabs {", "/* Video module sidebar"),
    fittedIconBlock(["masteringSourceIcon", "masteringHeroMeter"]),
    fromModule("mastering", "/* BRMedia Mastering split polish", "/* BRMedia split F4"),
  ],
  "video-player": [
    "/* BRMedia H2 Video-only CSS */",
    between("/* BRMedia Video Player V1", "/* BRMedia Mastering V1"),
    between("/* Video module sidebar", "/* Fitted icons"),
    between(".videoModeTabs {", "/* Keep oversized"),
    between("/* BRMedia Video/Mastering tidy pass", null).replace(/,\n\.masteringTab \.brSvgIconHost/g, ""),
    fittedIconBlock(["videoHeroBadge", "videoPosterFallback", "videoSidebarGenreIcon"]),
  ],
};

const moduleFolders = Object.keys(moduleCss);

backupFile(sharedModuleShellPath);
backupFile(modulesCssPath);

for (const folder of moduleFolders) {
  backupFile(path.join(publicDir, folder, "styles.css"));
  backupFile(path.join(publicDir, folder, "index.html"));
}

if (!fs.existsSync(modulesLegacyCssPath) && fs.existsSync(modulesCssPath)) {
  fs.copyFileSync(modulesCssPath, modulesLegacyCssPath);
}

fs.mkdirSync(path.dirname(sharedModuleShellPath), { recursive: true });
fs.writeFileSync(sharedModuleShellPath, sharedModuleShellCss, "utf8");

const beforeAfter = [];

for (const [folder, parts] of Object.entries(moduleCss)) {
  const stylePath = path.join(publicDir, folder, "styles.css");
  const oldCss = fs.existsSync(stylePath) ? fs.readFileSync(stylePath, "utf8") : "";
  const nextCss = moduleImport + parts.filter(Boolean).join("\n\n").trim() + "\n";

  fs.writeFileSync(stylePath, nextCss, "utf8");
  beforeAfter.push(`${folder}: ${countLines(oldCss)} -> ${countLines(nextCss)} lines`);

  const indexPath = path.join(publicDir, folder, "index.html");
  if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, "utf8");
    const escapedFolder = folder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    html = html.replace(new RegExp(`/${escapedFolder}/styles\\.css\\?v=[^\\"]+`, "g"), `/${folder}/styles.css?v=20260510-h2`);
    fs.writeFileSync(indexPath, html, "utf8");
  }
}

const modulesSlimCss = `/* BRMedia H2: old duplicated module CSS retired.
   Original full CSS is backed up at:
   - public/modules/styles.legacy-before-h2.css
   - tools/backups/css-before-h2/public/modules/styles.css
   Active split modules now use /shared/module-shell.css plus their own tiny styles.css files.
*/
`;

fs.writeFileSync(modulesCssPath, modulesSlimCss, "utf8");

console.log("BRMedia Patch H2 complete.");
console.log(`Shared module shell: ${countLines(sharedModuleShellCss)} lines`);
for (const line of beforeAfter) console.log(line);
console.log("Old public/modules/styles.css replaced with a tiny retired notice; legacy full CSS was kept as styles.legacy-before-h2.css.");
console.log(`Backups saved to ${path.relative(projectRoot, backupDir)}.`);