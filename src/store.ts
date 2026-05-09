import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";

export type EisenhowerQuadrant = 
  | 'urgent-important' 
  | 'not-urgent-important' 
  | 'urgent-not-important' 
  | 'not-urgent-not-important';

export interface Todo {
  id: string;
  categoryId: string;
  text: string;
  completed: boolean;
  date: string; // format: YYYY-MM-DD
  createdAt: number;
  attachment?: string;
  parentId?: string; // null for root todos, ID for subtasks
  subtasks?: string[]; // denormalized array of child IDs
  isCollapsed?: boolean; // UI state for collapsing subtask list
  eisenhowerQuadrant?: EisenhowerQuadrant;
  startTime?: string;
  endTime?: string;
}

export interface Bookmark {
  id: string;
  categoryId: string;
  text: string;
  url?: string; // For backward compatibility with older localstorage if any
  createdAt: number;
  folderId?: string; // optional folder assignment
  tags?: string[]; // extracted hashtags
}

export interface Category {
  id: string;
  name: string;
  createdAt: number;
}

export interface AppSettings {
  pomodoroDuration: number; // in minutes, default 25
  pomodoroBreakDuration: number; // in minutes, default 5
  accentColor: string; // hex color, default '#2add84'
  autoStartEnabled: boolean;
  zenModeAmbientSound: 'none' | 'rain' | 'cafe' | 'waves' | 'whitenoise';
  defaultView: 'todos' | 'bookmarks' | 'notes';
  theme: 'dark' | 'light';
  userName: string;
}

export interface Note {
  id: string;
  categoryId: string;
  title: string;
  content: string; // markdown
  createdAt: number;
  updatedAt: number;
  tags?: string[]; // extracted hashtags
}

export interface BookmarkFolder {
  id: string;
  categoryId: string; // belongs to which bookmark category
  name: string;
  createdAt: number;
  isExpanded?: boolean; // UI state
}

export interface Challenge {
  id: string;
  name: string;
  emoji: string; // visual identifier
  startDate: string; // YYYY-MM-DD
  targetDays: number; // e.g., 30, 60, 90, or 0 for indefinite
  entries: Record<string, 'success' | 'fail'>; // key: YYYY-MM-DD
  createdAt: number;
  isArchived: boolean;
}

export interface YearlyGoal {
  id: string;
  year: number;
  title: string;
  description: string;
  category: 'career' | 'health' | 'finance' | 'learning' | 'personal' | 'other';
  progress: number; // 0-100
  milestones: GoalMilestone[];
  createdAt: number;
}

export interface GoalMilestone {
  id: string;
  text: string;
  completed: boolean;
}

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  status: 'wishlist' | 'applied' | 'interview' | 'offer' | 'rejected' | 'accepted';
  appliedDate: string; // YYYY-MM-DD
  salary?: string;
  location?: string;
  url?: string;
  notes: string;
  createdAt: number;
}

export interface SearchResult {
  type: 'todo' | 'bookmark' | 'note';
  id: string;
  title: string;
  preview: string;
  categoryName: string;
  dateContext?: string; // for todos
}

interface AppState {
  // App mode
  appMode: 'todos' | 'bookmarks' | 'notes' | 'challenges' | 'goals' | 'jobs' | 'time-canvas';
  setAppMode: (mode: 'todos' | 'bookmarks' | 'notes' | 'challenges' | 'goals' | 'jobs' | 'time-canvas') => void;

  // Time Canvas
  timeCanvasSelectedDate: string; // YYYY-MM-DD
  setTimeCanvasSelectedDate: (date: string) => void;


  // Settings
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;

  // Todos
  categories: Category[];
  todos: Todo[];
  activeCategoryId: string | null;
  addCategory: (name: string) => void;
  removeCategory: (id: string) => void;
  setActiveCategory: (id: string | null) => void;
  addTodo: (categoryId: string, text: string, date: string, parentId?: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  editTodo: (id: string, newText: string) => void;
  reorderTodos: (todos: Todo[]) => void;
  attachFileToTodo: (id: string, filePath: string) => void;
  removeAttachmentFromTodo: (id: string) => void;
  toggleSubtasksCollapse: (id: string) => void;
  updateTodoQuadrant: (id: string, quadrant?: EisenhowerQuadrant) => void;
  updateTodoTime: (id: string, startTime?: string, endTime?: string) => void;

  // Bookmarks
  bookmarkCategories: Category[];
  bookmarkFolders: BookmarkFolder[];
  bookmarks: Bookmark[];
  activeBookmarkCategoryId: string | null;
  activeBookmarkFolderId: string | null;
  addBookmarkCategory: (name: string) => void;
  removeBookmarkCategory: (id: string) => void;
  setActiveBookmarkCategory: (id: string | null) => void;
  addBookmarkFolder: (name: string, parentId: string | null) => void;
  removeBookmarkFolder: (id: string) => void;
  setActiveBookmarkFolder: (id: string | null) => void;
  addBookmark: (categoryId: string, text: string, folderId?: string) => void;
  removeBookmark: (id: string) => void;
  moveBookmarkToFolder: (bookmarkId: string, folderId: string | null) => void;

  // Notes
  noteCategories: Category[];
  notes: Note[];
  activeNoteCategoryId: string | null;
  activeNoteId: string | null;
  addNoteCategory: (name: string) => void;
  removeNoteCategory: (id: string) => void;
  setActiveNoteCategory: (id: string | null) => void;
  addNote: (categoryId: string, title: string) => void;
  updateNote: (id: string, title: string, content: string) => void;
  removeNote: (id: string) => void;
  setActiveNote: (id: string | null) => void;

  // Challenges
  challenges: Challenge[];
  activeChallengeId: string | null;
  addChallenge: (name: string, emoji: string, targetDays: number) => void;
  removeChallenge: (id: string) => void;
  toggleChallengeDay: (challengeId: string, date: string) => void;
  setActiveChallenge: (id: string | null) => void;
  archiveChallenge: (id: string) => void;

  // Yearly Goals
  yearlyGoals: YearlyGoal[];
  activeGoalYear: number;
  addYearlyGoal: (title: string, category: YearlyGoal['category'], year: number) => void;
  updateYearlyGoal: (id: string, updates: Partial<Omit<YearlyGoal, 'id' | 'createdAt'>>) => void;
  removeYearlyGoal: (id: string) => void;
  addMilestone: (goalId: string, text: string) => void;
  toggleMilestone: (goalId: string, milestoneId: string) => void;
  removeMilestone: (goalId: string, milestoneId: string) => void;
  setActiveGoalYear: (year: number) => void;

  // Job Tracker
  jobApplications: JobApplication[];
  addJobApplication: (company: string, role: string, status: JobApplication['status']) => void;
  updateJobApplication: (id: string, updates: Partial<Omit<JobApplication, 'id' | 'createdAt'>>) => void;
  removeJobApplication: (id: string) => void;

  // Search & Filtering
  searchQuery: string;
  searchResults: SearchResult[];
  isSearchOpen: boolean;
  activeHashtagFilter: string | null;
  setSearchQuery: (query: string) => void;
  performSearch: (query: string) => void;
  setSearchOpen: (isOpen: boolean) => void;
  setHashtagFilter: (tag: string | null) => void;

  // Zen Mode
  isZenMode: boolean;
  zenModeTaskId: string | null;
  setZenMode: (isZen: boolean, taskId?: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      appMode: 'todos',
      setAppMode: (mode) => set({ appMode: mode }),

      timeCanvasSelectedDate: new Date().toISOString().split('T')[0],
      setTimeCanvasSelectedDate: (date) => set({ timeCanvasSelectedDate: date }),

      // Settings
      settings: {
        pomodoroDuration: 25,
        pomodoroBreakDuration: 5,
        accentColor: '#2add84',
        autoStartEnabled: false,
        zenModeAmbientSound: 'none',
        defaultView: 'todos',
        theme: 'dark',
        userName: 'User',
      },
      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),

      // Todos
      categories: [
        { id: "default", name: "Work", createdAt: Date.now() },
        { id: "personal", name: "Personal", createdAt: Date.now() + 1 },
      ],
      todos: [],
      activeCategoryId: "default",

      // Bookmarks
      bookmarkCategories: [
        { id: "bkm_default", name: "Reading List", createdAt: Date.now() },
      ],
      bookmarkFolders: [],
      bookmarks: [],
      activeBookmarkCategoryId: "bkm_default",
      activeBookmarkFolderId: null,

      // Notes
      noteCategories: [
        { id: "note_default", name: "General", createdAt: Date.now() },
      ],
      notes: [],
      activeNoteCategoryId: "note_default",
      activeNoteId: null,

      // Search & Filtering
      searchQuery: '',
      searchResults: [],
      isSearchOpen: false,
      activeHashtagFilter: null,

      // Zen Mode
      isZenMode: false,
      zenModeTaskId: null,
      setZenMode: (isZen, taskId) => set({ isZenMode: isZen, zenModeTaskId: taskId || null }),

      // Challenges
      challenges: [],
      activeChallengeId: null,

      addChallenge: (name, emoji, targetDays) =>
        set((state) => {
          const today = new Date();
          const newChallenge: Challenge = {
            id: uuidv4(),
            name,
            emoji,
            startDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
            targetDays,
            entries: {},
            createdAt: Date.now(),
            isArchived: false,
          };
          return {
            challenges: [...state.challenges, newChallenge],
            activeChallengeId: newChallenge.id,
          };
        }),

      removeChallenge: (id) =>
        set((state) => ({
          challenges: state.challenges.filter((c) => c.id !== id),
          activeChallengeId: state.activeChallengeId === id ? null : state.activeChallengeId,
        })),

      toggleChallengeDay: (challengeId, date) =>
        set((state) => ({
          challenges: state.challenges.map((c) => {
            if (c.id !== challengeId) return c;
            const entries = { ...c.entries };
            if (entries[date] === 'success') {
              entries[date] = 'fail';
            } else if (entries[date] === 'fail') {
              delete entries[date];
            } else {
              entries[date] = 'success';
            }
            return { ...c, entries };
          }),
        })),

      setActiveChallenge: (id) => set({ activeChallengeId: id }),

      archiveChallenge: (id) =>
        set((state) => ({
          challenges: state.challenges.map((c) =>
            c.id === id ? { ...c, isArchived: true } : c,
          ),
          activeChallengeId: state.activeChallengeId === id ? null : state.activeChallengeId,
        })),

      // Yearly Goals
      yearlyGoals: [],
      activeGoalYear: new Date().getFullYear(),

      addYearlyGoal: (title, category, year) =>
        set((state) => ({
          yearlyGoals: [
            ...state.yearlyGoals,
            {
              id: uuidv4(),
              year,
              title,
              description: '',
              category,
              progress: 0,
              milestones: [],
              createdAt: Date.now(),
            },
          ],
        })),

      updateYearlyGoal: (id, updates) =>
        set((state) => ({
          yearlyGoals: state.yearlyGoals.map((g) =>
            g.id === id ? { ...g, ...updates } : g,
          ),
        })),

      removeYearlyGoal: (id) =>
        set((state) => ({
          yearlyGoals: state.yearlyGoals.filter((g) => g.id !== id),
        })),

      addMilestone: (goalId, text) =>
        set((state) => ({
          yearlyGoals: state.yearlyGoals.map((g) =>
            g.id === goalId
              ? {
                  ...g,
                  milestones: [
                    ...g.milestones,
                    { id: uuidv4(), text, completed: false },
                  ],
                }
              : g,
          ),
        })),

      toggleMilestone: (goalId, milestoneId) =>
        set((state) => ({
          yearlyGoals: state.yearlyGoals.map((g) => {
            if (g.id !== goalId) return g;
            const milestones = g.milestones.map((m) =>
              m.id === milestoneId ? { ...m, completed: !m.completed } : m,
            );
            // Auto-update progress based on milestones
            const completedCount = milestones.filter((m) => m.completed).length;
            const progress = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : g.progress;
            return { ...g, milestones, progress };
          }),
        })),

      removeMilestone: (goalId, milestoneId) =>
        set((state) => ({
          yearlyGoals: state.yearlyGoals.map((g) => {
            if (g.id !== goalId) return g;
            const milestones = g.milestones.filter((m) => m.id !== milestoneId);
            const completedCount = milestones.filter((m) => m.completed).length;
            const progress = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;
            return { ...g, milestones, progress };
          }),
        })),

      setActiveGoalYear: (year) => set({ activeGoalYear: year }),

      // Job Tracker
      jobApplications: [],

      addJobApplication: (company, role, status) =>
        set((state) => {
          const today = new Date();
          return {
            jobApplications: [
              ...state.jobApplications,
              {
                id: uuidv4(),
                company,
                role,
                status,
                appliedDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
                notes: '',
                createdAt: Date.now(),
              },
            ],
          };
        }),

      updateJobApplication: (id, updates) =>
        set((state) => ({
          jobApplications: state.jobApplications.map((j) =>
            j.id === id ? { ...j, ...updates } : j,
          ),
        })),

      removeJobApplication: (id) =>
        set((state) => ({
          jobApplications: state.jobApplications.filter((j) => j.id !== id),
        })),

      addCategory: (name) =>
        set((state) => {
          const newCategory = { id: uuidv4(), name, createdAt: Date.now() };
          return {
            categories: [...state.categories, newCategory],
            activeCategoryId: newCategory.id,
          };
        }),

      removeCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
          todos: state.todos.filter((t) => t.categoryId !== id),
          activeCategoryId:
            state.activeCategoryId === id
              ? state.categories.find((c) => c.id !== id)?.id || null
              : state.activeCategoryId,
        })),

      setActiveCategory: (id) => set({ activeCategoryId: id }),

      addTodo: (categoryId, text, date, parentId) =>
        set((state) => {
          // Enforce 2-level depth limit
          if (parentId) {
            const parent = state.todos.find((t) => t.id === parentId);
            if (parent?.parentId) {
              // Parent is already a subtask, can't nest deeper
              return state;
            }
          }

          const newTodo: Todo = {
            id: uuidv4(),
            categoryId,
            text,
            completed: false,
            date,
            createdAt: Date.now(),
            parentId,
          };

          // Update parent's subtasks array if this is a subtask
          const updatedTodos = parentId
            ? state.todos.map((t) =>
                t.id === parentId
                  ? { ...t, subtasks: [...(t.subtasks || []), newTodo.id] }
                  : t,
              )
            : state.todos;

          return { todos: [...updatedTodos, newTodo] };
        }),

      toggleTodo: (id) =>
        set((state) => ({
          todos: state.todos.map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t,
          ),
        })),

      removeTodo: (id) =>
        set((state) => {
          // Recursively collect all subtask IDs
          const getSubtaskIds = (todoId: string): string[] => {
            const children = state.todos.filter((t) => t.parentId === todoId);
            return [
              ...children.map((c) => c.id),
              ...children.flatMap((c) => getSubtaskIds(c.id)),
            ];
          };

          const idsToRemove = [id, ...getSubtaskIds(id)];

          // Also update parent's subtasks array if this was a subtask
          const targetTodo = state.todos.find((t) => t.id === id);
          const updatedTodos = targetTodo?.parentId
            ? state.todos.map((t) =>
                t.id === targetTodo.parentId
                  ? { ...t, subtasks: t.subtasks?.filter((sid) => sid !== id) }
                  : t,
              )
            : state.todos;

          return {
            todos: updatedTodos.filter((t) => !idsToRemove.includes(t.id)),
          };
        }),

      editTodo: (id, newText) =>
        set((state) => ({
          todos: state.todos.map((t) =>
            t.id === id ? { ...t, text: newText } : t,
          ),
        })),

      reorderTodos: (reorderedTodos: Todo[]) =>
        set((state) => {
          // Because the reordered slice only contains filtered activeTodos,
          // we need to merge them back into the main list without losing others
          const otherTodos = state.todos.filter(
            (t) => !reorderedTodos.find((rt: Todo) => rt.id === t.id)
          );
          return { todos: [...otherTodos, ...reorderedTodos] };
        }),

      attachFileToTodo: (id, filePath) =>
        set((state) => ({
          todos: state.todos.map((t) =>
            t.id === id ? { ...t, attachment: filePath } : t,
          ),
        })),

      removeAttachmentFromTodo: (id) =>
        set((state) => ({
          todos: state.todos.map((t) =>
            t.id === id ? { ...t, attachment: undefined } : t,
          ),
        })),

      toggleSubtasksCollapse: (id) =>
        set((state) => ({
          todos: state.todos.map((t) =>
            t.id === id ? { ...t, isCollapsed: !t.isCollapsed } : t,
          ),
        })),

      updateTodoQuadrant: (id, quadrant) =>
        set((state) => ({
          todos: state.todos.map((t) =>
            t.id === id ? { ...t, eisenhowerQuadrant: quadrant } : t,
          ),
        })),

      updateTodoTime: (id, startTime, endTime) =>
        set((state) => ({
          todos: state.todos.map((t) =>
            t.id === id ? { ...t, startTime, endTime } : t,
          ),
        })),

      // Bookmark actions
      addBookmarkCategory: (name) =>
        set((state) => {
          const newCategory = { id: uuidv4(), name, createdAt: Date.now() };
          return {
            bookmarkCategories: [...state.bookmarkCategories, newCategory],
            activeBookmarkCategoryId: newCategory.id,
          };
        }),

      removeBookmarkCategory: (id) =>
        set((state) => ({
          bookmarkCategories: state.bookmarkCategories.filter((c) => c.id !== id),
          bookmarkFolders: state.bookmarkFolders.filter((f) => f.categoryId !== id),
          bookmarks: state.bookmarks.filter((b) => b.categoryId !== id),
          activeBookmarkCategoryId:
            state.activeBookmarkCategoryId === id
              ? state.bookmarkCategories.find((c) => c.id !== id)?.id || null
              : state.activeBookmarkCategoryId,
          activeBookmarkFolderId:
            state.activeBookmarkCategoryId === id ? null : state.activeBookmarkFolderId,
        })),

      setActiveBookmarkCategory: (id) => set({ activeBookmarkCategoryId: id }),

      addBookmarkFolder: (name, categoryId) =>
        set((state) => {
          if (!categoryId) categoryId = state.activeBookmarkCategoryId;
          if (!categoryId) return state;

          const newFolder: BookmarkFolder = {
            id: uuidv4(),
            categoryId,
            name,
            createdAt: Date.now(),
            isExpanded: true,
          };
          return {
            bookmarkFolders: [...state.bookmarkFolders, newFolder],
          };
        }),

      removeBookmarkFolder: (id) =>
        set((state) => ({
          bookmarkFolders: state.bookmarkFolders.filter((f) => f.id !== id),
          bookmarks: state.bookmarks.map((b) =>
            b.folderId === id ? { ...b, folderId: undefined } : b,
          ),
          activeBookmarkFolderId: state.activeBookmarkFolderId === id ? null : state.activeBookmarkFolderId,
        })),

      setActiveBookmarkFolder: (id) => set({ activeBookmarkFolderId: id }),

      addBookmark: (categoryId, text, folderId) =>
        set((state) => ({
          bookmarks: [
            ...state.bookmarks,
            {
              id: uuidv4(),
              categoryId,
              text,
              folderId,
              createdAt: Date.now(),
            },
          ],
        })),

      removeBookmark: (id) =>
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.id !== id),
        })),

      moveBookmarkToFolder: (bookmarkId, folderId) =>
        set((state) => ({
          bookmarks: state.bookmarks.map((b) =>
            b.id === bookmarkId ? { ...b, folderId: folderId || undefined } : b,
          ),
        })),

      // Notes actions
      addNoteCategory: (name) =>
        set((state) => {
          const newCategory: Category = { id: uuidv4(), name, createdAt: Date.now() };
          return {
            noteCategories: [...state.noteCategories, newCategory],
            activeNoteCategoryId: newCategory.id,
          };
        }),

      removeNoteCategory: (id) =>
        set((state) => ({
          noteCategories: state.noteCategories.filter((c) => c.id !== id),
          notes: state.notes.filter((n) => n.categoryId !== id),
          activeNoteCategoryId:
            state.activeNoteCategoryId === id
              ? state.noteCategories.find((c) => c.id !== id)?.id || null
              : state.activeNoteCategoryId,
          activeNoteId:
            state.notes.find((n) => n.id === state.activeNoteId)?.categoryId === id
              ? null
              : state.activeNoteId,
        })),

      setActiveNoteCategory: (id) => set({ activeNoteCategoryId: id }),

      addNote: (categoryId, title) =>
        set((state) => {
          const newNote: Note = {
            id: uuidv4(),
            categoryId,
            title,
            content: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          return {
            notes: [...state.notes, newNote],
            activeNoteId: newNote.id,
          };
        }),

      updateNote: (id, title, content) =>
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === id ? { ...n, title, content, updatedAt: Date.now() } : n,
          ),
        })),

      removeNote: (id) =>
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id),
          activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
        })),

      setActiveNote: (id) => set({ activeNoteId: id }),

      // Search & Filtering actions
      setSearchQuery: (query) => set({ searchQuery: query }),

      performSearch: (query) =>
        set((state) => {
          const lowerQuery = query.toLowerCase();

          if (!query.trim()) {
            return { searchResults: [] };
          }

          // Search todos
          const todoResults: SearchResult[] = state.todos
            .filter((t) => t.text.toLowerCase().includes(lowerQuery))
            .slice(0, 20)
            .map((t) => ({
              type: 'todo' as const,
              id: t.id,
              title: t.text,
              preview: state.categories.find((c) => c.id === t.categoryId)?.name || 'Uncategorized',
              categoryName: state.categories.find((c) => c.id === t.categoryId)?.name || '',
              dateContext: t.date,
            }));

          // Search bookmarks
          const bookmarkResults: SearchResult[] = state.bookmarks
            .filter((b) => b.text.toLowerCase().includes(lowerQuery) || b.url?.toLowerCase().includes(lowerQuery))
            .slice(0, 20)
            .map((b) => ({
              type: 'bookmark' as const,
              id: b.id,
              title: b.text,
              preview: b.url || '',
              categoryName: state.bookmarkCategories.find((c) => c.id === b.categoryId)?.name || '',
            }));

          // Search notes
          const noteResults: SearchResult[] = state.notes
            .filter((n) => n.title.toLowerCase().includes(lowerQuery) || n.content.toLowerCase().includes(lowerQuery))
            .slice(0, 20)
            .map((n) => ({
              type: 'note' as const,
              id: n.id,
              title: n.title,
              preview: n.content.slice(0, 100),
              categoryName: state.noteCategories.find((c) => c.id === n.categoryId)?.name || '',
            }));

          return {
            searchResults: [...todoResults, ...bookmarkResults, ...noteResults],
          };
        }),

      setSearchOpen: (isOpen) => set({ isSearchOpen: isOpen }),

      setHashtagFilter: (tag) => set({ activeHashtagFilter: tag }),
    }),
    {
      name: "supertodo-storage",
      version: 1,
      // Deep merge persisted state with current defaults so new fields
      // don't cause existing data to be overwritten with initial values
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AppState> | undefined;
        if (!persisted) return currentState;

        // Deep merge: for each key, if the persisted value exists, use it;
        // otherwise keep the current (default) value.
        // For nested objects like 'settings', merge one level deeper.
        const merged = { ...currentState };
        for (const key of Object.keys(persisted) as (keyof AppState)[]) {
          if (persisted[key] !== undefined) {
            if (key === 'settings' && typeof persisted[key] === 'object' && typeof currentState[key] === 'object') {
              // Merge settings so new setting keys get their defaults
              (merged as any)[key] = { ...currentState[key], ...persisted[key] };
            } else {
              (merged as any)[key] = persisted[key];
            }
          }
        }
        return merged;
      },
      // Migrate from version 0 (no version) to version 1
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // v0 -> v1: ensure all new collection fields exist
          return {
            ...persistedState,
            challenges: persistedState.challenges ?? [],
            yearlyGoals: persistedState.yearlyGoals ?? [],
            jobApplications: persistedState.jobApplications ?? [],
            bookmarkFolders: persistedState.bookmarkFolders ?? [],
            noteCategories: persistedState.noteCategories ?? [
              { id: "note_default", name: "General", createdAt: Date.now() },
            ],
            settings: {
              pomodoroDuration: 25,
              pomodoroBreakDuration: 5,
              accentColor: '#2add84',
              autoStartEnabled: false,
              zenModeAmbientSound: 'none',
              defaultView: 'todos',
              theme: 'dark',
              userName: 'User',
              ...(persistedState.settings ?? {}),
            },
          };
        }
        return persistedState as AppState;
      },
      // Don't persist transient UI state — only persist actual data
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { searchQuery, searchResults, isSearchOpen, isZenMode, zenModeTaskId, ...persisted } = state;
        return persisted;
      },
      // Custom storage wrapper with error handling to prevent silent data loss
      storage: {
        getItem: (name) => {
          try {
            const str = localStorage.getItem(name);
            if (!str) return null;
            return JSON.parse(str);
          } catch (e) {
            console.error('[SuperTodo] Failed to read persisted state:', e);
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(name, serialized);
          } catch (e) {
            console.error('[SuperTodo] Failed to persist state (storage may be full):', e);
            // If QuotaExceededError, try to notify the user
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
              console.warn('[SuperTodo] localStorage is full! Data may not be saved. Consider clearing old data.');
            }
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch (e) {
            console.error('[SuperTodo] Failed to remove persisted state:', e);
          }
        },
      },
    },
  ),
);
