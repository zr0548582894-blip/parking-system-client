import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarX2, Ticket } from 'lucide-react';
import { isAbort } from '../api.js';
import { explainError } from '../errors.js';
import { formatLong, formatStamp, isoDate } from '../lib/dates.js';
import { floorLabel } from '../garage/layout.js';
import { Button, Dialog, EmptyState, Skeleton } from '../components/ui.jsx';
import Notice from '../components/Notice.jsx';
import Pagination from '../components/Pagination.jsx';
import PageHero from '../components/PageHero.jsx';
import { Plate } from '../components/Signs.jsx';
import ReservationCalendar from '../components/ReservationCalendar.jsx';
import carLevel from '../assets/car-level.jpg';
import evOutdoor from '../assets/ev-outdoor.jpg';
import { useToast } from '../components/Toasts.jsx';

const PAGE_SIZE = 6;
const STATUS = { Active: 'פעילה', Cancelled: 'בוטלה' };

// ההזמנות של העובד (GET /api/reservations/mine), עם pagination מהשרת, פרטי הזמנה וביטול (DELETE).
// השרת אינו תומך בעדכון הזמנה: כדי לשנות מבטלים ומזמינים מחדש, וכך מנוסח הדבר כאן
export default function MyReservationsScreen({ api, onUnauthorized, onNavigate }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [calendarItems, setCalendarItems] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);
  const controller = useRef(null);
  const toast = useToast();
  const today = isoDate(0);

  const load = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setLoading(true);
    try {
      // הרשימה בעמודים, ובמקביל עד 100 ההזמנות האחרונות עבור הלוח החודשי
      const [data, recent] = await Promise.all([
        api.myReservations({ page, pageSize: PAGE_SIZE }, { signal: current.signal }),
        api.myReservations({ page: 1, pageSize: 100 }, { signal: current.signal }),
      ]);
      if (current.signal.aborted) return;
      setResult(data);
      setCalendarItems(recent.items);
      setError(null);
      // אחרי ביטול העמוד האחרון יכול להתרוקן: חוזרים לעמוד האחרון שקיים
      if (data.items.length === 0 && data.totalPages > 0 && page > data.totalPages) setPage(data.totalPages);
    } catch (caught) {
      if (isAbort(caught)) return;
      if (caught.isUnauthorized) return onUnauthorized();
      setError(explainError(caught));
    } finally {
      if (!current.signal.aborted) setLoading(false);
    }
  }, [api, page, onUnauthorized]);

  useEffect(() => {
    load();
    return () => controller.current?.abort();
  }, [load]);

  async function openDetails(reservation) {
    setDetails({ reservation, fresh: false });
    try {
      // GET /api/reservations/{id}: פרטים עדכניים מהשרת (הבעלים או מנהל בלבד)
      setDetails({ reservation: await api.getReservation(reservation.id), fresh: true });
    } catch (caught) {
      if (caught.isUnauthorized) return onUnauthorized();
      setDetails({ reservation, fresh: false, error: explainError(caught) });
    }
  }

  async function confirmCancel() {
    if (busy) return;
    setBusy(true);
    const reservation = confirming;
    try {
      await api.cancelReservation(reservation.id);
      toast({ type: 'success', text: `ההזמנה של ${reservation.parkingSpot.code} ל${formatLong(reservation.date)} בוטלה. המקום התפנה.` });
    } catch (caught) {
      if (caught.isUnauthorized) return onUnauthorized();
      toast({ type: 'error', ...explainError(caught) });
    } finally {
      setBusy(false);
      setConfirming(null);
    }
    load();
  }

  return (
    <div className="page">
      <PageHero image={carLevel} position="center 60%" eyebrow="העובד" title="ההזמנות שלי">
        כל ההזמנות שלך, מהחדשה לישנה. ביטול משחרר את המקום לאחרים. עדכון הזמנה אינו נתמך בשרת: מבטלים ומזמינים מחדש.
      </PageHero>

      {error && <Notice tone={error.tone} message={error.message} details={error.details} hint={error.hint} correlationId={error.correlationId} />}

      {loading && !result && (
        <div className="res-list">
          {[0, 1, 2].map((key) => <Skeleton key={key} className="res-skeleton" />)}
        </div>
      )}

      {result && result.items.length === 0 && (
        <EmptyState image={evOutdoor} icon={Ticket} title="עדיין אין הזמנות" action={<Button onClick={() => onNavigate('/')}>לבחירת מקום חניה</Button>}>
          הזמנה ראשונה לוקחת פחות מדקה.
        </EmptyState>
      )}

      {result && result.items.length > 0 && (
        <div className="res-layout">
          <div>
          <ul className="res-list" aria-busy={loading}>
            {result.items.map((reservation) => {
              const active = reservation.status === 'Active';
              const upcoming = active && reservation.date >= today;
              return (
                <li key={reservation.id} className={`res-card ${active ? '' : 'is-cancelled'}`}>
                  <div className="res-date">
                    <strong>{reservation.date.slice(8, 10)}</strong>
                    <span>{formatLong(reservation.date).split(' ')[3]}</span>
                  </div>
                  <div className="res-main">
                    <h3><Plate text={reservation.parkingSpot.code} size="md" /></h3>
                    <p className="muted">{floorLabel(reservation.parkingSpot.floor)} · {formatLong(reservation.date).split(',')[0]}</p>
                    <span className={`state-pill ${active ? (upcoming ? 'pill-available' : 'pill-unknown') : 'pill-unavailable'}`}>
                      {active ? (upcoming ? 'פעילה' : 'הסתיימה') : STATUS[reservation.status] ?? reservation.status}
                    </span>
                  </div>
                  <div className="res-actions">
                    <Button variant="ghost" onClick={() => openDetails(reservation)}>פרטים</Button>
                    {active && upcoming && (
                      <Button variant="danger" icon={CalendarX2} onClick={() => setConfirming(reservation)}>ביטול</Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination page={result.page} totalPages={result.totalPages} totalCount={result.totalCount} onChange={setPage} />
          </div>
          <ReservationCalendar reservations={calendarItems} onPick={openDetails} />
        </div>
      )}

      <Dialog open={Boolean(confirming)} onClose={() => !busy && setConfirming(null)} title="לבטל את ההזמנה?">
        {confirming && (
          <>
            <p>
              המקום <bdi>{confirming.parkingSpot.code}</bdi> ל{formatLong(confirming.date)} ישוחרר ויהיה פנוי לעובדים אחרים. ההזמנה תישמר בהיסטוריה כמבוטלת.
            </p>
            <div className="dialog-actions">
              <Button variant="danger" busy={busy} busyText="מבטל..." onClick={confirmCancel}>כן, לבטל</Button>
              <Button variant="ghost" disabled={busy} onClick={() => setConfirming(null)}>השארת ההזמנה</Button>
            </div>
          </>
        )}
      </Dialog>

      <Dialog open={Boolean(details)} onClose={() => setDetails(null)} title="פרטי הזמנה">
        {details && (
          <>
            {details.error && <Notice tone={details.error.tone} message={details.error.message} hint={details.error.hint} />}
            <dl className="facts">
              <div><dt>מספר הזמנה</dt><dd><bdi>#{details.reservation.id}</bdi></dd></div>
              <div><dt>מקום</dt><dd><bdi>{details.reservation.parkingSpot.code}</bdi>, {floorLabel(details.reservation.parkingSpot.floor)}</dd></div>
              <div><dt>תאריך</dt><dd>{formatLong(details.reservation.date)}</dd></div>
              <div><dt>סטטוס</dt><dd>{STATUS[details.reservation.status] ?? details.reservation.status}</dd></div>
              <div><dt>נוצרה</dt><dd><bdi>{formatStamp(details.reservation.createdAtUtc)}</bdi></dd></div>
              <div><dt>על שם</dt><dd>{details.reservation.userFullName}</dd></div>
            </dl>
            <p className="muted">{details.fresh ? 'הפרטים נטענו כעת מהשרת.' : 'מציג את הפרטים מהרשימה...'}</p>
          </>
        )}
      </Dialog>
    </div>
  );
}
