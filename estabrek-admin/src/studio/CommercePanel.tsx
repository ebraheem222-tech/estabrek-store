import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { tr } from "../lib/words";
import { NumberField } from "./StudioTreePanels";

export const COMMERCE_TYPES = new Set(["shop", "cartItems", "cartSummary", "cartCheckout"]);
export function CommercePanel({ node, busy, onOps }: { node: PageTreeNode; busy: boolean; onOps: (label: string, ops: PageDraftOp[]) => void }) {
  const set = (patch: Record<string, unknown>) => onOps(tr("عرض التجارة", "Commerce display"), [{ op: "setProps", nodeId: node.id, props: { ...node.props, ...patch } }]);
  return <fieldset disabled={busy} className="space-y-3 rounded-xl border border-white/10 p-3" data-testid="studio-commerce">
    <p className="text-xs text-white/65">{node.type === "shop" ? tr("عرض منتجات فعلي مع الفلترة والترتيب. المعاينة داخل المحرّر تستخدم منتجات تجريبية.", "Live catalog with filters and sorting. The editor uses sample products.") : tr("هذا الجزء بشارك باقي أجزاء السلة بنفس الكمية والسعر والخصم. المعاينة تجريبية وإرسال الطلب متوقف فيها.", "This part shares quantity, prices and discounts with the other cart parts. Preview data is synthetic and purchases are disabled.")}</p>
    {node.type === "shop" ? <>
      <NumberField label={tr("أعمدة المنتجات", "Product columns")} value={Number(node.props.columns) || 3} min={2} max={6} onSave={columns => set({ columns: columns ?? 3 })} testId="commerce-columns" />
      <NumberField label={tr("أعمدة الهاتف", "Mobile columns")} value={Number(node.props.mobileColumns) || 2} min={1} max={2} onSave={mobileColumns => set({ mobileColumns: mobileColumns ?? 2 })} testId="commerce-mobile-columns" />
      <label className="flex justify-between text-xs">{tr("إظهار الفلاتر", "Show filters")}<input type="checkbox" checked={node.props.showFilters !== false} disabled={busy} onChange={event => set({ showFilters: event.target.checked })} data-testid="commerce-filters" /></label>
      <label className="flex justify-between text-xs">{tr("إظهار البحث", "Show search")}<input type="checkbox" checked={node.props.showSearch !== false} disabled={busy} onChange={event => set({ showSearch: event.target.checked })} data-testid="commerce-search" /></label>
    </> : <p className="text-xs text-amber-100/70">{tr("صفحة السلة بتحتاج: منتجات السلة، ملخص الطلب وإتمام الطلب. خليهم ظاهرين على كل أحجام الشاشات قبل النشر.", "The cart page needs cart items, order summary and checkout, visible at every screen size before publishing.")}</p>}
  </fieldset>;
}
