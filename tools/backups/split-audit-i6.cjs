const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = process.cwd();
const serverRoot = fs.existsSync(path.join(projectRoot, "server", "public"))
  ? path.join(projectRoot, "server")
  : projectRoot;

const publicDir = path.join(serverRoot, "public");
const srcIndexPath = path.join(serverRoot, "src", "index.ts");
const reportDir = path.join(projectRoot, "tools", "backups", "split-audit-i6");
const reportPath = path.join(reportDir, "split-audit-i6-report.json");

if (!fs.existsSync(publicDir)) {
  throw new Error("Could not find server/public. Run this from BRMedia-Centre root or server root.");
}

const dedicatedPages = [
  "converter",
  "tagger",
  "mastering",
  "video-player",
  "stats",
  "settings",
  "server-settings",
];

const moduleToolPages = [
  "converter",
  "tagger",
  "mastering",
  "video-player",
];

const expectedSharedLogos = [
  "blackburn-ravers-header.png",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
];

function exists(rel) {
  return fs.existsSync(path.join(serverRoot, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(serverRoot, rel), "utf8");
}

function listFiles(rel) {
  const dir = path.join(serverRoot, rel);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).sort();
}

function addIssue(report, level, area, message, file = "") {
  report.issues.push({ level, area, message, file });
}

function routeBlock(indexText, route) {
  const needle = `"${route}"`;
  const start = indexText.indexOf(needle);
  if (start < 0) return "";
  const nextRoute = indexText.indexOf("\n      \"/", start + needle.length);
  const endMap = indexText.indexOf("\n    };", start + needle.length);
  const end = nextRoute > -1 ? nextRoute : endMap;
  return end > -1 ? indexText.slice(start, end) : indexText.slice(start);
}

function runNodeCheck(fileRel) {
  const abs = path.join(serverRoot, fileRel);
  if (!fs.existsSync(abs)) {
    return { file: fileRel, ok: false, missing: true, stderr: "missing file" };
  }

  const result = spawnSync(process.execPath, ["--check", abs], {
    cwd: projectRoot,
    encoding: "utf8",
  });

  return {
    file: fileRel,
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function countSvgIcons() {
  const dir = path.join(publicDir, "shared", "icons", "fa-duotone");
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((name) => name.toLowerCase().endsWith(".svg")).length;
}

const report = {
  patch: "I6",
  checkedAt: new Date().toISOString(),
  projectRoot,
  serverRoot,
  summary: {
    dedicatedPages,
    moduleToolPages,
    sharedIconCount: countSvgIcons(),
  },
  routeAudit: {},
  fileAudit: {},
  jsCheck: [],
  modulesFolder: {},
  sharedAssets: {},
  issues: [],
};

for (const folder of dedicatedPages) {
  const relBase = `public/${folder}`;
  const needed = ["index.html", "styles.css", "app.js"];
  const folderAudit = {};

  for (const file of needed) {
    const rel = `${relBase}/${file}`;
    folderAudit[file] = exists(rel);
    if (!folderAudit[file]) addIssue(report, "error", "dedicated page", `Missing ${file}`, rel);
  }

  if (folderAudit["index.html"]) {
    const html = read(`${relBase}/index.html`);

    folderAudit.usesSharedBranding = html.includes("/shared/branding/logos/");
    folderAudit.hasOldHomeBrandingRefs =
      html.includes("/home/blackburn-ravers-header.png") ||
      html.includes("/home/apple-touch-icon.png") ||
      html.includes("/home/icon-192.png") ||
      html.includes("/home/icon-512.png");

    if (!folderAudit.usesSharedBranding) {
      addIssue(report, "warn", "branding", "Page does not appear to use shared branding logos.", `${relBase}/index.html`);
    }

    if (folderAudit.hasOldHomeBrandingRefs) {
      addIssue(report, "warn", "branding", "Page still references old /home branding assets.", `${relBase}/index.html`);
    }
  }

  if (moduleToolPages.includes(folder) && folderAudit["styles.css"]) {
    const css = read(`${relBase}/styles.css`);
    folderAudit.importsSharedModuleShell = css.includes('/shared/module-shell.css');

    if (!folderAudit.importsSharedModuleShell) {
      addIssue(report, "warn", "css", "Module CSS does not import shared module shell.", `${relBase}/styles.css`);
    }
  }

  if (moduleToolPages.includes(folder) && folderAudit["app.js"]) {
    const app = read(`${relBase}/app.js`);
    folderAudit.usesSharedIcons = app.includes("/shared/icons/fa-duotone/");
    folderAudit.keepsPlayerIconFallback = app.includes("/player/branding/icons/");

    if (!folderAudit.usesSharedIcons) {
      addIssue(report, "warn", "icons", "Module app does not use shared icons first.", `${relBase}/app.js`);
    }

    if (!folderAudit.keepsPlayerIconFallback) {
      addIssue(report, "warn", "icons", "Module app does not keep Player icon fallback.", `${relBase}/app.js`);
    }
  }

  report.fileAudit[folder] = folderAudit;
}

if (fs.existsSync(srcIndexPath)) {
  const indexText = fs.readFileSync(srcIndexPath, "utf8");

  for (const folder of dedicatedPages) {
    const route = `/${folder}`;
    const block = routeBlock(indexText, route);
    const found = Boolean(block);
    const fallbackTrue = /fallbackToModules:\s*true/.test(block);
    const fallbackFalse = /fallbackToModules:\s*false/.test(block);

    report.routeAudit[route] = { found, fallbackTrue, fallbackFalse };

    if (!found) addIssue(report, "error", "routes", "Route not found in server/src/index.ts", "src/index.ts");
    if (fallbackTrue) addIssue(report, "error", "routes", "Route still falls back to /modules", "src/index.ts");
    if (!fallbackFalse) addIssue(report, "warn", "routes", "Route does not explicitly have fallbackToModules: false", "src/index.ts");
  }
} else {
  addIssue(report, "error", "routes", "Missing server/src/index.ts", "src/index.ts");
}

const nodeCheckFiles = [
  ...dedicatedPages.map((folder) => `public/${folder}/app.js`),
  "public/shared/nav.js",
  "public/shared/shell.js",
  "public/shared/source-manager.js",
  "public/shared/settings-schema.js",
];

for (const file of nodeCheckFiles) {
  const result = runNodeCheck(file);
  report.jsCheck.push(result);

  if (!result.ok) {
    addIssue(report, "error", "node --check", result.stderr || "JS syntax check failed", file);
  }
}

const modulesFiles = listFiles("public/modules");
report.modulesFolder.files = modulesFiles;
report.modulesFolder.expectedOnly = ["index.html", "styles.css"];
report.modulesFolder.hasOldApp = modulesFiles.includes("app.js");
report.modulesFolder.hasLegacyCss = modulesFiles.some((name) => name.includes("legacy") && name.endsWith(".css"));
report.modulesFolder.hasLegacyHtml = modulesFiles.some((name) => name.includes("legacy") && name.endsWith(".html"));

if (report.modulesFolder.hasOldApp) {
  addIssue(report, "error", "modules retired", "Old public/modules/app.js still exists.", "public/modules/app.js");
}

if (report.modulesFolder.hasLegacyCss || report.modulesFolder.hasLegacyHtml) {
  addIssue(report, "warn", "modules retired", "Legacy module files still exist in public/modules instead of tools/backups.", "public/modules");
}

const sharedIconDir = path.join(publicDir, "shared", "icons", "fa-duotone");
const sharedLogoDir = path.join(publicDir, "shared", "branding", "logos");

report.sharedAssets.iconsDirExists = fs.existsSync(sharedIconDir);
report.sharedAssets.sharedIconCount = countSvgIcons();
report.sharedAssets.logos = {};

if (!report.sharedAssets.iconsDirExists) {
  addIssue(report, "error", "shared icons", "Missing shared fa-duotone icon folder.", "public/shared/icons/fa-duotone");
}

if (report.sharedAssets.sharedIconCount < 10) {
  addIssue(report, "warn", "shared icons", "Shared icon count looks low.", "public/shared/icons/fa-duotone");
}

for (const logo of expectedSharedLogos) {
  const ok = fs.existsSync(path.join(sharedLogoDir, logo));
  report.sharedAssets.logos[logo] = ok;

  if (!ok) {
    addIssue(report, "error", "shared branding", `Missing shared logo file: ${logo}`, `public/shared/branding/logos/${logo}`);
  }
}

const errorCount = report.issues.filter((issue) => issue.level === "error").length;
const warnCount = report.issues.filter((issue) => issue.level === "warn").length;

report.summary.errorCount = errorCount;
report.summary.warnCount = warnCount;
report.summary.status = errorCount ? "fail" : warnCount ? "pass-with-warnings" : "pass";

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

console.log("BRMedia Patch I6 split audit complete.");
console.log(`Status: ${report.summary.status}`);
console.log(`Errors: ${errorCount}`);
console.log(`Warnings: ${warnCount}`);
console.log(`Shared icons: ${report.sharedAssets.sharedIconCount}`);
console.log(`Report saved to ${path.relative(projectRoot, reportPath)}`);

if (report.issues.length) {
  console.log("\nIssues:");
  for (const issue of report.issues) {
    console.log(` - [${issue.level}] ${issue.area}: ${issue.message}${issue.file ? ` (${issue.file})` : ""}`);
  }
}

if (errorCount) {
  process.exitCode = 1;
}