import { ApiError } from './api.js';

// הופך שגיאה לטקסט להצגה: כותרת, ורשימת פרטים (שגיאות ולידציה לפי שדה)
export function describeError(error) {
  if (!(error instanceof ApiError)) {
    return { message: 'אירעה שגיאה לא צפויה. נסי שוב.', details: [] };
  }

  const details = error.errors ? Object.values(error.errors).flat() : [];
  return { message: error.message, details };
}

// הודעה ברורה כשהזמנה נכשלה בגלל התנגשות (409): מישהו אחר הקדים, או שכבר יש הזמנה באותו יום
export function conflictMessage(error) {
  return `ההזמנה לא נקלטה: ${error.message} אפשר לבחור מקום אחר מהרשימה.`;
}

// תיאור מלא לממשק: סוג ההודעה (tone), הטקסט, פרטי ולידציה ורמז לפעולה הבאה.
// אין כאן פרטים פנימיים: רק מה שהשרת החזיר בכוונה (title) ומזהה בקשה שמיועד לתמיכה
export function explainError(error) {
  const { message, details } = describeError(error);
  if (!(error instanceof ApiError)) return { tone: 'error', message, details, hint: null, correlationId: null };

  const base = { message, details, correlationId: error.correlationId };
  switch (error.status) {
    case 0:
      return { ...base, tone: 'error', hint: 'השרת אינו מגיב. ב-Render השרת עשוי להתעורר כדקה אחרי חוסר פעילות.' };
    case 400:
      return { ...base, tone: 'error', hint: 'תקני את השדות המסומנים ונסי שוב.' };
    case 401:
      return { ...base, tone: 'error', hint: 'ההתחברות פגה או אינה תקפה. יש להתחבר מחדש.' };
    case 403:
      return { ...base, tone: 'warning', hint: 'ההרשאה נאכפת בשרת: התפקיד שלך אינו מאפשר את הפעולה הזו.' };
    case 404:
      return { ...base, tone: 'warning', hint: 'ייתכן שהפריט הוסר. הנתונים על המסך רועננו.' };
    case 409:
      return { ...base, tone: 'conflict', hint: 'הנתונים על המסך רועננו כדי להציג את המצב העדכני.' };
    case 429:
      return {
        ...base,
        tone: 'warning',
        hint: error.retryAfter ? `אפשר לנסות שוב בעוד כ-${error.retryAfter} שניות.` : 'יש להמתין מעט ולנסות שוב.',
      };
    default:
      return { ...base, tone: 'error', hint: error.status >= 500 ? 'תקלה בשרת. נסי שוב בעוד רגע.' : null };
  }
}
