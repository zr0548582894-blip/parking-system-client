// הודעה למשתמש: הצלחה, מידע, שגיאה, או התנגשות (409) בצבע בולט משלה
export default function Notice({ type = 'info', text, message, details = [] }) {
  return (
    <div className={`notice ${type}`} role={type === 'success' || type === 'info' ? 'status' : 'alert'}>
      <strong>{text ?? message}</strong>
      {details.length > 0 && (
        <ul>
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
