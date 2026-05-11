import { X, FloppyDisk, Export, DownloadSimple, Brain, CircleNotch, Check, Trash } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { isOllamaRunning, listOllamaModels, pullOllamaModel, deleteOllamaModel, formatModelSize, OLLAMA_MODELS, CLOUD_MODELS, getDefaultBaseUrl, type OllamaModel, type OllamaPullProgress } from '../services/ai';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport?: () => void;
  onImport?: () => void;
}

export function SettingsModal({ isOpen, onClose, onExport, onImport }: SettingsModalProps) {
  const settings = useStore((state) => state.settings);
  const updateSettings = useStore((state) => state.updateSettings);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="omnibar-overlay settings-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modal-content settings-modal"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>Settings</h2>
            <button className="icon-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Appearance Section */}
          <div className="settings-section">
            <h3 className="settings-section-title">Appearance</h3>

            <div className="settings-row">
              <label className="settings-label">Accent Color</label>
              <input
                type="color"
                className="color-picker"
                value={settings.accentColor}
                onChange={(e) => updateSettings({ accentColor: e.target.value })}
              />
            </div>

            <div className="settings-row">
              <label className="settings-label">Theme</label>
              <select
                value={settings.theme}
                onChange={(e) => updateSettings({ theme: e.target.value as 'dark' | 'light' })}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                <option value="dark">Dark</option>
                <option value="light">Light (Coming Soon)</option>
              </select>
            </div>
          </div>

          {/* Pomodoro Section */}
          <div className="settings-section">
            <h3 className="settings-section-title">Pomodoro</h3>

            <div className="settings-row">
              <label className="settings-label">
                Focus Duration: <strong>{settings.pomodoroDuration} min</strong>
              </label>
              <input
                type="range"
                className="slider"
                min="5"
                max="60"
                step="5"
                value={settings.pomodoroDuration}
                onChange={(e) => updateSettings({ pomodoroDuration: parseInt(e.target.value) })}
              />
            </div>

            <div className="settings-row">
              <label className="settings-label">
                Break Duration: <strong>{settings.pomodoroBreakDuration} min</strong>
              </label>
              <input
                type="range"
                className="slider"
                min="1"
                max="15"
                step="1"
                value={settings.pomodoroBreakDuration}
                onChange={(e) => updateSettings({ pomodoroBreakDuration: parseInt(e.target.value) })}
              />
            </div>
          </div>

          {/* Focus Mode Section */}
          <div className="settings-section">
            <h3 className="settings-section-title">Focus Mode</h3>

            <div className="settings-row">
              <label className="settings-label">Ambient Sound</label>
              <select
                value={settings.zenModeAmbientSound}
                onChange={(e) => updateSettings({ zenModeAmbientSound: e.target.value as any })}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                <option value="none">None</option>
                <option value="rain">Rain</option>
                <option value="cafe">Cafe</option>
                <option value="waves">Ocean Waves</option>
                <option value="whitenoise">White Noise</option>
              </select>
            </div>
          </div>

          {/* General Section */}
          <div className="settings-section">
            <h3 className="settings-section-title">General</h3>

            <div className="settings-row">
              <label className="settings-label">Display Name</label>
              <input
                type="text"
                value={settings.userName}
                onChange={(e) => updateSettings({ userName: e.target.value })}
                placeholder="User"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  width: '150px'
                }}
              />
            </div>

            <div className="settings-row">
              <label className="settings-label">Default View</label>
              <select
                value={settings.defaultView}
                onChange={(e) => updateSettings({ defaultView: e.target.value as any })}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                <option value="todos">Todos</option>
                <option value="bookmarks">Bookmarks</option>
                <option value="notes">Notes</option>
              </select>
            </div>

            <div className="settings-row">
              <label className="settings-label">Auto-start on boot</label>
              <div
                className={`toggle ${settings.autoStartEnabled ? 'active' : ''}`}
                onClick={() => updateSettings({ autoStartEnabled: !settings.autoStartEnabled })}
              >
                <div className="toggle-thumb" />
              </div>
            </div>

            <div className="settings-row">
              <label className="settings-label">Planner start time</label>
              <select
                value={settings.canvasStartHour ?? 8}
                onChange={(e) => updateSettings({ canvasStartHour: parseInt(e.target.value) })}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                {Array.from({ length: 24 }, (_, i) => {
                  const label = i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`;
                  return <option key={i} value={i}>{label}</option>;
                })}
              </select>
            </div>
          </div>

          {/* AI Section */}
          <AISettingsSection />

          {/* Data Section */}
          <div className="settings-section">
            <h3 className="settings-section-title">Data</h3>
            <div style={{ display: 'flex', gap: 12 }}>
              {onExport && (
                <button
                  className="create-btn"
                  onClick={onExport}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                  }}
                >
                  <Export size={16} />
                  Export Data
                </button>
              )}
              {onImport && (
                <button
                  className="create-btn"
                  onClick={onImport}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                  }}
                >
                  <DownloadSimple size={16} />
                  Import Data
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', gap: 12, marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
            <button
              className="create-btn"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px 24px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
              }}
            >
              <FloppyDisk size={18} />
              Save & Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}



// AI Settings Section Component
function AISettingsSection() {
  const settings = useStore((state) => state.settings);
  const updateSettings = useStore((state) => state.updateSettings);
  const ai = settings.ai || { provider: 'none', model: '' };

  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [installedModels, setInstalledModels] = useState<OllamaModel[]>([]);
  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState<string>('');
  const [showModelPicker, setShowModelPicker] = useState(false);

  // Check Ollama status on mount and when provider changes
  useEffect(() => {
    if (ai.provider === 'ollama' || ai.provider === 'none') {
      checkOllama();
    }
  }, [ai.provider]);

  async function checkOllama() {
    setOllamaStatus('checking');
    const running = await isOllamaRunning();
    setOllamaStatus(running ? 'connected' : 'disconnected');
    if (running) {
      const models = await listOllamaModels();
      setInstalledModels(models);
    }
  }

  async function handlePullModel(modelId: string) {
    setIsPulling(true);
    setPullProgress('Starting download...');
    const success = await pullOllamaModel(modelId, (progress: OllamaPullProgress) => {
      if (progress.total && progress.completed) {
        const pct = Math.round((progress.completed / progress.total) * 100);
        setPullProgress(`${progress.status} ${pct}%`);
      } else {
        setPullProgress(progress.status || 'Downloading...');
      }
    });
    setIsPulling(false);
    setPullProgress('');
    if (success) {
      await checkOllama();
      updateSettings({ ai: { ...ai, model: modelId } });
    }
  }

  async function handleDeleteModel(modelName: string) {
    await deleteOllamaModel(modelName);
    await checkOllama();
    if (ai.model === modelName) {
      updateSettings({ ai: { ...ai, model: '' } });
    }
  }

  const updateAI = (partial: Partial<typeof ai>) => {
    updateSettings({ ai: { ...ai, ...partial } });
  };

  const selectStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    padding: '8px 12px',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.85rem',
    outline: 'none',
    width: '100%',
  };

  const inputStyle = {
    ...selectStyle,
    cursor: 'text',
  };

  return (
    <div className="settings-section">
      <h3 className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Brain size={18} /> AI (Mindmap)
      </h3>

      {/* Provider Selection */}
      <div className="settings-row">
        <label className="settings-label">Provider</label>
        <select
          value={ai.provider}
          onChange={(e) => {
            const provider = e.target.value as any;
            const baseUrl = getDefaultBaseUrl(provider);
            updateAI({ provider, baseUrl, model: '', apiKey: provider === 'ollama' ? undefined : ai.apiKey });
          }}
          style={{ ...selectStyle, width: '180px' }}
        >
          <option value="none">Disabled</option>
          <option value="ollama">Ollama (Local)</option>
          <option value="openai">OpenAI</option>
          <option value="groq">Groq</option>
          <option value="anthropic">Anthropic</option>
          <option value="custom">Custom Endpoint</option>
        </select>
      </div>

      {/* Ollama-specific UI */}
      {ai.provider === 'ollama' && (
        <>
          <div className="settings-row">
            <label className="settings-label">Status</label>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
              {ollamaStatus === 'checking' && <><CircleNotch size={14} className="spinning" /> Checking...</>}
              {ollamaStatus === 'connected' && <><span style={{ color: '#69db7c' }}>●</span> Connected</>}
              {ollamaStatus === 'disconnected' && <><span style={{ color: '#ff6b6b' }}>●</span> Not running</>}
            </span>
          </div>

          {ollamaStatus === 'disconnected' && (
            <div style={{ padding: '10px 12px', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
              Install Ollama from <span style={{ color: 'var(--accent)' }}>ollama.com</span> and run it in the background.
            </div>
          )}

          {ollamaStatus === 'connected' && (
            <>
              {/* Installed models */}
              {installedModels.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Installed Models</label>
                  {installedModels.map(m => (
                    <div key={m.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', border: '1px solid var(--border)', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {ai.model === m.name && <Check size={12} color="var(--accent)" />}
                        <span style={{ cursor: 'pointer' }} onClick={() => updateAI({ model: m.name })}>{m.name}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>({formatModelSize(m.size)})</span>
                      </span>
                      <button onClick={() => handleDeleteModel(m.name)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}>
                        <Trash size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pull new model */}
              {isPulling ? (
                <div style={{ padding: '10px 12px', border: '1px dashed var(--border)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CircleNotch size={14} className="spinning" />
                  {pullProgress}
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => setShowModelPicker(!showModelPicker)}
                    style={{ ...selectStyle, cursor: 'pointer', textAlign: 'left' }}
                  >
                    + Install a model...
                  </button>
                  {showModelPicker && (
                    <div style={{ border: '1px solid var(--border)', marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                      {OLLAMA_MODELS.filter(m => !installedModels.find(im => im.name === m.id)).map(m => (
                        <button
                          key={m.id}
                          onClick={() => { handlePullModel(m.id); setShowModelPicker(false); }}
                          style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '8px 10px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                        >
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{m.name} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>({m.size})</span></span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{m.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Active model */}
              <div className="settings-row" style={{ marginTop: 8 }}>
                <label className="settings-label">Active Model</label>
                <select value={ai.model || ''} onChange={(e) => updateAI({ model: e.target.value })} style={{ ...selectStyle, width: '180px' }}>
                  <option value="">Select model...</option>
                  {installedModels.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                </select>
              </div>
            </>
          )}
        </>
      )}

      {/* Cloud provider UI (OpenAI, Groq, Anthropic, Custom) */}
      {(ai.provider === 'openai' || ai.provider === 'groq' || ai.provider === 'anthropic' || ai.provider === 'custom') && (
        <>
          <div className="settings-row">
            <label className="settings-label">API Key</label>
            <input
              type="password"
              value={ai.apiKey || ''}
              onChange={(e) => updateAI({ apiKey: e.target.value })}
              placeholder="sk-..."
              style={{ ...inputStyle, width: '220px' }}
            />
          </div>

          {ai.provider === 'custom' && (
            <div className="settings-row">
              <label className="settings-label">Base URL</label>
              <input
                type="text"
                value={ai.baseUrl || ''}
                onChange={(e) => updateAI({ baseUrl: e.target.value })}
                placeholder="http://localhost:1234/v1"
                style={{ ...inputStyle, width: '220px' }}
              />
            </div>
          )}

          <div className="settings-row">
            <label className="settings-label">Model</label>
            {ai.provider === 'custom' ? (
              <input
                type="text"
                value={ai.model || ''}
                onChange={(e) => updateAI({ model: e.target.value })}
                placeholder="model-name"
                style={{ ...inputStyle, width: '180px' }}
              />
            ) : (
              <select value={ai.model || ''} onChange={(e) => updateAI({ model: e.target.value })} style={{ ...selectStyle, width: '180px' }}>
                <option value="">Select model...</option>
                {CLOUD_MODELS.filter(m => m.provider === ai.provider).map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}
          </div>
        </>
      )}

      {ai.provider !== 'none' && ai.model && (
        <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(105,219,124,0.1)', border: '1px solid rgba(105,219,124,0.3)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          AI ready. Select a node in Mindmap and use the sparkle button to generate ideas.
        </div>
      )}
    </div>
  );
}
