import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useStore } from '../../store';

export function CategoryTabs() {
  const {
    appMode,
    categories,
    bookmarkCategories,
    bookmarks,
    todos,
    activeCategoryId,
    activeBookmarkCategoryId,
    setActiveCategory,
    setActiveBookmarkCategory,
    addCategory,
    removeCategory,
    addBookmarkCategory,
    removeBookmarkCategory,
  } = useStore();

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  return (
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
  );
}
