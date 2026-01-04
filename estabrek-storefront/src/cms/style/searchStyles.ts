// Search input style presets (used by header SearchBox)

export interface SearchInputStyle {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  containerClassName: string;
  inputClassName: string;
  iconClassName?: string;
  buttonClassName?: string;
}

// ============================================================
// 🔍 BASIC SEARCH INPUTS (10 styles)
// ============================================================

export const BASIC_SEARCH_INPUTS: SearchInputStyle[] = [
  {
    id: "search-basic-simple",
    name: "Simple",
    nameAr: "بسيط",
    category: "basic",
    containerClassName: "relative w-full max-w-md",
    inputClassName:
      "w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all",
    iconClassName: "absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5",
  },
  {
    id: "search-basic-rounded",
    name: "Rounded",
    nameAr: "دائري",
    category: "basic",
    containerClassName: "relative w-full max-w-md",
    inputClassName:
      "w-full px-6 py-3 pr-14 rounded-full border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all",
    iconClassName: "absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5",
  },
  {
    id: "search-basic-flat",
    name: "Flat",
    nameAr: "مسطح",
    category: "basic",
    containerClassName: "relative w-full max-w-md",
    inputClassName:
      "w-full px-4 py-3 pr-12 bg-gray-100 rounded-lg border-0 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all",
    iconClassName: "absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5",
  },
  {
    id: "search-basic-underline",
    name: "Underline",
    nameAr: "خط سفلي",
    category: "basic",
    containerClassName: "relative w-full max-w-md",
    inputClassName:
      "w-full px-4 py-3 pr-12 bg-transparent border-0 border-b-2 border-gray-300 focus:border-blue-500 outline-none transition-all",
    iconClassName: "absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5",
  },
  {
    id: "search-basic-shadow",
    name: "Shadow",
    nameAr: "ظل",
    category: "basic",
    containerClassName: "relative w-full max-w-md",
    inputClassName:
      "w-full px-4 py-3 pr-12 rounded-lg border-0 shadow-lg focus:shadow-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all",
    iconClassName: "absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5",
  },
  {
    id: "search-basic-bordered",
    name: "Bordered",
    nameAr: "محدد",
    category: "basic",
    containerClassName: "relative w-full max-w-md",
    inputClassName: "w-full px-4 py-3 pr-12 rounded-lg border-2 border-gray-800 focus:border-blue-600 outline-none transition-all",
    iconClassName: "absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 w-5 h-5",
  },
  {
    id: "search-basic-minimal",
    name: "Minimal",
    nameAr: "حد أدنى",
    category: "basic",
    containerClassName: "relative w-full max-w-md",
    inputClassName: "w-full px-4 py-2 pr-10 bg-transparent border-0 focus:bg-gray-50 rounded outline-none transition-all",
    iconClassName: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4",
  },
  {
    id: "search-basic-compact",
    name: "Compact",
    nameAr: "مضغوط",
    category: "basic",
    containerClassName: "relative w-full max-w-xs",
    inputClassName: "w-full px-3 py-2 pr-9 text-sm rounded-md border border-gray-300 focus:border-blue-500 outline-none transition-all",
    iconClassName: "absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4",
  },
  {
    id: "search-basic-large",
    name: "Large",
    nameAr: "كبير",
    category: "basic",
    containerClassName: "relative w-full max-w-2xl",
    inputClassName:
      "w-full px-6 py-4 pr-14 text-lg rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all",
    iconClassName: "absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6",
  },
  {
    id: "search-basic-icon-left",
    name: "Icon Left",
    nameAr: "أيقونة يسار",
    category: "basic",
    containerClassName: "relative w-full max-w-md",
    inputClassName:
      "w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all",
    iconClassName: "absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5",
  },
];

// ============================================================
// 🌙 DARK SEARCH INPUTS (10 styles)
// ============================================================

export const DARK_SEARCH_INPUTS: SearchInputStyle[] = [
  {
    id: "search-dark-simple",
    name: "Dark Simple",
    nameAr: "داكن بسيط",
    category: "dark",
    containerClassName: "relative w-full max-w-md",
    inputClassName:
      "w-full px-4 py-3 pr-12 bg-gray-800 text-white placeholder-gray-400 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all",
    iconClassName: "absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5",
  },
  {
    id: "search-dark-glass",
    name: "Dark Glass",
    nameAr: "داكن زجاجي",
    category: "dark",
    containerClassName: "relative w-full max-w-md",
    inputClassName:
      "w-full px-4 py-3 pr-12 bg-white/10 backdrop-blur-lg text-white placeholder-gray-300 rounded-lg border border-white/20 focus:border-white/40 focus:bg-white/20 outline-none transition-all",
    iconClassName: "absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5",
  },
  {
    id: "search-dark-neon-cyan",
    name: "Neon Cyan",
    nameAr: "نيون سماوي",
    category: "dark",
    containerClassName: "relative w-full max-w-md",
    inputClassName:
      "w-full px-4 py-3 pr-12 bg-gray-900 text-cyan-400 placeholder-cyan-700 rounded-lg border-2 border-cyan-500 focus:shadow-[0_0_20px_rgba(34,211,238,0.3)] outline-none transition-all",
    iconClassName: "absolute right-4 top-1/2 -translate-y-1/2 text-cyan-500 w-5 h-5",
  },
  {
    id: "search-dark-neon-pink",
    name: "Neon Pink",
    nameAr: "نيون وردي",
    category: "dark",
    containerClassName: "relative w-full max-w-md",
    inputClassName:
      "w-full px-4 py-3 pr-12 bg-gray-900 text-pink-400 placeholder-pink-700 rounded-lg border-2 border-pink-500 focus:shadow-[0_0_20px_rgba(236,72,153,0.3)] outline-none transition-all",
    iconClassName: "absolute right-4 top-1/2 -translate-y-1/2 text-pink-500 w-5 h-5",
  },
  {
    id: "search-dark-neon-purple",
    name: "Neon Purple",
    nameAr: "نيون بنفسجي",
    category: "dark",
    containerClassName: "relative w-full max-w-md",
    inputClassName:
      "w-full px-4 py-3 pr-12 bg-gray-900 text-purple-400 placeholder-purple-700 rounded-lg border-2 border-purple-500 focus:shadow-[0_0_20px_rgba(168,85,247,0.3)] outline-none transition-all",
    iconClassName: "absolute right-4 top-1/2 -translate-y-1/2 text-purple-500 w-5 h-5",
  },
  {
    id: "search-dark-gradient",
    name: "Dark Gradient",
    nameAr: "داكن متدرج",
    category: "dark",
    containerClassName: "relative w-full max-w-md p-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-lg",
    inputClassName: "w-full px-4 py-3 pr-12 bg-gray-900 text-white placeholder-gray-400 rounded-[6px] outline-none",
    iconClassName: "absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5",
  },
  {
    id: "search-dark-outlined",
    name: "Dark Outlined",
    nameAr: "داكن محدد",
    category: "dark",
    containerClassName: "relative w-full max-w-md",
    inputClassName:
      "w-full px-4 py-3 pr-12 bg-transparent text-white placeholder-gray-500 rounded-lg border-2 border-gray-600 focus:border-white outline-none transition-all",
    iconClassName: "absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5",
  },
  {
    id: "search-dark-subtle",
    name: "Dark Subtle",
    nameAr: "داكن خفيف",
    category: "dark",
    containerClassName: "relative w-full max-w-md",
    inputClassName:
      "w-full px-4 py-3 pr-12 bg-gray-800/50 text-white placeholder-gray-500 rounded-lg border border-gray-700/50 focus:bg-gray-800 focus:border-gray-600 outline-none transition-all",
    iconClassName: "absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5",
  },
  {
    id: "search-dark-pill",
    name: "Dark Pill",
    nameAr: "داكن حبة",
    category: "dark",
    containerClassName: "relative w-full max-w-md",
    inputClassName:
      "w-full px-6 py-3 pr-14 bg-gray-800 text-white placeholder-gray-400 rounded-full border border-gray-700 focus:border-gray-500 outline-none transition-all",
    iconClassName: "absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5",
  },
  {
    id: "search-dark-terminal",
    name: "Terminal",
    nameAr: "طرفية",
    category: "dark",
    containerClassName: "relative w-full max-w-md",
    inputClassName:
      "w-full px-4 py-3 pr-12 bg-black text-green-400 placeholder-green-700 font-mono rounded border border-green-900 focus:border-green-500 outline-none transition-all",
    iconClassName: "absolute right-4 top-1/2 -translate-y-1/2 text-green-500 w-5 h-5",
  },
];

// ============================================================
// 🎨 STYLED SEARCH INPUTS (10 styles)
// ============================================================

export const STYLED_SEARCH_INPUTS: SearchInputStyle[] = [
  {
    id: "search-styled-gradient-blue",
    name: "Gradient Blue",
    nameAr: "متدرج أزرق",
    category: "styled",
    containerClassName: "relative w-full max-w-md",
    inputClassName:
      "w-full px-4 py-3 pr-12 bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-900 placeholder-blue-400 rounded-lg border border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all",
    iconClassName: "absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5",
  },
  {
    id: "search-styled-gradient-purple",
    name: "Gradient Purple",
    nameAr: "متدرج بنفسجي",
    category: "styled",
    containerClassName: "relative w-full max-w-md",
    inputClassName:
      "w-full px-4 py-3 pr-12 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-900 placeholder-purple-400 rounded-lg border border-purple-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all",
    iconClassName: "absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 w-5 h-5",
  },
  {
    id: "search-styled-glass-light",
    name: "Glass Light",
    nameAr: "زجاجي فاتح",
    category: "styled",
    containerClassName: "relative w-full max-w-md",
    inputClassName:
      "w-full px-4 py-3 pr-12 bg-white/60 backdrop-blur-md text-gray-800 placeholder-gray-500 rounded-xl border border-white/80 shadow-lg focus:bg-white/80 focus:shadow-xl outline-none transition-all",
    iconClassName: "absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5",
  },
  {
    id: "search-styled-neumorphism",
    name: "Neumorphism",
    nameAr: "نيومورفيزم",
    category: "styled",
    containerClassName: "relative w-full max-w-md",
    inputClassName:
      "w-full px-4 py-3 pr-12 bg-gray-100 text-gray-800 placeholder-gray-400 rounded-xl border-0 shadow-[inset_4px_4px_8px_#d1d1d1,inset_-4px_-4px_8px_#ffffff] focus:shadow-[inset_2px_2px_4px_#d1d1d1,inset_-2px_-2px_4px_#ffffff] outline-none transition-all",
    iconClassName: "absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5",
  },
  {
    id: "search-styled-retro",
    name: "Retro",
    nameAr: "رجعي",
    category: "styled",
    containerClassName: "relative w-full max-w-md",
    inputClassName:
      "w-full px-4 py-3 pr-12 bg-amber-50 text-amber-900 placeholder-amber-600 rounded border-2 border-amber-800 shadow-[4px_4px_0px_#78350f] focus:shadow-[2px_2px_0px_#78350f] focus:translate-x-[2px] focus:translate-y-[2px] outline-none transition-all",
    iconClassName: "absolute right-4 top-1/2 -translate-y-1/2 text-amber-700 w-5 h-5",
  },
  {
    id: "search-styled-material",
    name: "Material",
    nameAr: "ماتيريال",
    category: "styled",
    containerClassName: "relative w-full max-w-md group",
    inputClassName:
      "w-full px-4 py-3 pr-12 bg-transparent text-gray-800 border-0 border-b-2 border-gray-300 focus:border-blue-500 outline-none transition-all peer",
    iconClassName:
      "absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 w-5 h-5 transition-colors",
  },
  {
    id: "search-styled-floating",
    name: "Floating Label",
    nameAr: "تسمية عائمة",
    category: "styled",
    containerClassName: "relative w-full max-w-md",
    inputClassName:
      "w-full px-4 py-4 pr-12 bg-white text-gray-800 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all peer placeholder-transparent",
    iconClassName: "absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5",
  },
  {
    id: "search-styled-colorful",
    name: "Colorful",
    nameAr: "ملون",
    category: "styled",
    containerClassName: "relative w-full max-w-md p-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 rounded-xl",
    inputClassName: "w-full px-4 py-3 pr-12 bg-white text-gray-800 placeholder-gray-400 rounded-lg outline-none",
    iconClassName: "absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5",
  },
  {
    id: "search-styled-luxury",
    name: "Luxury",
    nameAr: "فاخر",
    category: "styled",
    containerClassName: "relative w-full max-w-md",
    inputClassName:
      "w-full px-6 py-4 pr-14 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-900 placeholder-amber-600 rounded-none border border-amber-300 focus:border-amber-500 tracking-wide font-light outline-none transition-all",
    iconClassName: "absolute right-5 top-1/2 -translate-y-1/2 text-amber-500 w-5 h-5",
  },
  {
    id: "search-styled-minimal-line",
    name: "Minimal Line",
    nameAr: "خط بسيط",
    category: "styled",
    containerClassName: "relative w-full max-w-md",
    inputClassName:
      "w-full px-2 py-2 pr-10 bg-transparent text-gray-800 placeholder-gray-400 border-0 border-b border-gray-200 focus:border-gray-800 outline-none transition-all",
    iconClassName: "absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4",
  },
];

// ============================================================
// 🔘 SEARCH WITH BUTTON (10 styles)
// ============================================================

export const SEARCH_WITH_BUTTON: SearchInputStyle[] = [
  {
    id: "search-btn-attached",
    name: "Attached Button",
    nameAr: "زر ملتصق",
    category: "button",
    containerClassName: "relative w-full max-w-md flex",
    inputClassName:
      "flex-1 px-4 py-3 rounded-r-lg border border-l-0 border-gray-300 focus:border-blue-500 focus:z-10 outline-none transition-all",
    buttonClassName: "px-6 py-3 bg-blue-600 text-white rounded-l-lg hover:bg-blue-700 transition-colors",
  },
  {
    id: "search-btn-inside",
    name: "Button Inside",
    nameAr: "زر داخلي",
    category: "button",
    containerClassName: "relative w-full max-w-md",
    inputClassName: "w-full px-4 py-3 pl-24 rounded-lg border border-gray-300 focus:border-blue-500 outline-none transition-all",
    buttonClassName:
      "absolute left-1 top-1 bottom-1 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm",
  },
  {
    id: "search-btn-gradient",
    name: "Gradient Button",
    nameAr: "زر متدرج",
    category: "button",
    containerClassName: "relative w-full max-w-md flex",
    inputClassName:
      "flex-1 px-4 py-3 rounded-r-xl border border-l-0 border-gray-200 focus:border-transparent focus:ring-2 focus:ring-purple-500/20 outline-none transition-all",
    buttonClassName:
      "px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-l-xl hover:from-purple-700 hover:to-pink-700 transition-all",
  },
  {
    id: "search-btn-icon",
    name: "Icon Button",
    nameAr: "زر أيقونة",
    category: "button",
    containerClassName: "relative w-full max-w-md flex",
    inputClassName:
      "flex-1 px-4 py-3 rounded-r-lg border border-l-0 border-gray-300 focus:border-blue-500 outline-none transition-all",
    buttonClassName:
      "px-4 py-3 bg-blue-600 text-white rounded-l-lg hover:bg-blue-700 transition-colors flex items-center justify-center",
    iconClassName: "w-5 h-5",
  },
  {
    id: "search-btn-pill",
    name: "Pill Button",
    nameAr: "زر حبة",
    category: "button",
    containerClassName: "relative w-full max-w-md flex bg-gray-100 rounded-full p-1",
    inputClassName: "flex-1 px-4 py-2 bg-transparent outline-none",
    buttonClassName:
      "px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors text-sm font-medium",
  },
  {
    id: "search-btn-dark",
    name: "Dark Button",
    nameAr: "زر داكن",
    category: "button",
    containerClassName: "relative w-full max-w-md flex",
    inputClassName:
      "flex-1 px-4 py-3 bg-gray-800 text-white placeholder-gray-400 rounded-r-lg border border-l-0 border-gray-700 focus:border-gray-500 outline-none transition-all",
    buttonClassName: "px-6 py-3 bg-white text-gray-900 rounded-l-lg hover:bg-gray-100 transition-colors font-medium",
  },
  {
    id: "search-btn-outline",
    name: "Outline Button",
    nameAr: "زر محدد",
    category: "button",
    containerClassName: "relative w-full max-w-md flex",
    inputClassName:
      "flex-1 px-4 py-3 rounded-r-lg border-2 border-l-0 border-gray-800 focus:border-blue-600 outline-none transition-all",
    buttonClassName:
      "px-6 py-3 bg-transparent text-gray-800 border-2 border-gray-800 rounded-l-lg hover:bg-gray-800 hover:text-white transition-all font-medium",
  },
  {
    id: "search-btn-neon",
    name: "Neon Button",
    nameAr: "زر نيون",
    category: "button",
    containerClassName: "relative w-full max-w-md flex",
    inputClassName:
      "flex-1 px-4 py-3 bg-gray-900 text-cyan-400 placeholder-cyan-700 rounded-r-lg border-2 border-l-0 border-cyan-500 outline-none transition-all",
    buttonClassName:
      "px-6 py-3 bg-cyan-500 text-black rounded-l-lg hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all font-medium",
  },
  {
    id: "search-btn-minimal",
    name: "Minimal Button",
    nameAr: "زر بسيط",
    category: "button",
    containerClassName: "relative w-full max-w-md flex items-center gap-2",
    inputClassName: "flex-1 px-4 py-2 bg-gray-100 rounded-lg outline-none focus:bg-gray-200 transition-all",
    buttonClassName: "p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all",
    iconClassName: "w-5 h-5",
  },
  {
    id: "search-btn-voice",
    name: "Voice Search",
    nameAr: "بحث صوتي",
    category: "button",
    containerClassName: "relative w-full max-w-md flex items-center",
    inputClassName:
      "flex-1 px-4 py-3 pr-24 rounded-full border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all",
    buttonClassName: "absolute left-2 p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all",
    iconClassName: "w-5 h-5",
  },
];

export const ALL_SEARCH_INPUTS: SearchInputStyle[] = [
  ...BASIC_SEARCH_INPUTS,
  ...DARK_SEARCH_INPUTS,
  ...STYLED_SEARCH_INPUTS,
  ...SEARCH_WITH_BUTTON,
];

export function getSearchInputById(id: string): SearchInputStyle | undefined {
  return ALL_SEARCH_INPUTS.find((s) => s.id === id);
}

export function getSearchInputsByCategory(category: string): SearchInputStyle[] {
  return ALL_SEARCH_INPUTS.filter((s) => s.category === category);
}

export function getAllSearchInputCategories(): string[] {
  return [...new Set(ALL_SEARCH_INPUTS.map((s) => s.category))];
}

export const SEARCH_INPUT_CATEGORY_LABELS_AR: Record<string, string> = {
  basic: "أساسي",
  dark: "داكن",
  styled: "منسق",
  button: "مع زر",
};

