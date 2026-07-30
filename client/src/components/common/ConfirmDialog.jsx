import { Modal } from './Modal.jsx';

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="mb-5 text-sm text-base-600 dark:text-base-300">{message}</p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-base-300 px-3 py-1.5 text-sm text-base-700 hover:bg-base-200 dark:border-base-700 dark:text-base-300 dark:hover:bg-base-800"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={
            danger
              ? 'rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700'
              : 'rounded-md bg-accent-500 px-3 py-1.5 text-sm font-medium text-base-50 hover:bg-accent-600'
          }
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
