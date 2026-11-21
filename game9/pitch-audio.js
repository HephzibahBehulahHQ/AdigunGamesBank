import { randomFor } from '../shared/progression.js';

const sounds = {
  step: { duration: 0.11, weight: 0.15, pitch: 87, decay: 34, grit: 0.43 },
  kick: { duration: 0.19, weight: 0.65, pitch: 117, decay: 25, grit: 0.37 },
  touch: { duration: 0.13, weight: 0.34, pitch: 103, decay: 30, grit: 0.53 },
  net: { duration: 0.34, weight: 0.09, pitch: 51, decay: 16, grit: 0.66 },
  ready: { duration: 0.16, weight: 0.45, pitch: 620, decay: 18, grit: 0 }
};

function makeSounds(context) {
  return Object.fromEntries(Object.entries(sounds).map(([name, sound], index) => {
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * sound.duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    const random = randomFor(665 + index);
    let low = 0;
    for (let sample = 0; sample < samples.length; sample++) {
      const seconds = sample / context.sampleRate;
      const white = random() * 2 - 1;
      low += (white - low) * 0.08;
      const phase = 2 * Math.PI * sound.pitch * (seconds + 0.009 * (1 - Math.exp(-seconds * 60)));
      const onset = Math.min(1, seconds * 420);
      const tail = Math.exp(-seconds * sound.decay) * (1 - seconds / sound.duration);
      const air = (white - low) * Math.exp(-seconds * 22) * 0.14;
      samples[sample] = onset * tail * (Math.sin(phase) * sound.weight + low * sound.grit + air);
    }
    return [name, buffer];
  }));
}

export function createPitchAudio() {
  let context;
  let output;
  let samples;
  let enabled = false;
  const active = new Set();

  function stop() {
    for (const source of active) source.stop();
    active.clear();
  }

  return {
    get enabled() { return enabled; },
    async toggle() {
      if (enabled) {
        enabled = false;
        stop();
        return false;
      }
      context ??= new AudioContext();
      if (!output) {
        output = context.createGain();
        output.gain.value = 0.32;
        output.connect(context.destination);
        samples = makeSounds(context);
      }
      await context.resume();
      if (context.state !== 'running') throw new Error('Sound could not start.');
      enabled = true;
      return true;
    },
    play(name, x, delay = 0, volume = 1) {
      if (!enabled || context.state !== 'running') return;
      const source = context.createBufferSource();
      source.buffer = samples[name];
      const panner = context.createStereoPanner();
      panner.pan.value = Math.max(-0.85, Math.min(0.85, x / 6));
      const gain = context.createGain();
      gain.gain.value = volume;
      source.connect(panner).connect(gain).connect(output);
      active.add(source);
      source.onended = () => {
        active.delete(source);
        source.disconnect();
        panner.disconnect();
        gain.disconnect();
      };
      source.start(context.currentTime + delay);
    },
    stop
  };
}
