import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const close = useCallback((result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setDialog(null);
  }, []);

  const confirm = useCallback((options) => {
    const opts =
      typeof options === 'string'
        ? { message: options }
        : options || {};

    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        type: 'confirm',
        title: opts.title || 'Please confirm',
        message: opts.message || 'Are you sure?',
        confirmText: opts.confirmText || 'OK',
        cancelText: opts.cancelText || 'Cancel',
        tone: opts.tone || 'danger',
      });
    });
  }, []);

  const alert = useCallback((options) => {
    const opts =
      typeof options === 'string'
        ? { message: options }
        : options || {};

    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        type: 'alert',
        title: opts.title || 'Notice',
        message: opts.message || '',
        confirmText: opts.confirmText || 'OK',
        tone: opts.tone || 'info',
      });
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink/55 backdrop-blur-sm"
            onClick={() => close(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md bg-white rounded-2xl border border-brand-100 shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200"
          >
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    dialog.tone === 'danger'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-brand-50 text-brand-600'
                  }`}
                >
                  {dialog.tone === 'danger' ? <AlertTriangle size={22} /> : <Info size={22} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-xl font-bold text-ink leading-tight">
                      {dialog.title}
                    </h3>
                    <button
                      type="button"
                      onClick={() => close(false)}
                      className="p-1.5 rounded-lg text-stone-400 hover:bg-sand hover:text-ink"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <p className="text-sm text-stone-600 mt-2 leading-relaxed whitespace-pre-line">
                    {dialog.message}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 sm:px-6 py-4 bg-sand border-t border-brand-50 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              {dialog.type === 'confirm' && (
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-stone-600 hover:bg-white border border-transparent hover:border-brand-100 transition-colors"
                >
                  {dialog.cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={() => close(true)}
                className={`px-5 py-2.5 rounded-xl font-bold text-white transition-colors ${
                  dialog.tone === 'danger'
                    ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200'
                    : 'bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/30'
                }`}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return ctx;
};
