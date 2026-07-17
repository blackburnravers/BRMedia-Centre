(function () {
  const settingsTabs = [
    { id: "general", label: "General", icon: "?", summary: "Branding, app behaviour and shared UI.", section: "Core" },
    { id: "player", label: "Player", icon: "?", summary: "Music player defaults, resume and mini player behaviour.", section: "Modules" },
    { id: "video", label: "Video Player", icon: "?", summary: "Video library, subtitles, playback and watch page defaults.", section: "Modules" },
    { id: "converter", label: "Converter", icon: "?", summary: "Default formats, quality, output names and queue behaviour.", section: "Modules" },
    { id: "tagger", label: "Tagger", icon: "#", summary: "Metadata, artwork and BRMedia custom tag defaults.", section: "Modules" },
    { id: "mastering", label: "Mastering", icon: "?", summary: "Loudness targets, presets, render defaults and output handling.", section: "Modules" },
    { id: "devices", label: "Devices", icon: "?", summary: "Phone names, Send to Device, handoff and local network helpers.", section: "Sharing" },
    { id: "backup", label: "Backup", icon: "?", summary: "Export, restore and recovery planning.", section: "Safety" },
    { id: "google-drive", label: "Google Drive", icon: "G", summary: "Connected Drive accounts, imports and reconnect status.", section: "Cloud" },
    { id: "dropbox", label: "Dropbox", icon: "D", summary: "Connected Dropbox accounts, imports and reconnect status.", section: "Cloud" },
    { id: "import", label: "Import / Direct URL", icon: "?", summary: "Direct links, lawful imports and saved source links.", section: "Cloud" },
    { id: "sources", label: "Source folders", icon: "?", summary: "C:\\DJMixes, C:\\Videos and shared local source rules.", section: "Sources" },
    { id: "server", label: "Server", icon: "?", summary: "Jump to deeper server/admin settings without mixing the two pages.", section: "Admin" },
  ];

  const moduleCards = [
    { id: "player", label: "Player", href: "/player", body: "Audio player, playlists, timestamps and library." },
    { id: "video", label: "Video Player", href: "/video-player", body: "Films, poster wall and watch page." },
    { id: "converter", label: "Converter", href: "/converter", body: "Audio/video conversion and outputs." },
    { id: "tagger", label: "Tagger", href: "/tagger", body: "Metadata, artwork and BRMedia tags." },
    { id: "mastering", label: "Mastering", href: "/mastering", body: "Loudness, polish and mastered copies." },
    { id: "stats", label: "Stats", href: "/stats", body: "History, reports and usage later." },
  ];

  window.BRMediaShared = window.BRMediaShared || {};
  window.BRMediaShared.settingsSchema = { settingsTabs, moduleCards };
})();
