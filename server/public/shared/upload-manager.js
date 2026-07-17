(function () {
  function bindFileButton(button, input, onFile) {
    const btn = typeof button === "string" ? document.querySelector(button) : button;
    const fileInput = typeof input === "string" ? document.querySelector(input) : input;
    if (!btn || !fileInput) return;

    btn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (file && typeof onFile === "function") onFile(file);
    });
  }

  window.BRMediaShared = window.BRMediaShared || {};
  window.BRMediaShared.uploads = { bindFileButton };
})();