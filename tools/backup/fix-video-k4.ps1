$root = Get-Location
$html = Join-Path $root "server/public/video-player/index.html"
$js = Join-Path $root "server/public/video-player/app.js"
$css = Join-Path $root "server/public/video-player/styles.css"

# Backup first
Copy-Item $html "$html.k4bak" -Force
Copy-Item $js "$js.k4bak" -Force
Copy-Item $css "$css.k4bak" -Force

# --- HTML: remove old in-sidebar close button + floating close button ---
$h = Get-Content $html -Raw

$h = $h -replace '(?s)\s*<button id="btnModuleSidebarClose" class="videoSidebarClose" type="button" aria-label="Close video navigation">.*?</button>', ''

$h = $h -replace '(?s)\s*<button id="btnModuleSidebarCloseFloating" class="moduleSidebarFloatingClose hidden" type="button" aria-label="Close video navigation">.*?</button>', ''

Set-Content $html $h -Encoding UTF8

# --- JS: topbar selector + add search tap handler if missing ---
$j = Get-Content $js -Raw

$j = $j -replace 'const moduleTopbar = document\.querySelector\("\.moduleTopbar"\);', 'const moduleTopbar = document.querySelector(".topbar");'

if ($j -notmatch 'videoSearchInput\?\.scrollIntoView') {
  $j = $j -replace 'addModuleTapHandler\(btnModuleMenu, handleModuleSidebarOpen\);', @'
addModuleTapHandler(moduleSearchBtn, (e) => {
  e?.preventDefault?.();
  e?.stopPropagation?.();
  videoSearchInput?.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => videoSearchInput?.focus?.(), 260);
});

addModuleTapHandler(btnModuleMenu, handleModuleSidebarOpen);
'@
}

Set-Content $js $j -Encoding UTF8

# --- CSS: append K4 fixes ---
Add-Content $css @'

/* BRMedia Video Player K4 — header/footer/sidebar final Player alignment */

/* 1. Move the whole header up and remove the extra white gap */
.videoPlayerTopbar {
  margin-top: -18px !important;
  margin-bottom: 10px !important;
  padding-top: max(8px, env(safe-area-inset-top)) !important;
  min-height: 116px !important;
}

.videoPlayerTopbar .brandHeader {
  min-height: 112px !important;
  border-radius: 28px !important;
}

.videoPlayerTopbar .brandLogoFull {
  width: min(100%, 286px) !important;
  max-height: 86px !important;
}

/* solid Player navy, no gradients */
.videoPlayerTopbar .brandHeader,
.videoPlayerTopbar .topMenuBtn,
.videoPlayerTopbar .topSearchBtn,
.videoSidebar,
.videoSidebarHome,
.videoSidebarGenreBtn,
.videoSidebarGenreButton,
.videoCompactModuleLinks .moduleSidebarLink {
  background: #182E5B !important;
  background-image: none !important;
}

/* duotone-looking header icons */
.videoPlayerTopbar .topSearchBtn i,
.videoPlayerTopbar .topMenuBtn i {
  color: #ffffff !important;
  text-shadow:
    -7px 0 0 #f2a007,
    0 0 10px rgba(31, 169, 255, 0.24) !important;
}

/* 2. Footer sits as the final page block */
.videoPlayerFooter {
  margin-top: auto !important;
  margin-right: -14px !important;
  margin-bottom: 0 !important;
  margin-left: -14px !important;
  padding-bottom: calc(22px + env(safe-area-inset-bottom)) !important;
}

/* remove any fake bottom space after footer */
.videoAppShell,
.videoMain {
  padding-bottom: 0 !important;
}

/* 3a. Hide duplicate/old sidebar buttons */
.videoSidebar .videoSidebarClose,
.moduleSidebarFloatingClose {
  display: none !important;
}

/* 3c. Use ONE Player-style close button on the right edge */
.videoSidebar::after {
  content: "×";
  position: fixed;
  top: calc(env(safe-area-inset-top) + 88px);
  left: min(calc(86vw - 34px), 356px);
  width: 66px;
  height: 66px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #ffffff;
  color: #f2a007;
  font-size: 34px;
  font-weight: 400;
  line-height: 1;
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.24);
  pointer-events: none;
  z-index: 90;
}

/* 3a. Remove search button from inside video navigation */
.videoSidebar .moduleSearchBtn,
.videoSidebar .topSearchBtn {
  display: none !important;
}

/* 3b. Video nav main section should match Player nav cards */
.videoSidebarNav {
  display: block !important;
}

.videoSidebarSectionTitle {
  margin: 22px 0 12px !important;
  color: #f2a007 !important;
  font-size: 13px !important;
  font-weight: 900 !important;
  letter-spacing: 0.18em !important;
  text-transform: uppercase !important;
}

.videoSidebarHome,
.videoSidebarGenreBtn,
.videoSidebarGenreButton {
  width: 100% !important;
  min-height: 86px !important;
  padding: 12px 16px !important;
  display: grid !important;
  grid-template-columns: 72px minmax(0, 1fr) auto !important;
  align-items: center !important;
  gap: 14px !important;
  border-radius: 24px !important;
  border: 1px solid rgba(31, 169, 255, 0.16) !important;
  box-shadow: none !important;
  text-align: left !important;
}

.videoSidebarHome.is-active,
.videoSidebarGenreBtn.is-active,
.videoSidebarGenreButton.is-active {
  background: #4ec3ff !important;
  background-image: none !important;
  border-color: rgba(242, 160, 7, 0.55) !important;
}

.videoSidebarGenreIcon,
.videoSidebarHome .videoSidebarGenreIcon {
  width: 64px !important;
  height: 64px !important;
  border-radius: 18px !important;
  display: grid !important;
  place-items: center !important;
  background: rgba(255, 255, 255, 0.08) !important;
}

.videoSidebarGenreIcon img {
  width: 46px !important;
  height: 46px !important;
  object-fit: contain !important;
}

.videoSidebarGenreTextWrap strong,
.videoSidebarGenreButton strong {
  color: #ffffff !important;
  font-size: 18px !important;
  font-weight: 900 !important;
}

.videoSidebarGenreTextWrap small,
.videoSidebarGenreButton small {
  color: rgba(255, 255, 255, 0.72) !important;
  font-size: 14px !important;
}

/* 3d. Other modules should match Player module list */
.videoSidebarModulesTitle {
  margin-top: 28px !important;
}

.videoCompactModuleLinks {
  display: grid !important;
  gap: 10px !important;
}

.videoCompactModuleLinks .moduleSidebarLink {
  min-height: 64px !important;
  padding: 10px 14px !important;
  display: grid !important;
  grid-template-columns: 34px minmax(0, 1fr) !important;
  align-items: center !important;
  gap: 12px !important;
  border-radius: 18px !important;
  border: 1px solid rgba(31, 169, 255, 0.16) !important;
  text-decoration: none !important;
}

.videoCompactModuleLinks .moduleSidebarIconBadge {
  width: 30px !important;
  height: 30px !important;
  display: grid !important;
  place-items: center !important;
  background: transparent !important;
  border: 0 !important;
}

.videoCompactModuleLinks .moduleSidebarIconBadge img {
  display: none !important;
}

.videoCompactModuleLinks .moduleSidebarLink::before {
  color: #f2a007 !important;
  font-family: "Font Awesome 6 Free";
  font-weight: 900;
  font-size: 18px;
  text-align: center;
}

.videoCompactModuleLinks .moduleSidebarLink[href="/player"]::before {
  content: "\f001";
}

.videoCompactModuleLinks .moduleSidebarLink[href="/video-player"]::before {
  content: "\f03d";
}

.videoCompactModuleLinks .moduleSidebarLink[href="/converter"]::before {
  content: "\f021";
}

.videoCompactModuleLinks .moduleSidebarLink[href="/tagger"]::before {
  content: "\f02c";
}

.videoCompactModuleLinks .moduleSidebarLink[href="/mastering"]::before {
  content: "\f1de";
}

.videoCompactModuleLinks .moduleSidebarLink[href^="/settings"]::before {
  content: "\f013";
}

.videoCompactModuleLinks .moduleSidebarLink[href="/server-settings"]::before {
  content: "\f233";
}

.videoCompactModuleLinks .moduleSidebarTitle {
  color: #ffffff !important;
  font-size: 17px !important;
  font-weight: 900 !important;
}

.videoCompactModuleLinks .moduleSidebarSub {
  color: rgba(255, 255, 255, 0.66) !important;
  font-size: 13px !important;
}

/* keep sidebar width/edge like Player */
.videoSidebar {
  width: min(86vw, 390px) !important;
  padding: calc(env(safe-area-inset-top) + 12px) 18px calc(env(safe-area-inset-bottom) + 22px) !important;
  border-right: 1px solid rgba(31, 169, 255, 0.16) !important;
  box-shadow: 18px 0 44px rgba(6, 12, 22, 0.28) !important;
}

.videoSidebarHeader {
  justify-content: center !important;
  padding: 0 58px 2px 0 !important;
  margin-bottom: 4px !important;
}

.videoSidebarHeader .moduleSidebarLogo {
  width: min(220px, 74%) !important;
  height: auto !important;
  object-fit: contain !important;
}
'@

Write-Host "BRMedia Video K4 patch applied."
Write-Host "Backups made as:"
Write-Host "  $html.k4bak"
Write-Host "  $js.k4bak"
Write-Host "  $css.k4bak"