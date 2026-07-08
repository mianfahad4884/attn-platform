import { useUIStore } from '../../store/uiStore';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-3 bg-panel border border-divider px-4 py-3 min-w-[300px] max-w-sm animate-in slide-in-from-bottom-5 fade-in duration-300"
        >
          {toast.type === 'success' && <CheckCircle2 size={16} className="text-accent" />}
          {toast.type === 'error' && <AlertCircle size={16} className="text-negative" />}
          {toast.type === 'default' && <Info size={16} className="text-text-secondary" />}
          <span className="text-sm text-text-primary flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
