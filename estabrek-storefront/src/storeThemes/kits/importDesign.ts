import { header, footer } from "./chrome";
import { withStyle, H } from "./lib";
import { STYLES } from "./styles";
import { kitCtx, t, type Node } from "./tree";
import { photosOf } from "./photos";
import { templateById, templateThemeId } from ".";
import { TEMPLATE_THEMES } from "./themes";
import { copyTheme } from "../snapshot";
import { withMotionProfile, type MotionProfile } from "../../pageTree/motionProfiles";

const tree = (children: Node[]) => ({ version: 1 as const, root: { id: "page", type: "page", props: {}, children } });

/** Detached copies: no linked sections, theme registry reference or demo products in the saved design. */
export function importDesign(id: string, options?: MotionProfile) {
  const blank = id === "blank";
  const template = templateById(blank ? "fashion-quiet" : id);
  const theme = TEMPLATE_THEMES.find((x) => x.id === templateThemeId(template?.id ?? ""));
  if (!template || !theme) return null;
  const k = withStyle(kitCtx(photosOf(template.category), false), blank ? STYLES.quiet : template.style);
  const brand = t("{{store.name}}");
  const navigation = { menu: [t("المتجر|Shop|חנות"), t("من نحن|About|עלינו"), t("تواصل|Contact|צור קשר")], highlights: [t("{{store.name}}"), t("اكتشف مجموعتنا|Explore our collection|גלו את הקולקציה שלנו")] };
  const head = !blank && template.regions ? template.regions.header(k, brand) : header(k, template.header.kind, brand, template.header.tone, navigation);
  const footerLine = blank ? t("أهلاً بمتجرنا|Welcome to our store|ברוכים הבאים לחנות שלנו") : template.category === "shoes" ? t("اكتشف المجموعة وتفاصيل كل حذاء|Explore the collection and the details of each pair|גלו את הקולקציה ואת הפרטים של כל זוג") : template.footer.line;
  const foot = !blank && template.regions ? template.regions.footer(k, brand) : footer(k, template.footer.kind, brand, footerLine, template.footer.tone);
  // One ID counter for all three regions: generated CSS selectors share the page document.
  const sections = blank ? [{ id: "section", type: "section", name: "Your canvas", props: { contained: true }, children: [H(k, brand, 1)], style: { base: { minHeight: "60vh", pad: [96, 24, 96, 24] } } } as Node] : template.home(k);
  return { sections: withMotionProfile(sections, options), design: { templateId: blank ? null : id, theme: copyTheme(theme), header: tree(withMotionProfile([head], options)), footer: tree(withMotionProfile([foot], options)) } };
}
