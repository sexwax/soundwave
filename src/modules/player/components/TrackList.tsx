import { useRef, useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { usePlayerStore } from '../store/playerStore';
import { useShallow } from 'zustand/react/shallow';
import { formatTime } from '../../../shared/utils/audioUtils';
import type { LocalTrack } from '../../favorites/db/favoritesDb';

const VIRTUAL_THRESHOLD = 100;
const ROW_HEIGHT = 52;

interface FilteredRow {
  track: LocalTrack;
  /** Index into the active list (queue or shuffledQueue) — what playIndex expects. */
  index: number;
}

function matchesFilter(track: LocalTrack, query: string): boolean {
  return (
    track.title.toLowerCase().includes(query) ||
    track.artist.toLowerCase().includes(query) ||
    track.album.toLowerCase().includes(query)
  );
}

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

interface TrackListProps {
  filter?: string;
}

export function TrackList({ filter = '' }: TrackListProps) {
  const { queue, shuffledQueue, isShuffled, currentIndex, isPlaying, playIndex } = usePlayerStore(
    useShallow((s) => ({
      queue: s.queue, shuffledQueue: s.shuffledQueue, isShuffled: s.isShuffled,
      currentIndex: s.currentIndex, isPlaying: s.isPlaying, playIndex: s.playIndex,
    })),
  );
  const parentRef = useRef<HTMLDivElement>(null);

  // When shuffle is active, display shuffledQueue so the visual order matches
  // what localEngine will play (it reads shuffledQueue[currentIndex]).
  const displayQueue = isShuffled && shuffledQueue.length === queue.length ? shuffledQueue : queue;

  const rows = useMemo<FilteredRow[]>(() => {
    const query = filter.trim().toLowerCase();
    const withIndex = displayQueue.map((track, index) => ({ track, index }));
    return query ? withIndex.filter((row) => matchesFilter(row.track, query)) : withIndex;
  }, [displayQueue, filter]);

  // Auto-scroll to current track when it changes
  useEffect(() => {
    if (currentIndex >= 0 && parentRef.current) {
      const container = parentRef.current;
      const trackTop = currentIndex * ROW_HEIGHT;
      const trackBottom = trackTop + ROW_HEIGHT;
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;

      // Scroll if track is not visible
      if (trackTop < containerTop || trackBottom > containerBottom) {
        container.scrollTo({
          top: trackTop - container.clientHeight / 2 + ROW_HEIGHT / 2,
          behavior: 'smooth',
        });
      }
    }
  }, [currentIndex]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    enabled: rows.length > VIRTUAL_THRESHOLD,
  });

  if (rows.length <= VIRTUAL_THRESHOLD) {
    // Non-virtual: TrackList owns scroll so LocalPlayer can always use overflow:hidden
    return (
      <div ref={parentRef} style={{ height: '100%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {rows.map((row) => (
            <TrackRow
              key={row.track.filePath}
              track={row.track}
              index={row.index}
              isActive={row.index === currentIndex}
              isPlaying={isPlaying}
              onClick={() => playIndex(row.index)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={parentRef} style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vi) => {
          const row = rows[vi.index];
          return (
            <div
              key={row.track.filePath}
              style={{ position: 'absolute', top: vi.start, left: 0, right: 0, height: vi.size }}
            >
              <TrackRow
                track={row.track}
                index={row.index}
                isActive={row.index === currentIndex}
                isPlaying={isPlaying}
                onClick={() => playIndex(row.index)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
