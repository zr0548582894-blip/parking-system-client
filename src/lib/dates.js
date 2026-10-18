// תאריכים בפורמט yyyy-MM-dd, כמו שהשרת מקבל (DateOnly). עובדים לפי היום המקומי של המשתמש

export function toIso(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function isoDate(daysFromToday = 0, from = new Date()) {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + daysFromToday);
  return toIso(date);
}

export function parseIso(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isValidIso(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') && toIso(parseIso(value)) === value;
}

const long = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const short = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short' });
const weekday = new Intl.DateTimeFormat('he-IL', { weekday: 'short' });
const stampDate = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
const stampTime = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });

export const formatLong = (iso) => long.format(parseIso(iso));
export const formatShort = (iso) => short.format(parseIso(iso));
export const formatWeekday = (iso) => weekday.format(parseIso(iso));
// CreatedAtUtc מגיע מהשרת בלי סימון אזור זמן בחלק מהמקרים: מתייחסים אליו כ-UTC
export function formatStamp(utc) {
  const value = /[zZ]|[+-]\d{2}:?\d{2}$/.test(utc) ? utc : `${utc}Z`;
  const moment = new Date(value);
  return `${stampDate.format(moment)} · ${stampTime.format(moment)}`;
}
