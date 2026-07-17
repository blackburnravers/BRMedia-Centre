const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const serverRoot = fs.existsSync(path.join(projectRoot, "server", "public")) ? path.join(projectRoot, "server") : projectRoot;
const publicDir = path.join(serverRoot, "public");
const backupDir = path.join(projectRoot, "tools", "backups", "settings-before-f4");

if (!fs.existsSync(publicDir)) throw new Error("Could not find server/public. Run this from BRMedia-Centre root.");

function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const rel = path.relative(projectRoot, filePath);
  const out = path.join(backupDir, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(filePath, out);
}

function replaceAll(text, from, to) {
  return text.split(from).join(to);
}

const settingsAppPath = path.join(publicDir, "settings", "app.js");
if (!fs.existsSync(settingsAppPath)) throw new Error(`Missing ${settingsAppPath}`);

backupFile(settingsAppPath);
let app = fs.readFileSync(settingsAppPath, "utf8");

app = app.replace("const EXPORT_VERSION = 2;", "const EXPORT_VERSION = 4;");
app = app.replace("const EXPORT_VERSION = 3;", "const EXPORT_VERSION = 4;");

app = app.replace(
  '<span class="settingsRailIcon">${escapeHtml(tab.icon || "?")}</span>',
  '<span class="settingsRailIcon">${escapeHtml(safeBadge(tab.icon, tab.label?.slice(0, 3)))}</span>'
);

app = app.replace(
  '<span class="settingsRailIcon">${escapeHtml(tab.icon || "•")}</span>',
  '<span class="settingsRailIcon">${escapeHtml(safeBadge(tab.icon, tab.label?.slice(0, 3)))}</span>'
);

const actionIconReplacements = [
  [
    '{ href: "/player", label: "Open Player", body: "Music, mixes and tracklists", icon: "SET" }',
    '{ href: "/player", label: "Open Player", body: "Music, mixes and tracklists", icon: "PLY" }',
  ],
  [
    '{ href: "/video-player", label: "Open Video Player", body: "Poster wall and watch page", icon: "SET" }',
    '{ href: "/video-player", label: "Open Video Player", body: "Poster wall and watch page", icon: "VID" }',
  ],
  [
    '{ href: "/converter", label: "Open Converter", body: "Formats, trim and output jobs", icon: "SET" }',
    '{ href: "/converter", label: "Open Converter", body: "Formats, trim and output jobs", icon: "CVT" }',
  ],
  [
    '{ href: "/mastering", label: "Open Mastering", body: "Render polished mastered copies", icon: "SET" }',
    '{ href: "/mastering", label: "Open Mastering", body: "Render polished mastered copies", icon: "MST" }',
  ],
  [
    '{ href: labels[2], label: `Open ${labels[0]}`, body: labels[1], icon: "SET" }',
    '{ href: labels[2], label: `Open ${labels[0]}`, body: labels[1], icon: tabId === "google-drive" ? "GDR" : tabId === "dropbox" ? "DBX" : "URL" }',
  ],
  [
    '{ href: "/server-settings", label: "Open Server Settings", body: "Deeper admin, storage and networking", icon: "SET" }',
    '{ href: "/server-settings", label: "Open Server Settings", body: "Deeper admin, storage and networking", icon: "SRV" }',
  ],
];

for (const [from, to] of actionIconReplacements) {
  app = replaceAll(app, from, to);
}

app = app.replace(
  "These F2 controls save locally until backend config wiring is added.",
  "These F4 controls save locally until backend config wiring is added."
);

app = app.replace(
  "F2 adds local export/import and safer badges.",
  "F4 adds safer badges and module settings handoffs."
);

fs.writeFileSync(settingsAppPath, app, "utf8");

const settingsIndexPath = path.join(publicDir, "settings", "index.html");

if (fs.existsSync(settingsIndexPath)) {
  backupFile(settingsIndexPath);
  let html = fs.readFileSync(settingsIndexPath, "utf8");

  html = html
    .replace(/\/settings\/app\.js\?v=[^"]+/g, "/settings/app.js?v=20260510-f4")
    .replace(/\/settings\/styles\.css\?v=[^"]+/g, "/settings/styles.css?v=20260510-f4")
    .replace(/\/settings\/site\.webmanifest\?v=[^"]+/g, "/settings/site.webmanifest?v=20260510-f4");

  fs.writeFileSync(settingsIndexPath, html, "utf8");
}

const settingsCssPath = path.join(publicDir, "settings", "styles.css");

if (fs.existsSync(settingsCssPath)) {
  backupFile(settingsCssPath);
  let css = fs.readFileSync(settingsCssPath, "utf8");
  const marker = "/* BRMedia Universal Settings F4 */";

  const block = `
${marker}
.settingsRailIcon,
.settingsActionCard > span,
.settingsModuleCard > span,
.settingsUtilityCard span,
.settingsBackupBtn span {
  overflow: hidden;
  white-space: nowrap;
}

.settingsActivePanel {
  align-content: start;
}
`;

  if (css.includes(marker)) {
    css = css.replace(new RegExp(`${marker}[\\s\\S]*$`), block.trimStart());
  } else {
    css = `${css.trimEnd()}\n\n${block.trimStart()}`;
  }

  fs.writeFileSync(settingsCssPath, css, "utf8");
}

const modules = [
  {
    folder: "converter",
    tab: "converter",
    label: "Converter Settings",
    badge: "CVT",
    body: "Defaults, formats and output preferences.",
  },
  {
    folder: "tagger",
    tab: "tagger",
    label: "Tagger Settings",
    badge: "TAG",
    body: "Metadata, artwork and BRMedia tag defaults.",
  },
  {
    folder: "mastering",
    tab: "mastering",
    label: "Mastering Settings",
    badge: "MST",
    body: "Presets, loudness and render defaults.",
  },
  {
    folder: "video-player",
    tab: "video",
    label: "Video Settings",
    badge: "VID",
    body: "Video source, resume and subtitle defaults.",
  },
];

const moduleCss = `

/* BRMedia split F4 — module settings handoff */
.moduleSettingsHandoff {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 14px 0 18px;
}

.moduleSettingsHandoffBtn {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 11px;
  align-items: center;
  min-height: 66px;
  padding: 10px;
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 20px;
  color: inherit;
  text-decoration: none;
  background: rgba(255,255,255,0.065);
}

.moduleSettingsHandoffBtn span {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  color: #F2A007;
  background: rgba(255,255,255,0.09);
  font-size: 11px;
  font-weight: 1000;
  letter-spacing: 0.08em;
}

.moduleSettingsHandoffBtn strong,
.moduleSettingsHandoffBtn small {
  display: block;
}

.moduleSettingsHandoffBtn small {
  margin-top: 3px;
  color: rgba(247,251,255,0.68);
  line-height: 1.25;
}

@media (max-width: 680px) {
  .moduleSettingsHandoff {
    grid-template-columns: 1fr;
  }
}
`;

for (const mod of modules) {
  const indexPath = path.join(publicDir, mod.folder, "index.html");
  const stylePath = path.join(publicDir, mod.folder, "styles.css");

  if (!fs.existsSync(indexPath)) continue;

  backupFile(indexPath);
  let html = fs.readFileSync(indexPath, "utf8");

  html = html.replace(
    /href="\/settings" data-path="\/settings"/g,
    `href="/settings?tab=${mod.tab}" data-path="/settings"`
  );

  if (!html.includes("moduleSettingsHandoff")) {
    const handoff = `

        <div class="moduleSettingsHandoff">
          <a class="moduleSettingsHandoffBtn" href="/settings?tab=${mod.tab}"><span>${mod.badge}</span><div><strong>${mod.label}</strong><small>${mod.body}</small></div></a>
          <a class="moduleSettingsHandoffBtn" href="/server-settings"><span>SRV</span><div><strong>Server Settings</strong><small>Sources, storage and deeper admin.</small></div></a>
        </div>`;

    html = html.replace(/(        <div id="moduleTrackPanel")/, `${handoff}\n\n$1`);
  }

  fs.writeFileSync(indexPath, html, "utf8");

  if (fs.existsSync(stylePath)) {
    backupFile(stylePath);
    let style = fs.readFileSync(stylePath, "utf8");

    if (!style.includes("BRMedia split F4")) {
      style = `${style.trimEnd()}${moduleCss}`;
      fs.writeFileSync(stylePath, style, "utf8");
    }
  }
}

console.log("BRMedia Patch F4 complete.");
console.log("Universal Settings badges fixed, module pages now link to their own settings tabs, and module setting handoff cards were added.");
console.log(`Backups saved to ${path.relative(projectRoot, backupDir)}`);