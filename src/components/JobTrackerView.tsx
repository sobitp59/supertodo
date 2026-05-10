import { useState } from 'react';
import { useStore } from '../store';
import type { JobApplication } from '../store';
import { Plus, Trash, PencilSimple, ArrowSquareOut, Buildings, MapPin, CurrencyDollar, X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const STATUSES: { value: JobApplication['status']; label: string; color: string }[] = [
  { value: 'wishlist', label: 'Wishlist', color: '#636e72' },
  { value: 'applied', label: 'Applied', color: '#0984e3' },
  { value: 'interview', label: 'Interview', color: '#6c5ce7' },
  { value: 'offer', label: 'Offer', color: '#00b894' },
  { value: 'accepted', label: 'Accepted', color: '#2add84' },
  { value: 'rejected', label: 'Rejected', color: '#d63031' },
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<JobApplication>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

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

  // Native drag handlers
  const handleDragStart = (e: React.DragEvent, jobId: string) => {
    setDraggingId(jobId);
    e.dataTransfer.setData('text/plain', jobId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, status: JobApplication['status']) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData('text/plain');
    if (jobId) {
      updateJobApplication(jobId, { status });
      toast.success(`Moved to ${status}`);
    }
    setDraggingId(null);
    setDragOverColumn(null);
  };

  return (
    <div className="kanban-view">
      {/* Top bar */}
      <div className="kanban-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Job Tracker</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {jobApplications.length} total
          </span>
        </div>
        <button className="kanban-add-btn" onClick={() => setIsCreating(true)}>
          <Plus size={14} /> Add
        </button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            className="kanban-create-form"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                autoFocus
                className="job-input"
                placeholder="Company name"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
              />
              <input
                className="job-input"
                placeholder="Role / Position"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
              />
              <select
                className="challenge-select"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as JobApplication['status'])}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="challenge-action-btn" onClick={handleCreate}>Add</button>
              <button className="challenge-action-btn secondary" onClick={() => setIsCreating(false)}>Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kanban Board */}
      <div className="kanban-board">
        {STATUSES.map((status) => {
          const columnJobs = jobApplications
            .filter((j) => j.status === status.value)
            .sort((a, b) => b.createdAt - a.createdAt);

          return (
            <div
              key={status.value}
              className={`kanban-column ${dragOverColumn === status.value ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, status.value)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status.value)}
            >
              {/* Column header */}
              <div className="kanban-column-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="kanban-column-dot" style={{ background: status.color }} />
                  <span className="kanban-column-title">{status.label}</span>
                </div>
                <span className="kanban-column-count">{columnJobs.length}</span>
              </div>

              {/* Column cards */}
              <div className="kanban-column-cards">
                <AnimatePresence>
                  {columnJobs.map((job) => (
                    <motion.div
                      key={job.id}
                      className={`kanban-card ${draggingId === job.id ? 'dragging' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e as any, job.id)}
                      onDragEnd={handleDragEnd}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      style={{ borderLeftColor: status.color }}
                    >
                      {editingId === job.id ? (
                        /* Edit Mode */
                        <div className="kanban-card-edit">
                          <input
                            className="job-input"
                            value={editFields.company || ''}
                            onChange={(e) => setEditFields({ ...editFields, company: e.target.value })}
                            placeholder="Company"
                            style={{ marginBottom: 6 }}
                          />
                          <input
                            className="job-input"
                            value={editFields.role || ''}
                            onChange={(e) => setEditFields({ ...editFields, role: e.target.value })}
                            placeholder="Role"
                            style={{ marginBottom: 6 }}
                          />
                          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                            <input
                              className="job-input"
                              value={editFields.salary || ''}
                              onChange={(e) => setEditFields({ ...editFields, salary: e.target.value })}
                              placeholder="Salary"
                              style={{ flex: 1 }}
                            />
                            <input
                              className="job-input"
                              value={editFields.location || ''}
                              onChange={(e) => setEditFields({ ...editFields, location: e.target.value })}
                              placeholder="Location"
                              style={{ flex: 1 }}
                            />
                          </div>
                          <input
                            className="job-input"
                            value={editFields.url || ''}
                            onChange={(e) => setEditFields({ ...editFields, url: e.target.value })}
                            placeholder="URL"
                            style={{ marginBottom: 6 }}
                          />
                          <textarea
                            className="job-notes-input"
                            value={editFields.notes || ''}
                            onChange={(e) => setEditFields({ ...editFields, notes: e.target.value })}
                            placeholder="Notes..."
                            style={{ minHeight: 40 }}
                          />
                          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            <button className="challenge-action-btn" onClick={saveEdit} style={{ fontSize: '0.7rem', padding: '4px 10px' }}>Save</button>
                            <button className="challenge-action-btn secondary" onClick={() => setEditingId(null)} style={{ fontSize: '0.7rem', padding: '4px 10px' }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        /* View Mode */
                        <>
                          <div className="kanban-card-company">{job.company}</div>
                          <div className="kanban-card-role">{job.role}</div>

                          {(job.location || job.salary) && (
                            <div className="kanban-card-meta">
                              {job.location && (
                                <span><MapPin size={10} /> {job.location}</span>
                              )}
                              {job.salary && (
                                <span><CurrencyDollar size={10} /> {job.salary}</span>
                              )}
                            </div>
                          )}

                          {job.notes && (
                            <div className="kanban-card-notes">{job.notes}</div>
                          )}

                          <div className="kanban-card-footer">
                            <span className="kanban-card-date">{job.appliedDate}</span>
                            <div className="kanban-card-actions">
                              <button className="icon-btn" onClick={() => startEdit(job)} title="Edit" style={{ padding: 3 }}>
                                <PencilSimple size={12} />
                              </button>
                              {job.url && (
                                <button className="icon-btn" onClick={() => window.open(job.url, '_blank')} title="Open" style={{ padding: 3 }}>
                                  <ArrowSquareOut size={12} />
                                </button>
                              )}
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
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {columnJobs.length === 0 && (
                  <div className="kanban-column-empty">
                    No applications
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
