(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const checklistStorageKey = "brmedia.djMixerRestart.checklist.v1";
  const mixSetupStorageKey = "brmedia.djMixerRestart.mixSetup.v1";
  const setPlanStorageKey = "brmedia.djMixerRestart.setPlan.v1";
  const fxSetupStorageKey = "brmedia.djMixerRestart.fxSetup.v1";
  const recordSetupStorageKey = "brmedia.djMixerRestart.recordSetup.v1";

  function hydrateDjIcons(root = document) {
    const target = root && root.nodeType === 1 ? root : document;
    const run = () => window.BRMediaIcons?.safeHydrateIcons?.(target);

    if (!window.BRMediaIcons?.safeHydrateIcons) return;

    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(run, { timeout: 1200 });
      return;
    }

    window.setTimeout(run, 120);
  }

  function readJson(key, fallback = {}) {
    try {
      return JSON.parse(window.localStorage.getItem(key) || "null") ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value || {}));
    } catch {}
  }

  function readChecklistState() {
    return readJson(checklistStorageKey, {});
  }

  function writeChecklistState(state) {
    writeJson(checklistStorageKey, state || {});
  }

  function updateChecklistProgress() {
    const boxes = $$("[data-dj-check-item]");
    const total = boxes.length;
    const done = boxes.filter((box) => box.checked).length;
    const progress = $("[data-dj-check-progress]");

    if (progress) progress.textContent = `${done} / ${total} complete`;
    document.body.dataset.djChecklistDone = String(done);
    document.body.dataset.djChecklistTotal = String(total);
  }

  function bindBuildChecklist() {
    const boxes = $$("[data-dj-check-item]");
    if (!boxes.length) return;

    const saved = readChecklistState();

    boxes.forEach((box) => {
      const id = box.dataset.djCheckItem;
      if (!id) return;

      if (Object.prototype.hasOwnProperty.call(saved, id)) {
        box.checked = Boolean(saved[id]);
      }

      box.addEventListener("change", () => {
        const next = readChecklistState();
        next[id] = Boolean(box.checked);
        writeChecklistState(next);
        updateChecklistProgress();
      });
    });

    updateChecklistProgress();
  }

  function readMixSetup() {
    return readJson(mixSetupStorageKey, {});
  }

  function collectMixSetup() {
    const data = readMixSetup();

    $$("[data-dj-mix-field]").forEach((field) => {
      const key = field.dataset.djMixField;
      if (!key) return;

      if (field.type === "checkbox") {
        data[key] = Boolean(field.checked);
      } else {
        data[key] = field.value || "";
      }
    });

    const selectedCategory = $("[data-dj-mix-category].is-active")?.dataset.djMixCategory || data.brmediaCategory || "Other Mixes";
    data.brmediaCategory = selectedCategory;
    data.savedAt = new Date().toISOString();

    return data;
  }

  function updateMixSetupPreview(data = readMixSetup()) {
    const preview = $("[data-dj-mix-cover-preview]");
    if (preview) {
      const image = data.coverDataUrl || "";
      preview.style.backgroundImage = image ? `url("${image}")` : "";
      preview.classList.toggle("has-image", Boolean(image));
    }

    const status = $("[data-dj-mix-status]");
    if (status && data.savedAt) {
      status.textContent = `Saved ${new Date(data.savedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}`;
    }
  }

  function applyMixSetup() {
    const data = readMixSetup();

    $$("[data-dj-mix-field]").forEach((field) => {
      const key = field.dataset.djMixField;
      if (!key || !Object.prototype.hasOwnProperty.call(data, key)) return;

      if (field.type === "checkbox") {
        field.checked = Boolean(data[key]);
      } else {
        field.value = data[key] || "";
      }
    });

    $$("[data-dj-mix-category]").forEach((button) => {
      const active = (button.dataset.djMixCategory || "") === (data.brmediaCategory || "Other Mixes");
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    updateMixSetupPreview(data);
  }

  function saveMixSetup({ next = false } = {}) {
    const data = collectMixSetup();
    writeJson(mixSetupStorageKey, data);
    updateMixSetupPreview(data);

    const status = $("[data-dj-mix-status]");
    if (status) status.textContent = next ? "Mix setup saved. Opening Set Plan…" : "Mix setup saved.";

    if (next) {
      window.setTimeout(() => setStudioView("set-plan"), 180);
    }
  }

  function bindMixSetup() {
    applyMixSetup();

    $$("[data-dj-mix-category]").forEach((button) => {
      button.addEventListener("click", () => {
        $$("[data-dj-mix-category]").forEach((item) => {
          const active = item === button;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", active ? "true" : "false");
        });
      });
    });

    $("[data-dj-mix-save]")?.addEventListener("click", () => saveMixSetup());
    $("[data-dj-mix-save-next]")?.addEventListener("click", () => saveMixSetup({ next: true }));

    $("[data-dj-mix-cover-pick]")?.addEventListener("click", () => {
      $("[data-dj-mix-cover-input]")?.click();
    });

    $("[data-dj-mix-cover-clear]")?.addEventListener("click", () => {
      const data = collectMixSetup();
      data.coverDataUrl = "";
      writeJson(mixSetupStorageKey, data);
      updateMixSetupPreview(data);
    });

    $("[data-dj-mix-cover-input]")?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const data = collectMixSetup();
        data.coverName = file.name || "";
        data.coverDataUrl = String(reader.result || "");
        writeJson(mixSetupStorageKey, data);
        updateMixSetupPreview(data);
      };
      reader.readAsDataURL(file);
    });
  }
	
  function getSetPlanLibraryTracks() {
    return [
      { id: "sp-lib-001", title: "Everybody, Shake Your Body", artist: "Ultravibes", bpm: "170", key: "1A" },
      { id: "sp-lib-002", title: "The Ultimate Seduction", artist: "DJ Seduction", bpm: "170", key: "4A" },
      { id: "sp-lib-003", title: "Firewire", artist: "Rasper & Golly Vs DJ Kurt", bpm: "170", key: "1A" },
      { id: "sp-lib-004", title: "Hardcore Medley Starter", artist: "Upalnite", bpm: "175", key: "2A" },
      { id: "sp-lib-005", title: "Blackburn Ravers Intro", artist: "DJ NJ & Upalnite", bpm: "172", key: "5A" },
    ];
  }

  function readSetPlan() {
    const data = readJson(setPlanStorageKey, {});
    return {
      mode: data.mode === "timestamps" ? "timestamps" : "normal",
      tracks: Array.isArray(data.tracks) ? data.tracks : [],
      savedAt: data.savedAt || "",
    };
  }

  function collectSetPlan() {
    const current = readSetPlan();
    const selectedMode = $("[data-dj-setplan-mode].is-active")?.dataset.djSetplanMode || current.mode || "normal";

    return {
      ...current,
      mode: selectedMode === "timestamps" ? "timestamps" : "normal",
      savedAt: new Date().toISOString(),
    };
  }

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[char] || char));
  }

  function updateSetPlanStatus(data = readSetPlan(), savedText = "") {
    const count = $("[data-dj-setplan-count]");
    const status = $("[data-dj-setplan-status]");
    const modeLabel = data.mode === "timestamps" ? "Tracklist + timestamps" : "Normal tracklist";

    if (count) count.textContent = `${data.tracks.length} selected`;

    if (status) {
      status.textContent = savedText || (data.savedAt
        ? `Saved ${new Date(data.savedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}`
        : `${modeLabel} ready`);
    }
  }

  function renderSetPlanList() {
    const data = readSetPlan();
    const list = $("[data-dj-setplan-list]");
    if (!list) return;

    if (!data.tracks.length) {
      list.innerHTML = `
        <div class="brDjSetPlanEmpty">
          <span class="brDjSetPlanEmptyIcon" aria-hidden="true">♫</span>
          <strong>No songs selected yet</strong>
          <span>Open the Set Plan library and add tracks in the order you want them.</span>
        </div>
      `;
    } else {
      list.innerHTML = data.tracks.map((track, index) => `
        <article class="brDjSetTrack" data-dj-set-track="${track.uid}">
          <em>${String(index + 1).padStart(2, "0")}</em>
          <span>
            <strong>${escapeHtml(track.title || "Untitled track")}</strong>
            <small>${escapeHtml(track.artist || "Unknown artist")} · ${escapeHtml(track.bpm || "—")} BPM · ${escapeHtml(track.key || "—")}</small>
          </span>
          <div>
            <button type="button" data-dj-set-move="up" data-dj-set-track="${track.uid}" aria-label="Move up"><span aria-hidden="true">↑</span></button>
            <button type="button" data-dj-set-move="down" data-dj-set-track="${track.uid}" aria-label="Move down"><span aria-hidden="true">↓</span></button>
            <button type="button" data-dj-set-remove="${track.uid}" aria-label="Remove"><span aria-hidden="true">×</span></button>
          </div>
        </article>
      `).join("");
    }

    updateSetPlanStatus(data);
  }

  function renderSetPlanLibrary() {
    const list = $("[data-dj-setplan-library-list]");
    if (!list) return;

    list.innerHTML = getSetPlanLibraryTracks().map((track) => `
      <article class="brDjSetLibraryTrack">
        <span>
          <strong>${escapeHtml(track.title)}</strong>
          <small>${escapeHtml(track.artist)} · ${escapeHtml(track.bpm)} BPM · ${escapeHtml(track.key)}</small>
        </span>

        <button type="button" data-dj-set-add-track="${track.id}">
          <i class="fa-duotone fa-plus"></i>
          <span>Add to set</span>
        </button>
      </article>
    `).join("");

    hydrateDjIcons(list);
  }

  function setSetPlanLibrary(open) {
    const sheet = $("[data-dj-setplan-library]");
    if (!sheet) return;

    sheet.classList.toggle("is-open", !!open);
    sheet.setAttribute("aria-hidden", open ? "false" : "true");

    if (open) renderSetPlanLibrary();
  }

  function saveSetPlan({ next = false } = {}) {
    const data = collectSetPlan();
    writeJson(setPlanStorageKey, data);
    updateSetPlanStatus(data, next ? "Set Plan saved. Opening FX Boards…" : "Set Plan saved.");

    if (next) {
      window.setTimeout(() => setStudioView("fx-setup"), 180);
    }
  }

  function bindSetPlan() {
    const data = readSetPlan();

    $$("[data-dj-setplan-mode]").forEach((button) => {
      const active = button.dataset.djSetplanMode === data.mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");

      button.addEventListener("click", () => {
        $$("[data-dj-setplan-mode]").forEach((item) => {
          const selected = item === button;
          item.classList.toggle("is-active", selected);
          item.setAttribute("aria-pressed", selected ? "true" : "false");
        });

        saveSetPlan();
      });
    });

    $("[data-dj-setplan-open-library]")?.addEventListener("click", () => setSetPlanLibrary(true));
    $("[data-dj-setplan-close-library]")?.addEventListener("click", () => setSetPlanLibrary(false));
    $("[data-dj-setplan-save]")?.addEventListener("click", () => saveSetPlan());
    $("[data-dj-setplan-save-next]")?.addEventListener("click", () => saveSetPlan({ next: true }));

    document.addEventListener("click", (event) => {
      const addButton = event.target?.closest?.("[data-dj-set-add-track]");
      if (addButton) {
        const track = getSetPlanLibraryTracks().find((item) => item.id === addButton.dataset.djSetAddTrack);
        if (!track) return;

        const next = collectSetPlan();
        next.tracks.push({
          ...track,
          uid: `${track.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        });

        writeJson(setPlanStorageKey, next);
        renderSetPlanList();
        updateSetPlanStatus(next, "Track added to Set Plan.");
        return;
      }

      const removeButton = event.target?.closest?.("[data-dj-set-remove]");
      if (removeButton) {
        const next = collectSetPlan();
        next.tracks = next.tracks.filter((track) => track.uid !== removeButton.dataset.djSetRemove);

        writeJson(setPlanStorageKey, next);
        renderSetPlanList();
        updateSetPlanStatus(next, "Track removed.");
        return;
      }

      const moveButton = event.target?.closest?.("[data-dj-set-move]");
      if (moveButton) {
        const uid = moveButton.dataset.djSetTrack;
        const direction = moveButton.dataset.djSetMove;
        const next = collectSetPlan();
        const index = next.tracks.findIndex((track) => track.uid === uid);
        const target = direction === "up" ? index - 1 : index + 1;

        if (index < 0 || target < 0 || target >= next.tracks.length) return;

        const [track] = next.tracks.splice(index, 1);
        next.tracks.splice(target, 0, track);

        writeJson(setPlanStorageKey, next);
        renderSetPlanList();
        updateSetPlanStatus(next, "Set order updated.");
      }
    });

    renderSetPlanList();
  }
	
  function getFxLibrary() {
    return [
      { id: "lpf", name: "Low-Pass Filter (LPF)", family: "Native filter", description: "Cuts high frequencies." },
      { id: "hpf", name: "High-Pass Filter (HPF)", family: "Native filter", description: "Cuts low frequencies." },
      { id: "bpf", name: "Band-Pass Filter (BPF)", family: "Native filter", description: "Isolates a narrow middle frequency band." },
      { id: "delay", name: "Delay", family: "Native time", description: "Holds back and outputs the signal." },
      { id: "distortion", name: "Distortion", family: "Native drive", description: "Overdrives and shapes the audio waves." },
      { id: "auto-pan", name: "Auto Pan", family: "Native motion", description: "Moves sound between left and right channels." },
      { id: "gater", name: "Volume Trans / Gater", family: "Native rhythm", description: "Rhythmically drops volume to zero." },
      { id: "compressor", name: "Compressor / Limiter", family: "Native dynamics", description: "Controls peaks and flattens loud sounds." },
      { id: "eq3", name: "3-Band Equalizer (EQ)", family: "Native tone", description: "Controls Low, Mid and High knobs independently." },

      { id: "echo", name: "Echo", family: "Compound delay", description: "Delay routing back into itself with fading volume." },
      { id: "dub-echo", name: "Dub Echo", family: "Compound delay", description: "Echo with an internal low-pass filter." },
      { id: "low-cut-echo", name: "Low Cut Echo", family: "Compound delay", description: "Echo with an internal high-pass filter." },
      { id: "ping-pong", name: "Ping Pong Delay", family: "Compound delay", description: "Bounces delayed audio between left and right channels." },
      { id: "phaser", name: "Phaser", family: "Compound modulation", description: "Cascades all-pass filters with a low-frequency oscillator." },
      { id: "flanger", name: "Flanger", family: "Compound modulation", description: "Combines dry audio with a short, modulated delay." },
      { id: "chorus", name: "Chorus", family: "Compound modulation", description: "Thickens audio using multiple slightly detuned delays." },
      { id: "reverb", name: "Reverb", family: "Compound space", description: "Simulates acoustic space using room impulse responses." },
      { id: "noise", name: "Noise", family: "Compound texture", description: "Generates white-noise static." },
      { id: "ring-mod", name: "Ring Modulator", family: "Compound tone", description: "Multiplies the signal against a sine wave." },

      { id: "pitch-shift", name: "Pitch Shifter", family: "Playback & buffer", description: "Alters pitch by manipulating playback speed." },
      { id: "vinyl-brake", name: "Vinyl Brake", family: "Playback & buffer", description: "Automates playback speed linearly down to zero." },
      { id: "beat-roll", name: "Beat Roll", family: "Playback & buffer", description: "Loops micro-segments of the audio buffer instantly." },
      { id: "stutter", name: "Stutter", family: "Playback & buffer", description: "Rapidly re-triggers audio buffer start times." },
      { id: "key-lock", name: "Pitch-Correction / Key Lock", family: "Playback & buffer", description: "Keeps the original key during speed changes." },

      { id: "freq-shift", name: "Frequency Shifter", family: "Advanced math", description: "Detunes track harmonics up or down." },
      { id: "mobius", name: "Frequency Mobius", family: "Advanced math", description: "Creates a rising or falling sonic illusion." },
      { id: "granular", name: "Granular Glitch / Slicer", family: "Advanced math", description: "Breaks audio into grains and scrambles them." },
      { id: "saturator", name: "Saturator / Analog Warmth", family: "Advanced math", description: "Simulates tube-style non-linear warmth." },
      { id: "shimmer", name: "Frequency Shimmer", family: "Advanced math", description: "Feeds a reverb network back into a pitch shifter." },
      { id: "bitcrusher", name: "Bitcrusher", family: "Advanced math", description: "Downsamples digital resolution for lo-fi grit." },
      { id: "tape-delay", name: "Tape Delay", family: "Advanced math", description: "Adds wow and flutter pitch drift to echo." },
      { id: "spiral", name: "Spiral", family: "Advanced math", description: "Feedback delay that continuously bends pitch." },
      { id: "helix", name: "Helix", family: "Advanced math", description: "Freezes a micro-segment into a looping drone tone." },
      { id: "sweep", name: "Sweep", family: "Advanced math", description: "Aggressive band-pass filter sweeping the range." },
      { id: "space", name: "Space", family: "Advanced math", description: "Wide, cavernous echo focused on mids and highs." },
      { id: "crush", name: "Crush", family: "Advanced math", description: "Downsamples quality while mixing in a sharp sweep." },
      { id: "megaphone", name: "Megaphone", family: "Advanced math", description: "Restricts frequencies and adds bullhorn-style distortion." },
      { id: "chorus-flanger", name: "Chorus-Flanger", family: "Advanced math", description: "Cross-modulates a flanger with a wide chorus layer." },
      { id: "brake-echo", name: "Brake Echo", family: "Advanced math", description: "Combines a vinyl slowdown with a trailing echo tail." },
      { id: "combo-filter", name: "Combo Filter", family: "Advanced math", description: "Chains multiple moving filters for complex sweeps." },
      { id: "duck-delay", name: "Duck Delay", family: "Advanced math", description: "Delay ducks under the music and swells during gaps." },
      { id: "overdrive", name: "Overdrive", family: "Advanced math", description: "Pushes gain hard for heavy clipping." },

      { id: "tremolo", name: "Tremolo", family: "Extra dynamic", description: "Smoothly pulses the signal level up and down." },
      { id: "reverse-roll", name: "Reverse Roll", family: "Extra buffer", description: "Throws short reversed loop slices for transitions." },
      { id: "freeze", name: "Freeze", family: "Extra texture", description: "Captures and holds a tiny slice for a frozen tail." },
      { id: "isolator", name: "Isolator", family: "Extra tone", description: "Strong DJ-style low, mid and high cut/boost control." },
    ];
  }

  function readFxSetup() {
    const data = readJson(fxSetupStorageKey, {});
    const rawAssignments = data.assignments && typeof data.assignments === "object" ? data.assignments : {};
    const allowedBoards = ["board1", "board2", "board3", "board4"];
    const counts = { board1: 0, board2: 0, board3: 0, board4: 0 };
    const assignments = {};

    getFxLibrary().forEach((effect) => {
      const board = rawAssignments[effect.id];
      if (allowedBoards.includes(board) && counts[board] < 9) {
        assignments[effect.id] = board;
        counts[board] += 1;
      }
    });

    return {
      assignments,
      savedAt: data.savedAt || "",
    };
  }

  function getFxBoardCounts(data = readFxSetup()) {
    const counts = { board1: 0, board2: 0, board3: 0, board4: 0 };

    Object.values(data.assignments || {}).forEach((board) => {
      if (Object.prototype.hasOwnProperty.call(counts, board)) counts[board] += 1;
    });

    return counts;
  }

  function updateFxSetupStatus(data = readFxSetup(), savedText = "") {
    const status = $("[data-dj-fx-status]");
    const countsText = $("[data-dj-fx-status-counts]");
    const counts = getFxBoardCounts(data);

    if (status) {
      status.textContent = savedText || (data.savedAt
        ? `Saved ${new Date(data.savedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}`
        : "4 boards ready");
    }

    if (countsText) {
      countsText.textContent = `Board 1 ${counts.board1} / 9 · Board 2 ${counts.board2} / 9 · Board 3 ${counts.board3} / 9 · Board 4 ${counts.board4} / 9`;
    }

    $$("[data-dj-fx-count]").forEach((node) => {
      const board = node.dataset.djFxCount;
      if (board && Object.prototype.hasOwnProperty.call(counts, board)) {
        node.textContent = `${counts[board]} / 9`;
      }
    });
  }

  function renderFxSetup() {
    const grid = $("[data-dj-fx-grid]");
    if (!grid) return;

    const data = readFxSetup();
      const boardClass = {
        board1: "is-board-1",
        board2: "is-board-2",
        board3: "is-board-3",
        board4: "is-board-4",
      };

    grid.innerHTML = getFxLibrary().map((effect) => {
      const selectedBoard = data.assignments[effect.id] || "";
      const cardClass = boardClass[selectedBoard] || "";

      return `
        <article class="brDjFxEffectCard ${cardClass}" data-dj-fx-card="${effect.id}">
          <div class="brDjFxEffectTop">
            <strong>${escapeHtml(effect.name)}</strong>
            <small>${escapeHtml(effect.family)}</small>
          </div>
          <p>${escapeHtml(effect.description)}</p>
          <div class="brDjFxBoardButtons">
<button type="button" class="${selectedBoard === "board1" ? "is-active board-1" : "board-1"}" data-dj-fx-board="board1" data-dj-fx-effect="${effect.id}" aria-label="Add ${escapeHtml(effect.name)} to Board 1">B1</button>
<button type="button" class="${selectedBoard === "board2" ? "is-active board-2" : "board-2"}" data-dj-fx-board="board2" data-dj-fx-effect="${effect.id}" aria-label="Add ${escapeHtml(effect.name)} to Board 2">B2</button>
<button type="button" class="${selectedBoard === "board3" ? "is-active board-3" : "board-3"}" data-dj-fx-board="board3" data-dj-fx-effect="${effect.id}" aria-label="Add ${escapeHtml(effect.name)} to Board 3">B3</button>
<button type="button" class="${selectedBoard === "board4" ? "is-active board-4" : "board-4"}" data-dj-fx-board="board4" data-dj-fx-effect="${effect.id}" aria-label="Add ${escapeHtml(effect.name)} to Board 4">B4</button>
          </div>
        </article>
      `;
    }).join("");

    updateFxSetupStatus(data);
  }

  function saveFxSetup({ next = false } = {}) {
    const data = readFxSetup();
    data.savedAt = new Date().toISOString();
    writeJson(fxSetupStorageKey, data);
    updateFxSetupStatus(data, next ? "FX boards saved. Opening Record Setup…" : "FX boards saved.");

    if (next) {
      window.setTimeout(() => setStudioView("record-setup"), 180);
    }
  }

  function bindFxSetup() {
    renderFxSetup();

    $("[data-dj-fx-save]")?.addEventListener("click", () => saveFxSetup());
    $("[data-dj-fx-save-next]")?.addEventListener("click", () => saveFxSetup({ next: true }));

    document.addEventListener("click", (event) => {
      const button = event.target?.closest?.("[data-dj-fx-board]");
      if (!button) return;

      const effectId = button.dataset.djFxEffect;
      const board = button.dataset.djFxBoard;
      if (!effectId || !board) return;

      const data = readFxSetup();
      const counts = getFxBoardCounts(data);
      const currentBoard = data.assignments[effectId] || "";
      const boardName = board === "board1" ? "Board 1" : board === "board2" ? "Board 2" : board === "board3" ? "Board 3" : "Board 4";
      const effect = getFxLibrary().find((item) => item.id === effectId);
      const effectName = effect?.name || "Effect";

      if (currentBoard === board) {
        delete data.assignments[effectId];
        data.savedAt = new Date().toISOString();
        writeJson(fxSetupStorageKey, data);
        renderFxSetup();
        updateFxSetupStatus(data, `${effectName} removed from ${boardName}.`);
        return;
      }

      if (counts[board] >= 9) {
        updateFxSetupStatus(data, `${boardName} is full (9 / 9). Remove one effect before adding another.`);
        return;
      }

      data.assignments[effectId] = board;
      data.savedAt = new Date().toISOString();
      writeJson(fxSetupStorageKey, data);
      renderFxSetup();
      updateFxSetupStatus(data, `${effectName} added to ${boardName}.`);
    });
  }
	
  const recordPresetMap = {
    "quick-mp3": { format: "mp3", mp3Bitrate: "192", sampleRate: "44.1 kHz" },
    "club-mp3": { format: "mp3", mp3Bitrate: "320", sampleRate: "44.1 kHz" },
    "lossless-flac": { format: "flac", flacCompression: "5 balanced", sampleRate: "48 kHz" },
    "archive-wav": { format: "wav", wavBitDepth: "24-bit", sampleRate: "48 kHz" },
    custom: {},
  };

  function readRecordSetup() {
    const data = readJson(recordSetupStorageKey, {});
    return {
      preset: data.preset || "club-mp3",
      recordingType: data.recordingType || "full-mix",
      format: data.format || "mp3",
      channels: data.channels || "stereo",
      source: data.source || "master-post",
      countdown: data.countdown || "5",
      fields: data.fields && typeof data.fields === "object" ? data.fields : {},
      savedAt: data.savedAt || "",
    };
  }

  function collectRecordSetup() {
    const data = readRecordSetup();
    const next = {
      ...data,
      preset: $("[data-dj-record-option='preset'].is-active")?.dataset.value || data.preset,
      recordingType: $("[data-dj-record-option='recordingType'].is-active")?.dataset.value || data.recordingType,
      format: $("[data-dj-record-option='format'].is-active")?.dataset.value || data.format,
      channels: $("[data-dj-record-option='channels'].is-active")?.dataset.value || data.channels,
      source: $("[data-dj-record-option='source'].is-active")?.dataset.value || data.source,
      countdown: $("[data-dj-record-option='countdown'].is-active")?.dataset.value || data.countdown,
      fields: { ...(data.fields || {}) },
      savedAt: new Date().toISOString(),
    };

    $$("[data-dj-record-field]").forEach((field) => {
      const key = field.dataset.djRecordField;
      if (!key) return;
      next.fields[key] = field.type === "checkbox" ? Boolean(field.checked) : field.value || "";
    });

    return next;
  }

  function setRecordOption(group, value) {
    $$(`[data-dj-record-option='${group}']`).forEach((button) => {
      const active = button.dataset.value === value;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function applyRecordSetup() {
    const data = readRecordSetup();

    setRecordOption("preset", data.preset);
    setRecordOption("recordingType", data.recordingType);
    setRecordOption("format", data.format);
    setRecordOption("channels", data.channels);
    setRecordOption("source", data.source);
    setRecordOption("countdown", data.countdown);

    $$("[data-dj-record-field]").forEach((field) => {
      const key = field.dataset.djRecordField;
      if (!key || !Object.prototype.hasOwnProperty.call(data.fields, key)) return;
      if (field.type === "checkbox") field.checked = Boolean(data.fields[key]);
      else field.value = data.fields[key] || "";
    });

    updateRecordSetupStatus(data);
  }

  function updateRecordSetupStatus(data = readRecordSetup(), savedText = "") {
    const status = $("[data-dj-record-status]");
    const summary = $("[data-dj-record-summary]");
    const format = String(data.format || "mp3").toUpperCase();
    const channels = data.channels === "dual-mono" ? "Dual mono" : String(data.channels || "stereo").replace(/-/g, " ");
    const customSeconds = String(data.fields?.customCountdown || "").trim();
    const countdown = data.countdown === "0"
      ? "No countdown"
      : data.countdown === "custom"
        ? `${customSeconds || "Custom"} sec countdown`
        : `${data.countdown} sec countdown`;

    if (status) {
      status.textContent = savedText || (data.savedAt
        ? `Saved ${new Date(data.savedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}`
        : "Recording setup ready");
    }

    if (summary) summary.textContent = `${format} · ${channels} · ${countdown}`;
  }

  function saveRecordSetup({ next = false } = {}) {
    const data = collectRecordSetup();
    writeJson(recordSetupStorageKey, data);
    updateRecordSetupStatus(data, next ? "Record setup saved. Launching Main Mixer…" : "Record setup saved.");

    if (next) {
      window.setTimeout(() => {
        window.location.href = "/dj-mixer/performance.html";
      }, 220);
    }
  }

  function bindRecordSetup() {
    applyRecordSetup();

    $$("[data-dj-record-option]").forEach((button) => {
      button.addEventListener("click", () => {
        const group = button.dataset.djRecordOption;
        const value = button.dataset.value;
        if (!group || !value) return;

        setRecordOption(group, value);

        if (group === "preset") {
          const preset = recordPresetMap[value] || {};
          Object.entries(preset).forEach(([key, presetValue]) => {
            if (["format", "channels", "source", "countdown", "recordingType", "preset"].includes(key)) {
              setRecordOption(key, presetValue);
              return;
            }
            const field = $(`[data-dj-record-field='${key}']`);
            if (field) field.value = presetValue;
          });
        }

        const data = collectRecordSetup();
        writeJson(recordSetupStorageKey, data);
        updateRecordSetupStatus(data);
      });
    });

    $$("[data-dj-record-field]").forEach((field) => {
      const persistField = () => {
        if (field.dataset.djRecordField === "customCountdown") {
          setRecordOption("countdown", "custom");
        }

        const data = collectRecordSetup();
        writeJson(recordSetupStorageKey, data);
        updateRecordSetupStatus(data);
      };

      field.addEventListener("change", persistField);
      field.addEventListener("input", persistField);
    });

    $("[data-dj-record-save]")?.addEventListener("click", () => saveRecordSetup());
    $("[data-dj-record-save-next]")?.addEventListener("click", () => saveRecordSetup({ next: true }));
  }

  function setSidebar(open) {
    const sidebar = $("#sidebarMenu");
    const backdrop = $("#sidebarBackdrop");
    const floatingClose = $("#btnSidebarCloseFloating");

    sidebar?.classList.toggle("hidden", !open);
    backdrop?.classList.toggle("hidden", !open);
    floatingClose?.classList.toggle("hidden", !open);

    sidebar?.setAttribute("aria-hidden", open ? "false" : "true");
    backdrop?.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle("sidebarOpen", !!open);
  }

  function setStudioView(view) {
    const safeView = view || "studio";
    const isHome = safeView === "studio";

    document.body.dataset.djStudioView = safeView;
    document.body.classList.toggle("brDjShowingPlaceholder", !isHome);

    $$("[data-dj-studio-view]").forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.djStudioView === safeView);
    });

    $$("[data-dj-view-link]").forEach((button) => {
      const active = button.dataset.djViewLink === safeView;
      button.classList.toggle("is-active", active);
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function bindStudio() {
    $("#btnTopSettings")?.addEventListener("click", () => setSidebar(true));
    $("#btnSidebarCloseFloating")?.addEventListener("click", () => setSidebar(false));
    $("#sidebarBackdrop")?.addEventListener("click", () => setSidebar(false));

    $$("[data-dj-view-link]").forEach((button) => {
      button.addEventListener("click", () => {
        setStudioView(button.dataset.djViewLink || "studio");
        setSidebar(false);
      });
    });

    $$("[data-route]").forEach((button) => {
      button.addEventListener("click", () => {
        const route = button.dataset.route;
        if (route) window.location.href = route;
      });
    });
  }
	
  function formatDjEngineTime(seconds = 0, options = {}) {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const wholeSeconds = Math.floor(safeSeconds);
    const minutes = Math.floor(wholeSeconds / 60);
    const remaining = wholeSeconds % 60;
    const core = `${minutes}:${String(remaining).padStart(2, "0")}`;

    if (!options.showTenths) return core;

    const tenths = Math.floor((safeSeconds - wholeSeconds) * 10);
    return `${core}.${tenths}`;
  }

  function formatDjEngineRemaining(currentTime = 0, duration = 0) {
    const safeDuration = Math.max(0, Number(duration) || 0);
    if (!safeDuration) return "-0:00.0";

    const remaining = Math.max(0, safeDuration - Math.max(0, Number(currentTime) || 0));
    return `-${formatDjEngineTime(remaining, { showTenths: true })}`;
  }
	
  const DJ_WAVEFORM_ZOOM_LEVELS = [16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512];
  const DJ_WAVEFORM_DEFAULT_ZOOM = 96;

  /*
    DUO/Main has its own permanent performance
    scale and never reads a deck-page zoom value.
  */
  const DJ_DUO_PERFORMANCE_ZOOM = 92;

  /*
    SYNC activates instantly. This duration only
    controls live BPM movement.
  */
  const DJ_LIVE_BPM_RAMP_MS = 520;
  const DJ_GRID_MIN_BPM = 40;
  const DJ_GRID_MAX_BPM = 260;
  const DJ_GRID_PRE_ROLL_SECONDS = 8;
  const DJ_SYNC_PHASE_CYCLE_BEATS = 4;

  /*
    Locked: under 8 ms.
    Release: begin correcting at 14 ms.
    The gap between them provides hysteresis and prevents wobble.
  */
  const DJ_SYNC_LOCK_TOLERANCE_SECONDS = 0.008;
  const DJ_SYNC_RELEASE_TOLERANCE_SECONDS = 0.014;

  const DJ_SYNC_MEDIUM_PHASE_SECONDS = 0.045;
  const DJ_SYNC_HARD_PHASE_SECONDS = 0.11;

  const DJ_SYNC_FINE_BEND_MAX = 0.0045;
  const DJ_SYNC_MEDIUM_BEND_MAX = 0.009;
  const DJ_SYNC_BEND_GAIN = 0.16;

  const DJ_SYNC_HARD_COOLDOWN_MS = 1600;
  const DJ_SYNC_SEEK_LEAD_SECONDS = 0.014;

  /*
    A Play tap up to 70 ms after the Master beat catches that beat.
    Later taps wait for the next Master beat while Q is active.
  */
  const DJ_SYNC_LATE_LAUNCH_SECONDS = 0.07;
  const DJ_LOOP_DEFAULT_BEATS = 4;
  const DJ_LOOP_SIZE_VALUES = [
    1 / 512, 1 / 256, 1 / 128, 1 / 64, 1 / 32, 1 / 16, 1 / 8, 1 / 4, 1 / 2,
    1, 2, 4, 8, 16, 32, 64, 128, 256, 512,
  ];
  const DJ_BEAT_JUMP_VALUES = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
  const DJ_CUE_MEMORY_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];
  const DJ_WAVEFORM_PALETTES = [
    { id: "blue", label: "Blue Mode" },
    { id: "rgb", label: "RGB Mode" },
    { id: "threeband", label: "3Band Mode" },
    { id: "brmedia", label: "BR Theme" },
  ];

  function clampDjUnit(value = 0) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function formatDjLoopBeatValue(beats = DJ_LOOP_DEFAULT_BEATS, options = {}) {
    const safeBeats = Number(beats) || DJ_LOOP_DEFAULT_BEATS;
    if (safeBeats < 1) return `1/${Math.round(1 / safeBeats)}`;
    const label = Number.isInteger(safeBeats) ? `${safeBeats}` : `${safeBeats.toFixed(2)}`;
    return options.withBeats ? `${label} Beats` : label;
  }

  function findClosestDjLoopSizeValue(beats = DJ_LOOP_DEFAULT_BEATS) {
    const safeBeats = Math.max(DJ_LOOP_SIZE_VALUES[0], Math.min(DJ_LOOP_SIZE_VALUES[DJ_LOOP_SIZE_VALUES.length - 1], Number(beats) || DJ_LOOP_DEFAULT_BEATS));
    return DJ_LOOP_SIZE_VALUES.reduce((best, value) => (
      Math.abs(value - safeBeats) < Math.abs(best - safeBeats) ? value : best
    ), DJ_LOOP_DEFAULT_BEATS);
  }

  function getDjBeatValueIndex(values = DJ_LOOP_SIZE_VALUES, beats = DJ_LOOP_DEFAULT_BEATS) {
    const safeBeats = Number(beats) || DJ_LOOP_DEFAULT_BEATS;
    let bestIndex = values.indexOf(DJ_LOOP_DEFAULT_BEATS);
    let bestDiff = Infinity;

    values.forEach((value, index) => {
      const diff = Math.abs(value - safeBeats);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIndex = index;
      }
    });

    return Math.max(0, bestIndex);
  }

  function getDjLoopSizeIndex(beats = DJ_LOOP_DEFAULT_BEATS) {
    return getDjBeatValueIndex(DJ_LOOP_SIZE_VALUES, beats);
  }

  function shiftDjLoopBeatValue(beats = DJ_LOOP_DEFAULT_BEATS, direction = 0) {
    const currentIndex = getDjLoopSizeIndex(beats);
    const nextIndex = Math.max(0, Math.min(DJ_LOOP_SIZE_VALUES.length - 1, currentIndex + direction));
    return DJ_LOOP_SIZE_VALUES[nextIndex] || DJ_LOOP_DEFAULT_BEATS;
  }

  function shiftDjBeatJumpValue(beats = 8, direction = 0) {
    const currentIndex = getDjBeatValueIndex(DJ_BEAT_JUMP_VALUES, beats);
    const nextIndex = Math.max(0, Math.min(DJ_BEAT_JUMP_VALUES.length - 1, currentIndex + direction));
    return DJ_BEAT_JUMP_VALUES[nextIndex] || 8;
  }

  function formatDjCueMemoryTime(seconds = 0) {
    return formatDjEngineTime(Math.max(0, Number(seconds) || 0), { showTenths: true });
  }

  function getDjRealWaveformCanvas(target) {
    if (!target) return null;

    let canvas = target.querySelector(":scope > canvas.brDjRealWaveCanvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "brDjRealWaveCanvas";
      canvas.setAttribute("aria-hidden", "true");
      target.appendChild(canvas);
    }

    return canvas;
  }

  function getDjWaveMinuteMarkersLayer(target) {
    if (!target) return null;

    let layer = target.querySelector(":scope > .brDjWaveMinuteMarkers");
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "brDjWaveMinuteMarkers";
      layer.setAttribute("aria-hidden", "true");
      target.appendChild(layer);
    }

    return layer;
  }

  function getDjDetailWaveformZoom(target) {
    if (!target?.classList?.contains("is-fixed-centre-waveform")) return 1;
    return Math.max(1, Number(target.dataset.brDjWaveformZoom) || DJ_WAVEFORM_DEFAULT_ZOOM);
  }

  function getDjWaveformPalette(mode = "blue") {
    const safeMode = DJ_WAVEFORM_PALETTES.some((palette) => palette.id === mode) ? mode : "blue";

    if (safeMode === "rgb") {
      return {
        mode: safeMode,
        low: "rgba(236,38,62,0.98)",
        lowSoft: "rgba(130,15,34,0.50)",
        mid: "rgba(246,160,18,0.92)",
        midSoft: "rgba(38,210,98,0.50)",
        high: "rgba(82,171,255,0.96)",
        highSoft: "rgba(231,250,255,0.66)",
        edge: "rgba(255,255,255,0.58)",
        grid: "rgba(255,255,255,0.10)",
        gridBar: "rgba(242,160,7,0.42)",
        gridOne: "rgba(255,64,82,0.86)",
        glow: "rgba(242,160,7,0.20)",
        bed: "rgba(255,255,255,0.060)",
      };
    }

    if (safeMode === "threeband") {
      return {
        mode: safeMode,
        low: "rgba(44,104,243,0.98)",
        lowSoft: "rgba(10,40,116,0.48)",
        mid: "rgba(242,160,7,0.95)",
        midSoft: "rgba(255,196,68,0.50)",
        high: "rgba(255,255,255,0.98)",
        highSoft: "rgba(255,255,255,0.54)",
        edge: "rgba(255,255,255,0.58)",
        grid: "rgba(255,255,255,0.11)",
        gridBar: "rgba(242,160,7,0.40)",
        gridOne: "rgba(255,64,82,0.84)",
        glow: "rgba(123,216,255,0.20)",
        bed: "rgba(255,255,255,0.065)",
      };
    }

    if (safeMode === "brmedia") {
      return {
        mode: safeMode,
        low: "rgba(5,30,82,0.99)",
        lowSoft: "rgba(10,57,142,0.50)",
        mid: "rgba(242,160,7,0.96)",
        midSoft: "rgba(255,212,92,0.58)",
        high: "rgba(123,216,255,0.98)",
        highSoft: "rgba(241,253,255,0.68)",
        edge: "rgba(255,255,255,0.56)",
        grid: "rgba(123,216,255,0.12)",
        gridBar: "rgba(242,160,7,0.46)",
        gridOne: "rgba(255,64,82,0.86)",
        glow: "rgba(242,160,7,0.22)",
        bed: "rgba(123,216,255,0.075)",
      };
    }

    return {
      mode: "blue",
      low: "rgba(6,32,92,0.99)",
      lowSoft: "rgba(8,62,150,0.56)",
      mid: "rgba(43,144,232,0.76)",
      midSoft: "rgba(84,198,255,0.52)",
      high: "rgba(224,249,255,0.98)",
      highSoft: "rgba(255,255,255,0.62)",
      edge: "rgba(255,255,255,0.55)",
      grid: "rgba(123,216,255,0.10)",
      gridBar: "rgba(123,216,255,0.33)",
      gridOne: "rgba(255,64,82,0.82)",
      glow: "rgba(123,216,255,0.20)",
      bed: "rgba(123,216,255,0.075)",
    };
  }

  function getDjWaveformBandValue(bands, band, index, fallback = 0) {
    const values = bands?.[band];
    if (!Array.isArray(values) || !values.length) return fallback;

    const safeIndex = Math.max(0, Math.min(values.length - 1, index));
    return clampDjUnit(values[safeIndex] ?? fallback);
  }

  function buildDjVisibleWavePoints(peaks, bands, options = {}) {
    const points = [];
    const total = Math.max(1, peaks.length - 1);
    const startIndex = Math.max(0, Math.floor(options.startIndex || 0));
    const endIndex = Math.min(peaks.length - 1, Math.ceil(options.endIndex ?? peaks.length - 1));
    const maxPoints = Math.max(96, Math.floor(options.maxPoints || 900));
    const bucketSpan = Math.max(1, Math.ceil((endIndex - startIndex + 1) / maxPoints));
    const xForIndex = typeof options.xForIndex === "function" ? options.xForIndex : () => 0;

    for (let index = startIndex; index <= endIndex; index += bucketSpan) {
      const bucketEnd = Math.min(endIndex, index + bucketSpan - 1);
      const centreIndex = Math.round((index + bucketEnd) / 2);
      let peak = 0;
      let low = 0;
      let mid = 0;
      let high = 0;
      let transient = 0;

      for (let sampleIndex = index; sampleIndex <= bucketEnd; sampleIndex += 1) {
        const nextPeak = clampDjUnit(peaks[sampleIndex]);
        peak = Math.max(peak, nextPeak);
        low = Math.max(low, getDjWaveformBandValue(bands, "low", sampleIndex, nextPeak * 0.74));
        mid = Math.max(mid, getDjWaveformBandValue(bands, "mid", sampleIndex, nextPeak * 0.52));
        high = Math.max(high, getDjWaveformBandValue(bands, "high", sampleIndex, nextPeak * 0.34));
        transient = Math.max(transient, getDjWaveformBandValue(bands, "transient", sampleIndex, high));
      }

      const body = Math.max(peak, low * 0.92, mid * 0.70, high * 0.50);
      points.push({
        x: xForIndex(centreIndex),
        ratio: centreIndex / total,
        peak: clampDjUnit(Math.pow(body, 0.72)),
        low: clampDjUnit(Math.pow(low, 0.72)),
        mid: clampDjUnit(Math.pow(mid, 0.76)),
        high: clampDjUnit(Math.pow(high, 0.68)),
        transient: clampDjUnit(Math.pow(transient, 0.58)),
      });
    }

    return points;
  }

  function smoothDjWavePoints(points = [], passes = 2) {
    if (points.length < 3) return points;

    let nextPoints = points.map((point) => ({ ...point }));
    const keys = ["peak", "low", "mid", "high"];

    for (let pass = 0; pass < passes; pass += 1) {
      const previousPass = nextPoints;
      nextPoints = previousPass.map((point, index) => {
        if (index === 0 || index === previousPass.length - 1) return { ...point };

        const previous = previousPass[index - 1];
        const next = previousPass[index + 1];
        const smoothed = { ...point };

        keys.forEach((key) => {
          const average = (previous[key] * 0.18) + (point[key] * 0.64) + (next[key] * 0.18);
          smoothed[key] = Math.max(point[key] * 0.86, average);
        });

        smoothed.transient = Math.max(point.transient * 0.92, ((previous.transient || 0) * 0.10) + (point.transient * 0.80) + ((next.transient || 0) * 0.10));
        return smoothed;
      });
    }

    return nextPoints;
  }

  function makeDjWaveVerticalGradient(ctx, midY, amplitude, colour, softColour) {
    const gradient = ctx.createLinearGradient(0, midY - amplitude, 0, midY + amplitude);
    gradient.addColorStop(0, colour);
    gradient.addColorStop(0.38, softColour || colour);
    gradient.addColorStop(0.50, colour);
    gradient.addColorStop(0.62, softColour || colour);
    gradient.addColorStop(1, colour);
    return gradient;
  }

  function traceDjSmoothEnvelopePath(ctx, top, bottom) {
    if (!top.length || !bottom.length) return;

    ctx.beginPath();
    ctx.moveTo(top[0].x, top[0].y);

    for (let index = 1; index < top.length; index += 1) {
      const previous = top[index - 1];
      const current = top[index];
      const midX = (previous.x + current.x) / 2;
      const midY = (previous.y + current.y) / 2;
      ctx.quadraticCurveTo(previous.x, previous.y, midX, midY);
    }

    const lastTop = top[top.length - 1];
    ctx.lineTo(lastTop.x, lastTop.y);
    ctx.lineTo(bottom[bottom.length - 1].x, bottom[bottom.length - 1].y);

    for (let index = bottom.length - 2; index >= 0; index -= 1) {
      const next = bottom[index + 1];
      const current = bottom[index];
      const midX = (next.x + current.x) / 2;
      const midY = (next.y + current.y) / 2;
      ctx.quadraticCurveTo(next.x, next.y, midX, midY);
    }

    ctx.closePath();
  }

  function drawDjUhdWaveLayer(ctx, points, options = {}) {
    if (points.length < 2) return;

    const midY = options.midY || 0;
    const scale = options.scale || 1;
    const channel = options.channel || "peak";
    const minHeight = options.minHeight || 1;
    const alpha = options.alpha ?? 1;
    const colour = options.colour || "rgba(255,255,255,0.8)";
    const blend = options.blend || "source-over";
    const side = options.side || "full";
    const top = [];
    const bottom = [];

    points.forEach((point) => {
      const amount = Math.max(minHeight, (point[channel] || point.peak || 0) * scale);
      const topY = side === "bottom" ? midY : midY - amount;
      const bottomY = side === "top" ? midY : midY + amount;
      top.push({ x: point.x, y: topY });
      bottom.push({ x: point.x, y: bottomY });
    });

    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.globalCompositeOperation = blend;
    ctx.fillStyle = colour;
    traceDjSmoothEnvelopePath(ctx, top, bottom);
    ctx.fill();
    ctx.restore();
  }

  function drawDjUhdWaveEdge(ctx, points, options = {}) {
    if (points.length < 2) return;

    const midY = options.midY || 0;
    const scale = options.scale || 1;
    const side = options.side || "full";
    const colour = options.colour || "rgba(255,255,255,0.45)";
    const pixelRatio = options.pixelRatio || 1;

    const drawSide = (direction) => {
      ctx.beginPath();
      points.forEach((point, index) => {
        const amount = Math.max(1, (point.peak || 0) * scale);
        const y = midY + (amount * direction);
        if (index === 0) ctx.moveTo(point.x, y);
        else {
          const previous = points[index - 1];
          const previousAmount = Math.max(1, (previous.peak || 0) * scale);
          const previousY = midY + (previousAmount * direction);
          ctx.quadraticCurveTo(previous.x, previousY, (previous.x + point.x) / 2, (previousY + y) / 2);
        }
      });
      ctx.stroke();
    };

    ctx.save();
    ctx.strokeStyle = colour;
    ctx.lineWidth = Math.max(1, pixelRatio * 0.72);
    ctx.globalAlpha *= options.alpha ?? 0.24;
    if (side !== "bottom") drawSide(-1);
    if (side !== "top") drawSide(1);
    ctx.restore();
  }

  function drawDjUhdHighDetail(ctx, points, options = {}) {
    if (points.length < 2) return;

    const midY = options.midY || 0;
    const scale = options.scale || 1;
    const side = options.side || "full";
    const colour = options.colour || "rgba(255,255,255,0.50)";
    const pixelRatio = options.pixelRatio || 1;
    const minDistance = Math.max(2.4 * pixelRatio, options.compact ? 4 * pixelRatio : 2.1 * pixelRatio);
    let lastX = -Infinity;

    ctx.save();
    ctx.strokeStyle = colour;
    ctx.lineWidth = Math.max(1, 0.58 * pixelRatio);
    ctx.globalAlpha *= options.alpha ?? 0.20;

    points.forEach((point) => {
      if (point.x - lastX < minDistance) return;
      const transient = Math.max(point.transient || 0, (point.high || 0) * 0.64);
      if (transient < 0.18) return;
      lastX = point.x;

      const amount = Math.max(2 * pixelRatio, transient * scale);
      const top = side === "bottom" ? midY : midY - amount;
      const bottom = side === "top" ? midY : midY + amount;
      ctx.beginPath();
      ctx.moveTo(point.x, top);
      ctx.lineTo(point.x, bottom);
      ctx.stroke();
    });

    ctx.restore();
  }

  function getDjBeatGridState(beatGrid = {}, state = {}) {
    const duration = Math.max(0, Number(state.duration) || 0);
    const bpm = Math.max(40, Math.min(260, Number(beatGrid.bpm) || DJ_GRID_DEFAULT_BPM));
    const downbeat = Math.max(0, Math.min(duration || Infinity, Number(beatGrid.downbeat) || 0));
    return {
      bpm,
      downbeat,
      locked: Boolean(beatGrid.locked),
      baseSet: Boolean(beatGrid.baseSet),
    };
  }

  function drawDjBeatGrid(ctx, options = {}) {
    const duration = Math.max(0, Number(options.duration) || 0);
    const grid = getDjBeatGridState(options.beatGrid, { duration });
    if (!duration || !grid.bpm) return;

    const interval = 60 / grid.bpm;
    if (!interval) return;

    const progress = clampDjUnit(options.progress || 0);
    const fixedCentre = Boolean(options.fixedCentre);
    const compact = Boolean(options.compact);
    const width = Math.max(1, Number(options.width) || 1);
    const height = Math.max(1, Number(options.height) || 1);
    const centreX = Number(options.centreX) || width / 2;
    const virtualWidth = Number(options.virtualWidth) || width;
    const pixelRatio = Number(options.pixelRatio) || 1;
    const palette = options.palette || getDjWaveformPalette("blue");
    const currentTime = progress * duration;
    const visibleSeconds = fixedCentre ? duration / Math.max(1, Number(options.zoom) || DJ_WAVEFORM_DEFAULT_ZOOM) : duration;
    const windowStart = fixedCentre ? currentTime - (visibleSeconds * 0.60) : 0;
    const windowEnd = fixedCentre ? currentTime + (visibleSeconds * 0.60) : duration;
    const firstBeat = Math.floor((windowStart - grid.downbeat) / interval) - 2;
    const lastBeat = Math.ceil((windowEnd - grid.downbeat) / interval) + 2;
    const beatStep = compact ? 16 : fixedCentre ? 1 : 4;

    ctx.save();
    ctx.globalCompositeOperation = "source-over";

    for (let beat = firstBeat; beat <= lastBeat; beat += 1) {
      if (beat < 0 && grid.downbeat + (beat * interval) < 0) continue;
      if (compact && beat % beatStep !== 0) continue;
      if (!fixedCentre && !compact && beat % beatStep !== 0) continue;

      const beatTime = grid.downbeat + (beat * interval);
      if (beatTime < 0 || beatTime > duration) continue;

      const beatProgress = beatTime / duration;
      const x = fixedCentre
        ? Math.round(centreX + ((beatProgress - progress) * virtualWidth))
        : Math.round(beatProgress * width);
      if (x < -2 || x > width + 2) continue;

      const beatInBar = ((beat % 4) + 4) % 4;
      const isBar = beatInBar === 0;
      const isBase = Math.abs(beatTime - grid.downbeat) < interval * 0.2;
      ctx.fillStyle = isBase
        ? palette.gridOne
        : isBar
          ? palette.gridBar
          : palette.grid;
      const lineWidth = Math.max(1, Math.round((isBase ? 2.4 : isBar ? 1.6 : 0.85) * pixelRatio));
      ctx.fillRect(x - Math.floor(lineWidth / 2), 0, lineWidth, height);
    }

    ctx.restore();
  }

  function updateDjWaveMinuteMarkers(target, state = {}, options = {}) {
    const layer = getDjWaveMinuteMarkersLayer(target);
    if (!layer) return;

    const fixedCentre = Boolean(options.fixedCentre && !options.compact);
    const duration = Math.max(0, Number(state.duration) || 0);
    const fullMinutes = Math.floor(duration / 60);
    const maxMarkers = options.compact ? 8 : 0;
    const markerCount = fixedCentre ? 0 : Math.max(0, Math.min(maxMarkers, fullMinutes));

    layer.replaceChildren();
    layer.classList.remove("is-fixed-centre-minutes");
    target.classList.toggle("has-minute-markers", markerCount > 0);

    if (!markerCount) return;

    for (let minute = 1; minute <= markerCount; minute += 1) {
      const marker = document.createElement("span");
      const ratio = Math.max(0, Math.min(1, (minute * 60) / duration));
      marker.style.left = `${(ratio * 100).toFixed(3)}%`;
      marker.textContent = `${minute}m`;
      layer.appendChild(marker);
    }
  }

  function drawDjRealWaveform(target, state = {}, options = {}) {
    const renderer = typeof window !== "undefined" ? window.BRMediaDjWaveformRenderer : null;

    if (renderer && typeof renderer.draw === "function") {
      renderer.draw(target, state, options);
      return;
    }

    target?.classList?.toggle("has-real-waveform", false);
    target?.classList?.toggle("is-fixed-centre-waveform", false);
    target?.classList?.toggle("is-detail-waveform-ready", false);
    target?.classList?.toggle("is-spectral-waveform", false);
  }

  function renderDjRealWaveforms(
    config,
    state = {},
    renderOptions = {}
  ) {
    const duoOnly = Boolean(
      renderOptions.duoOnly
    );

    const deckPanel = duoOnly
      ? null
      : $(
          `.brDjPerfPanel[data-dj-perf-panel="${config.panel}"]`
        );

    const memoryPoints =
      DJ_CUE_MEMORY_LABELS
        .map((label) => ({
          label,
          point:
            config.cueMemory
              ?.memory?.[label],
        }))
        .filter((item) =>
          Number.isFinite(
            Number(
              item.point?.time
            )
          )
        )
        .map((item) => ({
          label: item.label,
          time: Number(
            item.point.time
          ),
        }));

    const targets = [
      ...(
        deckPanel
          ? $$(
              ".brDjSingleOverviewWave",
              deckPanel
            ).map((target) => ({
              target,
              compact: true,
              fixedCentre: false,
              zoomable: false,
              waveformSide: "full",
              showBeatGrid: false,
              showMinuteMarkers: true,
            }))
          : []
      ),

      ...(
        deckPanel
          ? $$(
              ".brDjSingleWaveCanvas",
              deckPanel
            ).map((target) => ({
              target,
              compact: false,
              fixedCentre: true,

              zoomable: Boolean(
                target
                  .closest(
                    ".brDjSingleDetailWave"
                  )
                  ?.querySelector(
                    ".brDjSingleZoomDock"
                  )
              ),

              waveformSide: "full",
              showBeatGrid: true,
              gridStyle: "grey",
              showMemoryMarkers: true,
              showMinuteMarkers: true,
            }))
          : []
      ),

      ...(
        deckPanel
          ? $$(
              ".brDjCueMemoryOverview",
              deckPanel
            ).map((target) => ({
              target,
              compact: true,
              fixedCentre: false,
              zoomable: false,
              waveformSide: "full",
              showBeatGrid: false,
              showMinuteMarkers: true,
            }))
          : []
      ),

      ...(
        deckPanel
          ? $$(
              ".brDjCueMemoryWaveform",
              deckPanel
            ).map((target) => ({
              target,
              compact: false,
              fixedCentre: true,

              zoomable: Boolean(
                target
                  .closest(
                    ".brDjCueMemoryWave"
                  )
                  ?.querySelector(
                    ".brDjSingleZoomDock"
                  )
              ),

              waveformSide: "full",
              showBeatGrid: true,

              gridStyle:
                target.closest(
                  ".brDjGridPage"
                )
                  ? "blue"
                  : "grey",

              showMemoryMarkers: true,
              showMinuteMarkers: true,
            }))
          : []
      ),

      ...$$(
        `.brDjDuoDeckCard.${config.cardClass} .brDjDuoDeckCardWave`
      ).map((target) => ({
        target,
        compact: true,
        fixedCentre: false,
        zoomable: false,
        waveformSide: "full",
        showBeatGrid: false,
        showMinuteMarkers: true,
      })),

      ...$$(
        `.brDjDuoHorizontalWave.${config.cardClass} .brDjDuoWaveBody`
      ).map((target) => ({
        target,
        compact: false,
        fixedCentre: true,
        zoomable: false,

        waveformSide:
          config.deckId === "d1"
            ? "top"
            : "bottom",

        showBeatGrid: true,
        gridStyle: "grey",
        showMinuteMarkers: false,
        isDuoPerformance: true,
      })),
    ];

    targets.forEach(
      ({
        target,
        compact,
        fixedCentre,
        zoomable,
        waveformSide,
        showBeatGrid,
        gridStyle,
        showMemoryMarkers,
        showMinuteMarkers,
        isDuoPerformance,
      }) => {
        /*
          DUO ignores config.waveformZoom entirely.
        */
        const zoom =
          isDuoPerformance
            ? DJ_DUO_PERFORMANCE_ZOOM
            : (
                zoomable ||
                fixedCentre
              )
              ? (
                  config.waveformZoom ||
                  DJ_WAVEFORM_DEFAULT_ZOOM
                )
              : DJ_WAVEFORM_DEFAULT_ZOOM;

        drawDjRealWaveform(
          target,
          state,
          {
            deckId: config.deckId,
            compact,
            fixedCentre,
            zoomable,
            waveformSide,
            showBeatGrid,
            gridStyle,
            zoom,

            visibleSeconds:
              isDuoPerformance
                ? config
                    .duoVisibleSourceSeconds
                : null,

            /*
              DUO always renders this deck's own
              saved beat grid. Sync aligns the real
              transports; it never substitutes a
              shared visual grid.
            */

            paletteMode:
              config.waveformPalette ||
              "blue",

            beatGrid:
              config.beatGrid,

            memoryPoints:
              showMemoryMarkers
                ? memoryPoints
                : [],

            showMinuteMarkers,
          }
        );

        updateDjWaveMinuteMarkers(
          target,
          state,
          {
            compact,
            fixedCentre,
          }
        );
      }
    );
  }
	
  function syncDjPlayButtonIconState(button, isPlaying = false) {
    const playIcons = $$(".is-play-icon", button);
    const pauseIcons = $$(".is-pause-icon", button);

    playIcons.forEach((icon, index) => {
      const shouldShow = !isPlaying && index === 0;
      icon.style.setProperty("display", shouldShow ? "inline-flex" : "none", "important");
      icon.setAttribute("aria-hidden", "true");
    });

    pauseIcons.forEach((icon, index) => {
      const shouldShow = isPlaying && index === 0;
      icon.style.setProperty("display", shouldShow ? "inline-flex" : "none", "important");
      icon.setAttribute("aria-hidden", "true");
    });
  }

  function normaliseDjPlayButtonIconPairs(root = document) {
    $$(".brDjSinglePlayBtn, .brDjDuoPadPlay, .brDjVinylTransport .is-play", root).forEach((button) => {
      const isDuoButton = button.classList.contains("brDjDuoPadPlay");
      const isVinylButton = button.closest(".brDjVinylTransport") !== null;
      const playIcons = $$(".is-play-icon, i.fa-play", button);
      const pauseIcons = $$(".is-pause-icon, i.fa-pause", button);
      let playIcon = playIcons[0] || document.createElement("i");
      let pauseIcon = pauseIcons[0] || document.createElement("i");

      playIcons.slice(1).forEach((icon) => icon.remove());
      pauseIcons.slice(1).forEach((icon) => icon.remove());

      if (!playIcon.parentNode) button.prepend(playIcon);
      playIcon.classList.add("fa-solid", "fa-play", "brDjPlayToggleIcon", "is-play-icon");
      playIcon.classList.remove("fa-pause", "is-pause-icon");
      playIcon.classList.toggle("brDjDuoPadPlayIcon", isDuoButton);
      playIcon.classList.toggle("brDjVinylPadPlayIcon", isVinylButton);
      playIcon.classList.toggle("brDjSinglePlayIcon", !isDuoButton && !isVinylButton);

      if (!pauseIcon.parentNode) playIcon.insertAdjacentElement("afterend", pauseIcon);
      pauseIcon.classList.add("fa-solid", "fa-pause", "brDjPlayToggleIcon", "is-pause-icon");
      pauseIcon.classList.remove("fa-play", "is-play-icon");
      pauseIcon.classList.toggle("brDjDuoPadPlayIcon", isDuoButton);
      pauseIcon.classList.toggle("brDjVinylPadPlayIcon", isVinylButton);
      pauseIcon.classList.toggle("brDjSinglePlayIcon", !isDuoButton && !isVinylButton);

      const label = button.querySelector("span");
      if (label) label.classList.add("brDjPlayStateLabel");

      syncDjPlayButtonIconState(button, button.classList.contains("is-playing"));
    });
  }
	
  function resolveDjDeckArtworkSource(state = {}) {
    const candidates = [
      state.artworkUrl,
      state.artworkSrc,
      state.coverArtUrl,
      state.pictureUrl,
      state.coverUrl,
    ];
    const match = candidates.find((value) => typeof value === "string" && value.trim());
    return match || "/shared/branding/logos/icon-512.png";
  }
	
  function setDuoDeckCardMarqueeText(
    element,
    value = "",
    threshold = 18
  ) {
    if (!element) return;

    const safeValue =
      String(value || "").trim() ||
      "Unknown";

    const currentWidth = Math.round(
      element.clientWidth || 0
    );

    const sameValue =
      element.dataset.brDjMarqueeValue ===
      safeValue;

    const sameWidth =
      element.dataset.brDjMarqueeWidth ===
      String(currentWidth);

    /*
      Do not rebuild the moving text on every
      deck-state update or the animation restarts.
    */
    if (
      sameValue &&
      sameWidth &&
      (
        element.dataset.brDjMarqueeReady ===
          "true" ||
        element.dataset.brDjMarqueePending ===
          "true"
      )
    ) {
      return;
    }

    element.dataset.brDjMarqueeValue =
      safeValue;

    element.dataset.brDjMarqueeWidth =
      String(currentWidth);

    element.dataset.brDjMarqueeReady =
      "false";

    element.dataset.brDjMarqueePending =
      "true";

    element.classList.remove(
      "is-marquee"
    );

    element.style.removeProperty(
      "--br-dj-marquee-duration"
    );

    element.replaceChildren();
    element.textContent = safeValue;
    element.title = safeValue;

    window.requestAnimationFrame(() => {
      if (
        element.dataset.brDjMarqueeValue !==
        safeValue
      ) {
        return;
      }

      const availableWidth = Math.round(
        element.clientWidth || 0
      );

      const textWidth = Math.ceil(
        element.scrollWidth || 0
      );

      const shouldMarquee = Boolean(
        availableWidth > 0 &&
        (
          textWidth > availableWidth + 2 ||
          (
            safeValue.length > threshold &&
            textWidth > availableWidth
          )
        )
      );

      element.dataset.brDjMarqueeWidth =
        String(availableWidth);

      element.dataset.brDjMarqueePending =
        "false";

      element.dataset.brDjMarqueeReady =
        "true";

      if (!shouldMarquee) {
        return;
      }

      const overflowPixels = Math.max(
        1,
        textWidth - availableWidth
      );

      const duration = Math.max(
        12,
        Math.min(
          38,
          9 + overflowPixels / 22
        )
      );

      const track =
        document.createElement("span");

      track.className =
        "brDjMarqueeTrack";

      [0, 1].forEach(() => {
        const copy =
          document.createElement("span");

        copy.className =
          "brDjMarqueeCopy";

        copy.textContent = safeValue;

        const marker =
          document.createElement("em");

        marker.textContent = "•";

        track.append(
          copy,
          marker
        );
      });

      element.replaceChildren(track);

      element.style.setProperty(
        "--br-dj-marquee-duration",
        `${duration.toFixed(1)}s`
      );

      element.classList.add(
        "is-marquee"
      );
    });
  }

  function bindDeck1EngineFoundation() {
    if (!document.body.classList.contains("brDjPerformanceBody")) return;

    const audioApi =
      window.BRMediaDjAudioEngine;

    const gridApi =
      window.BRMediaDjGrid;

    if (
      !audioApi ||
      !gridApi
    ) {
      return;
    }

    const deckBindings = new Map();
    const lastDeckStates = new Map();
    const djSyncState = {
      masterDeckId: "",
      manualMasterDeckId: "",
      liveMixBpmTarget: null,
      syncedDeckIds: new Set(),
      syncSources: Object.create(null),
      mode: "beat",
    };
    const createDeckBeatGrid = () =>
      gridApi.create({
        analysisMode: "auto",

        resolvedMode: "normal",

        editRange: "whole",

        adjustmentMs: 1,

        bpm: null,

        rawBpm: null,

        downbeat: 0,

        segments: [],

        locked: false,

        baseSet: false,

        reviewRequired: false,

        userBpm: false,

        userDownbeat: false,

        source: "",

        candidates: [],

        history: [],

        future: [],

        tapIntervals: [],

        lastTapAt: 0,
      });

    const createDeckCueMemoryState = () => ({
      hot: Object.create(null),
      memory: Object.create(null),
      selectedHot: "",
      selectedMemory: "",
      deleteMode: "",
    });

    const deckConfigs = [
      { deckId: "d1", panel: "deck-1", cardClass: "is-deck-1", vinylDeck: "a", waveformZoom: DJ_WAVEFORM_DEFAULT_ZOOM, waveformPalette: "blue", beatGrid: createDeckBeatGrid(), beatJumpBeats: 8, loopSizeBeats: DJ_LOOP_DEFAULT_BEATS, loopMode: "auto", cueMemory: createDeckCueMemoryState(), quantize: true, masterTempo: true, keySync: false },
      { deckId: "d2", panel: "deck-2", cardClass: "is-deck-2", vinylDeck: "b", waveformZoom: DJ_WAVEFORM_DEFAULT_ZOOM, waveformPalette: "blue", beatGrid: createDeckBeatGrid(), beatJumpBeats: 8, loopSizeBeats: DJ_LOOP_DEFAULT_BEATS, loopMode: "auto", cueMemory: createDeckCueMemoryState(), quantize: true, masterTempo: true, keySync: false },
    ];

    normaliseDjPlayButtonIconPairs(document);

    const blankDeckState = () => ({
      fileName: "",
      duration: 0,
      currentTime: 0,
      cuePoint: 0,
      playbackRate: 1,
      sync: { enabled: false, master: false, mode: "beat" },
      loop: { active: false, start: 0, end: 0, duration: 0, manualStart: null },
      progress: 0,
      waveformPeaks: [],
      waveformBands: null,
      analysis: { bpm: null, rawBpm: null, metadataBpm: null, tempoSource: "", tempoCandidates: [], downbeat: 0, key: "", keyName: "", confidence: { tempo: 0, key: 0 } },
      isLoaded: false,
      isLoading: false,
      isPlaying: false,
      error: "",
      lastAction: "Ready",
    });

    const getDeckAnalysis = (state = blankDeckState()) => state.analysis || {};

    const getSafeGridBpmValue = (value) => {
      const bpm = Number(value);
      return bpm >= DJ_GRID_MIN_BPM && bpm <= DJ_GRID_MAX_BPM ? bpm : null;
    };

    const getDeckAnalysedBpm = (state = blankDeckState()) => {
      const analysis = getDeckAnalysis(state);
      const bpm = getSafeGridBpmValue(analysis.bpm);
      if (bpm) return bpm;
      const candidates = Array.isArray(analysis.tempoCandidates) ? analysis.tempoCandidates : [];
      return getSafeGridBpmValue(candidates.find((item) => getSafeGridBpmValue(item.bpm))?.bpm);
    };

    const snapshotDeckGrid = (
      grid = {}
    ) =>
      gridApi.snapshot(grid);

    const restoreDeckGridSnapshot = (
      grid = {},
      snapshot = {}
    ) => {
      gridApi.restore(
        grid,
        snapshot
      );
    };

    const pushDeckGridHistory = (config) => {
      if (!config.beatGrid) config.beatGrid = createDeckBeatGrid();
      config.beatGrid.history = Array.isArray(config.beatGrid.history) ? config.beatGrid.history : [];
      config.beatGrid.future = [];
      config.beatGrid.history.push(snapshotDeckGrid(config.beatGrid));
      if (config.beatGrid.history.length > 30) config.beatGrid.history.shift();
    };

    const normaliseDeckBeatGrid = (
      config,
      state = blankDeckState()
    ) => {
      if (!config.beatGrid) {
        config.beatGrid =
          createDeckBeatGrid();
      }

      const duration = Math.max(
        0,
        Number(state.duration) || 0
      );

      const analysis =
        getDeckAnalysis(state);

      const analysedBpm =
        getDeckAnalysedBpm(state);

      const analysedRawBpm =
        getSafeGridBpmValue(
          analysis.rawBpm
        ) || analysedBpm;

      const analysedDownbeat =
        Math.max(
          -DJ_GRID_PRE_ROLL_SECONDS,

          Math.min(
            duration || Infinity,

            Number(
              analysis.downbeat
            ) || 0
          )
        );

      const candidates =
        Array.isArray(
          analysis.tempoCandidates
        )
          ? analysis.tempoCandidates
          : [];

      if (
        !config.beatGrid.userBpm &&
        analysedBpm
      ) {
        config.beatGrid.bpm =
          analysedBpm;

        config.beatGrid.rawBpm =
          analysedRawBpm;

        config.beatGrid.source =
          analysis.tempoSource ||
          "analysis";

        config.beatGrid.candidates =
          candidates;
      }

      if (
        !config.beatGrid.userDownbeat &&
        analysedBpm &&
        duration
      ) {
        config.beatGrid.downbeat =
          analysedDownbeat;

        config.beatGrid.baseSet =
          true;
      }

      const history =
        Array.isArray(
          config.beatGrid.history
        )
          ? config.beatGrid.history
          : [];

      const future =
        Array.isArray(
          config.beatGrid.future
        )
          ? config.beatGrid.future
          : [];

      const tapIntervals =
        Array.isArray(
          config.beatGrid.tapIntervals
        )
          ? config.beatGrid.tapIntervals
          : [];

      const lastTapAt =
        Number(
          config.beatGrid.lastTapAt
        ) || 0;

      const normalised =
        gridApi.normalise(
          config.beatGrid,

          {
            duration,

            minBpm:
              DJ_GRID_MIN_BPM,

            maxBpm:
              DJ_GRID_MAX_BPM,

            preRollSeconds:
              DJ_GRID_PRE_ROLL_SECONDS,
          }
        );

      Object.assign(
        config.beatGrid,
        normalised,

        {
          history,
          future,
          tapIntervals,
          lastTapAt,
        }
      );

      return config.beatGrid;
    };

    const getGridBpm = (config, state = lastDeckStates.get(config.deckId) || blankDeckState()) => {
      const grid = normaliseDeckBeatGrid(config, state);
      const bpm = Number(grid.bpm);
      return bpm >= DJ_GRID_MIN_BPM && bpm <= DJ_GRID_MAX_BPM ? bpm : null;
    };

    const getDeckBeatSeconds = (config, state = lastDeckStates.get(config.deckId) || blankDeckState()) => {
      const bpm = getGridBpm(config, state);
      return bpm ? 60 / bpm : null;
    };

    const snapTimeToDeckGrid = (config, state = blankDeckState(), seconds = 0, mode = "nearest", options = {}) => {
      const beatSeconds = getDeckBeatSeconds(config, state);
      const duration = Math.max(0, Number(state.duration) || 0);
      const grid = normaliseDeckBeatGrid(config, state);
      const minTime = options.allowNegative ? -DJ_GRID_PRE_ROLL_SECONDS : 0;
      const current = Math.max(minTime, Math.min(duration || Infinity, Number(seconds) || 0));
      if (!beatSeconds) return current;

      const rawBeat = (current - grid.downbeat) / beatSeconds;
      const beatIndex = mode === "floor" ? Math.floor(rawBeat) : mode === "ceil" ? Math.ceil(rawBeat) : Math.round(rawBeat);
      return Math.max(minTime, Math.min(duration || Infinity, grid.downbeat + (beatIndex * beatSeconds)));
    };

    const getQuantizedCueTime = (config, state = blankDeckState(), seconds = state.currentTime || 0) => (
      snapTimeToDeckGrid(config, state, seconds, "nearest", { allowNegative: true })
    );

    const getDeckBeatFloat = (config, state = blankDeckState(), seconds = state.currentTime || 0) => {
      const beatSeconds = getDeckBeatSeconds(config, state);
      if (!beatSeconds) return null;
      const grid = normaliseDeckBeatGrid(config, state);
      return ((Number(seconds) || 0) - grid.downbeat) / beatSeconds;
    };

    const getNextDeckMemoryCountdown = (config, state = blankDeckState(), currentTime = Number(state.currentTime) || 0) => {
      const beatSeconds = getDeckBeatSeconds(config, state);
      if (!beatSeconds || !config.cueMemory?.memory) return null;
      const barSeconds = beatSeconds * 4;
      const windowBars = 60;
      let next = null;

      DJ_CUE_MEMORY_LABELS.forEach((label) => {
        const point = config.cueMemory?.memory?.[label];
        const time = Number(point?.time);
        if (!Number.isFinite(time) || time <= currentTime) return;
        const barsAway = (time - currentTime) / barSeconds;
        if (barsAway < 0 || barsAway > windowBars) return;
        if (!next || barsAway < next.barsAway) next = { label, time, barsAway };
      });

      return next;
    };

    const formatDeckGridCounter = (config, state = blankDeckState()) => {
      const beatSeconds = getDeckBeatSeconds(config, state);
      if (!beatSeconds) return state.isLoading ? "Analysing" : "— Bars";
      const grid = normaliseDeckBeatGrid(config, state);
      const currentTime = Number(state.currentTime) || 0;
      const nextMemory = getNextDeckMemoryCountdown(config, state, currentTime);
      if (nextMemory) {
        return `Mem ${nextMemory.label} in ${Math.max(0.1, nextMemory.barsAway).toFixed(1)}`;
      }
      const beatFloat = (currentTime - grid.downbeat) / beatSeconds;
      const bars = beatFloat / 4;
      const barNumber = Math.floor(bars) + 1;
      const beatNumber = (((Math.floor(beatFloat) % 4) + 4) % 4) + 1;
      return grid.baseSet ? `Bar ${barNumber}.${beatNumber}` : `${bars.toFixed(1)} Bars`;
    };

    const syncDeckBeatGridUi = (
      config,
      state = blankDeckState()
    ) => {
      const grid =
        normaliseDeckBeatGrid(
          config,
          state
        );

      const deckPanel = $(
        `.brDjPerfPanel[data-dj-perf-panel="${config.panel}"]`
      );

      if (!deckPanel) return;

      const analysis =
        getDeckAnalysis(state);

      const keyLabel =
        analysis.key || "—";

      const confidence =
        Math.round(
          Math.max(
            0,

            Math.min(
              1,

              Number(
                analysis
                  .confidence
                  ?.tempo
              ) || 0
            )
          ) * 100
        );

      const bpmLabel =
        grid.bpm
          ? grid.bpm.toFixed(2)
          : "--.--";

      const rawBpm =
        getSafeGridBpmValue(
          analysis.rawBpm ||
          grid.rawBpm
        );

      const rawLabel =
        rawBpm &&
        grid.bpm &&
        Math.abs(
          rawBpm - grid.bpm
        ) > 0.25
          ? ` • Raw ${rawBpm.toFixed(2)}`
          : "";

      deckPanel
        .querySelectorAll(
          ".brDjGridBpmBox strong"
        )
        .forEach((value) => {
          value.textContent =
            bpmLabel;
        });

      deckPanel
        .querySelectorAll(
          ".brDjGridBpmBox span"
        )
        .forEach((label) => {
          label.textContent =
            "Grid BPM";
        });

      deckPanel
        .querySelectorAll(
          ".brDjGridLock"
        )
        .forEach((button) => {
          button.classList.toggle(
            "is-locked",
            grid.locked
          );

          button.setAttribute(
            "aria-pressed",
            grid.locked
              ? "true"
              : "false"
          );

          button.setAttribute(
            "aria-label",

            grid.locked
              ? "Unlock beat grid"
              : "Lock beat grid"
          );

          const iconClass =
            grid.locked
              ? "fa-solid fa-lock"
              : "fa-solid fa-lock-open";

          if (
            button.dataset
              .brDjGridLockIcon !==
            iconClass
          ) {
            button.dataset
              .brDjGridLockIcon =
              iconClass;

            button.innerHTML =
              `<i class="${iconClass}"></i>`;

            hydrateDjIcons(button);
          }
        });

      deckPanel
        .querySelectorAll(
          ".brDjGridControls button:not(.brDjGridLock)"
        )
        .forEach((button) => {
          button.disabled =
            Boolean(grid.locked);

          button.setAttribute(
            "aria-disabled",

            grid.locked
              ? "true"
              : "false"
          );
        });

      deckPanel
        .querySelectorAll(
          ".brDjGridStatus"
        )
        .forEach((status) => {
          const baseLabel =
            grid.baseSet
              ? `Base ${formatDjEngineTime(
                  grid.downbeat,
                  {
                    showTenths: true,
                  }
                )}`
              : "Base not set";

          const confidenceLabel =
            confidence
              ? ` • ${confidence}%`
              : "";

          const modeLabel =
            grid.resolvedMode ===
            "dynamic"
              ? `Dynamic ${grid.segments.length} segments`
              : "Normal";

          const rangeLabel =
            grid.editRange ===
            "from-here"
              ? "From here"
              : "Whole track";

          status.textContent =
            grid.bpm
              ? `Grid ${
                  grid.locked
                    ? "Locked"
                    : "Ready"
                } • ${modeLabel} • ${rangeLabel} • ${grid.adjustmentMs} ms • ${bpmLabel} BPM${rawLabel} • ${keyLabel}${confidenceLabel} • ${baseLabel}${
                  grid.reviewRequired
                    ? " • Review"
                    : ""
                }`
              : "Grid waiting for BPM analysis";

          status.classList.toggle(
            "is-grid-locked",
            Boolean(grid.locked)
          );

          status.setAttribute(
            "aria-label",
            `${status.textContent}. Open grid options.`
          );
        });

      window.dispatchEvent(
        new CustomEvent(
          "brmedia:dj-grid-state",
          {
            detail: {
              deckId:
                config.deckId,

              state,
            },
          }
        )
      );
    };
		
    const djGridPersistTimers =
      new Map();

    const persistDeckGridPreparation = (
      config,
      grid
    ) => {
      const libraryItemId =
        String(
          config.loadedLibraryItemId ||
          ""
        ).trim();

      if (
        !libraryItemId ||
        !grid?.bpm
      ) {
        return;
      }

      window.clearTimeout(
        djGridPersistTimers.get(
          config.deckId
        )
      );

      djGridPersistTimers.set(
        config.deckId,

        window.setTimeout(
          async () => {
            try {
              const response =
                await fetch(
                  `/library/${encodeURIComponent(
                    libraryItemId
                  )}/dj-prep`,

                  {
                    method: "POST",

                    headers: {
                      "Content-Type":
                        "application/json",
                    },

                    body: JSON.stringify({
                      ...gridApi.serialise(
                        grid,
                        {
                          duration:
                            Math.max(
                              0,

                              Number(
                                getDeckStateForConfig(
                                  config
                                ).duration
                              ) || 0
                            ),

                          minBpm:
                            DJ_GRID_MIN_BPM,

                          maxBpm:
                            DJ_GRID_MAX_BPM,

                          preRollSeconds:
                            DJ_GRID_PRE_ROLL_SECONDS,
                        }
                      ),

                      unlock:
                        Boolean(
                          config
                            .gridUnlockPending
                        ),
                    }),
                  }
                );

              if (!response.ok) {
                return;
              }

              config.gridUnlockPending =
                false;

              const payload =
                await response
                  .json()
                  .catch(() => null);

              const savedItem =
                payload?.item;

              const sheet =
                document.querySelector(
                  "[data-dj-performance-library]"
                );

              const items =
                sheet?._brDjLibraryItems ||
                [];

              const cachedItem =
                items.find(
                  (item) =>
                    String(
                      item.id || ""
                    ) ===
                    libraryItemId
                );

              if (
                cachedItem &&
                savedItem
              ) {
                Object.assign(
                  cachedItem,
                  savedItem
                );
              }
            } catch {}
          },

          420
        )
      );
    };
    const applyDeckBeatGridUpdate = (
      config,
      updates = {},
      state =
        lastDeckStates.get(
          config.deckId
        ) || blankDeckState(),
      options = {}
    ) => {
      const grid =
        normaliseDeckBeatGrid(
          config,
          state
        );

      if (
        grid.locked &&
        !options.allowLocked
      ) {
        syncDeckBeatGridUi(
          config,
          state
        );

        return grid;
      }

      if (!options.skipHistory) {
        pushDeckGridHistory(config);
      }

      const gridOptions = {
        duration:
          Math.max(
            0,
            Number(state.duration) || 0
          ),

        minBpm:
          DJ_GRID_MIN_BPM,

        maxBpm:
          DJ_GRID_MAX_BPM,

        preRollSeconds:
          DJ_GRID_PRE_ROLL_SECONDS,

        range:
          updates.editRange ||
          grid.editRange,

        source:
          updates.source ||
          "manual",
      };

      if (
        Object.prototype.hasOwnProperty.call(
          updates,
          "bpm"
        )
      ) {
        const bpm =
          getSafeGridBpmValue(
            updates.bpm
          );

        if (bpm) {
          const nextGrid =
            gridApi.setBpm(
              grid,
              bpm,

              Number(
                state.currentTime
              ) ||
                grid.downbeat,

              gridOptions
            );

          gridApi.restore(
            grid,
            nextGrid
          );

          grid.userBpm = true;

          grid.source =
            updates.source ||
            "manual";
        }
      }

      if (
        Object.prototype.hasOwnProperty.call(
          updates,
          "downbeat"
        )
      ) {
        const duration = Math.max(
          0,
          Number(state.duration) || 0
        );

        const nextDownbeat =
          Math.max(
            -DJ_GRID_PRE_ROLL_SECONDS,

            Math.min(
              duration || Infinity,

              Number(
                updates.downbeat
              ) || 0
            )
          );

        const shifted =
          gridApi.shift(
            grid,

            nextDownbeat -
              grid.downbeat,

            grid.downbeat,

            {
              ...gridOptions,
              range: "whole",
            }
          );

        gridApi.restore(
          grid,
          shifted
        );

        grid.downbeat =
          nextDownbeat;

        grid.baseSet = true;
        grid.userDownbeat = true;
      }

      [
        "analysisMode",
        "resolvedMode",
        "editRange",
        "adjustmentMs",
        "reviewRequired",
      ].forEach((key) => {
        if (
          Object.prototype.hasOwnProperty.call(
            updates,
            key
          )
        ) {
          grid[key] =
            updates[key];
        }
      });

      if (
        Object.prototype.hasOwnProperty.call(
          updates,
          "segments"
        ) &&
        Array.isArray(
          updates.segments
        )
      ) {
        grid.segments =
          updates.segments.map(
            (segment) => ({
              ...segment,
            })
          );
      }

      if (
        Object.prototype.hasOwnProperty.call(
          updates,
          "locked"
        )
      ) {
        const nextLocked =
          Boolean(
            updates.locked
          );

        if (
          grid.locked &&
          !nextLocked
        ) {
          config.gridUnlockPending =
            true;
        }

        grid.locked =
          nextLocked;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          updates,
          "baseSet"
        )
      ) {
        grid.baseSet =
          Boolean(
            updates.baseSet
          );
      }

      const history =
        grid.history;

      const future =
        grid.future;

      const tapIntervals =
        grid.tapIntervals;

      const lastTapAt =
        grid.lastTapAt;

      Object.assign(
        grid,

        gridApi.normalise(
          grid,
          gridOptions
        ),

        {
          history,
          future,
          tapIntervals,
          lastTapAt,
        }
      );

      syncDeckBeatGridUi(
        config,
        state
      );

      syncDeckLoopControls(
        config,
        state
      );

      renderDjRealWaveforms(
        config,
        state
      );

      persistDeckGridPreparation(
        config,
        grid
      );

      return grid;
    };
		
    const applyDeckGridTransform = (
      config,
      transform,

      state =
        lastDeckStates.get(
          config.deckId
        ) || blankDeckState(),

      source = "manual"
    ) => {
      const grid =
        normaliseDeckBeatGrid(
          config,
          state
        );

      if (
        grid.locked ||
        typeof transform !==
          "function"
      ) {
        syncDeckBeatGridUi(
          config,
          state
        );

        return grid;
      }

      pushDeckGridHistory(config);

      const options = {
        duration:
          Math.max(
            0,

            Number(
              state.duration
            ) || 0
          ),

        minBpm:
          DJ_GRID_MIN_BPM,

        maxBpm:
          DJ_GRID_MAX_BPM,

        preRollSeconds:
          DJ_GRID_PRE_ROLL_SECONDS,

        range:
          grid.editRange,

        source,
      };

      const nextGrid =
        transform(
          gridApi.normalise(
            grid,
            options
          ),
          options
        );

      if (!nextGrid) {
        return grid;
      }

      gridApi.restore(
        grid,
        {
          ...nextGrid,

          source,

          userBpm: true,

          userDownbeat: true,
        }
      );

      syncDeckBeatGridUi(
        config,
        state
      );

      syncDeckLoopControls(
        config,
        state
      );

      renderDjRealWaveforms(
        config,
        state
      );

      persistDeckGridPreparation(
        config,
        grid
      );

      return grid;
    };
		
    const getDeckConfigById = (deckId) => deckConfigs.find((item) => item.deckId === deckId) || null;
    const getOtherDeckConfig = (config) => getDeckConfigById(config?.deckId === "d2" ? "d1" : "d2");
    const getDeckForConfig = (config) => config?.deckId ? deckBindings.get(config.deckId)?.deck || null : null;
    const getDeckStateForConfig = (config) => getDeckForConfig(config)?.getState?.() || lastDeckStates.get(config?.deckId) || blankDeckState();

    const isDeckActuallyPlaying = (config) => {
      const state = getDeckStateForConfig(config);
      return Boolean(state.isLoaded && state.isPlaying);
    };

    const isDeckActuallyAudible = (config) => {
      const state = getDeckStateForConfig(config);
      const channelVolume = Number.isFinite(Number(state.channelVolume)) ? Number(state.channelVolume) : 1;
      const crossfadeGain = Number.isFinite(Number(state.crossfadeGain)) ? Number(state.crossfadeGain) : 1;
      return Boolean(state.isLoaded && state.isPlaying && channelVolume * crossfadeGain > 0.001);
    };
		
    const normaliseLiveMixBpm = (value) => {
      const bpm = Number(value);

      if (
        !Number.isFinite(bpm) ||
        bpm < DJ_GRID_MIN_BPM ||
        bpm > DJ_GRID_MAX_BPM
      ) {
        return null;
      }

      /*
        Performance Sync uses whole BPM targets.
        Grid BPM remains allowed to be fractional.
      */
      return Math.round(bpm);
    };

    const readDeckCurrentLiveBpm = (
      config,
      state = getDeckStateForConfig(config)
    ) => {
      const gridBpm = getGridBpm(
        config,
        state
      );

      if (!gridBpm) return null;

      const playbackRate = Math.max(
        0.5,
        Math.min(
          2,
          Number(state.playbackRate) || 1
        )
      );

      return gridBpm * playbackRate;
    };

    const getLiveMixBpmTarget = (
      preferredMasterConfig = null
    ) => {
      const stored =
        normaliseLiveMixBpm(
          djSyncState.liveMixBpmTarget
        );

      if (stored) {
        djSyncState.liveMixBpmTarget =
          stored;

        return stored;
      }

      if (!preferredMasterConfig) {
        return null;
      }

      const resolved =
        normaliseLiveMixBpm(
          readDeckCurrentLiveBpm(
            preferredMasterConfig
          )
        );

      if (resolved) {
        djSyncState.liveMixBpmTarget =
          resolved;
      }

      return resolved;
    };

    const setDuoMasterDeckId = (nextMasterDeckId = "") => {
      const safeNextId = nextMasterDeckId === "d1" || nextMasterDeckId === "d2" ? nextMasterDeckId : "";
      const previousMasterDeckId = djSyncState.masterDeckId;
      if (previousMasterDeckId === safeNextId) return getDeckConfigById(safeNextId);

      djSyncState.masterDeckId = safeNextId;

      /*
        A promoted Master keeps its persistent
        SYNC mode armed. Only its old follower
        relationship is removed.
      */
      if (safeNextId) {
        delete djSyncState.syncSources[
          safeNextId
        ];

        resetSyncCorrectionState(
          safeNextId
        );
      }

      djSyncState.syncedDeckIds.forEach((targetDeckId) => {
        if (!safeNextId || targetDeckId === safeNextId) return;

        const sourceDeckId = djSyncState.syncSources[targetDeckId];
        if (!sourceDeckId || sourceDeckId === previousMasterDeckId) {
          djSyncState.syncSources[targetDeckId] = safeNextId;
        }
      });

      return getDeckConfigById(safeNextId);
    };

    const refreshDuoMasterDeck = (preferredConfig = null, options = {}) => {
      if (options.manual) {
        if (options.active === false) {
          if (!preferredConfig || djSyncState.manualMasterDeckId === preferredConfig.deckId) {
            djSyncState.manualMasterDeckId = "";
          }

          if (preferredConfig && djSyncState.masterDeckId === preferredConfig.deckId) {
            const otherConfig = getOtherDeckConfig(preferredConfig);
            setDuoMasterDeckId(
              otherConfig && isDeckActuallyPlaying(otherConfig)
                ? otherConfig.deckId
                : ""
            );
          }
        } else if (preferredConfig?.deckId) {
          djSyncState.manualMasterDeckId = preferredConfig.deckId;
          return setDuoMasterDeckId(preferredConfig.deckId);
        }
      }

      const manualMaster = getDeckConfigById(
        djSyncState.manualMasterDeckId
      );

      /*
        A manually selected Master remains Master
        while loaded, paused, stopped or waiting
        for its track.
      */
      if (manualMaster) {
        return setDuoMasterDeckId(
          manualMaster.deckId
        );
      }

      /*
        Once a playing deck is Master, keep it as Master until its transport
        stops. Moving the crossfader alone must not cause a Master swap.
      */
      const currentMaster = getDeckConfigById(djSyncState.masterDeckId);
      if (currentMaster && isDeckActuallyPlaying(currentMaster)) {
        return currentMaster;
      }

      const audiblePlayingDeck = deckConfigs.find((item) => isDeckActuallyAudible(item)) || null;

      if (
        preferredConfig &&
        isDeckActuallyPlaying(preferredConfig) &&
        isDeckActuallyAudible(preferredConfig)
      ) {
        return setDuoMasterDeckId(preferredConfig.deckId);
      }

      if (audiblePlayingDeck) {
        return setDuoMasterDeckId(audiblePlayingDeck.deckId);
      }

      const anyPlayingDeck = deckConfigs.find((item) => isDeckActuallyPlaying(item)) || null;

      if (anyPlayingDeck) {
        return setDuoMasterDeckId(anyPlayingDeck.deckId);
      }

      setDuoMasterDeckId("");
      return null;
    };

    const setManualDuoMasterDeck = (config, active = true) => {
      const masterConfig = refreshDuoMasterDeck(config, {
        manual: true,
        active,
      });

      updateAllMasterClockDisplayGrids();
      updateDuoSyncUi();
      return masterConfig;
    };

    const getDeckEffectiveBpm = (
      config,
      state = getDeckStateForConfig(config)
    ) => readDeckCurrentLiveBpm(
      config,
      state
    );

    const getDjBeatCyclePhase = (
      beatFloat = 0,
      cycleBeats = DJ_SYNC_PHASE_CYCLE_BEATS
    ) => {
      const cycle = Math.max(
        1,
        Number(cycleBeats) || DJ_SYNC_PHASE_CYCLE_BEATS
      );

      return ((Number(beatFloat) || 0) % cycle + cycle) % cycle;
    };

    const getDjShortestBeatCycleDelta = (
      masterBeatFloat = 0,
      targetBeatFloat = 0,
      cycleBeats = DJ_SYNC_PHASE_CYCLE_BEATS
    ) => {
      const cycle = Math.max(
        1,
        Number(cycleBeats) || DJ_SYNC_PHASE_CYCLE_BEATS
      );

      let beatDelta =
        (Number(masterBeatFloat) || 0) -
        (Number(targetBeatFloat) || 0);

      beatDelta -= Math.round(beatDelta / cycle) * cycle;
      return beatDelta;
    };

    const getDeckStateClockTime = (state = {}) => {
      const clockTime = Number(state.clockTime);
      return Number.isFinite(clockTime) ? clockTime : null;
    };

    const getDeckStateStartClockTime = (state = {}) => {
      const startClockTime = Number(state.startClockTime);
      return Number.isFinite(startClockTime) ? startClockTime : null;
    };

    const projectDeckTrackTimeToClock = (
      state = {},
      referenceClockTime = null
    ) => {
      let trackTime = Number(state.currentTime) || 0;

      const sampleClockTime = getDeckStateClockTime(state);
      const targetClockTime = Number(referenceClockTime);

      if (
        !state.isPlaying ||
        sampleClockTime == null ||
        !Number.isFinite(targetClockTime) ||
        targetClockTime <= sampleClockTime
      ) {
        return trackTime;
      }

      const scheduledStartClockTime = getDeckStateStartClockTime(state);

      const advanceFromClockTime =
        scheduledStartClockTime != null &&
        sampleClockTime < scheduledStartClockTime
          ? scheduledStartClockTime
          : sampleClockTime;

      if (targetClockTime <= advanceFromClockTime) {
        return trackTime;
      }

      const playbackRate = Math.max(
        0.5,
        Math.min(2, Number(state.playbackRate) || 1)
      );

      trackTime +=
        (targetClockTime - advanceFromClockTime) * playbackRate;

      return trackTime;
    };

    const getSharedDeckClockTime = (...states) => {
      const clockTimes = states
        .map(getDeckStateClockTime)
        .filter((value) => value != null);

      return clockTimes.length ? Math.max(...clockTimes) : null;
    };

    const getDeckPhaseDeltaSeconds = (
      masterConfig,
      targetConfig,
      masterState = getDeckStateForConfig(masterConfig),
      targetState = getDeckStateForConfig(targetConfig),
      options = {}
    ) => {
      const masterGrid = normaliseDeckBeatGrid(masterConfig, masterState);
      const targetGrid = normaliseDeckBeatGrid(targetConfig, targetState);

      if (
        !masterGrid.baseSet ||
        !targetGrid.baseSet ||
        !masterGrid.bpm ||
        !targetGrid.bpm
      ) {
        return 0;
      }

      const masterInterval = 60 / masterGrid.bpm;
      const targetInterval = 60 / targetGrid.bpm;

      const hasReferenceClock =
        options.referenceClockTime != null &&
        Number.isFinite(Number(options.referenceClockTime));

      const referenceClockTime = hasReferenceClock
        ? Number(options.referenceClockTime)
        : getSharedDeckClockTime(masterState, targetState);

      const masterTime = projectDeckTrackTimeToClock(
        masterState,
        referenceClockTime
      );

      const targetTime = projectDeckTrackTimeToClock(
        targetState,
        referenceClockTime
      );

      const masterBeatFloat =
        (masterTime - masterGrid.downbeat) / masterInterval;

      const targetBeatFloat =
        (targetTime - targetGrid.downbeat) / targetInterval;

      const beatDelta = getDjShortestBeatCycleDelta(
        masterBeatFloat,
        targetBeatFloat,
        DJ_SYNC_PHASE_CYCLE_BEATS
      );

      const targetRate = Math.max(
        0.5,
        Math.min(2, Number(targetState.playbackRate) || 1)
      );

      /*
        Return wall-clock phase error rather than unscaled source-file time.
      */
      return (beatDelta * targetInterval) / targetRate;
    };

    const getDuoPerformanceScaleSnapshot =
      () => {
        const masterConfig =
          refreshDuoMasterDeck();

        const sourceConfig =
          masterConfig ||
          deckConfigs.find((item) => {
            const state =
              getDeckStateForConfig(
                item
              );

            return (
              state.isLoaded &&
              !state.error
            );
          });

        if (!sourceConfig) return null;

        const sourceState =
          getDeckStateForConfig(
            sourceConfig
          );

        const duration = Math.max(
          0,
          Number(
            sourceState.duration
          ) || 0
        );

        if (!duration) return null;

        return {
          /*
            Share only the DUO time scale. Each deck
            still calculates line positions from its
            own saved BPM, downbeat and current time.
          */
          visibleWallSeconds: Math.max(
            0.75,
            duration /
              DJ_DUO_PERFORMANCE_ZOOM
          ),

          sourceDeckId:
            sourceConfig.deckId,
        };
      };

    const applyDuoPerformanceScaleSnapshot =
      (snapshot) => {
        deckConfigs.forEach(
          (config) => {
            const state =
              getDeckStateForConfig(
                config
              );

            const playbackRate =
              Math.max(
                0.5,
                Math.min(
                  2,
                  Number(
                    state.playbackRate
                  ) || 1
                )
              );

            /*
              A common wall-clock window keeps both
              waveforms on the same visual scale. The
              source-time window differs by playback
              rate, exactly as the audio does.
            */
            config.duoVisibleSourceSeconds =
              snapshot
                ? snapshot
                    .visibleWallSeconds *
                  playbackRate
                : (
                    Math.max(
                      0,
                      Number(
                        state.duration
                      ) || 0
                    ) /
                    DJ_DUO_PERFORMANCE_ZOOM
                  );

            /*
              Every DUO half renders its own prepared
              grid through config.beatGrid.
            */
            config.mixBeatGrid = null;
          }
        );
      };

    const updateMasterClockDisplayGrid =
      () => {
        const snapshot =
          getDuoPerformanceScaleSnapshot();

        applyDuoPerformanceScaleSnapshot(
          snapshot
        );

        return snapshot;
      };

    const updateAllMasterClockDisplayGrids =
      () => {
        const snapshot =
          getDuoPerformanceScaleSnapshot();

        applyDuoPerformanceScaleSnapshot(
          snapshot
        );
      };

    const pickSyncMasterConfig = (targetConfig) => {
      const refreshedMaster =
        refreshDuoMasterDeck();

      const isUsableTempoSource = (
        config
      ) => {
        if (!config) return false;

        const state =
          getDeckStateForConfig(config);

        return Boolean(
          state.isLoaded &&
          !state.isLoading &&
          !state.error
        );
      };

      const sourceDeckId =
        djSyncState.syncSources?.[
          targetConfig.deckId
        ];

      const sourceConfig =
        getDeckConfigById(
          sourceDeckId
        );

      if (
        sourceConfig &&
        sourceConfig !== targetConfig &&
        isUsableTempoSource(
          sourceConfig
        )
      ) {
        return sourceConfig;
      }

      if (
        refreshedMaster &&
        refreshedMaster !== targetConfig &&
        isUsableTempoSource(
          refreshedMaster
        )
      ) {
        return refreshedMaster;
      }

      const otherConfig =
        getOtherDeckConfig(
          targetConfig
        );

      if (
        otherConfig &&
        isUsableTempoSource(
          otherConfig
        )
      ) {
        return otherConfig;
      }

      return null;
    };

    const getAlignedBeatSyncTime = (
      masterConfig,
      targetConfig,
      masterState,
      targetState,
      options = {}
    ) => {
      const masterBeatSeconds = getDeckBeatSeconds(
        masterConfig,
        masterState
      );

      const targetBeatSeconds = getDeckBeatSeconds(
        targetConfig,
        targetState
      );

      if (!masterBeatSeconds || !targetBeatSeconds) {
        return Number(targetState.currentTime) || 0;
      }

      const masterGrid = normaliseDeckBeatGrid(
        masterConfig,
        masterState
      );

      const targetGrid = normaliseDeckBeatGrid(
        targetConfig,
        targetState
      );

      const hasReferenceClock =
        options.referenceClockTime != null &&
        Number.isFinite(Number(options.referenceClockTime));

      const referenceClockTime = hasReferenceClock
        ? Number(options.referenceClockTime)
        : getSharedDeckClockTime(masterState, targetState);

      const masterTime = projectDeckTrackTimeToClock(
        masterState,
        referenceClockTime
      );

      const hasTargetAnchor =
        options.targetAnchorTime != null &&
        Number.isFinite(Number(options.targetAnchorTime));

      const targetAnchorTime = hasTargetAnchor
        ? Number(options.targetAnchorTime)
        : projectDeckTrackTimeToClock(
            targetState,
            referenceClockTime
          );

      const masterBeatFloat =
        (masterTime - masterGrid.downbeat) / masterBeatSeconds;

      const targetBeatFloat =
        (targetAnchorTime - targetGrid.downbeat) /
        targetBeatSeconds;

      const masterPhase = getDjBeatCyclePhase(
        masterBeatFloat,
        DJ_SYNC_PHASE_CYCLE_BEATS
      );

      const targetCycleIndex = Math.round(
        (targetBeatFloat - masterPhase) /
        DJ_SYNC_PHASE_CYCLE_BEATS
      );

      let aligned =
        targetGrid.downbeat +
        (
          targetCycleIndex * DJ_SYNC_PHASE_CYCLE_BEATS +
          masterPhase
        ) *
          targetBeatSeconds;

      const minimumTime = options.allowNegative
        ? -DJ_GRID_PRE_ROLL_SECONDS
        : 0;

      const cycleSeconds =
        targetBeatSeconds * DJ_SYNC_PHASE_CYCLE_BEATS;

      while (aligned < minimumTime) {
        aligned += cycleSeconds;
      }

      while (
        targetState.duration &&
        aligned > targetState.duration
      ) {
        aligned -= cycleSeconds;
      }

      return Math.max(
        minimumTime,
        Math.min(Number(targetState.duration) || Infinity, aligned)
      );
    };

    const updateDuoSyncUi = () => {
      refreshDuoMasterDeck();

      document
        .querySelectorAll(
          ".brDjDuoSyncDeck"
        )
        .forEach((deckNode) => {
          const deckId =
            deckNode.classList.contains(
              "is-deck-2"
            )
              ? "d2"
              : "d1";

          const config =
            getDeckConfigById(deckId);

          if (!config) return;

          const state =
            getDeckStateForConfig(
              config
            );

          const isMaster =
            djSyncState.masterDeckId ===
            deckId;

          const isSynced =
            djSyncState.syncedDeckIds.has(
              deckId
            );

          const syncSource =
            getDeckConfigById(
              djSyncState.syncSources?.[
                deckId
              ]
            );

          const isLinked = Boolean(
            isSynced &&
            !isMaster &&
            syncSource
          );

          const gridBpm =
            getGridBpm(config, state);

          const exactMixBpm =
            getLiveMixBpmTarget();

          const effectiveBpm =
            (
              isMaster || isSynced
            ) && exactMixBpm
              ? exactMixBpm
              : getDeckEffectiveBpm(
                  config,
                  state
                ) || gridBpm;

          deckNode.classList.toggle(
            "is-sync-master",
            isMaster
          );

          deckNode.classList.toggle(
            "is-sync-armed",
            isSynced
          );

          deckNode.classList.toggle(
            "is-sync-linked",
            isLinked
          );

          deckNode
            .querySelectorAll(
              ".brDjDuoSyncBtn"
            )
            .forEach((button) => {
              button.classList.toggle(
                "is-sync-armed",
                isSynced
              );

              button.classList.toggle(
                "is-sync-linked",
                isLinked
              );

              button.textContent =
                isSynced
                  ? "SYNC ON"
                  : "SYNC";

              button.setAttribute(
                "aria-pressed",
                isSynced
                  ? "true"
                  : "false"
              );
            });

          deckNode
            .querySelectorAll(
              ".brDjDuoBpmPopup"
            )
            .forEach((button) => {
              button.classList.toggle(
                "is-sync-master",
                isMaster
              );

              button.classList.toggle(
                "is-sync-linked",
                isLinked
              );

              button.setAttribute(
                "aria-pressed",
                isMaster || isSynced
                  ? "true"
                  : "false"
              );

              const value =
                button.querySelector(
                  "strong"
                );

              if (value) {
                value.textContent =
                  effectiveBpm
                    ? effectiveBpm
                        .toFixed(2)
                    : "--.--";
              }
            });

          deckNode
            .querySelectorAll(
              "[data-dj-bpm-status]"
            )
            .forEach((label) => {
              const statusKey =
                label.dataset
                  .djBpmStatus;

              const active =
                statusKey === "sync"
                  ? isSynced
                  : statusKey === "q"
                    ? Boolean(
                        config.quantize
                      )
                    : statusKey === "mt"
                      ? Boolean(
                          config
                            .masterTempo
                        )
                      : statusKey ===
                          "master"
                        ? isMaster
                        : statusKey ===
                            "key"
                          ? Boolean(
                              config
                                .keySync
                            )
                          : false;

              label.classList.toggle(
                "is-active",
                active
              );

              label.hidden = !active;
            });
        });
    };

    const syncCorrectionStates = new Map();

    const resetSyncCorrectionState = (deckId) => {
      syncCorrectionStates.delete(deckId);
    };

    const getSyncCorrectionState = (
      deckId,
      masterDeckId
    ) => {
      let correction = syncCorrectionStates.get(deckId);

      if (
        !correction ||
        correction.masterDeckId !== masterDeckId
      ) {
        correction = {
          masterDeckId,
          phaseSamples: [],
          bending: false,
          stableTicks: 0,
          lastHardCorrectionAt: 0,
        };

        syncCorrectionStates.set(deckId, correction);
      }

      return correction;
    };

    const getFilteredSyncPhaseDelta = (
      correction,
      phaseDelta
    ) => {
      correction.phaseSamples.push(phaseDelta);
      correction.phaseSamples =
        correction.phaseSamples.slice(-3);

      const sorted = [...correction.phaseSamples].sort(
        (a, b) => a - b
      );

      let filtered;

      if (sorted.length === 2) {
        filtered = (sorted[0] + sorted[1]) / 2;
      } else {
        filtered =
          sorted[Math.floor(sorted.length / 2)] ??
          phaseDelta;
      }

      /*
        Respond immediately if the error crosses from ahead to behind.
      */
      if (Math.sign(filtered) !== Math.sign(phaseDelta)) {
        filtered = phaseDelta;
      }

      return filtered;
    };

    const setDeckSyncPlaybackRate = (
      targetConfig,
      requestedRate,
      currentState = getDeckStateForConfig(targetConfig)
    ) => {
      const safeRate = Math.max(
        0.5,
        Math.min(2, Number(requestedRate) || 1)
      );

      if (
        Math.abs(
          (Number(currentState.playbackRate) || 1) -
            safeRate
        ) <= 0.0002
      ) {
        return currentState;
      }

      return (
        audioApi.setDeckPlaybackRate?.(
          targetConfig.deckId,
          safeRate
        ) || getDeckStateForConfig(targetConfig)
      );
    };
		
    const deckTempoRampTokens =
      new Map();

    const cancelDeckTempoRamp = (
      deckId
    ) => {
      const token =
        deckTempoRampTokens.get(deckId);

      if (token) {
        token.cancelled = true;
      }

      deckTempoRampTokens.delete(
        deckId
      );
    };

    const isDeckTempoRampActive = (
      deckId
    ) =>
      deckTempoRampTokens.has(deckId);

    const rampDeckPlaybackRate = (
      config,
      requestedRate,
      durationMs =
        DJ_LIVE_BPM_RAMP_MS
    ) => {
      const startState =
        getDeckStateForConfig(config);

      const startRate = Math.max(
        0.5,
        Math.min(
          2,
          Number(
            startState.playbackRate
          ) || 1
        )
      );

      const targetRate = Math.max(
        0.5,
        Math.min(
          2,
          Number(requestedRate) || 1
        )
      );

      cancelDeckTempoRamp(
        config.deckId
      );

      if (
        Math.abs(
          targetRate - startRate
        ) <= 0.0002 ||
        durationMs <= 0
      ) {
        return Promise.resolve(
          setDeckSyncPlaybackRate(
            config,
            targetRate,
            startState
          )
        );
      }

      const token = {
        cancelled: false,
      };

      deckTempoRampTokens.set(
        config.deckId,
        token
      );

      const startedAt =
        performance.now();

      return new Promise((resolve) => {
        const step = (now) => {
          if (token.cancelled) {
            resolve(
              getDeckStateForConfig(
                config
              )
            );

            return;
          }

          const progress = Math.max(
            0,
            Math.min(
              1,
              (now - startedAt) /
                durationMs
            )
          );

          /*
            Ease-in/out avoids an abrupt jump at
            either end of the tempo movement.
          */
          const eased =
            progress < 0.5
              ? 2 *
                progress *
                progress
              : 1 -
                Math.pow(
                  -2 * progress + 2,
                  2
                ) /
                  2;

          const nextRate =
            startRate +
            (
              targetRate -
              startRate
            ) *
              eased;

          const nextState =
            setDeckSyncPlaybackRate(
              config,
              nextRate,
              getDeckStateForConfig(
                config
              )
            );

          if (progress >= 1) {
            deckTempoRampTokens.delete(
              config.deckId
            );

            resolve(
              setDeckSyncPlaybackRate(
                config,
                targetRate,
                nextState
              )
            );

            return;
          }

          window.setTimeout(
            () =>
              window
                .requestAnimationFrame(
                  step
                ),
            20
          );
        };

        window.requestAnimationFrame(
          step
        );
      });
    };

    const setMasterLiveMixBpm =
      async (
        masterConfig,
        requestedBpm
      ) => {
        const liveBpm =
          normaliseLiveMixBpm(
            requestedBpm
          );

        if (
          !masterConfig?.deckId ||
          !liveBpm
        ) {
          return false;
        }

        /*
          Selecting a live BPM establishes a
          persistent pending Master. Neither the
          deck nor its audio has to be playing.
        */
        djSyncState.manualMasterDeckId =
          masterConfig.deckId;

        const currentMaster =
          setDuoMasterDeckId(
            masterConfig.deckId
          );

        djSyncState.liveMixBpmTarget =
          liveBpm;

        updateDuoSyncUi();

        const configsToApply =
          deckConfigs.filter(
            (config) => {
              const state =
                getDeckStateForConfig(
                  config
                );

              return Boolean(
                state.isLoaded &&
                (
                  config.deckId ===
                    currentMaster?.deckId ||
                  djSyncState
                    .syncedDeckIds
                    .has(
                      config.deckId
                    )
                )
              );
            }
          );

        const finalRates = new Map();

        await Promise.all(
          configsToApply.map(
            (config) => {
              const state =
                getDeckStateForConfig(
                  config
                );

              const gridBpm =
                getGridBpm(
                  config,
                  state
                );

              if (!gridBpm) {
                return Promise.resolve(
                  state
                );
              }

              if (
                config.deckId !==
                currentMaster?.deckId
              ) {
                djSyncState.syncSources[
                  config.deckId
                ] =
                  currentMaster.deckId;
              }

              const targetRate = Math.max(
                0.5,
                Math.min(
                  2,
                  liveBpm / gridBpm
                )
              );

              finalRates.set(
                config.deckId,
                targetRate
              );

              /*
                Paused or ready decks take the exact
                rate immediately. Only playing decks
                need the smooth audible transition.
              */
              if (!state.isPlaying) {
                return Promise.resolve(
                  setDeckSyncPlaybackRate(
                    config,
                    targetRate,
                    state
                  )
                );
              }

              return rampDeckPlaybackRate(
                config,
                targetRate,
                DJ_LIVE_BPM_RAMP_MS
              );
            }
          )
        );

        /*
          Finish on the exact requested rate after
          any active-deck transition.
        */
        configsToApply.forEach((config) => {
          const targetRate =
            finalRates.get(config.deckId);

          if (!targetRate) return;

          const state =
            setDeckSyncPlaybackRate(
              config,
              targetRate,
              getDeckStateForConfig(
                config
              )
            );

          setDeckSkinState(
            config,
            state
          );
        });

        updateAllMasterClockDisplayGrids();
        updateDuoSyncUi();

        return liveBpm;
      };

    const applyDeckTempoSync = async (
      targetConfig,
      options = {}
    ) => {
      const targetDeck =
        getDeckForConfig(targetConfig);

      if (!targetDeck) return null;

      const targetState =
        targetDeck.getState();

      if (!targetState.isLoaded) {
        return null;
      }

      const masterConfig =
        pickSyncMasterConfig(
          targetConfig
        );

      if (
        !masterConfig ||
        masterConfig.deckId ===
          targetConfig.deckId
      ) {
        return targetState;
      }

      const masterState =
        getDeckStateForConfig(
          masterConfig
        );

      const targetBpm = getGridBpm(
        targetConfig,
        targetState
      );

      const masterBaseBpm = getGridBpm(
        masterConfig,
        masterState
      );

      const masterEffectiveBpm =
        getLiveMixBpmTarget(
          masterConfig
        ) ||
        getDeckEffectiveBpm(
          masterConfig,
          masterState
        ) ||
        getGridBpm(
          masterConfig,
          masterState
        );

      if (
        !masterEffectiveBpm ||
        !masterBaseBpm ||
        !targetBpm
      ) {
        return targetState;
      }

      setDuoMasterDeckId(
        masterConfig.deckId
      );

      djSyncState.syncSources[
        targetConfig.deckId
      ] = masterConfig.deckId;

      djSyncState.syncedDeckIds.add(
        targetConfig.deckId
      );

      resetSyncCorrectionState(
        targetConfig.deckId
      );

      const lockedRate = Math.max(
        0.5,
        Math.min(
          2,
          masterEffectiveBpm / targetBpm
        )
      );

      const masterLockedRate = Math.max(
        0.5,
        Math.min(
          2,
          masterEffectiveBpm /
            masterBaseBpm
        )
      );

      const rampDuration =
        options.smooth === false
          ? 0
          : DJ_LIVE_BPM_RAMP_MS;

      /*
        SYNC is already active. Move the Master
        and follower to the same exact whole-number
        live mix BPM together.
      */
      const [
        nextMasterState,
        nextTargetState,
      ] = await Promise.all([
        rampDeckPlaybackRate(
          masterConfig,
          masterLockedRate,
          rampDuration
        ),

        rampDeckPlaybackRate(
          targetConfig,
          lockedRate,
          rampDuration
        ),
      ]);

      setDeckSkinState(
        masterConfig,
        nextMasterState
      );

      let nextState =
        nextTargetState;

      if (
        options.beatSync !== false &&
        nextState.isPlaying &&
        masterState.isPlaying
      ) {
        const liveMasterState =
          getDeckStateForConfig(
            masterConfig
          );

        const liveTargetState =
          getDeckStateForConfig(
            targetConfig
          );

        const phaseDelta =
          getDeckPhaseDeltaSeconds(
            masterConfig,
            targetConfig,
            liveMasterState,
            liveTargetState
          );

        if (
          Math.abs(phaseDelta) >
          DJ_SYNC_LOCK_TOLERANCE_SECONDS
        ) {
          const sharedClock =
            getSharedDeckClockTime(
              liveMasterState,
              liveTargetState
            ) || 0;

          const referenceClockTime =
            sharedClock +
            DJ_SYNC_SEEK_LEAD_SECONDS;

          const aligned =
            getAlignedBeatSyncTime(
              masterConfig,
              targetConfig,
              liveMasterState,
              liveTargetState,
              { referenceClockTime }
            );

          nextState =
            await targetDeck.seek(
              aligned
            );

          nextState =
            setDeckSyncPlaybackRate(
              targetConfig,
              lockedRate,
              nextState
            );
        }
      }

      updateMasterClockDisplayGrid(
        targetConfig,
        nextState
      );

      setDeckSkinState(
        targetConfig,
        nextState
      );

      updateDuoSyncUi();
      return nextState;
    };

    const getSyncedLaunchPlan = (
      targetConfig,
      targetState =
        getDeckStateForConfig(
          targetConfig
        ),
      options = {}
    ) => {
      const requestedAnchor =
        Number(
          options.anchorOffset
        );

      const currentTime =
        Number(
          targetState.currentTime
        );

      const cuePoint =
        Number(
          targetState.cuePoint
        );

      /*
        PLAY resumes from the parked/paused
        transport position. CUE remains responsible
        for returning the deck to its cue point.
      */
      const fallbackOffset =
        Number.isFinite(
          requestedAnchor
        )
          ? requestedAnchor
          : Number.isFinite(
                currentTime
              )
            ? currentTime
            : Number.isFinite(
                  cuePoint
                )
              ? cuePoint
              : 0;

      const masterConfig = pickSyncMasterConfig(targetConfig);

      if (
        !masterConfig ||
        masterConfig.deckId === targetConfig.deckId
      ) {
        return {
          offset: Math.max(
            -DJ_GRID_PRE_ROLL_SECONDS,
            fallbackOffset
          ),
          delaySeconds: 0,
        };
      }

      const masterState = getDeckStateForConfig(masterConfig);

      const masterBeatSeconds = getDeckBeatSeconds(
        masterConfig,
        masterState
      );

      const masterEffectiveBpm =
        getLiveMixBpmTarget(
          masterConfig
        ) ||
        getDeckEffectiveBpm(
          masterConfig,
          masterState
        );

      if (
        !masterState.isPlaying ||
        !masterBeatSeconds ||
        !masterEffectiveBpm
      ) {
        return {
          offset: Math.max(
            -DJ_GRID_PRE_ROLL_SECONDS,
            fallbackOffset
          ),
          delaySeconds: 0,
        };
      }

      const masterGrid = normaliseDeckBeatGrid(
        masterConfig,
        masterState
      );

      const masterClockTime =
        getDeckStateClockTime(masterState);

      const masterTime = projectDeckTrackTimeToClock(
        masterState,
        masterClockTime
      );

      const masterBeatFloat =
        (masterTime - masterGrid.downbeat) /
        masterBeatSeconds;

      const beatFraction =
        ((masterBeatFloat % 1) + 1) % 1;

      const liveBeatSeconds =
        60 / masterEffectiveBpm;

      const elapsedSinceBeat =
        beatFraction * liveBeatSeconds;

      const quantizedLaunch = Boolean(
        targetConfig.quantize
      );

      /*
        Slightly late taps catch the current beat. Other taps wait for the
        next Master beat when Quantize is active.
      */
      const delaySeconds =
        !quantizedLaunch ||
        beatFraction <= 0.0005 ||
        elapsedSinceBeat <=
          DJ_SYNC_LATE_LAUNCH_SECONDS
          ? 0
          : (1 - beatFraction) * liveBeatSeconds;

      const launchClockTime =
        masterClockTime == null
          ? null
          : masterClockTime + delaySeconds;

      const alignedOffset = getAlignedBeatSyncTime(
        masterConfig,
        targetConfig,
        masterState,
        targetState,
        {
          referenceClockTime: launchClockTime,
          targetAnchorTime: fallbackOffset,
          allowNegative: true,
        }
      );

      return {
        offset: alignedOffset,
        delaySeconds: Math.max(0, delaySeconds),
      };
    };

    const maintainSyncedDeck = async (targetConfig) => {
      if (
        !djSyncState.syncedDeckIds.has(
          targetConfig.deckId
        )
      ) {
        return;
      }

      const masterConfig =
        pickSyncMasterConfig(targetConfig);

      if (
        !masterConfig ||
        masterConfig.deckId === targetConfig.deckId
      ) {
        return;
      }

      const targetDeck =
        getDeckForConfig(targetConfig);

      /*
        Do not let drift correction fight a
        deliberate smooth BPM transition.
      */
      if (
        !targetDeck ||
        isDeckTempoRampActive(
          targetConfig.deckId
        )
      ) {
        return;
      }

      const masterState =
        getDeckStateForConfig(masterConfig);

      const targetState = targetDeck.getState();

      if (
        !masterState.isPlaying ||
        !targetState.isPlaying
      ) {
        return;
      }

      const targetBaseBpm = getGridBpm(
        targetConfig,
        targetState
      );

      const masterEffectiveBpm =
        getLiveMixBpmTarget(
          masterConfig
        ) ||
        getDeckEffectiveBpm(
          masterConfig,
          masterState
        ) ||
        getGridBpm(
          masterConfig,
          masterState
        );

      if (!targetBaseBpm || !masterEffectiveBpm) {
        return;
      }

      setDuoMasterDeckId(masterConfig.deckId);

      djSyncState.syncSources[targetConfig.deckId] =
        masterConfig.deckId;

      const lockedRate = Math.max(
        0.5,
        Math.min(
          2,
          masterEffectiveBpm / targetBaseBpm
        )
      );

      const targetClockTime =
        getDeckStateClockTime(targetState);

      const targetStartClockTime =
        getDeckStateStartClockTime(targetState);

      /*
        Do not phase-correct a deck while it is waiting for a scheduled
        Quantized Play start.
      */
      if (
        targetStartClockTime != null &&
        targetClockTime != null &&
        targetStartClockTime >
          targetClockTime + 0.001
      ) {
        const waitingState = setDeckSyncPlaybackRate(
          targetConfig,
          lockedRate,
          targetState
        );

        updateMasterClockDisplayGrid(
          targetConfig,
          waitingState
        );

        setDeckSkinState(targetConfig, waitingState);
        return;
      }

      const correction = getSyncCorrectionState(
        targetConfig.deckId,
        masterConfig.deckId
      );

      const phaseDelta = getDeckPhaseDeltaSeconds(
        masterConfig,
        targetConfig,
        masterState,
        targetState
      );

      const filteredPhaseDelta =
        getFilteredSyncPhaseDelta(
          correction,
          phaseDelta
        );

      const absolutePhaseDelta = Math.abs(
        filteredPhaseDelta
      );

      const now = Date.now();
      let nextState = targetState;

      /*
        Large errors receive one controlled transport correction. The
        cooldown prevents repeated seeking if a track grid is inaccurate.
      */
      if (
        absolutePhaseDelta >=
          DJ_SYNC_HARD_PHASE_SECONDS &&
        now - correction.lastHardCorrectionAt >=
          DJ_SYNC_HARD_COOLDOWN_MS
      ) {
        const liveMasterState =
          getDeckStateForConfig(masterConfig);

        const liveTargetState =
          getDeckStateForConfig(targetConfig);

        const sharedClock =
          getSharedDeckClockTime(
            liveMasterState,
            liveTargetState
          ) || 0;

        const referenceClockTime =
          sharedClock + DJ_SYNC_SEEK_LEAD_SECONDS;

        const alignedTime = getAlignedBeatSyncTime(
          masterConfig,
          targetConfig,
          liveMasterState,
          liveTargetState,
          { referenceClockTime }
        );

        nextState = await targetDeck.seek(alignedTime);

        nextState = setDeckSyncPlaybackRate(
          targetConfig,
          lockedRate,
          nextState
        );

        correction.lastHardCorrectionAt = now;
        correction.phaseSamples = [];
        correction.bending = false;
        correction.stableTicks = 0;
      } else {
        /*
          Hysteresis stops the rate controller flicking rapidly between a
          bend and exact playback rate.
        */
        const shouldBend = correction.bending
          ? absolutePhaseDelta >
            DJ_SYNC_LOCK_TOLERANCE_SECONDS
          : absolutePhaseDelta >=
            DJ_SYNC_RELEASE_TOLERANCE_SECONDS;

        if (shouldBend) {
          const maximumBend =
            absolutePhaseDelta >=
            DJ_SYNC_MEDIUM_PHASE_SECONDS
              ? DJ_SYNC_MEDIUM_BEND_MAX
              : DJ_SYNC_FINE_BEND_MAX;

          const bend = Math.max(
            -maximumBend,
            Math.min(
              maximumBend,
              filteredPhaseDelta *
                DJ_SYNC_BEND_GAIN
            )
          );

          nextState = setDeckSyncPlaybackRate(
            targetConfig,
            lockedRate + bend,
            targetState
          );

          correction.bending = true;
          correction.stableTicks = 0;
        } else {
          correction.stableTicks += 1;

          /*
            Require two stable transport readings before removing the bend
            and returning exactly to the locked BPM.
          */
          if (correction.stableTicks >= 2) {
            nextState = setDeckSyncPlaybackRate(
              targetConfig,
              lockedRate,
              targetState
            );

            correction.bending = false;
          }
        }
      }

      updateMasterClockDisplayGrid(
        targetConfig,
        nextState
      );

      setDeckSkinState(targetConfig, nextState);
    };

    const syncCorrectionLocks = new Set();

    const queueSyncedDeckMaintenance = (
      targetConfig
    ) => {
      if (
        syncCorrectionLocks.has(targetConfig.deckId)
      ) {
        return;
      }

      syncCorrectionLocks.add(targetConfig.deckId);

      Promise.resolve(
        maintainSyncedDeck(targetConfig)
      ).finally(() => {
        syncCorrectionLocks.delete(
          targetConfig.deckId
        );
      });
    };

    const clearDeckSync = (
      targetConfig
    ) => {
      djSyncState.syncedDeckIds.delete(
        targetConfig.deckId
      );

      delete djSyncState.syncSources[
        targetConfig.deckId
      ];

      resetSyncCorrectionState(
        targetConfig.deckId
      );

      targetConfig.mixBeatGrid = null;

      /*
        The button switches off immediately.
        Only the return to the track's natural
        BPM is transitioned smoothly.
      */
      updateDuoSyncUi();

      void rampDeckPlaybackRate(
        targetConfig,
        1,
        DJ_LIVE_BPM_RAMP_MS
      ).then((nextState) => {
        setDeckSkinState(
          targetConfig,
          nextState
        );
      });

      return getDeckStateForConfig(
        targetConfig
      );
    };

    const bindDuoSyncControls = () => {
      if (
        document.body.dataset
          .brDjRealSyncBound === "true"
      ) {
        return;
      }

      document.body.dataset
        .brDjRealSyncBound = "true";

      document
        .querySelectorAll(
          ".brDjDuoSyncBtn"
        )
        .forEach((button) => {
          button.addEventListener(
            "click",
            async (event) => {
              event.preventDefault();
              event.stopPropagation();

              event
                .stopImmediatePropagation?.();

              const deckNode =
                button.closest(
                  ".brDjDuoSyncDeck"
                );

              const targetConfig =
                getDeckConfigById(
                  deckNode?.classList.contains(
                    "is-deck-2"
                  )
                    ? "d2"
                    : "d1"
                );

              if (!targetConfig) return;

              if (
                djSyncState
                  .syncedDeckIds
                  .has(
                    targetConfig.deckId
                  )
              ) {
                clearDeckSync(
                  targetConfig
                );

                return;
              }

              /*
                SYNC itself activates immediately.
                No track or Master is required.
              */
              djSyncState
                .syncedDeckIds
                .add(
                  targetConfig.deckId
                );

              updateDuoSyncUi();

              const state =
                getDeckStateForConfig(
                  targetConfig
                );

              /*
                If usable audio and a Master already
                exist, only the BPM transition waits.
              */
              if (state.isLoaded) {
                await applyDeckTempoSync(
                  targetConfig,
                  {
                    beatSync: true,
                    smooth: true,
                  }
                );
              }
            }
          );
        });
    };
		
    const getLinkedDuoDeckEntries = () => deckConfigs.map((config) => ({
      config,
      deck: getDeckForConfig(config),
      state: getDeckStateForConfig(config),
    }));

    const syncLinkedDuoTransportUi = () => {
      const entries = getLinkedDuoDeckEntries();

      const canUse = entries.every(({ state }) => Boolean(
        state.isLoaded &&
        !state.isLoading &&
        !state.error
      ));

      const anyPlaying = entries.some(({ state }) =>
        Boolean(state.isPlaying)
      );

      $$("[data-duo-linked-play]").forEach((button) => {
        button.disabled = !canUse;
        button.classList.toggle("is-playing", anyPlaying);

        syncDjPlayButtonIconState(button, anyPlaying);

        button.setAttribute(
          "aria-label",
          anyPlaying
            ? "Pause both decks together"
            : "Play both decks together"
        );
      });

      $$("[data-duo-linked-cue]").forEach((button) => {
        button.disabled = !canUse;
        button.classList.toggle("is-cue-ready", canUse);
        button.setAttribute(
          "aria-disabled",
          canUse ? "false" : "true"
        );
      });
    };

    const bindLinkedDuoTransportControls = () => {
      if (
        document.body.dataset.brDjLinkedTransportBound ===
        "true"
      ) {
        return;
      }

      document.body.dataset.brDjLinkedTransportBound =
        "true";

      $$("[data-duo-linked-play]").forEach((button) => {
        button.addEventListener("click", async () => {
          if (button.disabled) return;

          const entries = getLinkedDuoDeckEntries();

          const ready = entries.every(({ deck, state }) =>
            Boolean(
              deck &&
              state.isLoaded &&
              !state.isLoading &&
              !state.error
            )
          );

          if (!ready) return;

          /*
            If either deck is currently playing, the shared transport pauses
            both decks against one common AudioContext stop time.
          */
          if (entries.some(({ state }) => state.isPlaying)) {
            const result =
              audioApi.pauseDecksTogether?.();

            entries.forEach(({ config }) => {
              const state =
                result?.[config.deckId] ||
                getDeckStateForConfig(config);

              setDeckSkinState(config, state);
            });

            refreshDuoMasterDeck(null, {
              handoff: true,
            });

            updateDuoSyncUi();
            return;
          }

          const offsets = Object.fromEntries(
            entries.map(({ config, state }) => [
              config.deckId,
              Number.isFinite(Number(state.currentTime))
                ? Number(state.currentTime)
                : Number(state.cuePoint) || 0,
            ])
          );

          /*
            The engine schedules both AudioBufferSourceNodes against one
            absolute AudioContext clock time.
          */
          const result =
            await audioApi.playDecksTogether?.(offsets);

          entries.forEach(({ config }) => {
            const state =
              result?.[config.deckId] ||
              getDeckStateForConfig(config);

            setDeckSkinState(config, state);
          });
        });
      });

      const linkedCueHoldState = {
        active: false,
        pointerId: null,
        startPromise: null,
      };

      $$("[data-duo-linked-cue]").forEach((button) => {
        const stopLinkedCuePreview = async (event) => {
          button.classList.remove(
            "is-cue-active"
          );

          if (!linkedCueHoldState.active) return;

          if (
            event?.pointerId != null &&
            linkedCueHoldState.pointerId != null &&
            event.pointerId !== linkedCueHoldState.pointerId
          ) {
            return;
          }

          linkedCueHoldState.active = false;
          linkedCueHoldState.pointerId = null;

          await linkedCueHoldState.startPromise;
          linkedCueHoldState.startPromise = null;

          const entries = getLinkedDuoDeckEntries();
          const paused =
            audioApi.pauseDecksTogether?.();

          const returnedStates = await Promise.all(
            entries.map(async ({ deck, state }) => {
              const cuePoint =
                Number(state.cuePoint) || 0;

              return deck
                ? deck.seek(cuePoint)
                : state;
            })
          );

          entries.forEach(({ config }, index) => {
            setDeckSkinState(
              config,
              returnedStates[index] ||
                paused?.[config.deckId] ||
                getDeckStateForConfig(config)
            );
          });
        };

        button.addEventListener(
          "pointerdown",
          async (event) => {
            if (button.disabled) return;

            event.preventDefault();

            const entries =
              getLinkedDuoDeckEntries();

            const ready = entries.every(
              ({ deck, state }) =>
                Boolean(
                  deck &&
                  state.isLoaded &&
                  !state.isLoading &&
                  !state.error
                )
            );

            if (!ready) return;

            button.classList.add(
              "is-cue-active"
            );

            try {
              button.setPointerCapture?.(
                event.pointerId
              );
            } catch {}

            /*
              Pressing linked CUE while either deck plays stops both at one
              common clock time, then returns each deck to its own Cue.
            */
            if (
              entries.some(
                ({ state }) => state.isPlaying
              )
            ) {
              audioApi.pauseDecksTogether?.();

              const returnedStates =
                await Promise.all(
                  entries.map(({ deck, state }) =>
                    deck.seek(
                      Number(state.cuePoint) || 0
                    )
                  )
                );

              entries.forEach(
                ({ config }, index) => {
                  setDeckSkinState(
                    config,
                    returnedStates[index]
                  );
                }
              );

              refreshDuoMasterDeck(null, {
                handoff: true,
              });

              updateDuoSyncUi();
              return;
            }

            const allAtCue = entries.every(
              ({ state }) =>
                Math.abs(
                  (Number(state.currentTime) || 0) -
                    (Number(state.cuePoint) || 0)
                ) <= 0.04
            );

            /*
              When away from the Cue position, pressing linked CUE sets each
              deck's own Cue at its individual current/quantized position.
            */
            if (!allAtCue) {
              entries.forEach(
                ({ config, deck, state }) => {
                  const cuePoint =
                    getQuantizedCueTime(
                      config,
                      state,
                      Number(state.currentTime) || 0
                    );

                  setDeckSkinState(
                    config,
                    deck.setCuePoint(cuePoint)
                  );
                }
              );

              return;
            }

            /*
              Holding CUE while both decks sit at their Cues previews both
              against the same exact AudioContext start time.
            */
            linkedCueHoldState.active = true;
            linkedCueHoldState.pointerId =
              event.pointerId;

            const offsets = Object.fromEntries(
              entries.map(({ config, state }) => [
                config.deckId,
                Number(state.cuePoint) || 0,
              ])
            );

            linkedCueHoldState.startPromise =
              audioApi.playDecksTogether?.(
                offsets
              ) || Promise.resolve(null);

            const result =
              await linkedCueHoldState.startPromise;

            entries.forEach(({ config }) => {
              setDeckSkinState(
                config,
                result?.[config.deckId] ||
                  getDeckStateForConfig(config)
              );
            });
          }
        );

        button.addEventListener(
          "pointerup",
          stopLinkedCuePreview
        );

        button.addEventListener(
          "pointercancel",
          stopLinkedCuePreview
        );

        button.addEventListener(
          "lostpointercapture",
          stopLinkedCuePreview
        );

        button.addEventListener(
          "click",
          (event) => event.preventDefault()
        );
      });

      syncLinkedDuoTransportUi();
    };
		
    const getDeckCueMemoryMode = (page) => page?.classList?.contains("is-memory") ? "memory" : "hot";
    const getDeckCueMemorySlots = (config, mode = "hot") => {
      if (!config.cueMemory) config.cueMemory = createDeckCueMemoryState();
      return mode === "memory" ? config.cueMemory.memory : config.cueMemory.hot;
    };
    const getDeckCueMemorySelected = (config, mode = "hot") => mode === "memory" ? config.cueMemory?.selectedMemory || "" : config.cueMemory?.selectedHot || "";
    const setDeckCueMemorySelected = (config, mode = "hot", label = "") => {
      if (!config.cueMemory) config.cueMemory = createDeckCueMemoryState();
      if (mode === "memory") config.cueMemory.selectedMemory = label;
      else config.cueMemory.selectedHot = label;
    };

    const findNearestCueMemoryLabel = (slots = {}, currentTime = 0) => {
      let best = { label: "", distance: Infinity };
      DJ_CUE_MEMORY_LABELS.forEach((label) => {
        const point = slots[label];
        if (!point) return;
        const distance = Math.abs((Number(point.time) || 0) - currentTime);
        if (distance < best.distance) best = { label, distance };
      });
      return best.distance <= 0.12 ? best.label : "";
    };

    const syncDeckCueMemoryUi = (config, state = lastDeckStates.get(config.deckId) || blankDeckState()) => {
      const deckPanel = $(`.brDjPerfPanel[data-dj-perf-panel="${config.panel}"]`);
      if (!deckPanel) return;

      const currentTime = Math.max(0, Number(state.currentTime) || 0);
      deckPanel.querySelectorAll(".brDjCueMemoryPage").forEach((page) => {
        const mode = getDeckCueMemoryMode(page);
        const slots = getDeckCueMemorySlots(config, mode);
        const selected = getDeckCueMemorySelected(config, mode);
        const nearest = findNearestCueMemoryLabel(slots, currentTime);
        const deleteArmed = config.cueMemory?.deleteMode === mode;

        page.classList.toggle("is-delete-armed", deleteArmed);
        page.querySelectorAll(".brDjCueMemoryPadGrid").forEach((grid) => {
          const buttons = Array.from(grid.querySelectorAll("button:not(.is-delete)"));
          buttons.forEach((button, index) => {
            const label = DJ_CUE_MEMORY_LABELS[index] || button.textContent.trim();
            const point = slots[label];
            const active = Boolean(point);
            const selectedNow = active && (selected === label || nearest === label);
            button.textContent = label;
            button.dataset.cueMemoryLabel = label;
            button.classList.toggle("is-filled", active);
            button.classList.toggle("is-selected", selectedNow);
            button.setAttribute("aria-pressed", selectedNow ? "true" : "false");
            button.title = active
              ? `${mode === "memory" ? "Memory" : "Hot cue"} ${label} • ${formatDjCueMemoryTime(point.time)}`
              : `Set ${mode === "memory" ? "memory cue" : "hot cue"} ${label}`;
          });

          grid.querySelectorAll("button.is-delete").forEach((button) => {
            button.classList.toggle("is-active", deleteArmed);
            button.setAttribute("aria-pressed", deleteArmed ? "true" : "false");
            button.title = deleteArmed ? "Delete mode armed. Tap a cue pad to delete it." : "Arm cue delete mode";
          });
        });

        const listRows = page.querySelector(".brDjCueMemoryListRows");
        if (listRows) {
          listRows.replaceChildren();
          DJ_CUE_MEMORY_LABELS.forEach((label) => {
            const point = slots[label];
            const row = document.createElement("button");
            row.type = "button";
            row.dataset.cueMemoryLabel = label;
            row.classList.toggle("is-filled", Boolean(point));
            row.classList.toggle("is-selected", Boolean(point) && selected === label);

            const labelSpan = document.createElement("span");
            labelSpan.textContent = label;
            const time = document.createElement("strong");
            time.textContent = point ? formatDjCueMemoryTime(point.time) : "—";
            row.append(labelSpan, time);
            if (point) {
              const icon = document.createElement("i");
              icon.className = "fa-solid fa-location-dot";
              row.appendChild(icon);
            }
            listRows.appendChild(row);
          });
        }

        const headerTitle = page.querySelector(".brDjCueMemoryListPanel header strong");
        if (headerTitle) headerTitle.textContent = mode === "memory" ? "Memory List" : "Hot Cue List";
      });
    };

    const bindDeckCueMemoryControls = (config, getReadyDeck) => {
      const deckPanel = $(`.brDjPerfPanel[data-dj-perf-panel="${config.panel}"]`);
      if (!deckPanel) return;

      deckPanel.querySelectorAll(".brDjCueMemoryPage").forEach((page) => {
        if (page.dataset.brDjCueMemoryBound === config.deckId) return;
        page.dataset.brDjCueMemoryBound = config.deckId;
        const mode = getDeckCueMemoryMode(page);

        page.addEventListener("click", async (event) => {
          const deleteButton = event.target.closest(".brDjCueMemoryPadGrid button.is-delete");
          if (deleteButton) {
            config.cueMemory.deleteMode = config.cueMemory.deleteMode === mode ? "" : mode;
            syncDeckCueMemoryUi(config);
            return;
          }

          const padOrRow = event.target.closest(".brDjCueMemoryPadGrid button:not(.is-delete), .brDjCueMemoryListRows button");
          if (!padOrRow || !page.contains(padOrRow)) return;

          const label = padOrRow.dataset.cueMemoryLabel || padOrRow.textContent.trim();
          if (!DJ_CUE_MEMORY_LABELS.includes(label)) return;

          const activeDeck = getReadyDeck();
          if (!activeDeck) return;

          const slots = getDeckCueMemorySlots(config, mode);
          const state = activeDeck.getState();
          const currentTime = Math.max(0, Number(state.currentTime) || 0);
          const cueTime = getQuantizedCueTime(config, state, currentTime);

          if (config.cueMemory.deleteMode === mode) {
            if (slots[label]) delete slots[label];
            if (getDeckCueMemorySelected(config, mode) === label) setDeckCueMemorySelected(config, mode, "");
            config.cueMemory.deleteMode = "";
            syncDeckCueMemoryUi(config, state);
            renderDjRealWaveforms(config, state);
            return;
          }

          if (!slots[label]) {
            slots[label] = { time: cueTime, createdAt: Date.now() };
            setDeckCueMemorySelected(config, mode, label);
            syncDeckCueMemoryUi(config, state);
            renderDjRealWaveforms(config, state);
            return;
          }

          setDeckCueMemorySelected(config, mode, label);
          const nextState = await activeDeck.seek(slots[label].time);
          setDeckSkinState(config, nextState);
          syncDeckCueMemoryUi(config, nextState);
        });
      });

      syncDeckCueMemoryUi(config);
    };
		
    const openDeckLoopModeMenu = (config, anchor) => {
      if (!anchor) return;
      document.querySelectorAll(".brDjLoopValueMenu").forEach((menu) => menu.remove());

      const menu = document.createElement("div");
      menu.className = "brDjLoopValueMenu brDjLoopModeMenu";
      menu.dataset.loopMenu = "mode";

      const title = document.createElement("strong");
      title.textContent = "Loop Mode";
      menu.appendChild(title);

      [
        { value: "auto", label: "Auto Loop", note: "Tap number to start / clear" },
        { value: "manual", label: "Loop", note: "IN then CLOSE" },
      ].forEach((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.innerHTML = `<span>${item.label}</span><em>${item.note}</em>`;
        button.classList.toggle("is-active", (config.loopMode || "auto") === item.value);
        button.addEventListener("click", () => {
          config.loopMode = item.value;
          menu.remove();
          syncDeckLoopControls(config);
        });
        menu.appendChild(button);
      });

      document.body.appendChild(menu);
      const rect = anchor.getBoundingClientRect();
      menu.style.left = `${Math.max(10, Math.min(window.innerWidth - 230, rect.left))}px`;
      menu.style.top = `${Math.max(10, Math.min(window.innerHeight - 240, rect.bottom + 8))}px`;

      window.setTimeout(() => {
        const close = (event) => {
          if (!menu.contains(event.target) && event.target !== anchor) {
            menu.remove();
            document.removeEventListener("pointerdown", close, true);
          }
        };
        document.addEventListener("pointerdown", close, true);
      }, 0);
    };

    const openDeckLoopValueMenu = (config, anchor, mode = "loop") => {
      if (!anchor) return;
      document.querySelectorAll(".brDjLoopValueMenu").forEach((menu) => menu.remove());

      const menu = document.createElement("div");
      menu.className = "brDjLoopValueMenu";
      menu.dataset.loopMenu = mode;

      const title = document.createElement("strong");
      title.textContent = mode === "jump" ? "Beat Jump" : "Loop Size";
      menu.appendChild(title);

      const values = mode === "jump" ? DJ_BEAT_JUMP_VALUES : DJ_LOOP_SIZE_VALUES;
      values.forEach((value) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = formatDjLoopBeatValue(value, { withBeats: value >= 1 });
        button.classList.toggle("is-active", Math.abs(value - (mode === "jump" ? config.beatJumpBeats : config.loopSizeBeats)) < 0.000001);
        button.addEventListener("click", () => {
          if (mode === "jump") config.beatJumpBeats = value;
          else config.loopSizeBeats = value;
          menu.remove();
          syncDeckLoopControls(config);
        });
        menu.appendChild(button);
      });

      document.body.appendChild(menu);
      const rect = anchor.getBoundingClientRect();
      menu.style.left = `${Math.max(10, Math.min(window.innerWidth - 220, rect.left))}px`;
      menu.style.top = `${Math.max(10, Math.min(window.innerHeight - 360, rect.bottom + 8))}px`;

      window.setTimeout(() => {
        const close = (event) => {
          if (!menu.contains(event.target) && event.target !== anchor) {
            menu.remove();
            document.removeEventListener("pointerdown", close, true);
          }
        };
        document.addEventListener("pointerdown", close, true);
      }, 0);
    };
		
    const getDeckLoopMode = (config) => config.loopMode === "manual" ? "manual" : "auto";

    const setDeckLoopSizeFromDuration = (config, state = blankDeckState()) => {
      const beatSeconds = getDeckBeatSeconds(config, state);
      const loop = state.loop || {};
      if (!beatSeconds || !loop.active || !(loop.duration > 0)) return config.loopSizeBeats || DJ_LOOP_DEFAULT_BEATS;
      config.loopSizeBeats = findClosestDjLoopSizeValue(loop.duration / beatSeconds);
      return config.loopSizeBeats;
    };

    const restartDeckLoopWithCurrentSize = async (config, activeDeck) => {
      if (!activeDeck) return null;
      const state = activeDeck.getState();
      const loop = state.loop || {};
      const bpm = getGridBpm(config, state);
      if (!loop.active || !bpm) return null;
      const start = Number.isFinite(Number(loop.start)) ? Number(loop.start) : snapTimeToDeckGrid(config, state, state.currentTime || 0, "floor");
      return activeDeck.setAutoLoopBeats(config.loopSizeBeats || DJ_LOOP_DEFAULT_BEATS, bpm, start);
    };

    const runDeckAutoLoopAction = async (config, activeDeck) => {
      if (!activeDeck) return null;
      const state = activeDeck.getState();
      const loop = state.loop || {};
      if (loop.active || loop.manualStart != null) return activeDeck.clearLoop();
      const bpm = getGridBpm(config, state);
      if (!bpm) return null;
      const start = snapTimeToDeckGrid(config, state, state.currentTime || 0, "floor");
      return activeDeck.setAutoLoopBeats(config.loopSizeBeats || DJ_LOOP_DEFAULT_BEATS, bpm, start);
    };

    const runDeckManualLoopAction = async (config, activeDeck) => {
      if (!activeDeck) return null;
      const state = activeDeck.getState();
      const loop = state.loop || {};
      const bpm = getGridBpm(config, state);
      if (!bpm) return null;
      if (loop.active) return activeDeck.clearLoop();
      const snapped = snapTimeToDeckGrid(config, state, state.currentTime || 0, loop.manualStart == null ? "nearest" : "nearest");
      const nextState = await activeDeck.setManualLoopPoint(snapped);
      if (nextState?.loop?.active) setDeckLoopSizeFromDuration(config, nextState);
      return nextState;
    };

    const syncDeckLoopControls = (config, state = lastDeckStates.get(config.deckId) || blankDeckState()) => {
      const deckPanel = $(`.brDjPerfPanel[data-dj-perf-panel="${config.panel}"]`);
      if (!deckPanel) return;

      const loop = state.loop || {};
      const loopActive = Boolean(loop.active);
      const manualPending = loop.manualStart != null;
      const canLoop = Boolean(getGridBpm(config, state));

      deckPanel.querySelectorAll(".brDjSingleLoopControls").forEach((controls) => {
        const buttons = Array.from(controls.querySelectorAll("button"));
        const beatJumpButton = buttons[0];
        const loopModeButton = buttons[1];
        const loopActionButton = buttons[5];
        const loopMode = getDeckLoopMode(config);

        controls.dataset.loopMode = loopMode;
        controls.classList.toggle("is-loop-active", loopActive);
        controls.classList.toggle("is-manual-loop-pending", manualPending);
        controls.classList.toggle("is-grid-missing", !canLoop);

        if (beatJumpButton) {
          const label = beatJumpButton.querySelector("span") || beatJumpButton;
          label.textContent = formatDjLoopBeatValue(config.beatJumpBeats || 8, { withBeats: true });
          beatJumpButton.title = "Open beat-jump size menu";
        }

        if (loopModeButton) {
          const label = loopModeButton.querySelector("span") || loopModeButton;
          label.textContent = loopMode === "manual" ? "Loop" : "Auto Loop";
          loopModeButton.classList.toggle("is-loop-active", loopActive);
          loopModeButton.disabled = false;
          loopModeButton.title = "Switch between Auto Loop and Loop In/Out mode";
        }

        if (loopActionButton) {
          const label = loopActionButton.querySelector("span") || loopActionButton;
          const loopSizeLabel = formatDjLoopBeatValue(config.loopSizeBeats || DJ_LOOP_DEFAULT_BEATS);
          label.textContent = loopMode === "manual"
            ? loopActive
              ? loopSizeLabel
              : manualPending
                ? "Close"
                : "IN"
            : loopActive
              ? loopSizeLabel
              : loopSizeLabel;
          loopActionButton.classList.toggle("is-loop-active", loopActive);
          loopActionButton.classList.toggle("is-manual-loop-pending", manualPending);
          loopActionButton.disabled = !canLoop && !loopActive;
          loopActionButton.title = loopMode === "manual"
            ? loopActive
              ? "Clear manual loop"
              : manualPending
                ? "Close loop at this beat"
                : "Set loop in point"
            : loopActive
              ? "Clear active auto loop"
              : `Start ${loopSizeLabel} auto loop`;
        }
      });
    };

    const bindDeckLoopControls = (config, getReadyDeck) => {
      const deckPanel = $(`.brDjPerfPanel[data-dj-perf-panel="${config.panel}"]`);
      if (!deckPanel) return;

      deckPanel.querySelectorAll(".brDjSingleLoopControls").forEach((controls) => {
        if (controls.dataset.brDjLoopBound === config.deckId) return;
        controls.dataset.brDjLoopBound = config.deckId;

        const buttons = Array.from(controls.querySelectorAll("button"));
        const beatJumpButton = buttons[0];
        const loopModeButton = buttons[1];
        const jumpLeftButton = buttons[2];
        const jumpRightButton = buttons[3];
        const sizeDownButton = buttons[4];
        const loopActionButton = buttons[5];
        const sizeUpButton = buttons[6];

        beatJumpButton?.addEventListener("click", () => openDeckLoopValueMenu(config, beatJumpButton, "jump"));
        loopModeButton?.addEventListener("click", () => openDeckLoopModeMenu(config, loopModeButton));

        jumpLeftButton?.addEventListener("click", async () => {
          const activeDeck = getReadyDeck();
          if (!activeDeck) return;
          const state = activeDeck.getState();
          const beatSeconds = getDeckBeatSeconds(config, state);
          if (!beatSeconds) return;
          const jumpSeconds = (config.beatJumpBeats || 8) * beatSeconds;
          setDeckSkinState(config, await activeDeck.seek(Math.max(0, (state.currentTime || 0) - jumpSeconds)));
        });

        jumpRightButton?.addEventListener("click", async () => {
          const activeDeck = getReadyDeck();
          if (!activeDeck) return;
          const state = activeDeck.getState();
          const beatSeconds = getDeckBeatSeconds(config, state);
          if (!beatSeconds) return;
          const jumpSeconds = (config.beatJumpBeats || 8) * beatSeconds;
          setDeckSkinState(config, await activeDeck.seek((state.currentTime || 0) + jumpSeconds));
        });

        sizeDownButton?.addEventListener("click", async () => {
          config.loopSizeBeats = shiftDjLoopBeatValue(config.loopSizeBeats || DJ_LOOP_DEFAULT_BEATS, -1);
          const nextState = await restartDeckLoopWithCurrentSize(config, getReadyDeck());
          if (nextState) setDeckSkinState(config, nextState);
          else syncDeckLoopControls(config);
        });

        sizeUpButton?.addEventListener("click", async () => {
          config.loopSizeBeats = shiftDjLoopBeatValue(config.loopSizeBeats || DJ_LOOP_DEFAULT_BEATS, 1);
          const nextState = await restartDeckLoopWithCurrentSize(config, getReadyDeck());
          if (nextState) setDeckSkinState(config, nextState);
          else syncDeckLoopControls(config);
        });

        loopActionButton?.addEventListener("click", async () => {
          const activeDeck = getReadyDeck();
          if (!activeDeck) return;
          const nextState = getDeckLoopMode(config) === "manual"
            ? await runDeckManualLoopAction(config, activeDeck)
            : await runDeckAutoLoopAction(config, activeDeck);
          if (nextState) setDeckSkinState(config, nextState);
          else syncDeckLoopControls(config);
        });

        syncDeckLoopControls(config);
      });
    };

    const getDeckBinding = (deckId) => {
      if (deckBindings.has(deckId)) return deckBindings.get(deckId);
      const deck = audioApi.getDeck(deckId);
      const binding = { deck };
      deckBindings.set(deckId, binding);
      return binding;
    };

    const setDeckSkinState = (config, state = blankDeckState()) => {
      const title = state.trackTitle || state.fileName || "No track loaded";
      const artist = state.error
        ? state.error
        : state.trackArtist || (state.isLoaded ? "Local audio file" : "Unknown artist");
      const status = state.error
        ? "Error"
        : state.isLoading
          ? "Loading"
          : state.isPlaying
            ? "Playing"
            : state.isLoaded
              ? "Ready"
              : "Stopped";
      const canUse = Boolean(state.isLoaded && !state.isLoading && !state.error);
      const currentTime = Math.max(0, Number(state.currentTime) || 0);
      const duration = Math.max(0, Number(state.duration) || 0);
      const cuePoint = Math.max(0, Number(state.cuePoint) || 0);
      const progress = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
      const currentLabel = formatDjEngineTime(currentTime, { showTenths: true });
      const remainingLabel = formatDjEngineRemaining(currentTime, duration);

      const deckPanel = $(`.brDjPerfPanel[data-dj-perf-panel="${config.panel}"]`);
      const trackTitle = deckPanel?.querySelector(".brDjSingleTrackCard h1");
      const trackArtist = deckPanel?.querySelector(".brDjSingleTrackText span");
      const duoTitle = $(`.brDjDuoDeckCard.${config.cardClass} strong`);
      const duoMeta = $(`.brDjDuoDeckCard.${config.cardClass} .brDjDuoDeckCardMeta`);
      const duoStatus = $(`.brDjDuoDeckCard.${config.cardClass} > em`);
      const duoWaveTime = $(`.brDjDuoHorizontalWave.${config.cardClass} header em`);
      const vinylPanel = $(`.brDjVinylDeckView[data-vinyl-deck="${config.vinylDeck}"]`);
      const vinylArtwork = resolveDjDeckArtworkSource(state);

      if (vinylPanel) {
        vinylPanel.classList.toggle("is-loaded", canUse);
        vinylPanel.classList.toggle("is-playing", Boolean(state.isPlaying && canUse));
        vinylPanel.dataset.djDeckLoaded = canUse ? "true" : "false";
        vinylPanel.querySelectorAll(".brDjVinylArtwork").forEach((image) => {
          image.src = vinylArtwork;
          image.alt = title ? `${title} artwork` : "Deck artwork";
        });
      }

      if (deckPanel) {
        deckPanel.style.setProperty("--br-dj-transport-progress", progress.toFixed(4));
        deckPanel.dataset.djCuePoint = cuePoint.toFixed(3);
      }

      if (trackTitle) trackTitle.textContent = title;
      if (trackArtist) trackArtist.textContent = artist;
      setDuoDeckCardMarqueeText(
        duoTitle,
        title,
        18
      );

      setDuoDeckCardMarqueeText(
        duoMeta,
        artist,
        22
      );
      if (duoStatus) duoStatus.textContent = status;
      if (duoWaveTime) duoWaveTime.textContent = duration ? remainingLabel : currentLabel;
      $$(`.brDjDuoSyncDeck.${config.cardClass} .brDjDuoBpmPopup strong`).forEach((label) => {
        const bpm = getGridBpm(config, state);
        label.textContent = bpm ? bpm.toFixed(2) : "--.--";
      });

      deckPanel?.querySelectorAll(".brDjSingleWavePills, .brDjCueMemoryPills").forEach((pills) => {
        const spans = pills.querySelectorAll("span");
        const bars = pills.querySelector("strong");
        if (spans[0]) spans[0].textContent = remainingLabel;
        if (bars) bars.textContent = formatDeckGridCounter(config, state);
        if (spans[1]) spans[1].textContent = currentLabel;
      });

      lastDeckStates.set(config.deckId, state);
      refreshDuoMasterDeck(config);
      updateAllMasterClockDisplayGrids();
      syncDeckBeatGridUi(config, state);
      syncDeckLoopControls(config, state);
      syncDeckCueMemoryUi(config, state);
      updateDuoSyncUi();
      syncLinkedDuoTransportUi();
      renderDjRealWaveforms(
        config,
        state
      );

      /*
        Redraw the other DUO half on the same
        time scale, but with that deck's own
        stationary or moving track/grid state.
      */
      deckConfigs
        .filter(
          (otherConfig) =>
            otherConfig.deckId !==
            config.deckId
        )
        .forEach((otherConfig) => {
          renderDjRealWaveforms(
            otherConfig,
            getDeckStateForConfig(
              otherConfig
            ),
            {
              duoOnly: true,
            }
          );
        });

      [
        ...$$(`.brDjPerfPanel[data-dj-perf-panel="${config.panel}"] .brDjSinglePlayBtn`),
        ...$$(`.brDjDuoDeckTransportPanel.${config.cardClass} .brDjDuoPadPlay`),
        ...$$(`.brDjVinylDeckView[data-vinyl-deck="${config.vinylDeck}"] .brDjVinylTransport .is-play`),
      ].forEach((button) => {
        button.disabled = !canUse;
        button.classList.toggle("is-playing", Boolean(state.isPlaying));
        syncDjPlayButtonIconState(button, Boolean(state.isPlaying));

        const playText = state.isPlaying ? "Pause" : "Play";
        const label = button.querySelector(".brDjSinglePlayLabel, .brDjPlayStateLabel");
        if (label) label.textContent = playText;
        button.setAttribute("aria-label", `${playText} ${config.deckId === "d2" ? "Deck 2" : "Deck 1"}`);
      });

      $$(`.brDjVinylDeckView[data-vinyl-deck="${config.vinylDeck}"] .brDjVinylTransport button:not(.is-play)`).forEach((button) => {
        button.disabled = !canUse;
        button.classList.toggle("is-cue-ready", canUse);
        button.setAttribute("aria-disabled", canUse ? "false" : "true");
      });
    };
		
    const refreshDeckWaveformCanvases = () => {
      deckConfigs.forEach((config) => {
        renderDjRealWaveforms(config, lastDeckStates.get(config.deckId) || blankDeckState());
      });
    };

    const scheduleDeckWaveformRefresh = () => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(refreshDeckWaveformCanvases);
      });
    };
		
    const syncDeckZoomDocks = (config) => {
      $$(`.brDjPerfPanel[data-dj-perf-panel="${config.panel}"] .brDjSingleZoomDock`).forEach((dock) => {
        dock.dataset.zoom = `${config.waveformZoom || DJ_WAVEFORM_DEFAULT_ZOOM}x`;
        dock.title = `Waveform zoom: ${config.waveformZoom || DJ_WAVEFORM_DEFAULT_ZOOM}x`;
      });
    };

    const setDeckWaveformZoom = (config, nextZoom) => {
      const currentIndex = DJ_WAVEFORM_ZOOM_LEVELS.indexOf(config.waveformZoom || DJ_WAVEFORM_DEFAULT_ZOOM);
      const fallbackIndex = DJ_WAVEFORM_ZOOM_LEVELS.indexOf(DJ_WAVEFORM_DEFAULT_ZOOM);
      const safeIndex = currentIndex >= 0 ? currentIndex : fallbackIndex;
      const nextIndex = typeof nextZoom === "number"
        ? DJ_WAVEFORM_ZOOM_LEVELS.indexOf(nextZoom)
        : safeIndex;

      config.waveformZoom = DJ_WAVEFORM_ZOOM_LEVELS[
        Math.max(0, Math.min(DJ_WAVEFORM_ZOOM_LEVELS.length - 1, nextIndex >= 0 ? nextIndex : safeIndex))
      ];

      syncDeckZoomDocks(config);
      renderDjRealWaveforms(config, lastDeckStates.get(config.deckId) || blankDeckState());
    };

    const bindDeckWaveformZoomControls = (config) => {
      $$(`.brDjPerfPanel[data-dj-perf-panel="${config.panel}"] .brDjSingleZoomDock`).forEach((dock) => {
        if (dock.dataset.brDjZoomBound === config.deckId) return;
        dock.dataset.brDjZoomBound = config.deckId;

        const buttons = $$("button", dock);
        buttons.forEach((button) => {
          button.addEventListener("click", () => {
            const currentZoom = config.waveformZoom || DJ_WAVEFORM_DEFAULT_ZOOM;
            const currentIndex = Math.max(0, DJ_WAVEFORM_ZOOM_LEVELS.indexOf(currentZoom));
            const label = button.getAttribute("aria-label") || "";

            if (/reset/i.test(label)) {
              setDeckWaveformZoom(config, DJ_WAVEFORM_DEFAULT_ZOOM);
              return;
            }

            if (/in/i.test(label)) {
              setDeckWaveformZoom(config, DJ_WAVEFORM_ZOOM_LEVELS[Math.min(DJ_WAVEFORM_ZOOM_LEVELS.length - 1, currentIndex + 1)]);
              return;
            }

            if (/out/i.test(label)) {
              setDeckWaveformZoom(config, DJ_WAVEFORM_ZOOM_LEVELS[Math.max(0, currentIndex - 1)]);
            }
          });
        });

        syncDeckZoomDocks(config);
      });
    };

    const syncDeckPaletteButtons = (config) => {
      const palette = DJ_WAVEFORM_PALETTES.find((item) => item.id === config.waveformPalette) || DJ_WAVEFORM_PALETTES[0];

      $$(`.brDjPerfPanel[data-dj-perf-panel="${config.panel}"] .brDjGridPalette`).forEach((button) => {
        button.dataset.waveformPalette = palette.id;
        button.title = `${palette.label}. Tap for next waveform colour style.`;
        button.setAttribute("aria-label", `${palette.label}. Tap for next waveform colour style.`);
      });
    };

    const bindDeckWaveformPaletteControls = (config) => {
      $$(`.brDjPerfPanel[data-dj-perf-panel="${config.panel}"] .brDjGridPalette`).forEach((button) => {
        if (button.dataset.brDjPaletteBound === config.deckId) return;
        button.dataset.brDjPaletteBound = config.deckId;

        button.addEventListener("click", () => {
          const currentIndex = Math.max(0, DJ_WAVEFORM_PALETTES.findIndex((item) => item.id === config.waveformPalette));
          const nextPalette = DJ_WAVEFORM_PALETTES[(currentIndex + 1) % DJ_WAVEFORM_PALETTES.length];

          config.waveformPalette = nextPalette.id;
          syncDeckPaletteButtons(config);
          renderDjRealWaveforms(config, lastDeckStates.get(config.deckId) || blankDeckState());
        });

        syncDeckPaletteButtons(config);
      });
    };
		
    const resetDeckPrepState = (config) => {
      config.cueMemory =
        createDeckCueMemoryState();

      config.beatGrid =
        createDeckBeatGrid();

      config.loopSizeBeats =
        DJ_LOOP_DEFAULT_BEATS;

      config.beatJumpBeats = 8;
      config.loopMode = "auto";

      /*
        Persistent SYNC mode survives loading
        another track onto this deck.
      */
      delete djSyncState.syncSources[
        config.deckId
      ];

      resetSyncCorrectionState(
        config.deckId
      );

      config.mixBeatGrid = null;
      config.duoVisibleSourceSeconds = null;
      config.loadedLibraryItemId = "";

      /*
        Keep the selected/pending Master and live
        mix BPM while replacing a track. The newly
        loaded track inherits the stored target.
      */
    };

    const applyLibraryPrepToDeckConfig = (
      config,
      item = {},
      state = blankDeckState()
    ) => {
      const savedBpm =
        getSafeGridBpmValue(
          item.djGridBpm
        );

      const metadataBpm =
        getSafeGridBpmValue(
          item.bpm
        );

      const savedDownbeat =
        Number(
          item.djGridDownbeat
        );

      config.loadedLibraryItemId =
        String(
          item.id ||
          item.trackId ||
          item.libraryId ||
          ""
        ).trim();

      config.beatGrid = gridApi.create(
        {
          version:
            Number(
              item.djGridVersion
            ) || 1,

          analysisMode:
            item.djGridAnalysisMode ||
            "auto",

          resolvedMode:
            item.djGridResolvedMode ||
            (
              Array.isArray(
                item.djGridSegments
              ) &&
              item.djGridSegments.length > 1
                ? "dynamic"
                : "normal"
            ),

          bpm:
            savedBpm ||
            metadataBpm ||
            null,

          rawBpm:
            getSafeGridBpmValue(
              item.djGridRawBpm
            ) ||
            savedBpm ||
            metadataBpm ||
            null,

          downbeat:
            Number.isFinite(
              savedDownbeat
            )
              ? Math.max(
                  -DJ_GRID_PRE_ROLL_SECONDS,
                  savedDownbeat
                )
              : 0,

          segments:
            Array.isArray(
              item.djGridSegments
            )
              ? item.djGridSegments.map(
                  (segment) => ({
                    ...segment,
                  })
                )
              : [],

          editRange:
            item.djGridEditRange ||
            "whole",

          adjustmentMs:
            Number(
              item.djGridAdjustmentMs
            ) === 3
              ? 3
              : 1,

          reviewRequired:
            Boolean(
              item.djGridReviewRequired
            ),

          baseSet:
            Boolean(
              item.djGridBaseSet
            ),

          locked:
            Boolean(
              item.djGridLocked
            ),

          userBpm:
            Boolean(savedBpm),

          userDownbeat:
            Boolean(
              item.djGridBaseSet
            ),

          source:
            String(
              item.djGridSource ||
              (
                savedBpm
                  ? "saved"
                  : metadataBpm
                    ? "tag"
                    : ""
              )
            ),
        },
        {
          duration:
            Math.max(
              0,
              Number(
                state.duration
              ) || 0
            ),

          minBpm:
            DJ_GRID_MIN_BPM,

          maxBpm:
            DJ_GRID_MAX_BPM,

          preRollSeconds:
            DJ_GRID_PRE_ROLL_SECONDS,
        }
      );

      normaliseDeckBeatGrid(
        config,
        state
      );
    };

    const loadFileIntoDeck = async (
      config,
      file,
      loadingName =
        file?.name ||
        "Loading audio",
      options = {}
    ) => {
      if (!file) {
        return null;
      }

      const { deck } =
        getDeckBinding(
          config.deckId
        );

      resetDeckPrepState(config);

      setDeckSkinState(config, {
        ...deck.getState(),
        fileName: loadingName,
        isLoading: true,
        isLoaded: false,
        isPlaying: false,
        error: "",
      });

      const nextState =
        await deck.loadFile(
          file,
          options
        );

      if (options.libraryItem) {
        applyLibraryPrepToDeckConfig(
          config,
          options.libraryItem,
          nextState
        );
      }

      setDeckSkinState(
        config,
        nextState
      );

      updateDuoSyncUi();

      const isMaster =
        djSyncState.masterDeckId ===
        config.deckId;

      const isSynced =
        djSyncState.syncedDeckIds.has(
          config.deckId
        );

      const pendingLiveBpm =
        isMaster || isSynced
          ? getLiveMixBpmTarget()
          : null;

      /*
        Apply the pending live BPM before playback.
        The track therefore starts at the selected
        speed rather than changing after Play.
      */
      if (pendingLiveBpm) {
        const gridBpm = getGridBpm(
          config,
          nextState
        );

        if (gridBpm) {
          const targetRate = Math.max(
            0.5,
            Math.min(
              2,
              pendingLiveBpm / gridBpm
            )
          );

          const preparedState =
            setDeckSyncPlaybackRate(
              config,
              targetRate,
              getDeckStateForConfig(
                config
              )
            );

          setDeckSkinState(
            config,
            preparedState
          );
        }
      }

      /*
        If the other loaded deck is the pending or
        active Master, prepare this follower now.
        Beat phase is aligned when playback begins.
      */
      if (isSynced) {
        const masterConfig =
          pickSyncMasterConfig(config);

        if (
          masterConfig &&
          masterConfig.deckId !==
            config.deckId
        ) {
          return await applyDeckTempoSync(
            config,
            {
              beatSync: false,
              smooth: false,
            }
          );
        }
      }

      return getDeckStateForConfig(
        config
      );
    };

    deckConfigs.forEach((config) => {
      const fileInput = $(`[data-dj-engine-file="${config.deckId}"]`);
      if (!fileInput) return;

      fileInput.addEventListener("change", async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
          await loadFileIntoDeck(config, file, file.name || "Loading audio");
        } catch (error) {
          setDeckSkinState(config, {
            fileName: file.name || "Audio load failed",
            isLoaded: false,
            isLoading: false,
            isPlaying: false,
            error: error?.message || "Audio engine failed",
          });
        } finally {
          fileInput.value = "";
        }
      });

      const getReadyDeck = () => {
        const binding = deckBindings.get(config.deckId);
        if (!binding) return null;

        const state = binding.deck.getState();
        if (!state.isLoaded || state.isLoading || state.error) return null;
        return binding.deck;
      };
			
      bindDeckWaveformZoomControls(config);
      bindDeckWaveformPaletteControls(config);
      bindDeckLoopControls(config, getReadyDeck);
      bindDeckCueMemoryControls(config, getReadyDeck);
      bindDuoSyncControls();
      bindLinkedDuoTransportControls();

      const seekWaveforms = [
        ...$$(`.brDjPerfPanel[data-dj-perf-panel="${config.panel}"] .brDjSingleOverviewWave`),
        ...$$(`.brDjPerfPanel[data-dj-perf-panel="${config.panel}"] .brDjSingleWaveCanvas`),
        ...$$(`.brDjPerfPanel[data-dj-perf-panel="${config.panel}"] .brDjCueMemoryOverview`),
        ...$$(`.brDjPerfPanel[data-dj-perf-panel="${config.panel}"] .brDjCueMemoryWaveform`),
        ...$$(`.brDjDuoHorizontalWave.${config.cardClass} .brDjDuoWaveBody`),
        ...$$(`.brDjDuoDeckCard.${config.cardClass} .brDjDuoDeckCardWave`),
      ];
      const waveformSeekState = {
        active: false,
        pointerId: null,
        lastSeekAt: 0,
        startX: 0,
        startTime: 0,
        moved: false,
      };

      const getWaveformPointerSeekTime = (event, target, state) => {
        const duration = Math.max(0, Number(state.duration) || 0);
        const rect = target.getBoundingClientRect();
        const pointerRatio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
        const currentProgress = duration > 0 ? Math.max(0, Math.min(1, Number(state.progress) || 0)) : 0;
        const waveformZoom = getDjDetailWaveformZoom(target);
        const seekRatio = target.classList.contains("is-fixed-centre-waveform")
          ? currentProgress + ((pointerRatio - 0.5) / waveformZoom)
          : pointerRatio;
        return target.classList?.contains?.("is-fixed-centre-waveform")
          ? Math.max(-DJ_GRID_PRE_ROLL_SECONDS, Math.min(duration, seekRatio * duration))
          : Math.max(0, Math.min(duration, seekRatio * duration));
      };

      const seekDeckFromWaveformPointer = async (event, target, force = false) => {
        const activeDeck = getReadyDeck();
        if (!activeDeck) return;

        const state = activeDeck.getState();
        const duration = Math.max(0, Number(state.duration) || 0);
        if (!duration) return;

        const now = window.performance?.now?.() || Date.now();
        if (!force && now - waveformSeekState.lastSeekAt < 60) return;
        waveformSeekState.lastSeekAt = now;

        let seekTo = getWaveformPointerSeekTime(event, target, state);

        if (target.classList.contains("is-fixed-centre-waveform") && waveformSeekState.active) {
          const rect = target.getBoundingClientRect();
          const waveformZoom = getDjDetailWaveformZoom(target);
          const deltaX = event.clientX - waveformSeekState.startX;
          const deadZone = Math.max(3, rect.width * 0.008);

          if (Math.abs(deltaX) > deadZone) waveformSeekState.moved = true;
          if (waveformSeekState.moved) {
            const visibleSeconds = duration / Math.max(1, waveformZoom);
            seekTo = waveformSeekState.startTime - ((deltaX / Math.max(1, rect.width)) * visibleSeconds);
            seekTo = Math.max(-DJ_GRID_PRE_ROLL_SECONDS, Math.min(duration, seekTo));
          }
        }

        event.preventDefault();
        setDeckSkinState(config, await activeDeck.seek(seekTo));
      };

      seekWaveforms.forEach((target) => {
        if (target.dataset.brDjWaveSeekBound === config.deckId) return;
        target.dataset.brDjWaveSeekBound = config.deckId;
        target.classList.add("is-waveform-seekable");

        target.addEventListener("pointerdown", async (event) => {
          waveformSeekState.active = true;
          waveformSeekState.pointerId = event.pointerId;
          waveformSeekState.startX = event.clientX;
          waveformSeekState.moved = false;

          const activeDeck = getReadyDeck();
          waveformSeekState.startTime = activeDeck?.getState?.().currentTime || 0;

          try {
            target.setPointerCapture?.(event.pointerId);
          } catch {}

          if (!target.classList.contains("is-fixed-centre-waveform")) {
            await seekDeckFromWaveformPointer(event, target, true);
          }
        });

        target.addEventListener("pointermove", async (event) => {
          if (!waveformSeekState.active || event.pointerId !== waveformSeekState.pointerId) return;
          await seekDeckFromWaveformPointer(event, target);
        });

        const endWaveformSeek = async (event) => {
          if (!waveformSeekState.active || event.pointerId !== waveformSeekState.pointerId) return;
          await seekDeckFromWaveformPointer(event, target, true);
          waveformSeekState.active = false;
          waveformSeekState.pointerId = null;
        };

        target.addEventListener("pointerup", endWaveformSeek);
        target.addEventListener("pointercancel", () => {
          waveformSeekState.active = false;
          waveformSeekState.pointerId = null;
        });
        target.addEventListener("lostpointercapture", () => {
          waveformSeekState.active = false;
          waveformSeekState.pointerId = null;
        });
      });

      [
        ...$$(`.brDjPerfPanel[data-dj-perf-panel="${config.panel}"] .brDjSinglePlayBtn`),
        ...$$(`.brDjDuoDeckTransportPanel.${config.cardClass} .brDjDuoPadPlay`),
        ...$$(`.brDjVinylDeckView[data-vinyl-deck="${config.vinylDeck}"] .brDjVinylTransport .is-play`),
      ].forEach((button) => {
        button.addEventListener("click", async () => {
          if (button.disabled) return;

          try {
            const activeDeck = getReadyDeck();
            if (!activeDeck) return;

            const state =
              activeDeck.getState();

            /*
              Capture the parked transport position
              before Sync preparation touches BPM or
              Master state.
            */
            const resumeOffset =
              Number.isFinite(
                Number(state.currentTime)
              )
                ? Number(
                    state.currentTime
                  )
                : 0;

            if (state.isPlaying) {
              const pausedState = activeDeck.pause();
              setDeckSkinState(config, pausedState);
              refreshDuoMasterDeck(null, { handoff: true });
              updateDuoSyncUi();
              return;
            }

            refreshDuoMasterDeck(config);
            if (djSyncState.syncedDeckIds.has(config.deckId)) {
              await applyDeckTempoSync(config, { beatSync: false });

              const syncedLaunchState =
                activeDeck.getState();

              const launchPlan =
                getSyncedLaunchPlan(
                  config,
                  syncedLaunchState,
                  {
                    anchorOffset:
                      resumeOffset,
                  }
                );

              const nextState = await activeDeck.play(launchPlan.offset, {
              });
              setDeckSkinState(config, nextState);
              return;
            }

            setDeckSkinState(config, await activeDeck.play());
          } catch (error) {
            const binding = deckBindings.get(config.deckId);
            setDeckSkinState(config, {
              ...(binding ? binding.deck.getState() : blankDeckState()),
              isPlaying: false,
              error: error?.message || "Audio play failed",
            });
          }
        });
      });

      $$(
        `.brDjPerfPanel[data-dj-perf-panel="${config.panel}"] .brDjGridACue`
      ).forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            const activeDeck =
              getReadyDeck();

            if (!activeDeck) return;

            const state =
              activeDeck.getState();

            const nextState =
              activeDeck.setCuePoint(
                state.currentTime
              );

            applyDeckBeatGridUpdate(
              config,
              {
                downbeat:
                  state.currentTime,

                baseSet: true,

                source:
                  "set-first-beat",
              },
              nextState
            );

            setDeckSkinState(
              config,
              nextState
            );
          }
        );
      });

      $$(
        `.brDjPerfPanel[data-dj-perf-panel="${config.panel}"] .brDjGridBpmBox`
      ).forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            const activeDeck =
              getReadyDeck();

            const state =
              activeDeck?.getState?.() ||
              lastDeckStates.get(
                config.deckId
              ) ||
              blankDeckState();

            const grid =
              normaliseDeckBeatGrid(
                config,
                state
              );

            if (grid.locked) return;

            const nextValue =
              window.prompt?.(
                grid.editRange ===
                "from-here"
                  ? "Grid BPM from current position"
                  : "Grid BPM for whole track",

                grid.bpm
                  ? grid.bpm.toFixed(3)
                  : ""
              );

            if (nextValue == null) {
              return;
            }

            applyDeckBeatGridUpdate(
              config,
              {
                bpm:
                  Number(nextValue),

                source:
                  grid.editRange ===
                  "from-here"
                    ? "manual-from-here"
                    : "manual-bpm",
              },
              state
            );
          }
        );
      });

      $$(
        `.brDjPerfPanel[data-dj-perf-panel="${config.panel}"] .brDjGridMini`
      ).forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            const activeDeck =
              getReadyDeck();

            const state =
              activeDeck?.getState?.() ||
              lastDeckStates.get(
                config.deckId
              ) ||
              blankDeckState();

            const grid =
              normaliseDeckBeatGrid(
                config,
                state
              );

            const label =
              button.getAttribute(
                "aria-label"
              ) || "";

            if (grid.locked) return;

            if (
              !grid.bpm &&
              !/Double BPM|Halve BPM/i.test(
                label
              )
            ) {
              return;
            }

            const currentTime =
              Number(
                state.currentTime
              ) || grid.downbeat;

            const options = {
              duration:
                Math.max(
                  0,

                  Number(
                    state.duration
                  ) || 0
                ),

              minBpm:
                DJ_GRID_MIN_BPM,

              maxBpm:
                DJ_GRID_MAX_BPM,

              preRollSeconds:
                DJ_GRID_PRE_ROLL_SECONDS,

              range:
                grid.editRange,
            };

            if (
              /Double BPM/i.test(
                label
              )
            ) {
              applyDeckBeatGridUpdate(
                config,
                {
                  bpm:
                    (
                      grid.bpm ||
                      getDeckAnalysedBpm(
                        state
                      ) ||
                      0
                    ) * 2,

                  source: "x2",
                },
                state
              );

              return;
            }

            if (
              /Halve BPM/i.test(
                label
              )
            ) {
              applyDeckBeatGridUpdate(
                config,
                {
                  bpm:
                    (
                      grid.bpm ||
                      getDeckAnalysedBpm(
                        state
                      ) ||
                      0
                    ) / 2,

                  source: "/2",
                },
                state
              );

              return;
            }

            if (
              /Shrink grid/i.test(
                label
              )
            ) {
              applyDeckGridTransform(
                config,

                (currentGrid) =>
                  gridApi.adjustInterval(
                    currentGrid,

                    -grid.adjustmentMs,

                    currentTime,

                    {
                      ...options,

                      source:
                        "shrink-interval",
                    }
                  ),

                state,

                "shrink-interval"
              );

              return;
            }

            if (
              /Stretch grid/i.test(
                label
              )
            ) {
              applyDeckGridTransform(
                config,

                (currentGrid) =>
                  gridApi.adjustInterval(
                    currentGrid,

                    grid.adjustmentMs,

                    currentTime,

                    {
                      ...options,

                      source:
                        "stretch-interval",
                    }
                  ),

                state,

                "stretch-interval"
              );

              return;
            }

            const isRight =
              /right/i.test(label);

            const localBeatSeconds =
              gridApi.beatSecondsAtTime(
                grid,
                currentTime,
                options
              ) || 0.05;

            const amount =
              /Move beat/i.test(
                label
              )
                ? localBeatSeconds
                : grid.adjustmentMs /
                  1000;

            applyDeckGridTransform(
              config,

              (currentGrid) =>
                gridApi.shift(
                  currentGrid,

                  isRight
                    ? amount
                    : -amount,

                  currentTime,

                  {
                    ...options,

                    source:
                      /Move beat/i.test(
                        label
                      )
                        ? "move-one-beat"
                        : "grid-nudge",
                  }
                ),

              state,

              /Move beat/i.test(
                label
              )
                ? "move-one-beat"
                : "grid-nudge"
            );
          }
        );
      });

      $$(`.brDjPerfPanel[data-dj-perf-panel="${config.panel}"] .brDjGridTap`).forEach((button) => {
        button.addEventListener("click", () => {
          const activeDeck = getReadyDeck();
          const state = activeDeck?.getState?.() || lastDeckStates.get(config.deckId) || blankDeckState();
          const grid = normaliseDeckBeatGrid(config, state);
          if (grid.locked) return;

          const now = window.performance?.now?.() || Date.now();
          if (grid.lastTapAt) {
            const diff = now - grid.lastTapAt;
            if (diff > 250 && diff < 2200) {
              grid.tapIntervals = Array.isArray(grid.tapIntervals) ? grid.tapIntervals : [];
              grid.tapIntervals.push(diff);
              grid.tapIntervals = grid.tapIntervals.slice(-6);
              const average = grid.tapIntervals.reduce((sum, value) => sum + value, 0) / grid.tapIntervals.length;
              applyDeckBeatGridUpdate(config, { bpm: 60000 / average, source: "tap" }, state);
            }
          }
          grid.lastTapAt = now;
          syncDeckBeatGridUi(config, state);
        });
      });

      $$(`.brDjPerfPanel[data-dj-perf-panel="${config.panel}"] .brDjGridLock`).forEach((button) => {
        button.addEventListener("click", () => {
          const activeDeck = getReadyDeck();
          const state = activeDeck?.getState?.() || lastDeckStates.get(config.deckId) || blankDeckState();
          const grid = normaliseDeckBeatGrid(config, state);
          applyDeckBeatGridUpdate(config, { locked: !grid.locked }, state, { allowLocked: true });
        });
      });
			
      $$(`.brDjPerfPanel[data-dj-perf-panel="${config.panel}"] .brDjGridUndo`).forEach((button) => {
        button.addEventListener("click", () => {
          const state = lastDeckStates.get(config.deckId) || blankDeckState();
          const label = button.getAttribute("aria-label") || "";
          if (/redo/i.test(label)) redoDeckBeatGrid(config, state);
          else undoDeckBeatGrid(config, state);
        });
      });

      const cueHoldState = { active: false, pointerId: null };

      [
        ...$$(`.brDjPerfPanel[data-dj-perf-panel="${config.panel}"] .brDjSingleCueBtn`),
        ...$$(`.brDjDuoDeckTransportPanel.${config.cardClass} .brDjDuoPadCue`),
        ...$$(`.brDjVinylDeckView[data-vinyl-deck="${config.vinylDeck}"] .brDjVinylTransport button:not(.is-play)`),
      ].forEach((button) => {
        const stopCuePreview = async (event) => {
          button.classList.remove(
            "is-cue-active"
          );

          if (!cueHoldState.active) return;
          if (event?.pointerId != null && cueHoldState.pointerId != null && event.pointerId !== cueHoldState.pointerId) return;

          cueHoldState.active = false;
          cueHoldState.pointerId = null;

          const activeDeck = getReadyDeck();
          if (!activeDeck) return;

          activeDeck.pause();
          setDeckSkinState(config, await activeDeck.seek(activeDeck.getState().cuePoint || 0));
        };

        button.addEventListener("pointerdown", async (event) => {
          const activeDeck = getReadyDeck();
          if (!activeDeck) return;

          event.preventDefault();

          button.classList.add(
            "is-cue-active"
          );

          try {
            button.setPointerCapture?.(event.pointerId);
          } catch {}

          const state = activeDeck.getState();
          const cuePoint = Number(state.cuePoint) || 0;
          const currentTime = Number(state.currentTime) || 0;

          if (state.isPlaying) {
            cueHoldState.active = false;
            cueHoldState.pointerId = null;
            activeDeck.pause();
            setDeckSkinState(config, await activeDeck.seek(cuePoint));
            return;
          }

          const isAtCue = Math.abs(currentTime - cuePoint) <= 0.04;
          if (!isAtCue) {
            const quantizedCue = getQuantizedCueTime(config, state, currentTime);
            setDeckSkinState(config, activeDeck.setCuePoint(quantizedCue));
            return;
          }

          cueHoldState.active = true;
          cueHoldState.pointerId = event.pointerId;
          await activeDeck.seek(cuePoint);
          setDeckSkinState(config, await activeDeck.play(cuePoint));
        });

        button.addEventListener("pointerup", stopCuePreview);
        button.addEventListener("pointercancel", stopCuePreview);
        button.addEventListener("lostpointercapture", stopCuePreview);
        button.addEventListener("click", (event) => event.preventDefault());
      });

      setDeckSkinState(config, blankDeckState());
    });
		
    const DJ_LIBRARY_MAX_DURATION_SECONDS =
      15 * 60;

    const DJ_LIBRARY_WAVEFORM_PEAKS = 16384;
    const DJ_LIBRARY_CATALOGUE_TTL_MS =
      30 * 1000;

    const djLibraryCatalogueCache = {
      items: [],
      loadedAt: 0,
    };

    const getDjLibraryItemId = (item = {}) =>
      String(
        item.id ||
        item.trackId ||
        item.libraryId ||
        ""
      ).trim();

    const getDjLibraryTrackTitle = (item = {}) =>
      item.title ||
      item.name ||
      item.fileName ||
      item.filename ||
      "Untitled track";

    const getDjLibraryTrackArtist = (item = {}) =>
      item.artist ||
      item.albumArtist ||
      item.album ||
      "Library audio";

    const getDjLibraryTrackFileName = (item = {}) =>
      item.fileName ||
      item.filename ||
      item.name ||
      `${getDjLibraryTrackTitle(item)}.mp3`;

    const getDjLibraryStreamUrl = (item = {}) => {
      if (item.streamUrl) {
        return String(item.streamUrl);
      }

      const id = getDjLibraryItemId(item);

      if (
        item.source === "google_drive" ||
        item.sourceType === "googleDrive" ||
        item.cloudProvider === "google_drive"
      ) {
        return id
          ? `/cloud/google/stream/${encodeURIComponent(id)}`
          : "";
      }

      return id
        ? `/stream/${encodeURIComponent(id)}`
        : "";
    };

    const isDjRemoteAccess = () =>
      Boolean(
        window
          .BRMediaDjLibraryRemote
          ?.isRemoteAccess?.()
      );

    const getDjLibraryPerformanceUrl =
      (item = {}) => {
        const id =
          getDjLibraryItemId(
            item
          );

        const version = String(
          item
            .djPerformanceVersion ||
          ""
        ).trim();

        return (
          id &&
          isDjLibraryPerformancePrepared(
            item
          )
        )
          ? `/dj-performance/${encodeURIComponent(
              id
            )}?v=${encodeURIComponent(
              version
            )}`
          : "";
      };

    const getDjLibraryStreamCandidates =
      (item = {}) => {
        const id =
          getDjLibraryItemId(
            item
          );

        const performanceUrl =
          getDjLibraryPerformanceUrl(
            item
          );

        const originalUrl =
          getDjLibraryStreamUrl(
            item
          );

        const urls =
          isDjRemoteAccess()
            ? [
                performanceUrl,
                originalUrl,
              ]
            : [
                originalUrl,
                performanceUrl,
              ];

        if (id) {
          urls.push(
            `/stream/${encodeURIComponent(
              id
            )}`
          );

          urls.push(
            `/download/${encodeURIComponent(
              id
            )}`
          );
        }

        const locator =
          item.locator ||
          item.path ||
          item.filePath ||
          "";

        if (locator) {
          urls.push(
            `/stream/local?path=${encodeURIComponent(
              locator
            )}`
          );
        }

        return Array.from(
          new Set(
            urls.filter(Boolean)
          )
        );
      };

    const getDjLibraryTrackDuration = (
      item = {}
    ) => {
      const raw =
        item.duration ??
        item.durationSeconds ??
        item.seconds ??
        item.format?.duration ??
        item.metadata?.duration ??
        0;

      const seconds = Number(raw) || 0;
      const maybeMs =
        Number(item.durationMs || 0);

      const resolved =
        seconds > 90000
          ? seconds / 1000
          : seconds ||
            (
              maybeMs > 0
                ? maybeMs / 1000
                : 0
            );

      return (
        Number.isFinite(resolved) &&
        resolved > 0
      )
        ? resolved
        : 0;
    };

    const formatDjLibraryDuration = (
      seconds = 0
    ) => {
      const safe = Math.max(
        0,
        Math.round(Number(seconds) || 0)
      );

      const minutes = Math.floor(safe / 60);

      const remainder = String(
        safe % 60
      ).padStart(2, "0");

      return `${minutes}:${remainder}`;
    };

    const formatDjLibraryLoadTime = (
      milliseconds = 0
    ) => {
      const value = Math.max(
        0,
        Number(milliseconds) || 0
      );

      return value >= 1000
        ? `${(value / 1000).toFixed(
            value >= 10000 ? 1 : 2
          )}s`
        : `${Math.round(value)}ms`;
    };

    const isDjLibraryPerformanceTrack = (
      item = {}
    ) => {
      const duration =
        getDjLibraryTrackDuration(item);

      const mime = String(
        item.mimeType ||
        item.type ||
        item.contentType ||
        ""
      ).toLowerCase();

      const fileName =
        getDjLibraryTrackFileName(
          item
        ).toLowerCase();

      const looksAudio =
        !mime ||
        mime.startsWith("audio/") ||
        /\.(mp3|m4a|aac|wav|flac|ogg|opus|aiff?|alac)$/i
          .test(fileName);

      return (
        looksAudio &&
        duration > 0 &&
        duration <
          DJ_LIBRARY_MAX_DURATION_SECONDS
      );
    };

    const getDjLibraryTrackKey = (
      item = {}
    ) =>
      item.key ||
      item.camelot ||
      item.initialKey ||
      item.metadata?.key ||
      "";

    const getDjLibraryGridBpm = (
      item = {}
    ) =>
      getSafeGridBpmValue(
        item.djGridBpm ||
        item.bpm ||
        item.metadata?.bpm
      );

    const isDjLibraryWaveformPrepared = (
      item = {}
    ) =>
      Boolean(item._brDjWaveformPrepared);

    const isDjLibraryPerformancePrepared =
      (item = {}) =>
        Boolean(
          item.djPerformancePrepared &&
          item.djPerformanceVersion &&
          Number(
            item.djPerformanceBytes
          ) > 0 &&
          (
            !Number(
              item.sizeBytes
            ) ||
            Number(
              item
                .djPerformanceSourceBytes
            ) ===
            Number(
              item.sizeBytes
            )
          )
        );

    const isDjLibraryGridPrecisionReady =
      (item = {}) => {
        if (!getDjLibraryGridBpm(item)) {
          return false;
        }

        const source = String(
          item.djGridSource ||
          ""
        )
          .trim()
          .toLowerCase();

        if (
          source ===
          "precise-grid-v1"
        ) {
          return true;
        }

        /*
          Never overwrite a grid that has been
          deliberately corrected by hand.
        */
        return /^(manual|tap|shrink|stretch|x2|\/2|grid-edit)/
          .test(source);
      };

    const getDjLibraryPrepareLabel =
      (item = {}) => {
        if (item.djGridLocked) {
          return "LOCKED";
        }
        if (
          !isDjLibraryWaveformPrepared(
            item
          )
        ) {
          return "PREP";
        }

        if (
          !getDjLibraryGridBpm(
            item
          )
        ) {
          return "ANALYSE";
        }

        if (
          !isDjLibraryGridPrecisionReady(
            item
          )
        ) {
          return "REFINE";
        }

        if (
          !isDjLibraryPerformancePrepared(
            item
          )
        ) {
          return "REMOTE";
        }

        return "READY";
      };

    const getDjLibraryPreparedAnalysis = (
      item = {}
    ) => {
      const bpm =
        getDjLibraryGridBpm(item);

      const key =
        getDjLibraryTrackKey(item);

      if (!bpm && !key) {
        return null;
      }

      return {
        bpm,
        rawBpm:
          getSafeGridBpmValue(
            item.djGridRawBpm
          ) || bpm,
        downbeat:
          Number(item.djGridDownbeat) || 0,
        key,
        tempoSource:
          item.djGridBpm
            ? (
                item.djGridSource ||
                "saved-grid"
              )
            : "tag",
        tempoConfidence:
          item.djGridBpm ||
          item.bpm
            ? 1
            : 0,
        keyConfidence:
          key
            ? 1
            : 0,
        tempoCandidates:
          bpm
            ? [
                {
                  bpm,
                  score: 1,
                  source:
                    item.djGridBpm
                      ? "saved-grid"
                      : "tag",
                },
              ]
            : [],
      };
    };

    const escapeDjLibraryAttr = (
      value = ""
    ) =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;");
				
    const DJ_LIBRARY_VIEW_STORAGE_KEY =
      "brmedia.dj.performance.library.view.v1";

    const readDjLibraryViewSettings = () => {
      try {
        const saved = JSON.parse(
          window.localStorage.getItem(
            DJ_LIBRARY_VIEW_STORAGE_KEY
          ) || "{}"
        );

        return {
          sort: String(
            saved.sort || "title-asc"
          ),
          prep: String(
            saved.prep || "all"
          ),
          bpm: String(
            saved.bpm || "all"
          ),
        };
      } catch {
        return {
          sort: "title-asc",
          prep: "all",
          bpm: "all",
        };
      }
    };

    const writeDjLibraryViewSettings = (
      sheet
    ) => {
      if (!sheet) return;

      const settings = {
        sort: String(
          sheet.querySelector(
            "[data-dj-library-sort]"
          )?.value || "title-asc"
        ),
        prep: String(
          sheet.querySelector(
            "[data-dj-library-prep-filter]"
          )?.value || "all"
        ),
        bpm: String(
          sheet.querySelector(
            "[data-dj-library-bpm-filter]"
          )?.value || "all"
        ),
      };

      try {
        window.localStorage.setItem(
          DJ_LIBRARY_VIEW_STORAGE_KEY,
          JSON.stringify(settings)
        );
      } catch {}
    };

    const applyDjLibraryViewSettings = (
      sheet
    ) => {
      if (!sheet) return;

      const settings =
        readDjLibraryViewSettings();

      const sort = sheet.querySelector(
        "[data-dj-library-sort]"
      );

      const prep = sheet.querySelector(
        "[data-dj-library-prep-filter]"
      );

      const bpm = sheet.querySelector(
        "[data-dj-library-bpm-filter]"
      );

      if (sort) sort.value = settings.sort;
      if (prep) prep.value = settings.prep;
      if (bpm) bpm.value = settings.bpm;
    };

    const getDjLibraryPreparationRank =
      (item = {}) => {
        const prepared =
          isDjLibraryWaveformPrepared(
            item
          );

        const bpm =
          getDjLibraryGridBpm(
            item
          );

        const preciseGrid =
          isDjLibraryGridPrecisionReady(
            item
          );

        const remoteReady =
          isDjLibraryPerformancePrepared(
            item
          );

        if (
          prepared &&
          bpm &&
          preciseGrid &&
          remoteReady
        ) {
          return 0;
        }

        if (
          prepared &&
          bpm &&
          preciseGrid
        ) {
          return 1;
        }

        if (prepared && bpm) {
          return 2;
        }

        if (prepared) return 3;

        return 4;
      };

    const matchesDjLibraryBpmFilter = (
      item,
      filter
    ) => {
      const bpm =
        getDjLibraryGridBpm(item);

      if (filter === "unknown") {
        return !bpm;
      }

      if (!bpm || filter === "all") {
        return filter === "all";
      }

      if (filter === "120-159") {
        return bpm >= 120 && bpm < 160;
      }

      if (filter === "160-179") {
        return bpm >= 160 && bpm < 180;
      }

      if (filter === "180-199") {
        return bpm >= 180 && bpm < 200;
      }

      if (filter === "200-plus") {
        return bpm >= 200;
      }

      return true;
    };

    const sortDjLibraryTracks = (
      entries,
      sortMode
    ) => {
      const compareText = (a, b) =>
        String(a || "").localeCompare(
          String(b || ""),
          undefined,
          { sensitivity: "base" }
        );

      const compareNumber = (a, b) =>
        (Number(a) || 0) -
        (Number(b) || 0);

      return [...entries].sort(
        (left, right) => {
          const a = left.item;
          const b = right.item;
          let result = 0;

          switch (sortMode) {
            case "library-order":
              result =
                left.index - right.index;
              break;

            case "title-desc":
              result = compareText(
                getDjLibraryTrackTitle(b),
                getDjLibraryTrackTitle(a)
              );
              break;

            case "artist-asc":
              result = compareText(
                getDjLibraryTrackArtist(a),
                getDjLibraryTrackArtist(b)
              );
              break;

            case "artist-desc":
              result = compareText(
                getDjLibraryTrackArtist(b),
                getDjLibraryTrackArtist(a)
              );
              break;

            case "bpm-asc":
              result = compareNumber(
                getDjLibraryGridBpm(a) || 999,
                getDjLibraryGridBpm(b) || 999
              );
              break;

            case "bpm-desc":
              result = compareNumber(
                getDjLibraryGridBpm(b),
                getDjLibraryGridBpm(a)
              );
              break;

            case "duration-asc":
              result = compareNumber(
                getDjLibraryTrackDuration(a),
                getDjLibraryTrackDuration(b)
              );
              break;

            case "duration-desc":
              result = compareNumber(
                getDjLibraryTrackDuration(b),
                getDjLibraryTrackDuration(a)
              );
              break;

            case "ready-first":
              result =
                getDjLibraryPreparationRank(a) -
                getDjLibraryPreparationRank(b);
              break;

            case "title-asc":
            default:
              result = compareText(
                getDjLibraryTrackTitle(a),
                getDjLibraryTrackTitle(b)
              );
              break;
          }

          return (
            result ||
            left.index - right.index
          );
        }
      ).map((entry) => entry.item);
    };

    const ensureDjPerformanceLibrarySheet =
      () => {
        let sheet = document.querySelector(
          "[data-dj-performance-library]"
        );

        if (sheet) {
          return sheet;
        }

        sheet =
          document.createElement("section");

        sheet.className =
          "brDjPerformanceLibrarySheet";

        sheet.dataset.djPerformanceLibrary =
          "";

        sheet.innerHTML = `
          <button
            class="brDjPerformanceLibraryScrim"
            type="button"
            data-dj-library-close
            aria-label="Close DJ library"
          ></button>

          <div
            class="brDjPerformanceLibraryPanel"
            role="dialog"
            aria-modal="true"
            aria-label="DJ Library"
          >
            <header>
              <div>
                <p class="brDjEyebrow">
                  DJ Library
                </p>
                <h2>
                  Prepared server tracks
                </h2>
              </div>

              <button
                type="button"
                data-dj-library-close
                aria-label="Close DJ library"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </header>

            <div class="brDjPerformanceLibrarySearch">
              <i class="fa-solid fa-magnifying-glass"></i>

              <input
                type="search"
                data-dj-library-search
                placeholder="Search title, artist or filename"
              />

              <button
                type="button"
                data-dj-library-refresh
              >
                Refresh
              </button>
            </div>

            <div class="brDjPerformanceLibraryTools">
              <label>
                <span>Sort</span>
                <select data-dj-library-sort>
                  <option value="title-asc">Title A–Z</option>
                  <option value="title-desc">Title Z–A</option>
                  <option value="artist-asc">Artist A–Z</option>
                  <option value="artist-desc">Artist Z–A</option>
                  <option value="bpm-asc">BPM low–high</option>
                  <option value="bpm-desc">BPM high–low</option>
                  <option value="duration-asc">Shortest first</option>
                  <option value="duration-desc">Longest first</option>
                  <option value="ready-first">Prepared first</option>
                  <option value="library-order">Library order</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select data-dj-library-prep-filter>
                  <option value="all">All tracks</option>
                  <option value="ready">Remote ready</option>
                  <option value="refine">Needs grid refine</option>
                  <option value="remote">Needs remote copy</option>
                  <option value="analyse">Needs BPM</option>
                  <option value="unprepared">Needs PREP</option>
                </select>
              </label>

              <label>
                <span>BPM</span>
                <select data-dj-library-bpm-filter>
                  <option value="all">All BPM</option>
                  <option value="unknown">Unknown</option>
                  <option value="120-159">120–159</option>
                  <option value="160-179">160–179</option>
                  <option value="180-199">180–199</option>
                  <option value="200-plus">200+</option>
                </select>
              </label>

              <button
                type="button"
                data-dj-library-reset-filters
              >
                Reset
              </button>
            </div>
						
            <div
              class="brDjPerformanceLibraryStatus"
              data-dj-library-status
            >
              Loading library…
            </div>

            <div
              class="brDjPerformanceLibraryList"
              data-dj-library-list
            ></div>
          </div>
        `;

        document.body.appendChild(sheet);
        applyDjLibraryViewSettings(sheet);
        hydrateDjIcons(sheet);
        return sheet;
      };

    const renderDjPerformanceLibrary = (
      sheet,
      items = []
    ) => {
      const list = sheet.querySelector(
        "[data-dj-library-list]"
      );

      const status = sheet.querySelector(
        "[data-dj-library-status]"
      );

      const query = String(
        sheet.querySelector(
          "[data-dj-library-search]"
        )?.value || ""
      )
        .trim()
        .toLowerCase();

      const sortMode = String(
        sheet.querySelector(
          "[data-dj-library-sort]"
        )?.value || "title-asc"
      );

      const prepFilter = String(
        sheet.querySelector(
          "[data-dj-library-prep-filter]"
        )?.value || "all"
      );

      const bpmFilter = String(
        sheet.querySelector(
          "[data-dj-library-bpm-filter]"
        )?.value || "all"
      );

      const djTracks = items.filter(
        isDjLibraryPerformanceTrack
      );

      const filteredEntries = djTracks
        .map((item, index) => ({
          item,
          index,
        }))
        .filter(({ item }) => {
          const matchesSearch = [
            getDjLibraryTrackTitle(item),
            getDjLibraryTrackArtist(item),
            getDjLibraryTrackFileName(item),
            getDjLibraryTrackKey(item),
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);

          if (!matchesSearch) return false;

          const prepared =
            isDjLibraryWaveformPrepared(
              item
            );

          const bpm =
            getDjLibraryGridBpm(item);

          const preciseGrid =
            isDjLibraryGridPrecisionReady(
              item
            );

          const remoteReady =
            isDjLibraryPerformancePrepared(
              item
            );

          const matchesPrep =
            prepFilter === "all" ||
            (
              prepFilter === "ready" &&
              prepared &&
              bpm &&
              preciseGrid &&
              remoteReady
            ) ||
            (
              prepFilter === "refine" &&
              prepared &&
              bpm &&
              !preciseGrid
            ) ||
            (
              prepFilter === "remote" &&
              prepared &&
              bpm &&
              preciseGrid &&
              !remoteReady
            ) ||
            (
              prepFilter === "analyse" &&
              prepared &&
              !bpm
            ) ||
            (
              prepFilter === "unprepared" &&
              !prepared
            );

          return Boolean(
            matchesPrep &&
            matchesDjLibraryBpmFilter(
              item,
              bpmFilter
            )
          );
        });

      const filtered = sortDjLibraryTracks(
        filteredEntries,
        sortMode
      );

      if (
        status &&
        !sheet.dataset.djLibraryBusy
      ) {
        const hiddenLong = Math.max(
          0,
          items.length - djTracks.length
        );

        const readyCount =
          djTracks.filter(
            (item) =>
              isDjLibraryWaveformPrepared(
                item
              ) &&
              getDjLibraryGridBpm(
                item
              )
          ).length;

        const remoteCount =
          djTracks.filter(
            isDjLibraryPerformancePrepared
          ).length;

        const waveCount =
          djTracks.filter(
            isDjLibraryWaveformPrepared
          ).length;

        status.textContent =
          filtered.length
            ? `${filtered.length} tracks • ${readyCount} analysed • ${remoteCount} remote • ${waveCount} wave${
                hiddenLong
                  ? ` • ${hiddenLong} hidden`
                  : ""
              }`
            : "No DJ tracks match the current search and filters";
      }

      if (!list) {
        return;
      }

      list.innerHTML = filtered
        .slice(0, 240)
        .map((item) => {
          const duration =
            getDjLibraryTrackDuration(item);

          const key =
            getDjLibraryTrackKey(item);

          const bpm =
            getDjLibraryGridBpm(item);

          const prepareLabel =
            getDjLibraryPrepareLabel(item);

          const prepared =
            isDjLibraryWaveformPrepared(
              item
            );

          const analysed =
            prepared &&
            Boolean(bpm);

          const preciseGrid =
            isDjLibraryGridPrecisionReady(
              item
            );

          const remoteReady =
            isDjLibraryPerformancePrepared(
              item
            );

          const ready =
            analysed &&
            preciseGrid &&
            remoteReady;

          const prepComplete =
            ready ||
            Boolean(
              item.djGridLocked
            );

          return `
            <article
              class="brDjPerformanceLibraryTrack${
                ready
                  ? " is-ready is-remote-ready"
                  : analysed && !preciseGrid
                    ? " is-wave-ready is-grid-refine-needed"
                    : analysed
                      ? " is-wave-ready is-remote-needed"
                      : prepared
                        ? " is-wave-ready"
                        : ""
              }"
              data-dj-library-track="${escapeDjLibraryAttr(
                getDjLibraryItemId(item)
              )}"
            >
              <div class="brDjPerformanceLibraryIcon">
                <i class="fa-solid fa-music"></i>
              </div>

              <div class="brDjPerformanceLibraryMeta">
                <strong>
                  ${escapeHtml(
                    getDjLibraryTrackTitle(item)
                  )}
                </strong>

                <span>
                  ${escapeHtml(
                    getDjLibraryTrackArtist(item)
                  )}
                </span>

                <small>
                  ${escapeHtml(
                    formatDjLibraryDuration(
                      duration
                    )
                  )}${
                    bpm
                      ? ` · ${bpm.toFixed(2)} BPM`
                      : ""
                  }${
                    key
                      ? ` · ${escapeHtml(key)}`
                      : ""
                  }
                </small>

                <em>
                  ${
                    ready
                      ? `Remote ready • ${Math.max(
                          1,
                          Math.round(
                            Number(
                              item.djPerformanceBytes ||
                              0
                            ) /
                            1048576
                          )
                        )} MB`
                      : analysed && !preciseGrid
                        ? "Grid timing needs full-track refinement"
                        : analysed
                          ? "Analysed • build remote copy"
                          : prepared
                            ? "Waveform ready • BPM analysis needed"
                            : "Needs preparation"
                  }
                </em>
              </div>

              <menu>
                <button
                  type="button"
                  data-dj-library-prepare
                  ${
                    prepComplete
                      ? "disabled"
                      : ""
                  }
                >
                  ${prepareLabel}
                </button>

                <button
                  type="button"
                  data-dj-library-load="d1"
                >
                  D1
                </button>

                <button
                  type="button"
                  data-dj-library-load="d2"
                >
                  D2
                </button>
              </menu>
            </article>
          `;
        })
        .join("");

      hydrateDjIcons(list);
    };

    const refreshDjLibraryCatalogue =
      async (
        sheet,
        options = {}
      ) => {
        const force =
          Boolean(options.force);

        const cacheFresh =
          djLibraryCatalogueCache
            .items.length &&
          (
            Date.now() -
            djLibraryCatalogueCache
              .loadedAt
          ) <
            DJ_LIBRARY_CATALOGUE_TTL_MS;

        if (!force && cacheFresh) {
          sheet._brDjLibraryItems =
            djLibraryCatalogueCache.items;

          renderDjPerformanceLibrary(
            sheet,
            sheet._brDjLibraryItems
          );

          return sheet._brDjLibraryItems;
        }

        const status = sheet.querySelector(
          "[data-dj-library-status]"
        );

        const startedAt =
          performance.now();

        if (status) {
          status.textContent =
            "Reading prepared catalogue…";
        }

        /*
          Read the lightweight saved catalogue and cache health in
          parallel. Do not run metadata=missing here.
        */
        const [
          libraryResponse,
          healthResponse,
        ] = await Promise.all([
          fetch("/library", {
            cache: "no-store",
            credentials: "same-origin",
          }),

          fetch(
            `/waveforms/health?count=${DJ_LIBRARY_WAVEFORM_PEAKS}`,
            {
              cache: "no-store",
              credentials:
                "same-origin",
            }
          ),
        ]);

        if (!libraryResponse.ok) {
          throw new Error(
            `Library request failed (${libraryResponse.status})`
          );
        }

        const data =
          await libraryResponse.json();

        const items = Array.isArray(data)
          ? data
          : Array.isArray(data.items)
            ? data.items
            : [];

        const health = healthResponse.ok
          ? await healthResponse
              .json()
              .catch(() => ({}))
          : {};

        const preparedIds = new Set(
          Array.isArray(
            health.cachedTrackIds
          )
            ? health.cachedTrackIds.map(
                String
              )
            : []
        );

        items.forEach((item) => {
          const persistedWaveformReady =
            Boolean(
              item.djWaveformPrepared &&
              Number(
                item.djWaveformPeakCount
              ) ===
                DJ_LIBRARY_WAVEFORM_PEAKS
            );

          item._brDjWaveformPrepared =
            persistedWaveformReady ||
            preparedIds.has(
              getDjLibraryItemId(item)
            );

          item._brDjMetadataPrepared =
            Boolean(
              item.bpm ||
              item.key ||
              item.djGridBpm
            );
        });

        djLibraryCatalogueCache.items =
          items;

        djLibraryCatalogueCache.loadedAt =
          Date.now();

        sheet._brDjLibraryItems = items;
        sheet.dataset.djLibraryBusy = "";

        renderDjPerformanceLibrary(
          sheet,
          items
        );

        if (status) {
          status.dataset.catalogueMs =
            String(
              performance.now() -
              startedAt
            );
        }

        return items;
      };

    const openDjPerformanceLibrary =
      async (options = {}) => {
        const sheet =
          ensureDjPerformanceLibrarySheet();

        sheet.classList.add("is-open");

        document.body.classList.add(
          "brDjPerformanceLibraryOpen"
        );

        if (
          djLibraryCatalogueCache
            .items.length &&
          !options.force
        ) {
          sheet._brDjLibraryItems =
            djLibraryCatalogueCache.items;

          renderDjPerformanceLibrary(
            sheet,
            sheet._brDjLibraryItems
          );
        }

        try {
          await refreshDjLibraryCatalogue(
            sheet,
            options
          );
        } catch (error) {
          const status =
            sheet.querySelector(
              "[data-dj-library-status]"
            );

          if (status) {
            status.textContent =
              error?.message ||
              "Could not load library";
          }
        }
      };

    const closeDjPerformanceLibrary =
      () => {
        const sheet =
          document.querySelector(
            "[data-dj-performance-library]"
          );

        if (!sheet) {
          return;
        }

        sheet.classList.remove("is-open");

        document.body.classList.remove(
          "brDjPerformanceLibraryOpen"
        );
      };

    const formatDjLibraryBytes =
      (bytes = 0) =>
        window
          .BRMediaDjLibraryRemote
          ?.formatBytes?.(bytes) ||
        `${
          Math.round(
            Number(bytes) || 0
          )
        } B`;

    const fetchDjLibraryAudioBlob =
      async (item, status) => {
        const remoteLibrary =
          window
            .BRMediaDjLibraryRemote;

        if (
          !remoteLibrary ||
          typeof remoteLibrary
            .fetchAudioBlob !==
            "function"
        ) {
          throw new Error(
            "DJ library remote loader is unavailable"
          );
        }

        return remoteLibrary
          .fetchAudioBlob({
            urls:
              getDjLibraryStreamCandidates(
                item
              ),

            onStatus: (
              message
            ) => {
              if (status) {
                status.textContent =
                  `${message} • ${getDjLibraryTrackTitle(item)}`;
              }
            },

            onProgress: (
              progress
            ) => {
              if (!status) return;

              status.textContent =
                `${progress.sourceLabel} ${
                  progress.percent
                    ? `${progress.percent}% • `
                    : ""
                }${formatDjLibraryBytes(
                  progress.receivedBytes
                )}${
                  progress.totalBytes
                    ? ` / ${formatDjLibraryBytes(
                        progress.totalBytes
                      )}`
                    : ""
                } • ${formatDjLibraryBytes(
                  progress.speed
                )}/s • ${getDjLibraryTrackTitle(
                  item
                )}`;
            },
          });
      };

    const fetchDjLibraryPreparedWaveform =
      async (item) => {
        if (
          !isDjLibraryWaveformPrepared(
            item
          )
        ) {
          return null;
        }

        const id =
          getDjLibraryItemId(item);

        if (!id) {
          return null;
        }

        const startedAt =
          performance.now();

        const response = await fetch(
          `/track/${encodeURIComponent(id)}/waveform?count=${DJ_LIBRARY_WAVEFORM_PEAKS}&v=${encodeURIComponent(
            item.djWaveformUpdatedAt ||
            item.djGridUpdatedAt ||
            0
          )}`,
          {
            cache: "force-cache",
            credentials: "same-origin",
          }
        );

        if (!response.ok) {
          return null;
        }

        const payload =
          await response.json();

        if (
          !Array.isArray(
            payload?.peaks
          ) ||
          !payload.peaks.length
        ) {
          return null;
        }

        return {
          ...payload,
          version:
            `server-waveform-${DJ_LIBRARY_WAVEFORM_PEAKS}`,
          analysis:
            getDjLibraryPreparedAnalysis(
              item
            ),
          fetchMs:
            performance.now() -
            startedAt,
        };
      };
			
    const analyseDjPreparedWaveform = (
      waveform = {}
    ) => {
      const metadataBpm =
        getSafeGridBpmValue(
          waveform?.item?.bpm
        );

      const analyser =
        window.BRMediaSpectralWaveform;

      const analysed =
        analyser &&
        typeof analyser
          .analysePreparedWaveform ===
          "function"
          ? analyser
              .analysePreparedWaveform(
                waveform
              )
          : null;

      const preciseBpm =
        getSafeGridBpmValue(
          analysed?.bpm
        );

      return {
        /*
          A tag such as 170 is only a search hint.
          The measured full-track value, for example
          170.058, must win so the grid cannot drift.
        */
        bpm:
          preciseBpm ||
          metadataBpm,

        rawBpm:
          getSafeGridBpmValue(
            analysed?.rawBpm
          ) ||
          metadataBpm ||
          preciseBpm ||
          null,

        downbeat:
          Number(
            analysed?.downbeat
          ) || 0,

        tempoConfidence:
          Math.max(
            0,
            Math.min(
              1,
              Number(
                analysed
                  ?.tempoConfidence
              ) ||
              (metadataBpm ? 0.5 : 0)
            )
          ),

        tempoCandidates:
          Array.isArray(
            analysed
              ?.tempoCandidates
          )
            ? analysed
                .tempoCandidates
            : [],

        source:
          analysed
            ?.tempoSource ||
          (metadataBpm
            ? "tag"
            : "prepared-waveform"),
      };
    };
		
    const ensureDjLibraryPerformanceCopy =
      async (
        item,
        status,
        force = false
      ) => {
        const id =
          getDjLibraryItemId(item);

        if (!id) {
          throw new Error(
            "Track id missing"
          );
        }

        if (status) {
          status.textContent =
            `Building remote DJ copy • ${getDjLibraryTrackTitle(item)}`;
        }

        const response = await fetch(
          `/library/${encodeURIComponent(id)}/dj-performance`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              force,
            }),
          }
        );

        const payload =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            payload.detail ||
            payload.error ||
            "Remote DJ copy failed"
          );
        }

        if (payload?.item) {
          Object.assign(
            item,
            payload.item
          );
        }

        return payload?.copy ||
          null;
      };

    const prepareDjLibraryItem =
      async (
        item,
        button,
        status
      ) => {
        const id =
          getDjLibraryItemId(item);

        if (!id) {
          throw new Error(
            "Track id missing"
          );
        }
				
        if (item.djGridLocked) {
          throw new Error(
            "Analysis Lock is on. Unlock this track in Grid Setup before PREP or REFINE."
          );
        }

        const startedAt =
          performance.now();

        const waveformPrepared =
          isDjLibraryWaveformPrepared(
            item
          );

        const gridBpm =
          getDjLibraryGridBpm(item);

        const precisionReady =
          isDjLibraryGridPrecisionReady(
            item
          );

        const needsWaveform =
          !waveformPrepared;

        const needsGridAnalysis =
          !gridBpm ||
          !precisionReady;

        const needsAnalysis =
          needsWaveform ||
          needsGridAnalysis;

        if (status) {
          status.textContent =
            needsWaveform
              ? `Preparing ${getDjLibraryTrackTitle(item)} on server…`
              : needsGridAnalysis
                ? `Refining the full-track grid • ${getDjLibraryTrackTitle(item)}`
                : `Preparing remote copy • ${getDjLibraryTrackTitle(item)}`;
        }

        button.disabled = true;

        button.classList.add(
          "is-loading"
        );

        button.textContent =
          needsWaveform
            ? "PREP…"
            : needsGridAnalysis
              ? "REFINE…"
              : "REMOTE…";

        try {
          if (!needsAnalysis) {
            const remoteCopy =
              await ensureDjLibraryPerformanceCopy(
                item,
                status
              );

            djLibraryCatalogueCache.loadedAt =
              Date.now();

            const sheet =
              button.closest(
                "[data-dj-performance-library]"
              );

            renderDjPerformanceLibrary(
              sheet,
              sheet?._brDjLibraryItems ||
                []
            );

            if (status) {
              status.textContent =
                `Remote ready • ${formatDjLibraryBytes(
                  remoteCopy?.bytes ||
                  item.djPerformanceBytes ||
                  0
                )} • ${formatDjLibraryLoadTime(
                  performance.now() -
                  startedAt
                )}`;
            }

            return;
          }
          if (needsWaveform) {
            /*
              Refresh only this track. Grid-only refinement reuses
              the existing prepared waveform and does not rescan it.
            */
            const metadataResponse =
              await fetch(
                `/library/${encodeURIComponent(id)}/rescan-metadata`,
                {
                  method: "POST",
                }
              );

            const metadataPayload =
              await metadataResponse
                .json()
                .catch(() => ({}));

            if (!metadataResponse.ok) {
              throw new Error(
                metadataPayload.error ||
                "Metadata preparation failed"
              );
            }

            if (metadataPayload?.item) {
              Object.assign(
                item,
                metadataPayload.item
              );
            }

            item._brDjMetadataPrepared =
              true;

            const response = await fetch(
              "/waveforms/generate",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  scope: "single",
                  id,
                  count:
                    DJ_LIBRARY_WAVEFORM_PEAKS,
                  force: false,
                }),
              }
            );

            const payload =
              await response
                .json()
                .catch(() => ({}));

            if (
              !response.ok ||
              payload.failed
            ) {
              throw new Error(
                payload.error ||
                payload.results?.find?.(
                  (entry) =>
                    entry.status ===
                    "failed"
                )?.detail ||
                "Preparation failed"
              );
            }

            item._brDjWaveformPrepared =
              true;
          }

          if (status) {
            status.textContent =
              `Analysing BPM • ${getDjLibraryTrackTitle(item)}`;
          }

          const preparedWaveform =
            await fetchDjLibraryPreparedWaveform(
              item
            );

          if (!preparedWaveform) {
            throw new Error(
              "Prepared waveform could not be read back"
            );
          }

          preparedWaveform.item = item;

          const analysis =
            analyseDjPreparedWaveform(
              preparedWaveform
            );

          const saveResponse = await fetch(
            `/library/${encodeURIComponent(id)}/dj-prep`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                version: 2,

                analysisMode:
                  item.djGridAnalysisMode ||
                  "auto",

                resolvedMode:
                  "normal",

                bpm: analysis.bpm,

                rawBpm:
                  analysis.rawBpm ||
                  analysis.bpm,

                downbeat:
                  analysis.downbeat,

                segments:
                  analysis.bpm
                    ? [
                        {
                          id: "segment-1",

                          startTime:
                            analysis.downbeat,

                          startBeat: 0,

                          bpm:
                            analysis.bpm,

                          source:
                            analysis.source,
                        },
                      ]
                    : [],

                editRange:
                  item.djGridEditRange ||
                  "whole",

                adjustmentMs:
                  Number(
                    item.djGridAdjustmentMs
                  ) === 3
                    ? 3
                    : 1,

                reviewRequired: false,

                baseSet:
                  Boolean(analysis.bpm),

                locked: false,

                source:
                  analysis.source,

                tempoConfidence:
                  analysis.tempoConfidence,

                tempoCandidates:
                  analysis.tempoCandidates,

                waveformPrepared: true,

                waveformPeakCount:
                  DJ_LIBRARY_WAVEFORM_PEAKS,
              }),
            }
          );

          const savePayload =
            await saveResponse
              .json()
              .catch(() => ({}));

          if (!saveResponse.ok) {
            throw new Error(
              savePayload.error ||
              "Could not save DJ preparation"
            );
          }

          if (savePayload?.item) {
            Object.assign(
              item,
              savePayload.item
            );
          }

          item._brDjWaveformPrepared =
            true;

          item._brDjMetadataPrepared =
            true;

          const remoteCopy =
            await ensureDjLibraryPerformanceCopy(
              item,
              status
            );

          djLibraryCatalogueCache.loadedAt =
            Date.now();

          const sheet =
            button.closest(
              "[data-dj-performance-library]"
            );

          renderDjPerformanceLibrary(
            sheet,
            sheet?._brDjLibraryItems ||
              []
          );

          if (status) {
            status.textContent =
              analysis.bpm
                ? `Remote ready • ${analysis.bpm.toFixed(2)} BPM • ${formatDjLibraryBytes(
                    remoteCopy?.bytes ||
                    item.djPerformanceBytes ||
                    0
                  )} • ${formatDjLibraryLoadTime(
                    performance.now() -
                    startedAt
                  )}`
                : `Waveform ready, BPM needs manual Grid setup • ${formatDjLibraryLoadTime(
                    performance.now() -
                    startedAt
                  )}`;
          }
        } finally {
          button.disabled = false;

          button.classList.remove(
            "is-loading"
          );
        }
      };

    const loadLibraryItemIntoDeck =
      async (deckId, item) => {
        if (!item) {
          throw new Error(
            "Library track not found in this sheet"
          );
        }

        const config =
          getDeckConfigById(deckId);

        if (!config) {
          throw new Error(
            "Deck not ready"
          );
        }

        const sheet =
          document.querySelector(
            "[data-dj-performance-library]"
          );

        const status =
          sheet?.querySelector(
            "[data-dj-library-status]"
          );

        const deckName =
          deckId === "d2"
            ? "Deck 2"
            : "Deck 1";

        const totalStartedAt =
          performance.now();

        if (sheet) {
          sheet.dataset.djLibraryBusy =
            "true";
        }

        if (status) {
          status.textContent =
            `Loading ${getDjLibraryTrackTitle(item)} into ${deckName}…`;
        }

        /*
          Fetch the audio and prepared waveform in parallel.
        */
        const [
          audioResult,
          preparedWaveform,
        ] = await Promise.all([
          fetchDjLibraryAudioBlob(
            item,
            status
          ),

          fetchDjLibraryPreparedWaveform(
            item
          ).catch(() => null),
        ]);

        const blob =
          audioResult.blob;

        const fileName =
          getDjLibraryTrackFileName(
            item
          );

        const fileType =
          blob.type ||
          item.mimeType ||
          "audio/mpeg";

        let file;

        try {
          file = new File(
            [blob],
            fileName,
            {
              type: fileType,
            }
          );
        } catch {
          file = blob;

          try {
            Object.defineProperty(
              file,
              "name",
              {
                value: fileName,
              }
            );
          } catch {
            file.name = fileName;
          }

          try {
            Object.defineProperty(
              file,
              "lastModified",
              {
                value: Date.now(),
              }
            );
          } catch {
            file.lastModified =
              Date.now();
          }
        }

        const stageLabels = {
          metadata:
            "Reading saved metadata",
          read:
            "Opening downloaded audio",
          decode:
            "Decoding audio",
          waveform:
            preparedWaveform
              ? "Attaching prepared waveform"
              : "Building quick fallback waveform",
          ready:
            "Ready",
        };

        const nextState =
          await loadFileIntoDeck(
            config,
            file,
            getDjLibraryTrackTitle(
              item
            ),
            {
              libraryItem: item,

              libraryItemId:
                getDjLibraryItemId(
                  item
                ),

              metadata: {
                title:
                  getDjLibraryTrackTitle(
                    item
                  ),
                artist:
                  getDjLibraryTrackArtist(
                    item
                  ),
                bpm:
                  item.djGridBpm ||
                  item.bpm ||
                  null,
                key:
                  getDjLibraryTrackKey(
                    item
                  ),
              },

              preparedAnalysis:
                getDjLibraryPreparedAnalysis(
                  item
                ),

              preparedWaveform,

              /*
                Never repeat full browser BPM/spectral analysis for a
                server-library load.
              */
              skipBrowserAnalysis: true,

              onStage: (stage) => {
                if (
                  status &&
                  stageLabels[stage]
                ) {
                  status.textContent =
                    `${stageLabels[stage]} • ${getDjLibraryTrackTitle(item)} • ${deckName}`;
                }
              },
            }
          );

        if (
          !nextState?.isLoaded ||
          nextState?.error
        ) {
          throw new Error(
            nextState?.error ||
            "Deck load failed"
          );
        }

        const timings =
          nextState.loadTimings || {};

        const totalMs =
          performance.now() -
          totalStartedAt;

        const waveformFetchMs =
          preparedWaveform?.fetchMs ||
          0;

        if (status) {
          const sourceLabel =
            audioResult.cacheHit
              ? "Device cache"
              : audioResult.source ===
                  "performance-copy"
                ? "Remote copy"
                : "Original";

          status.textContent =
            `Loaded ${deckName} in ${formatDjLibraryLoadTime(totalMs)} • ${sourceLabel} ${formatDjLibraryBytes(audioResult.bytes)} • Fetch ${formatDjLibraryLoadTime(audioResult.fetchMs)} • Decode ${formatDjLibraryLoadTime(timings.decodeMs)} • Wave ${formatDjLibraryLoadTime(
              Math.max(
                timings.waveformMs || 0,
                waveformFetchMs
              )
            )}`;
        }

        if (sheet) {
          sheet.dataset.djLibraryBusy =
            "";
        }

        window.setTimeout(
          closeDjPerformanceLibrary,
          1250
        );
      };

    document
      .querySelector(
        ".brDjPerfLibrary"
      )
      ?.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          openDjPerformanceLibrary();
        }
      );

    document.addEventListener(
      "click",
      async (event) => {
        const close =
          event.target?.closest?.(
            "[data-dj-library-close]"
          );

        if (close) {
          closeDjPerformanceLibrary();
          return;
        }

        const refresh =
          event.target?.closest?.(
            "[data-dj-library-refresh]"
          );

        if (refresh) {
          await openDjPerformanceLibrary({
            force: true,
          });
          return;
        }
				
        const resetFilters =
          event.target?.closest?.(
            "[data-dj-library-reset-filters]"
          );

        if (resetFilters) {
          const sheet =
            resetFilters.closest(
              "[data-dj-performance-library]"
            );

          const search =
            sheet?.querySelector(
              "[data-dj-library-search]"
            );

          const sort =
            sheet?.querySelector(
              "[data-dj-library-sort]"
            );

          const prep =
            sheet?.querySelector(
              "[data-dj-library-prep-filter]"
            );

          const bpm =
            sheet?.querySelector(
              "[data-dj-library-bpm-filter]"
            );

          if (search) search.value = "";
          if (sort) sort.value = "title-asc";
          if (prep) prep.value = "all";
          if (bpm) bpm.value = "all";

          writeDjLibraryViewSettings(
            sheet
          );

          renderDjPerformanceLibrary(
            sheet,
            sheet?._brDjLibraryItems ||
              []
          );

          return;
        }

        const prepareButton =
          event.target?.closest?.(
            "[data-dj-library-prepare]"
          );

        if (prepareButton) {
          const sheet =
            prepareButton.closest(
              "[data-dj-performance-library]"
            );

          const itemId =
            prepareButton.closest(
              "[data-dj-library-track]"
            )?.dataset.djLibraryTrack;

          const item = (
            sheet?._brDjLibraryItems ||
            []
          ).find(
            (entry) =>
              getDjLibraryItemId(
                entry
              ) === String(itemId)
          );

          const status =
            sheet?.querySelector(
              "[data-dj-library-status]"
            );

          if (!item) {
            return;
          }

          try {
            await prepareDjLibraryItem(
              item,
              prepareButton,
              status
            );
          } catch (error) {
            if (status) {
              status.textContent =
                error?.message ||
                "Could not prepare track";
            }

            prepareButton.textContent =
              "RETRY";
          }

          return;
        }

        const loadButton =
          event.target?.closest?.(
            "[data-dj-library-load]"
          );

        if (loadButton) {
          const sheet =
            loadButton.closest(
              "[data-dj-performance-library]"
            );

          const itemId =
            loadButton.closest(
              "[data-dj-library-track]"
            )?.dataset.djLibraryTrack;

          const item = (
            sheet?._brDjLibraryItems ||
            []
          ).find(
            (entry) =>
              getDjLibraryItemId(
                entry
              ) === String(itemId)
          );

          const status =
            sheet?.querySelector(
              "[data-dj-library-status]"
            );

          if (!item) {
            if (status) {
              status.textContent =
                "Could not match that library row. Refresh the library and try again.";
            }

            return;
          }

          try {
            loadButton.disabled = true;

            loadButton.classList.add(
              "is-loading"
            );

            await loadLibraryItemIntoDeck(
              loadButton.dataset
                .djLibraryLoad === "d2"
                ? "d2"
                : "d1",
              item
            );
          } catch (error) {
            if (sheet) {
              sheet.dataset.djLibraryBusy =
                "";
            }

            if (status) {
              status.textContent =
                error?.message ||
                "Could not load track";
            }
          } finally {
            loadButton.disabled = false;

            loadButton.classList.remove(
              "is-loading"
            );
          }
        }
      }
    );

    document.addEventListener(
      "input",
      (event) => {
        const search =
          event.target?.closest?.(
            "[data-dj-library-search]"
          );

        if (!search) {
          return;
        }

        const sheet =
          search.closest(
            "[data-dj-performance-library]"
          );

        renderDjPerformanceLibrary(
          sheet,
          sheet?._brDjLibraryItems ||
            []
        );
      }
    );
		
    document.addEventListener(
      "change",
      (event) => {
        const control =
          event.target?.closest?.(
            "[data-dj-library-sort], [data-dj-library-prep-filter], [data-dj-library-bpm-filter]"
          );

        if (!control) return;

        const sheet = control.closest(
          "[data-dj-performance-library]"
        );

        writeDjLibraryViewSettings(
          sheet
        );

        renderDjPerformanceLibrary(
          sheet,
          sheet?._brDjLibraryItems ||
            []
        );
      }
    );

    window.BRMediaDjDeckController = {
      getConfigById:
        getDeckConfigById,

      getStateForConfig:
        getDeckStateForConfig,

      normaliseDeckBeatGrid,

      applyDeckBeatGridUpdate,

      applyDeckGridTransform,

      syncDeckPaletteButtons,

      gridLimits: {
        minBpm:
          DJ_GRID_MIN_BPM,

        maxBpm:
          DJ_GRID_MAX_BPM,

        preRollSeconds:
          DJ_GRID_PRE_ROLL_SECONDS,
      },

      refreshDuoMasterDeck,

      updateDuoSyncUi,

      renderDjRealWaveforms,

      getDeckEffectiveBpm,

      getLiveMixBpmTarget,

      setManualDuoMasterDeck,

      setMasterLiveMixBpm,

      djSyncState,
    };

    window.dispatchEvent(
      new CustomEvent(
        "brmedia:dj-controller-ready"
      )
    );

    window.addEventListener("brmedia:dj-audio-state", (event) => {
      const config = deckConfigs.find((item) => item.deckId === event.detail?.deckId);
      if (!config) return;
      setDeckSkinState(config, event.detail.state);
    });
	
    window.addEventListener("brmedia:dj-transport-state", () => {
      refreshDuoMasterDeck(null, { handoff: true });
      deckConfigs.forEach((config) => {
        if (djSyncState.syncedDeckIds.has(config.deckId) && djSyncState.masterDeckId !== config.deckId) {
          queueSyncedDeckMaintenance(config);
        }
      });
    });
		
    window.setInterval(() => {
      deckConfigs.forEach((config) => {
        const binding = deckBindings.get(config.deckId);
        if (!binding) return;
        const state = binding.deck.getState();
        if (state.isPlaying) setDeckSkinState(config, state);
      });
    }, 250);

    document.addEventListener("click", (event) => {
      if (!event.target?.closest?.("[data-perf-view], [data-duo-tab], [data-deck-tab]")) return;
      scheduleDeckWaveformRefresh();
    });

    window.addEventListener("resize", scheduleDeckWaveformRefresh, { passive: true });
    window.addEventListener("orientationchange", scheduleDeckWaveformRefresh, { passive: true });
  }
	
  function bindMixerCoreFoundation() {
    if (!document.body.classList.contains("brDjPerformanceBody")) return;

    const audioApi = window.BRMediaDjAudioEngine;
    if (!audioApi) return;

    const mixerPanel = $(
      ".brDjMixerPanel"
    );

    if (
      mixerPanel &&
      mixerPanel.dataset
        .brDjBrowserHoldBound !== "true"
    ) {
      mixerPanel.dataset
        .brDjBrowserHoldBound = "true";

      [
        "contextmenu",
        "selectstart",
        "dragstart",
      ].forEach((eventName) => {
        mixerPanel.addEventListener(
          eventName,
          (event) => {
            if (
              event.target?.closest?.(
                "button, label, strong, span, i"
              )
            ) {
              event.preventDefault();
            }
          }
        );
      });
    }

    const setEngineCrossfader = (value = 50) => {
      const raw = Number(value);
      const safeValue = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 50;

      try {
        audioApi.setCrossfader(safeValue);
      } catch (error) {
        console.warn("BRMedia DJ crossfader failed", error);
      }
    };

    const setEngineDeckVolume = (deckId, value = 100) => {
      const raw = Number(value);
      const safeValue = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 100;

      try {
        audioApi.setDeckVolume(deckId, safeValue / 100);
      } catch (error) {
        console.warn("BRMedia DJ channel volume failed", error);
      }

      return safeValue;
    };
		
    const clampMixerValue = (value, min, max, fallback = min) => {
      const raw = Number(value);
      return Number.isFinite(raw) ? Math.max(min, Math.min(max, raw)) : fallback;
    };

    const mixerControlState = {
      master: 100,
      d1: { filter: 50, gain: 100, high: 100, mid: 100, low: 100, kills: { high: false, mid: false, low: false } },
      d2: { filter: 50, gain: 100, high: 100, mid: 100, low: 100, kills: { high: false, mid: false, low: false } },
    };

    const setKnobDisplay = (button, value, min, max, label, centreValue = 100) => {
      const safeValue = clampMixerValue(value, min, max, centreValue);
      const safeCentre = clampMixerValue(centreValue, min, max, 100);
      const downSpan = Math.max(1, safeCentre - min);
      const upSpan = Math.max(1, max - safeCentre);
      const angle = safeValue <= safeCentre
        ? -135 + ((safeValue - min) / downSpan) * 135
        : ((safeValue - safeCentre) / upSpan) * 135;
      const fill = safeValue <= safeCentre
        ? 50 - ((safeCentre - safeValue) / downSpan) * 42
        : 50 + ((safeValue - safeCentre) / upSpan) * 42;
      const indicator = button?.querySelector("i");
      const text = button?.querySelector("span");

      button?.style.setProperty("--br-dj-knob-fill", `${fill.toFixed(1)}%`);
      button?.style.setProperty("--br-dj-knob-angle", `${angle.toFixed(1)}deg`);
      if (button) button.dataset.mixerValue = safeValue.toFixed(1);
      if (indicator) indicator.style.transform = `rotate(${angle.toFixed(1)}deg)`;
      if (text) text.textContent = label;
    };

    const bindMixerKnobDrag = (button, options = {}) => {
      if (!button) return;

      const min = Number(options.min ?? 0);
      const max = Number(options.max ?? 100);
      const sensitivity = Number(options.sensitivity ?? ((max - min) / 160));
      const resetValue = Number(options.resetValue ?? options.centreValue ?? 100);
      let startY = 0;
      let startValue = Number(options.value ?? min);
      let pointerId = null;
      let lastTapAt = 0;

      button.classList.add("is-audio-bound");
      button.title = "Drag up/down to adjust. Double tap to reset.";

      const applyValue = (nextValue) => {
        const safeValue = clampMixerValue(nextValue, min, max, startValue);
        options.value = safeValue;
        options.onChange?.(safeValue);
      };

      const resetKnob = (event) => {
        event?.preventDefault?.();
        applyValue(resetValue);
      };

      button.addEventListener("pointerdown", (event) => {
        if (button.disabled) return;

        const now = window.performance?.now?.() || Date.now();
        if (now - lastTapAt < 320) {
          lastTapAt = 0;
          resetKnob(event);
          return;
        }
        lastTapAt = now;

        pointerId = event.pointerId;
        startY = event.clientY;
        startValue = Number(options.value ?? min);
        button.classList.add("is-dragging");
        event.preventDefault();

        try {
          button.setPointerCapture?.(event.pointerId);
        } catch {}
      });

      button.addEventListener("pointermove", (event) => {
        if (pointerId !== event.pointerId) return;
        const delta = (startY - event.clientY) * sensitivity;
        applyValue(startValue + delta);
      });

      const stopDrag = (event) => {
        if (pointerId !== null && event?.pointerId != null && pointerId !== event.pointerId) return;
        pointerId = null;
        button.classList.remove("is-dragging");
      };

      button.addEventListener("pointerup", stopDrag);
      button.addEventListener("pointercancel", stopDrag);
      button.addEventListener("lostpointercapture", stopDrag);
      button.addEventListener("dblclick", resetKnob);
    };

    const formatEqLabel = (value) => `${Math.round(clampMixerValue(value, 0, 150, 100))}%`;

    const formatFilterLabel = (value) => {
      const safeValue = clampMixerValue(value, 0, 100, 50);
      if (safeValue > 45 && safeValue < 55) return "Centre";
      if (safeValue <= 45) return `LP ${Math.round(((45 - safeValue) / 45) * 100)}%`;
      return `HP ${Math.round(((safeValue - 55) / 45) * 100)}%`;
    };

    const applyMasterVolume = (button, value = mixerControlState.master) => {
      const safeValue = clampMixerValue(value, 0, 150, 100);
      mixerControlState.master = safeValue;

      try {
        audioApi.setMasterVolume(safeValue / 100);
      } catch (error) {
        console.warn("BRMedia DJ master volume failed", error);
      }

      setKnobDisplay(button, safeValue, 0, 150, `${Math.round(safeValue)}%`, 100);
    };

    const applyDeckTrim = (deckId, button, value = 100) => {
      const safeValue = clampMixerValue(value, 0, 150, 100);
      mixerControlState[deckId].gain = safeValue;

      try {
        audioApi.setDeckTrim?.(deckId, safeValue / 100);
      } catch (error) {
        console.warn("BRMedia DJ trim failed", error);
      }

      setKnobDisplay(button, safeValue, 0, 150, `${Math.round(safeValue)}%`, 100);
    };

    const applyDeckFilter = (deckId, button, value = 50) => {
      const safeValue = clampMixerValue(value, 0, 100, 50);
      mixerControlState[deckId].filter = safeValue;

      try {
        audioApi.setDeckFilter?.(deckId, safeValue);
      } catch (error) {
        console.warn("BRMedia DJ filter failed", error);
      }

      setKnobDisplay(button, safeValue, 0, 100, formatFilterLabel(safeValue), 50);
    };

    const applyDeckEq = (deckId, band, button, value = 100) => {
      const safeValue = clampMixerValue(value, 0, 150, 100);
      mixerControlState[deckId][band] = safeValue;

      try {
        audioApi.setDeckEq?.(deckId, band, safeValue);
      } catch (error) {
        console.warn("BRMedia DJ EQ failed", error);
      }

      setKnobDisplay(button, safeValue, 0, 150, formatEqLabel(safeValue), 100);
    };

    const getKillLevelKey = (value = 100) => {
      const safeValue = clampMixerValue(value, 0, 150, 100);
      if (safeValue > 100) return "boost";
      if (safeValue >= 100) return "100";
      if (safeValue >= 75) return "75";
      if (safeValue >= 50) return "50";
      if (safeValue >= 25) return "25";
      return "0";
    };

    const stepKillValue = (value = 100) => {
      const safeValue = clampMixerValue(value, 0, 150, 100);
      if (safeValue > 125) return 125;
      if (safeValue > 100) return 100;
      if (safeValue > 75) return 75;
      if (safeValue > 50) return 50;
      if (safeValue > 25) return 25;
      return 0;
    };

    const setupDeckMixerControls = (deckId, channelSelector) => {
      const channel = $(channelSelector);
      if (!channel) return;

      const filterButton = channel.querySelector(".brDjMixerKnob.is-filter");
      const gainButton = channel.querySelector(".brDjMixerKnob.is-gain");
      const eqButtons = Array.from(channel.querySelectorAll(".brDjMixerEqStack .brDjMixerKnob.is-eq"));
      const killButtons = Array.from(channel.querySelectorAll(".brDjMixerKillStack button"));
      const eqBands = ["high", "mid", "low"];

      const syncKillButton = (button, band) => {
        if (!button) return;
        const value = clampMixerValue(mixerControlState[deckId][band], 0, 150, 100);
        button.dataset.killLevel = getKillLevelKey(value);
        button.setAttribute("aria-pressed", value <= 0 ? "true" : "false");
        button.textContent = `${band.toUpperCase()} ${Math.round(value)}%`;
        button.title = "Tap to step down 25%. Long press to reset to 100%.";
      };

      applyDeckFilter(deckId, filterButton, mixerControlState[deckId].filter);
      bindMixerKnobDrag(filterButton, {
        min: 0,
        max: 100,
        value: mixerControlState[deckId].filter,
        centreValue: 50,
        resetValue: 50,
        sensitivity: 0.45,
        onChange: (value) => applyDeckFilter(deckId, filterButton, value),
      });

      applyDeckTrim(deckId, gainButton, mixerControlState[deckId].gain);
      bindMixerKnobDrag(gainButton, {
        min: 0,
        max: 150,
        value: mixerControlState[deckId].gain,
        centreValue: 100,
        resetValue: 100,
        sensitivity: 0.55,
        onChange: (value) => applyDeckTrim(deckId, gainButton, value),
      });

      eqButtons.forEach((button, index) => {
        const band = eqBands[index] || "mid";
        const killButton = killButtons[index];
        applyDeckEq(deckId, band, button, mixerControlState[deckId][band]);
        syncKillButton(killButton, band);
        bindMixerKnobDrag(button, {
          min: 0,
          max: 150,
          value: mixerControlState[deckId][band],
          centreValue: 100,
          resetValue: 100,
          sensitivity: 0.62,
          onChange: (value) => {
            applyDeckEq(deckId, band, button, value);
            syncKillButton(killButton, band);
          },
        });
      });

      killButtons.forEach((button, index) => {
        const band = eqBands[index] || "mid";
        const eqButton = eqButtons[index];
        let longPressTimer = null;
        let didLongPress = false;

        syncKillButton(button, band);

        const resetKill = () => {
          mixerControlState[deckId][band] = 100;
          applyDeckEq(deckId, band, eqButton, 100);
          syncKillButton(button, band);
        };

        const stepKill = () => {
          const nextValue = stepKillValue(mixerControlState[deckId][band]);
          mixerControlState[deckId][band] = nextValue;
          applyDeckEq(deckId, band, eqButton, nextValue);
          syncKillButton(button, band);
        };

        button.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          event.stopPropagation();

          didLongPress = false;
          window.clearTimeout(longPressTimer);
          longPressTimer = window.setTimeout(() => {
            didLongPress = true;
            resetKill();
          }, 560);

          try {
            button.setPointerCapture?.(event.pointerId);
          } catch {}
        });

        button.addEventListener("pointerup", () => {
          window.clearTimeout(longPressTimer);
          if (didLongPress) return;
          stepKill();
        });

        button.addEventListener("pointercancel", () => window.clearTimeout(longPressTimer));
        button.addEventListener("lostpointercapture", () => window.clearTimeout(longPressTimer));
        button.addEventListener("click", (event) => event.preventDefault());
      });
    };

    const masterKnob = $(".brDjMixerMasterKnob");
    applyMasterVolume(masterKnob, mixerControlState.master);
    bindMixerKnobDrag(masterKnob, {
      min: 0,
      max: 150,
      value: mixerControlState.master,
      centreValue: 100,
      resetValue: 100,
      sensitivity: 0.45,
      onChange: (value) => applyMasterVolume(masterKnob, value),
    });

    setupDeckMixerControls("d1", ".brDjMixerChannel.is-deck-1");
    setupDeckMixerControls("d2", ".brDjMixerChannel.is-deck-2");

    $$("[data-vinyl-crossfader]").forEach((range) => {
      range.addEventListener("input", () => setEngineCrossfader(range.value));
      range.addEventListener("change", () => setEngineCrossfader(range.value));
    });

    $$("[data-vinyl-crossfader-centre]").forEach((button) => {
      button.addEventListener("click", () => setEngineCrossfader(50));
    });

    [
      { deckId: "d1", selector: ".brDjMixerChannel.is-deck-1 .brDjMixerVolumeRange" },
      { deckId: "d2", selector: ".brDjMixerChannel.is-deck-2 .brDjMixerVolumeRange" },
    ].forEach((config) => {
      $$(config.selector).forEach((range) => {
        const syncVolume = () => {
          const safeValue = setEngineDeckVolume(config.deckId, range.value);
          const volumeBox = range.closest(".brDjMixerVolume");
          const valueLabel = volumeBox?.querySelector("em");

          if (volumeBox) {
            const isSafariMixer = document.body.classList.contains("brDjIosSafariBrowser");
            const thumbHeight = isSafariMixer ? 48 : 58;
            const topPad = isSafariMixer ? 13 : 22;
            const bottomPad = 20;
            const travel = Math.max(14, volumeBox.clientHeight - thumbHeight - topPad - bottomPad);
            const thumbTop = topPad + ((100 - safeValue) / 100) * travel;
            volumeBox.style.setProperty("--br-dj-fader-thumb-top", `${thumbTop.toFixed(1)}px`);
          }

          if (valueLabel) valueLabel.textContent = `${Math.round(safeValue)}%`;
        };

        range.addEventListener("input", syncVolume);
        range.addEventListener("change", syncVolume);
        syncVolume();
      });
    });

    const updateMeters = () => {
      try {
        const levels = audioApi.getMixerLevels?.();
        if (levels) {
          const meterBars = $$(".brDjMixerMeters span i");
          const values = [levels.d1, levels.master, levels.d2];

          meterBars.forEach((bar, index) => {
            const level = Math.max(0.03, Math.min(1, Number(values[index]) || 0));
            bar.style.height = `${Math.round(level * 100)}%`;
          });
        }
      } catch {}

      window.requestAnimationFrame(updateMeters);
    };

    setEngineCrossfader($("[data-vinyl-crossfader]")?.value || 50);
    window.requestAnimationFrame(updateMeters);
  }

  function bindPerformance() {
    const fxBoardOrder = ["board1", "board2", "board3", "board4"];
    const fxBoardMeta = {
      board1: { label: "Board 1", tone: "Orange board", count: "9 performance pads" },
      board2: { label: "Board 2", tone: "Blue board", count: "9 performance pads" },
      board3: { label: "Board 3", tone: "Green board", count: "9 performance pads" },
      board4: { label: "Board 4", tone: "Red board", count: "9 performance pads" },
    };

    const defaultFxBoardMap = {
      board1: ["echo", "dub-echo", "delay", "lpf", "hpf", "beat-roll", "flanger", "phaser", "reverb"],
      board2: ["noise", "vinyl-brake", "gater", "ping-pong", "low-cut-echo", "spiral", "brake-echo", "tape-delay", "crush"],
      board3: ["bitcrusher", "stutter", "reverse-roll", "freeze", "auto-pan", "sweep", "space", "shimmer", "mobius"],
      board4: ["granular", "saturator", "ring-mod", "pitch-shift", "key-lock", "chorus", "chorus-flanger", "combo-filter", "duck-delay"],
    };

    function syncVinylDeckUi(deck = document.body.dataset.djVinylDeck || "a") {
      const safeDeck = deck === "b" ? "b" : "a";
      document.body.dataset.djVinylDeck = safeDeck;

      $$("[data-vinyl-deck]").forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.vinylDeck === safeDeck);
      });
    }

    function syncVinylCrossfaderUi(value = $("[data-vinyl-crossfader]")?.value || "50") {
      const raw = Number(value);
      const safeValue = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 50;
      const distance = Math.abs(safeValue - 50) / 50;
      const zone = safeValue < 45 ? "left" : safeValue > 55 ? "right" : "centre";

      document.body.style.setProperty("--br-dj-crossfade-pos", `${safeValue}%`);
      document.body.style.setProperty("--br-dj-crossfade-intensity", distance.toFixed(3));
      document.body.dataset.djCrossfaderZone = zone;

      $$("[data-vinyl-crossfader]").forEach((range) => {
        if (String(range.value) !== String(safeValue)) range.value = String(safeValue);
      });
    }

    function getPerformanceFxBoardEffects(board) {
      const library = getFxLibrary();
      const data = readFxSetup();
      const assignments = data.assignments || {};
      const hasCustomAssignments = Object.keys(assignments).length > 0;

      const selected = hasCustomAssignments
        ? library.filter((effect) => assignments[effect.id] === board)
        : (defaultFxBoardMap[board] || []).map((id) => library.find((effect) => effect.id === id)).filter(Boolean);

      return Array.from({ length: 9 }, (_, index) => selected[index] || null);
    }

    function renderPerformanceFxBoard() {
      const grid = $("[data-dj-performance-fx-pads]");
      if (!grid) return;

      const board = fxBoardOrder.includes(document.body.dataset.djFxBoard) ? document.body.dataset.djFxBoard : "board1";
      const pads = getPerformanceFxBoardEffects(board);

      grid.innerHTML = pads.map((effect, index) => {
        const padNumber = String(index + 1).padStart(2, "0");

        if (!effect) {
          return `
            <button class="brDjPerfFxPad is-empty" type="button" disabled>
              <span>Pad ${padNumber}</span>
              <strong>Empty</strong>
              <em>Assign in FX setup</em>
            </button>
          `;
        }

        return `
          <button class="brDjPerfFxPad" type="button" data-dj-perf-fx-pad="${escapeHtml(effect.id)}" aria-pressed="false">
            <span>Pad ${padNumber}</span>
            <strong>${escapeHtml(effect.name)}</strong>
            <em>${escapeHtml(effect.family)}</em>
          </button>
        `;
      }).join("");
    }

    function syncPerformanceFxBoardUi(board = document.body.dataset.djFxBoard || "board1") {
      const safeBoard = fxBoardOrder.includes(board) ? board : "board1";
      const meta = fxBoardMeta[safeBoard];

      document.body.dataset.djFxBoard = safeBoard;

      const title = $("[data-dj-performance-fx-title]");
      if (title) title.textContent = meta.label;

      const subtitle = $("[data-dj-performance-fx-subtitle]");
      if (subtitle) subtitle.textContent = `${meta.tone} · ${meta.count}`;

      $$("[data-dj-performance-fx-indicator]").forEach((indicator) => {
        indicator.classList.toggle("is-active", indicator.dataset.djPerformanceFxIndicator === safeBoard);
      });

      renderPerformanceFxBoard();
    }

    function nextPerformanceFxBoard() {
      const current = document.body.dataset.djFxBoard || "board1";
      const currentIndex = fxBoardOrder.indexOf(current);
      return fxBoardOrder[(currentIndex + 1 + fxBoardOrder.length) % fxBoardOrder.length];
    }
		
    function syncMixerMode(mode = document.body.dataset.djMixerPanelMode || "eq") {
      const safeMode = mode === "kill" ? "kill" : "eq";
      document.body.dataset.djMixerPanelMode = safeMode;
    }

    function nextMixerMode() {
      return document.body.dataset.djMixerPanelMode === "kill" ? "eq" : "kill";
    }
		
    function syncDuoMainLayout(
      layout = "split"
    ) {
      const mainPanel = $(
        ".brDjDuoMainPanel"
      );

      /*
        app.js also runs on the DJ Studio page,
        where the DUO performance panel does not exist.
      */
      if (!mainPanel) return;

      const safeLayout =
        layout === "linked"
          ? "linked"
          : "split";

      document.body.dataset
        .djDuoMainLayout = safeLayout;

      $$(
        "[data-duo-main-layout]",
        mainPanel
      ).forEach((panel) => {
        const active =
          panel.dataset
            .duoMainLayout ===
          safeLayout;

        panel.classList.toggle(
          "is-active",
          active
        );

        panel.hidden = !active;

        panel.setAttribute(
          "aria-hidden",
          active ? "false" : "true"
        );

        if ("inert" in panel) {
          panel.inert = !active;
        }

        if (active) {
          /*
            Commit the linked/split replacement
            immediately on iPhone and Android.
          */
          void panel.offsetHeight;
        }
      });

      const mainButton = $(
        "[data-duo-tab='main']"
      );

      mainButton?.classList.toggle(
        "is-linked-main",
        safeLayout === "linked"
      );

      mainButton?.setAttribute(
        "aria-label",
        safeLayout === "linked"
          ? "Return to separate DUO controls"
          : "Open linked DUO controls"
      );
    }
		
    function setPerformancePanelActive(panel, active) {
      if (!panel) return;

      panel.classList.toggle("is-active", active);
      panel.toggleAttribute("hidden", !active);
      panel.setAttribute("aria-hidden", active ? "false" : "true");

      if ("inert" in panel) {
        panel.inert = !active;
      }

      /*
        Android Chrome can retain a Canvas/composited layer after changing
        tabs. Reading offsetHeight after revealing the new panel forces the
        browser to commit the correct panel before it paints again.
      */
      if (active && document.body.classList.contains("brDjAndroid")) {
        void panel.offsetHeight;
      }
    }

    function syncDeckTab(tab = document.body.dataset.djDeckTab || "main") {
      const safeTab = ["main", "grid", "hot-cue", "memory", "stems"].includes(tab) ? tab : "main";
      document.body.dataset.djDeckTab = safeTab;

      $$("[data-deck-tab]").forEach((button) => {
        const active = button.dataset.deckTab === safeTab;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });

      $$("[data-deck-panel]").forEach((panel) => {
        setPerformancePanelActive(panel, panel.dataset.deckPanel === safeTab);
      });
    }

    $$("[data-perf-view]").forEach((button) => {
      button.addEventListener("click", () => {
        const view = button.dataset.perfView || "duo";
        document.body.dataset.djPerfView = view;

        $$("[data-perf-view]").forEach((nav) => {
          const active = nav.dataset.perfView === view;
          nav.classList.toggle("is-active", active);
          nav.setAttribute("aria-pressed", active ? "true" : "false");
        });

        $$("[data-dj-perf-panel]").forEach((panel) => {
          setPerformancePanelActive(panel, panel.dataset.djPerfPanel === view);
        });

        if (view === "deck-1" || view === "deck-2") {
          syncDeckTab();
        }
      });
    });

    $$("[data-duo-tab]").forEach((button) => {
      button.addEventListener("click", (event) => {
        const tab = button.dataset.duoTab || "main";
        const currentTab = document.body.dataset.djDuoTab || "main";

        const alreadyActive =
          button.classList.contains(
            "is-active"
          );

        if (tab === "record") {
          const isLive = document.body.dataset.djRecordState === "live";
          const nextState = isLive ? "ready" : "live";
          document.body.dataset.djRecordState = nextState;
          button.classList.toggle("is-recording", nextState === "live");
          button.setAttribute("aria-pressed", nextState === "live" ? "true" : "false");

          const label = button.querySelector("span");
          if (label) label.textContent = nextState === "live" ? "REC Live" : "REC Ready";
          return;
        }

        /*
          MAIN has two layouts. A second press on
          the already-active MAIN button changes
          only the transport row and must not be
          swallowed by the normal tab switch.
        */
        if (
          tab === "main" &&
          alreadyActive &&
          currentTab === "main"
        ) {
          event.preventDefault();
          event.stopPropagation();

          syncDuoMainLayout(
            document.body.dataset
              .djDuoMainLayout ===
              "linked"
              ? "split"
              : "linked"
          );

          scheduleDeckWaveformRefresh();
          return;
        }

        if (tab === "main") {
          syncDuoMainLayout("split");
        }

        if (tab === "vinyl") {
          const nextDeck = currentTab === "vinyl" && document.body.dataset.djVinylDeck === "a" ? "b" : "a";
          syncVinylDeckUi(nextDeck);
        }

        if (tab === "fx") {
          const nextBoard = currentTab === "fx" ? nextPerformanceFxBoard() : "board1";
          syncPerformanceFxBoardUi(nextBoard);
        }

        if (tab === "mixer") {
          const nextMode = currentTab === "mixer" ? nextMixerMode() : "eq";
          syncMixerMode(nextMode);
        }

        document.body.dataset.djDuoTab = tab;

        $$("[data-duo-tab]").forEach((nav) => {
          const active = nav.dataset.duoTab === tab;
          nav.classList.toggle("is-active", active);
          nav.setAttribute("aria-pressed", active ? "true" : "false");
        });

        $$("[data-dj-duo-panel]").forEach((panel) => {
          setPerformancePanelActive(panel, panel.dataset.djDuoPanel === tab);
        });
      });
    });

    function syncDuoSyncRailState(rail) {
      if (!rail) return;

      const buttons = Array.from(rail.querySelectorAll(".brDjDuoSyncBtn"));
      const armedButtons = buttons.filter((button) => button.classList.contains("is-sync-armed"));
      const linked = armedButtons.length >= 2;

      rail.classList.toggle("is-sync-linked", linked);
      rail.classList.toggle("has-sync-armed", armedButtons.length > 0);

      buttons.forEach((button) => {
        const armed = button.classList.contains("is-sync-armed");
        const deck = button.closest(".brDjDuoSyncDeck");
        button.classList.toggle("is-sync-linked", linked && armed);
        button.setAttribute("aria-pressed", armed ? "true" : "false");
        deck?.classList.toggle("is-sync-armed", armed);
        deck?.classList.toggle("is-sync-linked", linked && armed);
      });

      rail.querySelectorAll(".brDjDuoBpmPopup").forEach((button) => {
        button.classList.remove("is-sync-armed", "is-sync-linked");
        button.setAttribute("aria-pressed", "false");
      });
    }

    function getDuoDeckController() {
      return window.BRMediaDjDeckController || null;
    }

    function getDuoSheetDeckConfig(sheetOrButton) {
      const controller = getDuoDeckController();
      const deckNode = sheetOrButton?.closest?.(".brDjDuoSyncDeck");
      if (deckNode) return controller?.getConfigById?.(deckNode.classList.contains("is-deck-2") ? "d2" : "d1") || null;
      const sheet = sheetOrButton?.matches?.("[data-dj-bpm-sheet]") ? sheetOrButton : $("[data-dj-bpm-sheet]");
      return controller?.getConfigById?.(sheet?.dataset.djBpmDeck === "2" ? "d2" : "d1") || null;
    }

    function openDuoBpmSheet(button) {
      const sheet = $("[data-dj-bpm-sheet]");
      if (!sheet || !button) return;

      const controller = getDuoDeckController();
      const config = getDuoSheetDeckConfig(button);

      if (!controller || !config) return;

      const deck =
        config.deckId === "d2" ? "2" : "1";

      const state =
        controller.getStateForConfig(config);

      const grid =
        controller.normaliseDeckBeatGrid(
          config,
          state
        );

      const syncState =
        controller.djSyncState || {};

      const isMaster =
        syncState.masterDeckId ===
        config.deckId;
				
      const hasMaster = Boolean(
        syncState.masterDeckId
      );

      const canEditLiveBpm =
        isMaster || !hasMaster;

      const masterDeck =
        syncState.masterDeckId === "d2"
          ? "2"
          : "1";

      const liveBpm =
        (
          isMaster ||
          syncState.syncedDeckIds?.has?.(
            config.deckId
          )
        )
          ? controller
              .getLiveMixBpmTarget?.(
                config
              ) || grid.bpm
          : controller.getDeckEffectiveBpm(
              config,
              state
            ) || grid.bpm;

      sheet.dataset.djBpmDeck = deck;

      sheet.dataset.djBpmReadOnly =
        canEditLiveBpm
          ? "false"
          : "true";

      const title = sheet.querySelector(
        "[data-dj-bpm-sheet-title]"
      );

      if (title) {
        title.textContent = isMaster
          ? `Deck ${deck} Live BPM`
          : hasMaster
            ? `Controlled by Deck ${masterDeck} Master`
            : `Deck ${deck} Pending Live BPM`;
      }

      const input = sheet.querySelector(
        "[data-dj-bpm-field='bpm']"
      );

      if (input) {
        input.value = liveBpm
          ? liveBpm.toFixed(2)
          : "";

        input.disabled =
          !canEditLiveBpm;
      }

      sheet
        .querySelectorAll(
          "[data-dj-bpm-toggle]"
        )
        .forEach((toggle) => {
          const key =
            toggle.dataset.djBpmToggle;

          const active =
            key === "master"
              ? (
                  syncState.masterDeckId ===
                    config.deckId ||
                  !hasMaster
                )
              : key === "q"
                ? Boolean(config.quantize)
                : key === "mt"
                  ? Boolean(
                      config.masterTempo
                    )
                  : key === "key-sync"
                    ? Boolean(config.keySync)
                    : false;

          toggle.classList.toggle(
            "is-active",
            active
          );

          toggle.setAttribute(
            "aria-pressed",
            active ? "true" : "false"
          );
        });

      sheet.classList.add("is-open");

      document.body.classList.add(
        "brDjBpmSheetOpen"
      );
    }

    function closeDuoBpmSheet() {
      const sheet = $(
        "[data-dj-bpm-sheet]"
      );

      if (!sheet) return;

      sheet.classList.remove("is-open");

      document.body.classList.remove(
        "brDjBpmSheetOpen"
      );
    }

    async function saveDuoBpmSheet() {
      const sheet = $(
        "[data-dj-bpm-sheet]"
      );

      if (!sheet) return;

      const controller =
        getDuoDeckController();

      const config =
        getDuoSheetDeckConfig(sheet);

      if (!controller || !config) return;

      sheet
        .querySelectorAll(
          "[data-dj-bpm-toggle]"
        )
        .forEach((toggle) => {
          const active =
            toggle.classList.contains(
              "is-active"
            );

          const key =
            toggle.dataset.djBpmToggle;

          if (key === "master") {
            controller
              .setManualDuoMasterDeck?.(
                config,
                active
              );
          }

          if (key === "q") {
            config.quantize = active;
          }

          if (key === "mt") {
            config.masterTempo = active;
          }

          if (key === "key-sync") {
            config.keySync = active;
          }
        });

      const input = sheet.querySelector(
        "[data-dj-bpm-field='bpm']"
      );

      const value = Number.parseFloat(
        input?.value || ""
      );

      const isMaster =
        controller.djSyncState
          ?.masterDeckId ===
        config.deckId;

      /*
        This changes temporary live mix BPM only.
        It never writes to the track's saved Grid BPM.
      */
      if (
        isMaster &&
        Number.isFinite(value)
      ) {
        await controller
          .setMasterLiveMixBpm?.(
            config,
            value
          );
      }

      controller.updateDuoSyncUi();

      controller.renderDjRealWaveforms(
        config,
        controller.getStateForConfig(
          config
        )
      );

      closeDuoBpmSheet();
    }

    document.addEventListener(
      "click",
      (event) => {
        const syncButton =
          event.target?.closest?.(
            ".brDjDuoSyncBtn"
          );

        if (syncButton) return;

        const bpmButton =
          event.target?.closest?.(
            ".brDjDuoBpmPopup"
          );

        if (bpmButton) {
          openDuoBpmSheet(bpmButton);
          return;
        }

        const sheetClose =
          event.target?.closest?.(
            "[data-dj-bpm-sheet-close]"
          );

        if (sheetClose) {
          closeDuoBpmSheet();
          return;
        }

        const sheetSave =
          event.target?.closest?.(
            "[data-dj-bpm-sheet-save]"
          );

        if (sheetSave) {
          void saveDuoBpmSheet();
          return;
        }

        const sheetToggle =
          event.target?.closest?.(
            "[data-dj-bpm-toggle]"
          );

        if (sheetToggle) {
          const active =
            !sheetToggle.classList.contains(
              "is-active"
            );

          sheetToggle.classList.toggle(
            "is-active",
            active
          );

          sheetToggle.setAttribute(
            "aria-pressed",
            active ? "true" : "false"
          );

          /*
            Selecting Set Master allows the new
            Master BPM to be entered before Save.
          */
          if (
            sheetToggle.dataset
              .djBpmToggle === "master"
          ) {
            const activeSheet =
              sheetToggle.closest(
                "[data-dj-bpm-sheet]"
              );

            const input =
              activeSheet?.querySelector(
                "[data-dj-bpm-field='bpm']"
              );

            if (input) {
              input.disabled = !active;
            }
          }
        }
      }
    );
		
    $$("[data-deck-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        syncDeckTab(button.dataset.deckTab || "main");
      });
    });

    syncDeckTab();

    $$("[data-dj-perf-panel], [data-dj-duo-panel]").forEach((panel) => {
      setPerformancePanelActive(panel, panel.classList.contains("is-active"));
    });
		
    document.addEventListener("click", (event) => {
      const listOpen = event.target?.closest?.(".brDjCueMemoryListLink");
      if (listOpen) {
        const page = listOpen.closest(".brDjCueMemoryPage");
        if (!page) return;
        page.classList.add("is-list-open");
        return;
      }

      const listBack = event.target?.closest?.("[data-cue-memory-list-back]");
      if (listBack) {
        const page = listBack.closest(".brDjCueMemoryPage");
        if (!page) return;
        page.classList.remove("is-list-open");
      }
    });

    document.addEventListener("click", (event) => {
      const pad = event.target?.closest?.("[data-dj-perf-fx-pad]");
      if (!pad || pad.disabled) return;

      const active = !pad.classList.contains("is-active");
      pad.classList.toggle("is-active", active);
      pad.setAttribute("aria-pressed", active ? "true" : "false");
    });

    $$("[data-vinyl-deck-switch]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextDeck = document.body.dataset.djVinylDeck === "b" ? "a" : "b";
        syncVinylDeckUi(nextDeck);
      });
    });

    $$("[data-vinyl-crossfader]").forEach((range) => {
      range.addEventListener("input", () => syncVinylCrossfaderUi(range.value));
      range.addEventListener("change", () => syncVinylCrossfaderUi(range.value));
    });

    $$("[data-vinyl-crossfader-centre]").forEach((button) => {
      button.addEventListener("click", () => syncVinylCrossfaderUi(50));
    });

    bindDeck1EngineFoundation();
    bindMixerCoreFoundation();
    syncVinylDeckUi();
    syncVinylCrossfaderUi();
    syncPerformanceFxBoardUi();
    syncDuoMainLayout("split");
    syncMixerMode();
  }

  function applyPerformanceViewportLock() {
    if (!document.body.classList.contains("brDjPerformanceBody")) return;

    document.documentElement.classList.add("brDjPerformanceRoot");

    const readStandaloneMode = () => {
      return Boolean(
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        window.navigator?.standalone === true
      );
    };

    const setViewportVars = () => {
      const standalone = readStandaloneMode();
      const viewport = window.visualViewport;
      const height = Math.round(viewport?.height || window.innerHeight || document.documentElement.clientHeight || 0);
      const width = Math.round(viewport?.width || window.innerWidth || document.documentElement.clientWidth || 0);
      const ua = window.navigator?.userAgent || "";
      const isIos = /iPad|iPhone|iPod/.test(ua) || (window.navigator?.platform === "MacIntel" && window.navigator?.maxTouchPoints > 1);
      const isAndroid = /Android/i.test(ua);
      const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
      const isIosSafariBrowser = Boolean(isIos && isSafari && !standalone);

      if (height > 0) document.documentElement.style.setProperty("--br-dj-vh", `${height}px`);
      if (width > 0) document.documentElement.style.setProperty("--br-dj-vw", `${width}px`);

      document.body.classList.toggle("brDjStandalone", standalone);
      document.body.classList.toggle("brDjBrowserChrome", !standalone);
      document.body.classList.toggle("brDjIosSafariBrowser", isIosSafariBrowser);
      document.body.classList.toggle("brDjAndroid", isAndroid);
      document.body.dataset.djViewportMode = standalone ? "standalone" : "browser";
      document.body.dataset.djBrowserKind = isIosSafariBrowser
        ? "ios-safari"
        : isAndroid
          ? "android"
          : standalone
            ? "standalone"
            : "browser";
    };

    const scheduleViewportUpdate = () => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(setViewportVars);
      });
    };

    setViewportVars();
    scheduleViewportUpdate();

    [80, 220, 500, 900].forEach((delay) => {
      window.setTimeout(scheduleViewportUpdate, delay);
    });

    window.addEventListener("resize", scheduleViewportUpdate, { passive: true });
    window.addEventListener("orientationchange", scheduleViewportUpdate, { passive: true });
    document.addEventListener("visibilitychange", scheduleViewportUpdate);

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", scheduleViewportUpdate, { passive: true });
      window.visualViewport.addEventListener("scroll", scheduleViewportUpdate, { passive: true });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyPerformanceViewportLock();
    bindStudio();
    bindPerformance();
    bindBuildChecklist();
    bindMixSetup();
    bindSetPlan();
    bindFxSetup();
    bindRecordSetup();
    setStudioView("studio");
    hydrateDjIcons(document);

    [180, 700, 1400].forEach((delay) => {
      window.setTimeout(() => normaliseDjPlayButtonIconPairs(document), delay);
    });
  });
})();