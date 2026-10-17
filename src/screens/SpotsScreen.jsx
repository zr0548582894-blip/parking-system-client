import { useCallback, useEffect, useState } from 'react';
import { conflictMessage, describeError } from '../errors.js';
import Notice from '../components/Notice.jsx';
import Pagination from '../components/Pagination.jsx';

const PAGE_SIZE = 5;

function isoDate(daysFromToday) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// מסך 2: רשימת מקומות עם pagination אמיתי מול השרת
// מסך 3: הזמנת מקום (הפעולה על המשאב המוגבל)
// מסך 4: הודעה ברורה כשהשרת עונה 409 (המקום נתפס)
export default function SpotsScreen({ api, session, onUnauthorized }) {
  const [date, setDate] = useState(() => isoDate(1));
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [reservingId, setReservingId] = useState(null);

  const canReserve = session.role === 'Employee';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // כל עמוד נטען מהשרת בנפרד: ה-pagination, הסינון והמיון מתבצעים בבסיס הנתונים
      setResult(await api.listSpots({ page, pageSize: PAGE_SIZE, date, available: onlyAvailable || undefined }));
    } catch (error) {
      if (error.isUnauthorized) return onUnauthorized();
      setNotice({ type: 'error', ...describeError(error) });
    } finally {
      setLoading(false);
    }
  }, [api, page, date, onlyAvailable, onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  async function reserve(spot) {
    setReservingId(spot.id);
    setNotice(null);
    try {
      await api.reserve(spot.id, date);
      setNotice({ type: 'success', text: `המקום ${spot.code} הוזמן בהצלחה ל-${date}.` });
    } catch (error) {
      if (error.isUnauthorized) return onUnauthorized();

      if (error.isConflict) {
        // 409: מישהו אחר הקדים אותך (או שכבר יש לך הזמנה באותו יום). מציגים הודעה ברורה ומרעננים את הרשימה
        setNotice({ type: 'conflict', text: conflictMessage(error) });
      } else {
        setNotice({ type: 'error', ...describeError(error) });
      }
    } finally {
      setReservingId(null);
    }
    await load();
  }

  return (
    <section>
      <div className="filters">
        <label>
          תאריך
          <input
            type="date"
            value={date}
            min={isoDate(0)}
            onChange={(event) => {
              setDate(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(event) => {
              setOnlyAvailable(event.target.checked);
              setPage(1);
            }}
          />
          רק מקומות פנויים
        </label>
      </div>

      {!canReserve && <Notice type="info" text="מנהל מנהל את המקומות ואינו מזמין. כדי להזמין, התחברי כעובד." />}
      {notice && <Notice {...notice} />}

      {loading && !result && <p>טוען...</p>}

      {result && (
        <>
          <table>
            <thead>
              <tr>
                <th>קוד</th>
                <th>קומה</th>
                <th>מאפיינים</th>
                <th>מצב ב-{date}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {result.items.map((spot) => (
                <tr key={spot.id}>
                  <td>{spot.code}</td>
                  <td><bdi>{spot.floor}</bdi></td>
                  <td>{spot.features.map((feature) => feature.name).join(', ') || '-'}</td>
                  <td className={spot.isAvailable ? 'free' : 'taken'}>{spot.isAvailable ? 'פנוי' : 'תפוס'}</td>
                  <td>
                    <button
                      type="button"
                      disabled={!canReserve || !spot.isAvailable || reservingId === spot.id}
                      onClick={() => reserve(spot)}
                    >
                      {reservingId === spot.id ? 'מזמין...' : 'הזמן'}
                    </button>
                  </td>
                </tr>
              ))}
              {result.items.length === 0 && (
                <tr>
                  <td colSpan="5">אין מקומות להצגה בתאריך הזה.</td>
                </tr>
              )}
            </tbody>
          </table>

          <Pagination page={result.page} totalPages={result.totalPages} totalCount={result.totalCount} onChange={setPage} />
        </>
      )}
    </section>
  );
}
