import { useState } from 'react';
import { Activity, CheckCircle2, CircleSlash, HeartPulse, Trash2 } from 'lucide-react';
import { baseUrl } from '../apiClient.js';
import { clearActivity, useActivity } from '../activity.js';
import { CAPABILITIES, UNSUPPORTED } from '../lib/capabilities.js';
import { Button } from '../components/ui.jsx';
import PageHero from '../components/PageHero.jsx';
import ramp from '../assets/ramp.jpg';

const statusClass = (status) => (status === 0 ? 'st-fail' : status < 300 ? 'st-ok' : status < 500 ? 'st-warn' : 'st-fail');

// מסך שמראה מה השרת מספק ומה הלקוח עושה איתו, ואילו קריאות באמת נשלחו בהפעלה הזו.
// היומן אינו כולל גוף בקשה, פרמטרים, token או סיסמאות
export default function BackendScreen({ api, session }) {
  const activity = useActivity();
  const [health, setHealth] = useState(null);
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    setHealth(await api.health());
    setChecking(false);
  }

  const used = CAPABILITIES.filter((capability) => !capability.unused);

  return (
    <div className="page">
      <PageHero image={ramp} position="center 40%" eyebrow="שקיפות" title="השרת, בשטח">
        כל פעולה בממשק היא קריאה אמיתית ל-API. כאן רואים אילו נקודות קצה קיימות, מי רשאי לקרוא להן, ומה נשלח בפועל מהדפדפן הזה.
      </PageHero>

      <section className="backend-grid">
        <div className="card">
          <h2><HeartPulse size={18} aria-hidden="true" /> חיבור</h2>
          <p className="muted">כתובת השרת (נקבעת בבנייה לפי VITE_API_URL):</p>
          <p className="mono ltr-block">{baseUrl}</p>
          <p className="muted">מחובר כ-<strong>{session.fullName}</strong>, תפקיד <strong>{session.role === 'Admin' ? 'מנהל' : 'עובד'}</strong>. ה-token אינו מוצג.</p>
          <Button variant="ghost" icon={HeartPulse} busy={checking} busyText="בודק..." onClick={check}>בדיקת חיבור</Button>
          {health && (
            <p role="status" className={health.ok ? 'ok-text' : 'bad-text'}>
              {health.ok ? 'השרת עונה (200).' : health.status === 0 ? 'אין תגובה מהשרת.' : `השרת החזיר ${health.status}.`}
            </p>
          )}
        </div>

        <div className="card">
          <h2><Activity size={18} aria-hidden="true" /> קריאות בהפעלה הזו</h2>
          {activity.length === 0 ? (
            <p className="muted">עוד לא נשלחו קריאות.</p>
          ) : (
            <>
              <ul className="activity" aria-label="קריאות אחרונות">
                {activity.slice(0, 12).map((entry) => (
                  <li key={entry.id}>
                    <span className="method mono">{entry.method}</span>
                    <span className="mono path">{entry.path}</span>
                    <span className={`status mono ${statusClass(entry.status)}`}>{entry.status === 0 ? 'ERR' : entry.status}</span>
                    <span className="muted ms">{entry.ms}ms</span>
                  </li>
                ))}
              </ul>
              <Button variant="ghost" icon={Trash2} onClick={clearActivity}>ניקוי היומן</Button>
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="caps">
        <h2 id="caps">מפת נקודות הקצה</h2>
        <p className="muted">
          {used.length} נקודות קצה משולבות בממשק. "בדיקת יחידה" פירושה בדיקה אוטומטית של שכבת ה-API בלקוח מול fetch מדומה, ולא בדיקה מול שרת חי.
          אימות מול שרת חי נעשה בהרצת <span className="mono">npm run e2e</span> או ידנית, לפי עמודת "איך מאמתים".
        </p>
        <div className="table-wrap">
          <table className="data-table caps">
            <thead>
              <tr>
                <th scope="col">נקודת קצה</th>
                <th scope="col">הרשאה</th>
                <th scope="col">איפה בממשק</th>
                <th scope="col">הצלחה וכשלים</th>
                <th scope="col">איך מאמתים</th>
                <th scope="col">בדיקת יחידה</th>
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((capability) => (
                <tr key={capability.id}>
                  <td data-label="נקודת קצה"><span className="method mono">{capability.method}</span> <span className="mono ltr-inline">{capability.path}</span></td>
                  <td data-label="הרשאה">{capability.auth}</td>
                  <td data-label="איפה בממשק">{capability.screen}</td>
                  <td data-label="הצלחה וכשלים"><span>{capability.success}</span><br /><span className="muted">{capability.failures}</span></td>
                  <td data-label="איך מאמתים">{capability.verify}</td>
                  <td data-label="בדיקת יחידה">
                    {capability.unitTested ? <CheckCircle2 size={18} className="ok-text" aria-label="יש" /> : <CircleSlash size={18} className="muted" aria-label="אין" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>מה אינו נתמך (ולכן אינו מוצג)</h2>
        <ul className="plain-list">
          {UNSUPPORTED.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </section>
    </div>
  );
}
