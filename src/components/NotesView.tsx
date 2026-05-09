import { Trash, Notebook, FileText, PencilSimple, Eye } from '@phosphor-icons/react';
import { useStore } from '../store';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function NotesView() {
  const notes = useStore((state) => state.notes);
  const activeNoteCategoryId = useStore((state) => state.activeNoteCategoryId);
  const activeNoteId = useStore((state) => state.activeNoteId);

  const updateNote = useStore((state) => state.updateNote);
  const removeNote = useStore((state) => state.removeNote);
  const setActiveNote = useStore((state) => state.setActiveNote);

  const [showPreview, setShowPreview] = useState(false);

  const activeNote = notes.find((n) => n.id === activeNoteId);
  const filteredNotes = notes.filter((n) => n.categoryId === activeNoteCategoryId);



  return (
    <div className="notes-split-view">
      {/* Left Sidebar: Categories and Notes List */}
      <div className="notes-list">
        {/* Notes List */}
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
              <p>Click "create ⚡" to start writing</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Side: Editor */}
      <div className="notes-editor">
        {activeNote ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              <input
                type="text"
                className="notes-title-input"
                placeholder="Note title..."
                value={activeNote.title}
                onChange={(e) => updateNote(activeNote.id, e.target.value, activeNote.content)}
                style={{ flex: 1, marginRight: 16 }}
              />

              <div className="mode-toggle-wrapper">
                <button
                  className={`mode-btn ${!showPreview ? 'active' : ''}`}
                  onClick={() => setShowPreview(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <PencilSimple size={16} /> Edit
                </button>
                <button
                  className={`mode-btn ${showPreview ? 'active' : ''}`}
                  onClick={() => setShowPreview(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Eye size={16} /> Preview
                </button>
              </div>
            </div>

            {!showPreview ? (
              <textarea
                className="notes-content-textarea"
                placeholder="Write your brilliant thoughts in markdown...

**Bold ideas**, *italic emphasis*, `inline code`
- Bulleted lists
- [Helpful Links](https://example.com)
> Inspiring quotes
"
                value={activeNote.content}
                onChange={(e) => updateNote(activeNote.id, activeNote.title, e.target.value)}
              />
            ) : (
              <div
                className="notes-content-textarea markdown-preview"
                style={{
                  overflow: 'auto',
                  border: '1px solid transparent', // remove border in preview for a cleaner reading experience
                  background: 'transparent'
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeNote.content || '*No content yet*'}</ReactMarkdown>
              </div>
            )}
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
