const fs = require("fs");
const path = require("path");

const root = process.cwd();
const publicDir = path.join(root, "server", "public");
const modulesDir = path.join(publicDir, "modules");
const converterDir = path.join(publicDir, "converter");

const modulesIndexPath = path.join(modulesDir, "index.html");
const modulesAppPath = path.join(modulesDir, "app.js");
const modulesStylesPath = path.join(modulesDir, "styles.css");

const backupDir = path.join(root, "tools", "backups", "converter-before-d1");

if (!fs.existsSync(modulesIndexPath)) throw new Error(`Missing ${modulesIndexPath}`);
if (!fs.existsSync(modulesAppPath)) throw new Error(`Missing ${modulesAppPath}`);
if (!fs.existsSync(modulesStylesPath)) throw new Error(`Missing ${modulesStylesPath}`);

const modulesHtml = fs.readFileSync(modulesIndexPath, "utf8");

function extractBetween(startNeedle, endNeedle) {
  const start = modulesHtml.indexOf(startNeedle);
  if (start < 0) throw new Error(`Missing start marker: ${startNeedle}`);

  const end = modulesHtml.indexOf(endNeedle, start);
  if (end < 0) throw new Error(`Missing end marker after ${startNeedle}: ${endNeedle}`);

  return modulesHtml.slice(start, end).trimEnd();
}

function backupExistingConverterFile(fileName) {
  const src = path.join(converterDir, fileName);
  if (!fs.existsSync(src)) return;

  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(src, path.join(backupDir, fileName));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

const converterPanel = extractBetween(
  '        <div id="converterPanel"',
  '        <div id="masteringPanel"'
);

const sharedTail = extractBetween(
  '      <div id="moduleMiniPlayer"',
  '  <script src="/modules/app.js'
);

const sidebarLinks = `      <div class="moduleSidebarLinks">
        <a class="moduleSidebarLink" href="/player" data-path="/player">
          <span class="moduleSidebarIconBadge"><i class="fa-solid fa-headphones"></i></span>
          <span class="moduleSidebarText"><span class="moduleSidebarTitle">Player</span><span class="moduleSidebarSub">Back to the full BRMedia music player.</span></span>
        </a>
        <a class="moduleSidebarLink" href="/converter" data-path="/converter">
          <span class="moduleSidebarIconBadge"><i class="fa-solid fa-arrows-rotate"></i></span>
          <span class="moduleSidebarText"><span class="moduleSidebarTitle">Converter</span><span class="moduleSidebarSub">Convert audio, video and batch jobs.</span></span>
        </a>
        <a class="moduleSidebarLink" href="/tagger" data-path="/tagger">
          <span class="moduleSidebarIconBadge"><i class="fa-solid fa-tags"></i></span>
          <span class="moduleSidebarText"><span class="moduleSidebarTitle">Tagger</span><span class="moduleSidebarSub">Metadata, artwork and BRMedia tags.</span></span>
        </a>
        <a class="moduleSidebarLink" href="/mastering" data-path="/mastering">
          <span class="moduleSidebarIconBadge"><i class="fa-solid fa-sliders"></i></span>
          <span class="moduleSidebarText"><span class="moduleSidebarTitle">Mastering</span><span class="moduleSidebarSub">Loudness, polish and final masters.</span></span>
        </a>
        <a class="moduleSidebarLink" href="/video-player" data-path="/video-player">
          <span class="moduleSidebarIconBadge"><i class="fa-solid fa-film"></i></span>
          <span class="moduleSidebarText"><span class="moduleSidebarTitle">Video Player</span><span class="moduleSidebarSub">Video playback and linked media.</span></span>
        </a>
        <a class="moduleSidebarLink" href="/stats" data-path="/stats">
          <span class="moduleSidebarIconBadge"><i class="fa-solid fa-chart-column"></i></span>
          <span class="moduleSidebarText"><span class="moduleSidebarTitle">Stats</span><span class="moduleSidebarSub">Usage, history and reporting.</span></span>
        </a>
        <a class="moduleSidebarLink" href="/settings" data-path="/settings">
          <span class="moduleSidebarIconBadge"><i class="fa-solid fa-gear"></i></span>
          <span class="moduleSidebarText"><span class="moduleSidebarTitle">Settings</span><span class="moduleSidebarSub">Universal BRMedia settings.</span></span>
        </a>
        <a class="moduleSidebarLink" href="/server-settings" data-path="/server-settings">
          <span class="moduleSidebarIconBadge"><i class="fa-solid fa-server"></i></span>
          <span class="moduleSidebarText"><span class="moduleSidebarTitle">Server Settings</span><span class="moduleSidebarSub">Sources, storage and networking.</span></span>
        </a>
      </div>`;

const converterIndex = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>BRMedia Converter</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#182E5B" />
  <link rel="apple-touch-icon" sizes="180x180" href="/home/apple-touch-icon.png?v=20260505" />
  <link rel="icon" type="image/png" sizes="192x192" href="/home/icon-192.png?v=20260505" />
  <link rel="icon" type="image/png" sizes="512x512" href="/home/icon-512.png?v=20260505" />
  <link id="moduleManifest" rel="manifest" href="/converter/site.webmanifest?v=20260510-split-d1" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Converter" />
  <link rel="stylesheet" href="/converter/styles.css?v=20260510-split-d1" />
</head>
<body>
  <div class="moduleShell">
    <header class="moduleTopbar">
      <div class="moduleBrandHeader">
        <a class="moduleSearchBtn" href="/player" aria-label="Open BRMedia Player">
          <i class="fa-solid fa-magnifying-glass"></i>
        </a>

        <img src="/home/blackburn-ravers-header.png" alt="Blackburn Ravers" class="moduleBrandLogo" />

        <button id="btnModuleMenu" class="moduleMenuBtn" type="button" aria-label="Open sidebar menu">
          <i class="fa-solid fa-bars"></i>
        </button>
      </div>
    </header>

    <div id="moduleSidebarBackdrop" class="moduleSidebarBackdrop hidden"></div>

    <aside id="moduleSidebar" class="moduleSidebar hidden">
      <div class="moduleSidebarHeader">
        <img src="/home/blackburn-ravers-header.png" alt="Blackburn Ravers" class="moduleSidebarLogo" />
      </div>

${sidebarLinks}
    </aside>

    <button id="btnModuleSidebarCloseFloating" class="moduleSidebarFloatingClose hidden" type="button" aria-label="Close sidebar menu">
      <i class="fa-solid fa-xmark"></i>
    </button>

    <main class="moduleMain">
      <section class="moduleHeroCard">
        <div class="moduleEyebrow" id="moduleEyebrow">BRMedia Converter</div>
        <h1 class="moduleTitle" id="moduleTitle">Converter</h1>
        <div class="moduleSubtitle" id="moduleSubtitle">Audio and video conversion, queues, presets, and output rules.</div>

        <div class="moduleComingSoonCard">
          <div class="moduleComingSoonIcon" id="moduleStatusIcon">
            <i class="fa-solid fa-arrows-rotate"></i>
          </div>

          <div class="moduleComingSoonText">
            <div class="moduleComingSoonTitle" id="moduleStatusTitle">Convert this file</div>
            <div class="moduleComingSoonBody" id="moduleComingSoonBody">
              Converter can receive Player files, library files or uploads, then render a safe converted copy with FFmpeg.
            </div>
          </div>
        </div>

        <div id="moduleTrackPanel" class="moduleTrackPanel hidden">
          <div class="moduleTrackTop">
            <div>
              <div class="moduleTrackKicker">Selected file</div>
              <div id="moduleTrackTitle" class="moduleTrackTitle">No file selected</div>
              <div id="moduleTrackMeta" class="moduleTrackMeta">Open this module from View Files to pass a file in.</div>
            </div>
          </div>

          <div class="moduleTrackActions">
            <a id="moduleTrackOpenPlayer" class="moduleActionBtn primary" href="/player">
              <i class="fa-solid fa-play"></i>
              <span>Open in Player</span>
            </a>

            <button id="moduleTrackClear" class="moduleActionBtn subtle" type="button">
              <i class="fa-solid fa-xmark"></i>
              <span>Clear selected file</span>
            </button>
          </div>
        </div>

${converterPanel}
      </section>

${sharedTail}
  <script src="/converter/app.js?v=20260510-split-d1"></script>
</body>
</html>
`;

ensureDir(converterDir);

backupExistingConverterFile("index.html");
backupExistingConverterFile("app.js");
backupExistingConverterFile("styles.css");

fs.writeFileSync(path.join(converterDir, "index.html"), converterIndex, "utf8");
fs.copyFileSync(modulesAppPath, path.join(converterDir, "app.js"));
fs.copyFileSync(modulesStylesPath, path.join(converterDir, "styles.css"));

console.log("BRMedia Patch D1 complete.");
console.log("Created/updated:");
console.log(" - server/public/converter/index.html");
console.log(" - server/public/converter/app.js");
console.log(" - server/public/converter/styles.css");
console.log("Old /modules folder left untouched as fallback.");
if (fs.existsSync(backupDir)) {
  console.log(`Existing converter files backed up to ${path.relative(root, backupDir)}`);
}