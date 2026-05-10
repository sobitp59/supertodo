# SuperTodo

A beautifully crafted, keyboard-first productivity desktop app built with **Tauri 2**, **React 19**, and **TypeScript**. SuperTodo combines task management, time planning, bookmarks, notes, job tracking, and more into a single focused workspace.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Tauri](https://img.shields.io/badge/Tauri-2.x-orange)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- **Task Management** — Create, organize, and complete todos with categories, subtasks, drag-and-drop reordering, and priority levels
- **Time Canvas** — Visual day planner with a calendar grid, drag-to-schedule, Eisenhower Matrix, and routine analytics
- **Bookmarks** — Save and organize links with automatic metadata fetching
- **Notes** — Markdown-powered notes with rich editing
- **Job Tracker** — Kanban-style board to track job applications across stages
- **Challenges** — Set and track personal challenges and yearly goals
- **Pomodoro Timer** — Built-in focus timer with session tracking
- **Zen Mode** — Distraction-free fullscreen focus mode
- **Omnibar** — Quick-capture and command palette (`Alt + Space`)
- **Global Shortcuts** — System-wide hotkeys for quick capture
- **Confetti Celebrations** — Fun animations when you complete tasks
- **Dark Theme** — Beautiful dark UI with customizable accent colors

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Runtime | [Tauri 2](https://v2.tauri.app/) (Rust backend) |
| Frontend | [React 19](https://react.dev/) + [TypeScript 5.8](https://www.typescriptlang.org/) |
| Build Tool | [Vite 7](https://vite.dev/) |
| State Management | [Zustand](https://zustand.docs.pmnd.rs/) |
| Animations | [Framer Motion 12](https://www.framer.com/motion/) |
| Icons | [Phosphor Icons](https://phosphoricons.com/) |
| Drag & Drop | [dnd-kit](https://dndkit.com/) |
| Date Utilities | [date-fns](https://date-fns.org/) |
| Notifications | [Sonner](https://sonner.emilkowal.ski/) |
| Markdown | [react-markdown](https://github.com/remarkjs/react-markdown) + remark-gfm |

---

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** >= 18.x
- **npm** >= 9.x (or pnpm)
- **Rust** >= 1.70 ([Install Rust](https://rustup.rs/))
- **Tauri CLI** prerequisites for your OS:
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Linux**: `libwebkit2gtk-4.1-dev`, `build-essential`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev` ([Full list](https://v2.tauri.app/start/prerequisites/#linux))
  - **Windows**: Microsoft Visual Studio C++ Build Tools, WebView2 ([Full list](https://v2.tauri.app/start/prerequisites/#windows))

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/sobitp59/supertodo.git
cd supertodo
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run in development mode

```bash
npm run tauri dev
```

This starts both the Vite dev server (hot reload) and the Tauri desktop window.

### 4. Build for production

```bash
npm run tauri build
```

The compiled binary will be in `src-tauri/target/release/`.

---

## Project Structure

```
supertodo/
├── src/                        # Frontend (React + TypeScript)
│   ├── components/
│   │   ├── bookmarks/          # Bookmark list view
│   │   ├── layout/             # App header, category tabs, mode bar
│   │   ├── shared/             # Reusable components (empty states, progress ring, pomodoro)
│   │   ├── time-canvas/        # Calendar grid, Eisenhower matrix, planner analytics
│   │   ├── todos/              # Todo item and list views
│   │   ├── ChallengesView.tsx  # Personal challenges tracker
│   │   ├── JobTrackerView.tsx  # Job application kanban board
│   │   ├── NotesView.tsx       # Markdown notes
│   │   ├── Omnibar.tsx         # Quick-capture command palette
│   │   ├── SettingsModal.tsx   # App settings
│   │   ├── YearlyGoalsView.tsx # Yearly goals tracker
│   │   └── ZenMode.tsx         # Distraction-free mode
│   ├── hooks/                  # Custom React hooks
│   │   ├── useConfetti.ts      # Confetti celebration effect
│   │   ├── useGlobalShortcuts.ts
│   │   ├── usePomodoro.ts      # Pomodoro timer logic
│   │   ├── useReminders.ts     # Notification reminders
│   │   └── useWindowControls.ts
│   ├── utils/
│   │   └── dateHelpers.ts      # Date utility functions
│   ├── store.ts                # Zustand global state
│   ├── App.tsx                 # Root component
│   ├── App.css                 # Global styles
│   └── main.tsx                # Entry point
├── src-tauri/                  # Backend (Rust + Tauri)
│   ├── src/                    # Rust source code
│   ├── capabilities/           # Tauri permission capabilities
│   ├── icons/                  # App icons (all platforms)
│   ├── Cargo.toml              # Rust dependencies
│   └── tauri.conf.json         # Tauri configuration
├── public/                     # Static assets
├── index.html                  # HTML entry point
├── package.json                # Node dependencies & scripts
├── tsconfig.json               # TypeScript configuration
└── vite.config.ts              # Vite configuration
```

---

## Contributing

We welcome contributions from everyone! Here's how to get started:

### Finding Issues

- Check the [Issues](https://github.com/sobitp59/supertodo/issues) tab for open bugs and feature requests
- Look for issues labeled `good first issue` or `help wanted`
- If you want to work on something new, open an issue first to discuss it

### Development Workflow

1. **Fork** the repository
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/supertodo.git
   cd supertodo
   ```
3. **Create a branch** for your feature/fix:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```
4. **Install dependencies** and start developing:
   ```bash
   npm install
   npm run tauri dev
   ```
5. **Make your changes** — write clean, typed code
6. **Verify the build passes**:
   ```bash
   npm run build
   ```
7. **Commit** with a descriptive message:
   ```bash
   git commit -m "feat: add dark mode toggle to settings"
   ```
8. **Push** and open a **Pull Request** against `main`

### Branch Naming Convention

| Type | Format | Example |
|------|--------|---------|
| Feature | `feat/description` | `feat/add-calendar-export` |
| Bug Fix | `fix/description` | `fix/todo-drag-not-saving` |
| Refactor | `refactor/description` | `refactor/extract-date-utils` |
| Docs | `docs/description` | `docs/update-readme` |

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: resolve a bug
docs: update documentation
style: formatting, missing semicolons (no code change)
refactor: restructure code without changing behavior
perf: performance improvement
chore: build process, dependency updates
```

### Code Guidelines

- **TypeScript** — All code must be fully typed. No `any` unless absolutely necessary.
- **Components** — Use functional components with hooks.
- **State** — Use the Zustand store (`src/store.ts`) for global state. Local state with `useState` for UI-only concerns.
- **Styling** — CSS is in `App.css`. Use CSS variables for theming.
- **Icons** — Use [Phosphor Icons](https://phosphoricons.com/) (`@phosphor-icons/react`).
- **Animations** — Use Framer Motion for transitions and animations.
- **No unused imports** — The build will fail on unused variables/imports.
- **Formatting** — Keep code consistent with the existing style.

### Areas Where Help is Needed

- Accessibility improvements (keyboard navigation, screen reader support)
- Performance optimizations for large todo lists
- New Tauri plugins integration
- Cross-platform testing (Windows, Linux, macOS)
- UI/UX improvements and new themes
- Internationalization (i18n) support
- Unit and integration tests
- Documentation improvements

---

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (frontend only) |
| `npm run build` | TypeScript check + Vite production build |
| `npm run preview` | Preview the production build locally |
| `npm run tauri dev` | Start full Tauri development environment |
| `npm run tauri build` | Build production desktop binary |

---

## Troubleshooting

### Build fails with TypeScript errors
```bash
npx tsc --noEmit
```
This shows all type errors. Fix them before building.

### Tauri dev fails to start
Make sure Rust and all platform prerequisites are installed. Run:
```bash
rustup update
```

### Vite dev server port conflict
The dev server runs on port `1420` by default. If it's occupied, update `vite.config.ts` and `src-tauri/tauri.conf.json` to match.

---

## License

This project is open source. See the repository for license details.

---

## Acknowledgments

Built with love using amazing open-source tools: Tauri, React, Vite, Zustand, Framer Motion, Phosphor Icons, dnd-kit, date-fns, and more.

---

**Happy contributing!** If you have questions, feel free to open an issue or start a discussion.
