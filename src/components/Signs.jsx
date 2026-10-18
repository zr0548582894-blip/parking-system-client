import { Accessibility, ArrowDown, ArrowUp, Zap } from 'lucide-react';

// לוחית רישוי בסגנון ישראלי: רקע צהוב, פס כחול בצד שמאל, ספרות שחורות.
// משמשת להצגת קוד מקום החניה האמיתי מהשרת (למשל L2-01). זו עיצוב בלבד: לשרת אין נתוני רכבים או לוחיות
export function Plate({ text, size = 'md', className = '' }) {
  return (
    <span className={`plate plate-${size} ${className}`} dir="ltr" role="text" aria-label={`מקום ${text}`}>
      <span className="plate-strip" aria-hidden="true">
        <i>IL</i>
      </span>
      <span className="plate-text">{text}</span>
    </span>
  );
}

// תמרורים כ-SVG. כולם דקורטיביים (aria-hidden) ומקבלים size כמו אייקון של lucide, כדי שאפשר להעביר אותם כ-icon
const frame = { viewBox: '0 0 64 64', 'aria-hidden': true, focusable: false };

// תמרור "חניה": ריבוע כחול עם P לבנה
export function SignParking({ size = 48 }) {
  return (
    <svg {...frame} width={size} height={size} className="sign">
      <rect x="2" y="2" width="60" height="60" rx="8" fill="#1c5bb8" stroke="#fff" strokeWidth="3" />
      <rect x="2" y="2" width="60" height="60" rx="8" fill="none" stroke="#12203a" strokeWidth="1.5" />
      <path d="M24 49V15h13a10.5 10.5 0 0 1 0 21H24" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// תמרור "אין כניסה": עיגול אדום עם פס לבן
export function SignNoEntry({ size = 48 }) {
  return (
    <svg {...frame} width={size} height={size} className="sign">
      <circle cx="32" cy="32" r="30" fill="#c8312a" stroke="#fff" strokeWidth="3" />
      <circle cx="32" cy="32" r="30" fill="none" stroke="#12203a" strokeWidth="1.5" />
      <rect x="14" y="26" width="36" height="12" rx="2" fill="#fff" />
    </svg>
  );
}

// תמרור מידע כחול עם סמל (נגיש, טעינה, חץ כניסה/יציאה)
function InfoSign({ size, children }) {
  return (
    <span className="sign sign-info" style={{ width: size, height: size }} aria-hidden="true">
      {children}
    </span>
  );
}

export const SignAccessible = ({ size = 48 }) => (
  <InfoSign size={size}><Accessibility size={size * 0.62} strokeWidth={2.4} /></InfoSign>
);

export const SignEv = ({ size = 48 }) => (
  <InfoSign size={size}><Zap size={size * 0.62} strokeWidth={2.4} fill="#ffc61a" color="#ffc61a" /></InfoSign>
);

// חץ כניסה (כלפי מטה אל החניון) ויציאה (כלפי מעלה)
export const SignEnter = ({ size = 48 }) => (
  <InfoSign size={size}><ArrowDown size={size * 0.62} strokeWidth={3} /></InfoSign>
);

export const SignExit = ({ size = 48 }) => (
  <InfoSign size={size}><ArrowUp size={size * 0.62} strokeWidth={3} /></InfoSign>
);

// תמרור לפי סוג מאפיין (ev, accessible). לסוגים אחרים אין תמרור
export function FeatureSign({ kind, size = 22 }) {
  if (kind === 'ev') return <SignEv size={size} />;
  if (kind === 'accessible') return <SignAccessible size={size} />;
  return null;
}
