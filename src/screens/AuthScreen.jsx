import { useState } from 'react';
import { describeError } from '../errors.js';
import Notice from '../components/Notice.jsx';

// מסך 1: התחברות והרשמה. ההרשמה תמיד יוצרת עובד (Employee)
export default function AuthScreen({ api, onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const auth = isRegister
        ? await api.register(form.fullName, form.email, form.password)
        : await api.login(form.email, form.password);
      onAuthenticated(auth);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <h1>הקצאת מקומות חניה</h1>

      <div className="tabs">
        <button type="button" className={!isRegister ? 'active' : ''} onClick={() => setMode('login')}>
          התחברות
        </button>
        <button type="button" className={isRegister ? 'active' : ''} onClick={() => setMode('register')}>
          הרשמה
        </button>
      </div>

      <form onSubmit={submit}>
        {isRegister && (
          <label>
            שם מלא
            <input value={form.fullName} onChange={update('fullName')} autoComplete="name" required />
          </label>
        )}
        <label>
          אימייל
          <input type="email" value={form.email} onChange={update('email')} autoComplete="email" required />
        </label>
        <label>
          סיסמה {isRegister && <small>(לפחות 8 תווים)</small>}
          <input
            type="password"
            value={form.password}
            onChange={update('password')}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
          />
        </label>

        {error && <Notice type="error" text={error.message} details={error.details} />}

        <button type="submit" disabled={busy}>
          {busy ? 'רגע...' : isRegister ? 'הרשמה' : 'התחברות'}
        </button>
      </form>
    </div>
  );
}
