// ניווט מבוסס hash (#/reservations): עובד באתר סטטי בלי הגדרות שרת, וצירוף הכתובת נשמר ברענון
import { useCallback, useEffect, useState } from 'react';

export function parseHash(hash) {
  const path = (hash || '').replace(/^#/, '').split('?')[0].replace(/\/+$/, '');
  return path === '' ? '/' : path.startsWith('/') ? path : `/${path}`;
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((to) => {
    window.location.hash = to;
  }, []);

  return [route, navigate];
}
