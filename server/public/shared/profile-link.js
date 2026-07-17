(() => {
  const PROFILE_AUTO_SYNC_INTERVAL_MS = 30000;
  let currentProfile = null;

  function iconHtml(name = "user") {
    if (window.BRMediaIcons?.iconHtml) return window.BRMediaIcons.iconHtml(name);
    return `<i class="fa-solid fa-${String(name || "user")}"></i>`;
  }

  function safeHydrateIcons(root = document) {
    try {
      if (window.BRMediaIcons?.safeHydrateIcons) {
        window.BRMediaIcons.safeHydrateIcons(root);
        return;
      }
      window.BRMediaIcons?.hydrate?.(root);
    } catch {}
  }

  function escapeHtml(value = "") {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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

  async function profileApi(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    return await res.json().catch(() => ({}));
  }

  function injectProfileLinkStyles() {
    if (document.getElementById("brProfileLinkStyles")) return;
    const style = document.createElement("style");
    style.id = "brProfileLinkStyles";
    style.textContent = `
      .brProfileSidebarIcon,
      .brProfileSettingsIcon {
        width: 32px;
        height: 32px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        color: #7bd0ff;
        background: rgba(31,169,255,0.12);
        border: 1px solid rgba(123,208,255,0.20);
      }
      .brProfileSidebarIcon img,
      .brProfileSettingsIcon img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: inherit;
      }
      .brProfileSidebarIcon .brSvgIconSvg,
      .brProfileSettingsIcon .brSvgIconSvg,
      .brProfileSidebarIcon i,
      .brProfileSettingsIcon i {
        width: 18px;
        height: 18px;
      }
      .brProfileHomeCard .brProfileHomeIcon {
        display: grid;
        place-items: center;
      }
      .brProfileHomeCard .brProfileHomeIcon img {
        width: 62px;
        height: 62px;
        object-fit: cover;
        border-radius: 24px;
        border: 1px solid rgba(123,208,255,0.28);
      }
      .brProfileHomeCard .brProfileHomeIcon .brSvgIconSvg,
      .brProfileHomeCard .brProfileHomeIcon i {
        width: 42px;
        height: 42px;
        color: #7bd0ff;
      }
      .brProfileSidebarSection {
        margin-top: 14px;
        padding-top: 14px;
        border-top: 1px solid rgba(123,208,255,0.18);
        display: grid;
        gap: 10px;
      }
      .brProfileSidebarHeading {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #f2a007;
        font-size: 0.72rem;
        font-weight: 1000;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
      .brProfileSidebarHeading::after {
        content: "";
        height: 1px;
        flex: 1;
        background: rgba(242,160,7,0.28);
      }
      .brProfileSidebarActions {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
      }
      .brProfileSidebarAction {
        min-height: 48px;
        border-radius: 16px;
        border: 1px solid rgba(123,208,255,0.16);
        background: rgba(5,15,35,0.28);
        display: grid;
        place-items: center;
        color: #7bd0ff;
        text-decoration: none;
      }
      .brProfileSidebarBtn {
        min-height: 78px !important;
        grid-template-columns: 66px minmax(0, 1fr) !important;
        gap: 12px !important;
        padding: 12px !important;
        border-radius: 24px !important;
        background: radial-gradient(circle at 90% 10%, rgba(31,169,255,0.14), transparent 34%), rgba(10,32,70,0.74) !important;
        border: 1px solid rgba(123,208,255,0.18) !important;
      }
      .brProfileSidebarBtn .brProfileSidebarIcon {
        width: 66px;
        height: 58px;
        border-radius: 20px;
        background: rgba(31,169,255,0.12);
      }
      .brProfileSidebarBtn .sidebarModuleTitle {
        font-size: 1rem !important;
        font-weight: 1000 !important;
      }
      .brProfileSidebarBtn .sidebarModuleSub {
        font-size: 0.78rem !important;
        line-height: 1.22 !important;
      }
      .brProfileSidebarAction .brSvgIconHost,
      .brProfileSidebarAction .brSvgIconSvg,
      .brProfileSidebarAction i {
        width: 19px;
        height: 19px;
        --br-icon-primary: #ffffff;
        --br-icon-secondary: #f2a007;
      }
      .brProfileSidebarSection {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid rgba(31,169,255,0.14);
      }
      .brProfileSidebarHeading {
        color: #f2a007;
        font-size: 0.78rem;
        font-weight: 1000;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }
      .brProfileSidebarBtn {
        min-height: 78px !important;
        grid-template-columns: 76px minmax(0, 1fr) !important;
        gap: 12px !important;
        padding: 12px !important;
        border-radius: 24px !important;
        width: 100% !important;
        background: radial-gradient(circle at 90% 10%, rgba(31,169,255,0.14), transparent 34%), rgba(10,32,70,0.74) !important;
        border: 1px solid rgba(123,208,255,0.18) !important;
      }
      .brProfileSidebarBtn .brProfileSidebarIcon {
        width: 76px !important;
        height: 70px !important;
        border-radius: 22px !important;
        background: rgba(31,169,255,0.12) !important;
      }
      .brProfileSidebarActions {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
      }
      .brProfileSidebarAction {
        min-height: 54px;
        border-radius: 18px;
      }

      /* Compact injected Profile card — match normal module rows */
      .brProfileSidebarBtn {
        min-height: 74px !important;
        grid-template-columns: 38px minmax(0, 1fr) !important;
        gap: 12px !important;
        padding: 12px 14px !important;
        border-radius: 22px !important;
        background: rgba(255,255,255,0.07) !important;
        border: 1px solid rgba(255,255,255,0.12) !important;
      }

      .brProfileSidebarBtn .brProfileSidebarIcon {
        width: 32px !important;
        height: 32px !important;
        min-width: 32px !important;
        min-height: 32px !important;
        border-radius: 14px !important;
      }
    `;
    document.head.appendChild(style);
  }

  function profileIconMarkup(profile = null, className = "brProfileSidebarIcon") {
    const avatar = String(profile?.avatar || "").trim();
    if (avatar) return `<span class="${className}"><img src="${escapeHtml(avatar)}" alt="" loading="lazy" /></span>`;
    return `<span class="${className}">${iconHtml(profile ? "circle-user" : "user-lock")}</span>`;
  }

  function addProfileLink(profile = null) {
    injectProfileLinkStyles();
    const loggedIn = !!profile;
    const title = loggedIn ? "Profile" : "Login";
    const sub = loggedIn ? `${profile.displayName || profile.username || "BRMedia"} · synced memory` : "Profiles, sync, inbox and devices.";

    document.querySelectorAll("[data-brmedia-profile-link]").forEach((node) => {
      const wrapper = node.closest?.(".brProfileSettingsGroup, .brProfileSidebarSection, .brProfileSidebarBtn, .brProfileHomeCard") || node;
      wrapper.remove?.();
    });

    document.querySelectorAll(".sidebarModuleBlock .sidebarModuleList").forEach((list) => {
      if (list.querySelector("[data-brmedia-profile-link]")) return;

      const section = document.createElement("section");
      section.className = "brProfileSidebarSection";
      section.dataset.brmediaProfileLink = "1";
      section.innerHTML = `
        <div class="brProfileSidebarHeading">Profile</div>
        <button class="sidebarModuleBtn brProfileSidebarBtn" type="button">
          ${profileIconMarkup(profile)}
          <span class="sidebarModuleText">
            <span class="sidebarModuleTitle">${escapeHtml(title)}</span>
            <span class="sidebarModuleSub">${escapeHtml(loggedIn ? `${profile.displayName || profile.username || "BRMedia"}'s synced memory, stats and profile space.` : "Login, profile memory, stats and profile sync.")}</span>
          </span>
        </button>
        <div class="brProfileSidebarActions" aria-label="Profile quick sections">
          <a class="brProfileSidebarAction" href="/profile?section=audio" aria-label="Profile audio" title="Audio profile">${iconHtml("music")}</a>
          <a class="brProfileSidebarAction" href="/profile?section=video" aria-label="Profile video" title="Video profile">${iconHtml("film")}</a>
          <a class="brProfileSidebarAction" href="/profile?section=stats" aria-label="Personal stats" title="Personal stats">${iconHtml("chart-column")}</a>
          <a class="brProfileSidebarAction" href="/profile?section=edit" aria-label="Edit profile" title="Edit profile">${iconHtml("user-gear")}</a>
        </div>
      `;
      section.querySelector(".brProfileSidebarBtn")?.addEventListener("click", () => {
        window.location.href = "/profile";
      });

      list.insertAdjacentElement("afterend", section);
      safeHydrateIcons(section);
    });

    document.querySelectorAll("#settingsSidebarTree").forEach((tree) => {
      if (tree.querySelector("[data-brmedia-profile-link]")) return;

      const wrap = document.createElement("div");
      wrap.className = "settingsSidebarGroup brProfileSettingsGroup";
      wrap.innerHTML = `
        <button class="sidebarNavBtn brProfileSettingsBtn" data-brmedia-profile-link="1" type="button">
          <span class="sidebarNavIconBadge">${profileIconMarkup(profile, "brProfileSettingsIcon")}</span>
          <span class="sidebarNavText">
            <span class="sidebarNavBtnTitle">${escapeHtml(title)}</span>
            <span class="sidebarNavBtnSub">${escapeHtml(sub)}</span>
          </span>
        </button>
      `;
      wrap.querySelector("button")?.addEventListener("click", () => {
        window.location.href = "/profile";
      });
      tree.appendChild(wrap);
      safeHydrateIcons(wrap);
    });

    document.querySelectorAll(".grid").forEach((grid) => {
      if (!document.body.classList.contains("homeSplashBody")) return;
      if (grid.querySelector("[data-brmedia-profile-link]")) return;

      const link = document.createElement("a");
      link.className = "card brProfileHomeCard";
      link.href = "/profile";
      link.dataset.brmediaProfileLink = "1";
      link.innerHTML = `
        <div class="icon brProfileHomeIcon" aria-hidden="true">${profileIconMarkup(profile, "brProfileHomeIconInner")}</div>
        <div class="label">${escapeHtml(title)}</div>
        <div class="hint">${loggedIn ? "Profile & sync" : "Login & sync"}</div>
      `;
      grid.appendChild(link);
      safeHydrateIcons(link);
    });
  }

  function restoreMissingProfileMemory(profile, state = {}) {
    if (!profile?.id || !state?.localStorage) return;

    const markerKey = "brmedia_profile_autorestore_v1";
    if (localStorage.getItem(markerKey) === profile.id) return;

    Object.entries(state.localStorage || {}).forEach(([key, value]) => {
      if (!key || typeof value !== "string") return;
      if (localStorage.getItem(key) !== null) return;
      localStorage.setItem(key, value);
    });

    localStorage.setItem(markerKey, profile.id);
  }

  async function autoSaveProfileMemory() {
    try {
      const me = await profileApi("/profile/me");
      if (!me?.loggedIn || !me?.profile) return;

      await profileApi("/profile/state", {
        method: "POST",
        body: JSON.stringify({
          localStorage: collectBrMediaLocalStorage(),
          settings: {
            autoSavedAt: Date.now(),
            page: window.location.pathname,
          },
        }),
      });
    } catch {}
  }

  function refreshProfileLinks() {
    addProfileLink(currentProfile);
  }

  window.BRMediaProfileLink = {
    refresh: refreshProfileLinks,
  };

  async function initProfileLink() {
    let profile = null;

    try {
      const me = await profileApi("/profile/me");
      profile = me?.profile || null;
      currentProfile = profile;

      if (profile) {
        const state = await profileApi("/profile/state");
        restoreMissingProfileMemory(profile, state?.state || {});
      }
    } catch {}

    addProfileLink(profile);

    if (profile) {
      window.setInterval(autoSaveProfileMemory, PROFILE_AUTO_SYNC_INTERVAL_MS);
      window.addEventListener("pagehide", () => {
        try {
          navigator.sendBeacon?.("/profile/state", new Blob([JSON.stringify({
            localStorage: collectBrMediaLocalStorage(),
            settings: { autoSavedAt: Date.now(), page: window.location.pathname },
          })], { type: "application/json" }));
        } catch {}
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initProfileLink);
  } else {
    initProfileLink();
  }
})();