(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const fileInput = $("file");
  const start = $("start");
  const pause = $("pause");
  const cancel = $("cancel");
  const retry = $("retry");
  const duplicate = $("duplicate");
  let file = null;
  let client = null;
  let persisted = null;
  let currentValidation = null;
  let loadGeneration = 0;

  const storeKey = "brmedia.guest-upload.v1";
  const save = (snapshot) => {
    persisted = snapshot;
    try { localStorage.setItem(storeKey, JSON.stringify(snapshot)); } catch {}
  };
  try { persisted = JSON.parse(localStorage.getItem(storeKey) || "null"); } catch {}

  const message = (state, guidance) => {
    $("state").textContent = state;
    $("guidance").textContent = guidance;
  };
  const headers = () => ({ Authorization: `Bearer ${client.snapshot().token}` });
  const validate = async () => {
    message("Validating", "BRMedia is checking the real media stream on the server.");
    const session = client.snapshot().session;
    const response = await fetch(`/api/v1/uploads/${session.id}/validation`, {
      method: "POST", credentials: "same-origin", headers: headers(),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Validation failed");
    renderValidation(body.validation);
  };
  const renderValidation = (validation) => {
    currentValidation = validation;
    duplicate.hidden = validation.state !== "duplicate-review";
    retry.hidden = !["validation-failed", "unsupported", "cancelled"].includes(validation.state);
    $("deck-actions").hidden = validation.state !== "guest-ready" || !validation.guestId;
    if (validation.state === "guest-ready") {
      message("Guest track ready", "Validated and retained temporarily. Choose a native deck; loading will not autoplay.");
    } else if (validation.state === "duplicate-review") {
      message("Duplicate decision needed", "The uploaded copy remains preserved while you decide.");
    } else if (validation.state === "unsupported") {
      message("Valid, but unsupported", validation.errorMessage || "No conversion is performed in this milestone.");
    } else if (validation.state === "validation-failed") {
      message("Validation failed", validation.errorMessage || "The completed transfer is preserved for retry.");
    } else {
      message(validation.state.replaceAll("-", " "), "Server validation is in progress.");
    }
  };
  const getClientId = () => {
    const key = "brmedia.guest.deck.client.v1";
    try {
      const existing = localStorage.getItem(key);
      if (/^[A-Za-z0-9_-]{16,96}$/.test(existing || "")) return existing;
      const bytes = crypto.getRandomValues(new Uint8Array(18));
      const created = btoa(String.fromCharCode(...bytes))
        .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
      localStorage.setItem(key, created);
      return created;
    } catch {
      return `browser_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }
  };
  const reserveAndOpenDeck = async (deckId) => {
    if (!currentValidation?.guestId || !client?.snapshot()?.token) return;
    const generation = ++loadGeneration;
    const buttons = [$("load-d1"), $("load-d2")];
    buttons.forEach((button) => { button.disabled = true; });
    message(
      `Reserving ${deckId === "d2" ? "Deck 2" : "Deck 1"}`,
      "The reservation protects this guest while the native deck fetches and decodes it."
    );
    try {
      const response = await fetch(
        `/api/v1/guest-tracks/${encodeURIComponent(currentValidation.guestId)}/reservations`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { ...headers(), "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: getClientId(), deckId, generation }),
        }
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not reserve the deck");
      if (generation !== loadGeneration) return;
      sessionStorage.setItem("brmedia.guest.deck.intent.v1", JSON.stringify({
        guest: body.guest,
        reservation: body.reservation,
      }));
      window.location.href = `/dj-mixer/performance.html?guestDeck=${deckId}`;
    } catch (error) {
      message("Deck reservation failed", error?.message || "Try again.");
      buttons.forEach((button) => { button.disabled = false; });
    }
  };
  const resolveDuplicate = async (choice) => {
    const snapshot = client.snapshot();
    const status = await fetch(`/api/v1/uploads/${snapshot.session.id}/validation`, {
      credentials: "same-origin", headers: headers(),
    }).then((response) => response.json());
    const exact = status.validation?.duplicate?.candidates?.find((item) => item.kind === "guest");
    const response = await fetch(`/api/v1/uploads/${snapshot.session.id}/validation/resolve`, {
      method: "POST", credentials: "same-origin",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ choice, candidateId: exact?.id || "" }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Could not save duplicate choice");
    renderValidation(body.validation);
  };
  const refreshGuestState = async () => {
    if (!currentValidation?.guestId) return;
    const sourceUploadSessionId = client?.snapshot()?.session?.id;
    if (!sourceUploadSessionId) return;
    const response = await fetch(
      `/api/v1/guest-tracks?limit=100&sourceUploadSessionId=${encodeURIComponent(sourceUploadSessionId)}`,
      {
        credentials: "same-origin", cache: "no-store", headers: headers(),
      }
    );
    if (!response.ok) return;
    const body = await response.json().catch(() => ({}));
    const guest = body.items?.find((item) => item.id === currentValidation.guestId);
    if (!guest) {
      message("Guest expired or removed", "This temporary guest is no longer available.");
      $("deck-actions").hidden = true;
      return;
    }
    const reservations = Array.isArray(guest.reservations) ? guest.reservations : [];
    const loaded = reservations.filter((item) => item.state === "loaded");
    if (loaded.length) {
      message(
        `Loaded on ${loaded.map((item) => item.deckId === "d2" ? "Deck 2" : "Deck 1").join(" and ")}`,
        "The active deck lease protects this temporary guest from cleanup."
      );
    }
  };

  const createClient = () => new window.BRMediaResumableUpload.UploadClient({
    onState: ({ state, error }) => {
      save(client?.snapshot());
      if (error) message("Upload interrupted", "The server session may still be resumable.");
      pause.disabled = state !== "uploading";
      cancel.disabled = !["uploading", "paused", "created"].includes(state);
    },
    onProgress: ({ confirmedBytes, totalBytes, ratio }) => {
      $("progress").value = ratio;
      $("progress-text").textContent = `${Math.floor(ratio * 100)}% · ${confirmedBytes.toLocaleString()} of ${totalBytes.toLocaleString()} bytes confirmed`;
    },
  });

  fileInput.addEventListener("change", () => {
    file = fileInput.files?.[0] || null;
    start.disabled = !file;
    $("selection").textContent = file
      ? `${file.name || "Selected file"} · ${file.size.toLocaleString()} bytes`
      : "No file selected";
    if (persisted?.session && file) {
      const same = persisted.session.totalSize === file.size &&
        persisted.session.filename === file.name &&
        (!persisted.session.clientLastModified || persisted.session.clientLastModified === file.lastModified);
      message(same ? "Source reselected" : "Source file mismatch", same
        ? "The selected File matches the saved server session and can resume."
        : "Choose the original file. Filename alone is not enough.");
      if (same) {
        client = createClient();
        client.restore(persisted);
      }
    }
  });
  start.addEventListener("click", async () => {
    try {
      client ||= createClient();
      if (!client.snapshot().session) await client.create(file);
      await client.upload(file);
      await client.finalise();
      save(client.snapshot());
      await validate();
    } catch (error) {
      if (error?.name === "AbortError") return;
      message("Upload interrupted", error?.message || "Retry or reselect the same source file.");
    }
  });
  pause.addEventListener("click", () => {
    client?.pause();
    message("Paused by you", "The server session is retained. Resume while this File remains available.");
  });
  cancel.addEventListener("click", async () => {
    try { await client?.cancel(); message("Upload cancelled", "No guest track was created."); }
    catch (error) { message("Cancellation interrupted", error?.message || "Check the session again."); }
  });
  retry.addEventListener("click", () => validate().catch((error) =>
    message("Validation failed", error?.message || "Retry later.")
  ));
  $("keep").addEventListener("click", () => resolveDuplicate("keep-separate-guest"));
  $("use-existing").addEventListener("click", () => resolveDuplicate("use-existing-guest"));
  $("load-d1").addEventListener("click", () => reserveAndOpenDeck("d1"));
  $("load-d2").addEventListener("click", () => reserveAndOpenDeck("d2"));

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && client?.snapshot().state === "uploading") {
      message("Browser may suspend upload", "Keep this page open. Progress always reflects server-confirmed bytes.");
    }
    if (!document.hidden) void refreshGuestState();
  });
  window.addEventListener("pagehide", () => save(client?.snapshot()));
  if (persisted?.session?.id && persisted?.token) {
    client = createClient();
    client.restore(persisted);
    fetch(`/api/v1/uploads/${persisted.session.id}/validation`, {
      credentials: "same-origin",
      headers: headers(),
      cache: "no-store",
    }).then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (response.ok && body.validation) {
        renderValidation(body.validation);
        await refreshGuestState();
      }
    }).catch(() => {});
  }
})();
