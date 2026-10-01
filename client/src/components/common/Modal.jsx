import { useId, useRef } from 'react';

export function Modal({ title, children, onClose }) {
  const titleId = useId();
  // Only a click that both starts and ends on the backdrop closes the modal, so
  // dragging a text selection out of an input doesn't dismiss it.
  const pressStartedOnBackdrop = useRef(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        pressStartedOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (pressStartedOnBackdrop.current && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-lg border border-base-200 bg-base-50 p-5 shadow-lg dark:border-base-800 dark:bg-base-900"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-base font-semibold text-base-900 dark:text-base-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-base-400 hover:text-base-700 dark:hover:text-base-200"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
