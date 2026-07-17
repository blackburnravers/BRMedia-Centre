(function () {
  const cloudRoutes = {
    googleDrive: "/settings?tab=google-drive",
    dropbox: "/settings?tab=dropbox",
    imports: "/settings?tab=import",
  };

  function openCloudSettings(type) {
    window.location.href = cloudRoutes[type] || cloudRoutes.imports;
  }

  window.BRMediaShared = window.BRMediaShared || {};
  window.BRMediaShared.cloudImports = { cloudRoutes, openCloudSettings };
})();