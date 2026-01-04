// Container & Divider style presets for CMS "Advanced Styling"

export interface ContainerStyle {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  className: string;
  innerClassName?: string;
}

export interface DividerStyle {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  className: string;
  svg?: string;
}

// ============================================================
// 📦 BASIC CONTAINERS
// ============================================================

export const BASIC_CONTAINERS: ContainerStyle[] = [
  {
    id: "container-basic-white",
    name: "Basic White",
    nameAr: "أبيض أساسي",
    category: "basic",
    className: "bg-white rounded-lg p-6 shadow-sm border border-gray-200",
  },
  {
    id: "container-basic-dark",
    name: "Basic Dark",
    nameAr: "داكن أساسي",
    category: "basic",
    className: "bg-gray-900 rounded-lg p-6 text-white border border-gray-800",
  },
  {
    id: "container-basic-gray",
    name: "Basic Gray",
    nameAr: "رمادي أساسي",
    category: "basic",
    className: "bg-gray-100 rounded-lg p-6 border border-gray-200",
  },
  {
    id: "container-basic-bordered",
    name: "Basic Bordered",
    nameAr: "محدد أساسي",
    category: "basic",
    className: "bg-transparent rounded-lg p-6 border-2 border-gray-300",
  },
  {
    id: "container-basic-shadow",
    name: "Basic Shadow",
    nameAr: "ظل أساسي",
    category: "basic",
    className: "bg-white rounded-lg p-6 shadow-lg",
  },
  {
    id: "container-basic-elevated",
    name: "Basic Elevated",
    nameAr: "مرتفع أساسي",
    category: "basic",
    className: "bg-white rounded-xl p-6 shadow-xl shadow-gray-200/50",
  },
  {
    id: "container-basic-flat",
    name: "Basic Flat",
    nameAr: "مسطح أساسي",
    category: "basic",
    className: "bg-gray-50 rounded-none p-6",
  },
  {
    id: "container-basic-rounded",
    name: "Basic Rounded",
    nameAr: "دائري أساسي",
    category: "basic",
    className: "bg-white rounded-3xl p-8 shadow-md",
  },
  {
    id: "container-basic-square",
    name: "Basic Square",
    nameAr: "مربع أساسي",
    category: "basic",
    className: "bg-white rounded-none p-6 border border-gray-300",
  },
  {
    id: "container-basic-soft",
    name: "Basic Soft",
    nameAr: "ناعم أساسي",
    category: "basic",
    className: "bg-gray-50/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-100",
  },
];

// ============================================================
// 🔮 GLASS CONTAINERS
// ============================================================

export const GLASS_CONTAINERS: ContainerStyle[] = [
  {
    id: "container-glass-light",
    name: "Glass Light",
    nameAr: "زجاجي فاتح",
    category: "glass",
    className: "bg-white/20 backdrop-blur-lg rounded-2xl p-6 border border-white/30 shadow-lg",
  },
  {
    id: "container-glass-dark",
    name: "Glass Dark",
    nameAr: "زجاجي داكن",
    category: "glass",
    className: "bg-black/20 backdrop-blur-lg rounded-2xl p-6 border border-white/10 shadow-lg",
  },
  {
    id: "container-glass-frosted",
    name: "Glass Frosted",
    nameAr: "زجاجي متجمد",
    category: "glass",
    className: "bg-white/30 backdrop-blur-xl rounded-2xl p-6 border border-white/40 shadow-xl",
  },
  {
    id: "container-glass-blue",
    name: "Glass Blue",
    nameAr: "زجاجي أزرق",
    category: "glass",
    className: "bg-blue-500/20 backdrop-blur-lg rounded-2xl p-6 border border-blue-400/30 shadow-lg shadow-blue-500/10",
  },
  {
    id: "container-glass-purple",
    name: "Glass Purple",
    nameAr: "زجاجي بنفسجي",
    category: "glass",
    className: "bg-purple-500/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-400/30 shadow-lg shadow-purple-500/10",
  },
  {
    id: "container-glass-pink",
    name: "Glass Pink",
    nameAr: "زجاجي وردي",
    category: "glass",
    className: "bg-pink-500/20 backdrop-blur-lg rounded-2xl p-6 border border-pink-400/30 shadow-lg shadow-pink-500/10",
  },
  {
    id: "container-glass-gradient",
    name: "Glass Gradient",
    nameAr: "زجاجي متدرج",
    category: "glass",
    className: "bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/30 shadow-lg",
  },
  {
    id: "container-glass-neon",
    name: "Glass Neon",
    nameAr: "زجاجي نيون",
    category: "glass",
    className: "bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-cyan-400/50 shadow-lg shadow-cyan-500/20",
  },
  {
    id: "container-glass-rainbow",
    name: "Glass Rainbow",
    nameAr: "زجاجي قوس قزح",
    category: "glass",
    className: "bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-cyan-500/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-lg",
  },
  {
    id: "container-glass-crystal",
    name: "Glass Crystal",
    nameAr: "زجاجي كريستالي",
    category: "glass",
    className: "bg-white/10 backdrop-blur-2xl rounded-3xl p-8 border border-white/50 shadow-2xl",
  },
];

// ============================================================
// 🌈 GRADIENT CONTAINERS
// ============================================================

export const GRADIENT_CONTAINERS: ContainerStyle[] = [
  {
    id: "container-gradient-blue",
    name: "Gradient Blue",
    nameAr: "متدرج أزرق",
    category: "gradient",
    className: "bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/30",
  },
  {
    id: "container-gradient-purple",
    name: "Gradient Purple",
    nameAr: "متدرج بنفسجي",
    category: "gradient",
    className: "bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg shadow-purple-500/30",
  },
  {
    id: "container-gradient-sunset",
    name: "Gradient Sunset",
    nameAr: "متدرج غروب",
    category: "gradient",
    className: "bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg",
  },
  {
    id: "container-gradient-ocean",
    name: "Gradient Ocean",
    nameAr: "متدرج محيط",
    category: "gradient",
    className: "bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-cyan-500/30",
  },
  {
    id: "container-gradient-forest",
    name: "Gradient Forest",
    nameAr: "متدرج غابة",
    category: "gradient",
    className: "bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-green-500/30",
  },
  {
    id: "container-gradient-fire",
    name: "Gradient Fire",
    nameAr: "متدرج ناري",
    category: "gradient",
    className: "bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-lg",
  },
  {
    id: "container-gradient-dark",
    name: "Gradient Dark",
    nameAr: "متدرج داكن",
    category: "gradient",
    className: "bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-white shadow-lg",
  },
  {
    id: "container-gradient-light",
    name: "Gradient Light",
    nameAr: "متدرج فاتح",
    category: "gradient",
    className: "bg-gradient-to-br from-gray-50 to-gray-200 rounded-2xl p-6 shadow-lg",
  },
  {
    id: "container-gradient-aurora",
    name: "Gradient Aurora",
    nameAr: "متدرج شفق",
    category: "gradient",
    className: "bg-gradient-to-br from-green-400 via-cyan-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg",
  },
  {
    id: "container-gradient-mesh",
    name: "Gradient Mesh",
    nameAr: "متدرج شبكي",
    category: "gradient",
    className:
      "bg-[radial-gradient(at_top_left,_#3b82f6_0%,_transparent_50%),radial-gradient(at_bottom_right,_#8b5cf6_0%,_transparent_50%)] bg-gray-900 rounded-2xl p-6 text-white",
  },
];

// ============================================================
// 💡 NEON CONTAINERS
// ============================================================

export const NEON_CONTAINERS: ContainerStyle[] = [
  {
    id: "container-neon-cyan",
    name: "Neon Cyan",
    nameAr: "نيون سماوي",
    category: "neon",
    className:
      "bg-gray-900 rounded-2xl p-6 border-2 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)] text-cyan-400",
  },
  {
    id: "container-neon-pink",
    name: "Neon Pink",
    nameAr: "نيون وردي",
    category: "neon",
    className:
      "bg-gray-900 rounded-2xl p-6 border-2 border-pink-400 shadow-[0_0_20px_rgba(244,114,182,0.5)] text-pink-400",
  },
  {
    id: "container-neon-purple",
    name: "Neon Purple",
    nameAr: "نيون بنفسجي",
    category: "neon",
    className:
      "bg-gray-900 rounded-2xl p-6 border-2 border-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.5)] text-purple-400",
  },
  {
    id: "container-neon-green",
    name: "Neon Green",
    nameAr: "نيون أخضر",
    category: "neon",
    className:
      "bg-gray-900 rounded-2xl p-6 border-2 border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.5)] text-green-400",
  },
  {
    id: "container-neon-yellow",
    name: "Neon Yellow",
    nameAr: "نيون أصفر",
    category: "neon",
    className:
      "bg-gray-900 rounded-2xl p-6 border-2 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)] text-yellow-400",
  },
  {
    id: "container-neon-red",
    name: "Neon Red",
    nameAr: "نيون أحمر",
    category: "neon",
    className:
      "bg-gray-900 rounded-2xl p-6 border-2 border-red-400 shadow-[0_0_20px_rgba(248,113,113,0.5)] text-red-400",
  },
  {
    id: "container-neon-orange",
    name: "Neon Orange",
    nameAr: "نيون برتقالي",
    category: "neon",
    className:
      "bg-gray-900 rounded-2xl p-6 border-2 border-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.5)] text-orange-400",
  },
  {
    id: "container-neon-blue",
    name: "Neon Blue",
    nameAr: "نيون أزرق",
    category: "neon",
    className:
      "bg-gray-900 rounded-2xl p-6 border-2 border-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.5)] text-blue-400",
  },
  {
    id: "container-neon-white",
    name: "Neon White",
    nameAr: "نيون أبيض",
    category: "neon",
    className: "bg-gray-900 rounded-2xl p-6 border-2 border-white shadow-[0_0_20px_rgba(255,255,255,0.5)] text-white",
  },
  {
    id: "container-neon-rainbow",
    name: "Neon Rainbow",
    nameAr: "نيون قوس قزح",
    category: "neon",
    className:
      "bg-gray-900 rounded-2xl p-6 border-2 border-transparent bg-clip-padding text-white relative before:content-[''] before:absolute before:inset-0 before:rounded-2xl before:p-[2px] before:bg-gradient-to-r before:from-pink-500 before:via-purple-500 before:to-cyan-500 before:-z-10 before:pointer-events-none shadow-[0_0_30px_rgba(168,85,247,0.4)]",
  },
];

// ============================================================
// 💎 LUXURY CONTAINERS
// ============================================================

export const LUXURY_CONTAINERS: ContainerStyle[] = [
  {
    id: "container-luxury-gold",
    name: "Luxury Gold",
    nameAr: "فاخر ذهبي",
    category: "luxury",
    className: "bg-gradient-to-br from-yellow-100 via-yellow-50 to-amber-100 rounded-none p-8 border border-yellow-400/50 shadow-xl",
    innerClassName: "border-l-4 border-yellow-500 pl-4",
  },
  {
    id: "container-luxury-black",
    name: "Luxury Black",
    nameAr: "فاخر أسود",
    category: "luxury",
    className: "bg-black rounded-none p-8 border border-white/10 text-white shadow-2xl",
    innerClassName: "border-l-4 border-white/30 pl-4",
  },
  {
    id: "container-luxury-marble",
    name: "Luxury Marble",
    nameAr: "فاخر رخامي",
    category: "luxury",
    className:
      "bg-gradient-to-br from-gray-100 via-white to-gray-200 rounded-none p-8 border border-gray-300 shadow-xl",
  },
  {
    id: "container-luxury-velvet",
    name: "Luxury Velvet",
    nameAr: "فاخر مخملي",
    category: "luxury",
    className: "bg-gradient-to-br from-purple-900 to-purple-950 rounded-none p-8 border border-purple-500/30 text-purple-100 shadow-2xl",
  },
  {
    id: "container-luxury-champagne",
    name: "Luxury Champagne",
    nameAr: "فاخر شامبانيا",
    category: "luxury",
    className: "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-none p-8 border border-amber-200 shadow-xl",
  },
  {
    id: "container-luxury-emerald",
    name: "Luxury Emerald",
    nameAr: "فاخر زمردي",
    category: "luxury",
    className: "bg-gradient-to-br from-emerald-900 to-emerald-950 rounded-none p-8 border border-emerald-500/30 text-emerald-100 shadow-2xl",
  },
  {
    id: "container-luxury-sapphire",
    name: "Luxury Sapphire",
    nameAr: "فاخر ياقوتي",
    category: "luxury",
    className: "bg-gradient-to-br from-blue-900 to-blue-950 rounded-none p-8 border border-blue-500/30 text-blue-100 shadow-2xl",
  },
  {
    id: "container-luxury-rose",
    name: "Luxury Rose Gold",
    nameAr: "فاخر وردي ذهبي",
    category: "luxury",
    className: "bg-gradient-to-br from-rose-100 via-pink-50 to-rose-100 rounded-none p-8 border border-rose-300/50 shadow-xl",
  },
  {
    id: "container-luxury-platinum",
    name: "Luxury Platinum",
    nameAr: "فاخر بلاتيني",
    category: "luxury",
    className: "bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 rounded-none p-8 border border-slate-300 shadow-xl",
  },
  {
    id: "container-luxury-ruby",
    name: "Luxury Ruby",
    nameAr: "فاخر ياقوت أحمر",
    category: "luxury",
    className: "bg-gradient-to-br from-red-900 to-red-950 rounded-none p-8 border border-red-500/30 text-red-100 shadow-2xl",
  },
];

// ============================================================
// 🎮 MODERN CONTAINERS
// ============================================================

export const MODERN_CONTAINERS: ContainerStyle[] = [
  {
    id: "container-modern-card",
    name: "Modern Card",
    nameAr: "بطاقة حديثة",
    category: "modern",
    className:
      "bg-white rounded-3xl p-8 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] border border-gray-100",
  },
  {
    id: "container-modern-dark",
    name: "Modern Dark",
    nameAr: "داكن حديث",
    category: "modern",
    className: "bg-[#0f0f0f] rounded-3xl p-8 text-white border border-white/5 shadow-2xl",
  },
  {
    id: "container-modern-gradient",
    name: "Modern Gradient",
    nameAr: "متدرج حديث",
    category: "modern",
    className: "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-8 text-white shadow-xl",
  },
  {
    id: "container-modern-blur",
    name: "Modern Blur",
    nameAr: "ضبابي حديث",
    category: "modern",
    className: "bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/50",
  },
  {
    id: "container-modern-outline",
    name: "Modern Outline",
    nameAr: "محدد حديث",
    category: "modern",
    className: "bg-transparent rounded-3xl p-8 border-2 border-gray-200 hover:border-gray-400 transition-colors",
  },
  {
    id: "container-modern-subtle",
    name: "Modern Subtle",
    nameAr: "خفيف حديث",
    category: "modern",
    className: "bg-gray-50 rounded-3xl p-8 border border-gray-100",
  },
  {
    id: "container-modern-floating",
    name: "Modern Floating",
    nameAr: "عائم حديث",
    category: "modern",
    className: "bg-white rounded-3xl p-8 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.2)] hover:-translate-y-1 transition-transform",
  },
  {
    id: "container-modern-accent",
    name: "Modern Accent",
    nameAr: "لهجة حديثة",
    category: "modern",
    className: "bg-white rounded-3xl p-8 border-l-4 border-blue-500 shadow-lg",
  },
  {
    id: "container-modern-split",
    name: "Modern Split",
    nameAr: "منقسم حديث",
    category: "modern",
    className: "bg-gradient-to-r from-white to-gray-50 rounded-3xl p-8 shadow-lg border border-gray-100",
  },
  {
    id: "container-modern-tech",
    name: "Modern Tech",
    nameAr: "تقني حديث",
    category: "modern",
    className: "bg-[#1a1a2e] rounded-2xl p-8 text-white border border-[#16213e] shadow-xl",
  },
];

// ============================================================
// 🖼️ SPECIAL CONTAINERS
// ============================================================

export const SPECIAL_CONTAINERS: ContainerStyle[] = [
  {
    id: "container-special-paper",
    name: "Paper",
    nameAr: "ورقي",
    category: "special",
    className:
      "bg-[#fffef9] rounded-sm p-6 shadow-md border border-[#e8e4d9] relative before:content-[''] before:absolute before:inset-0 before:bg-[linear-gradient(90deg,transparent_79px,#e8e4d9_79px,#e8e4d9_81px,transparent_81px)] before:bg-[length:100px_100%] before:pointer-events-none before:opacity-60",
  },
  {
    id: "container-special-terminal",
    name: "Terminal",
    nameAr: "طرفية",
    category: "special",
    className: "bg-[#1e1e1e] rounded-lg overflow-hidden text-green-400 font-mono text-sm border border-white/10",
    innerClassName: "p-4",
  },
  {
    id: "container-special-code",
    name: "Code Block",
    nameAr: "كود",
    category: "special",
    className: "bg-[#282c34] rounded-lg p-6 text-[#abb2bf] font-mono text-sm overflow-x-auto border border-[#3e4451]",
  },
  {
    id: "container-special-note",
    name: "Note",
    nameAr: "ملاحظة",
    category: "special",
    className: "bg-yellow-50 rounded-lg p-6 border-l-4 border-yellow-400 shadow-sm",
  },
  {
    id: "container-special-warning",
    name: "Warning",
    nameAr: "تحذير",
    category: "special",
    className: "bg-orange-50 rounded-lg p-6 border-l-4 border-orange-500 shadow-sm",
  },
  {
    id: "container-special-error",
    name: "Error",
    nameAr: "خطأ",
    category: "special",
    className: "bg-red-50 rounded-lg p-6 border-l-4 border-red-500 shadow-sm",
  },
  {
    id: "container-special-success",
    name: "Success",
    nameAr: "نجاح",
    category: "special",
    className: "bg-green-50 rounded-lg p-6 border-l-4 border-green-500 shadow-sm",
  },
  {
    id: "container-special-info",
    name: "Info",
    nameAr: "معلومات",
    category: "special",
    className: "bg-blue-50 rounded-lg p-6 border-l-4 border-blue-500 shadow-sm",
  },
  {
    id: "container-special-quote",
    name: "Quote",
    nameAr: "اقتباس",
    category: "special",
    className:
      "bg-gray-50 rounded-lg p-6 border-l-4 border-gray-400 italic relative before:content-['\"'] before:absolute before:top-2 before:left-4 before:text-6xl before:text-gray-200 before:font-serif",
  },
  {
    id: "container-special-highlight",
    name: "Highlight",
    nameAr: "تمييز",
    category: "special",
    className: "bg-gradient-to-r from-yellow-200/50 via-yellow-100/50 to-transparent rounded-lg p-6 border border-yellow-200",
  },
];

// ============================================================
// ➖ DIVIDERS - SIMPLE
// ============================================================

export const SIMPLE_DIVIDERS: DividerStyle[] = [
  { id: "divider-solid", name: "Solid", nameAr: "صلب", category: "simple", className: "w-full h-px bg-gray-300" },
  { id: "divider-dashed", name: "Dashed", nameAr: "متقطع", category: "simple", className: "w-full h-px border-t border-dashed border-gray-300" },
  { id: "divider-dotted", name: "Dotted", nameAr: "منقط", category: "simple", className: "w-full h-px border-t border-dotted border-gray-300" },
  { id: "divider-double", name: "Double", nameAr: "مزدوج", category: "simple", className: "w-full h-1 border-t-2 border-b-2 border-gray-300" },
  { id: "divider-thick", name: "Thick", nameAr: "سميك", category: "simple", className: "w-full h-1 bg-gray-300 rounded-full" },
  { id: "divider-thin", name: "Thin", nameAr: "رفيع", category: "simple", className: "w-full h-[0.5px] bg-gray-200" },
  { id: "divider-gradient", name: "Gradient", nameAr: "متدرج", category: "simple", className: "w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" },
  { id: "divider-gradient-color", name: "Gradient Color", nameAr: "متدرج ملون", category: "simple", className: "w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full" },
  { id: "divider-short", name: "Short Center", nameAr: "قصير مركزي", category: "simple", className: "w-24 h-1 bg-gray-300 mx-auto rounded-full" },
  { id: "divider-short-color", name: "Short Color", nameAr: "قصير ملون", category: "simple", className: "w-24 h-1 bg-blue-500 mx-auto rounded-full" },
  { id: "divider-left", name: "Left Aligned", nameAr: "محاذاة يسار", category: "simple", className: "w-24 h-1 bg-gray-300 rounded-full" },
  { id: "divider-right", name: "Right Aligned", nameAr: "محاذاة يمين", category: "simple", className: "w-24 h-1 bg-gray-300 mr-0 ml-auto rounded-full" },
  { id: "divider-vertical", name: "Vertical", nameAr: "عمودي", category: "simple", className: "w-px h-12 bg-gray-300" },
  { id: "divider-vertical-dashed", name: "Vertical Dashed", nameAr: "عمودي متقطع", category: "simple", className: "w-px h-12 border-r border-dashed border-gray-300" },
  { id: "divider-inset", name: "Inset", nameAr: "مدخل", category: "simple", className: "w-[calc(100%-2rem)] h-px bg-gray-200 mx-auto" },
];

// ============================================================
// 🎨 DIVIDERS - DECORATIVE
// ============================================================

export const DECORATIVE_DIVIDERS: DividerStyle[] = [
  {
    id: "divider-dots",
    name: "Dots",
    nameAr: "نقاط",
    category: "decorative",
    className: "w-full flex items-center justify-center gap-2 py-4",
    svg: `<span class="w-2 h-2 bg-gray-400 rounded-full"></span><span class="w-2 h-2 bg-gray-400 rounded-full"></span><span class="w-2 h-2 bg-gray-400 rounded-full"></span>`,
  },
  {
    id: "divider-diamond",
    name: "Diamond",
    nameAr: "ماسة",
    category: "decorative",
    className: "w-full flex items-center gap-4 py-4",
    svg: `<div class="flex-1 h-px bg-gray-300"></div><div class="w-3 h-3 bg-gray-400 rotate-45"></div><div class="flex-1 h-px bg-gray-300"></div>`,
  },
  {
    id: "divider-star",
    name: "Star",
    nameAr: "نجمة",
    category: "decorative",
    className: "w-full flex items-center gap-4 py-4",
    svg: `<div class="flex-1 h-px bg-gray-300"></div><span class="text-gray-400">★</span><div class="flex-1 h-px bg-gray-300"></div>`,
  },
  {
    id: "divider-arrows",
    name: "Arrows",
    nameAr: "أسهم",
    category: "decorative",
    className: "w-full flex items-center gap-4 py-4",
    svg: `<div class="flex-1 h-px bg-gray-300"></div><span class="text-gray-400">◄ ►</span><div class="flex-1 h-px bg-gray-300"></div>`,
  },
  {
    id: "divider-wave",
    name: "Wave",
    nameAr: "موجة",
    category: "decorative",
    className: "w-full py-4",
    svg: `<svg viewBox="0 0 1200 30" class="w-full h-4 fill-gray-300"><path d="M0,15 Q150,0 300,15 T600,15 T900,15 T1200,15 L1200,30 L0,30 Z"/></svg>`,
  },
  {
    id: "divider-zigzag",
    name: "Zigzag",
    nameAr: "متعرج",
    category: "decorative",
    className: "w-full py-4",
    svg: `<svg viewBox="0 0 1200 20" class="w-full h-3 stroke-gray-300 fill-none stroke-2"><path d="M0,10 L30,0 L60,10 L90,0 L120,10 L150,0 L180,10 L210,0 L240,10 L270,0 L300,10 L330,0 L360,10 L390,0 L420,10 L450,0 L480,10 L510,0 L540,10 L570,0 L600,10 L630,0 L660,10 L690,0 L720,10 L750,0 L780,10 L810,0 L840,10 L870,0 L900,10 L930,0 L960,10 L990,0 L1020,10 L1050,0 L1080,10 L1110,0 L1140,10 L1170,0 L1200,10"/></svg>`,
  },
  {
    id: "divider-ornament",
    name: "Ornament",
    nameAr: "زخرفة",
    category: "decorative",
    className: "w-full flex items-center gap-4 py-4",
    svg: `<div class="flex-1 h-px bg-gray-300"></div><span class="text-gray-400 text-2xl">❧</span><div class="flex-1 h-px bg-gray-300"></div>`,
  },
  {
    id: "divider-flourish",
    name: "Flourish",
    nameAr: "زهرة",
    category: "decorative",
    className: "w-full flex items-center gap-4 py-4",
    svg: `<div class="flex-1 h-px bg-gray-300"></div><span class="text-gray-400">✿</span><div class="flex-1 h-px bg-gray-300"></div>`,
  },
  {
    id: "divider-infinity",
    name: "Infinity",
    nameAr: "لا نهاية",
    category: "decorative",
    className: "w-full flex items-center gap-4 py-4",
    svg: `<div class="flex-1 h-px bg-gray-300"></div><span class="text-gray-400 text-xl">∞</span><div class="flex-1 h-px bg-gray-300"></div>`,
  },
  {
    id: "divider-heart",
    name: "Heart",
    nameAr: "قلب",
    category: "decorative",
    className: "w-full flex items-center gap-4 py-4",
    svg: `<div class="flex-1 h-px bg-gray-300"></div><span class="text-red-400">♥</span><div class="flex-1 h-px bg-gray-300"></div>`,
  },
  {
    id: "divider-leaves",
    name: "Leaves",
    nameAr: "أوراق",
    category: "decorative",
    className: "w-full flex items-center gap-2 py-4 justify-center",
    svg: `<span class="text-green-500">🌿</span><div class="w-16 h-px bg-gray-300"></div><span class="text-green-500">🌿</span>`,
  },
  {
    id: "divider-crown",
    name: "Crown",
    nameAr: "تاج",
    category: "decorative",
    className: "w-full flex items-center gap-4 py-4",
    svg: `<div class="flex-1 h-px bg-yellow-400"></div><span class="text-yellow-500">👑</span><div class="flex-1 h-px bg-yellow-400"></div>`,
  },
  {
    id: "divider-sparkle",
    name: "Sparkle",
    nameAr: "بريق",
    category: "decorative",
    className: "w-full flex items-center gap-4 py-4",
    svg: `<div class="flex-1 h-px bg-gray-300"></div><span class="text-yellow-400">✦ ✧ ✦</span><div class="flex-1 h-px bg-gray-300"></div>`,
  },
  {
    id: "divider-scissors",
    name: "Scissors",
    nameAr: "مقص",
    category: "decorative",
    className: "w-full flex items-center py-4",
    svg: `<span class="text-gray-500">✂</span><div class="flex-1 h-px border-t border-dashed border-gray-300"></div>`,
  },
  {
    id: "divider-chain",
    name: "Chain",
    nameAr: "سلسلة",
    category: "decorative",
    className: "w-full flex items-center justify-center gap-1 py-4",
    svg: `<span class="text-gray-400">⛓ ⛓ ⛓ ⛓ ⛓</span>`,
  },
];

// ============================================================
// 🌊 DIVIDERS - SVG SHAPES
// ============================================================

export const SVG_DIVIDERS: DividerStyle[] = [
  {
    id: "divider-svg-wave-top",
    name: "Wave Top",
    nameAr: "موجة علوية",
    category: "svg",
    className: "w-full",
    svg: `<svg viewBox="0 0 1440 100" class="w-full h-16 fill-current text-gray-100"><path d="M0,50 C360,100 1080,0 1440,50 L1440,0 L0,0 Z"/></svg>`,
  },
  {
    id: "divider-svg-wave-bottom",
    name: "Wave Bottom",
    nameAr: "موجة سفلية",
    category: "svg",
    className: "w-full",
    svg: `<svg viewBox="0 0 1440 100" class="w-full h-16 fill-current text-gray-100"><path d="M0,50 C360,0 1080,100 1440,50 L1440,100 L0,100 Z"/></svg>`,
  },
  {
    id: "divider-svg-curve",
    name: "Curve",
    nameAr: "منحني",
    category: "svg",
    className: "w-full",
    svg: `<svg viewBox="0 0 1440 100" class="w-full h-16 fill-current text-gray-100"><path d="M0,100 Q720,0 1440,100 L1440,100 L0,100 Z"/></svg>`,
  },
  {
    id: "divider-svg-triangle",
    name: "Triangle",
    nameAr: "مثلث",
    category: "svg",
    className: "w-full",
    svg: `<svg viewBox="0 0 1440 100" class="w-full h-16 fill-current text-gray-100"><path d="M0,100 L720,0 L1440,100 Z"/></svg>`,
  },
  {
    id: "divider-svg-tilt",
    name: "Tilt",
    nameAr: "مائل",
    category: "svg",
    className: "w-full",
    svg: `<svg viewBox="0 0 1440 100" class="w-full h-16 fill-current text-gray-100"><path d="M0,0 L1440,100 L1440,100 L0,100 Z"/></svg>`,
  },
  {
    id: "divider-svg-mountains",
    name: "Mountains",
    nameAr: "جبال",
    category: "svg",
    className: "w-full",
    svg: `<svg viewBox="0 0 1440 100" class="w-full h-20 fill-current text-gray-100"><path d="M0,100 L200,30 L400,80 L600,20 L800,70 L1000,10 L1200,60 L1440,0 L1440,100 Z"/></svg>`,
  },
  {
    id: "divider-svg-drops",
    name: "Drops",
    nameAr: "قطرات",
    category: "svg",
    className: "w-full",
    svg: `<svg viewBox="0 0 1440 100" class="w-full h-16 fill-current text-gray-100"><path d="M0,100 Q180,20 360,100 Q540,20 720,100 Q900,20 1080,100 Q1260,20 1440,100 L1440,100 L0,100 Z"/></svg>`,
  },
  {
    id: "divider-svg-split",
    name: "Split",
    nameAr: "منقسم",
    category: "svg",
    className: "w-full",
    svg: `<svg viewBox="0 0 1440 100" class="w-full h-16 fill-current text-gray-100"><path d="M0,0 L720,100 L1440,0 L1440,0 L0,0 Z"/></svg>`,
  },
  {
    id: "divider-svg-rounded",
    name: "Rounded",
    nameAr: "دائري",
    category: "svg",
    className: "w-full",
    svg: `<svg viewBox="0 0 1440 100" class="w-full h-16 fill-current text-gray-100"><ellipse cx="720" cy="100" rx="900" ry="100"/></svg>`,
  },
  {
    id: "divider-svg-steps",
    name: "Steps",
    nameAr: "درجات",
    category: "svg",
    className: "w-full",
    svg: `<svg viewBox="0 0 1440 100" class="w-full h-16 fill-current text-gray-100"><path d="M0,100 L0,80 L360,80 L360,60 L720,60 L720,40 L1080,40 L1080,20 L1440,20 L1440,100 Z"/></svg>`,
  },
];

export const ALL_CONTAINER_STYLES: ContainerStyle[] = [
  ...BASIC_CONTAINERS,
  ...GLASS_CONTAINERS,
  ...GRADIENT_CONTAINERS,
  ...NEON_CONTAINERS,
  ...LUXURY_CONTAINERS,
  ...MODERN_CONTAINERS,
  ...SPECIAL_CONTAINERS,
];

export const ALL_DIVIDER_STYLES: DividerStyle[] = [
  ...SIMPLE_DIVIDERS,
  ...DECORATIVE_DIVIDERS,
  ...SVG_DIVIDERS,
];

export const CONTAINER_CATEGORY_LABELS_AR: Record<string, string> = {
  basic: "أساسي",
  glass: "زجاجي",
  gradient: "متدرج",
  neon: "نيون",
  luxury: "فاخر",
  modern: "حديث",
  special: "خاص",
};

export const DIVIDER_CATEGORY_LABELS_AR: Record<string, string> = {
  simple: "بسيط",
  decorative: "زخرفي",
  svg: "SVG",
};

export function getContainerById(id?: string): ContainerStyle | undefined {
  if (!id) return undefined;
  return ALL_CONTAINER_STYLES.find((c) => c.id === id);
}

export function getDividerById(id?: string): DividerStyle | undefined {
  if (!id) return undefined;
  return ALL_DIVIDER_STYLES.find((d) => d.id === id);
}
