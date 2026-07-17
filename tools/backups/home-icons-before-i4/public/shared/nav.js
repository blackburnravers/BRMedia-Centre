(function () {
  const navItems = [
    { href: "/home", label: "Home", sub: "BRMedia launcher", icon: "⌂" },
    { href: "/player", label: "Player", sub: "Music, mixes and playlists", icon: "♫" },
    { href: "/video-player", label: "Video Player", sub: "Films, shows and video library", icon: "▻" },
    { href: "/converter", label: "Converter", sub: "Audio/video conversion", icon: "↔" },
    { href: "/tagger", label: "Tagger", sub: "Metadata and artwork", icon: "#" },
    { href: "/mastering", label: "Mastering", sub: "Loudness and polish", icon: "≋" },
    { href: "/stats", label: "Stats", sub: "History and reports", icon: "▥" },
    { href: "/settings", label: "Settings", sub: "Universal app settings", icon: "⚙" },
    { href: "/server-settings", label: "Server Settings", sub: "Sources, storage and admin", icon: "▣" },
  ];

  function normalisePath(pathname) {
    const clean = String(pathname || "/").replace(/\/+$/, "");
    return clean || "/";
  }

  function renderSharedNav(target, options = {}) {
    const host = typeof target === "string" ? document.querySelector(target) : target;
    if (!host) return;

    const current = normalisePath(options.currentPath || window.location.pathname);

    host.innerHTML = navItems.map((item) => {
      const active = normalisePath(item.href) === current ? " is-active" : "";
      return `
        <a class="brSharedNavLink${active}" href="${item.href}" data-path="${item.href}">
          <span class="brSharedNavIcon" aria-hidden="true">${item.icon}</span>
          <span class="brSharedNavText">
            <span class="brSharedNavTitle">${item.label}</span>
            <span class="brSharedNavSub">${item.sub}</span>
          </span>
        </a>
      `;
    }).join("");
  }

  window.BRMediaShared = window.BRMediaShared || {};
  window.BRMediaShared.navItems = navItems;
  window.BRMediaShared.renderSharedNav = renderSharedNav;
})();