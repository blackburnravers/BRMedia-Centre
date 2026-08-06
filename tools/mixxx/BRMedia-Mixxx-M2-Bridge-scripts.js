var BRMediaMixxxM2 = {};
BRMediaMixxxM2.init = function (_id, _debugging) {};
BRMediaMixxxM2.shutdown = function () {};
BRMediaMixxxM2.play = function (_channel, _control, value, _status, group) {
  if (value) script.toggleControl(group, "play");
};
BRMediaMixxxM2.cue = function (_channel, _control, value, _status, group) {
  engine.setValue(group, "cue_default", value ? 1 : 0);
};
BRMediaMixxxM2.heartbeat = function (_channel, _control, value) {
  if (value) midi.sendShortMsg(0x90, 0x7f, value);
};
