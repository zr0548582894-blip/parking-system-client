import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, KeyRound, ShieldCheck, Zap } from 'lucide-react';
import { explainError } from '../errors.js';
import { Button, Field } from '../components/ui.jsx';
import Notice from '../components/Notice.jsx';
import Logo from '../components/Logo.jsx';
import { SignAccessible, SignEnter, SignEv, SignParking } from '../components/Signs.jsx';
import facade from '../assets/garage-facade.jpg';
import { validateAuthForm } from '../lib/validation.js';

// מסך כניסה ושער המוצר: התחברות והרשמה. ההרשמה תמיד יוצרת עובד (Employee)
export default function AuthScreen({ api, onAuthenticated, notice }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState(false);

  const isRegister = mode === 'register';
  const fieldErrors = touched ? validateAuthForm(form, isRegister) : {};

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  function switchMode(next) {
    setMode(next);
    setError(null);
    setTouched(false);
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setTouched(true);
    if (Object.keys(validateAuthForm(form, isRegister)).length > 0) return;

    setBusy(true);
    setError(null);
    try {
      const auth = isRegister
        ? await api.register(form.fullName.trim(), form.email.trim(), form.password)
        : await api.login(form.email.trim(), form.password);
      onAuthenticated(auth);
    } catch (caught) {
      setError(explainError(caught));
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-hero" aria-label="ParkingSystem">
        <img src={facade} alt="" className="auth-photo" fetchPriority="high" />
        <div className="auth-shade" aria-hidden="true" />
        <div className="auth-hero-copy">
          <Logo large />
          <div className="sign-row" aria-hidden="true">
            <SignParking size={52} />
            <SignEv size={52} />
            <SignAccessible size={52} />
            <SignEnter size={52} />
          </div>
          <h1>החניה של הצוות, מסודרת.</h1>
          <p>מקום אחד לכל עובד בכל יום. בוחרים תאריך, רואים את החניון, ומזמינים. אם מישהו הקדים אתכם, השרת יגיד את זה בבירור.</p>
          <ul className="auth-points">
            <li><KeyRound size={18} aria-hidden="true" /> כניסה מאובטחת עם תפקידים: עובד ומנהל</li>
            <li><Zap size={18} aria-hidden="true" /> מקומות עם טעינה לרכב חשמלי, נגישים ומקורים</li>
            <li><ShieldCheck size={18} aria-hidden="true" /> הגנה מפני הזמנה כפולה של אותו מקום</li>
          </ul>
          <p className="photo-credit">צילום: Pexels (רישיון חופשי)</p>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-switch" role="tablist" aria-label="כניסה או הרשמה">
            <button type="button" role="tab" aria-selected={!isRegister} className={!isRegister ? 'is-active' : ''} onClick={() => switchMode('login')}>
              התחברות
            </button>
            <button type="button" role="tab" aria-selected={isRegister} className={isRegister ? 'is-active' : ''} onClick={() => switchMode('register')}>
              הרשמה
            </button>
          </div>

          <h2>{isRegister ? 'פתיחת חשבון עובד' : 'ברוכים השבים'}</h2>

          {notice && <Notice {...notice} />}

          <form onSubmit={submit} noValidate>
            {isRegister && (
              <Field label="שם מלא" error={fieldErrors.fullName}>
                <input value={form.fullName} onChange={update('fullName')} autoComplete="name" aria-invalid={Boolean(fieldErrors.fullName)} />
              </Field>
            )}
            <Field label="אימייל" error={fieldErrors.email}>
              <input type="email" dir="ltr" value={form.email} onChange={update('email')} autoComplete="email" aria-invalid={Boolean(fieldErrors.email)} />
            </Field>
            <Field label="סיסמה" hint={isRegister ? 'לפחות 8 תווים' : undefined} error={fieldErrors.password}>
              <span className="password">
                <input
                  type={reveal ? 'text' : 'password'}
                  dir="ltr"
                  value={form.password}
                  onChange={update('password')}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  aria-invalid={Boolean(fieldErrors.password)}
                />
                <button type="button" className="icon-btn" onClick={() => setReveal((value) => !value)} aria-label={reveal ? 'הסתרת הסיסמה' : 'הצגת הסיסמה'}>
                  {reveal ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </span>
            </Field>

            {error && <Notice tone={error.tone} message={error.message} details={error.details} hint={error.hint} correlationId={error.correlationId} />}

            <Button type="submit" busy={busy} busyText={isRegister ? 'פותח חשבון...' : 'מתחבר...'} icon={ArrowLeft} className="btn-block">
              {isRegister ? 'הרשמה והמשך' : 'כניסה'}
            </Button>
          </form>

          <p className="muted auth-foot">
            {isRegister ? 'כבר יש לך חשבון?' : 'עוד אין לך חשבון?'}{' '}
            <button type="button" className="link-btn" onClick={() => switchMode(isRegister ? 'login' : 'register')}>
              {isRegister ? 'להתחברות' : 'להרשמה כעובד'}
            </button>
          </p>
        </div>
      </section>
    </div>
  );
}
