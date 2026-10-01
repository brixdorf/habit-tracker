import { useRef, useState } from 'react';
import { api } from '../../api.js';
import { ConfirmDialog } from './ConfirmDialog.jsx';

export function ImportExportBar({ onImported }) {
  const fileInputRef = useRef(null);
  const [pendingSnapshot, setPendingSnapshot] = useState(null);
  const [error, setError] = useState('');

  async function handleExport() {
    let res;
    try {
      res = await api.exportData();
    } catch (err) {
      setError(err.message || 'Export failed.');
      return;
    }
    setError('');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const disposition = res.headers.get('content-disposition') ?? '';
    const match = disposition.match(/filename="(.+)"/);
    a.href = url;
    a.download = match ? match[1] : 'habit-tracker-export.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handleFileChosen(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        setPendingSnapshot(parsed);
        setError('');
      } catch {
        setError('That file is not valid JSON.');
      }
    };
    reader.readAsText(file);
  }

  async function confirmImport() {
    try {
      await api.importData(pendingSnapshot);
      setPendingSnapshot(null);
      onImported();
    } catch (err) {
      setError(err.message || 'Import failed.');
      setPendingSnapshot(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleExport}
        className="rounded-md border border-base-300 px-3 py-1.5 text-sm text-base-700 hover:bg-base-200 dark:border-base-700 dark:text-base-300 dark:hover:bg-base-800"
      >
        Export
      </button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="rounded-md border border-base-300 px-3 py-1.5 text-sm text-base-700 hover:bg-base-200 dark:border-base-700 dark:text-base-300 dark:hover:bg-base-800"
      >
        Import
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleFileChosen}
        className="hidden"
      />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {pendingSnapshot && (
        <ConfirmDialog
          title="Replace all data?"
          message="Importing will permanently replace all current habits, checks, goals, and notes with the contents of this file. This cannot be undone."
          confirmLabel="Replace everything"
          danger
          onConfirm={confirmImport}
          onCancel={() => setPendingSnapshot(null)}
        />
      )}
    </div>
  );
}
