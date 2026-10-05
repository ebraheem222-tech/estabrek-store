import React from "react";

/**
 * Shown the moment the shopper taps "Contact" while the page is prepared on the
 * server (the contact page is built per visit, so without this the click looked
 * like nothing happened). Same shape as the rose contact page: intro and arch on
 * one side, the message form on the other.
 */
export default function LoadingContact() {
  return (
    <main id="main-content" tabIndex={-1} className="rose-route-loading" aria-busy="true">
      <span className="sr-only" role="status">جارٍ تحميل صفحة التواصل…</span>
      <section className="rose-contact rose-contact-skeleton" aria-hidden="true">
        <div className="rose-contact-intro">
          <i className="sk sk-eyebrow" />
          <i className="sk sk-title" />
          <i className="sk sk-title sk-short" />
          <i className="sk sk-line" />
          <i className="sk sk-line sk-short" />
          <i className="sk sk-arch" />
        </div>
        <div className="rose-contact-form-panel">
          <i className="sk sk-eyebrow" />
          <i className="sk sk-heading" />
          <div className="sk-fields">
            <i className="sk sk-field" />
            <i className="sk sk-field" />
            <i className="sk sk-field sk-wide" />
          </div>
          <i className="sk sk-button" />
        </div>
      </section>
    </main>
  );
}
