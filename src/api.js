// שכבת הקריאות לשרת (ה-API). כל הלוגיקה של HTTP במקום אחד: כתובות, כותרת Authorization,
// ותרגום תשובות שגיאה של השרת (ProblemDetails) לשגיאה אחת ברורה: ApiError.

export class ApiError extends Error {
  constructor(status, title, { errors = null, correlationId = null } = {}) {
    super(title);
    this.name = 'ApiError';
    this.status = status; // קוד ה-HTTP. 0 = אין חיבור לשרת
    this.errors = errors; // שגיאות ולידציה לפי שדה (400): { Email: ['...'] }
    this.correlationId = correlationId; // מזהה הבקשה, לאיתור בלוג של השרת
  }

  get isConflict() {
    return this.status === 409;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
}

// בונה query string מאובייקט. מדלג על ערכים ריקים, כדי שלא יישלחו פרמטרים מיותרים
export function buildQuery(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// getToken נקרא בכל בקשה, ולכן ה-token תמיד העדכני. fetchImpl מאפשר לבדוק בלי רשת
export function createApi({ baseUrl, getToken = () => null, fetchImpl = (...args) => fetch(...args) }) {
  const root = baseUrl.replace(/\/+$/, '');

  async function request(path, { method = 'GET', body } = {}) {
    const headers = { Accept: 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let response;
    try {
      response = await fetchImpl(`${root}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, 'לא ניתן להתחבר לשרת. בדקי את החיבור ונסי שוב.');
    }

    if (response.status === 204) return { data: null, location: null };

    const text = await response.text();
    const data = text ? parseJson(text) : null;

    if (!response.ok) {
      throw new ApiError(response.status, data?.title ?? `הבקשה נכשלה (${response.status}).`, {
        errors: data?.errors ?? null,
        correlationId: data?.correlationId ?? null,
      });
    }

    return { data, location: response.headers.get('Location') };
  }

  return {
    register: (fullName, email, password) =>
      request('/api/users', { method: 'POST', body: { fullName, email, password } }).then((r) => r.data),

    login: (email, password) =>
      request('/api/tokens', { method: 'POST', body: { email, password } }).then((r) => r.data),

    // pagination, סינון ומיון מתבצעים בשרת (בבסיס הנתונים), לא בדפדפן
    listSpots: ({ page = 1, pageSize = 5, date, available, sortBy = 'Code', sortDir = 'Asc' } = {}) =>
      request(`/api/parking-spots${buildQuery({ page, pageSize, date, available, sortBy, sortDir })}`).then((r) => r.data),

    reserve: (parkingSpotId, date) =>
      request('/api/reservations', { method: 'POST', body: { parkingSpotId, date } }).then((r) => ({
        reservation: r.data,
        location: r.location,
      })),

    myReservations: ({ page = 1, pageSize = 5 } = {}) =>
      request(`/api/reservations/mine${buildQuery({ page, pageSize })}`).then((r) => r.data),

    cancelReservation: (id) => request(`/api/reservations/${id}`, { method: 'DELETE' }).then(() => null),
  };
}
