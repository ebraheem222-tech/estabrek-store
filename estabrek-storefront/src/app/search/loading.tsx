import React from "react";

/**
 * Shown the moment a search starts, while the results come from the catalog
 * (the slowest request in the shop, about 1–2 s on the hosted API). Same shape
 * as the rose search page: the intro band, then a grid of product cards.
 */
export default function LoadingSearch() {
  return (
    <main id="main-content" tabIndex={-1} className="rose-route-loading" aria-busy="true">
      <span className="sr-only" role="status">جارٍ البحث…</span>
      <div className="rose-skeleton rose-search-skeleton" aria-hidden="true">
        <div className="rose-shop-intro">
          <div>
            <i className="sk sk-eyebrow" />
            <i className="sk sk-title" />
            <i className="sk sk-line sk-short" />
          </div>
          <i className="sk sk-field" />
        </div>
        <div className="sk-grid">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="sk-card">
              <i className="sk sk-photo" />
              <i className="sk sk-line" />
              <i className="sk sk-line sk-short" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
