import type { NavTemplate } from "../types";

export const NEON_NAV: NavTemplate[] = [
  {
    id: "nav-neon-cyan",
    name: "Neon Cyan",
    nameAr: "نيون سماوي",
    category: "neon",
    styles: {
      nav: "bg-gray-950 border-b border-cyan-500/30 shadow-[0_0_30px_rgba(0,255,255,0.2)]",
      container: "max-w-7xl mx-auto px-4 h-16 flex items-center justify-between",
      logo: "text-xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]",
      links: "hidden md:flex items-center gap-8",
      link: "text-gray-400 text-sm font-medium transition-all duration-200",
      linkHover: "hover:text-cyan-400 hover:drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]",
      linkActive: "text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]",
      button:
        "bg-transparent text-cyan-400 px-4 py-2 rounded-lg text-sm font-medium border border-cyan-500 hover:bg-cyan-500/20 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] transition-all",
    },
  },
  {
    id: "nav-neon-pink",
    name: "Neon Pink",
    nameAr: "نيون وردي",
    category: "neon",
    styles: {
      nav: "bg-gray-950 border-b border-pink-500/30 shadow-[0_0_30px_rgba(236,72,153,0.2)]",
      container: "max-w-7xl mx-auto px-4 h-16 flex items-center justify-between",
      logo: "text-xl font-bold text-pink-400 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]",
      links: "hidden md:flex items-center gap-8",
      link: "text-gray-400 text-sm font-medium transition-all duration-200",
      linkHover: "hover:text-pink-400 hover:drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]",
      linkActive: "text-pink-400 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]",
      button:
        "bg-transparent text-pink-400 px-4 py-2 rounded-lg text-sm font-medium border border-pink-500 hover:bg-pink-500/20 hover:shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all",
    },
  },
  {
    id: "nav-neon-green",
    name: "Neon Green",
    nameAr: "نيون أخضر",
    category: "neon",
    styles: {
      nav: "bg-gray-950 border-b border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)]",
      container: "max-w-7xl mx-auto px-4 h-16 flex items-center justify-between",
      logo: "text-xl font-bold text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]",
      links: "hidden md:flex items-center gap-8",
      link: "text-gray-400 text-sm font-medium transition-all duration-200",
      linkHover: "hover:text-green-400 hover:drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]",
      linkActive: "text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]",
      button:
        "bg-transparent text-green-400 px-4 py-2 rounded-lg text-sm font-medium border border-green-500 hover:bg-green-500/20 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all",
    },
  },
  {
    id: "nav-neon-purple",
    name: "Neon Purple",
    nameAr: "نيون بنفسجي",
    category: "neon",
    styles: {
      nav: "bg-gray-950 border-b border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.2)]",
      container: "max-w-7xl mx-auto px-4 h-16 flex items-center justify-between",
      logo: "text-xl font-bold text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]",
      links: "hidden md:flex items-center gap-8",
      link: "text-gray-400 text-sm font-medium transition-all duration-200",
      linkHover: "hover:text-purple-400 hover:drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]",
      linkActive: "text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]",
      button:
        "bg-transparent text-purple-400 px-4 py-2 rounded-lg text-sm font-medium border border-purple-500 hover:bg-purple-500/20 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all",
    },
  },
  {
    id: "nav-neon-multi",
    name: "Neon Multi",
    nameAr: "نيون متعدد",
    category: "neon",
    styles: {
      nav: "bg-gray-950 border-b border-transparent bg-clip-padding [background:linear-gradient(#0a0a0a,#0a0a0a)_padding-box,linear-gradient(90deg,#00ffff,#ff00ff,#ffff00)_border-box]",
      container: "max-w-7xl mx-auto px-4 h-16 flex items-center justify-between",
      logo: "text-xl font-bold bg-gradient-to-r from-cyan-400 via-pink-400 to-yellow-400 bg-clip-text text-transparent",
      links: "hidden md:flex items-center gap-8",
      link: "text-gray-400 text-sm font-medium transition-all duration-200",
      linkHover: "hover:text-white",
      linkActive: "text-white",
      button:
        "bg-gradient-to-r from-cyan-500 via-pink-500 to-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity",
    },
  },
  {
    id: "nav-neon-orange",
    name: "Neon Orange",
    nameAr: "نيون برتقالي",
    category: "neon",
    styles: {
      nav: "bg-gray-950 border-b border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.2)]",
      container: "max-w-7xl mx-auto px-4 h-16 flex items-center justify-between",
      logo: "text-xl font-bold text-orange-400 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]",
      links: "hidden md:flex items-center gap-8",
      link: "text-gray-400 text-sm font-medium transition-all duration-200",
      linkHover: "hover:text-orange-400 hover:drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]",
      linkActive: "text-orange-400 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]",
      button:
        "bg-transparent text-orange-400 px-4 py-2 rounded-lg text-sm font-medium border border-orange-500 hover:bg-orange-500/20 hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all",
    },
  },
  {
    id: "nav-neon-red",
    name: "Neon Red",
    nameAr: "نيون أحمر",
    category: "neon",
    styles: {
      nav: "bg-gray-950 border-b border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]",
      container: "max-w-7xl mx-auto px-4 h-16 flex items-center justify-between",
      logo: "text-xl font-bold text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]",
      links: "hidden md:flex items-center gap-8",
      link: "text-gray-400 text-sm font-medium transition-all duration-200",
      linkHover: "hover:text-red-400 hover:drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]",
      linkActive: "text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]",
      button:
        "bg-transparent text-red-400 px-4 py-2 rounded-lg text-sm font-medium border border-red-500 hover:bg-red-500/20 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all",
    },
  },
  {
    id: "nav-neon-gold",
    name: "Neon Gold",
    nameAr: "نيون ذهبي",
    category: "neon",
    styles: {
      nav: "bg-gray-950 border-b border-amber-500/30 shadow-[0_0_30px_rgba(251,191,36,0.2)]",
      container: "max-w-7xl mx-auto px-4 h-16 flex items-center justify-between",
      logo: "text-xl font-bold text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]",
      links: "hidden md:flex items-center gap-8",
      link: "text-gray-400 text-sm font-medium transition-all duration-200",
      linkHover: "hover:text-amber-400 hover:drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]",
      linkActive: "text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]",
      button:
        "bg-transparent text-amber-400 px-4 py-2 rounded-lg text-sm font-medium border border-amber-500 hover:bg-amber-500/20 hover:shadow-[0_0_20px_rgba(251,191,36,0.3)] transition-all",
    },
  },
];

