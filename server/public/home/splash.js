(() => {
  "use strict";

  const startup = window.__brmediaHomeStartup;
  const completeStartup = window.__brmediaCompleteHomeStartup;
  const body = document.body;
  const splash = document.getElementById("homeSplash");
  const panel = document.getElementById("homeSplashPanel");
  const target = document.querySelector(".topHeader");
  const shell = document.querySelector(".wrap");
  const progressText = document.getElementById("homeSplashProgressText");
  const progressFill = document.getElementById("homeSplashProgressFill");
  const reduceMotion = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);

  if (!startup || typeof completeStartup !== "function") {
    document.body?.classList.add("homeSplashDone");
    splash?.classList.add("hidden");
    splash?.setAttribute("aria-hidden", "true");
    return;
  }

  const addTimer = (callback, delay) => {
    const id = window.setTimeout(() => {
      startup.timers.delete(id);
      try { callback(); } catch (error) { completeStartup("timer-error", error); }
    }, delay);
    startup.timers.add(id);
    return id;
  };

  const nextFrame = (callback) => {
    if (typeof window.requestAnimationFrame !== "function") return addTimer(() => callback(performance.now()), 16);
    const id = window.requestAnimationFrame((time) => {
      startup.rafs.delete(id);
      try { callback(time); } catch (error) { completeStartup("animation-frame-error", error); }
    });
    startup.rafs.add(id);
    return id;
  };

  const afterFrames = (count = 1) => new Promise((resolve) => {
    const step = () => {
      if (count <= 0) return resolve();
      count -= 1;
      nextFrame(step);
    };
    step();
  });

  const bounded = (promise, timeoutMs, label) => new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      startup.timers.delete(timeout);
      resolve(value);
    };
    const timeout = addTimer(() => finish(undefined), timeoutMs);
    Promise.resolve(promise).then(finish, (error) => {
      console.warn(`[BRMedia startup] ${label} rejected`, error);
      finish(undefined);
    });
  });

  const waitForDestination = async () => {
    const images = Array.from(target?.querySelectorAll?.("img") || []);
    const imageReady = images.map((image) => {
      if (image.complete) return image.decode?.().catch(() => undefined);
      return new Promise((resolve) => {
        const done = () => resolve(undefined);
        image.addEventListener("load", done, { once: true });
        image.addEventListener("error", done, { once: true });
        startup.listeners.push([image, "load", done], [image, "error", done]);
      });
    });
    await bounded(Promise.all([document.fonts?.ready || Promise.resolve(), ...imageReady]), 1200, "destination readiness");
    await afterFrames(2);
  };

  const waitForDockEnd = () => bounded(new Promise((resolve) => {
    const done = (event) => {
      if (event.target !== panel || event.propertyName !== "transform") return;
      panel.removeEventListener("transitionend", done);
      resolve(undefined);
    };
    panel.addEventListener("transitionend", done);
    startup.listeners.push([panel, "transitionend", done]);
  }), 1100, "dock transition");

  const dockSplash = async () => {
    if (startup.completed) return;
    if (!body || !splash || !panel || !target || !shell) return completeStartup("missing-splash-or-destination");

    await waitForDestination();
    if (startup.completed) return;

    const first = panel.getBoundingClientRect();
    body.classList.add("homeSplashHandoff");
    const last = target.getBoundingClientRect();
    if (!first.width || !first.height || !last.width || !last.height) {
      return completeStartup("destination-measurement-unavailable");
    }

    const targetStyle = getComputedStyle(target);
    Object.assign(panel.style, {
      position: "fixed",
      left: `${last.left}px`,
      top: `${last.top}px`,
      width: `${last.width}px`,
      height: `${last.height}px`,
      minHeight: "0",
      margin: "0",
      transformOrigin: "top left",
      transform: `translate(${first.left - last.left}px, ${first.top - last.top}px) scale(${first.width / last.width}, ${first.height / last.height})`,
      transition: "transform 720ms cubic-bezier(.22,.9,.2,1), border-radius 720ms cubic-bezier(.22,.9,.2,1), box-shadow 720ms cubic-bezier(.22,.9,.2,1)",
      willChange: "transform, border-radius, box-shadow",
    });
    panel.getBoundingClientRect();
    body.classList.add("homeSplashDock");

    const dockEnded = waitForDockEnd();
    nextFrame(() => {
      panel.style.transform = "translate(0, 0) scale(1, 1)";
      panel.style.borderRadius = targetStyle.borderRadius;
      panel.style.boxShadow = targetStyle.boxShadow;
    });
    await dockEnded;
    await afterFrames(1);
    completeStartup("animation-complete");
  };

  try {
    if (!body || !splash || !panel) return completeStartup("missing-splash-element");
    if (!target || !shell) return completeStartup("missing-destination-header");
    splash.setAttribute("aria-hidden", "false");

    if (reduceMotion) {
      progressText.textContent = "100%";
      progressFill.style.width = "100%";
      body.classList.add("homeSplashRun");
      void waitForDestination().then(
        () => completeStartup("reduced-motion"),
        (error) => completeStartup("reduced-motion-error", error)
      );
      return;
    }

    const startedAt = performance.now();
    const progressDuration = 1650;
    const animateProgress = (now) => {
      if (startup.completed) return;
      const ratio = Math.min(1, (now - startedAt) / progressDuration);
      const eased = 1 - Math.pow(1 - ratio, 3);
      const percent = Math.min(100, Math.round(eased * 100));
      progressText.textContent = `${percent}%`;
      progressFill.style.width = `${percent}%`;

      if (ratio < 1) return nextFrame(animateProgress);
      body.classList.add("homeSplashHold");
      addTimer(() => void dockSplash().catch((error) => completeStartup("startup-promise-rejected", error)), 260);
    };

    nextFrame(() => {
      body.classList.add("homeSplashRun");
      nextFrame(animateProgress);
    });
  } catch (error) {
    completeStartup("startup-error", error);
  }
})();
