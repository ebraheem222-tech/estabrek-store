// ============================================================
// ESTABREK - INTERACTION EFFECTS (HOVER / FOCUS)
// ============================================================

export type InteractionEffectCategory =
  | "transform"
  | "shadow"
  | "color"
  | "border"
  | "glow"
  | "image"
  | "overlay"
  | "text"
  | "button"
  | "card"
  | "link"
  | "3d"
  | "animation";

export type InteractionEffect = {
  id: string;
  name: string;
  nameAr: string;
  category: InteractionEffectCategory;
  hoverClassName: string;
  focusClassName: string;
};

export const INTERACTION_CATEGORY_LABELS_AR: Record<InteractionEffectCategory, string> = {
  transform: "تحويلات",
  shadow: "ظلال",
  color: "ألوان",
  border: "حدود",
  glow: "توهج",
  image: "صور",
  overlay: "تغطيات",
  text: "نصوص",
  button: "أزرار",
  card: "بطاقات",
  link: "روابط",
  "3d": "ثلاثي الأبعاد",
  animation: "حركات",
};

export const INTERACTION_EFFECTS: InteractionEffect[] = [
  // ============================================================
  // 📐 TRANSFORM EFFECTS
  // ============================================================
  {
    id: "hover-scale-up",
    name: "Scale Up",
    nameAr: "تكبير",
    category: "transform",
    hoverClassName: "transition-transform duration-300 hover:scale-105",
    focusClassName: "transition-transform duration-300 focus-within:scale-105",
  },
  {
    id: "hover-scale-up-lg",
    name: "Scale Up Large",
    nameAr: "تكبير كبير",
    category: "transform",
    hoverClassName: "transition-transform duration-300 hover:scale-110",
    focusClassName: "transition-transform duration-300 focus-within:scale-110",
  },
  {
    id: "hover-scale-down",
    name: "Scale Down",
    nameAr: "تصغير",
    category: "transform",
    hoverClassName: "transition-transform duration-300 hover:scale-95",
    focusClassName: "transition-transform duration-300 focus-within:scale-95",
  },
  {
    id: "hover-rotate-cw",
    name: "Rotate Clockwise",
    nameAr: "دوران مع عقارب الساعة",
    category: "transform",
    hoverClassName: "transition-transform duration-300 hover:rotate-3",
    focusClassName: "transition-transform duration-300 focus-within:rotate-3",
  },
  {
    id: "hover-rotate-ccw",
    name: "Rotate Counter-Clockwise",
    nameAr: "دوران عكس عقارب الساعة",
    category: "transform",
    hoverClassName: "transition-transform duration-300 hover:-rotate-3",
    focusClassName: "transition-transform duration-300 focus-within:-rotate-3",
  },
  {
    id: "hover-rotate-full",
    name: "Rotate Full",
    nameAr: "دوران كامل",
    category: "transform",
    hoverClassName: "transition-transform duration-500 hover:rotate-180",
    focusClassName: "transition-transform duration-500 focus-within:rotate-180",
  },
  {
    id: "hover-skew-x",
    name: "Skew X",
    nameAr: "ميل أفقي",
    category: "transform",
    hoverClassName: "transition-transform duration-300 hover:skew-x-3",
    focusClassName: "transition-transform duration-300 focus-within:skew-x-3",
  },
  {
    id: "hover-skew-y",
    name: "Skew Y",
    nameAr: "ميل عمودي",
    category: "transform",
    hoverClassName: "transition-transform duration-300 hover:skew-y-3",
    focusClassName: "transition-transform duration-300 focus-within:skew-y-3",
  },
  {
    id: "hover-translate-up",
    name: "Translate Up",
    nameAr: "تحريك للأعلى",
    category: "transform",
    hoverClassName: "transition-transform duration-300 hover:-translate-y-2",
    focusClassName: "transition-transform duration-300 focus-within:-translate-y-2",
  },
  {
    id: "hover-translate-down",
    name: "Translate Down",
    nameAr: "تحريك للأسفل",
    category: "transform",
    hoverClassName: "transition-transform duration-300 hover:translate-y-2",
    focusClassName: "transition-transform duration-300 focus-within:translate-y-2",
  },
  {
    id: "hover-translate-left",
    name: "Translate Left",
    nameAr: "تحريك لليسار",
    category: "transform",
    hoverClassName: "transition-transform duration-300 hover:-translate-x-2",
    focusClassName: "transition-transform duration-300 focus-within:-translate-x-2",
  },
  {
    id: "hover-translate-right",
    name: "Translate Right",
    nameAr: "تحريك لليمين",
    category: "transform",
    hoverClassName: "transition-transform duration-300 hover:translate-x-2",
    focusClassName: "transition-transform duration-300 focus-within:translate-x-2",
  },
  {
    id: "hover-lift",
    name: "Lift",
    nameAr: "رفع",
    category: "transform",
    hoverClassName: "transition-all duration-300 hover:-translate-y-2 hover:shadow-lg",
    focusClassName: "transition-all duration-300 focus-within:-translate-y-2 focus-within:shadow-lg",
  },
  {
    id: "hover-sink",
    name: "Sink",
    nameAr: "غرق",
    category: "transform",
    hoverClassName: "transition-all duration-300 hover:translate-y-1 hover:shadow-sm",
    focusClassName: "transition-all duration-300 focus-within:translate-y-1 focus-within:shadow-sm",
  },
  {
    id: "hover-grow-rotate",
    name: "Grow & Rotate",
    nameAr: "تكبير ودوران",
    category: "transform",
    hoverClassName: "transition-transform duration-300 hover:scale-110 hover:rotate-3",
    focusClassName: "transition-transform duration-300 focus-within:scale-110 focus-within:rotate-3",
  },

  // ============================================================
  // 🌫️ SHADOW EFFECTS
  // ============================================================
  {
    id: "hover-shadow-sm",
    name: "Shadow Small",
    nameAr: "ظل صغير",
    category: "shadow",
    hoverClassName: "transition-shadow duration-300 hover:shadow-md",
    focusClassName: "transition-shadow duration-300 focus-within:shadow-md",
  },
  {
    id: "hover-shadow-md",
    name: "Shadow Medium",
    nameAr: "ظل متوسط",
    category: "shadow",
    hoverClassName: "transition-shadow duration-300 hover:shadow-lg",
    focusClassName: "transition-shadow duration-300 focus-within:shadow-lg",
  },
  {
    id: "hover-shadow-lg",
    name: "Shadow Large",
    nameAr: "ظل كبير",
    category: "shadow",
    hoverClassName: "transition-shadow duration-300 hover:shadow-xl",
    focusClassName: "transition-shadow duration-300 focus-within:shadow-xl",
  },
  {
    id: "hover-shadow-xl",
    name: "Shadow Extra Large",
    nameAr: "ظل كبير جداً",
    category: "shadow",
    hoverClassName: "transition-shadow duration-300 hover:shadow-2xl",
    focusClassName: "transition-shadow duration-300 focus-within:shadow-2xl",
  },
  {
    id: "hover-shadow-color-blue",
    name: "Shadow Blue",
    nameAr: "ظل أزرق",
    category: "shadow",
    hoverClassName: "transition-shadow duration-300 hover:shadow-lg hover:shadow-blue-500/30",
    focusClassName: "transition-shadow duration-300 focus-within:shadow-lg focus-within:shadow-blue-500/30",
  },
  {
    id: "hover-shadow-color-purple",
    name: "Shadow Purple",
    nameAr: "ظل بنفسجي",
    category: "shadow",
    hoverClassName: "transition-shadow duration-300 hover:shadow-lg hover:shadow-purple-500/30",
    focusClassName: "transition-shadow duration-300 focus-within:shadow-lg focus-within:shadow-purple-500/30",
  },
  {
    id: "hover-shadow-color-pink",
    name: "Shadow Pink",
    nameAr: "ظل وردي",
    category: "shadow",
    hoverClassName: "transition-shadow duration-300 hover:shadow-lg hover:shadow-pink-500/30",
    focusClassName: "transition-shadow duration-300 focus-within:shadow-lg focus-within:shadow-pink-500/30",
  },
  {
    id: "hover-shadow-color-green",
    name: "Shadow Green",
    nameAr: "ظل أخضر",
    category: "shadow",
    hoverClassName: "transition-shadow duration-300 hover:shadow-lg hover:shadow-green-500/30",
    focusClassName: "transition-shadow duration-300 focus-within:shadow-lg focus-within:shadow-green-500/30",
  },
  {
    id: "hover-shadow-color-orange",
    name: "Shadow Orange",
    nameAr: "ظل برتقالي",
    category: "shadow",
    hoverClassName: "transition-shadow duration-300 hover:shadow-lg hover:shadow-orange-500/30",
    focusClassName: "transition-shadow duration-300 focus-within:shadow-lg focus-within:shadow-orange-500/30",
  },
  {
    id: "hover-shadow-glow",
    name: "Shadow Glow",
    nameAr: "ظل متوهج",
    category: "shadow",
    hoverClassName: "transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]",
    focusClassName: "transition-shadow duration-300 focus-within:shadow-[0_0_30px_rgba(59,130,246,0.5)]",
  },
  {
    id: "hover-shadow-neon",
    name: "Shadow Neon",
    nameAr: "ظل نيون",
    category: "shadow",
    hoverClassName: "transition-shadow duration-300 hover:shadow-[0_0_20px_rgba(0,255,255,0.6),0_0_40px_rgba(0,255,255,0.3)]",
    focusClassName:
      "transition-shadow duration-300 focus-within:shadow-[0_0_20px_rgba(0,255,255,0.6),0_0_40px_rgba(0,255,255,0.3)]",
  },
  {
    id: "hover-shadow-inner",
    name: "Shadow Inner",
    nameAr: "ظل داخلي",
    category: "shadow",
    hoverClassName: "transition-shadow duration-300 hover:shadow-inner",
    focusClassName: "transition-shadow duration-300 focus-within:shadow-inner",
  },

  // ============================================================
  // 🎨 COLOR EFFECTS
  // ============================================================
  {
    id: "hover-bg-darken",
    name: "Background Darken",
    nameAr: "تعتيم الخلفية",
    category: "color",
    hoverClassName: "transition-colors duration-300 hover:bg-black/10",
    focusClassName: "transition-colors duration-300 focus-within:bg-black/10",
  },
  {
    id: "hover-bg-lighten",
    name: "Background Lighten",
    nameAr: "تفتيح الخلفية",
    category: "color",
    hoverClassName: "transition-colors duration-300 hover:bg-white/10",
    focusClassName: "transition-colors duration-300 focus-within:bg-white/10",
  },
  {
    id: "hover-bg-blue",
    name: "Background Blue",
    nameAr: "خلفية زرقاء",
    category: "color",
    hoverClassName: "transition-colors duration-300 hover:bg-blue-500 hover:text-white",
    focusClassName: "transition-colors duration-300 focus-within:bg-blue-500 focus-within:text-white",
  },
  {
    id: "hover-bg-gradient",
    name: "Background Gradient",
    nameAr: "خلفية متدرجة",
    category: "color",
    hoverClassName:
      "transition-all duration-300 bg-gray-100 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white",
    focusClassName:
      "transition-all duration-300 bg-gray-100 focus-within:bg-gradient-to-r focus-within:from-blue-500 focus-within:to-purple-500 focus-within:text-white",
  },
  {
    id: "hover-text-blue",
    name: "Text Blue",
    nameAr: "نص أزرق",
    category: "color",
    hoverClassName: "transition-colors duration-300 hover:text-blue-500",
    focusClassName: "transition-colors duration-300 focus-within:text-blue-500",
  },
  {
    id: "hover-text-gradient",
    name: "Text Gradient",
    nameAr: "نص متدرج",
    category: "color",
    hoverClassName:
      "transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:bg-clip-text hover:text-transparent",
    focusClassName:
      "transition-all duration-300 focus-within:bg-gradient-to-r focus-within:from-blue-500 focus-within:to-purple-500 focus-within:bg-clip-text focus-within:text-transparent",
  },
  {
    id: "hover-invert",
    name: "Invert Colors",
    nameAr: "عكس الألوان",
    category: "color",
    hoverClassName: "transition-all duration-300 bg-white text-black hover:bg-black hover:text-white",
    focusClassName: "transition-all duration-300 bg-white text-black focus-within:bg-black focus-within:text-white",
  },
  {
    id: "hover-opacity-down",
    name: "Opacity Down",
    nameAr: "تقليل الشفافية",
    category: "color",
    hoverClassName: "transition-opacity duration-300 hover:opacity-70",
    focusClassName: "transition-opacity duration-300 focus-within:opacity-70",
  },
  {
    id: "hover-opacity-up",
    name: "Opacity Up",
    nameAr: "زيادة الشفافية",
    category: "color",
    hoverClassName: "transition-opacity duration-300 opacity-70 hover:opacity-100",
    focusClassName: "transition-opacity duration-300 opacity-70 focus-within:opacity-100",
  },
  {
    id: "hover-brightness-up",
    name: "Brightness Up",
    nameAr: "زيادة السطوع",
    category: "color",
    hoverClassName: "transition-all duration-300 hover:brightness-110",
    focusClassName: "transition-all duration-300 focus-within:brightness-110",
  },
  {
    id: "hover-brightness-down",
    name: "Brightness Down",
    nameAr: "تقليل السطوع",
    category: "color",
    hoverClassName: "transition-all duration-300 hover:brightness-90",
    focusClassName: "transition-all duration-300 focus-within:brightness-90",
  },
  {
    id: "hover-saturate",
    name: "Saturate",
    nameAr: "تشبع",
    category: "color",
    hoverClassName: "transition-all duration-300 hover:saturate-150",
    focusClassName: "transition-all duration-300 focus-within:saturate-150",
  },

  // ============================================================
  // 🔲 BORDER EFFECTS
  // ============================================================
  {
    id: "hover-border-appear",
    name: "Border Appear",
    nameAr: "ظهور الحد",
    category: "border",
    hoverClassName: "border-2 border-transparent transition-colors duration-300 hover:border-gray-900",
    focusClassName: "border-2 border-transparent transition-colors duration-300 focus-within:border-gray-900",
  },
  {
    id: "hover-border-color",
    name: "Border Color Change",
    nameAr: "تغيير لون الحد",
    category: "border",
    hoverClassName: "border-2 border-gray-300 transition-colors duration-300 hover:border-blue-500",
    focusClassName: "border-2 border-gray-300 transition-colors duration-300 focus-within:border-blue-500",
  },
  {
    id: "hover-border-width",
    name: "Border Width",
    nameAr: "زيادة عرض الحد",
    category: "border",
    hoverClassName: "border border-gray-300 transition-all duration-300 hover:border-2 hover:border-gray-900",
    focusClassName: "border border-gray-300 transition-all duration-300 focus-within:border-2 focus-within:border-gray-900",
  },
  {
    id: "hover-border-bottom",
    name: "Border Bottom",
    nameAr: "حد سفلي",
    category: "border",
    hoverClassName: "border-b-2 border-transparent transition-colors duration-300 hover:border-blue-500",
    focusClassName: "border-b-2 border-transparent transition-colors duration-300 focus-within:border-blue-500",
  },
  {
    id: "hover-border-left",
    name: "Border Left",
    nameAr: "حد يساري",
    category: "border",
    hoverClassName: "border-r-4 border-transparent transition-colors duration-300 hover:border-blue-500",
    focusClassName: "border-r-4 border-transparent transition-colors duration-300 focus-within:border-blue-500",
  },
  {
    id: "hover-border-gradient",
    name: "Border Gradient",
    nameAr: "حد متدرج",
    category: "border",
    hoverClassName:
      "relative before:absolute before:inset-0 before:border-2 before:border-transparent before:transition-all before:duration-300 hover:before:border-blue-500",
    focusClassName:
      "relative before:absolute before:inset-0 before:border-2 before:border-transparent before:transition-all before:duration-300 focus-within:before:border-blue-500",
  },
  {
    id: "hover-outline",
    name: "Outline",
    nameAr: "إطار خارجي",
    category: "border",
    hoverClassName: "outline-none transition-all duration-300 hover:outline hover:outline-2 hover:outline-blue-500 hover:outline-offset-2",
    focusClassName:
      "outline-none transition-all duration-300 focus-within:outline focus-within:outline-2 focus-within:outline-blue-500 focus-within:outline-offset-2",
  },
  {
    id: "hover-ring",
    name: "Ring",
    nameAr: "حلقة",
    category: "border",
    hoverClassName: "transition-all duration-300 hover:ring-2 hover:ring-blue-500 hover:ring-offset-2",
    focusClassName: "transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2",
  },
  {
    id: "hover-ring-pulse",
    name: "Ring Pulse",
    nameAr: "حلقة نابضة",
    category: "border",
    hoverClassName: "transition-all duration-300 hover:ring-4 hover:ring-blue-500/50 hover:ring-offset-2",
    focusClassName:
      "transition-all duration-300 focus-within:ring-4 focus-within:ring-blue-500/50 focus-within:ring-offset-2",
  },
  {
    id: "hover-rounded",
    name: "Rounded Corners",
    nameAr: "زوايا مستديرة",
    category: "border",
    hoverClassName: "rounded transition-all duration-300 hover:rounded-xl",
    focusClassName: "rounded transition-all duration-300 focus-within:rounded-xl",
  },
  {
    id: "hover-rounded-full",
    name: "Rounded Full",
    nameAr: "استدارة كاملة",
    category: "border",
    hoverClassName: "rounded-lg transition-all duration-300 hover:rounded-full",
    focusClassName: "rounded-lg transition-all duration-300 focus-within:rounded-full",
  },
  {
    id: "hover-border-dashed",
    name: "Border Dashed",
    nameAr: "حد متقطع",
    category: "border",
    hoverClassName: "border-2 border-solid border-gray-300 transition-all duration-300 hover:border-dashed hover:border-blue-500",
    focusClassName:
      "border-2 border-solid border-gray-300 transition-all duration-300 focus-within:border-dashed focus-within:border-blue-500",
  },

  // ============================================================
  // ✨ GLOW & NEON EFFECTS
  // ============================================================
  {
    id: "hover-glow-cyan",
    name: "Glow Cyan",
    nameAr: "توهج سماوي",
    category: "glow",
    hoverClassName: "transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(0,255,255,0.6)]",
    focusClassName: "transition-shadow duration-300 focus-within:shadow-[0_0_30px_rgba(0,255,255,0.6)]",
  },
  {
    id: "hover-glow-pink",
    name: "Glow Pink",
    nameAr: "توهج وردي",
    category: "glow",
    hoverClassName: "transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(236,72,153,0.6)]",
    focusClassName: "transition-shadow duration-300 focus-within:shadow-[0_0_30px_rgba(236,72,153,0.6)]",
  },
  {
    id: "hover-glow-purple",
    name: "Glow Purple",
    nameAr: "توهج بنفسجي",
    category: "glow",
    hoverClassName: "transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]",
    focusClassName: "transition-shadow duration-300 focus-within:shadow-[0_0_30px_rgba(168,85,247,0.6)]",
  },
  {
    id: "hover-glow-green",
    name: "Glow Green",
    nameAr: "توهج أخضر",
    category: "glow",
    hoverClassName: "transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]",
    focusClassName: "transition-shadow duration-300 focus-within:shadow-[0_0_30px_rgba(34,197,94,0.6)]",
  },
  {
    id: "hover-glow-orange",
    name: "Glow Orange",
    nameAr: "توهج برتقالي",
    category: "glow",
    hoverClassName: "transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(249,115,22,0.6)]",
    focusClassName: "transition-shadow duration-300 focus-within:shadow-[0_0_30px_rgba(249,115,22,0.6)]",
  },
  {
    id: "hover-glow-red",
    name: "Glow Red",
    nameAr: "توهج أحمر",
    category: "glow",
    hoverClassName: "transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]",
    focusClassName: "transition-shadow duration-300 focus-within:shadow-[0_0_30px_rgba(239,68,68,0.6)]",
  },
  {
    id: "hover-glow-gold",
    name: "Glow Gold",
    nameAr: "توهج ذهبي",
    category: "glow",
    hoverClassName: "transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(251,191,36,0.6)]",
    focusClassName: "transition-shadow duration-300 focus-within:shadow-[0_0_30px_rgba(251,191,36,0.6)]",
  },
  {
    id: "hover-glow-white",
    name: "Glow White",
    nameAr: "توهج أبيض",
    category: "glow",
    hoverClassName: "transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.6)]",
    focusClassName: "transition-shadow duration-300 focus-within:shadow-[0_0_30px_rgba(255,255,255,0.6)]",
  },
  {
    id: "hover-neon-border",
    name: "Neon Border",
    nameAr: "حد نيون",
    category: "glow",
    hoverClassName:
      "border-2 border-cyan-500 transition-shadow duration-300 hover:shadow-[0_0_10px_rgba(0,255,255,0.8),0_0_20px_rgba(0,255,255,0.6),inset_0_0_10px_rgba(0,255,255,0.4)]",
    focusClassName:
      "border-2 border-cyan-500 transition-shadow duration-300 focus-within:shadow-[0_0_10px_rgba(0,255,255,0.8),0_0_20px_rgba(0,255,255,0.6),inset_0_0_10px_rgba(0,255,255,0.4)]",
  },
  {
    id: "hover-neon-text",
    name: "Neon Text",
    nameAr: "نص نيون",
    category: "glow",
    hoverClassName:
      "transition-all duration-300 hover:[text-shadow:0_0_10px_currentColor,0_0_20px_currentColor,0_0_30px_currentColor]",
    focusClassName:
      "transition-all duration-300 focus-within:[text-shadow:0_0_10px_currentColor,0_0_20px_currentColor,0_0_30px_currentColor]",
  },

  // ============================================================
  // 🖼️ IMAGE EFFECTS
  // ============================================================
  {
    id: "hover-img-zoom",
    name: "Image Zoom",
    nameAr: "تكبير الصورة",
    category: "image",
    hoverClassName: "overflow-hidden [&_img]:transition-transform [&_img]:duration-500 [&:hover_img]:scale-110",
    focusClassName:
      "overflow-hidden [&_img]:transition-transform [&_img]:duration-500 [&:focus-within_img]:scale-110",
  },
  {
    id: "hover-img-zoom-slow",
    name: "Image Zoom Slow",
    nameAr: "تكبير بطيء",
    category: "image",
    hoverClassName: "overflow-hidden [&_img]:transition-transform [&_img]:duration-700 [&:hover_img]:scale-125",
    focusClassName:
      "overflow-hidden [&_img]:transition-transform [&_img]:duration-700 [&:focus-within_img]:scale-125",
  },
  {
    id: "hover-img-rotate",
    name: "Image Rotate",
    nameAr: "دوران الصورة",
    category: "image",
    hoverClassName:
      "overflow-hidden [&_img]:transition-transform [&_img]:duration-500 [&:hover_img]:rotate-6 [&:hover_img]:scale-110",
    focusClassName:
      "overflow-hidden [&_img]:transition-transform [&_img]:duration-500 [&:focus-within_img]:rotate-6 [&:focus-within_img]:scale-110",
  },
  {
    id: "hover-img-grayscale",
    name: "Image Grayscale",
    nameAr: "صورة رمادية",
    category: "image",
    hoverClassName: "[&_img]:grayscale [&_img]:transition-all [&_img]:duration-500 [&:hover_img]:grayscale-0",
    focusClassName:
      "[&_img]:grayscale [&_img]:transition-all [&_img]:duration-500 [&:focus-within_img]:grayscale-0",
  },
  {
    id: "hover-img-grayscale-reverse",
    name: "Image Grayscale Reverse",
    nameAr: "صورة رمادية معكوس",
    category: "image",
    hoverClassName: "[&_img]:transition-all [&_img]:duration-500 [&:hover_img]:grayscale",
    focusClassName: "[&_img]:transition-all [&_img]:duration-500 [&:focus-within_img]:grayscale",
  },
  {
    id: "hover-img-blur",
    name: "Image Blur",
    nameAr: "ضبابية الصورة",
    category: "image",
    hoverClassName: "[&_img]:transition-all [&_img]:duration-500 [&:hover_img]:blur-sm",
    focusClassName: "[&_img]:transition-all [&_img]:duration-500 [&:focus-within_img]:blur-sm",
  },
  {
    id: "hover-img-unblur",
    name: "Image Unblur",
    nameAr: "إزالة الضبابية",
    category: "image",
    hoverClassName: "[&_img]:blur-sm [&_img]:transition-all [&_img]:duration-500 [&:hover_img]:blur-0",
    focusClassName:
      "[&_img]:blur-sm [&_img]:transition-all [&_img]:duration-500 [&:focus-within_img]:blur-0",
  },
  {
    id: "hover-img-brightness",
    name: "Image Brightness",
    nameAr: "سطوع الصورة",
    category: "image",
    hoverClassName: "[&_img]:transition-all [&_img]:duration-300 [&:hover_img]:brightness-110",
    focusClassName: "[&_img]:transition-all [&_img]:duration-300 [&:focus-within_img]:brightness-110",
  },
  {
    id: "hover-img-darken",
    name: "Image Darken",
    nameAr: "تعتيم الصورة",
    category: "image",
    hoverClassName: "[&_img]:transition-all [&_img]:duration-300 [&:hover_img]:brightness-75",
    focusClassName: "[&_img]:transition-all [&_img]:duration-300 [&:focus-within_img]:brightness-75",
  },
  {
    id: "hover-img-sepia",
    name: "Image Sepia",
    nameAr: "صورة بنية",
    category: "image",
    hoverClassName: "[&_img]:transition-all [&_img]:duration-500 [&:hover_img]:sepia",
    focusClassName: "[&_img]:transition-all [&_img]:duration-500 [&:focus-within_img]:sepia",
  },
  {
    id: "hover-img-contrast",
    name: "Image Contrast",
    nameAr: "تباين الصورة",
    category: "image",
    hoverClassName: "[&_img]:transition-all [&_img]:duration-300 [&:hover_img]:contrast-125",
    focusClassName: "[&_img]:transition-all [&_img]:duration-300 [&:focus-within_img]:contrast-125",
  },
  {
    id: "hover-img-saturate",
    name: "Image Saturate",
    nameAr: "تشبع الصورة",
    category: "image",
    hoverClassName: "[&_img]:transition-all [&_img]:duration-300 [&:hover_img]:saturate-150",
    focusClassName: "[&_img]:transition-all [&_img]:duration-300 [&:focus-within_img]:saturate-150",
  },

  // ============================================================
  // 🎭 OVERLAY EFFECTS
  // ============================================================
  {
    id: "hover-overlay-dark",
    name: "Overlay Dark",
    nameAr: "تغطية داكنة",
    category: "overlay",
    hoverClassName:
      "relative overflow-hidden before:absolute before:inset-0 before:bg-black/0 before:transition-all before:duration-300 hover:before:bg-black/50",
    focusClassName:
      "relative overflow-hidden before:absolute before:inset-0 before:bg-black/0 before:transition-all before:duration-300 focus-within:before:bg-black/50",
  },
  {
    id: "hover-overlay-light",
    name: "Overlay Light",
    nameAr: "تغطية فاتحة",
    category: "overlay",
    hoverClassName:
      "relative overflow-hidden before:absolute before:inset-0 before:bg-white/0 before:transition-all before:duration-300 hover:before:bg-white/30",
    focusClassName:
      "relative overflow-hidden before:absolute before:inset-0 before:bg-white/0 before:transition-all before:duration-300 focus-within:before:bg-white/30",
  },
  {
    id: "hover-overlay-gradient",
    name: "Overlay Gradient",
    nameAr: "تغطية متدرجة",
    category: "overlay",
    hoverClassName:
      "relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-t before:from-black/0 before:to-transparent before:transition-all before:duration-300 hover:before:from-black/70",
    focusClassName:
      "relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-t before:from-black/0 before:to-transparent before:transition-all before:duration-300 focus-within:before:from-black/70",
  },
  {
    id: "hover-overlay-blue",
    name: "Overlay Blue",
    nameAr: "تغطية زرقاء",
    category: "overlay",
    hoverClassName:
      "relative overflow-hidden before:absolute before:inset-0 before:bg-blue-500/0 before:transition-all before:duration-300 hover:before:bg-blue-500/50 before:mix-blend-multiply",
    focusClassName:
      "relative overflow-hidden before:absolute before:inset-0 before:bg-blue-500/0 before:transition-all before:duration-300 focus-within:before:bg-blue-500/50 before:mix-blend-multiply",
  },
  {
    id: "hover-overlay-purple",
    name: "Overlay Purple",
    nameAr: "تغطية بنفسجية",
    category: "overlay",
    hoverClassName:
      "relative overflow-hidden before:absolute before:inset-0 before:bg-purple-500/0 before:transition-all before:duration-300 hover:before:bg-purple-500/50 before:mix-blend-multiply",
    focusClassName:
      "relative overflow-hidden before:absolute before:inset-0 before:bg-purple-500/0 before:transition-all before:duration-300 focus-within:before:bg-purple-500/50 before:mix-blend-multiply",
  },
  {
    id: "hover-overlay-slide-up",
    name: "Overlay Slide Up",
    nameAr: "تغطية منزلقة للأعلى",
    category: "overlay",
    hoverClassName:
      "relative overflow-hidden before:absolute before:inset-x-0 before:bottom-0 before:h-0 before:bg-black/70 before:transition-all before:duration-300 hover:before:h-full",
    focusClassName:
      "relative overflow-hidden before:absolute before:inset-x-0 before:bottom-0 before:h-0 before:bg-black/70 before:transition-all before:duration-300 focus-within:before:h-full",
  },
  {
    id: "hover-overlay-slide-down",
    name: "Overlay Slide Down",
    nameAr: "تغطية منزلقة للأسفل",
    category: "overlay",
    hoverClassName:
      "relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-0 before:bg-black/70 before:transition-all before:duration-300 hover:before:h-full",
    focusClassName:
      "relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-0 before:bg-black/70 before:transition-all before:duration-300 focus-within:before:h-full",
  },
  {
    id: "hover-overlay-slide-left",
    name: "Overlay Slide Left",
    nameAr: "تغطية منزلقة لليسار",
    category: "overlay",
    hoverClassName:
      "relative overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-0 before:bg-black/70 before:transition-all before:duration-300 hover:before:w-full",
    focusClassName:
      "relative overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-0 before:bg-black/70 before:transition-all before:duration-300 focus-within:before:w-full",
  },
  {
    id: "hover-overlay-slide-right",
    name: "Overlay Slide Right",
    nameAr: "تغطية منزلقة لليمين",
    category: "overlay",
    hoverClassName:
      "relative overflow-hidden before:absolute before:inset-y-0 before:right-0 before:w-0 before:bg-black/70 before:transition-all before:duration-300 hover:before:w-full",
    focusClassName:
      "relative overflow-hidden before:absolute before:inset-y-0 before:right-0 before:w-0 before:bg-black/70 before:transition-all before:duration-300 focus-within:before:w-full",
  },
  {
    id: "hover-overlay-zoom",
    name: "Overlay Zoom",
    nameAr: "تغطية تكبير",
    category: "overlay",
    hoverClassName:
      "relative overflow-hidden before:absolute before:inset-0 before:scale-0 before:bg-black/70 before:transition-all before:duration-300 hover:before:scale-100",
    focusClassName:
      "relative overflow-hidden before:absolute before:inset-0 before:scale-0 before:bg-black/70 before:transition-all before:duration-300 focus-within:before:scale-100",
  },

  // ============================================================
  // 📝 TEXT EFFECTS
  // ============================================================
  {
    id: "hover-text-underline",
    name: "Text Underline",
    nameAr: "خط سفلي",
    category: "text",
    hoverClassName:
      "relative after:absolute after:bottom-0 after:right-0 after:h-0.5 after:w-0 after:bg-current after:transition-all after:duration-300 hover:after:w-full hover:after:right-auto hover:after:left-0",
    focusClassName:
      "relative after:absolute after:bottom-0 after:right-0 after:h-0.5 after:w-0 after:bg-current after:transition-all after:duration-300 focus-within:after:w-full focus-within:after:right-auto focus-within:after:left-0",
  },
  {
    id: "hover-text-underline-center",
    name: "Text Underline Center",
    nameAr: "خط سفلي من المنتصف",
    category: "text",
    hoverClassName:
      "relative after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-0 after:bg-current after:transition-all after:duration-300 after:-translate-x-1/2 hover:after:w-full",
    focusClassName:
      "relative after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-0 after:bg-current after:transition-all after:duration-300 after:-translate-x-1/2 focus-within:after:w-full",
  },
  {
    id: "hover-text-strike",
    name: "Text Strike",
    nameAr: "خط وسط",
    category: "text",
    hoverClassName:
      "relative after:absolute after:top-1/2 after:right-0 after:h-0.5 after:w-0 after:bg-current after:transition-all after:duration-300 hover:after:w-full",
    focusClassName:
      "relative after:absolute after:top-1/2 after:right-0 after:h-0.5 after:w-0 after:bg-current after:transition-all after:duration-300 focus-within:after:w-full",
  },
  {
    id: "hover-text-highlight",
    name: "Text Highlight",
    nameAr: "تظليل النص",
    category: "text",
    hoverClassName:
      "relative z-10 before:absolute before:bottom-0 before:right-0 before:-z-10 before:h-1/3 before:w-0 before:bg-yellow-300 before:transition-all before:duration-300 hover:before:w-full",
    focusClassName:
      "relative z-10 before:absolute before:bottom-0 before:right-0 before:-z-10 before:h-1/3 before:w-0 before:bg-yellow-300 before:transition-all before:duration-300 focus-within:before:w-full",
  },
  {
    id: "hover-text-highlight-full",
    name: "Text Highlight Full",
    nameAr: "تظليل كامل",
    category: "text",
    hoverClassName:
      "relative z-10 before:absolute before:inset-0 before:-z-10 before:scale-x-0 before:bg-blue-500 before:transition-transform before:duration-300 before:origin-right hover:before:scale-x-100 hover:before:origin-left hover:text-white",
    focusClassName:
      "relative z-10 before:absolute before:inset-0 before:-z-10 before:scale-x-0 before:bg-blue-500 before:transition-transform before:duration-300 before:origin-right focus-within:before:scale-x-100 focus-within:before:origin-left focus-within:text-white",
  },
  {
    id: "hover-text-bounce",
    name: "Text Bounce",
    nameAr: "نص نطاط",
    category: "text",
    hoverClassName: "inline-block transition-transform duration-300 hover:animate-bounce",
    focusClassName: "inline-block transition-transform duration-300 focus-within:animate-bounce",
  },
  {
    id: "hover-text-shake",
    name: "Text Shake",
    nameAr: "نص مهتز",
    category: "text",
    hoverClassName: "inline-block transition-transform duration-300 hover:animate-pulse",
    focusClassName: "inline-block transition-transform duration-300 focus-within:animate-pulse",
  },
  {
    id: "hover-text-grow",
    name: "Text Grow",
    nameAr: "تكبير النص",
    category: "text",
    hoverClassName: "transition-all duration-300 hover:text-lg hover:font-bold",
    focusClassName: "transition-all duration-300 focus-within:text-lg focus-within:font-bold",
  },
  {
    id: "hover-text-letter-spacing",
    name: "Text Letter Spacing",
    nameAr: "تباعد الحروف",
    category: "text",
    hoverClassName: "transition-all duration-300 hover:tracking-widest",
    focusClassName: "transition-all duration-300 focus-within:tracking-widest",
  },
  {
    id: "hover-text-color-cycle",
    name: "Text Color Cycle",
    nameAr: "دورة الألوان",
    category: "text",
    hoverClassName: "transition-colors duration-300 hover:text-blue-500",
    focusClassName: "transition-colors duration-300 focus-within:text-blue-500",
  },

  // ============================================================
  // 🔘 BUTTON EFFECTS
  // ============================================================
  {
    id: "hover-btn-fill-left",
    name: "Button Fill Left",
    nameAr: "تعبئة من اليسار",
    category: "button",
    hoverClassName:
      "relative overflow-hidden z-10 before:absolute before:inset-0 before:-z-10 before:translate-x-[-100%] before:bg-blue-600 before:transition-transform before:duration-300 hover:before:translate-x-0 hover:text-white",
    focusClassName:
      "relative overflow-hidden z-10 before:absolute before:inset-0 before:-z-10 before:translate-x-[-100%] before:bg-blue-600 before:transition-transform before:duration-300 focus-within:before:translate-x-0 focus-within:text-white",
  },
  {
    id: "hover-btn-fill-right",
    name: "Button Fill Right",
    nameAr: "تعبئة من اليمين",
    category: "button",
    hoverClassName:
      "relative overflow-hidden z-10 before:absolute before:inset-0 before:-z-10 before:translate-x-[100%] before:bg-blue-600 before:transition-transform before:duration-300 hover:before:translate-x-0 hover:text-white",
    focusClassName:
      "relative overflow-hidden z-10 before:absolute before:inset-0 before:-z-10 before:translate-x-[100%] before:bg-blue-600 before:transition-transform before:duration-300 focus-within:before:translate-x-0 focus-within:text-white",
  },
  {
    id: "hover-btn-fill-up",
    name: "Button Fill Up",
    nameAr: "تعبئة من الأسفل",
    category: "button",
    hoverClassName:
      "relative overflow-hidden z-10 before:absolute before:inset-0 before:-z-10 before:translate-y-[100%] before:bg-blue-600 before:transition-transform before:duration-300 hover:before:translate-y-0 hover:text-white",
    focusClassName:
      "relative overflow-hidden z-10 before:absolute before:inset-0 before:-z-10 before:translate-y-[100%] before:bg-blue-600 before:transition-transform before:duration-300 focus-within:before:translate-y-0 focus-within:text-white",
  },
  {
    id: "hover-btn-fill-down",
    name: "Button Fill Down",
    nameAr: "تعبئة من الأعلى",
    category: "button",
    hoverClassName:
      "relative overflow-hidden z-10 before:absolute before:inset-0 before:-z-10 before:translate-y-[-100%] before:bg-blue-600 before:transition-transform before:duration-300 hover:before:translate-y-0 hover:text-white",
    focusClassName:
      "relative overflow-hidden z-10 before:absolute before:inset-0 before:-z-10 before:translate-y-[-100%] before:bg-blue-600 before:transition-transform before:duration-300 focus-within:before:translate-y-0 focus-within:text-white",
  },
  {
    id: "hover-btn-fill-center",
    name: "Button Fill Center",
    nameAr: "تعبئة من المنتصف",
    category: "button",
    hoverClassName:
      "relative overflow-hidden z-10 before:absolute before:inset-0 before:-z-10 before:scale-0 before:bg-blue-600 before:transition-transform before:duration-300 before:rounded-full hover:before:scale-150 hover:text-white",
    focusClassName:
      "relative overflow-hidden z-10 before:absolute before:inset-0 before:-z-10 before:scale-0 before:bg-blue-600 before:transition-transform before:duration-300 before:rounded-full focus-within:before:scale-150 focus-within:text-white",
  },
  {
    id: "hover-btn-slide-icon",
    name: "Button Slide Icon",
    nameAr: "زر انزلاق الأيقونة",
    category: "button",
    hoverClassName:
      "group flex items-center gap-2 [&_svg]:transition-transform [&_svg]:duration-300 [&:hover_svg]:translate-x-1",
    focusClassName:
      "group flex items-center gap-2 [&_svg]:transition-transform [&_svg]:duration-300 [&:focus-within_svg]:translate-x-1",
  },
  {
    id: "hover-btn-pulse",
    name: "Button Pulse",
    nameAr: "زر نابض",
    category: "button",
    hoverClassName: "transition-all duration-300 hover:animate-pulse",
    focusClassName: "transition-all duration-300 focus-within:animate-pulse",
  },
  {
    id: "hover-btn-3d-push",
    name: "Button 3D Push",
    nameAr: "زر ضغط ثلاثي الأبعاد",
    category: "button",
    hoverClassName:
      "shadow-[0_4px_0_0_#1e40af] transition-all duration-150 hover:translate-y-1 hover:shadow-[0_2px_0_0_#1e40af] active:translate-y-1 active:shadow-none",
    focusClassName:
      "shadow-[0_4px_0_0_#1e40af] transition-all duration-150 focus-within:translate-y-1 focus-within:shadow-[0_2px_0_0_#1e40af] active:translate-y-1 active:shadow-none",
  },
  {
    id: "hover-btn-border-draw",
    name: "Button Border Draw",
    nameAr: "رسم الحد",
    category: "button",
    hoverClassName:
      "relative border-2 border-transparent before:absolute before:inset-0 before:border-2 before:border-blue-500 before:scale-x-0 before:transition-transform before:duration-300 hover:before:scale-x-100",
    focusClassName:
      "relative border-2 border-transparent before:absolute before:inset-0 before:border-2 before:border-blue-500 before:scale-x-0 before:transition-transform before:duration-300 focus-within:before:scale-x-100",
  },
  {
    id: "hover-btn-shine",
    name: "Button Shine",
    nameAr: "زر لامع",
    category: "button",
    hoverClassName:
      "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full",
    focusClassName:
      "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:transition-transform before:duration-700 focus-within:before:translate-x-full",
  },
  {
    id: "hover-btn-ripple",
    name: "Button Ripple",
    nameAr: "زر موجة",
    category: "button",
    hoverClassName:
      "relative overflow-hidden before:absolute before:inset-0 before:bg-white/30 before:scale-0 before:rounded-full before:transition-transform before:duration-500 hover:before:scale-[2.5] before:opacity-0 hover:before:opacity-100",
    focusClassName:
      "relative overflow-hidden before:absolute before:inset-0 before:bg-white/30 before:scale-0 before:rounded-full before:transition-transform before:duration-500 focus-within:before:scale-[2.5] before:opacity-0 focus-within:before:opacity-100",
  },
  {
    id: "hover-btn-gradient-shift",
    name: "Button Gradient Shift",
    nameAr: "تحول التدرج",
    category: "button",
    hoverClassName: "bg-gradient-to-r from-blue-500 to-purple-500 bg-[length:200%_100%] bg-left transition-all duration-500 hover:bg-right",
    focusClassName:
      "bg-gradient-to-r from-blue-500 to-purple-500 bg-[length:200%_100%] bg-left transition-all duration-500 focus-within:bg-right",
  },

  // ============================================================
  // 🃏 CARD EFFECTS
  // ============================================================
  {
    id: "hover-card-lift",
    name: "Card Lift",
    nameAr: "رفع البطاقة",
    category: "card",
    hoverClassName: "transition-all duration-300 hover:-translate-y-2 hover:shadow-xl",
    focusClassName: "transition-all duration-300 focus-within:-translate-y-2 focus-within:shadow-xl",
  },
  {
    id: "hover-card-tilt",
    name: "Card Tilt",
    nameAr: "ميلان البطاقة",
    category: "card",
    hoverClassName: "transition-transform duration-300 hover:rotate-1 hover:scale-105",
    focusClassName: "transition-transform duration-300 focus-within:rotate-1 focus-within:scale-105",
  },
  {
    id: "hover-card-3d",
    name: "Card 3D",
    nameAr: "بطاقة ثلاثية الأبعاد",
    category: "card",
    hoverClassName:
      "[transform-style:preserve-3d] transition-transform duration-500 hover:[transform:perspective(1000px)_rotateX(5deg)_rotateY(-5deg)]",
    focusClassName:
      "[transform-style:preserve-3d] transition-transform duration-500 focus-within:[transform:perspective(1000px)_rotateX(5deg)_rotateY(-5deg)]",
  },
  {
    id: "hover-card-flip",
    name: "Card Flip",
    nameAr: "قلب البطاقة",
    category: "card",
    hoverClassName: "[transform-style:preserve-3d] transition-transform duration-700 hover:[transform:rotateY(180deg)]",
    focusClassName:
      "[transform-style:preserve-3d] transition-transform duration-700 focus-within:[transform:rotateY(180deg)]",
  },
  {
    id: "hover-card-pop",
    name: "Card Pop",
    nameAr: "بروز البطاقة",
    category: "card",
    hoverClassName: "transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:z-10",
    focusClassName: "transition-all duration-300 focus-within:scale-105 focus-within:shadow-2xl focus-within:z-10",
  },
  {
    id: "hover-card-float",
    name: "Card Float",
    nameAr: "طفو البطاقة",
    category: "card",
    hoverClassName: "transition-all duration-500 hover:-translate-y-4 hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)]",
    focusClassName:
      "transition-all duration-500 focus-within:-translate-y-4 focus-within:shadow-[0_20px_40px_rgba(0,0,0,0.2)]",
  },
  {
    id: "hover-card-border-glow",
    name: "Card Border Glow",
    nameAr: "توهج حد البطاقة",
    category: "card",
    hoverClassName:
      "border-2 border-transparent transition-all duration-300 hover:border-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]",
    focusClassName:
      "border-2 border-transparent transition-all duration-300 focus-within:border-blue-500 focus-within:shadow-[0_0_20px_rgba(59,130,246,0.5)]",
  },
  {
    id: "hover-card-reveal",
    name: "Card Reveal",
    nameAr: "كشف البطاقة",
    category: "card",
    hoverClassName:
      "group [&_.hidden-content]:opacity-0 [&_.hidden-content]:translate-y-4 [&_.hidden-content]:transition-all [&_.hidden-content]:duration-300 [&:hover_.hidden-content]:opacity-100 [&:hover_.hidden-content]:translate-y-0",
    focusClassName:
      "group [&_.hidden-content]:opacity-0 [&_.hidden-content]:translate-y-4 [&_.hidden-content]:transition-all [&_.hidden-content]:duration-300 [&:focus-within_.hidden-content]:opacity-100 [&:focus-within_.hidden-content]:translate-y-0",
  },
  {
    id: "hover-card-shine",
    name: "Card Shine",
    nameAr: "لمعان البطاقة",
    category: "card",
    hoverClassName:
      "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-transform before:duration-1000 hover:before:translate-x-full",
    focusClassName:
      "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-transform before:duration-1000 focus-within:before:translate-x-full",
  },
  {
    id: "hover-card-expand",
    name: "Card Expand",
    nameAr: "توسيع البطاقة",
    category: "card",
    hoverClassName: "transition-all duration-500 hover:scale-110 hover:shadow-2xl cursor-pointer",
    focusClassName: "transition-all duration-500 focus-within:scale-110 focus-within:shadow-2xl cursor-pointer",
  },

  // ============================================================
  // 🔗 LINK EFFECTS
  // ============================================================
  {
    id: "hover-link-underline-grow",
    name: "Link Underline Grow",
    nameAr: "نمو الخط السفلي",
    category: "link",
    hoverClassName:
      "relative after:absolute after:bottom-0 after:right-0 after:h-[2px] after:w-0 after:bg-current after:transition-all after:duration-300 hover:after:w-full hover:after:right-auto hover:after:left-0",
    focusClassName:
      "relative after:absolute after:bottom-0 after:right-0 after:h-[2px] after:w-0 after:bg-current after:transition-all after:duration-300 focus-within:after:w-full focus-within:after:right-auto focus-within:after:left-0",
  },
  {
    id: "hover-link-underline-fade",
    name: "Link Underline Fade",
    nameAr: "تلاشي الخط السفلي",
    category: "link",
    hoverClassName: "underline underline-offset-4 decoration-transparent transition-all duration-300 hover:decoration-current",
    focusClassName:
      "underline underline-offset-4 decoration-transparent transition-all duration-300 focus-within:decoration-current",
  },
  {
    id: "hover-link-bracket",
    name: "Link Bracket",
    nameAr: "أقواس الرابط",
    category: "link",
    hoverClassName:
      "relative before:content-['['] after:content-[']'] before:opacity-0 after:opacity-0 before:transition-opacity after:transition-opacity before:duration-300 after:duration-300 hover:before:opacity-100 hover:after:opacity-100",
    focusClassName:
      "relative before:content-['['] after:content-[']'] before:opacity-0 after:opacity-0 before:transition-opacity after:transition-opacity before:duration-300 after:duration-300 focus-within:before:opacity-100 focus-within:after:opacity-100",
  },
  {
    id: "hover-link-arrow",
    name: "Link Arrow",
    nameAr: "سهم الرابط",
    category: "link",
    hoverClassName:
      "group inline-flex items-center gap-1 after:content-['→'] after:transition-transform after:duration-300 hover:after:translate-x-1",
    focusClassName:
      "group inline-flex items-center gap-1 after:content-['→'] after:transition-transform after:duration-300 focus-within:after:translate-x-1",
  },
  {
    id: "hover-link-background",
    name: "Link Background",
    nameAr: "خلفية الرابط",
    category: "link",
    hoverClassName: "px-1 -mx-1 transition-all duration-300 hover:bg-blue-100 hover:text-blue-600 rounded",
    focusClassName: "px-1 -mx-1 transition-all duration-300 focus-within:bg-blue-100 focus-within:text-blue-600 rounded",
  },
  {
    id: "hover-link-border-bottom",
    name: "Link Border Bottom",
    nameAr: "حد سفلي للرابط",
    category: "link",
    hoverClassName: "border-b-2 border-transparent transition-colors duration-300 hover:border-current",
    focusClassName: "border-b-2 border-transparent transition-colors duration-300 focus-within:border-current",
  },
  {
    id: "hover-link-marker",
    name: "Link Marker",
    nameAr: "علامة الرابط",
    category: "link",
    hoverClassName:
      "relative pl-0 transition-all duration-300 before:absolute before:right-full before:mr-1 before:content-['•'] before:opacity-0 before:transition-opacity hover:before:opacity-100 hover:pl-4",
    focusClassName:
      "relative pl-0 transition-all duration-300 before:absolute before:right-full before:mr-1 before:content-['•'] before:opacity-0 before:transition-opacity focus-within:before:opacity-100 focus-within:pl-4",
  },
  {
    id: "hover-link-glow",
    name: "Link Glow",
    nameAr: "توهج الرابط",
    category: "link",
    hoverClassName: "transition-all duration-300 hover:[text-shadow:0_0_10px_currentColor]",
    focusClassName: "transition-all duration-300 focus-within:[text-shadow:0_0_10px_currentColor]",
  },

  // ============================================================
  // 📦 3D EFFECTS
  // ============================================================
  {
    id: "hover-3d-perspective",
    name: "3D Perspective",
    nameAr: "منظور ثلاثي الأبعاد",
    category: "3d",
    hoverClassName: "[transform-style:preserve-3d] transition-transform duration-500 hover:[transform:perspective(800px)_rotateY(15deg)]",
    focusClassName:
      "[transform-style:preserve-3d] transition-transform duration-500 focus-within:[transform:perspective(800px)_rotateY(15deg)]",
  },
  {
    id: "hover-3d-rotate-x",
    name: "3D Rotate X",
    nameAr: "دوران أفقي ثلاثي الأبعاد",
    category: "3d",
    hoverClassName: "[transform-style:preserve-3d] transition-transform duration-500 hover:[transform:perspective(800px)_rotateX(15deg)]",
    focusClassName:
      "[transform-style:preserve-3d] transition-transform duration-500 focus-within:[transform:perspective(800px)_rotateX(15deg)]",
  },
  {
    id: "hover-3d-rotate-y",
    name: "3D Rotate Y",
    nameAr: "دوران عمودي ثلاثي الأبعاد",
    category: "3d",
    hoverClassName: "[transform-style:preserve-3d] transition-transform duration-500 hover:[transform:perspective(800px)_rotateY(-15deg)]",
    focusClassName:
      "[transform-style:preserve-3d] transition-transform duration-500 focus-within:[transform:perspective(800px)_rotateY(-15deg)]",
  },
  {
    id: "hover-3d-float",
    name: "3D Float",
    nameAr: "طفو ثلاثي الأبعاد",
    category: "3d",
    hoverClassName: "[transform-style:preserve-3d] transition-all duration-500 hover:[transform:perspective(800px)_translateZ(30px)_rotateX(5deg)]",
    focusClassName:
      "[transform-style:preserve-3d] transition-all duration-500 focus-within:[transform:perspective(800px)_translateZ(30px)_rotateX(5deg)]",
  },
  {
    id: "hover-3d-flip-x",
    name: "3D Flip X",
    nameAr: "قلب أفقي ثلاثي الأبعاد",
    category: "3d",
    hoverClassName: "[transform-style:preserve-3d] transition-transform duration-700 hover:[transform:perspective(800px)_rotateX(180deg)]",
    focusClassName:
      "[transform-style:preserve-3d] transition-transform duration-700 focus-within:[transform:perspective(800px)_rotateX(180deg)]",
  },
  {
    id: "hover-3d-flip-y",
    name: "3D Flip Y",
    nameAr: "قلب عمودي ثلاثي الأبعاد",
    category: "3d",
    hoverClassName: "[transform-style:preserve-3d] transition-transform duration-700 hover:[transform:perspective(800px)_rotateY(180deg)]",
    focusClassName:
      "[transform-style:preserve-3d] transition-transform duration-700 focus-within:[transform:perspective(800px)_rotateY(180deg)]",
  },
  {
    id: "hover-3d-tilt",
    name: "3D Tilt",
    nameAr: "ميلان ثلاثي الأبعاد",
    category: "3d",
    hoverClassName:
      "[transform-style:preserve-3d] transition-transform duration-300 hover:[transform:perspective(1000px)_rotateX(5deg)_rotateY(5deg)_scale(1.02)]",
    focusClassName:
      "[transform-style:preserve-3d] transition-transform duration-300 focus-within:[transform:perspective(1000px)_rotateX(5deg)_rotateY(5deg)_scale(1.02)]",
  },
  {
    id: "hover-3d-shadow-layer",
    name: "3D Shadow Layer",
    nameAr: "طبقة ظل ثلاثية الأبعاد",
    category: "3d",
    hoverClassName:
      "relative before:absolute before:inset-0 before:bg-black/20 before:translate-x-2 before:translate-y-2 before:-z-10 before:transition-transform before:duration-300 hover:before:translate-x-4 hover:before:translate-y-4",
    focusClassName:
      "relative before:absolute before:inset-0 before:bg-black/20 before:translate-x-2 before:translate-y-2 before:-z-10 before:transition-transform before:duration-300 focus-within:before:translate-x-4 focus-within:before:translate-y-4",
  },

  // ============================================================
  // ⚡ ANIMATION EFFECTS
  // ============================================================
  {
    id: "hover-anim-wiggle",
    name: "Animation Wiggle",
    nameAr: "اهتزاز",
    category: "animation",
    hoverClassName: "hover:animate-[wiggle_0.3s_ease-in-out_infinite]",
    focusClassName: "focus-within:animate-[wiggle_0.3s_ease-in-out_infinite]",
  },
  {
    id: "hover-anim-jello",
    name: "Animation Jello",
    nameAr: "جيلي",
    category: "animation",
    hoverClassName: "hover:animate-[jello_0.5s_ease]",
    focusClassName: "focus-within:animate-[jello_0.5s_ease]",
  },
  {
    id: "hover-anim-heartbeat",
    name: "Animation Heartbeat",
    nameAr: "نبضة قلب",
    category: "animation",
    hoverClassName: "hover:animate-[heartbeat_0.5s_ease-in-out]",
    focusClassName: "focus-within:animate-[heartbeat_0.5s_ease-in-out]",
  },
  {
    id: "hover-anim-rubber",
    name: "Animation Rubber",
    nameAr: "مطاط",
    category: "animation",
    hoverClassName: "hover:animate-[rubber_0.4s_ease]",
    focusClassName: "focus-within:animate-[rubber_0.4s_ease]",
  },
  {
    id: "hover-anim-tada",
    name: "Animation Tada",
    nameAr: "تادا",
    category: "animation",
    hoverClassName: "hover:animate-[tada_0.5s_ease]",
    focusClassName: "focus-within:animate-[tada_0.5s_ease]",
  },
  {
    id: "hover-anim-swing",
    name: "Animation Swing",
    nameAr: "تأرجح",
    category: "animation",
    hoverClassName: "origin-top hover:animate-[swing_0.5s_ease]",
    focusClassName: "origin-top focus-within:animate-[swing_0.5s_ease]",
  },
];

export function getInteractionEffectById(id?: string): InteractionEffect | undefined {
  if (!id) return undefined;
  return INTERACTION_EFFECTS.find((e) => e.id === id);
}
