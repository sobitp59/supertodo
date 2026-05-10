import { useState } from 'react';
import { useStore } from '../store';
import type { JobApplication } from '../store';
import { Plus, Trash, PencilSimple, ArrowSquareOut, MapPin, CurrencyDollar, Link as LinkIcon, Globe } from '@phosphor-icons/react';
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

// Extract company name from common job platform URLs
function extractCompanyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;

    // LinkedIn: linkedin.com/jobs/view/... or linkedin.com/company/NAME/...
    if (hostname.includes('linkedin.com')) {
      const companyMatch = pathname.match(/\/company\/([^/]+)/);
      if (companyMatch) return formatExtractedName(companyMatch[1]);
      return null;
    }

    // Lever: jobs.lever.co/COMPANY/...
    if (hostname.includes('lever.co')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length > 0) return formatExtractedName(parts[0]);
    }

    // Greenhouse: boards.greenhouse.io/COMPANY/...
    if (hostname.includes('greenhouse.io')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length > 0) return formatExtractedName(parts[0]);
    }

    // Ashby: jobs.ashbyhq.com/COMPANY/...
    if (hostname.includes('ashbyhq.com')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length > 0) return formatExtractedName(parts[0]);
    }

    // Workday: company.wd5.myworkdayjobs.com/...
    if (hostname.includes('myworkdayjobs.com') || hostname.includes('workday.com')) {
      const subdomain = hostname.split('.')[0];
      if (subdomain && subdomain !== 'www') return formatExtractedName(subdomain);
    }

    // Generic: try subdomain or first path segment for career pages
    // e.g., careers.stripe.com, jobs.netflix.com
    if (hostname.startsWith('careers.') || hostname.startsWith('jobs.') || hostname.startsWith('apply.')) {
      const domain = hostname.replace(/^(careers|jobs|apply)\./, '').replace(/\.(com|io|co|org|net).*$/, '');
      if (domain) return formatExtractedName(domain);
    }

    return null;
  } catch {
    return null;
  }
}

function formatExtractedName(raw: string): string {
  return raw
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function detectPlatformFromUrl(url: string): string {
  try {
    const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.toLowerCase();
    if (hostname.includes('linkedin.com')) return 'LinkedIn';
    if (hostname.includes('lever.co')) return 'Lever';
    if (hostname.includes('greenhouse.io')) return 'Greenhouse';
    if (hostname.includes('ashbyhq.com')) return 'Ashby';
    if (hostname.includes('workday.com') || hostname.includes('myworkdayjobs.com')) return 'Workday';
    if (hostname.includes('indeed.com')) return 'Indeed';
    if (hostname.includes('glassdoor.com')) return 'Glassdoor';
    if (hostname.includes('angel.co') || hostname.includes('wellfound.com')) return 'Wellfound';
    if (hostname.includes('dice.com')) return 'Dice';
    if (hostname.includes('ziprecruiter.com')) return 'ZipRecruiter';
    return 'Other';
  } catch {
    return 'Other';
  }
}

export function JobTrackerView() {
  const jobApplications = useStore((state) => state.jobApplications);
  const addJobApplication = useStore((state) => state.addJobApplication);
  const updateJobApplication = useStore((state) => state.updateJobApplication);
  const removeJobApplication = useStore((state) => state.removeJobApplication);

  const [isCreating, setIsCreating] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newSalary, setNewSalary] = useState('');
  const [newStatus, setNewStatus] = useState<JobApplication['status']>('wishlist');
  const [detectedPlatform, setDetectedPlatform] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<JobApplication>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleUrlChange = (url: string) => {
    setNewUrl(url);

    // Only try extraction if it looks like a URL
    if (url.includes('.') && url.length > 5) {
      const extracted = extractCompanyFromUrl(url);
      if (extracted && !newCompany) {
        setNewCompany(extracted);
        toast.success(`Detected: ${extracted}`);
      }
      const platform = detectPlatformFromUrl(url);
      setDetectedPlatform(platform);
    } else {
      setDetectedPlatform('');
    }
  };

  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted && pasted.includes('.')) {
      // Let the onChange handle it after paste
      setTimeout(() => {
        const extracted = extractCompanyFromUrl(pasted);
        if (extracted && !newCompany) {
          setNewCompany(extracted);
          toast.success(`Detected: ${extracted}`);
        }
        setDetectedPlatform(detectPlatformFromUrl(pasted));
      }, 50);
    }
  };

  const handleCreate = () => {
    if (newCompany.trim() && newRole.trim()) {
      addJobApplication(newCompany.trim(), newRole.trim(), newStatus);
      // Update with extra fields after creation
      const state = useStore.getState();
      const latest = state.jobApplications[state.jobApplications.length - 1];
      if (latest) {
        const updates: Partial<JobApplication> = {};
        if (newUrl.trim()) updates.url = newUrl.trim();
        if (newLocation.trim()) updates.location = newLocation.trim();
        if (newSalary.trim()) updates.salary = newSalary.trim();
        if (Object.keys(updates).length > 0) {
          updateJobApplication(latest.id, updates);
        }
      }
      resetForm();
    }
  };

  const resetForm = () => {
    setNewCompany('');
    setNewRole('');
    setNewUrl('');
    setNewLocation('');
    setNewSalary('');
    setNewStatus('wishlist');
    setDetectedPlatform('');
    setIsCreating(false);
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
            {/* Row 1: URL field (primary - paste to auto-fill) */}
            <div style={{ position: 'relative' }}>
              <input
                autoFocus
                className="job-input"
                placeholder="Paste job URL to auto-detect company..."
                value={newUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                onPaste={handleUrlPaste}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') resetForm();
                }}
                style={{ width: '100%', paddingLeft: '32px' }}
              />
              <LinkIcon size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
              {detectedPlatform && (
                <span style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 600, background: 'rgba(255,255,255,0.05)',
                  padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <Globe size={10} /> {detectedPlatform}
                </span>
              )}
            </div>

            {/* Row 2: Company + Role */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                className="job-input"
                placeholder="Company name *"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') resetForm();
                }}
                style={{ flex: 1 }}
              />
              <input
                className="job-input"
                placeholder="Role / Position *"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') resetForm();
                }}
                style={{ flex: 1 }}
              />
            </div>

            {/* Row 3: Location + Salary + Status */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                className="job-input"
                placeholder="Location (e.g., Remote, NYC)"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') resetForm();
                }}
                style={{ flex: 1 }}
              />
              <input
                className="job-input"
                placeholder="Salary / Range"
                value={newSalary}
                onChange={(e) => setNewSalary(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') resetForm();
                }}
                style={{ flex: 1 }}
              />
              <select
                className="challenge-select"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as JobApplication['status'])}
                style={{ minWidth: 100 }}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Row 4: Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
              <button className="challenge-action-btn" onClick={handleCreate}>
                Add Application
              </button>
              <button className="challenge-action-btn secondary" onClick={resetForm}>
                Cancel
              </button>
              {!newCompany && !newRole && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                  * Company & Role required
                </span>
              )}
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
              style={{
                transform: dragOverColumn === status.value ? 'scale(1.015)' : 'scale(1)',
                transition: 'transform 0.2s ease, border-color 0.2s ease, background 0.2s ease',
              }}
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
                      animate={{
                        opacity: 1,
                        scale: 1,
                        rotate: draggingId === job.id ? 1.5 : 0,
                      }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
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
                            placeholder="Job URL"
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

                          {job.url && (
                            <div className="kanban-card-meta" style={{ marginBottom: 4 }}>
                              <span style={{ opacity: 0.6 }}>
                                <LinkIcon size={10} /> {(() => { try { return new URL(job.url).hostname.replace('www.', ''); } catch { return 'link'; } })()}
                              </span>
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
