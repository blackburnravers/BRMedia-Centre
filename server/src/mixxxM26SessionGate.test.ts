import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { resolveM26DjPerformanceContext } from "./mixxxM26DjTrust";

const index = fs.readFileSync("server/src/index.ts", "utf8");
const controller = fs.readFileSync("server/public/dj-mixer/engine/m26-master-audio-controller.js", "utf8");
const performance = fs.readFileSync("server/public/dj-mixer/performance.html", "utf8");
const profile = fs.readFileSync("server/public/profile/app.js", "utf8");
const stream = fs.readFileSync("server/src/mixxxMasterStream.ts", "utf8");
const m26 = index.slice(index.indexOf("function requireM26SameOrigin"), index.indexOf("function createBrMediaProfileSession"));

test("DJ Performance opens and prepares M26 without Profile login", () => {
  assert.match(performance, /m26-master-audio-controller\.js/);
  assert.match(controller, /if \(backendActive\) void prepareAutomaticSession\(\)/);
  assert.doesNotMatch(controller + m26, /\/profile\/login|getCurrentBrMediaProfile\(req\)|brmedia_profile_token/);
});

test("M26 creation is limited to same-origin DJ Performance browser context", () => {
  const valid = { "sec-fetch-site": "same-origin", referer: "http://brmedia:8787/dj-mixer/performance.html?view=grid",
    "x-brmedia-dj-session": "A".repeat(43) };
  const context = resolveM26DjPerformanceContext(valid, "http://brmedia:8787");
  assert.equal(context.ownerSource, "dj-performance-local-trust");
  assert.match(context.ownerId, /^dj:[a-f0-9]{32}$/);
  assert.throws(() => resolveM26DjPerformanceContext({ ...valid, "sec-fetch-site": "cross-site" }, "http://brmedia:8787"), /DJ Performance context/);
  assert.throws(() => resolveM26DjPerformanceContext({ ...valid, referer: "http://brmedia:8787/profile/" }, "http://brmedia:8787"), /DJ Performance context/);
  assert.throws(() => resolveM26DjPerformanceContext({ ...valid, referer: "http://other:8787/dj-mixer/performance.html" }, "http://brmedia:8787"), /DJ Performance context/);
  assert.throws(() => resolveM26DjPerformanceContext({ ...valid, "x-brmedia-dj-session": "short" }, "http://brmedia:8787"), /DJ Performance context/);
  assert.match(m26, /x-brmedia-requested-with/);
  assert.match(index, /resolveM26DjPerformanceContext\(req\.headers, origin\)/);
});

test("one page owner creates one bounded listener and cross-owner access is rejected", () => {
  assert.equal((controller.match(/const browserOwnerToken =/g) || []).length, 1);
  assert.match(controller, /if \(session\) return Promise\.resolve\(session\)/);
  assert.match(controller, /if \(sessionPromise\) return sessionPromise/);
  assert.match(m26, /profileId: djContext\.ownerId/);
  assert.match(stream, /Session ownership mismatch/);
});

test("page exit cleans up and reopen receives a fresh browser owner", () => {
  assert.match(controller, /window\.addEventListener\("pagehide"/);
  assert.match(controller, /receiver\?\.stop\?\.\(\); void deleteSession\(previous\)/);
  assert.match(controller, /crypto\.getRandomValues\(bytes\)/);
});

test("Profile routes and independent login implementation remain present", () => {
  assert.match(index, /url\.pathname === "\/profile\/login"/);
  assert.match(index, /loginBrMediaProfile\(req, res\)/);
  assert.match(profile, /profileApi\("\/profile\/login"/);
});

test("real-session diagnostics identify DJ trust source without credentials or paths", () => {
  assert.match(index, /ownerSource: djContext\.ownerSource/);
  assert.match(m26, /djSession: \{ detected: true, ownerSource: djContext\.ownerSource \}/);
  assert.match(m26, /realBrowsers: \[\.\.\.m26RealBrowserDiagnostics\.values\(\)\]\.slice\(-2\)/);
  assert.doesNotMatch(m26, /password|endpointId|devicePath|filePath/);
});
