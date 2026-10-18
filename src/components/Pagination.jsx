import { ChevronLeft, ChevronRight } from 'lucide-react';

// פקדי pagination. העמוד הנוכחי והסך הכול מגיעים מהשרת, והלחיצה מבקשת עמוד חדש מהשרת
// ב-RTL "הקודם" הוא ימינה, ולכן החצים מוחלפים לפי הכיוון
export default function Pagination({ page, totalPages, totalCount, onChange }) {
  if (totalPages <= 1) {
    return <p className="pagination muted">סך הכול: {totalCount}</p>;
  }

  return (
    <nav className="pagination" aria-label="עימוד">
      <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronRight size={18} aria-hidden="true" /> הקודם
      </button>
      <span>
        עמוד {page} מתוך {totalPages} <span className="muted">({totalCount} פריטים)</span>
      </span>
      <button type="button" className="btn btn-ghost" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        הבא <ChevronLeft size={18} aria-hidden="true" />
      </button>
    </nav>
  );
}
