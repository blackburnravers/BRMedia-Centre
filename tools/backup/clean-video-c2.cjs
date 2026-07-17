const fs = require("fs");
const path = require("path");

const root = process.cwd();
const appPath = path.join(root, "server", "public", "video-player", "app.js");
const indexPath = path.join(root, "server", "public", "video-player", "index.html");
const backupPath = path.join(root, "tools", "backups", "video-player-app.full-split-c1.js");

if (!fs.existsSync(appPath)) throw new Error(`Missing ${appPath}`);

let source = fs.readFileSync(appPath, "utf8");

if (!source.includes("function showVideoTab") || !source.includes("function renderVideoWall")) {
  throw new Error("This does not look like the split C1 Video Player app.js. Aborting.");
}

function updateVideoIndexCacheBust() {
  if (!fs.existsSync(indexPath)) return;

  const html = fs.readFileSync(indexPath, "utf8");
  const updatedHtml = html.replace(
    /\/video-player\/app\.js\?v=[^"]+/g,
    "/video-player/app.js?v=20260509-split-c2"
  );

  if (updatedHtml !== html) fs.writeFileSync(indexPath, updatedHtml, "utf8");
}

if (!source.includes("const converterPanel") && !source.includes("function isConverterAudioFormat")) {
  updateVideoIndexCacheBust();
  console.log("Video Player app.js already looks cleaned for C2.");
  console.log("Updated video-player app.js cache-bust to v=20260509-split-c2.");
  process.exit(0);
}

if (!fs.existsSync(backupPath) && source.includes("const converterPanel")) {
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, source, "utf8");
}

function removeBetween(startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  if (start < 0) throw new Error(`Missing start marker: ${startNeedle}`);

  const end = source.indexOf(endNeedle, start);
  if (end < 0) throw new Error(`Missing end marker after ${startNeedle}: ${endNeedle}`);

  source = source.slice(0, start) + source.slice(end);
}

function replaceBetween(startNeedle, endNeedle, replacement) {
  const start = source.indexOf(startNeedle);
  if (start < 0) throw new Error(`Missing start marker: ${startNeedle}`);

  const end = source.indexOf(endNeedle, start);
  if (end < 0) throw new Error(`Missing end marker after ${startNeedle}: ${endNeedle}`);

  source = source.slice(0, start) + replacement.trim() + "\n\n" + source.slice(end);
}

removeBetween("const converterPanel =", "const moduleLibraryPicker =");
removeBetween("const taggerPanel =", "const BRMEDIA_CUSTOM_TAGS_KEY =");
removeBetween("const BRMEDIA_CUSTOM_TAGS_KEY =", "const moduleLibraryPickerState =");

source = source.replace('target: "tagger",', 'target: "video-player",');

removeBetween("let taggerMetadataRequestId =", "const BR_ICON_BASE_PATH =");
removeBetween("const MODULE_CONFIG =", "function escapeHtml");
removeBetween("async function refreshServerCustomTags", "function stripFileExtension");
removeBetween("function isConverterAudioFormat", "function writeVideoStorage");
removeBetween("function getModuleLibraryPickerFilteredItems", "function findModuleMiniTrackById");
removeBetween("async function hydrateTaggerArtworkFromTrack", "async function hydrateSelectedTrack");

replaceBetween("async function hydrateSelectedTrack", "function handleModuleSidebarOpen", `function getInitialVideoIdFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return String(params.get("videoId") || params.get("id") || "").trim();
  } catch {
    return "";
  }
}

function hydrateInitialVideoFromUrl() {
  const id = getInitialVideoIdFromUrl();
  if (id && findVideoById(id)) openVideoById(id);
}`);

replaceBetween("const config =", "btnModuleMiniPlay?.addEventListener", `moduleTrackPanel?.classList.add("hidden");
document.body.classList.add("moduleSearchAllowed", "moduleVideoMode", "moduleToolLive");

if (moduleEyebrow) moduleEyebrow.textContent = "BRMedia Video Player";
if (moduleTitle) moduleTitle.textContent = "Video Player";
if (moduleSubtitle) moduleSubtitle.textContent = "Poster-wall streaming from C:\\\\Videos with resume, subtitles and audio/dub controls.";
if (moduleComingSoonBody) moduleComingSoonBody.textContent = "Video Player scans your C:\\\\Videos folder and opens videos in a BRMedia theatre view.";
if (moduleStatusTitle) moduleStatusTitle.textContent = "Open video";
if (moduleStatusIcon) {
  moduleStatusIcon.innerHTML = '<i class="fa-solid fa-film"></i>';
  hydrateBrIcons(moduleStatusIcon);
}
if (moduleFooterCopy) moduleFooterCopy.textContent = "© The Blackburn Ravers • DJ NJ & Upalnite " + new Date().getFullYear();

document.title = "Video Player • BRMedia";
videoPanel?.classList.remove("hidden");
videoSidebarNav?.classList.remove("hidden");

let moduleNavLockUntil = 0;

function navigateModuleLink(e, link) {
  if (!link?.href) return;

  const now = Date.now();

  if (moduleSidebarScrollLock.dragging || now - moduleSidebarScrollLock.movedAt < 280) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    return;
  }

  if (now < moduleNavLockUntil) return;
  moduleNavLockUntil = now + 650;

  e?.preventDefault?.();
  e?.stopPropagation?.();

  closeModuleSidebar();
  window.location.assign(link.href);
}

document.querySelectorAll(".moduleSidebarLink[data-path]").forEach((link) => {
  const path = link.getAttribute("data-path") || "";

  if (path === window.location.pathname) {
    link.classList.add("is-active");
  }

  addModuleTapHandler(link, (e) => navigateModuleLink(e, link));
});

showVideoTab("browse");
renderVideoTimerStatus();

if (videoState.timerEndAt) {
  window.clearInterval(videoState.timerInterval);
  videoState.timerInterval = window.setInterval(tickVideoTimer, 1000);
}

void fetchVideoLibrary(false)
  .then(() => hydrateInitialVideoFromUrl())
  .catch((err) => {
    console.warn("Video library load failed", err);
    setVideoStatus(err?.message || "Could not load C:\\\\Videos", "error");
  });

btnVideoRefresh?.addEventListener("click", () => void fetchVideoLibrary(true));
btnVideoMatchMissing?.addEventListener("click", () => void fetchVideoLibrary(true, true));
btnVideoMatchSelected?.addEventListener("click", () => void refreshSelectedVideoMetadata(true));

btnVideoOpenSpotlight?.addEventListener("click", () => {
  const id = videoState.spotlightId || videoState.items[0]?.id || "";
  if (id) openVideoById(id);
});

videoSearchInput?.addEventListener("input", () => {
  videoState.query = videoSearchInput.value || "";
  renderVideoWall();
});

videoSortSelect?.addEventListener("change", () => {
  videoState.sort = videoSortSelect.value || "title";
  renderVideoWall();
});

videoModeTabs.forEach((btn) => {
  btn.addEventListener("click", () => showVideoTab(btn.getAttribute("data-video-tab") || "browse"));
});

btnVideoSidebarHome?.addEventListener("click", () => setVideoSidebarGenre(""));

videoSidebarGenreList?.addEventListener("click", (e) => {
  const btn = e.target?.closest?.("[data-video-sidebar-genre]");
  if (!btn) return;
  setVideoSidebarGenre(btn.getAttribute("data-video-sidebar-genre") || "");
});

videoPosterWall?.addEventListener("click", (e) => {
  const card = e.target?.closest?.("[data-video-id]");
  if (card) openVideoById(card.getAttribute("data-video-id") || "");
});

videoContinueRail?.addEventListener("click", (e) => {
  const card = e.target?.closest?.("[data-video-id]");
  if (card) openVideoById(card.getAttribute("data-video-id") || "");
});

videoFavouritesWall?.addEventListener("click", (e) => {
  const card = e.target?.closest?.("[data-video-id]");
  if (card) openVideoById(card.getAttribute("data-video-id") || "");
});

videoBookmarksList?.addEventListener("click", (e) => {
  const row = e.target?.closest?.("[data-video-id][data-video-time]");
  if (!row) return;

  openVideoById(row.getAttribute("data-video-id") || "");
  const targetTime = Number(row.getAttribute("data-video-time") || 0);

  brVideoElement?.addEventListener("loadedmetadata", () => {
    try { brVideoElement.currentTime = targetTime; } catch {}
  }, { once: true });
});

btnVideoBackToWall?.addEventListener("click", closeVideoDetail);
btnVideoResume?.addEventListener("click", () => void playSelectedVideo(false));
btnVideoRestart?.addEventListener("click", () => void playSelectedVideo(true));

btnVideoFullscreen?.addEventListener("click", () => {
  if (brVideoElement?.requestFullscreen) void brVideoElement.requestFullscreen();
  else if (brVideoElement?.webkitEnterFullscreen) brVideoElement.webkitEnterFullscreen();
});

btnVideoToggleFavourite?.addEventListener("click", toggleVideoFavourite);
btnVideoAddBookmark?.addEventListener("click", addVideoBookmark);

videoRatingStars?.addEventListener("click", (e) => {
  const btn = e.target?.closest?.("[data-video-rating]");
  if (!btn || !videoState.selected?.id) return;

  saveVideoRating(videoState.selected.id, btn.getAttribute("data-video-rating") || 0);
  updateVideoRatingUI();
  renderVideoCollections();
  renderVideoWall();
});

btnVideoTimerApply?.addEventListener("click", applyVideoTimer);
btnVideoCast?.addEventListener("click", () => void openVideoCastPicker());
btnVideoPiP?.addEventListener("click", () => void toggleVideoPictureInPicture());

videoAudioSelect?.addEventListener("change", applyVideoAudioChoice);
videoSubtitleSelect?.addEventListener("change", applyVideoSubtitleChoice);

brVideoElement?.addEventListener("timeupdate", () => {
  if (videoState.selected) {
    saveVideoResume(videoState.selected.id, brVideoElement.currentTime, brVideoElement.duration);
  }
});

brVideoElement?.addEventListener("error", () => {
  const err = brVideoElement?.error;
  const message = err?.message || "This video format/codec could not play in the browser. VOB/MPEG may need conversion or fallback.";
  setVideoStatus(message, "error");
});

brVideoElement?.addEventListener("ended", () => {
  if (videoState.selected) saveVideoResume(videoState.selected.id, 0, brVideoElement.duration);

  if (videoState.timerMode === "end") {
    brVideoElement.pause();
    clearVideoTimer();
    setVideoStatus("Video timer finished at the end of the film.", "success");
  }

  renderVideoWall();
});

`);

source = source.replace(
  /\n\s*document\.querySelectorAll\("\[data-tagger-step\]"\)[\s\S]*?syncTaggerSaveModeUI\(\);\n/,
  "\n"
);

fs.writeFileSync(appPath, source, "utf8");
updateVideoIndexCacheBust();

console.log("Cleaned server/public/video-player/app.js into a Video-only split file.");
console.log(`Backup kept at ${path.relative(root, backupPath)}`);
console.log("Updated video-player app.js cache-bust to v=20260509-split-c2.");