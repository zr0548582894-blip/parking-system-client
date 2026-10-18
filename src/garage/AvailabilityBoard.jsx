import { SignParking } from '../components/Signs.jsx';
import { useCountUp } from '../lib/useCountUp.js';
import { spotState, STATE } from './layout.js';

// לוח זמינות כמו בכניסה לחניון: ספרות LED גדולות של המקומות הפנויים, ופס שבו כל מקום הוא קטע קטן בצבע המצב שלו.
// כל המספרים נספרים מהמקומות שהשרת החזיר לתאריך שנבחר
export default function AvailabilityBoard({ counts, spots, options, loading }) {
  const free = useCountUp(counts.available);
  const digits = loading ? '--' : String(free).padStart(2, '0');
  const leading = digits.match(/^0+(?=\d)/)?.[0] ?? '';

  const summary = `${counts.available} מקומות פנויים מתוך ${spots.length}, ${counts.occupied} תפוסים, ${counts.unavailable} לא פעילים`;

  return (
    <div className="board" role="group" aria-label="לוח זמינות המקומות בתאריך שנבחר">
      <p className="sr-only">{loading ? 'טוען' : summary}</p>
      <div className="board-head" aria-hidden="true">
        <SignParking size={30} />
        <span>מקומות פנויים</span>
      </div>

      <div className="board-readout" aria-hidden="true">
        <span className="led led-free">
          <span className="led-dim">{leading}</span>
          {digits.slice(leading.length)}
        </span>
        <span className="board-of">מתוך {loading ? '--' : spots.length}</span>
      </div>

      <div className="board-bar" aria-hidden="true">
        {spots.map((spot) => (
          <i key={spot.id} className={`seg seg-${spotState(spot, options)}`} />
        ))}
      </div>

      <ul className="board-legend" aria-hidden="true">
        <li><i className="seg seg-occupied" /> תפוסים <b>{loading ? '--' : counts.occupied}</b></li>
        <li><i className="seg seg-unavailable" /> לא פעילים <b>{loading ? '--' : counts.unavailable}</b></li>
        {counts.mine > 0 && <li><i className="seg seg-mine" /> שלי <b>{counts.mine}</b></li>}
      </ul>
    </div>
  );
}
