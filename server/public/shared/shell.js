(function () {
  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  function setupSharedShell() {
    const menuBtn = document.querySelector("[data-br-shared-menu]");
    const closeBtn = document.querySelector("[data-br-shared-close]");
    const sidebar = document.querySelector("[data-br-shared-sidebar]");
    const backdrop = document.querySelector("[data-br-shared-backdrop]");
    const nav = document.querySelector("[data-br-shared-nav]");

    if (nav && window.BRMediaShared?.renderSharedNav) {
      window.BRMediaShared.renderSharedNav(nav);
    }

    const setOpen = (open) => {
      sidebar?.classList.toggle("is-open", open);
      backdrop?.classList.toggle("is-open", open);
      document.body.classList.toggle("brSharedSidebarOpen", open);
    };

    menuBtn?.addEventListener("click", () => setOpen(true));
    closeBtn?.addEventListener("click", () => setOpen(false));
    backdrop?.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });
  }

  window.BRMediaShared = window.BRMediaShared || {};
  window.BRMediaShared.setupSharedShell = setupSharedShell;
  ready(setupSharedShell);
})();