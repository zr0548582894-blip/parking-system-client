// פקדי pagination. העמוד הנוכחי והסך הכול מגיעים מהשרת, והלחיצה מבקשת עמוד חדש מהשרת
export default function Pagination({ page, totalPages, totalCount, onChange }) {
  if (totalPages <= 1) {
    return <p className="pagination">סך הכול: {totalCount}</p>;
  }

  return (
    <div className="pagination">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        הקודם
      </button>
      <span>
        עמוד {page} מתוך {totalPages} ({totalCount} פריטים)
      </span>
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        הבא
      </button>
    </div>
  );
}
