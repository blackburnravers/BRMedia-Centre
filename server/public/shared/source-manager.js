(function () {
  const STORAGE_KEY = "brmedia_shared_sources_v1";

  const defaultSources = [
    { id: "library", label: "BRMedia Library", kind: "library", detail: "Server library index", localRequiredForWrite: false, editable: false },
    { id: "device-upload", label: "Device Upload", kind: "upload", detail: "Phone/PC upload into module workflows", localRequiredForWrite: true, editable: false },
    { id: "google-drive", label: "Google Drive", kind: "cloud", detail: "Import local copy before editing/rendering", localRequiredForWrite: true, editable: false },
    { id: "dropbox", label: "Dropbox", kind: "cloud", detail: "Import local copy before editing/rendering", localRequiredForWrite: true, editable: false },
    { id: "direct-url", label: "Direct URL", kind: "import", detail: "Lawful direct media imports only", localRequiredForWrite: true, editable: false },
    { id: "local-audio", label: "Local Audio Folder", kind: "folder", path: "C:\\DJMixes", detail: "Music, mixes and audio outputs", localRequiredForWrite: false, editable: true },
    { id: "local-video", label: "Local Video Folder", kind: "folder", path: "C:\\Videos", detail: "Video library source", localRequiredForWrite: false, editable: true },
  ];

  function readOverrides() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function writeOverrides(overrides) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides || {}));
    } catch {}
  }

  function getSources() {
    const overrides = readOverrides();
    return defaultSources.map((source) => ({ ...source, ...(overrides[source.id] || {}) }));
  }

  function updateSource(id, patch) {
    const overrides = readOverrides();
    overrides[id] = { ...(overrides[id] || {}), ...(patch || {}) };
    writeOverrides(overrides);
    return getSources().find((source) => source.id === id);
  }

  function resetSources() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    return getSources();
  }

  window.BRMediaShared = window.BRMediaShared || {};
  window.BRMediaShared.sources = { getSources, updateSource, resetSources, defaultSources };
})();
