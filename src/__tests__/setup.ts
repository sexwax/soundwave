import { vi } from 'vitest';

// jsdom implements <audio>/<video> elements but not real playback — without
// these, any code calling .play()/.pause()/.load() throws "not implemented".
window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
window.HTMLMediaElement.prototype.pause = vi.fn();
window.HTMLMediaElement.prototype.load = vi.fn();

// jsdom 30's URL.createObjectURL throws on File/Blob objects built in tests
// ("Cannot read properties of undefined (reading '_buffer')") — stub it so
// code paths that register files/covers (useLocalFiles, localEngine) don't
// crash under test.
let objectUrlCounter = 0;
URL.createObjectURL = vi.fn(() => `blob:mock-${objectUrlCounter++}`);
URL.revokeObjectURL = vi.fn();

class MockAudioParam {
  value = 0;
  setTargetAtTime = vi.fn();
}

class MockAudioNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockGainNode extends MockAudioNode {
  gain = new MockAudioParam();
}

class MockBiquadFilterNode extends MockAudioNode {
  type = 'peaking';
  frequency = new MockAudioParam();
  Q = new MockAudioParam();
  gain = new MockAudioParam();
}

class MockAnalyserNode extends MockAudioNode {
  fftSize = 2048;
  frequencyBinCount = 1024;
  smoothingTimeConstant = 0.8;
  getByteFrequencyData = vi.fn();
  getByteTimeDomainData = vi.fn();
}

class MockAudioContext {
  state = 'running';
  currentTime = 0;
  destination = new MockAudioNode();
  createGain() { return new MockGainNode(); }
  createBiquadFilter() { return new MockBiquadFilterNode(); }
  createAnalyser() { return new MockAnalyserNode(); }
  createMediaElementSource() { return new MockAudioNode(); }
  createMediaStreamSource() { return new MockAudioNode(); }
  createMediaStreamDestination() { return { stream: {}, ...new MockAudioNode() }; }
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

// jsdom doesn't implement Web Audio at all — stub it globally so any module
// that calls `new AudioContext()` (audioGraph.ts, recorderService.ts) gets a
// harmless fake instead of a "AudioContext is not defined" crash.
vi.stubGlobal('AudioContext', MockAudioContext);
