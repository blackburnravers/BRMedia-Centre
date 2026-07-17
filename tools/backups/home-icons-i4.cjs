const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const serverRoot = fs.existsSync(path.join(projectRoot, "server", "public"))
  ? path.join(projectRoot, "server")
  : projectRoot;

const publicDir = path.join(serverRoot, "public");
const backupDir = path.join(projectRoot, "tools", "backups", "home-icons-before-i4");

const homeIndexPath = path.join(publicDir, "home", "index.html");
const homeStylesPath = path.join(publicDir, "home", "styles.css");
const sharedNavPath = path.join(publicDir, "shared", "nav.js");
const sharedShellPath = path.join(publicDir, "shared", "shell.css");

if (!fs.existsSync(publicDir)) throw new Error("Could not find server/public. Run this from BRMedia-Centre root or server root.");
if (!fs.existsSync(homeIndexPath)) throw new Error(`Missing ${homeIndexPath}`);
if (!fs.existsSync(homeStylesPath)) throw new Error(`Missing ${homeStylesPath}`);
if (!fs.existsSync(sharedNavPath)) throw new Error(`Missing ${sharedNavPath}`);
if (!fs.existsSync(sharedShellPath)) throw new Error(`Missing ${sharedShellPath}`);

function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const rel = path.relative(serverRoot, filePath);
  const out = path.join(backupDir, rel);

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(filePath, out);
}

for (const file of [homeIndexPath, homeStylesPath, sharedNavPath, sharedShellPath]) {
  backupFile(file);
}

/**
 * Home index
 */
let homeHtml = fs.readFileSync(homeIndexPath, "utf8");

homeHtml = homeHtml.replace(
  `<div class="headerLogoWrap">
    <img src="/home/blackburn-ravers-header.png?v=20260326" alt="The Blackburn Ravers" class="headerLogo" />
  </div>`,
  `<a class="headerLogoWrap headerLogoLink" href="/" aria-label="Open BRMedia Home">
    <img src="/home/blackburn-ravers-header.png?v=20260326" alt="The Blackburn Ravers" class="headerLogo" />
  </a>`
);

homeHtml = homeHtml.replace(
  `        <a class="card" href="/server-settings">
          <div class="icon" aria-hidden="true"><i class="fa-solid fa-gear"></i></div>
          <div class="label">Server Settings</div>
          <div class="hint">Sources & defaults</div>
        </a>`,
  `        <a class="card" href="/settings">
          <div class="icon" aria-hidden="true"><i class="fa-solid fa-gear"></i></div>
          <div class="label">Universal Settings</div>
          <div class="hint">Apps & preferences</div>
        </a>

        <a class="card" href="/server-settings">
          <div class="icon" aria-hidden="true"><i class="fa-solid fa-server"></i></div>
          <div class="label">Server Settings</div>
          <div class="hint">Sources & admin</div>
        </a>`
);

homeHtml = homeHtml.replace(
  `const BR_ICON_BASE_PATH = "/player/branding/icons/";`,
  `const BR_ICON_BASE_PATHS = ["/shared/icons/fa-duotone/", "/player/branding/icons/"];
      const BR_ICON_BASE_PATH = BR_ICON_BASE_PATHS[0];`
);

if (!homeHtml.includes("async function fetchBrIconSvgText(svgName)")) {
  const start = homeHtml.indexOf("      async function loadBrIconSvg(svgName)");
  const end = homeHtml.indexOf("      async function hydrateBrIcon(", start);

  if (start < 0 || end < 0) {
    throw new Error("Could not find Home icon loader block.");
  }

  const replacement = `      async function fetchBrIconSvgText(svgName) {
        const basePaths = Array.isArray(BR_ICON_BASE_PATHS) && BR_ICON_BASE_PATHS.length
          ? BR_ICON_BASE_PATHS
          : [BR_ICON_BASE_PATH || "/player/branding/icons/"];

        let lastError = null;

        for (const basePath of basePaths) {
          try {
            const res = await fetch(\`\${basePath}\${svgName}.svg\`, { cache: "force-cache" });

            if (res.ok) {
              return await res.text();
            }

            lastError = new Error(\`Icon not found: \${basePath}\${svgName}.svg\`);
          } catch (err) {
            lastError = err;
          }
        }

        throw lastError || new Error(\`Icon not found: \${svgName}\`);
      }

      async function loadBrIconSvg(svgName) {
        if (brIconSvgCache.has(svgName)) return brIconSvgCache.get(svgName);

        const promise = fetchBrIconSvgText(svgName)
          .then((text) => {
            const template = document.createElement("template");
            template.innerHTML = text.trim();
            const svg = template.content.querySelector("svg");
            if (!svg) throw new Error(\`Invalid icon SVG: \${svgName}\`);
            svg.setAttribute("aria-hidden", "true");
            svg.setAttribute("focusable", "false");
            svg.classList.add("brSvgIconSvg");
            return svg.outerHTML;
          });

        brIconSvgCache.set(svgName, promise);
        return promise;
      }

`;

  homeHtml = homeHtml.slice(0, start) + replacement + homeHtml.slice(end);
}

fs.writeFileSync(homeIndexPath, homeHtml, "utf8");

/**
 * Home CSS
 */
let homeCss = fs.readFileSync(homeStylesPath, "utf8");

const homeCssBlock = `
/* BRMedia I4 — clickable Home logo */
.headerLogoLink {
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}

.headerLogoLink:focus-visible {
  outline: 3px solid rgba(242, 160, 7, 0.75);
  outline-offset: 8px;
  border-radius: 22px;
}
`;

if (!homeCss.includes("BRMedia I4")) {
  homeCss = `${homeCss.trimEnd()}\n\n${homeCssBlock.trimStart()}`;
}

fs.writeFileSync(homeStylesPath, homeCss, "utf8");

/**
 * Shared nav now uses the same module icon choices as Home.
 */
const sharedNav = `(function () {
  const ICON_BASE_PATHS = ["/shared/icons/fa-duotone/", "/player/branding/icons/"];
  const iconSvgCache = new Map();

  const navItems = [
    { href: "/", label: "Home", sub: "BRMedia launcher", iconName: "house", badge: "HME" },
    { href: "/player", label: "Player", sub: "Music, mixes and playlists", iconName: "play", badge: "PLY" },
    { href: "/video-player", label: "Video Player", sub: "Films, shows and video library", iconName: "film", badge: "VID" },
    { href: "/converter", label: "Converter", sub: "Audio/video conversion", iconName: "right-left", badge: "CVT" },
    { href: "/tagger", label: "Tagger", sub: "Metadata and artwork", iconName: "tag", badge: "TAG" },
    { href: "/mastering", label: "Mastering", sub: "Loudness and polish", iconName: "sliders", badge: "MST" },
    { href: "/stats", label: "Stats", sub: "History and reports", iconName: "chart-column", badge: "STS" },
    { href: "/settings", label: "Universal Settings", sub: "App preferences and modules", iconName: "gear-complex", badge: "SET" },
    { href: "/server-settings", label: "Server Settings", sub: "Sources, storage and admin", iconName: "server", badge: "SRV" },
  ];

  function normalisePath(pathname) {
    const clean = String(pathname || "/").replace(/\\/+$/, "");
    if (clean === "/home") return "/";
    return clean || "/";
  }

  async function fetchIconText(iconName) {
    let lastError = null;

    for (const basePath of ICON_BASE_PATHS) {
      try {
        const res = await fetch(\`\${basePath}\${iconName}.svg\`, { cache: "force-cache" });

        if (res.ok) {
          return await res.text();
        }

        lastError = new Error(\`Icon not found: \${basePath}\${iconName}.svg\`);
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error(\`Icon not found: \${iconName}\`);
  }

  async function loadIconSvg(iconName) {
    if (iconSvgCache.has(iconName)) return iconSvgCache.get(iconName);

    const promise = fetchIconText(iconName).then((text) => {
      const template = document.createElement("template");
      template.innerHTML = text.trim();
      const svg = template.content.querySelector("svg");
      if (!svg) throw new Error(\`Invalid icon SVG: \${iconName}\`);
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
        host.innerHTML = \`<span class="brSvgIconHost">\${svg}</span>\`;
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
      return \`
        <a class="brSharedNavLink\${active}" href="\${item.href}" data-path="\${item.href}">
          <span class="brSharedNavIcon" aria-hidden="true" data-br-shared-icon="\${item.iconName}">\${item.badge}</span>
          <span class="brSharedNavText">
            <span class="brSharedNavTitle">\${item.label}</span>
            <span class="brSharedNavSub">\${item.sub}</span>
          </span>
        </a>
      \`;
    }).join("");

    void hydrateSharedNavIcons(host);
  }

  window.BRMediaShared = window.BRMediaShared || {};
  window.BRMediaShared.navItems = navItems;
  window.BRMediaShared.renderSharedNav = renderSharedNav;
  window.BRMediaShared.hydrateSharedNavIcons = hydrateSharedNavIcons;
})();
`;

fs.writeFileSync(sharedNavPath, sharedNav, "utf8");

/**
 * Shared shell CSS gains SVG icon support for nav.
 */
let shellCss = fs.readFileSync(sharedShellPath, "utf8");

const shellCssBlock = `
/* BRMedia I4 — shared nav SVG icon support */
.brSharedNavIcon .brSvgIconHost {
  --br-icon-primary: #ffffff;
  --br-icon-secondary: var(--br-orange);
  --br-icon-primary-opacity: 1;
  --br-icon-secondary-opacity: 1;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.brSharedNavIcon .brSvgIconSvg {
  display: block;
  width: 26px;
  height: 26px;
  overflow: visible;
}

.brSharedNavIcon .brSvgIconSvg .fa-primary {
  fill: var(--br-icon-primary) !important;
  opacity: var(--br-icon-primary-opacity) !important;
}

.brSharedNavIcon .brSvgIconSvg .fa-secondary {
  fill: var(--br-icon-secondary) !important;
  opacity: var(--br-icon-secondary-opacity) !important;
}

.brSharedNavIcon .brSvgIconSvg path:not(.fa-primary):not(.fa-secondary),
.brSharedNavIcon .brSvgIconSvg polygon:not(.fa-primary):not(.fa-secondary),
.brSharedNavIcon .brSvgIconSvg circle:not(.fa-primary):not(.fa-secondary),
.brSharedNavIcon .brSvgIconSvg rect:not(.fa-primary):not(.fa-secondary) {
  fill: currentColor !important;
}
`;

if (!shellCss.includes("BRMedia I4")) {
  shellCss = `${shellCss.trimEnd()}\n\n${shellCssBlock.trimStart()}`;
}

fs.writeFileSync(sharedShellPath, shellCss, "utf8");

/**
 * Cache-bust shared nav on pages that use it.
 */
const cacheBustTargets = [
  path.join(publicDir, "settings", "index.html"),
  path.join(publicDir, "server-settings", "index.html"),
  path.join(publicDir, "stats", "index.html"),
];

for (const filePath of cacheBustTargets) {
  if (!fs.existsSync(filePath)) continue;

  backupFile(filePath);
  let html = fs.readFileSync(filePath, "utf8");

  html = html
    .replace(/\/shared\/nav\.js\?v=[^"]+/g, "/shared/nav.js?v=20260510-i4")
    .replace(/\/shared\/shell\.css\?v=[^"]+/g, "/shared/shell.css?v=20260510-i4");

  fs.writeFileSync(filePath, html, "utf8");
}

const report = {
  patch: "I4",
  updatedAt: new Date().toISOString(),
  changes: [
    "Added Universal Settings tile to Home.",
    "Made Home header logo clickable to /.",
    "Changed Home Server Settings tile to use fa-server.",
    "Updated Home icon loader to use /shared/icons/fa-duotone first with Player fallback.",
    "Updated shared nav to use consistent Home-style module icons.",
    "Added SVG icon styling to shared shell nav.",
  ],
};

fs.mkdirSync(backupDir, { recursive: true });
fs.writeFileSync(path.join(backupDir, "home-icons-i4-report.json"), JSON.stringify(report, null, 2), "utf8");

console.log("BRMedia Patch I4 complete.");
console.log("Home now has Universal Settings tile, clickable logo, and Server Settings uses server icon.");
console.log("Shared nav now uses the same module icon choices as Home, loading from shared icons first.");
console.log(`Backups saved to ${path.relative(projectRoot, backupDir)}.`);