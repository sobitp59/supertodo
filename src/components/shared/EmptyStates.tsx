import { Sparkle, BookmarkSimple, CheckCircle } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const floatVariants = {
  animate: {
    y: [0, -4, 0],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
};

export function EmptyTodosState() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="empty-state"
      style={{ marginTop: 100 }}
    >
      <motion.div variants={floatVariants} animate="animate">
        <Sparkle size={64} weight="duotone" color="var(--border)" style={{ marginBottom: 24 }} />
      </motion.div>
      <motion.div variants={itemVariants} className="empty-state-title">A fresh day.</motion.div>
      <motion.p variants={itemVariants}>You have no tasks pending.</motion.p>
      
      <motion.div variants={itemVariants} className="shortcut-hint">
        Hit <span className="kbd">Alt + Space</span> to quick-capture anywhere
      </motion.div>
    </motion.div>
  );
}

export function EmptyBookmarksState() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="empty-state"
      style={{ marginTop: 100 }}
    >
      <motion.div variants={floatVariants} animate="animate">
        <BookmarkSimple size={64} weight="duotone" color="var(--border)" style={{ marginBottom: 24 }} />
      </motion.div>
      <motion.div variants={itemVariants} className="empty-state-title">No Bookmarks</motion.div>
      <motion.p variants={itemVariants}>Save interesting links here.</motion.p>
      
      <motion.div variants={itemVariants} className="shortcut-hint">
        Click <span className="kbd">create</span> to paste a new URL.
      </motion.div>
    </motion.div>
  );
}

export function AllDoneState() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="empty-state"
      style={{ marginTop: 100 }}
    >
      <motion.div variants={floatVariants} animate="animate">
        <CheckCircle size={64} weight="duotone" color="var(--accent)" style={{ marginBottom: 24, boxShadow: '0 0 30px rgba(var(--accent-rgb), 0.2)', borderRadius: '50%' }} />
      </motion.div>
      <motion.div variants={itemVariants} className="empty-state-title" style={{ color: 'var(--accent)' }}>Masterpiece!</motion.div>
      <motion.p variants={itemVariants}>All tasks completed for today.</motion.p>
    </motion.div>
  );
}
