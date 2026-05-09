import { X, FloppyDisk, Export, DownloadSimple } from '@phosphor-icons/react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';

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
              <label className="settings-label">
                Canvas start hour: <strong>{settings.canvasStartHour === 0 ? '12 AM' : settings.canvasStartHour <= 12 ? `${settings.canvasStartHour} AM` : `${settings.canvasStartHour - 12} PM`}</strong>
              </label>
              <input
                type="range"
                className="slider"
                min="0"
                max="23"
                step="1"
                value={settings.canvasStartHour ?? 8}
                onChange={(e) => updateSettings({ canvasStartHour: parseInt(e.target.value) })}
              />
            </div>
          </div>

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
