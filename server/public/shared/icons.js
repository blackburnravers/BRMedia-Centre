(function () {
const basePaths = ["/shared/icons/fa-duotone/", "/shared/icons/brands/"];

  const aliases = {
    "arrows-rotate": "arrow-rotate-right",
    "box-archive": "folder-open",
    "chart-pie": "chart-column",
    "circle-play": "circle-play",
    "cloud": "cloud",
    "dropbox": "dropbox",
    "file-audio": "file-audio",
    "film": "film",
    "floppy-disk": "floppy-disks",
    "gear": "gear-complex",
    "google-drive": "google-drive",
    "imdb": "imdb",
    "rt": "rottentomatoes",
    "rotten-tomatoes": "rottentomatoes",
    "rottentomatoes": "rottentomatoes",
    "tmdb": "tmdb",
    "x-twitter": "x-twitter",
    "facebook": "facebook",
    "instagram": "instagram",
    "tiktok": "tiktok",
    "youtube": "youtube",
    "home": "house",
    "magnifying-glass-chart": "magnifying-glass-chart",
    "mixcloud": "mixcloud",
    "mobile": "mobile-screen-button",
    "rotate-left": "arrow-rotate-left",
    "rotate-right": "arrow-rotate-right",
    "soundcloud": "soundcloud",
    "stopwatch-20": "stopwatch",
    "whatsapp": "whatsapp",
    "playlist": "list-music",
    "playlists": "list-music",
    "queue": "list-music",
    "recent": "clock-rotate-left",
    "recents": "clock-rotate-left",
  };

  const brandClasses = {
    "google-drive": "brIconBrandGoogleDrive",
    "dropbox": "brIconBrandDropbox",
    "soundcloud": "brIconBrandSoundcloud",
    "mixcloud": "brIconBrandMixcloud",
    "whatsapp": "whatsapp",
    "imdb": "brIconBrandImdb",
    "tmdb": "brIconBrandTmdb",
    "rottentomatoes": "brIconBrandRottenTomatoes",
    "facebook": "brIconBrandFacebook",
    "instagram": "brIconBrandInstagram",
    "x-twitter": "brIconBrandXTwitter",
    "tiktok": "brIconBrandTiktok",
    "youtube": "brIconBrandYouTube",
  };

  const ignoredFaClasses = new Set([
    "fa-solid",
    "fa-regular",
    "fa-brands",
    "fa-duotone",
    "fa-light",
    "fa-thin",
    "fa-sharp",
    "fa-spin",
    "fa-pulse",
    "fa-fw",
    "fa-lg",
    "fa-xl",
    "fa-2x",
  ]);

  const svgCache = new Map();
  let queue = [];
  let timer = null;

  function ensureSharedIconCss() {
    if (document.getElementById("brSharedIconDuotoneCss")) return;

    const style = document.createElement("style");
    style.id = "brSharedIconDuotoneCss";
    style.textContent = `
      .brSvgIconHost {
        --br-icon-primary: #ffffff;
        --br-icon-secondary: #f2a007;
        --br-icon-primary-opacity: 1;
        --br-icon-secondary-opacity: 1;
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        width: 1em;
        height: 1em;
        line-height: 1;
        color: var(--br-icon-secondary, currentColor);
        vertical-align: -0.125em;
      }
      .brSvgIconHost::before {
        content: none !important;
        display: none !important;
      }
      .brSvgIconHost svg {
        display: block;
        width: 1em;
        height: 1em;
        overflow: visible;
      }
      .brSvgIconHost svg .fa-primary {
        fill: var(--br-icon-primary, currentColor) !important;
        opacity: var(--br-icon-primary-opacity, 1) !important;
      }
      .brSvgIconHost svg .fa-secondary {
        fill: var(--br-icon-secondary, currentColor) !important;
        opacity: var(--br-icon-secondary-opacity, 1) !important;
      }
      .brSvgIconHost svg path:not(.fa-primary):not(.fa-secondary),
      .brSvgIconHost svg polygon:not(.fa-primary):not(.fa-secondary),
      .brSvgIconHost svg circle:not(.fa-primary):not(.fa-secondary),
      .brSvgIconHost svg rect:not(.fa-primary):not(.fa-secondary) {
        fill: currentColor !important;
      }
      .brSvgIconHost.brSvgIconDanger {
        --br-icon-primary: #ffffff;
        --br-icon-secondary: #ed2445;
        color: #ed2445;
      }
      .brSvgIconHost.brSvgIconMuted,
      [disabled] .brSvgIconHost,
      .disabledLike .brSvgIconHost {
        opacity: 0.5;
      }
    `;
    document.head.appendChild(style);
  }

  function getIconNameFromElement(el) {
    if (!el || !el.classList) return "";

    const iconClass = Array.from(el.classList).find((className) => (
      className.startsWith("fa-") && !ignoredFaClasses.has(className)
    ));

    return iconClass ? iconClass.replace(/^fa-/, "") : "";
  }

  function resolveSvgName(iconName = "") {
    const clean = String(iconName || "").replace(/^fa-/, "").trim();
    return aliases[clean] || clean;
  }

  function applyStateClasses(el, iconName, svgName) {
    if (!el) return;

    el.classList.add("brSvgIconHost");
    Object.values(brandClasses).forEach((className) => el.classList.remove(className));

    const brandClass = brandClasses[iconName] || brandClasses[svgName];
    if (brandClass) el.classList.add(brandClass);

    el.classList.toggle("brSvgIconDanger", ["trash", "trash-can"].includes(svgName));
    el.classList.toggle("brSvgIconMuted", el.closest(".disabledLike, [disabled], .is-disabled") !== null);
  }

  async function loadSvg(svgName = "") {
    const resolved = resolveSvgName(svgName);
    if (!resolved) throw new Error("Missing icon name");

    const cached = svgCache.get(resolved);
    if (cached) return cached;

    const promise = (async () => {
      let lastError = null;

      for (const basePath of basePaths) {
        try {
          const res = await fetch(`${basePath}${resolved}.svg`, { cache: "force-cache" });
          if (!res.ok) throw new Error(`Icon not found: ${basePath}${resolved}.svg`);

          const text = await res.text();
          const template = document.createElement("template");
          template.innerHTML = text.trim();

          const svg = template.content.querySelector("svg");
          if (!svg) throw new Error(`Invalid icon SVG: ${resolved}`);

          svg.setAttribute("aria-hidden", "true");
          svg.setAttribute("focusable", "false");
          svg.classList.add("brSvgIconSvg");

          return svg.outerHTML;
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError || new Error(`Icon not found: ${resolved}`);
    })();

    svgCache.set(resolved, promise);

    promise
      .then((svgText) => {
        if (svgCache.get(resolved) === promise) svgCache.set(resolved, svgText);
      })
      .catch(() => {});

    return promise;
  }

  async function hydrateIcon(el) {
    ensureSharedIconCss();
    if (!el || el.nodeType !== 1 || !el.matches?.("i[class*='fa-']")) return;

    const iconName = getIconNameFromElement(el);
    const svgName = resolveSvgName(iconName);
    if (!svgName) return;

    applyStateClasses(el, iconName, svgName);

    const cachedSvg = svgCache.get(svgName);
    if (typeof cachedSvg === "string") {
      if (el.dataset.brIconName === iconName && el.dataset.brIconSvg === svgName && el.dataset.brIconHydrated === "1") return;
      el.dataset.brIconName = iconName;
      el.dataset.brIconSvg = svgName;
      el.innerHTML = cachedSvg;
      el.dataset.brIconHydrated = "1";
      return;
    }

    if (el.dataset.brIconName === iconName && el.dataset.brIconSvg === svgName && el.dataset.brIconHydrated === "1") {
      return;
    }

    el.dataset.brIconName = iconName;
    el.dataset.brIconSvg = svgName;

    try {
      el.innerHTML = await loadSvg(svgName);
      el.dataset.brIconHydrated = "1";
    } catch {
      el.dataset.brIconHydrated = "0";
    }
  }

  function hydrate(root = document) {
    ensureSharedIconCss();
    const nodes = root?.matches?.("i[class*='fa-']")
      ? [root]
      : Array.from(root?.querySelectorAll?.("i[class*='fa-']") || []);

    if (!nodes.length) return;

    queue.push(...nodes);
    if (timer) return;

    const runBatch = () => {
      const batch = queue.splice(0, 48);
      batch.forEach((node) => void hydrateIcon(node));

      if (queue.length) {
        timer = window.setTimeout(runBatch, 0);
        return;
      }

      timer = null;
    };

    timer = window.setTimeout(runBatch, 0);
  }
	
  function safeHydrateIcons(root = document) {
    const target = root && root.nodeType === 1 ? root : document;
    const run = () => hydrate(target);

    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(run, { timeout: 900 });
      return;
    }

    window.setTimeout(run, 60);
  }

  function iconHtml(name = "") {
    return `<i class="fa-solid fa-${String(name || "circle")}"></i>`;
  }

  function addAliases(extraAliases = {}) {
    Object.assign(aliases, extraAliases || {});
  }

  const api = {
    aliases,
    basePaths,
    brandClasses,
    getIconNameFromElement,
    resolveSvgName,
    applyStateClasses,
    ensureSharedIconCss,
    loadSvg,
    hydrateIcon,
    hydrate,
    safeHydrateIcons,
    iconHtml,
    addAliases,
  };

  ensureSharedIconCss();

  window.BRMediaShared = window.BRMediaShared || {};
  window.BRMediaShared.icons = api;
  window.BRMediaIcons = api;
})();