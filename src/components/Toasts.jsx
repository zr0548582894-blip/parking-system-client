import { createContext, useCallback, useContext, useState } from 'react';
import Notice from './Notice.jsx';

const ToastContext = createContext(() => {});

// הודעות קצרות בפינה: הצלחה נעלמת לבד, שגיאות נשארות עד שסוגרים אותן (לא מעלימים כשל)
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const push = useCallback(
    (toast) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((current) => [...current.slice(-3), { id, ...toast }]);
      if (toast.type === 'success' || toast.type === 'info') setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts">
        {toasts.map(({ id, ...toast }) => (
          <Notice key={id} {...toast} onDismiss={() => dismiss(id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
