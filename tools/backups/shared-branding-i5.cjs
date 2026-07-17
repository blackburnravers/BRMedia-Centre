const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const serverRoot = fs.existsSync(path.join(projectRoot, "server", "public"))
  ? path.join(projectRoot, "server")
  : projectRoot;

const publicDir = path.join(serverRoot, "public");
const homeDir = path.join(publicDir, "home");
const sharedLogoDir = path.join(publicDir, "shared", "branding", "logos");
const backupDir = path.join(projectRoot, "tools", "backups", "shared-branding-before-i5");

const targetFolders = [
  "converter",
  "tagger",
  "mastering",
  "video-player",
  "stats",
  "settings",
  "server-settings",
];

const logoFiles = [
  "blackburn-ravers-header.png",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "blackburn_ravers_layered.svg",
  "blackburn_ravers_layered_preview.png",
];

if (!fs.existsSync(publicDir)) {
  throw new Error("Could not find server/public. Run this from BRMedia-Centre root or server root.");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const rel = path.relative(serverRoot, filePath);
  const out = path.join(backupDir, rel);

  ensureDir(path.dirname(out));
  fs.copyFileSync(filePath, out);
}

function copySharedLogoIfNeeded(fileName, report) {
  const from = path.join(homeDir, fileName);
  const to = path.join(sharedLogoDir, fileName);

  if (!fs.existsSync(from)) {
    report.missing.push(path.relative(serverRoot, from));
    return;
  }

  ensureDir(sharedLogoDir);

  if (fs.existsSync(to)) {
    const existing = fs.readFileSync(to);
    const incoming = fs.readFileSync(from);

    if (existing.equals(incoming)) {
      report.skipped.push(path.relative(serverRoot, to));
      return;
    }

    backupFile(to);
  }

  fs.copyFileSync(from, to);
  report.copied.push(path.relative(serverRoot, to));
}

function patchIndexHtml(folder, report) {
  const filePath = path.join(publicDir, folder, "index.html");
  if (!fs.existsSync(filePath)) return;

  backupFile(filePath);

  let html = fs.readFileSync(filePath, "utf8");
  const before = html;

  html = html
    .replace(/href="\/home\/apple-touch-icon\.png\?v=[^"]*"/g, 'href="/shared/branding/logos/apple-touch-icon.png?v=20260510-i5"')
    .replace(/href="\/home\/icon-192\.png\?v=[^"]*"/g, 'href="/shared/branding/logos/icon-192.png?v=20260510-i5"')
    .replace(/href="\/home\/icon-512\.png\?v=[^"]*"/g, 'href="/shared/branding/logos/icon-512.png?v=20260510-i5"')
    .replace(/src="\/home\/blackburn-ravers-header\.png(?:\?v=[^"]*)?"/g, 'src="/shared/branding/logos/blackburn-ravers-header.png?v=20260510-i5"');

  if (html !== before) {
    fs.writeFileSync(filePath, html, "utf8");
    report.updatedHtml.push(path.relative(serverRoot, filePath));
  }
}

function patchServerManifest(report) {
  const filePath = path.join(serverRoot, "src", "index.ts");
  if (!fs.existsSync(filePath)) return;

  backupFile(filePath);

  let ts = fs.readFileSync(filePath, "utf8");
  const before = ts;

  ts = ts
    .replace(/src: "\/home\/icon-192\.png\?v=[^"]*"/g, 'src: "/shared/branding/logos/icon-192.png?v=20260510-i5"')
    .replace(/src: "\/home\/icon-512\.png\?v=[^"]*"/g, 'src: "/shared/branding/logos/icon-512.png?v=20260510-i5"');

  if (ts !== before) {
    fs.writeFileSync(filePath, ts, "utf8");
    report.updatedServer.push(path.relative(serverRoot, filePath));
  }
}

function auditSharedBranding(report) {
  for (const fileName of ["blackburn-ravers-header.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png"]) {
    const filePath = path.join(sharedLogoDir, fileName);
    if (!fs.existsSync(filePath)) report.auditMissing.push(path.relative(serverRoot, filePath));
  }

  for (const folder of targetFolders) {
    const filePath = path.join(publicDir, folder, "index.html");
    if (!fs.existsSync(filePath)) continue;

    const html = fs.readFileSync(filePath, "utf8");
    const oldRefs = [];

    if (html.includes("/home/blackburn-ravers-header.png")) oldRefs.push("/home/blackburn-ravers-header.png");
    if (html.includes("/home/apple-touch-icon.png")) oldRefs.push("/home/apple-touch-icon.png");
    if (html.includes("/home/icon-192.png")) oldRefs.push("/home/icon-192.png");
    if (html.includes("/home/icon-512.png")) oldRefs.push("/home/icon-512.png");

    if (oldRefs.length) {
      report.remainingHomeRefs.push({
        file: path.relative(serverRoot, filePath),
        refs: oldRefs,
      });
    }
  }
}

const report = {
  patch: "I5",
  updatedAt: new Date().toISOString(),
  copied: [],
  skipped: [],
  missing: [],
  updatedHtml: [],
  updatedServer: [],
  auditMissing: [],
  remainingHomeRefs: [],
  notes: [
    "Player and Home pages were not changed.",
    "Dedicated split modules and Settings/Stats/Server Settings now use shared logo/icon assets.",
    "Dynamic webmanifest icons now point to /shared/branding/logos.",
  ],
};

for (const fileName of logoFiles) {
  copySharedLogoIfNeeded(fileName, report);
}

for (const folder of targetFolders) {
  patchIndexHtml(folder, report);
}

patchServerManifest(report);
auditSharedBranding(report);

ensureDir(backupDir);
fs.writeFileSync(
  path.join(backupDir, "shared-branding-i5-report.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log("BRMedia Patch I5 complete.");
console.log(`Copied shared logo files: ${report.copied.length}`);
console.log(`Skipped already-matching files: ${report.skipped.length}`);
console.log(`Updated HTML files: ${report.updatedHtml.length}`);
console.log(`Updated server files: ${report.updatedServer.length}`);

if (report.auditMissing.length) {
  console.log("\nMissing shared branding files:");
  report.auditMissing.forEach((item) => console.log(` - ${item}`));
}

if (report.remainingHomeRefs.length) {
  console.log("\nRemaining /home branding refs in split pages:");
  report.remainingHomeRefs.forEach((item) => console.log(` - ${item.file}: ${item.refs.join(", ")}`));
}

if (!report.auditMissing.length && !report.remainingHomeRefs.length) {
  console.log("Shared branding audit clean.");
}

console.log(`Report saved to ${path.relative(projectRoot, path.join(backupDir, "shared-branding-i5-report.json"))}`);
console.log(`Backups saved to ${path.relative(projectRoot, backupDir)}.`);