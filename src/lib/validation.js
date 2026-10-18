// אותם כללים כמו בשרת, רק כדי לתת משוב מיידי לפני שליחה. השרת הוא זה שמחליט ובודק שוב

export function validateAuthForm(form, isRegister) {
  const errors = {};
  if (isRegister && (form.fullName.trim().length < 2 || form.fullName.length > 100)) errors.fullName = 'שם מלא באורך 2 עד 100 תווים.';
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim()) || form.email.length > 256) errors.email = 'כתובת אימייל לא תקינה.';
  if (isRegister) {
    if (form.password.length < 8) errors.password = 'לפחות 8 תווים.';
    else if (new TextEncoder().encode(form.password).length > 72) errors.password = 'עד 72 בייטים (תווים בעברית תופסים יותר מבייט אחד).';
  } else if (!form.password) {
    errors.password = 'נא להזין סיסמה.';
  }
  return errors;
}

// CreateParkingSpotRequest: קוד 1-20 תווים, קומה בין -10 ל-100
export function validateSpotForm(form) {
  const errors = {};
  const code = form.code.trim();
  if (code.length < 1 || code.length > 20) errors.code = 'קוד באורך 1 עד 20 תווים.';
  const floor = Number(form.floor);
  if (form.floor === '' || !Number.isInteger(floor) || floor < -10 || floor > 100) errors.floor = 'קומה היא מספר שלם בין -10 ל-100.';
  return errors;
}
