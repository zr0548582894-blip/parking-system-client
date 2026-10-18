import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarX2, ClipboardList } from 'lucide-react';
import { isAbort } from '../api.js';
import { explainError } from '../errors.js';
import { formatShort, formatStamp, isoDate } from '../lib/dates.js';
import { floorLabel } from '../garage/layout.js';
import { Button, Dialog, EmptyState, Skeleton } from '../components/ui.jsx';
import Notice from '../components/Notice.jsx';
import Pagination from '../components/Pagination.jsx';
import PageHero from '../components/PageHero.jsx';
import { Plate } from '../components/Signs.jsx';
import carLevel from '../assets/car-level.jpg';
import { useToast } from '../components/Toasts.jsx';

const PAGE_SIZE = 10;

// כל ההזמנות במערכת (GET /api/reservations, מנהל בלבד), מהחדשה לישנה, עם עימוד מהשרת.
// השרת אינו מציע סינון הזמנות, ולכן אין כאן סינון מזויף: רק עימוד וביטול (DELETE מותר גם למנהל)
export default function AdminReservationsScreen({ api, onUnauthorized }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
      const data = await api.allReservations({ page, pageSize: PAGE_SIZE }, { signal: current.signal });
      if (current.signal.aborted) return;
      setResult(data);
      setError(null);
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

  async function confirmCancel() {
    if (busy) return;
    setBusy(true);
    const reservation = confirming;
    try {
      await api.cancelReservation(reservation.id);
      toast({ type: 'success', text: `ההזמנה #${reservation.id} של ${reservation.userFullName} בוטלה.` });
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
      <PageHero image={carLevel} position="center 55%" eyebrow="מנהל" title="כל ההזמנות">
        מבט על ההזמנות של כל העובדים, מהחדשה לישנה.
      </PageHero>

      {error && <Notice tone={error.tone} message={error.message} details={error.details} hint={error.hint} correlationId={error.correlationId} />}
      {loading && !result && <Skeleton className="table-skeleton" />}

      {result && result.items.length === 0 && <EmptyState icon={ClipboardList} title="עדיין אין הזמנות">כשעובדים יזמינו מקומות, ההזמנות יופיעו כאן.</EmptyState>}

      {result && result.items.length > 0 && (
        <>
          <div className="table-wrap" aria-busy={loading}>
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">מס'</th>
                  <th scope="col">תאריך</th>
                  <th scope="col">עובד</th>
                  <th scope="col">מקום</th>
                  <th scope="col">סטטוס</th>
                  <th scope="col">נוצרה</th>
                  <th scope="col"><span className="sr-only">פעולות</span></th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((reservation) => {
                  const active = reservation.status === 'Active';
                  return (
                    <tr key={reservation.id}>
                      <td data-label="מס'"><bdi>#{reservation.id}</bdi></td>
                      <td data-label="תאריך">{formatShort(reservation.date)} <span className="muted"><bdi>{reservation.date.slice(0, 4)}</bdi></span></td>
                      <td data-label="עובד">{reservation.userFullName}</td>
                      <td data-label="מקום"><Plate text={reservation.parkingSpot.code} size="sm" /> <span className="muted">{floorLabel(reservation.parkingSpot.floor)}</span></td>
                      <td data-label="סטטוס"><span className={`state-pill ${active ? 'pill-available' : 'pill-unavailable'}`}>{active ? 'פעילה' : 'בוטלה'}</span></td>
                      <td data-label="נוצרה" className="muted"><bdi>{formatStamp(reservation.createdAtUtc)}</bdi></td>
                      <td className="row-actions">
                        {active && reservation.date >= today && (
                          <button type="button" className="icon-btn bordered danger" onClick={() => setConfirming(reservation)} aria-label={`ביטול הזמנה ${reservation.id}`}>
                            <CalendarX2 size={17} aria-hidden="true" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={result.page} totalPages={result.totalPages} totalCount={result.totalCount} onChange={setPage} />
        </>
      )}

      <Dialog open={Boolean(confirming)} onClose={() => !busy && setConfirming(null)} title="לבטל את ההזמנה?">
        {confirming && (
          <>
            <p>ההזמנה של {confirming.userFullName} למקום <bdi className="mono">{confirming.parkingSpot.code}</bdi> ב-{formatShort(confirming.date)} תבוטל והמקום יתפנה.</p>
            <div className="dialog-actions">
              <Button variant="danger" busy={busy} busyText="מבטל..." onClick={confirmCancel}>כן, לבטל</Button>
              <Button variant="ghost" disabled={busy} onClick={() => setConfirming(null)}>סגירה</Button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
