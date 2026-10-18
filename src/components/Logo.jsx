// סימן המותג: "P" בתוך ריבוע שמתחתיו קו נתיב. SVG פנימי, בלי קובץ תמונה
export default function Logo({ large = false }) {
  return (
    <span className={`logo ${large ? 'logo-large' : ''}`}>
      <svg viewBox="0 0 40 40" width={large ? 44 : 32} height={large ? 44 : 32} aria-hidden="true">
        <rect x="2" y="2" width="36" height="36" rx="10" fill="#ffc61a" />
        <path d="M15 29V11h6.2a5.4 5.4 0 0 1 0 10.8H15" fill="none" stroke="#12203a" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 34h22" stroke="#12203a" strokeWidth="2" strokeDasharray="3 3" opacity=".45" />
      </svg>
      <span className="logo-text">ParkingSystem</span>
    </span>
  );
}
