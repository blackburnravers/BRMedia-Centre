import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const read = (file: string) => fs.readFileSync(path.resolve(file), "utf8");

test("original branded splash elements and progression are restored", () => {
  const html = read("server/public/home/index.html");
  const source = read("server/public/home/splash.js");
  assert.match(html, /class="homeSplashHeroLogo"/);
  assert.match(html, /id="homeSplashProgressText">0%/);
  assert.match(html, /id="homeSplashProgressFill"/);
  assert.match(html, /Loading Blackburn Ravers/i);
  assert.match(source, /const progressDuration = 1650/);
  assert.match(source, /progressText\.textContent = `\$\{percent\}%`/);
  assert.match(source, /progressFill\.style\.width = `\$\{percent\}%`/);
  assert.match(source, /body\.classList\.add\("homeSplashHold"\)/);
  assert.match(source, /body\.classList\.add\("homeSplashDock"\)/);
});

test("splash docks to the measured real header with a fixed FLIP overlay", () => {
  const source = read("server/public/home/splash.js");
  assert.match(source, /target\.getBoundingClientRect\(\)/);
  assert.match(source, /panel\.getBoundingClientRect\(\)/);
  assert.match(source, /position:\s*"fixed"/);
  assert.match(source, /first\.width \/ last\.width/);
  assert.match(source, /transform 720ms/);
  assert.ok(source.indexOf('body.classList.add("homeSplashHandoff")') < source.indexOf("target.getBoundingClientRect()"));
});

test("home content is ready before a bounded transition handoff removes the overlay", () => {
  const source = read("server/public/home/splash.js");
  const html = read("server/public/home/index.html");
  assert.match(source, /waitForDestination/);
  assert.match(source, /document\.fonts\?\.ready/);
  assert.match(source, /transitionend/);
  assert.match(source, /1100/);
  assert.ok(source.indexOf("await waitForDestination()") < source.indexOf('body.classList.add("homeSplashHandoff")'));
  assert.ok(source.indexOf("await dockEnded") < source.indexOf('completeStartup("animation-complete")'));
  assert.match(html, /splash\.classList\.add\("is-handoff-complete", "hidden"\)/);
  assert.match(html, /shell\.hidden = false/);
});

test("home startup completion is idempotent and fail-open is secondary", () => {
  const html = read("server/public/home/index.html");
  assert.match(html, /window\.__brmediaCompleteHomeStartup =/);
  assert.match(html, /if \(startup\.completed\) return false/);
  assert.match(html, /"excessive-startup-timeout"/);
  assert.match(html, /8000/);
  assert.match(html, /startup\.timers\.clear\(\)/);
  assert.match(html, /startup\.rafs\.clear\(\)/);
  assert.doesNotMatch(html, /app-shell-ready|unhandledrejection|startup-window-error/);
});

test("missing elements, readiness failures and a missed transition fail open", () => {
  const source = read("server/public/home/splash.js");
  assert.match(source, /completeStartup\("missing-splash-element"\)/);
  assert.match(source, /completeStartup\("missing-destination-header"\)/);
  assert.match(source, /completeStartup\("destination-measurement-unavailable"\)/);
  assert.match(source, /destination readiness/);
  assert.match(source, /dock transition/);
  assert.match(source, /startup-promise-rejected/);
});

test("normal startup shows branded content and matching cache-busted assets", () => {
  const css = read("server/public/home/styles.css");
  const html = read("server/public/home/index.html");
  assert.match(css, /\.homeSplashBody \.wrap\s*\{[^}]*opacity:\s*0/s);
  assert.match(css, /homeSplashRun \.homeSplashStage[\s\S]*opacity:\s*1/);
  assert.match(css, /homeSplashRun \.homeSplashLoader/);
  assert.match(css, /homeSplashRun \.homeSplashText/);
  const suffix = "20260731-splash-restore-v1";
  assert.match(html, new RegExp(`styles\\.css\\?v=${suffix}`));
  assert.match(html, new RegExp(`splash\\.js\\?v=${suffix}`));
  assert.equal((html.match(/splash\.js\?v=/g) || []).length, 1);
});

test("reduced motion, safe areas and visually identical destination handoff remain usable", () => {
  const script = read("server/public/home/splash.js");
  const css = read("server/public/home/styles.css");
  assert.match(script, /prefers-reduced-motion: reduce/);
  assert.match(script, /progressText\.textContent = "100%"/);
  assert.match(script, /completeStartup\("reduced-motion"\)/);
  assert.match(css, /env\(safe-area-inset-top/);
  assert.match(css, /homeSplashHandoff \.topHeader\s*\{\s*visibility:\s*hidden/s);
  assert.match(css, /homeSplashHandoff \.wrap\s*\{[^}]*opacity:\s*1/s);
});

test("Library v2 keeps mobile touch targets stable and uses bounded rendering", () => {
  const css = read("server/public/dj-mixer/styles.css");
  const app = read("server/public/dj-mixer/app.js");
  assert.match(css, /DJ Library v2/);
  assert.match(css, /min-height:\s*38px !important/);
  assert.match(css, /contain-intrinsic-size:\s*auto 82px/);
  assert.match(css, /content-visibility:\s*auto/);
  assert.match(app, /filtered\.slice\(\s*0,\s*240\s*\)/);
});
