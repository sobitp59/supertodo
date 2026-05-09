import { MagnifyingGlass as Search, Calendar, BookmarkSimple as Bookmark, FileText } from '@phosphor-icons/react';
import { useStore } from '../store';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OmnibarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Omnibar({ isOpen, onClose }: OmnibarProps) {
  const searchQuery = useStore((state) => state.searchQuery);
  const searchResults = useStore((state) => state.searchResults);
  const setSearchQuery = useStore((state) => state.setSearchQuery);
  const performSearch = useStore((state) => state.performSearch);
  const setAppMode = useStore((state) => state.setAppMode);
  const setActiveNote = useStore((state) => state.setActiveNote);

  const [selectedIndex, setSelectedIndex] = useState(0);

  // Debounced search
  const debouncedSearch = useMemo(
    () => {
      let timeoutId: ReturnType<typeof setTimeout>;
      return (query: string) => {
        clearTimeout(timeoutId);
        setSearchQuery(query);
        timeoutId = setTimeout(() => {
          performSearch(query);
        }, 300);
      };
    },
    [performSearch, setSearchQuery],
  );

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      performSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen, setSearchQuery, performSearch]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && searchResults[selectedIndex]) {
      e.preventDefault();
      selectResult(searchResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const selectResult = (result: typeof searchResults[0]) => {
    // Navigate to the item
    if (result.type === 'todo') {
      setAppMode('todos');
      // TODO: Navigate to the specific date
    } else if (result.type === 'bookmark') {
      setAppMode('bookmarks');
    } else if (result.type === 'note') {
      setAppMode('notes');
      setActiveNote(result.id);
    }
    onClose();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'todo':
        return <Calendar size={16} style={{ color: 'var(--accent)' }} />;
      case 'bookmark':
        return <Bookmark size={16} style={{ color: 'var(--accent)' }} />;
      case 'note':
        return <FileText size={16} style={{ color: 'var(--accent)' }} />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="omnibar-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="omnibar-content"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <Search size={20} style={{ color: 'var(--text-secondary)', marginRight: 12 }} />
            <input
              className="omnibar-input"
              placeholder="Search todos, bookmarks, notes..."
              value={searchQuery}
              onChange={(e) => debouncedSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              style={{ padding: 0, border: 'none', borderBottom: 'none' }}
            />
          </div>

          {/* Results */}
          <div className="omnibar-results">
            {searchResults.length === 0 && searchQuery.trim() !== '' && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                No results found for "{searchQuery}"
              </div>
            )}

            {searchResults.length === 0 && searchQuery.trim() === '' && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div style={{ marginBottom: 8 }}>Type to search across all your content</div>
                <div style={{ fontSize: '0.85rem' }}>
                  <kbd className="kbd">↑</kbd> <kbd className="kbd">↓</kbd> to navigate
                  <span style={{ margin: '0 8px' }}>·</span>
                  <kbd className="kbd">Enter</kbd> to select
                  <span style={{ margin: '0 8px' }}>·</span>
                  <kbd className="kbd">Esc</kbd> to close
                </div>
              </div>
            )}

            {searchResults.map((result, idx) => (
              <div
                key={`${result.type}-${result.id}`}
                className={`omnibar-result-item ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={() => selectResult(result)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {getIcon(result.type)}
                  <div style={{ flex: 1 }}>
                    <div className="omnibar-result-title">{result.title}</div>
                    <div className="omnibar-result-meta">
                      {result.categoryName}
                      {result.dateContext && <> · {result.dateContext}</>}
                      {result.preview && result.type !== 'todo' && (
                        <div style={{ marginTop: 4, fontSize: '0.8rem' }}>{result.preview.slice(0, 60)}...</div>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    {result.type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
