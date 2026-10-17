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
