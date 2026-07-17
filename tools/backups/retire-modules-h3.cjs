const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const serverRoot = fs.existsSync(path.join(projectRoot, "server", "public"))
  ? path.join(projectRoot, "server")
  : projectRoot;

const publicDir = path.join(serverRoot, "public");
const modulesDir = path.join(publicDir, "modules");
const backupDir = path.join(projectRoot, "tools", "backups", "modules-retired-h3");

if (!fs.existsSync(modulesDir)) {
  throw new Error("Could not find server/public/modules. Run this from BRMedia-Centre root.");
}

function backupAndMaybeRemove(fileName, remove = false) {
  const filePath = path.join(modulesDir, fileName);
  if (!fs.existsSync(filePath)) return;

  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(filePath, path.join(backupDir, fileName));

  if (remove) {
    fs.unlinkSync(filePath);
  }
}

backupAndMaybeRemove("app.js", true);
backupAndMaybeRemove("index.legacy-before-h1.html", true);
backupAndMaybeRemove("styles.legacy-before-h2.css", true);
backupAndMaybeRemove("index.html", false);
backupAndMaybeRemove("styles.css", false);

const indexHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>BRMedia Legacy Modules</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#182E5B" />
  <link rel="stylesheet" href="/modules/styles.css?v=20260510-h3" />
</head>
<body>
  <main class="legacyWrap">
    <section class="legacyCard">
      <div class="legacyEyebrow">BRMedia Legacy Fallback</div>
      <h1>Old modules shell retired</h1>
      <p>
        The old shared <code>/modules</code> shell has now been retired.
        Active BRMedia modules use their own folders, app files and styles.
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
        Old module files have been moved out of public serving and backed up in
        <code>tools/backups/modules-retired-h3/</code>.
      </div>
    </section>
  </main>
</body>
</html>
`;

const stylesCss = `/* BRMedia H3 retired modules notice only. Old module CSS moved to tools/backups/modules-retired-h3/. */
body {
  margin: 0;
  min-height: 100vh;
  color: #f7fbff;
  font-family: Arial, Helvetica, sans-serif;
  background:
    radial-gradient(circle at 12% 0%, rgba(255,159,28,0.18), transparent 30rem),
    linear-gradient(180deg, #102551 0%, #061124 100%);
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
`;

fs.writeFileSync(path.join(modulesDir, "index.html"), indexHtml, "utf8");
fs.writeFileSync(path.join(modulesDir, "styles.css"), stylesCss, "utf8");

const report = {
  patch: "H3",
  retiredAt: new Date().toISOString(),
  publicModulesKept: [
    "server/public/modules/index.html",
    "server/public/modules/styles.css",
  ],
  movedToBackup: [
    "app.js",
    "index.legacy-before-h1.html",
    "styles.legacy-before-h2.css",
  ],
  backupDir: path.relative(projectRoot, backupDir),
};

fs.writeFileSync(path.join(backupDir, "retire-report.json"), JSON.stringify(report, null, 2), "utf8");

console.log("BRMedia Patch H3 complete.");
console.log("Removed old retired /modules app.js and legacy CSS/HTML from public/modules.");
console.log("Kept only the lightweight /modules legacy notice page.");
console.log(`Backups saved to ${path.relative(projectRoot, backupDir)}.`);