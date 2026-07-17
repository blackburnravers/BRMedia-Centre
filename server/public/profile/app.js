const profileRoot = document.getElementById("profileRoot");

const profileState = {
  loading: true,
  profile: null,
  state: null,
  inbox: [],
  users: [],
  audioItems: [],
  videoItems: [],
  statsSummary: {},
  mode: "login",
  profileSection: new URLSearchParams(window.location.search || "").get("section") || "overview",
  loginDraft: "",
  notice: "",
};

function escapeHtml(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function iconHtml(name = "circle") {
  if (window.BRMediaIcons?.iconHtml) return window.BRMediaIcons.iconHtml(name);
  return `<i class="fa-solid fa-${String(name || "circle")}"></i>`;
}

function hydrateProfileIcons() {
  try {
    if (window.BRMediaIcons?.safeHydrateIcons) {
      window.BRMediaIcons.safeHydrateIcons(profileRoot || document);
      window.BRMediaIcons.safeHydrateIcons(document.querySelector(".profileTopbar") || document);
      window.BRMediaIcons.safeHydrateIcons(document.querySelector("#profileSidebarOverlay") || document);
      window.BRMediaIcons.safeHydrateIcons(document.querySelector("#profileSidebarFloatingClose") || document);
      return;
    }

    window.BRMediaIcons?.hydrate?.(profileRoot || document);
    window.BRMediaIcons?.hydrate?.(document.querySelector(".profileTopbar") || document);
    window.BRMediaIcons?.hydrate?.(document.querySelector("#profileSidebarOverlay") || document);
    window.BRMediaIcons?.hydrate?.(document.querySelector("#profileSidebarFloatingClose") || document);
  } catch {}
}

async function profileApi(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

function collectBrMediaLocalStorage() {
  const out = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key) continue;
    if (!/^brmedia/i.test(key) && !/^BRMedia/.test(key)) continue;
    out[key] = localStorage.getItem(key);
  }
  return out;
}

function profileItemsFromPayload(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.tracks)) return data.tracks;
  if (Array.isArray(data?.library)) return data.library;
  return [];
}

function restoreBrMediaLocalStorage(snapshot = {}, overwrite = true) {
  Object.entries(snapshot || {}).forEach(([key, value]) => {
    if (!key || typeof value !== "string") return;
    if (!overwrite && localStorage.getItem(key) !== null) return;
    localStorage.setItem(key, value);
  });
}

async function loadProfile() {
  profileState.loading = true;
  renderProfile();

  try {
    const me = await profileApi("/profile/me");
    profileState.profile = me.profile || null;

    if (profileState.profile) {
      const [
        state,
        inbox,
        users,
        audioLibrary,
        videoLibrary,
        statsSummary,
      ] = await Promise.all([
        profileApi("/profile/state").catch(() => null),
        profileApi("/profile/inbox").catch(() => ({ inbox: [] })),
        profileApi("/profile/users").catch(() => ({ users: [] })),
        profileApi("/library").catch(() => []),
        profileApi("/video-library").catch(() => ({ items: [] })),
        profileApi("/profile/stats").catch(() => ({
          metrics: {},
          timeline: [],
          topAudio: [],
          topVideo: [],
          recent: [],
        })),
      ]);

      profileState.state = state?.state || {};
      profileState.inbox = Array.isArray(inbox?.inbox) ? inbox.inbox : [];
      profileState.users = Array.isArray(users?.users) ? users.users : [];
      profileState.audioItems = profileItemsFromPayload(audioLibrary);
      profileState.videoItems = profileItemsFromPayload(videoLibrary);
      profileState.statsSummary = statsSummary || {};
      profileState.mode = "profile";
    }
  } catch (err) {
    profileState.notice = err?.message || "Could not load profile.";
  }

  profileState.loading = false;
  renderProfile();
}

async function loginProfile() {
  const login = String(document.getElementById("profileLogin")?.value || "").trim();
  const password = String(document.getElementById("profilePassword")?.value || "");

  profileState.loginDraft = login;

  if (!login || !password) {
    profileState.notice = "Enter your username/email and password/PIN.";
    renderProfile();
    return;
  }

  try {
    profileState.notice = "Logging in…";
    renderProfile();
    const data = await profileApi("/profile/login", {
      method: "POST",
      body: JSON.stringify({ login, password }),
    });
    profileState.profile = data.profile;
    profileState.notice = "Logged in. Loading profile memory…";
    await loadProfile();
  } catch (err) {
    profileState.notice = err?.message || "Login failed.";
    renderProfile();
  }
}

async function registerProfile() {
  const username = document.getElementById("profileNewUsername")?.value || "";
  const displayName = document.getElementById("profileNewDisplayName")?.value || "";
  const email = document.getElementById("profileNewEmail")?.value || "";
  const password = document.getElementById("profileNewPassword")?.value || "";

  try {
    profileState.notice = "Creating profile…";
    renderProfile();
    const data = await profileApi("/profile/register", {
      method: "POST",
      body: JSON.stringify({ username, displayName, email, password }),
    });
    profileState.profile = data.profile;
    profileState.notice = "Profile created.";
    await saveDeviceMemory();
    await loadProfile();
  } catch (err) {
    profileState.notice = err?.message || "Could not create profile.";
    renderProfile();
  }
}

async function logoutProfile() {
  try {
    await profileApi("/profile/logout", { method: "POST", body: "{}" });
  } catch {}
  profileState.profile = null;
  profileState.state = null;
  profileState.inbox = [];
  profileState.mode = "login";
  profileState.notice = "Logged out.";
  renderProfile();
}

async function saveDeviceMemory() {
  try {
    const localSnapshot = collectBrMediaLocalStorage();
    const data = await profileApi("/profile/state", {
      method: "POST",
      body: JSON.stringify({
        localStorage: localSnapshot,
        settings: {
          savedFrom: navigator.userAgent || "",
          savedAt: Date.now(),
        },
      }),
    });

    profileState.state = data.state;
    profileState.notice = `Saved ${Object.keys(localSnapshot).length} BRMedia memory keys to your profile.`;
  } catch (err) {
    profileState.notice = err?.message || "Could not save device memory.";
  }

  renderProfile();
}

async function restoreDeviceMemory() {
  try {
    const data = await profileApi("/profile/state");
    const snapshot = data?.state?.localStorage || {};
    restoreBrMediaLocalStorage(snapshot, true);
    localStorage.setItem("brmedia_profile_autorestore_v1", profileState.profile?.id || "");
    profileState.notice = `Restored ${Object.keys(snapshot).length} BRMedia memory keys. Reopen Player/Video if already open.`;
  } catch (err) {
    profileState.notice = err?.message || "Could not restore profile memory.";
  }

  renderProfile();
}

async function sendProfileMessage() {
  const to = document.getElementById("profileSendTo")?.value || "";
  const title = document.getElementById("profileSendTitle")?.value || "";
  const message = document.getElementById("profileSendMessage")?.value || "";

  try {
    await profileApi("/profile/send", {
      method: "POST",
      body: JSON.stringify({ to, title, message, payload: { source: "profile-page" } }),
    });
    profileState.notice = "Message queued to profile inbox.";
    document.getElementById("profileSendMessage").value = "";
  } catch (err) {
    profileState.notice = err?.message || "Could not send message.";
  }

  renderProfile();
}

function renderLoggedOut() {
  return `
    <section class="profileCard profileLoginCard">
      <div class="profileCardTitle profileCardTitleCentre">
        <span class="profileCardIcon">${iconHtml("user-lock")}</span>
        <div>
          <span class="profileKicker">BRMedia Profiles V1</span>
          <h2>${profileState.mode === "register" ? "Create BRMedia profile" : "Login to BRMedia"}</h2>
          <p>${profileState.mode === "register"
            ? "Create your in-house BRMedia profile, then sync this phone/PC memory into it."
            : "Sync favourites, queues, playlists, bookmarks, resume positions and settings across devices."
          }</p>
        </div>
      </div>

      ${profileState.notice ? `<div class="profileNotice">${escapeHtml(profileState.notice)}</div>` : ""}

      <div class="profileModeTabs">
        <button class="${profileState.mode === "login" ? "active" : ""}" data-profile-mode="login" type="button">${iconHtml("right-to-bracket")} Login</button>
        <button class="${profileState.mode === "register" ? "active" : ""}" data-profile-mode="register" type="button">${iconHtml("user-plus")} Create</button>
      </div>

      ${profileState.mode === "register" ? `
        <div class="profileFormGrid">
          <label>${iconHtml("user")} Username<input id="profileNewUsername" type="text" placeholder="rhys" autocomplete="username" /></label>
          <label>${iconHtml("id-card")} Display name<input id="profileNewDisplayName" type="text" placeholder="Rhys / Upalnite" /></label>
          <label>${iconHtml("envelope")} Email optional<input id="profileNewEmail" type="email" placeholder="for future notifications" /></label>
          <label>${iconHtml("key")} Password / PIN<input id="profileNewPassword" type="password" autocomplete="new-password" placeholder="minimum 4 characters" /></label>
        </div>
        <button class="profilePrimaryBtn" id="btnProfileRegister" type="button">${iconHtml("floppy-disk")} Create profile + sync this device</button>
      ` : `
        <div class="profileFormGrid">
          <label>${iconHtml("user")} Username or email<input id="profileLogin" type="text" autocomplete="username" value="${escapeHtml(profileState.loginDraft || "")}" placeholder="rhys" /></label>
          <label>${iconHtml("key")} Password / PIN<input id="profilePassword" type="password" autocomplete="current-password" placeholder="your BRMedia password" /></label>
        </div>
        <button class="profilePrimaryBtn" id="btnProfileLogin" type="button">${iconHtml("right-to-bracket")} Login + restore profile</button>
      `}
    </section>

    <section class="profileFeatureGrid">
      <article><span>${iconHtml("heart")}</span><strong>Favourites</strong><em>Audio/video favourites stored to profile.</em></article>
      <article><span>${iconHtml("play")}</span><strong>Resume</strong><em>Carry watch/listen positions to another device.</em></article>
      <article><span>${iconHtml("list-music")}</span><strong>Queues</strong><em>Queue and playlist memory foundation.</em></article>
      <article><span>${iconHtml("envelope")}</span><strong>Inbox</strong><em>Offline send-to-person starts here.</em></article>
    </section>
  `;
}

function readProfileJsonValue(key, fallback) {
  const local = localStorage.getItem(key);
  const remote = profileState.state?.localStorage?.[key];
  const raw = local ?? remote;

  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function getProfileFavouriteAudio() {
  const store = readProfileJsonValue("brmedia_favourites_v2", {});
  const entries = Array.isArray(store)
    ? store
    : Object.entries(store && typeof store === "object" ? store : {}).map(([key, value]) => ({
        ...(value && typeof value === "object" ? value : {}),
        favKey: value?.favKey || key,
      }));

  return entries
    .filter(Boolean)
    .sort((a, b) => Number(b.addedAt || 0) - Number(a.addedAt || 0));
}

function getProfileFavouriteVideos() {
  const store = readProfileJsonValue("brmedia_video_favourites_v1", []);

  if (Array.isArray(store)) {
    return store.map((id) => ({ id: String(id || ""), title: String(id || "Video") })).filter((item) => item.id);
  }

  return Object.entries(store && typeof store === "object" ? store : {})
    .map(([key, value]) => ({
      id: String(value?.id || key || ""),
      title: String(value?.title || value?.name || key || "Video"),
      year: value?.year || "",
      addedAt: Number(value?.addedAt || 0),
    }))
    .filter((item) => item.id)
    .sort((a, b) => Number(b.addedAt || 0) - Number(a.addedAt || 0));
}

function profileRouteHref(base, params = {}) {
  const url = new URL(base, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) url.searchParams.set(key, String(value));
  });
  return `${url.pathname}${url.search}`;
}

function renderProfileAvatar(profile = {}) {
  const avatar = String(profile.avatar || "").trim();
  if (avatar) return `<img src="${escapeHtml(avatar)}" alt="" class="profileAvatarImage" loading="lazy" />`;
  return escapeHtml(String(profile.displayName || profile.username || "B").slice(0, 1).toUpperCase());
}

function renderProfileFavouriteList(kind = "audio", items = []) {
  const limited = items.slice(0, 12);
  const emptyText = kind === "audio"
    ? "No favourite audio saved on this device/profile yet. Add a favourite in Player, then save profile memory."
    : "No favourite videos saved on this device/profile yet. Add a favourite in Video Player, then save profile memory.";

  if (!limited.length) return `<div class="profileEmptyList">${escapeHtml(emptyText)}</div>`;

  return `
    <div class="profileFavouriteList">
      ${limited.map((item) => {
        const title = item.title || item.name || item.id || item.favKey || "Favourite";
        const sub = kind === "audio"
          ? [item.artist, item.album, item.filename || item.file].filter(Boolean).join(" · ")
          : [item.year, item.id].filter(Boolean).join(" · ");
        const href = kind === "audio"
          ? profileRouteHref("/player", { trackId: item.id || item.favKey || item.file || item.path || item.locator })
          : profileRouteHref("/video-player", { videoId: item.id });

        return `
          <a class="profileFavouriteItem" href="${escapeHtml(href)}">
            <span>${iconHtml(kind === "audio" ? "music" : "film")}</span>
            <strong>${escapeHtml(title)}</strong>
            <em>${escapeHtml(sub || (kind === "audio" ? "Open in Audio Player" : "Open in Video Player"))}</em>
          </a>
        `;
      }).join("")}
    </div>
  `;
}

async function saveProfileAvatar() {
  const avatar = String(document.getElementById("profileAvatarUrl")?.value || "").trim();

  try {
    profileState.notice = "Saving avatar…";
    renderProfile();
    const data = await profileApi("/profile/avatar", {
      method: "POST",
      body: JSON.stringify({ avatar }),
    });
    profileState.profile = data.profile || profileState.profile;
    profileState.notice = avatar ? "Avatar saved to your BRMedia profile." : "Avatar removed.";
    renderProfile();
  } catch (err) {
    profileState.notice = err?.message || "Could not save avatar.";
    renderProfile();
  }
}

function handleProfileAvatarUpload(event) {
  const file = event.target?.files?.[0];
  if (!file) return;

  if (!String(file.type || "").startsWith("image/")) {
    profileState.notice = "Choose an image file for the avatar.";
    renderProfile();
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    profileState.notice = "Avatar image is too large. Use an image under 2 MB.";
    renderProfile();
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      profileState.notice = "Uploading avatar…";
      renderProfile();
      const data = await profileApi("/profile/avatar", {
        method: "POST",
        body: JSON.stringify({ avatar: String(reader.result || "") }),
      });
      profileState.profile = data.profile || profileState.profile;
      profileState.notice = "Avatar uploaded to your BRMedia profile.";
      renderProfile();
    } catch (err) {
      profileState.notice = err?.message || "Could not upload avatar.";
      renderProfile();
    }
  };
  reader.readAsDataURL(file);
}

function goBackFromProfile() {
  try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.origin === window.location.origin && !ref.pathname.startsWith("/profile")) {
      window.history.back();
      return;
    }
  } catch {}
  window.location.href = "/";
}

function profileDisplayName() {
  const profile = profileState.profile || {};
  return String(profile.displayName || profile.username || "your").trim() || "your";
}

function profileSidebarIcon(icon) {
  return `<span class="profileSidebarNavIconBadge">${iconHtml(icon)}</span>`;
}

function profileSidebarImage(src = "", alt = "") {
  return `<span class="profileSidebarNavIconBadge"><img class="profileSidebarModuleIconImage" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" /></span>`;
}

function profileSidebarLink(href, iconMarkup, title, sub, active = false) {
  return `
    <a class="profileSidebarNavBtn ${active ? "is-active" : ""}" href="${escapeHtml(href)}">
      ${iconMarkup}
      <span class="profileSidebarNavText">
        <span class="profileSidebarNavTitle">${escapeHtml(title)}</span>
        <span class="profileSidebarNavSub">${escapeHtml(sub)}</span>
      </span>
    </a>
  `;
}

function renderProfileSidebarMenu() {
  const panel = document.getElementById("profileSidebarPanel");
  if (!panel) return;

  const name = profileDisplayName();
  const current = String(profileState.profileSection || "overview");
	
  const homeLink = ["/", "/shared/branding/module-icons/home.png", "Home", "Back to BRMedia Centre home."];
	
  const sectionLinks = [
    ["overview", "grid", "Profile Home", `${name}'s profile hub, shortcuts and saved BRMedia memory.`],
    ["audio", "music", "Audio Profile", `${name}'s favourite mixes, playlists, recents and queue.`],
    ["video", "film", "Video Profile", `${name}'s favourite films, posters and video shortcuts.`],
    ["stats", "chart-column", "Personal Stats", `${name}'s listening, watching and profile activity zone.`],
    ["edit", "user-gear", "Edit Profile", `Update ${name}'s avatar, username, email and password/PIN.`],
    ["memory", "database", "Memory Sync", `Save and restore ${name}'s BRMedia settings across devices.`],
    ["inbox", "inbox", "Inbox", `Offline send-to-profile messages for ${name}.`],
  ];

  const moduleLinks = [
    ["/player", "/shared/branding/module-icons/audio-home.png", "Player", "Audio player, queue, playlists and tracklists."],
    ["/video-player", "/shared/branding/module-icons/video-player.png", "Video", "Films, posters, playback and subtitles."],
    ["/mastering", "/shared/branding/module-icons/mastering.png", "Mastering", "Audio polish, previews and compare tools."],
    ["/tagger", "/shared/branding/module-icons/tagger.png", "Tagger", "Metadata, artwork and BRMedia tags."],
    ["/converter", "/shared/branding/module-icons/converter.png", "Converter", "Convert audio/video and batch jobs."],
    ["/stats", "/shared/branding/module-icons/stats.png", "Stats", "Charts, history and library analytics."],
    ["/torrents", "/shared/branding/module-icons/torrents.png", "Torrents", "Legal torrents, queue, speed limits and safe scanning."],
    ["/server-settings", "/shared/branding/module-icons/server-settings.png", "Server Settings", "Sources, storage, FFmpeg and networking."],
    ["/settings", "/shared/branding/module-icons/settings.png", "Settings", "Global BRMedia control centre."],
  ];

  panel.innerHTML = `
    <img src="/shared/branding/global/blackburn-ravers-header.png" alt="Blackburn Ravers" class="profileSidebarLogo" />

    <section class="profileSidebarHomeBlock">
      ${profileSidebarLink(homeLink[0], profileSidebarImage(homeLink[1], homeLink[2]), homeLink[2], homeLink[3])}
    </section>

    <section class="profileSidebarGroup profileSidebarGroupTop">
      <div class="profileSidebarSectionTitle">Profile sections</div>
      <div class="profileSidebarNavList">
        ${sectionLinks.map(([key, icon, title, sub]) => profileSidebarLink(`/profile?section=${key}`, profileSidebarIcon(icon), title, sub, current === key)).join("")}
      </div>
    </section>

    <section class="profileSidebarGroup">
      <div class="profileSidebarSectionTitle">Open modules</div>
      <div class="profileSidebarNavList">
        ${moduleLinks.map(([href, img, title, sub]) => profileSidebarLink(href, profileSidebarImage(img, title), title, sub)).join("")}
      </div>
    </section>
  `;

  panel.querySelectorAll("[data-profile-close-menu]").forEach((node) => {
    node.onclick = closeProfileSidebar;
  });

  hydrateProfileIcons();
}

function openProfileSidebar() {
  const overlay = document.getElementById("profileSidebarOverlay");
  const closeButton = document.getElementById("profileSidebarFloatingClose");
  if (!overlay) return;

  renderProfileSidebarMenu();
  overlay.hidden = false;
  if (closeButton) closeButton.hidden = false;

  requestAnimationFrame(() => {
    overlay.classList.add("is-open");
    closeButton?.classList.add("is-open");
  });
}

function closeProfileSidebar() {
  const overlay = document.getElementById("profileSidebarOverlay");
  const closeButton = document.getElementById("profileSidebarFloatingClose");
  if (!overlay) return;

  overlay.classList.remove("is-open");
  closeButton?.classList.remove("is-open");

  window.setTimeout(() => {
    if (!overlay.classList.contains("is-open")) overlay.hidden = true;
    if (closeButton && !closeButton.classList.contains("is-open")) closeButton.hidden = true;
  }, 180);
}

function bindProfileShellControls() {
  const backButton = document.getElementById("profileBackButton");
  const menuButton = document.getElementById("profileMenuButton");
  if (backButton) backButton.onclick = goBackFromProfile;
  if (menuButton) menuButton.onclick = openProfileSidebar;

  document.querySelectorAll("[data-profile-close-menu]").forEach((node) => {
    node.onclick = closeProfileSidebar;
  });

  renderProfileSidebarMenu();
}

function getProfileArrayStore(key) {
  const store = readProfileJsonValue(key, []);
  if (Array.isArray(store)) return store.filter(Boolean);
  if (store && typeof store === "object") {
    return Object.entries(store).map(([key, value]) => ({
      ...(value && typeof value === "object" ? value : {}),
      id: value?.id || key,
      favKey: value?.favKey || key,
    })).filter(Boolean);
  }
  return [];
}

function getProfilePlaylists() {
  return getProfileArrayStore("brmedia_playlists_v1")
    .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
}

function getProfileRecents() {
  const primary = getProfileArrayStore("brmedia_recents_v1");
  const fallback = getProfileArrayStore("brmedia_recent_tracks_v1");
  return [...primary, ...fallback]
    .sort((a, b) => Number(b.playedAt || b.updatedAt || b.createdAt || 0) - Number(a.playedAt || a.updatedAt || a.createdAt || 0));
}

function getProfileQueue() {
  const manual = getProfileArrayStore("brmedia_saved_queue_manual");
  const queue = getProfileArrayStore("brmedia_queue_v1");
  return manual.length ? manual : queue;
}

function getProfileProgressStore() {
  const store = readProfileJsonValue("brmedia_track_progress_v1", {});
  return store && typeof store === "object" ? store : {};
}

function getProfileAvatarUrlInput(profile = {}) {
  const avatar = String(profile.avatar || "").trim();
  return avatar.startsWith("data:image/") ? "" : avatar;
}

function normaliseProfileLookup(value = "") {
  return String(value || "").trim().toLowerCase();
}

function profileCandidateValues(item = {}) {
  return [
    item.id,
    item.favKey,
    item.trackId,
    item.videoId,
    item.file,
    item.path,
    item.locator,
    item.url,
    item.title,
    item.name,
  ].filter(Boolean).map(normaliseProfileLookup);
}

function findProfileAudioItem(item = {}) {
  const candidates = profileCandidateValues(item);
  if (!candidates.length) return null;
  return (profileState.audioItems || []).find((track) => {
    const values = profileCandidateValues(track);
    return values.some((value) => candidates.includes(value));
  }) || null;
}

function findProfileVideoItem(item = {}) {
  const candidates = profileCandidateValues(item);
  if (!candidates.length) return null;
  return (profileState.videoItems || []).find((video) => {
    const values = profileCandidateValues(video);
    const parts = Array.isArray(video.parts) ? video.parts.flatMap(profileCandidateValues) : [];
    return [...values, ...parts].some((value) => candidates.includes(value));
  }) || null;
}

function getProfileAudioArtwork(item = {}) {
  const match = findProfileAudioItem(item) || item;
  const direct = match.artwork || match.artworkUrl || match.cover || match.coverUrl || match.image || match.imageUrl || match.thumbnail || "";
  if (direct) return direct;
  if (!match.id) return "";
  const source = String(match.source || match.sourceType || match.provider || match.locator || "").toLowerCase();
  if (source.includes("google")) return match.hasArtwork ? `/cloud/google/artwork/${encodeURIComponent(match.id)}` : "";
  return `/track/${encodeURIComponent(match.id)}/artwork`;
}

function getProfileVideoPoster(item = {}) {
  const match = findProfileVideoItem(item) || item;
  const direct = match.customPosterUrl || match.poster || match.image || match.imageUrl || match.thumbnail || "";
  if (direct) return direct;
  if (match.posterPath && match.id) return `/video-poster/${encodeURIComponent(match.id)}`;
  if (match.posterUrl) return `/video-online-image?url=${encodeURIComponent(match.posterUrl)}`;
  return "";
}

function getProfileVideoTitle(item = {}) {
  const match = findProfileVideoItem(item) || item;
  const title = match.title || match.name || match.fileName || item.title || item.name || "";
  if (title && !String(title).startsWith("vid_")) return title;
  if (match.originalTitle) return match.originalTitle;
  if (match.fileName) return String(match.fileName).replace(/\.[^.]+$/, "");
  return "Saved video";
}

function getProfileItemTitle(item = {}, fallback = "Item", kind = "audio") {
  if (kind === "video") return getProfileVideoTitle(item);
  const match = kind === "audio" || kind === "recent" || kind === "queue" ? findProfileAudioItem(item) : null;
  return match?.title || item.title || item.name || item.displayName || item.filename || item.fileName || item.id || item.favKey || fallback;
}

function getProfileItemSubtitle(item = {}, kind = "audio") {
  if (kind === "video") {
    const match = findProfileVideoItem(item) || item;
    return [match.year, match.genre, match.certification].filter(Boolean).join(" · ") || "Open in Video Player";
  }

  if (kind === "playlist") {
    return `${Array.isArray(item.items) ? item.items.length : 0} item${Array.isArray(item.items) && item.items.length === 1 ? "" : "s"}`;
  }

  const match = findProfileAudioItem(item) || item;
  return [match.artist, match.album, match.category, match.subtitle, match.filename || match.file].filter(Boolean).join(" · ") || "Open in Audio Player";
}

function renderProfileMediaThumb(kind = "audio", item = {}, icon = "music") {
  const image = kind === "video" ? getProfileVideoPoster(item) : getProfileAudioArtwork(item);
  return `<span class="profileMediaThumb ${image ? "has-image" : ""}">${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" />` : iconHtml(icon)}</span>`;
}

function getProfileSectionTabs() {
  const sections = [
    ["overview", "grid", "Home"],
    ["audio", "music", "Audio"],
    ["video", "film", "Video"],
    ["stats", "chart-column", "Stats"],
    ["edit", "user-gear", "Edit"],
    ["memory", "database", "Memory"],
    ["inbox", "inbox", "Inbox"],
  ];

  return `
    <nav class="profileSectionTabs" aria-label="Profile sections">
      ${sections.map(([key, icon, label]) => `
        <button class="profileSectionTab ${profileState.profileSection === key ? "is-active" : ""}" data-profile-section="${escapeHtml(key)}" type="button">
          ${iconHtml(icon)}<span>${escapeHtml(label)}</span>
        </button>
      `).join("")}
    </nav>
  `;
}

function renderProfileQuickTile(href, icon, title, sub, extraClass = "") {
  return `
    <a class="profileQuickTile ${escapeHtml(extraClass)}" href="${escapeHtml(href)}">
      <span class="profileQuickTileIcon">${iconHtml(icon)}</span>
      <span><strong>${escapeHtml(title)}</strong><em>${escapeHtml(sub)}</em></span>
    </a>
  `;
}

function renderProfileMiniAction(href, icon, title, sub) {
  return `
    <a class="profileMiniAction" href="${escapeHtml(href)}">
      <span>${iconHtml(icon)}</span>
      <span><strong>${escapeHtml(title)}</strong><em>${escapeHtml(sub)}</em></span>
    </a>
  `;
}

function renderProfileItemList(kind = "audio", items = [], emptyText = "Nothing saved yet.") {
  const limited = items.slice(0, 12);
  if (!limited.length) return `<div class="profileEmptyList">${escapeHtml(emptyText)}</div>`;

  return `
    <div class="profileFavouriteList profileMediaList">
      ${limited.map((item) => {
        const isVideo = kind === "video";
        const isPlaylist = kind === "playlist";
        const icon = isPlaylist ? "list-music" : isVideo ? "film" : kind === "recent" ? "clock-rotate-left" : kind === "queue" ? "list-music" : "music";
        const match = isVideo ? findProfileVideoItem(item) : findProfileAudioItem(item);
        const title = getProfileItemTitle(item, "Favourite", kind);
        const href = isPlaylist
          ? "/player"
          : isVideo
            ? profileRouteHref("/video-player", { videoId: match?.id || item.id })
            : profileRouteHref("/player", { trackId: match?.id || item.id || item.favKey || item.file || item.path || item.locator });
        const sub = getProfileItemSubtitle(item, kind);

        return `
          <a class="profileFavouriteItem" href="${escapeHtml(href)}">
            ${renderProfileMediaThumb(isVideo ? "video" : "audio", match || item, icon)}
            <strong>${escapeHtml(title)}</strong>
            <em>${escapeHtml(sub || "Open in BRMedia")}</em>
          </a>
        `;
      }).join("")}
    </div>
  `;
}

async function saveProfileAccount() {
  const displayName = String(document.getElementById("profileEditDisplayName")?.value || "").trim();
  const username = String(document.getElementById("profileEditUsername")?.value || "").trim();
  const email = String(document.getElementById("profileEditEmail")?.value || "").trim();
  const currentPassword = String(document.getElementById("profileCurrentPassword")?.value || "");
  const newPassword = String(document.getElementById("profileNewPasswordEdit")?.value || "");

  try {
    profileState.notice = "Saving profile details…";
    renderProfile();
    const data = await profileApi("/profile/account", {
      method: "POST",
      body: JSON.stringify({ displayName, username, email, currentPassword, newPassword }),
    });
    profileState.profile = data.profile || profileState.profile;
    profileState.notice = "Profile details saved.";
    renderProfile();
  } catch (err) {
    profileState.notice = err?.message || "Could not save profile details.";
    renderProfile();
  }
}

function renderProfileOverview(profile, counts) {
  return `
    <section class="profileCard profileAccountCard">
      <div class="profileCardTitle">
        <span class="profileCardIcon">${iconHtml("grid")}</span>
        <div><h2>Profile hub</h2><p>Jump straight into your saved audio, video, uploads, torrents and personal stats.</p></div>
      </div>
      <div class="profileQuickGrid">
        ${renderProfileQuickTile("/profile?section=audio", "music", "Audio", `${counts.audio} favourites · ${counts.playlists} playlists`)}
        ${renderProfileQuickTile("/profile?section=video", "film", "Video", `${counts.video} favourites`)}
        ${renderProfileQuickTile("/settings?module=cloud&tab=add-files&pick=1", "upload", "Upload media", "Audio/video, Drive, Dropbox")}
        ${renderProfileQuickTile("/profile?section=stats", "chart-column", "Personal stats", "Charts, progress and history", "profileQuickTileStats")}
        ${renderProfileQuickTile("/torrents", "magnet", "Torrents", "Legal downloads & transfer")}
        ${renderProfileQuickTile("/profile?section=edit", "user-gear", "Edit profile", "Name, email, avatar, password")}
        ${renderProfileQuickTile("/profile?section=memory", "database", "Memory sync", `${counts.memory} BRMedia keys saved`)}
        ${renderProfileQuickTile("/profile?section=inbox", "inbox", "Inbox", `${profileState.inbox.length} message${profileState.inbox.length === 1 ? "" : "s"}`)}
      </div>
    </section>
  `;
}

function renderProfileAudioSection(favouriteAudio, playlists, recents, queueItems) {
  return `
    <section class="profileCard profileFavouritesCard">
      <div class="profileCardTitle"><span class="profileCardIcon">${iconHtml("music")}</span><div><h2>Audio</h2><p>Favourites, playlists, recently played and saved queue items.</p></div></div>
      <div class="profileMiniActionGrid">
        ${renderProfileMiniAction("/player", "heart", "Favourites", `${favouriteAudio.length} saved`)}
        ${renderProfileMiniAction("/player", "list-music", "Playlists", `${playlists.length} playlist${playlists.length === 1 ? "" : "s"}`)}
        ${renderProfileMiniAction("/player", "clock-rotate-left", "Recently played", `${recents.length} item${recents.length === 1 ? "" : "s"}`)}
        ${renderProfileMiniAction("/player", "list-music", "Queue media", `${queueItems.length} queued`)}
        ${renderProfileMiniAction("/settings?module=cloud&tab=add-files&pick=1", "upload", "Upload media", "Upload or import audio")}
        ${renderProfileMiniAction("/settings?module=cloud&tab=files", "folder-music", "View files", "Manage audio files")}
      </div>
    </section>

    <section class="profileCard profileFavouritesCard">
      <div class="profileCardTitle"><span class="profileCardIcon">${iconHtml("heart")}</span><div><h2>Favourite Audio</h2><p>Tap one to open it in the Audio Player.</p></div></div>
      ${renderProfileItemList("audio", favouriteAudio, "No favourite audio saved yet. Add favourites in Player, then save profile memory.")}
    </section>

    <section class="profileCard profileFavouritesCard">
      <div class="profileCardTitle"><span class="profileCardIcon">${iconHtml("list-music")}</span><div><h2>Playlists</h2><p>Your saved playlist memory from Player.</p></div></div>
      ${renderProfileItemList("playlist", playlists, "No playlists saved yet. Create playlists in Player, then save profile memory.")}
    </section>

    <section class="profileCard profileFavouritesCard">
      <div class="profileCardTitle"><span class="profileCardIcon">${iconHtml("clock-rotate-left")}</span><div><h2>Recently played</h2><p>Recent audio from this profile/device memory.</p></div></div>
      ${renderProfileItemList("recent", recents, "No recently played audio saved yet.")}
    </section>

    <section class="profileCard profileFavouritesCard">
      <div class="profileCardTitle"><span class="profileCardIcon">${iconHtml("list-music")}</span><div><h2>Queue media</h2><p>Your saved Player queue memory.</p></div></div>
      ${renderProfileItemList("queue", queueItems, "No saved queue media yet.")}
    </section>
  `;
}

function renderProfileVideoSection(favouriteVideos) {
  return `
    <section class="profileCard profileFavouritesCard">
      <div class="profileCardTitle"><span class="profileCardIcon">${iconHtml("film")}</span><div><h2>Video</h2><p>Favourite videos, upload/import shortcuts and torrent transfer links.</p></div></div>
      <div class="profileMiniActionGrid">
        ${renderProfileMiniAction("/video-player", "heart", "Favourites", `${favouriteVideos.length} saved`)}
        ${renderProfileMiniAction("/settings?module=cloud&tab=add-files&pick=1", "upload", "Upload media", "Upload audio or video")}
        ${renderProfileMiniAction("/torrents", "magnet", "Torrent downloads", "Legal torrents & transfer")}
        ${renderProfileMiniAction("/settings?module=cloud&tab=files&filter=local", "folder-open", "View files", "Manage imported media")}
      </div>
    </section>

    <section class="profileCard profileFavouritesCard">
      <div class="profileCardTitle"><span class="profileCardIcon">${iconHtml("film")}</span><div><h2>Favourite Videos</h2><p>Tap one to open its Video Player page.</p></div></div>
      ${renderProfileItemList("video", favouriteVideos, "No favourite videos saved yet. Add favourites in Video Player, then save profile memory.")}
    </section>
  `;
}

function renderProfileEditSection(profile) {
  return `
    <section class="profileCard profileAvatarCard">
      <div class="profileCardTitle">
        <span class="profileCardIcon">${iconHtml("user-gear")}</span>
        <div><h2>Edit profile</h2><p>Change your display name, username, email, password and avatar.</p></div>
      </div>
      ${profileState.notice ? `<div class="profileNotice">${escapeHtml(profileState.notice)}</div>` : ""}
      <div class="profileAccountForm">
        <div class="profileFormGrid">
          <label>${iconHtml("id-card")} Display name<input id="profileEditDisplayName" type="text" value="${escapeHtml(profile.displayName || "")}" /></label>
          <label>${iconHtml("user")} Username<input id="profileEditUsername" type="text" value="${escapeHtml(profile.username || "")}" /></label>
          <label>${iconHtml("envelope")} Email<input id="profileEditEmail" type="email" value="${escapeHtml(profile.email || "")}" /></label>
        </div>
        <p class="profileDangerNote">Only fill password boxes if you want to change your password/PIN.</p>
        <div class="profileFormGrid">
          <label>${iconHtml("key")} Current password<input id="profileCurrentPassword" type="password" autocomplete="current-password" /></label>
          <label>${iconHtml("lock")} New password<input id="profileNewPasswordEdit" type="password" autocomplete="new-password" /></label>
        </div>
        <button class="profilePrimaryBtn" id="btnProfileSaveAccount" type="button">${iconHtml("floppy-disk")} Save profile details</button>
      </div>
    </section>

    <section class="profileCard profileAvatarCard">
      <div class="profileCardTitle">
        <span class="profileCardIcon">${iconHtml("image-user")}</span>
        <div><h2>Avatar</h2><p>Add an avatar URL, or upload a small image from this device.</p></div>
      </div>
      <div class="profileFormGrid">
        <label>${iconHtml("link")} Avatar URL<input id="profileAvatarUrl" type="url" value="${escapeHtml(getProfileAvatarUrlInput(profile))}" placeholder="https://.../avatar.png" /></label>
        <label>${iconHtml("upload")} Upload avatar<input id="profileAvatarFile" type="file" accept="image/*" /></label>
      </div>
      <button class="profilePrimaryBtn" id="btnProfileSaveAvatar" type="button">${iconHtml("floppy-disk")} Save avatar URL</button>
    </section>
  `;
}

function renderProfileMemorySection(localKeys) {
  return `
    <section class="profileCard">
      <div class="profileCardTitle">
        <span class="profileCardIcon">${iconHtml("database")}</span>
        <div><h2>Profile memory</h2><p>Save this device to your profile, or restore profile memory onto this device.</p></div>
      </div>
      <div class="profileButtonGrid">
        <button class="profilePrimaryBtn" id="btnProfileSaveMemory" type="button">${iconHtml("cloud-arrow-up")} Save this device memory</button>
        <button class="profilePrimaryBtn secondary" id="btnProfileRestoreMemory" type="button">${iconHtml("cloud-arrow-down")} Restore profile memory here</button>
      </div>
      <p class="profileDangerNote">${escapeHtml(String(localKeys))} BRMedia memory keys are currently saved in this profile snapshot.</p>
    </section>
  `;
}

function renderProfileStatBar(label, value, max, icon, orange = false) {
  const pct = max ? Math.max(4, Math.min(100, Math.round((Number(value || 0) / max) * 100))) : 4;
  return `
    <article class="profileStatBar ${orange ? "is-orange" : ""}">
      <span>${iconHtml(icon)}</span>
      <div><strong>${escapeHtml(label)}</strong><em>${escapeHtml(String(value || 0))}</em><i style="width:${pct}%"></i></div>
    </article>
  `;
}

function renderProfileStatsTopList(title, items = [], icon = "trophy") {
  const rows = Array.isArray(items)
    ? items.slice(0, 6)
    : [];

  return `
    <section class="profileStatsMiniPanel">
      <div class="profileStatsMiniHead">
        ${iconHtml(icon)}
        <strong>${escapeHtml(title)}</strong>
      </div>

      ${
        rows.length
          ? rows
              .map((item, index) => `
                <div class="profileStatsMiniRow">
                  <b>${index + 1}</b>
                  <span>${escapeHtml(item.label || "BRMedia item")}</span>
                  <em>${escapeHtml(String(item.value || 0))}</em>
                </div>
              `)
              .join("")
          : `
            <p class="profileStatsEmpty">
              No activity yet.
            </p>
          `
      }
    </section>
  `;
}

function renderProfileStatsTimeline(items = []) {
  const rows = Array.isArray(items)
    ? items.slice(-14)
    : [];

  const max = Math.max(
    1,
    ...rows.map(
      (item) => Number(item.value || 0)
    )
  );

  return `
    <section class="profileStatsTimelinePanel">
      <div class="profileStatsMiniHead">
        ${iconHtml("chart-column")}
        <strong>Last 14 days</strong>
      </div>

      <div class="profileStatsTimeline">
        ${
          rows.length
            ? rows
                .map((item) => `
                  <span
                    style="height:${Math.max(
                      8,
                      Math.round(
                        (
                          Number(item.value || 0) /
                          max
                        ) *
                        100
                      )
                    )}%"
                  >
                    <b>${escapeHtml(String(item.value || 0))}</b>
                    <em>${escapeHtml(item.label || "")}</em>
                  </span>
                `)
                .join("")
            : `
              <p class="profileStatsEmpty">
                No personal activity recorded yet.
              </p>
            `
        }
      </div>
    </section>
  `;
}

function renderProfileStatsSection(counts, recents, queueItems) {
  const progressEntries = Object
    .values(getProfileProgressStore() || {})
    .filter(Boolean);

  const partiallyPlayed = progressEntries
    .filter((item) =>
      Number(
        item?.time ||
        item?.position ||
        0
      ) > 0
    )
    .length;

  const summary = profileState.statsSummary || {};
  const metrics = summary.metrics || {};

  const max = Math.max(
    1,
    counts.audio,
    counts.video,
    counts.playlists,
    recents.length,
    queueItems.length,
    partiallyPlayed,
    counts.memory,
    Number(metrics.audioPlays || 0),
    Number(metrics.videoPlays || 0),
    Number(metrics.deviceHandoffs || 0)
  );

  return `
    <section class="profileCard profileStatsCard">
      <div class="profileCardTitle">
        <span class="profileCardIcon">
          ${iconHtml("chart-column")}
        </span>

        <div>
          <h2>Personal stats</h2>

          <p>
            Your profile-only BRMedia listening, watching,
            favourites, queue and device activity. These charts
            survive server restarts.
          </p>
        </div>
      </div>

      <div class="profileDeepStatsGrid">
        ${renderProfileStatBar("Audio plays", metrics.audioPlays || 0, max, "music")}
        ${renderProfileStatBar("Completed listens", metrics.audioCompleted || 0, max, "circle-check")}
        ${renderProfileStatBar("Video plays", metrics.videoPlays || 0, max, "film")}
        ${renderProfileStatBar("Completed watches", metrics.videoCompleted || 0, max, "circle-check")}
        ${renderProfileStatBar("Favourite adds", metrics.favouriteAdds || 0, max, "heart")}
        ${renderProfileStatBar("Queue adds", metrics.queueAdds || 0, max, "list-music")}
        ${renderProfileStatBar("Device handoffs", metrics.deviceHandoffs || 0, max, "mobile-screen")}
        ${renderProfileStatBar("Profile syncs", metrics.profileSyncs || 0, max, "cloud-arrow-up", true)}
      </div>
    </section>

    <section class="profileStatsChartGrid">
      ${renderProfileStatsTimeline(summary.timeline || [])}
      ${renderProfileStatsTopList("Top audio", summary.topAudio || [], "music")}
      ${renderProfileStatsTopList("Top videos", summary.topVideo || [], "film")}
    </section>

    <section class="profileCard profileStatsCard">
      <div class="profileCardTitle">
        <span class="profileCardIcon">
          ${iconHtml("database")}
        </span>

        <div>
          <h2>Saved profile snapshot</h2>

          <p>
            Local profile-memory counts remain visible alongside
            your permanent activity charts.
          </p>
        </div>
      </div>

      <div class="profileDeepStatsGrid">
        ${renderProfileStatBar("Audio favourites", counts.audio, max, "heart")}
        ${renderProfileStatBar("Video favourites", counts.video, max, "film")}
        ${renderProfileStatBar("Playlists", counts.playlists, max, "list-music")}
        ${renderProfileStatBar("Recently played", recents.length, max, "clock-rotate-left")}
        ${renderProfileStatBar("Queue items", queueItems.length, max, "list-music")}
        ${renderProfileStatBar("Saved progress", partiallyPlayed, max, "circle-play")}
        ${renderProfileStatBar("Memory keys", counts.memory, max, "database", true)}
      </div>
    </section>
  `;
}

function renderProfileInboxSection() {
  return `
    <section class="profileCard">
      <div class="profileCardTitle">
        <span class="profileCardIcon">${iconHtml("paper-plane")}</span>
        <div><h2>Send to profile inbox</h2><p>Send a note/payload to another BRMedia profile. Email alerts come in V2.</p></div>
      </div>
      <div class="profileFormGrid">
        <label>${iconHtml("user")} To profile<input id="profileSendTo" type="text" placeholder="username or email" /></label>
        <label>${iconHtml("heading")} Title<input id="profileSendTitle" type="text" placeholder="Open this mix / video later" /></label>
      </div>
      <label>${iconHtml("message")} Message<textarea id="profileSendMessage" rows="4" placeholder="This will appear when they log in."></textarea></label>
      <button class="profilePrimaryBtn" id="btnProfileSend" type="button">${iconHtml("paper-plane")} Send to inbox</button>
    </section>

    <section class="profileCard">
      <div class="profileCardTitle">
        <span class="profileCardIcon">${iconHtml("inbox")}</span>
        <div><h2>Inbox</h2><p>Queued profile messages and offline send-to-person items.</p></div>
      </div>
      ${profileState.inbox.length ? profileState.inbox.map((item) => `
        <article class="profileInboxItem">
          <strong>${escapeHtml(item.title || "Message")}</strong>
          <span>From ${escapeHtml(item.fromName || "BRMedia")} · ${new Date(item.createdAt || Date.now()).toLocaleString()}</span>
          <p>${escapeHtml(item.message || "")}</p>
        </article>
      `).join("") : `<p>No inbox messages yet.</p>`}
    </section>
  `;
}

function renderLoggedIn() {
  const profile = profileState.profile || {};
  const state = profileState.state || {};
  const localKeys = Object.keys(state.localStorage || {}).length;
  const favouriteAudio = getProfileFavouriteAudio();
  const favouriteVideos = getProfileFavouriteVideos();
  const playlists = getProfilePlaylists();
  const recents = getProfileRecents();
  const queueItems = getProfileQueue();
  const validSections = new Set(["overview", "audio", "video", "stats", "edit", "memory", "inbox"]);
  if (!validSections.has(profileState.profileSection)) profileState.profileSection = "overview";

  const counts = {
    memory: localKeys,
    audio: favouriteAudio.length,
    video: favouriteVideos.length,
    playlists: playlists.length,
  };

  const sectionHtml = profileState.profileSection === "audio"
    ? renderProfileAudioSection(favouriteAudio, playlists, recents, queueItems)
    : profileState.profileSection === "video"
      ? renderProfileVideoSection(favouriteVideos)
      : profileState.profileSection === "stats"
        ? renderProfileStatsSection(counts, recents, queueItems)
        : profileState.profileSection === "edit"
          ? renderProfileEditSection(profile)
          : profileState.profileSection === "memory"
            ? renderProfileMemorySection(localKeys)
            : profileState.profileSection === "inbox"
              ? renderProfileInboxSection()
              : renderProfileOverview(profile, counts);

  return `
    <section class="profileCard profileLoginCard profileAccountCard">
      <div class="profileCardTitle profileCardTitleCentre">
        <div class="profileAvatar">${renderProfileAvatar(profile)}</div>
        <div>
          <span class="profileKicker">Logged in</span>
          <h2>${escapeHtml(profile.displayName || profile.username || "BRMedia Profile")}</h2>
          <p>@${escapeHtml(profile.username || "")}${profile.email ? ` · ${escapeHtml(profile.email)}` : ""}</p>
        </div>
      </div>

      ${profileState.notice && profileState.profileSection !== "edit" ? `<div class="profileNotice">${escapeHtml(profileState.notice)}</div>` : ""}

      <section class="profileStats profileStatsTop">
        <button class="profileStatButton" data-profile-section="memory" type="button"><strong>${escapeHtml(String(localKeys))}</strong><span>memory keys</span></button>
        <button class="profileStatButton" data-profile-section="audio" type="button"><strong>${escapeHtml(String(favouriteAudio.length))}</strong><span>audio favourites</span></button>
        <button class="profileStatButton" data-profile-section="video" type="button"><strong>${escapeHtml(String(favouriteVideos.length))}</strong><span>video favourites</span></button>
        <button class="profileStatButton profileStatButtonOrange" data-profile-section="stats" type="button"><strong>${iconHtml("chart-column")}</strong><span>personal stats</span></button>
      </section>
    </section>

    ${getProfileSectionTabs()}

    <div class="profileSectionPanel">
      ${sectionHtml}
    </div>

    <button class="profileLogoutBtn" id="btnProfileLogout" type="button">${iconHtml("right-from-bracket")} Logout</button>
  `;
}

function renderProfile() {
  if (!profileRoot) return;

  profileRoot.innerHTML = profileState.loading
    ? `<section class="profileCard profileLoginCard"><div class="profileCardTitle profileCardTitleCentre"><span class="profileCardIcon">${iconHtml("spinner")}</span><div><span class="profileKicker">BRMedia Profile</span><h2>Loading profile…</h2><p>Checking your login and profile memory.</p></div></div></section>`
    : profileState.profile
      ? renderLoggedIn()
      : renderLoggedOut();

  document.querySelectorAll("[data-profile-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      profileState.mode = button.dataset.profileMode || "login";
      profileState.notice = "";
      renderProfile();
    });
  });

  document.getElementById("btnProfileLogin")?.addEventListener("click", loginProfile);
  document.getElementById("btnProfileRegister")?.addEventListener("click", registerProfile);
  document.getElementById("btnProfileLogout")?.addEventListener("click", logoutProfile);
  document.getElementById("btnProfileSaveMemory")?.addEventListener("click", saveDeviceMemory);
  document.getElementById("btnProfileRestoreMemory")?.addEventListener("click", restoreDeviceMemory);
  document.getElementById("btnProfileSend")?.addEventListener("click", sendProfileMessage);
  document.getElementById("btnProfileSaveAccount")?.addEventListener("click", saveProfileAccount);
  document.getElementById("btnProfileSaveAvatar")?.addEventListener("click", saveProfileAvatar);
  document.getElementById("profileAvatarFile")?.addEventListener("change", handleProfileAvatarUpload);

  document.querySelectorAll("[data-profile-section]").forEach((button) => {
    button.addEventListener("click", () => {
      profileState.profileSection = button.dataset.profileSection || "overview";
      profileState.notice = "";
      const url = new URL(window.location.href);
      url.searchParams.set("section", profileState.profileSection);
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
      renderProfile();
    });
  });

  ["profileLogin", "profilePassword"].forEach((id) => {
    document.getElementById(id)?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") loginProfile();
    });
  });

  ["profileNewUsername", "profileNewDisplayName", "profileNewEmail", "profileNewPassword"].forEach((id) => {
    document.getElementById(id)?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") registerProfile();
    });
  });

  bindProfileShellControls();
  hydrateProfileIcons();
}

loadProfile();