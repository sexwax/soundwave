import { useState } from 'react';
import { usePlayerStore } from '../store/playerStore';
import type { LocalTrack } from '../../favorites/db/favoritesDb';

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: TreeNode[];
  track?: LocalTrack;
}

interface FileTreeNodeProps {
  node: TreeNode;
  depth: number;
  onSelectTrack: (track: LocalTrack) => void;
}

function FileTreeNode({ node, depth, onSelectTrack }: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { currentTrack, currentIndex, queue } = usePlayerStore();
  const current = currentTrack();
  const isCurrentTrack = current?.filePath === node.track?.filePath;
  const currentIndexInQueue = queue.findIndex(t => t.filePath === node.track?.filePath);
  const isPlaying = isCurrentTrack && usePlayerStore.getState().isPlaying;

  if (node.isDirectory) {
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div>
        <div
          onClick={() => hasChildren && setIsExpanded(!isExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            paddingLeft: depth * 16 + 8,
            cursor: hasChildren ? 'pointer' : 'default',
            background: 'var(--bg-surface)',
            borderRadius: 4,
            marginBottom: 2,
            fontSize: 13,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
          }}
        >
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', width: 16 }}>
            {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
          </span>
          <span style={{ fontSize: 14 }}>📁</span>
          <span>{node.name}</span>
          {hasChildren && (
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
              {node.children?.length}
            </span>
          )}
        </div>
        {isExpanded && node.children && (
          <div>
            {node.children.map((child, i) => (
              <FileTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                onSelectTrack={onSelectTrack}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File node
  return (
    <div
      onClick={() => node.track && onSelectTrack(node.track)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        paddingLeft: (depth + 1) * 16 + 8,
        cursor: 'pointer',
        background: isCurrentTrack
          ? 'var(--accent-primary)'
          : currentIndexInQueue >= 0
          ? 'var(--bg-elevated)'
          : 'transparent',
        borderRadius: 4,
        marginBottom: 2,
        fontSize: 12,
        color: isCurrentTrack
          ? '#fff'
          : 'var(--text-primary)',
        fontFamily: 'var(--font-mono)',
        transition: 'background 0.15s',
      }}
    >
      <span style={{ fontSize: 12 }}>
        {isPlaying ? '🔊' : '🎵'}
      </span>
      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {node.name}
      </span>
      {node.track?.duration && (
        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
          {formatDuration(node.track.duration)}
        </span>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function buildTree(tracks: LocalTrack[]): TreeNode {
  const root: TreeNode = { name: 'root', path: '', isDirectory: true, children: [] };

  for (const track of tracks) {
    // Use album or artist as virtual folder if available, otherwise use filename
    const folder = track.album && track.album !== 'Unknown' ? track.album :
                   track.artist && track.artist !== 'Unknown' ? track.artist : '';

    if (folder) {
      let folderNode = root.children?.find(c => c.name === folder);
      if (!folderNode) {
        folderNode = { name: folder, path: folder, isDirectory: true, children: [] };
        root.children?.push(folderNode);
      }
      folderNode.children?.push({
        name: `${track.artist} - ${track.title}`,
        path: track.filePath,
        isDirectory: false,
        track,
      });
    } else {
      root.children?.push({
        name: `${track.artist} - ${track.title}`,
        path: track.filePath,
        isDirectory: false,
        track,
      });
    }
  }

  // Sort: directories first, then files, alphabetically
  root.children?.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  return root;
}

interface FileTreeProps {
  tracks: LocalTrack[];
  onSelectTrack: (track: LocalTrack) => void;
}

export function FileTree({ tracks, onSelectTrack }: FileTreeProps) {
  const root = buildTree(tracks);

  if (!root.children || root.children.length === 0) {
    return null;
  }

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      borderRadius: 12,
      padding: 12,
      overflow: 'auto',
      maxHeight: 300,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: 8,
        paddingBottom: 8,
        borderBottom: '1px solid var(--border-color)',
      }}>
        📂 Estructura de carpetas
      </div>
      {root.children.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
          depth={0}
          onSelectTrack={onSelectTrack}
        />
      ))}
    </div>
  );
}