import { useCallback, useEffect, useRef, useState } from 'react';
import { isAbort } from '../api.js';
import { isValidIso } from '../lib/dates.js';

// טוען את נתוני המפה מהשרת: כל המקומות עם מצב פנוי/תפוס לתאריך שנבחר, ולעובד גם ההזמנות שלו
// (כדי לסמן "המקום שלי"). בקשה ישנה מבוטלת כשמתחילה חדשה, כדי שתשובה איטית לא תדרוס תאריך חדש יותר
export function useGarage({ api, date, isEmployee, onUnauthorized }) {
  const [state, setState] = useState({ status: 'idle', spots: [], mine: [], error: null, loadedAt: null });
  const controller = useRef(null);
  const onUnauthorizedRef = useRef(onUnauthorized);
  onUnauthorizedRef.current = onUnauthorized;

  const load = useCallback(async () => {
    if (!isValidIso(date)) return;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    const options = { signal: current.signal };

    setState((previous) => ({ ...previous, status: previous.loadedAt ? 'refreshing' : 'loading', error: null }));
    try {
      const [{ items }, mine] = await Promise.all([
        api.listAllSpots({ date }, options),
        isEmployee ? api.myReservations({ page: 1, pageSize: 100 }, options) : Promise.resolve(null),
      ]);
      if (current.signal.aborted) return;
      setState({ status: 'ready', spots: items, mine: mine?.items ?? [], error: null, loadedAt: new Date() });
    } catch (error) {
      if (isAbort(error) || current.signal.aborted) return;
      if (error.isUnauthorized) return onUnauthorizedRef.current?.();
      setState((previous) => ({ ...previous, status: 'error', error }));
    }
  }, [api, date, isEmployee]);

  useEffect(() => {
    load();
    return () => controller.current?.abort();
  }, [load]);

  return { ...state, refresh: load };
}

// date -> קבוצת מזהי מקומות שההזמנה הפעילה שלי עליהם
export function indexMine(reservations) {
  const byDate = new Map();
  for (const reservation of reservations) {
    if (reservation.status !== 'Active') continue;
    if (!byDate.has(reservation.date)) byDate.set(reservation.date, new Set());
    byDate.get(reservation.date).add(reservation.parkingSpot.id);
  }
  return byDate;
}

// רשימת המאפיינים (נגיש, מקורה, טעינה). נטענת פעם אחת. כישלון אינו חוסם את המפה: סינון לפי מאפיין פשוט לא יוצג
export function useFeatures(api) {
  const [features, setFeatures] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    api
      .listFeatures({ signal: controller.signal })
      .then(setFeatures)
      .catch((error) => {
        if (!isAbort(error)) setFeatures([]);
      });
    return () => controller.abort();
  }, [api]);
  return features;
}
