import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X, XCircle } from 'lucide-react';

const ICONS = { success: CheckCircle2, info: Info, error: XCircle, warning: ShieldAlert, conflict: AlertTriangle };

// הודעה למשתמש: הצלחה, מידע, שגיאה, אזהרה (403/429) או התנגשות (409) בצבע משלה.
// message/text = הכותרת, details = שגיאות ולידציה, hint = מה עושים עכשיו, correlationId = מזהה לתמיכה (לא סוד)
export default function Notice({ type = 'info', tone, text, message, details = [], hint, correlationId, onDismiss, children }) {
  const kind = tone ?? type;
  const Icon = ICONS[kind] ?? Info;
  const polite = kind === 'success' || kind === 'info';

  return (
    <div className={`notice notice-${kind}`} role={polite ? 'status' : 'alert'}>
      <Icon className="notice-icon" size={20} aria-hidden="true" />
      <div className="notice-body">
        <strong>{text ?? message}</strong>
        {details.length > 0 && (
          <ul>
            {details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        )}
        {hint && <p className="notice-hint">{hint}</p>}
        {children}
        {correlationId && (
          <p className="notice-ref">
            מזהה בקשה לתמיכה: <bdi>{correlationId}</bdi>
          </p>
        )}
      </div>
      {onDismiss && (
        <button type="button" className="icon-btn" onClick={onDismiss} aria-label="סגירת ההודעה">
          <X size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
