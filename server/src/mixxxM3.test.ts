import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { MixxxMidiBridge, type MidiInputPort, type MidiOutputPort } from "./mixxxBridge";
import { SettingsService } from "./settings/service";
import { SettingsStore } from "./settings/store";

class Input implements MidiInputPort {
  getPortCount() { return 1; }
  getPortName() { return "BRMedia Mixxx Remote"; }
  openPort() {}
  closePort() {}
  on() { return this; }
}
class Output implements MidiOutputPort {
  sent: number[][] = [];
  getPortCount() { return 1; }
  getPortName() { return "BRMedia Mixxx Remote"; }
  openPort() {}
  closePort() {}
  sendMessage(message: number[]) { this.sent.push(message); }
}

test("M3 backend defaults and settings persist without activation", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "brmedia-mixxx-m3-"));
  const settingsPath = path.join(directory, "settings.json");
  const service = new SettingsService(new SettingsStore({
    settingsPath,
    backupPath: `${settingsPath}.lkg`,
  }));
  assert.equal(service.readModule("dj").data.engine.backend, "brmedia-native");
  assert.equal(service.readModule("dj").data.engine.mixxxEnabled, false);
  const saved = await service.updateModule("dj", {
    engine: {
      backend: "mixxx",
      mixxxEnabled: true,
      mixxxMidiPort: "BRMedia Mixxx Remote",
    },
  });
  assert.equal(saved.ok, true);
  const reloaded = new SettingsService(new SettingsStore({
    settingsPath,
    backupPath: `${settingsPath}.lkg`,
  })).readModule("dj").data.engine;
  assert.equal(reloaded.backend, "mixxx");
  assert.equal(reloaded.mixxxEnabled, true);
  assert.equal(reloaded.mixxxMidiPort, "BRMedia Mixxx Remote");
});

test("M3 health and backend changes send no MIDI transport messages", () => {
  const output = new Output();
  const bridge = new MixxxMidiBridge({ input: () => new Input(), output: () => output });
  const initial = bridge.status();
  assert.equal(initial.mode, "native");
  assert.deepEqual(initial.availableBackends.map((item) => item.id), ["native", "mixxx"]);
  bridge.open();
  bridge.receiveFeedbackForTest([0x90, 0x71, 5]);
  bridge.receiveFeedbackForTest([0x90, 0x70, 127]);
  bridge.reportNativePlayback(false);
  bridge.setMode("mixxx", false);
  bridge.status();
  bridge.reportNativePlayback(true);
  assert.equal(bridge.status().mode, "native");
  assert.equal(output.sent.length, 0);
});

test("M3 frontend uses guarded curated controls and no transport endpoint", () => {
  const settingsJs = fs.readFileSync(path.resolve("server/public/settings/mixxx-m3.js"), "utf8");
  const mixerJs = fs.readFileSync(path.resolve("server/public/dj-mixer/components/mixxx-backend-m3.js"), "utf8");
  assert.match(settingsJs, /Enable Mixxx Integration/);
  assert.match(settingsJs, /Backend Selection/);
  assert.match(settingsJs, /Refresh Status/);
  assert.match(settingsJs, /window\.confirm/);
  assert.doesNotMatch(settingsJs, /\/deck\/|\/heartbeat|\/crossfader/);
  assert.match(mixerJs, /brmedia:dj-deck-state/);
});
