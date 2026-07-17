const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const serverRoot = fs.existsSync(path.join(projectRoot, "server", "public"))
  ? path.join(projectRoot, "server")
  : projectRoot;

const publicDir = path.join(serverRoot, "public");
const homeDir = path.join(publicDir, "home");
const playerBrandingDir = path.join(publicDir, "player", "branding");
const playerIconDir = path.join(playerBrandingDir, "icons");
const sharedDir = path.join(publicDir, "shared");

const backupDir = path.join(projectRoot, "tools", "backups", "shared-icons-branding-before-i2");

if (!fs.existsSync(publicDir)) {
  throw new Error("Could not find server/public. Run this from BRMedia-Centre root or server root.");
}

if (!fs.existsSync(playerIconDir)) {
  throw new Error("Could not find server/public/player/branding/icons.");
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

function copyFileSafe(from, to, label, report) {
  if (!fs.existsSync(from)) {
    report.missing.push({ label, from: path.relative(serverRoot, from) });
    return false;
  }

  ensureDir(path.dirname(to));

  if (fs.existsSync(to)) {
    const existing = fs.readFileSync(to);
    const incoming = fs.readFileSync(from);

    if (existing.equals(incoming)) {
      report.skipped.push({ label, to: path.relative(serverRoot, to), reason: "already matched" });
      return false;
    }

    backupFile(to);
  }

  fs.copyFileSync(from, to);
  report.copied.push({
    label,
    from: path.relative(serverRoot, from),
    to: path.relative(serverRoot, to),
  });

  return true;
}

function copyDirFiles(fromDir, toDir, label, report, allowedExts = null) {
  if (!fs.existsSync(fromDir)) {
    report.missing.push({ label, from: path.relative(serverRoot, fromDir) });
    return;
  }

  ensureDir(toDir);

  for (const fileName of fs.readdirSync(fromDir)) {
    const from = path.join(fromDir, fileName);
    const stat = fs.statSync(from);

    if (stat.isDirectory()) {
      copyDirFiles(from, path.join(toDir, fileName), `${label}/${fileName}`, report, allowedExts);
      continue;
    }

    const ext = path.extname(fileName).toLowerCase();

    if (allowedExts && !allowedExts.includes(ext)) {
      report.skipped.push({
        label,
        to: path.relative(serverRoot, path.join(toDir, fileName)),
        reason: `extension ${ext || "none"} ignored`,
      });
      continue;
    }

    copyFileSafe(from, path.join(toDir, fileName), label, report);
  }
}

const report = {
  patch: "I2",
  copiedAt: new Date().toISOString(),
  copied: [],
  skipped: [],
  missing: [],
  createdFolders: [],
  notes: [
    "Player assets were copied only. Nothing was moved or deleted.",
    "Split modules can later use /shared/icons/fa-duotone first, with /player/branding/icons as fallback.",
    "Home/module PNG icons can later live under /shared/branding/module-icons once the new PNG set is created.",
  ],
};

const foldersToCreate = [
  path.join(sharedDir, "icons"),
  path.join(sharedDir, "icons", "fa-duotone"),
  path.join(sharedDir, "icons", "nav"),
  path.join(sharedDir, "icons", "modules"),
  path.join(sharedDir, "icons", "actions"),
  path.join(sharedDir, "icons", "status"),
  path.join(sharedDir, "branding"),
  path.join(sharedDir, "branding", "logos"),
  path.join(sharedDir, "branding", "global"),
  path.join(sharedDir, "branding", "brands"),
  path.join(sharedDir, "branding", "categories"),
  path.join(sharedDir, "branding", "categories", "icons"),
  path.join(sharedDir, "branding", "categories", "banners"),
  path.join(sharedDir, "branding", "splash"),
  path.join(sharedDir, "branding", "module-icons"),
];

for (const folder of foldersToCreate) {
  ensureDir(folder);
  report.createdFolders.push(path.relative(serverRoot, folder));
}

/**
 * 1) Font Awesome Duotone SVGs
 */
copyDirFiles(
  playerIconDir,
  path.join(sharedDir, "icons", "fa-duotone"),
  "Font Awesome Duotone icons",
  report,
  [".svg"]
);

/**
 * 2) Player global branding
 */
copyDirFiles(
  path.join(playerBrandingDir, "global"),
  path.join(sharedDir, "branding", "global"),
  "Player global branding",
  report,
  [".png", ".jpg", ".jpeg", ".webp", ".svg"]
);

/**
 * 3) Brand images
 */
copyDirFiles(
  path.join(playerBrandingDir, "brands"),
  path.join(sharedDir, "branding", "brands"),
  "BRMedia brand images",
  report,
  [".png", ".jpg", ".jpeg", ".webp", ".svg"]
);

/**
 * 4) Category icons/banners
 */
copyDirFiles(
  path.join(playerBrandingDir, "categories", "icons"),
  path.join(sharedDir, "branding", "categories", "icons"),
  "Category icons",
  report,
  [".png", ".jpg", ".jpeg", ".webp", ".svg"]
);

copyDirFiles(
  path.join(playerBrandingDir, "categories", "banners"),
  path.join(sharedDir, "branding", "categories", "banners"),
  "Category banners",
  report,
  [".png", ".jpg", ".jpeg", ".webp", ".svg"]
);

/**
 * 5) Home/logo assets
 */
const logoFiles = [
  "blackburn-ravers-header.png",
  "blackburn_ravers_layered.svg",
  "blackburn_ravers_layered_preview.png",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
];

for (const fileName of logoFiles) {
  copyFileSafe(
    path.join(homeDir, fileName),
    path.join(sharedDir, "branding", "logos", fileName),
    "Home/shared logo assets",
    report
  );
}

/**
 * 6) Home splash layer assets
 */
const splashLayerFiles = [
  "01_the.png",
  "02_bl.png",
  "03_heartbeat_a_v.png",
  "04_ckburn.png",
  "05_ra.png",
  "06_ers.png",
  "07_tagline_white.png",
  "08_tagline_blue.png",
];

for (const fileName of splashLayerFiles) {
  copyFileSafe(
    path.join(homeDir, fileName),
    path.join(sharedDir, "branding", "splash", fileName),
    "Home splash layers",
    report
  );
}

/**
 * 7) Keepers/readme
 */
const readmePath = path.join(sharedDir, "branding", "README.md");
backupFile(readmePath);

fs.writeFileSync(readmePath, `# BRMedia shared branding

Patch I2 created this shared branding area.

Player assets were copied here, not moved.

Current rule:
- Player can keep using its existing paths.
- Split modules can gradually switch to shared assets.
- Future PNG module icons should go in: \`server/public/shared/branding/module-icons/\`.

Suggested future module icon names:
- player.png
- video-player.png
- converter.png
- tagger.png
- mastering.png
- stats.png
- settings.png
- server-settings.png
`, "utf8");

const iconReadmePath = path.join(sharedDir, "icons", "README.md");
backupFile(iconReadmePath);

fs.writeFileSync(iconReadmePath, `# BRMedia shared icons

Patch I2 copied Font Awesome Duotone SVG icons from:

\`server/public/player/branding/icons/\`

to:

\`server/public/shared/icons/fa-duotone/\`

Nothing was moved or deleted from Player.

Future rule:
- Shared modules should use \`/shared/icons/fa-duotone/\` first.
- Keep \`/player/branding/icons/\` as fallback until Player icon migration is fully safe.
`, "utf8");

ensureDir(backupDir);
fs.writeFileSync(
  path.join(backupDir, "shared-icons-branding-i2-report.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log("BRMedia Patch I2 complete.");
console.log(`Copied files: ${report.copied.length}`);
console.log(`Skipped files: ${report.skipped.length}`);
console.log(`Missing source files/folders: ${report.missing.length}`);
console.log("Created shared folders under server/public/shared/icons and server/public/shared/branding.");
console.log("Player assets were copied only. Nothing was moved or deleted.");
console.log(`Report saved to ${path.relative(projectRoot, path.join(backupDir, "shared-icons-branding-i2-report.json"))}`);
console.log(`Backups saved to ${path.relative(projectRoot, backupDir)}.`);