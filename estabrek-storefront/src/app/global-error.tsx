"use client";
// Last resort when even the page frame fails: plain HTML, no outside styles.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#fbf3ef", color: "#4d2039", fontFamily: '"IBM Plex Sans Arabic", "Cairo", system-ui, sans-serif', padding: 24 }}>
        <main style={{ maxWidth: 460, textAlign: "center", background: "#fff", borderRadius: 28, padding: "40px 28px", boxShadow: "0 30px 60px -40px rgba(77,32,57,.45)" }}>
          <div style={{ fontSize: 40, color: "#a43b64" }} aria-hidden>✿</div>
          <h1 style={{ fontSize: 24, margin: "12px 0 8px" }}>عذراً، حدث خطأ مؤقت</h1>
          <p style={{ margin: 0, lineHeight: 1.8, color: "#7a5a68" }}>حاولي مرة أخرى بعد لحظة. Sorry — please try again in a moment.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
            <button type="button" onClick={() => reset()} style={{ border: 0, borderRadius: 999, padding: "12px 22px", background: "#4d2039", color: "#fff", font: "inherit", cursor: "pointer" }}>حاولي مرة أخرى</button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ borderRadius: 999, padding: "12px 22px", border: "1px solid #e3cdd8", color: "#4d2039", textDecoration: "none" }}>الرئيسية</a>
          </div>
          {error.digest ? <small style={{ display: "block", marginTop: 18, color: "#b09aa5" }} dir="ltr">ref {error.digest}</small> : null}
        </main>
      </body>
    </html>
  );
}
