"use client";
/** A notice's close button: it hides the notice for this visit of the page. */
export function BlockClose({ label }: { label: string }) {
  return (
    <button
      type="button" className="pt-alert-close" aria-label={label}
      onClick={(e) => {
        const box = e.currentTarget.closest<HTMLElement>(".pt-alert");
        if (box) box.hidden = true;
      }}
    >
      ×
    </button>
  );
}
