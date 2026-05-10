import { useState } from 'react';
import { X, Plus, Folder } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import urlRegex from 'url-regex';
import { toast } from 'sonner';
import { useStore, type Bookmark } from '../../store';
import { NativeLinkPreview } from '../shared/NativeLinkPreview';
import type { ContextMenuItem } from '../ContextMenu';
import { Trash as Trash2 } from '@phosphor-icons/react';

interface BookmarkListViewProps {
  activeBookmarks: Bookmark[];
  setContextMenu: (menu: { x: number; y: number; items: ContextMenuItem[] } | null) => void;
}

export function BookmarkListView({ activeBookmarks, setContextMenu }: BookmarkListViewProps) {
  const {
    activeBookmarkCategoryId,
    activeBookmarkFolderId,
    bookmarkFolders,
    setActiveBookmarkFolder,
    addBookmarkFolder,
    removeBookmarkFolder,
    removeBookmark,
    setHashtagFilter,
  } = useStore();

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  return (
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
                <div key={folder.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
  );
}
