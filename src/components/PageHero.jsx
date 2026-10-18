// כותרת עמוד עם תמונת רקע (דקורטיבית, alt ריק) ושכבת כהות שמבטיחה ניגודיות לטקסט
export default function PageHero({ image, position = 'center', eyebrow, title, children, actions }) {
  return (
    <header className="page-hero">
      <img src={image} alt="" className="page-hero-img" style={{ objectPosition: position }} loading="lazy" decoding="async" />
      <div className="page-hero-shade" aria-hidden="true" />
      <div className="page-hero-body">
        <div className="page-hero-copy">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {children && <p className="muted">{children}</p>}
        </div>
        {actions}
      </div>
    </header>
  );
}
