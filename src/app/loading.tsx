export default function Loading() {
  return <div className="container catalog-loading" aria-busy="true"><p role="status">Finding your next direction…</p><div className="skeleton skeleton-title" /><div className="skeleton skeleton-search" /><div className="catalog-grid">{[0, 1, 2].map((key) => <div key={key} className="skeleton skeleton-card" />)}</div></div>;
}
