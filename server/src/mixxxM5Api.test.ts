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
  sent: number[][] = [];
  getPortCount() { return 1; }
  getPortName() { return MIXXX_MIDI_PORT_NAME; }
  openPort() {}
  closePort() {}
  sendMessage(message: number[]) { this.sent.push(message); }
}

async function request(method: "GET" | "POST", pathname: string, bridge: MixxxMidiBridge) {
  const req = new EventEmitter() as IncomingMessage;
  req.method = method;
  const result = { status: 0, body: null as any };
  const res = {
    statusCode: 0,
    setHeader() {},
    end(value: string) { result.status = Number((res as any).statusCode); result.body = JSON.parse(value); },
  } as unknown as ServerResponse;
  const pending = handleMixxxMidiRoute(req, res, new URL(`http://localhost${pathname}`), bridge);
  if (method === "POST") process.nextTick(() => { req.emit("data", Buffer.from("{}")); req.emit("end"); });
  await pending;
  return result;
}

test("M5 read-only deck endpoints expose both decks and validate identifiers", async () => {
  const bridge = new MixxxMidiBridge({ input: () => new Input(), output: () => new Output() });
  bridge.open();
  bridge.receiveFeedbackForTest([0x90, 0x70, 127]);
  bridge.receiveFeedbackForTest([0x90, 0x30, 3]);
  bridge.receiveFeedbackForTest([0x90, 0x3f, 1]);
  const both = await request("GET", "/api/dj/mixxx/decks", bridge);
  assert.equal(both.status, 200);
  assert.equal(both.body.deck1.loaded, true);
  assert.equal(both.body.deck2.loaded, null);
  const one = await request("GET", "/api/dj/mixxx/decks/1", bridge);
  assert.equal(one.status, 200);
  assert.equal(one.body.deckNumber, 1);
  assert.equal((await request("GET", "/api/dj/mixxx/decks/3", bridge)).status, 400);
  assert.equal((await request("GET", "/api/dj/mixxx/decks/x", bridge)).status, 400);
});

test("M5 resync endpoint is safe and sends no MIDI", async () => {
  const output = new Output();
  const bridge = new MixxxMidiBridge({ input: () => new Input(), output: () => output });
  bridge.open();
  const result = await request("POST", "/api/dj/mixxx/resync", bridge);
  assert.equal(result.status, 200);
  assert.equal(result.body.requested, false);
  assert.match(result.body.reason, /no outbound MIDI/);
  assert.deepEqual(output.sent, []);
});
