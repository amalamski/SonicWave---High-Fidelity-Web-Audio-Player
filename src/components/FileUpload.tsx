import { useRef, useCallback } from 'react';
import { Track } from '@/types/music';

interface FileUploadProps {
  onFilesAdded: (tracks: Track[]) => void;
}

const SUPPORTED_FORMATS = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/x-m4a', 'audio/mp4'];

export function FileUpload({ onFilesAdded }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const extractMetadata = useCallback(async (file: File): Promise<Partial<Track>> => {
    // Basic metadata extraction from filename
    const filename = file.name.replace(/\.[^/.]+$/, '');
    const parts = filename.split(' - ');
    
    return {
      title: parts.length > 1 ? parts[1] : filename,
      artist: parts.length > 1 ? parts[0] : 'Unknown Artist',
      album: 'Local Files',
    };
  }, []);

  const handleFiles = useCallback(async (files: FileList) => {
    const tracks: Track[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!SUPPORTED_FORMATS.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|aac|flac|m4a)$/i)) {
        continue;
      }

      const metadata = await extractMetadata(file);
      const url = URL.createObjectURL(file);
      
      // Get duration
      const duration = await new Promise<number>((resolve) => {
        const audio = new Audio(url);
        audio.addEventListener('loadedmetadata', () => {
          resolve(audio.duration);
        });
        audio.addEventListener('error', () => {
          resolve(180); // Default to 3 minutes
        });
      });

      tracks.push({
        id: `local-${Date.now()}-${i}`,
        title: metadata.title || file.name,
        artist: metadata.artist || 'Unknown Artist',
        album: metadata.album || 'Local Files',
        duration,
        url,
        file,
      });
    }

    if (tracks.length > 0) {
      onFilesAdded(tracks);
    }
  }, [extractMetadata, onFilesAdded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => inputRef.current?.click()}
      className="border-2 border-dashed border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-500/5 transition-all"
    >
      <input
        ref={inputRef}
        type="file"
        accept={SUPPORTED_FORMATS.join(',')}
        multiple
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />
      <svg className="w-10 h-10 mx-auto text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <p className="text-sm text-gray-400">
        Drop audio files here or click to browse
      </p>
      <p className="text-xs text-gray-500 mt-1">
        MP3, WAV, OGG, AAC, FLAC supported
      </p>
    </div>
  );
}
