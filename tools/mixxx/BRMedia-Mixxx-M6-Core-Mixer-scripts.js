// BRMediaMixxx protocol v3. Preserves every M4/v1 and M5/v2 assignment.
var BRMediaMixxxM6 = {};
BRMediaMixxxM6.connections = [];
BRMediaMixxxM6.timers = [];
BRMediaMixxxM6.sequence = [0, 0];
BRMediaMixxxM6.lastMidi = {};

BRMediaMixxxM6.clamp = function (value, minimum, maximum) {
  var numeric = Number(value);
  if (!Number.isFinite(numeric)) return minimum;
  return Math.max(minimum, Math.min(maximum, numeric));
};
BRMediaMixxxM6.sendChanged = function (status, control, value) {
  var safe = Math.round(BRMediaMixxxM6.clamp(value, 0, 127));
  var key = status + ":" + control;
  if (BRMediaMixxxM6.lastMidi[key] === safe) return;
  BRMediaMixxxM6.lastMidi[key] = safe;
  midi.sendShortMsg(status, control, safe);
};
BRMediaMixxxM6.send14 = function (base, highOffset, lowOffset, raw) {
  var value = Math.round(BRMediaMixxxM6.clamp(raw, 0, 16383));
  BRMediaMixxxM6.sendChanged(0x90, base + highOffset, (value >> 7) & 0x7f);
  BRMediaMixxxM6.sendChanged(0x90, base + lowOffset, value & 0x7f);
};
BRMediaMixxxM6.duration = function (group) {
  var direct = engine.getValue(group, "duration");
  if (Number.isFinite(direct) && direct > 0) return direct;
  var samples = engine.getValue(group, "track_samples");
  var sampleRate = engine.getValue(group, "track_samplerate");
  return samples > 0 && sampleRate > 0 ? samples / sampleRate / 2 : 0;
};
BRMediaMixxxM6.sendFlags = function (deck) {
  var group = "[Channel" + deck + "]", value = 0;
  if (engine.getValue(group, "track_loaded") > 0) value |= 1;
  if (engine.getValue(group, "play_latched") > 0) value |= 2;
  var cue = engine.getValue(group, "cue_cdj");
  if (Number.isFinite(cue)) { value |= 4; if (cue > 0) value |= 8; }
  BRMediaMixxxM6.sendChanged(0x90, deck === 1 ? 0x30 : 0x40, value);
};
BRMediaMixxxM6.sendPosition = function (deck) {
  var group = "[Channel" + deck + "]";
  if (engine.getValue(group, "track_loaded") <= 0) return;
  var base = deck === 1 ? 0x30 : 0x40;
  var normalised = BRMediaMixxxM6.clamp(engine.getValue(group, "playposition"), 0, 1);
  var duration = BRMediaMixxxM6.duration(group);
  BRMediaMixxxM6.send14(base, 1, 2, normalised * 16383);
  BRMediaMixxxM6.send14(base, 5, 6, normalised * duration * 10);
};
BRMediaMixxxM6.sendSlowState = function (deck) {
  var group = "[Channel" + deck + "]", base = deck === 1 ? 0x30 : 0x40;
  BRMediaMixxxM6.sendFlags(deck);
  if (engine.getValue(group, "track_loaded") > 0) {
    BRMediaMixxxM6.send14(base, 3, 4, BRMediaMixxxM6.duration(group) * 10);
    BRMediaMixxxM6.send14(base, 7, 8, engine.getValue(group, "file_bpm") * 10);
    BRMediaMixxxM6.send14(base, 9, 10, engine.getValue(group, "bpm") * 10);
    BRMediaMixxxM6.send14(base, 11, 12, 8192 + engine.getValue(group, "rate") * 8191);
    BRMediaMixxxM6.send14(base, 13, 14, engine.getValue(group, "rateRange") * 4096);
  }
  BRMediaMixxxM6.sequence[deck - 1] = (BRMediaMixxxM6.sequence[deck - 1] + 1) & 0x7f;
  midi.sendShortMsg(0x90, base + 15, BRMediaMixxxM6.sequence[deck - 1]);
};

// Wire boost controls have BRMedia neutral at 2/3; Mixxx parameters neutral at 1/2.
BRMediaMixxxM6.wireToBoostParameter = function (wire) {
  var value = BRMediaMixxxM6.clamp(wire, 0, 1);
  return value <= 2 / 3 ? value * 0.75 : 0.5 + (value - 2 / 3) * 1.5;
};
BRMediaMixxxM6.boostParameterToWire = function (parameter) {
  var value = BRMediaMixxxM6.clamp(parameter, 0, 1);
  return value <= 0.5 ? value / 0.75 : 2 / 3 + (value - 0.5) / 1.5;
};
BRMediaMixxxM6.mixerMap = {
  0x50: ["[Master]", "crossfader", false],
  0x51: ["[Master]", "volume", true],
  0x52: ["[Channel1]", "pregain", true],
  0x53: ["[EqualizerRack1_[Channel1]_Effect1]", "parameter3", true],
  0x54: ["[EqualizerRack1_[Channel1]_Effect1]", "parameter2", true],
  0x55: ["[EqualizerRack1_[Channel1]_Effect1]", "parameter1", true],
  0x56: ["[QuickEffectRack1_[Channel1]]", "super1", false],
  0x57: ["[Channel1]", "volume", false],
  0x58: ["[Channel1]", "pfl", false, true],
  0x59: ["[Channel2]", "pregain", true],
  0x5a: ["[EqualizerRack1_[Channel2]_Effect1]", "parameter3", true],
  0x5b: ["[EqualizerRack1_[Channel2]_Effect1]", "parameter2", true],
  0x5c: ["[EqualizerRack1_[Channel2]_Effect1]", "parameter1", true],
  0x5d: ["[QuickEffectRack1_[Channel2]]", "super1", false],
  0x5e: ["[Channel2]", "volume", false],
  0x5f: ["[Channel2]", "pfl", false, true]
};
BRMediaMixxxM6.mixerInput = function (_channel, control, value) {
  var target = BRMediaMixxxM6.mixerMap[control];
  if (!target) return;
  var wire = BRMediaMixxxM6.clamp(value, 0, 127) / 127;
  if (target[3]) engine.setValue(target[0], target[1], wire >= 0.5 ? 1 : 0);
  else engine.setParameter(target[0], target[1], target[2] ? BRMediaMixxxM6.wireToBoostParameter(wire) : wire);
};
BRMediaMixxxM6.sendMixer = function () {
  Object.keys(BRMediaMixxxM6.mixerMap).forEach(function (rawControl) {
    var control = Number(rawControl), target = BRMediaMixxxM6.mixerMap[control];
    var value = target[3] ? engine.getValue(target[0], target[1]) :
      engine.getParameter(target[0], target[1]);
    var wire = target[2] ? BRMediaMixxxM6.boostParameterToWire(value) :
      BRMediaMixxxM6.clamp(value, 0, 1);
    BRMediaMixxxM6.sendChanged(0xb1, control, wire * 127);
  });
};
BRMediaMixxxM6.sendMeters = function () {
  BRMediaMixxxM6.sendChanged(0xb1, 0x60, engine.getValue("[Channel1]", "vu_meter") * 127);
  BRMediaMixxxM6.sendChanged(0xb1, 0x61, engine.getValue("[Channel1]", "PeakIndicator") > 0 ? 127 : 0);
  BRMediaMixxxM6.sendChanged(0xb1, 0x62, engine.getValue("[Channel2]", "vu_meter") * 127);
  BRMediaMixxxM6.sendChanged(0xb1, 0x63, engine.getValue("[Channel2]", "PeakIndicator") > 0 ? 127 : 0);
  BRMediaMixxxM6.sendChanged(0xb1, 0x64, engine.getValue("[Master]", "vu_meter_left") * 127);
  BRMediaMixxxM6.sendChanged(0xb1, 0x65, engine.getValue("[Master]", "vu_meter_right") * 127);
  BRMediaMixxxM6.sendChanged(0xb1, 0x66, engine.getValue("[Master]", "PeakIndicator") > 0 ? 127 : 0);
};
BRMediaMixxxM6.snapshot = function () {
  BRMediaMixxxM6.sendSlowState(1); BRMediaMixxxM6.sendSlowState(2);
  BRMediaMixxxM6.sendPosition(1); BRMediaMixxxM6.sendPosition(2);
  BRMediaMixxxM6.sendMixer(); BRMediaMixxxM6.sendMeters();
  midi.sendShortMsg(0x90, 0x72, 0x7f);
};
BRMediaMixxxM6.init = function (_id, _debugging) {
  midi.sendShortMsg(0x90, 0x71, 3);
  [1, 2].forEach(function (deck) {
    var group = "[Channel" + deck + "]";
    ["track_loaded", "play_latched", "cue_cdj"].forEach(function (control) {
      var connection = engine.makeConnection(group, control, function () { BRMediaMixxxM6.sendFlags(deck); });
      if (connection) { BRMediaMixxxM6.connections.push(connection); connection.trigger(); }
    });
  });
  BRMediaMixxxM6.snapshot();
  BRMediaMixxxM6.timers.push(engine.beginTimer(50, BRMediaMixxxM6.sendMeters));
  BRMediaMixxxM6.timers.push(engine.beginTimer(100, BRMediaMixxxM6.sendMixer));
  BRMediaMixxxM6.timers.push(engine.beginTimer(250, function () { BRMediaMixxxM6.sendPosition(1); BRMediaMixxxM6.sendPosition(2); }));
  BRMediaMixxxM6.timers.push(engine.beginTimer(1000, function () { BRMediaMixxxM6.sendSlowState(1); BRMediaMixxxM6.sendSlowState(2); }));
  BRMediaMixxxM6.timers.push(engine.beginTimer(2000, function () {
    midi.sendShortMsg(0x90, 0x70, 0x7f);
  }));
};
BRMediaMixxxM6.shutdown = function () {
  BRMediaMixxxM6.connections.forEach(function (connection) { connection.disconnect(); });
  BRMediaMixxxM6.timers.forEach(function (timer) { engine.stopTimer(timer); });
  BRMediaMixxxM6.connections = []; BRMediaMixxxM6.timers = []; BRMediaMixxxM6.lastMidi = {};
};
BRMediaMixxxM6.play = function (_channel, _control, value, _status, group) {
  if (value) script.toggleControl(group, "play");
};
BRMediaMixxxM6.cue = function (_channel, _control, value, _status, group) {
  engine.setValue(group, "cue_default", value ? 1 : 0);
};
BRMediaMixxxM6.heartbeat = function (_channel, _control, value) {
  if (value) midi.sendShortMsg(0x90, 0x70, value);
};
