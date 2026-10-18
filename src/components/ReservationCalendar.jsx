import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isoDate, toIso } from '../lib/dates.js';

const WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const monthName = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' });

// ימי החודש כרשת של שבועות (ראשון עד שבת). מחזיר תאים ריקים בתחילת החודש ליישור
export function buildMonth(year, month) {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: first.getDay() }, () => null);
  for (let day = 1; day <= days; day += 1) cells.push(toIso(new Date(year, month, day)));
  return cells;
}

// לוח חודשי של ההזמנות הפעילות של העובד. כל יום עם הזמנה הוא כפתור שפותח את פרטיה.
// הנתונים הם ההזמנות שהשרת החזיר (עד 100 האחרונות), ולא מידע נוסף
export default function ReservationCalendar({ reservations, onPick }) {
  const today = isoDate(0);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const byDate = useMemo(() => {
    const map = new Map();
    for (const reservation of reservations) {
      if (reservation.status === 'Active') map.set(reservation.date, reservation);
    }
    return map;
  }, [reservations]);

  const cells = buildMonth(cursor.year, cursor.month);
  const shift = (delta) => {
    const next = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  };

  return (
    <section className="calendar" aria-label="לוח הזמנות חודשי">
      <header className="calendar-head">
        <button type="button" className="icon-btn bordered" onClick={() => shift(-1)} aria-label="החודש הקודם">
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <h2>{monthName.format(new Date(cursor.year, cursor.month, 1))}</h2>
        <button type="button" className="icon-btn bordered" onClick={() => shift(1)} aria-label="החודש הבא">
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
      </header>

      <div className="calendar-grid" role="grid">
        {WEEKDAYS.map((name) => (
          <span key={name} className="calendar-weekday" role="columnheader">{name}</span>
        ))}
        {cells.map((iso, index) => {
          if (!iso) return <span key={`blank-${index}`} className="calendar-cell is-blank" role="gridcell" />;
          const reservation = byDate.get(iso);
          const classes = `calendar-cell ${iso === today ? 'is-today' : ''} ${iso < today ? 'is-past' : ''} ${reservation ? 'has-reservation' : ''}`;
          const day = Number(iso.slice(8));
          return reservation ? (
            <button
              key={iso}
              type="button"
              role="gridcell"
              className={classes}
              onClick={() => onPick(reservation)}
              aria-label={`${day} בחודש, הזמנה למקום ${reservation.parkingSpot.code}`}
            >
              <span>{day}</span>
              <small className="mono">{reservation.parkingSpot.code}</small>
            </button>
          ) : (
            <span key={iso} role="gridcell" className={classes}><span>{day}</span></span>
          );
        })}
      </div>
      <p className="calendar-note muted">
        <i className="swatch swatch-mine" aria-hidden="true" /> יום עם הזמנה פעילה. לחיצה פותחת את הפרטים.
      </p>
    </section>
  );
}
