import React from "react";

/** Shown at once while the About page is prepared: the hero words on one side, the arched portrait on the other. */
export default function LoadingAbout() {
  return (
    <main id="main-content" tabIndex={-1} className="rose-route-loading" aria-busy="true">
      <span className="sr-only" role="status">جارٍ تحميل قصتنا…</span>
      <section className="rose-about-hero rose-skeleton" aria-hidden="true">
        <div className="rose-about-hero-copy">
          <i className="sk sk-eyebrow" />
          <i className="sk sk-title" />
          <i className="sk sk-title sk-short" />
          <i className="sk sk-line" />
          <i className="sk sk-line sk-short" />
        </div>
        <i className="sk sk-portrait" />
      </section>
    </main>
  );
}
