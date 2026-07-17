const $ = (id) => document.getElementById(id);

const moduleSearchBtn = document.querySelector(".moduleSearchBtn");
const btnModuleMenu = $("btnModuleMenu");
const moduleSidebar = $("moduleSidebar");
const moduleSidebarBackdrop = $("moduleSidebarBackdrop");
const btnModuleSidebarCloseFloating = $("btnModuleSidebarCloseFloating");
const viewButtons = Array.from(document.querySelectorAll("[data-dj-view]"));
const sidebarViewButtons = Array.from(document.querySelectorAll("[data-dj-sidebar-view]"));
const views = Array.from(document.querySelectorAll("[data-dj-panel]"));
const setupFields = Array.from(document.querySelectorAll("[data-dj-field]"));
const requiredFields = Array.from(document.querySelectorAll("[data-dj-required='true']"));
const requiredFlags = Array.from(document.querySelectorAll("[data-dj-required-flag]"));
const choiceButtons = Array.from(document.querySelectorAll("[data-dj-choice]"));
const formatPanels = Array.from(document.querySelectorAll("[data-dj-format-panel]"));
const setupSaveBtn = $("djSetupSaveBtn");
const setupReadyBtn = $("djSetupReadyBtn");
const setupResetBtn = $("djSetupResetBtn");
const setupStatusText = $("djSetupStatusText");
const requiredSummary = $("djRequiredSummary");
const requiredSummaryText = $("djRequiredSummaryText");
const setupTitlePreview = $("djSetupTitlePreview");
const setupArtistPreview = $("djSetupArtistPreview");
const setupCountdownPreview = $("djSetupCountdownPreview");
const recordFormatPreview = $("djRecordFormatPreview");
const recordQualityPreview = $("djRecordQualityPreview");
const artworkInput = $("djArtworkInput");
const artworkPreview = $("djArtworkPreview");
const artworkName = $("djArtworkName");
const launchButtons = Array.from(document.querySelectorAll("[data-dj-launch]"));
const performanceShell = $("djPerformanceShell");
const performanceBackBtn = $("djPerformanceBackBtn");
const djLibraryButton = $("djLibraryButton");
const djLibraryPanel = $("djLibraryPanel");
const djLibraryClose = $("djLibraryClose");
const djLibraryList = $("djLibraryList");
const djLibraryStatus = $("djLibraryStatus");
const djLibraryRefresh = $("djLibraryRefresh");
const djLibrarySearch = $("djLibrarySearch");
const djAnalyseStatus = $("djAnalyseStatus");
const djAnalyseMissingBtn = $("djAnalyseMissingBtn");
const djAnalyseAllBtn = $("djAnalyseAllBtn");
const djPrepEngineBtn = $("djPrepEngineBtn");
const djPrepEngineButtons = Array.from(document.querySelectorAll("[data-dj-prep-engine]"));
const djPrepReadyCount = $("djPrepReadyCount");
const djPrepWaveCount = $("djPrepWaveCount");
const djPrepGridCount = $("djPrepGridCount");
const djPrepAnalysisCount = $("djPrepAnalysisCount");
const djPrepNeedsCount = $("djPrepNeedsCount");
const djCollectionTrackCount = $("djCollectionTrackCount");
const djCollectionMiniDeck = $("djCollectionMiniDeck");
const djCollectionMiniTitle = $("djCollectionMiniTitle");
const djCollectionMiniArtist = $("djCollectionMiniArtist");
const djCollectionMiniProgress = $("djCollectionMiniProgress");
const djCollectionMiniStats = $("djCollectionMiniStats");
const djCollectionMiniToggle = document.querySelector("[data-dj-mini-toggle]");
const djCollectionSort = $("djCollectionSort");
const djCollectionSourceFilter = $("djCollectionSourceFilter");
const djCollectionKeyFilter = $("djCollectionKeyFilter");
const djCollectionBpmMin = $("djCollectionBpmMin");
const djCollectionBpmMax = $("djCollectionBpmMax");
const djCollectionResetFilters = $("djCollectionResetFilters");
const djCollectionFilterButtons = Array.from(document.querySelectorAll("[data-dj-collection-filter]"));
const djLibraryTargetButtons = Array.from(document.querySelectorAll("[data-dj-library-target]"));
const djPlannerModeButtons = Array.from(document.querySelectorAll("[data-dj-planner-mode]"));
const djPlanCreateButtons = Array.from(document.querySelectorAll("[data-dj-plan-create]"));
const djPlanReadyButtons = Array.from(document.querySelectorAll("[data-dj-plan-ready]"));
const djPlanOpenActiveButton = document.querySelector("[data-dj-plan-open-active]");
const djOpenPlanPageButtons = Array.from(document.querySelectorAll("[data-dj-open-plan-page]"));
const djPlanPageBackButtons = Array.from(document.querySelectorAll("[data-dj-plan-page-back]"));
const djPlaylistPage = $("djPlaylistPage");
const djSetPage = $("djSetPage");
const djPlanPanels = Array.from(document.querySelectorAll("[data-dj-plan-panel]"));
const djPlaylistTitle = $("djPlaylistTitle");
const djPlaylistCount = $("djPlaylistCount");
const djPlaylistList = $("djPlaylistList");
const djPlaylistBuilderTitle = $("djPlaylistBuilderTitle");
const djPlaylistBuilderStatus = $("djPlaylistBuilderStatus");
const djPlaylistBuilderCount = $("djPlaylistBuilderCount");
const djPlaylistBuilderRuntime = $("djPlaylistBuilderRuntime");
const djPlaylistBuilderPrepared = $("djPlaylistBuilderPrepared");
const djPlanRenameButtons = Array.from(document.querySelectorAll("[data-dj-plan-rename]"));
const djPlanDeleteButtons = Array.from(document.querySelectorAll("[data-dj-plan-delete]"));
const djPlaylistAddToSetButtons = Array.from(document.querySelectorAll("[data-dj-playlist-add-to-set]"));
const djSetTitle = $("djSetTitle");
const djSetCount = $("djSetCount");
const djSetList = $("djSetList");
const djLinkedSetTitle = $("djLinkedSetTitle");
const djLinkedSetCount = $("djLinkedSetCount");
const djLinkedSetList = $("djLinkedSetList");
const djStudioDashTitle = $("djStudioDashTitle");
const djStudioDashArtist = $("djStudioDashArtist");
const djStudioDashState = $("djStudioDashState");
const djStudioDashSetName = $("djStudioDashSetName");
const djStudioDashSetCount = $("djStudioDashSetCount");
const djStudioDashRuntime = $("djStudioDashRuntime");
const djStudioDashRecord = $("djStudioDashRecord");
const djStudioChecklistTitle = $("djStudioChecklistTitle");
const djStudioChecklist = $("djStudioChecklist");
const djStudioDashLaunch = $("djStudioDashLaunch");
const djHomeFinaliseStatus = $("djHomeFinaliseStatus");
const djHomeTracklistStatus = $("djHomeTracklistStatus");
const djHomeLinkedSetStatus = $("djHomeLinkedSetStatus");
const djHomePlayerStatus = $("djHomePlayerStatus");
const djHomeCurrentStatus = $("djHomeCurrentStatus");
const djHomeCurrentTitle = $("djHomeCurrentTitle");
const djHomeCurrentMeta = $("djHomeCurrentMeta");
const djHomeCurrentSet = $("djHomeCurrentSet");
const djHomeCurrentRecord = $("djHomeCurrentRecord");
const djHomeCurrentTracklist = $("djHomeCurrentTracklist");
const djHomeLatestStatus = $("djHomeLatestStatus");
const djHomeLatestTitle = $("djHomeLatestTitle");
const djHomeLatestMeta = $("djHomeLatestMeta");
const djHomeLatestPlayer = $("djHomeLatestPlayer");
const djHomeLatestFiles = $("djHomeLatestFiles");
const djHomeQuickRecord = $("djHomeQuickRecord");
const djHomeQuickPastShows = $("djHomeQuickPastShows");
const djHomeQuickSet = $("djHomeQuickSet");
const djHomeQuickHandoff = $("djHomeQuickHandoff");
const djFrontCurrentShowTitle = $("djFrontCurrentShowTitle");
const djFrontCurrentShowMeta = $("djFrontCurrentShowMeta");
const djFrontLatestShowTitle = $("djFrontLatestShowTitle");
const djFrontLatestShowMeta = $("djFrontLatestShowMeta");
const djFrontLatestPlayer = $("djFrontLatestPlayer");
const djFrontPrepScore = $("djFrontPrepScore");
const djFrontPrepMeta = $("djFrontPrepMeta");
const djSetBuilderActiveTitle = $("djSetBuilderActiveTitle");
const djSetBuilderStatus = $("djSetBuilderStatus");
const djSetBuilderCount = $("djSetBuilderCount");
const djSetBuilderRuntime = $("djSetBuilderRuntime");
const djSetBuilderPrepared = $("djSetBuilderPrepared");
const djAddToListPopup = $("djAddToListPopup");
const djAddToListTitle = $("djAddToListTitle");
const djAddToListStatus = $("djAddToListStatus");
const djAddToListOptions = $("djAddToListOptions");
const djAddToListCloseButtons = Array.from(document.querySelectorAll("[data-dj-add-close]"));
const djAddToListCreateButtons = Array.from(document.querySelectorAll("[data-dj-add-create]"));
const djOpenCollectionButtons = Array.from(document.querySelectorAll("[data-dj-open-collection]"));
const panelTargetButtons = Array.from(document.querySelectorAll("[data-dj-panel-target]"));
const djSaveNextButtons = Array.from(document.querySelectorAll("[data-dj-save-next]"));
const djBpmPopup = $("djBpmPopup");
const djBpmPopupClose = $("djBpmPopupClose");
const djBpmOpenButtons = Array.from(document.querySelectorAll("[data-dj-open-bpm]"));
const djBpmReadouts = Array.from(document.querySelectorAll("[data-dj-bpm-readout]"));
const djBpmMetas = Array.from(document.querySelectorAll("[data-dj-bpm-meta]"));
const djBpmValueInput = $("djBpmValueInput");
const djBpmStatus = $("djBpmStatus");
const djBpmPopupTitle = $("djBpmPopupTitle");
const djSetMasterDeckBtn = $("djSetMasterDeckBtn");
const djMasterButtons = Array.from(document.querySelectorAll("[data-dj-master-deck]"));
const djMtButtons = Array.from(document.querySelectorAll("[data-dj-pmt]"));
const djCrossfaderModeButtons = Array.from(document.querySelectorAll("[data-dj-crossfader-mode]"));
const djKeySyncButtons = Array.from(document.querySelectorAll("[data-dj-key-sync]"));
const djQuantizeButtons = Array.from(document.querySelectorAll("[data-dj-quantize-option]"));
const djAudio = { d1: $("djAudioD1"), d2: $("djAudioD2") };
const djAudioGraph = { ctx: null, nodes: {}, recordDestination: null };
const djEngine = window.BRMediaDjEngine || null;
const isDjEngineV2Ready = () => Boolean(window.BRMediaDjEngine);
const performanceModeTabs = Array.from(document.querySelectorAll("[data-dj-performance-mode]"));
const performanceModePanels = Array.from(document.querySelectorAll("[data-dj-performance-panel]"));
const performanceDeckTabs = Array.from(document.querySelectorAll("[data-dj-deck-tab]"));
const eqKillButtons = Array.from(document.querySelectorAll("[data-dj-eq-kill]"));
const mixerKnobButtons = Array.from(document.querySelectorAll("[data-dj-eq-kill], [data-dj-mixer-knob]"));
const deckLoadButtons = Array.from(document.querySelectorAll("[data-dj-load-target]"));
const deckPreviewCards = Array.from(document.querySelectorAll("[data-dj-preview]"));
let fxPadButtons = Array.from(document.querySelectorAll("[data-dj-fx-pad]"));
const fxPadGrid = $("djFxPadGrid");
const fxSelectorGrid = $("djFxSelectorGrid");
const fxSelectorCount = $("djFxSelectorCount");
const fxSelectorStatus = $("djFxSelectorStatus");
const liveFxBankTitle = $("djLiveFxBankTitle");
const liveFxBankSubtitle = $("djLiveFxBankSubtitle");
const fxBankPresetButtons = Array.from(document.querySelectorAll("[data-dj-fx-bank-preset]"));
const fxTargetButtons = Array.from(document.querySelectorAll("[data-dj-fx-target]"));
const fxClearButtons = Array.from(document.querySelectorAll("[data-dj-fx-clear]"));
const fxWetMain = document.querySelector("[data-dj-fx-wet-main]");
const fxWetReadout = $("djFxWetReadout");
const stemFaders = Array.from(document.querySelectorAll("[data-dj-stem-fader]"));
const stemMuteButtons = Array.from(document.querySelectorAll("[data-dj-stem-mute]"));
const stemSoloButtons = Array.from(document.querySelectorAll("[data-dj-stem-solo]"));
const stemPresetButtons = Array.from(document.querySelectorAll("[data-dj-stem-preset]"));
const stemCopyBothButtons = Array.from(document.querySelectorAll("[data-dj-stem-copy-both]"));
const stemResetButtons = Array.from(document.querySelectorAll("[data-dj-stem-reset]"));
const stemLabels = Array.from(document.querySelectorAll("[data-dj-stem-label]"));
const perfSetTitle = $("djPerfSetTitle");
const perfSetProgress = $("djPerfSetProgress");
const perfNextTrack = $("djPerfNextTrack");
const perfNextMeta = $("djPerfNextMeta");
const loadNextSetButtons = Array.from(document.querySelectorAll("[data-dj-load-next-set]"));
const markSetPlayedButtons = Array.from(document.querySelectorAll("[data-dj-mark-set-played]"));
const vinylPlatters = Array.from(document.querySelectorAll("[data-dj-platter]"));
const vinylActionButtons = Array.from(document.querySelectorAll("[data-dj-vinyl-action]"));
const crossfaderReset = document.querySelector(".djCrossfaderReset");
const crossfaderRail = document.querySelector(".djCrossfaderRail");
const crossfaderThumb = document.querySelector(".djCrossfaderRail span");
const djRecBeacon = $("djRecBeacon");
const djRecordingList = $("djRecordingList");
const djRecordingClearBtn = $("djRecordingClearBtn");
const djTracklistExportSummary = $("djTracklistExportSummary");
const djRecordFinalFormatSummary = $("djRecordFinalFormatSummary");
const djRecordSidecarSummary = $("djRecordSidecarSummary");
const djRecordDestinationSummary = $("djRecordDestinationSummary");
const channelFaders = Array.from(document.querySelectorAll("[data-dj-channel-fader]"));
const masterMeterBars = Array.from(document.querySelectorAll("[data-dj-meter]"));
const transportButtons = Array.from(document.querySelectorAll("[data-dj-transport]"));
const syncButtons = Array.from(document.querySelectorAll("[data-dj-sync-toggle]"));
const eqModeButtons = Array.from(document.querySelectorAll("[data-dj-eq-mode]"));
const deckTitles = {
  d1: $("djDeck1Title"),
  d2: $("djDeck2Title"),
  mainD1: $("djMainDeck1Title"),
  mainD2: $("djMainDeck2Title"),
};

const deckArtists = {
  d1: $("djDeck1Artist"),
  d2: $("djDeck2Artist"),
};
const waveformOverviewCanvases = Array.from(document.querySelectorAll("[data-dj-waveform-overview]"));
const waveformMainCanvases = Array.from(document.querySelectorAll("[data-dj-waveform-main]"));
const waveformDeckPanels = Array.from(document.querySelectorAll("[data-dj-waveform-deck]"));
const waveformModeButtons = Array.from(document.querySelectorAll("[data-dj-waveform-mode]"));
const waveformZoomButtons = Array.from(document.querySelectorAll("[data-dj-waveform-zoom]"));
const waveformZoomLabel = $("djWaveformZoomLabel");
const quantizeToggleButtons = Array.from(document.querySelectorAll("[data-dj-quantize-toggle]"));
const gridActionButtons = Array.from(document.querySelectorAll("[data-dj-grid-action]"));
const gridReadinessLabels = Array.from(document.querySelectorAll("[data-dj-grid-readiness]"));
const gridReadoutLabels = Array.from(document.querySelectorAll("[data-dj-grid-readout]"));
const loopSizeButtons = Array.from(document.querySelectorAll("[data-dj-loop-size]"));
const loopMoveButtons = Array.from(document.querySelectorAll("[data-dj-loop-move]"));
const singleDeckViews = Array.from(document.querySelectorAll("[data-dj-single-deck]"));
const deckTimeToggles = Array.from(document.querySelectorAll("[data-dj-time-toggle]"));
const singleDeckTabButtons = Array.from(document.querySelectorAll("[data-dj-single-tab]"));
const singleDeckBackButtons = Array.from(document.querySelectorAll("[data-dj-single-back]"));
const singleModePanels = Array.from(document.querySelectorAll("[data-dj-single-panel]"));
const singleDeckLoopButtons = Array.from(document.querySelectorAll("[data-dj-single-loop]"));
const singleDeckBpmInput = $("djSingleGridBpm");
const singleHotCueButtons = Array.from(document.querySelectorAll("[data-dj-hot-cue]"));
const singleHotCueClearButton = document.querySelector("[data-dj-hot-cue-clear]");
const memoryActionButtons = Array.from(document.querySelectorAll("[data-dj-memory-action]"));
const memoryOpenButtons = Array.from(document.querySelectorAll("[data-dj-memory-open]"));
const memorySummaryLabels = Array.from(document.querySelectorAll("[data-dj-memory-summary]"));
const memoryCuePopup = $("djMemoryCuePopup");
const memoryCuePopupTitle = $("djMemoryCuePopupTitle");
const memoryCuePopupStatus = $("djMemoryCuePopupStatus");
const memoryCuePopupList = $("djMemoryCuePopupList");
const memoryCuePopupActionButtons = Array.from(document.querySelectorAll("[data-dj-memory-popup-action]"));
const memoryCuePopupCloseButtons = Array.from(document.querySelectorAll("[data-dj-memory-close]"));
const singleFxButtons = Array.from(document.querySelectorAll("[data-dj-single-fx]"));
const singleFxWet = document.querySelector("[data-dj-single-fx-wet]");
const singleDeckZoomButtons = Array.from(document.querySelectorAll("[data-dj-single-zoom]"));

const waveformStatus = {
  d1: $("djWaveformD1Status"),
  d2: $("djWaveformD2Status"),
};

const singleDeckStatus = {
  d1: $("djSingleDeck1Status"),
  d2: $("djSingleDeck2Status"),
};

const moduleSidebarScrollLock = { y: 0 };
const DJ_SETUP_KEY = "brmedia.djMixer.currentSetup.v1";
const DJ_TRACK_GRID_KEY = "brmedia.djMixer.trackGrids.v1";
const DJ_TRACK_PREP_KEY = "brmedia.djMixer.trackPrep.v1";
const DJ_TRACK_ANALYSIS_KEY = "brmedia.djMixer.trackAnalysis.v1";
const DJ_TRACK_CUE_KEY = "brmedia.djMixer.trackCues.v1";
const DJ_RECORDINGS_KEY = "brmedia.djMixer.recordings.v1";
const DJ_WAVEFORM_THEME_KEY = "brmedia.djMixer.waveformTheme.v1";
const DJ_WAVEFORM_THEME_BY_DECK_KEY = "brmedia.djMixer.waveformThemeByDeck.v1";
const DJ_SYNC_PROFILE_KEY = "brmedia.djMixer.syncProfile.v1";
const DJ_COLLECTION_PLANS_KEY = "brmedia.djMixer.collectionPlans.v1";
const DJ_BACKGROUND_PLAYBACK_KEY = "brmedia.djMixer.backgroundIntent.v1";
const DJ_ANALYSIS_WORKER_URL = "/dj-mixer/analysis-worker.js?v=20260624-dj-view-switch-resume1";
const DJ_PREP_SERVER_CACHE_URL = "/dj-mixer/prep-cache";
const DJ_WAVEFORM_PEAK_COUNT = 8192;
const DJ_WAVEFORM_MEMORY_LIMIT = 18;
const DJ_AUTO_MASTER_THRESHOLD = 0.18;
const DJ_AUTO_MASTER_SWITCH_RATIO = 1.18;
const DJ_ULTRA_LOOP_SIZES = ["1/16 Beat", "1/8 Beat", "1/4 Beat", "1/2 Beat", "1 Beat", "2 Beats", "4 Beats", "8 Beats", "1 Bar", "2 Bars", "4 Bars", "8 Bars", "16 Bars", "32 Bars"];
const DJ_CHROMA_KEYS = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B", "5A", "5B", "6A", "6B", "7A", "7B", "8A", "8B", "9A", "9B", "10A", "10B", "11A", "11B", "12A", "12B"];
const DJ_WAVEFORM_THEMES = [
  {
    id: "brmedia",
    label: "BRMedia",
    low: "rgba(32, 184, 255, 0.94)",
    mid: "rgba(242, 196, 55, 0.86)",
    high: "rgba(255, 250, 218, 0.92)",
  },
  {
    id: "ice",
    label: "Ice Blue",
    low: "rgba(30, 120, 255, 0.92)",
    mid: "rgba(92, 218, 255, 0.84)",
    high: "rgba(248, 254, 255, 0.94)",
  },
  {
    id: "rgb",
    label: "RGB",
    low: "rgba(255, 82, 82, 0.88)",
    mid: "rgba(108, 236, 148, 0.82)",
    high: "rgba(83, 194, 255, 0.90)",
  },
];

const DJ_SELECTED_FX_KEY = "brmedia.djMixer.selectedFx.boardA.v2";
const DJ_SELECTED_FX_BLUE_KEY = "brmedia.djMixer.selectedFx.boardB.v2";
const DJ_LIVE_FX_LIMIT = 16;
const DJ_FX_LIBRARY = [
  { id: "echo", label: "Echo", sub: "Clean 1/2 throw", group: "Beat FX" },
  { id: "delay", label: "Delay", sub: "Club 1 beat", group: "Beat FX" },
  { id: "reverb", label: "Reverb", sub: "Wide hall", group: "Space" },
  { id: "flanger", label: "Flanger", sub: "Jet sweep", group: "Motion" },
  { id: "phaser", label: "Phaser", sub: "Warm motion", group: "Motion" },
  { id: "roll", label: "Roll", sub: "Tight stutter", group: "Beat FX" },
  { id: "crush", label: "Crush", sub: "Clean bit", group: "Colour" },
  { id: "noise", label: "Noise", sub: "Riser build", group: "Colour" },
  { id: "gate", label: "Gate", sub: "Rhythm chop", group: "Cut" },
  { id: "filter", label: "Filter", sub: "Sweep cut", group: "Colour" },
  { id: "spiral", label: "Spiral", sub: "Big rise", group: "Beat FX" },
  { id: "brake", label: "Brake", sub: "Stop pull", group: "Performance" },
  { id: "dub-echo", label: "Dub Echo", sub: "Vocal throw", group: "Beat FX" },
  { id: "build", label: "Build", sub: "Lift sweep", group: "Rave" },
  { id: "drop", label: "Drop", sub: "Slam cut", group: "Rave" },
  { id: "wash", label: "Wash", sub: "Space fill", group: "Space" },
  { id: "trans", label: "Trans", sub: "Hard tremolo chop", group: "Cut" },
  { id: "sweep", label: "Sweep", sub: "Colour sweep", group: "Colour" },
  { id: "jet", label: "Jet", sub: "Classic jet rise", group: "Motion" },
  { id: "slip-roll", label: "Slip Roll", sub: "Slip-style stutter", group: "Beat FX" },
  { id: "vinyl-stop", label: "Vinyl Stop", sub: "Deck stop drag", group: "Performance" },
  { id: "riser", label: "Riser", sub: "Build pressure", group: "Rave" },
  { id: "space", label: "Space", sub: "Huge atmosphere", group: "Space" },
  { id: "laser", label: "Laser", sub: "Sharp rave zap", group: "Rave" },
];

const DJ_FX_PRESET_BANKS = {
  club: ["echo", "delay", "reverb", "flanger", "phaser", "roll", "crush", "noise", "gate", "filter", "spiral", "brake", "dub-echo", "build", "drop", "wash"],
  rave: ["echo", "roll", "trans", "gate", "filter", "spiral", "build", "drop", "wash", "riser", "laser", "jet", "slip-roll", "vinyl-stop", "dub-echo", "noise"],
  clean: ["echo", "delay", "reverb", "filter", "phaser", "flanger", "roll", "gate", "crush", "sweep", "wash", "space", "dub-echo", "brake", "build", "drop"],
  all: DJ_FX_LIBRARY.map((entry) => entry.id),
};

function getFxDefinition(effect = "") {
  const id = normaliseFxName(effect);
  return DJ_FX_LIBRARY.find((entry) => entry.id === id) || DJ_FX_LIBRARY.find((entry) => normaliseFxName(entry.label) === id) || null;
}

function readSelectedFxBank(storageKey = DJ_SELECTED_FX_KEY, fallback = DJ_FX_PRESET_BANKS.club) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (Array.isArray(parsed)) {
      const clean = parsed.map(normaliseFxName).filter((id) => getFxDefinition(id));
      if (clean.length) return clean.slice(0, DJ_LIVE_FX_LIMIT);
    }
  } catch (err) {
    console.warn("DJ FX bank read failed", err);
  }
  return (fallback || DJ_FX_PRESET_BANKS.club).slice(0, DJ_LIVE_FX_LIMIT);
}

function writeSelectedFxBank(ids = [], storageKey = DJ_SELECTED_FX_KEY) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(ids.slice(0, DJ_LIVE_FX_LIMIT)));
  } catch (err) {
    console.warn("DJ FX bank save failed", err);
  }
}

function readWaveformThemeByDeck() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DJ_WAVEFORM_THEME_BY_DECK_KEY) || "null");
    if (parsed && typeof parsed === "object") {
      return {
        d1: Math.max(0, Number(parsed.d1 || 0) || 0),
        d2: Math.max(0, Number(parsed.d2 || 0) || 0),
      };
    }
  } catch (err) {
    console.warn("DJ waveform theme read failed", err);
  }

  const legacy = Math.max(0, Number(localStorage.getItem(DJ_WAVEFORM_THEME_KEY) || "0") || 0);
  return { d1: legacy, d2: legacy };
}

function writeWaveformThemeByDeck() {
  try {
    localStorage.setItem(DJ_WAVEFORM_THEME_BY_DECK_KEY, JSON.stringify(djMixerState.waveformThemeIndexByDeck || { d1: 0, d2: 0 }));
  } catch (err) {
    console.warn("DJ waveform theme save failed", err);
  }
}

const DEFAULT_SETUP = {
  title: "",
  artist: "Upalnite",
  series: "",
  episode: "",
  genre: "Hardcore",
  year: new Date().getFullYear().toString(),
  artworkName: "",
  artworkDataUrl: "",
  description: "",
  notes: "",
  countdown: "6",
  format: "wav",
  channels: "stereo",
  sampleRate: "48000",
  mp3Bitrate: "320",
  wavBitDepth: "24",
  flacBitDepth: "24",
  flacCompression: "5",
  saveBehaviour: "keep-wav-copy",
  recoveryQuality: "best-practical",
  libraryMode: "short-mixable",
  libraryPathPrimary: "DJ MP3s / WAVs",
  libraryPathExtra: "",
  filenamePattern: "{title} - {date}",
  destination: "DJ Recordings",
  tracklistMode: "tracklist-info-timestamps",
  tracklistTimestampSource: "load-time",
  saveTxtTracklist: "true",
  saveTimestampJson: "true",
  saveSessionJson: "true",
  id: "",
  linkedDjSetId: "",
  ready: false,
};

const REQUIRED_LABELS = {
  title: "mix title",
  artist: "DJ / artist",
  description: "description",
};

const CHANNEL_LABELS = {
  stereo: "Stereo",
  mono: "Mono",
  "left-only": "Left only",
  "right-only": "Right only",
  "dual-mono": "Dual mono",
};

const EQ_STEPS = ["100", "75", "50", "25", "0"];
const EQ_KILL_STEPS = ["100", "75", "50", "25", "0"];
const eqLongPressTimers = new Map();
const eqKnobDragState = new Map();
const eqLastTapTimes = new Map();
const IS_IOS_BACKGROUND_AUDIO_MODE = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const DJ_BACKGROUND_NATIVE_AUDIO_CLASS = "djNativeBackgroundAudioMode";
const DJ_WAVEFORM_TARGET_FPS_VISIBLE = IS_IOS_BACKGROUND_AUDIO_MODE ? 18 : 24;

const djDeckState = {
  d1: { item: null, volume: 1, gain: 1, filter: 50, playing: false, eq: { high: 100, mid: 100, low: 100 } },
  d2: { item: null, volume: 1, gain: 1, filter: 50, playing: false, eq: { high: 100, mid: 100, low: 100 } },
};

const djMixerState = {
  crossfader: 0.5,
  bpmByDeck: { d1: 170, d2: 170 },
  sourceBpmByDeck: { d1: 170, d2: 170 },
  bpmEditDeck: "d1",
  masterDeck: "d1",
  mtByDeck: { d1: true, d2: true },
  keySyncByDeck: { d1: false, d2: false },
  playStartLockByDeck: { d1: 0, d2: 0 },
  fxByDeck: { d1: "", d2: "" },
  fxWetByDeck: { d1: 0.65, d2: 0.65 },
  stemCutByDeck: {
    d1: { drums: 1, bass: 1, harmonic: 1, vocals: 1 },
    d2: { drums: 1, bass: 1, harmonic: 1, vocals: 1 },
  },
  stemPresetByDeck: { d1: "reset", d2: "reset" },
  stemCopyFlashUntil: 0,
  stemLastValueByDeck: {
    d1: { drums: 1, bass: 1, harmonic: 1, vocals: 1 },
    d2: { drums: 1, bass: 1, harmonic: 1, vocals: 1 },
  },
  activeSetIndex: 0,
  fxTarget: "both",
  fxHoldTimers: new Map(),
  fxHeldPad: null,
  selectedFxIds: readSelectedFxBank(DJ_SELECTED_FX_KEY, DJ_FX_PRESET_BANKS.club),
  selectedFxBlueIds: readSelectedFxBank(DJ_SELECTED_FX_BLUE_KEY, []),
  activeFxBoard: "a",
  streamUrlByDeck: { d1: "", d2: "" },
  loadedTrackIdByDeck: { d1: "", d2: "" },
  libraryLoaded: false,
  libraryItems: [],
  libraryQuery: "",
  collectionPlanner: readDjCollectionPlans(),
  plannerMode: "playlist",
  addToListTrackId: "",
  collectionFilters: {
    sort: localStorage.getItem("brmedia.djMixer.collection.sort") || "prepared",
    source: "all",
    key: "all",
    bpmMin: "",
    bpmMax: "",
    includeLong: false,
    preparedOnly: false,
    needsPrepOnly: false,
    bpmMissingOnly: false,
    gridMissingOnly: false,
    keyMissingOnly: false,
    loadedOnly: false,
  },
  syncByDeck: { d1: false, d2: false },
  syncModeByDeck: { d1: "beat", d2: "beat" },
  lastSyncLockAtByDeck: { d1: 0, d2: 0 },
  lastMasterDeckChangeAt: 0,
  eqMode: "knob",
  crossfaderMode: "smooth",
  masterGain: 1,
  loopSizeByDeck: { d1: "8 Bars", d2: "8 Bars" },
  timeDisplayModeByDeck: { d1: "remaining", d2: "remaining" },
  singleDeckTab: "main",
  autoLoopSizeByDeck: { d1: 4, d2: 4 },
  loopActiveByDeck: { d1: false, d2: false },
  loopRegionByDeck: { d1: null, d2: null },
  loopInPointByDeck: { d1: null, d2: null },
  waveformModeByDeck: { d1: "3band", d2: "3band" },
  waveformThemeIndexByDeck: readWaveformThemeByDeck(),
  waveformZoomByDeck: { d1: 1, d2: 1 },
  waveformManualSeekAtByDeck: { d1: 0, d2: 0 },
  waveformPeaksByDeck: { d1: null, d2: null },
  waveformAnalysisState: { d1: "idle", d2: "idle" },
  waveformCachedIds: new Set(),
  waveformAnalysingIds: new Set(),
  prepEngineRunning: false,
  prepEngineLastStats: null,
  waveformMemoryCacheById: new Map(),
  trackPrepById: new Map(),
  trackAnalysisById: new Map(),
  trackAnalysisPendingIds: new Set(),
  serverPrepLoaded: false,
  serverPrepSyncTimers: new Map(),
  serverPrepSyncingIds: new Set(),
  analysisWorker: null,
  backgroundPlaybackIntent: null,
  forceWebAudioGraph: false,
  nativeBackgroundSafe: IS_IOS_BACKGROUND_AUDIO_MODE,
  quantizeByDeck: { d1: true, d2: true },
  gridByDeck: {
    d1: { downbeat: 0, firstBeat: 0, locked: false, beatsPerBar: 4, analysisMode: "normal", userAdjusted: false },
    d2: { downbeat: 0, firstBeat: 0, locked: false, beatsPerBar: 4, analysisMode: "normal", userAdjusted: false },
  },
   playedTrackIds: new Set(),
  sessionTrackIds: [],
  sessionTrackLog: [],
  hotCuesByDeck: { d1: {}, d2: {} },
  cuePointByDeck: { d1: 0, d2: 0 },
  lastCueSnapInfoByDeck: { d1: null, d2: null },
  lastQuantizeInfoByDeck: { d1: null, d2: null },
  memoryPointsByDeck: { d1: [], d2: [] },
  memoryIndexByDeck: { d1: 0, d2: 0 },
  memoryPopupDeck: "d1",
  activeSingleFx: "",
  hotCueDeleteArmed: false,
  cuePressTimers: new Map(),
  cuePreviewStopByDeck: { d1: null, d2: null },
  hotCueHoldTimers: new Map(),
  hotCueHoldTriggered: new Set(),
  backgroundAudioMode: IS_IOS_BACKGROUND_AUDIO_MODE,
  recordState: "ready",
  recordCountdownTimer: 0,
  recordUiTimer: 0,
  recordStartedAt: 0,
  recordMediaRecorder: null,
  recordChunks: [],
  currentRecordingMeta: null,
  recordingDownloads: new Map(),
};

let pendingLoadDeck = "d1";
let meterAnimationFrame = 0;
let waveformAnimationFrame = 0;
let waveformDecodeContext = null;
let bpmPopupInputTimer = 0;
let autoMasterUiQueued = false;
let backgroundResumeTimer = 0;
let lastWaveformFrameAt = 0;

function hydrateIcons(root = document) {
  const api = window.BRMediaIcons || window.BRMediaShared?.icons;
  if (api?.safeHydrateIcons) {
    api.safeHydrateIcons(root);
    return;
  }
  if (api?.hydrate) api.hydrate(root);
}

function navigateTo(route) {
  if (!route) return;
  window.location.href = route;
}

function lockModuleSidebarScroll() {
  moduleSidebarScrollLock.y = window.scrollY || window.pageYOffset || 0;

  document.documentElement.classList.add("sidebarLocked");
  document.body.classList.add("sidebarOpen");
  document.body.style.position = "fixed";
  document.body.style.top = `-${moduleSidebarScrollLock.y}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}

function unlockModuleSidebarScroll() {
  const y = Math.abs(parseInt(document.body.style.top || "0", 10)) || moduleSidebarScrollLock.y || 0;

  document.documentElement.classList.remove("sidebarLocked");
  document.body.classList.remove("sidebarOpen");
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  window.scrollTo(0, y);
}

function openModuleSidebar() {
  moduleSidebar?.classList.remove("hidden");
  moduleSidebarBackdrop?.classList.remove("hidden");
  btnModuleSidebarCloseFloating?.classList.remove("hidden");
  lockModuleSidebarScroll();
  hydrateIcons(moduleSidebar);
}

function closeModuleSidebar() {
  moduleSidebar?.classList.add("hidden");
  moduleSidebarBackdrop?.classList.add("hidden");
  btnModuleSidebarCloseFloating?.classList.add("hidden");
  unlockModuleSidebarScroll();
}

function isAndroidBrowser() {
  return /\bAndroid\b/i.test(window.navigator?.userAgent || "");
}

function isAndroidPerformanceSafeMode() {
  return isAndroidBrowser() && window.matchMedia?.("(max-width: 980px)")?.matches !== false;
}

function markAndroidDeviceClass() {
  const android = isAndroidBrowser();
  document.documentElement.classList.toggle("djAndroidDevice", android);
  document.body?.classList.toggle("djAndroidDevice", android);
  return android;
}

function syncPerformanceViewportVars() {
  const height = Math.max(320, Number(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0));
  const width = Math.max(240, Number(window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 0));
  document.documentElement.style.setProperty("--dj-performance-vh", `${height * 0.01}px`);
  document.documentElement.style.setProperty("--dj-performance-vw", `${width * 0.01}px`);
}

function forceDarkRenderSurface() {
  document.documentElement.style.backgroundColor = "#06142b";
  document.body.style.backgroundColor = "#06142b";
  document.body.style.minHeight = "100vh";
}

function setAndroidPerformanceSafeMode(active = false) {
  const enabled = Boolean(active && isAndroidPerformanceSafeMode());
  markAndroidDeviceClass();
  document.documentElement.classList.toggle("djAndroidPerformanceSafe", enabled);
  document.body.classList.toggle("djAndroidPerformanceSafe", enabled);
  performanceShell?.classList.toggle("is-android-safe", enabled);
  if (enabled) {
    syncPerformanceViewportVars();
    forceDarkRenderSurface();
  }
}

function lockPerformanceScroll() {
  syncPerformanceViewportVars();
  forceDarkRenderSurface();
  document.documentElement.classList.add("djPerformanceLocked");
  document.body.classList.add("djPerformanceOpen");
}

function unlockPerformanceScroll() {
  document.documentElement.classList.remove("djPerformanceLocked");
  document.body.classList.remove("djPerformanceOpen");
}

function showPerformanceLaunchFallback(err) {
  console.error("DJ Performance launch warning", err);
  forceDarkRenderSurface();

  // Do not throw the user back to the DJ Studio home page. Keep the performance shell visible
  // so a non-critical render/update error cannot look like a failed launch.
  if (performanceShell) {
    performanceShell.classList.remove("hidden");
    performanceShell.style.display = "grid";
    performanceShell.style.visibility = "visible";
    performanceShell.style.opacity = "1";
    performanceShell.style.backgroundColor = "#06142b";
  }

  lockPerformanceScroll();
  const message = "DJ Studio launched in safe display mode. Some non-critical UI refresh was skipped.";
  if (setupStatusText) setupStatusText.textContent = message;
  if (requiredSummaryText) requiredSummaryText.textContent = message;
}

function safeLaunchStep(label, fn) {
  try {
    if (typeof fn === "function") fn();
    return true;
  } catch (err) {
    console.warn(`DJ Studio launch step skipped: ${label}`, err);
    return false;
  }
}

function showPerformance(setup = readSetup()) {
  try {
    closeModuleSidebar();
    closeDjPlanPage?.();
    setAndroidPerformanceSafeMode(true);
    syncPerformanceViewportVars();
    forceDarkRenderSurface();

    if (performanceShell) {
      performanceShell.classList.remove("hidden");
      performanceShell.style.display = "grid";
      performanceShell.style.visibility = "visible";
      performanceShell.style.opacity = "1";
      performanceShell.style.backgroundColor = "#06142b";
      performanceShell.scrollTop = 0;
    }

    lockPerformanceScroll();

    const finishLaunch = () => {
      setPerformanceMode("mixer");
      safeLaunchStep("syncPerformanceSetup", () => syncPerformanceSetup(setup));
      safeLaunchStep("updatePerformanceSetStrip", updatePerformanceSetStrip);
      safeLaunchStep("updateDeckPreviewStates", updateDeckPreviewStates);
      safeLaunchStep("updateTransportButtons", updateTransportButtons);
      safeLaunchStep("updateBpmUi", updateBpmUi);
      safeLaunchStep("drawAllWaveforms", drawAllWaveforms);
    };

    if (isAndroidPerformanceSafeMode()) {
      window.requestAnimationFrame(() => window.setTimeout(() => window.requestAnimationFrame(finishLaunch), 32));
    } else {
      finishLaunch();
    }
  } catch (err) {
    showPerformanceLaunchFallback(err);
  }
}

function hidePerformance() {
  performanceShell?.classList.add("hidden");
  if (performanceShell) {
    performanceShell.style.display = "";
    performanceShell.style.visibility = "";
    performanceShell.style.opacity = "";
    performanceShell.style.backgroundColor = "";
  }
  unlockPerformanceScroll();
  setAndroidPerformanceSafeMode(false);
}

function captureActiveDeckPlayback(reason = "view") {
  return ["d1", "d2"].map((deck) => {
    const audio = djAudio[deck];
    const item = djDeckState[deck]?.item;
    const src = audio?.currentSrc || audio?.src || audio?.getAttribute?.("src") || "";
    const wasPlaying = Boolean(audio && item?.id && src && !audio.paused && !audio.ended);
    return {
      deck,
      reason,
      wasPlaying,
      time: Number(audio?.currentTime || 0),
      src,
      itemId: String(item?.id || ""),
    };
  }).filter((entry) => entry.wasPlaying);
}

function restoreActiveDeckPlayback(snapshot = [], reason = "view") {
  if (!snapshot.length) return;

  const tryResume = (phase = "now") => {
    snapshot.forEach((entry) => {
      const deck = entry.deck;
      const audio = djAudio[deck];
      const item = djDeckState[deck]?.item;
      if (!audio || !item?.id || String(item.id || "") !== entry.itemId) return;
      if (!ensureDeckAudioSource(deck)) return;

      if (Number.isFinite(entry.time) && entry.time > 0 && Math.abs(Number(audio.currentTime || 0) - entry.time) > 0.8) {
        try { audio.currentTime = clampTimeForDeck(deck, entry.time); } catch {}
      }

      djDeckState[deck].playing = true;
      audio.muted = false;
      audio.volume = Math.max(0.05, Number(audio.volume || 1));

      if (audio.paused || audio.ended) {
        audio.play().then(() => {
          djDeckState[deck].playing = true;
          applyDeckVolumes();
          updateTransportButtons();
          updateDjCollectionMiniPlayer();
          startMeterAnimation();
          startWaveformAnimation();
        }).catch((err) => console.warn(`DJ ${reason} playback restore blocked (${phase})`, deck, err));
      }
    });
  };

  tryResume("immediate");
  window.requestAnimationFrame(() => tryResume("raf"));
}

function setPerformanceMode(mode = "mixer") {
  const playingSnapshot = captureActiveDeckPlayback(`mode:${mode}`);

  performanceShell?.classList.toggle("is-single-deck-mode", mode === "deck");
  document.body.classList.toggle("djSingleDeckMode", mode === "deck");

  if (mode !== "deck") {
    performanceShell?.classList.remove("is-stems-tab");
    document.body.classList.remove("djSingleDeckStemsMode");
  }
  performanceModeTabs.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.djPerformanceMode === mode);
  });

  performanceModePanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.djPerformancePanel !== mode);
  });

  if (["main", "deck", "mixer", "fx"].includes(mode)) {
    updatePerformanceSetStrip();
  }

  if (mode === "fx") {
    updateLiveFxBankLabels();
  }

  if (["main", "deck"].includes(mode)) {
    updateWaveformControls();
    updateSingleDeckView();
    drawAllWaveforms();
    startWaveformAnimation();
  }

  restoreActiveDeckPlayback(playingSnapshot, `mode:${mode}`);
}

function setPerformanceDeck(button) {
  const playingSnapshot = captureActiveDeckPlayback("deck-tab");

  performanceDeckTabs.forEach((tab) => tab.classList.toggle("is-active", tab === button));

  const deckTab = button?.dataset?.djDeckTab || "duo";
  if (deckTab === "deck1") {
    djMixerState.bpmEditDeck = "d1";
    setPerformanceMode("deck");
  } else if (deckTab === "deck2") {
    djMixerState.bpmEditDeck = "d2";
    setPerformanceMode("deck");
  } else if (performanceModePanels.some((panel) => panel.dataset.djPerformancePanel === "deck" && !panel.classList.contains("hidden"))) {
    setPerformanceMode("mixer");
  }

  updateSingleDeckView();
  updateStemUi(djMixerState.bpmEditDeck || "d1");
  updateWaveformControls();
  drawAllWaveforms();
  restoreActiveDeckPlayback(playingSnapshot, "deck-tab");
}

function getDeckSourceBpm(deck) {
  const grid = djMixerState.gridByDeck?.[deck] || {};
  return Math.max(40, Math.min(240, Number(grid.sourceBpm || djMixerState.sourceBpmByDeck?.[deck] || grid.bpm || getItemBpm(djDeckState[deck]?.item) || 170)));
}

function getDeckLiveBpm(deck) {
  return Math.max(40, Math.min(240, Number(djMixerState.bpmByDeck?.[deck] || getDeckSourceBpm(deck) || 170)));
}

function getBeatIntervalForDeck(deck) {
  return 60 / getDeckSourceBpm(deck);
}

function createDefaultGrid({ bpm = 170, downbeat = 0, locked = false, userAdjusted = false } = {}) {
  return {
    bpm: Number(bpm || 170),
    sourceBpm: Number(bpm || 170),
    downbeat: Number(downbeat || 0),
    firstBeat: Number(downbeat || 0),
    gridOffset: Number(downbeat || 0),
    locked: Boolean(locked),
    beatsPerBar: 4,
    analysisMode: "normal",
    analysisConfidence: 0,
    gridConfidence: 0,
    needsCheck: false,
    confirmedAt: 0,
    userAdjusted: Boolean(userAdjusted),
    undoStack: [],
    redoStack: [],
  };
}

function getDeckGrid(deck) {
  if (!djMixerState.gridByDeck[deck]) {
    djMixerState.gridByDeck[deck] = createDefaultGrid({ bpm: djMixerState.bpmByDeck?.[deck] || 170 });
  }

  const grid = djMixerState.gridByDeck[deck];
  if (!grid.analysisMode) grid.analysisMode = "normal";
  if (!Number.isFinite(Number(grid.analysisConfidence))) grid.analysisConfidence = 0;
  if (!Number.isFinite(Number(grid.gridConfidence))) grid.gridConfidence = 0;
  if (typeof grid.needsCheck !== "boolean") grid.needsCheck = false;
  if (!Number.isFinite(Number(grid.confirmedAt))) grid.confirmedAt = 0;
  if (!Number.isFinite(Number(grid.beatsPerBar))) grid.beatsPerBar = 4;
  if (!Array.isArray(grid.undoStack)) grid.undoStack = [];
  if (!Array.isArray(grid.redoStack)) grid.redoStack = [];

  return grid;
}

function getDeckCurrentTime(deck) {
  if (isDjEngineV2Ready()) return Number(window.BRMediaDjEngine.getCurrentTime(deck) || 0);
  return Number(djAudio[deck]?.currentTime || 0);
}

function setDeckCurrentTime(deck, time) {
  const nextTime = clampTimeForDeck(deck, time);
  if (isDjEngineV2Ready()) {
    window.BRMediaDjEngine.seek(deck, nextTime);
    return nextTime;
  }
  if (djAudio[deck]) djAudio[deck].currentTime = nextTime;
  return nextTime;
}

function clampTimeForDeck(deck, time) {
  const duration = Math.max(0, Number(getDeckDuration(deck) || 0));
  return Math.max(0, Math.min(duration || Math.max(0, time), Number(time) || 0));
}

function getNearestGridBeatTime(deck, time) {
  const grid = getDeckGrid(deck);
  const interval = getBeatIntervalForDeck(deck);
  const downbeat = Number(grid.downbeat || 0);
  const duration = Math.max(0, Number(djAudio[deck]?.duration || getDeckDuration(deck) || 0));
  const target = Number(time || 0);
  const rawIndex = (target - downbeat) / interval;
  const baseIndex = Math.round(rawIndex);
  const candidates = [];

  for (let offset = -3; offset <= 3; offset += 1) {
    const beatIndex = baseIndex + offset;
    const beatTime = downbeat + (beatIndex * interval);
    if (!Number.isFinite(beatTime)) continue;
    if (beatTime < -0.0001) continue;
    if (duration && beatTime > duration + 0.0001) continue;
    candidates.push(beatTime);
  }

  if (!candidates.length) return clampTimeForDeck(deck, target);

  const nearest = candidates.reduce((best, candidate) => (
    Math.abs(candidate - target) < Math.abs(best - target) ? candidate : best
  ), candidates[0]);

  return clampTimeForDeck(deck, nearest);
}

function getGridBeatDetails(deck, time = Number(djAudio[deck]?.currentTime || 0)) {
  const grid = getDeckGrid(deck);
  const interval = Math.max(0.001, getBeatIntervalForDeck(deck));
  const downbeat = Number(grid.downbeat || 0);
  const duration = Math.max(0, Number(djAudio[deck]?.duration || getDeckDuration(deck) || 0));
  const target = clampTimeForDeck(deck, Number(time || 0));
  const rawIndex = (target - downbeat) / interval;
  const nearestIndex = Math.round(rawIndex);
  const previousIndex = Math.floor(rawIndex);
  const nextIndex = Math.max(previousIndex + 1, nearestIndex + (downbeat + nearestIndex * interval <= target ? 1 : 0));
  const nearest = clampTimeForDeck(deck, downbeat + (nearestIndex * interval));
  const previous = clampTimeForDeck(deck, downbeat + (previousIndex * interval));
  const next = clampTimeForDeck(deck, downbeat + (nextIndex * interval));
  const beatsPerBar = Math.max(1, Number(grid.beatsPerBar || 4));
  const beatInBar = ((nearestIndex % beatsPerBar) + beatsPerBar) % beatsPerBar;
  return {
    time: target,
    interval,
    nearest,
    previous,
    next,
    nearestIndex,
    distance: Math.abs(nearest - target),
    beatInBar,
    isBar: beatInBar === 0,
    duration,
  };
}

function getQuantizedPlayStartTime(deck, time = Number(djAudio[deck]?.currentTime || 0)) {
  if (!djMixerState.quantizeByDeck?.[deck]) return clampTimeForDeck(deck, time);
  const readiness = getDeckSyncReadiness(deck);
  if (!readiness.bpmReady || !readiness.gridReady) return clampTimeForDeck(deck, time);
  const details = getGridBeatDetails(deck, time);
  const tightWindow = Math.min(0.13, details.interval * 0.36);
  const forwardWindow = Math.min(0.26, details.interval * 0.58);
  let target = clampTimeForDeck(deck, time);
  let mode = "free";

  if (details.distance <= tightWindow) {
    target = details.nearest;
    mode = details.isBar ? "bar" : "beat";
  } else if (details.next >= details.time && details.next - details.time <= forwardWindow) {
    target = details.next;
    mode = "next-beat";
  }

  djMixerState.lastQuantizeInfoByDeck[deck] = {
    mode,
    target,
    distance: Math.abs(target - details.time),
    beatIndex: details.nearestIndex,
    at: Date.now(),
  };
  return target;
}

function markDeckGridReady(deck, { reason = "manual", save = false } = {}) {
  const grid = getDeckGrid(deck);
  grid.userAdjusted = true;
  grid.needsCheck = false;
  grid.confirmedAt = Date.now();
  grid.gridConfidence = Math.max(Number(grid.gridConfidence || 0), reason === "analysis" ? 0.75 : 0.9);
  grid.analysisMode = reason === "analysis" ? (grid.analysisMode || "v3-browser-prep") : "manual-grid-confirmed";
  if (save) saveTrackGridForDeck(deck);
}

function setGridBpmKeepingPlayhead(deck, nextBpm, { markAdjusted = true, updateSource = true } = {}) {
  const grid = getDeckGrid(deck);
  const oldBpm = Number(getDeckSourceBpm(deck) || grid.bpm || 170);
  const cleanBpm = Math.max(40, Math.min(240, Number(nextBpm || oldBpm)));
  const lockedDownbeat = Number(grid.downbeat || 0);

  if (updateSource) {
    djMixerState.sourceBpmByDeck[deck] = cleanBpm;
    grid.sourceBpm = cleanBpm;
  }

  djMixerState.bpmByDeck[deck] = cleanBpm;
  grid.bpm = cleanBpm;
  grid.downbeat = lockedDownbeat;
  grid.firstBeat = lockedDownbeat;
  grid.gridOffset = lockedDownbeat;
  grid.stretchAnchor = "downbeat";
  if (markAdjusted) grid.userAdjusted = true;

  applyDeckSync(deck, { align: false });
  return cleanBpm;
}

function getSingleDeckPlayheadRatio() {
  return 0.5;
}

function getPreparedCueTime(deck, time = Number(djAudio[deck]?.currentTime || 0)) {
  return djMixerState.quantizeByDeck?.[deck] ? getNearestGridBeatTime(deck, time) : clampTimeForDeck(deck, time);
}

function getCueSetTimeForDeck(deck, time = Number(djAudio[deck]?.currentTime || 0), { forceSnap = true } = {}) {
  return forceSnap ? getNearestGridBeatTime(deck, time) : clampTimeForDeck(deck, time);
}

function markManualWaveformSeek(deck) {
  djMixerState.waveformManualSeekAtByDeck[deck] = Date.now();
}

function wasManualWaveformSeekRecent(deck, windowMs = 2200) {
  return Date.now() - Number(djMixerState.waveformManualSeekAtByDeck?.[deck] || 0) < windowMs;
}

function setDeckCuePoint(deck, time = Number(djAudio[deck]?.currentTime || 0), { movePlayhead = true, snap = true } = {}) {
  const audio = djAudio[deck];
  if (!audio) return 0;

  const rawTime = clampTimeForDeck(deck, time);
  const cueTime = snap ? getCueSetTimeForDeck(deck, rawTime) : rawTime;
  const snapDistance = Math.abs(cueTime - rawTime);
  const beatDetails = getGridBeatDetails(deck, cueTime);
  djMixerState.lastCueSnapInfoByDeck[deck] = {
    snapped: snap && snapDistance > 0.002,
    distance: snapDistance,
    time: cueTime,
    beatIndex: beatDetails.nearestIndex,
    beatInBar: beatDetails.beatInBar,
    at: Date.now(),
  };
  djMixerState.cuePointByDeck[deck] = cueTime;

  if (movePlayhead) {
    audio.currentTime = cueTime;
  }

  saveTrackGridForDeck(deck);
  saveTrackCueDataForDeck(deck);
  updateDeckTimeDisplays();
  updateDeckPrepUi();
  drawAllWaveforms();

  return cueTime;
}

function getJsonObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function mergeNewerCacheEntry(localEntry = {}, serverEntry = {}) {
  const localTime = Number(localEntry?.serverUpdatedAt || localEntry?.updatedAt || localEntry?.savedAt || 0);
  const serverTime = Number(serverEntry?.serverUpdatedAt || serverEntry?.updatedAt || serverEntry?.savedAt || 0);
  return serverTime >= localTime ? { ...localEntry, ...serverEntry } : localEntry;
}

function mergeServerDjPrepCache(data = {}) {
  const prepById = getJsonObject(data.prepById);
  const analysisById = getJsonObject(data.analysisById);
  const gridById = getJsonObject(data.gridById);
  const cueById = getJsonObject(data.cueById);

  const prepCache = readTrackPrepCache();
  const analysisCache = readTrackAnalysisCache();
  const gridCache = readTrackGridCache();
  const cueCache = readTrackCueCache();

  Object.entries(prepById).forEach(([id, prep]) => {
    if (!id || !prep || typeof prep !== "object") return;
    prepCache[id] = mergeNewerCacheEntry(prepCache[id], prep);
    djMixerState.trackPrepById.set(id, prepCache[id]);
  });

  Object.entries(analysisById).forEach(([id, analysis]) => {
    if (!id || !analysis || typeof analysis !== "object") return;
    analysisCache[id] = mergeNewerCacheEntry(analysisCache[id], analysis);
    djMixerState.trackAnalysisById.set(id, analysisCache[id]);
  });

  Object.entries(gridById).forEach(([id, grid]) => {
    if (!id || !grid || typeof grid !== "object") return;
    gridCache[id] = mergeNewerCacheEntry(gridCache[id], grid);
  });

  Object.entries(cueById).forEach(([id, cue]) => {
    if (!id || !cue || typeof cue !== "object") return;
    cueCache[id] = mergeNewerCacheEntry(cueCache[id], cue);
  });

  writeTrackPrepCache(prepCache);
  writeTrackAnalysisCache(analysisCache);
  writeTrackGridCache(gridCache);
  writeTrackCueCache(cueCache);

  Object.entries(prepCache).forEach(([id, prep]) => {
    if (prep?.waveformReady) djMixerState.waveformCachedIds.add(String(id));
  });
}

async function loadServerDjPrepCache({ silent = true } = {}) {
  try {
    const response = await fetch(DJ_PREP_SERVER_CACHE_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Prep cache request failed ${response.status}`);
    const data = await response.json();
    mergeServerDjPrepCache(data);
    djMixerState.serverPrepLoaded = true;
    if (!silent && djAnalyseStatus) djAnalyseStatus.textContent = `Server Prep Cache loaded • ${Number(data.count || 0)} tracks remembered.`;
    updateDjPrepDashboard();
    if (djMixerState.libraryLoaded) renderDjLibrary();
    return data;
  } catch (err) {
    console.warn("Server DJ prep cache unavailable", err);
    if (!silent && djAnalyseStatus) djAnalyseStatus.textContent = "Server Prep Cache unavailable — using this device cache.";
    return null;
  }
}

function buildServerPrepPayloadForItem(item = {}) {
  const id = getTrackPrepId(item);
  if (!id) return null;

  const prepCache = readTrackPrepCache();
  const analysisCache = readTrackAnalysisCache();
  const gridCache = readTrackGridCache();
  const cueCache = readTrackCueCache();
  const prep = prepCache[id] || getTrackPrepStatusForItem(item) || {};
  const analysisId = getTrackAnalysisId(item);
  const gridId = getTrackGridId(item);
  const cueId = gridId;

  return {
    id,
    item: {
      id,
      title: item?.title || prep.title || "",
      artist: item?.artist || item?.albumArtist || prep.artist || "",
      locator: item?.locator || item?.path || "",
      source: item?.source || "",
      duration: Number(item?.duration || prep.waveformDuration || 0),
      bpm: getItemBpm(item) || prep.bpm || prep.detectedBpm || "",
      key: getItemKeyLabel(item, prep),
    },
    prep,
    analysis: analysisCache[analysisId] || getTrackAnalysisForItem(item) || {},
    grid: gridCache[gridId] || {},
    cue: cueCache[cueId] || {},
    summary: getTrackPrepSummary(item),
    updatedAt: Number(prep.updatedAt || Date.now()),
  };
}

function scheduleServerPrepSync(item = {}, { immediate = false } = {}) {
  const id = getTrackPrepId(item);
  if (!id || !window.fetch) return;

  window.clearTimeout(djMixerState.serverPrepSyncTimers.get(id));

  const run = async () => {
    const payload = buildServerPrepPayloadForItem(item);
    if (!payload || djMixerState.serverPrepSyncingIds.has(id)) return;

    djMixerState.serverPrepSyncingIds.add(id);
    try {
      const response = await fetch(DJ_PREP_SERVER_CACHE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Prep cache save failed ${response.status}`);
    } catch (err) {
      console.warn("Server DJ prep sync failed", err);
    } finally {
      djMixerState.serverPrepSyncingIds.delete(id);
      djMixerState.serverPrepSyncTimers.delete(id);
    }
  };

  if (immediate) {
    void run();
    return;
  }

  djMixerState.serverPrepSyncTimers.set(id, window.setTimeout(run, 850));
}

async function deleteServerPrepRecord(item = {}) {
  const id = getTrackPrepId(item);
  if (!id || !window.fetch) return;

  try {
    await fetch(`${DJ_PREP_SERVER_CACHE_URL}/clear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  } catch (err) {
    console.warn("Server DJ prep delete failed", err);
  }
}

function getTrackGridId(item) {
  return String(item?.id || item?.locator || item?.path || "").trim();
}

function readTrackGridCache() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DJ_TRACK_GRID_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    console.warn("DJ grid cache read failed", err);
    return {};
  }
}

function writeTrackGridCache(cache) {
  try {
    localStorage.setItem(DJ_TRACK_GRID_KEY, JSON.stringify(cache || {}));
  } catch (err) {
    console.warn("DJ grid cache save failed", err);
  }
}

function makeSerializableGrid(deck) {
  const grid = getDeckGrid(deck);
  const sourceBpm = getDeckSourceBpm(deck);
  return {
    bpm: sourceBpm,
    sourceBpm,
    downbeat: Number(grid.downbeat || 0),
    firstBeat: Number(grid.firstBeat ?? grid.downbeat ?? 0),
    gridOffset: Number(grid.gridOffset ?? grid.downbeat ?? 0),
    locked: Boolean(grid.locked),
    beatsPerBar: Number(grid.beatsPerBar || 4),
    analysisMode: grid.analysisMode || "normal",
    analysisConfidence: Number(grid.analysisConfidence || 0),
    gridConfidence: Number(grid.gridConfidence || 0),
    needsCheck: Boolean(grid.needsCheck),
    confirmedAt: Number(grid.confirmedAt || 0),
    userAdjusted: Boolean(grid.userAdjusted),
    cuePoint: Number(djMixerState.cuePointByDeck?.[deck] || 0),
    quantize: Boolean(djMixerState.quantizeByDeck?.[deck]),
    savedAt: Date.now(),
  };
}

function saveTrackGridForDeck(deck) {
  const item = djDeckState[deck]?.item;
  const id = getTrackGridId(item);
  if (!id) return;

  const cache = readTrackGridCache();
  const gridSnapshot = makeSerializableGrid(deck);
  cache[id] = gridSnapshot;
  writeTrackGridCache(cache);
  rememberTrackPrep(item, {
    gridReady: true,
    gridNeedsCheck: false,
    needsGridCheck: false,
    gridConfidence: Math.max(Number(getDeckGrid(deck).gridConfidence || 0), 0.75),
    gridLocked: Boolean(gridSnapshot.locked),
    quantize: Boolean(gridSnapshot.quantize),
    bpm: Number(gridSnapshot.bpm || 170),
    downbeat: Number(gridSnapshot.downbeat || 0),
    cuePoint: Number(gridSnapshot.cuePoint || 0),
    gridSavedAt: gridSnapshot.savedAt,
  });
}

function applyTrackGridToDeck(deck, item, { forceDefault = false } = {}) {
  const itemBpm = getItemBpm(item) || Number(djMixerState.bpmByDeck?.[deck] || 170);
  const cached = !forceDefault ? readTrackGridCache()[getTrackGridId(item)] : null;

  if (cached) {
    const sourceBpm = Number(cached.sourceBpm || cached.bpm || itemBpm || 170);
    const bpm = sourceBpm;

    djMixerState.sourceBpmByDeck[deck] = sourceBpm;
    djMixerState.bpmByDeck[deck] = bpm;
    djMixerState.cuePointByDeck[deck] = Number(cached.cuePoint || 0);
    djMixerState.quantizeByDeck[deck] = cached.quantize !== false;
    djMixerState.gridByDeck[deck] = {
      ...createDefaultGrid({ bpm, downbeat: Number(cached.downbeat || 0), locked: Boolean(cached.locked), userAdjusted: Boolean(cached.userAdjusted) }),
      ...cached,
      sourceBpm,
      undoStack: [],
      redoStack: [],
    };
    return;
  }

  djMixerState.sourceBpmByDeck[deck] = itemBpm || 170;
  djMixerState.bpmByDeck[deck] = itemBpm || 170;
  djMixerState.cuePointByDeck[deck] = 0;
  djMixerState.quantizeByDeck[deck] = true;
  djMixerState.gridByDeck[deck] = createDefaultGrid({ bpm: itemBpm || 170, downbeat: 0 });
}

function readTrackCueCache() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DJ_TRACK_CUE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    console.warn("DJ cue cache read failed", err);
    return {};
  }
}

function writeTrackCueCache(cache) {
  try {
    localStorage.setItem(DJ_TRACK_CUE_KEY, JSON.stringify(cache || {}));
  } catch (err) {
    console.warn("DJ cue cache save failed", err);
  }
}

function makeSerializableCueData(deck) {
  return {
    cuePoint: Number(djMixerState.cuePointByDeck?.[deck] || 0),
    hotCues: { ...(djMixerState.hotCuesByDeck?.[deck] || {}) },
    memoryPoints: [...(djMixerState.memoryPointsByDeck?.[deck] || [])],
    memoryIndex: Number(djMixerState.memoryIndexByDeck?.[deck] || 0),
    savedAt: Date.now(),
  };
}

function saveTrackCueDataForDeck(deck) {
  const item = djDeckState[deck]?.item;
  const id = getTrackGridId(item);
  if (!id) return;

  const cache = readTrackCueCache();
  cache[id] = makeSerializableCueData(deck);
  writeTrackCueCache(cache);

  rememberTrackPrep(item, {
    cuePoint: Number(djMixerState.cuePointByDeck?.[deck] || 0),
    hotCueCount: Object.keys(djMixerState.hotCuesByDeck?.[deck] || {}).length,
    memoryCount: (djMixerState.memoryPointsByDeck?.[deck] || []).length,
  });
}

function applyTrackCueDataToDeck(deck, item) {
  const cached = readTrackCueCache()[getTrackGridId(item)];

  djMixerState.hotCuesByDeck[deck] = cached?.hotCues && typeof cached.hotCues === "object" ? { ...cached.hotCues } : {};
  djMixerState.memoryPointsByDeck[deck] = Array.isArray(cached?.memoryPoints)
    ? cached.memoryPoints.map(Number).filter(Number.isFinite).sort((a, b) => a - b)
    : [];
  djMixerState.memoryIndexByDeck[deck] = Math.max(0, Math.min(djMixerState.memoryPointsByDeck[deck].length - 1, Number(cached?.memoryIndex || 0)));

  if (Number.isFinite(Number(cached?.cuePoint))) {
    djMixerState.cuePointByDeck[deck] = Number(cached.cuePoint);
  }
}

function getTrackAnalysisId(item) {
  return String(item?.id || item?.locator || item?.path || "").trim();
}

function readTrackAnalysisCache() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DJ_TRACK_ANALYSIS_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    console.warn("DJ analysis cache read failed", err);
    return {};
  }
}

function writeTrackAnalysisCache(cache) {
  try {
    localStorage.setItem(DJ_TRACK_ANALYSIS_KEY, JSON.stringify(cache || {}));
  } catch (err) {
    console.warn("DJ analysis cache save failed", err);
  }
}

function rememberTrackAnalysis(item, result = {}) {
  const id = getTrackAnalysisId(item);
  if (!id) return null;

  const cache = readTrackAnalysisCache();
  const previous = cache[id] || {};
  const next = {
    ...previous,
    ...result,
    id,
    title: item?.title || previous.title || "",
    artist: item?.artist || item?.albumArtist || previous.artist || "",
    updatedAt: Date.now(),
  };

  cache[id] = next;
  writeTrackAnalysisCache(cache);
  djMixerState.trackAnalysisById.set(id, next);
  scheduleServerPrepSync(item);
  return next;
}

function getTrackAnalysisForItem(item) {
  const id = getTrackAnalysisId(item);
  if (!id) return {};

  if (djMixerState.trackAnalysisById.has(id)) {
    return djMixerState.trackAnalysisById.get(id) || {};
  }

  const cache = readTrackAnalysisCache();
  const analysis = cache[id] || {};
  djMixerState.trackAnalysisById.set(id, analysis);
  return analysis;
}

function getDjAnalysisWorker() {
  if (!window.Worker) return null;
  if (djMixerState.analysisWorker) return djMixerState.analysisWorker;

  try {
    const worker = new Worker(DJ_ANALYSIS_WORKER_URL);
    worker.addEventListener("message", handleAnalysisWorkerMessage);
    worker.addEventListener("error", (err) => {
      console.warn("DJ analysis worker failed", err);
      djMixerState.analysisWorker = null;
    });
    djMixerState.analysisWorker = worker;
    return worker;
  } catch (err) {
    console.warn("DJ analysis worker unavailable", err);
    return null;
  }
}

function queueTrackAnalysisForDeck(deck, item, peaks) {
  const id = getTrackAnalysisId(item);
  if (!id || !peaks?.peaks?.length) return false;

  const cached = getTrackAnalysisForItem(item);
  if (cached?.analysisReady && Number(cached.confidence || 0) > 0) {
    applyAnalysisResultToDeck(deck, item, cached, { fromCache: true });
    return true;
  }

  const worker = getDjAnalysisWorker();
  if (!worker) return false;

  djMixerState.trackAnalysisPendingIds.add(id);
  rememberTrackPrep(item, { analysisPending: true, analysisReady: false });
  updateDeckPrepUi();
  renderDjLibrary();

  worker.postMessage({
    type: "analyse-peaks",
    id,
    deck,
    item: {
      id,
      title: item?.title || "",
      artist: item?.artist || item?.albumArtist || "",
      bpmHint: getItemBpm(item) || djMixerState.bpmByDeck?.[deck] || 170,
      keyHint: getItemKeyLabel(item),
      duration: Number(item?.duration || peaks?.duration || 0),
    },
    peaks,
  });

  return true;
}

function handleAnalysisWorkerMessage(event) {
  const message = event?.data || {};
  if (message.type !== "analysis-result") return;

  const id = String(message.id || "");
  const deck = message.deck === "d2" ? "d2" : "d1";
  const item = djDeckState[deck]?.item || djMixerState.libraryItems.find((entry) => String(entry.id) === id);
  if (!id || !item) return;

  djMixerState.trackAnalysisPendingIds.delete(id);
  const result = rememberTrackAnalysis(item, {
    ...message.result,
    analysisReady: Boolean(message.result),
    analysisEngine: message.engine || "brmedia-worker",
  });

  rememberTrackPrep(item, {
    analysisPending: false,
    analysisReady: Boolean(result),
    analysisEngine: result?.analysisEngine || "brmedia-worker",
    bpmConfidence: Number(result?.confidence || 0),
    gridConfidence: Number(result?.gridConfidence ?? result?.confidence ?? 0),
    analysisConfidenceLabel: result?.confidenceLabel || getPrepConfidenceLabel(result?.confidence || 0, result?.gridConfidence || 0),
    detectedBpm: Number(result?.bpm || 0),
    suggestedDownbeat: Number(result?.downbeat || 0),
    needsGridCheck: Boolean(result?.needsGridCheck),
    beatCount: Number(result?.beatCount || 0),
    barsEstimate: Number(result?.barsEstimate || 0),
  });

  if (String(djDeckState[deck]?.item?.id || "") === id && result) {
    applyAnalysisResultToDeck(deck, item, result);
  }

  refreshTrackPrepForItem(item);
  updateDeckPrepUi();
  updateDjPrepDashboard();
  renderDjLibrary();
}

function applyAnalysisResultToDeck(deck, item, result, { fromCache = false } = {}) {
  if (!result) return false;

  const grid = getDeckGrid(deck);
  const hasSavedGrid = Boolean(readTrackGridCache()[getTrackGridId(item)]);
  const confidence = Number(result.confidence || 0);
  const gridConfidence = Number(result.gridConfidence ?? result.downbeatConfidence ?? confidence);
  const confidenceLabel = result.confidenceLabel || getPrepConfidenceLabel(confidence, gridConfidence);
  const bpm = Number(result.bpm || result.tempo || 0);
  const downbeat = Number(result.downbeat || result.firstBeat || 0);
  const gridCanDriveSync = gridConfidence >= 0.28 && !result.needsGridCheck;
  const canAutoApply = !grid.locked && !grid.userAdjusted && !hasSavedGrid && bpm >= 40 && bpm <= 240 && confidence >= 0.20 && gridCanDriveSync;

  if (canAutoApply) {
    djMixerState.bpmByDeck[deck] = bpm;
    djMixerState.sourceBpmByDeck[deck] = bpm;
    grid.bpm = bpm;
    grid.sourceBpm = bpm;
    grid.liveBpm = bpm;
    grid.downbeat = Math.max(0, downbeat);
    grid.firstBeat = grid.downbeat;
    grid.gridOffset = grid.downbeat;
    grid.analysisMode = result.analysisMode || "v3-browser-prep";
    grid.analysisConfidence = confidence;
    grid.gridConfidence = gridConfidence;
    grid.analysisEngine = result.analysisEngine || "brmedia-worker";
    grid.needsCheck = false;
    djMixerState.cuePointByDeck[deck] = grid.downbeat;
    saveTrackGridForDeck(deck);
  } else {
    grid.suggestedBpm = bpm || grid.suggestedBpm;
    grid.suggestedDownbeat = Number.isFinite(downbeat) ? Math.max(0, downbeat) : grid.suggestedDownbeat;
    grid.analysisConfidence = confidence;
    grid.gridConfidence = gridConfidence;
    grid.analysisEngine = result.analysisEngine || "brmedia-worker";
    grid.needsCheck = !hasSavedGrid && !grid.userAdjusted;
  }

  rememberTrackPrep(item, {
    analysisReady: true,
    analysisPending: false,
    analysisEngine: result.analysisEngine || "brmedia-worker",
    analysisMode: result.analysisMode || "v3-browser-prep",
    analysisConfidenceLabel: confidenceLabel,
    bpmConfidence: confidence,
    gridConfidence,
    detectedBpm: bpm || Number(djMixerState.bpmByDeck?.[deck] || 170),
    suggestedDownbeat: Number.isFinite(downbeat) ? Math.max(0, downbeat) : 0,
    gridReady: Boolean(canAutoApply || hasSavedGrid || grid.userAdjusted),
    gridNeedsCheck: Boolean(!canAutoApply && !hasSavedGrid && !grid.userAdjusted),
    needsGridCheck: Boolean(result.needsGridCheck || (!canAutoApply && !hasSavedGrid && !grid.userAdjusted)),
    beatCount: Number(result.beatCount || 0),
    barsEstimate: Number(result.barsEstimate || 0),
    tempoCandidates: Array.isArray(result.tempoCandidates) ? result.tempoCandidates.slice(0, 5) : [],
    bpm: Number(djMixerState.bpmByDeck?.[deck] || bpm || 170),
  });

  setWaveformStatus(deck, `${fromCache ? "Cached" : "Analysed"} BPM ${Number(bpm || djMixerState.bpmByDeck?.[deck] || 170).toFixed(2)} • ${confidenceLabel} grid ${Math.round(gridConfidence * 100)}%`);
  return true;
}

function getTrackPrepId(item) {
  return String(item?.id || item?.locator || item?.path || "").trim();
}

function readTrackPrepCache() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DJ_TRACK_PREP_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    console.warn("DJ prep cache read failed", err);
    return {};
  }
}

function writeTrackPrepCache(cache) {
  try {
    localStorage.setItem(DJ_TRACK_PREP_KEY, JSON.stringify(cache || {}));
  } catch (err) {
    console.warn("DJ prep cache save failed", err);
  }
}

function rememberTrackPrep(item, updates = {}) {
  const id = getTrackPrepId(item);
  if (!id) return null;

  const cache = readTrackPrepCache();
  const previous = cache[id] || {};
  const next = {
    ...previous,
    ...updates,
    id,
    title: item?.title || previous.title || "",
    artist: item?.artist || item?.albumArtist || previous.artist || "",
    updatedAt: Date.now(),
  };

  cache[id] = next;
  writeTrackPrepCache(cache);
  djMixerState.trackPrepById.set(id, next);
  scheduleServerPrepSync(item);
  return next;
}

function getTrackPrepForItem(item) {
  const id = getTrackPrepId(item);
  if (!id) return {};

  if (djMixerState.trackPrepById.has(id)) {
    return djMixerState.trackPrepById.get(id) || {};
  }

  const cache = readTrackPrepCache();
  const prep = cache[id] || {};
  djMixerState.trackPrepById.set(id, prep);
  return prep;
}

function getCachedGridForItem(item) {
  return readTrackGridCache()[getTrackGridId(item)] || null;
}

function refreshTrackPrepForItem(item) {
  const id = getTrackPrepId(item);
  if (!id) return null;

  const grid = getCachedGridForItem(item);
  const previous = getTrackPrepForItem(item);
  const analysis = getTrackAnalysisForItem(item);
  const waveformReady = djMixerState.waveformCachedIds.has(id) || Boolean(previous.waveformReady);
  const next = rememberTrackPrep(item, {
    waveformReady,
    waveformAnalysing: djMixerState.waveformAnalysingIds.has(id),
    analysisPending: djMixerState.trackAnalysisPendingIds.has(id),
    analysisReady: Boolean(analysis?.analysisReady || previous.analysisReady),
    analysisEngine: analysis?.analysisEngine || previous.analysisEngine || "",
    bpmConfidence: Number(analysis?.confidence || previous.bpmConfidence || 0),
    detectedBpm: Number(analysis?.bpm || previous.detectedBpm || 0),
    suggestedDownbeat: Number(analysis?.downbeat ?? previous.suggestedDownbeat ?? 0),
    gridReady: Boolean(grid || previous.gridReady),
    gridLocked: Boolean(grid?.locked || previous.gridLocked),
    quantize: grid ? grid.quantize !== false : previous.quantize !== false,
    bpm: Number(grid?.bpm || previous.bpm || analysis?.bpm || getItemBpm(item) || 170),
    downbeat: Number(grid?.downbeat ?? previous.downbeat ?? analysis?.downbeat ?? 0),
    cuePoint: Number(grid?.cuePoint ?? previous.cuePoint ?? 0),
  });

  return next;
}

function refreshTrackPrepForLoadedDeck(deck) {
  const item = djDeckState[deck]?.item;
  if (!item) return null;
  return refreshTrackPrepForItem(item);
}

function getTrackPrepStatusForItem(item) {
  const id = getTrackPrepId(item);
  const prep = getTrackPrepForItem(item);
  const grid = getCachedGridForItem(item);
  const analysis = getTrackAnalysisForItem(item);

  return {
    ...prep,
    waveformReady: Boolean((id && djMixerState.waveformCachedIds.has(id)) || prep.waveformReady),
    waveformAnalysing: Boolean((id && djMixerState.waveformAnalysingIds.has(id)) || prep.waveformAnalysing),
    analysisPending: Boolean((id && djMixerState.trackAnalysisPendingIds.has(id)) || prep.analysisPending),
    analysisReady: Boolean(analysis?.analysisReady || prep.analysisReady),
    analysisEngine: analysis?.analysisEngine || prep.analysisEngine || "",
    bpmConfidence: Number(analysis?.confidence || prep.bpmConfidence || 0),
    gridConfidence: Number(analysis?.gridConfidence ?? prep.gridConfidence ?? grid?.gridConfidence ?? 0),
    analysisConfidenceLabel: analysis?.confidenceLabel || prep.analysisConfidenceLabel || getPrepConfidenceLabel(analysis?.confidence || prep.bpmConfidence || 0, analysis?.gridConfidence ?? prep.gridConfidence ?? 0),
    detectedBpm: Number(analysis?.bpm || prep.detectedBpm || 0),
    suggestedDownbeat: Number(analysis?.downbeat ?? prep.suggestedDownbeat ?? 0),
    gridReady: Boolean(grid || prep.gridReady),
    gridNeedsCheck: Boolean(prep.gridNeedsCheck || prep.needsGridCheck || grid?.needsCheck),
    gridLocked: Boolean(grid?.locked || prep.gridLocked),
    quantize: grid ? grid.quantize !== false : prep.quantize !== false,
    bpm: Number(grid?.bpm || prep.bpm || analysis?.bpm || getItemBpm(item) || 170),
    downbeat: Number(grid?.downbeat ?? prep.downbeat ?? analysis?.downbeat ?? 0),
  };
}

function getPrepConfidenceLabel(confidence = 0, gridConfidence = confidence) {
  const combined = (Number(confidence || 0) * 0.58) + (Number(gridConfidence || 0) * 0.42);
  if (combined < 0.22) return "low";
  if (combined < 0.46) return "medium";
  if (combined < 0.72) return "good";
  return "strong";
}

function getPrepConfidencePercent(item = {}) {
  const summary = getTrackPrepSummary(item);
  const prep = summary.prep || {};
  const confidence = (Number(prep.bpmConfidence || 0) * 0.58) + (Number(prep.gridConfidence || 0) * 0.42);
  return Math.max(0, Math.min(100, Math.round(confidence * 100)));
}

function getDjPrepStats(items = getDjLibraryItems({ raw: true })) {
  const safeItems = (Array.isArray(items) ? items : []).map(normaliseLibraryItem).filter(Boolean);
  const stats = { total: safeItems.length, prepared: 0, waveforms: 0, grids: 0, analysis: 0, bpm: 0, key: 0, pending: 0, needs: 0, percent: 0 };

  safeItems.forEach((item) => {
    const summary = getTrackPrepSummary(item);
    const prep = summary.prep || {};

    if (summary.waveformReady) stats.waveforms += 1;
    if (summary.gridReady) stats.grids += 1;
    if (summary.analysisReady) stats.analysis += 1;
    if (summary.bpmReady) stats.bpm += 1;
    if (summary.keyReady) stats.key += 1;
    if (prep.waveformAnalysing || prep.analysisPending) stats.pending += 1;
    if (summary.prepared) stats.prepared += 1;
  });

  stats.needs = Math.max(0, stats.total - stats.prepared);
  stats.percent = stats.total ? Math.round((stats.prepared / stats.total) * 100) : 0;
  return stats;
}

function updateDjPrepDashboard(items = getDjLibraryItems({ raw: true })) {
  const stats = getDjPrepStats(items);
  djMixerState.prepEngineLastStats = stats;

  if (djPrepReadyCount) djPrepReadyCount.textContent = `${stats.prepared}/${stats.total}`;
  if (djPrepWaveCount) djPrepWaveCount.textContent = String(stats.waveforms);
  if (djPrepGridCount) djPrepGridCount.textContent = String(stats.grids);
  if (djPrepAnalysisCount) djPrepAnalysisCount.textContent = String(stats.analysis);
  if (djPrepNeedsCount) djPrepNeedsCount.textContent = String(stats.needs);
  if (djFrontPrepScore) djFrontPrepScore.textContent = `${stats.percent}% prepared`;
  if (djFrontPrepMeta) {
    djFrontPrepMeta.textContent = `${stats.waveforms} waveforms · ${stats.bpm} BPM · ${stats.grids} grids · ${stats.key} keys${stats.pending ? ` · ${stats.pending} running` : ""}`;
  }

  return stats;
}

async function runDjPrepEngine({ force = false, limit = 36 } = {}) {
  if (djMixerState.prepEngineRunning) return;
  djMixerState.prepEngineRunning = true;
  if (djAnalyseStatus) djAnalyseStatus.textContent = force ? "Prep Engine: full reanalysis starting…" : "Prep Engine: analysing missing prep…";
  [djAnalyseMissingBtn, djAnalyseAllBtn, djPrepEngineBtn].forEach((button) => {
    if (button) button.disabled = true;
  });

  try {
    void startWaveformJob({ force });
    const setup = readSetup();
    const includeLong = Boolean(setup.libraryMode === "include-long-mixes" || djMixerState.collectionFilters.includeLong);
    const raw = getDjLibraryItems({ raw: true }).filter((item) => includeLong || !normaliseLibraryItem(item)?.isLongMix);
    const targets = raw.filter((item) => {
      const summary = getTrackPrepSummary(item);
      return force || summary.needsPrep || summary.gridNeedsCheck;
    }).slice(0, force ? Math.max(limit, 60) : limit);

    if (!targets.length) {
      if (djAnalyseStatus) djAnalyseStatus.textContent = "Prep Engine: everything visible is already prepared.";
      updateDjPrepDashboard(raw);
      return;
    }

    let done = 0;
    let failed = 0;
    for (const item of targets) {
      done += 1;
      if (djAnalyseStatus) djAnalyseStatus.textContent = `Prep Engine ${done}/${targets.length}: ${item.title || "track"}`;
      const peaks = await analyseLibraryItem(item, { force });
      if (peaks) {
        queueTrackAnalysisForDeck("d1", item, peaks);
        rememberTrackPrep(item, { waveformReady: true, waveformAnalysing: false, prepEngineQueuedAt: Date.now() });
      } else {
        failed += 1;
        rememberTrackPrep(item, { waveformAnalysing: false, waveformFailed: true });
      }
      if (done % 3 === 0) {
        updateDjPrepDashboard(raw);
        renderDjLibrary();
      }
    }

    updateDjPrepDashboard(raw);
    renderDjLibrary();
    if (djAnalyseStatus) djAnalyseStatus.textContent = `Prep Engine queued ${targets.length - failed}/${targets.length} beat scans${failed ? ` • ${failed} failed` : ""}.`;
  } catch (err) {
    console.warn("DJ Prep Engine failed", err);
    if (djAnalyseStatus) djAnalyseStatus.textContent = "Prep Engine failed. Try a smaller batch or reload Collection.";
  } finally {
    djMixerState.prepEngineRunning = false;
    [djAnalyseMissingBtn, djAnalyseAllBtn, djPrepEngineBtn].forEach((button) => {
      if (button) button.disabled = false;
    });
    updateDjPrepDashboard();
  }
}

function pushDeckGridUndo(deck) {
  const grid = getDeckGrid(deck);
  grid.undoStack.push({
    downbeat: Number(grid.downbeat || 0),
    firstBeat: Number(grid.firstBeat ?? grid.downbeat ?? 0),
    bpm: Number(djMixerState.bpmByDeck?.[deck] || grid.bpm || 170),
    cuePoint: Number(djMixerState.cuePointByDeck?.[deck] || 0),
  });
  if (grid.undoStack.length > 24) grid.undoStack.shift();
  grid.redoStack = [];
}

function restoreDeckGridSnapshot(deck, snapshot) {
  if (!snapshot) return;
  const grid = getDeckGrid(deck);
  grid.downbeat = Number(snapshot.downbeat || 0);
  grid.firstBeat = Number(snapshot.firstBeat ?? snapshot.downbeat ?? 0);
  grid.gridOffset = grid.downbeat;
  djMixerState.bpmByDeck[deck] = Math.max(40, Math.min(240, Number(snapshot.bpm || 170)));
  djMixerState.sourceBpmByDeck[deck] = djMixerState.bpmByDeck[deck];
  djMixerState.cuePointByDeck[deck] = clampTimeForDeck(deck, Number(snapshot.cuePoint || 0));
}

function detectFirstUsableBeatFromPeaks(data) {
  if (!data?.peaks?.length || !data.duration) return 0;

  const peaks = data.peaks;
  const duration = Number(data.duration || 0);
  const startIndex = Math.max(0, Math.floor(peaks.length * 0.002));
  const searchEnd = Math.min(peaks.length - 1, Math.floor(peaks.length * Math.min(0.18, 28 / Math.max(1, duration))));
  let maxPeak = 0;

  for (let i = startIndex; i <= searchEnd; i += 1) {
    maxPeak = Math.max(maxPeak, Number(peaks[i]?.peak || peaks[i]?.low || 0));
  }

  const threshold = Math.max(0.10, maxPeak * 0.58);

  for (let i = startIndex; i <= searchEnd; i += 1) {
    const now = Number(peaks[i]?.peak || peaks[i]?.low || 0);
    const prev = Number(peaks[Math.max(startIndex, i - 1)]?.peak || peaks[Math.max(startIndex, i - 1)]?.low || 0);
    if (now >= threshold && now >= prev) {
      return (i / Math.max(1, peaks.length - 1)) * duration;
    }
  }

  return 0;
}

function applyAutoGridSuggestion(deck, peaks) {
  const item = djDeckState[deck]?.item;
  const grid = getDeckGrid(deck);
  const hasSavedGrid = Boolean(readTrackGridCache()[getTrackGridId(item)]);

  if (grid.locked || grid.userAdjusted || hasSavedGrid) return;

  const suggestedDownbeat = detectFirstUsableBeatFromPeaks(peaks);
  grid.downbeat = Number(suggestedDownbeat || 0);
  grid.firstBeat = grid.downbeat;
  grid.gridOffset = grid.downbeat;
  grid.suggestedDownbeat = grid.downbeat;
  djMixerState.cuePointByDeck[deck] = grid.downbeat;
  saveTrackGridForDeck(deck);
  refreshTrackPrepForLoadedDeck(deck);
}

function getNormalisedTrackKey(item, deck = "d1") {
  const clean = getItemKeyLabel(item, getTrackPrepForItem(item));
  if (!clean || clean === "—" || clean === "-") return "--";

  const upper = clean.toUpperCase().replace(/\s+/g, "");
  if (DJ_CHROMA_KEYS.includes(upper)) return upper;
  return clean;
}

function getDeckKeyLabel(deck) {
  return getDeckKeySyncLabel(deck);
}

function loopSizeToBeats(value) {
  const raw = String(value || "4").trim().toLowerCase();
  if (raw.includes("1/16")) return 1 / 16;
  if (raw.includes("1/8")) return 1 / 8;
  if (raw.includes("1/4")) return 1 / 4;
  if (raw.includes("1/2")) return 1 / 2;
  if (raw.includes("beat")) return Math.max(1 / 16, Number.parseFloat(raw) || 1);
  if (raw.includes("bar")) return Math.max(1 / 16, (Number.parseFloat(raw) || 1) * 4);
  return Math.max(1 / 16, Number(value || 4));
}

function formatLoopSizeLabel(value) {
  const beats = Number(value || 4);
  if (beats < 1) {
    const denominator = Math.round(1 / beats);
    return `1/${denominator}`;
  }

  return String(Number.isInteger(beats) ? beats : beats.toFixed(2)).replace(/\.00$/, "");
}

function getLoopSeconds(deck, value = djMixerState.autoLoopSizeByDeck?.[deck] || 4) {
  return Math.max(0.0125, getBeatIntervalForDeck(deck) * loopSizeToBeats(value));
}

function setAutoLoopForDeck(deck, enabled = !djMixerState.loopActiveByDeck?.[deck]) {
  const audio = djAudio[deck];
  if (!audio) return;

  if (!enabled) {
    djMixerState.loopActiveByDeck[deck] = false;
    djMixerState.loopRegionByDeck[deck] = null;
    updateDeckPrepUi();
    return;
  }

  const start = getPreparedCueTime(deck, Number(audio.currentTime || 0));
  const length = getLoopSeconds(deck);
  const end = clampTimeForDeck(deck, start + length);

  djMixerState.loopActiveByDeck[deck] = true;
  djMixerState.loopRegionByDeck[deck] = { start, end, length };
  audio.currentTime = start;
  updateDeckPrepUi();
}

function maintainDeckLoop(deck) {
  if (!djMixerState.loopActiveByDeck?.[deck]) return;

  const audio = djAudio[deck];
  const loop = djMixerState.loopRegionByDeck?.[deck];
  if (!audio || !loop) return;

  if (Number(audio.currentTime || 0) >= Number(loop.end || 0) - 0.006) {
    audio.currentTime = Number(loop.start || 0);
  }
}

function getCurrentSingleDeck() {
  return djMixerState.bpmEditDeck === "d2" ? "d2" : "d1";
}

function formatDeckClock(value, { signed = false } = {}) {
  const seconds = Math.max(0, Math.abs(Number(value || 0)));
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  const prefix = signed && Number(value || 0) < 0 ? "-" : "";
  return `${prefix}${mins}:${secs}`;
}

function formatCueTimeLabel(seconds = 0) {
  const value = Math.max(0, Number(seconds || 0));
  const mins = Math.floor(value / 60);
  const secs = Math.floor(value % 60).toString().padStart(2, "0");
  const tenths = Math.floor((value % 1) * 10);
  return `${mins}:${secs}.${tenths}`;
}

function getCueSnapTime(deck, time = Number(djAudio[deck]?.currentTime || 0), { allowQuantize = true } = {}) {
  return allowQuantize && djMixerState.quantizeByDeck?.[deck]
    ? getNearestGridBeatTime(deck, time)
    : clampTimeForDeck(deck, time);
}

function getHotCueColourClass(key = "A") {
  return `is-colour-${String(key || "A").toLowerCase()}`;
}

function renderMemoryCueStrip(deck = getCurrentSingleDeck()) {
  const points = djMixerState.memoryPointsByDeck?.[deck] || [];
  const selected = Number(djMixerState.memoryIndexByDeck?.[deck] || 0);
  const label = points.length
    ? `${points.length} memory cue${points.length === 1 ? "" : "s"} · selected ${formatCueTimeLabel(points[selected] || points[0] || 0)}`
    : "0 memory cues saved";

  memorySummaryLabels.forEach((node) => {
    node.textContent = label;
  });

  if (!memoryCuePopup || memoryCuePopup.classList.contains("hidden")) return;
  renderMemoryCuePopup(deck);
}

function renderMemoryCuePopup(deck = djMixerState.memoryPopupDeck || getCurrentSingleDeck()) {
  const points = djMixerState.memoryPointsByDeck?.[deck] || [];
  const selected = Number(djMixerState.memoryIndexByDeck?.[deck] || 0);
  const deckLabel = deck === "d2" ? "Deck 2" : "Deck 1";

  if (memoryCuePopupTitle) memoryCuePopupTitle.textContent = `${deckLabel} memory cues`;
  if (memoryCuePopupStatus) {
    memoryCuePopupStatus.textContent = points.length
      ? `${points.length} saved · tap a cue to jump · delete removes selected points only.`
      : "No memory cues yet. Save the current playhead to build a quick jump list.";
  }
  if (!memoryCuePopupList) return;

  memoryCuePopupList.innerHTML = points.length
    ? points.map((point, index) => `
        <article class="djMemoryCuePopupRow${index === selected ? " is-selected" : ""}">
          <button type="button" data-dj-memory-popup-jump="${index}">
            <b>${index + 1}</b>
            <span>${formatCueTimeLabel(point)}</span>
            <em>${getMemoryCueBarLabel(deck, point)}</em>
          </button>
          <button type="button" data-dj-memory-popup-delete="${index}" aria-label="Delete memory cue ${index + 1}"><i class="fa-solid fa-trash-can"></i></button>
        </article>
      `).join("")
    : `<div class="djMemoryCuePopupEmpty"><strong>No memory cues</strong><span>Move the playhead to a cut point and press Save current.</span></div>`;

  memoryCuePopupList.querySelectorAll("[data-dj-memory-popup-jump]").forEach((button) => {
    button.addEventListener("click", () => activateMemoryCue(deck, Number(button.dataset.djMemoryPopupJump || 0), { closePopup: true }));
  });
  memoryCuePopupList.querySelectorAll("[data-dj-memory-popup-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteMemoryCue(deck, Number(button.dataset.djMemoryPopupDelete || 0)));
  });
}

function getMemoryCueBarLabel(deck, point = 0) {
  const grid = getDeckGrid(deck);
  const interval = getBeatIntervalForDeck(deck);
  const beatsPerBar = Math.max(1, Number(grid.beatsPerBar || 4));
  const beatIndex = (Number(point || 0) - Number(grid.downbeat || 0)) / interval;
  if (!Number.isFinite(beatIndex)) return "No grid";
  const bars = beatIndex / beatsPerBar;
  const sign = bars >= 0 ? "+" : "";
  return `${sign}${bars.toFixed(1)} bars`;
}

function openMemoryCuePopup(deck = getCurrentSingleDeck()) {
  djMixerState.memoryPopupDeck = deck;
  memoryCuePopup?.classList.remove("hidden");
  document.body.classList.add("djMemoryPopupOpen");
  renderMemoryCuePopup(deck);
}

function closeMemoryCuePopup() {
  memoryCuePopup?.classList.add("hidden");
  document.body.classList.remove("djMemoryPopupOpen");
  renderMemoryCueStrip(getCurrentSingleDeck());
}

function saveMemoryCue(deck = getCurrentSingleDeck(), time = Number(djAudio[deck]?.currentTime || 0)) {
  const points = djMixerState.memoryPointsByDeck[deck];
  const cueTime = getCueSnapTime(deck, time, { allowQuantize: true });
  if (!points.some((point) => Math.abs(point - cueTime) < 0.035)) points.push(cueTime);
  points.sort((a, b) => a - b);
  djMixerState.memoryIndexByDeck[deck] = Math.max(0, points.findIndex((point) => Math.abs(point - cueTime) < 0.035));
  saveTrackCueDataForDeck(deck);
  renderSingleDeckControls();
  updateDeckPrepUi();
  drawAllWaveforms();
  return cueTime;
}

function deleteMemoryCue(deck, index = 0) {
  const points = djMixerState.memoryPointsByDeck?.[deck] || [];
  if (!points.length) return;
  const safeIndex = Math.max(0, Math.min(points.length - 1, Number(index || 0)));
  points.splice(safeIndex, 1);
  djMixerState.memoryIndexByDeck[deck] = Math.max(0, Math.min(points.length - 1, safeIndex));
  saveTrackCueDataForDeck(deck);
  renderSingleDeckControls();
  renderMemoryCuePopup(deck);
  updateDeckPrepUi();
  drawAllWaveforms();
  if (closePopup) closeMemoryCuePopup();
}

function activateMemoryCue(deck, index = 0, { closePopup = false } = {}) {
  const points = djMixerState.memoryPointsByDeck?.[deck] || [];
  const audio = djAudio[deck];
  if (!audio || !points.length) return;

  const safeIndex = Math.max(0, Math.min(points.length - 1, Number(index || 0)));
  djMixerState.memoryIndexByDeck[deck] = safeIndex;
  audio.currentTime = clampTimeForDeck(deck, Number(points[safeIndex] || 0));
  markManualWaveformSeek(deck);
  saveTrackCueDataForDeck(deck);
  renderSingleDeckControls();
  updateDeckPrepUi();
  drawAllWaveforms();
}

function setManualLoopRegion(deck, start, end) {
  const audio = djAudio[deck];
  if (!audio) return;
  const duration = getDeckDuration(deck) || audio.duration || 0;
  const safeStart = clampTimeForDeck(deck, Math.min(Number(start || 0), Number(end || 0)));
  const safeEnd = clampTimeForDeck(deck, Math.max(Number(start || 0), Number(end || 0)));
  if (safeEnd - safeStart < 0.04) return;

  djMixerState.loopRegionByDeck[deck] = { start: safeStart, end: Math.min(duration || safeEnd, safeEnd), length: safeEnd - safeStart, manual: true };
  djMixerState.loopActiveByDeck[deck] = true;
  renderSingleDeckControls();
  drawAllWaveforms();
}

function clearDeckLoop(deck) {
  djMixerState.loopActiveByDeck[deck] = false;
  djMixerState.loopRegionByDeck[deck] = null;
  renderSingleDeckControls();
  drawAllWaveforms();
}

function getFxBoardIds(board = djMixerState.activeFxBoard || "a") {
  return board === "b" ? (djMixerState.selectedFxBlueIds || []) : (djMixerState.selectedFxIds || []);
}

function getSelectedFxDefinitions(board = djMixerState.activeFxBoard || "a") {
  return getFxBoardIds(board)
    .map((id) => getFxDefinition(id))
    .filter(Boolean)
    .slice(0, DJ_LIVE_FX_LIMIT);
}

function bindFxPadButton(button) {
  const getEffect = () => normaliseFxName(button.dataset.djFxPad || button.querySelector("b")?.textContent || button.textContent || "");
  const trigger = () => {
    const effect = getEffect();
    const shouldEnable = !button.classList.contains("is-armed");
    applyFxToTarget(effect, shouldEnable);
    button.classList.toggle("is-armed", shouldEnable);
    updateNativeBackgroundModeClass();
  };

  button.addEventListener("pointerdown", () => {
    const effect = getEffect();
    button.dataset.djFxHeld = "0";
    window.clearTimeout(djMixerState.fxHoldTimers.get(button));
    const timer = window.setTimeout(() => {
      button.dataset.djFxHeld = "1";
      djMixerState.fxHeldPad = button;
      button.classList.add("is-holding");
      applyFxToTarget(effect, true);
    }, 420);
    djMixerState.fxHoldTimers.set(button, timer);
  });

  const release = () => {
    window.clearTimeout(djMixerState.fxHoldTimers.get(button));
    if (djMixerState.fxHeldPad === button || button.dataset.djFxHeld === "1") {
      djMixerState.fxHeldPad = null;
      button.dataset.djFxHeld = "0";
      button.classList.remove("is-holding", "is-armed");
      applyFxToTarget("", false);
      return;
    }
    trigger();
  };

  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", () => window.clearTimeout(djMixerState.fxHoldTimers.get(button)));
  button.addEventListener("pointerleave", () => window.clearTimeout(djMixerState.fxHoldTimers.get(button)));
}

function updateLiveFxBankLabels() {
  const board = djMixerState.activeFxBoard === "b" ? "b" : "a";
  const count = getFxBoardIds(board).length;
  if (liveFxBankTitle) liveFxBankTitle.textContent = board === "b" ? "BRMedia FX Board B" : "BRMedia FX Board A";
  if (liveFxBankSubtitle) liveFxBankSubtitle.textContent = board === "b"
    ? `${count} blue-board FX ready. Tap FX again for Board A.`
    : `${count} main-board FX ready. Tap FX again for Board B.`;
  document.body.classList.toggle("djFxBoardBActive", board === "b");
  performanceShell?.classList.toggle("djFxBoardBActive", board === "b");
  performanceModeTabs.forEach((button) => {
    if (button.dataset.djPerformanceMode === "fx") button.classList.toggle("is-board-b", board === "b");
  });
}

function renderLiveFxPads() {
  if (!fxPadGrid) return;
  const board = djMixerState.activeFxBoard === "b" ? "b" : "a";
  const selected = getSelectedFxDefinitions(board);
  fxPadGrid.innerHTML = selected.map((fx) => `
    <button type="button" data-dj-fx-pad="${escapeHtml(fx.id)}" class="${board === "b" ? "is-board-b" : "is-board-a"}">
      <b>${escapeHtml(fx.label)}</b>
      <span>${escapeHtml(fx.sub)}</span>
    </button>
  `).join("");
  fxPadButtons = Array.from(fxPadGrid.querySelectorAll("[data-dj-fx-pad]"));
  fxPadButtons.forEach(bindFxPadButton);
  updateLiveFxBankLabels();
}

function updateFxSelectorSummary() {
  const countA = (djMixerState.selectedFxIds || []).length;
  const countB = (djMixerState.selectedFxBlueIds || []).length;
  if (fxSelectorCount) fxSelectorCount.textContent = `Board A ${countA} / ${DJ_LIVE_FX_LIMIT} · Board B ${countB} / ${DJ_LIVE_FX_LIMIT}`;
  if (fxSelectorStatus) fxSelectorStatus.textContent = countA >= DJ_LIVE_FX_LIMIT
    ? "Board A full — new taps go blue. Tap orange FX again to move them to Board B."
    : "Tap once for Board A, again for Board B, again to remove.";
}

function renderFxSelectorBank() {
  if (!fxSelectorGrid) return;
  const selectedA = new Set(djMixerState.selectedFxIds || []);
  const selectedB = new Set(djMixerState.selectedFxBlueIds || []);
  fxSelectorGrid.innerHTML = DJ_FX_LIBRARY.map((fx) => {
    const state = selectedB.has(fx.id) ? "b" : selectedA.has(fx.id) ? "a" : "none";
    const stateLabel = state === "b" ? "Board B" : state === "a" ? "Board A" : "Off";
    return `
      <button type="button" data-dj-fx-select="${escapeHtml(fx.id)}" class="${state === "a" ? "is-board-a" : state === "b" ? "is-board-b" : ""}">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
        <span>${escapeHtml(fx.group)}</span>
        <strong>${escapeHtml(fx.label)}</strong>
        <em>${escapeHtml(fx.sub)}</em>
        <small>${stateLabel}</small>
      </button>
    `;
  }).join("");

  fxSelectorGrid.querySelectorAll("[data-dj-fx-select]").forEach((button) => {
    button.addEventListener("click", () => toggleFxInSelectedBank(button.dataset.djFxSelect || ""));
  });
  updateFxSelectorSummary();
}

function setSelectedFxBank(ids = [], { board = "a", render = true } = {}) {
  const clean = [];
  ids.map(normaliseFxName).forEach((id) => {
    if (!getFxDefinition(id) || clean.includes(id) || clean.length >= DJ_LIVE_FX_LIMIT) return;
    clean.push(id);
  });

  if (board === "b") {
    djMixerState.selectedFxBlueIds = clean;
    writeSelectedFxBank(djMixerState.selectedFxBlueIds, DJ_SELECTED_FX_BLUE_KEY);
  } else {
    djMixerState.selectedFxIds = clean.length ? clean : DJ_FX_PRESET_BANKS.club.slice(0, DJ_LIVE_FX_LIMIT);
    writeSelectedFxBank(djMixerState.selectedFxIds, DJ_SELECTED_FX_KEY);
  }

  if (render) {
    renderLiveFxPads();
    renderFxSelectorBank();
  }
}

function toggleFxInSelectedBank(effect = "") {
  const id = normaliseFxName(effect);
  if (!getFxDefinition(id)) return;

  const bankA = [...(djMixerState.selectedFxIds || [])];
  const bankB = [...(djMixerState.selectedFxBlueIds || [])];
  const indexA = bankA.indexOf(id);
  const indexB = bankB.indexOf(id);

  if (indexA >= 0) {
    bankA.splice(indexA, 1);
    if (!bankB.includes(id)) {
      if (bankB.length < DJ_LIVE_FX_LIMIT) bankB.push(id);
      else if (fxSelectorStatus) fxSelectorStatus.textContent = "Board B is full — remove a blue FX first.";
    }
  } else if (indexB >= 0) {
    bankB.splice(indexB, 1);
  } else if (bankA.length < DJ_LIVE_FX_LIMIT) {
    bankA.push(id);
  } else if (bankB.length < DJ_LIVE_FX_LIMIT) {
    bankB.push(id);
    if (fxSelectorStatus) fxSelectorStatus.textContent = "Board A is full, so this FX went to Board B.";
  } else {
    if (fxSelectorStatus) fxSelectorStatus.textContent = `Both FX boards are full. Remove one FX first.`;
    return;
  }

  djMixerState.selectedFxIds = bankA;
  djMixerState.selectedFxBlueIds = bankB;
  writeSelectedFxBank(bankA, DJ_SELECTED_FX_KEY);
  writeSelectedFxBank(bankB, DJ_SELECTED_FX_BLUE_KEY);
  renderLiveFxPads();
  renderFxSelectorBank();
}

function cycleLiveFxBoard() {
  djMixerState.activeFxBoard = djMixerState.activeFxBoard === "b" ? "a" : "b";
  clearFxForAllDecks();
  renderLiveFxPads();
}

function getFxTargetDecks() {
  if (djMixerState.fxTarget === "d1") return ["d1"];
  if (djMixerState.fxTarget === "d2") return ["d2"];
  return ["d1", "d2"];
}

function setFxTarget(target = "both") {
  djMixerState.fxTarget = ["d1", "d2", "both"].includes(target) ? target : "both";
  fxTargetButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.djFxTarget === djMixerState.fxTarget));
}

function getCurrentStemDeck() {
  return djMixerState.bpmEditDeck === "d2" ? "d2" : "d1";
}

function getStemValue(deck = getCurrentStemDeck(), stem = "") {
  return Math.max(0, Math.min(1, Number(djMixerState.stemCutByDeck?.[deck]?.[stem] ?? 1)));
}

function updateStemUi(deck = getCurrentStemDeck()) {
  const stems = djMixerState.stemCutByDeck?.[deck] || {};
  const activePreset = djMixerState.stemPresetByDeck?.[deck] || "reset";
  stemFaders.forEach((input) => {
    const stem = input.dataset.djStemFader || "";
    const value = Math.round((Number(stems[stem] ?? 1)) * 100);
    input.value = String(value);
  });
  stemLabels.forEach((label) => {
    const stem = label.dataset.djStemLabel || "";
    const value = Math.round((Number(stems[stem] ?? 1)) * 100);
    label.textContent = value <= 0 ? "MUTE" : `${value}%`;
  });
  stemMuteButtons.forEach((button) => {
    const stem = button.dataset.djStemMute || "";
    const muted = getStemValue(deck, stem) <= 0.005;
    button.classList.toggle("is-muted", muted);
    button.setAttribute("aria-pressed", muted ? "true" : "false");
    const glyph = button.querySelector("[data-dj-stem-mute-glyph]");
    if (glyph) glyph.textContent = muted ? "MUTE" : "ON";
  });
  stemSoloButtons.forEach((button) => {
    const stem = button.dataset.djStemSolo || "";
    const current = getStemValue(deck, stem);
    const others = ["drums", "bass", "harmonic", "vocals"].filter((name) => name !== stem);
    const soloed = current > 0.995 && others.every((name) => getStemValue(deck, name) <= 0.005);
    button.classList.toggle("is-solo", soloed);
    button.setAttribute("aria-pressed", soloed ? "true" : "false");
  });

  stemPresetButtons.forEach((button) => {
    const preset = button.dataset.djStemPreset || "reset";
    button.classList.toggle("is-active", preset === activePreset);
    button.setAttribute("aria-pressed", preset === activePreset ? "true" : "false");
  });

  stemCopyBothButtons.forEach((button) => {
    const copied = Date.now() < Number(djMixerState.stemCopyFlashUntil || 0);
    button.classList.toggle("is-active", copied);
    button.textContent = copied ? "Copied" : "Copy Both";
  });
}

function applyStemValues(deck = getCurrentStemDeck(), values = {}) {
  if (!djMixerState.stemCutByDeck?.[deck]) return;
  ["drums", "bass", "harmonic", "vocals"].forEach((stem) => {
    const next = Math.max(0, Math.min(1, Number(values[stem] ?? djMixerState.stemCutByDeck[deck][stem] ?? 1)));
    djMixerState.stemCutByDeck[deck][stem] = next;
    if (next > 0.005 && djMixerState.stemLastValueByDeck?.[deck]) djMixerState.stemLastValueByDeck[deck][stem] = next;
  });
  if (djAudio[deck]?.src) ensureDeckAudioGraph(deck);
  updateStemUi(deck);
  applyDeckVolumes();
}

function setStemCut(stem = "", value = 100, deck = getCurrentStemDeck()) {
  if (!stem || !djMixerState.stemCutByDeck?.[deck]) return;
  if (djMixerState.stemPresetByDeck) djMixerState.stemPresetByDeck[deck] = "custom";
  applyStemValues(deck, { [stem]: Number(value || 0) / 100 });
}

function toggleStemMute(stem = "", deck = getCurrentStemDeck()) {
  if (!stem || !djMixerState.stemCutByDeck?.[deck]) return;
  if (djMixerState.stemPresetByDeck) djMixerState.stemPresetByDeck[deck] = "custom";
  const current = getStemValue(deck, stem);
  const restore = Math.max(0.05, Math.min(1, Number(djMixerState.stemLastValueByDeck?.[deck]?.[stem] ?? 1)));
  setStemCut(stem, current <= 0.005 ? restore * 100 : 0, deck);
}

function soloStem(stem = "", deck = getCurrentStemDeck()) {
  if (!stem || !djMixerState.stemCutByDeck?.[deck]) return;
  if (djMixerState.stemPresetByDeck) djMixerState.stemPresetByDeck[deck] = `solo-${stem}`;
  const values = { drums: 0, bass: 0, harmonic: 0, vocals: 0, [stem]: 1 };
  applyStemValues(deck, values);
}

function applyStemPreset(preset = "reset", deck = getCurrentStemDeck()) {
  if (djMixerState.stemPresetByDeck) djMixerState.stemPresetByDeck[deck] = preset;
  const presets = {
    reset: { drums: 1, bass: 1, harmonic: 1, vocals: 1 },
    instrumental: { drums: 1, bass: 1, harmonic: 1, vocals: 0 },
    vocal: { drums: 0, bass: 0, harmonic: 0.22, vocals: 1 },
    "bass-cut": { drums: 1, bass: 0, harmonic: 1, vocals: 1 },
    drums: { drums: 1, bass: 0, harmonic: 0, vocals: 0 },
  };
  applyStemValues(deck, presets[preset] || presets.reset);
}

function copyStemCutsToBothDecks(deck = getCurrentStemDeck()) {
  const source = { ...(djMixerState.stemCutByDeck?.[deck] || {}) };
  const preset = djMixerState.stemPresetByDeck?.[deck] || "custom";
  ["d1", "d2"].forEach((target) => {
    if (djMixerState.stemPresetByDeck) djMixerState.stemPresetByDeck[target] = preset;
    applyStemValues(target, source);
  });
  djMixerState.stemCopyFlashUntil = Date.now() + 1100;
  updateStemUi(deck);
  window.setTimeout(() => updateStemUi(getCurrentStemDeck()), 1120);
}

function resetStemCuts(deck = getCurrentStemDeck()) {
  if (djMixerState.stemPresetByDeck) djMixerState.stemPresetByDeck[deck] = "reset";
  djMixerState.stemCutByDeck[deck] = { drums: 1, bass: 1, harmonic: 1, vocals: 1 };
  djMixerState.stemLastValueByDeck[deck] = { drums: 1, bass: 1, harmonic: 1, vocals: 1 };
  if (djAudio[deck]?.src) ensureDeckAudioGraph(deck);
  updateStemUi(deck);
  applyDeckVolumes();
}

function clearAllFxPads() {
  fxPadButtons.forEach((pad) => pad.classList.remove("is-armed", "is-holding"));
}

function clearFxForAllDecks() {
  clearAllFxPads();
  ["d1", "d2"].forEach((deck) => {
    djMixerState.fxByDeck[deck] = "";
    applyDeckFx(deck);
  });
  applyDeckVolumes();
}

function applyFxToTarget(effect = "", shouldEnable = true) {
  const targets = getFxTargetDecks();
  clearAllFxPads();
  ["d1", "d2"].forEach((deck) => {
    if (targets.includes(deck)) {
      djMixerState.fxByDeck[deck] = shouldEnable ? effect : "";
    } else if (djMixerState.fxTarget !== "both") {
      djMixerState.fxByDeck[deck] = "";
    }
    if (djAudio[deck]?.src && djMixerState.fxByDeck[deck]) ensureDeckAudioGraph(deck);
    applyDeckFx(deck);
  });
}

function applyVinylBrake(deck) {
  const audio = djAudio[deck];
  if (!audio?.src) return;

  const originalRate = Number(audio.playbackRate || 1);
  const steps = [0.82, 0.58, 0.32, 0.12, 0.02];
  steps.forEach((rate, index) => {
    window.setTimeout(() => {
      if (audio.paused) return;
      audio.playbackRate = Math.max(0.02, originalRate * rate);
    }, index * 55);
  });
  window.setTimeout(() => {
    audio.pause();
    audio.playbackRate = originalRate;
  }, steps.length * 60 + 60);
}

function getSingleDeckBarsLabel(deck) {
  const grid = getDeckGrid(deck);
  const interval = getBeatIntervalForDeck(deck);
  const current = Number(djAudio[deck]?.currentTime || 0);
  const beatsPerBar = Math.max(1, Number(grid.beatsPerBar || 4));
  const beatIndex = (current - Number(grid.downbeat || 0)) / interval;
  if (!Number.isFinite(beatIndex)) return "-- Bars";

  const bars = beatIndex / beatsPerBar;
  const sign = bars >= 0 ? "+" : "";
  const beatInBar = Math.abs(Math.floor(beatIndex) % beatsPerBar) + 1;
  return `${sign}${bars.toFixed(1)} Bars · Beat ${beatInBar}`;
}

function renderSingleDeckMeta(deck) {
  const item = djDeckState[deck]?.item;
  const audio = djAudio[deck];
  const duration = Number(audio?.duration || item?.duration || 0);
  const current = Number(audio?.currentTime || 0);
  const remaining = duration ? Math.max(0, duration - current) : 0;

  document.querySelectorAll(`[data-dj-single-title="${deck}"]`).forEach((node) => { node.textContent = item?.title || "Load Track"; });
  document.querySelectorAll(`[data-dj-single-artist="${deck}"]`).forEach((node) => { node.textContent = item ? (item.artist || item.albumArtist || "Unknown artist") : "Choose a short mixable DJ track."; });
  document.querySelectorAll(`[data-dj-single-bpm="${deck}"]`).forEach((node) => { node.textContent = Number(djMixerState.bpmByDeck?.[deck] || 170).toFixed(2); });
  document.querySelectorAll(`[data-dj-single-key="${deck}"]`).forEach((node) => { node.textContent = getDeckKeyLabel(deck); });
  document.querySelectorAll(`[data-dj-single-time="${deck}"]`).forEach((node) => { node.textContent = item ? `${formatDeckClock(remaining)} left` : "--:--"; });
  document.querySelectorAll(`[data-dj-single-time-left="${deck}"]`).forEach((node) => { node.textContent = item ? `-${formatDeckClock(remaining)}` : "--:--"; });
  document.querySelectorAll(`[data-dj-single-time-right="${deck}"]`).forEach((node) => { node.textContent = item ? formatDeckClock(current) : "00:00.0"; });
  document.querySelectorAll(`[data-dj-single-bars="${deck}"]`).forEach((node) => { node.textContent = item ? getSingleDeckBarsLabel(deck) : "-- Bars"; });
  document.querySelectorAll(`[data-dj-single-q="${deck}"]`).forEach((node) => { node.classList.toggle("is-on", Boolean(djMixerState.quantizeByDeck?.[deck])); });
}

function updateSingleDeckLiveMeta() {
  const activeDeck = getCurrentSingleDeck();
  renderSingleDeckMeta(activeDeck);
}

function renderSingleDeckControls() {
  const activeDeck = getCurrentSingleDeck();
  const activeTab = djMixerState.singleDeckTab || "main";

  singleDeckTabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.djSingleTab === activeTab);
  });

  singleModePanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.djSinglePanel === activeTab);
  });

  const loopButton = document.querySelector('[data-dj-loop-size="active"]');
  if (loopButton?.firstChild) loopButton.firstChild.textContent = `${djMixerState.loopSizeByDeck?.[activeDeck] || "8 Bars"} `;

  const autoLoopValue = document.querySelector("[data-dj-single-loop-value]");
  if (autoLoopValue) autoLoopValue.textContent = formatLoopSizeLabel(djMixerState.autoLoopSizeByDeck?.[activeDeck] || 4);
  document.querySelectorAll('[data-dj-single-loop="auto"]').forEach((button) => button.classList.toggle("is-active", Boolean(djMixerState.loopActiveByDeck?.[activeDeck])));
  document.querySelectorAll('[data-dj-single-loop="loop-exit"]').forEach((button) => button.classList.toggle("is-active", Boolean(djMixerState.loopActiveByDeck?.[activeDeck])));
  document.querySelectorAll('[data-dj-single-loop="loop-in"]').forEach((button) => {
    const hasIn = Number.isFinite(Number(djMixerState.loopInPointByDeck?.[activeDeck]));
    button.classList.toggle("is-active", hasIn);
    button.querySelector("span") && (button.querySelector("span").textContent = hasIn ? formatCueTimeLabel(djMixerState.loopInPointByDeck[activeDeck]) : "Set start");
  });
  document.querySelectorAll('[data-dj-single-loop="loop-out"]').forEach((button) => {
    const loop = djMixerState.loopRegionByDeck?.[activeDeck];
    button.classList.toggle("is-active", Boolean(loop));
    button.querySelector("span") && (button.querySelector("span").textContent = loop ? `${formatCueTimeLabel(loop.start)} → ${formatCueTimeLabel(loop.end)}` : "Set end");
  });

  if (singleDeckBpmInput && document.activeElement !== singleDeckBpmInput) {
    singleDeckBpmInput.value = Number(djMixerState.bpmByDeck?.[activeDeck] || 170).toFixed(2);
  }

  singleHotCueButtons.forEach((button) => {
    const key = button.dataset.djHotCue;
    const cue = djMixerState.hotCuesByDeck?.[activeDeck]?.[key];
    button.classList.toggle("is-set", typeof cue === "number");
    button.classList.toggle("is-delete-armed", Boolean(djMixerState.hotCueDeleteArmed));
    button.classList.add(getHotCueColourClass(key));
    const label = button.querySelector("span");
    if (label) label.textContent = typeof cue === "number" ? formatCueTimeLabel(cue) : "Empty";
  });

  renderMemoryCueStrip(activeDeck);
  setFxTarget(djMixerState.fxTarget || "both");
  singleHotCueClearButton?.classList.toggle("is-active", Boolean(djMixerState.hotCueDeleteArmed));
  singleFxButtons.forEach((button) => button.classList.toggle("is-active", djMixerState.fxByDeck?.[activeDeck] === normaliseFxName(button.dataset.djSingleFx || "")));

  document.querySelectorAll(".djSingleTransportRow [data-dj-transport]").forEach((button) => {
    button.dataset.djDeck = activeDeck;
  });
}

function updateDeckPrepUi() {
  ["d1", "d2"].forEach((deck) => {
    const grid = getDeckGrid(deck);
    const statusNode = singleDeckStatus[deck];
    if (!statusNode) return;

    const item = djDeckState[deck]?.item;
    const prep = getTrackPrepForItem(item);
    const readiness = getDeckSyncReadiness(deck);
    const qLabel = djMixerState.quantizeByDeck?.[deck] ? "Q On" : "Q Off";
    const lockLabel = grid.locked ? "Grid locked" : "Grid unlocked";
    const waveLabel = prep.waveformReady ? "Wave ready" : djMixerState.waveformAnalysisState?.[deck] === "fallback" ? "Preview wave" : "Wave pending";
    const analysisLabel = prep.analysisPending ? "Analysing beats" : prep.analysisReady ? `Beat confidence ${Math.round(Number(prep.bpmConfidence || 0) * 100)}%` : "Beat analysis pending";
    statusNode.textContent = `${Number(djMixerState.bpmByDeck?.[deck] || 170).toFixed(1)} BPM • ${readiness.label} • ${waveLabel} • ${analysisLabel} • downbeat ${Number(grid.downbeat || 0).toFixed(3)}s • ${qLabel} • ${lockLabel}`;
  });

  gridActionButtons.forEach((button) => {
    button.classList.toggle("is-locked", button.dataset.djGridAction === "lock" && Boolean(getDeckGrid(getCurrentSingleDeck()).locked));
  });

  const activeDeck = getCurrentSingleDeck();
  const activeGrid = getDeckGrid(activeDeck);
  const activeReadiness = getDeckSyncReadiness(activeDeck);
  const beat = getGridBeatDetails(activeDeck);
  gridReadinessLabels.forEach((node) => {
    node.textContent = activeReadiness.label;
    node.classList.toggle("is-ready", activeReadiness.label === "BEAT READY");
    node.classList.toggle("is-needed", activeReadiness.label !== "BEAT READY");
  });
  gridReadoutLabels.forEach((node) => {
    node.textContent = `Beat ${Math.max(1, beat.nearestIndex + 1)} • ${beat.beatInBar === 0 ? "bar line" : `beat ${beat.beatInBar + 1}`} • grid ${Math.round(Number(activeGrid.gridConfidence || 0) * 100)}% • ${djMixerState.quantizeByDeck?.[activeDeck] ? "Q on" : "Q off"}`;
  });
  quantizeToggleButtons.forEach((button) => {
    const theme = getWaveformTheme(activeDeck);
    button.classList.toggle("is-selected", Boolean(theme));
    button.title = `Waveform colour: ${theme.label}`;
    button.setAttribute("aria-label", `Switch waveform colour theme. Current: ${theme.label}`);
  });
  ["d1", "d2"].forEach(renderSingleDeckMeta);
  renderSingleDeckControls();
}

function updateSingleDeckView() {
  const activeDeck = getCurrentSingleDeck();

  singleDeckViews.forEach((view) => {
    view.classList.toggle("hidden", view.dataset.djSingleDeck !== activeDeck);
  });

  updateDeckPrepUi();
  updateStemUi(activeDeck);
}

function updateDeckPreviewStates() {
  ["d1", "d2"].forEach((deck) => {
    const card = document.querySelector(`[data-dj-preview="${deck}"]`);
    if (!card) return;

    const hasTrack = Boolean(djDeckState[deck]?.item);
    const hasPlayed = Boolean(hasTrack && Number(djAudio[deck]?.currentTime || 0) > 0.25);
    card.classList.toggle("is-loaded", hasTrack);
    card.classList.toggle("is-unloaded", !hasTrack);
    card.classList.toggle("has-played-position", hasPlayed);
  });
}

function updateMixerModeButton() {
  const mixerButton = performanceModeTabs.find((button) => button.dataset.djPerformanceMode === "mixer");
  if (!mixerButton) return;

  const label = mixerButton.querySelector("span");
  if (label) label.textContent = djMixerState.eqMode === "kill" ? "KILL" : "MIXER";
  mixerButton.classList.toggle("is-kill-mode", djMixerState.eqMode === "kill");
}

function handlePerformanceModeClick(button) {
  const mode = button.dataset.djPerformanceMode || "mixer";
  const isAlreadyMixer = mode === "mixer" && button.classList.contains("is-active");
  const isAlreadyFx = mode === "fx" && button.classList.contains("is-active");

  if (isAlreadyMixer) {
    setEqMode(djMixerState.eqMode === "kill" ? "knob" : "kill");
    return;
  }

  if (isAlreadyFx) {
    cycleLiveFxBoard();
    return;
  }

  setPerformanceMode(mode);

  if (mode === "mixer") {
    setEqMode("knob");
  }

  if (mode === "fx") {
    renderLiveFxPads();
  }
}

function syncPerformanceSetup(setup = readSetup()) {
  if (!djBpmValueInput) return;
  const deck = djMixerState.bpmEditDeck || "d1";
  djBpmValueInput.value = String(djMixerState.bpmByDeck?.[deck] || 170);
  updateBpmUi();
}

function getWaveformCanvasDeck(canvas, attribute) {
  return canvas?.dataset?.[attribute] === "d2" ? "d2" : "d1";
}

function getWaveformMode(deck = "d1") {
  return djMixerState.waveformModeByDeck?.[deck] || "3band";
}

function getDeckDuration(deck) {
  const engineDuration = isDjEngineV2Ready() ? Number(window.BRMediaDjEngine.getDuration(deck) || 0) : 0;
  const audioDuration = Number(djAudio[deck]?.duration || 0);
  const itemDuration = Number(djDeckState[deck]?.item?.duration || 0);
  return engineDuration > 0 ? engineDuration : audioDuration > 0 ? audioDuration : itemDuration > 0 ? itemDuration : 180;
}

function setWaveformStatus(deck, message) {
  if (waveformStatus[deck]) waveformStatus[deck].textContent = message;
}

function updateWaveformControls() {
  const activeDeck = djMixerState.bpmEditDeck || "d1";
  const activeMode = getWaveformMode(activeDeck);

  waveformModeButtons.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.djWaveformMode === activeMode);
  });

  if (waveformZoomLabel) {
    const zoom = Number(djMixerState.waveformZoomByDeck?.[activeDeck] || 1);
    const barsVisible = getSingleDeckWaveformBarsVisible(activeDeck);
    waveformZoomLabel.textContent = `${barsVisible >= 1 ? barsVisible.toFixed(0) : barsVisible.toFixed(1)} Bars · ${zoom.toFixed(1)}x`;
  }

  const activeThemeIndex = Number(djMixerState.waveformThemeIndexByDeck?.[activeDeck] || 0);
  const activeTheme = DJ_WAVEFORM_THEMES[activeThemeIndex % DJ_WAVEFORM_THEMES.length] || DJ_WAVEFORM_THEMES[0];
  quantizeToggleButtons.forEach((button) => {
    button.classList.add("is-active");
    button.classList.toggle("is-selected", true);
    button.title = `Waveform colour theme: ${activeTheme.label}`;
    const label = button.querySelector("span");
    if (label) label.textContent = activeTheme.label === "BRMedia" ? "Theme" : activeTheme.label;
  });

  waveformDeckPanels.forEach((panel) => {
    const deck = panel.dataset.djWaveformDeck === "d2" ? "d2" : "d1";
    const hasTrack = Boolean(djDeckState[deck]?.item);

    panel.classList.toggle("is-active", deck === activeDeck);
    panel.classList.toggle("is-empty", !hasTrack);
  });

  loopSizeButtons.forEach((button) => {
    const deck = button.dataset.djLoopSize === "active" ? getCurrentSingleDeck() : button.dataset.djLoopSize === "d2" ? "d2" : "d1";
    button.firstChild.textContent = `${djMixerState.loopSizeByDeck?.[deck] || "8 Bars"} `;
  });

  const hasAnyTrack = Boolean(djDeckState.d1.item || djDeckState.d2.item);
  document.querySelector(".djWaveformStage")?.classList.toggle("is-empty", !hasAnyTrack);
  updateSingleDeckView();
  updateDeckTimeDisplays();
  updateDeckPreviewStates();
}

function makeFallbackWaveformPeaks(deck = "d1", count = 640) {
  const seed = deck === "d2" ? 29 : 11;
  const duration = getDeckDuration(deck);
  const peaks = [];

  for (let index = 0; index < count; index += 1) {
    const phase = (index + seed) / count;
    const pulse = Math.abs(Math.sin((index + seed) * 0.19));
    const roll = Math.abs(Math.sin((index + seed) * 0.047));
    const chop = Math.abs(Math.sin((index + seed) * 0.73));
    const low = Math.min(1, 0.18 + (pulse * 0.68));
    const mid = Math.min(1, 0.14 + (roll * 0.58));
    const high = Math.min(1, 0.10 + (chop * 0.48));

    peaks.push({
      time: duration * phase,
      low,
      mid,
      high,
      peak: Math.max(low, mid, high),
    });
  }

  return { duration, peaks, fallback: true };
}

function getDeckWaveformData(deck = "d1") {
  if (!djDeckState[deck]?.item) return null;
  return djMixerState.waveformPeaksByDeck?.[deck] || null;
}

function getTrackWaveformId(item) {
  return String(item?.id || "").trim();
}

function rememberWaveformForItem(item, peaks) {
  const id = getTrackWaveformId(item);
  if (!id || !peaks?.peaks?.length) return;

  djMixerState.waveformMemoryCacheById.set(id, peaks);
  djMixerState.waveformCachedIds.add(id);
  rememberTrackPrep(item, {
    waveformReady: true,
    waveformAnalysing: false,
    waveformDuration: Number(peaks.duration || item?.duration || 0),
    waveformPeaks: peaks.peaks.length,
    waveformCachedAt: Date.now(),
  });

  while (djMixerState.waveformMemoryCacheById.size > DJ_WAVEFORM_MEMORY_LIMIT) {
    const oldestKey = djMixerState.waveformMemoryCacheById.keys().next().value;
    if (!oldestKey) break;
    djMixerState.waveformMemoryCacheById.delete(oldestKey);
  }
}

function getRememberedWaveformForItem(item) {
  const id = getTrackWaveformId(item);
  return id ? djMixerState.waveformMemoryCacheById.get(id) : null;
}

function applyWaveformToDeck(deck, item, peaks, { status = "ready", label = "cached peaks" } = {}) {
  if (!deck || !peaks?.peaks?.length) return false;

  const expectedId = String(item?.id || "");
  const currentId = String(djDeckState[deck]?.item?.id || "");
  if (expectedId && currentId && expectedId !== currentId) return false;

  djMixerState.waveformPeaksByDeck[deck] = peaks;
  djMixerState.waveformAnalysisState[deck] = status;
  rememberWaveformForItem(item || djDeckState[deck]?.item, peaks);
  setWaveformStatus(deck, `Waveform ready • ${Math.round(Number(peaks.duration || 0))}s • ${label}`);
  if (!queueTrackAnalysisForDeck(deck, item || djDeckState[deck]?.item, peaks)) {
    applyAutoGridSuggestion(deck, peaks);
  }
  refreshTrackPrepForLoadedDeck(deck);
  updateDeckPrepUi();
  drawAllWaveforms();
  return true;
}

function applyWaveformToLoadedDecks(item, peaks, options = {}) {
  const id = getTrackWaveformId(item);
  if (!id || !peaks?.peaks?.length) return;

  ["d1", "d2"].forEach((deck) => {
    if (getTrackWaveformId(djDeckState[deck]?.item) === id) {
      applyWaveformToDeck(deck, item, peaks, options);
    }
  });
}

function getWaveformDecodeContext() {
  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) return null;
  if (!waveformDecodeContext) waveformDecodeContext = new AudioContextClass();
  return waveformDecodeContext;
}

function normalisePeak(value, fallback = 0) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : fallback));
}

function buildWaveformPeaksFromBuffer(buffer, count = 900) {
  const channel = buffer.getChannelData(0);
  const samplesPerPeak = Math.max(1, Math.floor(channel.length / count));
  const peaks = [];
  let previousMean = 0;
  let maxPeak = 0.001;

  for (let peakIndex = 0; peakIndex < count; peakIndex += 1) {
    const start = peakIndex * samplesPerPeak;
    const end = Math.min(channel.length, start + samplesPerPeak);
    let sum = 0;
    let max = 0;
    let diff = 0;
    let last = channel[start] || 0;

    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 8) {
      const sample = channel[sampleIndex] || 0;
      const abs = Math.abs(sample);
      sum += abs;
      if (abs > max) max = abs;
      diff += Math.abs(sample - last);
      last = sample;
    }

    const steps = Math.max(1, Math.ceil((end - start) / 8));
    const mean = sum / steps;
    const transient = diff / steps;
    const lowRaw = (previousMean * 0.72) + (mean * 0.56);
    const highRaw = transient * 9.5;
    const midRaw = Math.max(0, (mean * 1.8) - (highRaw * 0.28));

    previousMean = lowRaw;
    maxPeak = Math.max(maxPeak, lowRaw, midRaw, highRaw, max);
    peaks.push({
      time: buffer.duration * (peakIndex / Math.max(1, count - 1)),
      low: lowRaw,
      mid: midRaw,
      high: highRaw,
      peak: max,
    });
  }

  return {
    duration: buffer.duration,
    peaks: peaks.map((peak) => ({
      time: peak.time,
      low: normalisePeak(peak.low / maxPeak),
      mid: normalisePeak(peak.mid / maxPeak),
      high: normalisePeak(peak.high / maxPeak),
      peak: normalisePeak(peak.peak / maxPeak),
    })),
    fallback: false,
  };
}

function waveformPayloadToDeckPeaks(payload) {
  const duration = Math.max(1, Number(payload?.duration || 0));
  const rawPeaks = Array.isArray(payload?.peaks) ? payload.peaks : [];
  const bands = payload?.bands || {};
  const lowBands = Array.isArray(bands.low) ? bands.low : rawPeaks;
  const midBands = Array.isArray(bands.mid) ? bands.mid : rawPeaks;
  const highBands = Array.isArray(bands.high) ? bands.high : rawPeaks;
  const count = Math.max(rawPeaks.length, lowBands.length, midBands.length, highBands.length);

  return {
    duration,
    cached: Boolean(payload?.cached),
    peaks: Array.from({ length: count }, (_, index) => {
      const low = normalisePeak(Number(lowBands[index] ?? rawPeaks[index] ?? 0));
      const mid = normalisePeak(Number(midBands[index] ?? rawPeaks[index] ?? 0));
      const high = normalisePeak(Number(highBands[index] ?? rawPeaks[index] ?? 0));
      const peak = normalisePeak(Number(rawPeaks[index] ?? Math.max(low, mid, high)));

      return {
        time: duration * (index / Math.max(1, count - 1)),
        low,
        mid,
        high,
        peak: Math.max(peak, low, mid, high),
      };
    }),
  };
}

async function fetchServerWaveformForItem(item, { force = false } = {}) {
  if (!item?.id) throw new Error("Missing track id");

  if (force) {
    const generateResponse = await fetch("/waveforms/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "single", id: item.id, count: DJ_WAVEFORM_PEAK_COUNT, force: true }),
    });

    if (!generateResponse.ok) throw new Error(`Waveform reanalyse failed ${generateResponse.status}`);
  }

  const response = await fetch(`/track/${encodeURIComponent(item.id)}/waveform?count=${DJ_WAVEFORM_PEAK_COUNT}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Waveform fetch failed ${response.status}`);

  return await response.json();
}

async function analyseLibraryItem(item, { force = false, deck = null } = {}) {
  if (!item?.id) return null;

  const id = String(item.id);
  const remembered = !force ? getRememberedWaveformForItem(item) : null;

  if (remembered) {
    djMixerState.waveformCachedIds.add(id);
    if (deck) applyWaveformToDeck(deck, item, remembered, { status: "ready", label: "instant cache" });
    return remembered;
  }

  djMixerState.waveformAnalysingIds.add(id);
  renderDjLibrary();

  try {
    const payload = await fetchServerWaveformForItem(item, { force });
    const peaks = waveformPayloadToDeckPeaks(payload);
    rememberWaveformForItem(item, peaks);

    if (deck) {
      applyWaveformToDeck(deck, item, peaks, {
        status: "ready",
        label: payload?.cached ? "server cache" : "server peaks",
      });
    }

    return peaks;
  } catch (err) {
    console.warn("Waveform analysis failed", err);

    if (deck) {
      djMixerState.waveformPeaksByDeck[deck] = makeFallbackWaveformPeaks(deck);
      djMixerState.waveformAnalysisState[deck] = "fallback";
      setWaveformStatus(deck, "Preview waveform only — tap Analyse in library to rebuild server peaks.");
      drawAllWaveforms();
    }

    return null;
  } finally {
    djMixerState.waveformAnalysingIds.delete(id);
    renderDjLibrary();
  }
}

async function analyseDeckWaveform(deck) {
  const item = djDeckState[deck]?.item;
  if (!item?.id) {
    djMixerState.waveformPeaksByDeck[deck] = null;
    setWaveformStatus(deck, "Load a track to analyse waveform.");
    drawAllWaveforms();
    return;
  }

  djMixerState.waveformAnalysisState[deck] = "analysing";
  setWaveformStatus(deck, "Analysing waveform on server…");
  drawAllWaveforms();
  const loadedId = String(item.id || "");
  const peaks = await analyseLibraryItem(item, { deck });
  if (loadedId && String(djDeckState[deck]?.item?.id || "") !== loadedId) return;

  if (peaks) {
    applyAutoGridSuggestion(deck, peaks);
    updateDeckPrepUi();
    drawAllWaveforms();
  }
}

function getWaveformColours(mode, peak, deck = "d1") {
  const themeIndex = Number(djMixerState.waveformThemeIndexByDeck?.[deck] || 0);
  const theme = DJ_WAVEFORM_THEMES[themeIndex % DJ_WAVEFORM_THEMES.length] || DJ_WAVEFORM_THEMES[0];

  if (mode === "blue") {
    return {
      low: "rgba(28, 125, 255, 0.92)",
      mid: "rgba(86, 216, 255, 0.84)",
      high: "rgba(248, 254, 255, 0.94)",
    };
  }

  if (mode === "rgb") {
    return {
      low: "rgba(255, 82, 82, 0.88)",
      mid: "rgba(108, 236, 148, 0.82)",
      high: "rgba(83, 194, 255, 0.90)",
    };
  }

  return {
    low: theme.low,
    mid: theme.mid,
    high: theme.high,
  };
}

function prepareCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

function getPeakAtTime(data, time) {
  if (!data?.peaks?.length) return { low: 0, mid: 0, high: 0, peak: 0 };
  const duration = Math.max(1, data.duration || 1);

  if (time < 0 || time > duration) {
    return { low: 0, mid: 0, high: 0, peak: 0 };
  }

  const ratio = Math.max(0, Math.min(1, time / duration));
  const exactIndex = ratio * Math.max(0, data.peaks.length - 1);
  const leftIndex = Math.floor(exactIndex);
  const rightIndex = Math.min(data.peaks.length - 1, leftIndex + 1);
  const mix = exactIndex - leftIndex;
  const left = data.peaks[leftIndex] || {};
  const right = data.peaks[rightIndex] || left;

  const lerp = (a, b) => Number(a || 0) + ((Number(b || 0) - Number(a || 0)) * mix);
  const low = lerp(left.low, right.low);
  const mid = lerp(left.mid, right.mid);
  const high = lerp(left.high, right.high);
  const peak = lerp(left.peak ?? Math.max(left.low || 0, left.mid || 0, left.high || 0), right.peak ?? Math.max(right.low || 0, right.mid || 0, right.high || 0));

  return { low, mid, high, peak };
}

function drawBeatGrid(ctx, deck, width, height, secondsStart, secondsVisible) {
  const bpm = Number(djMixerState.bpmByDeck?.[deck] || 170);
  const grid = getDeckGrid(deck);
  const interval = 60 / Math.max(40, bpm);
  const downbeat = Number(grid.downbeat || 0);
  const beatsPerBar = Math.max(1, Number(grid.beatsPerBar || 4));
  const phraseBars = 8;
  const firstBeat = Math.floor((secondsStart - downbeat) / interval) - 2;
  const beatsToDraw = Math.ceil(secondsVisible / interval) + 6;
  const isSingleDeck = document.body.classList.contains("djSingleDeckMode");

  ctx.save();
  ctx.lineCap = "butt";
  ctx.globalCompositeOperation = "source-over";

  for (let offset = 0; offset < beatsToDraw; offset += 1) {
    const beatIndex = firstBeat + offset;
    const beatTime = downbeat + (beatIndex * interval);
    const x = ((beatTime - secondsStart) / secondsVisible) * width;
    if (x < -10 || x > width + 10) continue;

    const isBar = beatIndex % beatsPerBar === 0;
    const isPhrase = beatIndex % (beatsPerBar * phraseBars) === 0;
    const isFirstOne = Math.abs(beatTime - downbeat) < interval * 0.5;
    const pixelX = Math.round(x) + 0.5;
    const colour = isFirstOne
      ? "rgba(255, 72, 72, 0.98)"
      : isPhrase
        ? "rgba(242, 160, 7, 0.92)"
        : isBar
          ? "rgba(255, 72, 72, 0.86)"
          : "rgba(235, 245, 255, 0.58)";

    ctx.save();
    ctx.shadowColor = colour;
    ctx.shadowBlur = isFirstOne || isPhrase ? 8 : 3;
    ctx.beginPath();
    ctx.moveTo(pixelX, 0);
    ctx.lineTo(pixelX, height);
    ctx.strokeStyle = colour;
    ctx.lineWidth = isFirstOne ? 2 : isPhrase ? 1.65 : isBar ? 1.25 : 0.72;
    ctx.stroke();
    ctx.restore();

    if (isSingleDeck && (isFirstOne || isBar || isPhrase)) {
      ctx.fillStyle = isFirstOne ? "rgba(255, 72, 72, 0.98)" : isPhrase ? "rgba(242, 160, 7, 0.98)" : "rgba(123, 208, 255, 0.76)";
      ctx.beginPath();
      ctx.moveTo(x, height - 1);
      ctx.lineTo(x - (isFirstOne ? 7 : isPhrase ? 5 : 4), height - (isFirstOne ? 12 : isPhrase ? 9 : 7));
      ctx.lineTo(x + (isFirstOne ? 7 : isPhrase ? 5 : 4), height - (isFirstOne ? 12 : isPhrase ? 9 : 7));
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}

function getDuoWaveformSecondsVisible(deck = djMixerState.masterDeck || "d1") {
  const bpm = Number(djMixerState.bpmByDeck?.[deck] || 170);
  const fourBars = (60 / Math.max(40, bpm)) * 16;
  return Math.max(3.2, Math.min(7.2, fourBars));
}

function getSingleDeckWaveformBarsVisible(deck) {
  const zoom = Math.max(0.5, Number(djMixerState.waveformZoomByDeck?.[deck] || 1));
  return Math.max(0.5, Math.min(32, 8 / zoom));
}

function getSingleDeckWaveformSecondsVisible(deck) {
  const bpm = Math.max(40, Number(djMixerState.bpmByDeck?.[deck] || 170));
  const beatsPerBar = Math.max(1, Number(getDeckGrid(deck)?.beatsPerBar || 4));
  const barsVisible = getSingleDeckWaveformBarsVisible(deck);
  return Math.max(0.45, (60 / bpm) * beatsPerBar * barsVisible);
}

function getSingleDeckWaveformWindow(deck) {
  const data = getDeckWaveformData(deck);
  const audio = djAudio[deck];
  const duration = Math.max(1, data?.duration || getDeckDuration(deck));
  const secondsVisible = Math.min(duration, getSingleDeckWaveformSecondsVisible(deck));
  const current = Math.max(0, Number(audio?.currentTime || 0));
  const playheadRatio = getSingleDeckPlayheadRatio();
  const earliestStart = -(secondsVisible * playheadRatio);
  const latestStart = Math.max(earliestStart, duration - (secondsVisible * (1 - playheadRatio)));

  return {
    duration,
    secondsVisible,
    secondsStart: Math.max(earliestStart, Math.min(latestStart, current - (secondsVisible * playheadRatio))),
  };
}

function getMainWaveformWindow(deck) {
  const data = getDeckWaveformData(deck);
  const audio = djAudio[deck];
  const duration = Math.max(1, data?.duration || getDeckDuration(deck));
  const secondsVisible = Math.min(duration, getDuoWaveformSecondsVisible(deck));
  const current = Math.max(0, Number(audio?.currentTime || 0));
  const earliestStart = -(secondsVisible / 2);
  const latestStart = Math.max(earliestStart, duration - (secondsVisible / 2));

  return {
    duration,
    secondsVisible,
    secondsStart: Math.max(earliestStart, Math.min(latestStart, current - (secondsVisible / 2))),
  };
}

function seekDeckFromWaveform(deck, event, overview = false) {
  const audio = djAudio[deck];
  const data = getDeckWaveformData(deck);
  if (!audio || !data?.peaks?.length) return;

  const canvas = event.currentTarget;
  const rect = canvas.getBoundingClientRect();
  const duration = Math.max(1, audio.duration || data.duration || getDeckDuration(deck));
  const isSingleDetail = !overview && canvas.classList.contains("djSingleMainWaveCanvas");

  // Lock the visible window at pointer-down so the waveform no longer fights/re-centres while dragging.
  const startWindow = isSingleDetail ? getSingleDeckWaveformWindow(deck) : getMainWaveformWindow(deck);
  const startX = event.clientX;
  const startTime = Number(audio.currentTime || 0);
  let moved = false;
  let lastSeekDrawAt = 0;

  const applySeekTime = (targetTime, pointerEvent = null) => {
    audio.currentTime = Math.max(0, Math.min(duration, targetTime));
    markManualWaveformSeek(deck);
    updateDeckTimeDisplays();
    updateDeckPreviewStates();
    updateSingleDeckLiveMeta();
    updateDjCollectionMiniPlayer();

    const now = pointerEvent?.timeStamp || performance.now();
    if (now - lastSeekDrawAt > 28) {
      lastSeekDrawAt = now;
      drawWaveformCanvasesOnly();
    }
  };

  const seekAbsolute = (pointerEvent) => {
    const ratio = Math.max(0, Math.min(1, (pointerEvent.clientX - rect.left) / Math.max(1, rect.width)));
    let targetTime = overview
      ? ratio * duration
      : startWindow.secondsStart + (ratio * startWindow.secondsVisible);

    // Single-deck edge taps now page the close-up window back/forward.
    // This makes it much easier to get right back to the intro/front of Deck 1 or Deck 2.
    if (isSingleDetail && !overview) {
      if (ratio <= 0.075) targetTime = startWindow.secondsStart - (startWindow.secondsVisible * 0.85);
      if (ratio >= 0.925) targetTime = startWindow.secondsStart + (startWindow.secondsVisible * 1.85);
    }

    applySeekTime(targetTime, pointerEvent);
  };

  event.preventDefault();
  canvas.setPointerCapture?.(event.pointerId);

  if (!isSingleDetail) {
    seekAbsolute(event);
  }

  const move = (moveEvent) => {
    moveEvent.preventDefault();
    const deltaX = moveEvent.clientX - startX;
    if (Math.abs(deltaX) < 3) return;

    moved = true;
    const dragRatio = deltaX / Math.max(1, rect.width);
    const bigSingleDeckPull = isSingleDetail && Math.abs(deltaX) > rect.width * 0.16;
    const dragWindow = overview
      ? duration
      : bigSingleDeckPull
        ? Math.max(startWindow.secondsVisible, duration * 0.42)
        : startWindow.secondsVisible;
    const sensitivity = isSingleDetail ? (bigSingleDeckPull ? 2.15 : 1.55) : 0.6;
    const direction = isSingleDetail ? -1 : 1;
    const targetTime = startTime + (direction * dragRatio * dragWindow * sensitivity);

    applySeekTime(targetTime, moveEvent);
  };

  const stop = (stopEvent) => {
    if (!moved) {
      seekAbsolute(stopEvent || event);
    }

    drawAllWaveforms();
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
  };

  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

function getWaveformSmoothingAmp(data, time, getter) {
  const duration = Math.max(1, Number(data?.duration || 1));
  const spread = Math.max(duration / Math.max(400, data?.peaks?.length || 400), 0.006);
  const a = getter(getPeakAtTime(data, time - spread));
  const b = getter(getPeakAtTime(data, time));
  const c = getter(getPeakAtTime(data, time + spread));
  return Math.max(0, ((Number(a || 0) * 0.22) + (Number(b || 0) * 0.56) + (Number(c || 0) * 0.22)));
}

function makeWaveformGradient(ctx, height, colour, alphaBoost = 1) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, colour.replace(/([\d.]+)\)$/g, `${Math.min(1, 0.92 * alphaBoost)})`));
  gradient.addColorStop(0.48, colour);
  gradient.addColorStop(1, colour.replace(/([\d.]+)\)$/g, `${Math.min(1, 0.72 * alphaBoost)})`));
  return gradient;
}

function drawWaveformLayer(ctx, data, secondsStart, secondsVisible, width, centreY, height, colour, getter, multiplier = 0.46) {
  const step = width > 520 ? 0.95 : 0.8;
  const top = [];
  const bottom = [];

  for (let x = 0; x <= width + step; x += step) {
    const time = secondsStart + ((x / Math.max(1, width)) * secondsVisible);
    const amp = Math.max(1, getWaveformSmoothingAmp(data, time, getter) * height * multiplier);
    top.push([x, centreY - amp]);
    bottom.push([x, centreY + amp]);
  }

  ctx.save();
  ctx.beginPath();
  top.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else {
      const [px, py] = top[index - 1];
      ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
    }
  });
  bottom.reverse().forEach(([x, y], index) => {
    if (index === 0) ctx.lineTo(x, y);
    else {
      const [px, py] = bottom[index - 1];
      ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
    }
  });
  ctx.closePath();
  ctx.shadowColor = colour;
  ctx.shadowBlur = 7;
  ctx.fillStyle = makeWaveformGradient(ctx, height, colour);
  ctx.fill();
  ctx.restore();
}

function drawHalfWaveformLayer(ctx, data, secondsStart, secondsVisible, width, height, baselineY, direction, colour, getter, multiplier = 0.88) {
  const step = width > 520 ? 0.95 : 0.8;
  const points = [];

  for (let x = 0; x <= width + step; x += step) {
    const time = secondsStart + ((x / Math.max(1, width)) * secondsVisible);
    const amp = Math.max(0, getWaveformSmoothingAmp(data, time, getter) * height * multiplier);
    points.push([x, baselineY + (direction * amp)]);
  }

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, baselineY);
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.lineTo(x, y);
    else {
      const [px, py] = points[index - 1];
      ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
    }
  });
  ctx.lineTo(width, baselineY);
  ctx.closePath();
  ctx.shadowColor = colour;
  ctx.shadowBlur = 5;
  ctx.fillStyle = makeWaveformGradient(ctx, height, colour, 0.92);
  ctx.fill();
  ctx.restore();
}

function drawWaveformPlayhead(ctx, deck, width, height, secondsStart, secondsVisible, { overview = false, isSingleDetail = false } = {}) {
  if (!djDeckState[deck]?.item || !secondsVisible) return;

  const current = getDeckCurrentTime(deck);
  const duration = getDeckDuration(deck);
  const x = overview && duration
    ? (current / Math.max(1, duration)) * width
    : ((current - secondsStart) / secondsVisible) * width;
  if (x < -12 || x > width + 12) return;

  ctx.save();
  ctx.strokeStyle = isSingleDetail ? "rgba(255, 255, 240, 0.96)" : "rgba(255,255,255,0.86)";
  ctx.lineWidth = isSingleDetail ? 2 : 1.35;
  ctx.shadowColor = "rgba(255,255,230,0.72)";
  ctx.shadowBlur = isSingleDetail ? 9 : 4;
  ctx.beginPath();
  ctx.moveTo(Math.round(x) + 0.5, 0);
  ctx.lineTo(Math.round(x) + 0.5, height);
  ctx.stroke();

  if (isSingleDetail) {
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.moveTo(x, height - 1);
    ctx.lineTo(x - 9, height - 18);
    ctx.lineTo(x + 9, height - 18);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function shouldDrawWaveformCanvas(canvas) {
  if (!canvas) return false;
  const rect = canvas.getBoundingClientRect();
  return rect.width > 2 && rect.height > 2 && canvas.offsetParent !== null;
}

function drawWaveformCanvas(canvas, deck, { overview = false } = {}) {
  if (!shouldDrawWaveformCanvas(canvas)) return;

  const { ctx, width, height } = prepareCanvas(canvas);
  const data = getDeckWaveformData(deck);

  ctx.clearRect(0, 0, width, height);

  if (!data?.peaks?.length) {
    return;
  }

  const mode = getWaveformMode(deck);
  const centreY = height / 2;
  const audio = djAudio[deck];
  const duration = Math.max(1, data.duration || getDeckDuration(deck));
  const isSingleDetail = !overview && canvas.classList.contains("djSingleMainWaveCanvas");
  const singleWindow = isSingleDetail ? getSingleDeckWaveformWindow(deck) : null;
  const secondsVisible = overview ? duration : isSingleDetail ? singleWindow.secondsVisible : getDuoWaveformSecondsVisible(deck);
  const secondsStart = overview ? 0 : isSingleDetail ? singleWindow.secondsStart : getMainWaveformWindow(deck).secondsStart;
  const isCombinedTop = !overview && canvas.closest(".djDualWaveformDeckTop");
  const isCombinedBottom = !overview && canvas.closest(".djDualWaveformDeckBottom");
  const isSingleOverview = overview && canvas.classList.contains("djSingleOverviewCanvas");

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, isSingleDetail ? "rgba(0, 5, 18, 0.98)" : "rgba(0, 8, 22, 0.97)");
  bg.addColorStop(0.52, "rgba(0, 2, 11, 0.98)");
  bg.addColorStop(1, isSingleDetail ? "rgba(2, 20, 50, 0.98)" : "rgba(0, 5, 16, 0.98)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // V2Q: beat grid is drawn after the waveform so the lines sit on top.

  const firstColourPeak = getPeakAtTime(data, Math.max(0, secondsStart));
  const colours = getWaveformColours(mode, firstColourPeak, deck);

  if (isCombinedTop || isCombinedBottom) {
    const baselineY = isCombinedTop ? height - 1 : 1;
    const direction = isCombinedTop ? -1 : 1;

    drawHalfWaveformLayer(ctx, data, secondsStart, secondsVisible, width, height, baselineY, direction, colours.low, (peak) => Math.max(peak.low, peak.peak || 0), 0.98);
    drawHalfWaveformLayer(ctx, data, secondsStart, secondsVisible, width, height, baselineY, direction, colours.mid, (peak) => peak.mid, 0.72);
    drawHalfWaveformLayer(ctx, data, secondsStart, secondsVisible, width, height, baselineY, direction, colours.high, (peak) => peak.high, 0.50);

    ctx.strokeStyle = "rgba(255,255,255,0.24)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, baselineY);
    ctx.lineTo(width, baselineY);
    ctx.stroke();
  } else {
    drawWaveformLayer(ctx, data, secondsStart, secondsVisible, width, centreY, height, colours.low, (peak) => Math.max(peak.low, peak.peak || 0), overview ? 0.46 : 0.52);
    drawWaveformLayer(ctx, data, secondsStart, secondsVisible, width, centreY, height, colours.mid, (peak) => peak.mid, overview ? 0.34 : 0.38);
    drawWaveformLayer(ctx, data, secondsStart, secondsVisible, width, centreY, height, colours.high, (peak) => peak.high, overview ? 0.22 : 0.25);

    if (!overview) {
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centreY);
      ctx.lineTo(width, centreY);
      ctx.stroke();
    }
  }

  if (!overview) drawBeatGrid(ctx, deck, width, height, secondsStart, secondsVisible);
  drawCueAndMemoryMarkers(ctx, deck, width, height, secondsStart, secondsVisible, { overview, isSingleDetail });
  drawWaveformPlayhead(ctx, deck, width, height, secondsStart, secondsVisible, { overview, isSingleDetail });

if (overview && getDeckDuration(deck)) {
  const playX = (getDeckCurrentTime(deck) / Math.max(1, getDeckDuration(deck))) * width;

    if (playX > 1) {
      ctx.save();
      ctx.fillStyle = isSingleOverview ? "rgba(5, 16, 36, 0.62)" : "rgba(3, 8, 18, 0.58)";
      ctx.fillRect(0, 0, Math.round(playX), height);
      ctx.fillStyle = isSingleOverview ? "rgba(123, 208, 255, 0.12)" : "rgba(210, 220, 232, 0.18)";
      ctx.fillRect(0, 0, Math.round(playX), height);
      ctx.restore();
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.fillRect(Math.round(playX), 0, 1.5, height);
  }
}

function drawCueAndMemoryMarkers(ctx, deck, width, height, secondsStart, secondsVisible, { overview = false, isSingleDetail = false } = {}) {
  if (overview || !secondsVisible) return;

  const drawMarker = (time, colour, wide = false) => {
    if (!Number.isFinite(time)) return;
    const x = ((time - secondsStart) / secondsVisible) * width;
    if (x < -10 || x > width + 10) return;

    ctx.save();
    ctx.fillStyle = colour;
    ctx.fillRect(Math.round(x), 0, wide ? 3 : 2, height);
    ctx.beginPath();
    ctx.moveTo(x, isSingleDetail ? height - 13 : height - 8);
    ctx.lineTo(x - 5, height);
    ctx.lineTo(x + 5, height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const loop = djMixerState.loopRegionByDeck?.[deck];
  if (loop?.start >= 0 && loop?.end > loop.start) {
    const startX = ((Number(loop.start) - secondsStart) / secondsVisible) * width;
    const endX = ((Number(loop.end) - secondsStart) / secondsVisible) * width;
    const left = Math.max(0, Math.min(width, Math.min(startX, endX)));
    const right = Math.max(0, Math.min(width, Math.max(startX, endX)));
    if (right > 0 && left < width) {
      ctx.save();
      ctx.fillStyle = "rgba(243, 180, 48, 0.16)";
      ctx.fillRect(left, 0, Math.max(2, right - left), height);
      ctx.strokeStyle = "rgba(243, 180, 48, 0.78)";
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(left, 1, Math.max(2, right - left), height - 2);
      ctx.restore();
    }
  }

  drawMarker(Number(getDeckGrid(deck)?.downbeat || 0), "rgba(255, 72, 72, 0.98)", true);
  drawMarker(Number(djMixerState.cuePointByDeck?.[deck] || 0), "rgba(242, 160, 7, 0.98)");
  Object.entries(djMixerState.hotCuesByDeck?.[deck] || {}).forEach(([key, time]) => drawMarker(Number(time), key < "E" ? "rgba(255, 123, 84, 0.92)" : "rgba(180, 126, 255, 0.90)"));
  (djMixerState.memoryPointsByDeck?.[deck] || []).forEach((time) => drawMarker(Number(time), "rgba(123, 208, 255, 0.78)"));
}

function shouldSkipInactiveSingleDeckCanvas(canvas, deck) {
  if (!document.body.classList.contains("djSingleDeckMode")) return false;
  if (!canvas.closest("[data-dj-single-deck]")) return false;
  return deck !== getCurrentSingleDeck();
}

function drawWaveformCanvasesOnly() {
  waveformOverviewCanvases.forEach((canvas) => {
    const deck = getWaveformCanvasDeck(canvas, "djWaveformOverview");
    if (!shouldSkipInactiveSingleDeckCanvas(canvas, deck) && shouldDrawWaveformCanvas(canvas)) {
      drawWaveformCanvas(canvas, deck, { overview: true });
    }
  });
  waveformMainCanvases.forEach((canvas) => {
    const deck = getWaveformCanvasDeck(canvas, "djWaveformMain");
    if (!shouldSkipInactiveSingleDeckCanvas(canvas, deck) && shouldDrawWaveformCanvas(canvas)) {
      drawWaveformCanvas(canvas, deck, { overview: false });
    }
  });
}

function drawLiveWaveformCanvasesOnly() {
  waveformMainCanvases.forEach((canvas) => {
    const deck = getWaveformCanvasDeck(canvas, "djWaveformMain");
    const enginePlaying = isDjEngineV2Ready() && window.BRMediaDjEngine.isPlaying(deck);
    const audio = djAudio[deck];
    const nativePlaying = Boolean(audio && !audio.paused && !audio.ended);

    if (!enginePlaying && !nativePlaying) return;
    if (shouldSkipInactiveSingleDeckCanvas(canvas, deck)) return;
    if (!shouldDrawWaveformCanvas(canvas)) return;

    drawWaveformCanvas(canvas, deck, { overview: false });
  });
}

function drawAllWaveforms() {
  updateWaveformControls();
  drawWaveformCanvasesOnly();
  updateDeckTimeDisplays();
}

function startWaveformAnimation() {
  if (waveformAnimationFrame) return;

const draw = (now = 0) => {
  const anyPlaying = Object.values(djAudio).some((audio) => audio && !audio.paused && !audio.ended);
  const frameInterval = 1000 / Math.max(8, DJ_WAVEFORM_TARGET_FPS_VISIBLE);

    if (!document.hidden && now - lastWaveformFrameAt >= frameInterval) {
      lastWaveformFrameAt = now;
      maintainSyncLock();
      drawLiveWaveformCanvasesOnly();
      updateDeckTimeDisplays();
      updateSingleDeckLiveMeta();
    }

    waveformAnimationFrame = anyPlaying ? window.requestAnimationFrame(draw) : 0;
  };

  waveformAnimationFrame = window.requestAnimationFrame(draw);
}

function setWaveformModeForDeck(deck, mode) {
  const nextMode = ["3band", "rgb", "blue"].includes(mode) ? mode : "3band";
  djMixerState.waveformModeByDeck[deck] = nextMode;
  updateWaveformControls();
  drawAllWaveforms();
}

function cycleWaveformThemeForDeck(deck = getCurrentSingleDeck()) {
  const activeDeck = deck === "d2" ? "d2" : "d1";
  const currentIndex = Number(djMixerState.waveformThemeIndexByDeck?.[activeDeck] || 0);
  djMixerState.waveformThemeIndexByDeck[activeDeck] = (currentIndex + 1) % DJ_WAVEFORM_THEMES.length;
  djMixerState.waveformModeByDeck[activeDeck] = "3band";
  writeWaveformThemeByDeck();
  updateWaveformControls();
  drawAllWaveforms();
}

function changeWaveformZoom(deck, direction) {
  const current = Number(djMixerState.waveformZoomByDeck?.[deck] || 1);
  const next = direction === "in" ? current + 0.25 : current - 0.25;
  djMixerState.waveformZoomByDeck[deck] = Math.max(0.5, Math.min(8, next));
  updateWaveformControls();
  drawAllWaveforms();
}

function toggleQuantizeForDeck(deck) {
  djMixerState.quantizeByDeck[deck] = !djMixerState.quantizeByDeck[deck];
  saveTrackGridForDeck(deck);
  updateWaveformControls();
  updateBpmUi();
  updateDeckPrepUi();
  drawAllWaveforms();
}

function handleGridAction(action) {
  const deck = djMixerState.bpmEditDeck || "d1";
  const audio = djAudio[deck];
  const grid = getDeckGrid(deck);
  const interval = getBeatIntervalForDeck(deck);
  const fineNudge = interval / 128;
  const coarseNudge = interval / 8;
  const currentBpm = Number(djMixerState.bpmByDeck?.[deck] || grid.bpm || 170);

  if (grid.locked && action !== "lock") {
    updateDeckPrepUi();
    return;
  }

  const saveUndo = !["undo", "redo", "tap", "lock"].includes(action);
  if (saveUndo) pushDeckGridUndo(deck);

  if (action === "set-downbeat") {
    const current = clampTimeForDeck(deck, Number(audio?.currentTime || 0));
    grid.downbeat = current;
    grid.firstBeat = current;
    grid.gridOffset = current;
    grid.userAdjusted = true;
    setDeckCuePoint(deck, current, { movePlayhead: true, snap: false });
  } else if (action === "snap-cue") {
    setDeckCuePoint(deck, Number(audio?.currentTime || 0), { movePlayhead: true, snap: true });
  } else if (action === "confirm-grid") {
    markDeckGridReady(deck, { reason: "manual", save: false });
  } else if (action === "use-suggested") {
    const analysis = getTrackAnalysisForItem(djDeckState[deck]?.item);
    const suggestedBpm = Number(grid.suggestedBpm || analysis?.bpm || 0);
    const suggestedDownbeat = Number(grid.suggestedDownbeat ?? analysis?.downbeat ?? NaN);
    if (Number.isFinite(suggestedBpm) && suggestedBpm >= 40 && suggestedBpm <= 240) setGridBpmKeepingPlayhead(deck, suggestedBpm, { markAdjusted: true, updateSource: true });
    if (Number.isFinite(suggestedDownbeat)) {
      grid.downbeat = clampTimeForDeck(deck, suggestedDownbeat);
      grid.firstBeat = grid.downbeat;
      grid.gridOffset = grid.downbeat;
      djMixerState.cuePointByDeck[deck] = grid.downbeat;
    }
    markDeckGridReady(deck, { reason: "analysis", save: false });
  } else if (action === "nudge-left") {
    grid.downbeat = Number(grid.downbeat || 0) - fineNudge;
    grid.firstBeat = grid.downbeat;
    grid.gridOffset = grid.downbeat;
    grid.userAdjusted = true;
  } else if (action === "nudge-right") {
    grid.downbeat = Number(grid.downbeat || 0) + fineNudge;
    grid.firstBeat = grid.downbeat;
    grid.gridOffset = grid.downbeat;
    grid.userAdjusted = true;
  } else if (action === "nudge-left-coarse") {
    grid.downbeat = Number(grid.downbeat || 0) - coarseNudge;
    grid.firstBeat = grid.downbeat;
    grid.gridOffset = grid.downbeat;
    grid.userAdjusted = true;
  } else if (action === "nudge-right-coarse") {
    grid.downbeat = Number(grid.downbeat || 0) + coarseNudge;
    grid.firstBeat = grid.downbeat;
    grid.gridOffset = grid.downbeat;
    grid.userAdjusted = true;
  } else if (action === "bpm-double") {
    setGridBpmKeepingPlayhead(deck, currentBpm * 2);
  } else if (action === "bpm-halve") {
    setGridBpmKeepingPlayhead(deck, currentBpm / 2);
  } else if (action === "stretch-left") {
    setGridBpmKeepingPlayhead(deck, currentBpm - 0.05);
  } else if (action === "stretch-right") {
    setGridBpmKeepingPlayhead(deck, currentBpm + 0.05);
  } else if (action === "tap") {
    const now = performance.now();
    const lastTap = Number(grid.lastTap || 0);
    if (lastTap && now - lastTap > 260 && now - lastTap < 1800) {
      pushDeckGridUndo(deck);
      const tappedBpm = 60000 / (now - lastTap);
      setGridBpmKeepingPlayhead(deck, tappedBpm);
    }
    grid.lastTap = now;
  } else if (action === "undo") {
    const snapshot = grid.undoStack.pop();
    if (snapshot) {
      grid.redoStack.push(makeSerializableGrid(deck));
      restoreDeckGridSnapshot(deck, snapshot);
    }
  } else if (action === "redo") {
    const snapshot = grid.redoStack.pop();
    if (snapshot) {
      grid.undoStack.push(makeSerializableGrid(deck));
      restoreDeckGridSnapshot(deck, snapshot);
    }
  } else if (action === "lock") {
    grid.locked = !grid.locked;
  }

  if (["set-downbeat", "snap-cue", "confirm-grid", "use-suggested", "nudge-left", "nudge-right", "nudge-left-coarse", "nudge-right-coarse", "bpm-double", "bpm-halve", "stretch-left", "stretch-right", "tap"].includes(action)) {
    markDeckGridReady(deck, { reason: action === "use-suggested" ? "analysis" : "manual", save: false });
  }

  grid.bpm = Number(djMixerState.bpmByDeck?.[deck] || grid.bpm || 170);
  saveTrackGridForDeck(deck);
  applyDeckSync(deck, { align: false });
  updateBpmUi();
  updateDeckPrepUi();
  drawAllWaveforms();
}

function setDeckText(target, item) {
  const isDeckOne = target === "d1";
  const title = item?.title || "Load Track";
  if (deckTitles[target]) deckTitles[target].textContent = title;
  if (deckArtists[target]) deckArtists[target].textContent = item ? getDeckTimeLabel(target) : "";
  if (deckTitles[isDeckOne ? "mainD1" : "mainD2"]) {
    deckTitles[isDeckOne ? "mainD1" : "mainD2"].textContent = title;
  }

  document.querySelector(`[data-dj-preview="${target}"]`)?.classList.toggle("is-loaded", Boolean(item));
  document.querySelector(`[data-dj-deck-card="${target}"]`)?.classList.toggle("is-loaded", Boolean(item));
  updateDeckPreviewStates();
  updateDeckTimeDisplays();
  updateDeckPrepUi();
}

function getDeckStreamUrl(item = {}) {
  const direct = item?.streamUrl || item?.audioUrl || item?.playUrl || item?.finalStreamUrl || "";
  if (direct) return String(direct);

  const locator = String(item?.locator || item?.path || "").trim();
  const id = String(item?.id || "").trim();

  // Emergency DJ deck stream path: prefer the real local file locator when we have it.
  // This bypasses stale/mismatched library ids and makes the deck stream the exact file
  // shown in Collection. The server still validates the path against allowed library roots.
  if (locator && !locator.toLowerCase().startsWith("gdrive://")) {
    return `/stream/local?path=${encodeURIComponent(locator)}`;
  }

  if (!id) return "";

  const source = String(item?.source || item?.sourceType || item?.cloudProvider || item?.provider || "").toLowerCase();
  if (source.includes("google") || source.includes("gdrive") || locator.toLowerCase().startsWith("gdrive://") || id.startsWith("gdrive_")) {
    return `/cloud/google/stream/${encodeURIComponent(id)}`;
  }

  return `/stream/${encodeURIComponent(id)}`;
}

function getDeckLabel(deck) {
  return deck === "d2" ? "Deck 2" : "Deck 1";
}

function normaliseDeckSourceUrl(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw, window.location.href).href;
  } catch {
    return raw;
  }
}

function getDeckAudioErrorLabel(audio) {
  const code = Number(audio?.error?.code || 0);
  if (code === 1) return "aborted";
  if (code === 2) return "network error";
  if (code === 3) return "decode error";
  if (code === 4) return "stream not supported or file missing";
  return "unknown error";
}

function setDeckEngineStatus(deck, message) {
  if (!djLibraryStatus) return;
  djLibraryStatus.textContent = `${getDeckLabel(deck)}: ${message}`;
}

function bindDeckAudioElementEvents(deck, audio) {
  if (!audio || audio.dataset.djBound === "1") return audio;
  audio.dataset.djBound = "1";

  audio.addEventListener("loadstart", () => {
    if (djDeckState[deck]?.item) setDeckEngineStatus(deck, "stream loading…");
  });

  audio.addEventListener("loadedmetadata", () => {
    if (djDeckState[deck]?.item) setDeckEngineStatus(deck, "metadata ready");
    refreshLoadedDeckUi(deck);
    drawAllWaveforms();
  });

  audio.addEventListener("canplay", () => {
    if (djDeckState[deck]?.item) setDeckEngineStatus(deck, "ready — press Play");
    refreshLoadedDeckUi(deck);
  });

  audio.addEventListener("error", () => {
    if (djDeckState[deck]?.item) {
      const detail = getDeckAudioErrorLabel(audio);
      console.warn("Deck audio source reported an error", deck, audio.error);
      setDeckEngineStatus(deck, `play failed — ${detail}`);
      refreshLoadedDeckUi(deck);
    }
  });

  audio.addEventListener("ended", () => {
    djDeckState[deck].playing = false;
    rememberBackgroundPlaybackIntent("ended");
    updateMediaSession(deck);
    updateTransportButtons();
    updateDjCollectionMiniPlayer();
  });

  audio.addEventListener("play", () => {
    djDeckState[deck].playing = true;
    rememberBackgroundPlaybackIntent("audio-play");
    markTrackPlayed(deck);
    applyDeckVolumes();
    updateMediaSession(deck);
    updateTransportButtons();
    updateDjCollectionMiniPlayer();
    startMeterAnimation();
    startWaveformAnimation();
  });

  audio.addEventListener("pause", () => {
    djDeckState[deck].playing = false;
    rememberBackgroundPlaybackIntent("audio-pause");
    applyDeckVolumes();
    updateMediaSession(deck);
    updateTransportButtons();
    updateDjCollectionMiniPlayer();
  });

  audio.addEventListener("timeupdate", () => {
    maintainDeckLoop(deck);
    maintainSyncLock(deck);
    updateDeckTimeDisplays();
    updateDeckPreviewStates();
    updateSingleDeckLiveMeta();
    updateDjCollectionMiniPlayer();
    updateMediaSession(deck);
  });

  audio.addEventListener("seeked", () => {
    updateDeckTimeDisplays();
    updateDjCollectionMiniPlayer();
    updateMediaSession(deck);
    drawAllWaveforms();
  });

  return audio;
}

function disconnectDeckAudioGraph(deck) {
  const node = djAudioGraph.nodes?.[deck];
  if (!node) return;

  Object.values(node).forEach((part) => {
    try {
      if (part && typeof part.disconnect === "function") part.disconnect();
    } catch {}
  });

  delete djAudioGraph.nodes[deck];
}

function resetDeckAudioElementForLoad(deck) {
  const audio = djAudio[deck];
  if (!audio) return null;

  // Keep one stable native <audio> element per deck. Cloning/replacing it was
  // splitting deck state from the real playback element on mobile.
  if (!isDjRecordingActive()) djMixerState.forceWebAudioGraph = false;

  try {
    audio.pause();
    audio.removeAttribute("src");
    audio.load?.();
  } catch {}

  return bindDeckAudioElementEvents(deck, audio);
}

function setDeckPreviewWaveform(deck, item = djDeckState[deck]?.item, label = "instant preview") {
  if (!deck || !item?.id) return false;
  const existing = djMixerState.waveformPeaksByDeck?.[deck];
  if (existing?.peaks?.length && String(djDeckState[deck]?.item?.id || "") === String(item.id || "")) return true;
  djMixerState.waveformPeaksByDeck[deck] = makeFallbackWaveformPeaks(deck);
  djMixerState.waveformAnalysisState[deck] = "fallback";
  setWaveformStatus(deck, `Preview waveform ready • ${label}`);
  drawAllWaveforms();
  return true;
}

function prepareDeckForUserPlayback(deck) {
  const audio = djAudio[deck];
  const item = djDeckState[deck]?.item;
  if (!audio || !item?.id) return null;
  if (!ensureDeckAudioSource(deck)) return null;

  primeDeckForBackgroundPlayback(deck);
  audio.muted = false;
  audio.preload = "auto";

  const useGraph = shouldUseWebAudioGraphForDeck(deck);
  const graph = useGraph ? ensureDeckAudioGraph(deck) : null;
  const graphReady = graph ? resumeDjAudioContextIfNeeded() : Promise.resolve();

  applyDeckSync(deck, { align: false });
  applyDeckVolumes();
  return { audio, graph, graphReady };
}

function resetDeckCueStateForLoadedTrack(deck) {
  djMixerState.cuePointByDeck[deck] = 0;
  djMixerState.lastCueSnapInfoByDeck[deck] = null;
  djMixerState.hotCuesByDeck[deck] = {};
  djMixerState.memoryPointsByDeck[deck] = [];
  djMixerState.memoryIndexByDeck[deck] = 0;
}

function ensureDeckAudioSource(deck) {
  const audio = djAudio[deck];
  const item = djDeckState[deck]?.item;
  if (!audio || !item?.id) return false;

  const streamUrl = djMixerState.streamUrlByDeck?.[deck] || getDeckStreamUrl(item);
  if (!streamUrl) return false;

  const attrSrc = audio.getAttribute?.("src") || "";
  const expectedSrc = normaliseDeckSourceUrl(streamUrl);
  const elementSrc = normaliseDeckSourceUrl(audio.currentSrc || audio.src || "");
  const attrFullSrc = normaliseDeckSourceUrl(attrSrc);
  const hasUsableSource = Boolean(elementSrc || attrFullSrc);
  const hasExpectedSource = Boolean(expectedSrc && (elementSrc === expectedSrc || attrFullSrc === expectedSrc));

  if (!hasUsableSource || !hasExpectedSource) {
    try {
      audio.pause();
      audio.muted = false;
      audio.preload = "auto";
      audio.setAttribute("src", streamUrl);
      audio.src = streamUrl;
      audio.load();
      setDeckEngineStatus(deck, "stream loading…");
    } catch (err) {
      console.warn("Deck source restore failed", err);
      setDeckEngineStatus(deck, `source failed — ${String(err?.message || err || "unknown")}`);
      return false;
    }
  }

  return true;
}

function refreshLoadedDeckUi(deck) {
  const item = djDeckState[deck]?.item;
  if (!item) return;
  setDeckText(deck, item);
  renderSingleDeckMeta(deck);
  updateDeckPreviewStates();
  updateDeckTimeDisplays();
  updateTransportButtons();
  updateDjCollectionMiniPlayer();
}

function isDeckPlaying(deck) {
  if (isDjEngineV2Ready()) return Boolean(window.BRMediaDjEngine.isPlaying(deck) || djDeckState[deck]?.playing);
  const audio = djAudio[deck];
  return Boolean(djDeckState[deck]?.playing || (audio && !audio.paused && !audio.ended));
}

function getOppositeDeck(deck) {
  return deck === "d2" ? "d1" : "d2";
}

function getSafeLibraryTarget(target) {
  const requested = target === "d2" ? "d2" : "d1";
  if (!isDeckPlaying(requested)) return requested;

  const otherDeck = getOppositeDeck(requested);
  return isDeckPlaying(otherDeck) ? requested : otherDeck;
}

function getItemBpm(item) {
  const analysis = getTrackAnalysisForItem(item);
  const prep = getTrackPrepForItem(item);
  const bpm = Number(
    item?.bpm ||
    item?.BPM ||
    item?.tempo ||
    item?.detectedBpm ||
    item?.analysis?.bpm ||
    analysis?.bpm ||
    prep?.detectedBpm ||
    prep?.bpm ||
    0
  );

  return bpm >= 60 && bpm <= 240 ? bpm : 0;
}

function getItemKeyLabel(item, prep = {}) {
  const analysis = getTrackAnalysisForItem(item);
  const advanced = item?.advancedTags || item?.tags || item?.metadata || {};

  const raw =
    item?.camelotKey || item?.camelot || item?.camelot_key || item?.keyCamelot ||
    item?.initialKey || item?.initialkey || item?.initial_key || item?.initial_key_text ||
    item?.key || item?.musicalKey || item?.musicKey || item?.tonality ||
    advanced?.camelotKey || advanced?.camelot || advanced?.initialKey || advanced?.initialkey || advanced?.initial_key || advanced?.key || advanced?.musicalKey ||
    prep?.key || prep?.camelotKey || prep?.initialKey || prep?.initialkey ||
    analysis?.key || analysis?.camelotKey || analysis?.initialKey || analysis?.initialkey ||
    "";

  const clean = String(raw || "").trim();
  return clean || "—";
}

function getPlayingDeckForMiniPlayer() {
  const playing = ["d1", "d2"].filter(isDeckPlaying);
  if (playing.includes(djMixerState.masterDeck)) return djMixerState.masterDeck;
  if (playing[0]) return playing[0];
  if (djDeckState.d1.item) return "d1";
  if (djDeckState.d2.item) return "d2";
  return "";
}

function updateDjCollectionMiniPlayer() {
  const deck = getPlayingDeckForMiniPlayer();
  const item = deck ? djDeckState[deck]?.item : null;
  const audio = deck ? djAudio[deck] : null;
  const prep = getTrackPrepStatusForItem(item) || {};
  const duration = Math.max(0, Number(audio?.duration || item?.duration || 0));
  const current = Math.max(0, Number(audio?.currentTime || 0));
  const percentPlayed = duration ? Math.max(0, Math.min(100, (current / duration) * 100)) : 0;

  if (djCollectionMiniDeck) {
    djCollectionMiniDeck.textContent = deck ? (deck === "d2" ? "D2" : "D1") : "—";
    djCollectionMiniDeck.classList.toggle("is-d1", deck === "d1");
    djCollectionMiniDeck.classList.toggle("is-d2", deck === "d2");
    djCollectionMiniDeck.classList.toggle("is-master", Boolean(deck && deck === djMixerState.masterDeck));
  }

  if (djCollectionMiniTitle) djCollectionMiniTitle.textContent = item?.title || "No deck playing";
  if (djCollectionMiniArtist) {
    djCollectionMiniArtist.textContent = item
      ? `${item.artist || item.albumArtist || "Unknown artist"} • ${formatDuration(current)} / ${formatDuration(duration)}`
      : "Load Deck 1 or Deck 2 from the Collection.";
  }
  if (djCollectionMiniProgress) djCollectionMiniProgress.style.setProperty("--dj-mini-progress", `${percentPlayed}%`);
  if (djCollectionMiniStats) {
    const bpmLabel = Number(prep.detectedBpm || prep.bpm || getItemBpm(item) || 0);
    djCollectionMiniStats.textContent = item
      ? `BPM ${bpmLabel ? bpmLabel.toFixed(1) : "—"} • Key ${getItemKeyLabel(item, prep)}${deck === djMixerState.masterDeck ? " • MASTER" : ""}`
      : "BPM — • Key —";
  }

  if (djCollectionMiniToggle) {
    const isPlaying = deck ? isDeckPlaying(deck) : false;
    djCollectionMiniToggle.disabled = !deck || !item;
    djCollectionMiniToggle.innerHTML = `<i class="fa-solid fa-${isPlaying ? "pause" : "play"}"></i>`;
  }
}

function getRecordingElapsedSeconds() {
  if (djMixerState.recordState !== "recording" || !djMixerState.recordStartedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - Number(djMixerState.recordStartedAt || Date.now())) / 1000));
}

function formatRecordingTimestamp(seconds = 0) {
  const total = Math.max(0, Math.floor(Number(seconds || 0)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${secs}` : `${minutes}:${secs}`;
}

function getSessionTrackLog(id = "") {
  return djMixerState.sessionTrackLog.find((entry) => String(entry.id) === String(id));
}

function rememberSessionTrack(item, { deck = "", source = "load" } = {}) {
  const id = String(item?.id || "");
  if (!id) return;
  if (!djMixerState.sessionTrackIds.includes(id)) djMixerState.sessionTrackIds.push(id);

  let log = getSessionTrackLog(id);
  if (!log) {
    log = {
      id,
      deck,
      source,
      title: item.title || "Unknown title",
      artist: item.artist || item.albumArtist || "Unknown artist",
      loadedAtSeconds: getRecordingElapsedSeconds(),
      startedAtSeconds: null,
    };
    djMixerState.sessionTrackLog.push(log);
  } else if (deck) {
    log.deck = deck;
  }

  updatePerformanceSetStrip();
}

function getActiveLinkedSetForPerformance() {
  return getLinkedDjSetForCurrentSetup();
}

function getActiveSetItems() {
  const set = getActiveLinkedSetForPerformance();
  return (Array.isArray(set?.trackIds) ? set.trackIds : [])
    .map((trackId) => getLibraryItemById(trackId))
    .filter(Boolean);
}

function getNextSetTrackIndex() {
  const items = getActiveSetItems();
  if (!items.length) return -1;
  const played = new Set([...(djMixerState.playedTrackIds || new Set()), ...(djMixerState.sessionTrackIds || [])].map(String));
  const firstUnplayed = items.findIndex((item) => !played.has(String(item.id || "")));
  if (firstUnplayed >= 0) return firstUnplayed;
  return Math.max(0, Math.min(items.length - 1, Number(djMixerState.activeSetIndex || 0)));
}

function getNextSetTrack() {
  const items = getActiveSetItems();
  const index = getNextSetTrackIndex();
  return index >= 0 ? { item: items[index], index, total: items.length } : null;
}

function updatePerformanceSetStrip() {
  const set = getActiveLinkedSetForPerformance();
  const items = getActiveSetItems();
  const next = getNextSetTrack();
  const playedCount = items.filter((item) => djMixerState.sessionTrackIds.includes(String(item.id || "")) || djMixerState.playedTrackIds.has(String(item.id || ""))).length;

  if (perfSetTitle) perfSetTitle.textContent = set?.name || "No active DJ Set";
  if (perfSetProgress) perfSetProgress.textContent = items.length ? `${playedCount}/${items.length} loaded · ${formatPlanRuntime(items.reduce((total, item) => total + (Number(item.duration || 0) || 0), 0))}` : "Build a DJ Set before launch";
  if (perfNextTrack) perfNextTrack.textContent = next?.item?.title || "Add tracks from Set Builder";
  if (perfNextMeta) {
    perfNextMeta.textContent = next
      ? `${next.index + 1}/${next.total} · ${next.item.artist || "Unknown artist"} · ${formatDuration(next.item.duration || 0)} · BPM ${getItemBpm(next.item) || "—"}`
      : "Ready for running-order handoff";
  }
}

function loadNextSetTrack(deck = "d1") {
  const next = getNextSetTrack();
  if (!next?.item) {
    if (djLibraryStatus) djLibraryStatus.textContent = "No next DJ Set track found. Add tracks from Collection or Set Builder.";
    return false;
  }

  const loaded = loadDeck(deck === "d2" ? "d2" : "d1", next.item);
  if (loaded) {
    djMixerState.activeSetIndex = next.index;
    updatePerformanceSetStrip();
  }
  return loaded;
}

function markCurrentSetTrackPlayed() {
  const deck = getNowPlayingDeck();
  const item = djDeckState[deck]?.item || getNextSetTrack()?.item;
  if (!item?.id) return;
  markTrackPlayed(deck, item);
  const items = getActiveSetItems();
  const index = items.findIndex((track) => String(track.id) === String(item.id));
  if (index >= 0) djMixerState.activeSetIndex = Math.min(items.length - 1, index + 1);
  updatePerformanceSetStrip();
}

function queueDeckWaveformAnalysis(target) {
  window.requestAnimationFrame(() => {
    try {
      const item = djDeckState[target]?.item;
      const itemId = getTrackWaveformId(item);
      if (!itemId) return;

      // Always paint an immediate local preview first. Server peaks can replace it later,
      // but the deck should never look empty after a successful load.
      setDeckPreviewWaveform(target, item, "loading peaks");

      const remembered = getRememberedWaveformForItem(item);

      if (remembered) {
        applyWaveformToDeck(target, item, remembered, { status: "ready", label: "instant cache" });
        return;
      }

      if (itemId && djMixerState.waveformCachedIds.has(itemId)) {
        setWaveformStatus(target, "Preview ready — loading cached waveform from server…");
        void analyseDeckWaveform(target);
        return;
      }

      setWaveformStatus(target, "Preview ready — analysing peaks…");
      void analyseDeckWaveform(target);
    } catch (err) {
      console.warn("Deck waveform prep failed", err);
      setDeckPreviewWaveform(target, djDeckState[target]?.item, "retry fallback");
      setWaveformStatus(target, "Track loaded. Preview waveform is active; server peaks will retry.");
    }
  });
}

function loadDeck(target, item) {
  const deck = target === "d2" ? "d2" : "d1";
  const resolvedItem = typeof item === "string" ? getLibraryItemById(item) : item;
  if (!resolvedItem?.id) {
    if (djLibraryStatus) djLibraryStatus.textContent = "Could not load that track — BRMedia could not find its library id.";
    return false;
  }

  if (isDeckPlaying(deck)) {
    if (djLibraryStatus) djLibraryStatus.textContent = `${deck === "d1" ? "Deck 1" : "Deck 2"} is playing — pause it before loading another track.`;
    renderDjLibrary();
    return false;
  }

  const streamUrl = getDeckStreamUrl(resolvedItem);
  if (!streamUrl) {
    if (djLibraryStatus) djLibraryStatus.textContent = "Could not build a stream URL for that track.";
    return false;
  }

  if (!isDjEngineV2Ready()) {
    if (djLibraryStatus) djLibraryStatus.textContent = "DJ Engine V2 did not load. Check engine-v2.js is included before app.js.";
    return false;
  }

  djDeckState[deck].item = resolvedItem;
  djDeckState[deck].playing = false;
  djMixerState.streamUrlByDeck[deck] = streamUrl;
  djMixerState.loadedTrackIdByDeck[deck] = String(resolvedItem.id || "");
  djMixerState.syncByDeck[deck] = false;
  djMixerState.syncModeByDeck[deck] = "beat";
  djMixerState.lastSyncLockAtByDeck[deck] = 0;
  resetDeckCueStateForLoadedTrack(deck);

  try { applyTrackGridToDeck(deck, resolvedItem); } catch (err) { console.warn("Deck grid restore failed during load", err); }
  try { applyTrackCueDataToDeck(deck, resolvedItem); } catch (err) { console.warn("Deck cue restore failed during load", err); }

  const grid = getDeckGrid(deck);
  const gridBpm = Number(grid?.sourceBpm || grid?.bpm || 0);
  const itemBpm = getItemBpm(resolvedItem) || gridBpm || 170;
  djMixerState.sourceBpmByDeck[deck] = gridBpm || itemBpm || 170;
  djMixerState.bpmByDeck[deck] = gridBpm || itemBpm || 170;

  setDeckText(deck, resolvedItem);
  setDeckPreviewWaveform(deck, resolvedItem, "track loaded");
  setDeckEngineStatus(deck, "fetching + decoding audio…");

  window.BRMediaDjEngine.loadDeck(deck, { item: resolvedItem, url: streamUrl })
    .then((engineDeck) => {
      if (engineDeck?.duration) resolvedItem.duration = engineDeck.duration;
      setDeckEngineStatus(deck, "ready — press Play");
      refreshLoadedDeckUi(deck);
      drawAllWaveforms();
    })
    .catch((err) => {
      console.warn("DJ Engine V2 deck load failed", deck, err);
      setDeckEngineStatus(deck, `decode failed — ${String(err?.message || err || "unknown")}`);
    });

  try { rememberSessionTrack(resolvedItem, { deck, source: "load" }); } catch (err) { console.warn("Session track remember failed", err); }
  try {
    const activeSetItems = getActiveSetItems();
    const setIndex = activeSetItems.findIndex((track) => String(track.id || "") === String(resolvedItem.id || ""));
    if (setIndex >= 0) djMixerState.activeSetIndex = setIndex;
  } catch (err) { console.warn("Active set sync failed during deck load", err); }

  safeLaunchStep("applyDeckSync", () => applyDeckSync(deck, { align: false }));
  safeLaunchStep("updateBpmUi", updateBpmUi);
  safeLaunchStep("setPerformanceMode", () => setPerformanceMode("mixer"));
  safeLaunchStep("queueDeckWaveformAnalysis", () => queueDeckWaveformAnalysis(deck));
  safeLaunchStep("refreshTrackPrepForLoadedDeck", () => refreshTrackPrepForLoadedDeck(deck));
  safeLaunchStep("refreshLoadedDeckUi", () => refreshLoadedDeckUi(deck));

  return true;
}

function resetCrossfader() {
  setCrossfaderPosition(0.5);
}

function setCrossfaderPosition(value) {
  const nextValue = Math.max(0, Math.min(1, Number(value) || 0));
  djMixerState.crossfader = nextValue;

  if (crossfaderThumb) crossfaderThumb.style.left = `${Math.round(nextValue * 100)}%`;

  const isOffCentre = Math.abs(nextValue - 0.5) > 0.035;
  crossfaderReset?.classList.toggle("is-off-centre", isOffCentre);
  applyDeckVolumes();
}

function getNextEqValue(current) {
  const index = EQ_STEPS.indexOf(String(current || "100"));
  return EQ_STEPS[(index + 1) % EQ_STEPS.length];
}

function clampEqPercent(value, fallback = 100) {
  const numeric = Number(value);
  return Math.max(0, Math.min(150, Number.isFinite(numeric) ? numeric : fallback));
}

function getNextEqKillValue(current) {
  const numeric = clampEqPercent(current, 100);
  if (numeric > 100) return "100";
  if (numeric > 75) return "75";
  if (numeric > 50) return "50";
  if (numeric > 25) return "25";
  if (numeric > 0) return "0";
  return "0";
}

function getKillStepFromKnobValue(value) {
  return String(Math.round(clampEqPercent(value, 100)));
}

function updateEqKillButton(button, value, { commitKnobFromKill = false } = {}) {
  const isEqBand = Boolean(button.dataset.djEqKill);
  const isKnobMode = djMixerState.eqMode !== "kill";
  const mixerKnob = button.dataset.djMixerKnob || "";
  const numericValue = isEqBand
    ? clampEqPercent(value, 100)
    : Math.max(0, Math.min(100, Number(value ?? 50)));
  const cleanValue = String(Math.round(numericValue));
  const rotationBase = isEqBand ? Math.max(50, Math.min(150, numericValue)) : numericValue;
  const neutralValue = isEqBand ? 100 : 50;

  button.dataset.djEqValue = cleanValue;
  if (isEqBand) button.dataset.djEqPercent = cleanValue;
  button.style.setProperty("--dj-knob-rotation", `${Math.round((rotationBase - neutralValue) * 2.2)}deg`);
  button.classList.toggle("is-killed", !isKnobMode && isEqBand && numericValue <= 0);
  button.classList.toggle("is-cut", !isKnobMode && isEqBand && numericValue > 0 && numericValue < 100);
  ["100", "75", "50", "25", "0"].forEach((step) => {
    const isStep = step === "100" ? numericValue >= 100 : cleanValue === step;
    button.classList.toggle(`is-eq-${step}`, !isKnobMode && isEqBand && isStep);
  });

  const label = button.querySelector("span");
  if (label) {
    if (mixerKnob.endsWith("-filter")) {
      const filterAmount = Math.round((numericValue - 50) * 2);
      label.textContent = filterAmount === 0 ? "CENTRE" : filterAmount < 0 ? `LP ${Math.abs(filterAmount)}%` : `HP ${filterAmount}%`;
    } else if (mixerKnob.endsWith("-gain") || mixerKnob === "master-gain") {
      label.textContent = `${Math.round(50 + numericValue)}%`;
    } else if (isKnobMode) {
      const dbValue = ((numericValue - 100) / 5).toFixed(1);
      label.textContent = `${Number(dbValue) > 0 ? "+" : ""}${dbValue} dB`;
    } else {
      label.textContent = numericValue <= 0 ? "KILL" : `${cleanValue}%`;
    }
  }

  const [deck, band] = String(button.dataset.djEqKill || "").split("-");
  if (djDeckState[deck]?.eq && band) {
    if (djMixerState.eqMode === "kill") {
      button.dataset.djKillValue = cleanValue;
      if (commitKnobFromKill) button.dataset.djKnobValue = cleanValue;
    } else {
      button.dataset.djKnobValue = cleanValue;
      button.dataset.djKillValue = getKillStepFromKnobValue(cleanValue);
    }
    button.dataset.djEqValue = cleanValue;
    djDeckState[deck].eq[band] = numericValue;
  }

  if (mixerKnob) {
    button.dataset.djKnobValue = cleanValue;

    const [knobDeck, knobName] = mixerKnob.split("-");
    if (knobName === "filter" && djDeckState[knobDeck]) djDeckState[knobDeck].filter = numericValue;
    if (knobName === "gain" && djDeckState[knobDeck]) djDeckState[knobDeck].gain = 0.5 + numericValue / 100;
    if (mixerKnob === "master-gain") djMixerState.masterGain = 0.5 + numericValue / 100;
  }

  applyDeckVolumes();
}

function getEqResetValue() {
  return "100";
}

function resetEqKillButton(button) {
  updateEqKillButton(button, button.dataset.djMixerKnob ? "50" : getEqResetValue());
}

function startEqLongPress(button) {
  window.clearTimeout(eqLongPressTimers.get(button));

  eqLongPressTimers.set(button, window.setTimeout(() => {
    button.dataset.longPressFired = "true";
    resetEqKillButton(button);
  }, 520));
}

function endEqLongPress(button) {
  window.clearTimeout(eqLongPressTimers.get(button));
}

function setEqMode(mode = "knob") {
  const nextMode = mode === "kill" ? "kill" : "knob";
  const previousMode = djMixerState.eqMode;
  djMixerState.eqMode = nextMode;

  eqModeButtons.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.djEqMode === djMixerState.eqMode);
  });

  document.body.classList.toggle("djEqKnobMode", djMixerState.eqMode === "knob");
  document.body.classList.toggle("djEqKillMode", djMixerState.eqMode === "kill");

  eqKillButtons.forEach((button) => {
    const value = djMixerState.eqMode === "kill"
      ? (button.dataset.djKillValue || button.dataset.djEqPercent || button.dataset.djKnobValue || "100")
      : (button.dataset.djKnobValue || button.dataset.djEqPercent || button.dataset.djEqValue || "100");
    updateEqKillButton(button, value, { commitKnobFromKill: false });
  });

  if (previousMode !== djMixerState.eqMode) applyDeckVolumes();
  updateMixerModeButton();
}

function setEqKnobFromPointer(button, event) {
  const state = eqKnobDragState.get(button);
  if (!state) return;

  const delta = state.startY - event.clientY;
  const maxValue = button.dataset.djEqKill ? 150 : 100;
  const nextValue = Math.round(Math.max(0, Math.min(maxValue, state.startValue + (delta / 1.7))) / 5) * 5;
  state.moved = Math.abs(delta) > 3;
  updateEqKillButton(button, String(nextValue));
}

function startEqKnobDrag(button, event) {
  event.preventDefault();
  button.setPointerCapture?.(event.pointerId);

  eqKnobDragState.set(button, {
    startY: event.clientY,
    startValue: Number(button.dataset.djEqValue || "50"),
    moved: false,
  });

  const move = (moveEvent) => setEqKnobFromPointer(button, moveEvent);

  const stop = () => {
    button.removeEventListener("pointermove", move);
    button.removeEventListener("pointerup", stop);
    button.removeEventListener("pointercancel", stop);
  };

  button.addEventListener("pointermove", move);
  button.addEventListener("pointerup", stop);
  button.addEventListener("pointercancel", stop);
}

function handleEqPointerDown(button, event) {
  if (button.dataset.djMixerKnob || djMixerState.eqMode === "knob") {
    startEqKnobDrag(button, event);
    return;
  }

  startEqLongPress(button);
}

function handleEqPointerUp(button) {
  const now = Date.now();
  const lastTap = eqLastTapTimes.get(button) || 0;
  const isDoubleTap = now - lastTap < 320;
  eqLastTapTimes.set(button, now);

  if (button.dataset.djMixerKnob || djMixerState.eqMode === "knob") {
    const dragState = eqKnobDragState.get(button);
    if (isDoubleTap && !dragState?.moved) {
      resetEqKillButton(button);
    }
    return;
  }

  endEqLongPress(button);

  if (button.dataset.longPressFired === "true") {
    button.dataset.longPressFired = "false";
    return;
  }

  if (isDoubleTap) {
    resetEqKillButton(button);
    return;
  }

  updateEqKillButton(button, getNextEqKillValue(button.dataset.djKillValue || button.dataset.djEqValue || "100"), { commitKnobFromKill: true });
}

function normaliseLibraryItem(item) {
  if (!item || !item.id) return null;

  const duration = Number(item.duration || 0) || 0;
  const title = String(item.title || "Untitled track").trim();
  const artist = String(item.artist || item.albumArtist || "Unknown artist").trim();
  const mimeType = String(item.mimeType || "").toLowerCase();
  const locator = String(item.locator || "").toLowerCase();
  const supported = [".mp3", ".wav", ".flac"].some((ext) => locator.endsWith(ext)) || /mp3|wav|flac/.test(mimeType);

  if (!supported) return null;

  return {
    ...item,
    title,
    artist,
    duration,
    isLongMix: duration >= 600,
  };
}

function getItemSourcePath(item = {}) {
  return String(item.sourceRoot || item.root || item.libraryRoot || item.baseFolder || item.folder || item.directory || item.path || item.locator || "").trim();
}

function getItemSourceKey(item = {}) {
  const raw = getItemSourcePath(item).toLowerCase().replace(/\\/g, "/");
  const parts = raw.split("/").filter(Boolean);
  if (!parts.length) return "unknown";
  if (/^[a-z]:$/i.test(parts[0])) return parts[0].toUpperCase();
  return parts.slice(0, 2).join("/") || "unknown";
}

function getItemSourceLabel(item = {}) {
  const key = getItemSourceKey(item);
  if (key === "unknown") return "Unknown source";
  return key.length <= 3 ? `${key} drive` : key;
}

function normaliseCollectionFilterNumber(value) {
  const num = Number.parseFloat(String(value || "").trim());
  return Number.isFinite(num) ? num : 0;
}

function isItemLoadedOrPlayed(item = {}) {
  const id = String(item.id || "");
  return Boolean(
    id &&
    (
      djMixerState.playedTrackIds.has(id) ||
      String(djDeckState.d1.item?.id || "") === id ||
      String(djDeckState.d2.item?.id || "") === id ||
      djMixerState.sessionTrackIds.includes(id)
    )
  );
}

function isTrackKeyMissing(item = {}, prep = getTrackPrepStatusForItem(item) || {}) {
  const key = String(getItemKeyLabel(item, prep) || "").trim();
  return !key || key === "—" || key === "-" || key.toLowerCase() === "unknown";
}

function getTrackPrepSummary(item = {}) {
  const id = String(item?.id || "");
  const prep = getTrackPrepStatusForItem(item) || {};
  const waveformReady = Boolean(prep.waveformReady || djMixerState.waveformCachedIds.has(id));
  const analysisReady = Boolean(prep.analysisReady || prep.detectedBpm || prep.bpmConfidence || prep.bpm);
  const bpmReady = Boolean(Number(prep.detectedBpm || prep.bpm || getItemBpm(item) || 0));
  const gridConfidence = Number(prep.gridConfidence || 0);
  const confidenceLabel = prep.analysisConfidenceLabel || getPrepConfidenceLabel(prep.bpmConfidence || 0, gridConfidence);
  const gridNeedsCheck = Boolean(prep.gridNeedsCheck || prep.needsGridCheck || (!prep.gridLocked && gridConfidence > 0 && gridConfidence < 0.28));
  const gridReady = Boolean(prep.gridReady && !gridNeedsCheck);
  const keyReady = !isTrackKeyMissing(item, prep);
  const prepared = waveformReady && analysisReady && bpmReady && gridReady && keyReady && prep.preparedOverride !== false;

  return {
    prep,
    waveformReady,
    analysisReady,
    bpmReady,
    gridReady,
    gridNeedsCheck,
    gridConfidence,
    confidenceLabel,
    keyReady,
    keyMissing: !keyReady,
    prepared,
    needsPrep: !prepared,
    score:
      (prepared ? 100 : 0) +
      (waveformReady ? 22 : 0) +
      (analysisReady ? 18 : 0) +
      (bpmReady ? 16 : 0) +
      (gridReady ? 22 : 0) +
      (keyReady ? 12 : 0) +
      (prep.gridLocked ? 10 : 0) -
      (gridNeedsCheck ? 18 : 0),
  };
}

function isItemPrepared(item = {}) {
  return Boolean(getTrackPrepSummary(item).prepared);
}

function getCollectionPreparedScore(item = {}) {
  return getTrackPrepSummary(item).score;
}

function sortCollectionItems(items = []) {
  const sort = djMixerState.collectionFilters.sort || "prepared";
  const sorted = [...items];

  sorted.sort((a, b) => {
    if (sort === "artist") return `${a.artist || ""} ${a.title || ""}`.localeCompare(`${b.artist || ""} ${b.title || ""}`);
    if (sort === "bpm") return (getItemBpm(a) || 999) - (getItemBpm(b) || 999) || String(a.title || "").localeCompare(String(b.title || ""));
    if (sort === "key") return getItemKeyLabel(a).localeCompare(getItemKeyLabel(b)) || String(a.title || "").localeCompare(String(b.title || ""));
    if (sort === "duration") return Number(a.duration || 0) - Number(b.duration || 0);
    if (sort === "recent") return Number(b.addedAt || b.mtime || b.modifiedAt || 0) - Number(a.addedAt || a.mtime || a.modifiedAt || 0);
    if (sort === "title") return String(a.title || "").localeCompare(String(b.title || ""));
    return getCollectionPreparedScore(b) - getCollectionPreparedScore(a) || String(a.title || "").localeCompare(String(b.title || ""));
  });

  return sorted;
}

function updateCollectionFilterOptions(items = []) {
  if (djCollectionSort) djCollectionSort.value = djMixerState.collectionFilters.sort || "prepared";
  if (djCollectionBpmMin) djCollectionBpmMin.value = djMixerState.collectionFilters.bpmMin || "";
  if (djCollectionBpmMax) djCollectionBpmMax.value = djMixerState.collectionFilters.bpmMax || "";

  const sourceOptions = new Map();
  const keyOptions = new Set();
  items.forEach((item) => {
    sourceOptions.set(getItemSourceKey(item), getItemSourceLabel(item));
    const key = getItemKeyLabel(item);
    if (key && key !== "—") keyOptions.add(key);
  });

  if (djCollectionSourceFilter) {
    const selected = djMixerState.collectionFilters.source || "all";
    djCollectionSourceFilter.innerHTML = `<option value="all">All sources</option>${Array.from(sourceOptions.entries()).sort((a, b) => a[1].localeCompare(b[1])).map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`).join("")}`;
    djCollectionSourceFilter.value = sourceOptions.has(selected) ? selected : "all";
    djMixerState.collectionFilters.source = djCollectionSourceFilter.value;
  }

  if (djCollectionKeyFilter) {
    const selected = djMixerState.collectionFilters.key || "all";
    const keys = Array.from(keyOptions).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    djCollectionKeyFilter.innerHTML = `<option value="all">Any key</option>${keys.map((key) => `<option value="${escapeHtml(key)}">${escapeHtml(key)}</option>`).join("")}`;
    djCollectionKeyFilter.value = keys.includes(selected) ? selected : "all";
    djMixerState.collectionFilters.key = djCollectionKeyFilter.value;
  }

  djCollectionFilterButtons.forEach((button) => {
    const filter = button.dataset.djCollectionFilter || "";
    const active =
      (filter === "short" && !djMixerState.collectionFilters.includeLong) ||
      (filter === "long" && djMixerState.collectionFilters.includeLong) ||
      (filter === "prepared" && djMixerState.collectionFilters.preparedOnly) ||
      (filter === "needs-prep" && djMixerState.collectionFilters.needsPrepOnly) ||
      (filter === "bpm-missing" && djMixerState.collectionFilters.bpmMissingOnly) ||
      (filter === "grid-missing" && djMixerState.collectionFilters.gridMissingOnly) ||
      (filter === "key-missing" && djMixerState.collectionFilters.keyMissingOnly) ||
      (filter === "loaded" && djMixerState.collectionFilters.loadedOnly);
    button.classList.toggle("is-active", active);
  });
}

function getDjLibraryItems({ raw = false } = {}) {
  const setup = readSetup();
  const filters = djMixerState.collectionFilters || {};
  const query = String(djMixerState.libraryQuery || "").trim().toLowerCase();
  const includeLong = Boolean(filters.includeLong || setup.libraryMode === "include-long-mixes");
  const bpmMin = normaliseCollectionFilterNumber(filters.bpmMin);
  const bpmMax = normaliseCollectionFilterNumber(filters.bpmMax);

  const items = djMixerState.libraryItems
    .map(normaliseLibraryItem)
    .filter(Boolean);

  if (raw) return items;

  return sortCollectionItems(items
    .filter((item) => includeLong || !item.isLongMix)
    .filter((item) => filters.preparedOnly ? isItemPrepared(item) : true)
    .filter((item) => filters.needsPrepOnly ? getTrackPrepSummary(item).needsPrep : true)
    .filter((item) => filters.bpmMissingOnly ? !getTrackPrepSummary(item).bpmReady : true)
    .filter((item) => filters.gridMissingOnly ? !getTrackPrepSummary(item).gridReady : true)
    .filter((item) => filters.keyMissingOnly ? getTrackPrepSummary(item).keyMissing : true)
    .filter((item) => filters.loadedOnly ? isItemLoadedOrPlayed(item) : true)
    .filter((item) => filters.source && filters.source !== "all" ? getItemSourceKey(item) === filters.source : true)
    .filter((item) => filters.key && filters.key !== "all" ? getItemKeyLabel(item) === filters.key : true)
    .filter((item) => {
      const bpm = getItemBpm(item);
      if (bpmMin && (!bpm || bpm < bpmMin)) return false;
      if (bpmMax && (!bpm || bpm > bpmMax)) return false;
      return true;
    })
    .filter((item) => {
      if (!query) return true;
      return `${item.title} ${item.artist} ${getTrackFormatLabel(item)} ${getItemKeyLabel(item)} ${getItemSourceLabel(item)} ${getItemBpm(item) || ""}`.toLowerCase().includes(query);
    })
  ).slice(0, includeLong ? 160 : 90);
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds || 0)));
  const mins = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, "0");
  return mins ? `${mins}:${secs}` : "--:--";
}

function getDeckTimeLabel(deck) {
  const item = djDeckState[deck]?.item;
  if (!item) return "";

  const duration = Math.max(0, Number(getDeckDuration(deck) || item.duration || 0));
  const current = Math.max(0, Number(getDeckCurrentTime(deck) || 0));
  const mode = djMixerState.timeDisplayModeByDeck?.[deck] || "remaining";

  if (!duration) return `${item.artist || item.albumArtist || "Unknown artist"}`;

  return mode === "elapsed"
    ? `${formatDuration(current)} played`
    : `-${formatDuration(Math.max(0, duration - current))} left`;
}

function updateDeckTimeDisplays() {
  ["d1", "d2"].forEach((deck) => {
    if (!deckArtists[deck]) return;

    deckArtists[deck].textContent = getDeckTimeLabel(deck);
    deckArtists[deck].classList.toggle("is-empty", !djDeckState[deck]?.item);
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getTrackArtwork(item) {
  return item?.artworkUrl || item?.artwork || item?.image || item?.coverUrl || "";
}

function getTrackFormatLabel(item) {
  const locator = String(item?.locator || "").toLowerCase();
  const mime = String(item?.mimeType || "").toLowerCase();

  if (locator.endsWith(".flac") || mime.includes("flac")) return "FLAC";
  if (locator.endsWith(".wav") || mime.includes("wav")) return "WAV";
  return "MP3";
}

function updateLibraryTargetUi() {
  const safeTarget = getSafeLibraryTarget(pendingLoadDeck);
  pendingLoadDeck = safeTarget;

  djLibraryTargetButtons.forEach((button) => {
    const deck = button.dataset.djLibraryTarget === "d2" ? "d2" : "d1";
    const locked = isDeckPlaying(deck);
    button.classList.toggle("is-selected", deck === pendingLoadDeck);
    button.classList.toggle("is-locked", locked);
    button.disabled = locked;
  });
}

function getSessionLibraryItems(items) {
  return djMixerState.sessionTrackIds
    .map((id) => items.find((item) => String(item.id) === String(id)))
    .filter(Boolean);
}

function createDjPlan(kind = "playlist", name = "") {
  const safeKind = kind === "set" ? "set" : "playlist";
  const prefix = safeKind === "set" ? "DJ Set" : "Playlist";
  return {
    id: `${safeKind}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    kind: safeKind,
    name: name || `${prefix} ${new Date().toLocaleDateString()}`,
    trackIds: [],
    trackMeta: {},
    linkedSetupId: "",
    ready: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function normaliseDjPlans(raw = {}) {
  const playlists = Array.isArray(raw.playlists) ? raw.playlists : [];
  const sets = Array.isArray(raw.sets) ? raw.sets : [];
  const normaliseList = (items, kind) => items.map((item) => ({
    ...createDjPlan(kind, item?.name || ""),
    ...item,
    kind,
    trackIds: Array.isArray(item?.trackIds) ? item.trackIds.map(String) : [],
    trackMeta: item?.trackMeta && typeof item.trackMeta === "object" ? item.trackMeta : {},
    linkedSetupId: String(item?.linkedSetupId || ""),
    ready: Boolean(item?.ready),
  }));

  const next = {
    playlists: normaliseList(playlists, "playlist"),
    sets: normaliseList(sets, "set"),
    activePlaylistId: String(raw.activePlaylistId || ""),
    activeSetId: String(raw.activeSetId || ""),
  };

  if (!next.playlists.length) next.playlists.push(createDjPlan("playlist", "Main Playlist"));
  if (!next.sets.length) next.sets.push(createDjPlan("set", "Tonight DJ Set"));
  if (!next.playlists.some((plan) => plan.id === next.activePlaylistId)) next.activePlaylistId = next.playlists[0].id;
  if (!next.sets.some((plan) => plan.id === next.activeSetId)) next.activeSetId = next.sets[0].id;
  return next;
}

function readDjCollectionPlans() {
  try {
    return normaliseDjPlans(JSON.parse(localStorage.getItem(DJ_COLLECTION_PLANS_KEY) || "{}"));
  } catch (err) {
    console.warn("DJ Collection plans read failed", err);
    return normaliseDjPlans({});
  }
}

function writeDjCollectionPlans() {
  try {
    localStorage.setItem(DJ_COLLECTION_PLANS_KEY, JSON.stringify(djMixerState.collectionPlanner));
  } catch (err) {
    console.warn("DJ Collection plans save failed", err);
  }
}

function getDjPlanList(kind = "playlist") {
  return kind === "set" ? djMixerState.collectionPlanner.sets : djMixerState.collectionPlanner.playlists;
}

function getActiveDjPlan(kind = "playlist") {
  const plans = getDjPlanList(kind);
  const id = kind === "set" ? djMixerState.collectionPlanner.activeSetId : djMixerState.collectionPlanner.activePlaylistId;
  return plans.find((plan) => plan.id === id) || plans[0] || createDjPlan(kind);
}

function getDjPlanById(kind = "playlist", planId = "") {
  return getDjPlanList(kind).find((plan) => String(plan.id) === String(planId)) || getActiveDjPlan(kind);
}

function getPlanTrackMeta(kind = "set", planId = "", trackId = "") {
  const plan = getDjPlanById(kind, planId);
  plan.trackMeta = plan.trackMeta && typeof plan.trackMeta === "object" ? plan.trackMeta : {};
  return plan.trackMeta[String(trackId)] || { role: "main", note: "" };
}

function updatePlanTrackMeta(kind = "set", planId = "", trackId = "", updates = {}) {
  const plan = getDjPlanById(kind, planId);
  if (!plan || !trackId) return;
  plan.trackMeta = plan.trackMeta && typeof plan.trackMeta === "object" ? plan.trackMeta : {};
  plan.trackMeta[String(trackId)] = {
    role: "main",
    note: "",
    ...(plan.trackMeta[String(trackId)] || {}),
    ...updates,
  };
  plan.updatedAt = Date.now();
  writeDjCollectionPlans();
  renderCollectionPlanner();
}

function formatPlanRuntime(seconds = 0) {
  const total = Math.max(0, Math.round(Number(seconds || 0)));
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, "0");
  return hours ? `${hours}:${String(mins).padStart(2, "0")}:${secs}` : `${mins}:${secs}`;
}

function getDjPlanStats(plan = getActiveDjPlan("set")) {
  const ids = Array.isArray(plan?.trackIds) ? plan.trackIds : [];
  let runtime = 0;
  let missing = 0;
  let prepared = 0;
  let needsPrep = 0;

  ids.forEach((trackId) => {
    const item = getLibraryItemById(trackId);
    if (!item) {
      missing += 1;
      needsPrep += 1;
      return;
    }
    runtime += Number(item.duration || 0) || 0;
    const summary = getTrackPrepSummary(item);
    if (summary.prepared) prepared += 1;
    else needsPrep += 1;
  });

  const count = ids.length;
  return {
    count,
    missing,
    prepared,
    needsPrep,
    runtime,
    runtimeLabel: count ? formatPlanRuntime(runtime) : "--:--",
    preparedPercent: count ? Math.round((prepared / count) * 100) : 0,
  };
}

function setDjPlanReady(kind = "set") {
  const plan = getActiveDjPlan(kind);
  if (!plan) return;
  const stats = getDjPlanStats(plan);
  if (!stats.count) {
    window.alert("Add at least one track before marking this DJ Set ready.");
    return;
  }
  plan.ready = true;
  plan.updatedAt = Date.now();
  writeDjCollectionPlans();
  renderCollectionPlanner();
}

function renameDjCollectionPlan(kind = "playlist") {
  const plan = getActiveDjPlan(kind);
  if (!plan) return;
  const label = kind === "set" ? "DJ Set" : "Playlist";
  const nextName = window.prompt(`Rename ${label}:`, plan.name || label);
  if (!nextName || !nextName.trim()) return;
  plan.name = nextName.trim();
  plan.updatedAt = Date.now();
  writeDjCollectionPlans();
  renderCollectionPlanner();
}

function deleteDjCollectionPlan(kind = "playlist") {
  const plans = getDjPlanList(kind);
  const plan = getActiveDjPlan(kind);
  const label = kind === "set" ? "DJ Set" : "Playlist";
  if (!plan || plans.length <= 1) {
    window.alert(`Keep at least one ${label}.`);
    return;
  }
  if (!window.confirm(`Delete ${plan.name || label}? This only removes the BRMedia list, not audio files.`)) return;
  const nextPlans = plans.filter((item) => item.id !== plan.id);
  if (kind === "set") {
    djMixerState.collectionPlanner.sets = nextPlans;
    djMixerState.collectionPlanner.activeSetId = nextPlans[0]?.id || "";
  } else {
    djMixerState.collectionPlanner.playlists = nextPlans;
    djMixerState.collectionPlanner.activePlaylistId = nextPlans[0]?.id || "";
  }
  writeDjCollectionPlans();
  renderCollectionPlanner();
}

function addActivePlaylistToLinkedSet() {
  const playlist = getActiveDjPlan("playlist");
  const setup = readSetup();
  const linkedSet = ensureLinkedDjSetForSetup(setup);
  if (!playlist?.trackIds?.length) {
    if (djPlaylistBuilderStatus) djPlaylistBuilderStatus.textContent = "Add tracks to this Playlist first, then push it into the current DJ Set.";
    return;
  }
  let added = 0;
  playlist.trackIds.forEach((trackId) => {
    const id = String(trackId);
    if (!linkedSet.trackIds.includes(id)) {
      linkedSet.trackIds.push(id);
      added += 1;
    }
  });
  linkedSet.updatedAt = Date.now();
  setup.linkedDjSetId = linkedSet.id;
  writeSetup(setup);
  writeDjCollectionPlans();
  renderCollectionPlanner();
  const message = added ? `Added ${added} track${added === 1 ? "" : "s"} to ${linkedSet.name}.` : "That Playlist is already inside the current DJ Set.";
  if (djPlaylistBuilderStatus) djPlaylistBuilderStatus.textContent = message;
  if (djSetBuilderStatus) djSetBuilderStatus.textContent = message;
}

function createSetupId() {
  return `setup-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function getLinkedDjSetName(setup = {}) {
  const title = String(setup.title || "").trim();
  const episode = String(setup.episode || "").trim();
  if (!title) return "Draft DJ Set";
  if (!episode || title.toLowerCase().includes(episode.toLowerCase())) return title;
  return `${title} #${episode}`;
}

function ensureLinkedDjSetForSetup(setup = readSetup()) {
  if (!setup.id) setup.id = createSetupId();
  const sets = getDjPlanList("set");
  let plan = sets.find((item) => item.id === setup.linkedDjSetId)
    || sets.find((item) => item.linkedSetupId && item.linkedSetupId === setup.id);

  if (!plan) {
    plan = createDjPlan("set", getLinkedDjSetName(setup));
    sets.push(plan);
  }

  plan.kind = "set";
  plan.linkedSetupId = setup.id;
  plan.name = getLinkedDjSetName(setup);
  plan.updatedAt = Date.now();
  setup.linkedDjSetId = plan.id;
  djMixerState.collectionPlanner.activeSetId = plan.id;
  writeDjCollectionPlans();
  return plan;
}

function getLinkedDjSetForCurrentSetup() {
  const setup = readSetup();
  if (setup.linkedDjSetId) {
    const plan = getDjPlanList("set").find((item) => item.id === setup.linkedDjSetId);
    if (plan) {
      djMixerState.collectionPlanner.activeSetId = plan.id;
      return plan;
    }
  }
  if (setup.id) {
    const plan = getDjPlanList("set").find((item) => item.linkedSetupId === setup.id);
    if (plan) {
      djMixerState.collectionPlanner.activeSetId = plan.id;
      return plan;
    }
  }
  return getActiveDjPlan("set");
}

function getLibraryItemById(id = "") {
  return djMixerState.libraryItems.find((item) => String(item.id) === String(id));
}

function setActiveDjPlan(kind = "playlist", id = "") {
  if (kind === "set") djMixerState.collectionPlanner.activeSetId = id;
  else djMixerState.collectionPlanner.activePlaylistId = id;
  writeDjCollectionPlans();
  renderCollectionPlanner();
}

function createDjCollectionPlan(kind = "playlist") {
  const safeKind = kind === "set" ? "set" : "playlist";
  const fallback = safeKind === "set" ? "New DJ Set" : "New Playlist";
  const name = window.prompt(`Name this ${safeKind === "set" ? "DJ Set" : "Playlist"}:`, fallback);
  if (!name) return null;
  const plan = createDjPlan(safeKind, name.trim());
  getDjPlanList(safeKind).push(plan);
  setActiveDjPlan(safeKind, plan.id);
  writeDjCollectionPlans();
  renderCollectionPlanner();
  return plan;
}

function addTrackToDjPlan(kind = "playlist", planId = "", trackId = "") {
  const plan = getDjPlanList(kind).find((item) => item.id === planId) || getActiveDjPlan(kind);
  if (!plan || !trackId) return;
  if (!plan.trackIds.includes(String(trackId))) plan.trackIds.push(String(trackId));
  plan.updatedAt = Date.now();
  setActiveDjPlan(kind, plan.id);
  writeDjCollectionPlans();
  renderCollectionPlanner();
}

function moveTrackInDjPlan(kind = "playlist", index = 0, direction = 0) {
  const plan = getActiveDjPlan(kind);
  const from = Number(index || 0);
  const to = Math.max(0, Math.min(plan.trackIds.length - 1, from + Number(direction || 0)));
  if (from === to) return;
  const [trackId] = plan.trackIds.splice(from, 1);
  plan.trackIds.splice(to, 0, trackId);
  plan.updatedAt = Date.now();
  writeDjCollectionPlans();
  renderCollectionPlanner();
}

function removeTrackFromDjPlan(kind = "playlist", index = 0) {
  const plan = getActiveDjPlan(kind);
  const [removedTrackId] = plan.trackIds.splice(Number(index || 0), 1);
  if (removedTrackId && plan.trackMeta) delete plan.trackMeta[String(removedTrackId)];
  plan.updatedAt = Date.now();
  writeDjCollectionPlans();
  renderCollectionPlanner();
}

function renderPlanSelect(kind = "playlist") {
  const plans = getDjPlanList(kind);
  const active = getActiveDjPlan(kind);
  return `<select data-dj-plan-select="${kind}">${plans.map((plan) => `<option value="${escapeHtml(plan.id)}"${plan.id === active.id ? " selected" : ""}>${escapeHtml(plan.name)}</option>`).join("")}</select>`;
}

function renderPlanTrackRow(kind = "playlist", trackId = "", index = 0) {
  const plan = getActiveDjPlan(kind);
  const item = getLibraryItemById(trackId);
  const missing = !item;
  const title = item?.title || "Missing track";
  const artist = item?.artist || "Unknown artist";
  const prepSummary = item ? getTrackPrepSummary(item) : null;
  const prepared = Boolean(prepSummary?.prepared);
  const keyLabel = item ? getItemKeyLabel(item, prepSummary?.prep || {}) : "—";
  const meta = item
    ? `${formatDuration(item.duration)} · ${getTrackFormatLabel(item)} · BPM ${getItemBpm(item) || "—"} · Key ${keyLabel}`
    : "Track not in current library — remove it or re-add from Collection";
  const trackMeta = getPlanTrackMeta(kind, plan.id, trackId);
  const role = trackMeta.role || "main";
  const note = trackMeta.note || "";
  const roleLabel = kind === "set" ? `<small class="djPlanRolePill is-${escapeHtml(role)}">${escapeHtml(role)}</small>` : "";
  const noteHtml = kind === "set" && note ? `<small class="djPlanNotePill">${escapeHtml(note)}</small>` : "";
  const setTools = kind === "set" ? `
      <div class="djPlanTrackTools">
        <label class="djPlanRoleControl">
          <span>Role</span>
          <select data-dj-plan-role>
            <option value="intro"${role === "intro" ? " selected" : ""}>Intro</option>
            <option value="main"${role === "main" ? " selected" : ""}>Main</option>
            <option value="peak"${role === "peak" ? " selected" : ""}>Peak</option>
            <option value="outro"${role === "outro" ? " selected" : ""}>Outro</option>
          </select>
        </label>
        <label class="djPlanNoteControl">
          <span>Mix note</span>
          <input data-dj-plan-note type="text" value="${escapeHtml(note)}" placeholder="Mix-in, vocal, drop, cut, outro…" />
        </label>
      </div>` : "";

  return `
    <article class="djPlanTrackRow${kind === "set" ? " is-set-row" : ""}${prepared ? " is-prepared" : ""}${missing ? " is-missing" : ""}" data-dj-plan-row="${kind}" data-dj-plan-id="${escapeHtml(plan.id)}" data-dj-plan-index="${index}" data-dj-plan-track-id="${escapeHtml(trackId)}">
      <b class="djPlanTrackNumber">${index + 1}</b>
      <div class="djPlanTrackInfo">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(artist)} · ${escapeHtml(meta)}</span>
        <em>${roleLabel}${noteHtml}${prepared ? `<small class="djPlanPreparedPill">Prepared</small>` : `<small class="djPlanNeedsPrepPill">Needs prep</small>`}</em>
      </div>
      ${setTools}
      <div class="djPlanTrackActions">
        <button type="button" data-dj-plan-move="up" title="Move up"${index <= 0 ? " disabled" : ""}>↑</button>
        <button type="button" data-dj-plan-move="down" title="Move down"${index >= (plan.trackIds.length - 1) ? " disabled" : ""}>↓</button>
        <button type="button" data-dj-plan-load="d1" title="Load Deck 1"${missing ? " disabled" : ""}>D1</button>
        <button type="button" data-dj-plan-load="d2" title="Load Deck 2"${missing ? " disabled" : ""}>D2</button>
        <button type="button" data-dj-plan-remove title="Remove">×</button>
      </div>
    </article>
  `;
}

function getTracklistExportLabel(setup = readSetup()) {
  const bits = [];
  if (setup.saveTxtTracklist !== "false") bits.push("TXT");
  if (setup.tracklistMode !== "tracklist-info" && setup.saveTimestampJson !== "false") bits.push("timestamp JSON");
  if (setup.saveSessionJson !== "false") bits.push("session JSON");
  return bits.length ? bits.join(" + ") : "No sidecars";
}

function getTracklistTimestampLabel(setup = readSetup()) {
  if (setup.tracklistMode === "tracklist-info") return "No timestamps";
  if (setup.tracklistTimestampSource === "cue-start") return "Cue/start timestamps";
  if (setup.tracklistTimestampSource === "manual-later") return "Manual Player timestamps later";
  return "Load-time timestamps";
}

function updateExportAndRecordSummaries(setup = readSetup()) {
  const format = String(setup.format || "wav").toUpperCase();
  const finalLabel = `${format} · ${CHANNEL_LABELS[setup.channels] || "Stereo"} · ${getRecordQualityLabel(setup)}`;
  const sidecarLabel = getTracklistExportLabel(setup);
  const timestampLabel = getTracklistTimestampLabel(setup);
  if (djTracklistExportSummary) djTracklistExportSummary.textContent = `${sidecarLabel} • ${timestampLabel}`;
  if (djRecordFinalFormatSummary) djRecordFinalFormatSummary.textContent = finalLabel;
  if (djRecordSidecarSummary) djRecordSidecarSummary.textContent = sidecarLabel;
  if (djRecordDestinationSummary) djRecordDestinationSummary.textContent = setup.destination || "DJ Recordings";
}

function setHomeLinkState(anchor, href = "#", enabled = false) {
  if (!anchor) return;
  anchor.href = enabled ? href : "#";
  anchor.classList.toggle("is-soft-disabled", !enabled);
  anchor.setAttribute("aria-disabled", enabled ? "false" : "true");
}

function getRecordingFormatLabel(item = {}) {
  return String(item.finalFormat || item.format || item.captureFormat || "wav").toUpperCase();
}

function updateStudioHomeWowCards(setup = readSetup(), linkedSet = getLinkedDjSetForCurrentSetup(), stats = getDjPlanStats(linkedSet)) {
  const missing = requiredSetupMissing(setup);
  const recordings = readRecordingLog();
  const latest = recordings[0];
  const recordingLabel = `${String(setup.format || "wav").toUpperCase()} · ${CHANNEL_LABELS[setup.channels] || "Stereo"}`;
  const sidecars = getTracklistExportLabel(setup);
  const timestamp = getTracklistTimestampLabel(setup);
  const readyLabel = missing.length ? "Draft" : stats.count ? "Ready" : "Needs tracks";

  if (djHomeCurrentStatus) {
    djHomeCurrentStatus.textContent = readyLabel;
    djHomeCurrentStatus.classList.toggle("is-ready", readyLabel === "Ready");
  }

  const currentTitle = setup.title?.trim() || "Untitled DJ Set";
  const artist = setup.artist?.trim() || "DJ / artist needed";
  const series = [setup.series, setup.episode ? `Episode ${setup.episode}` : ""].filter(Boolean).join(" · ");
  const currentMeta = `${artist}${series ? ` · ${series}` : ""}${setup.genre ? ` · ${setup.genre}` : ""}`;

  if (djHomeCurrentTitle) djHomeCurrentTitle.textContent = currentTitle;
  if (djHomeCurrentMeta) djHomeCurrentMeta.textContent = currentMeta;
  if (djFrontCurrentShowTitle) djFrontCurrentShowTitle.textContent = currentTitle;
  if (djFrontCurrentShowMeta) djFrontCurrentShowMeta.textContent = linkedSet?.trackIds?.length ? `${linkedSet.name} · ${stats.count} tracks · ${stats.runtimeLabel}` : currentMeta;
  if (djHomeCurrentSet) djHomeCurrentSet.textContent = linkedSet?.trackIds?.length ? `${linkedSet.name} · ${stats.count} tracks · ${stats.runtimeLabel}` : "Build a DJ Set";
  if (djHomeCurrentRecord) djHomeCurrentRecord.textContent = `${recordingLabel} · ${getRecordQualityLabel(setup)}`;
  if (djHomeCurrentTracklist) djHomeCurrentTracklist.textContent = `${sidecars} · ${timestamp}`;

  if (djHomeQuickRecord) djHomeQuickRecord.textContent = `${recordingLabel} · ${getRecordQualityLabel(setup)}`;
  if (djHomeQuickPastShows) djHomeQuickPastShows.textContent = `${recordings.length} saved show${recordings.length === 1 ? "" : "s"}`;
  if (djHomeQuickSet) djHomeQuickSet.textContent = stats.count ? `${linkedSet.name} · ${stats.count} tracks` : "No tracks yet";
  if (djHomeQuickHandoff) djHomeQuickHandoff.textContent = latest?.serverFinalised ? "Latest ready for Player" : latest ? "Capture/finalise pending" : "Waiting for recording";

  if (!latest) {
    if (djHomeLatestStatus) djHomeLatestStatus.textContent = "No shows yet";
    if (djHomeLatestTitle) djHomeLatestTitle.textContent = "Record your first show";
    if (djHomeLatestMeta) djHomeLatestMeta.textContent = "Past Shows will appear here as soon as a recording is captured.";
    if (djFrontLatestShowTitle) djFrontLatestShowTitle.textContent = "No recordings yet";
    if (djFrontLatestShowMeta) djFrontLatestShowMeta.textContent = "Record a short test and it will appear here.";
    setHomeLinkState(djHomeLatestPlayer, "#", false);
    setHomeLinkState(djFrontLatestPlayer, "#", false);
    setHomeLinkState(djHomeLatestFiles, "/settings?module=cloud&tab=files", true);
    updateDjPrepDashboard();
    return;
  }

  const status = getRecordingCardStatus(latest);
  const latestId = latest.serverRecordingId || latest.id;
  const playerHref = buildModuleUrl("/player", {
    recordingId: latestId,
    title: latest.title || "BRMedia DJ Recording",
    source: "dj-mixer",
    finalFormat: latest.finalFormat || latest.format || "wav",
  });
  const filesHref = buildModuleUrl("/settings", { module: "cloud", tab: "files", recordingId: latestId });

  if (djHomeLatestStatus) {
    djHomeLatestStatus.textContent = status.label;
    djHomeLatestStatus.className = status.className || "";
  }

  const trackCount = Number(latest.trackCount || latest.plannedTrackCount || 0);
  const latestMeta = `${getRecordingFormatLabel(latest)} · ${latest.durationLabel || "--:--"} · ${trackCount} track${trackCount === 1 ? "" : "s"} · ${latest.linkedSetName || "Past show"}`;

  if (djHomeLatestTitle) djHomeLatestTitle.textContent = latest.title || "BRMedia DJ Recording";
  if (djHomeLatestMeta) djHomeLatestMeta.textContent = latestMeta;
  if (djFrontLatestShowTitle) djFrontLatestShowTitle.textContent = latest.title || "BRMedia DJ Recording";
  if (djFrontLatestShowMeta) djFrontLatestShowMeta.textContent = `${status.label} · ${latestMeta}`;

  setHomeLinkState(djHomeLatestPlayer, playerHref, Boolean(latestId));
  setHomeLinkState(djFrontLatestPlayer, playerHref, Boolean(latestId));
  setHomeLinkState(djHomeLatestFiles, filesHref, Boolean(latestId));
  updateDjPrepDashboard();
}

function updateStudioHomeHandoffCards(setup = readSetup(), linkedSet = getLinkedDjSetForCurrentSetup(), stats = getDjPlanStats(linkedSet)) {
  const recordingLabel = `${String(setup.format || "wav").toUpperCase()} · ${CHANNEL_LABELS[setup.channels] || "Stereo"}`;
  const sidecars = getTracklistExportLabel(setup);
  const timestamp = getTracklistTimestampLabel(setup);
  const recordings = readRecordingLog();
  const latest = recordings[0];

  updateStudioHomeWowCards(setup, linkedSet, stats);
  if (djHomeFinaliseStatus) djHomeFinaliseStatus.textContent = `${recordingLabel} · ${getRecordQualityLabel(setup)}`;
  if (djHomeTracklistStatus) djHomeTracklistStatus.textContent = `${sidecars} · ${timestamp}`;
  if (djHomeLinkedSetStatus) djHomeLinkedSetStatus.textContent = linkedSet?.trackIds?.length ? `${linkedSet.name} · ${stats.count} tracks` : "No running order yet";
  if (djHomePlayerStatus) djHomePlayerStatus.textContent = latest?.serverFinalised ? "Latest show ready for Player" : latest?.needsFinalise ? "Capture saved · final pending" : "Waiting for first recording";
}

function updateStudioDashboard(setup = readSetup()) {
  const linkedSet = getLinkedDjSetForCurrentSetup();
  const stats = getDjPlanStats(linkedSet);
  const missing = requiredSetupMissing(setup);
  const tracklistLabel = setup.tracklistMode === "tracklist-info" ? "Info only" : getTracklistTimestampLabel(setup);
  const recordingLabel = `${String(setup.format || "wav").toUpperCase()} · ${CHANNEL_LABELS[setup.channels] || "Stereo"}`;
  const readyToLaunch = missing.length === 0 && stats.count > 0;
  updateExportAndRecordSummaries(setup);
  updateStudioHomeHandoffCards(setup, linkedSet, stats);
  const checklist = [
    { label: "Mix Setup", detail: missing.length ? missing.map((item) => item.label).join(", ") : "Required info complete", ready: missing.length === 0 },
    { label: "DJ Set", detail: stats.count ? `${stats.count} track${stats.count === 1 ? "" : "s"} in running order` : "Add tracks from Collection", ready: stats.count > 0 },
    { label: "Tracklist", detail: `${tracklistLabel} • ${getTracklistExportLabel(setup)}`, ready: Boolean(setup.tracklistMode) },
    { label: "Recording", detail: `${recordingLabel} · ${getRecordQualityLabel(setup)}`, ready: Boolean(setup.format && setup.channels && setup.sampleRate) },
    { label: "Prepared", detail: stats.count ? `${stats.prepared}/${stats.count} waveform+grid ready` : "No set tracks yet", ready: stats.count > 0 && stats.prepared === stats.count },
  ];

  if (djStudioDashTitle) djStudioDashTitle.textContent = setup.title?.trim() || "Untitled DJ Set";
  if (djStudioDashArtist) djStudioDashArtist.textContent = `${setup.artist?.trim() || "DJ / artist needed"} · ${setup.genre || "Genre"}`;
  if (djStudioDashState) {
    djStudioDashState.textContent = readyToLaunch ? "Ready" : missing.length ? "Draft" : "Needs tracks";
    djStudioDashState.classList.toggle("is-ready", readyToLaunch);
  }
  if (djStudioDashSetName) djStudioDashSetName.textContent = linkedSet?.name || "Linked DJ Set";
  if (djStudioDashSetCount) djStudioDashSetCount.textContent = String(stats.count);
  if (djStudioDashRuntime) djStudioDashRuntime.textContent = stats.runtimeLabel;
  if (djStudioDashRecord) djStudioDashRecord.textContent = recordingLabel;
  if (djStudioChecklistTitle) djStudioChecklistTitle.textContent = readyToLaunch ? "Ready for DUO" : "Finish these before launch";
  if (djStudioDashLaunch) djStudioDashLaunch.classList.toggle("is-blocked", !readyToLaunch);
  if (djStudioChecklist) {
    djStudioChecklist.innerHTML = checklist.map((item) => `
      <div class="djChecklistItemV2Z ${item.ready ? "is-ready" : "is-needed"}">
        <b>${item.ready ? "✓" : "!"}</b>
        <span><strong>${escapeHtml(item.label)}</strong><em>${escapeHtml(item.detail)}</em></span>
      </div>
    `).join("");
  }

  if (djSetBuilderActiveTitle) djSetBuilderActiveTitle.textContent = linkedSet?.name || "Tonight DJ Set";
  if (djSetBuilderCount) djSetBuilderCount.textContent = String(stats.count);
  if (djSetBuilderRuntime) djSetBuilderRuntime.textContent = stats.runtimeLabel;
  if (djSetBuilderPrepared) djSetBuilderPrepared.textContent = `${stats.preparedPercent}%`;
  if (djSetBuilderStatus) {
    djSetBuilderStatus.textContent = linkedSet?.ready
      ? "Ready for launch. You can still add notes or tweak order before DUO."
      : stats.count
        ? "Running order active. Add roles/notes, then mark set ready."
        : "Add tracks from Collection, then sort the running order here.";
    djSetBuilderStatus.classList.toggle("is-ready", Boolean(linkedSet?.ready));
  }
}

function updatePlaylistBuilderDashboard() {
  const playlist = getActiveDjPlan("playlist");
  const stats = getDjPlanStats(playlist);
  if (djPlaylistBuilderTitle) djPlaylistBuilderTitle.textContent = playlist?.name || "Main Playlist";
  if (djPlaylistBuilderCount) djPlaylistBuilderCount.textContent = String(stats.count);
  if (djPlaylistBuilderRuntime) djPlaylistBuilderRuntime.textContent = stats.runtimeLabel;
  if (djPlaylistBuilderPrepared) djPlaylistBuilderPrepared.textContent = `${stats.preparedPercent}%`;
  if (djPlaylistBuilderStatus) {
    djPlaylistBuilderStatus.textContent = stats.count
      ? `${stats.count} track${stats.count === 1 ? "" : "s"} ready to copy into the current Mix Setup DJ Set.`
      : "Use + on Collection tracks to build this playlist.";
  }
}

function renderCollectionPlanner() {
  const playlist = getActiveDjPlan("playlist");
  const set = getActiveDjPlan("set");
  const linkedSet = getLinkedDjSetForCurrentSetup();
  const activeMode = djMixerState.plannerMode === "set" ? "set" : "playlist";
  const setStats = getDjPlanStats(set);
  const linkedStats = getDjPlanStats(linkedSet);

  djPlannerModeButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.djPlannerMode === activeMode));
  djPlanPanels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.djPlanPanel === activeMode));
  if (djPlaylistTitle) djPlaylistTitle.innerHTML = `Playlist ${renderPlanSelect("playlist")}`;
  if (djSetTitle) djSetTitle.innerHTML = `DJ Set ${renderPlanSelect("set")}`;
  if (djPlaylistCount) djPlaylistCount.textContent = `${playlist.trackIds.length} track${playlist.trackIds.length === 1 ? "" : "s"}`;
  if (djSetCount) djSetCount.textContent = `${set.trackIds.length} track${set.trackIds.length === 1 ? "" : "s"} • ${setStats.runtimeLabel}`;
  if (djLinkedSetTitle) djLinkedSetTitle.textContent = linkedSet?.name || "Linked DJ Set";
  if (djLinkedSetCount) djLinkedSetCount.textContent = `${linkedSet?.trackIds?.length || 0} track${(linkedSet?.trackIds?.length || 0) === 1 ? "" : "s"} • ${linkedStats.runtimeLabel}`;
  if (djPlaylistList) djPlaylistList.innerHTML = playlist.trackIds.length ? playlist.trackIds.map((id, index) => renderPlanTrackRow("playlist", id, index)).join("") : `<div class="djPlanEmpty">Tap + on any track and choose a Playlist.</div>`;
  if (djSetList) djSetList.innerHTML = set.trackIds.length ? set.trackIds.map((id, index) => renderPlanTrackRow("set", id, index)).join("") : `<div class="djPlanEmpty">Tap + on tracks in the exact order for your DJ set.</div>`;
  if (djLinkedSetList) djLinkedSetList.innerHTML = linkedSet?.trackIds?.length ? linkedSet.trackIds.map((id, index) => renderPlanTrackRow("set", id, index)).join("") : `<div class="djPlanEmpty">Save Mix Setup, then tap + on Collection tracks to build this set.</div>`;

  updatePlaylistBuilderDashboard();
  updateStudioDashboard();
  updatePerformanceSetStrip();

  document.querySelectorAll("[data-dj-plan-select]").forEach((select) => {
    select.addEventListener("change", () => setActiveDjPlan(select.dataset.djPlanSelect || "playlist", select.value));
  });
  document.querySelectorAll("[data-dj-plan-row]").forEach((row) => {
    const kind = row.dataset.djPlanRow || "playlist";
    const index = Number(row.dataset.djPlanIndex || 0);
    const planId = row.dataset.djPlanId || "";
    const trackId = row.dataset.djPlanTrackId || "";
    row.querySelector('[data-dj-plan-move="up"]')?.addEventListener("click", () => moveTrackInDjPlan(kind, index, -1));
    row.querySelector('[data-dj-plan-move="down"]')?.addEventListener("click", () => moveTrackInDjPlan(kind, index, 1));
    row.querySelector("[data-dj-plan-role]")?.addEventListener("change", (event) => updatePlanTrackMeta(kind, planId, trackId, { role: event.target.value || "main" }));
    row.querySelector("[data-dj-plan-note]")?.addEventListener("change", (event) => updatePlanTrackMeta(kind, planId, trackId, { note: event.target.value || "" }));
    row.querySelectorAll("[data-dj-plan-load]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = getLibraryItemById(row.dataset.djPlanTrackId || "");
        if (item) loadDeck(button.dataset.djPlanLoad === "d2" ? "d2" : "d1", item);
      });
    });
    row.querySelector("[data-dj-plan-remove]")?.addEventListener("click", () => removeTrackFromDjPlan(kind, index));
  });
}

function openAddToListPopup(trackId = "") {
  const item = getLibraryItemById(trackId);
  if (!item) return;
  djMixerState.addToListTrackId = String(trackId);
  if (djAddToListTitle) djAddToListTitle.textContent = item.title || "Choose destination";
  if (djAddToListStatus) djAddToListStatus.textContent = "Add this track to a normal Playlist or the current Mix Setup DJ Set.";
  renderAddToListOptions();
  djAddToListPopup?.classList.remove("hidden");
  document.body.classList.add("djAddToListOpen");
}

function closeAddToListPopup() {
  djAddToListPopup?.classList.add("hidden");
  document.body.classList.remove("djAddToListOpen");
  djMixerState.addToListTrackId = "";
}

function openDjPlanPage(kind = "playlist") {
  const safeKind = kind === "set" ? "set" : "playlist";
  djMixerState.plannerMode = safeKind;
  renderCollectionPlanner();
  if (safeKind === "set") {
    djPlaylistPage?.classList.add("hidden");
    djSetPage?.classList.remove("hidden");
    djSetPage?.scrollTo?.({ top: 0, behavior: "auto" });
  } else {
    djSetPage?.classList.add("hidden");
    djPlaylistPage?.classList.remove("hidden");
    djPlaylistPage?.scrollTo?.({ top: 0, behavior: "auto" });
  }
  document.body.classList.add("djPlanPageOpen");
}

function closeDjPlanPage() {
  djPlaylistPage?.classList.add("hidden");
  djSetPage?.classList.add("hidden");
  document.body.classList.remove("djPlanPageOpen");
  renderCollectionPlanner();
}

function renderAddToListOptions() {
  if (!djAddToListOptions) return;
  const linkedSet = getLinkedDjSetForCurrentSetup();
  const renderButton = (kind, plan, extraClass = "") => `<button class="${extraClass}" type="button" data-dj-add-to-kind="${kind}" data-dj-add-to-plan="${escapeHtml(plan.id)}"><b>${escapeHtml(plan.name)}</b><span>${kind === "set" ? "DJ Set running order" : "Playlist"} · ${plan.trackIds.length} track${plan.trackIds.length === 1 ? "" : "s"}</span></button>`;
  const otherSets = getDjPlanList("set").filter((plan) => plan.id !== linkedSet?.id);
  djAddToListOptions.innerHTML = `
    <section><strong>Current Mix DJ Set</strong>${linkedSet ? renderButton("set", linkedSet, "is-linked-set") : ""}</section>
    <section><strong>Playlists</strong>${getDjPlanList("playlist").map((plan) => renderButton("playlist", plan)).join("")}</section>
    <section><strong>Other DJ Sets</strong>${otherSets.length ? otherSets.map((plan) => renderButton("set", plan)).join("") : `<em>No other DJ Sets yet.</em>`}</section>
  `;
  djAddToListOptions.querySelectorAll("[data-dj-add-to-kind]").forEach((button) => {
    button.addEventListener("click", () => {
      addTrackToDjPlan(button.dataset.djAddToKind || "playlist", button.dataset.djAddToPlan || "", djMixerState.addToListTrackId);
      closeAddToListPopup();
      renderDjLibrary();
    });
  });
}

function getCollectionStatusIconHtml(label, ready, { busy = false, title = "", type = "prep" } = {}) {
  const stateClass = busy ? "is-busy" : ready ? `is-ready is-${type}` : "is-missing";
  const symbol = busy ? "…" : ready ? "✓" : "×";
  return `<span class="djCollectionStatusIcon ${stateClass}" title="${escapeHtml(title || label)}"><b>${symbol}</b><em>${escapeHtml(label)}</em></span>`;
}

function renderTrackCard(item, { compact = false } = {}) {
  const itemId = String(item.id || "");
  const safeId = itemId.replace(/"/g, "&quot;");
  const artwork = getTrackArtwork(item);
  const played = djMixerState.playedTrackIds.has(itemId);
  const loadedD1 = String(djDeckState.d1.item?.id || "") === itemId;
  const loadedD2 = String(djDeckState.d2.item?.id || "") === itemId;
  const prepSummary = getTrackPrepSummary(item);
  const prep = prepSummary.prep || {};
  const analysed = prepSummary.waveformReady;
  const analysing = djMixerState.waveformAnalysingIds.has(itemId) || Boolean(prep.waveformAnalysing);
  const gridReady = prepSummary.gridReady;
  const gridLocked = Boolean(prep.gridLocked);
  const analysisReady = prepSummary.analysisReady;
  const bpmReady = prepSummary.bpmReady;
  const keyReady = prepSummary.keyReady;
  const fullyPrepared = prepSummary.prepared;
  const durationLabel = formatDuration(item.duration);
  const formatLabel = getTrackFormatLabel(item);
  const bpmLabel = Number(prep.detectedBpm || prep.bpm || getItemBpm(item) || 0);
  const keyLabel = getItemKeyLabel(item, prep);
  const artHtml = artwork
    ? `<img src="${escapeHtml(artwork)}" alt="" loading="lazy" />`
    : `<span>${escapeHtml((item.title || "?").slice(0, 1).toUpperCase())}</span>`;

  const deck1Locked = isDeckPlaying("d1");
  const deck2Locked = isDeckPlaying("d2");
  const loadedLabel = loadedD1 ? `<small class="djLoadedDeckBadge is-d1">D1</small>` : loadedD2 ? `<small class="djLoadedDeckBadge is-d2">D2</small>` : "";
  const sourceLabel = getItemSourceLabel(item);
  const statusHtml = `
    <div class="djCollectionStatusDots">
      ${getCollectionStatusIconHtml("W", analysed, { busy: analysing, type: "waveform", title: analysing ? "Waveform analysing" : analysed ? "Waveform ready" : "Waveform missing" })}
      ${getCollectionStatusIconHtml("B", bpmReady, { type: "analysis", title: bpmReady ? "BPM known" : "BPM missing" })}
      ${getCollectionStatusIconHtml("G", gridReady, { type: "grid", title: gridLocked ? "Grid locked" : gridReady ? "Grid ready" : "Grid not saved" })}
      ${getCollectionStatusIconHtml("K", keyReady, { type: "key", title: keyReady ? "Key known" : "Key missing" })}
      ${getCollectionStatusIconHtml("P", fullyPrepared, { type: "prepared", title: fullyPrepared ? "Prepared" : "Not fully prepared" })}
    </div>`;

  if (compact) {
    return `
      <article class="djLibraryTrackCard djLibraryTrackCardPro is-compact${played ? " is-played" : ""}${loadedD1 ? " is-loaded-d1" : ""}${loadedD2 ? " is-loaded-d2" : ""}" data-dj-library-id="${safeId}">
        <div class="djLibraryArtwork">${artHtml}</div>
        <div class="djLibraryTrackMain">
          <strong title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</strong>
          <span class="djLibraryTrackArtist">${escapeHtml(item.artist || "Unknown artist")}</span>
          <span class="djLibraryTrackMetaLine">${durationLabel} · ${formatLabel} · BPM ${bpmLabel ? bpmLabel.toFixed(1) : "—"} · ${escapeHtml(sourceLabel)}</span>
          ${statusHtml}
        </div>
        <div class="djLibraryCompactActions">
          ${loadedLabel}
          <button class="djAddTrackBtn djCollectionIconBtn" type="button" title="Add to Playlist or DJ Set" data-dj-add-track="${safeId}">+</button>
          <button class="djAnalyseTrackBtn djCollectionIconBtn" type="button" title="${analysed ? "Reanalyse" : "Analyse"}" data-dj-analyse-track="${safeId}"${analysing ? " disabled" : ""}><i class="fa-solid fa-chart-simple"></i></button>
          <button class="djPrepActionBtn djCollectionIconBtn" type="button" title="Open Grid Prep" data-dj-prep-action="grid" data-dj-prep-track="${safeId}">Grid</button>
          <button class="djLibraryDeckBtn is-d1 djCollectionIconBtn" type="button" title="Load Deck 1" data-dj-load-card="d1"${deck1Locked ? " disabled" : ""}>D1</button>
          <button class="djLibraryDeckBtn is-d2 djCollectionIconBtn" type="button" title="Load Deck 2" data-dj-load-card="d2"${deck2Locked ? " disabled" : ""}>D2</button>
        </div>
      </article>
    `;
  }

  return `
    <article class="djLibraryTrackCard djLibraryTrackCardPro${played ? " is-played" : ""}${loadedD1 ? " is-loaded-d1" : ""}${loadedD2 ? " is-loaded-d2" : ""}${fullyPrepared ? " is-prepared" : ""}${item.isLongMix ? " is-long-mix" : ""}" data-dj-library-id="${safeId}">
      <div class="djLibraryArtwork">${artHtml}</div>
      <div class="djLibraryTrackMain">
        <strong title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</strong>
        <span class="djLibraryTrackArtist">${escapeHtml(item.artist || "Unknown artist")}</span>
        <span class="djLibraryTrackMetaLine">${durationLabel} · ${formatLabel} · BPM ${bpmLabel ? bpmLabel.toFixed(1) : "—"} · Key ${escapeHtml(keyLabel)} · ${escapeHtml(sourceLabel)}</span>
        ${statusHtml}
      </div>
      <div class="djLibraryTrackActions djLibraryTrackActionsPro">
        ${loadedLabel}
        <button class="djAddTrackBtn djCollectionIconBtn" type="button" title="Add to Playlist or DJ Set" data-dj-add-track="${safeId}">+</button>
        <button class="djAnalyseTrackBtn djCollectionIconBtn" type="button" title="${analysed ? "Reanalyse" : "Analyse"}" data-dj-analyse-track="${safeId}"${analysing ? " disabled" : ""}><i class="fa-solid fa-chart-simple"></i><span>Analyse</span></button>
        <button class="djPrepActionBtn djCollectionIconBtn" type="button" title="Open Grid Prep" data-dj-prep-action="grid" data-dj-prep-track="${safeId}">Grid</button>
        <button class="djPrepActionBtn djCollectionIconBtn" type="button" title="Mark Prepared" data-dj-prep-action="mark" data-dj-prep-track="${safeId}">Prep</button>
        <button class="djPrepActionBtn djCollectionIconBtn" type="button" title="Reset Prep" data-dj-prep-action="reset" data-dj-prep-track="${safeId}">Reset</button>
        <button class="djLibraryDeckBtn is-d1 djCollectionIconBtn" type="button" title="Load Deck 1" data-dj-load-card="d1"${deck1Locked ? " disabled" : ""}>D1</button>
        <button class="djLibraryDeckBtn is-d2 djCollectionIconBtn" type="button" title="Load Deck 2" data-dj-load-card="d2"${deck2Locked ? " disabled" : ""}>D2</button>
      </div>
    </article>
  `;
}

function forgetTrackPrep(item = {}) {
  const id = getTrackPrepId(item);
  if (!id) return;
  const prepCache = readTrackPrepCache();
  const analysisCache = readTrackAnalysisCache();
  const gridCache = readTrackGridCache();
  delete prepCache[id];
  delete analysisCache[id];
  delete gridCache[getTrackGridId(item)];
  writeTrackPrepCache(prepCache);
  writeTrackAnalysisCache(analysisCache);
  writeTrackGridCache(gridCache);
  djMixerState.trackPrepById.delete(id);
  djMixerState.trackAnalysisById.delete(id);
  djMixerState.waveformCachedIds.delete(id);
  djMixerState.waveformAnalysingIds.delete(id);
  void deleteServerPrepRecord(item);
}

function markTrackPrepared(item = {}) {
  if (!item?.id) return;
  const bpm = getItemBpm(item) || getTrackPrepStatusForItem(item)?.bpm || 170;
  const existing = getTrackPrepStatusForItem(item) || {};
  rememberTrackPrep(item, {
    waveformReady: true,
    analysisReady: true,
    detectedBpm: Number(existing.detectedBpm || bpm || 170),
    bpmConfidence: Math.max(Number(existing.bpmConfidence || 0), 0.65),
    gridReady: true,
    gridLocked: Boolean(existing.gridLocked),
    keyReadyManual: !isTrackKeyMissing(item, existing),
    preparedOverride: true,
    manuallyPreparedAt: Date.now(),
  });
  djMixerState.waveformCachedIds.add(String(item.id));
}

function openTrackGridPrep(item = {}) {
  if (!item?.id) return;
  const targetDeck = isDeckPlaying("d1") && !isDeckPlaying("d2") ? "d2" : "d1";
  const loaded = loadDeck(targetDeck, item);
  if (loaded) {
    djMixerState.bpmEditDeck = targetDeck;
    setPerformanceDeck({ dataset: { djDeckTab: targetDeck === "d2" ? "deck2" : "deck1" } });
    setSingleDeckTab("grid");
    closeDjLibraryPanel();
    if (djAnalyseStatus) djAnalyseStatus.textContent = `Opened Grid Prep for ${item.title || "track"}.`;
  }
}

function handleCollectionPrepAction(action = "grid", item = {}) {
  if (!item?.id) return;
  if (action === "reset") {
    if (!window.confirm(`Reset prep data for ${item.title || "this track"}?`)) return;
    forgetTrackPrep(item);
    if (djAnalyseStatus) djAnalyseStatus.textContent = `Prep reset for ${item.title || "track"}.`;
  } else if (action === "mark") {
    markTrackPrepared(item);
    if (djAnalyseStatus) djAnalyseStatus.textContent = `${item.title || "Track"} marked prepared.`;
  } else {
    openTrackGridPrep(item);
    return;
  }
  updateDjPrepDashboard();
  renderDjLibrary();
}

function renderDjLibrary() {
  if (!djLibraryList) return;

  const rawItems = getDjLibraryItems({ raw: true });
  updateCollectionFilterOptions(rawItems);
  const items = getDjLibraryItems();
  const sessionItems = getSessionLibraryItems(rawItems);
  updateLibraryTargetUi();
  updateDjCollectionMiniPlayer();
  renderCollectionPlanner();
  updateDjPrepDashboard(rawItems);

  if (djCollectionTrackCount) {
    const hidden = Math.max(0, rawItems.length - items.length);
    djCollectionTrackCount.textContent = `${items.length}/${rawItems.length} track${rawItems.length === 1 ? "" : "s"}${hidden ? ` • ${hidden} hidden` : ""}`;
  }

  if (djLibraryStatus) {
    const lockedText = ["d1", "d2"].filter(isDeckPlaying).map((deck) => deck === "d1" ? "Deck 1" : "Deck 2");
    const filterBits = [];
    if (!djMixerState.collectionFilters.includeLong) filterBits.push("short only");
    if (djMixerState.collectionFilters.preparedOnly) filterBits.push("prepared only");
    if (djMixerState.collectionFilters.needsPrepOnly) filterBits.push("needs prep");
    if (djMixerState.collectionFilters.bpmMissingOnly) filterBits.push("BPM missing");
    if (djMixerState.collectionFilters.gridMissingOnly) filterBits.push("grid missing");
    if (djMixerState.collectionFilters.keyMissingOnly) filterBits.push("key missing");
    if (djMixerState.collectionFilters.loadedOnly) filterBits.push("loaded/played");
    djLibraryStatus.textContent = items.length
      ? `${items.length} shown from ${rawItems.length} tracks${filterBits.length ? ` • ${filterBits.join(" • ")}` : ""}.${lockedText.length ? ` ${lockedText.join(" and ")} locked while playing.` : " Use each row's A / D1 / D2 buttons."}`
      : "No tracks match the current filters. Reset filters or add more DJ sources.";
  }

  const sessionHtml = sessionItems.length
    ? `<section class="djLibrarySetPlanShelf is-active is-pro-compact">
        <div class="djLibrarySetPlanHead"><strong>Current set / already loaded</strong><span>${sessionItems.length} track${sessionItems.length === 1 ? "" : "s"}</span></div>
        <div class="djLibrarySetPlanScroller">${sessionItems.map((item) => renderTrackCard(item, { compact: true })).join("")}</div>
      </section>`
    : `<section class="djLibrarySetPlanShelf is-empty is-compact-empty">
        <strong>Current set / organised tracklist</strong>
        <span>Loaded tracks will appear here once Deck 1 or Deck 2 is chosen.</span>
      </section>`;

  const libraryHtml = items.length
    ? items.map((item) => renderTrackCard(item)).join("")
    : `<div class="djLibraryEmpty">No tracks match this Collection view. Tap Reset Filters or add more DJ folders in Universal Settings → DJ Sources.</div>`;

  djLibraryList.innerHTML = `${sessionHtml}${libraryHtml}`;

  function loadLibraryCard(card, targetDeck) {
    const id = String(card?.dataset.djLibraryId || "");
    const item =
      items.find((entry) => String(entry.id) === id) ||
      rawItems.find((entry) => String(entry.id) === id) ||
      djMixerState.libraryItems.find((entry) => String(entry.id) === id) ||
      getLibraryItemById(id);

    const deck = targetDeck === "d2" ? "d2" : "d1";

    if (!item?.id) {
      if (djLibraryStatus) djLibraryStatus.textContent = "Could not find that track in the current DJ Collection. Tap Refresh and try again.";
      return;
    }

    const loaded = loadDeck(deck, item);

    if (loaded) {
      if (djLibraryStatus) djLibraryStatus.textContent = `Loaded into ${deck === "d2" ? "Deck 2" : "Deck 1"}.`;
      renderDjLibrary();
      updateDjCollectionMiniPlayer();
      closeDjLibraryPanel();
      drawAllWaveforms();

      if (performanceShell && !performanceShell.classList.contains("hidden")) {
        setPerformanceDeck({ dataset: { djDeckTab: deck === "d2" ? "deck2" : "deck1" } });
      }
    }
  }
	
  djLibraryList.querySelectorAll("[data-dj-add-track]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openAddToListPopup(button.dataset.djAddTrack || "");
    });
  });

  djLibraryList.querySelectorAll("[data-dj-analyse-track]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const item = items.find((entry) => String(entry.id) === String(button.dataset.djAnalyseTrack));
      if (djAnalyseStatus && item?.title) djAnalyseStatus.textContent = `Analysing ${item.title}…`;
      void analyseLibraryItem(item, { force: true }).then((peaks) => {
        if (peaks) applyWaveformToLoadedDecks(item, peaks, { status: "ready", label: "reanalysed peaks" });
        if (djAnalyseStatus && item?.title) djAnalyseStatus.textContent = peaks ? `Waveform ready for ${item.title}.` : `Waveform failed for ${item.title}.`;
      });
    });
  });
	
  djLibraryList.querySelectorAll("[data-dj-prep-action]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const id = button.dataset.djPrepTrack || button.closest("[data-dj-library-id]")?.dataset.djLibraryId || "";
      const item = rawItems.find((entry) => String(entry.id) === String(id)) || items.find((entry) => String(entry.id) === String(id));
      handleCollectionPrepAction(button.dataset.djPrepAction || "grid", item);
    });
  });

  djLibraryList.querySelectorAll("[data-dj-load-card]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      loadLibraryCard(button.closest("[data-dj-library-id]"), button.dataset.djLoadCard || pendingLoadDeck);
    });
  });
}

async function refreshWaveformHealth() {
  try {
    const res = await fetch(`/waveforms/health?count=${DJ_WAVEFORM_PEAK_COUNT}`, { cache: "no-store" });
    if (!res.ok) return null;

    const data = await res.json();
    const cachedTrackIds = Array.isArray(data.cachedTrackIds) ? data.cachedTrackIds.map(String) : [];

    cachedTrackIds.forEach((id) => {
      djMixerState.waveformCachedIds.add(id);
      const item = djMixerState.libraryItems.find((entry) => String(entry.id) === id);
      if (item) rememberTrackPrep(item, { waveformReady: true, waveformAnalysing: false });
    });
    if (Array.isArray(data.failedTrackIds)) {
      data.failedTrackIds.map(String).forEach((id) => {
        djMixerState.waveformAnalysingIds.delete(id);
        const item = djMixerState.libraryItems.find((entry) => String(entry.id) === id);
        if (item) rememberTrackPrep(item, { waveformAnalysing: false, waveformFailed: true });
      });
    }

    if (djAnalyseStatus) {
      const cached = Number(data.cached || cachedTrackIds.length || 0);
      const total = Number(data.total || 0);
      const missing = Math.max(0, Number(data.missing || 0));
      const failed = Number(data.failed || 0);
      djAnalyseStatus.textContent = `Waveforms: ${cached} ready / ${total} tracks${missing ? ` • ${missing} missing` : ""}${failed ? ` • ${failed} failed` : ""}.`;
    }

    renderDjLibrary();
    return data;
  } catch (err) {
    console.warn("Waveform health unavailable", err);
    return null;
  }
}

async function loadDjLibrary() {
  if (djLibraryStatus) djLibraryStatus.textContent = "Loading BRMedia audio library…";

  try {
    const res = await fetch("/library", { cache: "no-store" });
    if (!res.ok) throw new Error(`Library request failed: ${res.status}`);

    const data = await res.json();
    djMixerState.libraryItems = Array.isArray(data.items) ? data.items : [];
    djMixerState.libraryLoaded = true;
    await loadServerDjPrepCache({ silent: true });
    void refreshWaveformHealth();
  } catch (err) {
    console.warn("DJ library unavailable", err);
    djMixerState.libraryItems = [];

    if (djLibraryStatus) djLibraryStatus.textContent = "Could not load BRMedia library.";
  }

  renderDjLibrary();
}

async function refreshLoadedDeckCachedWaveforms() {
  await refreshWaveformHealth();

  ["d1", "d2"].forEach((deck) => {
    const item = djDeckState[deck]?.item;
    const id = getTrackWaveformId(item);
    if (!id || !djMixerState.waveformCachedIds.has(id)) return;
    if (getRememberedWaveformForItem(item)) return;
    void analyseDeckWaveform(deck);
  });
}

async function startWaveformJob({ force = false } = {}) {
  if (djAnalyseStatus) djAnalyseStatus.textContent = force ? "Reanalysing all DJ tracks…" : "Analysing missing DJ track waveforms…";

  try {
    const response = await fetch("/waveforms/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "all", count: DJ_WAVEFORM_PEAK_COUNT, force }),
    });

    if (!response.ok) throw new Error(`Waveform job failed ${response.status}`);

    const job = await response.json();
    pollWaveformJob(job.id);
  } catch (err) {
    console.warn("Waveform job start failed", err);
    if (djAnalyseStatus) djAnalyseStatus.textContent = "Could not start waveform analysis job.";
  }
}

async function pollWaveformJob(jobId) {
  if (!jobId) return;

  try {
    const response = await fetch(`/waveforms/jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Waveform job poll failed ${response.status}`);

    const job = await response.json();
    const total = Number(job.total || 0);
    const processed = Number(job.processed || 0);

    (job.items || []).forEach((item) => {
      const id = String(item.id);
      const libraryItem = djMixerState.libraryItems.find((entry) => String(entry.id) === id);
      if (["generated", "skipped"].includes(item.status)) {
        djMixerState.waveformCachedIds.add(id);
        if (libraryItem) rememberTrackPrep(libraryItem, { waveformReady: true, waveformAnalysing: false });
      }
      if (item.status === "processing" || item.status === "queued") {
        djMixerState.waveformAnalysingIds.add(id);
        if (libraryItem) rememberTrackPrep(libraryItem, { waveformAnalysing: true });
      } else {
        djMixerState.waveformAnalysingIds.delete(id);
      }
    });

    if (djAnalyseStatus) {
      djAnalyseStatus.textContent = `Analysing waveforms ${processed}/${total} • ready ${Number(job.generated || 0) + Number(job.skipped || 0)} • failed ${Number(job.failed || 0)}`;
    }

    renderDjLibrary();

    if (job.status === "running") {
      window.setTimeout(() => pollWaveformJob(jobId), 1200);
      return;
    }

    if (djAnalyseStatus) djAnalyseStatus.textContent = `Waveform job complete • ready ${Number(job.generated || 0) + Number(job.skipped || 0)} • failed ${Number(job.failed || 0)}`;
    void refreshLoadedDeckCachedWaveforms();
  } catch (err) {
    console.warn("Waveform job poll failed", err);
    if (djAnalyseStatus) djAnalyseStatus.textContent = "Waveform job status unavailable.";
  }
}

function openDjLibraryPanel(target = "d1") {
  closeDjPlanPage();
  markAndroidDeviceClass();
  if (isAndroidBrowser()) forceDarkRenderSurface();
  pendingLoadDeck = getSafeLibraryTarget(target);
  djLibraryPanel?.classList.remove("hidden");
  djLibraryPanel?.style.setProperty("display", "block");
  document.body.classList.add("djCollectionOpen");
  document.documentElement.classList.toggle("djAndroidCollectionSafe", isAndroidBrowser());
  document.body.classList.toggle("djAndroidCollectionSafe", isAndroidBrowser());
  updateLibraryTargetUi();

  if (!djMixerState.libraryLoaded) {
    void loadDjLibrary();
  } else {
    renderDjLibrary();
  }

  djLibraryPanel?.scrollTo?.({ top: 0, behavior: "auto" });
}

function closeDjLibraryPanel() {
  djLibraryPanel?.classList.add("hidden");
  djLibraryPanel?.style.removeProperty("display");
  document.body.classList.remove("djCollectionOpen", "djAndroidCollectionSafe");
  document.documentElement.classList.remove("djAndroidCollectionSafe");
  updateDjCollectionMiniPlayer();
}

function isStemEngineActive(deck) {
  const stems = djMixerState.stemCutByDeck?.[deck] || {};
  return ["drums", "bass", "harmonic", "vocals"].some((stem) => Number(stems[stem] ?? 1) < 0.995);
}

function applyDeckStemEngine(deck) {
  const node = djAudioGraph.nodes?.[deck];
  if (!node || !djAudioGraph.ctx) return;
  const now = djAudioGraph.ctx.currentTime;
  const stems = djMixerState.stemCutByDeck?.[deck] || {};
  const active = isStemEngineActive(deck);
  const values = {
    drums: Math.max(0, Math.min(1, Number(stems.drums ?? 1))),
    bass: Math.max(0, Math.min(1, Number(stems.bass ?? 1))),
    harmonic: Math.max(0, Math.min(1, Number(stems.harmonic ?? 1))),
    vocals: Math.max(0, Math.min(1, Number(stems.vocals ?? 1))),
  };

  node.stemBypassGain?.gain.setTargetAtTime(active ? 0 : 1, now, 0.018);
  node.stemMixGain?.gain.setTargetAtTime(active ? 1 : 0, now, 0.018);
  node.stemBassGain?.gain.setTargetAtTime(active ? values.bass * 0.95 : 0, now, 0.018);
  node.stemDrumsGain?.gain.setTargetAtTime(active ? values.drums * 0.36 : 0, now, 0.018);
  node.stemHarmonicGain?.gain.setTargetAtTime(active ? values.harmonic * 0.74 : 0, now, 0.018);
  node.stemVocalsGain?.gain.setTargetAtTime(active ? values.vocals * 0.56 : 0, now, 0.018);
}

function getDeckEqTrim(target) {
  const eq = djDeckState[target]?.eq || {};
  const values = [eq.high, eq.mid, eq.low].map((value) => clampEqPercent(value, 100) / 100);
  const average = values.reduce((total, value) => total + value, 0) / values.length;
  return Math.max(0, Math.min(1.5, average));
}

function isDjRecordingActive() {
  return djMixerState.recordState === "recording" || djMixerState.recordState === "countdown" || Boolean(djMixerState.recordMediaRecorder);
}

function deckHasActiveWebAudioFx(deck) {
  return Boolean(djMixerState.fxByDeck?.[deck]) || isStemEngineActive(deck) || Math.abs(Number(djDeckState[deck]?.filter ?? 50) - 50) > 1;
}

function isDualDeckMixingNeeded(deck = "") {
  const otherDeck = deck ? getOppositeDeck(deck) : "";
  return Boolean(
    isDjRecordingActive() ||
    djMixerState.forceWebAudioGraph ||
    (deck && isDeckPlaying(otherDeck)) ||
    (isDeckPlaying("d1") && isDeckPlaying("d2"))
  );
}

function shouldUseNativeBackgroundDeckAudio(deck) {
  if (!IS_IOS_BACKGROUND_AUDIO_MODE) return false;
  if (isDualDeckMixingNeeded(deck)) return false;
  if (djAudioGraph.nodes?.[deck]) return false;
  return !deckHasActiveWebAudioFx(deck);
}

function shouldUseWebAudioGraphForDeck(deck) {
  const audio = djAudio[deck];
  if (!audio?.src) return false;

  // Deck Engine A1: keep normal playback on the native <audio> path.
  // Web Audio is only for features that genuinely need it.
  if (isDjRecordingActive()) return true;
  if (deckHasActiveWebAudioFx(deck)) return true;

  return false;
}

function enableDualDeckMixingIfNeeded(deck = "") {
  if (!isDjRecordingActive()) {
    djMixerState.forceWebAudioGraph = false;
    applyDeckVolumes();
    return false;
  }

  djMixerState.forceWebAudioGraph = true;
  ["d1", "d2"].forEach((mixDeck) => {
    if (djAudio[mixDeck]?.src) ensureDeckAudioGraph(mixDeck);
  });
  void resumeDjAudioContextIfNeeded();
  return true;
}

function resumeDjAudioContextIfNeeded() {
  if (djAudioGraph.ctx?.state === "suspended") {
    return djAudioGraph.ctx.resume().catch((err) => console.warn("DJ AudioContext resume failed", err));
  }
  return Promise.resolve();
}

function updateNativeBackgroundModeClass() {
  // Keep the iOS native-audio behaviour, but never show the old "Background audio safe" badge.
  document.body.classList.remove(DJ_BACKGROUND_NATIVE_AUDIO_CLASS);
}

function getAudioContextClass() {
  return window.AudioContext || window.webkitAudioContext || null;
}

function ensureAudioContext() {
  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) return null;

  if (!djAudioGraph.ctx) djAudioGraph.ctx = new AudioContextClass();
  return djAudioGraph.ctx;
}

function ensureDeckAudioGraph(deck) {
  const audio = djAudio[deck];
  const ctx = ensureAudioContext();
  if (!audio || !ctx) return null;

  if (!djAudioGraph.nodes[deck]) {
    let source = null;
    try {
      source = ctx.createMediaElementSource(audio);
    } catch (err) {
      console.warn("DJ Web Audio source could not attach to deck", deck, err);
      return null;
    }

    const stemBypassGain = ctx.createGain();
    const stemMixGain = ctx.createGain();
    const stemBassFilter = ctx.createBiquadFilter();
    const stemDrumsFilter = ctx.createBiquadFilter();
    const stemHarmonicFilter = ctx.createBiquadFilter();
    const stemVocalsFilter = ctx.createBiquadFilter();
    const stemBassGain = ctx.createGain();
    const stemDrumsGain = ctx.createGain();
    const stemHarmonicGain = ctx.createGain();
    const stemVocalsGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const dryGain = ctx.createGain();
    const fxDelay = ctx.createDelay(2);
    const fxFeedback = ctx.createGain();
    const fxTone = ctx.createBiquadFilter();
    const fxWetGain = ctx.createGain();
    const gain = ctx.createGain();

    stemBypassGain.gain.value = 1;
    stemMixGain.gain.value = 0;
    stemBassFilter.type = "lowpass";
    stemBassFilter.frequency.value = 185;
    stemBassFilter.Q.value = 0.72;
    stemDrumsFilter.type = "highpass";
    stemDrumsFilter.frequency.value = 2600;
    stemDrumsFilter.Q.value = 0.62;
    stemHarmonicFilter.type = "bandpass";
    stemHarmonicFilter.frequency.value = 720;
    stemHarmonicFilter.Q.value = 0.82;
    stemVocalsFilter.type = "bandpass";
    stemVocalsFilter.frequency.value = 2250;
    stemVocalsFilter.Q.value = 1.12;
    stemBassGain.gain.value = 0;
    stemDrumsGain.gain.value = 0;
    stemHarmonicGain.gain.value = 0;
    stemVocalsGain.gain.value = 0;
    filter.type = "allpass";
    filter.frequency.value = 20000;
    dryGain.gain.value = 1;
    fxDelay.delayTime.value = 0.18;
    fxFeedback.gain.value = 0;
    fxTone.type = "lowpass";
    fxTone.frequency.value = 20000;
    fxWetGain.gain.value = 0;

    source.connect(stemBypassGain);
    stemBypassGain.connect(filter);
    source.connect(stemBassFilter);
    source.connect(stemDrumsFilter);
    source.connect(stemHarmonicFilter);
    source.connect(stemVocalsFilter);
    stemBassFilter.connect(stemBassGain);
    stemDrumsFilter.connect(stemDrumsGain);
    stemHarmonicFilter.connect(stemHarmonicGain);
    stemVocalsFilter.connect(stemVocalsGain);
    stemBassGain.connect(stemMixGain);
    stemDrumsGain.connect(stemMixGain);
    stemHarmonicGain.connect(stemMixGain);
    stemVocalsGain.connect(stemMixGain);
    stemMixGain.connect(filter);
    filter.connect(dryGain);
    dryGain.connect(gain);
    filter.connect(fxDelay);
    fxDelay.connect(fxFeedback);
    fxFeedback.connect(fxDelay);
    fxDelay.connect(fxTone);
    fxTone.connect(fxWetGain);
    fxWetGain.connect(gain);
    gain.connect(ctx.destination);

    djAudioGraph.nodes[deck] = { source, stemBypassGain, stemMixGain, stemBassFilter, stemDrumsFilter, stemHarmonicFilter, stemVocalsFilter, stemBassGain, stemDrumsGain, stemHarmonicGain, stemVocalsGain, filter, dryGain, fxDelay, fxFeedback, fxTone, fxWetGain, gain, recordConnected: false };
    connectDeckGainToRecordingDestination(djAudioGraph.nodes[deck]);
    audio.volume = 1;
  }

  applyDeckStemEngine(deck);
  return djAudioGraph.nodes[deck];
}

function connectDeckGainToRecordingDestination(node) {
  if (!node?.gain || !djAudioGraph.recordDestination || node.recordConnected) return;

  try {
    node.gain.connect(djAudioGraph.recordDestination);
    node.recordConnected = true;
  } catch (err) {
    console.warn("DJ recording bus connection failed", err);
  }
}

function ensureRecordingDestination() {
  const ctx = ensureAudioContext();
  if (!ctx || !ctx.createMediaStreamDestination) return null;

  if (!djAudioGraph.recordDestination) {
    djAudioGraph.recordDestination = ctx.createMediaStreamDestination();
  }

  Object.values(djAudioGraph.nodes || {}).forEach(connectDeckGainToRecordingDestination);
  return djAudioGraph.recordDestination;
}

function getRecordingTargetFormat(setup = readSetup()) {
  const format = String(setup.format || "wav").toLowerCase();
  return ["wav", "flac", "mp3"].includes(format) ? format : "wav";
}

function getSupportedRecordingMimeType(setup = readSetup()) {
  if (!window.MediaRecorder) return "";

  // Browser capture is the recovery/safety master. Final WAV/FLAC/MP3 handoff is prepared from this capture.
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac", "audio/ogg;codecs=opus", "audio/ogg"];
  return candidates.find((type) => MediaRecorder.isTypeSupported?.(type)) || "";
}

function getRecordingExtension(mimeType = "") {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("aac")) return "aac";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

function getFinalRecordingExtension(setup = readSetup()) {
  return getRecordingTargetFormat(setup);
}

function getRecordingBitrate(setup = readSetup()) {
  const format = getRecordingTargetFormat(setup);
  if (format === "mp3") return Math.max(64000, Math.min(320000, Number(setup.mp3Bitrate || 320) * 1000));
  if (format === "flac") return 1024000;
  return 1536000;
}

function getRecordingFinalQualityLabel(setup = readSetup()) {
  const sampleRate = Number.parseInt(setup.sampleRate, 10) || 48000;
  const sampleRateLabel = `${(sampleRate / 1000).toFixed(sampleRate % 1000 ? 1 : 0)}kHz`;
  const channels = CHANNEL_LABELS[setup.channels] || "Stereo";
  const format = getRecordingTargetFormat(setup).toUpperCase();

  if (format === "MP3") return `${format} ${setup.mp3Bitrate || "320"}kbps • ${channels} • ${sampleRateLabel}`;
  if (format === "FLAC") return `${format} ${setup.flacBitDepth || "24"}-bit • Level ${setup.flacCompression || "5"} • ${channels} • ${sampleRateLabel}`;
  return `${format} ${setup.wavBitDepth || "24"}-bit • ${channels} • ${sampleRateLabel}`;
}

function makeSafeRecordingFilename(setup = readSetup(), extension = "webm") {
  const title = String(setup.title || "BRMedia DJ Recording").trim() || "BRMedia DJ Recording";
  const date = new Date().toISOString().replace(/[:]/g, "-").slice(0, 19);
  return `${title} ${date}.${extension}`.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
}

function buildModuleUrl(modulePath = "/player", params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  return `${modulePath}${search.toString() ? `?${search.toString()}` : ""}`;
}

function readRecordingLog() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DJ_RECORDINGS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("DJ recording log read failed", err);
    return [];
  }
}

function writeRecordingLog(items = []) {
  try {
    localStorage.setItem(DJ_RECORDINGS_KEY, JSON.stringify(items.slice(0, 24)));
  } catch (err) {
    console.warn("DJ recording log save failed", err);
  }
}

function rememberRecordingEntry(entry) {
  const next = [entry, ...readRecordingLog().filter((item) => item.id !== entry.id)].slice(0, 24);
  writeRecordingLog(next);
  renderRecordingList();
}

function removeRecordingEntry(recordingId = "") {
  const item = readRecordingLog().find((entry) => String(entry.id) === String(recordingId));
  if (!item) return;
  const label = item.title || "this DJ show";
  if (!window.confirm(`Remove ${label} from Past Shows? This only removes the BRMedia list entry for now.`)) return;
  writeRecordingLog(readRecordingLog().filter((entry) => String(entry.id) !== String(recordingId)));
  renderRecordingList();
}

function clearRecordingLog() {
  const items = readRecordingLog();
  if (!items.length) return;
  if (!window.confirm("Clear the Past Shows list? This does not delete physical recording files.")) return;
  writeRecordingLog([]);
  renderRecordingList();
}

function getRecordingCardStatus(item = {}) {
  if (item.serverFinalised) return { label: "Final ready", className: "is-final" };
  if (item.needsFinalise || item.finaliseError) return { label: "Final pending", className: "is-pending" };
  if (item.captureDownloadUrl || item.filename) return { label: "Capture saved", className: "is-capture" };
  return { label: "Draft", className: "is-draft" };
}

function getRecordingLibraryTrackId(item = {}) {
  return String(item.libraryItemId || item.libraryItem?.id || item.libraryTrackId || "").trim();
}

function getRecordingModuleParams(item = {}) {
  const trackId = getRecordingLibraryTrackId(item);
  const params = {
    recordingId: item.serverRecordingId || item.id,
    title: item.title,
    source: "dj-mixer",
    finalFormat: item.finalFormat || item.format || "wav",
  };

  if (trackId) params.trackId = trackId;
  if (item.finalStreamUrl) params.streamUrl = item.finalStreamUrl;
  else if (item.finalDownloadUrl) params.streamUrl = item.finalDownloadUrl;

  return params;
}

async function syncServerRecordingLog() {
  try {
    const res = await fetch("/dj-mixer/recordings", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !Array.isArray(data?.recordings)) return;

    const local = readRecordingLog();
    const merged = [...data.recordings, ...local].reduce((list, item) => {
      if (!item?.id || list.some((entry) => String(entry.id) === String(item.id))) return list;
      list.push(item);
      return list;
    }, []);

    writeRecordingLog(merged);
    renderRecordingList();
    updateStudioDashboard();
  } catch (err) {
    console.warn("DJ recording server sync failed", err);
  }
}

function renderRecordingList() {
  if (!djRecordingList) return;

  const items = readRecordingLog();
  if (!items.length) {
    djRecordingList.innerHTML = `
      <div class="djEmptyState">
        <i class="fa-solid fa-file-audio"></i>
        <strong>No new DJ shows yet</strong>
        <span>Record a short test first. Saved shows will get Player, Mastering, Converter and Tagger handoff buttons here.</span>
      </div>
    `;
    return;
  }

  djRecordingList.innerHTML = items.map((item) => {
    const url = item.finalDownloadUrl || djMixerState.recordingDownloads.get(item.id) || item.captureDownloadUrl || "";
    const download = url
      ? `<a class="djRecordingDownloadBtn" href="${escapeHtml(url)}" download="${escapeHtml(item.serverFinalised ? (item.finalFilename || "BRMedia-DJ-recording.wav") : (item.filename || "BRMedia-DJ-recording.webm"))}">${item.serverFinalised ? "Download final" : "Download capture"}</a>`
      : `<span class="djRecordingDownloadBtn is-disabled">${item.needsFinalise ? "Waiting for finalise" : "Download unavailable"}</span>`;
    const status = getRecordingCardStatus(item);
    const finalParams = getRecordingModuleParams(item);
    const playerParams = {
      recordingId: item.serverRecordingId || item.id,
      title: item.title,
      source: "dj-mixer",
      finalFormat: item.finalFormat || item.format || "wav",
    };
    const libraryTrackId = getRecordingLibraryTrackId(item);
    const moduleReady = Boolean(libraryTrackId || item.finalStreamUrl || item.finalDownloadUrl);

    return `
      <article class="djRecordingCard djRecordingCardV2ZD ${status.className}">
        <div>
          <div class="djRecordingCardTopV2ZD">
            <strong>${escapeHtml(item.title || "BRMedia DJ Recording")}</strong>
            <b>${escapeHtml(status.label)}</b>
          </div>
          <span>${escapeHtml(item.artist || "Unknown DJ")} • ${escapeHtml(item.durationLabel || "--:--")} • capture ${escapeHtml(item.captureFormat || item.mimeType || "browser")}</span>
          <em>Target: ${escapeHtml(item.finalLabel || "WAV master")} • ${item.serverFinalised ? "Server final ready" : item.needsFinalise ? "Capture saved / final pending" : escapeHtml(item.createdLabel || "Saved this session")}</em>
          <div class="djRecordingHandoffMetaV2ZLM">
            <span><b>${escapeHtml(item.linkedSetName || "DJ Set")}</b><em>${Number(item.plannedTrackCount || item.trackCount || 0)} planned</em></span>
            <span><b>${escapeHtml(item.tracklistExportLabel || "Sidecars pending")}</b><em>${escapeHtml(item.tracklistTimestampSource || "Timestamp setup")}</em></span>
          </div>
          <small class="djRecordingSidecarNote">${escapeHtml(item.tracklistExportLabel || "Tracklist export pending")}${item.tracklistTimestampSource ? ` • ${escapeHtml(item.tracklistTimestampSource)}` : ""}${item.sidecars?.txtUrl ? ` • <a href="${escapeHtml(item.sidecars.txtUrl)}">TXT</a>` : ""}${item.sidecars?.timestampJsonUrl ? ` • <a href="${escapeHtml(item.sidecars.timestampJsonUrl)}">Timestamp JSON</a>` : ""}${item.sidecars?.sessionUrl ? ` • <a href="${escapeHtml(item.sidecars.sessionUrl)}">Session JSON</a>` : ""}</small>
          <div class="djRecordingModuleActions">
            <a href="${buildModuleUrl("/player", playerParams)}">Player</a>
            <a class="${libraryTrackId ? "" : "is-soft-disabled"}" href="${libraryTrackId ? buildModuleUrl("/mastering", finalParams) : "#"}" aria-disabled="${libraryTrackId ? "false" : "true"}">Mastering</a>
            <a class="${libraryTrackId ? "" : "is-soft-disabled"}" href="${libraryTrackId ? buildModuleUrl("/converter", finalParams) : "#"}" aria-disabled="${libraryTrackId ? "false" : "true"}">Converter</a>
            <a class="${libraryTrackId ? "" : "is-soft-disabled"}" href="${libraryTrackId ? buildModuleUrl("/tagger", finalParams) : "#"}" aria-disabled="${libraryTrackId ? "false" : "true"}">Tagger</a>
            <a href="${buildModuleUrl("/settings", { module: "cloud", tab: "files", recordingId: item.serverRecordingId || item.id })}">Files</a>
            <button type="button" class="djRecordingRemoveBtn" data-dj-recording-remove="${escapeHtml(item.id)}">Remove</button>
          </div>
        </div>
        ${download}
      </article>
    `;
  }).join("");

  djRecordingList.querySelectorAll("[data-dj-recording-remove]").forEach((button) => {
    button.addEventListener("click", () => removeRecordingEntry(button.dataset.djRecordingRemove || ""));
  });
}

function updateRecordStatusText(message) {
  if (!djRecBeacon) return;
  const span = djRecBeacon.querySelector("span");
  if (span && message) span.textContent = message;
}

function getRecordingTracklistPayload(setup = readSetup()) {
  const linkedSet = getLinkedDjSetForCurrentSetup();
  const plannedIds = Array.isArray(linkedSet?.trackIds) ? linkedSet.trackIds.map(String) : [];
  const loadedIds = djMixerState.sessionTrackIds.map(String);
  const orderedIds = [...plannedIds, ...loadedIds.filter((id) => !plannedIds.includes(id))];
  const seen = new Set();
  const tracks = [];

  orderedIds.forEach((id) => {
    if (seen.has(id)) return;
    const item = djMixerState.libraryItems.find((entry) => String(entry.id) === id)
      || [djDeckState.d1.item, djDeckState.d2.item].find((entry) => String(entry?.id || "") === id);
    if (!item) return;

    seen.add(id);
    const setMeta = linkedSet?.trackMeta?.[id] || {};
    const log = getSessionTrackLog(id);
    const timestampSource = setup.tracklistTimestampSource || "load-time";
    const seconds = timestampSource === "manual-later"
      ? 0
      : timestampSource === "cue-start"
        ? Number(log?.startedAtSeconds ?? log?.loadedAtSeconds ?? 0)
        : Number(log?.loadedAtSeconds ?? 0);

    tracks.push({
      id,
      title: item.title || "Unknown title",
      artist: item.artist || item.albumArtist || "Unknown artist",
      bpm: getItemBpm(item) || "",
      key: getItemKeyLabel(item),
      duration: Number(item.duration || 0),
      source: getItemSourceLabel(item),
      planned: plannedIds.includes(id),
      loaded: Boolean(log),
      role: setMeta.role || "main",
      note: setMeta.note || "",
      seconds,
      time: formatRecordingTimestamp(seconds),
      loadedAtSeconds: Number(log?.loadedAtSeconds ?? 0),
      startedAtSeconds: log?.startedAtSeconds === null || log?.startedAtSeconds === undefined ? null : Number(log.startedAtSeconds),
      deck: log?.deck || "",
    });
  });

  return {
    createdAt: Date.now(),
    masterDeck: djMixerState.masterDeck,
    setup: {
      title: setup.title || "",
      artist: setup.artist || "",
      series: setup.series || "",
      episode: setup.episode || "",
      genre: setup.genre || "",
      year: setup.year || "",
      format: getRecordingTargetFormat(setup),
      tracklistMode: setup.tracklistMode || "tracklist-info-timestamps",
      timestampSource: setup.tracklistTimestampSource || "load-time",
      sidecars: getTracklistExportLabel(setup),
    },
    linkedSet: linkedSet ? {
      id: linkedSet.id,
      name: linkedSet.name,
      ready: Boolean(linkedSet.ready),
      trackCount: plannedIds.length,
    } : null,
    trackCount: tracks.length,
    plannedTrackCount: plannedIds.length,
    loadedTrackCount: loadedIds.length,
    tracks: tracks.slice(0, 120),
  };
}

function stopBrowserRecording({ cancelled = false } = {}) {
  const recorder = djMixerState.recordMediaRecorder;

  window.clearInterval(djMixerState.recordUiTimer);
  djMixerState.recordUiTimer = 0;

  if (!recorder || recorder.state === "inactive") {
    djMixerState.recordState = "ready";
    updateRecordBeaconUi();
    return;
  }

  djMixerState.recordStopCancelled = cancelled;
  djMixerState.recordState = cancelled ? "ready" : "saving";
  updateRecordBeaconUi();
  recorder.stop();
}

async function finaliseRecordingOnServer(entry, blob, setup = readSetup()) {
  if (!entry || !blob) return entry;

  const params = new URLSearchParams();
  params.set("id", entry.id || `djrec-${Date.now()}`);
  params.set("name", entry.filename || "BRMedia-DJ-recording.webm");
  params.set("finalName", entry.finalFilename || "BRMedia-DJ-recording.wav");
  params.set("format", getRecordingTargetFormat(setup));
  params.set("title", entry.title || setup.title || "BRMedia DJ Recording");
  params.set("artist", entry.artist || setup.artist || "Upalnite");
  params.set("sampleRate", setup.sampleRate || "48000");
  params.set("channels", setup.channels || "stereo");
  params.set("wavBitDepth", setup.wavBitDepth || "24");
  params.set("flacBitDepth", setup.flacBitDepth || "24");
  params.set("flacCompression", setup.flacCompression || "5");
  params.set("mp3Bitrate", setup.mp3Bitrate || "320");
  params.set("durationSeconds", String(entry.durationSeconds || 0));
  const tracklistPayload = getRecordingTracklistPayload(setup);
  params.set("tracklist", JSON.stringify(tracklistPayload));
  const includeTimestamps = setup.tracklistMode !== "tracklist-info" && setup.saveTimestampJson !== "false";
  params.set("timestampSource", setup.tracklistTimestampSource || "load-time");
  params.set("saveTxt", setup.saveTxtTracklist === "false" ? "0" : "1");
  params.set("saveTimestampJson", includeTimestamps ? "1" : "0");
  params.set("saveSessionJson", setup.saveSessionJson === "false" ? "0" : "1");

  updateRecordStatusText("Finalising…");

  try {
    const res = await fetch(`/dj-mixer/recordings/finalise?${params.toString()}`, {
      method: "POST",
      headers: { "Content-Type": entry.mimeType || blob.type || "application/octet-stream" },
      body: blob,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) throw new Error(data?.error || `Finalise failed: ${res.status}`);

    const nextEntry = {
      ...entry,
      serverFinalised: true,
      needsFinalise: false,
      serverRecordingId: data.recording?.id || entry.id,
      finalFilename: data.recording?.finalFilename || entry.finalFilename,
      finalDownloadUrl: data.recording?.finalDownloadUrl || "",
      finalStreamUrl: data.recording?.finalStreamUrl || "",
      captureDownloadUrl: data.recording?.captureDownloadUrl || "",
      finalPath: data.recording?.finalPath || "",
      capturePath: data.recording?.capturePath || "",
      libraryItemId: data.recording?.libraryItemId || data.recording?.libraryItem?.id || "",
      libraryItem: data.recording?.libraryItem || null,
      sidecars: data.recording?.sidecars || {},
      linkedSetName: data.recording?.linkedSetName || tracklistPayload.linkedSet?.name || "",
      plannedTrackCount: data.recording?.plannedTrackCount ?? tracklistPayload.plannedTrackCount,
      loadedTrackCount: data.recording?.loadedTrackCount ?? tracklistPayload.loadedTrackCount,
      trackCount: data.recording?.trackCount ?? tracklistPayload.trackCount,
      tracklistExportLabel: getTracklistExportLabel(setup),
      tracklistTimestampSource: getTracklistTimestampLabel(setup),
    };

    rememberRecordingEntry(nextEntry);
    updateRecordStatusText("Final ready");
    return nextEntry;
  } catch (err) {
    console.warn("DJ recording server finalise failed", err);
    updateRecordStatusText("Saved capture");
    rememberRecordingEntry({ ...entry, finaliseError: String(err?.message || err), needsFinalise: true });
    return entry;
  }
}

function startBrowserRecording() {
  const setup = readSetup();
  djMixerState.forceWebAudioGraph = true;
  updateNativeBackgroundModeClass();
  const destination = ensureRecordingDestination();

  if (!destination || !window.MediaRecorder) {
    djMixerState.recordState = "ready";
    updateRecordBeaconUi();
    updateRecordStatusText("No recorder");
    return false;
  }

  ["d1", "d2"].forEach((deck) => {
    if (djAudio[deck]?.src) ensureDeckAudioGraph(deck);
  });
  Object.values(djAudioGraph.nodes || {}).forEach(connectDeckGainToRecordingDestination);
  applyDeckVolumes();

  const mimeType = getSupportedRecordingMimeType(setup);
  const options = mimeType ? { mimeType, audioBitsPerSecond: getRecordingBitrate(setup) } : { audioBitsPerSecond: getRecordingBitrate(setup) };

  try {
    djMixerState.recordChunks = [];
    const recorder = new MediaRecorder(destination.stream, options);
    const startedAt = Date.now();
    const extension = getRecordingExtension(recorder.mimeType || mimeType);
    const finalExtension = getFinalRecordingExtension(setup);
    const filename = makeSafeRecordingFilename(setup, extension);
    const finalFilename = makeSafeRecordingFilename(setup, finalExtension);

    djMixerState.currentRecordingMeta = {
      id: `djrec-${startedAt}`,
      title: String(setup.title || "BRMedia DJ Recording").trim() || "BRMedia DJ Recording",
      artist: String(setup.artist || "Upalnite").trim() || "Upalnite",
      filename,
      finalFilename,
      finalFormat: getRecordingTargetFormat(setup),
      finalLabel: getRecordingFinalQualityLabel(setup),
      saveBehaviour: setup.saveBehaviour || "keep-wav-copy",
      destination: setup.destination || "DJ Recordings",
      tracklistExportLabel: getTracklistExportLabel(setup),
      tracklistTimestampSource: getTracklistTimestampLabel(setup),
      linkedSetName: getLinkedDjSetForCurrentSetup()?.name || "",
      plannedTrackCount: getLinkedDjSetForCurrentSetup()?.trackIds?.length || 0,
      loadedTrackCount: djMixerState.sessionTrackIds.length,
      captureFormat: extension.toUpperCase(),
      mimeType: recorder.mimeType || mimeType || "audio/webm",
      startedAt,
      createdLabel: new Date(startedAt).toLocaleString(),
    };

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size > 0) djMixerState.recordChunks.push(event.data);
    });

    recorder.addEventListener("stop", () => {
      const meta = djMixerState.currentRecordingMeta || {};
      const chunks = djMixerState.recordChunks || [];
      const durationSeconds = Math.max(0, Math.floor((Date.now() - Number(meta.startedAt || Date.now())) / 1000));

      djMixerState.recordMediaRecorder = null;
      djMixerState.recordState = "ready";
      djMixerState.recordStartedAt = 0;
      djMixerState.forceWebAudioGraph = false;
      updateNativeBackgroundModeClass();
      updateRecordBeaconUi();

      if (djMixerState.recordStopCancelled || !chunks.length) {
        djMixerState.recordStopCancelled = false;
        updateRecordStatusText("Cancelled");
        return;
      }

      const blob = new Blob(chunks, { type: meta.mimeType || "audio/webm" });
      const url = URL.createObjectURL(blob);
      const entry = {
        ...meta,
        bytes: blob.size,
        durationSeconds,
        durationLabel: formatDeckClock(durationSeconds),
        savedAt: Date.now(),
        needsFinalise: true,
      };

      djMixerState.recordingDownloads.set(entry.id, url);
      rememberRecordingEntry(entry);
      updateRecordStatusText("Saved capture");

      void finaliseRecordingOnServer(entry, blob, setup).then((finalEntry) => {
        if (finalEntry?.serverFinalised) return;
        const link = document.createElement("a");
        link.href = url;
        link.download = entry.filename || "BRMedia-DJ-recording.webm";
        document.body.appendChild(link);
        link.click();
        link.remove();
      });
    });

    recorder.start(1000);
    djMixerState.recordMediaRecorder = recorder;
    djMixerState.recordState = "recording";
    djMixerState.recordStartedAt = startedAt;
    updateRecordBeaconUi();
    window.clearInterval(djMixerState.recordUiTimer);
    djMixerState.recordUiTimer = window.setInterval(updateRecordBeaconUi, 1000);
    return true;
  } catch (err) {
    console.warn("DJ browser recording start failed", err);
    djMixerState.recordMediaRecorder = null;
    djMixerState.recordState = "ready";
    djMixerState.forceWebAudioGraph = false;
    updateNativeBackgroundModeClass();
    updateRecordBeaconUi();
    updateRecordStatusText("Record blocked");
    return false;
  }
}

function normaliseFxName(name = "") {
  return String(name || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function getFxSettings(effectName, wet = 0.65) {
  const effect = normaliseFxName(effectName);
  const amount = Math.max(0, Math.min(1, Number(wet || 0)));

  const bpm = Number(djMixerState.bpmByDeck?.[djMixerState.masterDeck || "d1"] || 170);
  const beat = 60 / Math.max(60, bpm);

  const presets = {
    echo: { delay: beat / 2, feedback: 0.64, tone: "lowpass", frequency: 7600, wet: Math.min(1, amount * 1.22) },
    delay: { delay: beat, feedback: 0.54, tone: "lowpass", frequency: 8600, wet: Math.min(1, amount * 1.16) },
    reverb: { delay: 0.118, feedback: 0.82, tone: "lowpass", frequency: 6200, wet: Math.min(1, amount * 1.14) },
    flanger: { delay: 0.012, feedback: 0.78, tone: "allpass", frequency: 20000, wet: Math.min(1, amount * 1.08) },
    phaser: { delay: 0.021, feedback: 0.76, tone: "bandpass", frequency: 1350, wet: Math.min(1, amount * 1.02) },
    roll: { delay: beat / 8, feedback: 0.88, tone: "lowpass", frequency: 9800, wet: Math.min(1, amount * 1.26) },
    crush: { delay: 0.008, feedback: 0.38, tone: "lowpass", frequency: 1450, wet: Math.min(1, amount * 1.02) },
    noise: { delay: 0.034, feedback: 0.84, tone: "highpass", frequency: 900, wet: Math.min(1, amount * 1.18) },
    gate: { delay: beat / 16, feedback: 0.24, tone: "bandpass", frequency: 2050, wet: Math.min(1, amount * 0.86) },
    filter: { delay: 0.008, feedback: 0.16, tone: "highpass", frequency: 1280, wet: Math.min(1, amount * 0.82) },
    spiral: { delay: beat * 0.75, feedback: 0.88, tone: "lowpass", frequency: 7200, wet: Math.min(1, amount * 1.22) },
    brake: { delay: 0.022, feedback: 0.42, tone: "lowpass", frequency: 2200, wet: Math.min(1, amount * 1.00) },
    "dub-echo": { delay: beat * 0.75, feedback: 0.88, tone: "lowpass", frequency: 4700, wet: Math.min(1, amount * 1.25) },
    build: { delay: 0.045, feedback: 0.88, tone: "highpass", frequency: 1150, wet: Math.min(1, amount * 1.18) },
    drop: { delay: 0.014, feedback: 0.70, tone: "lowpass", frequency: 1750, wet: Math.min(1, amount * 1.16) },
    wash: { delay: beat / 2, feedback: 0.92, tone: "lowpass", frequency: 3900, wet: Math.min(1, amount * 1.22) },
    trans: { delay: beat / 32, feedback: 0.18, tone: "bandpass", frequency: 2400, wet: Math.min(1, amount * 0.92) },
    sweep: { delay: 0.016, feedback: 0.52, tone: "bandpass", frequency: 1650, wet: Math.min(1, amount * 1.04) },
    jet: { delay: 0.010, feedback: 0.86, tone: "allpass", frequency: 20000, wet: Math.min(1, amount * 1.14) },
    "slip-roll": { delay: beat / 16, feedback: 0.92, tone: "lowpass", frequency: 8400, wet: Math.min(1, amount * 1.18) },
    "vinyl-stop": { delay: 0.026, feedback: 0.48, tone: "lowpass", frequency: 1650, wet: Math.min(1, amount * 1.02) },
    riser: { delay: beat / 4, feedback: 0.90, tone: "highpass", frequency: 1500, wet: Math.min(1, amount * 1.20) },
    space: { delay: beat, feedback: 0.94, tone: "lowpass", frequency: 5200, wet: Math.min(1, amount * 1.28) },
    laser: { delay: 0.006, feedback: 0.72, tone: "bandpass", frequency: 3200, wet: Math.min(1, amount * 1.10) },
  };

  return presets[effect] || { delay: 0.18, feedback: 0, tone: "allpass", frequency: 20000, wet: 0 };
}

function applyDeckFx(deck) {
  const node = djAudioGraph.nodes[deck];
  if (!node || !djAudioGraph.ctx) return;

  const effect = djMixerState.fxByDeck?.[deck] || "";
  const settings = getFxSettings(effect, djMixerState.fxWetByDeck?.[deck] ?? 0.35);
  const now = djAudioGraph.ctx.currentTime;

  node.fxDelay.delayTime.setTargetAtTime(settings.delay, now, 0.018);
  node.fxFeedback.gain.setTargetAtTime(settings.feedback, now, 0.018);
  node.fxTone.type = settings.tone;
  node.fxTone.frequency.setTargetAtTime(settings.frequency, now, 0.018);
  node.fxWetGain.gain.setTargetAtTime(effect ? settings.wet : 0, now, 0.012);
}

function setAudioPreservePitch(audio, shouldPreserve) {
  if (!audio) return;
  audio.preservesPitch = shouldPreserve;
  audio.webkitPreservesPitch = shouldPreserve;
  audio.mozPreservesPitch = shouldPreserve;
}

function getDeckKeySyncLabel(deck) {
  const key = getNormalisedTrackKey(djDeckState[deck]?.item, deck);
  return djMixerState.keySyncByDeck?.[deck] ? `KEY ${key} · KS` : `KEY ${key}`;
}

function isDeckPlayStarting(deck) {
  return performance.now() - Number(djMixerState.playStartLockByDeck?.[deck] || 0) < 850;
}

function lockDeckPlayStart(deck) {
  djMixerState.playStartLockByDeck[deck] = performance.now();
}

function unlockDeckPlayStart(deck, delay = 180) {
  window.setTimeout(() => {
    if (performance.now() - Number(djMixerState.playStartLockByDeck?.[deck] || 0) >= delay) {
      djMixerState.playStartLockByDeck[deck] = 0;
    }
  }, delay);
}

function getDeckSyncReadiness(deck) {
  const item = djDeckState[deck]?.item;
  const summary = getTrackPrepSummary(item);
  const grid = getDeckGrid(deck);
  const gridReady = Boolean(summary.gridReady || grid.userAdjusted || grid.locked);
  const bpmReady = Boolean(Number(summary.prep?.detectedBpm || summary.prep?.bpm || getDeckSourceBpm(deck) || 0));
  return {
    bpmReady,
    gridReady,
    canBeatSync: bpmReady && gridReady && !summary.gridNeedsCheck,
    label: !bpmReady ? "BPM NEEDED" : !gridReady || summary.gridNeedsCheck ? "GRID NEEDED" : "BEAT READY",
  };
}

function chooseMasterDeckForSync(deck) {
  const otherDeck = getOppositeDeck(deck);
  const currentMaster = djMixerState.masterDeck || otherDeck;
  const now = performance.now();

  // Stop master flicker: if the current master is audible/playing, keep it unless the user explicitly changes master in BPM popup.
  if (
    currentMaster &&
    currentMaster !== deck &&
    (isDeckPlaying(currentMaster) || getAudibleDeckPower(currentMaster) > 0.035) &&
    now - Number(djMixerState.lastMasterDeckChangeAt || 0) < 4500
  ) {
    return currentMaster;
  }

  if (isDeckPlaying(otherDeck) || getAudibleDeckPower(otherDeck) > getAudibleDeckPower(deck) + 0.04) {
    djMixerState.masterDeck = otherDeck;
  } else if (isDeckPlaying(deck) && !isDeckPlaying(otherDeck)) {
    djMixerState.masterDeck = deck;
  } else if (!djMixerState.masterDeck) {
    djMixerState.masterDeck = otherDeck;
  }

  if (djMixerState.masterDeck !== currentMaster) djMixerState.lastMasterDeckChangeAt = now;
  return djMixerState.masterDeck;
}

function getDeckBpmRatio(deck, targetBpm = djMixerState.bpmByDeck?.[deck]) {
  const sourceBpm = Math.max(1, Number(djMixerState.sourceBpmByDeck?.[deck] || getItemBpm(djDeckState[deck]?.item) || 170));
  const cleanTarget = Math.max(40, Math.min(240, Number(targetBpm || sourceBpm)));
  return Math.max(0.35, Math.min(2.5, cleanTarget / sourceBpm));
}

function getDeckBeatPosition(deck, time = Number(djAudio[deck]?.currentTime || 0)) {
  const grid = getDeckGrid(deck);
  const interval = Math.max(0.001, getBeatIntervalForDeck(deck));
  return (Number(time || 0) - Number(grid.downbeat || 0)) / interval;
}

function getPhaseCorrectionBeats(masterBeatPosition, targetBeatPosition, mode = "beat") {
  const wrap = mode === "bar" ? Math.max(1, Number(getDeckGrid(djMixerState.masterDeck || "d1")?.beatsPerBar || 4)) : 1;
  let diff = ((masterBeatPosition - targetBeatPosition) % wrap + wrap) % wrap;
  if (diff > wrap / 2) diff -= wrap;
  return diff;
}

function getSyncedMasterBpm(deck) {
  const masterDeck = djMixerState.masterDeck || chooseMasterDeckForSync(deck);
  if (!masterDeck || masterDeck === deck) return Number(djMixerState.bpmByDeck?.[deck] || getItemBpm(djDeckState[deck]?.item) || 170);
  return Number(djMixerState.bpmByDeck?.[masterDeck] || getItemBpm(djDeckState[masterDeck]?.item) || djMixerState.bpmByDeck?.[deck] || 170);
}

function getSyncPhaseBend(deck) {
  const masterDeck = djMixerState.masterDeck || getOppositeDeck(deck);
  const audio = djAudio[deck];
  const masterAudio = djAudio[masterDeck];
  if (!audio || !masterAudio || deck === masterDeck || !djMixerState.syncByDeck?.[deck]) return 0;
  if (!isDeckPlaying(deck) || !isDeckPlaying(masterDeck)) return 0;

  const mode = djMixerState.syncModeByDeck?.[deck] || "beat";
  if (mode === "bpm") return 0;
  if (!getDeckSyncReadiness(deck).canBeatSync || !getDeckSyncReadiness(masterDeck).canBeatSync) return 0;
  const masterBeat = getDeckBeatPosition(masterDeck, Number(masterAudio.currentTime || 0));
  const targetBeat = getDeckBeatPosition(deck, Number(audio.currentTime || 0));
  const correction = getPhaseCorrectionBeats(masterBeat, targetBeat, mode);
  if (!Number.isFinite(correction)) return 0;

  // Do not seek. Use a controlled temporary rate bend to pull phase in gently, like a soft platter nudge.
  return Math.max(-0.035, Math.min(0.035, correction * 0.045));
}

function setDeckPlaybackRate(deck, targetBpm, { phaseBend = 0 } = {}) {
  const audio = djAudio[deck];
  if (!audio) return;
  const baseRate = getDeckBpmRatio(deck, targetBpm);
  const nextRate = Math.max(0.35, Math.min(2.5, baseRate * (1 + Number(phaseBend || 0))));
  if (Math.abs(Number(audio.playbackRate || 1) - nextRate) > 0.002) {
    audio.playbackRate = nextRate;
    audio.defaultPlaybackRate = nextRate;
  }
}

function alignDeckToMasterGrid(deck) {
  // V2T safety: no hard seeking during Sync. Phase is handled by small playback-rate bends only.
  return getSyncPhaseBend(deck);
}

function alignSyncedDecksToMaster() {
  ["d1", "d2"].forEach((deck) => {
    if (deck !== djMixerState.masterDeck && djMixerState.syncByDeck?.[deck]) {
      applyDeckSync(deck, { align: false });
    }
  });
}

function applyDeckSync(deck, { align = false, forceMaster = false } = {}) {
  const audio = djAudio[deck];
  if (!audio) return;

  const grid = getDeckGrid(deck);
  const itemBpm = getItemBpm(djDeckState[deck]?.item);
  const sourceBpm = Math.max(1, Number(grid?.sourceBpm || djMixerState.sourceBpmByDeck?.[deck] || grid?.bpm || itemBpm || 170));
  let targetBpm = Number(djMixerState.bpmByDeck?.[deck] || grid?.liveBpm || sourceBpm);

  if (djMixerState.syncByDeck?.[deck]) {
    const masterDeck = forceMaster ? chooseMasterDeckForSync(deck) : (djMixerState.masterDeck || chooseMasterDeckForSync(deck));
    if (masterDeck && masterDeck !== deck) targetBpm = getSyncedMasterBpm(deck);
  }

  const cleanBpm = Math.max(40, Math.min(240, targetBpm));
  djMixerState.sourceBpmByDeck[deck] = sourceBpm;
  djMixerState.bpmByDeck[deck] = cleanBpm;
  grid.sourceBpm = sourceBpm;
  grid.bpm = sourceBpm;
  grid.liveBpm = cleanBpm;

  const readiness = getDeckSyncReadiness(deck);
  const phaseBend = align && djMixerState.syncModeByDeck?.[deck] !== "bpm" && readiness.canBeatSync ? getSyncPhaseBend(deck) : 0;
  setDeckPlaybackRate(deck, cleanBpm, { phaseBend });
  setAudioPreservePitch(audio, Boolean(djMixerState.mtByDeck?.[deck] || djMixerState.keySyncByDeck?.[deck]));

  updateDeckPrepUi();
  renderSingleDeckMeta(deck);
}

function maintainSyncLock(deck = "") {
  const decks = deck ? [deck] : ["d1", "d2"];
  const now = performance.now();
  decks.forEach((targetDeck) => {
    if (!djMixerState.syncByDeck?.[targetDeck]) return;
    if (targetDeck === djMixerState.masterDeck) return;
    if (now - Number(djMixerState.lastSyncLockAtByDeck?.[targetDeck] || 0) < 130) return;
    djMixerState.lastSyncLockAtByDeck[targetDeck] = now;
    applyDeckSync(targetDeck, { align: true });
  });
}

function getCrossfaderDeckGains(fade) {
  const mode = djMixerState.crossfaderMode || "smooth";
  const position = Math.max(0, Math.min(1, Number(fade) || 0.5));

  if (mode === "thru") {
    return { d1: 1, d2: 1 };
  }

  if (mode === "cut") {
    return {
      d1: position < 0.62 ? 1 : Math.max(0, 1 - ((position - 0.62) / 0.20)),
      d2: position > 0.38 ? 1 : Math.max(0, position / 0.38),
    };
  }

  // Full-centre DJ blend: centre is always the loudest point because both decks are at full gain.
  return {
    d1: position <= 0.5 ? 1 : Math.max(0, 1 - Math.pow((position - 0.5) / 0.5, 0.72)),
    d2: position >= 0.5 ? 1 : Math.max(0, 1 - Math.pow((0.5 - position) / 0.5, 0.72)),
  };
}

function getAudibleDeckPower(deck, deckGains = getCrossfaderDeckGains(djMixerState.crossfader)) {
  const audio = djAudio[deck];
  if (!audio || audio.paused || audio.ended || !audio.src) return 0;

  const volume = Number(djDeckState[deck]?.volume ?? 1);
  const gain = Number(djDeckState[deck]?.gain ?? 1);
  const eqTrim = getDeckEqTrim(deck);
  return Math.max(0, Math.min(1, volume * gain * eqTrim * Number(deckGains[deck] ?? 1)));
}

function queueBpmUiRefresh() {
  if (autoMasterUiQueued) return;
  autoMasterUiQueued = true;
  window.requestAnimationFrame(() => {
    autoMasterUiQueued = false;
    updateBpmUi();
  });
}

function autoDetectMasterDeck(deckGains = getCrossfaderDeckGains(djMixerState.crossfader)) {
  const d1Power = getAudibleDeckPower("d1", deckGains);
  const d2Power = getAudibleDeckPower("d2", deckGains);
  let nextMaster = djMixerState.masterDeck;

  if (d1Power > DJ_AUTO_MASTER_THRESHOLD && d1Power > d2Power * DJ_AUTO_MASTER_SWITCH_RATIO) nextMaster = "d1";
  if (d2Power > DJ_AUTO_MASTER_THRESHOLD && d2Power > d1Power * DJ_AUTO_MASTER_SWITCH_RATIO) nextMaster = "d2";

  if (nextMaster && nextMaster !== djMixerState.masterDeck) {
    djMixerState.masterDeck = nextMaster;
    queueBpmUiRefresh();
  }
}

function updateCrossfaderModeUi() {
  djCrossfaderModeButtons.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.djCrossfaderMode === djMixerState.crossfaderMode);
  });

  document.body.classList.toggle("djCrossfaderThru", djMixerState.crossfaderMode === "thru");
  applyDeckVolumes();
}

function getDeckFilterFrequency(value) {
  const amount = Math.max(0, Math.min(100, Number(value ?? 50)));
  if (amount < 49.5) {
    const ratio = amount / 50;
    return { type: "lowpass", frequency: 260 + (ratio * ratio * 19740) };
  }
  if (amount > 50.5) {
    const ratio = (amount - 50) / 50;
    return { type: "highpass", frequency: 24 + (ratio * ratio * 3800) };
  }
  return { type: "allpass", frequency: 20000 };
}

function applyDeckVolumes() {
  const fade = Number(djMixerState.crossfader || 0.5);
  const deckGains = getCrossfaderDeckGains(fade);
  const masterGain = Number(djMixerState.masterGain || 1);

  if (isDjEngineV2Ready()) {
    window.BRMediaDjEngine.setCrossfader(fade);
    window.BRMediaDjEngine.setMasterGain(masterGain);

    ["d1", "d2"].forEach((deck) => {
      const base = Number(djDeckState[deck].volume ?? 1);
      const deckGain = Number(djDeckState[deck].gain || 1);
      window.BRMediaDjEngine.setVolume(deck, Math.max(0, Math.min(2, base * deckGain)));

      const eq = djDeckState[deck]?.eq || {};
      window.BRMediaDjEngine.setEq(deck, "high", clampEqPercent(eq.high, 100));
      window.BRMediaDjEngine.setEq(deck, "mid", clampEqPercent(eq.mid, 100));
      window.BRMediaDjEngine.setEq(deck, "low", clampEqPercent(eq.low, 100));
    });

    autoDetectMasterDeck(deckGains);
    return;
  }

  ["d1", "d2"].forEach((deck) => {
    const audio = djAudio[deck];
    if (!audio) return;

    if (shouldUseWebAudioGraphForDeck(deck) && !djAudioGraph.nodes[deck]) ensureDeckAudioGraph(deck);

    const base = Number(djDeckState[deck].volume ?? 1);
    const deckGain = Number(djDeckState[deck].gain || 1);
    const eqTrim = getDeckEqTrim(deck);
    const finalGain = Math.max(0, Math.min(1, base * deckGain * masterGain * Number(deckGains[deck] ?? 1) * eqTrim));
    const graphNode = djAudioGraph.nodes[deck]?.gain;
    const filterNode = djAudioGraph.nodes[deck]?.filter;

    if (filterNode && djAudioGraph.ctx) {
      applyDeckStemEngine(deck);
      const filter = getDeckFilterFrequency(djDeckState[deck]?.filter ?? 50);
      filterNode.type = filter.type;
      filterNode.frequency.setTargetAtTime(filter.frequency, djAudioGraph.ctx.currentTime, 0.012);
    }

    if (graphNode && djAudioGraph.ctx && shouldUseWebAudioGraphForDeck(deck)) {
      graphNode.gain.setTargetAtTime(finalGain, djAudioGraph.ctx.currentTime, 0.010);
      applyDeckFx(deck);
      audio.volume = 1;
    } else {
      audio.volume = finalGain;
    }
  });

  autoDetectMasterDeck(deckGains);
}

function getTransportButtons(deck, type) {
  return transportButtons.filter((button) => button.dataset.djDeck === deck && button.dataset.djTransport === type);
}

function getTransportButton(deck, type) {
  return getTransportButtons(deck, type)[0];
}

function updateTransportButtons() {
  ["d1", "d2"].forEach((deck) => {
    getTransportButtons(deck, "play").forEach((button) => {
      button.classList.toggle("is-playing", Boolean(djDeckState[deck]?.playing));
    });
  });
}

function flashCueButton(deck) {
  const cueButtons = getTransportButtons(deck, "cue");
  if (!cueButtons.length) return;

  cueButtons.forEach((button) => button.classList.add("is-cue-active"));
  window.setTimeout(() => cueButtons.forEach((button) => button.classList.remove("is-cue-active")), 420);
}

function markTrackPlayed(deck, forcedItem = null) {
  const item = forcedItem || djDeckState[deck]?.item;
  const id = String(item?.id || "");
  if (!id) return;
  djMixerState.playedTrackIds.add(id);
  if (!djMixerState.sessionTrackIds.includes(id)) djMixerState.sessionTrackIds.push(id);
  rememberSessionTrack(item, { deck, source: "play" });
  const log = getSessionTrackLog(id);
  if (log && log.startedAtSeconds === null) log.startedAtSeconds = getRecordingElapsedSeconds();
  updatePerformanceSetStrip();
}

async function playDeck(deck) {
  if (!djDeckState[deck]?.item) {
    openDjLibraryPanel(deck);
    return;
  }

  if (!isDjEngineV2Ready()) {
    if (djLibraryStatus) djLibraryStatus.textContent = "DJ Engine V2 did not load. Check engine-v2.js.";
    return;
  }

  if (isDeckPlayStarting(deck)) return;
  lockDeckPlayStart(deck);

  try {
    const otherDeck = getOppositeDeck(deck);
    const otherWasPlaying = isDeckPlaying(otherDeck);

    if (djMixerState.quantizeByDeck?.[deck]) {
      const current = getDeckCurrentTime(deck);
      const snapped = getQuantizedPlayStartTime(deck, current);
      if (Math.abs(snapped - current) <= 0.28) setDeckCurrentTime(deck, snapped);
    }

    safeLaunchStep("applyDeckSync", () => applyDeckSync(deck, { align: false }));
    applyDeckVolumes();

    djDeckState[deck].playing = true;
    updateTransportButtons();

    await window.BRMediaDjEngine.play(deck);

    if (otherWasPlaying) enableDualDeckMixingIfNeeded(deck);
    rememberBackgroundPlaybackIntent("play");
    applyDeckVolumes();
    markTrackPlayed(deck);
    updateMediaSession(deck);
    updateTransportButtons();
    updateDjCollectionMiniPlayer();
    startMeterAnimation();
    startWaveformAnimation();
  } catch (err) {
    djDeckState[deck].playing = false;
    updateTransportButtons();

    const detail = String(err?.message || err || "play blocked");
    console.warn("DJ Engine V2 deck play failed", err);

    if (djLibraryStatus) djLibraryStatus.textContent = `${deck === "d2" ? "Deck 2" : "Deck 1"} play failed: ${detail}`;
  } finally {
    unlockDeckPlayStart(deck, 180);
  }
}

function getNowPlayingDeck() {
  if (isDeckPlaying("d1")) return "d1";
  if (isDeckPlaying("d2")) return "d2";
  return djDeckState.d1.item ? "d1" : "d2";
}

function updateMediaSession(deck = getNowPlayingDeck()) {
  if (!("mediaSession" in navigator)) return;

  const item = djDeckState[deck]?.item;
  const title = item?.title || "BRMedia DJ Mixer";
  const artist = item?.artist || item?.albumArtist || "Blackburn Ravers";
  const artwork = getTrackArtwork(item);
  const audio = djAudio[deck];

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album: "BRMedia DJ Studio",
      artwork: artwork ? [{ src: artwork, sizes: "512x512", type: "image/png" }] : [],
    });

    navigator.mediaSession.playbackState = isDeckPlaying(deck) ? "playing" : "paused";

const duration = getDeckDuration(deck);
const position = getDeckCurrentTime(deck);

if (navigator.mediaSession.setPositionState && Number.isFinite(duration) && duration > 0) {
  navigator.mediaSession.setPositionState({
    duration,
    playbackRate: Number(djDeckState[deck]?.playbackRate || 1),
    position: Math.max(0, Math.min(duration, position)),
  });
}
  } catch (err) {
    console.warn("Media Session update failed", err);
  }
}

function getPlayingDeckIds() {
  return ["d1", "d2"].filter((deck) => {
    const audio = djAudio[deck];
    return audio && audio.src && !audio.paused && !audio.ended;
  });
}

function primeDeckForBackgroundPlayback(deck) {
  const audio = djAudio[deck];
  if (!audio) return;

  audio.preload = "auto";
  audio.setAttribute("playsinline", "");
  audio.setAttribute("webkit-playsinline", "");
  audio.setAttribute("x-webkit-airplay", "allow");
  audio.disableRemotePlayback = false;
}

function rememberBackgroundPlaybackIntent(reason = "play") {
  const decks = getPlayingDeckIds();
  if (!decks.length) {
    djMixerState.backgroundPlaybackIntent = null;
    localStorage.removeItem(DJ_BACKGROUND_PLAYBACK_KEY);
    return null;
  }

  const intent = {
    decks,
    masterDeck: djMixerState.masterDeck,
    reason,
    savedAt: Date.now(),
    positions: decks.reduce((acc, deck) => {
      acc[deck] = Number(djAudio[deck]?.currentTime || 0);
      return acc;
    }, {}),
  };

  djMixerState.backgroundPlaybackIntent = intent;
  try {
    localStorage.setItem(DJ_BACKGROUND_PLAYBACK_KEY, JSON.stringify(intent));
  } catch (err) {
    console.warn("Background playback intent save failed", err);
  }

  return intent;
}

function readBackgroundPlaybackIntent() {
  if (djMixerState.backgroundPlaybackIntent) return djMixerState.backgroundPlaybackIntent;

  try {
    const parsed = JSON.parse(localStorage.getItem(DJ_BACKGROUND_PLAYBACK_KEY) || "null");
    if (parsed && Array.isArray(parsed.decks)) return parsed;
  } catch (err) {
    console.warn("Background playback intent read failed", err);
  }

  return null;
}

function restoreBackgroundPlaybackIfNeeded() {
  const intent = readBackgroundPlaybackIntent();
  if (!intent?.decks?.length) return;
  if (Date.now() - Number(intent.savedAt || 0) > 10 * 60 * 1000) return;

  intent.decks.forEach((deck) => {
    const audio = djAudio[deck];
    if (!audio?.src || !audio.paused || audio.ended) return;

    const rememberedPosition = Number(intent.positions?.[deck]);
    if (Number.isFinite(rememberedPosition) && rememberedPosition > 0) {
      audio.currentTime = clampTimeForDeck(deck, rememberedPosition);
    }

    primeDeckForBackgroundPlayback(deck);
    updateNativeBackgroundModeClass();
    const graph = shouldUseWebAudioGraphForDeck(deck) ? ensureDeckAudioGraph(deck) : null;
    if (graph) void resumeDjAudioContextIfNeeded();

    audio.play().then(() => {
      djDeckState[deck].playing = true;
      applyDeckVolumes();
      updateMediaSession(deck);
      updateTransportButtons();
      updateDjCollectionMiniPlayer();
      startMeterAnimation();
      startWaveformAnimation();
    }).catch((err) => console.warn("Background playback restore blocked", err));
  });
}

function setupMediaSessionActions() {
  if (!navigator.mediaSession?.setActionHandler) return;

  try {
    navigator.mediaSession.setActionHandler("play", () => playDeck(getNowPlayingDeck()));
    navigator.mediaSession.setActionHandler("pause", () => {
      ["d1", "d2"].forEach((deck) => {
        if (isDeckPlaying(deck)) toggleTransport(deck);
      });
    });
navigator.mediaSession.setActionHandler("seekbackward", () => {
  const deck = getNowPlayingDeck();
  setDeckCurrentTime(deck, Math.max(0, getDeckCurrentTime(deck) - 10));
});
navigator.mediaSession.setActionHandler("seekforward", () => {
  const deck = getNowPlayingDeck();
  setDeckCurrentTime(deck, Math.min(getDeckDuration(deck) || getDeckCurrentTime(deck) + 10, getDeckCurrentTime(deck) + 10));
});
  } catch (err) {
    console.warn("Media Session actions unavailable", err);
  }
}

function cueDeck(deck) {
  if (!djDeckState[deck]?.item) return;

  if (isDjEngineV2Ready()) {
    const isPlaying = window.BRMediaDjEngine.isPlaying(deck);

    if (isPlaying) {
      window.BRMediaDjEngine.pause(deck);
      setDeckCurrentTime(deck, Number(djMixerState.cuePointByDeck?.[deck] || 0));
    } else {
      const current = getDeckCurrentTime(deck);
      const existingCue = Number(djMixerState.cuePointByDeck?.[deck] || 0);
      const shouldSetFreshCue = current > 0.15 && Math.abs(current - existingCue) > 0.08;

      if (shouldSetFreshCue) {
        setDeckCuePoint(deck, current, { movePlayhead: true, snap: true });
        window.BRMediaDjEngine.cue(deck, { set: true });
      } else {
        setDeckCurrentTime(deck, existingCue);
      }
    }

    djDeckState[deck].playing = false;
    flashCueButton(deck);
    updateMediaSession(deck);
    updateTransportButtons();
    updateDeckTimeDisplays();
    drawAllWaveforms();
    return;
  }

  const audio = djAudio[deck];
  if (!audio || !djDeckState[deck]?.item) return;
  ensureDeckAudioSource(deck);

  const isPlaying = !audio.paused && !audio.ended;

  if (isPlaying) {
    audio.pause();
    audio.currentTime = clampTimeForDeck(deck, Number(djMixerState.cuePointByDeck?.[deck] || 0));
  } else {
    const current = Number(audio.currentTime || 0);
    const existingCue = Number(djMixerState.cuePointByDeck?.[deck] || 0);
    const shouldSetFreshCue = current > 0.15 && Math.abs(current - existingCue) > 0.08;

    if (shouldSetFreshCue) {
      setDeckCuePoint(deck, current, { movePlayhead: true, snap: true });
    } else {
      audio.currentTime = existingCue;
    }
  }

  djDeckState[deck].playing = false;
  flashCueButton(deck);
  updateMediaSession(deck);
  updateTransportButtons();
  updateDeckTimeDisplays();
  drawAllWaveforms();
}

function toggleTransport(deck) {
  if (isDeckPlayStarting(deck)) return;

  if (isDjEngineV2Ready()) {
    if (!window.BRMediaDjEngine.isPlaying(deck)) {
      void playDeck(deck);
      return;
    }

    window.BRMediaDjEngine.pause(deck);
    djDeckState[deck].playing = false;
    updateMediaSession(deck);
    updateTransportButtons();
    updateDeckTimeDisplays();
    updateDjCollectionMiniPlayer();
    drawAllWaveforms();
    return;
  }

  const audio = djAudio[deck];

  if (!audio || audio.paused) {
    playDeck(deck);
    return;
  }

  audio.pause();
  djDeckState[deck].playing = false;
  updateMediaSession(deck);
  updateTransportButtons();
  updateDjCollectionMiniPlayer();
}

function setChannelFaderFromPointer(fader, event) {
  const deck = fader.dataset.djChannelFader;
  if (!deck) return;

  const rect = fader.getBoundingClientRect();
  const ratio = 1 - ((event.clientY - rect.top) / Math.max(1, rect.height));
  const value = Math.max(0, Math.min(1, ratio));

  djDeckState[deck].volume = value;
  fader.style.setProperty("--dj-fader-pos", `${Math.round((1 - value) * 100)}%`);
  applyDeckVolumes();
}

function startFaderDrag(fader, event) {
  event.preventDefault();
  fader.setPointerCapture?.(event.pointerId);
  setChannelFaderFromPointer(fader, event);

  const move = (moveEvent) => {
    moveEvent.preventDefault();
    setChannelFaderFromPointer(fader, moveEvent);
  };

  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
  };

  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

function setCrossfaderFromPointer(event) {
  if (!crossfaderRail) return;

  const rect = crossfaderRail.getBoundingClientRect();
  const rawPosition = (event.clientX - rect.left) / Math.max(1, rect.width);
  const boostedPosition = 0.5 + ((rawPosition - 0.5) * 1.22);
  setCrossfaderPosition(boostedPosition);
}

function startCrossfaderDrag(event) {
  event.preventDefault();
  crossfaderRail?.setPointerCapture?.(event.pointerId);
  setCrossfaderFromPointer(event);

  const move = (moveEvent) => {
    moveEvent.preventDefault();
    setCrossfaderFromPointer(moveEvent);
  };

  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
  };

  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

function resetMeterBars() {
  masterMeterBars.forEach((bar) => {
    bar.style.setProperty("--dj-meter-level", "0%");
  });
}

function startMeterAnimation() {
  if (meterAnimationFrame) return;

  const draw = () => {
    const anyPlaying = isDjEngineV2Ready()
      ? ["d1", "d2"].some((deck) => window.BRMediaDjEngine.isPlaying(deck))
      : Object.values(djAudio).some((audio) => audio && !audio.paused && !audio.ended);

    masterMeterBars.forEach((bar) => {
      const meterTarget = bar.dataset.djMeter || "master";
      const engineLevel = isDjEngineV2Ready()
        ? window.BRMediaDjEngine.getMeterLevel(meterTarget)
        : 0;

      const deckGains = getCrossfaderDeckGains(djMixerState.crossfader);
      const deckPower = engineLevel || (meterTarget === "master"
        ? Math.max(getAudibleDeckPower("d1", deckGains), getAudibleDeckPower("d2", deckGains))
        : getAudibleDeckPower(meterTarget, deckGains));

      const bounce = anyPlaying && deckPower > 0 ? Math.max(0.04, deckPower) : 0;
      bar.style.setProperty("--dj-meter-level", `${Math.round(bounce * 100)}%`);
    });

    if (anyPlaying) {
      meterAnimationFrame = window.requestAnimationFrame(draw);
    } else {
      meterAnimationFrame = 0;
      resetMeterBars();
    }
  };

  meterAnimationFrame = window.requestAnimationFrame(draw);
}

function updateBpmUi() {
  const editDeck = djMixerState.bpmEditDeck || "d1";
  const deckLabel = editDeck === "d1" ? "Deck 1" : "Deck 2";
  const isMaster = djMixerState.masterDeck === editDeck;
  const mtOn = Boolean(djMixerState.mtByDeck?.[editDeck]);
  const keySyncOn = Boolean(djMixerState.keySyncByDeck?.[editDeck]);

  if (djBpmStatus) {
    const readiness = getDeckSyncReadiness(editDeck);
    djBpmStatus.textContent = isMaster
      ? `${deckLabel} is MASTER • ${readiness.label} • BPM edits control synced decks • MT ${mtOn ? "On" : "Off"} • Key ${keySyncOn ? "On" : "Off"}`
      : `${deckLabel} is synced/listening • ${readiness.label}. Make it Master before editing BPM.`;
  }

  if (djBpmPopupTitle) djBpmPopupTitle.textContent = `${deckLabel} BPM`;
  if (djBpmValueInput) djBpmValueInput.disabled = !isMaster;

  if (djSetMasterDeckBtn) {
    djSetMasterDeckBtn.textContent = isMaster ? `${deckLabel} is Master` : `Make ${deckLabel} Master`;
    djSetMasterDeckBtn.classList.toggle("is-selected", isMaster);
  }

  djBpmReadouts.forEach((node) => {
    const deck = node.dataset.djBpmReadout || "d1";
    node.textContent = Number(djMixerState.bpmByDeck?.[deck] || 170).toFixed(1);
  });

  djBpmMetas.forEach((node) => {
    const deck = node.dataset.djBpmMeta || "d1";
    const parts = [];
    if (djMixerState.masterDeck === deck) parts.push("MASTER");
    if (djMixerState.mtByDeck?.[deck]) parts.push("MT");
    if (djMixerState.syncByDeck?.[deck]) parts.push("SYNC");
    if (djMixerState.syncByDeck?.[deck]) parts.push(getDeckSyncReadiness(deck).label);
    if (djMixerState.keySyncByDeck?.[deck]) parts.push("KEY");
    if (djMixerState.quantizeByDeck?.[deck]) parts.push("Q");
    node.textContent = parts.length ? parts.join(" · ") : "MT OFF";
    const bpmButton = node.closest(".djDeckBpmBtn");
    bpmButton?.classList.toggle("is-sync-on", Boolean(djMixerState.syncByDeck?.[deck]));
    bpmButton?.classList.toggle("is-grid-needed", Boolean(djMixerState.syncByDeck?.[deck]) && getDeckSyncReadiness(deck).label !== "BEAT READY");
  });

  djMtButtons.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.djMt === String(mtOn));
  });

  djKeySyncButtons.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.djKeySync === String(keySyncOn));
  });

  document.querySelectorAll(`[data-dj-single-key="${editDeck}"]`).forEach((node) => {
    node.classList.toggle("is-key-sync", keySyncOn);
  });

  djQuantizeButtons.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.djQuantizeOption === String(Boolean(djMixerState.quantizeByDeck?.[editDeck])));
  });

  syncButtons.forEach((button) => {
    const deck = button.dataset.djSyncToggle || "d1";
    const mode = button.dataset.djSyncMode || "beat";
    const active = Boolean(djMixerState.syncByDeck?.[deck]) && (djMixerState.syncModeByDeck?.[deck] || "beat") === mode;
    button.classList.toggle("is-active", active);
    button.classList.toggle("is-bpm-active", active && mode === "bpm");
    button.classList.toggle("is-beat-active", active && mode === "beat");
  });

  updateCrossfaderModeUi();
}

function openBpmPopup(deck = "d1") {
  const requestedDeck = deck === "d2" ? "d2" : "d1";
  const nextDeck = requestedDeck === djMixerState.masterDeck ? requestedDeck : (djMixerState.masterDeck || requestedDeck);
  djMixerState.bpmEditDeck = nextDeck;
  if (djBpmValueInput) djBpmValueInput.value = String(djMixerState.bpmByDeck?.[nextDeck] || 170);
  updateBpmUi();
  djBpmPopup?.classList.remove("hidden");
}

function closeBpmPopup() {
  djBpmPopup?.classList.add("hidden");
}

function readSetup() {
  try {
    const stored = JSON.parse(localStorage.getItem(DJ_SETUP_KEY) || "{}");
    return { ...DEFAULT_SETUP, ...stored };
  } catch {
    return { ...DEFAULT_SETUP };
  }
}

function writeSetup(setup) {
  localStorage.setItem(DJ_SETUP_KEY, JSON.stringify(setup));
}

function requiredSetupMissing(setup) {
  return Object.entries(REQUIRED_LABELS)
    .filter(([key]) => !String(setup[key] || "").trim())
    .map(([key, label]) => ({ key, label }));
}

function applySetupToFields(setup) {
  setupFields.forEach((field) => {
    const key = field.dataset.djField;
    if (!key) return;
    field.value = setup[key] || "";
  });
}

function applySetupToChoiceButtons(setup) {
  choiceButtons.forEach((button) => {
    const key = button.dataset.djChoice;
    if (!key) return;
    button.classList.toggle("is-selected", String(setup[key] || "") === String(button.dataset.djValue || ""));
  });
}

function applySetupToArtwork(setup) {
  if (artworkPreview) {
    if (setup.artworkDataUrl) {
      artworkPreview.src = setup.artworkDataUrl;
      artworkPreview.classList.remove("hidden");
    } else {
      artworkPreview.removeAttribute("src");
      artworkPreview.classList.add("hidden");
    }
  }

  if (artworkName) {
    artworkName.textContent = setup.artworkName || "No artwork selected yet";
  }
}

function collectSetupFromFields() {
  const setup = readSetup();

  setupFields.forEach((field) => {
    const key = field.dataset.djField;
    if (!key) return;
    setup[key] = field.value || "";
  });

  choiceButtons.forEach((button) => {
    const key = button.dataset.djChoice;
    if (!key || !button.classList.contains("is-selected")) return;
    setup[key] = button.dataset.djValue || "";
  });

  const missing = requiredSetupMissing(setup);
  setup.ready = missing.length === 0 && setup.ready === true;
  return setup;
}

function updateRequiredIndicators(setup = readSetup()) {
  const missing = requiredSetupMissing(setup);
  const missingKeys = new Set(missing.map((item) => item.key));

  requiredFields.forEach((field) => {
    const key = field.dataset.djField;
    const needsValue = missingKeys.has(key);
    field.classList.toggle("djInputMissing", needsValue);
    field.classList.toggle("djInputComplete", !needsValue);
    field.closest("label")?.classList.toggle("is-missing-required", needsValue);
    field.closest("label")?.classList.toggle("is-complete-required", !needsValue);
  });

  requiredFlags.forEach((flag) => {
    const key = flag.dataset.djRequiredFlag;
    const needsValue = missingKeys.has(key);
    flag.textContent = needsValue ? "Required" : "Done";
    flag.classList.toggle("is-complete", !needsValue);
  });

  if (requiredSummary) {
    requiredSummary.classList.toggle("is-ready", missing.length === 0);
  }

  if (requiredSummaryText) {
    requiredSummaryText.textContent = missing.length
      ? `${missing.map((item) => item.label).join(", ")} ${missing.length === 1 ? "is" : "are"} still needed.`
      : "All required show-start details are complete.";
  }

  launchButtons.forEach((button) => {
    button.classList.remove("is-blocked");
    button.setAttribute("aria-disabled", "false");
    button.title = missing.length ? "Launch as draft — finish setup later" : "Launch DUO performance decks";

    const sidebarTitle = button.querySelector(".sidebarNavBtnTitle");
    const sidebarSub = button.querySelector(".sidebarNavBtnSub");
    const heroTitle = button.querySelector("strong");
    const heroSub = button.querySelector("em");

    if (sidebarTitle) sidebarTitle.textContent = "Launch DJ Studio";
    if (sidebarSub) sidebarSub.textContent = missing.length ? "Open DUO as a draft show." : "Open the DUO performance decks.";
    if (heroTitle) heroTitle.textContent = "Launch DUO";
    if (heroSub) heroSub.textContent = missing.length ? "Draft launch enabled" : "Deck 1 · DUO · Deck 2";

    if (!sidebarTitle && !heroTitle) button.textContent = "Launch DUO";
  });
}

function updateSetupPreview(setup = readSetup()) {
  const missing = requiredSetupMissing(setup);
  const title = setup.title.trim() || "Untitled DJ Set";
  const artist = setup.artist.trim() || "DJ / artist needed";
  const countdown = Number.parseInt(setup.countdown, 10) || 6;

  if (setupTitlePreview) setupTitlePreview.textContent = title;
  if (setupArtistPreview) setupArtistPreview.textContent = artist;
  if (setupCountdownPreview) setupCountdownPreview.textContent = `${countdown}s countdown`;

  updateRecordPreview(setup);
  updateRecordFormatPanels(setup);
  updateRequiredIndicators(setup);
  applySetupToArtwork(setup);
  renderRecordingList();
  updateStudioDashboard(setup);

  if (setupStatusText) {
    setupStatusText.textContent = missing.length
      ? `Draft — needs ${missing.map((item) => item.label).join(", ")} before show start / Player transfer.`
      : "Ready — metadata is complete for show start and Player handoff.";
    setupStatusText.classList.toggle("is-ready", missing.length === 0);
  }
}

function getRecordQualityLabel(setup) {
  return getRecordingFinalQualityLabel(setup);
}

function updateRecordPreview(setup = readSetup()) {
  const format = String(setup.format || "wav").toUpperCase();
  const channels = CHANNEL_LABELS[setup.channels] || "Stereo";

  if (recordFormatPreview) recordFormatPreview.textContent = `${format} • ${channels}`;
  if (recordQualityPreview) recordQualityPreview.textContent = getRecordQualityLabel(setup);
}

function updateRecordFormatPanels(setup = readSetup()) {
  const activeFormat = setup.format || "wav";
  formatPanels.forEach((panel) => {
    panel.classList.toggle("djFormatPanelHidden", panel.dataset.djFormatPanel !== activeFormat);
  });
}

function setChoice(button) {
  const key = button.dataset.djChoice;
  const value = button.dataset.djValue || "";
  if (!key) return;

  choiceButtons.forEach((item) => {
    if (item.dataset.djChoice !== key) return;
    item.classList.toggle("is-selected", item === button);
  });

  const setup = collectSetupFromFields();
  setup[key] = value;
  writeSetup(setup);
  updateSetupPreview(setup);
}

function saveSetup({ markReady = false, nextView = "" } = {}) {
  const setup = collectSetupFromFields();
  const missing = requiredSetupMissing(setup);
  const linkedSet = ensureLinkedDjSetForSetup(setup);

  setup.ready = markReady ? missing.length === 0 : setup.ready && missing.length === 0;
  setup.linkedDjSetId = linkedSet.id;
  writeSetup(setup);
  updateSetupPreview(setup);
  renderCollectionPlanner();

  if (setupSaveBtn) {
    setupSaveBtn.textContent = markReady && missing.length
      ? "Saved as Draft"
      : nextView
        ? "Saved — Next"
        : "Saved";
    window.setTimeout(() => {
      setupSaveBtn.textContent = "Save & Next";
    }, 1100);
  }

  if (nextView) setView(nextView);
}

function setView(viewName) {
  const target = viewName === "studio" || !viewName ? "home" : viewName;
  document.body.dataset.djStudioView = target;
  document.documentElement.dataset.djStudioView = target;

  viewButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.djView === target || (target === "home" && button.dataset.djView === "studio"));
  });

  sidebarViewButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.djSidebarView === target || (target === "home" && button.dataset.djSidebarView === "studio"));
  });

  views.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.djPanel !== target);
  });

  if (target === "library" && !djMixerState.libraryLoaded) {
    void loadDjLibrary();
  }

  window.requestAnimationFrame(() => document.querySelector(".moduleTemplateMain")?.scrollTo?.({ top: 0, behavior: "auto" }));
  hydrateIcons(document);
}

function resetSetupDraft() {
  const setup = { ...DEFAULT_SETUP };
  writeSetup(setup);
  applySetupToFields(setup);
  applySetupToChoiceButtons(setup);
  updateSetupPreview(setup);
}

function handleLaunchClick(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  const setup = collectSetupFromFields();
  const missing = requiredSetupMissing(setup);

  ensureLinkedDjSetForSetup(setup);
  writeSetup(setup);
  updateSetupPreview(setup);
  renderCollectionPlanner();

  if (missing.length) {
    const message = `Launching as draft — ${missing.map((item) => item.label).join(", ")} can be finished later.`;
    if (setupStatusText) setupStatusText.textContent = message;
    if (requiredSummaryText) requiredSummaryText.textContent = message;
  }

  showPerformance(setup);
}

function handleArtworkUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const setup = collectSetupFromFields();
  setup.artworkName = file.name;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const dataUrl = String(reader.result || "");
    setup.artworkDataUrl = dataUrl.length < 1800000 ? dataUrl : "";
    writeSetup(setup);
    updateSetupPreview(setup);
  });
  reader.readAsDataURL(file);
}

btnModuleMenu?.addEventListener("click", openModuleSidebar);
moduleSidebarBackdrop?.addEventListener("click", closeModuleSidebar);
btnModuleSidebarCloseFloating?.addEventListener("click", closeModuleSidebar);

moduleSearchBtn?.addEventListener("click", openModuleSidebar);

viewButtons.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.djView || "studio"));
});

panelTargetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const requested = button.dataset.djPanelTarget || "home";
    const mapped = requested === "setup" ? "mix" : requested === "studio" ? "home" : requested === "fx" ? "effects" : requested;
    setView(mapped);
  });
});

sidebarViewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setView(button.dataset.djSidebarView || "home");
    closeModuleSidebar();
  });
});

setupFields.forEach((field) => {
  field.addEventListener("input", () => {
    const setup = collectSetupFromFields();
    writeSetup(setup);
    updateSetupPreview(setup);
  });
});

choiceButtons.forEach((button) => {
  button.addEventListener("click", () => setChoice(button));
});

artworkInput?.addEventListener("change", handleArtworkUpload);
setupSaveBtn?.addEventListener("click", () => saveSetup({ nextView: setupSaveBtn.dataset.djSaveNext || "" }));
setupReadyBtn?.addEventListener("click", () => saveSetup({ markReady: true }));
setupResetBtn?.addEventListener("click", resetSetupDraft);
djSaveNextButtons.forEach((button) => {
  if (button === setupSaveBtn) return;
  button.addEventListener("click", () => saveSetup({ nextView: button.dataset.djSaveNext || "" }));
});
launchButtons.forEach((button) => button.addEventListener("click", (event) => handleLaunchClick(event)));

performanceBackBtn?.addEventListener("click", hidePerformance);

performanceModeTabs.forEach((button) => {
  button.addEventListener("click", () => handlePerformanceModeClick(button));
});

performanceDeckTabs.forEach((button) => {
  button.addEventListener("click", () => setPerformanceDeck(button));
});

mixerKnobButtons.forEach((button) => {
  const isMixerKnob = Boolean(button.dataset.djMixerKnob);
  const isEqBand = Boolean(button.dataset.djEqKill);
  const startupValue = isEqBand ? "100" : "50";

  if (isMixerKnob || isEqBand) {
    button.dataset.djKnobValue = startupValue;
    button.dataset.djKillValue = startupValue;
    if (isEqBand) button.dataset.djEqPercent = startupValue;
  }

  updateEqKillButton(button, startupValue);

  button.addEventListener("pointerdown", (event) => handleEqPointerDown(button, event));
  button.addEventListener("pointerleave", () => endEqLongPress(button));
  button.addEventListener("pointercancel", () => endEqLongPress(button));
  button.addEventListener("pointerup", () => handleEqPointerUp(button));
});

deckLoadButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openDjLibraryPanel(button.dataset.djLoadTarget || "d1");
  });
});

deckPreviewCards.forEach((card) => {
  card.addEventListener("click", () => {
    djMixerState.bpmEditDeck = card.dataset.djPreview === "d2" ? "d2" : "d1";
    updateWaveformControls();
  });
});

deckTimeToggles.forEach((node) => {
  node.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const deck = node.dataset.djTimeToggle === "d2" ? "d2" : "d1";
    djMixerState.timeDisplayModeByDeck[deck] = djMixerState.timeDisplayModeByDeck[deck] === "elapsed" ? "remaining" : "elapsed";
    updateDeckTimeDisplays();
  });
});

fxTargetButtons.forEach((button) => {
  button.addEventListener("click", () => setFxTarget(button.dataset.djFxTarget || "both"));
});

fxClearButtons.forEach((button) => {
  button.addEventListener("click", clearFxForAllDecks);
});

fxBankPresetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const preset = button.dataset.djFxBankPreset || "club";
    const ids = DJ_FX_PRESET_BANKS[preset] || DJ_FX_PRESET_BANKS.club;

    if (preset === "all") {
      setSelectedFxBank(ids.slice(0, DJ_LIVE_FX_LIMIT), { board: "a", render: false });
      setSelectedFxBank(ids.slice(DJ_LIVE_FX_LIMIT, DJ_LIVE_FX_LIMIT * 2), { board: "b" });
      return;
    }

    setSelectedFxBank(ids, { board: "a" });
  });
});

fxWetMain?.addEventListener("input", () => {
  const value = Math.max(0, Math.min(1, Number(fxWetMain.value || 0) / 100));
  getFxTargetDecks().forEach((deck) => {
    djMixerState.fxWetByDeck[deck] = value;
    applyDeckFx(deck);
  });
  if (fxWetReadout) fxWetReadout.textContent = `${Math.round(value * 100)}%`;
});

stemFaders.forEach((input) => {
  input.addEventListener("input", () => setStemCut(input.dataset.djStemFader || "", input.value || 100));
});

stemMuteButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleStemMute(button.dataset.djStemMute || "");
  });
});

stemSoloButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    soloStem(button.dataset.djStemSolo || "");
  });
});

stemPresetButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    applyStemPreset(button.dataset.djStemPreset || "reset");
  });
});

stemCopyBothButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    copyStemCutsToBothDecks();
  });
});

stemResetButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    resetStemCuts();
  });
});

fxPadButtons.forEach(bindFxPadButton);

vinylPlatters.forEach((platter) => {
  let startX = 0;
  let startTime = 0;
  let deck = "d1";

  platter.addEventListener("pointerdown", (event) => {
    deck = platter.dataset.djPlatter === "d2" ? "d2" : "d1";
    startX = event.clientX;
    startTime = Number(djAudio[deck]?.currentTime || 0);
    platter.classList.add("is-touching");
    platter.setPointerCapture?.(event.pointerId);
  });

  platter.addEventListener("pointermove", (event) => {
    const audio = djAudio[deck];
    if (!audio?.src || !platter.classList.contains("is-touching")) return;
    const delta = event.clientX - startX;
    audio.currentTime = clampTimeForDeck(deck, startTime + (delta * 0.018));
    markManualWaveformSeek(deck);
    updateDeckTimeDisplays();
    drawAllWaveforms();
  });

  const release = () => platter.classList.remove("is-touching");
  platter.addEventListener("pointerup", release);
  platter.addEventListener("pointerleave", release);
  platter.addEventListener("pointercancel", release);
});

vinylActionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const deck = button.dataset.djVinylDeck === "d2" ? "d2" : "d1";
    const action = button.dataset.djVinylAction || "";
    if (action === "brake") applyVinylBrake(deck);
    if (action === "cue") cueDeck(deck);
  });
});

crossfaderReset?.addEventListener("click", resetCrossfader);
crossfaderRail?.addEventListener("pointerdown", startCrossfaderDrag);

djLibraryButton?.addEventListener("click", () => openDjLibraryPanel("d1"));

djOpenCollectionButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openDjLibraryPanel(button.dataset.djLibraryTargetOpen || pendingLoadDeck || "d1");
  });
});

djOpenPlanPageButtons.forEach((button) => {
  button.addEventListener("click", () => openDjPlanPage(button.dataset.djOpenPlanPage || "playlist"));
});

loadNextSetButtons.forEach((button) => {
  button.addEventListener("click", () => loadNextSetTrack(button.dataset.djLoadNextSet || "d1"));
});

markSetPlayedButtons.forEach((button) => {
  button.addEventListener("click", markCurrentSetTrackPlayed);
});

djPlanPageBackButtons.forEach((button) => button.addEventListener("click", closeDjPlanPage));

djLibraryClose?.addEventListener("click", closeDjLibraryPanel);

djLibraryClose?.addEventListener("click", closeDjLibraryPanel);
djLibraryRefresh?.addEventListener("click", () => loadDjLibrary());

djCollectionMiniToggle?.addEventListener("click", () => {
  const deck = getPlayingDeckForMiniPlayer();
  if (deck) toggleTransport(deck);
});
djAnalyseMissingBtn?.addEventListener("click", () => runDjPrepEngine({ force: false, limit: 36 }));
djAnalyseAllBtn?.addEventListener("click", () => runDjPrepEngine({ force: true, limit: 80 }));
djPrepEngineButtons.forEach((button) => {
  button.addEventListener("click", () => runDjPrepEngine({ force: button.dataset.djPrepEngine === "all", limit: button.dataset.djPrepEngine === "all" ? 80 : 36 }));
});

djLibraryTargetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    pendingLoadDeck = button.dataset.djLibraryTarget === "d2" ? "d2" : "d1";
    updateLibraryTargetUi();
    renderDjLibrary();
  });
});

djBpmPopupClose?.addEventListener("click", closeBpmPopup);

djBpmOpenButtons.forEach((button) => {
  button.addEventListener("click", () => openBpmPopup(button.dataset.djBpmDeck || "d1"));
});

djSetMasterDeckBtn?.addEventListener("click", () => {
  djMixerState.masterDeck = djMixerState.bpmEditDeck || "d1";
  ["d1", "d2"].forEach((deck) => applyDeckSync(deck, { align: false }));
  updateBpmUi();
  drawAllWaveforms();
});

djMtButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const deck = djMixerState.bpmEditDeck || "d1";
    djMixerState.mtByDeck[deck] = button.dataset.djMt === "true";
    applyDeckSync(deck, { align: false });
    updateBpmUi();
    drawAllWaveforms();
  });
});

djKeySyncButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const deck = djMixerState.bpmEditDeck || "d1";
    djMixerState.keySyncByDeck[deck] = button.dataset.djKeySync === "true";
    applyDeckSync(deck, { align: false });
    updateBpmUi();
    drawAllWaveforms();
  });
});

djQuantizeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const deck = djMixerState.bpmEditDeck || "d1";
    djMixerState.quantizeByDeck[deck] = button.dataset.djQuantizeOption === "true";
    updateBpmUi();
    updateWaveformControls();
  });
});

djCrossfaderModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    djMixerState.crossfaderMode = button.dataset.djCrossfaderMode || "smooth";
    updateCrossfaderModeUi();
  });
});

function setLiveTargetBpm(deck, bpm) {
  const cleanBpm = Math.max(40, Math.min(240, Number(bpm || getDeckLiveBpm(deck))));
  djMixerState.bpmByDeck[deck] = cleanBpm;
  getDeckGrid(deck).liveBpm = cleanBpm;
  return cleanBpm;
}

function applyBpmPopupValue({ commit = false } = {}) {
  const deck = djMixerState.bpmEditDeck || "d1";
  if (deck !== djMixerState.masterDeck) {
    updateBpmUi();
    return;
  }

  const bpm = Math.max(40, Math.min(240, Number.parseFloat(djBpmValueInput?.value || "170") || 170));
  const current = Number(djMixerState.bpmByDeck?.[deck] || 170);
  if (Math.abs(current - bpm) < 0.005) return;

  setLiveTargetBpm(deck, bpm);
  applyDeckSync(deck, { align: false });
  ["d1", "d2"].forEach((syncDeck) => {
    if (syncDeck !== deck && djMixerState.syncByDeck?.[syncDeck]) applyDeckSync(syncDeck, { align: false });
  });
  updateBpmUi();
  updateDeckPrepUi();
  if (commit) drawAllWaveforms();
}

djBpmValueInput?.addEventListener("input", () => {
  window.clearTimeout(bpmPopupInputTimer);
  bpmPopupInputTimer = window.setTimeout(() => applyBpmPopupValue({ commit: false }), 120);
});

djBpmValueInput?.addEventListener("change", () => applyBpmPopupValue({ commit: true }));

djLibrarySearch?.addEventListener("input", () => {
  djMixerState.libraryQuery = djLibrarySearch.value || "";
  renderDjLibrary();
});

djCollectionSort?.addEventListener("change", () => {
  djMixerState.collectionFilters.sort = djCollectionSort.value || "prepared";
  localStorage.setItem("brmedia.djMixer.collection.sort", djMixerState.collectionFilters.sort);
  renderDjLibrary();
});

djCollectionSourceFilter?.addEventListener("change", () => {
  djMixerState.collectionFilters.source = djCollectionSourceFilter.value || "all";
  renderDjLibrary();
});

djCollectionKeyFilter?.addEventListener("change", () => {
  djMixerState.collectionFilters.key = djCollectionKeyFilter.value || "all";
  renderDjLibrary();
});

[djCollectionBpmMin, djCollectionBpmMax].forEach((input) => {
  input?.addEventListener("input", () => {
    djMixerState.collectionFilters.bpmMin = djCollectionBpmMin?.value || "";
    djMixerState.collectionFilters.bpmMax = djCollectionBpmMax?.value || "";
    renderDjLibrary();
  });
});

djCollectionFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.djCollectionFilter || "";
    if (filter === "long") djMixerState.collectionFilters.includeLong = !djMixerState.collectionFilters.includeLong;
    if (filter === "short") djMixerState.collectionFilters.includeLong = false;
    if (filter === "prepared") {
      djMixerState.collectionFilters.preparedOnly = !djMixerState.collectionFilters.preparedOnly;
      if (djMixerState.collectionFilters.preparedOnly) djMixerState.collectionFilters.needsPrepOnly = false;
    }
    if (filter === "needs-prep") {
      djMixerState.collectionFilters.needsPrepOnly = !djMixerState.collectionFilters.needsPrepOnly;
      if (djMixerState.collectionFilters.needsPrepOnly) djMixerState.collectionFilters.preparedOnly = false;
    }
    if (filter === "bpm-missing") djMixerState.collectionFilters.bpmMissingOnly = !djMixerState.collectionFilters.bpmMissingOnly;
    if (filter === "grid-missing") djMixerState.collectionFilters.gridMissingOnly = !djMixerState.collectionFilters.gridMissingOnly;
    if (filter === "key-missing") djMixerState.collectionFilters.keyMissingOnly = !djMixerState.collectionFilters.keyMissingOnly;
    if (filter === "loaded") djMixerState.collectionFilters.loadedOnly = !djMixerState.collectionFilters.loadedOnly;
    renderDjLibrary();
  });
});

djCollectionResetFilters?.addEventListener("click", () => {
  djMixerState.libraryQuery = "";
  djMixerState.collectionFilters = { ...djMixerState.collectionFilters, source: "all", key: "all", bpmMin: "", bpmMax: "", includeLong: false, preparedOnly: false, needsPrepOnly: false, bpmMissingOnly: false, gridMissingOnly: false, keyMissingOnly: false, loadedOnly: false, sort: "prepared" };
  if (djLibrarySearch) djLibrarySearch.value = "";
  localStorage.setItem("brmedia.djMixer.collection.sort", "prepared");
  renderDjLibrary();
});

djPlannerModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    djMixerState.plannerMode = button.dataset.djPlannerMode === "set" ? "set" : "playlist";
    renderCollectionPlanner();
  });
});

djPlanCreateButtons.forEach((button) => {
  button.addEventListener("click", () => createDjCollectionPlan(button.dataset.djPlanCreate || "playlist"));
});

djPlanReadyButtons.forEach((button) => {
  button.addEventListener("click", () => setDjPlanReady(button.dataset.djPlanReady || "set"));
});

djPlanRenameButtons.forEach((button) => {
  button.addEventListener("click", () => renameDjCollectionPlan(button.dataset.djPlanRename || "playlist"));
});

djPlanDeleteButtons.forEach((button) => {
  button.addEventListener("click", () => deleteDjCollectionPlan(button.dataset.djPlanDelete || "playlist"));
});

djPlaylistAddToSetButtons.forEach((button) => {
  button.addEventListener("click", addActivePlaylistToLinkedSet);
});

djRecordingClearBtn?.addEventListener("click", clearRecordingLog);

djPlanOpenActiveButton?.addEventListener("click", () => {
  openDjPlanPage(djMixerState.plannerMode === "set" ? "set" : "playlist");
});

djAddToListCloseButtons.forEach((button) => button.addEventListener("click", closeAddToListPopup));
djAddToListCreateButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const plan = createDjCollectionPlan(button.dataset.djAddCreate || "playlist");
    if (plan && djMixerState.addToListTrackId) {
      addTrackToDjPlan(plan.kind, plan.id, djMixerState.addToListTrackId);
      closeAddToListPopup();
      renderDjLibrary();
    }
  });
});

syncButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const deck = button.dataset.djSyncToggle || "d1";
    const requestedMode = button.dataset.djSyncMode || "beat";
    const sameActiveMode = Boolean(djMixerState.syncByDeck[deck]) && djMixerState.syncModeByDeck[deck] === requestedMode;
    const turningOn = !sameActiveMode;
    djMixerState.syncByDeck[deck] = turningOn;

    if (turningOn) {
      chooseMasterDeckForSync(deck);
      djMixerState.syncModeByDeck[deck] = requestedMode;
      djMixerState.mtByDeck[deck] = true;
      djMixerState.quantizeByDeck[deck] = true;
    }

    // Main SYNC now means BPM + Beat + Quantize. Key Sync stays manual inside the BPM popup.
    applyDeckSync(deck, { align: requestedMode === "beat" && turningOn, forceMaster: turningOn });
    applyDeckVolumes();
    updateBpmUi();
    updateDeckPrepUi();
    drawAllWaveforms();
  });
});

eqModeButtons.forEach((button) => {
  button.addEventListener("click", () => setEqMode(button.dataset.djEqMode || "kill"));
});

waveformModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const activeDeck = djMixerState.bpmEditDeck || "d1";
    setWaveformModeForDeck(activeDeck, button.dataset.djWaveformMode || "3band");
  });
});

waveformZoomButtons.forEach((button) => {
  button.addEventListener("click", () => changeWaveformZoom(djMixerState.bpmEditDeck || "d1", button.dataset.djWaveformZoom || "in"));
});

quantizeToggleButtons.forEach((button) => {
  button.addEventListener("click", () => cycleWaveformThemeForDeck(djMixerState.bpmEditDeck || getCurrentSingleDeck()));
});

gridActionButtons.forEach((button) => {
  const action = button.dataset.djGridAction || "";
  const isHoldNudge = ["nudge-left", "nudge-right", "nudge-left-coarse", "nudge-right-coarse", "stretch-left", "stretch-right"].includes(action);
  button.addEventListener("click", () => handleGridAction(action));
  if (isHoldNudge) {
    button.addEventListener("pointerdown", () => {
      window.clearTimeout(djMixerState.cuePressTimers.get(`grid:${action}`));
      window.clearInterval(djMixerState.cuePressTimers.get(`grid:${action}:repeat`));
      const timeout = window.setTimeout(() => {
        const interval = window.setInterval(() => handleGridAction(action), 92);
        djMixerState.cuePressTimers.set(`grid:${action}:repeat`, interval);
      }, 360);
      djMixerState.cuePressTimers.set(`grid:${action}`, timeout);
    });
    const stopRepeat = () => {
      window.clearTimeout(djMixerState.cuePressTimers.get(`grid:${action}`));
      window.clearInterval(djMixerState.cuePressTimers.get(`grid:${action}:repeat`));
      djMixerState.cuePressTimers.delete(`grid:${action}`);
      djMixerState.cuePressTimers.delete(`grid:${action}:repeat`);
    };
    button.addEventListener("pointerup", stopRepeat);
    button.addEventListener("pointerleave", stopRepeat);
    button.addEventListener("pointercancel", stopRepeat);
  }
});

loopSizeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const deck = button.dataset.djLoopSize === "active" ? getCurrentSingleDeck() : button.dataset.djLoopSize === "d2" ? "d2" : "d1";
    const sizes = DJ_ULTRA_LOOP_SIZES;
    const index = sizes.indexOf(djMixerState.loopSizeByDeck[deck] || "8 Bars");
    djMixerState.loopSizeByDeck[deck] = sizes[(index + 1) % sizes.length];
    updateWaveformControls();
  });
});

waveformDeckPanels.forEach((panel) => {
  panel.addEventListener("click", () => {
    djMixerState.bpmEditDeck = panel.dataset.djWaveformDeck === "d2" ? "d2" : "d1";
    updateWaveformControls();
    drawAllWaveforms();
  });
});

waveformOverviewCanvases.forEach((canvas) => {
  canvas.addEventListener("pointerdown", (event) => seekDeckFromWaveform(getWaveformCanvasDeck(canvas, "djWaveformOverview"), event, true));
});

waveformMainCanvases.forEach((canvas) => {
  canvas.addEventListener("pointerdown", (event) => seekDeckFromWaveform(getWaveformCanvasDeck(canvas, "djWaveformMain"), event, false));
});

function setSingleDeckTab(tab) {
  djMixerState.singleDeckTab = ["main", "grid", "memory", "hotcue", "fx"].includes(tab) ? tab : "main";
  const isStemsTab = djMixerState.singleDeckTab === "fx" && performanceShell?.classList.contains("is-single-deck-mode");
  performanceShell?.classList.toggle("is-stems-tab", isStemsTab);
  document.body.classList.toggle("djSingleDeckStemsMode", isStemsTab);
  renderSingleDeckControls();
}

singleDeckTabButtons.forEach((button) => {
  button.addEventListener("click", () => setSingleDeckTab(button.dataset.djSingleTab || "main"));
});

singleDeckBackButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const duoTab = performanceDeckTabs.find((tab) => tab.dataset.djDeckTab === "duo");
    if (duoTab) setPerformanceDeck(duoTab);
    else setPerformanceMode("mixer");
  });
});

function applySingleDeckBpmInput() {
  const deck = getCurrentSingleDeck();
  const nextBpm = Math.max(40, Math.min(240, Number.parseFloat(singleDeckBpmInput?.value || "170") || 170));
  const currentBpm = Number(djMixerState.bpmByDeck?.[deck] || 170);
  if (Math.abs(currentBpm - nextBpm) < 0.005) return;

  pushDeckGridUndo(deck);
  setGridBpmKeepingPlayhead(deck, nextBpm, { updateSource: true });
  saveTrackGridForDeck(deck);
  applyDeckSync(deck, { align: false });
  updateBpmUi();
  updateDeckPrepUi();
  drawAllWaveforms();
}

singleDeckBpmInput?.addEventListener("input", applySingleDeckBpmInput);
singleDeckBpmInput?.addEventListener("change", applySingleDeckBpmInput);

singleDeckLoopButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const deck = getCurrentSingleDeck();
    const action = button.dataset.djSingleLoop || "";
    const audio = djAudio[deck];
    const beat = getBeatIntervalForDeck(deck);
    if (!audio && !["auto-down", "auto-up"].includes(action)) return;

    if (action === "jump-back" && audio) {
      audio.currentTime = getPreparedCueTime(deck, Number(audio.currentTime || 0) - beat * 4);
      markManualWaveformSeek(deck);
    }
    if (action === "jump-forward" && audio) {
      audio.currentTime = getPreparedCueTime(deck, Number(audio.currentTime || 0) + beat * 4);
      markManualWaveformSeek(deck);
    }
    if (action === "auto") setAutoLoopForDeck(deck);
    if (action === "loop-in" && audio) {
      djMixerState.loopInPointByDeck[deck] = getCueSnapTime(deck, Number(audio.currentTime || 0), { allowQuantize: true });
    }
    if (action === "loop-out" && audio) {
      const start = Number.isFinite(Number(djMixerState.loopInPointByDeck?.[deck]))
        ? Number(djMixerState.loopInPointByDeck[deck])
        : getCueSnapTime(deck, Number(audio.currentTime || 0) - getLoopSeconds(deck), { allowQuantize: true });
      const end = getCueSnapTime(deck, Number(audio.currentTime || 0), { allowQuantize: true });
      setManualLoopRegion(deck, start, end);
    }
    if (action === "loop-exit") clearDeckLoop(deck);
    if (action === "reloop") {
      const loop = djMixerState.loopRegionByDeck?.[deck];
      if (loop && audio) {
        djMixerState.loopActiveByDeck[deck] = true;
        audio.currentTime = clampTimeForDeck(deck, Number(loop.start || 0));
        markManualWaveformSeek(deck);
      } else {
        setAutoLoopForDeck(deck, true);
      }
    }
    if (action === "auto-down") {
      const current = Number(djMixerState.autoLoopSizeByDeck?.[deck] || 4);
      djMixerState.autoLoopSizeByDeck[deck] = Math.max(1 / 16, current / 2);
      if (djMixerState.loopActiveByDeck?.[deck]) setAutoLoopForDeck(deck, true);
    }
    if (action === "auto-up") {
      const current = Number(djMixerState.autoLoopSizeByDeck?.[deck] || 4);
      djMixerState.autoLoopSizeByDeck[deck] = Math.min(128, current * 2);
      if (djMixerState.loopActiveByDeck?.[deck]) setAutoLoopForDeck(deck, true);
    }

    renderSingleDeckControls();
    updateDeckPrepUi();
    drawAllWaveforms();
  });
});

function triggerHotCueButton(button) {
  const deck = getCurrentSingleDeck();
  const key = button.dataset.djHotCue;
  const cues = djMixerState.hotCuesByDeck[deck];
  const audio = djAudio[deck];
  if (!key || !audio) return;

  if (djMixerState.hotCueHoldTriggered.has(key)) {
    djMixerState.hotCueHoldTriggered.delete(key);
    return;
  }

  if (djMixerState.hotCueDeleteArmed) {
    delete cues[key];
    djMixerState.hotCueDeleteArmed = false;
  } else if (typeof cues[key] === "number") {
    audio.currentTime = clampTimeForDeck(deck, cues[key]);
    markManualWaveformSeek(deck);
    if (audio.paused) audio.play().catch((err) => console.warn("Hot cue play blocked", err));
  } else {
    cues[key] = getCueSnapTime(deck, Number(audio.currentTime || 0), { allowQuantize: true });
  }

  saveTrackCueDataForDeck(deck);
  renderSingleDeckControls();
  updateDeckPrepUi();
  drawAllWaveforms();
}

singleHotCueButtons.forEach((button) => {
  button.addEventListener("pointerdown", () => {
    const key = button.dataset.djHotCue;
    if (!key) return;
    window.clearTimeout(djMixerState.hotCueHoldTimers.get(key));
    const timer = window.setTimeout(() => {
      const deck = getCurrentSingleDeck();
      delete djMixerState.hotCuesByDeck[deck]?.[key];
      djMixerState.hotCueHoldTriggered.add(key);
      djMixerState.hotCueDeleteArmed = false;
      saveTrackCueDataForDeck(deck);
      renderSingleDeckControls();
      drawAllWaveforms();
    }, 620);
    djMixerState.hotCueHoldTimers.set(key, timer);
  });

  button.addEventListener("pointerup", () => {
    const key = button.dataset.djHotCue;
    window.clearTimeout(djMixerState.hotCueHoldTimers.get(key));
    triggerHotCueButton(button);
  });

  button.addEventListener("pointercancel", () => window.clearTimeout(djMixerState.hotCueHoldTimers.get(button.dataset.djHotCue)));
  button.addEventListener("pointerleave", () => window.clearTimeout(djMixerState.hotCueHoldTimers.get(button.dataset.djHotCue)));
});

singleHotCueClearButton?.addEventListener("click", () => {
  djMixerState.hotCueDeleteArmed = !djMixerState.hotCueDeleteArmed;
  renderSingleDeckControls();
});

memoryOpenButtons.forEach((button) => button.addEventListener("click", () => openMemoryCuePopup(getCurrentSingleDeck())));
memoryCuePopupCloseButtons.forEach((button) => button.addEventListener("click", closeMemoryCuePopup));
memoryCuePopupActionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const deck = djMixerState.memoryPopupDeck || getCurrentSingleDeck();
    const action = button.dataset.djMemoryPopupAction || "";
    if (action === "save") saveMemoryCue(deck, Number(djAudio[deck]?.currentTime || 0));
    if (action === "sort") {
      djMixerState.memoryPointsByDeck[deck].sort((a, b) => a - b);
      saveTrackCueDataForDeck(deck);
      renderMemoryCuePopup(deck);
    }
    if (action === "clear-all") {
      if (!window.confirm("Clear all memory cues for this deck?")) return;
      djMixerState.memoryPointsByDeck[deck] = [];
      djMixerState.memoryIndexByDeck[deck] = 0;
      saveTrackCueDataForDeck(deck);
      renderSingleDeckControls();
      renderMemoryCuePopup(deck);
      drawAllWaveforms();
    }
  });
});

memoryActionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const deck = getCurrentSingleDeck();
    const action = button.dataset.djMemoryAction || "";
    const audio = djAudio[deck];
    const points = djMixerState.memoryPointsByDeck[deck];
    if (!audio) return;

    if (action === "save") {
      saveMemoryCue(deck, Number(audio.currentTime || 0));
      return;
    } else if (action === "prev" && points.length) {
      activateMemoryCue(deck, Math.max(0, Number(djMixerState.memoryIndexByDeck[deck] || 0) - 1));
      return;
    } else if (action === "next" && points.length) {
      activateMemoryCue(deck, Math.min(points.length - 1, Number(djMixerState.memoryIndexByDeck[deck] || 0) + 1));
      return;
    } else if (action === "clear" && points.length) {
      deleteMemoryCue(deck, Number(djMixerState.memoryIndexByDeck[deck] || 0));
      return;
    } else if (action === "list") {
      openMemoryCuePopup(deck);
      return;
    }

    saveTrackCueDataForDeck(deck);
    renderSingleDeckControls();
    updateDeckPrepUi();
    drawAllWaveforms();
  });
});

singleFxButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const deck = getCurrentSingleDeck();
    const effect = normaliseFxName(button.dataset.djSingleFx || "");
    djMixerState.fxByDeck[deck] = djMixerState.fxByDeck?.[deck] === effect ? "" : effect;

    if (djAudio[deck]?.src) ensureDeckAudioGraph(deck);
    applyDeckFx(deck);
    renderSingleDeckControls();
  });
});

singleFxWet?.addEventListener("input", () => {
  const deck = getCurrentSingleDeck();
  djMixerState.fxWetByDeck[deck] = Number(singleFxWet.value || 35) / 100;
  applyDeckFx(deck);
  renderSingleDeckControls();
});

singleFxWet?.addEventListener("input", renderSingleDeckControls);

singleDeckZoomButtons.forEach((button) => {
  button.addEventListener("click", () => changeWaveformZoom(getCurrentSingleDeck(), button.dataset.djSingleZoom || "in"));
});

window.addEventListener("resize", drawAllWaveforms);

channelFaders.forEach((fader) => {
  fader.addEventListener("pointerdown", (event) => startFaderDrag(fader, event));
});

function setCueButtonMode(deck, mode = "") {
  getTransportButtons(deck, "cue").forEach((button) => {
    button.classList.toggle("is-cue-active", mode === "preview");
    button.classList.toggle("is-cue-set", mode === "set");
    button.classList.toggle("is-cue-return", mode === "return");
  });
}

function flashCueSet(deck) {
  setCueButtonMode(deck, "set");
  window.clearTimeout(djMixerState.cuePressTimers.get(`${deck}:flash`));
  djMixerState.cuePressTimers.set(`${deck}:flash`, window.setTimeout(() => setCueButtonMode(deck, ""), 520));
}

function shouldSetCueOnPress(deck) {
  if (!djDeckState[deck]?.item) return false;
  const current = clampTimeForDeck(deck, getDeckCurrentTime(deck));
  const existingCue = clampTimeForDeck(deck, Number(djMixerState.cuePointByDeck?.[deck] || 0));
  const hasExistingCue = existingCue > 0.035;
  const farFromCue = Math.abs(current - existingCue) > 0.09;
  return current > 0.035 && (!hasExistingCue || wasManualWaveformSeekRecent(deck, 4500) || farFromCue);
}

function setCueAtCurrentPlayhead(deck, { flash = true } = {}) {
  if (!djDeckState[deck]?.item) return 0;
  const current = clampTimeForDeck(deck, getDeckCurrentTime(deck));
  const cueTime = setDeckCuePoint(deck, current, { movePlayhead: true, snap: true });
  if (isDjEngineV2Ready()) window.BRMediaDjEngine.seek(deck, cueTime);
  if (flash) flashCueSet(deck);
  updateDeckTimeDisplays();
  updateSingleDeckLiveMeta();
  drawAllWaveforms();
  return cueTime;
}

function startCuePreview(deck, event) {
  event?.preventDefault?.();
  if (!djDeckState[deck]?.item) return;

  window.clearTimeout(djMixerState.cuePressTimers.get(deck));
  djMixerState.cuePreviewStopByDeck[deck]?.();
  djMixerState.cuePreviewStopByDeck[deck] = null;

  if (isDjEngineV2Ready()) {
    if (window.BRMediaDjEngine.isPlaying(deck)) {
      cueDeck(deck);
      return;
    }

    if (shouldSetCueOnPress(deck)) {
      const timer = window.setTimeout(() => {
        setCueAtCurrentPlayhead(deck);
        djMixerState.cuePressTimers.delete(deck);
      }, 220);
      djMixerState.cuePressTimers.set(deck, timer);
      return;
    }

    const cueTime = clampTimeForDeck(deck, Number(djMixerState.cuePointByDeck?.[deck] || 0));
    setDeckCurrentTime(deck, cueTime);
    applyDeckVolumes();

    window.BRMediaDjEngine.play(deck, { offset: cueTime }).then(() => {
      djDeckState[deck].playing = true;
      setCueButtonMode(deck, "preview");
      startWaveformAnimation();
      startMeterAnimation();
    }).catch((err) => {
      console.warn("Cue preview failed", err);
      if (djLibraryStatus) djLibraryStatus.textContent = `Cue preview failed: ${String(err?.message || err)}`;
    });

    const stop = (stopEvent) => {
      stopEvent?.preventDefault?.();
      window.BRMediaDjEngine.pause(deck);
      setDeckCurrentTime(deck, cueTime);
      djDeckState[deck].playing = false;
      saveTrackCueDataForDeck(deck);
      setCueButtonMode(deck, "");
      updateMediaSession(deck);
      updateTransportButtons();
      updateDjCollectionMiniPlayer();
      updateDeckTimeDisplays();
      drawAllWaveforms();
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      djMixerState.cuePreviewStopByDeck[deck] = null;
    };

    djMixerState.cuePreviewStopByDeck[deck] = stop;
    window.addEventListener("pointerup", stop, { passive: false });
    window.addEventListener("pointercancel", stop, { passive: false });
    return;
  }

  const audio = djAudio[deck];
  if (!audio || !djDeckState[deck]?.item) return;
  if (!ensureDeckAudioSource(deck)) return;

  window.clearTimeout(djMixerState.cuePressTimers.get(deck));
  djMixerState.cuePreviewStopByDeck[deck]?.();
  djMixerState.cuePreviewStopByDeck[deck] = null;

  if (!audio.paused && !audio.ended) {
    cueDeck(deck);
    return;
  }

  if (shouldSetCueOnPress(deck)) {
    const timer = window.setTimeout(() => {
      setCueAtCurrentPlayhead(deck);
      djMixerState.cuePressTimers.delete(deck);
    }, 220);
    djMixerState.cuePressTimers.set(deck, timer);
    return;
  }

  const cueTime = clampTimeForDeck(deck, Number(djMixerState.cuePointByDeck?.[deck] || 0));
  audio.currentTime = cueTime;
  audio.muted = false;
  audio.volume = Math.max(0.05, Number(audio.volume || 1));
  applyDeckVolumes();

  audio.play().then(() => {
    djDeckState[deck].playing = true;
    setCueButtonMode(deck, "preview");
    startWaveformAnimation();
    startMeterAnimation();
  }).catch((err) => {
    console.warn("Cue preview failed", err);
    if (djLibraryStatus) djLibraryStatus.textContent = `Cue preview failed: ${String(err?.message || err)}`;
  });

  const stop = (stopEvent) => {
    stopEvent?.preventDefault?.();
    audio.pause();
    audio.currentTime = clampTimeForDeck(deck, cueTime);
    djDeckState[deck].playing = false;
    saveTrackCueDataForDeck(deck);
    setCueButtonMode(deck, "");
    updateMediaSession(deck);
    updateTransportButtons();
    updateDjCollectionMiniPlayer();
    updateDeckTimeDisplays();
    drawAllWaveforms();
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
    djMixerState.cuePreviewStopByDeck[deck] = null;
  };

  djMixerState.cuePreviewStopByDeck[deck] = stop;
  window.addEventListener("pointerup", stop, { passive: false });
  window.addEventListener("pointercancel", stop, { passive: false });
}

function finishCuePress(deck, event) {
  event?.preventDefault?.();
  const pending = djMixerState.cuePressTimers.get(deck);
  if (pending) {
    window.clearTimeout(pending);
    djMixerState.cuePressTimers.delete(deck);
    setCueAtCurrentPlayhead(deck);
  }
}

function updateRecordBeaconUi() {
  if (!djRecBeacon) return;

  const strong = djRecBeacon.querySelector("strong");
  const span = djRecBeacon.querySelector("span");
  const state = djMixerState.recordState || "ready";

  djRecBeacon.classList.toggle("is-counting", state === "countdown");
  djRecBeacon.classList.toggle("is-recording", state === "recording");
  djRecBeacon.classList.toggle("is-saving", state === "saving");

  if (strong) {
    strong.textContent = state === "recording" ? "REC LIVE" : state === "countdown" ? "REC IN" : state === "saving" ? "SAVING" : "REC READY";
  }

  if (span) {
    if (state === "recording") {
      const elapsed = Math.max(0, Math.floor((Date.now() - Number(djMixerState.recordStartedAt || Date.now())) / 1000));
      span.textContent = formatDeckClock(elapsed);
    } else if (state !== "countdown" && state !== "saving") {
      span.textContent = "--:--";
    }
  }
}

function startDjRecordCountdown() {
  if (!djRecBeacon) return;

  if (djMixerState.recordState === "recording") {
    stopBrowserRecording();
    return;
  }

  if (djMixerState.recordState === "countdown") {
    window.clearInterval(djMixerState.recordCountdownTimer);
    djMixerState.recordState = "ready";
    updateRecordBeaconUi();
    updateRecordStatusText("Cancelled");
    return;
  }

  if (djMixerState.recordState === "saving") return;

  const setup = readSetup();
  let remaining = Math.max(0, Number.parseInt(setup.countdown || "6", 10) || 0);

  if (remaining <= 0) {
    setPerformanceMode("main");
    startBrowserRecording();
    return;
  }

  djMixerState.recordState = "countdown";
  const span = djRecBeacon.querySelector("span");
  if (span) span.textContent = String(remaining);
  updateRecordBeaconUi();

  window.clearInterval(djMixerState.recordCountdownTimer);
  djMixerState.recordCountdownTimer = window.setInterval(() => {
    remaining -= 1;

    if (remaining <= 0) {
      window.clearInterval(djMixerState.recordCountdownTimer);
      setPerformanceMode("main");
      startBrowserRecording();
      return;
    }

    const countdownSpan = djRecBeacon.querySelector("span");
    if (countdownSpan) countdownSpan.textContent = String(remaining);
  }, 1000);
}

djRecBeacon?.addEventListener("click", startDjRecordCountdown);

transportButtons.forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    const deck = button.dataset.djDeck || "d1";

    if (button.dataset.djTransport === "cue") {
      startCuePreview(deck, event);
      return;
    }
  }, { passive: false });

  button.addEventListener("pointerup", (event) => {
    const deck = button.dataset.djDeck || "d1";
    if (button.dataset.djTransport === "cue") finishCuePress(deck, event);
  }, { passive: false });

  button.addEventListener("pointercancel", (event) => {
    const deck = button.dataset.djDeck || "d1";
    if (button.dataset.djTransport === "cue") finishCuePress(deck, event);
  }, { passive: false });

  button.addEventListener("click", (event) => {
    const deck = button.dataset.djDeck || "d1";

    if (button.dataset.djTransport === "cue") {
      event.preventDefault();
      return;
    }

    toggleTransport(deck);
  });
});

if (isDjEngineV2Ready()) {
  window.BRMediaDjEngine.on("status", ({ deck, status, error }) => {
    const label = status === "ready" ? "ready — press Play" : status === "failed" ? `failed — ${error || "decode error"}` : status;
    setDeckEngineStatus(deck, label);
  });

  window.BRMediaDjEngine.on("tick", () => {
    updateDeckTimeDisplays();
    updateDeckPreviewStates();
    updateSingleDeckLiveMeta();
    updateDjCollectionMiniPlayer();
    updateMediaSession(getNowPlayingDeck());
  });

  window.BRMediaDjEngine.on("ended", ({ deck }) => {
    if (djDeckState[deck]) djDeckState[deck].playing = false;
    rememberBackgroundPlaybackIntent("ended");
    updateMediaSession(deck);
    updateTransportButtons();
    updateDjCollectionMiniPlayer();
    drawAllWaveforms();
  });

  window.BRMediaDjEngine.getServices();
}

Object.entries(djAudio).forEach(([deck, audio]) => bindDeckAudioElementEvents(deck, audio));

document.querySelectorAll("[data-route]").forEach((button) => {
  button.addEventListener("click", () => navigateTo(button.dataset.route || ""));
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  if (memoryCuePopup && !memoryCuePopup.classList.contains("hidden")) {
    closeMemoryCuePopup();
    return;
  }

  if (!performanceShell?.classList.contains("hidden")) {
    hidePerformance();
    return;
  }

  closeModuleSidebar();
});

window.visualViewport?.addEventListener("resize", syncPerformanceViewportVars);
window.addEventListener("resize", syncPerformanceViewportVars);

window.addEventListener("DOMContentLoaded", () => {
  markAndroidDeviceClass();
  forceDarkRenderSurface();
  const setup = readSetup();
  applySetupToFields(setup);
  applySetupToChoiceButtons(setup);
  updateSetupPreview(setup);
  setView("home");
  hydrateIcons(document);
  resetCrossfader();

  channelFaders.forEach((fader) => {
    const deck = fader.dataset.djChannelFader || "d1";
    fader.style.setProperty("--dj-fader-pos", `${Math.round((1 - (djDeckState[deck]?.volume || 0.8)) * 100)}%`);
  });

  resetMeterBars();
  updateBpmUi();
  updateCrossfaderModeUi();
  setupMediaSessionActions();
  updateNativeBackgroundModeClass();
  updateWaveformControls();
  drawAllWaveforms();
  setEqMode(djMixerState.eqMode || "knob");
  renderLiveFxPads();
  renderFxSelectorBank();
  void syncServerRecordingLog();
  void loadServerDjPrepCache({ silent: true });
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    rememberBackgroundPlaybackIntent("hidden");
    getPlayingDeckIds().forEach(primeDeckForBackgroundPlayback);
    updateNativeBackgroundModeClass();
    updateMediaSession();
    return;
  }

  if (!IS_IOS_BACKGROUND_AUDIO_MODE) void resumeDjAudioContextIfNeeded();

  window.clearTimeout(backgroundResumeTimer);
  backgroundResumeTimer = window.setTimeout(restoreBackgroundPlaybackIfNeeded, 120);
  updateNativeBackgroundModeClass();
  updateMediaSession();
});

window.addEventListener("pagehide", () => {
  rememberBackgroundPlaybackIntent("pagehide");
  getPlayingDeckIds().forEach(primeDeckForBackgroundPlayback);
  updateMediaSession();
});

window.addEventListener("pageshow", () => {
  if (!IS_IOS_BACKGROUND_AUDIO_MODE) void resumeDjAudioContextIfNeeded();
  window.clearTimeout(backgroundResumeTimer);
  backgroundResumeTimer = window.setTimeout(restoreBackgroundPlaybackIfNeeded, 160);
  updateNativeBackgroundModeClass();
  updateMediaSession();
});