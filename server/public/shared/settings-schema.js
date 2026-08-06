(function () {
  const settingsTabs = [
    { id: "general", label: "General", icon: "GEN", summary: "Branding, app behaviour and shared UI.", section: "Core" },
    { id: "player", label: "Player", icon: "PLY", summary: "Music player defaults, resume and mini player behaviour.", section: "Modules" },
    { id: "video", label: "Video Player", icon: "VID", summary: "Video library, subtitles, playback and watch page defaults.", section: "Modules" },
    { id: "converter", label: "Converter", icon: "CVT", summary: "Default formats, quality, output names and queue behaviour.", section: "Modules" },
    { id: "tagger", label: "Tagger", icon: "TAG", summary: "Metadata, artwork and BRMedia custom tag defaults.", section: "Modules" },
    { id: "mastering", label: "Mastering", icon: "MST", summary: "Loudness targets, presets, render defaults and output handling.", section: "Modules" },
    { id: "devices", label: "Devices", icon: "DEV", summary: "Phone names, Send to Device, handoff and local network helpers.", section: "Sharing" },
    { id: "backup", label: "Backup", icon: "BAK", summary: "Export, restore and recovery planning.", section: "Safety" },
    { id: "google-drive", label: "Google Drive", icon: "GDR", summary: "Connected Drive accounts, imports and reconnect status.", section: "Cloud" },
    { id: "dropbox", label: "Dropbox", icon: "DBX", summary: "Connected Dropbox accounts, imports and reconnect status.", section: "Cloud" },
    { id: "import", label: "Import / Direct URL", icon: "URL", summary: "Direct links, lawful imports and saved source links.", section: "Cloud" },
    { id: "sources", label: "Source folders", icon: "SRC", summary: "H:\\Music, C:\\DJMixes, C:\\Videos and shared local source rules.", section: "Sources" },
    { id: "server", label: "Server", icon: "SRV", summary: "Jump to deeper server/admin settings without mixing the two pages.", section: "Admin" },
  ];

  const moduleCards = [
    { id: "player", icon: "PLY", label: "Player", href: "/player", body: "Audio player, playlists, timestamps and library." },
    { id: "video", icon: "VID", label: "Video Player", href: "/video-player", body: "Films, poster wall and watch page." },
    { id: "converter", icon: "CVT", label: "Converter", href: "/converter", body: "Audio/video conversion and outputs." },
    { id: "tagger", icon: "TAG", label: "Tagger", href: "/tagger", body: "Metadata, artwork and BRMedia tags." },
    { id: "mastering", icon: "MST", label: "Mastering", href: "/mastering", body: "Loudness, polish and mastered copies." },
    { id: "stats", icon: "STS", label: "Stats", href: "/stats", body: "History, reports and usage later." },
  ];

  window.BRMediaShared = window.BRMediaShared || {};
  window.BRMediaShared.settingsSchema = { settingsTabs, moduleCards };
})();
