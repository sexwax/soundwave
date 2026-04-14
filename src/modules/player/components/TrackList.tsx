import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { usePlayerStore } from '../store/playerStore';
import { formatTime } from '../../../shared/utils/audioUtils';
import type { LocalTrack } from '../../favorites/db/favoritesDb';

const VIRTUAL_THRESHOLD = 100;
const ROW_HEIGHT = 52;

function TrackRow({
  track,
  index,
  isActive,
  isPlaying,
  onClick,
}: {
  track: LocalTrack;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`${track.title} por ${track.artist}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 12px',
        height: ROW_HEIGHT,
        borderRadius: 8,
        background: isActive ? 'var(--bg-elevated)' : 'transparent',
        cursor: 'pointer',
        color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: 28, textAlign: 'center', fontSize: 12, color: 'var(--text-disabled)' }}>
        {isActive && isPlaying ? '▶' : index + 1}
      </div>
      {track.coverUrl && (
        <img src={track.coverUrl} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          {track.artist} {track.album !== 'Unknown' && `• ${track.album}`}
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-disabled)', flexShrink: 0 }}>
        {track.duration > 0 ? formatTime(track.duration) : '--:--'}
      </div>
    </div>
  );
}

export function TrackList() {
  const { queue, shuffledQueue, isShuffled, currentIndex, isPlaying, setCurrentIndex, setIsPlaying } = usePlayerStore();
  const parentRef = useRef<HTMLDivElement>(null);

  // When shuffle is active, display shuffledQueue so the visual order matches
  // what useAudioEngine will play (it reads shuffledQueue[currentIndex]).
  const displayQueue = isShuffled && shuffledQueue.length === queue.length ? shuffledQueue : queue;

  const playTrack = (index: number) => {
    setCurrentIndex(index);
    setIsPlaying(true);
  };

  const virtualizer = useVirtualizer({
    count: queue.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    enabled: queue.length > VIRTUAL_THRESHOLD,
  });

  if (displayQueue.length <= VIRTUAL_THRESHOLD) {
    // Non-virtual: TrackList owns scroll so LocalPlayer can always use overflow:hidden
    return (
      <div ref={parentRef} style={{ height: '100%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {displayQueue.map((track, i) => (
            <TrackRow
              key={track.filePath}
              track={track}
              index={i}
              isActive={i === currentIndex}
              isPlaying={isPlaying}
              onClick={() => playTrack(i)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={parentRef} style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vi) => (
          <div
            key={displayQueue[vi.index].filePath}
            style={{ position: 'absolute', top: vi.start, left: 0, right: 0, height: vi.size }}
          >
            <TrackRow
              track={displayQueue[vi.index]}
              index={vi.index}
              isActive={vi.index === currentIndex}
              isPlaying={isPlaying}
              onClick={() => playTrack(vi.index)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
