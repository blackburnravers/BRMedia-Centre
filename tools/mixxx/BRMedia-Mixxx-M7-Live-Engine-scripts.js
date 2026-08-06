// BRMediaMixxx protocol v5. Preserves every earlier assignment.
var BRMediaMixxxM7 = {};
BRMediaMixxxM7.connections = [];
BRMediaMixxxM7.timers = [];
BRMediaMixxxM7.sequence = [0, 0];
BRMediaMixxxM7.lastMidi = {};
BRMediaMixxxM7.seekPairs = [{}, {}];
BRMediaMixxxM7.professionalPairs = [{}, {}];
BRMediaMixxxM7.pendingLoads = [null, null];

BRMediaMixxxM7.decodeUtf8 = function (bytes) {
  var output = "", index = 0;
  while (index < bytes.length) {
    var first = bytes[index++], codePoint;
    if (first < 0x80) codePoint = first;
    else if ((first & 0xe0) === 0xc0 && index < bytes.length)
      codePoint = ((first & 0x1f) << 6) | (bytes[index++] & 0x3f);
    else if ((first & 0xf0) === 0xe0 && index + 1 < bytes.length)
      codePoint = ((first & 0x0f) << 12) | ((bytes[index++] & 0x3f) << 6) | (bytes[index++] & 0x3f);
    else if ((first & 0xf8) === 0xf0 && index + 2 < bytes.length) {
      codePoint = ((first & 0x07) << 18) | ((bytes[index++] & 0x3f) << 12) |
        ((bytes[index++] & 0x3f) << 6) | (bytes[index++] & 0x3f);
    } else return null;
    if (codePoint <= 0xffff) output += String.fromCharCode(codePoint);
    else { codePoint -= 0x10000; output += String.fromCharCode(0xd800 + (codePoint >> 10), 0xdc00 + (codePoint & 0x3ff)); }
  }
  return output;
};
BRMediaMixxxM7.sendLoadAck = function (deck, state, requestId) {
  // Short deck/state acknowledgement is the reliable live path on the virtual MIDI port.
  // The request-id SysEx remains for compatible controllers and diagnostics.
  midi.sendShortMsg(0x90, deck === 1 ? 0x74 : 0x75, state);
  var message = [0xf0, 0x7d, 0x42, 0x52, 0x4d, 0x21, deck, state];
  for (var index = 0; index < requestId.length; index++) {
    var value = requestId.charCodeAt(index);
    message.push((value >> 4) & 0x0f, value & 0x0f);
  }
  message.push(0xf7); midi.sendSysexMsg(message, message.length);
};
BRMediaMixxxM7.sendLoadCapability = function () {
  if (typeof engine.loadTrack === "function") midi.sendShortMsg(0x90, 0x73, 0x01);
};
BRMediaMixxxM7.incomingData = function (data, length) {
  if (length < 9 || data[0] !== 0xf0 || data[1] !== 0x7d || data[2] !== 0x42 ||
      data[3] !== 0x52 || data[4] !== 0x4d || data[5] !== 0x20 || data[length - 1] !== 0xf7) return;
  var nibbles = [], index;
  for (index = 6; index < length - 1; index++) {
    var nibble = Number(data[index]); if (nibble < 0 || nibble > 15) return; nibbles.push(nibble);
  }
  if (nibbles.length % 2) return;
  var bytes = [];
  for (index = 0; index < nibbles.length; index += 2) bytes.push((nibbles[index] << 4) | nibbles[index + 1]);
  var text = BRMediaMixxxM7.decodeUtf8(bytes), request;
  try { request = JSON.parse(text); } catch (_error) { return; }
  if (!request || request.v !== 1 || (request.d !== 1 && request.d !== 2) ||
      !/^[A-Za-z0-9_-]{8,96}$/.test(request.r) || typeof request.p !== "string" ||
      request.p.length > 1024 || request.a !== false || typeof engine.loadTrack !== "function") return;
  if (!/^H:\\Music(?:\\|$)/i.test(request.p) || /(?:^|\\)\.\.(?:\\|$)/.test(request.p) ||
      /^\\\\/.test(request.p) || /^\\\\\?\\/.test(request.p)) {
    BRMediaMixxxM7.sendLoadAck(request.d, 3, request.r); return;
  }
  var group = "[Channel" + request.d + "]";
  if (engine.getValue(group, "play_latched") > 0 && request.x !== true) {
    BRMediaMixxxM7.sendLoadAck(request.d, 4, request.r); return;
  }
  BRMediaMixxxM7.pendingLoads[request.d - 1] = { requestId: request.r };
  if (!engine.loadTrack(group, request.p)) {
    BRMediaMixxxM7.pendingLoads[request.d - 1] = null;
    BRMediaMixxxM7.sendLoadAck(request.d, 3, request.r); return;
  }
  BRMediaMixxxM7.sendLoadAck(request.d, 1, request.r);
};

BRMediaMixxxM7.clamp = function (value, minimum, maximum) {
  var numeric = Number(value);
  if (!Number.isFinite(numeric)) return minimum;
  return Math.max(minimum, Math.min(maximum, numeric));
};
BRMediaMixxxM7.sendChanged = function (status, control, value) {
  var safe = Math.round(BRMediaMixxxM7.clamp(value, 0, 127));
  var key = status + ":" + control;
  if (BRMediaMixxxM7.lastMidi[key] === safe) return;
  BRMediaMixxxM7.lastMidi[key] = safe;
  midi.sendShortMsg(status, control, safe);
};
BRMediaMixxxM7.send14 = function (base, highOffset, lowOffset, raw) {
  var value = Math.round(BRMediaMixxxM7.clamp(raw, 0, 16383));
  BRMediaMixxxM7.sendChanged(0x90, base + highOffset, (value >> 7) & 0x7f);
  BRMediaMixxxM7.sendChanged(0x90, base + lowOffset, value & 0x7f);
};
BRMediaMixxxM7.send14Status = function (status, base, highOffset, lowOffset, raw) {
  var value = Math.round(BRMediaMixxxM7.clamp(raw, 0, 16383));
  BRMediaMixxxM7.sendChanged(status, base + highOffset, (value >> 7) & 0x7f);
  BRMediaMixxxM7.sendChanged(status, base + lowOffset, value & 0x7f);
};
BRMediaMixxxM7.duration = function (group) {
  var direct = engine.getValue(group, "duration");
  if (Number.isFinite(direct) && direct > 0) return direct;
  var samples = engine.getValue(group, "track_samples");
  var sampleRate = engine.getValue(group, "track_samplerate");
  return samples > 0 && sampleRate > 0 ? samples / sampleRate / 2 : 0;
};
BRMediaMixxxM7.sendFlags = function (deck) {
  var group = "[Channel" + deck + "]", value = 0;
  if (engine.getValue(group, "track_loaded") > 0) value |= 1;
  if (engine.getValue(group, "play_latched") > 0) value |= 2;
  var cue = engine.getValue(group, "cue_cdj");
  if (Number.isFinite(cue)) { value |= 4; if (cue > 0) value |= 8; }
  if (engine.getValue(group, "end_of_track") > 0) value |= 16;
  BRMediaMixxxM7.sendChanged(0x90, deck === 1 ? 0x30 : 0x40, value);
};
BRMediaMixxxM7.sendPosition = function (deck) {
  var group = "[Channel" + deck + "]";
  if (engine.getValue(group, "track_loaded") <= 0) return;
  var base = deck === 1 ? 0x30 : 0x40;
  var normalised = BRMediaMixxxM7.clamp(engine.getValue(group, "playposition"), 0, 1);
  var duration = BRMediaMixxxM7.duration(group);
  BRMediaMixxxM7.send14(base, 1, 2, normalised * 16383);
  BRMediaMixxxM7.send14(base, 5, 6, normalised * duration * 10);
  BRMediaMixxxM7.commitDeck(deck);
};
BRMediaMixxxM7.commitDeck = function (deck) {
  var base = deck === 1 ? 0x30 : 0x40;
  BRMediaMixxxM7.sequence[deck - 1] = (BRMediaMixxxM7.sequence[deck - 1] + 1) & 0x7f;
  midi.sendShortMsg(0x90, base + 15, BRMediaMixxxM7.sequence[deck - 1]);
};
BRMediaMixxxM7.sendSlowState = function (deck) {
  var group = "[Channel" + deck + "]", base = deck === 1 ? 0x30 : 0x40;
  BRMediaMixxxM7.sendFlags(deck);
  if (engine.getValue(group, "track_loaded") > 0) {
    BRMediaMixxxM7.send14(base, 3, 4, BRMediaMixxxM7.duration(group) * 10);
    BRMediaMixxxM7.send14(base, 7, 8, engine.getValue(group, "file_bpm") * 10);
    BRMediaMixxxM7.send14(base, 9, 10, engine.getValue(group, "bpm") * 10);
    BRMediaMixxxM7.send14(base, 11, 12, 8192 + engine.getValue(group, "rate") * 8191);
    BRMediaMixxxM7.send14(base, 13, 14, engine.getValue(group, "rateRange") * 16383);
  }
  BRMediaMixxxM7.commitDeck(deck);
};

// Wire boost controls have BRMedia neutral at 2/3; Mixxx parameters neutral at 1/2.
BRMediaMixxxM7.wireToBoostParameter = function (wire) {
  var value = BRMediaMixxxM7.clamp(wire, 0, 1);
  return value <= 2 / 3 ? value * 0.75 : 0.5 + (value - 2 / 3) * 1.5;
};
BRMediaMixxxM7.boostParameterToWire = function (parameter) {
  var value = BRMediaMixxxM7.clamp(parameter, 0, 1);
  return value <= 0.5 ? value / 0.75 : 2 / 3 + (value - 0.5) / 1.5;
};
BRMediaMixxxM7.mixerMap = {
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
  ,0x67: ["[Channel1]", "mute", false, true]
  ,0x68: ["[Channel2]", "mute", false, true]
};
BRMediaMixxxM7.mixerInput = function (_channel, control, value) {
  var target = BRMediaMixxxM7.mixerMap[control];
  if (!target) return;
  var wire = BRMediaMixxxM7.clamp(value, 0, 127) / 127;
  if (target[3]) engine.setValue(target[0], target[1], wire >= 0.5 ? 1 : 0);
  else engine.setParameter(target[0], target[1], target[2] ? BRMediaMixxxM7.wireToBoostParameter(wire) : wire);
};
BRMediaMixxxM7.sendMixer = function () {
  Object.keys(BRMediaMixxxM7.mixerMap).forEach(function (rawControl) {
    var control = Number(rawControl), target = BRMediaMixxxM7.mixerMap[control];
    var value = target[3] ? engine.getValue(target[0], target[1]) :
      engine.getParameter(target[0], target[1]);
    var wire = target[2] ? BRMediaMixxxM7.boostParameterToWire(value) :
      BRMediaMixxxM7.clamp(value, 0, 1);
    BRMediaMixxxM7.sendChanged(0xb1, control, wire * 127);
  });
};
BRMediaMixxxM7.sendMeters = function () {
  BRMediaMixxxM7.sendChanged(0xb1, 0x60, engine.getValue("[Channel1]", "vu_meter") * 127);
  BRMediaMixxxM7.sendChanged(0xb1, 0x61, engine.getValue("[Channel1]", "PeakIndicator") > 0 ? 127 : 0);
  BRMediaMixxxM7.sendChanged(0xb1, 0x62, engine.getValue("[Channel2]", "vu_meter") * 127);
  BRMediaMixxxM7.sendChanged(0xb1, 0x63, engine.getValue("[Channel2]", "PeakIndicator") > 0 ? 127 : 0);
  BRMediaMixxxM7.sendChanged(0xb1, 0x64, engine.getValue("[Master]", "vu_meter_left") * 127);
  BRMediaMixxxM7.sendChanged(0xb1, 0x65, engine.getValue("[Master]", "vu_meter_right") * 127);
  BRMediaMixxxM7.sendChanged(0xb1, 0x66, engine.getValue("[Master]", "PeakIndicator") > 0 ? 127 : 0);
};
BRMediaMixxxM7.snapshot = function () {
  BRMediaMixxxM7.sendSlowState(1); BRMediaMixxxM7.sendSlowState(2);
  BRMediaMixxxM7.sendPosition(1); BRMediaMixxxM7.sendPosition(2);
  BRMediaMixxxM7.sendMixer(); BRMediaMixxxM7.sendMeters(); BRMediaMixxxM7.sendPerformance(1); BRMediaMixxxM7.sendPerformance(2);
  BRMediaMixxxM7.sendProfessional(1); BRMediaMixxxM7.sendProfessional(2);
  midi.sendShortMsg(0x90, 0x72, 0x7f);
};
BRMediaMixxxM7.init = function (_id, _debugging) {
  midi.sendShortMsg(0x90, 0x71, 5);
  BRMediaMixxxM7.sendLoadCapability();
  [1, 2].forEach(function (deck) {
    var group = "[Channel" + deck + "]";
    ["track_loaded", "play_latched", "cue_cdj"].forEach(function (control) {
      var connection = engine.makeConnection(group, control, function (value) {
        BRMediaMixxxM7.sendFlags(deck);
        var pending = BRMediaMixxxM7.pendingLoads[deck - 1];
        if (control === "track_loaded" && value > 0 && pending) {
          BRMediaMixxxM7.sendLoadAck(deck, 2, pending.requestId);
          BRMediaMixxxM7.pendingLoads[deck - 1] = null;
        }
      });
      if (connection) { BRMediaMixxxM7.connections.push(connection); connection.trigger(); }
    });
  });
  BRMediaMixxxM7.snapshot();
  BRMediaMixxxM7.timers.push(engine.beginTimer(50, BRMediaMixxxM7.sendMeters));
  BRMediaMixxxM7.timers.push(engine.beginTimer(100, BRMediaMixxxM7.sendMixer));
  BRMediaMixxxM7.timers.push(engine.beginTimer(125, function () {
    BRMediaMixxxM7.sendPerformance(1); BRMediaMixxxM7.sendPerformance(2);
    BRMediaMixxxM7.sendProfessional(1); BRMediaMixxxM7.sendProfessional(2);
  }));
  BRMediaMixxxM7.timers.push(engine.beginTimer(250, function () { BRMediaMixxxM7.sendPosition(1); BRMediaMixxxM7.sendPosition(2); }));
  BRMediaMixxxM7.timers.push(engine.beginTimer(1000, function () { BRMediaMixxxM7.sendSlowState(1); BRMediaMixxxM7.sendSlowState(2); }));
  BRMediaMixxxM7.timers.push(engine.beginTimer(2000, function () {
    BRMediaMixxxM7.lastMidi = {};
    midi.sendShortMsg(0x90, 0x71, 5);
    midi.sendShortMsg(0x90, 0x70, 0x7f);
    BRMediaMixxxM7.sendLoadCapability();
    BRMediaMixxxM7.snapshot();
  }));
};
BRMediaMixxxM7.shutdown = function () {
  BRMediaMixxxM7.connections.forEach(function (connection) { connection.disconnect(); });
  BRMediaMixxxM7.timers.forEach(function (timer) { engine.stopTimer(timer); });
  BRMediaMixxxM7.connections = []; BRMediaMixxxM7.timers = []; BRMediaMixxxM7.lastMidi = {};
BRMediaMixxxM7.seekPairs = [{}, {}];
  BRMediaMixxxM7.professionalPairs = [{}, {}];
  BRMediaMixxxM7.pendingLoads = [null, null];
};
BRMediaMixxxM7.play = function (_channel, _control, value, _status, group) {
  if (value) engine.setValue(group, "play", 1);
};
BRMediaMixxxM7.pause = function (_channel, _control, value, _status, group) {
  if (value) engine.setValue(group, "play", 0);
};
BRMediaMixxxM7.stop = function (_channel, _control, value, _status, group) {
  if (!value) return;
  engine.setValue(group, "play", 0);
  engine.setParameter(group, "playposition", 0);
};
BRMediaMixxxM7.unload = function (_channel, _control, value, _status, group) {
  if (!value) return;
  var playing = engine.getValue(group, "play_latched") > 0;
  if (playing && value !== 126) return;
  engine.setValue(group, "eject", 1);
};
BRMediaMixxxM7.cue = function (_channel, _control, value, _status, group) {
  engine.setValue(group, "cue_default", value ? 1 : 0);
};
BRMediaMixxxM7.performanceInput = function (_channel, control, value) {
  var deck = control >= 0x20 ? 2 : 1, local = deck === 2 ? control - 0x20 : control;
  var group = "[Channel" + deck + "]";
  if (local === 0x09 || local === 0x0a) {
    var pair = BRMediaMixxxM7.seekPairs[deck - 1];
    pair[local === 0x09 ? "high" : "low"] = value & 0x7f;
    if (pair.high !== undefined && pair.low !== undefined) {
      if (engine.getValue(group, "scratch2_enable") <= 0 &&
          engine.getValue(group, "scratch_position_enable") <= 0) {
        engine.setParameter(group, "playposition", ((pair.high << 7) | pair.low) / 16383);
      }
      BRMediaMixxxM7.seekPairs[deck - 1] = {};
    }
    return;
  }
  if (!value) return;
  if (local === 0x00) script.toggleControl(group, "sync_enabled");
  else if (local === 0x01) script.toggleControl(group, "quantize");
  else if (local === 0x02) engine.setValue(group, "loop_in", 1);
  else if (local === 0x03) engine.setValue(group, "loop_out", 1);
  else if (local === 0x04) engine.setValue(group, "reloop_toggle", 1);
  else if (local === 0x05) engine.setValue(group, "beatloop_activate", 1);
  else if (local === 0x06) engine.setValue(group, "beatloop_size", Math.pow(2, (value - 64) / 8));
  else if (local === 0x07) engine.setValue(group, "beatjump_backward", 1);
  else if (local === 0x08) engine.setValue(group, "beatjump_forward", 1);
  else if (local >= 0x10 && local < 0x18) engine.setValue(group, "hotcue_" + (local - 0x0f) + "_activate", 1);
};
BRMediaMixxxM7.professionalInput = function (_channel, control, value) {
  var deck = control >= 0x20 ? 2 : 1;
  var local = deck === 2 ? control - 0x20 : control;
  var group = "[Channel" + deck + "]";
  var fxGroup = "[EffectRack1_EffectUnit" + deck + "]";
  var effectGroup = "[EffectRack1_EffectUnit" + deck + "_Effect1]";
  var pair = BRMediaMixxxM7.professionalPairs[deck - 1];
  function pairValue(name, part, callback) {
    var target = pair[name] || {};
    target[part] = value & 0x7f; pair[name] = target;
    if (target.high !== undefined && target.low !== undefined) {
      callback((target.high << 7) | target.low);
      delete pair[name];
    }
  }
  if (local === 0x09 || local === 0x0a) {
    pairValue("rate", local === 0x09 ? "high" : "low", function (raw) {
      engine.setValue(group, "rate", (raw - 8192) / 8191);
    });
    return;
  }
  if (local === 0x0b || local === 0x0c) {
    pairValue("range", local === 0x0b ? "high" : "low", function (raw) {
      engine.setValue(group, "rateRange", raw / 16383);
    });
    return;
  }
  if (local === 0x0f || local === 0x10) {
    engine.setParameter(local === 0x0f ? fxGroup : effectGroup, local === 0x0f ? "mix" : "parameter1", value / 127);
    return;
  }
  if (local === 0x08) { engine.setValue(group, "sync_enabled", value >= 64 ? 1 : 0); return; }
  if (local === 0x0d) { engine.setValue(group, "mute", value >= 64 ? 1 : 0); return; }
  if (local === 0x0e) { engine.setValue(fxGroup, "group_" + group + "_enable", value >= 64 ? 1 : 0); return; }
  if (!value) return;
  if (local === 0x00) engine.setValue(group, "cue_gotoandstop", 1);
  else if (local === 0x01) engine.setValue(group, "cue_set", 1);
  else if (local === 0x02) engine.setValue(group, "loop_halve", 1);
  else if (local === 0x03) engine.setValue(group, "loop_double", 1);
  else if (local === 0x04) engine.setValue(group, "beatjump_size", Math.pow(2, (value - 64) / 8));
  else if (local >= 0x05 && local <= 0x07) {
    var cue = Math.round(BRMediaMixxxM7.clamp(value, 1, 8));
    var suffix = local === 0x05 ? "_set" : local === 0x06 ? "_activate" : "_clear";
    engine.setValue(group, "hotcue_" + cue + suffix, 1);
  }
};
BRMediaMixxxM7.sendProfessional = function (deck) {
  var group = "[Channel" + deck + "]", base = deck === 1 ? 0x00 : 0x20;
  var durationSamples = Math.max(0, engine.getValue(group, "track_samples"));
  function normalised(control) {
    var value = engine.getValue(group, control);
    return durationSamples > 0 && value >= 0 ? value / durationSamples : 0;
  }
  BRMediaMixxxM7.send14Status(0xb5, base, 0, 1, normalised("cue_point") * 16383);
  var jump = engine.getValue(group, "beatjump_size");
  BRMediaMixxxM7.sendChanged(0xb5, base + 2, jump > 0 ? 64 + Math.log(jump) / Math.log(2) * 8 : 0);
  BRMediaMixxxM7.sendChanged(0xb5, base + 3, engine.getValue(group, "mute") > 0 ? 127 : 0);
  var fxGroup = "[EffectRack1_EffectUnit" + deck + "]";
  var effectGroup = "[EffectRack1_EffectUnit" + deck + "_Effect1]";
  BRMediaMixxxM7.sendChanged(0xb5, base + 4, engine.getParameter(effectGroup, "parameter1") * 127);
  BRMediaMixxxM7.send14Status(0xb5, base, 5, 6, normalised("loop_start_position") * 16383);
  BRMediaMixxxM7.send14Status(0xb5, base, 7, 8, normalised("loop_end_position") * 16383);
  for (var cue = 1; cue <= 8; cue++)
    BRMediaMixxxM7.sendChanged(0xb5, base + 15 + cue, engine.getValue(group, "hotcue_" + cue + "_status") * 63.5);
};
BRMediaMixxxM7.sendPerformance = function (deck) {
  var group = "[Channel" + deck + "]", base = deck === 1 ? 0x00 : 0x20;
  function b(offset, control) { BRMediaMixxxM7.sendChanged(0xb3, base + offset, engine.getValue(group, control) > 0 ? 127 : 0); }
  b(0, "sync_enabled"); b(1, "sync_leader"); b(2, "quantize"); b(3, "loop_enabled");
  var loopSize = engine.getValue(group, "beatloop_size");
  BRMediaMixxxM7.sendChanged(0xb3, base + 4, loopSize > 0 ? 64 + Math.log(loopSize) / Math.log(2) * 8 : 0);
  var beatDistance = BRMediaMixxxM7.clamp(engine.getValue(group, "beat_distance"), 0, 1);
  BRMediaMixxxM7.sendChanged(0xb3, base + 5, beatDistance * 127);
  BRMediaMixxxM7.sendChanged(0xb3, base + 8, engine.getValue(group, "visual_key"));
  b(9, "keylock");
  var fxGroup = "[EffectRack1_EffectUnit" + deck + "]";
  BRMediaMixxxM7.sendChanged(0xb3, base + 10, engine.getParameter(fxGroup, "mix") * 127);
  BRMediaMixxxM7.sendChanged(0xb3, base + 11, engine.getValue(fxGroup, "group_" + group + "_enable") > 0 ? 127 : 0);
  for (var cue = 1; cue <= 8; cue++) b(15 + cue, "hotcue_" + cue + "_enabled");
};
