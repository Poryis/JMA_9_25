// ManageDataModal — single place for the 3 destructive/admin actions:
//   • 💾 Backup Progress  (download snapshot as JSON)
//   • 📥 Restore from Backup  (upload snapshot JSON)
//   • 🗑️ Reset All Progress  (with double confirmation)
//
// Lives behind a gear icon that only appears in TEACHER VIEW so kids can't
// accidentally wipe their own progress while playing.

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Upload, RotateCcw, AlertTriangle, CheckCircle2, Music2 } from 'lucide-react';
import {
  downloadSnapshotJson,
  importPlayerSnapshot,
  resetAllPlayerData,
  getPlayerSnapshot,
} from '../lib/playerStorage';
import useNoteNames, { NOTE_NAME_MODES } from '../hooks/useNoteNames';

function NoteNamesSetting() {
  const { mode, setMode } = useNoteNames();
  const active = NOTE_NAME_MODES.find((m) => m.id === mode);
  return (
    <div
      data-testid="note-names-setting"
      className="rounded-2xl border-2 p-3 mb-3"
      style={{ borderColor: 'var(--jma-dark)', backgroundColor: '#F4FAFF' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Music2 className="w-4 h-4" style={{ color: 'var(--jma-blue)' }} />
        <span className="text-sm font-black font-display" style={{ color: 'var(--jma-dark)' }}>Note Names</span>
        <span className="text-[10px] md:text-xs font-bold opacity-60 ml-auto" style={{ color: 'var(--jma-dark)' }}>Shown on bells, keys & games</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {NOTE_NAME_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            data-testid={`note-names-${m.id}`}
            onClick={() => setMode(m.id)}
            aria-pressed={mode === m.id}
            className="rounded-xl border-2 py-1.5 text-xs md:text-sm font-black"
            style={{
              borderColor: 'var(--jma-dark)',
              backgroundColor: mode === m.id ? 'var(--jma-blue)' : 'white',
              color: mode === m.id ? 'white' : 'var(--jma-dark)',
              boxShadow: mode === m.id ? '0 3px 0 0 var(--jma-dark)' : '0 2px 0 0 var(--jma-dark)',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] md:text-xs font-bold opacity-70 mt-2" style={{ color: 'var(--jma-dark)' }} data-testid="note-names-blurb">
        {active?.blurb}
      </p>
    </div>
  );
}

export default function ManageDataModal({ open, onClose }) {
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState(null);
  // ^ { kind: 'ok'|'error', message } shown briefly after an action
  const [confirmReset, setConfirmReset] = useState(false);

  const flash = (kind, message) => {
    setStatus({ kind, message });
    setTimeout(() => setStatus(null), 3500);
  };

  const handleBackup = () => {
    const snapshot = getPlayerSnapshot();
    const safeName = (snapshot.displayName || 'student')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'student';
    downloadSnapshotJson(`jma-progress-${safeName}.json`);
    flash('ok', 'Backup downloaded to your device.');
  };

  const handleRestoreClick = () => fileInputRef.current?.click();

  const handleRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    try {
      const text = await file.text();
      const blob = JSON.parse(text);
      importPlayerSnapshot(blob);
      flash('ok', `Progress restored! Reloading in a moment...`);
      setTimeout(() => window.location.reload(), 1100);
    } catch (err) {
      flash('error', "That file didn't look like a JMA backup. Try a different one.");
    }
  };

  const performReset = () => {
    const ok = resetAllPlayerData();
    if (ok) {
      flash('ok', 'All progress wiped. Reloading...');
      setTimeout(() => window.location.reload(), 1100);
    } else {
      flash('error', "Couldn't clear progress. Try closing the tab and reopening.");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-testid="manage-data-modal"
          className="fixed inset-0 z-[170] flex items-center justify-center p-4"
          style={{ background: 'rgba(10,37,64,0.6)', backdropFilter: 'blur(4px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-3xl border-4 p-5 md:p-6 max-w-md w-full relative"
            style={{ borderColor: 'var(--jma-dark)', boxShadow: '0 10px 0 0 var(--jma-dark)' }}
            initial={{ scale: 0.85, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              data-testid="manage-data-close"
              onClick={onClose}
              className="absolute top-3 right-3 chunky-btn flex items-center justify-center text-xs font-black w-9 h-9"
              style={{ backgroundColor: 'white', color: 'var(--jma-dark)' }}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-xl md:text-2xl font-black font-display mb-1 pr-10" style={{ color: 'var(--jma-dark)' }}>
              Manage Progress
            </h2>
            <p className="text-xs md:text-sm font-bold opacity-70 mb-4" style={{ color: 'var(--jma-dark)' }}>
              For teachers & parents — keep this page private from the student.
            </p>

            {/* Status banner */}
            <AnimatePresence>
              {status && (
                <motion.div
                  data-testid={`manage-data-status-${status.kind}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-3 px-3 py-2 rounded-xl border-2 text-xs md:text-sm font-bold flex items-center gap-2"
                  style={{
                    backgroundColor: status.kind === 'ok' ? '#E8F8EE' : '#FFE9E8',
                    color: status.kind === 'ok' ? '#1F7A36' : '#C8210B',
                    borderColor: status.kind === 'ok' ? '#34A853' : '#FF3B30',
                  }}
                >
                  {status.kind === 'ok'
                    ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                  <span>{status.message}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Note-name display (non-destructive device setting) */}
            <NoteNamesSetting />

            {/* Action rows */}
            <div className="space-y-2">
              {/* Backup */}
              <ActionRow
                testId="manage-data-backup"
                color="var(--jma-yellow)"
                textColor="var(--jma-dark)"
                onClick={handleBackup}
                icon={<Download className="w-5 h-5" />}
                title="Backup Progress"
                description="Download a JSON file with this student's full progress."
              />
              {/* Restore */}
              <ActionRow
                testId="manage-data-restore"
                color="var(--jma-blue)"
                textColor="white"
                onClick={handleRestoreClick}
                icon={<Upload className="w-5 h-5" />}
                title="Restore from Backup"
                description="Upload a previously-saved progress JSON file."
              />
              <input
                ref={fileInputRef}
                data-testid="manage-data-restore-input"
                type="file"
                accept="application/json,.json"
                onChange={handleRestoreFile}
                style={{ display: 'none' }}
              />

              {/* Reset — protected by an in-row confirm step */}
              {!confirmReset ? (
                <ActionRow
                  testId="manage-data-reset"
                  color="#FF3B30"
                  textColor="white"
                  onClick={() => setConfirmReset(true)}
                  icon={<RotateCcw className="w-5 h-5" />}
                  title="Reset All Progress"
                  description="Wipes every badge, sticker, streak, and play-time stat on this device."
                />
              ) : (
                <div
                  data-testid="manage-data-reset-confirm"
                  className="rounded-xl border-3 p-3"
                  style={{ borderColor: '#FF3B30', backgroundColor: '#FFE9E8' }}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#C8210B' }} />
                    <div>
                      <div className="font-black text-sm" style={{ color: '#C8210B' }}>
                        Wipe ALL progress?
                      </div>
                      <div className="text-xs font-bold mt-0.5" style={{ color: '#C8210B' }}>
                        This can&apos;t be undone. Consider clicking Backup first.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      data-testid="manage-data-reset-confirm-yes"
                      onClick={performReset}
                      className="chunky-btn flex-1 px-3 py-2 text-xs font-black"
                      style={{ backgroundColor: '#FF3B30', color: 'white' }}
                    >
                      Yes, wipe everything
                    </button>
                    <button
                      data-testid="manage-data-reset-confirm-no"
                      onClick={() => setConfirmReset(false)}
                      className="chunky-btn flex-1 px-3 py-2 text-xs font-black"
                      style={{ backgroundColor: 'white', color: 'var(--jma-dark)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ActionRow({ testId, color, textColor, onClick, icon, title, description }) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className="w-full chunky-btn flex items-start gap-3 px-3 py-2.5 text-left touch-manipulation"
      style={{ backgroundColor: color, color: textColor }}
    >
      <span className="flex-shrink-0 mt-0.5">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-black font-display">{title}</span>
        <span className="block text-[10px] md:text-[11px] font-bold leading-tight opacity-90 mt-0.5">
          {description}
        </span>
      </span>
    </button>
  );
}
