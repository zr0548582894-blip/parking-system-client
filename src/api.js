// שכבת הקריאות לשרת (ה-API). כל הלוגיקה של HTTP במקום אחד: כתובות, כותרת Authorization,
// ותרגום תשובות שגיאה של השרת (ProblemDetails) לשגיאה אחת ברורה: ApiError.

export class ApiError extends Error {
  constructor(status, title, { errors = null, correlationId = null, retryAfter = null } = {}) {
    super(title);
    this.name = 'ApiError';
    this.status = status; // קוד ה-HTTP. 0 = אין חיבור לשרת
    this.errors = errors; // שגיאות ולידציה לפי שדה (400): { Email: ['...'] }
    this.correlationId = correlationId; // מזהה הבקשה, לאיתור בלוג של השרת
    this.retryAfter = retryAfter; // שניות להמתנה (429)
  }

  get isConflict() {
    return this.status === 409;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isRateLimited() {
    return this.status === 429;
  }
}

// בקשה שבוטלה בכוונה (למשל החלפת תאריך באמצע טעינה) אינה שגיאה להצגה
export function isAbort(error) {
  return error?.name === 'AbortError';
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

// getToken נקרא בכל בקשה, ולכן ה-token תמיד העדכני. fetchImpl מאפשר לבדוק בלי רשת.
// onActivity (לא חובה) מקבל { method, path, status, ms, at } על כל בקשה: בלי גוף, בלי query, בלי token ובלי סיסמאות.
// יומן הקריאות שנשלחו בפועל (בלי token ובלי גוף)
export function createApi({
  baseUrl,
  getToken = () => null,
  fetchImpl = (...args) => fetch(...args),
  onActivity = () => {},
  now = () => Date.now(),
}) {
  const root = baseUrl.replace(/\/+$/, '');

  async function request(path, { method = 'GET', body, signal } = {}) {
    const startedAt = now();
    const report = (status) => onActivity({ method, path: path.split('?')[0], status, ms: now() - startedAt, at: startedAt });

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
        signal,
      });
    } catch (caught) {
      if (isAbort(caught)) throw caught;
      report(0);
      throw new ApiError(0, 'לא ניתן להתחבר לשרת. בדקי את החיבור ונסי שוב.');
    }

    report(response.status);
    if (response.status === 204) return { data: null, location: null };

    const text = await response.text();
    const data = text ? parseJson(text) : null;

    if (!response.ok) {
      throw new ApiError(response.status, data?.title ?? `הבקשה נכשלה (${response.status}).`, {
        errors: data?.errors ?? null,
        correlationId: data?.correlationId ?? null,
        retryAfter: Number(response.headers.get('Retry-After')) || null,
      });
    }

    return { data, location: response.headers.get('Location') };
  }

  const api = {
    // בדיקת חיבור ציבורית (ללא token). לא זורקת: מחזירה ok/status כדי להציג מצב בממשק
    health: async () => {
      const startedAt = now();
      try {
        const response = await fetchImpl(`${root}/healthz`, { method: 'GET' });
        onActivity({ method: 'GET', path: '/healthz', status: response.status, ms: now() - startedAt, at: startedAt });
        return { ok: response.ok, status: response.status };
      } catch {
        onActivity({ method: 'GET', path: '/healthz', status: 0, ms: now() - startedAt, at: startedAt });
        return { ok: false, status: 0 };
      }
    },

    register: (fullName, email, password) =>
      request('/api/users', { method: 'POST', body: { fullName, email, password } }).then((r) => r.data),

    login: (email, password) =>
      request('/api/tokens', { method: 'POST', body: { email, password } }).then((r) => r.data),

    // pagination, סינון ומיון מתבצעים בשרת (בבסיס הנתונים), לא בדפדפן
    listSpots: (
      { page = 1, pageSize = 5, date, available, floor, isActive, featureId, search, sortBy = 'Code', sortDir = 'Asc' } = {},
      { signal } = {},
    ) =>
      request(
        `/api/parking-spots${buildQuery({ page, pageSize, date, available, floor, isActive, featureId, search, sortBy, sortDir })}`,
        { signal },
      ).then((r) => r.data),

    // טוענת את כל המקומות (עמודים של 100, המקסימום בשרת). משמשת את מפת החניון
    listAllSpots: async (filters = {}, options = {}) => {
      const first = await api.listSpots({ ...filters, page: 1, pageSize: 100 }, options);
      const items = [...first.items];
      for (let page = 2; page <= first.totalPages; page += 1) {
        items.push(...(await api.listSpots({ ...filters, page, pageSize: 100 }, options)).items);
      }
      return { items, totalCount: first.totalCount };
    },

    getSpot: (id) => request(`/api/parking-spots/${id}`).then((r) => r.data),

    createSpot: (spot) => request('/api/parking-spots', { method: 'POST', body: spot }).then((r) => r.data),

    updateSpot: (id, spot) => request(`/api/parking-spots/${id}`, { method: 'PUT', body: spot }).then((r) => r.data),

    deleteSpot: (id) => request(`/api/parking-spots/${id}`, { method: 'DELETE' }).then(() => null),

    listFeatures: ({ signal } = {}) => request('/api/features', { signal }).then((r) => r.data),

    reserve: (parkingSpotId, date) =>
      request('/api/reservations', { method: 'POST', body: { parkingSpotId, date } }).then((r) => ({
        reservation: r.data,
        location: r.location,
      })),

    getReservation: (id) => request(`/api/reservations/${id}`).then((r) => r.data),

    myReservations: ({ page = 1, pageSize = 5 } = {}, { signal } = {}) =>
      request(`/api/reservations/mine${buildQuery({ page, pageSize })}`, { signal }).then((r) => r.data),

    allReservations: ({ page = 1, pageSize = 10 } = {}, { signal } = {}) =>
      request(`/api/reservations${buildQuery({ page, pageSize })}`, { signal }).then((r) => r.data),

    cancelReservation: (id) => request(`/api/reservations/${id}`, { method: 'DELETE' }).then(() => null),
  };

  return api;
}
