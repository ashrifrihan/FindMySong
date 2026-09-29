export default function SearchLoading() {
  return (
    <div className="search-page-wrap" aria-busy="true" aria-label="Searching for tracks">
      <div className="search-header">
        <h1>Search</h1>
        <div className="hero-search" style={{ opacity: 0.85 }}>
          <span className="search-btn-spinner" style={{ width: 16, height: 16, borderColor: "var(--border-2)", borderTopColor: "var(--blue)" }} />
          <span style={{ color: "var(--text-3)", fontSize: "0.9375rem", marginLeft: 8 }}>
            Finding official track codes…
          </span>
        </div>
      </div>

      <div className="list" style={{ marginTop: 24 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton-card" />
        ))}
      </div>
    </div>
  );
}
