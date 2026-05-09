import { useState, useEffect } from 'react';
import { useStore } from './store';
import { format, subDays, addDays, isToday, getDate } from 'date-fns';
import {
  Check, CaretLeft as ChevronLeft, CaretRight as ChevronRight, X, DotsSixVertical as GripVertical, Timer, Lightning as Zap, Paperclip, PencilSimple as Pencil,
  CaretDown as ChevronDown, Plus, Folder, Gear as Settings, Copy, Trash as Trash2, Sparkle, BookmarkSimple, CheckCircle,
  ArrowsOut, ArrowsIn
} from '@phosphor-icons/react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { getCurrentWindow, PhysicalPosition } from '@tauri-apps/api/window';
import { convertFileSrc } from '@tauri-apps/api/core';
import { register, isRegistered } from '@tauri-apps/plugin-global-shortcut';
import { readText } from '@tauri-apps/plugin-clipboard-manager';
import confetti from 'canvas-confetti';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { enable, isEnabled } from '@tauri-apps/plugin-autostart';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { Toaster, toast } from 'sonner';
import urlRegex from 'url-regex';
import { SettingsModal } from './components/SettingsModal';
import { Omnibar } from './components/Omnibar';
import { ZenMode } from './components/ZenMode';
import { NotesView } from './components/NotesView';
import { ChallengesView } from './components/ChallengesView';
import { YearlyGoalsView } from './components/YearlyGoalsView';
import { JobTrackerView } from './components/JobTrackerView';
import { ContextMenu, ContextMenuItem } from './components/ContextMenu';
import { TimeCanvasView } from './components/time-canvas/TimeCanvasView';
import { QUADRANT_COLORS } from './components/time-canvas/EisenhowerMatrix';
import { ClockDisplay, useGreeting } from './components/ClockDisplay';
import './App.css';

// Ordinal suffix for dates (1st, 2nd, 3rd, 4th, etc.)
const getOrdinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const formatDateDisplay = (date: Date) => {
  const dayName = format(date, 'EEEE');
  const day = getOrdinal(getDate(date));
  const monthYear = format(date, 'MMM yyyy');
  return `${dayName}, ${day} ${monthYear}`;
};

// Link preview cache to avoid repeated API calls
const linkPreviewCache = new Map<string, { title: string; description?: string; image?: string } | null>();

// Native Link Preview Component with caching
const NativeLinkPreview = ({ url, compact = false }: { url: string; compact?: boolean }) => {
  const [data, setData] = useState<{ title: string; description?: string; image?: string } | null>(
    linkPreviewCache.get(url) ?? null
  );
  const [loading, setLoading] = useState(!linkPreviewCache.has(url));
  
  useEffect(() => {
    // Already cached (hit or miss)
    if (linkPreviewCache.has(url)) {
      setData(linkPreviewCache.get(url) ?? null);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success' && d.data?.title) {
          const preview = { title: d.data.title, description: d.data.description, image: d.data.image?.url };
          linkPreviewCache.set(url, preview);
          setData(preview);
        } else {
          linkPreviewCache.set(url, null); // Cache the miss too
        }
      })
      .catch(() => { linkPreviewCache.set(url, null); })
      .finally(() => setLoading(false));
  }, [url]);

  if (loading || !data) return null;
  
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`native-link-preview ${compact ? 'compact' : ''}`}>
      {data.image && <img src={data.image} alt="preview" className="preview-img" />}
      <div className="preview-text">
        <h4>{data.title}</h4>
        <p>{data.description?.substring(0, 80)}...</p>
      </div>
    </a>
  );
};

// SVG Progress Ring
const ProgressRing = ({ radius, stroke, progress }: { radius: number; stroke: number; progress: number }) => {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <svg height={radius * 2} width={radius * 2} className="progress-ring">
      <circle
        stroke="var(--surface)"
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <circle
        stroke="var(--accent)"
        fill="transparent"
        strokeWidth={stroke}
        strokeDasharray={circumference + ' ' + circumference}
        style={{ strokeDashoffset }}
        strokeLinecap="round"
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
    </svg>
  );
};

export default function App() {
  const {
    appMode,
    setAppMode,
    settings,
    categories,
    todos,
    activeCategoryId,
    bookmarkCategories,
    bookmarkFolders,
    bookmarks,
    activeBookmarkCategoryId,
    activeBookmarkFolderId,
    isSearchOpen,
    activeHashtagFilter,
    isZenMode,
    zenModeTaskId,
    addCategory,
    removeCategory,
    setActiveCategory,
    addTodo,
    toggleTodo,
    removeTodo,
    editTodo,
    reorderTodos,
    attachFileToTodo,
    removeAttachmentFromTodo,
    toggleSubtasksCollapse,
    addBookmarkCategory,
    removeBookmarkCategory,
    setActiveBookmarkCategory,
    addBookmarkFolder,
    removeBookmarkFolder,
    setActiveBookmarkFolder,
    addBookmark,
    removeBookmark,
    setZenMode,
    setSearchOpen,
    setHashtagFilter,
    activeNoteCategoryId,
  } = useStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null);
  const [newSubtaskText, setNewSubtaskText] = useState('');

  // Edit Todo State
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editTodoText, setEditTodoText] = useState('');

  // Pomodoro Timer State (use settings duration)
  const [activePomodoroId, setActivePomodoroId] = useState<string | null>(null);
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState(settings.pomodoroDuration * 60);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const [pomodoroPhase, setPomodoroPhase] = useState<'focus' | 'break' | null>(null);

  // UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
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

  // Dynamic Accent Color
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', settings.accentColor);
  }, [settings.accentColor]);

  // Pomodoro timer loop
  useEffect(() => {
    if (!isPomodoroRunning) return; // Don't run interval if Pomodoro isn't active
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
            title: 'Focus session complete! 🎉',
            body: `Break time: ${settings.pomodoroBreakDuration} minutes`,
          });
          // Auto-start break
          setPomodoroPhase('break');
          setPomodoroTimeLeft(settings.pomodoroBreakDuration * 60);
          // Keep running — break starts automatically
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
            title: 'Break over! 💪',
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

  // Global Shortcuts
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
  }, [isZenMode, setZenMode, activeBookmarkCategoryId, activeBookmarkFolderId, addBookmark, contextMenu, setSearchOpen, settings.autoStartEnabled]);

  const dateString = format(currentDate, 'yyyy-MM-dd');
  const todayString = format(new Date(), 'yyyy-MM-dd');

  // Filter todos by category, date, hashtag, and exclude subtasks (they'll be rendered under parents)
  let activeTodos = todos.filter(
    (t) => t.categoryId === activeCategoryId && t.date === dateString && !t.parentId
  );

  // Overdue todos: uncompleted tasks from past dates (only show when viewing today)
  const overdueTodos = dateString === todayString
    ? todos.filter(
        (t) => t.categoryId === activeCategoryId && t.date < todayString && !t.completed && !t.parentId
      )
    : [];

  // Apply hashtag filter
  if (activeHashtagFilter) {
    activeTodos = activeTodos.filter((t) => t.text.includes(`#${activeHashtagFilter}`));
  }

  // Filter bookmarks by category, folder, and hashtag
  let activeBookmarks = bookmarks.filter((b) => {
    const matchesCategory = b.categoryId === activeBookmarkCategoryId;
    const matchesFolder = !activeBookmarkFolderId || b.folderId === activeBookmarkFolderId;
    return matchesCategory && matchesFolder;
  });

  // Apply hashtag filter
  if (activeHashtagFilter) {
    activeBookmarks = activeBookmarks.filter((b) => b.text.includes(`#${activeHashtagFilter}`));
  }

  const completedCount = activeTodos.filter(t => t.completed).length;
  const progressPercent = activeTodos.length > 0 ? (completedCount / activeTodos.length) * 100 : 0;
  const isAllDone = activeTodos.length > 0 && progressPercent === 100;

  // Trigger confetti when everything is completely done
  useEffect(() => {
    if (isAllDone && activeTodos.length > 0) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults, particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults, particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);
      
      return () => clearInterval(interval);
    }
  }, [isAllDone, activeTodos.length]);

  const handleExport = async () => {
    try {
      const filePath = await save({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        defaultPath: `supertodo_backup_${Date.now()}.json`,
      });
      if (!filePath) return;

      // Export all data including new structures
      const state = useStore.getState();
      const stateDump = {
        version: 2,
        categories: state.categories,
        todos: state.todos,
        bookmarks: state.bookmarks,
        bookmarkCategories: state.bookmarkCategories,
        bookmarkFolders: state.bookmarkFolders,
        notes: state.notes,
        noteCategories: state.noteCategories,
        settings: state.settings,
        challenges: state.challenges,
        yearlyGoals: state.yearlyGoals,
        jobApplications: state.jobApplications,
        exportedAt: Date.now(),
      };

      await writeTextFile(filePath, JSON.stringify(stateDump, null, 2));
      toast.success("Export successful! Backup saved.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to export your data.");
    }
  };

  const handleImport = async () => {
    try {
      const selectedPath = await open({
        multiple: false,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      });
      if (!selectedPath) return;

      const fileContent = await readTextFile(selectedPath);
      const parsedData = JSON.parse(fileContent);

      const currentState = useStore.getState();

      // Support both old (v1) and new (v2) formats
      if (parsedData.categories || parsedData.todos) {
        useStore.setState({
          categories: parsedData.categories || currentState.categories,
          todos: parsedData.todos || [],
          bookmarks: parsedData.bookmarks || [],
          bookmarkCategories: parsedData.bookmarkCategories || currentState.bookmarkCategories,
          bookmarkFolders: parsedData.bookmarkFolders || [],
          notes: parsedData.notes || [],
          noteCategories: parsedData.noteCategories || [
            { id: 'note_default', name: 'General', createdAt: Date.now() },
          ],
          settings: { ...currentState.settings, ...(parsedData.settings || {}) },
          challenges: parsedData.challenges || [],
          yearlyGoals: parsedData.yearlyGoals || [],
          jobApplications: parsedData.jobApplications || [],
          activeCategoryId: parsedData.categories?.length > 0 ? parsedData.categories[0].id : null,
        });
        toast.success("Import successful! Data loaded.");
      } else {
        toast.error("Invalid backup file format.", {
          description: "The JSON structure could not be mapped to our store.",
        });
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to import data.");
    }
  };

  const handleAttachContent = async (todoId: string) => {
    try {
      const selectedPath = await open({
        multiple: false,
        filters: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
      });
      if (!selectedPath) return;

      attachFileToTodo(todoId, selectedPath);
    } catch (e) {
      console.error(e);
      toast.error("Failed to attach file.");
    }
  };

  const handlePrevDay = () => setCurrentDate((prev) => subDays(prev, 1));
  const handleNextDay = () => setCurrentDate((prev) => addDays(prev, 1));
  const handleToday = () => setCurrentDate(new Date());


  const handleAddTodo = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTodoText.trim()) {
      if (appMode === 'todos' && activeCategoryId) {
        addTodo(activeCategoryId, newTodoText.trim(), dateString);
      } else if (appMode === 'bookmarks' && activeBookmarkCategoryId) {
        addBookmark(activeBookmarkCategoryId, newTodoText.trim());
      }
      setNewTodoText('');
      // Do not close the input, allowing the user to create another one immediately.
    } else if (e.key === 'Escape') {
      setIsAddingTodo(false);
      setNewTodoText('');
    }
  };

  const handleEditTodoSave = (id: string) => {
    if (editTodoText.trim()) {
      editTodo(id, editTodoText.trim());
    }
    setEditingTodoId(null);
    setEditTodoText('');
  };

  const handleEditTodoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') {
      handleEditTodoSave(id);
    } else if (e.key === 'Escape') {
      setEditingTodoId(null);
      setEditTodoText('');
    }
  };

  const greeting = useGreeting();

  return (
    <>
    <div className="ambient-background" />
    <div className={`app-wrapper ${isZenMode ? 'zen-active' : ''} ${isFullscreen ? 'fullscreen' : ''}`}>
      <Toaster 
        theme="dark" 
        position="top-right" 
        toastOptions={{
          style: { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
        }} 
      />
      {/* Header */}
      <header className="header">
        {/* Left side: draggable area for moving the window */}
        <div data-tauri-drag-region>
          <span className="header-greeting">{greeting}, {settings.userName}</span>
          <div className="date-container">
            <div className="nav-arrows">
              <button className="nav-btn" onClick={handlePrevDay}>
                <ChevronLeft size={16} />
              </button>
              <button
                className="nav-btn"
                onClick={handleNextDay}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <span className="date-text" onDoubleClick={handleToday}>
              {formatDateDisplay(currentDate)}
              {!isToday(currentDate) && (
                <span
                  onClick={handleToday}
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--accent)',
                    marginLeft: 8,
                    cursor: 'pointer',
                    opacity: 0.8,
                    fontWeight: 500,
                  }}
                >
                  (go to today)
                </span>
              )}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="time-text" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ClockDisplay />
            <button
              className="icon-btn"
              onClick={() => setIsSettingsOpen(true)}
              title="Settings"
              style={{ padding: 4 }}
            >
              <Settings size={18} />
            </button>
            <ProgressRing radius={16} stroke={3} progress={progressPercent} />
            {/* Global Pomodoro indicator in header */}
            {activePomodoroId && (
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '3px 10px', 
                  background: pomodoroPhase === 'break' ? 'rgba(250,173,20,0.1)' : 'rgba(42,221,132,0.1)',
                  border: `1px solid ${pomodoroPhase === 'break' ? 'rgba(250,173,20,0.3)' : 'rgba(42,221,132,0.3)'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                onClick={() => setIsPomodoroRunning(!isPomodoroRunning)}
                title={isPomodoroRunning ? 'Click to pause' : 'Click to resume'}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: isPomodoroRunning ? (pomodoroPhase === 'break' ? '#faad14' : 'var(--accent)') : 'var(--text-secondary)', boxShadow: isPomodoroRunning ? `0 0 6px ${pomodoroPhase === 'break' ? '#faad14' : 'var(--accent)'}` : 'none', animation: isPomodoroRunning ? 'pulse 2s infinite' : 'none' }} />
                <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 600, color: pomodoroPhase === 'break' ? '#faad14' : 'var(--accent)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  {pomodoroPhase === 'break' ? 'break' : 'focus'}
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600, color: pomodoroPhase === 'break' ? '#faad14' : 'var(--accent)', letterSpacing: '0.5px' }}>
                  {Math.floor(pomodoroTimeLeft / 60).toString().padStart(2, '0')}:{(pomodoroTimeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}
          </div>
          {/* Window controls — NO drag region here */}
          <div style={{ display: 'flex', gap: 2 }}>
            <button
              onClick={() => getCurrentWindow().minimize()}
              title="Minimize"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #888)',
                cursor: 'pointer',
                fontSize: 18,
                lineHeight: 1,
                padding: '0 6px',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              &#x2212;
            </button>
            <button
              onClick={async () => {
                const win = getCurrentWindow();
                const current = await win.isFullscreen();
                await win.setFullscreen(!current);
                setIsFullscreen(!current);
              }}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #888)',
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
                padding: '0 6px',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {isFullscreen ? <ArrowsIn size={14} /> : <ArrowsOut size={14} />}
            </button>
            <button
              onClick={() => getCurrentWindow().hide()}
              title="Hide to tray"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #888)',
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
                padding: '0 6px',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              &#x2715;
            </button>
          </div>
        </div>
      </header>

      <div className="action-row">
        <div className="mode-toggle-wrapper">
          <button
            className={`mode-btn ${appMode === 'todos' ? 'active' : ''}`}
            onClick={() => setAppMode('todos')}
          >
            Todos
          </button>
          <button
            className={`mode-btn ${appMode === 'bookmarks' ? 'active' : ''}`}
            onClick={() => setAppMode('bookmarks')}
          >
            Bookmarks
          </button>
          <button
            className={`mode-btn ${appMode === 'notes' ? 'active' : ''}`}
            onClick={() => setAppMode('notes')}
          >
            Notes
          </button>
          <button
            className={`mode-btn ${appMode === 'challenges' ? 'active' : ''}`}
            onClick={() => setAppMode('challenges')}
          >
            Challenges
          </button>
          <button
            className={`mode-btn ${appMode === 'goals' ? 'active' : ''}`}
            onClick={() => setAppMode('goals')}
          >
            Goals
          </button>
          <button
            className={`mode-btn ${appMode === 'jobs' ? 'active' : ''}`}
            onClick={() => setAppMode('jobs')}
          >
            Jobs
          </button>
          <button
            className={`mode-btn ${appMode === 'time-canvas' ? 'active' : ''}`}
            onClick={() => setAppMode('time-canvas')}
          >
            Canvas
          </button>
        </div>

        <span data-tauri-drag-region style={{ flex: 1 }} />
        {appMode !== 'challenges' && appMode !== 'goals' && appMode !== 'jobs' && appMode !== 'time-canvas' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {appMode === 'todos' && !activePomodoroId && activeTodos.length > 0 && (
            <button
              className="create-btn"
              style={{ background: 'transparent', boxShadow: '4px 4px 0px var(--text-secondary)', borderColor: 'var(--text-secondary)', color: 'var(--text-secondary)' }}
              onClick={() => {
                // Start focus on the first incomplete task
                const firstIncomplete = activeTodos.find(t => !t.completed);
                if (firstIncomplete) {
                  setActivePomodoroId(firstIncomplete.id);
                  setPomodoroTimeLeft(settings.pomodoroDuration * 60);
                  setIsPomodoroRunning(true);
                  setPomodoroPhase('focus');
                }
              }}
              title={`Start ${settings.pomodoroDuration}min focus session`}
            >
              <Timer size={16} /> focus
            </button>
          )}
          <button
            className="create-btn"
            onClick={() => {
              if (appMode === 'notes') {
                if (activeNoteCategoryId) useStore.getState().addNote(activeNoteCategoryId, 'Untitled Note');
              } else {
                setIsAddingTodo(true);
              }
            }}
            disabled={appMode === 'todos' ? !activeCategoryId : appMode === 'bookmarks' ? !activeBookmarkCategoryId : !activeNoteCategoryId}
          >
            create <Zap size={16} weight="fill" color="var(--bg-color)" />
          </button>
        </div>
        )}
      </div>

      {appMode !== 'notes' && appMode !== 'challenges' && appMode !== 'goals' && appMode !== 'jobs' && appMode !== 'time-canvas' && (
        <div className="tabs-row">
          <AnimatePresence>
            {(appMode === 'todos' ? categories : bookmarkCategories).map((cat) => {
              const isActive = appMode === 'todos' ? activeCategoryId === cat.id : activeBookmarkCategoryId === cat.id;
              return (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`tab ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (appMode === 'todos') setActiveCategory(cat.id);
                    else if (appMode === 'bookmarks') setActiveBookmarkCategory(cat.id);
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {cat.name}
                    {isActive && (
                      <div 
                        className="tab-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (appMode === 'todos') {
                            const catData = categories.find(c => c.id === cat.id);
                            const catTodos = todos.filter(t => t.categoryId === cat.id);
                            removeCategory(cat.id);
                            toast('Category deleted', {
                              action: {
                                label: 'Undo',
                                onClick: () => {
                                  if (catData) {
                                    useStore.setState((s) => ({
                                      categories: [...s.categories, catData],
                                      todos: [...s.todos, ...catTodos],
                                      activeCategoryId: catData.id,
                                    }));
                                  }
                                },
                              },
                            });
                          } else if (appMode === 'bookmarks') {
                            const catData = bookmarkCategories.find(c => c.id === cat.id);
                            const catBookmarks = bookmarks.filter(b => b.categoryId === cat.id);
                            removeBookmarkCategory(cat.id);
                            toast('Category deleted', {
                              action: {
                                label: 'Undo',
                                onClick: () => {
                                  if (catData) {
                                    useStore.setState((s) => ({
                                      bookmarkCategories: [...s.bookmarkCategories, catData],
                                      bookmarks: [...s.bookmarks, ...catBookmarks],
                                      activeBookmarkCategoryId: catData.id,
                                    }));
                                  }
                                },
                              },
                            });
                          }
                        }}
                        title="Delete Category"
                      >
                        <X size={14} />
                      </div>
                    )}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 20,
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        zIndex: -1,
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.button>
              )
            })}
          </AnimatePresence>
          
          {isAddingCategory ? (
            <div className="tab" style={{ padding: '8px 16px' }}>
              <input
                autoFocus
                className="tab-input"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCategoryName.trim()) {
                    if (appMode === 'todos') { addCategory(newCategoryName.trim()); }
                    else if (appMode === 'bookmarks') { addBookmarkCategory(newCategoryName.trim()); }
                    setNewCategoryName('');
                    setIsAddingCategory(false);
                  } else if (e.key === 'Escape') {
                    setIsAddingCategory(false);
                    setNewCategoryName('');
                  }
                }}
                onBlur={() => {
                  setIsAddingCategory(false);
                  setNewCategoryName('');
                }}
                placeholder="name..."
              />
            </div>
          ) : (
            <button
              className="new-tab-btn"
              onClick={() => setIsAddingCategory(true)}
            >
              +
            </button>
          )}
        </div>
      )}

      {/* Notes Mode */}
      {appMode === 'notes' ? (
        <NotesView />
      ) : appMode === 'challenges' ? (
        <ChallengesView />
      ) : appMode === 'goals' ? (
        <YearlyGoalsView />
      ) : appMode === 'jobs' ? (
        <JobTrackerView />
      ) : appMode === 'time-canvas' ? (
        <TimeCanvasView />
      ) : (
        <>
          {/* Hashtag Filter Badge */}
          {activeHashtagFilter && (appMode === 'todos' || appMode === 'bookmarks') && (
            <div style={{ padding: '16px 32px 0 32px' }}>
              <div className="filter-badge">
                <span>Showing items with #{activeHashtagFilter}</span>
                <X
                  size={16}
                  className="filter-badge-clear"
                  onClick={() => setHashtagFilter(null)}
                />
              </div>
            </div>
          )}

          <div className="todo-list">
        <AnimatePresence>
          {isAddingTodo && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="todo-item"
              style={{ cursor: 'text', paddingLeft: 36 }}
            >
              <input
                id="new-todo-input"
                autoFocus
                className="todo-input"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyDown={handleAddTodo}
                onBlur={() => {
                  setTimeout(() => {
                    if (document.activeElement?.id !== 'new-todo-input') {
                      setIsAddingTodo(false);
                      setNewTodoText('');
                    }
                  }, 100);
                }}
                placeholder={appMode === 'todos' ? "Type '!!' to mark high priority..." : "Type a note or paste a URL..."}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {appMode === 'todos' ? (
          <>
          {/* Today's Schedule - shows time-blocked tasks from the Canvas */}
          {dateString === todayString && (() => {
            const scheduledTodos = todos
              .filter(t => t.categoryId === activeCategoryId && t.date === todayString && t.startTime && !t.parentId)
              .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
            if (scheduledTodos.length === 0) return null;
            return (
              <div className="todays-schedule-widget">
                <div className="schedule-widget-header">
                  <span className="schedule-widget-title">Today's Schedule</span>
                  <span className="schedule-widget-count">{scheduledTodos.length} time-blocked</span>
                </div>
                <div className="schedule-widget-items">
                  {scheduledTodos.map(todo => (
                    <div
                      key={todo.id}
                      className={`schedule-widget-item ${todo.completed ? 'completed' : ''}`}
                      onClick={() => toggleTodo(todo.id)}
                    >
                      <span className="schedule-widget-time">
                        {todo.startTime}{todo.endTime ? `–${todo.endTime}` : ''}
                      </span>
                      {todo.eisenhowerQuadrant && (
                        <div
                          className="schedule-widget-dot"
                          style={{ background: QUADRANT_COLORS[todo.eisenhowerQuadrant] }}
                        />
                      )}
                      <span className="schedule-widget-text">
                        {todo.text.replace('!!', '').trim()}
                      </span>
                      {todo.completed && <Check size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Overdue Tasks Section */}
          {overdueTodos.length > 0 && (
            <div style={{ marginBottom: '16px', padding: '12px 16px', border: '1px solid rgba(255, 74, 74, 0.3)', background: 'rgba(255, 74, 74, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--high-priority)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Overdue ({overdueTodos.length})
                </span>
                <button
                  onClick={() => {
                    // Move all overdue to today
                    overdueTodos.forEach(t => {
                      editTodo(t.id, t.text); // trigger re-render
                      useStore.getState().todos.find(todo => todo.id === t.id)!.date = todayString;
                    });
                    useStore.setState({ todos: [...useStore.getState().todos] });
                    toast.success(`Moved ${overdueTodos.length} tasks to today`);
                  }}
                  style={{ fontSize: '0.7rem', background: 'transparent', border: '1px solid rgba(255,74,74,0.4)', color: 'var(--high-priority)', padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Move all to today
                </button>
              </div>
              {overdueTodos.slice(0, 10).map(todo => (
                <div key={todo.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div
                    className="todo-checkbox"
                    onClick={() => toggleTodo(todo.id)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {todo.text.replace('!!', '')}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,74,74,0.7)' }}>{todo.date}</span>
                  <button
                    onClick={() => {
                      // Move single task to today
                      const allTodos = useStore.getState().todos.map(t => t.id === todo.id ? { ...t, date: todayString } : t);
                      useStore.setState({ todos: allTodos });
                      toast.success('Moved to today');
                    }}
                    style={{ fontSize: '0.6rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '2px 6px', cursor: 'pointer', fontFamily: 'inherit' }}
                    title="Move to today"
                  >
                    →today
                  </button>
                </div>
              ))}
              {overdueTodos.length > 10 && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  +{overdueTodos.length - 10} more overdue tasks
                </div>
              )}
            </div>
          )}

          <Reorder.Group 
            axis="y" 
            values={activeTodos} 
            onReorder={reorderTodos}
            style={{ listStyle: 'none', margin: 0, padding: 0 }}
          >
            <AnimatePresence>
              {activeTodos.map((todo) => {
                const isHighPriority = todo.text.includes('!!');
                const displayText = todo.text.replace('!!', '').trim();
                const urls = todo.text.match(urlRegex());
                const firstUrl = urls ? urls[0] : null;
              
              // Smart hashtag rendering strategy
              const formattedText = displayText.replace(/(#\w+)/g, '[$1](#tag-$1)');
              
              return (
                <Reorder.Item
                  key={todo.id}
                  value={todo}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="todo-item"
                >
                  <div className="drag-handle">
                    <GripVertical size={16} />
                  </div>

                  {/* Eisenhower quadrant color indicator + badge */}
                  {todo.eisenhowerQuadrant && (
                    <div
                      className="eisenhower-indicator"
                      title={todo.eisenhowerQuadrant.replace(/-/g, ' ')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                        marginRight: -4,
                      }}
                    >
                      <div
                        style={{
                          width: 4,
                          height: 24,
                          borderRadius: 2,
                          background: QUADRANT_COLORS[todo.eisenhowerQuadrant] || 'transparent',
                        }}
                      />
                      <span
                        className="eisenhower-badge"
                        style={{
                          fontSize: '0.55rem',
                          fontWeight: 700,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          color: QUADRANT_COLORS[todo.eisenhowerQuadrant],
                          background: `${QUADRANT_COLORS[todo.eisenhowerQuadrant]}15`,
                          border: `1px solid ${QUADRANT_COLORS[todo.eisenhowerQuadrant]}30`,
                          padding: '2px 5px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {todo.eisenhowerQuadrant === 'urgent-important' ? 'DO' :
                         todo.eisenhowerQuadrant === 'not-urgent-important' ? 'SCHEDULE' :
                         todo.eisenhowerQuadrant === 'urgent-not-important' ? 'DELEGATE' : 'ELIMINATE'}
                      </span>
                    </div>
                  )}
                  
                  <div
                    className={`todo-checkbox ${todo.completed ? 'checked' : ''}`}
                    onClick={() => toggleTodo(todo.id)}
                  >
                    {todo.completed && (
                      <Check size={14} strokeWidth={3} />
                    )}
                  </div>

                  <div className="todo-content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    
                    {editingTodoId === todo.id ? (
                      <input
                        autoFocus
                        className="todo-input"
                        value={editTodoText}
                        onChange={(e) => setEditTodoText(e.target.value)}
                        onKeyDown={(e) => handleEditTodoKeyDown(e, todo.id)}
                        onBlur={() => handleEditTodoSave(todo.id)}
                        style={{ padding: '4px 0', fontSize: '1.15rem' }}
                      />
                    ) : (
                      <div
                        className={`todo-text-wrapper ${todo.completed ? 'checked' : ''} ${isHighPriority ? 'high-priority' : ''}`}
                        onClick={(e) => {
                          // Prevent toggle if clicking on a link
                          if ((e.target as HTMLElement).tagName.toLowerCase() === 'a' || (e.target as HTMLElement).className.includes('hashtag-pill')) return;
                          toggleTodo(todo.id);
                        }}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ node, href, ...props }) => {
                              if (href?.startsWith('#tag-')) {
                                const tag = href.replace('#tag-', '');
                                return (
                                  <span
                                    className="hashtag-pill"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setHashtagFilter(tag);
                                      toast.info(`Filtering by #${tag}`);
                                    }}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    {props.children}
                                  </span>
                                );
                              }
                              return (
                                <a
                                  {...props}
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                                />
                              );
                            },
                            p: ({ node, ...props }) => <p {...props} style={{ margin: 0 }} />,
                          }}
                        >
                          {formattedText}
                        </ReactMarkdown>
                        {/* Magical dynamic strikethrough animation */}
                        {todo.completed && (
                          <motion.div 
                            className="strikethrough-line" 
                            initial={{ width: 0 }}
                            animate={{ width: '104%' }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                          />
                        )}
                      </div>
                    )}
                    
                    {todo.attachment && (
                      <div className="todo-attachment" style={{ position: 'relative', width: 'fit-content' }}>
                        <img 
                          src={convertFileSrc(todo.attachment)} 
                          alt="Attachment" 
                          style={{ maxWidth: '300px', maxHeight: '200px', borderRadius: '8px', border: '1px solid var(--border)' }} 
                        />
                        <button 
                          className="icon-btn delete" 
                          style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', padding: 4 }} 
                          onClick={(e) => { e.stopPropagation(); removeAttachmentFromTodo(todo.id); }}
                        >
                          <X size={14} color="#fff" />
                        </button>
                      </div>
                    )}
                    
                    {firstUrl && <NativeLinkPreview url={firstUrl} />}
                  </div>

                  <div className="actions-container">
                    <button
                      className="icon-btn"
                      title="Add Subtask"
                      onClick={() => {
                        setAddingSubtaskFor(todo.id);
                        setNewSubtaskText('');
                      }}
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      className="icon-btn"
                      title="Edit Task"
                      onClick={() => {
                        setEditingTodoId(todo.id);
                        setEditTodoText(todo.text);
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-btn"
                      title="Attach Image"
                      onClick={() => handleAttachContent(todo.id)}
                    >
                      <Paperclip size={16} />
                    </button>
                    <button
                      className="icon-btn pomodoro"
                      title={activePomodoroId === todo.id ? "Stop Focus" : "Start Focus"}
                      onClick={() => {
                        if (activePomodoroId === todo.id) {
                          setIsPomodoroRunning(!isPomodoroRunning);
                        } else {
                          setActivePomodoroId(todo.id);
                          setPomodoroTimeLeft(settings.pomodoroDuration * 60);
                          setIsPomodoroRunning(true);
                          setPomodoroPhase('focus');
                        }
                      }}
                    >
                      <Timer size={16} color={activePomodoroId === todo.id && isPomodoroRunning ? "var(--accent)" : "currentColor"} />
                    </button>
                    <button
                      className="icon-btn delete"
                      title="Remove task"
                      onClick={() => {
                        const todoData = todos.find(t => t.id === todo.id);
                        const subtasks = todos.filter(t => t.parentId === todo.id);
                        removeTodo(todo.id);
                        toast('Task deleted', {
                          action: {
                            label: 'Undo',
                            onClick: () => {
                              if (todoData) {
                                useStore.setState((s) => ({ todos: [...s.todos, todoData, ...subtasks] }));
                              }
                            },
                          },
                        });
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Right-click context menu handler */}
                  <div
                    style={{ position: 'absolute', inset: 0, zIndex: -1 }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        items: [
                          { label: 'Edit', icon: <Pencil size={16} />, onClick: () => { setEditingTodoId(todo.id); setEditTodoText(todo.text); } },
                          { label: 'Add Subtask', icon: <Plus size={16} />, onClick: () => { setAddingSubtaskFor(todo.id); setNewSubtaskText(''); } },
                          { label: 'Duplicate', icon: <Copy size={16} />, onClick: () => { if (activeCategoryId) addTodo(activeCategoryId, todo.text, dateString); } },
                          { label: 'Attach Image', icon: <Paperclip size={16} />, onClick: () => handleAttachContent(todo.id) },
                          { label: 'Focus Mode', icon: <Timer size={16} />, onClick: () => { setZenMode(true, todo.id); } },
                          { label: 'Delete', icon: <Trash2 size={16} />, onClick: () => removeTodo(todo.id), variant: 'danger' },
                        ],
                      });
                    }}
                  />

                  {/* Subtasks */}
                  {todo.subtasks && todo.subtasks.length > 0 && (
                    <>
                      <button
                        className="collapse-btn"
                        onClick={() => toggleSubtasksCollapse(todo.id)}
                        style={{ position: 'absolute', left: -4, top: 36 }}
                        title={todo.isCollapsed ? 'Expand subtasks' : 'Collapse subtasks'}
                      >
                        <ChevronDown
                          size={14}
                          style={{ transform: todo.isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                        />
                      </button>

                      {!todo.isCollapsed && (
                        <div className="subtasks-container" style={{ gridColumn: '1 / -1' }}>
                          {todos
                            .filter((st) => todo.subtasks?.includes(st.id))
                            .map((subtask) => (
                              <div className="subtask-item" key={subtask.id}>
                                <div
                                  className={`todo-checkbox ${subtask.completed ? 'checked' : ''}`}
                                  onClick={() => toggleTodo(subtask.id)}
                                  style={{ width: 20, height: 20 }}
                                >
                                  {subtask.completed && <Check size={12} weight="bold" />}
                                </div>
                                <span
                                  style={{
                                    flex: 1,
                                    textDecoration: subtask.completed ? 'line-through' : 'none',
                                    color: subtask.completed ? 'var(--text-secondary)' : 'var(--text-primary)',
                                    fontSize: '0.95rem',
                                  }}
                                >
                                  {subtask.text}
                                </span>
                                <button
                                  className="icon-btn delete"
                                  onClick={() => removeTodo(subtask.id)}
                                  style={{ opacity: 0.5, padding: 4 }}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Add Subtask Input */}
                  {addingSubtaskFor === todo.id && (
                    <div className="subtasks-container" style={{ gridColumn: '1 / -1' }}>
                      <input
                        autoFocus
                        className="todo-input"
                        placeholder="Add a subtask..."
                        value={newSubtaskText}
                        style={{ fontSize: '0.95rem', padding: '4px 0' }}
                        onChange={(e) => setNewSubtaskText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newSubtaskText.trim() && activeCategoryId) {
                            addTodo(activeCategoryId, newSubtaskText.trim(), dateString, todo.id);
                            setNewSubtaskText('');
                          } else if (e.key === 'Escape') {
                            setAddingSubtaskFor(null);
                            setNewSubtaskText('');
                          }
                        }}
                        onBlur={() => {
                          setAddingSubtaskFor(null);
                          setNewSubtaskText('');
                        }}
                      />
                    </div>
                  )}
                </Reorder.Item>
              );
            })}
          </AnimatePresence>
        </Reorder.Group>
        </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Bookmark Folders */}
            {activeBookmarkCategoryId && (
              <div className="bookmark-folders">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <button
                    className={`folder-item ${!activeBookmarkFolderId ? 'active' : ''}`}
                    onClick={() => setActiveBookmarkFolder(null)}
                    style={{ flex: 'none' }}
                  >
                    All
                  </button>
                  {bookmarkFolders
                    .filter((f) => f.categoryId === activeBookmarkCategoryId)
                    .map((folder) => (
                      <div key={folder.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          className={`folder-item ${activeBookmarkFolderId === folder.id ? 'active' : ''}`}
                          onClick={() => setActiveBookmarkFolder(folder.id)}
                        >
                          <Folder size={14} weight={activeBookmarkFolderId === folder.id ? 'fill' : 'regular'} />
                          {folder.name}
                        </button>
                        <button
                          className="icon-btn delete"
                          onClick={() => removeBookmarkFolder(folder.id)}
                          style={{ opacity: 0.4, padding: 2 }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  {isCreatingFolder ? (
                    <input
                      autoFocus
                      className="folder-input"
                      placeholder="Folder name..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newFolderName.trim()) {
                          addBookmarkFolder(newFolderName.trim(), activeBookmarkCategoryId);
                          setNewFolderName('');
                          setIsCreatingFolder(false);
                        } else if (e.key === 'Escape') {
                          setIsCreatingFolder(false);
                          setNewFolderName('');
                        }
                      }}
                      onBlur={() => {
                        setIsCreatingFolder(false);
                        setNewFolderName('');
                      }}
                      style={{ width: 120 }}
                    />
                  ) : (
                    <button
                      className="add-subtask-btn"
                      onClick={() => setIsCreatingFolder(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Plus size={14} /> Folder
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Bookmark List */}
            <div className="bookmark-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <AnimatePresence>
                {activeBookmarks.map((bookmark) => {
                  const text = bookmark.text || bookmark.url || '';
                  const urls = text.match(urlRegex());
                  const firstUrl = urls ? urls[0] : null;
                  const formattedText = text.replace(/(#\w+)/g, '[$1](#tag-$1)');

                  return (
                  <motion.div
                    key={bookmark.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="todo-item bookmark-item"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      const folders = bookmarkFolders.filter((f) => f.categoryId === activeBookmarkCategoryId);
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        items: [
                          ...folders.map((f) => ({
                            label: `Move to ${f.name}`,
                            icon: <Folder size={16} />,
                            onClick: () => useStore.getState().moveBookmarkToFolder(bookmark.id, f.id),
                          })),
                          ...(bookmark.folderId ? [{
                            label: 'Remove from folder',
                            icon: <Folder size={16} />,
                            onClick: () => useStore.getState().moveBookmarkToFolder(bookmark.id, null),
                          }] : []),
                          { label: 'Delete', icon: <Trash2 size={16} />, onClick: () => removeBookmark(bookmark.id), variant: 'danger' as const },
                        ],
                      });
                    }}
                  >
                    <div className="todo-text-wrapper" style={{ marginBottom: firstUrl ? '8px' : '0' }}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ node, href, ...props }) => {
                            if (href?.startsWith('#tag-')) {
                              const tag = href.replace('#tag-', '');
                              return (
                                <span
                                  className="hashtag-pill"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setHashtagFilter(tag);
                                    toast.info(`Filtering by #${tag}`);
                                  }}
                                  style={{ cursor: 'pointer' }}
                                >
                                  {props.children}
                                </span>
                              );
                            }
                            return (
                              <a
                                {...props}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                              />
                            );
                          },
                          p: ({ node, ...props }) => <p {...props} style={{ margin: 0 }} />,
                        }}
                      >
                        {formattedText}
                      </ReactMarkdown>
                    </div>

                    {firstUrl && <NativeLinkPreview url={firstUrl.startsWith('http') ? firstUrl : `https://${firstUrl}`} compact={true} />}

                    <button
                      className="icon-btn delete"
                      title="Remove bookmark"
                      onClick={() => removeBookmark(bookmark.id)}
                      style={{ position: 'absolute', top: 8, right: 0 }}
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
        
        {/* Floating Pomodoro Player */}
        <AnimatePresence>
          {activePomodoroId && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="pomodoro-floating-player"
            >
              <div className="pomo-info">
                <div className="pomo-pulse" style={{ background: pomodoroPhase === 'break' ? '#faad14' : 'var(--accent)', boxShadow: `0 0 10px ${pomodoroPhase === 'break' ? '#faad14' : 'var(--accent)'}` }}></div>
                <span className="pomo-task-name">
                  {pomodoroPhase === 'break' ? 'Break Time' : (todos.find(t => t.id === activePomodoroId)?.text.replace('!!', '') || 'Focusing...')}
                </span>
              </div>
              
              <div className="pomo-controls">
                <span className="pomo-time">
                  {Math.floor(pomodoroTimeLeft / 60).toString().padStart(2, '0')}:
                  {(pomodoroTimeLeft % 60).toString().padStart(2, '0')}
                </span>
                
                <button 
                  className="pomo-btn play-pause"
                  onClick={() => setIsPomodoroRunning(!isPomodoroRunning)}
                >
                  {isPomodoroRunning ? 'Pause' : 'Resume'}
                </button>
                <button 
                  className="pomo-btn zen"
                  onClick={async () => {
                    setZenMode(true, activePomodoroId);
                    try {
                      await getCurrentWindow().setFullscreen(true);
                    } catch {}
                  }}
                  title="Enter Zen Mode"
                >
                  Zen
                </button>
                <button 
                  className="pomo-btn cancel"
                  onClick={() => {
                    setIsPomodoroRunning(false);
                    setActivePomodoroId(null);
                    setPomodoroPhase(null);
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTodos.length === 0 && appMode === 'todos' && !isAddingTodo && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="empty-state"
            style={{ marginTop: 100 }}
          >
            <Sparkle size={64} weight="duotone" color="var(--border)" style={{ marginBottom: 24 }} />
            <div className="empty-state-title">A fresh day.</div>
            <p>You have no tasks pending.</p>
            
            <div className="shortcut-hint">
              Hit <span className="kbd">Alt + Space</span> to quick-capture anywhere
            </div>
          </motion.div>
        )}
        
        {activeBookmarks.length === 0 && appMode === 'bookmarks' && !isAddingTodo && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="empty-state"
            style={{ marginTop: 100 }}
          >
            <BookmarkSimple size={64} weight="duotone" color="var(--border)" style={{ marginBottom: 24 }} />
            <div className="empty-state-title">No Bookmarks</div>
            <p>Save interesting links here.</p>
            
            <div className="shortcut-hint">
              Click <span className="kbd">create</span> to paste a new URL.
            </div>
          </motion.div>
        )}
        
        {isAllDone && !isAddingTodo && activeTodos.length > 0 && appMode === 'todos' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="empty-state"
            style={{ marginTop: 100 }}
          >
            <CheckCircle size={64} weight="duotone" color="var(--accent)" style={{ marginBottom: 24, boxShadow: '0 0 30px rgba(var(--accent-rgb), 0.2)', borderRadius: '50%' }} />
            <div className="empty-state-title" style={{ color: 'var(--accent)' }}>Masterpiece!</div>
            <p>All tasks completed for today.</p>
          </motion.div>
        )}
          </div>
        </>
      )}

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onExport={handleExport} onImport={handleImport} />

      {/* Search Omnibar */}
      <Omnibar isOpen={isSearchOpen} onClose={() => setSearchOpen(false)} />

      {/* Zen Mode */}
      {isZenMode && zenModeTaskId && <ZenMode todoId={zenModeTaskId} onExit={() => setZenMode(false)} />}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
    </>
  );
}
