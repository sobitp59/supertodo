import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { sendNotification } from '@tauri-apps/plugin-notification';

export interface PomodoroState {
  activePomodoroId: string | null;
  pomodoroTimeLeft: number;
  isPomodoroRunning: boolean;
  pomodoroPhase: 'focus' | 'break' | null;
}

export interface PomodoroControls {
  setActivePomodoroId: (id: string | null) => void;
  setPomodoroTimeLeft: (time: number | ((prev: number) => number)) => void;
  setIsPomodoroRunning: (running: boolean) => void;
  setPomodoroPhase: (phase: 'focus' | 'break' | null) => void;
  startFocus: (todoId: string) => void;
  stopPomodoro: () => void;
  togglePause: () => void;
}

export function usePomodoro(): PomodoroState & PomodoroControls {
  const settings = useStore((s) => s.settings);

  const [activePomodoroId, setActivePomodoroId] = useState<string | null>(null);
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState(settings.pomodoroDuration * 60);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const [pomodoroPhase, setPomodoroPhase] = useState<'focus' | 'break' | null>(null);

  // Pomodoro timer loop
  useEffect(() => {
    if (!isPomodoroRunning) return;
    const timer = setInterval(() => {
      if (pomodoroTimeLeft > 0) {
        setPomodoroTimeLeft((prev) => prev - 1);
      } else {
        if (pomodoroPhase === 'focus') {
          // Focus ended — play sound and auto-start break
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.5;
            audio.play();
          } catch (e) {
            console.error("Audio play failed: ", e);
          }
          sendNotification({
            title: 'Focus session complete! \u{1F389}',
            body: `Break time: ${settings.pomodoroBreakDuration} minutes`,
          });
          // Auto-start break
          setPomodoroPhase('break');
          setPomodoroTimeLeft(settings.pomodoroBreakDuration * 60);
        } else {
          // Break ended
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.3;
            audio.play();
          } catch (e) {
            console.error("Audio play failed: ", e);
          }
          sendNotification({
            title: 'Break over! \u{1F4AA}',
            body: 'Ready for another focus session?',
          });
          setIsPomodoroRunning(false);
          setActivePomodoroId(null);
          setPomodoroPhase(null);
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isPomodoroRunning, pomodoroTimeLeft, pomodoroPhase, settings.pomodoroBreakDuration]);

  const startFocus = (todoId: string) => {
    setActivePomodoroId(todoId);
    setPomodoroTimeLeft(settings.pomodoroDuration * 60);
    setIsPomodoroRunning(true);
    setPomodoroPhase('focus');
  };

  const stopPomodoro = () => {
    setIsPomodoroRunning(false);
    setActivePomodoroId(null);
    setPomodoroPhase(null);
  };

  const togglePause = () => {
    setIsPomodoroRunning(!isPomodoroRunning);
  };

  return {
    activePomodoroId,
    pomodoroTimeLeft,
    isPomodoroRunning,
    pomodoroPhase,
    setActivePomodoroId,
    setPomodoroTimeLeft,
    setIsPomodoroRunning,
    setPomodoroPhase,
    startFocus,
    stopPomodoro,
    togglePause,
  };
}
