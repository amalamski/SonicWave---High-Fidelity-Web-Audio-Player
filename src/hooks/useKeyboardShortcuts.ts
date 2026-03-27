import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsProps {
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onVolumeUp: () => void;
  onVolumeDown: () => void;
  onMute: () => void;
  onSeekForward: () => void;
  onSeekBackward: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
}

export function useKeyboardShortcuts({
  onPlayPause,
  onNext,
  onPrevious,
  onVolumeUp,
  onVolumeDown,
  onMute,
  onSeekForward,
  onSeekBackward,
  onToggleShuffle,
  onToggleRepeat,
}: KeyboardShortcutsProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        onPlayPause();
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (e.shiftKey) {
          onNext();
        } else {
          onSeekForward();
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (e.shiftKey) {
          onPrevious();
        } else {
          onSeekBackward();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        onVolumeUp();
        break;
      case 'ArrowDown':
        e.preventDefault();
        onVolumeDown();
        break;
      case 'KeyM':
        onMute();
        break;
      case 'KeyS':
        onToggleShuffle();
        break;
      case 'KeyR':
        onToggleRepeat();
        break;
    }
  }, [
    onPlayPause,
    onNext,
    onPrevious,
    onVolumeUp,
    onVolumeDown,
    onMute,
    onSeekForward,
    onSeekBackward,
    onToggleShuffle,
    onToggleRepeat,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    shortcuts: [
      { key: 'Space', description: 'Play/Pause' },
      { key: '←', description: 'Seek backward 5s' },
      { key: '→', description: 'Seek forward 5s' },
      { key: 'Shift + ←', description: 'Previous track' },
      { key: 'Shift + →', description: 'Next track' },
      { key: '↑', description: 'Volume up' },
      { key: '↓', description: 'Volume down' },
      { key: 'M', description: 'Mute/Unmute' },
      { key: 'S', description: 'Toggle shuffle' },
      { key: 'R', description: 'Toggle repeat' },
    ],
  };
}
