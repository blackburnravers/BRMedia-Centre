const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const serverRoot = fs.existsSync(path.join(projectRoot, "server", "public"))
  ? path.join(projectRoot, "server")
  : projectRoot;

const publicDir = path.join(serverRoot, "public");
const iconDir = path.join(publicDir, "player", "branding", "icons");
const backupDir = path.join(projectRoot, "tools", "backups", "icons-before-i1");

if (!fs.existsSync(publicDir)) throw new Error("Could not find server/public. Run this from BRMedia-Centre root or server root.");
if (!fs.existsSync(iconDir)) throw new Error("Could not find player/branding/icons.");

const moduleFolders = ["converter", "tagger", "mastering", "video-player"];

const ignoredFaClasses = new Set([
  "solid",
  "regular",
  "brands",
  "duotone",
  "light",
  "thin",
  "sharp",
  "spin",
  "pulse",
  "fw",
  "lg",
  "xl",
  "2x",
]);

const iconAliases = {
  bars: "list-music",
  "bars-staggered": "list-music",
  xmark: "xmark",

  headphones: "headphones",
  play: "play",
  pause: "pause",

  "arrow-rotate-left": "arrow-rotate-left",
  "arrows-rotate": "arrow-rotate-right",
  "right-left": "right-left",
  "backward-fast": "backward-fast",
  "backward-step": "backward-step",
  "forward-step": "forward-step",

  "file-audio": "file-audio",
  "file-export": "file-export",
  "file-music": "file-music",
  "file-pen": "file-pen",
  "file-video": "file-video",

  "mobile-screen-button": "mobile-screen-button",
  waveform: "waveform",
  "wave-pulse": "wave-pulse",
  download: "download",
  "gauge-high": "gauge-high",
  "chart-column": "chart-column",
  "chart-line": "chart-column",

  stars: "stars",
  star: "star",
  bolt: "bolt",
  tag: "tag",
  tags: "tags",
  image: "image",
  upload: "upload",
  "cloud-arrow-down": "cloud-arrow-down",
  "floppy-disk": "floppy-disk",
  "wand-magic-sparkles": "wand-magic-sparkles",

  album: "album",
  "music-note": "music-note",
  "list-music": "list-music",
  "list-ul": "list-ul",
  "id-card": "id-card",
  "chevron-down": "chevron-down",
  "compact-disc": "compact-disc",
  palette: "palette",

  sliders: "sliders",
  "sliders-up": "sliders-up",
  "screwdriver-wrench": "gear-complex",

  film: "film",
  video: "video",
  "circle-play": "circle-play",
  "closed-captioning": "closed-captioning",
  subtitles: "subtitles",
  language: "language",
  house: "house",
  heart: "heart",
  bookmark: "bookmark",
  timer: "clock",
  clock: "clock",
  expand: "expand",
  tv: "tv",
  "share-nodes": "share-nodes",

  server: "server",
  gear: "gear-complex",

  folder: "folder",
  "folder-open": "folder-open",
  "folder-plus": "folder-plus",
  "magnifying-glass": "magnifying-glass",

  "circle-check": "circle-check",
  "circle-info": "circle-info",
  "circle-question": "circle-question",
  "triangle-exclamation": "triangle-exclamation",
};

function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const rel = path.relative(serverRoot, filePath);
  const out = path.join(backupDir, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(filePath, out);
}

function formatKey(key) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}

function keyExists(mapBody, key) {
  const quoted = new RegExp(`["']${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']\\s*:`);
  const bare = new RegExp(`(^|\\n)\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:`);
  return quoted.test(mapBody) || bare.test(mapBody);
}

function patchIconMap(appPath) {
  let text = fs.readFileSync(appPath, "utf8");
  const match = text.match(/const BR_ICON_CLASS_MAP = \{([\s\S]*?)\n\};/);

  if (!match) {
    throw new Error(`Could not find BR_ICON_CLASS_MAP in ${appPath}`);
  }

  let mapBody = match[1];
  const additions = [];

  for (const [key, value] of Object.entries(iconAliases)) {
    if (!keyExists(mapBody, key)) {
      additions.push(`  ${formatKey(key)}: ${JSON.stringify(value)},`);
    }
  }

  if (!additions.length) return false;

  const nextMap = `const BR_ICON_CLASS_MAP = {${mapBody}\n\n  // BRMedia I1 shared icon aliases\n${additions.join("\n")}\n};`;
  text = text.replace(/const BR_ICON_CLASS_MAP = \{[\s\S]*?\n\};/, nextMap);
  fs.writeFileSync(appPath, text, "utf8");
  return true;
}

function updateCacheBust(indexPath, folder) {
  if (!fs.existsSync(indexPath)) return;

  let html = fs.readFileSync(indexPath, "utf8");
  const escapedFolder = folder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  html = html.replace(new RegExp(`/${escapedFolder}/app\\.js\\?v=[^"]+`, "g"), `/${folder}/app.js?v=20260510-i1`);
  fs.writeFileSync(indexPath, html, "utf8");
}

function getIconFiles() {
  return new Set(
    fs.readdirSync(iconDir)
      .filter((name) => name.endsWith(".svg"))
      .map((name) => name.replace(/\.svg$/, ""))
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

function extractHandledKeys(text) {
  const match = text.match(/const BR_ICON_CLASS_MAP = \{([\s\S]*?)\n\};/);
  if (!match) return new Set();

  const keys = new Set();
  const re = /(?:^|\n)\s*(?:"([^"]+)"|([A-Za-z_$][A-Za-z0-9_$]*))\s*:/g;
  let found;

  while ((found = re.exec(match[1]))) {
    keys.add(found[1] || found[2]);
  }

  return keys;
}

function extractFaClasses(folder) {
  const files = [
    path.join(publicDir, folder, "index.html"),
    path.join(publicDir, folder, "app.js"),
  ];

  const found = new Set();

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    const re = /fa-([a-z0-9-]+)/g;
    let match;

    while ((match = re.exec(text))) {
      const name = match[1];
      if (!ignoredFaClasses.has(name)) found.add(name);
    }
  }

  return found;
}

const changed = [];

for (const folder of moduleFolders) {
  const appPath = path.join(publicDir, folder, "app.js");
  const indexPath = path.join(publicDir, folder, "index.html");

  if (!fs.existsSync(appPath)) {
    console.warn(`Skipping missing ${folder}/app.js`);
    continue;
  }

  backupFile(appPath);
  backupFile(indexPath);

  if (patchIconMap(appPath)) changed.push(folder);
  updateCacheBust(indexPath, folder);
}

const iconFiles = getIconFiles();
const report = {};

for (const folder of moduleFolders) {
  const appPath = path.join(publicDir, folder, "app.js");
  if (!fs.existsSync(appPath)) continue;

  const text = fs.readFileSync(appPath, "utf8");
  const mappedValues = extractMappedValues(text);
  const handledKeys = extractHandledKeys(text);
  const faClasses = extractFaClasses(folder);

  const missingSvgFiles = Array.from(new Set(mappedValues.filter((name) => !iconFiles.has(name)))).sort();
  const unmappedClasses = Array.from(faClasses).filter((name) => !handledKeys.has(name)).sort();

  report[folder] = {
    faClasses: Array.from(faClasses).sort(),
    unmappedClasses,
    missingSvgFiles,
  };
}

fs.mkdirSync(backupDir, { recursive: true });
fs.writeFileSync(path.join(backupDir, "icon-report-i1.json"), JSON.stringify(report, null, 2), "utf8");

console.log("BRMedia Patch I1 complete.");
console.log(changed.length ? `Updated icon maps in: ${changed.join(", ")}` : "No icon maps needed changes.");
console.log("Updated module app.js cache-busts to v=20260510-i1.");

let hasProblems = false;

for (const [folder, info] of Object.entries(report)) {
  if (info.unmappedClasses.length || info.missingSvgFiles.length) {
    hasProblems = true;
    console.log(`\n${folder}:`);
    if (info.unmappedClasses.length) console.log(`  Unmapped fa classes: ${info.unmappedClasses.join(", ")}`);
    if (info.missingSvgFiles.length) console.log(`  Missing SVG files: ${info.missingSvgFiles.join(", ")}`);
  }
}

if (!hasProblems) {
  console.log("Icon audit clean: no unmapped module icon classes and no missing mapped SVG files.");
}

console.log(`Report saved to ${path.relative(projectRoot, path.join(backupDir, "icon-report-i1.json"))}`);
console.log(`Backups saved to ${path.relative(projectRoot, backupDir)}.`);