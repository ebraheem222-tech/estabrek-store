// A QR code read with the camera (the tickets' check-in; a whole site's scanner on its panel). Where the browser
// can't read one (no BarcodeDetector, no camera), the code is typed instead.
import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/words";

type Detector = { detect: (src: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> };

/** A camera reading QR codes (Chrome, Android); elsewhere the code is typed. */
export function QrScanner({ onCode, onClose }: { onCode: (text: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(onCode);
  useEffect(() => {
    done.current = onCode;
  });

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let alive = true;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (!alive || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const Ctor = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
        const detector = new Ctor({ formats: ["qr_code"] });
        const tick = async () => {
          if (!alive || !video.current) return;
          try {
            const found = await detector.detect(video.current);
            if (found[0]?.rawValue) {
              done.current(found[0].rawValue);
              return;
            }
          } catch {
            /* frame not ready */
          }
          timer = window.setTimeout(tick, 250);
        };
        void tick();
      } catch {
        if (alive) setError(tr("ما قدرنا نفتح الكاميرا. لازم المتصفح ياخد إذن يستعملها، أو الكود بينكتب.", "We couldn't open the camera. Let the browser use it, or type the code."));
      }
    })();
    return () => {
      alive = false;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.12] bg-black">
      {error ? <p className="p-4 text-sm text-red-200">{error}</p> : <video ref={video} className="mx-auto aspect-square w-full max-w-sm object-cover" muted playsInline />}
      <button type="button" onClick={onClose} className="h-11 w-full bg-white/[0.06] text-sm text-white/80">{tr("إغلاق الكاميرا", "Close camera")}</button>
    </div>
  );
}
