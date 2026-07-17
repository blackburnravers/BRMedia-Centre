const fs = require("fs");
const path = require("path");

const root = process.cwd();
const backupDir = path.join(root, "tools", "backups", "settings-before-f2");
const schemaPath = path.join(root, "server", "public", "shared", "settings-schema.js");
const appPath = path.join(root, "server", "public", "settings", "app.js");
const cssPath = path.join(root, "server", "public", "settings", "styles.css");
const indexPath = path.join(root, "server", "public", "settings", "index.html");

function backup(filePath) {
  if (!fs.existsSync(filePath)) return;
  const rel = path.relative(root, filePath);
  const out = path.join(backupDir, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(filePath, out);
}

for (const p of [schemaPath, appPath, cssPath, indexPath]) backup(p);

if (!fs.existsSync(schemaPath)) throw new Error(`Missing ${schemaPath}`);
if (!fs.existsSync(appPath)) throw new Error(`Missing ${appPath}`);
if (!fs.existsSync(cssPath)) throw new Error(`Missing ${cssPath}`);

let schema = fs.readFileSync(schemaPath, "utf8");
const tabIcons = {
  general: "GEN",
  player: "PLY",
  video: "VID",
  converter: "CVT",
  tagger: "TAG",
  mastering: "MST",
  devices: "DEV",
  backup: "BAK",
  "google-drive": "GDR",
  dropbox: "DBX",
  import: "URL",
  sources: "SRC",
  server: "SRV",
};

for (const [id, icon] of Object.entries(tabIcons)) {
  schema = schema.replace(new RegExp(`(\\{ id: "${id}"[^\\n]*?icon: )"[^"]*"`), `$1"${icon}"`);
}

const cardIcons = { player: "PLY", video: "VID", converter: "CVT", tagger: "TAG", mastering: "MST", stats: "STS" };

for (const [id, icon] of Object.entries(cardIcons)) {
  schema = schema.replace(new RegExp(`(\\{ id: "${id}"(?![^\\n]*icon:)[^\\n]*?)(label:)`), `$1icon: "${icon}", $2`);
}

fs.writeFileSync(schemaPath, schema, "utf8");

let app = fs.readFileSync(appPath, "utf8");

if (!app.includes("const EXPORT_VERSION = 2;")) {
  app = app.replace('const STORAGE_KEY = "brmedia_universal_settings_v1";', 'const STORAGE_KEY = "brmedia_universal_settings_v1";\n  const EXPORT_VERSION = 2;');
}

if (!app.includes("const sectionLinkText =")) {
  app = app.replace(/  const sectionLinks = \{[\s\S]*?\n  \};/, `$&

  const sectionLinkText = {
    general: "Stay here",
    player: "Open Player",
    video: "Open Video Player",
    converter: "Open Converter",
    tagger: "Open Tagger",
    mastering: "Open Mastering",
    devices: "Device settings",
    backup: "Open Backup tools",
    "google-drive": "Open Drive tools",
    dropbox: "Open Dropbox tools",
    import: "Open Import tools",
    sources: "Open Server Settings",
    server: "Open Server Settings",
  };`);
}

if (!app.includes("function safeBadge(")) {
  app = app.replace(/  function setActiveTabId\(tabId\) \{[\s\S]*?\n  \}/, `$&

  function safeBadge(value, fallback = "SET") {
    const cleaned = String(value || fallback).trim().replace(/[^A-Za-z0-9#]/g, "").slice(0, 4);
    return cleaned || fallback;
  }

  function showSettingsToast(title = "Saved", body = "") {
    let toast = document.querySelector("[data-settings-toast]");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "settingsToast";
      toast.setAttribute("data-settings-toast", "");
      document.body.appendChild(toast);
    }

    toast.innerHTML = "<strong>" + escapeHtml(title) + "</strong>" + (body ? "<span>" + escapeHtml(body) + "</span>" : "");
    toast.classList.add("is-visible");
    window.clearTimeout(showSettingsToast.timer);
    showSettingsToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 1900);
  }

  function renderSettingsHealth() {
    const stored = readSettings();
    const sourceCount = window.BRMediaShared?.sources?.getSources?.().length || 0;
    document.querySelectorAll("[data-settings-health]").forEach((el) => {
      const type = el.getAttribute("data-settings-health");
      if (type === "saved") el.textContent = stored.__updatedAt ? "Saved locally" : "Ready";
      if (type === "sources") el.textContent = sourceCount + " sources";
      if (type === "version") el.textContent = "Settings v" + EXPORT_VERSION;
    });
  }`);
}

app = app.replace(
  'stored[key] = value;\n    writeSettings(stored);',
  'stored[key] = value;\n    stored.__updatedAt = new Date().toISOString();\n    writeSettings(stored);\n    showSettingsToast("Saved", "Universal Settings updated.");\n    renderSettingsHealth();'
);

app = app.replace('${escapeHtml(tab.icon || "?")}', '${escapeHtml(safeBadge(tab.icon, tab.label?.slice(0, 3)))}');
app = app.replace('${escapeHtml(action.icon || "?")}', '${escapeHtml(safeBadge(action.icon, action.label?.slice(0, 3)))}');
app = app.replace('${escapeHtml(card.label.slice(0, 1))}', '${escapeHtml(safeBadge(card.icon, card.label.slice(0, 3)))}');

app = app.replace(
  /activeLink\.textContent = tab\.id === "server" \? "Open Server Settings" : "Open related page";/,
  'activeLink.textContent = sectionLinkText[tab.id] || "Open related page";'
);

if (!app.includes("function renderSettingsUtilityPanel")) {
  app = app.replace(/  function renderSourceSettings\(\) \{/, `  function renderSettingsUtilityPanel() {
    return \`
      <div class="settingsUtilityPanel">
        <div class="settingsUtilityCard"><span>State</span><strong data-settings-health="saved">Ready</strong><small>These F2 controls save locally until backend config wiring is added.</small></div>
        <div class="settingsUtilityCard"><span>Sources</span><strong data-settings-health="sources">Sources</strong><small>Shared source manager is available to Settings.</small></div>
        <div class="settingsUtilityCard"><span>Build</span><strong data-settings-health="version">Settings</strong><small>F2 adds local export/import and safer badges.</small></div>
      </div>
    \`;
  }

$&`);
}

if (!app.includes("function renderBackupTools")) {
  app = app.replace(/  function renderTabPanel\(tabId\) \{/, `  function renderBackupTools() {
    return \`
      <div class="settingsBackupTools">
        <button class="settingsBackupBtn" type="button" data-export-settings><span>EXP</span><strong>Export Universal Settings</strong><small>Downloads current Universal Settings and source overrides as JSON.</small></button>
        <button class="settingsBackupBtn" type="button" data-import-settings><span>IMP</span><strong>Import Universal Settings</strong><small>Restore a previously exported Settings JSON file.</small></button>
        <button class="settingsBackupBtn danger" type="button" data-reset-settings><span>RST</span><strong>Reset Universal Settings</strong><small>Clears only this Universal Settings local store.</small></button>
        <input class="hidden" type="file" accept="application/json,.json" data-import-settings-file />
      </div>
    \`;
  }

$&`);
}

if (!app.includes('const utility = renderSettingsUtilityPanel();')) {
  app = app.replace(
    'function renderTabPanel(tabId) {\n',
    'function renderTabPanel(tabId) {\n    const utility = renderSettingsUtilityPanel();\n'
  );
}

app = app.replace(/return `\n        <div class="settingsCardGrid">/g, 'return `\n        ${utility}\n        <div class="settingsCardGrid">');

app = app.replace(
  'if (tabId === "sources") return renderSourceSettings();',
  'if (tabId === "sources") return `${utility}${renderSourceSettings()}`;'
);

app = app.replace(
  '${renderActionGrid([{ href: "/player?settings=backup", label: "Open Player Backup", body: "Use the current working backup tools", icon: "?" }])}',
  '${renderBackupTools()}\n        ${renderActionGrid([{ href: "/player?settings=backup", label: "Open Player Backup", body: "Use the current working backup tools", icon: "BAK" }])}'
);

app = app.replace(/icon: "\?"/g, 'icon: "SET"');

if (!app.includes("function exportSettings()")) {
  app = app.replace(/  function bindPanelControls\(\) \{/, `  function exportSettings() {
    const payload = {
      app: "BRMedia Centre",
      type: "universal-settings",
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      settings: readSettings(),
      sourceOverrides: {},
    };

    try { payload.sourceOverrides = JSON.parse(localStorage.getItem("brmedia_shared_sources_v1") || "{}"); } catch {}

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brmedia-universal-settings-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 700);
    showSettingsToast("Export ready", "Universal Settings JSON downloaded.");
  }

  async function importSettingsFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data?.type !== "universal-settings" || !data.settings) throw new Error("That is not a BRMedia Universal Settings export.");
      writeSettings({ ...data.settings, __updatedAt: new Date().toISOString() });
      if (data.sourceOverrides) localStorage.setItem("brmedia_shared_sources_v1", JSON.stringify(data.sourceOverrides));
      showSettingsToast("Imported", "Universal Settings restored.");
      updateTab(getActiveTabId(), false);
    } catch (err) {
      showSettingsToast("Import failed", err?.message || "Could not import settings.");
    }
  }

$&`);
}

if (!app.includes("[data-export-settings]")) {
  app = app.replace(/    activePanel\?\.querySelector\("\[data-reset-sources\]"\)\?\.addEventListener\("click", \(\) => \{[\s\S]*?\n    \}\);/, `$&

    activePanel?.querySelector("[data-export-settings]")?.addEventListener("click", exportSettings);
    const importInput = activePanel?.querySelector("[data-import-settings-file]");
    activePanel?.querySelector("[data-import-settings]")?.addEventListener("click", () => importInput?.click());
    importInput?.addEventListener("change", () => void importSettingsFile(importInput.files?.[0]));

    activePanel?.querySelector("[data-reset-settings]")?.addEventListener("click", () => {
      if (!window.confirm("Reset only the Universal Settings local store? This will not delete your music, videos, modules or server data.")) return;
      localStorage.removeItem(STORAGE_KEY);
      showSettingsToast("Settings reset", "Universal Settings local values cleared.");
      updateTab(getActiveTabId(), false);
    });`);
}

app = app.replace(
  /input\.addEventListener\("input", \(\) => \{\n        if \(input\.type !== "checkbox"\) setValue\(input\.dataset\.settingKey \|\| "", input\.value\);\n      \}\);/,
  'input.addEventListener("input", () => {\n        if (input.type !== "checkbox") {\n          const stored = readSettings();\n          stored[input.dataset.settingKey || ""] = input.value;\n          stored.__updatedAt = new Date().toISOString();\n          writeSettings(stored);\n          renderSettingsHealth();\n        }\n      });\n      input.addEventListener("blur", () => {\n        if (input.type !== "checkbox") showSettingsToast("Saved", "Universal Settings updated.");\n      });'
);

app = app.replace(
  /window\.BRMediaShared\?\.sources\?\.updateSource\?\.\(input\.dataset\.sourcePath \|\| "", \{ path: input\.value \}\);/,
  'window.BRMediaShared?.sources?.updateSource?.(input.dataset.sourcePath || "", { path: input.value });\n        renderSettingsHealth();'
);

app = app.replace(
  /updateTab\("sources", false\);\n    \}\);/,
  'showSettingsToast("Sources reset", "Default source paths restored.");\n      updateTab("sources", false);\n    });'
);

app = app.replace(
  'bindPanelControls();\n    }\n  }',
  'bindPanelControls();\n      renderSettingsHealth();\n    }\n  }'
);

fs.writeFileSync(appPath, app, "utf8");

if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, "utf8");
  html = html
    .replace(/\/shared\/settings-schema\.js\?v=[^"]+/g, "/shared/settings-schema.js?v=20260510-f2")
    .replace(/\/settings\/app\.js\?v=[^"]+/g, "/settings/app.js?v=20260510-f2")
    .replace(/\/settings\/styles\.css\?v=[^"]+/g, "/settings/styles.css?v=20260510-f2");
  fs.writeFileSync(indexPath, html, "utf8");
}

let css = fs.readFileSync(cssPath, "utf8");
const marker = "/* BRMedia Universal Settings F2 */";
const block = `
${marker}
.settingsRailIcon,
.settingsActionCard > span,
.settingsModuleCard > span {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.settingsUtilityPanel,
.settingsBackupTools {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.settingsUtilityCard,
.settingsBackupBtn {
  border: 1px solid rgba(255,255,255,0.13);
  border-radius: 22px;
  padding: 15px;
  background: rgba(255,255,255,0.07);
  color: var(--br-text);
}

.settingsUtilityCard span,
.settingsBackupBtn span {
  display: inline-grid;
  min-width: 42px;
  min-height: 32px;
  place-items: center;
  border-radius: 13px;
  margin-bottom: 9px;
  color: var(--br-orange);
  background: rgba(255,255,255,0.08);
  font-size: 11px;
  font-weight: 1000;
  letter-spacing: 0.08em;
}

.settingsUtilityCard strong,
.settingsBackupBtn strong {
  display: block;
  margin-bottom: 5px;
}

.settingsUtilityCard small,
.settingsBackupBtn small {
  display: block;
  color: var(--br-muted);
  line-height: 1.35;
}

.settingsBackupBtn {
  text-align: left;
  font: inherit;
  cursor: pointer;
}

.settingsBackupBtn.danger {
  border-color: rgba(255, 88, 88, 0.36);
  background: rgba(255, 88, 88, 0.075);
}

.settingsBackupBtn.danger span {
  color: #ff8888;
}

.settingsToast {
  position: fixed;
  left: 50%;
  bottom: max(18px, env(safe-area-inset-bottom));
  z-index: 90;
  display: grid;
  gap: 3px;
  min-width: min(340px, calc(100vw - 28px));
  max-width: min(440px, calc(100vw - 28px));
  padding: 13px 15px;
  border: 1px solid rgba(255,159,28,0.42);
  border-radius: 18px;
  color: var(--br-text);
  background: rgba(8, 19, 42, 0.94);
  box-shadow: 0 20px 55px rgba(0,0,0,0.42);
  transform: translate(-50%, 140%);
  opacity: 0;
  pointer-events: none;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.settingsToast.is-visible {
  transform: translate(-50%, 0);
  opacity: 1;
}

.settingsToast strong {
  color: var(--br-orange);
}

.settingsToast span {
  color: var(--br-muted);
  font-size: 13px;
}
`;

if (css.includes(marker)) {
  css = css.replace(new RegExp(`${marker}[\\s\\S]*$`), block.trimStart());
} else {
  css = `${css.trimEnd()}\n\n${block.trimStart()}`;
}

fs.writeFileSync(cssPath, css, "utf8");

console.log("BRMedia Patch F2 complete.");
console.log("Universal Settings now has safer text badges, saved feedback, settings export/import/reset, and F2 cache busts.");
console.log("Backups saved to tools/backups/settings-before-f2.");