const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const serverRoot = fs.existsSync(path.join(projectRoot, "server", "public"))
  ? path.join(projectRoot, "server")
  : projectRoot;

const publicDir = path.join(serverRoot, "public");
const playerIconDir = path.join(publicDir, "player", "branding", "icons");
const sharedIconDir = path.join(publicDir, "shared", "icons", "fa-duotone");
const sharedModuleShellPath = path.join(publicDir, "shared", "module-shell.css");
const backupDir = path.join(projectRoot, "tools", "backups", "icons-before-i3");

const moduleFolders = ["converter", "tagger", "mastering", "video-player"];

if (!fs.existsSync(publicDir)) throw new Error("Could not find server/public. Run this from BRMedia-Centre root or server root.");
if (!fs.existsSync(playerIconDir)) throw new Error("Could not find server/public/player/branding/icons.");

function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const rel = path.relative(serverRoot, filePath);
  const out = path.join(backupDir, rel);

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(filePath, out);
}

function copyIconsToShared() {
  fs.mkdirSync(sharedIconDir, { recursive: true });

  let copied = 0;
  let skipped = 0;

  for (const fileName of fs.readdirSync(playerIconDir)) {
    if (!fileName.toLowerCase().endsWith(".svg")) continue;

    const from = path.join(playerIconDir, fileName);
    const to = path.join(sharedIconDir, fileName);

    if (fs.existsSync(to)) {
      const a = fs.readFileSync(from, "utf8");
      const b = fs.readFileSync(to, "utf8");
      if (a === b) {
        skipped += 1;
        continue;
      }

      backupFile(to);
    }

    fs.copyFileSync(from, to);
    copied += 1;
  }

  return { copied, skipped };
}

function replaceLoadIconFunction(text, folder) {
  const start = text.indexOf("async function loadBrIconSvg(svgName)");
  const end = text.indexOf("function applyBrIconStateClasses", start);

  if (start < 0 || end < 0) {
    throw new Error(`Could not find loadBrIconSvg/applyBrIconStateClasses block in ${folder}/app.js`);
  }

  const nextBlock = `async function fetchBrIconSvgText(svgName) {
  const basePaths = Array.isArray(BR_ICON_BASE_PATHS) && BR_ICON_BASE_PATHS.length
    ? BR_ICON_BASE_PATHS
    : [BR_ICON_BASE_PATH || "/player/branding/icons/"];

  let lastError = null;

  for (const basePath of basePaths) {
    try {
      const res = await fetch(\`\${basePath}\${svgName}.svg\`, { cache: "force-cache" });

      if (res.ok) {
        return await res.text();
      }

      lastError = new Error(\`Icon not found: \${basePath}\${svgName}.svg\`);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error(\`Icon not found: \${svgName}\`);
}

async function loadBrIconSvg(svgName) {
  if (brIconSvgCache.has(svgName)) return brIconSvgCache.get(svgName);

  const promise = fetchBrIconSvgText(svgName)
    .then((text) => {
      const template = document.createElement("template");
      template.innerHTML = text.trim();
      const svg = template.content.querySelector("svg");
      if (!svg) throw new Error(\`Invalid icon SVG: \${svgName}\`);
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      svg.classList.add("brSvgIconSvg");
      return svg.outerHTML;
    });

  brIconSvgCache.set(svgName, promise);
  return promise;
}

`;

  return text.slice(0, start) + nextBlock + text.slice(end);
}

function patchModuleApp(folder) {
  const appPath = path.join(publicDir, folder, "app.js");
  if (!fs.existsSync(appPath)) {
    console.warn(`Skipping missing ${folder}/app.js`);
    return false;
  }

  backupFile(appPath);

  let text = fs.readFileSync(appPath, "utf8");

  text = text.replace(
    'const BR_ICON_BASE_PATH = "/player/branding/icons/";',
    'const BR_ICON_BASE_PATHS = ["/shared/icons/fa-duotone/", "/player/branding/icons/"];\nconst BR_ICON_BASE_PATH = BR_ICON_BASE_PATHS[0];'
  );

  if (!text.includes("async function fetchBrIconSvgText(svgName)")) {
    text = replaceLoadIconFunction(text, folder);
  }

  fs.writeFileSync(appPath, text, "utf8");
  return true;
}

function patchModuleIndex(folder) {
  const indexPath = path.join(publicDir, folder, "index.html");
  if (!fs.existsSync(indexPath)) return;

  backupFile(indexPath);

  let html = fs.readFileSync(indexPath, "utf8");
  const escapedFolder = folder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  html = html
    .replace(new RegExp(`/${escapedFolder}/app\\.js\\?v=[^"]+`, "g"), `/${folder}/app.js?v=20260510-i3`)
    .replace(new RegExp(`/${escapedFolder}/styles\\.css\\?v=[^"]+`, "g"), `/${folder}/styles.css?v=20260510-i3`);

  fs.writeFileSync(indexPath, html, "utf8");
}

function patchModuleCss(folder) {
  const cssPath = path.join(publicDir, folder, "styles.css");
  if (!fs.existsSync(cssPath)) return;

  backupFile(cssPath);

  let css = fs.readFileSync(cssPath, "utf8");

  css = css.replace(
    /@import url\("\/shared\/module-shell\.css\?v=[^"]+"\);/g,
    '@import url("/shared/module-shell.css?v=20260510-i3");'
  );

  fs.writeFileSync(cssPath, css, "utf8");
}

function patchSharedModuleShell() {
  if (!fs.existsSync(sharedModuleShellPath)) return false;

  backupFile(sharedModuleShellPath);

  let css = fs.readFileSync(sharedModuleShellPath, "utf8");

  css = css.replaceAll("/player/branding/icons/", "/shared/icons/fa-duotone/");

  fs.writeFileSync(sharedModuleShellPath, css, "utf8");
  return true;
}

function getSharedIconFiles() {
  if (!fs.existsSync(sharedIconDir)) return new Set();

  return new Set(
    fs.readdirSync(sharedIconDir)
      .filter((file) => file.toLowerCase().endsWith(".svg"))
      .map((file) => file.replace(/\.svg$/i, ""))
  );
}

function extractMappedValues(text) {
  const match = text.match(/const BR_ICON_CLASS_MAP = \{([\s\S]*?)\n\};/);
  if (!match) return [];

  const values = [];
  const re = /:\s*"([^"]+)"/g;
  let found;

  while ((found = re.exec(match[1]))) {
    values.push(found[1]);
  }

  return values;
}

function extractCssIconRefs(css) {
  const refs = [];
  const re = /\/shared\/icons\/fa-duotone\/([^")]+)\.svg/g;
  let found;

  while ((found = re.exec(css))) {
    refs.push(found[1]);
  }

  return refs;
}

function audit() {
  const sharedFiles = getSharedIconFiles();
  const report = {
    sharedIconCount: sharedFiles.size,
    modules: {},
    sharedCssMissing: [],
  };

  for (const folder of moduleFolders) {
    const appPath = path.join(publicDir, folder, "app.js");
    if (!fs.existsSync(appPath)) continue;

    const text = fs.readFileSync(appPath, "utf8");
    const mappedValues = Array.from(new Set(extractMappedValues(text))).sort();
    const missingShared = mappedValues.filter((name) => !sharedFiles.has(name));

    report.modules[folder] = {
      mappedIconCount: mappedValues.length,
      missingShared,
      usesSharedFirst: text.includes('"/shared/icons/fa-duotone/"'),
      hasPlayerFallback: text.includes('"/player/branding/icons/"'),
    };
  }

  if (fs.existsSync(sharedModuleShellPath)) {
    const css = fs.readFileSync(sharedModuleShellPath, "utf8");
    report.sharedCssMissing = Array.from(new Set(
      extractCssIconRefs(css).filter((name) => !sharedFiles.has(name))
    )).sort();
  }

  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(path.join(backupDir, "icon-report-i3.json"), JSON.stringify(report, null, 2), "utf8");

  return report;
}

const copyResult = copyIconsToShared();
const changedApps = [];

for (const folder of moduleFolders) {
  if (patchModuleApp(folder)) changedApps.push(folder);
  patchModuleIndex(folder);
  patchModuleCss(folder);
}

const shellChanged = patchSharedModuleShell();
const report = audit();

console.log("BRMedia Patch I3 complete.");
console.log(`Copied ${copyResult.copied} SVG icons to /shared/icons/fa-duotone/ (${copyResult.skipped} already matched).`);
console.log(changedApps.length ? `Updated module icon loaders in: ${changedApps.join(", ")}` : "No module app files changed.");
console.log(shellChanged ? "Updated /shared/module-shell.css to use shared icons." : "No shared module-shell.css found/changed.");
console.log("Updated module cache-busts to v=20260510-i3.");
console.log(`Icon report saved to ${path.relative(projectRoot, path.join(backupDir, "icon-report-i3.json"))}`);

let hasMissing = false;

for (const [folder, info] of Object.entries(report.modules)) {
  if (info.missingShared.length) {
    hasMissing = true;
    console.log(`\n${folder} missing shared SVGs: ${info.missingShared.join(", ")}`);
  }
}

if (report.sharedCssMissing.length) {
  hasMissing = true;
  console.log(`\nshared/module-shell.css missing shared SVGs: ${report.sharedCssMissing.join(", ")}`);
}

if (!hasMissing) {
  console.log("Shared icon audit clean.");
}

console.log(`Backups saved to ${path.relative(projectRoot, backupDir)}.`);