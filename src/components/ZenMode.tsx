import { useEffect, useState, useRef } from 'react';
import { X, Play, Pause } from '@phosphor-icons/react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface ZenModeProps {
  todoId: string;
  onExit: () => void;
}

const AMBIENT_SOUNDS: Record<string, string> = {
  rain: 'https://assets.mixkit.co/active_storage/sfx/2393/2393-preview.mp3',
  cafe: 'https://assets.mixkit.co/active_storage/sfx/2458/2458-preview.mp3',
  waves: 'https://assets.mixkit.co/active_storage/sfx/2459/2459-preview.mp3',
  whitenoise: 'https://assets.mixkit.co/active_storage/sfx/2443/2443-preview.mp3',
};

export function ZenMode({ todoId, onExit }: ZenModeProps) {
  const todo = useStore((state) => state.todos.find((t) => t.id === todoId));
  const settings = useStore((state) => state.settings);

  const [isAudioPlaying, setIsAudioPlaying] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Handle Esc key
    const handleEscape = async (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit();
        try { await getCurrentWindow().setFullscreen(false); } catch {}
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Play ambient sound if enabled
    if (settings.zenModeAmbientSound !== 'none') {
      const audioUrl = AMBIENT_SOUNDS[settings.zenModeAmbientSound];
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.loop = true;
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Audio play might fail, that's ok
          setIsAudioPlaying(false);
        });
        audioRef.current = audio;
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [onExit, settings.zenModeAmbientSound]);

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isAudioPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsAudioPlaying(!isAudioPlaying);
    }
  };

  if (!todo) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="zen-mode-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="zen-task">{todo.text}</div>
        </motion.div>

        {/* Controls */}
        <div className="zen-controls" style={{ position: 'absolute', bottom: 48, display: 'flex', gap: 16 }}>
          {settings.zenModeAmbientSound !== 'none' && audioRef.current && (
            <button
              className="pomo-btn"
              onClick={toggleAudio}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {isAudioPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isAudioPlaying ? 'Pause Sound' : 'Play Sound'}
            </button>
          )}

          <button
            className="pomo-btn"
            onClick={async () => {
              onExit();
              try { await getCurrentWindow().setFullscreen(false); } catch {}
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <X size={16} />
            Exit (Esc)
          </button>
        </div>

        {/* Hint */}
        <div style={{ position: 'absolute', top: 32, right: 32, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Press <kbd className="kbd">Esc</kbd> to exit
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
