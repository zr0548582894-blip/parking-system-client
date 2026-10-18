// יומן הקריאות ששלח הדפדפן בהפעלה הזו (שיטה, כתובת, סטטוס, משך). נשמר בזיכרון בלבד ונעלם ברענון.
// לא נשמרים גוף בקשה, פרמטרים, token או סיסמאות, כך שאפשר להציג אותו על המסך בבטחה
import { useSyncExternalStore } from 'react';

const MAX_ENTRIES = 60;
let entries = [];
const listeners = new Set();

export function recordActivity(entry) {
  entries = [{ id: `${entry.at}-${entries.length}-${Math.random().toString(36).slice(2, 6)}`, ...entry }, ...entries].slice(0, MAX_ENTRIES);
  listeners.forEach((listener) => listener());
}

export function clearActivity() {
  entries = [];
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useActivity() {
  return useSyncExternalStore(subscribe, () => entries);
}
