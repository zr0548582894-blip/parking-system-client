import { useState } from 'react';
import { CalendarCheck, CarFront, CheckCircle2, ChevronDown, Lock, MapPin, Ticket, X } from 'lucide-react';
import { Button } from '../components/ui.jsx';
import rampImage from '../assets/ramp.jpg';
import { FeatureSign, Plate, SignNoEntry } from '../components/Signs.jsx';
import Notice from '../components/Notice.jsx';
import { formatLong, formatStamp } from '../lib/dates.js';
import { floorLabel, featureKind, STATE } from './layout.js';
import { STATE_LABEL } from './GarageMap.jsx';

const STATE_COPY = {
  [STATE.AVAILABLE]: 'המקום פנוי בתאריך הזה לפי נתוני השרת בעת הטעינה האחרונה.',
  [STATE.OCCUPIED]: 'למקום יש הזמנה פעילה בתאריך הזה. אפשר לבחור תאריך אחר או מקום אחר.',
  [STATE.UNAVAILABLE]: 'המקום הוצא מהשימוש על ידי מנהל, ולא ניתן להזמין אותו.',
  [STATE.MINE]: 'זו ההזמנה שלך בתאריך הזה.',
  [STATE.UNKNOWN]: 'השרת לא החזיר מצב למקום הזה.',
};

// לוח הפרטים של המקום שנבחר ושל תהליך ההזמנה.
// מציג רק שדות שהשרת באמת מחזיר: קוד, קומה, מאפיינים, מצב בתאריך. אין מחיר בשרת, ולכן אין מחיר כאן
export default function SpotPanel({ spot, state, date, role, myReservation, confirmation, conflict, error, busy, onReserve, onCancel, onClose, onDismissResult }) {
  const [expanded, setExpanded] = useState(false);

  if (confirmation) {
    const { reservation } = confirmation;
    return (
      <aside className="panel panel-success" aria-live="polite">
        <PanelClose onClose={onClose} />
        <div className="ticket">
          <CheckCircle2 className="ticket-check" size={38} strokeWidth={1.6} aria-hidden="true" />
          <p className="eyebrow">ההזמנה נקלטה בשרת</p>
          <h2 className="ticket-code"><Plate text={reservation.parkingSpot.code} size="lg" /></h2>
          <dl className="facts">
            <div><dt>תאריך</dt><dd>{formatLong(reservation.date)}</dd></div>
            <div><dt>קומה</dt><dd>{floorLabel(reservation.parkingSpot.floor)}</dd></div>
            <div><dt>מספר הזמנה</dt><dd><bdi>#{reservation.id}</bdi></dd></div>
            <div><dt>נוצרה</dt><dd><bdi>{formatStamp(reservation.createdAtUtc)}</bdi></dd></div>
          </dl>
          <p className="muted">אפשר לבטל את ההזמנה כל עוד היא פעילה, מהמסך הזה או מ"ההזמנות שלי".</p>
          <Button variant="ghost" onClick={onDismissResult}>בחירת מקום נוסף</Button>
        </div>
      </aside>
    );
  }

  if (!spot) {
    return (
      <aside className="panel panel-idle">
        <img src={rampImage} alt="" className="panel-idle-img" loading="lazy" decoding="async" />
        <CarFront size={34} strokeWidth={1.3} aria-hidden="true" />
        <h2>בחרו מקום בתוכנית</h2>
        <p className="muted">לחיצה על מקום (או Tab ו-Enter במקלדת) תציג כאן את פרטיו ותאפשר להזמין אותו.</p>
      </aside>
    );
  }

  const isEmployee = role === 'Employee';
  const canReserve = isEmployee && state === STATE.AVAILABLE;

  return (
    <aside className={`panel ${expanded ? "is-expanded" : ""}`} aria-live="polite">
      <PanelClose onClose={onClose} />
      <p className="eyebrow">
        <MapPin size={14} aria-hidden="true" /> {floorLabel(spot.floor)}
      </p>
      <h2 className="panel-code"><Plate text={spot.code} size="lg" /></h2>
      <span className={`state-pill pill-${state}`}>
        {state === STATE.UNAVAILABLE && <SignNoEntry size={16} />} {STATE_LABEL[state]}
      </span>

      <button type="button" className="panel-toggle" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
        <ChevronDown size={16} aria-hidden="true" /> {expanded ? "פחות פרטים" : "עוד פרטים"}
      </button>

      <dl className="facts panel-extra">
        <div><dt>תאריך</dt><dd>{formatLong(date)}</dd></div>
        <div>
          <dt>מאפיינים</dt>
          <dd>
            {spot.features.length === 0 ? (
              'ללא מאפיינים מיוחדים'
            ) : (
              <span className="chips">
                {spot.features.map((feature) => (
                  <span key={feature.id} className={`chip chip-${featureKind(feature.name)}`}>
                    <FeatureSign kind={featureKind(feature.name)} size={18} /> {feature.name}
                  </span>
                ))}
              </span>
            )}
          </dd>
        </div>
      </dl>

      <p className="muted panel-extra">{STATE_COPY[state]}</p>

      {conflict && <Notice tone="conflict" message={conflict.message} hint={conflict.hint} correlationId={conflict.correlationId} />}
      {error && <Notice tone={error.tone} message={error.message} details={error.details} hint={error.hint} correlationId={error.correlationId} />}

      {role === 'Admin' && (
        <Notice type="info" text="מנהל מנהל את המקומות ואינו מזמין (השרת מחזיר 403 להזמנה של מנהל)." />
      )}

      {canReserve && (
        <Button icon={Ticket} busy={busy} busyText="שולח לשרת..." onClick={() => onReserve(spot)}>
          הזמנת <bdi>{spot.code}</bdi> ל-<bdi>{date.split('-').reverse().join('.')}</bdi>
        </Button>
      )}

      {state === STATE.MINE && myReservation && (
        <Button variant="danger" icon={CalendarCheck} busy={busy} busyText="מבטל..." onClick={() => onCancel(myReservation)}>
          ביטול ההזמנה
        </Button>
      )}

      {isEmployee && state === STATE.OCCUPIED && (
        <p className="panel-note"><Lock size={15} aria-hidden="true" /> אי אפשר להזמין מקום תפוס. בכל יום מותר לעובד להזמין מקום אחד בלבד.</p>
      )}
    </aside>
  );
}

function PanelClose({ onClose }) {
  return (
    <button type="button" className="icon-btn panel-close" onClick={onClose} aria-label="סגירת הפרטים">
      <X size={20} aria-hidden="true" />
    </button>
  );
}
