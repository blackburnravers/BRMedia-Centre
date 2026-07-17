(function () {
  const settingsTabs = [
    { id: "general", label: "General", summary: "Branding, app behaviour and shared UI." },
    { id: "player", label: "Player", summary: "Music player defaults and resume behaviour." },
    { id: "video", label: "Video Player", summary: "Video library, subtitles and playback." },
    { id: "converter", label: "Converter", summary: "Default formats, quality and output folders." },
    { id: "tagger", label: "Tagger", summary: "Metadata, artwork and BRMedia custom tags." },
    { id: "mastering", label: "Mastering", summary: "Loudness, presets and render defaults." },
    { id: "devices", label: "Devices", summary: "Phone names, Send to Device and handoff." },
    { id: "backup", label: "Backup", summary: "Export, restore and project safety." },
    { id: "google-drive", label: "Google Drive", summary: "Connected Drive accounts and imports." },
    { id: "dropbox", label: "Dropbox", summary: "Connected Dropbox accounts and imports." },
    { id: "import", label: "Import / Direct URL", summary: "Direct links and saved source links." },
    { id: "sources", label: "Source folders", summary: "C:\\DJMixes, C:\\Videos and allowed bases." },
    { id: "server", label: "Server", summary: "Jump to deeper server/admin settings." },
  ];

  window.BRMediaShared = window.BRMediaShared || {};
  window.BRMediaShared.settingsSchema = { settingsTabs };
})();