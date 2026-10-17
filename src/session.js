// שמירת ההתחברות (ה-JWT) בדפדפן. נשמר ב-sessionStorage: נמחק כשסוגרים את הלשונית,
// ולא נשאר בדפדפן אחרי הסגירה. ה-token אינו סוד של הפרויקט אלא "כרטיס כניסה" זמני של המשתמש.

const KEY = 'parking.session';

const defaultStorage = () => (typeof sessionStorage === 'undefined' ? null : sessionStorage);

export function saveSession(auth, storage = defaultStorage()) {
  const session = {
    token: auth.token,
    expiresAtUtc: auth.expiresAtUtc,
    userId: auth.userId,
    fullName: auth.fullName,
    email: auth.email,
    role: auth.role,
  };
  storage?.setItem(KEY, JSON.stringify(session));
  return session;
}

// מחזיר את ההתחברות השמורה, או null אם אין, אם היא פגה או אם הערך פגום
export function loadSession(storage = defaultStorage(), now = Date.now()) {
  const raw = storage?.getItem(KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw);
    const expired = !session.token || !session.expiresAtUtc || Date.parse(session.expiresAtUtc) <= now;
    if (expired) {
      storage.removeItem(KEY);
      return null;
    }
    return session;
  } catch {
    storage.removeItem(KEY);
    return null;
  }
}

export function clearSession(storage = defaultStorage()) {
  storage?.removeItem(KEY);
}
