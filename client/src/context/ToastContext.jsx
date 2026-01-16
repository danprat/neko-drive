import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { createContext, useCallback, useContext, useState, useEffect } from "react";

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss handled by individual toast component for progress bar sync
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast toast-bottom toast-end z-[9999] gap-4 p-4">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ toast, onRemove }) => {
  const [progress, setProgress] = useState(100);
  const DURATION = 3000;

  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(remaining);

      if (elapsed >= DURATION) {
        clearInterval(timer);
        onRemove(toast.id);
      }
    }, 16); // ~60fps

    return () => clearInterval(timer);
  }, [toast.id, onRemove]);

  const getAlertClass = () => {
    switch (toast.type) {
      case "success": return "alert-success text-ctp-green bg-ctp-base border-ctp-green/20";
      case "error": return "alert-error text-ctp-red bg-ctp-base border-ctp-red/20";
      default: return "alert-info text-ctp-blue bg-ctp-base border-ctp-blue/20";
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success": return <CheckCircle size={20} />;
      case "error": return <AlertCircle size={20} />;
      default: return <Info size={20} />;
    }
  };

  return (
    <div className={`alert ${getAlertClass()} shadow-lg relative overflow-hidden animate-slide-up min-w-[320px] border`}>
      {getIcon()}
      <span className="font-medium text-ctp-text">{toast.message}</span>

      <button onClick={() => onRemove(toast.id)} className="btn btn-ghost btn-xs btn-circle">
        <X size={14} />
      </button>

      {/* Progress Bar */}
      <div
        className="absolute bottom-0 left-0 h-1 bg-current opacity-30 transition-all duration-75 ease-linear"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};
