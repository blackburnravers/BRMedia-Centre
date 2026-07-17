(function () {
  const ICON_BASE_PATHS = ["/shared/icons/fa-duotone/", "/player/branding/icons/"];
  const iconSvgCache = new Map();

  const navItems = [
    { href: "/", label: "Home", sub: "BRMedia launcher", iconName: "house", badge: "HME" },
    { href: "/player", label: "Player", sub: "Music, mixes and playlists", iconName: "play", badge: "PLY" },
    { href: "/video-player", label: "Video Player", sub: "Films, shows and video library", iconName: "film", badge: "VID" },
    { href: "/converter", label: "Converter", sub: "Audio/video conversion", iconName: "right-left", badge: "CVT" },
    { href: "/tagger", label: "Tagger", sub: "Metadata and artwork", iconName: "tag", badge: "TAG" },
    { href: "/mastering", label: "Mastering", sub: "Loudness and polish", iconName: "sliders", badge: "MST" },
    { href: "/dj-mixer", label: "DJ Studio", sub: "Plan sets, prepare tracks and open DUO", iconName: "turntable", badge: "DJ" },
    { href: "/stats", label: "Stats", sub: "History and reports", iconName: "chart-column", badge: "STS" },
    { href: "/torrents", label: "Torrents", sub: "Legal torrents, queue and safe scanning", iconName: "magnet", badge: "TOR" },
    { href: "/settings", label: "Universal Settings", sub: "App preferences and modules", iconName: "gear-complex", badge: "SET" },
    { href: "/server-settings", label: "Server Settings", sub: "Sources, storage and admin", iconName: "server", badge: "SRV" },
  ];

  function normalisePath(pathname) {
    const clean = String(pathname || "/").replace(/\/+$/, "");
    if (clean === "/home") return "/";
    return clean || "/";
  }

  async function fetchIconText(iconName) {
    let lastError = null;

    for (const basePath of ICON_BASE_PATHS) {
      try {
        const res = await fetch(`${basePath}${iconName}.svg`, { cache: "force-cache" });

        if (res.ok) {
          return await res.text();
        }

        lastError = new Error(`Icon not found: ${basePath}${iconName}.svg`);
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error(`Icon not found: ${iconName}`);
  }

  async function loadIconSvg(iconName) {
    if (iconSvgCache.has(iconName)) return iconSvgCache.get(iconName);

    const promise = fetchIconText(iconName).then((text) => {
      const template = document.createElement("template");
      template.innerHTML = text.trim();
      const svg = template.content.querySelector("svg");
      if (!svg) throw new Error(`Invalid icon SVG: ${iconName}`);
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      svg.classList.add("brSvgIconSvg");
      return svg.outerHTML;
    });

    iconSvgCache.set(iconName, promise);
    return promise;
  }

  async function hydrateSharedNavIcons(root) {
    const hosts = Array.from((root || document).querySelectorAll("[data-br-shared-icon]"));

    await Promise.allSettled(hosts.map(async (host) => {
      if (!host || host.dataset.iconHydrated === "1") return;

      const iconName = host.getAttribute("data-br-shared-icon") || "";
      if (!iconName) return;

      try {
        const svg = await loadIconSvg(iconName);
        host.innerHTML = `<span class="brSvgIconHost">${svg}</span>`;
        host.dataset.iconHydrated = "1";
      } catch (err) {
        console.warn("Shared nav icon failed", iconName, err);
      }
    }));
  }

  function renderSharedNav(target, options = {}) {
    const host = typeof target === "string" ? document.querySelector(target) : target;
    if (!host) return;

    const current = normalisePath(options.currentPath || window.location.pathname);

    host.innerHTML = navItems.map((item) => {
      const active = normalisePath(item.href) === current ? " is-active" : "";
      return `
        <a class="brSharedNavLink${active}" href="${item.href}" data-path="${item.href}">
          <span class="brSharedNavIcon" aria-hidden="true" data-br-shared-icon="${item.iconName}">${item.badge}</span>
          <span class="brSharedNavText">
            <span class="brSharedNavTitle">${item.label}</span>
            <span class="brSharedNavSub">${item.sub}</span>
          </span>
        </a>
      `;
    }).join("");

    void hydrateSharedNavIcons(host);
  }

  window.BRMediaShared = window.BRMediaShared || {};
  window.BRMediaShared.navItems = navItems;
  window.BRMediaShared.renderSharedNav = renderSharedNav;
  window.BRMediaShared.hydrateSharedNavIcons = hydrateSharedNavIcons;
})();
