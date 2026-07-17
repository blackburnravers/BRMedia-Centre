const fs = require("fs");
const path = require("path");

const SPLIT_MASTERING = true;
const SPLIT_VIDEO_PLAYER = true;

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "server", "public");
const modulesDir = path.join(publicDir, "modules");
const modulesIndexPath = path.join(modulesDir, "index.html");
const modulesAppPath = path.join(modulesDir, "app.js");
const modulesStylesPath = path.join(modulesDir, "styles.css");

if (!fs.existsSync(modulesIndexPath)) {
  throw new Error(`Missing ${modulesIndexPath}`);
}

if (!fs.existsSync(modulesAppPath)) {
  throw new Error(`Missing ${modulesAppPath}`);
}

if (!fs.existsSync(modulesStylesPath)) {
  throw new Error(`Missing ${modulesStylesPath}`);
}

const modulesHtml = fs.readFileSync(modulesIndexPath, "utf8");

function extractBetween(startNeedle, endNeedle) {
  const start = modulesHtml.indexOf(startNeedle);
  if (start < 0) throw new Error(`Missing start marker: ${startNeedle}`);

  const end = modulesHtml.indexOf(endNeedle, start);
  if (end < 0) throw new Error(`Missing end marker after ${startNeedle}: ${endNeedle}`);

  return modulesHtml.slice(start, end).trimEnd();
}

const videoSidebarNav = extractBetween(
  '      <div id="videoSidebarNav"',
  '      <div class="moduleSidebarLinks">'
);

const masteringPanel = extractBetween(
  '        <div id="masteringPanel"',
  '        <div id="videoPanel"'
);

const videoPanel = extractBetween(
  '        <div id="videoPanel"',
  '        <div id="taggerPanel"'
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

function buildPage({
  title,
  appleTitle,
  manifestHref,
  cssHref,
  scriptHref,
  panelHtml,
  includeVideoSidebar = false,
}) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#182E5B" />
  <link rel="apple-touch-icon" sizes="180x180" href="/home/apple-touch-icon.png?v=20260505" />
  <link rel="icon" type="image/png" sizes="192x192" href="/home/icon-192.png?v=20260505" />
  <link rel="icon" type="image/png" sizes="512x512" href="/home/icon-512.png?v=20260505" />
  <link id="moduleManifest" rel="manifest" href="${manifestHref}" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="${appleTitle}" />
  <link rel="stylesheet" href="${cssHref}" />
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

${includeVideoSidebar ? `${videoSidebarNav}\n\n` : ""}${sidebarLinks}
    </aside>

    <button id="btnModuleSidebarCloseFloating" class="moduleSidebarFloatingClose hidden" type="button" aria-label="Close sidebar menu">
      <i class="fa-solid fa-xmark"></i>
    </button>

    <main class="moduleMain">
      <section class="moduleHeroCard">
        <div class="moduleEyebrow" id="moduleEyebrow">BRMedia Module</div>
        <h1 class="moduleTitle" id="moduleTitle">Coming soon</h1>
        <div class="moduleSubtitle" id="moduleSubtitle">This module page is being built next.</div>

        <div class="moduleComingSoonCard">
          <div class="moduleComingSoonIcon" id="moduleStatusIcon">
            <i class="fa-solid fa-screwdriver-wrench"></i>
          </div>

          <div class="moduleComingSoonText">
            <div class="moduleComingSoonTitle" id="moduleStatusTitle">Module ready for handoff</div>
            <div class="moduleComingSoonBody" id="moduleComingSoonBody">
              This BRMedia module page can now receive files from the Player. Full tools are next.
            </div>
          </div>
        </div>

        <div id="moduleTrackPanel" class="moduleTrackPanel hidden">
          <div class="moduleTrackTop">
            <div>
              <div class="moduleTrackKicker">Selected file</div>
              <div id="moduleTrackTitle" class="moduleTrackTitle">No file selected</div>
              <div id="moduleTrackMeta" class="moduleTrackMeta">Open this module from Settings → Files to pass a track in.</div>
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

${panelHtml}
      </section>

${sharedTail}
  <script src="${scriptHref}"></script>
</body>
</html>
`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyLegacyModuleAssets(folder) {
  const outDir = path.join(publicDir, folder);
  ensureDir(outDir);

  fs.copyFileSync(modulesAppPath, path.join(outDir, "app.js"));
  fs.copyFileSync(modulesStylesPath, path.join(outDir, "styles.css"));
}

function writeModulePage(folder, html) {
  const outDir = path.join(publicDir, folder);
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
}

if (SPLIT_MASTERING) {
  copyLegacyModuleAssets("mastering");

  writeModulePage("mastering", buildPage({
    title: "BRMedia Mastering",
    appleTitle: "Mastering",
    manifestHref: "/mastering/site.webmanifest?v=20260509-split-b",
    cssHref: "/mastering/styles.css?v=20260509-split-b",
    scriptHref: "/mastering/app.js?v=20260509-split-b",
    panelHtml: masteringPanel,
  }));
}

if (SPLIT_VIDEO_PLAYER) {
  copyLegacyModuleAssets("video-player");

  writeModulePage("video-player", buildPage({
    title: "BRMedia Video Player",
    appleTitle: "Video",
    manifestHref: "/video-player/site.webmanifest?v=20260509-split-c",
    cssHref: "/video-player/styles.css?v=20260509-split-c",
    scriptHref: "/video-player/app.js?v=20260509-split-c",
    panelHtml: videoPanel,
    includeVideoSidebar: true,
  }));
}

console.log("BRMedia Module Split B/C complete.");
console.log("Created/updated:");
if (SPLIT_MASTERING) {
  console.log(" - server/public/mastering/index.html");
  console.log(" - server/public/mastering/app.js");
  console.log(" - server/public/mastering/styles.css");
}
if (SPLIT_VIDEO_PLAYER) {
  console.log(" - server/public/video-player/index.html");
  console.log(" - server/public/video-player/app.js");
  console.log(" - server/public/video-player/styles.css");
}
console.log("Old /modules folder left untouched as fallback.");