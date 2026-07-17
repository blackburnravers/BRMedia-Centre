const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const serverRoot = fs.existsSync(path.join(projectRoot, "server", "public"))
  ? path.join(projectRoot, "server")
  : projectRoot;
const publicDir = path.join(serverRoot, "public");
const outDir = path.join(publicDir, "stats");
const backupDir = path.join(projectRoot, "tools", "backups", "stats-before-g1");

if (!fs.existsSync(publicDir)) throw new Error("Could not find server/public. Run this from BRMedia-Centre root.");

function writeStatsFile(fileName, content) {
  const outPath = path.join(outDir, fileName);
  if (fs.existsSync(outPath)) {
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(outPath, path.join(backupDir, fileName));
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, content, "utf8");
}

writeStatsFile("index.html", String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>BRMedia Stats</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#182E5B" />
  <link rel="apple-touch-icon" sizes="180x180" href="/home/apple-touch-icon.png?v=20260505" />
  <link rel="icon" type="image/png" sizes="192x192" href="/home/icon-192.png?v=20260505" />
  <link rel="icon" type="image/png" sizes="512x512" href="/home/icon-512.png?v=20260505" />
  <link rel="manifest" href="/stats/site.webmanifest?v=20260510-g1" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Stats" />
  <link rel="stylesheet" href="/shared/shell.css?v=20260509-split-a" />
  <link rel="stylesheet" href="/shared/module-theme.css?v=20260509-split-a" />
  <link rel="stylesheet" href="/stats/styles.css?v=20260510-g1" />
</head>
<body class="brSharedBody statsBody">
  <div class="brSharedShell statsShell">
    <header class="brSharedTopbar">
      <div class="brSharedTopbarInner">
        <a class="brSharedIconBtn" href="/settings" aria-label="Open Universal Settings">?</a>
        <img class="brSharedLogo" src="/home/blackburn-ravers-header.png" alt="Blackburn Ravers" />
        <button class="brSharedIconBtn" type="button" aria-label="Open BRMedia menu" data-br-shared-menu>?</button>
      </div>
    </header>

    <div class="brSharedBackdrop" data-br-shared-backdrop></div>
    <aside class="brSharedSidebar" data-br-shared-sidebar>
      <div class="brSharedSidebarHead">
        <div class="brSharedSidebarTitle">BRMedia Centre</div>
        <button class="brSharedIconBtn" type="button" aria-label="Close menu" data-br-shared-close>×</button>
      </div>
      <nav class="brSharedNav" data-br-shared-nav aria-label="BRMedia modules"></nav>
    </aside>

    <main class="brSharedMain statsMain">
      <section class="statsHero">
        <div>
          <div class="brSharedEyebrow">BRMedia Stats</div>
          <h1>Stats Centre</h1>
          <p>Library totals, browser-side favourites/playlists/bookmarks, source health and quick checks while the full reporting engine grows.</p>
          <div class="statsHeroActions">
            <button id="btnStatsRefresh" class="statsBtn primary" type="button">Refresh stats</button>
            <a class="statsBtn" href="/player">Open Player</a>
            <a class="statsBtn" href="/settings">Settings</a>
          </div>
        </div>
        <div class="statsHeroStack">
          <div class="statsHealthCard"><span>Server</span><strong id="statsServerStatus">Checking…</strong><small id="statsServerBody">Reading /health</small></div>
          <div class="statsHealthCard"><span>Audio</span><strong id="statsAudioCount">—</strong><small>Items from /library</small></div>
          <div class="statsHealthCard"><span>Video</span><strong id="statsVideoCount">—</strong><small>Items from /video-library</small></div>
        </div>
      </section>

      <section class="statsDashboard">
        <div class="statsCardGrid" id="statsOverviewCards"></div>
      </section>

      <section class="statsSplitGrid">
        <article class="statsPanel">
          <div class="statsPanelHead">
            <div><span>Library</span><h2>Top audio artists</h2></div>
          </div>
          <div id="statsArtistList" class="statsList"></div>
        </article>

        <article class="statsPanel">
          <div class="statsPanelHead">
            <div><span>Library</span><h2>Audio formats</h2></div>
          </div>
          <div id="statsFormatList" class="statsList"></div>
        </article>
      </section>

      <section class="statsSplitGrid">
        <article class="statsPanel">
          <div class="statsPanelHead">
            <div><span>Browser</span><h2>Playlists</h2></div>
            <a href="/player?view=playlists">Open</a>
          </div>
          <div id="statsPlaylistList" class="statsList"></div>
        </article>

        <article class="statsPanel">
          <div class="statsPanelHead">
            <div><span>Video</span><h2>Video genres</h2></div>
            <a href="/video-player">Open</a>
          </div>
          <div id="statsVideoGenreList" class="statsList"></div>
        </article>
      </section>

      <section class="statsPanel statsWidePanel">
        <div class="statsPanelHead">
          <div><span>Modules</span><h2>Split status</h2></div>
        </div>
        <div id="statsModuleStatus" class="statsModuleGrid"></div>
      </section>
    </main>
  </div>

  <script src="/shared/nav.js?v=20260509-split-a"></script>
  <script src="/shared/shell.js?v=20260509-split-a"></script>
  <script src="/stats/app.js?v=20260510-g1"></script>
</body>
</html>
`);

writeStatsFile("app.js", String.raw`(function () {
  const btnStatsRefresh = document.getElementById("btnStatsRefresh");
  const statsServerStatus = document.getElementById("statsServerStatus");
  const statsServerBody = document.getElementById("statsServerBody");
  const statsAudioCount = document.getElementById("statsAudioCount");
  const statsVideoCount = document.getElementById("statsVideoCount");
  const statsOverviewCards = document.getElementById("statsOverviewCards");
  const statsArtistList = document.getElementById("statsArtistList");
  const statsFormatList = document.getElementById("statsFormatList");
  const statsPlaylistList = document.getElementById("statsPlaylistList");
  const statsVideoGenreList = document.getElementById("statsVideoGenreList");
  const statsModuleStatus = document.getElementById("statsModuleStatus");

  const FAVOURITES_KEY = "brmedia_favourites_v2";
  const RECENTS_KEY = "brmedia_recents_v1";
  const PLAYLISTS_KEY = "brmedia_playlists_v1";
  const BOOKMARKS_KEY = "brmedia_bookmarks";

  const moduleStatus = [
    { label: "Player", href: "/player", state: "Mature", body: "Main music app and visual source of truth." },
    { label: "Mastering", href: "/mastering", state: "Split", body: "Dedicated app.js cleaned and polished." },
    { label: "Video Player", href: "/video-player", state: "Split", body: "JS cleaned; new audio-player-style layout later." },
    { label: "Converter", href: "/converter", state: "Split", body: "Dedicated app.js cleaned; icons can be tidied later." },
    { label: "Tagger", href: "/tagger", state: "Split", body: "Dedicated app.js cleaned; BRMedia tag source of truth." },
    { label: "Settings", href: "/settings", state: "F4", body: "Universal Settings and Server Settings separated." },
    { label: "Stats", href: "/stats", state: "G1", body: "This first stats dashboard is now dedicated." },
  ];

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function arrayFromPayload(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.tracks)) return data.tracks;
    if (Array.isArray(data?.videos)) return data.videos;
    return [];
  }

  async function getJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data?.error || url + " failed");
    return data;
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    if (hours > 0) return hours + "h " + String(minutes).padStart(2, "0") + "m";
    return minutes + "m";
  }

  function getDuration(item) {
    return Number(item?.duration || item?.durationSec || item?.seconds || 0) || 0;
  }

  function countObject(value) {
    if (!value) return 0;
    if (Array.isArray(value)) return value.length;
    if (typeof value === "object") return Object.keys(value).length;
    return 0;
  }

  function countBookmarkItems(bookmarks) {
    if (!bookmarks || typeof bookmarks !== "object") return 0;
    return Object.values(bookmarks).reduce(function (sum, group) {
      if (Array.isArray(group)) return sum + group.length;
      if (group && typeof group === "object" && Array.isArray(group.items)) return sum + group.items.length;
      return sum;
    }, 0);
  }

  function getArtist(item) {
    return String(item?.artist || item?.albumArtist || item?.creator || "Unknown artist").trim() || "Unknown artist";
  }

  function getFormat(item) {
    const raw = String(item?.format || item?.extension || item?.ext || item?.mimeType || item?.mime || "Unknown").toLowerCase();
    if (raw.includes("mpeg") || raw.includes("mp3")) return "MP3";
    if (raw.includes("wav")) return "WAV";
    if (raw.includes("flac")) return "FLAC";
    if (raw.includes("mp4") || raw.includes("m4a") || raw.includes("aac")) return "MP4/M4A/AAC";
    if (raw.includes("ogg") || raw.includes("opus")) return "OGG/OPUS";
    if (raw.includes("video")) return "Video";
    return raw ? raw.toUpperCase().slice(0, 18) : "Unknown";
  }

  function getGenres(video) {
    const raw = video?.genres || video?.genre || video?.metadata?.genres || video?.online?.genres || [];
    if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
    return String(raw || "").split(/[,/|]/).map(function (x) { return x.trim(); }).filter(Boolean);
  }

  function topCounts(items, getKey, limit) {
    const counts = new Map();
    items.forEach(function (item) {
      const key = getKey(item);
      if (Array.isArray(key)) {
        key.forEach(function (single) { counts.set(single, (counts.get(single) || 0) + 1); });
        return;
      }
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(function ([label, count]) { return { label, count }; })
      .sort(function (a, b) { return b.count - a.count || a.label.localeCompare(b.label); })
      .slice(0, limit || 8);
  }

  function renderList(host, rows, emptyText) {
    if (!host) return;
    if (!rows.length) {
      host.innerHTML = '<div class="statsEmpty">' + escapeHtml(emptyText || "Nothing to show yet.") + '</div>';
      return;
    }

    const max = Math.max(...rows.map(function (row) { return Number(row.count) || 0; }), 1);
    host.innerHTML = rows.map(function (row) {
      const pct = Math.max(6, Math.round((Number(row.count) || 0) / max * 100));
      return '<div class="statsListRow">' +
        '<div><strong>' + escapeHtml(row.label) + '</strong><small>' + escapeHtml(row.sub || "") + '</small></div>' +
        '<span>' + escapeHtml(row.count) + '</span>' +
        '<i style="--w:' + pct + '%"></i>' +
      '</div>';
    }).join('');
  }

  function renderOverview(data) {
    const favourites = readJson(FAVOURITES_KEY, {});
    const recents = readJson(RECENTS_KEY, []);
    const playlists = readJson(PLAYLISTS_KEY, []);
    const bookmarks = readJson(BOOKMARKS_KEY, {});
    const audioDuration = data.audio.reduce(function (sum, item) { return sum + getDuration(item); }, 0);
    const videoDuration = data.video.reduce(function (sum, item) { return sum + getDuration(item); }, 0);
    const playlistTracks = Array.isArray(playlists)
      ? playlists.reduce(function (sum, playlist) { return sum + (Array.isArray(playlist?.items) ? playlist.items.length : 0); }, 0)
      : 0;

    const cards = [
      { badge: "AUD", label: "Audio library", value: data.audio.length, body: formatDuration(audioDuration) + " total duration" },
      { badge: "VID", label: "Video library", value: data.video.length, body: formatDuration(videoDuration) + " total runtime" },
      { badge: "FAV", label: "Favourites", value: countObject(favourites), body: "Browser-side saved favourites" },
      { badge: "PLY", label: "Playlists", value: Array.isArray(playlists) ? playlists.length : 0, body: playlistTracks + " playlist entries" },
      { badge: "BMK", label: "Bookmarks", value: countBookmarkItems(bookmarks), body: countObject(bookmarks) + " saved groups/mixes" },
      { badge: "REC", label: "Recents", value: Array.isArray(recents) ? recents.length : countObject(recents), body: "Recently played browser list" },
    ];

    if (!statsOverviewCards) return;
    statsOverviewCards.innerHTML = cards.map(function (card) {
      return '<article class="statsOverviewCard">' +
        '<span>' + escapeHtml(card.badge) + '</span>' +
        '<strong>' + escapeHtml(card.value) + '</strong>' +
        '<h3>' + escapeHtml(card.label) + '</h3>' +
        '<small>' + escapeHtml(card.body) + '</small>' +
      '</article>';
    }).join('');
  }

  function renderPlaylists() {
    const playlists = readJson(PLAYLISTS_KEY, []);
    const rows = Array.isArray(playlists) ? playlists.map(function (playlist) {
      return {
        label: playlist?.name || "Untitled playlist",
        count: Array.isArray(playlist?.items) ? playlist.items.length : 0,
        sub: playlist?.updatedAt ? "Updated " + new Date(playlist.updatedAt).toLocaleDateString() : "Playlist",
      };
    }).sort(function (a, b) { return b.count - a.count; }).slice(0, 8) : [];
    renderList(statsPlaylistList, rows, "No browser playlists found yet.");
  }

  function renderModules() {
    if (!statsModuleStatus) return;
    statsModuleStatus.innerHTML = moduleStatus.map(function (mod) {
      return '<a class="statsModuleCard" href="' + escapeHtml(mod.href) + '">' +
        '<span>' + escapeHtml(mod.state) + '</span>' +
        '<strong>' + escapeHtml(mod.label) + '</strong>' +
        '<small>' + escapeHtml(mod.body) + '</small>' +
      '</a>';
    }).join('');
  }

  async function refreshStats() {
    btnStatsRefresh?.classList.add("is-loading");
    if (statsServerStatus) statsServerStatus.textContent = "Checking…";

    const data = { audio: [], video: [] };

    try {
      const health = await getJson("/health");
      if (statsServerStatus) statsServerStatus.textContent = health?.ok === true ? "Online" : "Running";
      if (statsServerBody) statsServerBody.textContent = "Port " + (health?.port || 8787);
    } catch (err) {
      if (statsServerStatus) statsServerStatus.textContent = "Check failed";
      if (statsServerBody) statsServerBody.textContent = err?.message || "Could not read /health";
    }

    try {
      data.audio = arrayFromPayload(await getJson("/library"));
      if (statsAudioCount) statsAudioCount.textContent = String(data.audio.length);
    } catch (err) {
      if (statsAudioCount) statsAudioCount.textContent = "—";
    }

    try {
      data.video = arrayFromPayload(await getJson("/video-library"));
      if (statsVideoCount) statsVideoCount.textContent = String(data.video.length);
    } catch (err) {
      if (statsVideoCount) statsVideoCount.textContent = "—";
    }

    renderOverview(data);
    renderList(statsArtistList, topCounts(data.audio, getArtist, 8), "No audio artists found yet.");
    renderList(statsFormatList, topCounts(data.audio, getFormat, 8), "No audio formats found yet.");
    renderList(statsVideoGenreList, topCounts(data.video, getGenres, 8), "No video genres found yet.");
    renderPlaylists();
    renderModules();

    btnStatsRefresh?.classList.remove("is-loading");
  }

  btnStatsRefresh?.addEventListener("click", function () { void refreshStats(); });
  renderModules();
  void refreshStats();
})();
`);

writeStatsFile("styles.css", String.raw`/* BRMedia Stats G1 */
.statsMain { width: min(1180px, calc(100% - 24px)); }

.statsHero,
.statsDashboard,
.statsPanel {
  border: 1px solid var(--br-border);
  border-radius: 30px;
  background:
    radial-gradient(circle at 10% 0%, rgba(255,159,28,0.14), transparent 32rem),
    rgba(11,24,50,0.78);
  box-shadow: 0 24px 70px rgba(0,0,0,0.32);
}

.statsHero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
  gap: 18px;
  padding: clamp(20px, 4vw, 34px);
  margin-bottom: 16px;
}

.statsHero h1 {
  margin: 8px 0 10px;
  font-size: clamp(34px, 8vw, 72px);
  line-height: 0.9;
  letter-spacing: -0.06em;
}

.statsHero p { max-width: 680px; margin: 0; color: var(--br-muted); line-height: 1.5; font-size: 16px; }
.statsHeroActions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
.statsBtn { border: 1px solid rgba(255,255,255,0.14); border-radius: 999px; padding: 12px 15px; color: var(--br-text); background: rgba(255,255,255,0.08); text-decoration: none; font-weight: 900; cursor: pointer; }
.statsBtn.primary { color: #08152f; border-color: rgba(255,159,28,0.68); background: linear-gradient(180deg, #ffbd45, var(--br-orange)); }
.statsBtn.is-loading { opacity: 0.72; pointer-events: none; }

.statsHeroStack,
.statsCardGrid,
.statsSplitGrid,
.statsModuleGrid { display: grid; gap: 12px; }

.statsHealthCard,
.statsOverviewCard,
.statsModuleCard,
.statsListRow,
.statsEmpty {
  border: 1px solid rgba(255,255,255,0.13);
  border-radius: 22px;
  padding: 15px;
  background: rgba(255,255,255,0.07);
  color: var(--br-text);
}

.statsHealthCard span,
.statsOverviewCard span,
.statsModuleCard span,
.statsPanelHead span {
  color: var(--br-orange);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 11px;
  font-weight: 900;
}

.statsHealthCard strong,
.statsOverviewCard strong { display: block; margin: 5px 0; font-size: 26px; line-height: 1; }
.statsHealthCard small,
.statsOverviewCard small,
.statsModuleCard small,
.statsListRow small,
.statsEmpty { display: block; color: var(--br-muted); line-height: 1.35; }
.statsOverviewCard h3 { margin: 6px 0 5px; font-size: 17px; }
.statsDashboard { padding: 18px; margin-bottom: 16px; }
.statsCardGrid { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
.statsSplitGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-bottom: 16px; }
.statsPanel { padding: 18px; }
.statsWidePanel { margin-bottom: 30px; }
.statsPanelHead { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 13px; }
.statsPanelHead h2 { margin: 4px 0 0; font-size: clamp(24px, 4vw, 34px); line-height: 0.95; letter-spacing: -0.04em; }
.statsPanelHead a { color: var(--br-orange); text-decoration: none; font-weight: 900; }
.statsList { display: grid; gap: 10px; }
.statsListRow { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; overflow: hidden; }
.statsListRow > * { position: relative; z-index: 1; }
.statsListRow strong { display: block; }
.statsListRow span { font-weight: 1000; color: var(--br-orange); }
.statsListRow i { position: absolute; left: 0; bottom: 0; width: var(--w, 0%); height: 4px; background: linear-gradient(90deg, var(--br-orange), rgba(255,255,255,0.2)); }
.statsModuleGrid { grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
.statsModuleCard { display: grid; gap: 6px; text-decoration: none; }
.statsModuleCard strong { display: block; font-size: 18px; }

@media (max-width: 820px) {
  .statsHero,
  .statsSplitGrid { grid-template-columns: 1fr; }
}

@media (max-width: 520px) {
  .statsMain { width: min(100% - 18px, 1180px); }
  .statsHero,
  .statsDashboard,
  .statsPanel { padding: 14px; }
  .statsCardGrid,
  .statsModuleGrid { grid-template-columns: 1fr; }
}
`);

console.log("BRMedia Patch G1 complete.");
console.log("Created dedicated server/public/stats page.");
console.log(`Backups saved to ${path.relative(projectRoot, backupDir)}`);