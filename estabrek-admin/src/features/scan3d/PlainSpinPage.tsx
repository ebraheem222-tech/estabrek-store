/**
 * 360° from a plain video (Admin → الوسائط → 360° من فيديو عادي): the same view the 3D scan
 * makes, without the printed mat (PlainSpin.tsx). Linking it to a product is done from the
 * product's page in the catalogue, or here when it was opened from one (?product=).
 */
import { Link } from "react-router-dom";
import { tr } from "../../lib/words";
import { PlainSpin } from "./PlainSpin";

export default function PlainSpinPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4" data-testid="plain-spin-page">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">{tr("360° من فيديو عادي", "360° from a plain video")}</h1>
        <p className="text-xs leading-6 text-white/55">
          {tr("بلا حصيرة مطبوعة: فيديو للقطعة وهي عم تلف لفة وحدة. لمجسم 3D بقياسه الحقيقي استعمل", "No printed mat: a video of the product turning once. For a 3D model in its real size use")}{" "}
          <Link to="/admin/media/scan" className="text-accent-300 hover:underline">{tr("مسح 3D من فيديو", "3D scan from a video")}</Link>.
        </p>
      </header>
      <PlainSpin />
    </div>
  );
}
