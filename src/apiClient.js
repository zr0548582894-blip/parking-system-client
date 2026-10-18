import { createApi } from './api.js';
import { recordActivity } from './activity.js';
import { loadSession } from './session.js';

// כתובת השרת נקבעת בזמן הבנייה (VITE_API_URL). ללא הגדרה: השרת המקומי
export const baseUrl = import.meta.env?.VITE_API_URL || 'http://localhost:5258';

export const api = createApi({ baseUrl, getToken: () => loadSession()?.token ?? null, onActivity: recordActivity });
