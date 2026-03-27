import { Track } from '@/types/music';
import { cn } from '@/utils/cn';

interface AlbumArtProps {
  track: Track | null;
  isPlaying: boolean;
  className?: string;
}

export function AlbumArt({ track, isPlaying, className = '' }: AlbumArtProps) {
  return (
    <div className={cn('relative group', className)}>
      <div
        className={cn(
          'relative aspect-square rounded-2xl overflow-hidden shadow-2xl',
          isPlaying && 'animate-pulse-subtle'
        )}
      >
        {track?.artwork ? (
          <img
            src={track.artwork}
            alt={track.album}
            className={cn(
              'w-full h-full object-cover transition-transform duration-1000',
              isPlaying && 'scale-110'
            )}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
            <svg className="w-24 h-24 text-white/80" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}
        
        {/* Vinyl effect */}
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-br from-black/20 to-transparent'
          )}
        />
        
        {/* Playing indicator glow */}
        {isPlaying && (
          <div className="absolute inset-0 bg-purple-500/10 animate-pulse" />
        )}
      </div>

      {/* Reflection */}
      <div
        className={cn(
          'absolute -bottom-4 left-4 right-4 h-16 rounded-2xl blur-xl opacity-30',
          'bg-gradient-to-b from-purple-500 to-transparent'
        )}
      />
    </div>
  );
}
