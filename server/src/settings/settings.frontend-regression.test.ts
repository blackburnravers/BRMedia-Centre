import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(__dirname, "..", "..", "public", "settings");
const read = (name: string): string => fs.readFileSync(path.join(root, name), "utf8");

test("live Settings route loads only the completed curated renderer", () => {
  const html = read("index.html");
  assert.match(html, /settings\/styles\.css\?v=20260729-mixxx-m3-backend-selector/);
  assert.match(html, /settings\/app\.js\?v=20260728-universal-settings-u1-u8-runtime-restore/);
  assert.match(html, /settings\/mixxx-m3\.js\?v=20260729-mixxx-m3-backend-selector/);
  assert.doesNotMatch(html, /universal-app|universal-u[4-8]/);
});

test("completed runtime registry retains its established ordered modules", () => {
  const source = read("app.js");
  const registry = source.slice(source.indexOf("const SETTINGS_NAV_TREE = ["), source.indexOf("const SETTINGS_MODULE_NAV_LINKS"));
  const ordered = ["home", "centre", "player", "cloud", "video", "tagger", "converter", "mastering", "dj", "torrents", "server", "stats"];
  let cursor = -1;
  for (const module of ordered) {
    const next = registry.indexOf(`key: "${module}"`);
    assert.ok(next > cursor, `${module} is missing or out of order`);
    cursor = next;
  }
  assert.equal((registry.match(/^\s{4}key: "/gm) || []).length, 12);
  assert.equal((registry.match(/\{ key: "/g) || []).length, 56);
});

test("known Audio Player settings use curated groups, labels, descriptions and options", () => {
  const source = read("app.js");
  assert.match(source, /title: "Playback Engine"/);
  assert.match(source, /title: "Resume last track \/ mix"/);
  assert.match(source, /desc: "Restore the last loaded Player state when BRMedia opens\."/);
  assert.match(source, /title: "Repeat mode"/);
  assert.match(source, /label: "Repeat all"/);
  assert.match(source, /title: "Waveforms & Tracklists"/);
});

test("curated modules never fall through to the generic raw-key renderer", () => {
  const html = read("index.html");
  const source = read("app.js");
  assert.doesNotMatch(html, /universal-app\.js/);
  assert.doesNotMatch(source, /Persistent \$\{escapeHtml\(state\.page\.module\)\} settings/);
  assert.doesNotMatch(source, /<p>\$\{escapeHtml\(pathString\)\}<\/p>/);
  assert.match(source, /card\.controls\.map\(\(control\) => moduleSettingControlHtml/);
});

test("Universal Settings uses the established Server Settings shared shell", () => {
  const html = read("index.html");
  for (const contract of ["appShell settingsShell", "topbar settingsTopbar", "brandHeader settingsBrandHeader", "settingsHeroShell", "settingsMain", "playerSiteFooter settingsFooter"]) {
    assert.match(html, new RegExp(contract));
  }
  assert.match(html, /aria-label="Search settings"/);
  assert.match(html, /fa-magnifying-glass/);
  assert.match(html, /id="btnModuleMenu"/);
  assert.match(html, /blackburn-ravers-header\.png/);
});

test("shared shell keeps document scrolling and footer safe-area spacing", () => {
  const css = read("styles.css");
  assert.match(css, /html \{ min-height: 100%; overflow-x: hidden; overflow-y: auto; \}/);
  assert.match(css, /body\.settingsMode\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(css, /body\.settingsMode \.settingsFooter\s*\{[^}]*padding-bottom:\s*calc\(var\(--safe-bottom\) \+ 24px\)/s);
  assert.doesNotMatch(css.slice(css.indexOf("/* Universal Settings U1-U8 live runtime shell restore.")), /overflow:\s*hidden/);
});

test("curated controls preserve reloadable local defaults rather than debug fixtures", () => {
  const source = read("app.js");
  assert.match(source, /const PLAYER_SETTINGS_DEFAULTS = \{/);
  assert.match(source, /function loadPlayerSettings\(\)/);
  assert.match(source, /readPersistedJson\(PLAYER_SETTINGS_KEY, null\)/);
  assert.match(source, /function savePlayerSettings\(\)/);
  assert.match(source, /writePersistedJson\(PLAYER_SETTINGS_KEY, playerSettings\)/);
  assert.match(source, /const DJ_SETTINGS_KEY = "brmedia_dj_mixer_settings_v1"/);
  assert.match(source, /function loadDjSettings\(\)/);
  assert.match(source, /writePersistedJson\(DJ_SETTINGS_KEY, djSettings\)/);
});

test("only genuinely changed M3 assets use the M3 suffix", () => {
  const html = read("index.html");
  assert.equal((html.match(/v=20260729-mixxx-m3-backend-selector/g) || []).length, 2);
  assert.equal((html.match(/v=20260728-universal-settings-u1-u8-runtime-restore/g) || []).length, 1);
});