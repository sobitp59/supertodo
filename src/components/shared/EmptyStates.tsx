import { Sparkle, BookmarkSimple, CheckCircle } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

export function EmptyTodosState() {
  return (
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
  );
}

export function EmptyBookmarksState() {
  return (
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
  );
}

export function AllDoneState() {
  return (
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
  );
}
