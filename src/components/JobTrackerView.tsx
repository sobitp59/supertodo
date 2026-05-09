import { useState } from 'react';
import { useStore } from '../store';
import type { JobApplication } from '../store';
import { Plus, Trash, PencilSimple, ArrowSquareOut, MapPin, CurrencyDollar, ArrowRight } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const STATUSES: { value: JobApplication['status']; label: string; color: string; emoji: string }[] = [
  { value: 'wishlist', label: 'Wishlist', color: '#636e72', emoji: '💭' },
  { value: 'applied', label: 'Applied', color: '#0984e3', emoji: '📤' },
  { value: 'interview', label: 'Interview', color: '#6c5ce7', emoji: '🎤' },
  { value: 'offer', label: 'Offer', color: '#00b894', emoji: '🎉' },
  { value: 'rejected', label: 'Rejected', color: '#d63031', emoji: '❌' },
  { value: 'accepted', label: 'Accepted', color: '#2add84', emoji: '✅' },
];

const getNextStatus = (current: JobApplication['status']): JobApplication['status'] | null => {
  const order: JobApplication['status'][] = ['wishlist', 'applied', 'interview', 'offer', 'accepted'];
  const idx = order.indexOf(current);
  if (idx >= 0 && idx < order.length - 1) return order[idx + 1];
  return null;
};

export function JobTrackerView() {
  const jobApplications = useStore((state) => state.jobApplications);
  const addJobApplication = useStore((state) => state.addJobApplication);
  const updateJobApplication = useStore((state) => state.updateJobApplication);
  const removeJobApplication = useStore((state) => state.removeJobApplication);

  const [isCreating, setIsCreating] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newStatus, setNewStatus] = useState<JobApplication['status']>('wishlist');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<JobApplication>>({});
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, jobId: string) => {
    e.dataTransfer.setData('text/plain', jobId);
    setDraggingId(jobId);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: JobApplication['status']) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData('text/plain');
    if (jobId) {
      updateJobApplication(jobId, { status: targetStatus });
      toast.success(`Moved to ${targetStatus}`);
    }
    setDragOverColumn(null);
    setDraggingId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverColumn(null);
  };

  const totalApps = jobApplications.length;

  return (
    <div className="jobs-kanban-view">
      {/* Header */}
      <div className="jobs-kanban-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Job Tracker</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {totalApps} {totalApps === 1 ? 'application' : 'applications'}
          </span>
        </div>
        <button
          className="challenge-action-btn"
          onClick={() => setIsCreating(true)}
          style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={14} /> add
        </button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            className="job-create-form"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ margin: '0 16px 12px' }}
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
        )}
      </AnimatePresence>

      {/* Kanban Board */}
      <div className="jobs-kanban-board">
        {STATUSES.map((statusCol) => {
          const columnJobs = jobApplications
            .filter((j) => j.status === statusCol.value)
            .sort((a, b) => b.createdAt - a.createdAt);

          return (
            <div
              key={statusCol.value}
              className={`jobs-kanban-column ${dragOverColumn === statusCol.value ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, statusCol.value)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, statusCol.value)}
            >
              {/* Column Header */}
              <div className="jobs-kanban-column-header">
                <span className="jobs-kanban-column-emoji">{statusCol.emoji}</span>
                <span className="jobs-kanban-column-title" style={{ color: statusCol.color }}>
                  {statusCol.label}
                </span>
                <span className="jobs-kanban-column-count">{columnJobs.length}</span>
              </div>

              {/* Column Cards */}
              <div className="jobs-kanban-column-cards">
                {columnJobs.map((job) => (
                  <div
                    key={job.id}
                    className={`jobs-kanban-card ${draggingId === job.id ? 'dragging' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, job.id)}
                    onDragEnd={handleDragEnd}
                  >
                    {editingId === job.id ? (
                      <div className="job-edit-form" style={{ padding: 0 }}>
                        <input
                          autoFocus
                          className="job-input"
                          value={editFields.company || ''}
                          onChange={(e) => setEditFields({ ...editFields, company: e.target.value })}
                          placeholder="company"
                          style={{ marginBottom: 4 }}
                        />
                        <input
                          className="job-input"
                          value={editFields.role || ''}
                          onChange={(e) => setEditFields({ ...editFields, role: e.target.value })}
                          placeholder="role"
                          style={{ marginBottom: 4 }}
                        />
                        <input
                          className="job-input"
                          value={editFields.salary || ''}
                          onChange={(e) => setEditFields({ ...editFields, salary: e.target.value })}
                          placeholder="salary"
                          style={{ marginBottom: 4 }}
                        />
                        <input
                          className="job-input"
                          value={editFields.location || ''}
                          onChange={(e) => setEditFields({ ...editFields, location: e.target.value })}
                          placeholder="location"
                          style={{ marginBottom: 4 }}
                        />
                        <input
                          className="job-input"
                          value={editFields.url || ''}
                          onChange={(e) => setEditFields({ ...editFields, url: e.target.value })}
                          placeholder="url"
                          style={{ marginBottom: 4 }}
                        />
                        <textarea
                          className="job-notes-input"
                          value={editFields.notes || ''}
                          onChange={(e) => setEditFields({ ...editFields, notes: e.target.value })}
                          placeholder="notes..."
                          style={{ minHeight: 40 }}
                        />
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                          <button className="challenge-action-btn" onClick={saveEdit} style={{ fontSize: '0.7rem', padding: '4px 8px' }}>save</button>
                          <button className="challenge-action-btn secondary" onClick={() => setEditingId(null)} style={{ fontSize: '0.7rem', padding: '4px 8px' }}>cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="jobs-kanban-card-company">{job.company}</div>
                        <div className="jobs-kanban-card-role">{job.role}</div>

                        {(job.location || job.salary) && (
                          <div className="jobs-kanban-card-meta">
                            {job.location && (
                              <span><MapPin size={10} /> {job.location}</span>
                            )}
                            {job.salary && (
                              <span><CurrencyDollar size={10} /> {job.salary}</span>
                            )}
                          </div>
                        )}

                        <div className="jobs-kanban-card-date">{job.appliedDate}</div>

                        {job.notes && (
                          <div className="jobs-kanban-card-notes">{job.notes}</div>
                        )}

                        <div className="jobs-kanban-card-actions">
                          <button className="icon-btn" onClick={() => startEdit(job)} title="Edit" style={{ padding: 3 }}>
                            <PencilSimple size={12} />
                          </button>
                          {job.url && (
                            <button className="icon-btn" onClick={() => window.open(job.url, '_blank')} title="Open" style={{ padding: 3 }}>
                              <ArrowSquareOut size={12} />
                            </button>
                          )}
                          {getNextStatus(job.status) && (
                            <button
                              className="icon-btn"
                              onClick={() => {
                                const next = getNextStatus(job.status);
                                if (next) updateJobApplication(job.id, { status: next });
                              }}
                              title={`Move to ${getNextStatus(job.status)}`}
                              style={{ padding: 3 }}
                            >
                              <ArrowRight size={12} />
                            </button>
                          )}
                          <div style={{ flex: 1 }} />
                          <button
                            className="icon-btn"
                            onClick={() => {
                              const jobData = jobApplications.find(j => j.id === job.id);
                              removeJobApplication(job.id);
                              toast('Deleted', {
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
                            style={{ padding: 3, color: 'var(--high-priority)' }}
                          >
                            <Trash size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {columnJobs.length === 0 && (
                  <div className="jobs-kanban-empty">
                    drop here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
