const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const serverRoot = fs.existsSync(path.join(projectRoot, "server", "public"))
  ? path.join(projectRoot, "server")
  : projectRoot;

const publicDir = path.join(serverRoot, "public");
const videoDir = path.join(publicDir, "video-player");
const backupDir = path.join(projectRoot, "tools", "backups", "video-layout-before-j1");

const indexPath = path.join(videoDir, "index.html");
const stylesPath = path.join(videoDir, "styles.css");
const appPath = path.join(videoDir, "app.js");

if (!fs.existsSync(videoDir)) {
  throw new Error("Missing server/public/video-player. Run this on the current split project folder.");
}

if (!fs.existsSync(appPath)) {
  throw new Error("Missing server/public/video-player/app.js.");
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

backupFile(indexPath);
backupFile(stylesPath);
backupFile(appPath);

const indexHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>BRMedia Video Player</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#182E5B" />
  <link rel="apple-touch-icon" sizes="180x180" href="/shared/branding/logos/apple-touch-icon.png?v=20260510-j1" />
  <link rel="icon" type="image/png" sizes="192x192" href="/shared/branding/logos/icon-192.png?v=20260510-j1" />
  <link rel="icon" type="image/png" sizes="512x512" href="/shared/branding/logos/icon-512.png?v=20260510-j1" />
  <link id="moduleManifest" rel="manifest" href="/video-player/site.webmanifest?v=20260510-j1" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Video" />
  <link rel="stylesheet" href="/video-player/styles.css?v=20260510-j1" />
</head>
<body class="videoPlayerBody moduleVideoMode moduleToolLive">
  <div class="videoAppShell">
    <header class="videoTopbar">
      <div class="videoTopbarInner">
        <a class="moduleSearchBtn videoTopbarBtn" href="/player" aria-label="Open BRMedia Player">
          <i class="fa-solid fa-headphones"></i>
        </a>

        <a class="videoBrandLink" href="/" aria-label="Open BRMedia Home">
          <img src="/shared/branding/logos/blackburn-ravers-header.png?v=20260510-j1" alt="Blackburn Ravers" class="videoBrandLogo" />
        </a>

        <button id="btnModuleMenu" class="moduleMenuBtn videoTopbarBtn" type="button" aria-label="Open video navigation">
          <i class="fa-solid fa-bars"></i>
        </button>
      </div>
    </header>

    <div id="moduleSidebarBackdrop" class="moduleSidebarBackdrop hidden"></div>

    <aside id="moduleSidebar" class="moduleSidebar videoSidebar hidden">
      <div class="moduleSidebarHeader videoSidebarHeader">
        <a href="/" aria-label="Open BRMedia Home">
          <img src="/shared/branding/logos/blackburn-ravers-header.png?v=20260510-j1" alt="Blackburn Ravers" class="moduleSidebarLogo" />
        </a>
        <button id="btnModuleSidebarClose" class="videoSidebarClose" type="button" aria-label="Close video navigation">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div id="videoSidebarNav" class="videoSidebarNav hidden" aria-label="Video genres">
        <div class="videoSidebarSectionTitle">Video Library</div>

        <button id="btnVideoSidebarHome" class="videoSidebarHome is-active" type="button" data-video-sidebar-home="1">
          <span class="videoSidebarGenreIcon"><i class="fa-solid fa-house"></i></span>
          <span>
            <strong>All videos</strong>
            <small>Poster wall home</small>
          </span>
        </button>

        <div class="videoSidebarSectionTitle">Genres</div>
        <div id="videoSidebarGenreList" class="videoSidebarGenreList">
          <div class="videoSidebarEmpty">Scan C:\\Videos to build your genre list.</div>
        </div>
      </div>

      <div class="videoSidebarSectionTitle videoSidebarModulesTitle">BRMedia Centre</div>
      <div class="moduleSidebarLinks videoCompactModuleLinks">
        <a class="moduleSidebarLink" href="/player" data-path="/player">
          <span class="moduleSidebarIconBadge"><i class="fa-solid fa-play"></i></span>
          <span class="moduleSidebarText"><span class="moduleSidebarTitle">Player</span><span class="moduleSidebarSub">Music player</span></span>
        </a>
        <a class="moduleSidebarLink is-active" href="/video-player" data-path="/video-player">
          <span class="moduleSidebarIconBadge"><i class="fa-solid fa-film"></i></span>
          <span class="moduleSidebarText"><span class="moduleSidebarTitle">Video</span><span class="moduleSidebarSub">Watch page</span></span>
        </a>
        <a class="moduleSidebarLink" href="/converter" data-path="/converter">
          <span class="moduleSidebarIconBadge"><i class="fa-solid fa-right-left"></i></span>
          <span class="moduleSidebarText"><span class="moduleSidebarTitle">Converter</span><span class="moduleSidebarSub">Convert files</span></span>
        </a>
        <a class="moduleSidebarLink" href="/tagger" data-path="/tagger">
          <span class="moduleSidebarIconBadge"><i class="fa-solid fa-tag"></i></span>
          <span class="moduleSidebarText"><span class="moduleSidebarTitle">Tagger</span><span class="moduleSidebarSub">Metadata</span></span>
        </a>
        <a class="moduleSidebarLink" href="/mastering" data-path="/mastering">
          <span class="moduleSidebarIconBadge"><i class="fa-solid fa-sliders"></i></span>
          <span class="moduleSidebarText"><span class="moduleSidebarTitle">Mastering</span><span class="moduleSidebarSub">Audio polish</span></span>
        </a>
        <a class="moduleSidebarLink" href="/settings?tab=video" data-path="/settings">
          <span class="moduleSidebarIconBadge"><i class="fa-solid fa-gear"></i></span>
          <span class="moduleSidebarText"><span class="moduleSidebarTitle">Video Settings</span><span class="moduleSidebarSub">Preferences</span></span>
        </a>
        <a class="moduleSidebarLink" href="/server-settings" data-path="/server-settings">
          <span class="moduleSidebarIconBadge"><i class="fa-solid fa-server"></i></span>
          <span class="moduleSidebarText"><span class="moduleSidebarTitle">Server</span><span class="moduleSidebarSub">Sources</span></span>
        </a>
      </div>
    </aside>

    <button id="btnModuleSidebarCloseFloating" class="moduleSidebarFloatingClose hidden" type="button" aria-label="Close video navigation">
      <i class="fa-solid fa-xmark"></i>
    </button>

    <main class="videoMain">
      <section class="moduleHeroCard videoHeroCard">
        <div class="moduleEyebrow" id="moduleEyebrow">BRMedia Video Player</div>
        <h1 class="moduleTitle" id="moduleTitle">Video Player</h1>
        <div class="moduleSubtitle" id="moduleSubtitle">Poster-wall streaming from C:\\Videos with resume, ratings, subtitles and BRMedia watch controls.</div>

        <div class="moduleComingSoonCard videoIntroCard">
          <div class="moduleComingSoonIcon" id="moduleStatusIcon">
            <i class="fa-solid fa-film"></i>
          </div>

          <div class="moduleComingSoonText">
            <div class="moduleComingSoonTitle" id="moduleStatusTitle">Open video</div>
            <div class="moduleComingSoonBody" id="moduleComingSoonBody">
              A BRMedia-style watch experience for your local video library.
            </div>
          </div>
        </div>

        <div class="moduleSettingsHandoff videoSettingsHandoff">
          <a class="moduleSettingsHandoffBtn" href="/settings?tab=video"><span>VID</span><div><strong>Video Settings</strong><small>Video source, resume and subtitle defaults.</small></div></a>
          <a class="moduleSettingsHandoffBtn" href="/server-settings"><span>SRV</span><div><strong>Server Settings</strong><small>Sources, storage and deeper admin.</small></div></a>
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

        <div id="videoPanel" class="videoPanel hidden">
          <section class="videoHero">
            <div class="videoHeroCopy">
              <div class="moduleTrackKicker">BRMedia Theatre</div>
              <div class="videoPanelTitle">Video Player</div>
              <div class="videoPanelSub">A clean Player-style video home for <strong>C:\\Videos</strong>. Scan, browse, open a poster, then watch on its own dedicated page.</div>
            </div>

            <div class="videoHeroBadge">
              <i class="fa-solid fa-film"></i>
              <span>Streaming only</span>
            </div>
          </section>

          <section class="videoControlDeck">
            <div class="videoToolbar">
              <button id="btnVideoRefresh" class="moduleActionBtn primary" type="button">
                <i class="fa-solid fa-arrows-rotate"></i>
                <span>Scan C:\\Videos</span>
              </button>

              <button id="btnVideoMatchMissing" class="moduleActionBtn subtle" type="button">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                <span>Match info</span>
              </button>

              <div class="videoSearchBox">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input id="videoSearchInput" type="search" placeholder="Search films, series, ratings or folders…" autocomplete="off" />
              </div>

              <select id="videoSortSelect" class="videoSortSelect" aria-label="Sort videos">
                <option value="title">Sort: Title</option>
                <option value="recent">Sort: Recently added</option>
                <option value="rating">Sort: Rating</option>
                <option value="resume">Sort: Continue watching</option>
              </select>
            </div>

            <div id="videoStatus" class="videoStatus">Ready to scan your video folder.</div>

            <div class="videoModeTabs" role="tablist" aria-label="Video Player sections">
              <button class="videoModeTab is-active" type="button" data-video-tab="browse"><i class="fa-solid fa-house"></i><span>Home</span></button>
              <button class="videoModeTab" type="button" data-video-tab="watch"><i class="fa-solid fa-circle-play"></i><span>Watch</span></button>
              <button class="videoModeTab" type="button" data-video-tab="favourites"><i class="fa-solid fa-heart"></i><span>Favourites</span></button>
              <button class="videoModeTab" type="button" data-video-tab="bookmarks"><i class="fa-solid fa-bookmark"></i><span>Bookmarks</span></button>
            </div>
          </section>

          <div class="videoStatsStrip" data-video-tab-panel="browse" aria-label="Video library stats">
            <div><strong id="videoStatTotal">0</strong><span>Videos</span></div>
            <div><strong id="videoStatRated">0</strong><span>Matched</span></div>
            <div><strong id="videoStatContinue">0</strong><span>Continue</span></div>
            <div><strong id="videoStatSubtitle">0</strong><span>Subtitles</span></div>
          </div>

          <div class="videoQuickFilters" data-video-tab-panel="browse" aria-label="Video quick filters">
            <button class="videoFilterChip is-active" type="button" data-video-filter="all"><i class="fa-solid fa-list-ul"></i><span>All</span></button>
            <button class="videoFilterChip" type="button" data-video-filter="continue"><i class="fa-solid fa-circle-play"></i><span>Continue</span></button>
            <button class="videoFilterChip" type="button" data-video-filter="matched"><i class="fa-solid fa-star"></i><span>Rated</span></button>
            <button class="videoFilterChip" type="button" data-video-filter="subtitles"><i class="fa-solid fa-closed-captioning"></i><span>Subtitles</span></button>
            <button class="videoFilterChip" type="button" data-video-filter="needs-info"><i class="fa-solid fa-wand-magic-sparkles"></i><span>Needs info</span></button>
          </div>

          <section id="videoSpotlightSection" class="videoSpotlightSection hidden" data-video-tab-panel="browse">
            <div id="videoSpotlightBackdrop" class="videoSpotlightBackdrop"></div>
            <div class="videoSpotlightCopy">
              <div id="videoSpotlightKicker" class="videoDetailKicker">Tonight's pick</div>
              <h2 id="videoSpotlightTitle">Choose a film</h2>
              <p id="videoSpotlightMeta">Your best matched film or latest continue-watching item will appear here.</p>
              <div id="videoSpotlightBadges" class="videoDetailBadges"></div>
              <button id="btnVideoOpenSpotlight" class="moduleActionBtn primary" type="button">
                <i class="fa-solid fa-circle-play"></i>
                <span>Open video</span>
              </button>
            </div>
          </section>

          <section id="videoContinueSection" class="videoRailSection hidden" data-video-tab-panel="browse">
            <div class="videoSectionHead">
              <strong>Continue watching</strong>
              <span>Resume where you left off.</span>
            </div>
            <div id="videoContinueRail" class="videoContinueRail"></div>
          </section>

          <section class="videoWallSection" data-video-tab-panel="browse">
            <div class="videoSectionHead">
              <strong>Poster wall</strong>
              <span id="videoCountText">No videos loaded yet.</span>
            </div>
            <div id="videoPosterWall" class="videoPosterWall"></div>
          </section>

          <section id="videoFavouritesSection" class="videoWallSection" data-video-tab-panel="favourites">
            <div class="videoSectionHead">
              <strong>Video favourites</strong>
              <span id="videoFavouritesCountText">No favourite videos yet.</span>
            </div>
            <div id="videoFavouritesWall" class="videoPosterWall"></div>
          </section>

          <section id="videoBookmarksSection" class="videoWallSection" data-video-tab-panel="bookmarks">
            <div class="videoSectionHead">
              <strong>Video bookmarks</strong>
              <span id="videoBookmarksCountText">Save scenes and resume points from the watch page.</span>
            </div>
            <div id="videoBookmarksList" class="videoBookmarkList"></div>
          </section>

          <div id="videoDetailView" class="videoDetailView hidden" data-video-tab-panel="watch">
            <div id="videoDetailBackdrop" class="videoDetailBackdrop"></div>

            <div class="videoWatchTop">
              <button id="btnVideoBackToWall" class="videoBackBtn" type="button">
                <i class="fa-solid fa-arrow-rotate-left"></i>
                <span>Back to poster wall</span>
              </button>
              <div class="videoWatchPill">Watch page</div>
            </div>

            <div class="videoWatchLayout">
              <section class="videoPlayerShell">
                <video id="brVideoElement" class="brVideoElement" playsinline preload="metadata"></video>

                <div class="videoCustomControls" aria-label="BRMedia video controls">
                  <div class="videoProgressWrap">
                    <input id="videoCustomProgress" class="videoCustomProgress" type="range" min="0" max="1000" value="0" step="1" aria-label="Video progress" />
                  </div>

                  <div class="videoCustomControlsRow">
                    <button id="btnVideoCustomBack" class="videoCustomBtn" type="button" aria-label="Rewind 10 seconds"><i class="fa-solid fa-backward-step"></i></button>
                    <button id="btnVideoCustomPlay" class="videoCustomPlayBtn" type="button" aria-label="Play or pause"><i class="fa-solid fa-play"></i></button>
                    <button id="btnVideoCustomForward" class="videoCustomBtn" type="button" aria-label="Forward 10 seconds"><i class="fa-solid fa-forward-step"></i></button>

                    <span id="videoCustomTime" class="videoCustomTime">0:00 / 0:00</span>

                    <button id="btnVideoCustomMute" class="videoCustomBtn" type="button" aria-label="Mute video"><i class="fa-solid fa-volume-high"></i></button>
                    <input id="videoCustomVolume" class="videoCustomVolume" type="range" min="0" max="1" value="1" step="0.01" aria-label="Volume" />

                    <button id="btnVideoFullscreen" class="videoCustomBtn" type="button" aria-label="Fullscreen"><i class="fa-solid fa-expand"></i></button>
                  </div>
                </div>

                <div class="videoPlaybackTools">
                  <button id="btnVideoResume" class="moduleActionBtn primary" type="button"><i class="fa-solid fa-play"></i><span>Resume</span></button>
                  <button id="btnVideoRestart" class="moduleActionBtn subtle" type="button"><i class="fa-solid fa-backward-fast"></i><span>Start over</span></button>
                  <button id="btnVideoPiP" class="moduleActionBtn subtle" type="button"><i class="fa-solid fa-tv"></i><span>Picture in picture</span></button>
                </div>
              </section>

              <aside class="videoDetailInfo">
                <div id="videoDetailPoster" class="videoDetailPoster"></div>
                <div id="videoDetailKicker" class="videoDetailKicker">BRMedia Video</div>
                <h2 id="videoDetailTitle">Select a video</h2>
                <div id="videoDetailMeta" class="videoDetailMeta"></div>
                <div id="videoDetailProgress" class="videoDetailProgress hidden"><span></span></div>
                <p id="videoDetailOverview">Film information and online ratings will appear here when metadata is matched.</p>
                <div id="videoDetailBadges" class="videoDetailBadges"></div>
                <div id="videoDetailCredits" class="videoDetailCredits"></div>

                <div class="videoDetailActions">
                  <button id="btnVideoToggleFavourite" class="moduleActionBtn subtle" type="button">
                    <i class="fa-solid fa-heart"></i>
                    <span>Favourite</span>
                  </button>
                  <button id="btnVideoAddBookmark" class="moduleActionBtn subtle" type="button">
                    <i class="fa-solid fa-bookmark"></i>
                    <span>Bookmark time</span>
                  </button>
                  <button id="btnVideoMatchSelected" class="moduleActionBtn subtle" type="button">
                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                    <span>Refresh info</span>
                  </button>
                </div>

                <div class="videoRatingControl" aria-label="Your video rating">
                  <span>Your rating</span>
                  <div id="videoRatingStars" class="videoRatingStars">
                    <button type="button" data-video-rating="1">?</button>
                    <button type="button" data-video-rating="2">?</button>
                    <button type="button" data-video-rating="3">?</button>
                    <button type="button" data-video-rating="4">?</button>
                    <button type="button" data-video-rating="5">?</button>
                  </div>
                </div>
              </aside>
            </div>

            <div class="videoOptionsGrid">
              <div class="videoOptionCard">
                <label for="videoAudioSelect"><i class="fa-solid fa-language"></i><span>Audio / English dub</span></label>
                <select id="videoAudioSelect"><option value="default">Browser default / English dub if available</option></select>
                <small>Prefers English/dub-labelled tracks when the browser exposes them.</small>
              </div>

              <div class="videoOptionCard">
                <label for="videoSubtitleSelect"><i class="fa-solid fa-closed-captioning"></i><span>Subtitles</span></label>
                <select id="videoSubtitleSelect"><option value="off">Off</option></select>
                <small>External .vtt and .srt subtitles are supported.</small>
              </div>

              <div class="videoOptionCard videoTimerCard">
                <label for="videoTimerSelect"><i class="fa-solid fa-timer"></i><span>Sleep timer</span></label>
                <select id="videoTimerSelect">
                  <option value="0">Off</option>
                  <option value="900">15 minutes</option>
                  <option value="1800">30 minutes</option>
                  <option value="3600">1 hour</option>
                  <option value="end">End of current video</option>
                </select>
                <button id="btnVideoTimerApply" class="moduleActionBtn subtle" type="button"><i class="fa-solid fa-clock"></i><span>Set timer</span></button>
                <small id="videoTimerStatus">No video timer set.</small>
              </div>

              <div class="videoOptionCard videoCastCard">
                <label><i class="fa-solid fa-tv"></i><span>Cast / output</span></label>
                <div class="videoCastActions">
                  <button id="btnVideoCast" class="moduleActionBtn subtle" type="button"><i class="fa-solid fa-share-nodes"></i><span>Cast / AirPlay</span></button>
                </div>
                <small id="videoCastStatus">Uses browser support where available. Unsupported devices can use Send to Device later.</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div id="moduleLibraryPicker" class="moduleLibraryPicker hidden" aria-modal="true" role="dialog">
        <div class="moduleLibraryPickerCard">
          <div class="moduleLibraryPickerHead">
            <div>
              <div id="moduleLibraryPickerTitle" class="moduleLibraryPickerTitle">Choose media</div>
              <div id="moduleLibraryPickerSub" class="moduleLibraryPickerSub">Pick a BRMedia library file.</div>
            </div>
            <button id="btnModuleLibraryPickerClose" class="moduleActionBtn subtle" type="button">
              <i class="fa-solid fa-xmark"></i>
              <span>Close</span>
            </button>
          </div>
          <input id="moduleLibraryPickerSearch" class="moduleLibraryPickerSearch" type="search" placeholder="Search library…" autocomplete="off" />
          <div id="moduleLibraryPickerList" class="moduleLibraryPickerList"></div>
        </div>
      </div>

      <div id="moduleMiniPlayer" class="moduleMiniPlayer hidden">
        <audio id="moduleMiniAudio" preload="metadata"></audio>
        <a id="moduleMiniArtLink" href="/player" class="moduleMiniArtLink"><img id="moduleMiniArt" alt="" /></a>
        <div class="moduleMiniText">
          <div id="moduleMiniTitle">BRMedia</div>
          <div id="moduleMiniSub">Mini player</div>
          <div class="moduleMiniProgress"><span id="moduleMiniProgressFill"></span></div>
        </div>
        <button id="btnModuleMiniPrev" type="button"><i class="fa-solid fa-backward-step"></i></button>
        <button id="btnModuleMiniPlay" type="button"><i class="fa-solid fa-play"></i></button>
        <button id="btnModuleMiniNext" type="button"><i class="fa-solid fa-forward-step"></i></button>
      </div>

      <footer class="moduleFooter">
        <span id="moduleFooterCopy">© The Blackburn Ravers • DJ NJ & Upalnite</span>
      </footer>
    </main>
  </div>

  <script src="/video-player/app.js?v=20260510-j1"></script>
</body>
</html>
`;

const stylesCss = `@import url("/shared/module-shell.css?v=20260510-j1");

/* BRMedia Video Player J1 — player-style layout foundation */
:root {
  --video-bg: #061124;
  --video-panel: rgba(11, 24, 50, 0.78);
  --video-panel-strong: rgba(8, 19, 42, 0.92);
  --video-line: rgba(255,255,255,0.14);
  --video-orange: #F2A007;
  --video-blue: #1fa9ff;
  --video-text: #f7fbff;
  --video-muted: rgba(247,251,255,0.68);
}

.hidden,
.is-tab-hidden {
  display: none !important;
}

html {
  background: var(--video-bg);
}

body.videoPlayerBody {
  min-height: 100vh;
  margin: 0;
  color: var(--video-text);
  background:
    radial-gradient(circle at 15% 0%, rgba(242,160,7,0.18), transparent 30rem),
    radial-gradient(circle at 86% 10%, rgba(31,169,255,0.18), transparent 32rem),
    linear-gradient(180deg, #102551 0%, #061124 100%);
  font-family: Arial, Helvetica, sans-serif;
}

.videoAppShell {
  min-height: 100vh;
  padding-bottom: env(safe-area-inset-bottom);
}

.videoTopbar {
  position: sticky;
  top: 0;
  z-index: 28;
  padding: max(12px, env(safe-area-inset-top)) 14px 10px;
  background: rgba(8, 19, 42, 0.88);
  border-bottom: 1px solid var(--video-line);
  backdrop-filter: blur(18px);
}

.videoTopbarInner {
  display: grid;
  grid-template-columns: 46px 1fr 46px;
  align-items: center;
  gap: 10px;
  width: min(1180px, 100%);
  margin: 0 auto;
}

.videoBrandLink {
  justify-self: center;
  display: grid;
  place-items: center;
  text-decoration: none;
}

.videoBrandLogo {
  width: min(320px, 70vw);
  max-height: 52px;
  object-fit: contain;
}

.videoTopbarBtn {
  width: 46px;
  height: 46px;
  border-radius: 17px;
  border: 1px solid var(--video-line);
  color: var(--video-text);
  background: rgba(255,255,255,0.08);
  display: grid;
  place-items: center;
  text-decoration: none;
}

.videoMain {
  width: min(1180px, calc(100% - 24px));
  margin: 18px auto 44px;
}

.videoHeroCard {
  border-radius: 32px;
  padding: clamp(16px, 3vw, 26px);
  border: 1px solid var(--video-line);
  background:
    radial-gradient(circle at 8% 0%, rgba(242,160,7,0.14), transparent 34rem),
    rgba(11,24,50,0.78);
  box-shadow: 0 24px 70px rgba(0,0,0,0.34);
}

.videoHeroCard > .moduleTitle {
  margin: 8px 0 7px;
  font-size: clamp(36px, 8vw, 78px);
  line-height: 0.88;
  letter-spacing: -0.07em;
}

.videoHeroCard > .moduleSubtitle {
  max-width: 760px;
  color: var(--video-muted);
  line-height: 1.45;
}

.videoIntroCard {
  margin: 18px 0;
}

.videoPanel {
  display: grid;
  gap: 16px;
}

.videoHero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px;
  gap: 14px;
  align-items: stretch;
  border: 1px solid var(--video-line);
  border-radius: 28px;
  padding: clamp(16px, 3vw, 24px);
  background:
    radial-gradient(circle at 0% 0%, rgba(31,169,255,0.15), transparent 34rem),
    rgba(255,255,255,0.055);
}

.videoPanelTitle {
  margin: 5px 0;
  font-size: clamp(30px, 7vw, 62px);
  line-height: 0.9;
  font-weight: 1000;
  letter-spacing: -0.06em;
}

.videoPanelSub {
  max-width: 680px;
  color: var(--video-muted);
  line-height: 1.45;
}

.videoHeroBadge {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 9px;
  min-height: 130px;
  border-radius: 28px;
  border: 1px solid rgba(242,160,7,0.3);
  color: var(--video-orange);
  background:
    radial-gradient(circle at 50% 10%, rgba(255,255,255,0.18), transparent 32%),
    rgba(242,160,7,0.1);
  text-align: center;
  font-weight: 1000;
}

.videoHeroBadge i,
.videoHeroBadge .brSvgIconHost {
  width: 58px !important;
  height: 58px !important;
  font-size: 54px !important;
}

.videoControlDeck,
.videoStatsStrip,
.videoQuickFilters,
.videoSpotlightSection,
.videoRailSection,
.videoWallSection,
.videoDetailView,
.videoOptionsGrid {
  border: 1px solid var(--video-line);
  border-radius: 28px;
  background: rgba(255,255,255,0.055);
}

.videoControlDeck {
  padding: 13px;
}

.videoToolbar {
  display: grid;
  grid-template-columns: auto auto minmax(220px, 1fr) minmax(150px, 190px);
  gap: 10px;
  align-items: center;
}

.videoSearchBox {
  display: grid;
  grid-template-columns: 42px 1fr;
  align-items: center;
  min-height: 52px;
  border-radius: 18px;
  border: 1px solid var(--video-line);
  background: rgba(0,0,0,0.18);
  overflow: hidden;
}

.videoSearchBox i,
.videoSearchBox .brSvgIconHost {
  justify-self: center;
  color: var(--video-orange);
}

.videoSearchBox input,
.videoSortSelect,
.videoOptionCard select {
  width: 100%;
  min-height: 50px;
  border: 0;
  outline: 0;
  color: var(--video-text);
  background: transparent;
  font: inherit;
}

.videoSortSelect,
.videoOptionCard select {
  border: 1px solid var(--video-line);
  border-radius: 18px;
  padding: 0 12px;
  background: rgba(0,0,0,0.18);
}

.videoStatus {
  margin-top: 10px;
  border: 1px solid var(--video-line);
  border-radius: 18px;
  padding: 11px 13px;
  color: var(--video-muted);
  background: rgba(0,0,0,0.12);
}

.videoStatus.success {
  color: #2dff88;
  border-color: rgba(45,255,136,0.28);
  background: rgba(45,255,136,0.07);
}

.videoStatus.error {
  color: #ff8b8b;
  border-color: rgba(255,88,88,0.32);
  background: rgba(255,88,88,0.07);
}

.videoModeTabs,
.videoQuickFilters,
.videoStatsStrip {
  display: grid;
  gap: 10px;
}

.videoModeTabs {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 12px;
}

.videoModeTab,
.videoFilterChip {
  min-height: 58px;
  border: 1px solid var(--video-line);
  border-radius: 20px;
  color: var(--video-text);
  background: rgba(255,255,255,0.065);
  font: inherit;
  font-weight: 900;
  display: inline-grid;
  grid-template-columns: auto auto;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.videoModeTab.is-active,
.videoFilterChip.is-active {
  border-color: rgba(242,160,7,0.62);
  background: rgba(242,160,7,0.14);
  color: var(--video-orange);
}

.videoStatsStrip {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 13px;
}

.videoStatsStrip div {
  min-height: 82px;
  border-radius: 22px;
  padding: 12px;
  background: rgba(0,0,0,0.13);
  display: grid;
  align-content: center;
  gap: 4px;
}

.videoStatsStrip strong {
  font-size: 30px;
  line-height: 1;
  color: var(--video-orange);
}

.videoStatsStrip span {
  color: var(--video-muted);
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.videoQuickFilters {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  padding: 12px;
}

.videoSpotlightSection {
  position: relative;
  min-height: 300px;
  overflow: hidden;
  padding: clamp(18px, 4vw, 34px);
}

.videoSpotlightBackdrop,
.videoDetailBackdrop {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  opacity: 0.28;
  filter: saturate(1.08);
}

.videoSpotlightSection::after,
.videoDetailView::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(6,17,36,0.94), rgba(6,17,36,0.54), rgba(6,17,36,0.92)),
    linear-gradient(180deg, transparent, rgba(6,17,36,0.84));
  pointer-events: none;
}

.videoSpotlightCopy {
  position: relative;
  z-index: 1;
  max-width: 660px;
  display: grid;
  gap: 12px;
}

.videoSpotlightCopy h2 {
  margin: 0;
  font-size: clamp(32px, 7vw, 70px);
  line-height: 0.88;
  letter-spacing: -0.06em;
}

.videoSpotlightCopy p {
  color: var(--video-muted);
  line-height: 1.45;
}

.videoSectionHead {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: end;
  padding: 16px 16px 0;
}

.videoSectionHead strong {
  font-size: clamp(22px, 4vw, 34px);
  letter-spacing: -0.04em;
}

.videoSectionHead span {
  color: var(--video-muted);
}

.videoPosterWall,
.videoContinueRail {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(154px, 1fr));
  gap: 14px;
  padding: 16px;
}

.videoContinueRail {
  grid-auto-flow: column;
  grid-auto-columns: minmax(150px, 180px);
  grid-template-columns: none;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.videoPosterCard {
  border: 0;
  padding: 0;
  color: var(--video-text);
  background: transparent;
  text-align: left;
  font: inherit;
  cursor: pointer;
}

.videoPosterFrame {
  position: relative;
  aspect-ratio: 2 / 3;
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.14);
  background:
    radial-gradient(circle at 30% 12%, rgba(242,160,7,0.18), transparent 42%),
    rgba(255,255,255,0.07);
  box-shadow: 0 18px 38px rgba(0,0,0,0.26);
}

.videoPosterFrame img,
.videoPosterImg,
.videoDetailPosterImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.videoPosterFallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--video-orange);
}

.videoRatingBadge,
.videoSourceBadge,
.videoFavouriteBadge,
.videoUserRatingBadge {
  position: absolute;
  z-index: 2;
  border-radius: 999px;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 1000;
  background: rgba(8,19,42,0.82);
  backdrop-filter: blur(10px);
}

.videoRatingBadge {
  top: 8px;
  left: 8px;
  color: var(--video-orange);
}

.videoSourceBadge {
  top: 8px;
  right: 8px;
}

.videoFavouriteBadge {
  right: 8px;
  bottom: 8px;
  color: #ff668a;
}

.videoUserRatingBadge {
  left: 8px;
  bottom: 8px;
}

.videoResumeBar {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  height: 5px;
  border-radius: 999px;
  background: rgba(255,255,255,0.20);
  overflow: hidden;
}

.videoResumeBar span {
  display: block;
  height: 100%;
  background: var(--video-orange);
}

.videoCardTitle,
.videoCardMeta {
  display: block;
  margin-top: 8px;
}

.videoCardTitle {
  font-weight: 1000;
  line-height: 1.15;
}

.videoCardMeta {
  color: var(--video-muted);
  font-size: 12px;
  line-height: 1.25;
}

.videoEmptyState {
  grid-column: 1 / -1;
  min-height: 220px;
  border: 1px dashed rgba(255,255,255,0.18);
  border-radius: 24px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  color: var(--video-muted);
  text-align: center;
}

.videoDetailView {
  position: relative;
  overflow: hidden;
  padding: 16px;
}

.videoDetailView > *:not(.videoDetailBackdrop) {
  position: relative;
  z-index: 1;
}

.videoWatchTop {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.videoBackBtn,
.videoWatchPill {
  min-height: 44px;
  border: 1px solid var(--video-line);
  border-radius: 999px;
  color: var(--video-text);
  background: rgba(255,255,255,0.08);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 13px;
  font: inherit;
  font-weight: 900;
}

.videoWatchPill {
  color: var(--video-orange);
}

.videoWatchLayout {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.82fr);
  gap: 16px;
  align-items: start;
}

.videoPlayerShell {
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 30px;
  padding: 12px;
  background: rgba(0,0,0,0.24);
  box-shadow: 0 24px 70px rgba(0,0,0,0.34);
}

.brVideoElement {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 22px;
  background: #000;
  display: block;
  object-fit: contain;
}

.videoCustomControls {
  margin-top: 10px;
  border: 1px solid var(--video-line);
  border-radius: 24px;
  padding: 10px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.035));
}

.videoProgressWrap {
  display: grid;
  margin-bottom: 8px;
}

.videoCustomProgress,
.videoCustomVolume {
  width: 100%;
  accent-color: var(--video-orange);
}

.videoCustomControlsRow {
  display: grid;
  grid-template-columns: 46px 58px 46px minmax(110px, 1fr) 46px minmax(88px, 130px) 46px;
  gap: 8px;
  align-items: center;
}

.videoCustomBtn,
.videoCustomPlayBtn {
  width: 46px;
  height: 46px;
  border: 1px solid var(--video-line);
  border-radius: 17px;
  color: var(--video-text);
  background: rgba(255,255,255,0.08);
  display: grid;
  place-items: center;
}

.videoCustomPlayBtn {
  width: 58px;
  height: 58px;
  border-radius: 22px;
  color: #061124;
  background: linear-gradient(180deg, #ffbd45, var(--video-orange));
  box-shadow: 0 14px 28px rgba(242,160,7,0.25);
}

.videoCustomTime {
  color: var(--video-muted);
  font-size: 13px;
  font-weight: 900;
}

.videoPlaybackTools {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
  margin-top: 10px;
}

.videoDetailInfo {
  border: 1px solid var(--video-line);
  border-radius: 30px;
  padding: 14px;
  background: rgba(8,19,42,0.82);
}

.videoDetailPoster {
  width: 122px;
  aspect-ratio: 2 / 3;
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 12px;
  border: 1px solid var(--video-line);
  background: rgba(255,255,255,0.07);
}

.videoDetailKicker {
  color: var(--video-orange);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 11px;
  font-weight: 1000;
}

.videoDetailInfo h2 {
  margin: 6px 0;
  font-size: clamp(28px, 5vw, 46px);
  line-height: 0.9;
  letter-spacing: -0.05em;
}

.videoDetailMeta,
.videoDetailOverview {
  color: var(--video-muted);
  line-height: 1.4;
}

.videoDetailProgress {
  height: 7px;
  border-radius: 999px;
  margin: 12px 0;
  background: rgba(255,255,255,0.18);
  overflow: hidden;
}

.videoDetailProgress span {
  display: block;
  height: 100%;
  background: var(--video-orange);
}

.videoDetailBadges {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin: 12px 0;
}

.videoDetailBadges span {
  border: 1px solid var(--video-line);
  border-radius: 999px;
  padding: 7px 9px;
  background: rgba(255,255,255,0.07);
  color: var(--video-muted);
  font-size: 12px;
  font-weight: 900;
}

.videoDetailCredits {
  display: grid;
  gap: 8px;
  margin: 12px 0;
}

.videoDetailCredits div {
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 16px;
  padding: 9px;
  background: rgba(255,255,255,0.055);
}

.videoDetailCredits strong,
.videoDetailCredits span {
  display: block;
}

.videoDetailCredits span {
  color: var(--video-muted);
  margin-top: 3px;
}

.videoDetailActions,
.videoCastActions {
  display: grid;
  gap: 8px;
}

.videoRatingControl {
  display: grid;
  gap: 6px;
  margin-top: 12px;
}

.videoRatingStars {
  display: flex;
  gap: 5px;
}

.videoRatingStars button {
  width: 38px;
  height: 38px;
  border: 1px solid var(--video-line);
  border-radius: 14px;
  color: var(--video-muted);
  background: rgba(255,255,255,0.07);
  font-size: 18px;
}

.videoRatingStars button.is-active {
  color: var(--video-orange);
  border-color: rgba(242,160,7,0.55);
  background: rgba(242,160,7,0.13);
}

.videoOptionsGrid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding: 14px;
  margin-top: 14px;
}

.videoOptionCard {
  border: 1px solid var(--video-line);
  border-radius: 22px;
  padding: 13px;
  background: rgba(255,255,255,0.055);
  display: grid;
  gap: 10px;
}

.videoOptionCard label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 1000;
}

.videoOptionCard label i,
.videoOptionCard label .brSvgIconHost {
  color: var(--video-orange);
}

.videoOptionCard small {
  color: var(--video-muted);
  line-height: 1.35;
}

/* Smaller, cleaner video sidebar navigation */
.videoSidebar {
  width: min(370px, 90vw);
}

.videoSidebarHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.videoSidebarClose {
  width: 42px;
  height: 42px;
  border: 1px solid var(--video-line);
  border-radius: 15px;
  color: var(--video-text);
  background: rgba(255,255,255,0.08);
}

.videoSidebarNav {
  display: grid;
  gap: 9px;
  margin-bottom: 14px;
}

.videoSidebarSectionTitle {
  margin: 6px 3px 3px;
  color: var(--video-orange);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 11px;
  font-weight: 1000;
}

.videoSidebarHome,
.videoSidebarGenreButton {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-height: 56px;
  width: 100%;
  border: 1px solid var(--video-line);
  border-radius: 18px;
  color: var(--video-text);
  background: rgba(255,255,255,0.06);
  text-align: left;
  font: inherit;
}

.videoSidebarHome.is-active,
.videoSidebarGenreButton.is-active {
  border-color: rgba(242,160,7,0.55);
  background: rgba(242,160,7,0.13);
}

.videoSidebarGenreIcon,
.videoSidebarHome .videoSidebarGenreIcon {
  width: 42px;
  height: 42px;
  border-radius: 15px;
  display: grid;
  place-items: center;
  color: var(--video-orange);
  background: rgba(255,255,255,0.08);
}

.videoSidebarGenreList {
  display: grid;
  gap: 8px;
  max-height: 38vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.videoSidebarEmpty {
  color: var(--video-muted);
  border: 1px dashed var(--video-line);
  border-radius: 16px;
  padding: 12px;
  font-size: 13px;
}

.videoSidebarModulesTitle {
  margin-top: 12px;
}

.videoCompactModuleLinks {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.videoCompactModuleLinks .moduleSidebarLink {
  min-height: 74px;
  grid-template-columns: 1fr;
  justify-items: center;
  text-align: center;
  padding: 9px;
  border-radius: 18px;
}

.videoCompactModuleLinks .moduleSidebarIconBadge {
  width: 36px;
  height: 36px;
  border-radius: 13px;
}

.videoCompactModuleLinks .moduleSidebarSub {
  display: none;
}

.videoCompactModuleLinks .moduleSidebarTitle {
  font-size: 12px;
  line-height: 1.1;
}

.moduleFooter {
  margin: 18px 0 0;
  color: var(--video-muted);
  text-align: center;
}

@media (max-width: 900px) {
  .videoToolbar,
  .videoWatchLayout,
  .videoOptionsGrid,
  .videoHero {
    grid-template-columns: 1fr;
  }

  .videoStatsStrip,
  .videoQuickFilters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .videoCustomControlsRow {
    grid-template-columns: 42px 54px 42px minmax(92px, 1fr) 42px 90px 42px;
  }
}

@media (max-width: 620px) {
  .videoMain {
    width: min(100% - 18px, 1180px);
    margin-top: 12px;
  }

  .videoHeroCard {
    padding: 14px;
    border-radius: 26px;
  }

  .videoIntroCard,
  .videoSettingsHandoff {
    display: none;
  }

  .videoModeTabs {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 7px;
  }

  .videoModeTab {
    min-height: 54px;
    grid-template-columns: 1fr;
    gap: 3px;
    font-size: 11px;
  }

  .videoQuickFilters {
    grid-template-columns: 1fr;
  }

  .videoPosterWall {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 11px;
    padding: 12px;
  }

  .videoContinueRail {
    padding: 12px;
  }

  .videoWatchTop {
    align-items: stretch;
    flex-direction: column;
  }

  .videoCustomControlsRow {
    grid-template-columns: 42px 54px 42px 1fr;
  }

  .videoCustomTime {
    grid-column: 1 / -1;
    order: -1;
  }

  .videoCustomVolume,
  #btnVideoCustomMute,
  #btnVideoFullscreen {
    display: none;
  }

  .videoPlaybackTools,
  .videoOptionsGrid {
    grid-template-columns: 1fr;
  }

  .videoDetailPoster {
    width: 96px;
  }

  .videoCompactModuleLinks {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
`;

fs.writeFileSync(indexPath, indexHtml, "utf8");
fs.writeFileSync(stylesPath, stylesCss, "utf8");

let app = fs.readFileSync(appPath, "utf8");

if (!app.includes("function initVideoCustomControls()")) {
  app += `

/* BRMedia Video Player J1 — custom controls + watch-page URL handoff */
function formatVideoClockForControls(seconds = 0) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) return \`\${hours}:\${String(minutes).padStart(2, "0")}:\${String(secs).padStart(2, "0")}\`;
  return \`\${minutes}:\${String(secs).padStart(2, "0")}\`;
}

function syncVideoCustomControls() {
  const video = document.getElementById("brVideoElement");
  const progress = document.getElementById("videoCustomProgress");
  const time = document.getElementById("videoCustomTime");
  const playBtn = document.getElementById("btnVideoCustomPlay");
  const muteBtn = document.getElementById("btnVideoCustomMute");
  const volume = document.getElementById("videoCustomVolume");

  if (!video) return;

  const duration = Number(video.duration) || 0;
  const current = Number(video.currentTime) || 0;

  if (progress) {
    progress.value = duration ? String(Math.round((current / duration) * 1000)) : "0";
  }

  if (time) {
    time.textContent = \`\${formatVideoClockForControls(current)} / \${formatVideoClockForControls(duration)}\`;
  }

  if (playBtn) {
    playBtn.innerHTML = video.paused
      ? '<i class="fa-solid fa-play"></i>'
      : '<i class="fa-solid fa-pause"></i>';
    if (typeof hydrateBrIcons === "function") hydrateBrIcons(playBtn);
  }

  if (muteBtn) {
    muteBtn.innerHTML = video.muted || Number(video.volume) === 0
      ? '<i class="fa-solid fa-volume-xmark"></i>'
      : '<i class="fa-solid fa-volume-high"></i>';
    if (typeof hydrateBrIcons === "function") hydrateBrIcons(muteBtn);
  }

  if (volume) {
    volume.value = String(video.muted ? 0 : video.volume);
  }
}

function initVideoCustomControls() {
  const video = document.getElementById("brVideoElement");
  if (!video || video.dataset.brmediaCustomControls === "1") return;

  video.dataset.brmediaCustomControls = "1";

  const progress = document.getElementById("videoCustomProgress");
  const playBtn = document.getElementById("btnVideoCustomPlay");
  const backBtn = document.getElementById("btnVideoCustomBack");
  const forwardBtn = document.getElementById("btnVideoCustomForward");
  const muteBtn = document.getElementById("btnVideoCustomMute");
  const volume = document.getElementById("videoCustomVolume");

  playBtn?.addEventListener("click", () => {
    if (video.paused) video.play().catch((err) => console.warn("Custom video play failed", err));
    else video.pause();
  });

  backBtn?.addEventListener("click", () => {
    try { video.currentTime = Math.max(0, Number(video.currentTime || 0) - 10); } catch {}
    syncVideoCustomControls();
  });

  forwardBtn?.addEventListener("click", () => {
    const duration = Number(video.duration) || Infinity;
    try { video.currentTime = Math.min(duration, Number(video.currentTime || 0) + 10); } catch {}
    syncVideoCustomControls();
  });

  muteBtn?.addEventListener("click", () => {
    video.muted = !video.muted;
    syncVideoCustomControls();
  });

  volume?.addEventListener("input", () => {
    const next = Math.max(0, Math.min(1, Number(volume.value) || 0));
    video.volume = next;
    video.muted = next <= 0;
    syncVideoCustomControls();
  });

  progress?.addEventListener("input", () => {
    const duration = Number(video.duration) || 0;
    if (!duration) return;
    try { video.currentTime = (Number(progress.value) / 1000) * duration; } catch {}
    syncVideoCustomControls();
  });

  ["timeupdate", "durationchange", "loadedmetadata", "play", "pause", "volumechange", "ended"].forEach((eventName) => {
    video.addEventListener(eventName, syncVideoCustomControls);
  });

  syncVideoCustomControls();
}

function updateVideoWatchUrl(id = "") {
  try {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("videoId", id);
    else url.searchParams.delete("videoId");
    history.replaceState(null, "", url);
  } catch {}
}

window.addEventListener("DOMContentLoaded", () => {
  initVideoCustomControls();
});

setTimeout(initVideoCustomControls, 250);
`;
}

app = app.replace(
  /function openVideoById\(id = ""\) \{\s*const item = findVideoById\(id\);\s*if \(!item\) return;\s*renderVideoDetail\(item\);\s*\}/,
  `function openVideoById(id = "") {
  const item = findVideoById(id);
  if (!item) return;
  updateVideoWatchUrl(item.id || id);
  renderVideoDetail(item);
  setTimeout(initVideoCustomControls, 80);
}`
);

app = app.replace(
  /(\s*videoState\.selected = null;\s*videoDetailView\?\.classList\.add\("hidden"\);\s*showVideoTab\("browse"\);)/,
  `$1
  updateVideoWatchUrl("");`
);

fs.writeFileSync(appPath, app, "utf8");

const report = {
  patch: "J1",
  updatedAt: new Date().toISOString(),
  changes: [
    "Replaced video-player/index.html with new Player-style layout.",
    "Replaced video-player/styles.css with new Video-only layout CSS.",
    "Added custom video controls.",
    "Added videoId URL handoff for individual watch pages.",
    "Made module links smaller in the video sidebar.",
  ],
};

ensureDir(backupDir);
fs.writeFileSync(path.join(backupDir, "video-layout-j1-report.json"), JSON.stringify(report, null, 2), "utf8");

console.log("BRMedia Patch J1 complete.");
console.log("Video Player now has a Player-style layout foundation with custom controls and compact nav.");
console.log(`Backups saved to ${path.relative(projectRoot, backupDir)}.`);