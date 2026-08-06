(() => {
  "use strict";

  const API = "/dj-analysis/queue";
  const APPROVAL = "M9_FULL_CATALOGUE_APPROVED";
  let timer = 0;
  let requestActive = false;

  const request = async (path = "", body) => {
    const response = await fetch(`${API}${path}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Analysis queue request failed (${response.status})`);
    return payload;
  };

  const selectedIds = (sheet) => Array.from(
    sheet.querySelectorAll("[data-dj-library-select]:checked")
  ).map((input) => String(input.value || "").trim()).filter(Boolean);

  const controlsHtml = () => `
    <section class="brDjPerformanceLibraryBatch" data-m9-analysis-queue>
      <div class="brDjPerformanceLibraryBatchActions">
        <strong>Analysis M9</strong>
        <button type="button" data-m9-analyse-all>Analyse All</button>
        <button type="button" data-m9-analyse-selected>Analyse selected</button>
        <button type="button" data-m9-pause>Pause queue</button>
        <button type="button" data-m9-resume>Resume queue</button>
        <button type="button" data-m9-cancel>Cancel pending</button>
        <button type="button" data-m9-retry-failed>Retry failed</button>
        <button type="button" data-m9-retry-review>Retry Review Required</button>
        <label><input type="checkbox" data-m9-force /> Force reanalyse</label>
      </div>
      <div class="brDjPerformanceLibraryBatchProgress">
        <div><span data-m9-progress-bar></span></div>
        <strong data-m9-progress-text>Queue idle</strong>
      </div>
      <small data-m9-current-job>Current job: none</small>
    </section>
  `;

  const render = (sheet, state) => {
    const root = sheet.querySelector("[data-m9-analysis-queue]");
    if (!root || !state?.totals) return;
    const totals = state.totals;
    const progress = Math.max(0, Math.min(100, Number(state.progressPercent) || 0));
    const bar = root.querySelector("[data-m9-progress-bar]");
    if (bar) bar.style.width = `${progress}%`;
    const text = root.querySelector("[data-m9-progress-text]");
    if (text) {
      text.textContent = `${state.status} · ${progress}% · ${totals.prepared} prepared · ${totals.reviewRequired} review · ${totals.failed} failed · ${totals.pending} pending`;
    }
    const current = root.querySelector("[data-m9-current-job]");
    if (current) {
      current.textContent = state.activeTrack
        ? `Current job: ${state.activeTrack.title} · ${state.activeTrack.stage} · ${state.activeTrack.progressPercent}%`
        : "Current job: none";
    }
    const byId = new Map((state.items || []).map((item) => [item.trackId, item]));
    for (const row of sheet.querySelectorAll("[data-dj-library-track]")) {
      const item = byId.get(row.dataset.djLibraryTrack);
      row.dataset.m9AnalysisStatus = item?.status || "unanalysed";
      const meta = row.querySelector(".brDjPerformanceLibraryMeta em");
      if (meta && item && ["queued", "analysing", "preparing-waveform", "failed", "cancelled", "review-required"].includes(item.status)) {
        meta.textContent = item.status === "review-required"
          ? "Review Required · analysis retained"
          : item.error
            ? `Failed · ${item.error}`
            : `${item.stage} · ${item.progressPercent}%`;
      }
    }
  };

  const refresh = async (sheet) => {
    if (requestActive || !document.body.contains(sheet)) return;
    requestActive = true;
    try {
      const state = await request();
      render(sheet, state);
      const busy = state.status === "running" || state.totals?.pending > 0;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => refresh(sheet), busy ? 2000 : 6000);
    } catch (error) {
      const current = sheet.querySelector("[data-m9-current-job]");
      if (current) current.textContent = String(error.message || error);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => refresh(sheet), 10000);
    } finally {
      requestActive = false;
    }
  };

  const postAndRefresh = async (sheet, path, body = {}) => {
    await request(path, body);
    await refresh(sheet);
  };

  const attach = (sheet) => {
    if (sheet.querySelector("[data-m9-analysis-queue]")) return;
    const batch = sheet.querySelector("[data-dj-library-batch]");
    if (!batch) return;
    batch.insertAdjacentHTML("afterend", controlsHtml());
    const root = sheet.querySelector("[data-m9-analysis-queue]");
    root.addEventListener("click", async (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      button.disabled = true;
      try {
        const force = root.querySelector("[data-m9-force]")?.checked === true;
        if (button.matches("[data-m9-analyse-all]")) {
          if (!window.confirm("Analyse all eligible catalogue tracks with M9? This reads original audio but never modifies it.")) return;
          await postAndRefresh(sheet, "/enqueue", { scope: "all", force, productionApproval: APPROVAL });
          await postAndRefresh(sheet, "/start");
        } else if (button.matches("[data-m9-analyse-selected]")) {
          const ids = selectedIds(sheet);
          if (!ids.length) throw new Error("Select at least one track");
          await postAndRefresh(sheet, "/enqueue", { scope: "selected", ids, force });
          await postAndRefresh(sheet, "/start");
        } else if (button.matches("[data-m9-pause]")) await postAndRefresh(sheet, "/pause");
        else if (button.matches("[data-m9-resume]")) await postAndRefresh(sheet, "/resume");
        else if (button.matches("[data-m9-cancel]")) await postAndRefresh(sheet, "/cancel-pending");
        else if (button.matches("[data-m9-retry-failed]")) {
          await postAndRefresh(sheet, "/retry-failed");
          await postAndRefresh(sheet, "/start");
        } else if (button.matches("[data-m9-retry-review]")) {
          await postAndRefresh(sheet, "/retry-review-required");
          await postAndRefresh(sheet, "/start");
        }
      } catch (error) {
        const current = root.querySelector("[data-m9-current-job]");
        if (current) current.textContent = String(error.message || error);
      } finally {
        button.disabled = false;
      }
    });
    void refresh(sheet);
  };

  const observe = () => {
    document.querySelectorAll("[data-dj-performance-library]").forEach(attach);
  };
  new MutationObserver(observe).observe(document.body, { childList: true, subtree: true });
  observe();
})();
