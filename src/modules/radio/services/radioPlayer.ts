import type { Howl } from 'howler';
import { useRadioStore } from '../store/radioStore';

let radioHowl: Howl | null = null;

export function getRadioHowl(): Howl | null {
  return radioHowl;
}

export function setRadioHowl(howl: Howl | null) {
  radioHowl = howl;
}

/** Stop radio playback and reset radio store state. Safe to call when nothing is playing. */
export function stopRadio() {
  if (radioHowl) {
    radioHowl.unload();
    radioHowl = null;
  }
  const { setIsPlaying, setStatus } = useRadioStore.getState();
  setIsPlaying(false);
  setStatus('idle');
}
