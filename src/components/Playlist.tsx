import { useState, useRef } from 'react';
import { Track } from '@/types/music';
import { cn } from '@/utils/cn';

interface PlaylistProps {
  tracks: Track[];
  currentTrackIndex: number;
  isPlaying: boolean;
  onTrackSelect: (index: number) => void;
  onRemoveTrack: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function Playlist({
  tracks,
  currentTrackIndex,
  isPlaying,
  onTrackSelect,
  onRemoveTrack,
  onReorder,
}: PlaylistProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    dragNodeRef.current = e.target as HTMLDivElement;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onReorder(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Playlist</h3>
        <p className="text-sm text-gray-400">{tracks.length} tracks</p>
      </div>
      
      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
        {tracks.map((track, index) => (
          <div
            key={track.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onClick={() => onTrackSelect(index)}
            className={cn(
              'flex items-center gap-3 p-3 cursor-pointer transition-all duration-200',
              'hover:bg-gray-700/50',
              currentTrackIndex === index && 'bg-purple-600/20 border-l-4 border-purple-500',
              dragOverIndex === index && 'bg-purple-500/10 border-t-2 border-purple-500',
              draggedIndex === index && 'opacity-50'
            )}
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden relative group">
              {track.artwork ? (
                <img
                  src={track.artwork}
                  alt={track.album}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
                </div>
              )}
              {currentTrackIndex === index && isPlaying && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="flex gap-0.5">
                    <div className="w-1 h-3 bg-white rounded animate-pulse" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 h-4 bg-white rounded animate-pulse" style={{ animationDelay: '150ms' }} />
                    <div className="w-1 h-2 bg-white rounded animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm font-medium truncate',
                currentTrackIndex === index ? 'text-purple-400' : 'text-white'
              )}>
                {track.title}
              </p>
              <p className="text-xs text-gray-400 truncate">{track.artist}</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{formatDuration(track.duration)}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveTrack(index);
                }}
                className="p-1 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="cursor-grab p-1 text-gray-500 hover:text-white">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
