import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownAZ, ArrowUpAZ, Pencil, Plus, Search, Trash2, Warehouse } from 'lucide-react';
import { isAbort } from '../api.js';
import { explainError } from '../errors.js';
import { validateSpotForm } from '../lib/validation.js';
import { floorLabel, featureKind } from '../garage/layout.js';
import { useFeatures } from '../garage/useGarage.js';
import { Button, Dialog, EmptyState, Field, Skeleton } from '../components/ui.jsx';
import Notice from '../components/Notice.jsx';
import Pagination from '../components/Pagination.jsx';
import PageHero from '../components/PageHero.jsx';
import { FeatureSign, Plate } from '../components/Signs.jsx';
import evCharging from '../assets/ev-charging.jpg';
import { useToast } from '../components/Toasts.jsx';

const PAGE_SIZE = 8;
const EMPTY_FORM = { code: '', floor: '0', featureIds: [], isActive: true };

// ניהול מקומות (מנהל בלבד): GET/POST/PUT/DELETE /api/parking-spots. כל הסינון, המיון והעימוד בשרת.
// "מחיקה" בשרת היא הוצאה משימוש: המקום נשמר בהיסטוריה, ונחסם אם יש לו הזמנות עתידיות (409)
export default function AdminSpotsScreen({ api, onUnauthorized }) {
  const [filters, setFilters] = useState({ search: '', floor: '', featureId: '', isActive: '', sortBy: 'Code', sortDir: 'Asc' });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | spot
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const controller = useRef(null);
  const features = useFeatures(api);
  const toast = useToast();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search.trim()), 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const load = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setLoading(true);
    const floor = filters.floor === '' ? undefined : Number(filters.floor);
    try {
      const data = await api.listSpots(
        {
          page,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
          floor: Number.isInteger(floor) ? floor : undefined,
          featureId: filters.featureId,
          isActive: filters.isActive,
          sortBy: filters.sortBy,
          sortDir: filters.sortDir,
        },
        { signal: current.signal },
      );
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
  }, [api, page, debouncedSearch, filters.floor, filters.featureId, filters.isActive, filters.sortBy, filters.sortDir, onUnauthorized]);

  useEffect(() => {
    load();
    return () => controller.current?.abort();
  }, [load]);

  const setFilter = (field) => (event) => {
    setFilters((current) => ({ ...current, [field]: event.target.value }));
    setPage(1);
  };

  async function remove() {
    if (busy) return;
    setBusy(true);
    const spot = removing;
    try {
      await api.deleteSpot(spot.id);
      toast({ type: 'success', text: `המקום ${spot.code} הוצא משימוש ונשמר בהיסטוריה.` });
    } catch (caught) {
      if (caught.isUnauthorized) return onUnauthorized();
      toast({ type: caught.isConflict ? 'conflict' : 'error', ...explainError(caught) });
    } finally {
      setBusy(false);
      setRemoving(null);
    }
    load();
  }

  return (
    <div className="page">
      <PageHero
        image={evCharging}
        position="center 30%"
        eyebrow="מנהל"
        title="ניהול מקומות חניה"
        actions={<Button icon={Plus} onClick={() => setEditing('new')}>מקום חדש</Button>}
      >
        יצירה, עדכון והוצאה משימוש של מקומות. הסינון, המיון והעימוד מתבצעים בשרת.
      </PageHero>

      <section className="toolbar" aria-label="סינון">
        <label className="search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">חיפוש לפי קוד</span>
          <input value={filters.search} onChange={setFilter('search')} maxLength={20} placeholder="חיפוש לפי קוד" />
        </label>
        <input className="narrow" type="number" min="-10" max="100" value={filters.floor} onChange={setFilter('floor')} placeholder="קומה" aria-label="קומה" />
        <select value={filters.featureId} onChange={setFilter('featureId')} aria-label="מאפיין">
          <option value="">כל המאפיינים</option>
          {features.map((feature) => <option key={feature.id} value={feature.id}>{feature.name}</option>)}
        </select>
        <select value={filters.isActive} onChange={setFilter('isActive')} aria-label="סטטוס">
          <option value="">פעילים ולא פעילים</option>
          <option value="true">פעילים</option>
          <option value="false">לא פעילים</option>
        </select>
        <select value={filters.sortBy} onChange={setFilter('sortBy')} aria-label="מיון לפי">
          <option value="Code">מיון לפי קוד</option>
          <option value="Floor">מיון לפי קומה</option>
        </select>
        <button
          type="button"
          className="icon-btn bordered"
          aria-label={filters.sortDir === 'Asc' ? 'מיון עולה, לחיצה להפוך' : 'מיון יורד, לחיצה להפוך'}
          onClick={() => setFilters((current) => ({ ...current, sortDir: current.sortDir === 'Asc' ? 'Desc' : 'Asc' }))}
        >
          {filters.sortDir === 'Asc' ? <ArrowDownAZ size={18} aria-hidden="true" /> : <ArrowUpAZ size={18} aria-hidden="true" />}
        </button>
      </section>

      {error && <Notice tone={error.tone} message={error.message} details={error.details} hint={error.hint} correlationId={error.correlationId} />}
      {loading && !result && <Skeleton className="table-skeleton" />}

      {result && result.items.length === 0 && (
        <EmptyState icon={Warehouse} title="לא נמצאו מקומות">אין מקומות שמתאימים לסינון. אפשר לשנות את הסינון או להוסיף מקום חדש.</EmptyState>
      )}

      {result && result.items.length > 0 && (
        <>
          <div className="table-wrap" aria-busy={loading}>
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">קוד</th>
                  <th scope="col">קומה</th>
                  <th scope="col">מאפיינים</th>
                  <th scope="col">סטטוס</th>
                  <th scope="col"><span className="sr-only">פעולות</span></th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((spot) => (
                  <tr key={spot.id}>
                    <td data-label="קוד"><Plate text={spot.code} size="sm" /></td>
                    <td data-label="קומה">{floorLabel(spot.floor)}</td>
                    <td data-label="מאפיינים">
                      <span className="chips">
                        {spot.features.length === 0 && <span className="muted">—</span>}
                        {spot.features.map((feature) => <span key={feature.id} className={`chip chip-${featureKind(feature.name)}`}><FeatureSign kind={featureKind(feature.name)} size={16} /> {feature.name}</span>)}
                      </span>
                    </td>
                    <td data-label="סטטוס"><span className={`state-pill ${spot.isActive ? 'pill-available' : 'pill-unavailable'}`}>{spot.isActive ? 'פעיל' : 'לא פעיל'}</span></td>
                    <td className="row-actions">
                      <button type="button" className="icon-btn bordered" onClick={() => setEditing(spot)} aria-label={`עריכת ${spot.code}`}><Pencil size={17} aria-hidden="true" /></button>
                      {spot.isActive && (
                        <button type="button" className="icon-btn bordered danger" onClick={() => setRemoving(spot)} aria-label={`הוצאת ${spot.code} משימוש`}><Trash2 size={17} aria-hidden="true" /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={result.page} totalPages={result.totalPages} totalCount={result.totalCount} onChange={setPage} />
        </>
      )}

      <SpotFormDialog
        key={editing === 'new' ? 'new' : editing?.id ?? 'closed'}
        api={api}
        spot={editing}
        features={features}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(); }}
        onConflict={load}
        onUnauthorized={onUnauthorized}
      />

      <Dialog open={Boolean(removing)} onClose={() => !busy && setRemoving(null)} title="להוציא את המקום משימוש?">
        {removing && (
          <>
            <p>
              המקום <bdi className="mono">{removing.code}</bdi> יסומן כלא פעיל ולא יהיה אפשר להזמין אותו. הוא נשמר בהיסטוריה. אם יש לו הזמנות עתידיות, השרת יסרב.
            </p>
            <div className="dialog-actions">
              <Button variant="danger" busy={busy} busyText="מסיר..." onClick={remove}>הוצאה משימוש</Button>
              <Button variant="ghost" disabled={busy} onClick={() => setRemoving(null)}>ביטול</Button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}

function SpotFormDialog({ api, spot, features, onClose, onSaved, onConflict, onUnauthorized }) {
  const isNew = spot === 'new';
  const open = spot !== null;
  const initial = isNew || !spot
    ? EMPTY_FORM
    : { code: spot.code, floor: String(spot.floor), featureIds: spot.features.map((feature) => feature.id), isActive: spot.isActive };
  const [form, setForm] = useState(initial);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const errors = touched ? validateSpotForm(form) : {};

  function toggleFeature(id) {
    setForm((current) => ({
      ...current,
      featureIds: current.featureIds.includes(id) ? current.featureIds.filter((value) => value !== id) : [...current.featureIds, id],
    }));
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setTouched(true);
    if (Object.keys(validateSpotForm(form)).length > 0) return;

    const body = { code: form.code.trim(), floor: Number(form.floor), featureIds: form.featureIds };
    setBusy(true);
    setError(null);
    try {
      if (isNew) {
        await api.createSpot(body);
        toast({ type: 'success', text: `המקום ${body.code} נוצר.` });
      } else {
        await api.updateSpot(spot.id, { ...body, isActive: form.isActive });
        toast({ type: 'success', text: `המקום ${body.code} עודכן.` });
      }
      onSaved();
    } catch (caught) {
      if (caught.isUnauthorized) return onUnauthorized();
      setError(explainError(caught));
      // 409 (קוד תפוס או עדכון מקביל) ו-404: מרעננים כדי שהרשימה תציג את המצב העדכני
      if (caught.isConflict || caught.status === 404) onConflict();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={isNew ? 'מקום חניה חדש' : `עריכת ${spot?.code ?? ''}`}>
      <form onSubmit={submit} noValidate className="stack">
        <Field label="קוד המקום" hint="ייחודי, עד 20 תווים, למשל G-06" error={errors.code}>
          <input className="mono" dir="ltr" value={form.code} maxLength={20} onChange={(event) => setForm({ ...form, code: event.target.value })} aria-invalid={Boolean(errors.code)} />
        </Field>
        <Field label="קומה" hint="-1 = מרתף, 0 = קרקע. בין -10 ל-100" error={errors.floor}>
          <input type="number" value={form.floor} onChange={(event) => setForm({ ...form, floor: event.target.value })} aria-invalid={Boolean(errors.floor)} />
        </Field>
        <fieldset className="field">
          <legend className="field-label">מאפיינים</legend>
          <div className="check-grid">
            {features.length === 0 && <span className="muted">לא נטענו מאפיינים מהשרת.</span>}
            {features.map((feature) => (
              <label key={feature.id} className="toggle">
                <input type="checkbox" checked={form.featureIds.includes(feature.id)} onChange={() => toggleFeature(feature.id)} />
                <span>{feature.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {!isNew && (
          <label className="toggle">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
            <span>המקום פעיל וניתן להזמנה</span>
          </label>
        )}
        {error && <Notice tone={error.tone} message={error.message} details={error.details} hint={error.hint} correlationId={error.correlationId} />}
        <div className="dialog-actions">
          <Button type="submit" busy={busy} busyText="שומר...">{isNew ? 'יצירת מקום' : 'שמירה'}</Button>
          <Button variant="ghost" disabled={busy} onClick={onClose}>ביטול</Button>
        </div>
      </form>
    </Dialog>
  );
}
