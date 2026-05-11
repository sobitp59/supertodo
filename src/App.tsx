import { useState, useEffect } from 'react';
import { useStore } from './store';
import { format, subDays, addDays } from 'date-fns';
import { X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { Toaster, toast } from 'sonner';
import { SettingsModal } from './components/SettingsModal';
import { Omnibar } from './components/Omnibar';
import { ZenMode } from './components/ZenMode';
import { NotesView } from './components/NotesView';
import { ChallengesView } from './components/ChallengesView';
import { YearlyGoalsView } from './components/YearlyGoalsView';
import { JobTrackerView } from './components/JobTrackerView';
import { ContextMenu, ContextMenuItem } from './components/ContextMenu';
import { TimeCanvasView } from './components/time-canvas/TimeCanvasView';
import { MindmapView } from './components/mindmap/MindmapView';
import { AppHeader } from './components/layout/AppHeader';
import { ModeBar } from './components/layout/ModeBar';
import { CategoryTabs } from './components/layout/CategoryTabs';
import { TodoListView } from './components/todos/TodoListView';
import { BookmarkListView } from './components/bookmarks/BookmarkListView';
import { PomodoroPlayer } from './components/shared/PomodoroPlayer';
import { EmptyTodosState, EmptyBookmarksState, AllDoneState } from './components/shared/EmptyStates';
import { usePomodoro } from './hooks/usePomodoro';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { useWindowControls } from './hooks/useWindowControls';
import { useConfetti } from './hooks/useConfetti';
import { useReminders } from './hooks/useReminders';
import './App.css';

export default function App() {
  const {
    appMode,
    settings,
    todos,
    bookmarks,
    activeCategoryId,
    activeBookmarkCategoryId,
    activeBookmarkFolderId,
    isSearchOpen,
    activeHashtagFilter,
    isZenMode,
    zenModeTaskId,
    setZenMode,
    setSearchOpen,
    setHashtagFilter,
  } = useStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

  const pomodoro = usePomodoro();
  const { isFullscreen, setIsFullscreen } = useWindowControls();

  useGlobalShortcuts({
    isZenMode,
    contextMenu,
    setCurrentDate,
    setIsAddingTodo,
    setIsFullscreen,
    setContextMenu,
  });

  useReminders();

  // Dynamic Accent Color
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', settings.accentColor);
  }, [settings.accentColor]);

  const dateString = format(currentDate, 'yyyy-MM-dd');
  const todayString = format(new Date(), 'yyyy-MM-dd');

  // Filter todos
  let activeTodos = todos.filter(
    (t) => t.categoryId === activeCategoryId && t.date === dateString && !t.parentId
  );
  const overdueTodos = dateString === todayString
    ? todos.filter((t) => t.categoryId === activeCategoryId && t.date < todayString && !t.completed && !t.parentId)
    : [];
  if (activeHashtagFilter) {
    activeTodos = activeTodos.filter((t) => t.text.includes(`#${activeHashtagFilter}`));
  }

  // Filter bookmarks
  let activeBookmarks = bookmarks.filter((b) => {
    const matchesCategory = b.categoryId === activeBookmarkCategoryId;
    const matchesFolder = !activeBookmarkFolderId || b.folderId === activeBookmarkFolderId;
    return matchesCategory && matchesFolder;
  });
  if (activeHashtagFilter) {
    activeBookmarks = activeBookmarks.filter((b) => b.text.includes(`#${activeHashtagFilter}`));
  }

  const completedCount = activeTodos.filter(t => t.completed).length;
  const progressPercent = activeTodos.length > 0 ? (completedCount / activeTodos.length) * 100 : 0;
  const isAllDone = activeTodos.length > 0 && progressPercent === 100;

  useConfetti(isAllDone, activeTodos.length);

  const handleExport = async () => {
    try {
      const filePath = await save({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        defaultPath: `supertodo_backup_${Date.now()}.json`,
      });
      if (!filePath) return;
      const state = useStore.getState();
      const stateDump = {
        version: 2, categories: state.categories, todos: state.todos,
        bookmarks: state.bookmarks, bookmarkCategories: state.bookmarkCategories,
        bookmarkFolders: state.bookmarkFolders, notes: state.notes,
        noteCategories: state.noteCategories, settings: state.settings,
        challenges: state.challenges, yearlyGoals: state.yearlyGoals,
        jobApplications: state.jobApplications, exportedAt: Date.now(),
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
      const selectedPath = await open({ multiple: false, filters: [{ name: 'JSON', extensions: ['json'] }] });
      if (!selectedPath) return;
      const fileContent = await readTextFile(selectedPath);
      const parsedData = JSON.parse(fileContent);
      const currentState = useStore.getState();
      if (parsedData.categories || parsedData.todos) {
        useStore.setState({
          categories: parsedData.categories || currentState.categories,
          todos: parsedData.todos || [],
          bookmarks: parsedData.bookmarks || [],
          bookmarkCategories: parsedData.bookmarkCategories || currentState.bookmarkCategories,
          bookmarkFolders: parsedData.bookmarkFolders || [],
          notes: parsedData.notes || [],
          noteCategories: parsedData.noteCategories || [{ id: 'note_default', name: 'General', createdAt: Date.now() }],
          settings: { ...currentState.settings, ...(parsedData.settings || {}) },
          challenges: parsedData.challenges || [],
          yearlyGoals: parsedData.yearlyGoals || [],
          jobApplications: parsedData.jobApplications || [],
          activeCategoryId: parsedData.categories?.length > 0 ? parsedData.categories[0].id : null,
        });
        toast.success("Import successful! Data loaded.");
      } else {
        toast.error("Invalid backup file format.", { description: "The JSON structure could not be mapped to our store." });
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to import data.");
    }
  };

  const handlePrevDay = () => setCurrentDate((prev) => subDays(prev, 1));
  const handleNextDay = () => setCurrentDate((prev) => addDays(prev, 1));
  const handleToday = () => setCurrentDate(new Date());

  return (
    <>
    <div className="ambient-background" />
    <div className={`app-wrapper ${isZenMode ? 'zen-active' : ''} ${isFullscreen ? 'fullscreen' : ''}`}>
      <Toaster theme="dark" position="top-right" toastOptions={{ style: { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' } }} />

      <AppHeader
        currentDate={currentDate}
        progressPercent={progressPercent}
        pomodoro={pomodoro}
        onPrevDay={handlePrevDay}
        onNextDay={handleNextDay}
        onToday={handleToday}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <ModeBar activeTodos={activeTodos} pomodoro={pomodoro} setIsAddingTodo={setIsAddingTodo} />

      {appMode !== 'notes' && appMode !== 'challenges' && appMode !== 'goals' && appMode !== 'jobs' && appMode !== 'time-canvas' && appMode !== 'mindmap' && (
        <CategoryTabs />
      )}

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
      ) : appMode === 'mindmap' ? (
        <MindmapView />
      ) : (
        <>
          {activeHashtagFilter && (appMode === 'todos' || appMode === 'bookmarks') && (
            <div style={{ padding: '16px 32px 0 32px' }}>
              <div className="filter-badge">
                <span>Showing items with #{activeHashtagFilter}</span>
                <X size={16} className="filter-badge-clear" onClick={() => setHashtagFilter(null)} />
              </div>
            </div>
          )}

          <div className="todo-list">
            <AnimatePresence>
              {isAddingTodo && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="todo-item" style={{ cursor: 'text', paddingLeft: 36 }}>
                  <TodoInput appMode={appMode} dateString={dateString} setIsAddingTodo={setIsAddingTodo} />
                </motion.div>
              )}
            </AnimatePresence>

            {appMode === 'todos' ? (
              <TodoListView
                activeTodos={activeTodos}
                overdueTodos={overdueTodos}
                dateString={dateString}
                todayString={todayString}
                pomodoro={pomodoro}
                setContextMenu={setContextMenu}
              />
            ) : (
              <BookmarkListView activeBookmarks={activeBookmarks} setContextMenu={setContextMenu} />
            )}

            <PomodoroPlayer pomodoro={pomodoro} />

            {activeTodos.length === 0 && appMode === 'todos' && !isAddingTodo && <EmptyTodosState />}
            {activeBookmarks.length === 0 && appMode === 'bookmarks' && !isAddingTodo && <EmptyBookmarksState />}
            {isAllDone && !isAddingTodo && activeTodos.length > 0 && appMode === 'todos' && <AllDoneState />}
          </div>
        </>
      )}

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onExport={handleExport} onImport={handleImport} />
      <Omnibar isOpen={isSearchOpen} onClose={() => setSearchOpen(false)} />
      {isZenMode && zenModeTaskId && <ZenMode todoId={zenModeTaskId} onExit={() => setZenMode(false)} />}
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />}
    </div>
    </>
  );
}

// Inline TodoInput to keep App.tsx self-contained for the add-todo input
function TodoInput({ appMode, dateString, setIsAddingTodo }: { appMode: string; dateString: string; setIsAddingTodo: (v: boolean) => void }) {
  const [newTodoText, setNewTodoText] = useState('');
  const { activeCategoryId, activeBookmarkCategoryId, addTodo, addBookmark } = useStore();

  const handleAddTodo = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTodoText.trim()) {
      if (appMode === 'todos' && activeCategoryId) {
        addTodo(activeCategoryId, newTodoText.trim(), dateString);
      } else if (appMode === 'bookmarks' && activeBookmarkCategoryId) {
        addBookmark(activeBookmarkCategoryId, newTodoText.trim());
      }
      setNewTodoText('');
    } else if (e.key === 'Escape') {
      setIsAddingTodo(false);
      setNewTodoText('');
    }
  };

  return (
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
  );
}
