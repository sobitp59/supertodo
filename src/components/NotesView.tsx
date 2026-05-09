import { Trash, Notebook, FileText, TextB, TextItalic, Code, ListBullets, Link, Quotes, TextStrikethrough, MagnifyingGlass, X, Check } from '@phosphor-icons/react';
import { useStore } from '../store';
import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Formatting helpers
function wrapSelection(textarea: HTMLTextAreaElement, before: string, after: string) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.substring(start, end);
  const replacement = before + (selected || 'text') + after;
  const newValue = text.substring(0, start) + replacement + text.substring(end);
  return { newValue, cursorStart: start + before.length, cursorEnd: start + before.length + (selected || 'text').length };
}

function insertAtCursor(textarea: HTMLTextAreaElement, insertion: string) {
  const start = textarea.selectionStart;
  const text = textarea.value;
  const newValue = text.substring(0, start) + insertion + text.substring(start);
  return { newValue, cursor: start + insertion.length };
}

export function NotesView() {
  const notes = useStore((state) => state.notes);
  const activeNoteCategoryId = useStore((state) => state.activeNoteCategoryId);
  const activeNoteId = useStore((state) => state.activeNoteId);

  const updateNote = useStore((state) => state.updateNote);
  const removeNote = useStore((state) => state.removeNote);
  const setActiveNote = useStore((state) => state.setActiveNote);

  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [matchCount, setMatchCount] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeNote = notes.find((n) => n.id === activeNoteId);
  const filteredNotes = notes.filter((n) => n.categoryId === activeNoteCategoryId);

  // Show save indicator when content changes
  const handleContentChange = useCallback((newContent: string) => {
    if (!activeNote) return;
    updateNote(activeNote.id, activeNote.title, newContent);

    // Debounce save indicator
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setSavedAt(Date.now());
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2500);
    }, 600);
  }, [activeNote, updateNote]);

  const handleTitleChange = useCallback((newTitle: string) => {
    if (!activeNote) return;
    updateNote(activeNote.id, newTitle, activeNote.content);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setSavedAt(Date.now());
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2500);
    }, 600);
  }, [activeNote, updateNote]);

  // Toolbar actions
  const applyFormat = useCallback((format: string) => {
    const ta = textareaRef.current;
    if (!ta || !activeNote) return;

    let result: { newValue: string; cursorStart?: number; cursorEnd?: number; cursor?: number };

    switch (format) {
      case 'bold':
        result = wrapSelection(ta, '**', '**');
        break;
      case 'italic':
        result = wrapSelection(ta, '*', '*');
        break;
      case 'strikethrough':
        result = wrapSelection(ta, '~~', '~~');
        break;
      case 'code':
        result = wrapSelection(ta, '`', '`');
        break;
      case 'link':
        result = wrapSelection(ta, '[', '](url)');
        break;
      case 'bullet':
        result = insertAtCursor(ta, '\n- ');
        break;
      case 'quote':
        result = insertAtCursor(ta, '\n> ');
        break;
      case 'heading':
        result = insertAtCursor(ta, '\n## ');
        break;
      default:
        return;
    }

    updateNote(activeNote.id, activeNote.title, result.newValue);

    // Restore cursor
    setTimeout(() => {
      ta.focus();
      if ('cursorStart' in result && result.cursorStart !== undefined && result.cursorEnd !== undefined) {
        ta.setSelectionRange(result.cursorStart, result.cursorEnd);
      } else if ('cursor' in result && result.cursor !== undefined) {
        ta.setSelectionRange(result.cursor, result.cursor);
      }
    }, 0);
  }, [activeNote, updateNote]);

  // Keyboard shortcuts in textarea
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          applyFormat('bold');
          break;
        case 'i':
          e.preventDefault();
          applyFormat('italic');
          break;
        case 'k':
          e.preventDefault();
          applyFormat('link');
          break;
        case 'f':
          e.preventDefault();
          setSearchOpen(true);
          setTimeout(() => searchInputRef.current?.focus(), 50);
          break;
      }
    }
    // Tab to insert spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const newValue = ta.value.substring(0, start) + '  ' + ta.value.substring(ta.selectionEnd);
      if (activeNote) {
        updateNote(activeNote.id, activeNote.title, newValue);
        setTimeout(() => ta.setSelectionRange(start + 2, start + 2), 0);
      }
    }
  }, [applyFormat, activeNote, updateNote]);

  // Search match count
  useEffect(() => {
    if (!searchTerm || !activeNote) {
      setMatchCount(0);
      return;
    }
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = activeNote.content.match(regex);
    setMatchCount(matches ? matches.length : 0);
  }, [searchTerm, activeNote]);

  // Close search on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        setSearchTerm('');
        textareaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [searchOpen]);

  // Format saved timestamp
  const savedLabel = savedAt ? `saved ${new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';

  return (
    <div className="notes-split-view">
      {/* Left Sidebar: Notes List */}
      <div className="notes-list">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className={`note-list-item ${note.id === activeNoteId ? 'active' : ''}`}
              onClick={() => setActiveNote(note.id)}
            >
              <FileText size={20} color={note.id === activeNoteId ? 'var(--accent)' : 'var(--text-secondary)'} weight={note.id === activeNoteId ? 'fill' : 'regular'} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: note.id === activeNoteId ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: note.id === activeNoteId ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {note.title || 'Untitled Note'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4, opacity: 0.7 }}>
                  {new Date(note.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                className="icon-btn delete"
                onClick={(e) => {
                  e.stopPropagation();
                  removeNote(note.id);
                }}
                style={{ opacity: note.id === activeNoteId ? 1 : 0.4 }}
              >
                <Trash size={16} />
              </button>
            </div>
          ))}

          {filteredNotes.length === 0 && (
            <div className="empty-state" style={{ marginTop: 60 }}>
              <Notebook size={48} weight="duotone" color="var(--border)" style={{ marginBottom: 16 }} />
              <div className="empty-state-title">No Notes Here</div>
              <p>Click "create" to start writing</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Side: Editor + Live Preview */}
      <div className="notes-editor">
        {activeNote ? (
          <>
            {/* Title + Save Indicator */}
            <div className="notes-editor-header">
              <input
                type="text"
                className="notes-title-input"
                placeholder="Note title..."
                value={activeNote.title}
                onChange={(e) => handleTitleChange(e.target.value)}
              />
              <div className={`notes-saved-indicator ${showSaved ? 'visible' : ''}`}>
                <Check size={12} weight="bold" />
                <span>{savedLabel}</span>
              </div>
            </div>

            {/* Formatting Toolbar */}
            <div className="notes-toolbar">
              <button className="notes-toolbar-btn" onClick={() => applyFormat('bold')} title="Bold (Ctrl+B)">
                <TextB size={16} weight="bold" />
              </button>
              <button className="notes-toolbar-btn" onClick={() => applyFormat('italic')} title="Italic (Ctrl+I)">
                <TextItalic size={16} />
              </button>
              <button className="notes-toolbar-btn" onClick={() => applyFormat('strikethrough')} title="Strikethrough">
                <TextStrikethrough size={16} />
              </button>
              <div className="notes-toolbar-separator" />
              <button className="notes-toolbar-btn" onClick={() => applyFormat('heading')} title="Heading">
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>H2</span>
              </button>
              <button className="notes-toolbar-btn" onClick={() => applyFormat('bullet')} title="Bullet List">
                <ListBullets size={16} />
              </button>
              <button className="notes-toolbar-btn" onClick={() => applyFormat('quote')} title="Quote">
                <Quotes size={16} />
              </button>
              <div className="notes-toolbar-separator" />
              <button className="notes-toolbar-btn" onClick={() => applyFormat('code')} title="Inline Code">
                <Code size={16} />
              </button>
              <button className="notes-toolbar-btn" onClick={() => applyFormat('link')} title="Link (Ctrl+K)">
                <Link size={16} />
              </button>
              <div style={{ flex: 1 }} />
              <button
                className={`notes-toolbar-btn ${searchOpen ? 'active' : ''}`}
                onClick={() => {
                  setSearchOpen(!searchOpen);
                  if (!searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
                  else { setSearchTerm(''); }
                }}
                title="Search in note (Ctrl+F)"
              >
                <MagnifyingGlass size={16} />
              </button>
            </div>

            {/* In-note Search Bar */}
            {searchOpen && (
              <div className="notes-search-bar">
                <MagnifyingGlass size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="notes-search-input"
                  placeholder="Search in note..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearchOpen(false);
                      setSearchTerm('');
                      textareaRef.current?.focus();
                    }
                  }}
                />
                {searchTerm && (
                  <span className="notes-search-count">
                    {matchCount} {matchCount === 1 ? 'match' : 'matches'}
                  </span>
                )}
                <button
                  className="icon-btn"
                  onClick={() => { setSearchOpen(false); setSearchTerm(''); }}
                  style={{ padding: 4 }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Side-by-side Editor + Preview */}
            <div className="notes-split-editor">
              {/* Edit pane */}
              <div className="notes-edit-pane">
                <textarea
                  ref={textareaRef}
                  className="notes-content-textarea"
                  placeholder="Write in markdown...

**Bold**, *italic*, `code`
- Lists
> Quotes
[Links](https://example.com)"
                  value={activeNote.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>

              {/* Preview pane */}
              <div className="notes-preview-pane">
                <div className="markdown-preview">
                  {searchTerm ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Use dangerouslySetInnerHTML for highlighted content is not ideal,
                        // so we render without highlight in markdown and show highlight via CSS
                        text: ({ children }) => <>{children}</>,
                      }}
                    >
                      {activeNote.content || '*No content yet*'}
                    </ReactMarkdown>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {activeNote.content || '*No content yet*'}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state" style={{ marginTop: 120 }}>
            <Notebook size={64} weight="thin" color="var(--border)" style={{ marginBottom: 24 }} />
            <div className="empty-state-title">Select or Create a Note</div>
            <p style={{ maxWidth: 300, margin: '0 auto', lineHeight: 1.5 }}>
              Choose a note from the list on the left or create a new one to jot down your thoughts.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
