import { useState } from 'react';
import { useStore } from '../store';
import type { YearlyGoal } from '../store';
import { Plus, Trash, CaretLeft, CaretRight, Check, Target, TrendUp, Heart, Brain, CurrencyDollar, User } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES: { value: YearlyGoal['category']; label: string; icon: typeof Target }[] = [
  { value: 'career', label: 'career', icon: TrendUp },
  { value: 'health', label: 'health', icon: Heart },
  { value: 'finance', label: 'finance', icon: CurrencyDollar },
  { value: 'learning', label: 'learning', icon: Brain },
  { value: 'personal', label: 'personal', icon: User },
  { value: 'other', label: 'other', icon: Target },
];

const CATEGORY_COLORS: Record<YearlyGoal['category'], string> = {
  career: '#4ecdc4',
  health: '#ff6b6b',
  finance: '#ffd93d',
  learning: '#6c5ce7',
  personal: '#a29bfe',
  other: '#636e72',
};

export function YearlyGoalsView() {
  const yearlyGoals = useStore((state) => state.yearlyGoals);
  const activeGoalYear = useStore((state) => state.activeGoalYear);
  const addYearlyGoal = useStore((state) => state.addYearlyGoal);
  const updateYearlyGoal = useStore((state) => state.updateYearlyGoal);
  const removeYearlyGoal = useStore((state) => state.removeYearlyGoal);
  const addMilestone = useStore((state) => state.addMilestone);
  const toggleMilestone = useStore((state) => state.toggleMilestone);
  const removeMilestone = useStore((state) => state.removeMilestone);
  const setActiveGoalYear = useStore((state) => state.setActiveGoalYear);

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<YearlyGoal['category']>('personal');
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [newMilestoneText, setNewMilestoneText] = useState('');
  const [editingDescId, setEditingDescId] = useState<string | null>(null);

  const goalsForYear = yearlyGoals.filter((g) => g.year === activeGoalYear);

  const overallProgress = goalsForYear.length > 0
    ? Math.round(goalsForYear.reduce((sum, g) => sum + g.progress, 0) / goalsForYear.length)
    : 0;

  const handleCreate = () => {
    if (newTitle.trim()) {
      addYearlyGoal(newTitle.trim(), newCategory, activeGoalYear);
      setNewTitle('');
      setIsCreating(false);
    }
  };

  const getCategoryIcon = (cat: YearlyGoal['category']) => {
    const found = CATEGORIES.find((c) => c.value === cat);
    if (!found) return null;
    const Icon = found.icon;
    return <Icon size={16} weight="bold" style={{ color: CATEGORY_COLORS[cat] }} />;
  };

  return (
    <div className="goals-view">
      {/* Year Navigation */}
      <div className="goals-year-nav">
        <button className="icon-btn" onClick={() => setActiveGoalYear(activeGoalYear - 1)}>
          <CaretLeft size={18} />
        </button>
        <h2 className="goals-year-title">{activeGoalYear} goals</h2>
        <button className="icon-btn" onClick={() => setActiveGoalYear(activeGoalYear + 1)}>
          <CaretRight size={18} />
        </button>
      </div>

      {/* Overall Progress */}
      <div className="goals-overview">
        <div className="goals-overview-bar">
          <div className="goals-overview-fill" style={{ width: `${overallProgress}%` }} />
        </div>
        <div className="goals-overview-stats">
          <span>{overallProgress}% overall</span>
          <span>{goalsForYear.length} goals</span>
        </div>
      </div>

      {/* Add Goal */}
      <AnimatePresence>
        {isCreating ? (
          <motion.div
            className="goal-create-form"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <input
              autoFocus
              className="goal-input"
              placeholder="what do you want to achieve?"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') setIsCreating(false);
              }}
            />
            <div className="goal-category-picker">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  className={`goal-cat-btn ${newCategory === cat.value ? 'active' : ''}`}
                  onClick={() => setNewCategory(cat.value)}
                  style={{ borderColor: newCategory === cat.value ? CATEGORY_COLORS[cat.value] : undefined }}
                >
                  <cat.icon size={14} />
                  {cat.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="challenge-action-btn" onClick={handleCreate}>add goal</button>
              <button className="challenge-action-btn secondary" onClick={() => setIsCreating(false)}>cancel</button>
            </div>
          </motion.div>
        ) : (
          <button className="goal-add-btn" onClick={() => setIsCreating(true)}>
            <Plus size={16} /> add goal
          </button>
        )}
      </AnimatePresence>

      {/* Goals List */}
      <div className="goals-list">
        {goalsForYear.length === 0 && !isCreating && (
          <div className="goals-empty">
            <Target size={40} weight="thin" style={{ color: 'var(--text-secondary)', marginBottom: 12 }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              no goals set for {activeGoalYear}. add one to get started!
            </p>
          </div>
        )}

        <AnimatePresence>
          {goalsForYear.map((goal) => {
            const isExpanded = expandedGoalId === goal.id;
            const completedMilestones = goal.milestones.filter((m) => m.completed).length;

            return (
              <motion.div
                key={goal.id}
                className="goal-card"
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {/* Goal Header */}
                <div
                  className="goal-card-header"
                  onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    {getCategoryIcon(goal.category)}
                    <span className="goal-card-title">{goal.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="goal-progress-text">{goal.progress}%</span>
                    <button
                      className="icon-btn"
                      onClick={(e) => { e.stopPropagation(); removeYearlyGoal(goal.id); }}
                      title="Delete"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="goal-progress-bar">
                  <div
                    className="goal-progress-fill"
                    style={{
                      width: `${goal.progress}%`,
                      background: CATEGORY_COLORS[goal.category],
                    }}
                  />
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      className="goal-expanded"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      {/* Description */}
                      {editingDescId === goal.id ? (
                        <textarea
                          className="goal-desc-input"
                          autoFocus
                          value={goal.description}
                          onChange={(e) => updateYearlyGoal(goal.id, { description: e.target.value })}
                          onBlur={() => setEditingDescId(null)}
                          placeholder="add a description..."
                        />
                      ) : (
                        <div
                          className="goal-description"
                          onClick={() => setEditingDescId(goal.id)}
                        >
                          {goal.description || 'click to add description...'}
                        </div>
                      )}

                      {/* Manual Progress Slider */}
                      {goal.milestones.length === 0 && (
                        <div className="goal-manual-progress">
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            progress: {goal.progress}%
                          </label>
                          <input
                            type="range"
                            className="slider"
                            min="0"
                            max="100"
                            value={goal.progress}
                            onChange={(e) => updateYearlyGoal(goal.id, { progress: parseInt(e.target.value) })}
                          />
                        </div>
                      )}

                      {/* Milestones */}
                      <div className="goal-milestones">
                        <div className="goal-milestones-header">
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            milestones ({completedMilestones}/{goal.milestones.length})
                          </span>
                        </div>
                        {goal.milestones.map((milestone) => (
                          <div key={milestone.id} className="goal-milestone-item">
                            <div
                              className={`goal-milestone-check ${milestone.completed ? 'done' : ''}`}
                              onClick={() => toggleMilestone(goal.id, milestone.id)}
                            >
                              {milestone.completed && <Check size={12} weight="bold" />}
                            </div>
                            <span className={`goal-milestone-text ${milestone.completed ? 'done' : ''}`}>
                              {milestone.text}
                            </span>
                            <button
                              className="icon-btn"
                              onClick={() => removeMilestone(goal.id, milestone.id)}
                              style={{ opacity: 0.5, padding: 2 }}
                            >
                              <Trash size={12} />
                            </button>
                          </div>
                        ))}
                        <div className="goal-add-milestone">
                          <input
                            className="goal-milestone-input"
                            placeholder="add milestone..."
                            value={expandedGoalId === goal.id ? newMilestoneText : ''}
                            onChange={(e) => setNewMilestoneText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newMilestoneText.trim()) {
                                addMilestone(goal.id, newMilestoneText.trim());
                                setNewMilestoneText('');
                              }
                            }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
