/* BRMedia DJ Mixer full removal script
   Run from the BRMedia-Centre project root:
   node remove-dj-mixer-clean.js

   Keeps only the slider PNGs by copying them to:
   server/public/shared/slider-assets/mixer-controls
*/
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const backupRoot = path.join(root, "_dj-mixer-removal-backup");
const sliderSource = path.join(root, "server/public/dj-mixer/assets/mixer-controls");
const sliderTarget = path.join(root, "server/public/shared/slider-assets/mixer-controls");

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

function rel(p) {
  return path.relative(root, p).replace(/\\/g, "/");
}

function backupFile(filePath) {
  if (!exists(filePath) || !fs.statSync(filePath).isFile()) return;
  const dest = path.join(backupRoot, rel(filePath));
  if (exists(dest)) return;
  mkdirp(path.dirname(dest));
  fs.copyFileSync(filePath, dest);
}

function backupTree(folderPath) {
  if (!exists(folderPath)) return;
  for (const entry of fs.readdirSync(folderPath, { withFileTypes: true })) {
    const full = path.join(folderPath, entry.name);
    if (entry.isDirectory()) backupTree(full);
    else if (entry.isFile()) backupFile(full);
  }
}

function editFile(relativePath, transform) {
  const filePath = path.join(root, relativePath);
  if (!exists(filePath)) return;
  backupFile(filePath);
  const before = fs.readFileSync(filePath, "utf8");
  const after = transform(before);
  if (after !== before) fs.writeFileSync(filePath, after, "utf8");
}

function removePath(relativePath) {
  const p = path.join(root, relativePath);
  if (!exists(p)) return;
  const stat = fs.statSync(p);
  if (stat.isDirectory()) {
    backupTree(p);
    fs.rmSync(p, { recursive: true, force: true });
  } else {
    backupFile(p);
    fs.rmSync(p, { force: true });
  }
}

function removeMixerHtmlLinks(text) {
  return text
    .replace(/\n\s*<a\s+class="card"\s+href="\/dj-mixer">[\s\S]*?<\/a>/g, "")
    .replace(/\n\s*<button\b(?=[^>]*\bdata-route="\/dj-mixer")[\s\S]*?<\/button>/g, "")
    .replace(/\n\s*<button\b(?=[^>]*\bdata-server-section="dj")[\s\S]*?<\/button>/g, "")
    .replace(/\n\s*<a\b(?=[^>]*\bhref="\/dj-mixer(?:\?[^\"]*)?")[\s\S]*?<\/a>/g, "");
}

function removeLinesContainingAll(text, terms) {
  return text
    .split(/(?<=\n)/)
    .filter((line) => !terms.every((term) => line.includes(term)))
    .join("");
}

function copySliderAssets() {
  if (!exists(sliderSource)) return;
  mkdirp(sliderTarget);
  for (const name of fs.readdirSync(sliderSource)) {
    const from = path.join(sliderSource, name);
    const to = path.join(sliderTarget, name);
    if (fs.statSync(from).isFile()) fs.copyFileSync(from, to);
  }
}

function removeSettingsApp(text) {
  let s = text;

  s = s.replace(/^const DJ_SETTINGS_KEY = .*?;\n/m, "");
  s = s.replace(/\nconst DJ_SETTINGS_DEFAULTS = \{[\s\S]*?\n\};(?=\n\nconst TORRENT_SETTINGS_DEFAULTS)/, "");
  s = s.replace(/\nlet settingsDjSources[\s\S]*?settingsDjSourcesNotice = .*?;\n/, "\n");
  s = s.replace(/\nlet djSettings = loadDjSettings\(\);\n/, "\n");

  s = s.replace(/\n\s*dj:\s*\{[\s\S]*?\n\s*\},(?=\n\s*torrents:)/g, "");
  s = s.replace(/\n\s*\{\n\s*key:\s*"dj",[\s\S]*?\n\s*\},(?=\n\s*\{\n\s*key:\s*"torrents")/g, "");
  s = s.replace(/\n\s*\{\s*title:\s*"DJ Mixer"[\s\S]*?route:\s*"\/dj-mixer"[\s\S]*?\},/g, "");
  s = s.replace(/\n\s*dj:\s*\{[\s\S]*?\n\s*\},(?=\n\s*torrents:\s*\{)/g, "");

  s = s.replace(/\nfunction loadDjSettings\(\) \{[\s\S]*?\n\}/g, "");
  s = s.replace(/\n\s*if \(moduleKey === "dj"\) \{[\s\S]*?\n\s*\}\n(?=\n\s*if \(moduleKey === "torrents"\))/g, "\n");
  s = s.replace(/\n\s*if \(moduleKey === "dj"\) return djSettings;/g, "");

  s = s.replace(/\nfunction settingsDjSourceTypeLabel[\s\S]*?\nfunction renderSettingsTorrents/g, "\nfunction renderSettingsTorrents");
  s = s.replace(/\nfunction normaliseDjSettingsTab\(\) \{[\s\S]*?\n\}/g, "");
  s = s.replace(/\n\s*\{\n\s*icon:\s*"record-vinyl",\n\s*title:\s*"DJ Mixer \/ Collection",[\s\S]*?\n\s*\},(?=\n\s*\{\n\s*icon:\s*"magnet")/g, "");

  s = s.replace(/\n\s*if \(moduleKey === "mixer" \|\| moduleKey === "dj-mixer"\) moduleKey = "dj";/g, "");
  s = s.replace(/\n\s*if \(moduleKey === "dj" && tabKey === "library"\) tabKey = "collection";/g, "");
  s = s.replace(/\n\s*if \(activeSettingsModule === "dj"\) \{[\s\S]*?\n\s*\}\n(?=\n\s*if \(activeSettingsModule === "torrents")/g, "\n");

  for (const terms of [
    ["/dj-mixer"],
    ["DJ Mixer"],
    ["DJ Studio"],
    ["djMixer"],
    ["brmedia_dj_mixer"],
  ]) {
    s = removeLinesContainingAll(s, terms);
  }

  return s;
}

function removeServerSettingsApp(text) {
  let s = text;
  s = s.replace(/\n\s*\{\s*key:\s*"dj"[\s\S]*?\},/g, "");
  s = s.replace(/\nfunction renderServerDjSection\(\) \{[\s\S]*?\n\}/g, "");
  s = s.replace(/\n\s*case "dj":\n\s*return renderServerDjSection\(\);/g, "");
  for (const terms of [["/dj-mixer"], ["DJ Mixer"], ["DJ Studio"], ["djMixer"], ["brmedia_dj_mixer"]]) {
    s = removeLinesContainingAll(s, terms);
  }
  return s;
}

function removeServerSettingsCss(text) {
  return text.replace(/\n\/\* BRMedia DJ V2I — Server Settings DJ Mixer status panel \*\/[\s\S]*?\n@media \(max-width: 720px\) \{\n\s*\.serverDjPathGrid \{\n\s*grid-template-columns: 1fr;\n\s*\}\n\}/g, "");
}

function removeStatsApp(text) {
  let s = text;
  s = s.replace(/\n\s*\{\s*key:\s*"dj"[\s\S]*?\},/g, "");
  s = s.replace(/\n\s*const djRecordings[\s\S]*?const djMemoryCueTracks = .*?;\n/g, "\n");
  s = s.replace(/\n\s*djRecordingsCount: .*?,\n\s*djRecordingSeconds,\n\s*djPreparedTracks: .*?,\n\s*djGridTracks: .*?,\n\s*djAnalysedTracks: .*?,\n\s*djHotCueTracks,\n\s*djMemoryCueTracks,/g, "");
  s = s.replace(/\n\s*\{ label: "DJ Mixer"[\s\S]*?\},/g, "");
  s = s.replace(/\nfunction renderStatsDj\(model\) \{[\s\S]*?\n\}/g, "");
  s = s.replace(/\n\s*\$\{statCard\("record-vinyl", "DJ Mixer"[\s\S]*?\}\)/g, "");
  s = s.replace(/\n\s*case "dj": return renderStatsDj\(model\);/g, "");
  return s;
}

function removePlayerApp(text) {
  let s = text;
  s = s.replace(/\nasync function fetchDjRecordingHandoffTrack\([\s\S]*?\n\}/g, "");
  s = s.replace(/\nasync function playIncomingDjRecordingFromUrl\([\s\S]*?\n\}/g, "");
  s = s.replace(/    const recordingId = String\(params\.get\("recordingId"\) \|\| params\.get\("djRecordingId"\) \|\| ""\)\.trim\(\);\n/g, "");
  s = s.replace(/    if \(!trackId && !recordingId\) \{\n      return \{ trackId: "", recordingId: "", autoplay: false, seekToSec: NaN \};\n    \}/g, '    if (!trackId) {\n      return { trackId: "", autoplay: false, seekToSec: NaN };\n    }');
  s = s.replace(/      recordingId,\n/g, "");
  s = s.replace(/    return \{ trackId: "", recordingId: "", autoplay: false, seekToSec: NaN \};/g, '    return { trackId: "", autoplay: false, seekToSec: NaN };');
  s = s.replace(/  if \(!request\.trackId && !request\.recordingId\) return;/g, "  if (!request.trackId) return;");
  s = s.replace(/\n\s*const track = request\.recordingId\n\s*\? await playIncomingDjRecordingFromUrl\(request\)\n\s*: await playIncomingTrackById\(request\.trackId, \{[\s\S]*?\n\s*\}\);/g, '\n  const track = await playIncomingTrackById(request.trackId, {\n    autoplay: request.autoplay,\n    openPlayer: true,\n    seekToSec: request.seekToSec,\n  });');
  s = s.replace(/  showBookmarkToast\("Player", request\.recordingId \? "Could not load that DJ recording" : "Could not find that file in the BRMedia library"\);/g, '  showBookmarkToast("Player", "Could not find that file in the BRMedia library");');
  return s;
}

function removeServerIndex(text) {
  let s = text;
  s = s.replace(/^const DJ_RECORDING_DATA_DIR = .*?;\nconst DJ_RECORDING_CAPTURE_DIR = .*?;\nconst DJ_RECORDING_OUTPUT_DIR = .*?;\nconst DJ_RECORDING_MANIFEST_PATH = .*?;\nconst DJ_PREP_CACHE_PATH = .*?;\nconst DJ_PREP_CACHE_LIMIT = .*?;\n/m, "");
  s = s.replace(/\nfunction ensureDjRecordingDirs\(\) \{[\s\S]*?\n\}\n(?=\nfunction runFfmpegHealthCheck\()/g, "\n");
  s = s.replace(/\n\s*if \(req\.method === "GET" && url\.pathname === "\/dj-mixer\/prep-cache"\) \{[\s\S]*?\n\s*\}\n\s*if \(req\.method === "POST" && url\.pathname === "\/dj-mixer\/prep-cache"\) \{[\s\S]*?\n\s*\}\n\s*if \(req\.method === "POST" && url\.pathname === "\/dj-mixer\/prep-cache\/clear"\) \{[\s\S]*?\n\s*\}\n\s*if \(req\.method === "GET" && url\.pathname === "\/dj-mixer\/recordings"\) \{[\s\S]*?\n\s*\}\n\s*if \(req\.method === "POST" && url\.pathname === "\/dj-mixer\/recordings\/finalise"\) \{[\s\S]*?\n\s*\}\n\s*if \([\s\S]*?url\.pathname\.startsWith\("\/dj-mixer\/recordings\/"\)[\s\S]*?\n\s*\}\n(?=\s*if \(req\.method === "GET" && url\.pathname === "\/library\/support-files"\))/g, "\n");
  s = s.replace(/\n\s*"\/dj-mixer\/site.webmanifest": \{\n\s*startUrl: "\/dj-mixer[^"]*",\n\s*name: "BRMedia DJ Mixer",\n\s*\},/g, "");
  s = s.replace(/\n\s*"dj-mixer",/g, "");
  s = s.replace(/\nif \(req\.method === "GET" && \(url\.pathname === "\/dj-mixer" \|\| url\.pathname === "\/dj-mixer\/"\)\) \{[\s\S]*?\n\}/g, "");
  s = s.replace(/\n\s*"\/dj-mixer": \{\n\s*key: "dj-mixer",\n\s*folder: "dj-mixer",\n\s*fallbackToModules: false,\n\s*title: "BRMedia DJ Mixer",\n\s*appleTitle: "DJ Mixer",\n\s*manifestHref: "\/dj-mixer\/site.webmanifest[^"]*",\n\s*\},/g, "");
  return s;
}

copySliderAssets();

for (const relativePath of [
  "server/public/home/index.html",
  "server/public/player/index.html",
  "server/public/converter/index.html",
  "server/public/mastering/index.html",
  "server/public/torrents/index.html",
  "server/public/video-player/index.html",
  "server/public/tagger/index.html",
  "server/public/stats/index.html",
  "server/public/server-settings/index.html",
]) {
  editFile(relativePath, removeMixerHtmlLinks);
}

editFile("server/public/shared/nav.js", (s) => s.replace(/\n\s*\{\s*href:\s*"\/dj-mixer"[\s\S]*?\},/g, ""));
editFile("server/public/settings/app.js", removeSettingsApp);
editFile("server/public/server-settings/app.js", removeServerSettingsApp);
editFile("server/public/server-settings/styles.css", removeServerSettingsCss);
editFile("server/public/stats/app.js", removeStatsApp);
editFile("server/public/player/app.js", removePlayerApp);
editFile("server/src/index.ts", removeServerIndex);

removePath("server/public/dj-mixer");
removePath("tools/windows/brmedia-dj-midi.ps1");
removePath("server/public/shared/branding/module-icons/dj-mixer.png");
removePath("remove-dj-mixer-clean.js");

const saved = exists(sliderTarget) ? fs.readdirSync(sliderTarget).filter((name) => name.endsWith(".png")) : [];
console.log("BRMedia DJ Mixer removed.");
console.log(`Slider PNGs saved: ${saved.length}`);
console.log(`Saved slider folder: ${path.relative(root, sliderTarget)}`);
console.log(`Backup folder: ${path.relative(root, backupRoot)}`);