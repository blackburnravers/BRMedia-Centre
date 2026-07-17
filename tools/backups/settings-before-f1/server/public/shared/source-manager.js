(function () {
  const defaultSources = [
    { id: "library", label: "BRMedia Library", kind: "library", localRequiredForWrite: false },
    { id: "device-upload", label: "Device Upload", kind: "upload", localRequiredForWrite: true },
    { id: "google-drive", label: "Google Drive", kind: "cloud", localRequiredForWrite: true },
    { id: "dropbox", label: "Dropbox", kind: "cloud", localRequiredForWrite: true },
    { id: "direct-url", label: "Direct URL", kind: "import", localRequiredForWrite: true },
    { id: "local-audio", label: "Local Audio Folder", kind: "folder", path: "C:\\DJMixes", localRequiredForWrite: false },
    { id: "local-video", label: "Local Video Folder", kind: "folder", path: "C:\\Videos", localRequiredForWrite: false },
  ];

  function getSources() {
    return defaultSources.slice();
  }

  window.BRMediaShared = window.BRMediaShared || {};
  window.BRMediaShared.sources = { getSources, defaultSources };
})();