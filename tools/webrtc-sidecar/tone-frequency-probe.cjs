"use strict";

const wrtc = require("@roamhq/wrtc");
const { PcmRealtimeScheduler } = require("./pcm-scheduler.cjs");

function toneFrame(sequence, frequency = 440) {
  const samples = new Int16Array(960);
  for (let frame = 0; frame < 480; frame += 1) {
    const value = Math.round(Math.sin(2 * Math.PI * frequency * (sequence * 480 + frame) / 48000) * 12000);
    samples[frame * 2] = value;
    samples[frame * 2 + 1] = value;
  }
  return samples;
}

async function run() {
  const sender = new wrtc.RTCPeerConnection({ iceServers: [] });
  const receiver = new wrtc.RTCPeerConnection({ iceServers: [] });
  sender.onicecandidate = event => { if (event.candidate) void receiver.addIceCandidate(event.candidate); };
  receiver.onicecandidate = event => { if (event.candidate) void sender.addIceCandidate(event.candidate); };
  const source = new wrtc.nonstandard.RTCAudioSource();
  const track = source.createTrack();
  sender.addTrack(track);
  let sequence = 0;
  const scheduler = new PcmRealtimeScheduler({ sampleRate: 48000, channels: 2, frameDurationMs: 10,
    prebufferFrames: 4, maxQueueFrames: 12, onFrame(samples, numberOfFrames) {
      source.onData({ samples, sampleRate: 48000, bitsPerSample: 16, channelCount: 2, numberOfFrames });
      scheduler.enqueue(toneFrame(sequence), sequence); sequence += 1;
    } });
  for (; sequence < 12; sequence += 1) scheduler.enqueue(toneFrame(sequence), sequence);
  const received = [];
  receiver.ontrack = event => {
    const sink = new wrtc.nonstandard.RTCAudioSink(event.track);
    sink.ondata = data => received.push({ samples: new Int16Array(data.samples), channels: data.channelCount, rate: data.sampleRate });
    receiver.sink = sink;
  };
  await sender.setLocalDescription(await sender.createOffer());
  await receiver.setRemoteDescription(sender.localDescription);
  await receiver.setLocalDescription(await receiver.createAnswer());
  await sender.setRemoteDescription(receiver.localDescription);
  await new Promise(resolve => setTimeout(resolve, 3000));
  scheduler.stop();
  let crossings = 0; let previous = 0; let sampleCount = 0; let sampleRate = 0;
  for (const block of received.slice(20)) {
    sampleRate = block.rate;
    for (let index = 0; index < block.samples.length; index += block.channels) {
      const value = block.samples[index];
      if (previous <= 0 && value > 0) crossings += 1;
      previous = value; sampleCount += 1;
    }
  }
  const durationSeconds = sampleCount / sampleRate;
  const measuredHz = crossings / durationSeconds;
  const diagnostics = scheduler.diagnostics();
  receiver.sink?.stop(); track.stop(); sender.close(); receiver.close();
  process.stdout.write(`${JSON.stringify({ measuredHz, durationSeconds, sampleRate, blocks: received.length, diagnostics }, null, 2)}\n`);
  if (Math.abs(measuredHz - 440) > 2) process.exitCode = 1;
  setTimeout(() => process.exit(process.exitCode || 0), 250);
}

run().catch(error => { console.error(error); process.exit(1); });
