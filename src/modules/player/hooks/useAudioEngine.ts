import { useEffect, useRef, useCallback } from 'react';
import { Howl, Howler } from 'howler';
import { usePlayerStore } from '../store/playerStore';
import { useAudioContext } from '../../../app/providers/AudioProvider';
import { stopRadio } from '../../radio/services/radioPlayer';

// Module-scope file registry: filePath → object URL
const fileMap = new Map<string, string>();
let howlRefGlobal: React.RefObject<Howl | null> | null = null;

export function registerFile(filePath: string, file: File) {
  if (!fileMap.has(filePath)) {
    fileMap.set(filePath, URL.createObjectURL(file));
  }
}

export function getFileUrl(filePath: string): string | undefined {
  return fileMap.get(filePath);
}

// Stop local player - called from radio to stop local playback
export function stopLocalPlayer() {
  if (howlRefGlobal?.current) {
    howlRefGlobal.current.unload();
    howlRefGlobal.current = null;
  }
}

export function useAudioEngine() {
  const howlRef = useRef<Howl | null>(null);

  // Store ref globally for radio to stop local playback
  useEffect(() => {
    howlRefGlobal = howlRef;
    return () => { howlRefGlobal = null; };
  }, []);
  const { isPlaying, volume, isMuted, crossfadeDuration, playTrigger,
    setIsPlaying, setCurrentTime, setDuration, nextTrack,
  } = usePlayerStore();
  const { connectMediaElement } = useAudioContext();

  // Shuffle-aware current track selector
  const currentTrack = usePlayerStore((s) => {
    const active = s.isShuffled && s.shuffledQueue.length === s.queue.length
      ? s.shuffledQueue
      : s.queue;
    return active[s.currentIndex] ?? null;
  });

  // Refs so callbacks always read latest values without re-creating
  const volumeRef = useRef(isMuted ? 0 : volume);
  const crossfadeRef = useRef(crossfadeDuration);
  const durationRef = useRef(0);
  const connectMediaElementRef = useRef(connectMediaElement);

  useEffect(() => { volumeRef.current = isMuted ? 0 : volume; }, [volume, isMuted]);
  useEffect(() => { crossfadeRef.current = crossfadeDuration; }, [crossfadeDuration]);
  useEffect(() => { connectMediaElementRef.current = connectMediaElement; }, [connectMediaElement]);

  const loadAndPlay = useCallback((url: string) => {
    // Stop radio if it's playing before starting local playback
    stopRadio();

    if (howlRef.current) {
      howlRef.current.unload();
      howlRef.current = null;
    }
    const cf = crossfadeRef.current;
    const targetVol = volumeRef.current;

    const howl = new Howl({
      src: [url],
      html5: true,
      volume: cf > 0 ? 0 : targetVol,
      onplay: () => {
        setIsPlaying(true);
        if (cf > 0) howl.fade(0, targetVol, cf * 1000);
      },
      onpause: () => setIsPlaying(false),
      onend: () => nextTrack(),
      onload: () => {
        const dur = howl.duration();
        durationRef.current = dur;
        setDuration(dur);
        // Route audio element through Web Audio chain (EQ + visualizer)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sounds = (howl as any)._sounds;
        if (sounds?.[0]?._node instanceof HTMLMediaElement) {
          void connectMediaElementRef.current(sounds[0]._node);
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onloaderror: (_: any, err: unknown) => console.error('Load error', err),
    });
    howlRef.current = howl;
    howl.play();
  }, [setIsPlaying, setDuration, nextTrack]);

  // Stable ref to always call the latest loadAndPlay
  const loadAndPlayRef = useRef(loadAndPlay);
  useEffect(() => { loadAndPlayRef.current = loadAndPlay; }, [loadAndPlay]);

  // Trigger load when track changes or repeat-track fires
  useEffect(() => {
    if (!currentTrack) return;
    const url = getFileUrl(currentTrack.filePath);
    if (url) loadAndPlayRef.current(url);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.filePath, playTrigger]);

  // Sync isPlaying state (external pause/play without track change)
  useEffect(() => {
    if (!howlRef.current) return;
    if (isPlaying && !howlRef.current.playing()) howlRef.current.play();
    else if (!isPlaying && howlRef.current.playing()) howlRef.current.pause();
  }, [isPlaying]);

  // Volume changes
  useEffect(() => {
    const v = isMuted ? 0 : volume;
    if (howlRef.current) howlRef.current.volume(v);
    Howler.volume(v);
  }, [volume, isMuted]);

  // Time polling + crossfade fade-out
  useEffect(() => {
    const id = setInterval(() => {
      const h = howlRef.current;
      if (!h?.playing()) return;
      const t = h.seek() as number;
      setCurrentTime(t);
      const cf = crossfadeRef.current;
      const dur = durationRef.current;
      if (cf > 0 && dur > 0) {
        const remaining = dur - t;
        if (remaining > 0 && remaining <= cf) {
          h.volume((remaining / cf) * volumeRef.current);
        }
      }
    }, 200);
    return () => clearInterval(id);
  }, [setCurrentTime]);

  const seek = useCallback((seconds: number) => {
    const howl = howlRef.current;
    if (howl && howl.playing()) {
      howl.seek(seconds);
      setCurrentTime(seconds);
    }
  }, [setCurrentTime]);

  return { seek, howlRef };
}
