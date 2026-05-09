import { useState } from 'react';
import { useStore } from '../store';
import type { JobApplication } from '../store';
import { Plus, Trash, PencilSimple, ArrowSquareOut, Buildings, MapPin, CurrencyDollar } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const STATUSES: { value: JobApplication['status']; label: string; color: string }[] = [
  { value: 'wishlist', label: 'wishlist', color: '#636e72' },
  { value: 'applied', label: 'applied', color: '#0984e3' },
  { value: 'interview', label: 'interview', color: '#6c5ce7' },
  { value: 'offer', label: 'offer', color: '#00b894' },
  { value: 'accepted', label: 'accepted', color: '#2add84' },
  { value: 'rejected', label: 'rejected', color: '#d63031' },
];

const getStatusColor = (status: JobApplication['status']) =>
  STATUSES.find((s) => s.value === status)?.color || '#636e72';

export function JobTrackerView() {
  const jobApplications = useStore((state) => state.jobApplications);
  const addJobApplication = useStore((state) => state.addJobApplication);
  const updateJobApplication = useStore((state) => state.updateJobApplication);
  const removeJobApplication = useStore((state) => state.removeJobApplication);

  const [isCreating, setIsCreating] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newStatus, setNewStatus] = useState<JobApplication['status']>('wishlist');
  const [filterStatus, setFilterStatus] = useState<JobApplication['status'] | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<JobApplication>>({});

  const filtered = filterStatus === 'all'
    ? jobApplications
    : jobApplications.filter((j) => j.status === filterStatus);

  // Sort by most recent first
  const sorted = [...filtered].sort((a, b) => b.createdAt - a.createdAt);

  const handleCreate = () => {
    if (newCompany.trim() && newRole.trim()) {
      addJobApplication(newCompany.trim(), newRole.trim(), newStatus);
      setNewCompany('');
      setNewRole('');
      setNewStatus('wishlist');
      setIsCreating(false);
    }
  };

  const startEdit = (job: JobApplication) => {
    setEditingId(job.id);
    setEditFields({
      company: job.company,
      role: job.role,
      status: job.status,
      salary: job.salary || '',
      location: job.location || '',
      url: job.url || '',
      notes: job.notes,
    });
  };

  const saveEdit = () => {
    if (editingId) {
      updateJobApplication(editingId, editFields);
      setEditingId(null);
      setEditFields({});
    }
  };

  // Stats
  const statusCounts = STATUSES.map((s) => ({
    ...s,
    count: jobApplications.filter((j) => j.status === s.value).length,
  }));

  return (
    <div className="jobs-view">
      {/* Stats Bar */}
      <div className="jobs-stats-bar">
        {statusCounts.map((s) => (
          <div
            key={s.value}
            className={`jobs-stat-chip ${filterStatus === s.value ? 'active' : ''}`}
            onClick={() => setFilterStatus(filterStatus === s.value ? 'all' : s.value)}
            style={{
              borderColor: filterStatus === s.value ? s.color : undefined,
              background: filterStatus === s.value ? `${s.color}15` : undefined,
            }}
          >
            <span className="jobs-stat-dot" style={{ background: s.color }} />
            <span className="jobs-stat-label">{s.label}</span>
            <span className="jobs-stat-count">{s.count}</span>
          </div>
        ))}
      </div>

      {/* Add Button */}
      <AnimatePresence>
        {isCreating ? (
          <motion.div
            className="job-create-form"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                autoFocus
                className="job-input"
                placeholder="company name"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
              />
              <input
                className="job-input"
                placeholder="role / position"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                className="challenge-select"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as JobApplication['status'])}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <button className="challenge-action-btn" onClick={handleCreate}>add</button>
              <button className="challenge-action-btn secondary" onClick={() => setIsCreating(false)}>cancel</button>
            </div>
          </motion.div>
        ) : (
          <button className="goal-add-btn" onClick={() => setIsCreating(true)}>
            <Plus size={16} /> add application
          </button>
        )}
      </AnimatePresence>

      {/* Job List */}
      <div className="jobs-list">
        {sorted.length === 0 && (
          <div className="goals-empty">
            <Buildings size={40} weight="thin" style={{ color: 'var(--text-secondary)', marginBottom: 12 }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {filterStatus !== 'all'
                ? `no ${filterStatus} applications`
                : 'no applications yet. start tracking your job search!'}
            </p>
          </div>
        )}

        <AnimatePresence>
          {sorted.map((job) => (
            <motion.div
              key={job.id}
              className="job-card"
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {editingId === job.id ? (
                /* Edit Mode */
                <div className="job-edit-form">
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      className="job-input"
                      value={editFields.company || ''}
                      onChange={(e) => setEditFields({ ...editFields, company: e.target.value })}
                      placeholder="company"
                    />
                    <input
                      className="job-input"
                      value={editFields.role || ''}
                      onChange={(e) => setEditFields({ ...editFields, role: e.target.value })}
                      placeholder="role"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <select
                      className="challenge-select"
                      value={editFields.status}
                      onChange={(e) => setEditFields({ ...editFields, status: e.target.value as JobApplication['status'] })}
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <input
                      className="job-input"
                      value={editFields.salary || ''}
                      onChange={(e) => setEditFields({ ...editFields, salary: e.target.value })}
                      placeholder="salary"
                    />
                    <input
                      className="job-input"
                      value={editFields.location || ''}
                      onChange={(e) => setEditFields({ ...editFields, location: e.target.value })}
                      placeholder="location"
                    />
                  </div>
                  <input
                    className="job-input"
                    value={editFields.url || ''}
                    onChange={(e) => setEditFields({ ...editFields, url: e.target.value })}
                    placeholder="job posting url"
                    style={{ marginBottom: 8 }}
                  />
                  <textarea
                    className="job-notes-input"
                    value={editFields.notes || ''}
                    onChange={(e) => setEditFields({ ...editFields, notes: e.target.value })}
                    placeholder="notes..."
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="challenge-action-btn" onClick={saveEdit}>save</button>
                    <button className="challenge-action-btn secondary" onClick={() => setEditingId(null)}>cancel</button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  <div className="job-card-header">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="job-card-company">{job.company}</div>
                      <div className="job-card-role">{job.role}</div>
                    </div>
                    <span
                      className="job-status-badge"
                      style={{ background: `${getStatusColor(job.status)}20`, color: getStatusColor(job.status), borderColor: `${getStatusColor(job.status)}40` }}
                    >
                      {job.status}
                    </span>
                  </div>

                  <div className="job-card-meta">
                    {job.location && (
                      <span className="job-meta-item">
                        <MapPin size={12} /> {job.location}
                      </span>
                    )}
                    {job.salary && (
                      <span className="job-meta-item">
                        <CurrencyDollar size={12} /> {job.salary}
                      </span>
                    )}
                    <span className="job-meta-item">
                      {job.appliedDate}
                    </span>
                  </div>

                  {job.notes && (
                    <div className="job-card-notes">{job.notes}</div>
                  )}

                  <div className="job-card-actions">
                    <button className="icon-btn" onClick={() => startEdit(job)} title="Edit">
                      <PencilSimple size={14} />
                    </button>
                    {job.url && (
                      <button
                        className="icon-btn"
                        onClick={() => window.open(job.url, '_blank')}
                        title="Open URL"
                      >
                        <ArrowSquareOut size={14} />
                      </button>
                    )}
                    {/* Status quick-change */}
                    <select
                      className="job-quick-status"
                      value={job.status}
                      onChange={(e) => updateJobApplication(job.id, { status: e.target.value as JobApplication['status'] })}
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <div style={{ flex: 1 }} />
                    <button
                      className="icon-btn"
                      onClick={() => {
                        const jobData = jobApplications.find(j => j.id === job.id);
                        removeJobApplication(job.id);
                        toast('Application deleted', {
                          action: {
                            label: 'Undo',
                            onClick: () => {
                              if (jobData) {
                                useStore.setState((s) => ({ jobApplications: [...s.jobApplications, jobData] }));
                              }
                            },
                          },
                        });
                      }}
                      title="Delete"
                      style={{ color: 'var(--high-priority)' }}
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
