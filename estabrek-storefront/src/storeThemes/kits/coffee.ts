/**
 * Coffee: a roaster's home. Dark and warm at the top, the week's crop up close with its
 * notes, the roast as a choice, brewing as a way in, the farm-to-cup story, a subscription,
 * the roastery's own places, and a letter for the next crop. Its own words and pictures;
 * every part of it is the editor's to change.
 */
import { M, btn, cols, el, grid, h, img, over, p, row, sec, shelf, stack, t, type K, type Node } from "./tree";

const pill = (k: K, words: string): Node =>
  p(k, t(words), { style: { size: 14, weight: 600, pad: [6, 14, 6, 14], radius: 999, bg: "accent-soft", color: "text", lineHeight: 1.4 }, motion: false });
const fact = (k: K, label: string, value: string): Node =>
  stack(k, [p(k, t(label), { style: { size: 13, color: "muted", lineHeight: 1.3 }, motion: false }), p(k, t(value), { style: { size: 17, weight: 600, lineHeight: 1.3 }, motion: false })], { style: { gap: 4, pad: [12, 16, 12, 16], radius: 6, bg: "surface" } });

export function coffeeHome(k: K): Node[] {
  return [
    // The opening: a dark, warm picture the whole screen high, the words low on it.
    sec(k, t("الافتتاحية|Opening|פתיחה"), [
      img(k, "hero", t("قهوة بتنصب ببطء|Coffee being poured slowly|קפה נמזג לאט"), { style: { height: "94vh", radius: 0, overlay: { color: "#140c06", to: "#140c0600", angle: 0, opacity: 0.85 } }, phone: { height: "86vh" }, motion: { enter: { kind: "zoom-out", duration: 1.6 } } }),
      stack(k, [
        p(k, t("محمّصة بإيدينا كل ثلاثاء|Roasted by hand every Tuesday|נקלה בעבודת יד בכל יום שלישי"), { style: { size: 15, weight: 600, color: "#e9d3b8" } }),
        h(k, t("من الحبّة\nللفنجان|From the bean\nto the cup|מהפול\nאל הספל"), 1, { style: { size: 112, sizeMin: 52, lineHeight: 1.02, color: "#fbf5ec" }, motion: M.letters }),
        p(k, t("قهوة مختصة من مزارع بنعرف أصحابها بالاسم، محمّصة على مهل لتطلع كل نكهاتها.|Specialty coffee from farms whose growers we know by name, roasted slowly to bring out every note.|קפה מיוחד מחוות שאת מגדליהן אנחנו מכירים בשם, קלוי לאט כדי להוציא כל טעם."), { style: { size: 19, color: "#f1e4d3", maxWidth: "560px" } }),
        row(k, [
          btn(k, t("تسوّق القهوة|Shop coffee|לקפה שלנו"), "/shop", "solid", { style: { bg: "#fbf5ec", color: "#1f140c", pad: [16, 28, 16, 28], radius: 999 } }),
          btn(k, t("محاصيل الموسم|This season's crops|היבולים של העונה"), "/shop", "outline", { style: { color: "#fbf5ec", border: { width: 1, color: "#fbf5ec" }, pad: [16, 28, 16, 28], radius: 999 } }),
        ], { style: { gap: 14, margin: [12, 0, 0, 0] } }),
      ], { style: { ...over(6, 88, "bottom-start"), width: "88%", maxWidth: "820px", gap: 18 }, phone: { layer: { x: 5, y: 92, anchor: "bottom-start" }, width: "90%" } }),
    ], { full: true, style: { pad: [0, 0, 0, 0], bg: "#140c06" }, phone: { pad: [0, 0, 0, 0] } }),

    // Where this season's coffee grows, running by.
    sec(k, t("بلاد المنشأ|Origins|ארצות המקור"), [
      el(k, "marquee", { items: [t("إثيوبيا|Ethiopia|אתיופיה"), t("كولومبيا|Colombia|קולומביה"), t("كينيا|Kenya|קניה"), t("غواتيمالا|Guatemala|גואטמלה"), t("اليمن|Yemen|תימן"), t("البرازيل|Brazil|ברזיל"), t("رواندا|Rwanda|רואנדה")], speed: 40, separator: "✦" }, { style: { size: 30, color: "accent" }, phone: { size: 22 } }),
    ], { full: true, style: { pad: [26, 0, 26, 0], bg: "bg", border: { width: 1, color: "border" } }, phone: { pad: [18, 0, 18, 0] } }),

    // The week's crop, up close: where it grew, what it tastes of, how it was made.
    sec(k, t("محصول الأسبوع|This week's crop|היבול של השבוע"), [
      cols(k, [5, 6], [
        [img(k, "crop", t("حبوب قهوة خضرا بإيدين المزارع|Green coffee in a grower's hands|פולי קפה ירוקים בידי מגדל"), { style: { aspect: "4 / 5", radius: 6 }, motion: { enter: { kind: "wipe-up", duration: 1.2 }, scroll: { kind: "parallax", speed: 0.12 } } })],
        [
          p(k, t("محصول الأسبوع|This week's crop|היבול של השבוע"), { style: { size: 14, weight: 700, color: "accent", caps: "upper" } }),
          h(k, t("إثيوبيا، يرغاتشيفي|Ethiopia, Yirgacheffe|אתיופיה, ירגצ'פה"), 2, { style: { size: 64, sizeMin: 36, lineHeight: 1.08 } }),
          row(k, [pill(k, "ياسمين|Jasmine|יסמין"), pill(k, "ليمون|Lemon|לימון"), pill(k, "عسل|Honey|דבש"), pill(k, "شاي أسود|Black tea|תה שחור")], { style: { gap: 8 }, motion: M.group }),
          p(k, t("حبوب مزروعة على ارتفاع ألفين متر، مغسولة ومجففة عالشمس. فنجان صافي وخفيف، بيبلش بالزهر وبيخلص بحلاوة العسل.|Grown two thousand metres up, washed and dried in the sun. A clean, light cup that opens with flowers and ends sweet as honey.|גדל בגובה אלפיים מטר, שטוף ומיובש בשמש. ספל נקי וקליל שנפתח בפרחים ומסתיים במתיקות של דבש."), { style: { size: 18, color: "muted", maxWidth: "540px" } }),
          grid(k, 2, [fact(k, "الارتفاع|Altitude|גובה", "2000 م|2,000 m|2,000 מ'"), fact(k, "المعالجة|Process|עיבוד", "مغسولة|Washed|שטוף"), fact(k, "الصنف|Variety|זן", "هيرلوم|Heirloom|הירלום"), fact(k, "التحميص|Roast|קלייה", "فاتح|Light|בהירה")], { phoneColumns: 2, style: { gap: 10, maxWidth: "540px" } }),
          btn(k, t("اطلب هالمحصول|Order this crop|להזמנת היבול"), "/shop", "solid", { style: { pad: [16, 30, 16, 30], radius: 999, margin: [8, 0, 0, 0] } }),
        ],
      ], { style: { gap: 72, align: "center" }, cellStyle: { gap: 18 } }),
    ], { style: { pad: [120, 24, 120, 24] } }),

    // The roast, as a choice: each level what it tastes like and what to brew it in.
    sec(k, t("درجة التحميص|The roast|דרגת הקלייה"), [
      stack(k, [
        h(k, t("قدّيش بتحبها محمّصة؟|How do you like it roasted?|באיזו קלייה אוהבים?"), 2, { style: { size: 52, sizeMin: 32, textAlign: "center" } }),
        p(k, t("كل درجة إلها طعمها. اختار وشوف شو بيناسبك.|Every roast tastes its own way. Pick one and see what suits it.|לכל קלייה טעם משלה. בוחרים ורואים מה מתאים."), { style: { size: 18, color: "muted", textAlign: "center" } }),
      ], { style: { align: "center", gap: 12, margin: [0, 0, 40, 0] } }),
      el(k, "tabs", {
        look: "underline",
        items: [
          { label: t("فاتح|Light|בהירה"), text: t("حموضة لامعة ونكهات فواكه وزهر. أحلى بالتقطير والـV60.|Bright acidity, fruit and flowers. Best as a pour-over or a V60.|חמיצות בהירה, פירות ופרחים. הכי טוב בחליטה בטפטוף או ב־V60."), image: k.pic("roast-light") },
          { label: t("وسط|Medium|בינונית"), text: t("توازن بين الحلاوة والجسم، شوكولا وكراميل. بتمشي مع كل طريقة.|Sweetness and body in balance, chocolate and caramel. Good every way.|איזון בין מתיקות לגוף, שוקולד וקרמל. מתאים לכל דרך הכנה."), image: k.pic("roast-medium") },
          { label: t("غامق|Dark|כהה"), text: t("جسم تقيل ومرارة دافية، كاكاو ومكسرات محمّصة. للإسبريسو والقهوة مع حليب.|Full body and a warm bitterness, cocoa and roasted nuts. For espresso and coffee with milk.|גוף מלא ומרירות חמימה, קקאו ואגוזים קלויים. לאספרסו ולקפה עם חלב."), image: k.pic("roast-dark") },
        ],
      }, { style: { maxWidth: "980px", self: "center", width: "100%" }, motion: M.up() }),
    ], { style: { bg: "surface" } }),

    // Brewing as a way into the shop.
    sec(k, t("طريقة التحضير|How you brew|דרך ההכנה"), [
      row(k, [
        h(k, t("حسب طريقة التحضير|By how you brew|לפי דרך ההכנה"), 2, { style: { size: 52, sizeMin: 32 } }),
        btn(k, t("كل الأدوات|All the gear|כל הציוד"), "/shop", "link", { style: { size: 16 } }),
      ], { style: { justify: "between", align: "end", margin: [0, 0, 36, 0] } }),
      grid(k, 4, [
        ["brew-espresso", "إسبريسو|Espresso|אספרסו", "مركّز وقوي|Short and strong|קצר וחזק"],
        ["brew-pourover", "تقطير|Pour-over|חליטה בטפטוף", "صافي وخفيف|Clean and light|נקי וקליל"],
        ["brew-press", "فرنش برس|French press|פרנץ' פרס", "جسم كامل|Full-bodied|גוף מלא"],
        ["brew-cezve", "قهوة تركية|Turkish coffee|קפה טורקי", "بالركوة عالنار|In a cezve, on the flame|בפינג'אן, על האש"],
      ].map(([pic, name, note]) =>
        stack(k, [
          img(k, pic, t(name), { href: "/shop", style: { aspect: "3 / 4", radius: 6 }, motion: { ...M.zoom } }),
          h(k, t(name), 3, { style: { size: 24 }, motion: false }),
          p(k, t(note), { style: { size: 15, color: "muted" }, motion: false }),
        ], { style: { gap: 10 } }),
      ), { phoneColumns: 2, style: { gap: 20 } }),
    ]),

    // The store's own coffees, newest first.
    sec(k, t("وصل جديد|Just in|הגיע עכשיו"), [
      shelf(k, t("وصل هالأسبوع|In this week|הגיע השבוע"), [
        { pic: "bag-1", name: t("إثيوبيا، غوجي|Ethiopia, Guji|אתיופיה, גוג'י"), price: "64", note: t("خوخ، بيرغموت|Peach, bergamot|אפרסק, ברגמוט") },
        { pic: "bag-2", name: t("كولومبيا، هويلا|Colombia, Huila|קולומביה, הואילה"), price: "58", note: t("كراميل، تفاح أحمر|Caramel, red apple|קרמל, תפוח אדום") },
        { pic: "bag-3", name: t("كينيا، نييري|Kenya, Nyeri|קניה, נייֶרי"), price: "72", note: t("كشمش أسود، جريب فروت|Blackcurrant, grapefruit|דומדמניות שחורות, אשכולית") },
        { pic: "bag-4", name: t("خلطة البيت|House blend|תערובת הבית"), price: "49", note: t("شوكولا، بندق|Chocolate, hazelnut|שוקולד, אגוזי לוז") },
      ]),
    ], { style: { pad: [40, 24, 104, 24] } }),

    // From the farm to the cup: a picture that moves slower than the page, three steps on it.
    sec(k, t("من المزرعة|From the farm|מהחווה"), [
      img(k, "farm", t("مزرعة قهوة عالجبل|A coffee farm on a mountainside|חוות קפה על צלע הר"), { style: { height: "88vh", radius: 0, overlay: { color: "#140c06", opacity: 0.55 } }, phone: { height: "100vh" }, motion: M.parallax(0.3) }),
      stack(k, [
        h(k, t("كل حبّة إلها اسم|Every bean has a name|לכל פול יש שם"), 2, { style: { size: 76, sizeMin: 38, color: "#fbf5ec", textAlign: "center" }, motion: M.letters }),
        p(k, t("بنشتري مباشرة من المزارعين، وبندفع أكتر من سعر السوق، وبنحكيلك قصة كل كيس.|We buy straight from the growers, pay above the market, and tell you each bag's story.|אנחנו קונים ישירות מהמגדלים, משלמים מעל מחיר השוק ומספרים את הסיפור של כל שקית."), { style: { size: 19, color: "#f1e4d3", textAlign: "center", maxWidth: "620px", self: "center" } }),
        grid(k, 3, [
          ["01", "المزرعة|The farm|החווה", "قطف باليد بأوجه الموسم|Picked by hand at the season's peak|נקטף ביד בשיא העונה"],
          ["02", "المحمصة|The roastery|בית הקלייה", "دفعات صغيرة كل أسبوع|Small batches every week|מנות קטנות בכל שבוע"],
          ["03", "فنجانك|Your cup|הספל שלך", "عندك خلال يومين|With you within two days|אצלך תוך יומיים"],
        ].map(([n, title, line]) =>
          stack(k, [
            p(k, t(n), { style: { size: 15, weight: 700, color: "#e9d3b8" }, motion: false }),
            h(k, t(title), 3, { style: { size: 28, color: "#fbf5ec" }, motion: false }),
            p(k, t(line), { style: { size: 15, color: "#e9d3b8" }, motion: false }),
          ], { style: { gap: 6, pad: [20, 0, 0, 0], border: { width: 1, color: "#fbf5ec55" } } }),
        ), { style: { gap: 32, margin: [32, 0, 0, 0], width: "100%", self: "stretch" }, phoneColumns: 1 }),
      ], { style: { ...over(50, 50), width: "90%", maxWidth: "1040px", gap: 18, align: "center" } }),
    ], { full: true, style: { pad: [0, 0, 0, 0], bg: "#140c06" }, phone: { pad: [0, 0, 0, 0] } }),

    // A subscription: the next crop, every week, fortnight or month.
    sec(k, t("الاشتراك|Subscription|מנוי"), [
      stack(k, [
        p(k, t("اشتراك القهوة|The coffee subscription|מנוי הקפה"), { style: { size: 14, weight: 700, color: "accent", caps: "upper", textAlign: "center" } }),
        h(k, t("ما رح تخلص قهوتك|You'll never run out|הקפה לא ייגמר לך"), 2, { style: { size: 56, sizeMin: 34, textAlign: "center" } }),
        p(k, t("محصول جديد بيوصلك طازة من المحمصة. بتوقف أو بتغيّر وقت ما بدك.|A new crop, fresh from the roaster. Pause or change it whenever you like.|יבול חדש מגיע אליך טרי מבית הקלייה. אפשר לעצור או לשנות מתי שרוצים."), { style: { size: 18, color: "muted", textAlign: "center" } }),
      ], { style: { align: "center", gap: 12, margin: [0, 0, 44, 0] } }),
      el(k, "pricing", {
        items: [
          { name: t("كل شهر|Monthly|כל חודש"), price: t("89"), period: t("بالشهر|a month|לחודש"), features: t("كيس 250 غرام\nمحصول جديد كل مرة\nتوصيل مجاني|One 250 g bag\nA new crop each time\nFree delivery|שקית של 250 גרם\nיבול חדש בכל פעם\nמשלוח חינם"), cta: t("اشترك|Subscribe|להרשמה"), href: "/shop" },
          { name: t("كل أسبوعين|Every two weeks|כל שבועיים"), price: t("159"), period: t("بالشهر|a month|לחודש"), features: t("كيسين 250 غرام\nمحصولين مختلفين\nتوصيل مجاني|Two 250 g bags\nTwo different crops\nFree delivery|שתי שקיות של 250 גרם\nשני יבולים שונים\nמשלוח חינם"), badge: t("الأكثر طلباً|Most chosen|הכי נבחר"), featured: true, cta: t("اشترك|Subscribe|להרשמה"), href: "/shop" },
          { name: t("كل أسبوع|Weekly|כל שבוע"), price: t("299"), period: t("بالشهر|a month|לחודש"), features: t("أربع أكياس 250 غرام\nللبيت أو للمكتب\nتوصيل مجاني|Four 250 g bags\nFor home or the office\nFree delivery|ארבע שקיות של 250 גרם\nלבית או למשרד\nמשלוח חינם"), cta: t("اشترك|Subscribe|להרשמה"), href: "/shop" },
        ],
      }, { motion: M.group }),
    ], { style: { bg: "accent-soft" } }),

    // The roastery's own places: two big pictures, the words on them.
    sec(k, t("زورونا|Visit us|בואו לבקר"), [
      cols(k, [1, 1], [
        ["class", "ورشة التحضير|Brewing class|סדנת חליטה", "تعلّم تحضّر فنجانك متل الباريستا، كل جمعة الصبح.|Learn to brew like a barista, every Friday morning.|ללמוד לחלוט כמו בריסטה, בכל שישי בבוקר.", "احجز مكانك|Book a place|לשריון מקום"],
        ["cafe", "المحمصة والمقهى|The roastery café|בית הקלייה והקפה", "اشرب القهوة جنب المحمصة وشمّ الدفعة الجاية.|Drink by the roaster and smell the next batch.|לשתות ליד מכונת הקלייה ולהריח את המנה הבאה.", "شوف المواعيد|Opening hours|שעות פתיחה"],
      ].map(([pic, title, line, cta]) => [
        stack(k, [
          img(k, pic, t(title), { style: { height: "560px", radius: 6, overlay: { color: "#140c06", to: "#140c0600", angle: 0, opacity: 0.8 } }, phone: { height: "440px" }, motion: { enter: { kind: "wipe-up", duration: 1.1 }, hover: { kind: "zoom" } } }),
          stack(k, [
            h(k, t(title), 3, { style: { size: 36, color: "#fbf5ec" }, motion: false }),
            p(k, t(line), { style: { size: 16, color: "#f1e4d3" }, motion: false }),
            btn(k, t(cta), "/contact", "link", { style: { color: "#fbf5ec" }, motion: false }),
          ], { style: { ...over(6, 92, "bottom-start"), width: "86%", gap: 8 } }),
        ], { style: { gap: 0 } }),
      ]), { style: { gap: 20 } }),
    ]),

    // Numbers that say who we are.
    sec(k, t("بالأرقام|In numbers|במספרים"), [
      grid(k, 3, [
        ["12", "بلد منشأ هالسنة|origins this year|ארצות מקור השנה"],
        ["48", "ساعة من المحمصة لبابك|hours from roaster to door|שעות מהקלייה לדלת"],
        ["100", "٪ حبوب مختصة|% specialty beans|% פולים מיוחדים"],
      ].map(([n, line]) =>
        stack(k, [
          h(k, t(n), 2, { style: { size: 88, sizeMin: 52, color: "accent", lineHeight: 1 }, motion: M.count }),
          p(k, t(line), { style: { size: 16, color: "muted" }, motion: false }),
        ], { style: { gap: 6, align: "center", textAlign: "center" } }),
      ), { phoneColumns: 1, style: { gap: 40 } }),
    ], { style: { pad: [88, 24, 88, 24], border: { width: 1, color: "border" } } }),

    // The journal: guides and stories.
    sec(k, t("المجلة|The journal|היומן"), [
      h(k, t("من دفتر المحمصة|From the roaster's notebook|מהמחברת של בית הקלייה"), 2, { style: { size: 52, sizeMin: 32, margin: [0, 0, 36, 0] } }),
      grid(k, 3, [
        ["story-1", "دليل|Guide|מדריך", "الـV60 بخمس خطوات|The V60 in five steps|ה־V60 בחמישה צעדים"],
        ["story-2", "معرفة|Know-how|ידע", "ليش القهوة الفاتحة حامضة؟|Why is light coffee sour?|למה קפה בהיר חמוץ?"],
        ["story-3", "رحلة|Journey|מסע", "أسبوع بمزرعة بإثيوبيا|A week on an Ethiopian farm|שבוע בחווה באתיופיה"],
      ].map(([pic, kind, title]) =>
        stack(k, [
          img(k, pic, t(title), { href: "/about", style: { aspect: "4 / 3", radius: 6 }, motion: { ...M.zoom } }),
          p(k, t(kind), { style: { size: 13, weight: 700, color: "accent", caps: "upper" }, motion: false }),
          h(k, t(title), 3, { style: { size: 26 }, motion: false }),
          btn(k, t("اقرأ|Read|לקריאה"), "/about", "link", { motion: false }),
        ], { style: { gap: 10 } }),
      ), { phoneColumns: 1, style: { gap: 28 } }),
    ]),

    // A letter for the next crop.
    sec(k, t("النشرة|Newsletter|ניוזלטר"), [
      cols(k, [6, 5], [
        [h(k, t("أول مين بيعرف بالمحصول الجاي|First to hear of the next crop|הראשונים לשמוע על היבול הבא"), 2, { style: { size: 60, sizeMin: 34, color: "bg" } }),
          p(k, t("رسالة وحدة بالأسبوع: شو تحمّص، ومن وين إجا، وكيف تحضّره.|One letter a week: what we roasted, where it came from, how to brew it.|מכתב אחד בשבוע: מה קלינו, מאיפה זה הגיע ואיך לחלוט."), { style: { size: 18, color: "bg", opacity: 0.8 } })],
        [el(k, "form", { kind: "newsletter" }, { style: { width: "100%" } })],
      ], { style: { gap: 56, align: "center" } }),
    ], { style: { bg: "text", color: "bg", pad: [112, 24, 112, 24] } }),
  ];
}
