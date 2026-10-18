import { useEffect, useRef } from 'react';
import { Loader2, X } from 'lucide-react';

// כפתור עם מצב "בעבודה": מושבת בזמן בקשה, כדי שלא יישלחו שתי בקשות במקרה של לחיצה כפולה
export function Button({ variant = 'primary', busy = false, busyText, icon: Icon, children, className = '', disabled, ...rest }) {
  return (
    <button
      type="button"
      className={`btn btn-${variant} ${className}`}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? <Loader2 className="spin" size={18} aria-hidden="true" /> : Icon && <Icon size={18} aria-hidden="true" />}
      <span>{busy && busyText ? busyText : children}</span>
    </button>
  );
}

export function Skeleton({ className = '', style }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function EmptyState({ icon: Icon, image, title, children, action }) {
  return (
    <div className={`empty ${image ? "empty-photo" : ""}`}>
      {image && <img src={image} alt="" className="empty-img" loading="lazy" />}
      {image && <div className="empty-shade" aria-hidden="true" />}
      {Icon && <Icon size={34} strokeWidth={1.4} aria-hidden="true" />}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

// דיאלוג מבוסס <dialog> מובנה: הדפדפן מנהל פוקוס, Escape וחסימת הרקע
export function Dialog({ open, onClose, title, children, wide = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? 'dialog-wide' : ''}`}
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
      aria-labelledby="dialog-title"
    >
      {open && (
        <div className="dialog-card">
          <header>
            <h2 id="dialog-title">{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="סגירה">
              <X size={20} aria-hidden="true" />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function Field({ label, hint, error, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <small className="field-hint">{hint}</small>}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
