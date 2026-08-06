// BRMediaMixxx protocol v2 feedback mapping. M4 input assignments remain intact.
var BRMediaMixxxM5 = {};
BRMediaMixxxM5.connections = [];
BRMediaMixxxM5.timers = [];
BRMediaMixxxM5.sequence = [0, 0];

BRMediaMixxxM5.send14 = function (base, highOffset, lowOffset, raw) {
  var value = Math.max(0, Math.min(16383, Math.round(raw)));
  midi.sendShortMsg(0x90, base + highOffset, (value >> 7) & 0x7f);
  midi.sendShortMsg(0x90, base + lowOffset, value & 0x7f);
};

BRMediaMixxxM5.duration = function (group) {
  var direct = engine.getValue(group, "duration");
  if (Number.isFinite(direct) && direct > 0) return direct;
  var samples = engine.getValue(group, "track_samples");
  var sampleRate = engine.getValue(group, "track_samplerate");
  return samples > 0 && sampleRate > 0 ? samples / sampleRate / 2 : 0;
};

BRMediaMixxxM5.sendFlags = function (deck) {
  var group = "[Channel" + deck + "]";
  var value = 0;
  if (engine.getValue(group, "track_loaded") > 0) value |= 1;
  if (engine.getValue(group, "play_latched") > 0) value |= 2;
  var cue = engine.getValue(group, "cue_cdj");
  if (Number.isFinite(cue)) {
    value |= 4;
    if (cue > 0) value |= 8;
  }
  midi.sendShortMsg(0x90, deck === 1 ? 0x30 : 0x40, value);
};

BRMediaMixxxM5.sendPosition = function (deck) {
  var group = "[Channel" + deck + "]";
  if (engine.getValue(group, "track_loaded") <= 0) return;
  var base = deck === 1 ? 0x30 : 0x40;
  var normalised = Math.max(0, Math.min(1, engine.getValue(group, "playposition")));
  var duration = BRMediaMixxxM5.duration(group);
  BRMediaMixxxM5.send14(base, 1, 2, normalised * 16383);
  BRMediaMixxxM5.send14(base, 5, 6, normalised * duration * 10);
};

BRMediaMixxxM5.sendSlowState = function (deck) {
  var group = "[Channel" + deck + "]";
  var base = deck === 1 ? 0x30 : 0x40;
  BRMediaMixxxM5.sendFlags(deck);
  if (engine.getValue(group, "track_loaded") > 0) {
    BRMediaMixxxM5.send14(base, 3, 4, BRMediaMixxxM5.duration(group) * 10);
    BRMediaMixxxM5.send14(base, 7, 8, engine.getValue(group, "file_bpm") * 10);
    BRMediaMixxxM5.send14(base, 9, 10, engine.getValue(group, "bpm") * 10);
    BRMediaMixxxM5.send14(base, 11, 12, 8192 + engine.getValue(group, "rate") * 8191);
    BRMediaMixxxM5.send14(base, 13, 14, engine.getValue(group, "rateRange") * 4096);
  }
  BRMediaMixxxM5.sequence[deck - 1] = (BRMediaMixxxM5.sequence[deck - 1] + 1) & 0x7f;
  midi.sendShortMsg(0x90, base + 15, BRMediaMixxxM5.sequence[deck - 1]);
};

BRMediaMixxxM5.snapshot = function () {
  BRMediaMixxxM5.sendSlowState(1);
  BRMediaMixxxM5.sendSlowState(2);
  BRMediaMixxxM5.sendPosition(1);
  BRMediaMixxxM5.sendPosition(2);
  midi.sendShortMsg(0x90, 0x72, 0x7f);
};

BRMediaMixxxM5.init = function (_id, _debugging) {
  midi.sendShortMsg(0x90, 0x71, 2);
  [1, 2].forEach(function (deck) {
    var group = "[Channel" + deck + "]";
    ["track_loaded", "play_latched", "cue_cdj"].forEach(function (control) {
      var connection = engine.makeConnection(group, control, function () {
        BRMediaMixxxM5.sendFlags(deck);
      });
      if (connection) { BRMediaMixxxM5.connections.push(connection); connection.trigger(); }
    });
    ["file_bpm", "bpm", "rate", "rateRange", "duration", "track_samples", "track_samplerate"].forEach(function (control) {
      var connection = engine.makeConnection(group, control, function () {
        BRMediaMixxxM5.sendSlowState(deck);
      });
      if (connection) BRMediaMixxxM5.connections.push(connection);
    });
  });
  BRMediaMixxxM5.snapshot();
  BRMediaMixxxM5.timers.push(engine.beginTimer(250, function () {
    BRMediaMixxxM5.sendPosition(1); BRMediaMixxxM5.sendPosition(2);
  }));
  BRMediaMixxxM5.timers.push(engine.beginTimer(1000, function () {
    BRMediaMixxxM5.sendSlowState(1); BRMediaMixxxM5.sendSlowState(2);
  }));
  BRMediaMixxxM5.timers.push(engine.beginTimer(2000, function () {
    midi.sendShortMsg(0x90, 0x70, 0x7f);
  }));
};

BRMediaMixxxM5.shutdown = function () {
  BRMediaMixxxM5.connections.forEach(function (connection) { connection.disconnect(); });
  BRMediaMixxxM5.timers.forEach(function (timer) { engine.stopTimer(timer); });
  BRMediaMixxxM5.connections = [];
  BRMediaMixxxM5.timers = [];
};

// The only outbound-to-Mixxx controls remain the approved M4 handlers.
BRMediaMixxxM5.play = function (_channel, _control, value, _status, group) {
  if (value) script.toggleControl(group, "play");
};
BRMediaMixxxM5.cue = function (_channel, _control, value, _status, group) {
  engine.setValue(group, "cue_default", value ? 1 : 0);
};
BRMediaMixxxM5.heartbeat = function (_channel, _control, value) {
  if (value) midi.sendShortMsg(0x90, 0x70, value);
};
