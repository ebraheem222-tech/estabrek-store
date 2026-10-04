"use client";
import { useRef } from "react";

/**
 * General modest-wear measurements in centimetres. Edit these rows if your
 * pattern sizes differ — the product page reads them from here only.
 */
export const SIZE_GUIDE_ROWS: Array<{ size: string; local: string; bust: string; waist: string; hips: string }> = [
  { size: "S", local: "1", bust: "84–88", waist: "66–70", hips: "90–94" },
  { size: "M", local: "2", bust: "88–94", waist: "70–76", hips: "94–100" },
  { size: "L", local: "3", bust: "94–100", waist: "76–82", hips: "100–106" },
  { size: "XL", local: "4", bust: "100–108", waist: "82–90", hips: "106–114" },
  { size: "2XL", local: "5", bust: "108–116", waist: "90–98", hips: "114–122" },
];

export function SizeGuide() {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className="size-guide-trigger" onClick={() => dialog.current?.showModal()}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="2.5" y="8" width="19" height="8" rx="1.5" />
          <path d="M6.5 8v3M10 8v4.5M13.5 8v3M17 8v4.5" />
        </svg>
        دليل المقاسات
      </button>
      <dialog
        ref={dialog}
        className="size-guide-dialog"
        dir="rtl"
        aria-labelledby="size-guide-title"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="size-guide-body">
          <div className="size-guide-head">
            <h2 id="size-guide-title">دليل المقاسات</h2>
            <button type="button" aria-label="إغلاق" onClick={() => dialog.current?.close()}>✕</button>
          </div>
          <p>القياسات بالسنتيمتر، وتُؤخذ على الجسم مباشرة بشريط قياس مرن.</p>
          <div className="size-guide-table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">المقاس</th>
                  <th scope="col">الصدر</th>
                  <th scope="col">الخصر</th>
                  <th scope="col">الورك</th>
                </tr>
              </thead>
              <tbody>
                {SIZE_GUIDE_ROWS.map((row) => (
                  <tr key={row.size}>
                    <th scope="row">
                      {row.local} <span dir="ltr">({row.size})</span>
                    </th>
                    <td dir="ltr">{row.bust}</td>
                    <td dir="ltr">{row.waist}</td>
                    <td dir="ltr">{row.hips}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="size-guide-tips">
            <li><strong>الصدر:</strong> حول أعرض نقطة في الصدر، مع إبقاء الشريط أفقياً.</li>
            <li><strong>الخصر:</strong> حول أضيق نقطة فوق السرّة.</li>
            <li><strong>الورك:</strong> حول أعرض نقطة في الورك.</li>
            <li>بين مقاسين؟ اختاري الأكبر لقصّة أكثر راحة، أو راسلينا عبر واتساب وسنساعدكِ.</li>
          </ul>
        </div>
      </dialog>
    </>
  );
}
