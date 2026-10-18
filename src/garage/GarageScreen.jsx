import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, List, Map as MapIcon, RefreshCw, Search } from 'lucide-react';
import { explainError } from '../errors.js';
import { conflictMessage } from '../errors.js';
import { formatLong, formatShort, isoDate, isValidIso } from '../lib/dates.js';
import { Button, EmptyState, Skeleton } from '../components/ui.jsx';
import Notice from '../components/Notice.jsx';
import { useToast } from '../components/Toasts.jsx';
import GarageMap, { STATE_LABEL } from './GarageMap.jsx';
import SpotPanel from './SpotPanel.jsx';
import FeatureShowcase from './FeatureShowcase.jsx';
import { Plate, SignNoEntry } from '../components/Signs.jsx';
import AvailabilityBoard from './AvailabilityBoard.jsx';
import { countStates, floorLabel, floorShort, groupByFloor, spotState, STATE } from './layout.js';
import { indexMine, useFeatures, useGarage } from './useGarage.js';

const LEGEND = [STATE.AVAILABLE, STATE.OCCUPIED, STATE.UNAVAILABLE, STATE.MINE];

export default function GarageScreen({ api, session, onUnauthorized }) {
  const isEmployee = session.role === 'Employee';
  const toast = useToast();

  const [date, setDate] = useState(() => isoDate(0));
  const [view, setView] = useState('map');
  const [floor, setFloor] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [featureId, setFeatureId] = useState('');
  const [onlyFree, setOnlyFree] = useState(false);

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState({ confirmation: null, conflict: null, error: null });
  const submitting = useRef(false);

  const garage = useGarage({ api, date, isEmployee, onUnauthorized });
  const features = useFeatures(api);
  const mineByDate = useMemo(() => indexMine(garage.mine), [garage.mine]);
  const options = useMemo(() => ({ date, mineByDate }), [date, mineByDate]);

  const floors = useMemo(() => groupByFloor(garage.spots), [garage.spots]);
  const counts = useMemo(() => countStates(garage.spots, options), [garage.spots, options]);

  // קומה ראשונית: הקומה העליונה שיש בה מקום פנוי, כדי שהמשתמש יראה מיד משהו שאפשר להזמין
  useEffect(() => {
    if (floors.length === 0) return;
    if (floor === null || !floors.some((group) => group.floor === floor)) {
      const withFree = floors.find((group) => group.spots.some((spot) => spotState(spot, options) === STATE.AVAILABLE));
      setFloor((withFree ?? floors[0]).floor);
    }
  }, [floors, floor, options]);

  const currentFloor = floors.find((group) => group.floor === floor);
  const selected = garage.spots.find((spot) => spot.id === selectedId) ?? null;
  const selectedState = selected ? spotState(selected, options) : null;
  const myReservation = selected && garage.mine.find((r) => r.status === 'Active' && r.date === date && r.parkingSpot.id === selected.id);

  const query = search.trim().toLowerCase();
  const filtering = Boolean(query) || Boolean(featureId) || onlyFree;
  const matches = filtering
    ? (spot) =>
        (!query || spot.code.toLowerCase().includes(query)) &&
        (!featureId || spot.features.some((feature) => String(feature.id) === featureId)) &&
        (!onlyFree || spotState(spot, options) === STATE.AVAILABLE)
    : null;
  const matchCount = matches ? garage.spots.filter(matches).length : null;

  function select(id) {
    setSelectedId(id);
    setResult({ confirmation: null, conflict: null, error: null });
  }

  function changeDate(next) {
    if (!isValidIso(next)) return;
    setDate(next);
    select(null);
  }

  // הזמנה: שומרים מפני לחיצה כפולה, מציגים תוצאה אמיתית מהשרת, ובכל מקרה מרעננים את הנתונים
  async function reserve(spot) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setResult({ confirmation: null, conflict: null, error: null });
    try {
      const { reservation } = await api.reserve(spot.id, date);
      setResult({ confirmation: { reservation }, conflict: null, error: null });
      toast({ type: 'success', text: `המקום ${spot.code} הוזמן ל-${formatShort(date)}.` });
    } catch (caught) {
      if (caught.isUnauthorized) return onUnauthorized();
      const explained = explainError(caught);
      if (caught.isConflict) {
        setResult({ confirmation: null, conflict: { ...explained, message: conflictMessage(caught) }, error: null });
      } else {
        setResult({ confirmation: null, conflict: null, error: explained });
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
    garage.refresh();
  }

  async function cancel(reservation) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      await api.cancelReservation(reservation.id);
      toast({ type: 'success', text: `ההזמנה של ${reservation.parkingSpot.code} ל-${formatShort(reservation.date)} בוטלה והמקום התפנה.` });
      setResult({ confirmation: null, conflict: null, error: null });
    } catch (caught) {
      if (caught.isUnauthorized) return onUnauthorized();
      setResult({ confirmation: null, conflict: null, error: explainError(caught) });
    } finally {
      submitting.current = false;
      setBusy(false);
    }
    garage.refresh();
  }

  const loading = garage.status === 'loading';
  const hasSelection = Boolean(selected) || Boolean(result.confirmation);

  return (
    <div className="garage-screen">
      <section className="hero-strip">
        <div className="hero-copy">
          <p className="eyebrow">{isEmployee ? 'הזמנת חניה ליום אחד' : 'מבט מנהל על החניון'}</p>
          <h1>{isEmployee ? 'בחרו יום, בחרו מקום.' : 'כל מקומות החניון, ליום שנבחר.'}</h1>
          <p className="muted">
            {isEmployee
              ? 'הציור מראה את מצב המקומות בתאריך שבחרתם, כפי שהשרת מדווח.'
              : 'מנהל רואה את המצב ומנהל מקומות במסך "ניהול מקומות". הזמנות מתבצעות על ידי עובדים בלבד.'}
          </p>
        </div>
        <AvailabilityBoard counts={counts} spots={garage.spots} options={options} loading={loading} />
      </section>

      <section className="controls" aria-label="בחירת תאריך וסינון">
        <div className="date-block">
          <label className="date-input">
            <CalendarDays size={16} aria-hidden="true" />
            <span className="sr-only">תאריך</span>
            <input type="date" value={date} min={isoDate(0)} onChange={(event) => changeDate(event.target.value)} />
          </label>
          <p className="date-text">
            {date === isoDate(0) ? 'היום, ' : ''}
            {formatLong(date)}
          </p>
          <Button variant="ghost" icon={RefreshCw} busy={garage.status === 'refreshing'} busyText="מרענן..." onClick={garage.refresh} title="טוען מחדש את מצב המקומות מהשרת">
            רענון נתונים
          </Button>
          {date !== isoDate(0) && (
            <button type="button" className="link-btn" onClick={() => changeDate(isoDate(0))}>
              חזרה להיום
            </button>
          )}
        </div>

        <div className="filter-row">
          <label className="search">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">חיפוש לפי קוד</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={20} placeholder="חיפוש קוד, למשל G-02" />
          </label>
          <label className="toggle">
            <input type="checkbox" checked={onlyFree} onChange={(event) => setOnlyFree(event.target.checked)} />
            <span>רק פנויים</span>
          </label>
          <div className="view-switch" role="group" aria-label="תצוגה">
            <button type="button" className={view === 'map' ? 'is-active' : ''} aria-pressed={view === 'map'} onClick={() => setView('map')}>
              <MapIcon size={16} aria-hidden="true" /> תוכנית
            </button>
            <button type="button" className={view === 'list' ? 'is-active' : ''} aria-pressed={view === 'list'} onClick={() => setView('list')}>
              <List size={16} aria-hidden="true" /> רשימה
            </button>
          </div>
        </div>
        {matches && (
          <p className="muted filter-note" role="status">
            {matchCount === 0 ? 'אין מקומות שמתאימים לסינון.' : `${matchCount} מקומות מתאימים לסינון. השאר מעומעמים בתוכנית.`}
          </p>
        )}
      </section>

      <FeatureShowcase features={features} spots={garage.spots} options={options} activeId={featureId} onPick={setFeatureId} />

      {garage.status === 'error' && (
        <Notice tone={explainError(garage.error).tone} {...explainError(garage.error)}>
          <Button variant="ghost" icon={RefreshCw} onClick={garage.refresh}>לנסות שוב</Button>
        </Notice>
      )}

      <div className={`stage ${hasSelection ? 'has-selection' : ''}`}>
        <section className="plan" aria-label="תוכנית החניון">
          {loading && <Skeleton className="plan-skeleton" />}

          {!loading && garage.status !== 'error' && garage.spots.length === 0 && (
            <EmptyState icon={SignNoEntry} title="אין מקומות חניה במערכת">
              {session.role === 'Admin' ? 'אפשר להוסיף מקומות במסך "ניהול מקומות".' : 'מנהל צריך להוסיף מקומות כדי שיהיה אפשר להזמין.'}
            </EmptyState>
          )}

          {floors.length > 0 && (
            <>
              <div className="floor-tabs" role="tablist" aria-label="קומות">
                {floors.map((group) => {
                  const free = group.spots.filter((spot) => spotState(spot, options) === STATE.AVAILABLE).length;
                  return (
                    <button
                      key={group.floor}
                      type="button"
                      role="tab"
                      aria-selected={group.floor === floor}
                      className={`floor-tab ${group.floor === floor ? 'is-active' : ''}`}
                      onClick={() => setFloor(group.floor)}
                    >
                      <span className="floor-num" aria-hidden="true">{floorShort(group.floor)}</span>
                      <span className="floor-name">{group.label}</span>
                      <span className="floor-free">{free} פנויים</span>
                    </button>
                  );
                })}
              </div>

              {view === 'map' && currentFloor && (
                <GarageMap
                  floor={currentFloor.floor}
                  spots={currentFloor.spots}
                  date={date}
                  mineByDate={mineByDate}
                  selectedId={selectedId}
                  onSelect={select}
                  matches={matches}
                />
              )}
              {view === 'list' && <SpotList floors={floors} options={options} selectedId={selectedId} onSelect={select} matches={matches} />}

              <Legend counts={counts} />
              <p className="honesty">
                <RefreshCw size={14} aria-hidden="true" />
                {garage.loadedAt ? `הנתונים נטענו מהשרת ב-${garage.loadedAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}.` : ''} המצב אינו מתעדכן בזמן אמת: לחצו "רענון נתונים" כדי לראות שינויים של אחרים. הציור סכמטי ואינו מייצג מיקום פיזי.
              </p>
            </>
          )}
        </section>

        <SpotPanel
          spot={selected}
          state={selectedState}
          date={date}
          role={session.role}
          myReservation={myReservation}
          confirmation={result.confirmation}
          conflict={result.conflict}
          error={result.error}
          busy={busy}
          onReserve={reserve}
          onCancel={cancel}
          onClose={() => select(null)}
          onDismissResult={() => select(null)}
        />
      </div>
    </div>
  );
}

function Legend({ counts }) {
  return (
    <ul className="legend" aria-label="מקרא">
      {LEGEND.map((state) => (
        <li key={state}>
          <i className={`swatch swatch-${state}`} aria-hidden="true" />
          {STATE_LABEL[state]}
          <span className="muted"> ({counts[state]})</span>
        </li>
      ))}
      <li><i className="swatch swatch-selected" aria-hidden="true" />נבחר</li>
    </ul>
  );
}

// חלופה נגישה למפה: אותם מקומות אמיתיים, ברשימה שאפשר לעבור עליה במקלדת ובקורא מסך
function SpotList({ floors, options, selectedId, onSelect, matches }) {
  return (
    <div className="spot-list">
      {floors.map((group) => (
        <section key={group.floor}>
          <h3>{floorLabel(group.floor)}</h3>
          <ul>
            {group.spots.map((spot) => {
              const state = spotState(spot, options);
              const dimmed = matches ? !matches(spot) : false;
              return (
                <li key={spot.id} className={dimmed ? 'is-dimmed' : ''}>
                  <button type="button" className={`row-btn ${spot.id === selectedId ? 'is-selected' : ''}`} aria-pressed={spot.id === selectedId} onClick={() => onSelect(spot.id)}>
                    <span className="row-code"><Plate text={spot.code} size="sm" /></span>
                    <span className="row-feat">{spot.features.map((feature) => feature.name).join(' · ') || '—'}</span>
                    <span className={`state-pill pill-${state}`}>{STATE_LABEL[state]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
