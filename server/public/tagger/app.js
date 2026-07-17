const $ = (id) => document.getElementById(id);

const moduleSearchBtn = document.querySelector(".moduleSearchBtn");
const btnModuleMenu = $("btnModuleMenu");
const moduleSidebar = $("moduleSidebar");
const moduleSidebarBackdrop = $("moduleSidebarBackdrop");
const btnModuleSidebarCloseFloating = $("btnModuleSidebarCloseFloating");
const taggerRoot = $("taggerRoot");

const moduleSidebarScrollLock = { y: 0 };
const TAGGER_SETTINGS_KEY = "brmedia_tagger_settings_v1";
const TAGGER_SETTINGS_DEFAULTS = {
  defaultOpenTab: "main",
  defaultCategory: "Other Mixes",
  defaultReleaseType: "Mix",
  defaultTracklistStatus: "None",
  defaultSaveMode: "copy",
  warnBeforeReplace: true,
  autoSaveSidecarBeforeWrite: true,
  autoFillBrandFromCategory: true,
  preserveExistingAdvanced: true,
  artworkEmbedMode: "keep",
  artworkMaxSize: 1600,
  uploadAfterAction: "load",
};
const BR_ICON_BASE_PATHS = ["/shared/icons/fa-duotone/", "/shared/icons/brands/"];
const BR_ICON_CLASS_MAP = {
  bars: "list-music",
  "bars-staggered": "list-music",
  xmark: "xmark",
  music: "music",
  "magnifying-glass": "magnifying-glass",
  video: "video",
  film: "film",
  tag: "tag",
  tags: "tags",
  "arrows-rotate": "arrow-rotate-right",
  sliders: "sliders",
  server: "server",
  gear: "gear-complex",
  house: "house",
  "chart-pie": "chart-column",
  "chart-column": "chart-column",
  "folder-open": "folder-open",
  "folder-plus": "folder-plus",
  "cloud-arrow-down": "cloud-arrow-down",
  "floppy-disk": "floppy-disks",
  "wand-magic-sparkles": "wand-magic-sparkles",
  image: "image",
  "circle-check": "circle-check",
  "triangle-exclamation": "triangle-exclamation",
  download: "download",
  copy: "copy",
  "rotate-left": "arrow-rotate-left",
  "google-drive": "google-drive",
};

const TAGGER_BR_CATEGORIES = [
  { key: "Blackburn Ravers Mixes", title: "Blackburn Ravers Mixes", brand: "Blackburn Ravers", imageKey: "br", icon: "music" },
  { key: "DJ NJ Mixes", title: "DJ NJ Mixes", brand: "DJ NJ", imageKey: "nj", icon: "headphones" },
  { key: "Upalnite Mixes", title: "Upalnite Mixes", brand: "Upalnite", imageKey: "up", icon: "bolt" },
  { key: "Other Mixes", title: "Other Mixes", brand: "Other", imageKey: "other", icon: "compact-disc" },
];

const STANDARD_TAG_FIELDS = [
  // Main / visible tags
  { key: "title", label: "Title", placeholder: "Track / mix title", group: "main" },
  { key: "trackTitle", label: "Track Title", placeholder: "Track title frame", advancedKey: "track_title", group: "main" },
  { key: "subtitle", label: "Subtitle", placeholder: "Optional subtitle / edition", advancedKey: "subtitle", group: "main" },
  { key: "artist", label: "Artist", placeholder: "Main artist / DJ", group: "main" },
  { key: "artists", label: "Artists", placeholder: "Multiple artists", advancedKey: "artists", group: "main" },
  { key: "album", label: "Album", placeholder: "Album, series or category", group: "main" },
  { key: "albumArtist", label: "Album Artist", placeholder: "Compilation / brand artist", group: "main" },
  { key: "genre", label: "Genre", placeholder: "Hardcore, Bounce, Old Skool…", group: "main" },
  { key: "year", label: "Year", placeholder: "2026", type: "number", group: "main" },
  { key: "date", label: "Date", placeholder: "2026-05-16", group: "main" },
  { key: "comment", label: "Comment", placeholder: "Notes written into file", multiline: true, group: "main" },

  // Release / numbering
  { key: "trackNumber", label: "Track Number", placeholder: "1", type: "number", group: "release" },
  { key: "trackTotal", label: "Track Total", placeholder: "12", type: "number", advancedKey: "TOTALTRACKS", group: "release" },
  { key: "discNumber", label: "Disc Number", placeholder: "1", type: "number", group: "release" },
  { key: "discSubtitle", label: "Disc Subtitle", placeholder: "Disc subtitle", advancedKey: "disc_subtitle", group: "release" },
  { key: "discTotal", label: "Disc Total", placeholder: "2", type: "number", advancedKey: "TOTALDISCS", group: "release" },
  { key: "label", label: "Label", placeholder: "Blackburn Ravers", group: "release" },
  { key: "recordLabel", label: "Record Label", placeholder: "Record label", advancedKey: "record_label", group: "release" },
  { key: "publisher", label: "Publisher", placeholder: "Publisher", advancedKey: "publisher", group: "release" },
  { key: "catalogNumber", label: "Catalog Number", placeholder: "BRM-001", advancedKey: "catalog_number", group: "release" },
  { key: "barcode", label: "Barcode", placeholder: "EAN / UPC", advancedKey: "barcode", group: "release" },
  { key: "asin", label: "ASIN", placeholder: "Amazon ASIN", advancedKey: "asin", group: "release" },
  { key: "isrc", label: "ISRC", placeholder: "GB-XXX-26-00001", advancedKey: "ISRC", group: "release" },
  { key: "copyright", label: "Copyright", placeholder: "© Blackburn Ravers", advancedKey: "copyright", group: "release" },
  { key: "contentGroup", label: "Content Group", placeholder: "Content group", advancedKey: "content_group", group: "release" },
  { key: "releaseCountry", label: "Release Country", placeholder: "GB", advancedKey: "release_country", group: "release" },
  { key: "releaseStatus", label: "Release Status", placeholder: "Official / Bootleg / Promo", advancedKey: "release_status", group: "release" },
  { key: "releaseType", label: "Release Type", placeholder: "Album / Mix / Single", advancedKey: "release_type", group: "release" },
  { key: "language", label: "Language", placeholder: "eng", advancedKey: "language", group: "release" },
  { key: "encodedBy", label: "Encoded By", placeholder: "BRMedia Centre", advancedKey: "encoded_by", group: "release" },

  // DJ / musical
  { key: "bpm", label: "Beats Per Minute", placeholder: "170", type: "number", group: "music" },
  { key: "key", label: "Initial Key", placeholder: "Am / 8A", group: "music" },
  { key: "mood", label: "Mood", placeholder: "Dark / Euphoric / Bouncy", advancedKey: "mood", group: "music" },
  { key: "mediaType", label: "Media Type", placeholder: "Mix / Radio / Podcast", advancedKey: "media_type", group: "music" },
  { key: "mixDj", label: "Mix DJ", placeholder: "DJ / mix owner", advancedKey: "mix_dj", group: "music" },
  { key: "mixer", label: "Mixer", placeholder: "Mix engineer", advancedKey: "mixer", group: "music" },
  { key: "remixedBy", label: "Remixed By", placeholder: "Remixer", advancedKey: "remixed_by", group: "music" },
  { key: "energy", label: "Energy", placeholder: "Low / Medium / High", advancedKey: "energy", group: "music" },
  { key: "rating", label: "Rating", placeholder: "1-5", advancedKey: "rating", group: "music" },
  { key: "grouping", label: "Grouping", placeholder: "Folder / collection", advancedKey: "grouping", group: "music" },

  // Credits / people
  { key: "arranger", label: "Arranger", placeholder: "Arranger", advancedKey: "arranger", group: "credits" },
  { key: "composer", label: "Composer", placeholder: "Composer", advancedKey: "composer", group: "credits" },
  { key: "composerSortOrder", label: "Composer Sort Order", placeholder: "Composer sort", advancedKey: "composer_sort_order", group: "credits" },
  { key: "conductor", label: "Conductor", placeholder: "Conductor", advancedKey: "conductor", group: "credits" },
  { key: "director", label: "Director", placeholder: "Director", advancedKey: "director", group: "credits" },
  { key: "engineer", label: "Engineer", placeholder: "Engineer", advancedKey: "engineer", group: "credits" },
  { key: "fileOwner", label: "File Owner", placeholder: "File owner", advancedKey: "file_owner", group: "credits" },
  { key: "involvedPeople", label: "Involved People", placeholder: "People involved", multiline: true, advancedKey: "involved_people", group: "credits" },
  { key: "lyricist", label: "Lyricist", placeholder: "Lyricist", advancedKey: "lyricist", group: "credits" },
  { key: "musicianCredits", label: "Musician Credits", placeholder: "Musician credits", multiline: true, advancedKey: "musician_credits", group: "credits" },
  { key: "narrator", label: "Narrator", placeholder: "Narrator", advancedKey: "narrator", group: "credits" },
  { key: "performer", label: "Performer", placeholder: "Performer", advancedKey: "performer", group: "credits" },
  { key: "producer", label: "Producer", placeholder: "Producer", advancedKey: "producer", group: "credits" },
  { key: "writer", label: "Writer", placeholder: "Writer", advancedKey: "writer", group: "credits" },

  // Sorting / original tags
  { key: "albumArtistSortOrder", label: "Album Artist Sort Order", placeholder: "Album artist sort", advancedKey: "album_artist_sort_order", group: "sorting" },
  { key: "albumSortOrder", label: "Album Sort Order", placeholder: "Album sort", advancedKey: "album_sort_order", group: "sorting" },
  { key: "artistSortOrder", label: "Artist Sort Order", placeholder: "Artist sort", advancedKey: "artist_sort_order", group: "sorting" },
  { key: "trackTitleSortOrder", label: "Track Title Sort Order", placeholder: "Track title sort", advancedKey: "track_title_sort_order", group: "sorting" },
  { key: "showNameSortOrder", label: "Show Name Sort Order", placeholder: "Show name sort", advancedKey: "show_name_sort_order", group: "sorting" },
  { key: "originalAlbum", label: "Original Album", placeholder: "Original album", advancedKey: "original_album", group: "sorting" },
  { key: "originalArtist", label: "Original Artist", placeholder: "Original artist", advancedKey: "original_artist", group: "sorting" },
  { key: "originalFileName", label: "Original File Name", placeholder: "Original file name", advancedKey: "original_file_name", group: "sorting" },
  { key: "originalLyricist", label: "Original Lyricist", placeholder: "Original lyricist", advancedKey: "original_lyricist", group: "sorting" },
  { key: "originalReleaseDate", label: "Original Release Date", placeholder: "YYYY-MM-DD", advancedKey: "original_release_date", group: "sorting" },

  // Show / movement tags
  { key: "movementName", label: "Movement Name", placeholder: "Movement name", advancedKey: "movement_name", group: "show" },
  { key: "movementNumber", label: "Movement Number", placeholder: "1", type: "number", advancedKey: "movement_number", group: "show" },
  { key: "movementTotal", label: "Movement Total", placeholder: "10", type: "number", advancedKey: "movement_total", group: "show" },
  { key: "showMovement", label: "Show Movement", placeholder: "Show movement", advancedKey: "show_movement", group: "show" },
  { key: "showName", label: "Show Name", placeholder: "Show name", advancedKey: "show_name", group: "show" },
  { key: "script", label: "Script", placeholder: "Script", advancedKey: "script", group: "show" },
  { key: "workTitle", label: "Work Title", placeholder: "Work title", advancedKey: "work_title", group: "show" },

  // Podcast / radio
  { key: "podcast", label: "Podcast", placeholder: "Yes / No", advancedKey: "podcast", group: "podcast" },
  { key: "podcastCategory", label: "Podcast Category", placeholder: "Podcast category", advancedKey: "podcast_category", group: "podcast" },
  { key: "podcastDescription", label: "Podcast Description", placeholder: "Podcast description", multiline: true, advancedKey: "podcast_description", group: "podcast" },
  { key: "podcastId", label: "Podcast ID", placeholder: "Podcast episode ID", advancedKey: "podcast_id", group: "podcast" },
  { key: "podcastKeywords", label: "Podcast Keywords", placeholder: "Comma separated keywords", advancedKey: "podcast_keywords", group: "podcast" },
  { key: "podcastUrl", label: "Podcast URL", placeholder: "Podcast URL", advancedKey: "podcast_url", group: "podcast" },
  { key: "netRadioOwner", label: "Net Radio Owner", placeholder: "Radio owner", advancedKey: "net_radio_owner", group: "podcast" },
  { key: "netRadioStation", label: "Net Radio Station", placeholder: "Radio station", advancedKey: "net_radio_station", group: "podcast" },

  // Web / URLs
  { key: "www", label: "WWW", placeholder: "Main website", advancedKey: "WWW", group: "web" },
  { key: "wwwArtist", label: "WWW: Artist", placeholder: "Artist website", advancedKey: "www_artist", group: "web" },
  { key: "wwwAudioFile", label: "WWW: Audio File", placeholder: "Audio file URL", advancedKey: "www_audio_file", group: "web" },
  { key: "wwwAudioSource", label: "WWW: Audio Source", placeholder: "Audio source URL", advancedKey: "www_audio_source", group: "web" },
  { key: "wwwCommercialInfo", label: "WWW: Commercial Info", placeholder: "Commercial info URL", advancedKey: "www_commercial_info", group: "web" },
  { key: "wwwCopyright", label: "WWW: Copyright", placeholder: "Copyright URL", advancedKey: "www_copyright", group: "web" },
  { key: "wwwPayment", label: "WWW: Payment", placeholder: "Payment URL", advancedKey: "www_payment", group: "web" },
  { key: "wwwPublisher", label: "WWW: Publisher", placeholder: "Publisher URL", advancedKey: "www_publisher", group: "web" },
  { key: "wwwRadioPage", label: "WWW: Radio Page", placeholder: "Radio page URL", advancedKey: "www_radio_page", group: "web" },
  { key: "sourceUrl", label: "Source URL", placeholder: "Original source link", advancedKey: "source_url", group: "web" },
  { key: "purchaseUrl", label: "Purchase URL", placeholder: "Buy/download link", advancedKey: "purchase_url", group: "web" },
  { key: "description", label: "Description", placeholder: "Long description", multiline: true, advancedKey: "description", group: "web" },

  // Lyrics
  { key: "lyricsAdvisoryRating", label: "Lyrics Advisory Rating", placeholder: "Clean / Explicit", advancedKey: "lyrics_advisory_rating", group: "lyrics" },
  { key: "lyricsUnsynced", label: "Lyrics Unsynced", placeholder: "Unsynced lyrics", multiline: true, advancedKey: "lyrics", group: "lyrics" },

  // Technical / audio
  { key: "albumCover", label: "Album Cover", placeholder: "Artwork embedded separately", advancedKey: "album_cover", group: "technical" },
  { key: "fileType", label: "File Type", placeholder: "MP3 / WAV / FLAC", advancedKey: "file_type", group: "technical" },
  { key: "length", label: "Length", placeholder: "Duration", advancedKey: "length", group: "technical" },
  { key: "license", label: "License", placeholder: "License", advancedKey: "license", group: "technical" },
  { key: "encoderSettings", label: "Encoder Settings", placeholder: "Encoder settings", advancedKey: "encoder_settings", group: "technical" },
  { key: "encodingTime", label: "Encoding Time", placeholder: "Encoding time", advancedKey: "encoding_time", group: "technical" },
  { key: "replayGainAlbumGain", label: "Replay Gain: Album Gain", placeholder: "-7.2 dB", advancedKey: "replaygain_album_gain", group: "technical" },
  { key: "replayGainAlbumPeak", label: "Replay Gain: Album Peak", placeholder: "0.98", advancedKey: "replaygain_album_peak", group: "technical" },
  { key: "replayGainAlbumRange", label: "Replay Gain: Album Range", placeholder: "DR value", advancedKey: "replaygain_album_range", group: "technical" },
  { key: "replayGainReferenceLoudness", label: "Replay Gain: Reference Loudness", placeholder: "89 dB", advancedKey: "replaygain_reference_loudness", group: "technical" },
  { key: "replayGainTrackGain", label: "Replay Gain: Track Gain", placeholder: "-7.2 dB", advancedKey: "replaygain_track_gain", group: "technical" },
  { key: "replayGainTrackPeak", label: "Replay Gain: Track Peak", placeholder: "0.98", advancedKey: "replaygain_track_peak", group: "technical" },
  { key: "replayGainTrackRange", label: "Replay Gain: Track Range", placeholder: "DR value", advancedKey: "replaygain_track_range", group: "technical" },

  // IDs / fingerprints
  { key: "acoustIdFingerprint", label: "AcoustID: Fingerprint", placeholder: "AcoustID fingerprint", advancedKey: "acoustid_fingerprint", group: "ids" },
  { key: "acoustIdIdentifier", label: "AcoustID: Identifier", placeholder: "AcoustID identifier", advancedKey: "acoustid_identifier", group: "ids" },
  { key: "musicIpFingerprint", label: "MusicIP: Fingerprint", placeholder: "MusicIP fingerprint", advancedKey: "musicip_fingerprint", group: "ids" },
  { key: "musicIpPuid", label: "MusicIP: PUID", placeholder: "MusicIP PUID", advancedKey: "musicip_puid", group: "ids" },
  { key: "musicBrainzAlbumArtistId", label: "MusicBrainz: Album Artist ID", placeholder: "MB album artist ID", advancedKey: "musicbrainz_album_artist_id", group: "ids" },
  { key: "musicBrainzAlbumId", label: "MusicBrainz: Album ID", placeholder: "MB album ID", advancedKey: "musicbrainz_album_id", group: "ids" },
  { key: "musicBrainzAlbumReleaseCountry", label: "MusicBrainz: Album Release Country", placeholder: "GB", advancedKey: "musicbrainz_album_release_country", group: "ids" },
  { key: "musicBrainzAlbumStatus", label: "MusicBrainz: Album Status", placeholder: "Official", advancedKey: "musicbrainz_album_status", group: "ids" },
  { key: "musicBrainzAlbumType", label: "MusicBrainz: Album Type", placeholder: "Album / Single", advancedKey: "musicbrainz_album_type", group: "ids" },
  { key: "musicBrainzArtistId", label: "MusicBrainz: Artist ID", placeholder: "MB artist ID", advancedKey: "musicbrainz_artist_id", group: "ids" },
  { key: "musicBrainzDiscId", label: "MusicBrainz: Disc ID", placeholder: "MB disc ID", advancedKey: "musicbrainz_disc_id", group: "ids" },
  { key: "musicBrainzOriginalAlbumId", label: "MusicBrainz: Original Album ID", placeholder: "MB original album ID", advancedKey: "musicbrainz_original_album_id", group: "ids" },
  { key: "musicBrainzOriginalArtistId", label: "MusicBrainz: Original Artist ID", placeholder: "MB original artist ID", advancedKey: "musicbrainz_original_artist_id", group: "ids" },
  { key: "musicBrainzReleaseGroupId", label: "MusicBrainz: Release Group ID", placeholder: "MB release group ID", advancedKey: "musicbrainz_release_group_id", group: "ids" },
  { key: "musicBrainzReleaseTrackId", label: "MusicBrainz: Release Track ID", placeholder: "MB release track ID", advancedKey: "musicbrainz_release_track_id", group: "ids" },
  { key: "musicBrainzTrackId", label: "MusicBrainz: Track ID", placeholder: "MB track ID", advancedKey: "musicbrainz_track_id", group: "ids" },
  { key: "musicBrainzTrmId", label: "MusicBrainz: TRM ID", placeholder: "MB TRM ID", advancedKey: "musicbrainz_trm_id", group: "ids" },
  { key: "musicBrainzWorkId", label: "MusicBrainz: Work ID", placeholder: "MB work ID", advancedKey: "musicbrainz_work_id", group: "ids" },
];

const TAGGER_TAG_SECTIONS = [
  { key: "main", title: "Main tags", desc: "Title, artist, album, genre, year and comments.", icon: "tags" },
  { key: "release", title: "Release info", desc: "Track/disc numbers, label, ISRC, barcode and release data.", icon: "compact-disc" },
  { key: "music", title: "DJ / Music", desc: "BPM, key, mood, media type, DJ and grouping.", icon: "waveform" },
  { key: "credits", title: "Credits", desc: "Composer, producer, remixer, engineer and people credits.", icon: "users" },
  { key: "sorting", title: "Sorting / Original", desc: "Sort orders and original album/artist/file tags.", icon: "arrow-down-a-z" },
  { key: "show", title: "Show / Movement", desc: "Work, movement, show, script and track title helpers.", icon: "list-timeline" },
  { key: "podcast", title: "Podcast / Radio", desc: "Podcast, radio owner, radio station and episode details.", icon: "podcast" },
  { key: "web", title: "Web / URLs", desc: "WWW links, source links, purchase links and descriptions.", icon: "link" },
  { key: "lyrics", title: "Lyrics", desc: "Advisory rating and unsynced lyrics.", icon: "file-lines" },
  { key: "technical", title: "Technical", desc: "File type, length, encoder and ReplayGain fields.", icon: "microchip" },
  { key: "ids", title: "IDs / Fingerprints", desc: "AcoustID, MusicIP and MusicBrainz identifiers.", icon: "fingerprint" },
];

const taggerSettings = loadTaggerSettings();

const state = {
  tracks: [],
  selectedTrackId: "",
  selectedTrack: null,
  metadata: {},
  brmedia: {},
  advancedRows: [],
  artworkDataUrl: "",
  activeTab: taggerSettings.defaultOpenTab || "main",
  busy: false,
};

const brIconSvgCache = new Map();
let brIconHydrationQueue = [];
let brIconHydrationTimer = null;

function escapeHtml(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readPersistedJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function loadTaggerSettings() {
  const saved = readPersistedJson(TAGGER_SETTINGS_KEY, null);
  return saved && typeof saved === "object" ? { ...TAGGER_SETTINGS_DEFAULTS, ...saved } : { ...TAGGER_SETTINGS_DEFAULTS };
}

function readQueryParam(key) {
  return new URLSearchParams(window.location.search || "").get(key) || "";
}

function iconHtml(name = "circle") {
  return `<i class="fa-solid fa-${escapeHtml(name)}"></i>`;
}

function getBrIconNameFromElement(el) {
  if (!el || !el.classList) return "";
  const ignored = ["fa-solid", "fa-regular", "fa-brands", "fa-duotone", "fa-light", "fa-thin", "fa-sharp", "fa-spin", "fa-pulse", "fa-fw", "fa-lg", "fa-xl", "fa-2x"];
  const iconClass = Array.from(el.classList).find((className) => className.startsWith("fa-") && !ignored.includes(className));
  return iconClass ? iconClass.replace(/^fa-/, "") : "";
}

function getBrIconSvgName(iconName = "") {
  if (window.BRMediaIcons?.resolveSvgName) return window.BRMediaIcons.resolveSvgName(BR_ICON_CLASS_MAP[iconName] || iconName);
  return BR_ICON_CLASS_MAP[iconName] || iconName || "";
}

async function loadBrIconSvg(svgName) {
  if (window.BRMediaIcons?.loadSvg) return window.BRMediaIcons.loadSvg(svgName);
  if (brIconSvgCache.has(svgName)) return brIconSvgCache.get(svgName);

  const promise = (async () => {
    let lastError = null;
    for (const basePath of BR_ICON_BASE_PATHS) {
      try {
        const res = await fetch(`${basePath}${svgName}.svg`, { cache: "force-cache" });
        if (!res.ok) throw new Error(`Icon not found: ${basePath}${svgName}.svg`);
        const template = document.createElement("template");
        template.innerHTML = (await res.text()).trim();
        const svg = template.content.querySelector("svg");
        if (!svg) throw new Error(`Invalid icon SVG: ${svgName}`);
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        svg.classList.add("brSvgIconSvg");
        return svg.outerHTML;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error(`Icon not found: ${svgName}`);
  })();

  brIconSvgCache.set(svgName, promise);
  return promise;
}

async function hydrateBrIcon(el) {
  if (!el || el.nodeType !== 1 || !el.matches?.("i[class*='fa-']")) return;
  const iconName = getBrIconNameFromElement(el);
  const svgName = getBrIconSvgName(iconName);
  if (!svgName) return;
  el.classList.add("brSvgIconHost");
  if (el.dataset.brIconName === iconName && el.dataset.brIconSvg === svgName && el.dataset.brIconHydrated === "1") return;
  el.dataset.brIconName = iconName;
  el.dataset.brIconSvg = svgName;
  try {
    el.innerHTML = await loadBrIconSvg(svgName);
    el.dataset.brIconHydrated = "1";
  } catch {
    el.dataset.brIconHydrated = "0";
  }
}

function hydrateBrIcons(root = document) {
  if (window.BRMediaIcons?.hydrate) {
    window.BRMediaIcons.hydrate(root);
    return;
  }
  const nodes = root?.matches?.("i[class*='fa-']") ? [root] : Array.from(root?.querySelectorAll?.("i[class*='fa-']") || []);
  if (!nodes.length) return;
  brIconHydrationQueue.push(...nodes);
  if (brIconHydrationTimer) return;
  const runBatch = () => {
    const batch = brIconHydrationQueue.splice(0, 10);
    batch.forEach((node) => void hydrateBrIcon(node));
    if (brIconHydrationQueue.length) {
      brIconHydrationTimer = window.setTimeout(runBatch, 35);
      return;
    }
    brIconHydrationTimer = null;
  };
  brIconHydrationTimer = window.setTimeout(runBatch, 80);
}

function startBrIconHydrator() {
  const run = () => hydrateBrIcons(document);
  if (typeof window.requestIdleCallback === "function") return window.requestIdleCallback(run, { timeout: 1600 });
  window.setTimeout(run, 500);
}

function syncTopMenuDockState() {
  const topbar = document.querySelector(".topbar");
  if (!btnModuleMenu || !topbar) return;
  const rect = topbar.getBoundingClientRect();
  const shouldFloat = rect.top < 18;
  btnModuleMenu.classList.toggle("isFloating", shouldFloat && !document.body.classList.contains("sidebarOpen"));
  btnModuleSidebarCloseFloating?.classList.toggle("hidden", !document.body.classList.contains("sidebarOpen"));
}

function openModuleSidebar() {
  moduleSidebarScrollLock.y = window.scrollY || window.pageYOffset || 0;
  document.documentElement.classList.add("sidebarLocked");
  document.body.classList.add("sidebarOpen");
  document.body.style.position = "fixed";
  document.body.style.top = `-${moduleSidebarScrollLock.y}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
  moduleSidebarBackdrop?.classList.remove("hidden");
  moduleSidebar?.classList.remove("hidden");
  btnModuleSidebarCloseFloating?.classList.remove("hidden");
  syncTopMenuDockState();
  hydrateBrIcons(moduleSidebar);
}

function closeModuleSidebar() {
  const restoreY = Math.abs(parseInt(document.body.style.top || "0", 10)) || moduleSidebarScrollLock.y || 0;
  moduleSidebarBackdrop?.classList.add("hidden");
  moduleSidebar?.classList.add("hidden");
  btnModuleSidebarCloseFloating?.classList.add("hidden");
  document.documentElement.classList.remove("sidebarLocked");
  document.body.classList.remove("sidebarOpen");
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  window.scrollTo(0, restoreY);
  syncTopMenuDockState();
}

function toggleModuleSidebar() {
  if (!moduleSidebar) return;
  moduleSidebar.classList.contains("hidden") ? openModuleSidebar() : closeModuleSidebar();
}

function goToRoute(route) {
  if (!route) return;
  closeModuleSidebar();
  window.location.href = route;
}

function setStatus(message, type = "") {
  const el = $("taggerStatus");
  if (!el) return;
  el.textContent = message;
  el.className = `taggerStatus ${type ? `is-${type}` : ""}`;
}

function setBusy(next) {
  state.busy = !!next;
  document.body.classList.toggle("taggerBusy", state.busy);
}

async function apiJson(url, options = {}) {
  const res = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.detail || `HTTP ${res.status}`);
  return data;
}

function isGoogleTrack(track = {}) {
  const source = String(track.source || track.sourceType || track.cloudProvider || "").toLowerCase();
  const locator = String(track.locator || "").toLowerCase();
  return source.includes("google") || locator.startsWith("gdrive://");
}

function isLocalTrack(track = {}) {
  return String(track.source || "").toLowerCase() === "local" && !!track.locator;
}

function getTrackTitle(track = {}) {
  return track.title || track.name || track.filename || track.id || "Untitled file";
}

function getTrackSubtitle(track = {}) {
  if (isGoogleTrack(track)) return `${track.artist || "Google Drive"}${track.album ? ` · ${track.album}` : ""}`;
  return `${track.artist || "Local file"}${track.album ? ` · ${track.album}` : ""}`;
}

function getArtworkUrl(track = {}) {
  if (!track?.id) return "";
  if (isGoogleTrack(track) && track.hasArtwork) return `/cloud/google/artwork/${encodeURIComponent(track.id)}`;
  if (isLocalTrack(track)) return `/track/${encodeURIComponent(track.id)}/artwork`;
  return "";
}

function createBlankTags() {
  return STANDARD_TAG_FIELDS.reduce((tags, field) => {
    tags[field.key] = field.key === "encodedBy" ? "BRMedia Centre" : "";
    return tags;
  }, {});
}

function inferCategoryFromTrack(track = {}, metadata = {}) {
  const text = [track.title, track.artist, metadata.title, metadata.artist, metadata.albumArtist, metadata.comment]
    .join(" ")
    .toLowerCase();
  if (/upalnite/.test(text)) return "Upalnite Mixes";
  if (/dj\s*nj|\bnj\b/.test(text)) return "DJ NJ Mixes";
  if (/blackburn\s*ravers|brmedia|\bbr\b/.test(text)) return "Blackburn Ravers Mixes";
  return taggerSettings.defaultCategory || "Other Mixes";
}

function categoryToBrand(category = "") {
  const found = TAGGER_BR_CATEGORIES.find((item) => item.key === category) || TAGGER_BR_CATEGORIES.at(-1);
  return found || TAGGER_BR_CATEGORIES[3];
}

function createBlankBrmediaTags(track = {}, metadata = {}) {
  const category = inferCategoryFromTrack(track, metadata);
  const brand = categoryToBrand(category);
  return {
    primaryBrand: brand.brand,
    brandImageKey: brand.imageKey,
    category,
    extraBrands: [],
    series: "",
    episode: "",
    releaseType: "Mix",
    radioOnly: false,
    freeSong: false,
    tracklistStatus: "None",
    customNotes: "",
  };
}

function mergeMetadataIntoTags(meta = {}, fallbackTrack = {}) {
  const next = createBlankTags();
  STANDARD_TAG_FIELDS.forEach((field) => {
    const value = meta[field.key];
    if (value !== undefined && value !== null) next[field.key] = String(value);
  });
  next.title = next.title || getTrackTitle(fallbackTrack);
  next.artist = next.artist || fallbackTrack.artist || "";
  next.album = next.album || fallbackTrack.album || "";
  next.albumArtist = next.albumArtist || fallbackTrack.albumArtist || "";
  next.genre = next.genre || fallbackTrack.genre || "";
  next.comment = next.comment || fallbackTrack.comment || "";
  return next;
}

function getAdvancedRowsFromMeta(meta = {}) {
  const advanced = meta.advancedTags && typeof meta.advancedTags === "object" ? meta.advancedTags : {};
  return Object.entries(advanced)
    .slice(0, 28)
    .map(([key, value]) => ({ key, value: Array.isArray(value) ? value.join("; ") : String(value ?? "") }))
    .filter((row) => row.key && row.value);
}

async function loadLibrary() {
  const items = [];
  const seen = new Set();

  function add(list = [], sourcePatch = {}) {
    if (!Array.isArray(list)) return;
    list.forEach((item) => {
      const id = String(item?.id || item?.trackId || "");
      if (!id || seen.has(id)) return;
      seen.add(id);
      items.push({ ...sourcePatch, ...item });
    });
  }

  const library = await apiJson("/library").catch(() => []);
  add(Array.isArray(library) ? library : library.items || library.tracks || []);

  const linked = await apiJson("/cloud/linked-tracks").catch(() => ({ items: [] }));
  add(linked.items || [], { source: "google_drive", sourceType: "googleDrive", cloudProvider: "google_drive" });

  state.tracks = items.sort((a, b) => getTrackTitle(a).localeCompare(getTrackTitle(b)));
  return state.tracks;
}

async function loadTrack(trackId) {
  const track = state.tracks.find((item) => String(item.id) === String(trackId));
  if (!track) throw new Error("Track not found in Tagger library list");

  state.selectedTrackId = track.id;
  state.selectedTrack = track;
  state.artworkDataUrl = "";
  state.advancedRows = [];

  let meta = {};
  if (isLocalTrack(track)) {
    meta = await apiJson(`/track/${encodeURIComponent(track.id)}/meta`).catch(() => ({}));
  } else {
    meta = { ...track, title: getTrackTitle(track) };
  }

  const saved = await apiJson(`/brmedia/custom-tags/${encodeURIComponent(track.id)}`).catch(() => ({ tags: {} }));
  const savedTags = saved?.tags && typeof saved.tags === "object" ? saved.tags : {};

  state.metadata = mergeMetadataIntoTags({ ...meta, ...savedTags }, track);
  state.brmedia = {
    ...createBlankBrmediaTags(track, meta),
    ...(savedTags || {}),
  };
  if (!TAGGER_BR_CATEGORIES.some((item) => item.key === state.brmedia.category)) {
    state.brmedia.category = inferCategoryFromTrack(track, meta);
  }
  const brand = categoryToBrand(state.brmedia.category);
  state.brmedia.primaryBrand = brand.brand;
  state.brmedia.brandImageKey = brand.imageKey;
  state.advancedRows = taggerSettings.preserveExistingAdvanced ? getAdvancedRowsFromMeta(meta) : [];

  renderTagger();
  setStatus(`Loaded ${getTrackTitle(track)}.`, "success");
}

function normaliseFieldValue(value) {
  return String(value ?? "").trim();
}

function collectTagFields() {
  const next = createBlankTags();
  STANDARD_TAG_FIELDS.forEach((field) => {
    next[field.key] = normaliseFieldValue(document.querySelector(`[data-tag-field="${field.key}"]`)?.value || "");
  });
  state.metadata = next;
}

function collectBrmediaFields() {
  const category = document.querySelector("[data-brmedia-category].active")?.dataset.brmediaCategory || state.brmedia.category || "Other Mixes";
  const brand = categoryToBrand(category);
  state.brmedia = {
    ...state.brmedia,
    primaryBrand: brand.brand,
    brandImageKey: brand.imageKey,
    category,
    series: normaliseFieldValue($("brSeries")?.value || ""),
    episode: normaliseFieldValue($("brEpisode")?.value || ""),
    releaseType: normaliseFieldValue($("brReleaseType")?.value || "Mix"),
    tracklistStatus: normaliseFieldValue($("brTracklistStatus")?.value || "None"),
    radioOnly: !!$("brRadioOnly")?.checked,
    freeSong: !!$("brFreeSong")?.checked,
    customNotes: normaliseFieldValue($("brCustomNotes")?.value || ""),
    extraBrands: [],
  };
}

function collectAdvancedRows() {
  state.advancedRows = Array.from(document.querySelectorAll(".advancedTagRow")).map((row) => ({
    key: normaliseFieldValue(row.querySelector("[data-advanced-key]")?.value || ""),
    value: normaliseFieldValue(row.querySelector("[data-advanced-value]")?.value || ""),
  })).filter((row) => row.key && row.value);
}

function collectAllState() {
  collectTagFields();
  collectBrmediaFields();
  collectAdvancedRows();
}

function buildAdvancedTags() {
  const advanced = {};
  STANDARD_TAG_FIELDS.forEach((field) => {
    if (!field.advancedKey) return;
    const value = normaliseFieldValue(state.metadata[field.key]);
    if (value) advanced[field.advancedKey] = value;
  });
  state.advancedRows.forEach((row) => {
    const key = String(row.key || "").trim().replace(/[=\r\n]/g, "");
    if (key) advanced[key] = row.value;
  });
  return advanced;
}

function buildTagPayload() {
  collectAllState();
  const tags = {
    ...state.metadata,
    ...state.brmedia,
    advancedTags: buildAdvancedTags(),
    artworkDataUrl: state.artworkDataUrl || "",
  };

  if (state.metadata.trackTotal) tags.advancedTags.TOTALTRACKS = state.metadata.trackTotal;
  if (state.metadata.discTotal) tags.advancedTags.TOTALDISCS = state.metadata.discTotal;

  return {
    trackId: state.selectedTrackId,
    locator: state.selectedTrack?.locator || "",
    keys: [state.selectedTrackId, state.selectedTrack?.locator].filter(Boolean),
    tags,
  };
}

async function saveSidecarOnly() {
  if (!state.selectedTrack) return setStatus("Choose a file first.", "error");
  setBusy(true);
  try {
    const payload = buildTagPayload();
    const result = await apiJson("/brmedia/custom-tags", { method: "POST", body: JSON.stringify(payload) });
    setStatus(`BRMedia tags saved. ${result.savedKeys || 0} key(s) updated.`, "success");
  } catch (err) {
    setStatus(`Save failed: ${err.message || err}`, "error");
  } finally {
    setBusy(false);
  }
}

async function writeTaggedFile(mode = "copy", download = false) {
  if (!state.selectedTrack) return setStatus("Choose a file first.", "error");
  if (!isLocalTrack(state.selectedTrack)) return setStatus("Cloud files need Save local copy from View Files before Tagger can write file tags.", "error");

  const replace = mode === "replace";
  if (replace && taggerSettings.warnBeforeReplace !== false && !window.confirm("Replace the original file? BRMedia will create an automatic .brmedia-backup file first.")) return;

  setBusy(true);
  try {
    const payload = buildTagPayload();
    if (taggerSettings.autoSaveSidecarBeforeWrite) {
      await apiJson("/brmedia/custom-tags", { method: "POST", body: JSON.stringify(payload) });
    }
    payload.mode = replace ? "replace" : "copy";
    const result = await apiJson("/brmedia/tagger/write-copy", { method: "POST", body: JSON.stringify(payload) });
    setStatus(result.note || "Tagged file written successfully.", "success");
    if (download && result.downloadUrl) window.location.href = result.downloadUrl;
    await loadLibrary();
    if (result.item?.id) await loadTrack(result.item.id);
  } catch (err) {
    setStatus(`Write failed: ${err.message || err}`, "error");
  } finally {
    setBusy(false);
  }
}

async function uploadTaggerLocalFile(file) {
  if (!file) return;

  setBusy(true);
  setStatus(`Uploading ${file.name || "selected file"}…`, "loading");

  try {
    const result = await apiJson(`/library/upload-mobile-file?name=${encodeURIComponent(file.name || "tagger-upload")}`, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });

    if (!result?.item?.id) {
      throw new Error("That file was uploaded but was not added to the audio library. Check the file type is supported.");
    }

    await loadLibrary();
    await loadTrack(result.item.id);
    if (taggerSettings.uploadAfterAction === "save") switchTab("save");
    if (taggerSettings.uploadAfterAction === "main") switchTab("main");
    setStatus(`Loaded uploaded file: ${getTrackTitle(result.item)}.`, "success");
  } catch (err) {
    setStatus(`Upload failed: ${err.message || err}`, "error");
  } finally {
    setBusy(false);
    const input = $("taggerUploadInput");
    if (input) input.value = "";
  }
}

async function saveGoogleLocalCopy() {
  if (!state.selectedTrack || !isGoogleTrack(state.selectedTrack)) return;
  setBusy(true);
  try {
    const result = await apiJson(`/cloud/google/import-linked/${encodeURIComponent(state.selectedTrack.id)}`, { method: "POST", body: JSON.stringify({}) });
    setStatus("Google Drive file saved locally. Loading local copy…", "success");
    await loadLibrary();
    const nextId = result?.item?.id || result?.track?.importedLocalItemId || "";
    if (nextId) await loadTrack(nextId);
    else renderTagger();
  } catch (err) {
    setStatus(`Could not save local copy: ${err.message || err}`, "error");
  } finally {
    setBusy(false);
  }
}

function renderSidebarTaggerNavigation() {
  const nav = document.getElementById("sidebarTaggerNav");
  if (!nav) return;

  const tabs = getTaggerNavigationTabs();
  nav.innerHTML = `
    <div class="sidebarSectionTitle">Tagger sections</div>
    ${tabs.map((tab) => `
      <button class="sidebarNavBtn sidebarTaggerTabBtn ${state.activeTab === tab.key ? "active" : ""}" data-sidebar-tagger-tab="${escapeHtml(tab.key)}" type="button">
        ${iconHtml(tab.icon)}
        <span class="sidebarNavText">
          <span class="sidebarNavBtnTitle">${escapeHtml(tab.title)}</span>
          <span class="sidebarNavBtnSub">${escapeHtml(tab.desc)}</span>
        </span>
      </button>
    `).join("")}
  `;

  hydrateBrIcons(nav);
  nav.querySelectorAll("[data-sidebar-tagger-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      switchTab(button.dataset.sidebarTaggerTab || "main");
      closeModuleSidebar();
    });
  });
}

function updateSidebarTaggerTabState() {
  document.querySelectorAll("[data-sidebar-tagger-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.sidebarTaggerTab === state.activeTab);
  });
}

function keepActiveTabInView(selector = ".taggerTabs", activeSelector = ".taggerTab.active") {
  window.requestAnimationFrame(() => {
    const wrap = document.querySelector(selector);
    const active = document.querySelector(activeSelector);
    if (!wrap || !active) return;

    const left = active.offsetLeft - (wrap.clientWidth / 2) + (active.clientWidth / 2);
    wrap.scrollTo({ left: Math.max(0, left), behavior: "instant" });
  });
}

function switchTab(tab) {
  collectAllState();
  state.activeTab = tab;
  renderTagger();
  updateSidebarTaggerTabState();
  keepActiveTabInView();
}

function renderLibraryOptions() {
  const search = String($("taggerLibrarySearch")?.value || "").toLowerCase().trim();
  const tracks = search
    ? state.tracks.filter((track) => [getTrackTitle(track), getTrackSubtitle(track), track.id].join(" ").toLowerCase().includes(search))
    : state.tracks;

  return tracks.map((track) => `<option value="${escapeHtml(track.id)}" ${track.id === state.selectedTrackId ? "selected" : ""}>${escapeHtml(getTrackTitle(track))} — ${escapeHtml(isGoogleTrack(track) ? "Google Drive" : "Local")}</option>`).join("");
}

function renderField(field) {
  const value = state.metadata[field.key] || "";
  const common = `data-tag-field="${escapeHtml(field.key)}" placeholder="${escapeHtml(field.placeholder || "")}"`;
  return `
    <label class="taggerField ${field.multiline ? "wide" : ""}">
      <span>${escapeHtml(field.label)}</span>
      ${field.multiline
        ? `<textarea ${common}>${escapeHtml(value)}</textarea>`
        : `<input ${common} type="${escapeHtml(field.type || "text")}" value="${escapeHtml(value)}" />`}
    </label>
  `;
}

function getTagSection(sectionKey = "main") {
  return TAGGER_TAG_SECTIONS.find((section) => section.key === sectionKey) || TAGGER_TAG_SECTIONS[0];
}

function renderTagSectionPanel(sectionKey = "main") {
  const section = getTagSection(sectionKey);
  const fields = STANDARD_TAG_FIELDS.filter((field) => field.group === section.key);

  return `
    <section class="taggerPanel">
      <div class="taggerPanelHead">
        <span>${iconHtml(section.icon)}</span>
        <div><h3>${escapeHtml(section.title)}</h3><p>${escapeHtml(section.desc)} · ${fields.length} fields</p></div>
      </div>
      <div class="taggerSectionHint">${iconHtml("circle-check")}<span>Changes stay on-screen until you save a sidecar, write a tagged copy, download, or replace with backup.</span></div>
      <div class="taggerFieldGrid">
        ${fields.map(renderField).join("")}
      </div>
    </section>
  `;
}

function renderBrmediaPanel() {
  return `
    <section class="taggerPanel">
      <div class="taggerPanelHead">
        <span>${iconHtml("wand-magic-sparkles")}</span>
        <div><h3>BRMedia sorting tags</h3><p>Simple category sorting only: Blackburn Ravers, DJ NJ, Upalnite or Other Mixes.</p></div>
      </div>
      <div class="taggerCategoryGrid">
        ${TAGGER_BR_CATEGORIES.map((item) => `
          <button class="taggerCategoryBtn ${state.brmedia.category === item.key ? "active" : ""}" data-brmedia-category="${escapeHtml(item.key)}" type="button">
            ${iconHtml(item.icon)}
            <strong>${escapeHtml(item.title)}</strong>
            <em>${escapeHtml(item.brand)} / ${escapeHtml(item.imageKey)}</em>
          </button>
        `).join("")}
      </div>
      <div class="taggerFieldGrid">
        <label class="taggerField"><span>Series</span><input id="brSeries" value="${escapeHtml(state.brmedia.series || "")}" placeholder="The Hardcore Medley / HTID…" /></label>
        <label class="taggerField"><span>Episode</span><input id="brEpisode" value="${escapeHtml(state.brmedia.episode || "")}" placeholder="015 / EP015" /></label>
        <label class="taggerField"><span>Release type</span><select id="brReleaseType">
          ${["Mix", "Radio Show", "Free Song", "DJ MP3", "Master", "Other"].map((item) => `<option ${state.brmedia.releaseType === item ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
        </select></label>
        <label class="taggerField"><span>Tracklist status</span><select id="brTracklistStatus">
          ${["None", "Uploaded", "Auto scanned", "Needs review", "Complete"].map((item) => `<option ${state.brmedia.tracklistStatus === item ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
        </select></label>
        <label class="taggerToggle"><span>Radio only</span><input id="brRadioOnly" type="checkbox" ${state.brmedia.radioOnly ? "checked" : ""} /></label>
        <label class="taggerToggle"><span>Free song</span><input id="brFreeSong" type="checkbox" ${state.brmedia.freeSong ? "checked" : ""} /></label>
        <label class="taggerField wide"><span>BRMedia notes</span><textarea id="brCustomNotes" placeholder="Private category/sorting notes">${escapeHtml(state.brmedia.customNotes || "")}</textarea></label>
      </div>
    </section>
  `;
}

function renderArtworkPanel() {
  const artworkUrl = state.artworkDataUrl || getArtworkUrl(state.selectedTrack || {});
  return `
    <section class="taggerPanel">
      <div class="taggerPanelHead">
        <span>${iconHtml("image")}</span>
        <div><h3>Artwork</h3><p>Preview current art or choose new front cover artwork for tagged copies.</p></div>
      </div>
      <div class="taggerArtworkGrid">
        <div class="taggerArtworkPreview" style="${artworkUrl ? `background-image:url('${escapeHtml(artworkUrl)}')` : ""}">${artworkUrl ? "" : iconHtml("image")}</div>
        <div class="taggerArtworkActions">
          <input id="taggerArtworkInput" type="file" accept="image/png,image/jpeg" hidden />
          <button class="taggerBtn primary" data-action="pick-artwork" type="button">${iconHtml("image")}<span>Choose artwork</span></button>
          <button class="taggerBtn" data-action="clear-artwork" type="button">${iconHtml("xmark")}<span>Clear new artwork</span></button>
          <p>Artwork embedding is active for MP3/M4A/AAC through the safe FFmpeg write flow.</p>
        </div>
      </div>
    </section>
  `;
}

function renderAdvancedPanel() {
  const rows = state.advancedRows.length ? state.advancedRows : [{ key: "", value: "" }];
  return `
    <section class="taggerPanel">
      <div class="taggerPanelHead">
        <span>${iconHtml("sliders")}</span>
        <div><h3>Advanced tags</h3><p>Add extra FFmpeg metadata keys without cluttering the main screen.</p></div>
      </div>
      <div id="advancedRows" class="advancedRows">
        ${rows.map((row) => `
          <div class="advancedTagRow">
            <input data-advanced-key value="${escapeHtml(row.key)}" placeholder="metadata_key" />
            <input data-advanced-value value="${escapeHtml(row.value)}" placeholder="Value" />
            <button class="taggerMiniBtn" data-action="remove-advanced-row" type="button">${iconHtml("xmark")}</button>
          </div>
        `).join("")}
      </div>
      <button class="taggerBtn" data-action="add-advanced-row" type="button">${iconHtml("plus")}<span>Add advanced tag</span></button>
    </section>
  `;
}

function renderSavePanel() {
  const cloudWarning = state.selectedTrack && !isLocalTrack(state.selectedTrack);
  return `
    <section class="taggerPanel">
      <div class="taggerPanelHead">
        <span>${iconHtml("floppy-disk")}</span>
        <div><h3>Save modes</h3><p>Everything is safe-first. Sidecar saves category data, copy writes a new file, replace makes a backup first.</p></div>
      </div>
      ${cloudWarning ? `<div class="taggerWarning">${iconHtml("triangle-exclamation")}<span>This is a cloud-linked file. Save a local copy before writing file tags.</span></div>` : ""}
      <div class="taggerSaveGrid">
        <button class="taggerSaveCard ${taggerSettings.defaultSaveMode === "sidecar" ? "recommended" : ""}" data-action="save-sidecar" type="button">${iconHtml("floppy-disk")}<strong>Save BRMedia tags</strong><em>Fast sidecar/custom tag save only.</em></button>
        ${cloudWarning ? `<button class="taggerSaveCard" data-action="save-google-local" type="button">${iconHtml("google-drive")}<strong>Save local copy</strong><em>Bring Google Drive file into local library first.</em></button>` : ""}
        <button class="taggerSaveCard primary ${taggerSettings.defaultSaveMode === "copy" ? "recommended" : ""}" data-action="write-copy" type="button" ${cloudWarning ? "disabled" : ""}>${iconHtml("copy")}<strong>Write tagged copy</strong><em>Create a new tagged file. Original untouched.</em></button>
        <button class="taggerSaveCard ${taggerSettings.defaultSaveMode === "download" ? "recommended" : ""}" data-action="write-download" type="button" ${cloudWarning ? "disabled" : ""}>${iconHtml("download")}<strong>Write + download</strong><em>Create tagged copy and download/open it.</em></button>
        <button class="taggerSaveCard danger" data-action="replace-original" type="button" ${cloudWarning ? "disabled" : ""}>${iconHtml("arrows-rotate")}<strong>Replace original</strong><em>Automatic backup first, then replace.</em></button>
      </div>
    </section>
  `;
}

function renderActivePanel() {
  if (!state.selectedTrack) {
    return `
      <section class="taggerPanel taggerEmptyPanel">
        ${iconHtml("tag")}
        <h3>Choose a file to start</h3>
        <p>Pick a local file or an imported Google Drive file. Cloud-linked files can be previewed here, then saved locally before writing audio tags.</p>
      </section>
    `;
  }

  if (TAGGER_TAG_SECTIONS.some((section) => section.key === state.activeTab)) return renderTagSectionPanel(state.activeTab);
  if (state.activeTab === "brmedia") return renderBrmediaPanel();
  if (state.activeTab === "artwork") return renderArtworkPanel();
  if (state.activeTab === "advanced") return renderAdvancedPanel();
  if (state.activeTab === "save") return renderSavePanel();

  return renderTagSectionPanel("main");
}

function renderTrackHero() {
  const track = state.selectedTrack;
  const artworkUrl = track ? (state.artworkDataUrl || getArtworkUrl(track)) : "";
  return `
    <section class="taggerHeroCard">
      <div class="taggerHeroArt" style="${artworkUrl ? `background-image:url('${escapeHtml(artworkUrl)}')` : ""}">${artworkUrl ? "" : iconHtml("tag")}</div>
      <div class="taggerHeroText">
        <span>BRMedia Tagger</span>
        <h2>${escapeHtml(track ? getTrackTitle(track) : "Full audio metadata editor")}</h2>
        <p>${escapeHtml(track ? getTrackSubtitle(track) : "Edit normal audio tags, artwork and BRMedia sorting tags in one clean place.")}</p>
        <div class="taggerHeroChips">
          <b>${track && isLocalTrack(track) ? "Local write-ready" : track ? "Cloud preview" : "Choose file"}</b>
          <b>${escapeHtml(state.brmedia.category || "BRMedia categories")}</b>
          <b>${state.metadata.genre ? escapeHtml(state.metadata.genre) : "Normal tags"}</b>
        </div>
      </div>
    </section>
  `;
}

function getTaggerNavigationTabs() {
  return [
    ...TAGGER_TAG_SECTIONS,
    { key: "brmedia", title: "BRMedia sort", desc: "Blackburn Ravers, DJ NJ, Upalnite or Other Mixes.", icon: "wand-magic-sparkles" },
    { key: "artwork", title: "Artwork", desc: "Preview or replace the front cover artwork.", icon: "image" },
    { key: "advanced", title: "Advanced", desc: "Extra custom FFmpeg metadata keys.", icon: "sliders" },
    { key: "save", title: "Save modes", desc: "Sidecar, tagged copy, download or safe replace.", icon: "floppy-disk" },
  ];
}

function renderTabs() {
  const tabs = getTaggerNavigationTabs();
  return `<div class="taggerTabs">${tabs.map((tab) => `<button class="taggerTab ${state.activeTab === tab.key ? "active" : ""}" data-tab="${escapeHtml(tab.key)}" type="button">${iconHtml(tab.icon)}<span>${escapeHtml(tab.title)}</span></button>`).join("")}</div>`;
}

function renderTagger() {
  if (!taggerRoot) return;
  taggerRoot.innerHTML = `
    <div class="taggerShell">
      ${renderTrackHero()}

      <section class="taggerPickerCard">
        <div class="taggerPickerHead">
          <div><h3>Source file</h3><p>Open from Player/View Files with ?trackId=, or choose from the library here.</p></div>
          <button class="taggerBtn" data-action="refresh-library" type="button">${iconHtml("rotate-left")}<span>Refresh</span></button>
        </div>
        <input id="taggerLibrarySearch" class="taggerSearch" placeholder="Search library…" />

        <input id="taggerUploadInput" type="file" accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.opus,.aiff,.aif,.wma" hidden />
        <button class="taggerBtn taggerBrowseBtn" data-action="browse-local-file" type="button">
          ${iconHtml("folder-plus")}
          <span>Browse phone / PC file</span>
        </button>

        <div class="taggerPickerRow">
          <select id="taggerTrackSelect"><option value="">Choose audio file…</option>${renderLibraryOptions()}</select>
          <button class="taggerBtn primary" data-action="load-selected" type="button">${iconHtml("folder-open")}<span>Load from library</span></button>
        </div>
      </section>

      ${renderTabs()}
      ${renderActivePanel()}
      <div id="taggerStatus" class="taggerStatus">Ready.</div>
    </div>
  `;
  bindTaggerEvents();
  hydrateBrIcons(taggerRoot);
  renderSidebarTaggerNavigation();
  updateSidebarTaggerTabState();
  keepActiveTabInView();
}

function bindTaggerEvents() {
  $("taggerLibrarySearch")?.addEventListener("input", () => renderTagger());
  $("taggerTrackSelect")?.addEventListener("change", (event) => {
    state.selectedTrackId = event.target.value || "";
  });

  taggerRoot.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab || "main"));
  });

  taggerRoot.querySelectorAll("[data-brmedia-category]").forEach((button) => {
    button.addEventListener("click", () => {
      collectAllState();
      const brand = categoryToBrand(button.dataset.brmediaCategory || "Other Mixes");
      state.brmedia.category = brand.key;
      state.brmedia.primaryBrand = brand.brand;
      state.brmedia.brandImageKey = brand.imageKey;
      renderTagger();
    });
  });

  taggerRoot.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.action || "";
      if (action === "refresh-library") {
        setStatus("Refreshing library…", "loading");
        await loadLibrary();
        renderTagger();
        setStatus("Library refreshed.", "success");
      }
      if (action === "load-selected") {
        const id = $("taggerTrackSelect")?.value || state.selectedTrackId;
        if (id) await loadTrack(id).catch((err) => setStatus(`Load failed: ${err.message || err}`, "error"));
      }
      if (action === "browse-local-file") $("taggerUploadInput")?.click();
      if (action === "pick-artwork") $("taggerArtworkInput")?.click();
      if (action === "clear-artwork") {
        state.artworkDataUrl = "";
        renderTagger();
      }
      if (action === "add-advanced-row") {
        collectAllState();
        state.advancedRows.push({ key: "", value: "" });
        renderTagger();
      }
      if (action === "remove-advanced-row") {
        collectAllState();
        const row = button.closest(".advancedTagRow");
        const index = Array.from(document.querySelectorAll(".advancedTagRow")).indexOf(row);
        if (index >= 0) state.advancedRows.splice(index, 1);
        renderTagger();
      }
      if (action === "save-sidecar") await saveSidecarOnly();
      if (action === "write-copy") await writeTaggedFile("copy", false);
      if (action === "write-download") await writeTaggedFile("copy", true);
      if (action === "replace-original") await writeTaggedFile("replace", false);
      if (action === "save-google-local") await saveGoogleLocalCopy();
    });
  });

  $("taggerUploadInput")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) void uploadTaggerLocalFile(file);
  });

  $("taggerArtworkInput")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.artworkDataUrl = String(reader.result || "");
      renderTagger();
    };
    reader.readAsDataURL(file);
  });
}

btnModuleMenu?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  toggleModuleSidebar();
});
btnModuleSidebarCloseFloating?.addEventListener("click", closeModuleSidebar);
moduleSidebarBackdrop?.addEventListener("click", closeModuleSidebar);
moduleSearchBtn?.addEventListener("click", () => window.location.href = "/player");
window.addEventListener("scroll", syncTopMenuDockState, { passive: true });
window.addEventListener("resize", syncTopMenuDockState);
document.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", () => goToRoute(button.dataset.route || "/")));
document.querySelectorAll("[data-sidebar-tagger-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    switchTab(button.dataset.sidebarTaggerTab || "main");
    closeModuleSidebar();
  });
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModuleSidebar();
});

window.addEventListener("DOMContentLoaded", async () => {
  startBrIconHydrator();
  syncTopMenuDockState();
  renderTagger();
  setStatus("Loading library…", "loading");
  await loadLibrary().catch((err) => setStatus(`Could not load library: ${err.message || err}`, "error"));
  renderTagger();
  const initialId = readQueryParam("trackId") || readQueryParam("id");
  if (initialId) {
    await loadTrack(initialId).catch((err) => setStatus(`Could not load selected file: ${err.message || err}`, "error"));
  } else {
    setStatus("Choose a file to start tagging.", "");
  }
});