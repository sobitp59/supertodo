import { useState, useEffect } from 'react';
import { getCurrentWindow, PhysicalPosition } from '@tauri-apps/api/window';

export function useWindowControls() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync fullscreen state on mount and reactively when window resizes
  useEffect(() => {
    try {
      const appWindow = getCurrentWindow();
      appWindow.isFullscreen().then(setIsFullscreen);

      // Listen for resize events to keep fullscreen state in sync
      const unlistenPromise = appWindow.onResized(async () => {
        const fs = await appWindow.isFullscreen();
        setIsFullscreen(fs);
      });

      return () => {
        unlistenPromise.then(f => f());
      };
    } catch (e) {
      console.warn("Not running in Tauri environment");
    }
  }, []);

  // Window position save/restore
  useEffect(() => {
    try {
      const appWindow = getCurrentWindow();
      const saved = localStorage.getItem('window-position');
      if (saved) {
        const { x, y } = JSON.parse(saved);
        appWindow.setPosition(new PhysicalPosition(x, y));
      }
      let saveTimeout: ReturnType<typeof setTimeout>;
      const unlistenPromise = appWindow.onMoved(({ payload: pos }) => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          localStorage.setItem('window-position', JSON.stringify({ x: pos.x, y: pos.y }));
        }, 300);
      });
      return () => {
        clearTimeout(saveTimeout);
        unlistenPromise.then(f => f());
      };
    } catch (e) {
      // Ignore
    }
  }, []);

  return { isFullscreen, setIsFullscreen };
}
