import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import type { IncomingMessage, ServerResponse } from "node:http";
import { test } from "node:test";
import {
  MIXXX_MIDI_PORT_NAME,
  MixxxMidiBridge,
  handleMixxxMidiRoute,
  type MidiInputPort,
  type MidiOutputPort,
} from "./mixxxBridge";

class Input extends EventEmitter implements MidiInputPort {
  getPortCount() { return 1; }
  getPortName() { return MIXXX_MIDI_PORT_NAME; }
  openPort() {}
  closePort() {}
}
class Output implements MidiOutputPort {
  getPortCount() { return 1; }
  getPortName() { return MIXXX_MIDI_PORT_NAME; }
  openPort() {}
  closePort() {}
  sendMessage() {}
}

async function request(pathname: string, payload: unknown) {
  const req = new EventEmitter() as IncomingMessage;
  req.method = "POST";
  const result = { status: 0, body: null as any };
  const res = {
    statusCode: 0,
    setHeader() {},
    end(value: string) {
      result.status = Number((res as any).statusCode);
      result.body = JSON.parse(value);
    },
  } as unknown as ServerResponse;
  const bridge = new MixxxMidiBridge({ input: () => new Input(), output: () => new Output() });
  const pending = handleMixxxMidiRoute(req, res, new URL(`http://localhost${pathname}`), bridge);
  process.nextTick(() => {
    req.emit("data", Buffer.from(JSON.stringify(payload)));
    req.emit("end");
  });
  await pending;
  return result;
}

test("invalid mode and crossfader API payloads are rejected", async () => {
  assert.equal((await request("/api/dj/mixxx/mode", { mode: "debug" })).status, 400);
  assert.equal((await request("/api/dj/mixxx/mode", { mode: "mixxx" })).status, 400);
  assert.equal((await request("/api/dj/mixxx/crossfader", { value: 2 })).status, 400);
  assert.equal((await request("/api/dj/mixxx/crossfader", { value: "0.5" })).status, 400);
});

test("arbitrary raw MIDI endpoint is unavailable", async () => {
  const result = await request("/api/dj/mixxx/raw", { status: 144, data1: 1, data2: 127 });
  assert.equal(result.status, 404);
  assert.match(result.body.error, /Unknown Mixxx MIDI endpoint/);
});
