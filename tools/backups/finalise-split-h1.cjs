const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const serverRoot = fs.existsSync(path.join(projectRoot, "server", "public"))
  ? path.join(projectRoot, "server")
  : projectRoot;

const publicDir = path.join(serverRoot, "public");
const srcIndexPath = path.join(serverRoot, "src", "index.ts");
const modulesDir = path.join(publicDir, "modules");
const modulesIndexPath = path.join(modulesDir, "index.html");
const backupDir = path.join(projectRoot, "tools", "backups", "modules-before-h1");

if (!fs.existsSync(publicDir)) {
  throw new Error("Could not find server/public. Run this from BRMedia-Centre root or server root.");
}

if (!fs.existsSync(srcIndexPath)) {
  throw new Error(`Missing ${srcIndexPath}`);
}

if (!fs.existsSync(modulesIndexPath)) {
  throw new Error(`Missing ${modulesIndexPath}`);
}

function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const rel = path.relative(serverRoot, filePath);
  const out = path.join(backupDir, rel);

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(filePath, out);
}

backupFile(srcIndexPath);
backupFile(modulesIndexPath);

const legacyIndexPath = path.join(modulesDir, "index.legacy-before-h1.html");

if (!fs.existsSync(legacyIndexPath)) {
  fs.copyFileSync(modulesIndexPath, legacyIndexPath);
}

let indexTs = fs.readFileSync(srcIndexPath, "utf8");

const routeKeys = [
  "/converter",
  "/tagger",
  "/mastering",
  "/video-player",
  "/stats",
  "/server-settings",
];

for (const route of routeKeys) {
  const routeBlockRegex = new RegExp(
    `("${route.replace("/", "\\/")}"\\s*:\\s*\\{[\\s\\S]*?fallbackToModules:\\s*)true(\\s*,[\\s\\S]*?\\n\\s*\\})`,
    "m"
  );

  if (!routeBlockRegex.test(indexTs)) {
    throw new Error(`Could not find fallbackToModules true block for ${route}`);
  }

  indexTs = indexTs.replace(routeBlockRegex, `$1false$2`);
}

fs.writeFileSync(srcIndexPath, indexTs, "utf8");

const legacyHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>BRMedia Legacy Modules</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#182E5B" />
  <link rel="stylesheet" href="/shared/shell.css?v=20260509-split-a" />
  <style>
    body {
      margin: 0;
      color: #f7fbff;
      font-family: Arial, Helvetica, sans-serif;
      background:
        radial-gradient(circle at 12% 0%, rgba(255,159,28,0.18), transparent 30rem),
        linear-gradient(180deg, #102551 0%, #061124 100%);
      min-height: 100vh;
    }

    .legacyWrap {
      width: min(980px, calc(100% - 24px));
      margin: 0 auto;
      padding: max(26px, env(safe-area-inset-top)) 0 42px;
    }

    .legacyCard {
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 30px;
      padding: clamp(20px, 4vw, 34px);
      background: rgba(11,24,50,0.82);
      box-shadow: 0 24px 70px rgba(0,0,0,0.34);
    }

    .legacyEyebrow {
      color: #ff9f1c;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 12px;
      font-weight: 900;
    }

    h1 {
      margin: 8px 0 10px;
      font-size: clamp(34px, 8vw, 68px);
      line-height: 0.9;
      letter-spacing: -0.06em;
    }

    p {
      max-width: 740px;
      color: rgba(247,251,255,0.7);
      line-height: 1.5;
    }

    .legacyGrid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 12px;
      margin-top: 20px;
    }

    .legacyLink {
      display: grid;
      gap: 7px;
      min-height: 112px;
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 22px;
      padding: 15px;
      color: #f7fbff;
      text-decoration: none;
      background: rgba(255,255,255,0.07);
    }

    .legacyLink span {
      width: 46px;
      height: 46px;
      display: grid;
      place-items: center;
      border-radius: 17px;
      color: #ff9f1c;
      background: rgba(255,255,255,0.09);
      font-weight: 1000;
      font-size: 12px;
      letter-spacing: 0.08em;
    }

    .legacyLink strong {
      font-size: 18px;
    }

    .legacyLink small {
      color: rgba(247,251,255,0.66);
      line-height: 1.35;
    }

    .legacyNote {
      margin-top: 18px;
      border: 1px dashed rgba(255,255,255,0.20);
      border-radius: 22px;
      padding: 14px;
      color: rgba(247,251,255,0.68);
      background: rgba(0,0,0,0.16);
    }

    code {
      color: #d9e8ff;
    }
  </style>
</head>
<body>
  <main class="legacyWrap">
    <section class="legacyCard">
      <div class="legacyEyebrow">BRMedia Legacy Fallback</div>
      <h1>Old modules shell retired</h1>
      <p>
        The old shared <code>/modules</code> shell has been retired from active routing.
        Each BRMedia module now has its own dedicated page, app file and styles.
      </p>

      <div class="legacyGrid">
        <a class="legacyLink" href="/player"><span>PLY</span><strong>Player</strong><small>Main audio player and library.</small></a>
        <a class="legacyLink" href="/mastering"><span>MST</span><strong>Mastering</strong><small>Dedicated mastering module.</small></a>
        <a class="legacyLink" href="/video-player"><span>VID</span><strong>Video Player</strong><small>Dedicated video player module.</small></a>
        <a class="legacyLink" href="/converter"><span>CVT</span><strong>Converter</strong><small>Dedicated converter module.</small></a>
        <a class="legacyLink" href="/tagger"><span>TAG</span><strong>Tagger</strong><small>Dedicated metadata/tagging module.</small></a>
        <a class="legacyLink" href="/stats"><span>STS</span><strong>Stats</strong><small>Dedicated stats dashboard.</small></a>
        <a class="legacyLink" href="/settings"><span>SET</span><strong>Settings</strong><small>Universal BRMedia settings.</small></a>
        <a class="legacyLink" href="/server-settings"><span>SRV</span><strong>Server Settings</strong><small>Server/admin control room.</small></a>
      </div>

      <div class="legacyNote">
        Original old shell backed up as <code>server/public/modules/index.legacy-before-h1.html</code>.
        The old <code>app.js</code> and <code>styles.css</code> are still present for now and can be removed in the final cleanup once everything has been tested again.
      </div>
    </section>
  </main>
</body>
</html>
`;

fs.writeFileSync(modulesIndexPath, legacyHtml, "utf8");

console.log("BRMedia Patch H1 complete.");
console.log("Dedicated routes no longer fall back to /modules.");
console.log("Old /modules/index.html backed up to server/public/modules/index.legacy-before-h1.html.");
console.log(`Extra backups saved to ${path.relative(projectRoot, backupDir)}.`);