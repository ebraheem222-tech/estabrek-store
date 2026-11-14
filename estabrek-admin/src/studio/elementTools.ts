/**
 * What can be done with the selected element, by name. Several editors live one step away from the inspector's
 * list (a picture's cropping and colours, the video editor, a 3D model's camera views and parts open only once
 * the element is opened on its own; physics shows only on what holds others), so a shop owner who doesn't know
 * the way never sees them. This says, for an element, which of them it has and where each one is; the studio
 * draws them as a row of named buttons at the top of the inspector (a short name, what it does as its hint) and
 * takes the owner there.
 *
 * Pure (tested): the studio does what a tool's `go` says.
 */
import type { PageTreeNode } from "../api/pages.api";
import type { InspectorGroupId } from "./InspectorNav";
import { WORLD_HOSTS, worldOfNode } from "./PhysicsPanels";
import { say } from "./say";

export type ToolGo =
  /** Open the element on its own (focus mode) and bring a card of its editor into view. */
  | { kind: "focus"; card?: string }
  /** Open the video editor on this video. */
  | { kind: "videoEditor" }
  /** Add a scroll scene made of this video after the part that holds it. */
  | { kind: "sceneFromVideo" }
  /** Open a group of the inspector, and bring one of its cards into view. */
  | { kind: "group"; group: InspectorGroupId; card?: string }
  /** Make a holder a physics world, then show the card that follows from it. */
  | { kind: "worldOn"; hostId: string; card: string }
  /** The Styles tab's variables (colour maths, the scales of spaces and font sizes). */
  | { kind: "variables" }
  /** Read the picture's pixels and show its main colours (to add to the variables, or to dress its part in). */
  | { kind: "pictureColours" }
  /** The words helper (AiWordsCard.tsx): options for the element's words, or a picture's description. */
  | { kind: "aiWords" };
export type ElementTool = { id: string; icon: string; label: string; hint: string; go: ToolGo; small?: boolean };

/** What is never offered as a body: a scroll scene holds the screen still, a popup sits over the page. */
const NOT_A_BODY = new Set(["scrollScene", "popup"]);

/** The tools of one element, its own first, then physics, then what every element has (small). */
export function elementTools(node: PageTreeNode, parent?: PageTreeNode | null, parentName = ""): ElementTool[] {
  if (node.type === "page") return [];
  const out: ElementTool[] = [];
  const add = (id: string, icon: string, label: string, hint: string, go: ToolGo, small = false) => out.push({ id, icon, label: say(label), hint: say(hint), go, ...(small ? { small: true } : {}) });

  if (node.type === "image") {
    add("image-edit", "✂", "عدّل الصورة|Edit the picture|ערוך את התמונה", "قص، تدوير، قلب، إضاءة وألوان، أبيض وأسود|Crop, turn, flip, light and colours, black and white|חיתוך, סיבוב, היפוך, אור וצבעים, שחור־לבן", { kind: "focus", card: "studio-image-edit" });
    add("image-colours", "🎨", "ألوان من الصورة|Colours from the picture|צבעים מהתמונה", "بنقرا الصورة وبنطلّع ألوانها الأساسية مع نسبة كل لون: زيدهم للمتغيرات أو لبّس القسم فيهم|The picture is read and its main colours found, each with its share: add them to the variables or dress the part in them|קוראים את התמונה ומוצאים את צבעיה העיקריים: הוסף למשתנים או הלבש את החלק", { kind: "pictureColours" });
    add("ai-alt", "🤖", "وصف الصورة بالذكاء|Describe it with AI|תיאור עם AI", "بيشوف الصورة وبيكتب وصفها (للي ما بيشوفوها، ولمحركات البحث). إنت بتوافق قبل ما ينحط|It looks at the picture and writes its description (for people who can't see it, and for search engines). You approve before it is put|מסתכל על התמונה וכותב את התיאור שלה. אתה מאשר לפני שהוא נכנס", { kind: "aiWords" });
    add("image-sparkle", "✨", "نجوم براقة على الصورة|Sparkling stars on the picture|כוכבים נוצצים על התמונה", "لمعات بتتحرك على أماكن بتختارها من الصورة|Glints that move on places you choose in the picture|נצנוצים שזזים על מקומות שבחרת בתמונה", { kind: "focus", card: "studio-sparkle" });
  }
  if (node.type === "video") {
    add("video-editor", "🎬", "محرّر الفيديو|The video editor|עורך הווידאו", "قص، ترتيب المقاطع، سرعة، كلام على الفيديو، موسيقى|Cut, order the clips, speed, words on the video, music|חיתוך, סדר הקטעים, מהירות, מילים על הווידאו, מוזיקה", { kind: "videoEditor" });
    add("video-scenes", "⏯", "قسّمه لمشاهد مع السكرول|Split it into scenes that follow the scroll|חלק אותו לסצנות עם הגלילה", "الفيديو بيمشي مع نزول الصفحة، وبكل مشهد بتحط أي عنصر بدك (كلام، زر، صورة…) بيطلع بوقته|The video plays as the page scrolls, and in each scene you put any element (words, a button, a picture…) that shows at its moment|הווידאו מתנגן עם הגלילה, ובכל סצנה שמים כל רכיב שמופיע בזמנו", { kind: "sceneFromVideo" });
  }
  if (node.type === "scrollScene") {
    add("scene-chapters", "⏯", "المشاهد واللي عليها|The scenes and what is on them|הסצנות ומה שעליהן", "عدد المشاهد، وزيد أي عنصر على مشهد، وحدّد من أي لحظة لأي لحظة بيبيّن|How many scenes, add any element to one, and set from which moment to which it shows|כמה סצנות, הוסף רכיב לסצנה וקבע מתי הוא מופיע", { kind: "group", group: "content", card: "studio-scroll-scene" });
  }
  if (node.type === "model3d") {
    add("model-stage", "🧊", "المجسّم ومنصّته|The model and its stage|המודל והבמה שלו", "الملف، المنصّة، الهالة، الخلفية، الدخول، اللفّ باليد|The file, the stand, the halo, the backdrop, the intro, turning by hand|הקובץ, הבמה, ההילה, הרקע, הכניסה, סיבוב ביד", { kind: "group", group: "content", card: "studio-model3d" });
    add("model-views", "🎥", "زوايا الكاميرا|Camera views|זוויות מצלמה", "احفظ زوايا، والمجسّم بينتقل بينها مع السكرول أو بكبسة|Save views, and the model moves between them on scroll or on a press|שמור זוויות, והמודל עובר ביניהן", { kind: "focus", card: "studio-model-views" });
    add("model-spots", "📍", "نقاط على المجسّم|Spots on the model|נקודות על המודל", "نقطة بكلام ورابط على أي مكان منه|A spot with words and a link anywhere on it|נקודה עם מילים וקישור בכל מקום עליו", { kind: "focus", card: "studio-model-spots" });
    add("model-parts", "🎨", "أجزاء المجسّم|The model's parts|חלקי המודל", "اكبس على جزء منه: لوّنه، خبّيه أو ضوّيه|Press a part of it: colour it, hide it or make it glow|לחץ על חלק: צבע, הסתר או האר אותו", { kind: "focus" });
  }
  if (node.type === "svg") {
    add("svg-parts", "✏", "أشكال الرسمة|The drawing's shapes|צורות הציור", "كل شكل لحاله: لونه، خطّه، حركته، وتحوّله لشكل تاني|Each shape on its own: its colour, its line, its motion, and morphing into another|כל צורה בנפרד: צבע, קו, תנועה והתמרה", { kind: "focus" });
  }
  if (node.type === "slider") {
    add("slider-slides", "🖼", "شرائح السلايدر|The slider's slides|שקופיות הסליידר", "رتّب الشرائح واكتب على كل وحدة|Order the slides and write on each|סדר את השקופיות וכתוב על כל אחת", { kind: "focus" });
  }
  if (node.type === "heading" || node.type === "text" || node.type === "button") {
    add("ai-words", "🤖", "كتابة بالذكاء|Write with AI|כתיבה עם AI", "اقتراحات لكلام هالعنصر: كتابة عن موضوع، تحسين، تقصير، تطويل، أو ترجمة للغة تانية من لغات المتجر. إنت بتختار واحد|Options for this element's words: about a subject, better, shorter, longer, or into another of the shop's languages. You pick one|הצעות למילים של הרכיב: על נושא, טוב יותר, קצר, ארוך, או בשפה אחרת של החנות. אתה בוחר", { kind: "aiWords" });
  }
  if (node.type === "heading" || node.type === "text") {
    add("text-curve", "⌒", "كلام على قوس أو موجة|Words on an arc or a wave|מילים על קשת או גל", "الكلام بيمشي على قوس، دائرة أو موجة|The words run along an arc, a circle or a wave|המילים רצות לאורך קשת, עיגול או גל", { kind: "focus", card: "studio-curve" });
  }

  // Physics: a holder is a world; what it holds are its bodies.
  if (WORLD_HOSTS.has(node.type)) {
    if (worldOfNode(node)) add("world", "🧲", "العالم الفيزيائي|The physics world|העולם הפיזיקלי", "جاذبية، حيطان، نطّ، احتكاك، هوا، حقل قوة، رمي باليد، تجربة بالصفحة|Gravity, walls, bounce, friction, wind, a field of force, throwing by hand, a try on the page|כבידה, קירות, קפיצות, חיכוך, רוח, שדה כוח, זריקה ביד", { kind: "group", group: "motion", card: "studio-world" });
    else add("world-on", "🧲", "فيزياء|Physics|פיזיקה", "اللي جوّاه بيصيروا أجسام: بيوقعوا، بيتصادموا وبينرموا باليد؛ بعدها بتتحكم بالجاذبية والحيطان وحقل القوة|What it holds become bodies: they fall, collide and can be thrown; then you set gravity, walls and a field of force|מה שבתוכו הופך לגופים: נופלים, מתנגשים ונזרקים; אחר כך קובעים כבידה, קירות ושדה כוח", { kind: "worldOn", hostId: node.id, card: "studio-world" });
  }
  if (parent && WORLD_HOSTS.has(parent.type) && !NOT_A_BODY.has(node.type)) {
    if (worldOfNode(parent)) add("body", "🧲", "جسم فيزيائي|A physics body|גוף פיזיקלי", "شكله، وزنه، نطّه، ثابت بمكانه، معلّق بحبل أو نابض، مربوط بعنصر تاني|Its shape, weight, bounce, fixed in place, hung from a rope or a spring, tied to another element|צורה, משקל, קפיצות, קבוע במקום, תלוי בחבל או קפיץ", { kind: "group", group: "motion", card: "studio-body" });
    else if (!WORLD_HOSTS.has(node.type)) add("body-on", "🧲", "فيزياء لهالعنصر|Physics for this element|פיזיקה לרכיב הזה", `${parentName ? `«${parentName}» ` : ""}${say("بيصير عالم فيزيائي: كل اللي جوّاه بيصيروا أجسام، وهالعنصر واحد منهم|becomes a physics world: everything it holds becomes a body, this element one of them|הופך לעולם פיזיקלי: כל מה שבתוכו הופך לגופים")}`, { kind: "worldOn", hostId: parent.id, card: "studio-body" });
  }

  // What every element has.
  add("motion", "🎞", "الحركة|Motion|תנועה", "دخول، حركة مع السكرول، مفاتيح حركة، منحنى الحركة (نابض، ارتداد، خطوات)|Entrance, motion on scroll, keyframes, the motion's curve (spring, bounce, steps)|כניסה, תנועה בגלילה, פריימים, עקומת התנועה", { kind: "group", group: "motion" }, true);
  add("recipes", "⚡", "لما يصير شي|When something happens|כשקורה משהו", "لما يصير شي ← اعمل شي: كبسة، مرور، ظهور، تصادم، مفتاح… وبعدها حركة، صوت، تغيير أو فتح|When something happens → do something: a press, a hover, coming into view, a collision, a key… then motion, a sound, a change or opening|כשקורה משהו ← עשה משהו: לחיצה, מעבר, הופעה, התנגשות, מקש… ואז תנועה, צליל או שינוי", { kind: "group", group: "behaviour", card: "studio-triggers" }, true);
  add("maths", "📐", "رياضيات|Maths|מתמטיקה", "ألوان ومقاسات بالحساب: درجات اللون والألوان اللي بتلبق له، التباين، سلّم المسافات وسلّم أحجام الخط|Colours and sizes by maths: a colour's tones and mates, contrast, the scale of spaces and of font sizes|גווני הצבע, ניגודיות, סולם המרווחים וסולם גדלי הגופן", { kind: "variables" }, true);
  return out;
}

/** Where the bigger tools are, for the inspector with nothing selected: what it is, and the way to it. */
export const TOOL_GUIDE: Array<[icon: string, what: string, where: string]> = [
  ["✂", "تعديل الصور|Editing pictures|עריכת תמונות", "اختار صورة ← «عدّل الصورة»|Pick a picture → «Edit the picture»|בחר תמונה ← «ערוך את התמונה»"],
  ["🎨", "ألوان من صورة، وتركيزها على موضوعها|Colours from a picture, and its focus on its subject|צבעים מתמונה, ומיקוד בנושא שלה", "اختار صورة ← «ألوان من الصورة»؛ والتركيز من الشكل ← «لاقي الموضوع لحالك»|Pick a picture → «Colours from the picture»; the focus under Look → «Find the subject»|בחר תמונה ← «צבעים מהתמונה»; המיקוד תחת מראה ← «מצא את הנושא»"],
  ["🎬", "محرّر الفيديو|The video editor|עורך הווידאו", "اختار فيديو ← «محرّر الفيديو»|Pick a video → «The video editor»|בחר וידאו ← «עורך הווידאו»"],
  ["⏯", "فيديو بمشاهد مع السكرول|A video in scenes that follow the scroll|וידאו בסצנות עם הגלילה", "اختار فيديو ← «قسّمه لمشاهد»، أو + إضافة ← مشهد تمرير|Pick a video → «Split it into scenes», or + Add → Scroll scene|בחר וידאו ← «חלק אותו לסצנות», או + הוספה ← סצנת גלילה"],
  ["🤖", "كتابة بالذكاء، ووصف الصور|Writing with AI, and pictures' descriptions|כתיבה עם AI, ותיאורי תמונות", "اختار عنوان أو نص أو زر ← «كتابة بالذكاء»؛ صورة ← «وصف الصورة بالذكاء»|Pick a heading, a text or a button → «Write with AI»; a picture → «Describe it with AI»|בחר כותרת, טקסט או כפתור ← «כתיבה עם AI»; תמונה ← «תיאור עם AI»"],
  ["🧲", "الفيزياء|Physics|פיזיקה", "اختار قسم أو أي عنصر ← «فيزياء»|Pick a part or any element → «Physics»|בחר חלק או רכיב ← «פיזיקה»"],
  ["🧊", "مجسّم ثلاثي الأبعاد|A 3D model|מודל תלת־ממדי", "+ إضافة ← مجسّم 3D، وبعدها اختاره: المنصّة، الزوايا، النقاط، الأجزاء|+ Add → 3D model, then pick it: stage, views, spots, parts|+ הוספה ← מודל תלת־ממדי, ואז בחר אותו"],
  ["🎞", "الحركة والسكرول|Motion and scroll|תנועה וגלילה", "اختار أي عنصر ← «الحركة»|Pick any element → «Motion»|בחר רכיב ← «תנועה»"],
  ["⚡", "لما يصير شي ← اعمل شي|When something happens → do something|כשקורה משהו ← עשה משהו", "اختار أي عنصر ← «لما يصير شي»|Pick any element → «When something happens»|בחר רכיב ← «כשקורה משהו»"],
  ["📐", "رياضيات: ألوان ومقاسات بالحساب|Maths: colours and sizes worked out|מתמטיקה: צבעים ומידות בחישוב", "اختار أي عنصر ← «رياضيات»، أو الستايلات ← المتغيرات|Pick any element → «Maths», or Styles → Variables|בחר רכיב ← «מתמטיקה», או סגנונות ← משתנים"],
];
