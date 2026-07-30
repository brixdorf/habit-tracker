export function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-sm rounded-lg border border-base-200 bg-base-50 p-5 shadow-lg dark:border-base-800 dark:bg-base-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-base-900 dark:text-base-100">{title}</h2>
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
