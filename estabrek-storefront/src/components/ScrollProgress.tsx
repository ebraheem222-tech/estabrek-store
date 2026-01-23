"use client";

import { useEffect, useState } from "react";

export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const root = document.scrollingElement || document.documentElement;
      const max = root.scrollHeight - root.clientHeight;
      const next = max > 0 ? (root.scrollTop / max) * 100 : 0;
      setProgress(next);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="scroll-progress" aria-hidden="true">
      <span className="scroll-progress__bar" style={{ width: `${progress}%` }} />
    </div>
  );
}
