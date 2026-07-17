const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const serverRoot = fs.existsSync(path.join(projectRoot, "server", "public"))
  ? path.join(projectRoot, "server")
  : projectRoot;

const publicDir = path.join(serverRoot, "public");
const videoDir = path.join(publicDir, "video-player");
const backupDir = path.join(projectRoot, "tools", "backups", "video-style-before-j2");

const indexPath = path.join(videoDir, "index.html");
const stylesPath = path.join(videoDir, "styles.css");
const appPath = path.join(videoDir, "app.js");
const moduleIconDir = path.join(publicDir, "shared", "branding", "module-icons");

if (!fs.existsSync(videoDir)) {
  throw new Error("Missing server/public/video-player. Run this on the current BRMedia-Centre folder.");
}

if (!fs.existsSync(indexPath)) throw new Error(`Missing ${indexPath}`);
if (!fs.existsSync(stylesPath)) throw new Error(`Missing ${stylesPath}`);
if (!fs.existsSync(appPath)) throw new Error(`Missing ${appPath}`);

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

for (const file of [indexPath, stylesPath, appPath]) {
  backupFile(file);
}

ensureDir(moduleIconDir);

const iconReadmePath = path.join(moduleIconDir, "README.md");
if (!fs.existsSync(iconReadmePath)) {
  fs.writeFileSync(iconReadmePath, `# BRMedia module PNG icons

Place the new BRMedia module PNG icons here.

Recommended filenames:
- home.png
- player.png
- video-player.png
- converter.png
- tagger.png
- mastering.png
- stats.png
- settings.png
- server-settings.png

Use transparent square PNGs where possible.
`, "utf8");
}

/**
 * Light index cleanup + cache bust.
 */
let html = fs.readFileSync(indexPath, "utf8");

html = html
  .replace(/\/video-player\/styles\.css\?v=[^"]+/g, "/video-player/styles.css?v=20260510-j2")
  .replace(/\/video-player\/app\.js\?v=[^"]+/g, "/video-player/app.js?v=20260510-j2")
  .replace("BRMedia Theatre", "Video Library")
  .replace(
    "A clean Player-style video home for <strong>C:\\Videos</strong>. Scan, browse, open a poster, then watch on its own dedicated page.",
    "Browse your <strong>C:\\Videos</strong> library, open a poster, then watch in a dedicated BRMedia page."
  )
  .replace("Search films, series, ratings or folders?", "Search films, series, ratings or folders…");

fs.writeFileSync(indexPath, html, "utf8");

/**
 * Add missing icon aliases used by the J1 video controls.
 */
let app = fs.readFileSync(appPath, "utf8");

function ensureIconAlias(source, key, value) {
  const start = source.indexOf("const BR_ICON_CLASS_MAP = {");
  const end = source.indexOf("\n};", start);

  if (start < 0 || end < 0) return source;

  const mapBody = source.slice(start, end);
  const quotedKey = `"${key}":`;
  const bareKey = `${key}:`;

  if (mapBody.includes(quotedKey) || mapBody.includes(bareKey)) {
    return source;
  }

  const insert = `  ${JSON.stringify(key)}: ${JSON.stringify(value)},\n`;
  return source.slice(0, end) + "\n  // BRMedia J2 video/layout icon aliases\n" + insert + source.slice(end);
}

const aliases = {
  "volume-high": "volume-high",
  "volume-xmark": "volume-xmark",
  ellipsis: "ellipsis",
  "arrow-left": "arrow-left",
  "arrow-right": "arrow-right",
  "arrow-rotate-right": "arrow-rotate-right",
};

for (const [key, value] of Object.entries(aliases)) {
  app = ensureIconAlias(app, key, value);
}

fs.writeFileSync(appPath, app, "utf8");

/**
 * J2 visual correction. This overrides J1 without removing the structure.
 */
let css = fs.readFileSync(stylesPath, "utf8");

const marker = "/* BRMedia Video Player J2 — restore Player-style look */";
const block = `
${marker}
/* New PNG module icons should be placed in: /shared/branding/module-icons/ */
.videoPlayerBody {
  --video-bg: #071733;
  --video-card: #172f5c;
  --video-card-2: #213c70;
  --video-glass: rgba(255,255,255,0.075);
  --video-line-soft: rgba(100,181,255,0.22);
  --video-line-hot: rgba(242,160,7,0.58);
  --video-orange: #F2A007;
  --video-blue: #59c5ff;
  --video-text: #f7fbff;
  --video-muted: rgba(247,251,255,0.70);
  background:
    radial-gradient(circle at 18% 0%, rgba(68,167,255,0.18), transparent 34rem),
    linear-gradient(180deg, #253f70 0%, #17335f 44%, #071733 100%) !important;
}

.videoTopbar {
  position: sticky;
  top: 0;
  z-index: 28;
  padding: max(14px, env(safe-area-inset-top)) 14px 12px;
  background: transparent !important;
  border-bottom: 0 !important;
  backdrop-filter: none !important;
}

.videoTopbarInner {
  width: min(980px, calc(100vw - 26px));
  min-height: 106px;
  margin: 0 auto;
  padding: 14px 18px;
  border: 1px solid var(--video-line-soft);
  border-radius: 32px;
  background:
    radial-gradient(circle at 50% 0%, rgba(31,169,255,0.18), transparent 42%),
    linear-gradient(180deg, rgba(25,55,104,0.96), rgba(19,42,82,0.96));
  box-shadow: 0 18px 46px rgba(0,0,0,0.22);
}

.videoTopbarBtn {
  width: 74px !important;
  height: 74px !important;
  border-radius: 24px !important;
  border: 1px solid rgba(100,181,255,0.28) !important;
  background: rgba(255,255,255,0.07) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
}

.videoTopbarBtn .brSvgIconHost,
.videoTopbarBtn svg,
.videoTopbarBtn i {
  width: 34px !important;
  height: 34px !important;
  font-size: 30px !important;
}

.videoBrandLogo {
  width: min(310px, 54vw) !important;
  max-height: 76px !important;
  object-fit: contain;
}

.videoMain {
  width: min(980px, calc(100% - 24px)) !important;
  margin: 18px auto 44px !important;
}

.videoHeroCard {
  padding: 0 !important;
  border: 1px solid rgba(100,181,255,0.22) !important;
  border-radius: 34px !important;
  background:
    radial-gradient(circle at 10% 0%, rgba(31,169,255,0.12), transparent 34rem),
    linear-gradient(180deg, rgba(24,49,93,0.92), rgba(11,26,55,0.96)) !important;
  overflow: hidden;
}

.videoHeroCard > .moduleEyebrow,
.videoHeroCard > .moduleTitle,
.videoHeroCard > .moduleSubtitle,
.videoIntroCard,
.videoSettingsHandoff {
  display: none !important;
}

.videoPanel {
  gap: 18px !important;
  padding: 18px !important;
}

.videoHero {
  grid-template-columns: minmax(0, 1fr) 112px !important;
  align-items: center !important;
  min-height: 132px !important;
  padding: 18px !important;
  border-radius: 28px !important;
  border-color: rgba(100,181,255,0.24) !important;
  background:
    radial-gradient(circle at 0% 0%, rgba(31,169,255,0.12), transparent 28rem),
    rgba(255,255,255,0.055) !important;
  text-align: left !important;
}

.videoPanelTitle {
  margin: 4px 0 8px !important;
  font-size: clamp(34px, 7vw, 64px) !important;
  line-height: 0.88 !important;
  letter-spacing: -0.06em !important;
}

.videoPanelSub {
  font-size: 17px !important;
  line-height: 1.38 !important;
  color: var(--video-muted) !important;
}

.videoHeroBadge {
  min-height: 112px !important;
  border-radius: 26px !important;
  background: rgba(242,160,7,0.10) !important;
}

.videoHeroBadge .brSvgIconHost,
.videoHeroBadge svg,
.videoHeroBadge i {
  width: 46px !important;
  height: 46px !important;
  font-size: 42px !important;
}

.videoControlDeck,
.videoStatsStrip,
.videoQuickFilters,
.videoWallSection,
.videoRailSection,
.videoDetailView,
.videoOptionsGrid {
  border-color: rgba(100,181,255,0.22) !important;
  background: rgba(255,255,255,0.045) !important;
  border-radius: 30px !important;
}

.videoToolbar {
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 12px !important;
}

.videoToolbar .moduleActionBtn {
  min-height: 66px !important;
  border-radius: 24px !important;
}

.videoSearchBox,
.videoSortSelect {
  grid-column: 1 / -1;
  min-height: 62px !important;
  border-radius: 22px !important;
  border-color: rgba(100,181,255,0.22) !important;
  background: rgba(6,17,36,0.22) !important;
}

.videoSearchBox input,
.videoSortSelect {
  font-size: clamp(16px, 4vw, 24px) !important;
}

.videoStatus {
  margin-top: 12px !important;
  border-radius: 22px !important;
  text-align: center;
  font-size: clamp(15px, 4vw, 21px);
  line-height: 1.3;
}

.videoModeTabs {
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 10px !important;
}

.videoModeTab {
  min-height: 64px !important;
  border-radius: 24px !important;
}

.videoStatsStrip {
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  padding: 14px !important;
}

.videoStatsStrip div {
  min-height: 94px !important;
  border-radius: 24px !important;
  background: rgba(6,17,36,0.18) !important;
}

.videoStatsStrip strong {
  font-size: clamp(32px, 8vw, 48px) !important;
}

.videoQuickFilters {
  display: flex !important;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  gap: 10px !important;
  padding: 12px !important;
}

.videoFilterChip {
  min-width: 148px;
  min-height: 58px !important;
  border-radius: 22px !important;
  flex: 0 0 auto;
}

.videoSectionHead {
  align-items: flex-start !important;
  padding: 18px 18px 0 !important;
}

.videoSectionHead strong {
  font-size: clamp(26px, 6vw, 42px) !important;
}

.videoPosterWall {
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)) !important;
  gap: 18px !important;
  padding: 18px !important;
}

.videoPosterFrame {
  border-radius: 24px !important;
  border-color: rgba(100,181,255,0.24) !important;
  box-shadow: 0 18px 42px rgba(0,0,0,0.28) !important;
}

.videoCardTitle {
  font-size: clamp(18px, 4vw, 28px) !important;
  margin-top: 12px !important;
  letter-spacing: -0.03em;
}

.videoCardMeta {
  font-size: clamp(13px, 3.3vw, 18px) !important;
  color: var(--video-muted) !important;
}

.videoDetailView {
  padding: 16px !important;
  background: rgba(8,19,42,0.82) !important;
}

.videoWatchLayout {
  gap: 14px !important;
}

.videoPlayerShell,
.videoDetailInfo {
  border-color: rgba(100,181,255,0.24) !important;
  background: rgba(6,17,36,0.34) !important;
}

.videoCustomControls {
  border-color: rgba(100,181,255,0.22) !important;
  background: rgba(255,255,255,0.055) !important;
}

.videoCustomPlayBtn {
  color: #061124 !important;
  background: linear-gradient(180deg, #58c6ff, #19a7ff) !important;
  box-shadow: 0 14px 32px rgba(31,169,255,0.26) !important;
}

/* Corrected Player-style video sidebar/nav */
.videoSidebar {
  width: min(680px, 88vw) !important;
  background:
    radial-gradient(circle at 20% 0%, rgba(31,169,255,0.16), transparent 34rem),
    linear-gradient(180deg, rgba(27,58,109,0.98), rgba(14,34,72,0.98)) !important;
  border-right: 1px solid rgba(100,181,255,0.26) !important;
  box-shadow: 18px 0 70px rgba(0,0,0,0.42) !important;
}

.videoSidebarHeader {
  padding: max(20px, env(safe-area-inset-top)) 30px 18px !important;
}

.videoSidebarHeader .moduleSidebarLogo {
  width: min(340px, 56vw) !important;
  max-height: 120px !important;
  object-fit: contain;
}

.videoSidebarClose,
.moduleSidebarFloatingClose {
  width: 86px !important;
  height: 86px !important;
  border-radius: 999px !important;
  color: var(--video-orange) !important;
  background: rgba(255,255,255,0.94) !important;
  border: 0 !important;
  box-shadow: 0 18px 44px rgba(0,0,0,0.32) !important;
}

.videoSidebarSectionTitle {
  margin: 18px 6px 12px !important;
  color: var(--video-orange) !important;
  font-size: 15px !important;
  letter-spacing: 0.14em !important;
}

.videoSidebarHome,
.videoSidebarGenreBtn,
.videoSidebarGenreButton {
  display: grid !important;
  grid-template-columns: 72px minmax(0, 1fr) auto !important;
  gap: 14px !important;
  align-items: center !important;
  width: 100% !important;
  min-height: 86px !important;
  margin: 0 0 10px !important;
  padding: 10px 14px !important;
  border: 1px solid rgba(100,181,255,0.22) !important;
  border-radius: 24px !important;
  color: var(--video-text) !important;
  background: rgba(255,255,255,0.055) !important;
  text-align: left !important;
  font: inherit !important;
}

.videoSidebarHome.is-active,
.videoSidebarGenreBtn.is-active,
.videoSidebarGenreButton.is-active {
  border-color: var(--video-line-hot) !important;
  background: rgba(242,160,7,0.13) !important;
}

.videoSidebarGenreIcon {
  width: 58px !important;
  height: 58px !important;
  border-radius: 20px !important;
  display: grid !important;
  place-items: center !important;
  color: var(--video-orange) !important;
  background: rgba(255,255,255,0.08) !important;
}

.videoSidebarGenreIcon .brSvgIconHost,
.videoSidebarGenreIcon svg,
.videoSidebarGenreIcon i,
.moduleSidebarIconBadge .brSvgIconHost,
.moduleSidebarIconBadge svg,
.moduleSidebarIconBadge i {
  width: 28px !important;
  height: 28px !important;
  max-width: 28px !important;
  max-height: 28px !important;
  font-size: 25px !important;
}

.videoSidebarGenreText,
.videoSidebarHome strong {
  display: block !important;
  font-size: 21px !important;
  line-height: 1.1 !important;
  font-weight: 1000 !important;
}

.videoSidebarGenreCount {
  min-width: 42px;
  color: var(--video-blue) !important;
  font-weight: 1000 !important;
  text-align: right;
}

.videoSidebarGenreList {
  max-height: 42vh !important;
  padding-right: 2px;
}

.videoCompactModuleLinks {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 10px !important;
}

.videoCompactModuleLinks .moduleSidebarLink {
  min-height: 64px !important;
  padding: 8px !important;
  border-radius: 20px !important;
  grid-template-columns: 38px minmax(0, 1fr) !important;
  justify-items: stretch !important;
  text-align: left !important;
  background: rgba(255,255,255,0.04) !important;
}

.videoCompactModuleLinks .moduleSidebarIconBadge {
  width: 38px !important;
  height: 38px !important;
  border-radius: 14px !important;
}

.videoCompactModuleLinks .moduleSidebarTitle {
  font-size: 13px !important;
  line-height: 1.05 !important;
}

.videoCompactModuleLinks .moduleSidebarSub {
  display: block !important;
  font-size: 10px !important;
  line-height: 1.1 !important;
  margin-top: 2px !important;
  color: rgba(247,251,255,0.56) !important;
}

.brSvgIconSvg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

@media (max-width: 760px) {
  .videoTopbarInner {
    min-height: 96px;
    border-radius: 30px;
    grid-template-columns: 70px minmax(0,1fr) 70px;
  }

  .videoTopbarBtn {
    width: 62px !important;
    height: 62px !important;
    border-radius: 22px !important;
  }

  .videoBrandLogo {
    width: min(250px, 48vw) !important;
  }

  .videoPanel {
    padding: 14px !important;
  }

  .videoHero {
    grid-template-columns: 1fr !important;
    text-align: center !important;
  }

  .videoHeroBadge {
    min-height: 92px !important;
  }

  .videoToolbar {
    grid-template-columns: 1fr !important;
  }

  .videoModeTabs {
    gap: 8px !important;
  }

  .videoModeTab {
    min-height: 58px !important;
    padding: 6px !important;
    font-size: 12px !important;
  }

  .videoStatsStrip {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .videoPosterWall {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 14px !important;
    padding: 14px !important;
  }

  .videoWatchLayout,
  .videoOptionsGrid {
    grid-template-columns: 1fr !important;
  }

  .videoSidebar {
    width: min(720px, 90vw) !important;
  }

  .videoSidebarHome,
  .videoSidebarGenreBtn,
  .videoSidebarGenreButton {
    min-height: 76px !important;
    grid-template-columns: 62px minmax(0, 1fr) auto !important;
  }

  .videoSidebarGenreIcon {
    width: 52px !important;
    height: 52px !important;
  }
}
`;

if (css.includes(marker)) {
  css = css.replace(new RegExp(`${marker}[\\s\\S]*$`), block.trimStart());
} else {
  css = `${css.trimEnd()}\n\n${block.trimStart()}`;
}

fs.writeFileSync(stylesPath, css, "utf8");

ensureDir(backupDir);
fs.writeFileSync(
  path.join(backupDir, "video-style-j2-report.json"),
  JSON.stringify({
    patch: "J2",
    updatedAt: new Date().toISOString(),
    notes: [
      "Restores Video Player toward the existing audio Player visual style.",
      "Fixes video sidebar genre rows using the real .videoSidebarGenreBtn class.",
      "Makes module links smaller in the video sidebar.",
      "Adds missing icon aliases for custom video controls.",
      "Creates shared/branding/module-icons folder for future PNG module icons."
    ]
  }, null, 2),
  "utf8"
);

console.log("BRMedia Patch J2 complete.");
console.log("Video Player styling corrected toward the audio Player style.");
console.log("Video sidebar genre rows and compact module links corrected.");
console.log("Created/confirmed: server/public/shared/branding/module-icons/");
console.log(`Backups saved to ${path.relative(projectRoot, backupDir)}.`);