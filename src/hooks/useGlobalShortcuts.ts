import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { register, isRegistered } from '@tauri-apps/plugin-global-shortcut';
import { readText } from '@tauri-apps/plugin-clipboard-manager';
import { enable, isEnabled } from '@tauri-apps/plugin-autostart';
import { isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';
import { toast } from 'sonner';
import { useStore } from '../store';

interface UseGlobalShortcutsProps {
  isZenMode: boolean;
  contextMenu: any;
  setCurrentDate: (date: Date) => void;
  setIsAddingTodo: (adding: boolean) => void;
  setIsFullscreen: (fs: boolean) => void;
  setContextMenu: (menu: any) => void;
}

export function useGlobalShortcuts({
  isZenMode,
  contextMenu,
  setCurrentDate,
  setIsAddingTodo,
  setIsFullscreen,
  setContextMenu,
}: UseGlobalShortcutsProps) {
  const { setAppMode, setZenMode, setSearchOpen, settings, activeBookmarkCategoryId, activeBookmarkFolderId, addBookmark, isSearchOpen } = useStore();

  useEffect(() => {
    const setupShortcuts = async () => {
      try {
        // Alt+Space for Quick Capture
        const altSpaceShortcut = 'Alt+Space';
        const isAltSpaceReg = await isRegistered(altSpaceShortcut);
        if (!isAltSpaceReg) {
          await register(altSpaceShortcut, async (e) => {
            if (e.state === 'Pressed') {
              const win = getCurrentWindow();
              const isVisible = await win.isVisible();
              if (!isVisible) {
                await win.show();
              }
              await win.setFocus();
              setCurrentDate(new Date()); // Jump to today
              setAppMode('todos');
              setIsAddingTodo(true); // Open capture input
            }
          });
        }

        // Alt+B for Quick-Add Bookmark from Clipboard
        const altBShortcut = 'Alt+B';
        const isAltBReg = await isRegistered(altBShortcut);
        if (!isAltBReg) {
          await register(altBShortcut, async (e) => {
            if (e.state === 'Pressed') {
              try {
                const clipboardText = await readText();
                const urlPattern = /https?:\/\/[^\s]+/;

                if (clipboardText && urlPattern.test(clipboardText)) {
                  if (!activeBookmarkCategoryId) {
                    toast.error("No bookmark category selected");
                    return;
                  }

                  addBookmark(activeBookmarkCategoryId, clipboardText, activeBookmarkFolderId || undefined);
                  toast.success("Bookmark saved from clipboard!");

                  // Brief window show for feedback
                  const win = getCurrentWindow();
                  const isVisible = await win.isVisible();
                  if (!isVisible) {
                    await win.show();
                    setTimeout(() => win.hide(), 1500);
                  }
                } else {
                  toast.error("No valid URL in clipboard");
                }
              } catch (err) {
                console.error("Clipboard read error:", err);
                toast.error("Failed to read clipboard");
              }
            }
          });
        }
      } catch (err) {
        console.error("Global shortcut error:", err);
      }
    };
    setupShortcuts();

    // Auto-Start Registration
    const setupAutoStart = async () => {
      try {
        const autoStartEnabled = await isEnabled();
        if (!autoStartEnabled && settings.autoStartEnabled) {
          await enable();
          console.log("Successfully registered app to launch on system boot");
        }
      } catch (err) {
        console.error("Could not configure Auto-Start", err);
      }
    };
    setupAutoStart();

    // Keyboard Hotkeys
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'F11') {
        e.preventDefault();
        const win = getCurrentWindow();
        win.isFullscreen().then((fs) => {
          win.setFullscreen(!fs);
          setIsFullscreen(!fs);
        });
      }
      if (e.key === 'Escape') {
        if (isZenMode) {
          setZenMode(false);
        }
        if (contextMenu) {
          setContextMenu(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Initial Notification Permission
    const checkNotificationPermission = async () => {
      try {
        let permission = await isPermissionGranted();
        if (!permission) {
          permission = await requestPermission() === 'granted';
        }
      } catch (e) {
        console.warn("Notification permission check failed (not in Tauri environment?)");
      }
    };
    checkNotificationPermission();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isZenMode, setZenMode, activeBookmarkCategoryId, activeBookmarkFolderId, addBookmark, contextMenu, setSearchOpen, settings.autoStartEnabled, setAppMode, setCurrentDate, setIsAddingTodo, setIsFullscreen, setContextMenu, isSearchOpen]);
}
