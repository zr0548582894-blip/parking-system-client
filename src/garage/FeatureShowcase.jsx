import evImage from '../assets/ev-charging.jpg';
import accessibleImage from '../assets/feature-accessible.jpg';
import coveredImage from '../assets/feature-covered.jpg';
import { featureKind, spotState, STATE } from './layout.js';

const IMAGES = { ev: evImage, accessible: accessibleImage, covered: coveredImage };

// הסינון היחיד לפי מאפיין: אריח לכל מאפיין שהשרת מחזיר (טעינה, נגיש, מקורה, ואחרים בלי תמונה).
// המספרים נספרים מהמקומות שנטענו לתאריך הנבחר, ולחיצה (או לחיצה חוזרת) מסננת את המפה
export default function FeatureShowcase({ features, spots, options, activeId, onPick }) {
  const tiles = features
    .map((feature) => ({ feature, kind: featureKind(feature.name) }))
        .map(({ feature, kind }) => {
      const withFeature = spots.filter((spot) => spot.isActive && spot.features.some((item) => item.id === feature.id));
      const free = withFeature.filter((spot) => spotState(spot, options) === STATE.AVAILABLE).length;
      return { feature, kind, total: withFeature.length, free };
    });

  if (tiles.length === 0) return null;

  return (
    <section className="showcase" aria-label="מקומות לפי מאפיין">
      <h2>סינון לפי מאפיין</h2>
      <ul>
        {tiles.map(({ feature, kind, total, free }) => {
          const active = String(feature.id) === activeId;
          return (
            <li key={feature.id}>
              <button type="button" className={`tile tile-${kind} ${IMAGES[kind] ? '' : 'tile-plain'} ${active ? 'is-active' : ''}`} aria-pressed={active} onClick={() => onPick(active ? '' : String(feature.id))}>
                {IMAGES[kind] && <img src={IMAGES[kind]} alt="" loading="lazy" decoding="async" />}
                <span className="tile-shade" aria-hidden="true" />
                <span className="tile-body">
                  <strong>{feature.name}</strong>
                  <span>{total === 0 ? 'אין מקומות כאלה' : `${free} פנויים מתוך ${total}`}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
