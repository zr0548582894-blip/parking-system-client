import { useCallback, useEffect, useState } from 'react';
import { describeError } from '../errors.js';
import Notice from '../components/Notice.jsx';
import Pagination from '../components/Pagination.jsx';

const PAGE_SIZE = 5;
const statusLabel = { Active: 'פעילה', Cancelled: 'בוטלה' };

// ההזמנות של המשתמש, עם pagination מהשרת, ואפשרות לבטל הזמנה פעילה (המקום מתפנה)
export default function MyReservationsScreen({ api, onUnauthorized }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    try {
      setResult(await api.myReservations({ page, pageSize: PAGE_SIZE }));
    } catch (error) {
      if (error.isUnauthorized) return onUnauthorized();
      setNotice({ type: 'error', ...describeError(error) });
    }
  }, [api, page, onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  async function cancel(reservation) {
    setNotice(null);
    try {
      await api.cancelReservation(reservation.id);
      setNotice({ type: 'success', text: `ההזמנה של ${reservation.parkingSpot.code} ב-${reservation.date} בוטלה.` });
    } catch (error) {
      if (error.isUnauthorized) return onUnauthorized();
      setNotice({ type: 'error', ...describeError(error) });
    }
    await load();
  }

  return (
    <section>
      {notice && <Notice {...notice} />}

      {result && (
        <>
          <table>
            <thead>
              <tr>
                <th>תאריך</th>
                <th>מקום</th>
                <th>קומה</th>
                <th>סטטוס</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {result.items.map((reservation) => (
                <tr key={reservation.id}>
                  <td>{reservation.date}</td>
                  <td>{reservation.parkingSpot.code}</td>
                  <td><bdi>{reservation.parkingSpot.floor}</bdi></td>
                  <td>{statusLabel[reservation.status] ?? reservation.status}</td>
                  <td>
                    {reservation.status === 'Active' && (
                      <button type="button" onClick={() => cancel(reservation)}>
                        ביטול
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {result.items.length === 0 && (
                <tr>
                  <td colSpan="5">עדיין אין הזמנות.</td>
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
