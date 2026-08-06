/* BRMedia M26 bounded, audio-only PCM playout worklet. */
class BRMediaM26PcmPlayer extends AudioWorkletProcessor {
  constructor(options = {}) {
    super();
    const requested = Number(options.processorOptions?.capacityFrames) || 24000;
    this.capacityFrames = Math.max(2400, Math.min(48000, Math.floor(requested)));
    this.channels = 2;
    this.buffer = new Float32Array(this.capacityFrames * this.channels);
    this.readFrame = 0;
    this.writeFrame = 0;
    this.availableFrames = 0;
    this.underruns = 0;
    this.droppedFrames = 0;
    this.reportCountdown = 0;
    this.port.onmessage = (event) => this.onMessage(event.data);
  }

  reset(channels = this.channels) {
    this.channels = channels === 1 ? 1 : 2;
    this.buffer = new Float32Array(this.capacityFrames * this.channels);
    this.readFrame = 0;
    this.writeFrame = 0;
    this.availableFrames = 0;
  }

  onMessage(message = {}) {
    if (message.type === "reset") return this.reset(message.channels);
    if (message.type !== "push" || !(message.pcm instanceof Float32Array)) return;
    const channels = message.channels === 1 ? 1 : 2;
    if (channels !== this.channels) this.reset(channels);
    const source = message.pcm;
    const incomingFrames = Math.floor(source.length / channels);
    if (!incomingFrames) return;

    const skip = Math.max(0, incomingFrames - this.capacityFrames);
    if (skip) this.droppedFrames += skip;
    const acceptedFrames = incomingFrames - skip;
    const overflow = Math.max(0, this.availableFrames + acceptedFrames - this.capacityFrames);
    if (overflow) {
      this.readFrame = (this.readFrame + overflow) % this.capacityFrames;
      this.availableFrames -= overflow;
      this.droppedFrames += overflow;
    }
    for (let frame = skip; frame < incomingFrames; frame += 1) {
      for (let channel = 0; channel < channels; channel += 1) {
        this.buffer[(this.writeFrame * channels) + channel] = source[(frame * channels) + channel] || 0;
      }
      this.writeFrame = (this.writeFrame + 1) % this.capacityFrames;
      this.availableFrames += 1;
    }
  }

  process(_inputs, outputs) {
    const output = outputs[0];
    const frames = output?.[0]?.length || 0;
    if (!frames) return true;
    for (let frame = 0; frame < frames; frame += 1) {
      if (this.availableFrames <= 0) {
        for (let channel = 0; channel < output.length; channel += 1) output[channel][frame] = 0;
        this.underruns += 1;
        continue;
      }
      for (let channel = 0; channel < output.length; channel += 1) {
        const sourceChannel = Math.min(channel, this.channels - 1);
        output[channel][frame] = this.buffer[(this.readFrame * this.channels) + sourceChannel] || 0;
      }
      this.readFrame = (this.readFrame + 1) % this.capacityFrames;
      this.availableFrames -= 1;
    }
    this.reportCountdown -= frames;
    if (this.reportCountdown <= 0) {
      this.reportCountdown = sampleRate;
      this.port.postMessage({
        type: "metrics",
        bufferedFrames: this.availableFrames,
        capacityFrames: this.capacityFrames,
        underruns: this.underruns,
        droppedFrames: this.droppedFrames,
      });
    }
    return true;
  }
}

registerProcessor("brmedia-m26-pcm-player", BRMediaM26PcmPlayer);
