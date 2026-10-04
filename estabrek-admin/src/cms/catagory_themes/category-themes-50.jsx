import { useState } from "react";

// ═══════════════════════════════════════════════════════════════
// 50 CATEGORY SELECTOR THEMES WITH CUSTOM SVG ILLUSTRATIONS
// Each theme = unique visual style for picking categories
// ═══════════════════════════════════════════════════════════════

// --- SVG Icon Library (hand-crafted for each category) ---
const SVG = {
  // Food & Drink
  cake: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><path d="M10,32 L10,24 Q10,20 14,20 L34,20 Q38,20 38,24 L38,32 Z" fill={c} opacity="0.9"/><path d="M8,32 L8,38 Q8,40 10,40 L38,40 Q40,40 40,38 L40,32 Z" fill={c} opacity="0.7"/><path d="M14,20 Q14,16 18,14 Q22,12 24,8" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"/><circle cx="24" cy="7" r="2" fill="#fbbf24"/><path d="M8,32 L40,32" stroke={c} strokeWidth="1.5" opacity="0.5"/><circle cx="16" cy="26" r="1.5" fill="#fbbf24" opacity="0.8"/><circle cx="24" cy="26" r="1.5" fill="#f472b6" opacity="0.8"/><circle cx="32" cy="26" r="1.5" fill="#34d399" opacity="0.8"/></svg>,
  coffee: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><path d="M12,18 L14,38 Q14,40 16,40 L30,40 Q32,40 32,38 L34,18 Z" fill={c} opacity="0.8"/><path d="M34,22 Q40,22 40,28 Q40,34 34,34" fill="none" stroke={c} strokeWidth="2"/><path d="M19,12 Q20,8 19,6" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"><animate attributeName="d" values="M19,12 Q20,8 19,6;M19,12 Q18,8 19,5;M19,12 Q20,8 19,6" dur="2s" repeatCount="indefinite"/></path><path d="M24,12 Q25,7 24,4" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"><animate attributeName="d" values="M24,12 Q25,7 24,4;M24,12 Q23,7 24,3;M24,12 Q25,7 24,4" dur="2.5s" repeatCount="indefinite"/></path></svg>,
  pizza: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><path d="M24,8 L40,38 Q40,40 38,40 L10,40 Q8,40 8,38 Z" fill={c} opacity="0.8"/><circle cx="20" cy="28" r="3" fill="#ef4444" opacity="0.7"/><circle cx="28" cy="32" r="2.5" fill="#ef4444" opacity="0.7"/><circle cx="24" cy="20" r="2" fill="#ef4444" opacity="0.7"/><path d="M16,24 Q20,22 22,18" fill="none" stroke={c} strokeWidth="1" opacity="0.3"/></svg>,
  burger: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><ellipse cx="24" cy="16" rx="14" ry="6" fill={c} opacity="0.9"/><rect x="10" y="22" width="28" height="6" fill={c} opacity="0.6" rx="1"/><rect x="11" y="28" width="26" height="5" fill={c} opacity="0.7" rx="1"/><ellipse cx="24" cy="36" rx="13" ry="4" fill={c} opacity="0.8"/><path d="M12,25 Q18,23 24,25 Q30,27 36,25" fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.5"/></svg>,
  icecream: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><circle cx="24" cy="16" r="8" fill={c} opacity="0.85"/><circle cx="18" cy="14" r="6" fill={c} opacity="0.75"/><circle cx="30" cy="14" r="6" fill={c} opacity="0.75"/><polygon points="17,20 31,20 24,42" fill={c} opacity="0.6"/><path d="M17,20 L31,20" stroke={c} strokeWidth="1" opacity="0.3"/><circle cx="24" cy="13" r="2" fill="#f472b6" opacity="0.6"/></svg>,
  candy: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><rect x="18" y="10" width="12" height="20" rx="6" fill={c} opacity="0.8"/><path d="M18,14 L12,10 M18,18 L10,17 M18,22 L12,25" stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.5"/><path d="M30,14 L36,10 M30,18 L38,17 M30,22 L36,25" stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.5"/><rect x="18" y="14" width="12" height="3" fill={c} opacity="0.3" rx="1"/><rect x="18" y="21" width="12" height="3" fill={c} opacity="0.3" rx="1"/><line x1="24" y1="30" x2="24" y2="40" stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.6"/></svg>,
  donut: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><circle cx="24" cy="24" r="14" fill={c} opacity="0.8"/><circle cx="24" cy="24" r="6" fill="#0a0a0a"/><ellipse cx="24" cy="20" rx="13" ry="8" fill={c} opacity="0.4"/><circle cx="17" cy="18" r="1.5" fill="#f472b6" opacity="0.6"/><circle cx="24" cy="15" r="1.5" fill="#fbbf24" opacity="0.6"/><circle cx="31" cy="18" r="1.5" fill="#34d399" opacity="0.6"/></svg>,
  // Fashion & Shopping
  tshirt: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><path d="M16,12 L12,8 L6,14 L12,20 L12,40 L36,40 L36,20 L42,14 L36,8 L32,12 Q28,16 24,16 Q20,16 16,12 Z" fill={c} opacity="0.8"/><path d="M16,12 Q20,16 24,16 Q28,16 32,12" fill="none" stroke={c} strokeWidth="1.5" opacity="0.4"/></svg>,
  shoe: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><path d="M8,30 Q8,24 14,22 L32,22 Q42,22 42,28 L42,32 Q42,36 38,36 L12,36 Q8,36 8,32 Z" fill={c} opacity="0.8"/><path d="M14,22 L16,14 Q18,10 22,12 L24,16" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/><line x1="12" y1="28" x2="38" y2="28" stroke={c} strokeWidth="1" opacity="0.3"/></svg>,
  bag: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><rect x="10" y="18" width="28" height="24" rx="4" fill={c} opacity="0.8"/><path d="M16,18 L16,12 Q16,6 24,6 Q32,6 32,12 L32,18" fill="none" stroke={c} strokeWidth="2.5"/><circle cx="24" cy="30" r="3" fill="none" stroke={c} strokeWidth="1.5" opacity="0.5"/></svg>,
  watch: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><circle cx="24" cy="24" r="12" fill={c} opacity="0.8"/><circle cx="24" cy="24" r="10" fill={c} opacity="0.3"/><line x1="24" y1="24" x2="24" y2="16" stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.9"/><line x1="24" y1="24" x2="30" y2="24" stroke={c} strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/><rect x="22" y="4" width="4" height="8" rx="2" fill={c} opacity="0.6"/><rect x="22" y="36" width="4" height="8" rx="2" fill={c} opacity="0.6"/></svg>,
  glasses: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><circle cx="16" cy="24" r="8" fill="none" stroke={c} strokeWidth="2.5" opacity="0.8"/><circle cx="32" cy="24" r="8" fill="none" stroke={c} strokeWidth="2.5" opacity="0.8"/><path d="M24,24 Q24,22 24,24" stroke={c} strokeWidth="2.5"/><line x1="8" y1="22" x2="4" y2="20" stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.6"/><line x1="40" y1="22" x2="44" y2="20" stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.6"/></svg>,
  // Tech
  laptop: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><rect x="8" y="10" width="32" height="22" rx="2" fill={c} opacity="0.8"/><rect x="10" y="12" width="28" height="18" rx="1" fill={c} opacity="0.3"/><path d="M4,34 L44,34 L42,38 L6,38 Z" fill={c} opacity="0.6"/><circle cx="24" cy="14" r="0" fill={c}><animate attributeName="r" values="0;6;0" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0.2;0" dur="3s" repeatCount="indefinite"/></circle></svg>,
  phone: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><rect x="14" y="4" width="20" height="40" rx="4" fill={c} opacity="0.8"/><rect x="16" y="8" width="16" height="28" rx="2" fill={c} opacity="0.3"/><circle cx="24" cy="40" r="2" fill={c} opacity="0.5"/><rect x="20" y="5" width="8" height="2" rx="1" fill={c} opacity="0.4"/></svg>,
  camera: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><rect x="6" y="16" width="36" height="24" rx="4" fill={c} opacity="0.8"/><circle cx="24" cy="28" r="8" fill="none" stroke={c} strokeWidth="2" opacity="0.5"/><circle cx="24" cy="28" r="4" fill={c} opacity="0.4"/><rect x="18" y="10" width="12" height="6" rx="2" fill={c} opacity="0.6"/><circle cx="36" cy="20" r="2" fill={c} opacity="0.4"/></svg>,
  gamepad: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><path d="M8,20 Q8,14 14,14 L34,14 Q40,14 40,20 L40,28 Q40,36 34,38 L30,38 Q28,38 26,34 L22,34 Q20,38 18,38 L14,38 Q8,36 8,28 Z" fill={c} opacity="0.8"/><rect x="13" y="22" width="8" height="2" rx="1" fill={c} opacity="0.4"/><rect x="16" y="19" width="2" height="8" rx="1" fill={c} opacity="0.4"/><circle cx="32" cy="21" r="2" fill={c} opacity="0.5"/><circle cx="36" cy="25" r="2" fill={c} opacity="0.5"/></svg>,
  headphone: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><path d="M10,26 Q10,12 24,12 Q38,12 38,26" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" opacity="0.8"/><rect x="6" y="26" width="8" height="14" rx="4" fill={c} opacity="0.8"/><rect x="34" y="26" width="8" height="14" rx="4" fill={c} opacity="0.8"/></svg>,
  // Nature
  flower: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full">{[0,72,144,216,288].map((a,i) => <ellipse key={i} cx={24+Math.cos(a*Math.PI/180)*8} cy={18+Math.sin(a*Math.PI/180)*8} rx="5" ry="8" fill={c} opacity="0.6" transform={`rotate(${a} ${24+Math.cos(a*Math.PI/180)*8} ${18+Math.sin(a*Math.PI/180)*8})`}/>)}<circle cx="24" cy="18" r="4" fill={c} opacity="0.9"/><line x1="24" y1="26" x2="24" y2="42" stroke={c} strokeWidth="2.5" opacity="0.6"/><path d="M24,34 Q28,30 32,32" fill="none" stroke={c} strokeWidth="1.5" opacity="0.4"/></svg>,
  tree: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><polygon points="24,6 36,22 30,22 38,34 10,34 18,22 12,22" fill={c} opacity="0.8"/><rect x="21" y="34" width="6" height="10" fill={c} opacity="0.6"/></svg>,
  mountain: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><polygon points="24,8 44,40 4,40" fill={c} opacity="0.7"/><polygon points="24,8 20,16 28,16" fill={c} opacity="0.9"/><polygon points="36,20 48,40 24,40" fill={c} opacity="0.5"/></svg>,
  sun: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><circle cx="24" cy="24" r="8" fill={c} opacity="0.9"/>{[0,45,90,135,180,225,270,315].map((a,i) => <line key={i} x1={24+Math.cos(a*Math.PI/180)*12} y1={24+Math.sin(a*Math.PI/180)*12} x2={24+Math.cos(a*Math.PI/180)*18} y2={24+Math.sin(a*Math.PI/180)*18} stroke={c} strokeWidth="2.5" strokeLinecap="round" opacity="0.6"/>)}</svg>,
  leaf: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><path d="M24,6 Q40,12 38,28 Q36,40 24,42 Q12,40 10,28 Q8,12 24,6Z" fill={c} opacity="0.7"/><line x1="24" y1="14" x2="24" y2="38" stroke={c} strokeWidth="1.5" opacity="0.4"/><path d="M24,20 Q18,18 14,22" fill="none" stroke={c} strokeWidth="1" opacity="0.3"/><path d="M24,26 Q30,24 34,28" fill="none" stroke={c} strokeWidth="1" opacity="0.3"/></svg>,
  // Home & Lifestyle
  house: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><polygon points="24,6 42,22 6,22" fill={c} opacity="0.9"/><rect x="12" y="22" width="24" height="20" fill={c} opacity="0.7"/><rect x="20" y="30" width="8" height="12" fill={c} opacity="0.3"/><rect x="14" y="26" width="6" height="6" fill={c} opacity="0.4"/></svg>,
  lamp: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><polygon points="14,6 34,6 38,26 10,26" fill={c} opacity="0.7"/><rect x="18" y="26" width="12" height="4" fill={c} opacity="0.5"/><rect x="22" y="30" width="4" height="8" fill={c} opacity="0.6"/><rect x="16" y="38" width="16" height="4" rx="2" fill={c} opacity="0.7"/></svg>,
  sofa: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><rect x="6" y="18" width="36" height="16" rx="4" fill={c} opacity="0.7"/><rect x="10" y="12" width="28" height="12" rx="3" fill={c} opacity="0.8"/><rect x="4" y="18" width="6" height="18" rx="3" fill={c} opacity="0.6"/><rect x="38" y="18" width="6" height="18" rx="3" fill={c} opacity="0.6"/><rect x="10" y="36" width="4" height="6" rx="1" fill={c} opacity="0.5"/><rect x="34" y="36" width="4" height="6" rx="1" fill={c} opacity="0.5"/></svg>,
  // Sports
  ball: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><circle cx="24" cy="24" r="14" fill={c} opacity="0.8"/><path d="M10,24 Q17,16 24,24 Q31,32 38,24" fill="none" stroke={c} strokeWidth="1.5" opacity="0.4"/><path d="M24,10 Q16,17 24,24 Q32,31 24,38" fill="none" stroke={c} strokeWidth="1.5" opacity="0.4"/></svg>,
  trophy: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><path d="M14,8 L34,8 L32,24 Q28,30 24,30 Q20,30 16,24 Z" fill={c} opacity="0.8"/><path d="M14,12 Q8,12 8,18 Q8,22 14,22" fill="none" stroke={c} strokeWidth="2" opacity="0.5"/><path d="M34,12 Q40,12 40,18 Q40,22 34,22" fill="none" stroke={c} strokeWidth="2" opacity="0.5"/><rect x="21" y="30" width="6" height="6" fill={c} opacity="0.6"/><rect x="16" y="36" width="16" height="4" rx="2" fill={c} opacity="0.7"/></svg>,
  // Travel
  plane: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><path d="M24,6 L28,18 L42,22 L42,26 L28,24 L26,36 L32,38 L32,42 L24,40 L16,42 L16,38 L22,36 L20,24 L6,26 L6,22 L20,18 Z" fill={c} opacity="0.8"/></svg>,
  compass: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><circle cx="24" cy="24" r="16" fill="none" stroke={c} strokeWidth="2" opacity="0.7"/><polygon points="24,10 27,22 24,26 21,22" fill={c} opacity="0.9"/><polygon points="24,38 27,26 24,22 21,26" fill={c} opacity="0.5"/><circle cx="24" cy="24" r="2" fill={c} opacity="0.8"/></svg>,
  // Art & Creative
  palette: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><ellipse cx="24" cy="26" rx="18" ry="14" fill={c} opacity="0.7"/><circle cx="24" cy="30" r="4" fill="#0a0a0a"/><circle cx="16" cy="22" r="3" fill="#ef4444" opacity="0.7"/><circle cx="24" cy="18" r="3" fill="#3b82f6" opacity="0.7"/><circle cx="32" cy="22" r="3" fill="#22c55e" opacity="0.7"/><circle cx="34" cy="30" r="3" fill="#fbbf24" opacity="0.7"/></svg>,
  music: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><circle cx="16" cy="34" r="6" fill={c} opacity="0.8"/><circle cx="36" cy="30" r="6" fill={c} opacity="0.8"/><line x1="22" y1="34" x2="22" y2="10" stroke={c} strokeWidth="2.5" opacity="0.7"/><line x1="42" y1="30" x2="42" y2="6" stroke={c} strokeWidth="2.5" opacity="0.7"/><line x1="22" y1="10" x2="42" y2="6" stroke={c} strokeWidth="2.5" opacity="0.7"/></svg>,
  book: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><path d="M8,8 L24,12 L24,42 L8,38 Z" fill={c} opacity="0.7"/><path d="M40,8 L24,12 L24,42 L40,38 Z" fill={c} opacity="0.8"/><line x1="24" y1="12" x2="24" y2="42" stroke={c} strokeWidth="1" opacity="0.4"/></svg>,
  star: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><polygon points="24,4 28,18 44,18 32,28 36,42 24,34 12,42 16,28 4,18 20,18" fill={c} opacity="0.8"/></svg>,
  // Wellness
  heart: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><path d="M24,40 C10,30 4,20 4,14 Q4,6 12,6 Q18,6 24,14 Q30,6 36,6 Q44,6 44,14 C44,20 38,30 24,40Z" fill={c} opacity="0.8"/></svg>,
  yoga: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><circle cx="24" cy="10" r="5" fill={c} opacity="0.8"/><line x1="24" y1="15" x2="24" y2="30" stroke={c} strokeWidth="2.5" strokeLinecap="round" opacity="0.8"/><line x1="24" y1="20" x2="14" y2="26" stroke={c} strokeWidth="2.5" strokeLinecap="round" opacity="0.6"/><line x1="24" y1="20" x2="34" y2="26" stroke={c} strokeWidth="2.5" strokeLinecap="round" opacity="0.6"/><line x1="24" y1="30" x2="16" y2="42" stroke={c} strokeWidth="2.5" strokeLinecap="round" opacity="0.6"/><line x1="24" y1="30" x2="32" y2="42" stroke={c} strokeWidth="2.5" strokeLinecap="round" opacity="0.6"/></svg>,
  gem: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><polygon points="14,12 34,12 42,22 24,42 6,22" fill={c} opacity="0.7"/><polygon points="14,12 24,22 34,12" fill={c} opacity="0.9"/><line x1="6" y1="22" x2="42" y2="22" stroke={c} strokeWidth="1" opacity="0.4"/><line x1="24" y1="22" x2="24" y2="42" stroke={c} strokeWidth="1" opacity="0.3"/><line x1="24" y1="22" x2="14" y2="12" stroke={c} strokeWidth="1" opacity="0.3"/><line x1="24" y1="22" x2="34" y2="12" stroke={c} strokeWidth="1" opacity="0.3"/></svg>,
  rocket: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><path d="M24,4 Q32,10 32,24 L28,34 L20,34 L16,24 Q16,10 24,4Z" fill={c} opacity="0.8"/><circle cx="24" cy="18" r="3" fill={c} opacity="0.4"/><polygon points="16,24 10,32 16,28" fill={c} opacity="0.6"/><polygon points="32,24 38,32 32,28" fill={c} opacity="0.6"/><path d="M20,34 Q22,40 24,44 Q26,40 28,34" fill={c} opacity="0.5"><animate attributeName="opacity" values="0.3;0.6;0.3" dur="1s" repeatCount="indefinite"/></path></svg>,
  bolt: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><polygon points="28,4 16,24 24,24 20,44 36,20 26,20" fill={c} opacity="0.85"/></svg>,
  crown: (c="#fff") => <svg viewBox="0 0 48 48" className="w-full h-full"><polygon points="6,34 10,14 18,24 24,8 30,24 38,14 42,34" fill={c} opacity="0.8"/><rect x="6" y="34" width="36" height="6" rx="2" fill={c} opacity="0.7"/><circle cx="18" cy="30" r="2" fill={c} opacity="0.4"/><circle cx="24" cy="28" r="2" fill={c} opacity="0.4"/><circle cx="30" cy="30" r="2" fill={c} opacity="0.4"/></svg>,
};

// --- THEME DEFINITIONS ---
// Each theme: { id, name, style, categories[] with SVG keys }

export const categoryThemes = [

// ━━━━━━━━━━━━━━━━━━━━━━━━
// 🔮 GLASS STYLES (1-8)
// ━━━━━━━━━━━━━━━━━━━━━━━━

{ id:1, name:"Aurora Glass Cards", style:"Glass", bg:"linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
  cats:[{n:"Bakery",k:"cake",c:"#c084fc"},{n:"Coffee",k:"coffee",c:"#f472b6"},{n:"Fashion",k:"tshirt",c:"#38bdf8"},{n:"Tech",k:"laptop",c:"#34d399"},{n:"Jewelry",k:"gem",c:"#fbbf24"},{n:"Sports",k:"ball",c:"#fb923c"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340"><defs><filter id="c1b"><feGaussianBlur stdDeviation="40"/></filter></defs>
        <circle cx="200" cy="80" r="160" fill="#7c3aed" opacity="0.3" filter="url(#c1b)"><animate attributeName="cx" values="200;280;200" dur="12s" repeatCount="indefinite"/></circle>
        <circle cx="650" cy="280" r="180" fill="#ec4899" opacity="0.25" filter="url(#c1b)"><animate attributeName="cy" values="280;200;280" dur="10s" repeatCount="indefinite"/></circle>
      </svg>
      <div className="relative z-10">
        <h3 className="text-white font-bold text-lg mb-1">Choose Category</h3>
        <p className="text-white/30 text-xs mb-5">Select your store type</p>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-2xl p-4 text-center transition-all duration-300" style={{
              background: active ? `${cat.c}20` : "rgba(255,255,255,0.06)",
              backdropFilter:"blur(20px)", border: active ? `2px solid ${cat.c}60` : "2px solid rgba(255,255,255,0.08)",
              boxShadow: active ? `0 0 30px ${cat.c}20` : "none", transform: active ? "scale(1.03)" : "none"
            }}>
              <div className="w-10 h-10 mx-auto mb-2" style={{color:active?cat.c:"rgba(255,255,255,0.6)"}}>{SVG[cat.k](active?cat.c:"rgba(255,255,255,0.6)")}</div>
              <span className="text-xs font-medium" style={{color:active?cat.c:"rgba(255,255,255,0.5)"}}>{cat.n}</span>
              {active && <div className="w-5 h-0.5 mx-auto mt-2 rounded-full" style={{background:cat.c}}/>}
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:2, name:"Frosted Light Glass", style:"Glass", bg:"linear-gradient(135deg, #e0f2fe, #bae6fd, #7dd3fc)",
  cats:[{n:"Flowers",k:"flower",c:"#ec4899"},{n:"Plants",k:"tree",c:"#22c55e"},{n:"Nature",k:"mountain",c:"#0ea5e9"},{n:"Sunshine",k:"sun",c:"#f59e0b"},{n:"Wellness",k:"heart",c:"#ef4444"},{n:"Garden",k:"leaf",c:"#16a34a"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340"><defs><filter id="c2b"><feGaussianBlur stdDeviation="30"/></filter></defs>
        <circle cx="200" cy="80" r="120" fill="white" opacity="0.4" filter="url(#c2b)"/>
        <circle cx="600" cy="280" r="150" fill="#38bdf8" opacity="0.2" filter="url(#c2b)"/>
      </svg>
      <div className="relative z-10">
        <h3 className="text-sky-900 font-bold text-lg mb-5">Select Category</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-2xl p-4 text-center transition-all duration-300" style={{
              background: active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)",
              backdropFilter:"blur(20px)", border: active ? `2px solid ${cat.c}` : "2px solid rgba(255,255,255,0.5)",
              boxShadow: active ? `0 8px 25px ${cat.c}25` : "none"
            }}>
              <div className="w-10 h-10 mx-auto mb-2">{SVG[cat.k](active?cat.c:"#64748b")}</div>
              <span className="text-xs font-semibold" style={{color:active?cat.c:"#475569"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:3, name:"Dark Smoke Glass", style:"Glass", bg:"#18181b",
  cats:[{n:"Laptops",k:"laptop",c:"#818cf8"},{n:"Phones",k:"phone",c:"#38bdf8"},{n:"Cameras",k:"camera",c:"#f472b6"},{n:"Gaming",k:"gamepad",c:"#34d399"},{n:"Audio",k:"headphone",c:"#fbbf24"},{n:"Watches",k:"watch",c:"#fb923c"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340"><defs><filter id="c3s"><feGaussianBlur stdDeviation="25"/></filter></defs>
        {[...Array(4)].map((_,i) => <ellipse key={i} cx={150+i*180} cy={170+Math.sin(i)*40} rx={70+i*10} ry={40} fill="white" opacity={0.015+i*0.005} filter="url(#c3s)"/>)}
      </svg>
      <div className="relative z-10">
        <h3 className="text-zinc-100 font-bold text-lg mb-5">Device Category</h3>
        <div className="grid grid-cols-6 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-xl p-3 text-center transition-all duration-300" style={{
              background: active ? `${cat.c}12` : "rgba(255,255,255,0.02)",
              backdropFilter:"blur(10px)", border: active ? `1px solid ${cat.c}40` : "1px solid rgba(255,255,255,0.04)"
            }}>
              <div className="w-8 h-8 mx-auto mb-1">{SVG[cat.k](active?cat.c:"#555")}</div>
              <span className="text-xs" style={{color:active?cat.c:"#555"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:4, name:"Rainbow Prism Glass", style:"Glass", bg:"linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)",
  cats:[{n:"Art",k:"palette",c:"#fff"},{n:"Music",k:"music",c:"#fff"},{n:"Books",k:"book",c:"#fff"},{n:"Stars",k:"star",c:"#fff"},{n:"Gems",k:"gem",c:"#fff"},{n:"Crown",k:"crown",c:"#fff"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:320}}>
      <div className="absolute inset-0" style={{background:"repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)"}}/>
      <div className="relative z-10">
        <h3 className="text-white font-bold text-lg mb-5">Pick Your Vibe</h3>
        <div className="grid grid-cols-6 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-2xl p-4 text-center transition-all" style={{
              background: active ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)",
              backdropFilter:"blur(20px)", border: active ? "2px solid rgba(255,255,255,0.5)" : "2px solid rgba(255,255,255,0.15)",
              transform: active?"scale(1.08)":"none"
            }}>
              <div className="w-9 h-9 mx-auto mb-1">{SVG[cat.k]("white")}</div>
              <span className="text-white text-xs font-medium" style={{opacity:active?1:0.6}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:5, name:"Emerald Glass Grid", style:"Glass", bg:"linear-gradient(135deg, #064e3b, #065f46, #047857)",
  cats:[{n:"Organic",k:"leaf",c:"#6ee7b7"},{n:"Fresh",k:"flower",c:"#a7f3d0"},{n:"Green",k:"tree",c:"#34d399"},{n:"Solar",k:"sun",c:"#fbbf24"},{n:"Eco",k:"mountain",c:"#86efac"},{n:"Healthy",k:"heart",c:"#f472b6"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340"><defs><filter id="c5b"><feGaussianBlur stdDeviation="35"/></filter></defs><circle cx="250" cy="100" r="160" fill="#10b981" opacity="0.2" filter="url(#c5b)"/><circle cx="600" cy="260" r="140" fill="#34d399" opacity="0.15" filter="url(#c5b)"/></svg>
      <div className="relative z-10">
        <h3 className="text-emerald-100 font-bold text-lg mb-5">🌿 Eco Category</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-2xl p-4 text-center transition-all" style={{
              background: active ? "rgba(110,231,183,0.12)" : "rgba(255,255,255,0.05)",
              backdropFilter:"blur(15px)", border: active ? `2px solid ${cat.c}50` : "2px solid rgba(255,255,255,0.06)"
            }}>
              <div className="w-10 h-10 mx-auto mb-2">{SVG[cat.k](active?cat.c:"rgba(255,255,255,0.4)")}</div>
              <span className="text-xs font-medium" style={{color:active?cat.c:"rgba(255,255,255,0.4)"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

// ━━━━━━━━━━━━━━━━━━━━━━━━
// 🍬 CANDY STYLES (6-13)
// ━━━━━━━━━━━━━━━━━━━━━━━━

{ id:6, name:"Cotton Candy Bubbles", style:"Candy", bg:"linear-gradient(135deg, #fce4ec, #f8bbd0, #e1bee7, #b3e5fc)",
  cats:[{n:"Cakes",k:"cake",c:"#e91e63"},{n:"Candy",k:"candy",c:"#9c27b0"},{n:"Donuts",k:"donut",c:"#f44336"},{n:"Ice Cream",k:"icecream",c:"#3f51b5"},{n:"Coffee",k:"coffee",c:"#795548"},{n:"Pizza",k:"pizza",c:"#ff9800"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340"><defs><filter id="c6b"><feGaussianBlur stdDeviation="20"/></filter></defs>
        <circle cx="150" cy="80" r="100" fill="#f48fb1" opacity="0.3" filter="url(#c6b)"><animate attributeName="cx" values="150;190;150" dur="8s" repeatCount="indefinite"/></circle>
        <circle cx="650" cy="260" r="120" fill="#ce93d8" opacity="0.25" filter="url(#c6b)"/>
        {[...Array(15)].map((_,i) => <g key={i} transform={`translate(${Math.random()*800},${Math.random()*340})`}><line x1="-3" y1="0" x2="3" y2="0" stroke="white" strokeWidth="1.5" opacity="0.4"/><line x1="0" y1="-3" x2="0" y2="3" stroke="white" strokeWidth="1.5" opacity="0.4"><animate attributeName="opacity" values="0.2;0.6;0.2" dur={`${1.5+Math.random()*2}s`} repeatCount="indefinite"/></line></g>)}
      </svg>
      <div className="relative z-10">
        <h3 className="text-pink-800 font-black text-lg mb-5">🍭 Sweet Categories</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-2xl p-4 text-center transition-all" style={{
              background: active ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)",
              backdropFilter:"blur(15px)", border: active ? `3px solid ${cat.c}` : "3px solid rgba(255,255,255,0.4)",
              boxShadow: active ? `0 8px 25px ${cat.c}30` : "none", transform: active?"scale(1.05) rotate(-1deg)":"none"
            }}>
              <div className="w-12 h-12 mx-auto mb-2">{SVG[cat.k](active?cat.c:"#9e9e9e")}</div>
              <span className="text-xs font-bold" style={{color:active?cat.c:"#777"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:7, name:"Neon Candy Night", style:"Candy", bg:"#0f0f1a",
  cats:[{n:"Sweets",k:"candy",c:"#ff6b9d"},{n:"Pastry",k:"donut",c:"#00ffff"},{n:"Frozen",k:"icecream",c:"#ffd93d"},{n:"Baked",k:"cake",c:"#ff6b9d"},{n:"Drinks",k:"coffee",c:"#00ffff"},{n:"Savory",k:"burger",c:"#ffd93d"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340"><defs><filter id="c7n"><feGaussianBlur stdDeviation="4"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <rect x="60" y="40" width="160" height="80" rx="12" fill="none" stroke="#ff6b9d" strokeWidth="1.5" filter="url(#c7n)" opacity="0.2"><animate attributeName="opacity" values="0.15;0.35;0.15" dur="3s" repeatCount="indefinite"/></rect>
        <circle cx="650" cy="260" r="50" fill="none" stroke="#00ffff" strokeWidth="1.5" filter="url(#c7n)" opacity="0.15"/>
      </svg>
      <div className="relative z-10">
        <h3 className="font-bold text-lg mb-5" style={{color:"#ff6b9d", textShadow:"0 0 15px #ff6b9d"}}>Candy Store</h3>
        <div className="grid grid-cols-6 gap-2">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-xl p-3 text-center transition-all" style={{
              background: active ? `${cat.c}15` : "rgba(255,255,255,0.02)",
              border: active ? `1.5px solid ${cat.c}50` : "1.5px solid rgba(255,255,255,0.04)",
              boxShadow: active ? `0 0 20px ${cat.c}20` : "none"
            }}>
              <div className="w-8 h-8 mx-auto mb-1">{SVG[cat.k](active?cat.c:"#444")}</div>
              <span className="text-xs" style={{color:active?cat.c:"#444", textShadow: active?`0 0 8px ${cat.c}`:"none"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:8, name:"Gummy Rainbow Chips", style:"Candy", bg:"linear-gradient(180deg, #fefefe, #f0f9ff)",
  cats:[{n:"Red",k:"heart",c:"#ef4444"},{n:"Orange",k:"sun",c:"#f97316"},{n:"Yellow",k:"star",c:"#eab308"},{n:"Green",k:"leaf",c:"#22c55e"},{n:"Blue",k:"gem",c:"#3b82f6"},{n:"Purple",k:"crown",c:"#8b5cf6"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:300}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 300">
        {[...Array(30)].map((_,i) => <circle key={i} cx={Math.random()*800} cy={Math.random()*300} r={2+Math.random()*4} fill={["#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6"][i%6]} opacity="0.08"/>)}
      </svg>
      <div className="relative z-10">
        <h3 className="font-black text-lg mb-5" style={{background:"linear-gradient(90deg,#ef4444,#f97316,#eab308,#22c55e,#3b82f6,#8b5cf6)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Rainbow Picks</h3>
        <div className="flex gap-3 justify-center">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-2xl p-4 text-center transition-all w-24" style={{
              background: active ? `${cat.c}15` : "white",
              border: active ? `3px solid ${cat.c}` : "3px solid #eee",
              boxShadow: active ? `0 6px 20px ${cat.c}25` : "0 2px 8px rgba(0,0,0,0.04)", transform: active?"scale(1.08) translateY(-4px)":"none"
            }}>
              <div className="w-10 h-10 mx-auto mb-1">{SVG[cat.k](active?cat.c:"#bbb")}</div>
              <span className="text-xs font-bold" style={{color:active?cat.c:"#999"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:9, name:"Chocolate Box", style:"Candy", bg:"linear-gradient(135deg, #3e2723, #4e342e, #5d4037)",
  cats:[{n:"Dark",k:"gem",c:"#ffd700"},{n:"Milk",k:"heart",c:"#d4a76a"},{n:"White",k:"star",c:"#f5f0e6"},{n:"Truffle",k:"crown",c:"#c49a6c"},{n:"Praline",k:"flower",c:"#deb887"},{n:"Caramel",k:"sun",c:"#cd853f"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340">{[...Array(20)].map((_,i) => <rect key={i} x={Math.random()*800} y={50+Math.random()*240} width={2+Math.random()*3} height={8+Math.random()*6} rx="1" fill="#ffd700" opacity={0.15+Math.random()*0.15} transform={`rotate(${Math.random()*360})`}/>)}</svg>
      <div className="relative z-10">
        <h3 className="text-amber-100 font-bold text-lg mb-5">🍫 Chocolate Selection</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-xl p-4 text-center transition-all" style={{
              background: active ? "rgba(255,215,0,0.1)" : "rgba(255,255,255,0.03)",
              border: active ? `2px solid ${cat.c}60` : "2px solid rgba(255,255,255,0.06)"
            }}>
              <div className="w-10 h-10 mx-auto mb-2">{SVG[cat.k](active?cat.c:"rgba(255,255,255,0.3)")}</div>
              <span className="text-xs font-medium" style={{color:active?cat.c:"rgba(255,255,255,0.3)"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

// ━━━━━━━━━━━━━━━━━━━━━━━━
// 🌌 SPACE & AURORA (10-16)
// ━━━━━━━━━━━━━━━━━━━━━━━━

{ id:10, name:"Nebula Category Orbs", style:"Space", bg:"radial-gradient(ellipse at 30% 50%, #2d1b69 0%, #0a0a0a 70%)",
  cats:[{n:"Explore",k:"rocket",c:"#a78bfa"},{n:"Navigate",k:"compass",c:"#38bdf8"},{n:"Energy",k:"bolt",c:"#fbbf24"},{n:"Trophy",k:"trophy",c:"#34d399"},{n:"Travel",k:"plane",c:"#f472b6"},{n:"Stars",k:"star",c:"#c084fc"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:380}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 380"><defs><filter id="c10b"><feGaussianBlur stdDeviation="18"/></filter><radialGradient id="c10n1" cx="30%" cy="50%"><stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4"/><stop offset="100%" stopColor="transparent"/></radialGradient><radialGradient id="c10n2" cx="70%" cy="40%"><stop offset="0%" stopColor="#ec4899" stopOpacity="0.3"/><stop offset="100%" stopColor="transparent"/></radialGradient></defs>
        <ellipse cx="250" cy="190" rx="220" ry="120" fill="url(#c10n1)" filter="url(#c10b)"><animate attributeName="rx" values="220;250;220" dur="10s" repeatCount="indefinite"/></ellipse>
        <ellipse cx="580" cy="150" rx="180" ry="100" fill="url(#c10n2)" filter="url(#c10b)"/>
        {[...Array(40)].map((_,i) => <circle key={i} cx={Math.random()*800} cy={Math.random()*380} r={Math.random()*1.5+0.3} fill="white" opacity={Math.random()*0.5}/>)}
      </svg>
      <div className="relative z-10">
        <h3 className="text-purple-200 font-bold text-lg mb-5" style={{textShadow:"0 0 20px rgba(139,92,246,0.4)"}}>🌌 Space Categories</h3>
        <div className="grid grid-cols-3 gap-4">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-2xl p-5 text-center transition-all group" style={{
              background: active ? `${cat.c}12` : "rgba(255,255,255,0.03)",
              border: active ? `2px solid ${cat.c}40` : "2px solid rgba(255,255,255,0.05)",
              boxShadow: active ? `0 0 30px ${cat.c}15, inset 0 0 30px ${cat.c}08` : "none"
            }}>
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl p-1.5" style={{background: active ? `${cat.c}15` : "transparent"}}>{SVG[cat.k](active?cat.c:"rgba(255,255,255,0.3)")}</div>
              <span className="text-sm font-medium" style={{color:active?cat.c:"rgba(255,255,255,0.3)"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:11, name:"Aurora Waves", style:"Aurora", bg:"linear-gradient(180deg, #020617, #0c1222, #172033)",
  cats:[{n:"Home",k:"house",c:"#22d3ee"},{n:"Decor",k:"lamp",c:"#a78bfa"},{n:"Comfort",k:"sofa",c:"#34d399"},{n:"Garden",k:"flower",c:"#f472b6"},{n:"Light",k:"sun",c:"#fbbf24"},{n:"Nature",k:"tree",c:"#4ade80"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:380}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 380" preserveAspectRatio="none"><defs><filter id="c11b"><feGaussianBlur stdDeviation="14"/></filter></defs>
        {["#22d3ee","#a78bfa","#34d399","#f472b6"].map((c,i) => <path key={i} d={`M0,${200+i*25} Q200,${160+i*20} 400,${210+i*15} T800,${180+i*22}`} fill="none" stroke={c} strokeWidth={25-i*4} filter="url(#c11b)" opacity={0.15-i*0.02}><animate attributeName="d" values={`M0,${200+i*25} Q200,${160+i*20} 400,${210+i*15} T800,${180+i*22};M0,${180+i*25} Q200,${190+i*20} 400,${170+i*15} T800,${200+i*22};M0,${200+i*25} Q200,${160+i*20} 400,${210+i*15} T800,${180+i*22}`} dur={`${8+i*2}s`} repeatCount="indefinite"/></path>)}
        {[...Array(20)].map((_,i) => <circle key={i} cx={Math.random()*800} cy={Math.random()*200} r={Math.random()*1.5} fill="white" opacity={Math.random()*0.4}/>)}
      </svg>
      <div className="relative z-10">
        <h3 className="text-cyan-200 font-bold text-lg mb-5">Home & Living</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-2xl p-4 text-center transition-all" style={{
              background: active ? `${cat.c}10` : "rgba(255,255,255,0.02)",
              border: active ? `2px solid ${cat.c}35` : "2px solid rgba(255,255,255,0.04)",
            }}>
              <div className="w-10 h-10 mx-auto mb-2">{SVG[cat.k](active?cat.c:"rgba(255,255,255,0.25)")}</div>
              <span className="text-xs font-medium" style={{color:active?cat.c:"rgba(255,255,255,0.25)"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

// ━━━━━━━━━━━━━━━━━━━━━━━━
// 🎮 GAMING & CYBER (12-17)
// ━━━━━━━━━━━━━━━━━━━━━━━━

{ id:12, name:"Pixel Arcade Selector", style:"Gaming", bg:"#1a1c2c",
  cats:[{n:"Action",k:"bolt",c:"#f7d87c"},{n:"RPG",k:"crown",c:"#eb6b6f"},{n:"Racing",k:"rocket",c:"#38b764"},{n:"Puzzle",k:"gem",c:"#41a6f6"},{n:"Sports",k:"trophy",c:"#b13e53"},{n:"Music",k:"music",c:"#a7f070"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340">{[...Array(40)].map((_,i) => <rect key={i} x={Math.floor(Math.random()*40)*20} y={Math.floor(Math.random()*17)*20} width="18" height="18" fill={["#f7d87c","#eb6b6f","#38b764","#41a6f6"][i%4]} opacity={0.04+Math.random()*0.08}/>)}</svg>
      <div className="relative z-10">
        <h3 className="text-yellow-300 font-bold text-lg mb-5" style={{fontFamily:"monospace", letterSpacing:"3px", textShadow:"2px 2px 0 #29366f"}}>SELECT GENRE</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-lg p-4 text-center transition-all" style={{
              background: active ? `${cat.c}20` : "rgba(0,0,0,0.3)",
              border: active ? `2px solid ${cat.c}` : "2px solid rgba(255,255,255,0.06)",
              boxShadow: active ? `0 0 15px ${cat.c}30` : "none"
            }}>
              <div className="w-10 h-10 mx-auto mb-2">{SVG[cat.k](active?cat.c:"#555")}</div>
              <span className="text-xs font-bold font-mono" style={{color:active?cat.c:"#555"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:13, name:"Cyberpunk Neon Grid", style:"Cyberpunk", bg:"linear-gradient(135deg, #0f0f23, #1a0a2e)",
  cats:[{n:"Hack",k:"laptop",c:"#00ffff"},{n:"Mod",k:"gamepad",c:"#ff00ff"},{n:"Sync",k:"headphone",c:"#ffff00"},{n:"Drive",k:"rocket",c:"#00ffff"},{n:"Code",k:"bolt",c:"#ff00ff"},{n:"Grid",k:"gem",c:"#ffff00"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340"><defs><filter id="c13n"><feGaussianBlur stdDeviation="3"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        {[...Array(12)].map((_,i) => <line key={i} x1={i*70} y1="0" x2={i*70} y2="340" stroke="#00ffff" strokeWidth="0.4" opacity="0.06"/>)}
        {[...Array(6)].map((_,i) => <line key={i} x1="0" y1={i*58} x2="800" y2={i*58} stroke="#ff00ff" strokeWidth="0.3" opacity="0.05"/>)}
      </svg>
      <div className="relative z-10">
        <h3 className="font-black text-lg mb-5" style={{color:"#00ffff", textShadow:"0 0 15px #00ffff, 3px 0 #ff00ff"}}>CYBERZONE</h3>
        <div className="grid grid-cols-6 gap-2">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-lg p-3 text-center transition-all" style={{
              background: active ? `${cat.c}08` : "rgba(0,0,0,0.3)",
              border: active ? `1px solid ${cat.c}` : "1px solid rgba(255,255,255,0.04)",
              boxShadow: active ? `0 0 15px ${cat.c}30, inset 0 0 15px ${cat.c}10` : "none"
            }}>
              <div className="w-8 h-8 mx-auto mb-1">{SVG[cat.k](active?cat.c:"#333")}</div>
              <span className="text-xs font-mono" style={{color:active?cat.c:"#333", textShadow: active?`0 0 8px ${cat.c}`:"none"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

// ━━━━━━━━━━━━━━━━━━━━━━━━
// 💎 LUXURY & MINIMAL (14-20)
// ━━━━━━━━━━━━━━━━━━━━━━━━

{ id:14, name:"Black Gold Luxury", style:"Luxury", bg:"#0a0a0a",
  cats:[{n:"Watches",k:"watch",c:"#d4af37"},{n:"Bags",k:"bag",c:"#c9a96e"},{n:"Glasses",k:"glasses",c:"#b8860b"},{n:"Shoes",k:"shoe",c:"#daa520"},{n:"Jewelry",k:"gem",c:"#ffd700"},{n:"Crowns",k:"crown",c:"#f5c542"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340"><defs><linearGradient id="c14g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#bf953f"/><stop offset="50%" stopColor="#fcf6ba"/><stop offset="100%" stopColor="#aa771c"/></linearGradient></defs>
        <rect x="40" y="30" width="720" height="280" fill="none" stroke="url(#c14g)" strokeWidth="0.5" opacity="0.2" rx="8"/>
        {[[50,40],[750,40],[50,300],[750,300]].map(([x,y],i) => <circle key={i} cx={x} cy={y} r="3" fill="url(#c14g)" opacity="0.15"/>)}
      </svg>
      <div className="relative z-10">
        <h3 className="font-bold text-lg mb-5" style={{background:"linear-gradient(135deg, #bf953f, #fcf6ba, #b38728)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent", letterSpacing:"4px"}}>LUXURY</h3>
        <div className="grid grid-cols-6 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-xl p-3 text-center transition-all" style={{
              background: active ? "rgba(212,175,55,0.06)" : "transparent",
              border: active ? `1px solid ${cat.c}60` : "1px solid rgba(255,255,255,0.04)"
            }}>
              <div className="w-9 h-9 mx-auto mb-1">{SVG[cat.k](active?cat.c:"#333")}</div>
              <span className="text-xs" style={{color:active?cat.c:"#333", letterSpacing:"1px"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:15, name:"Zen Minimal", style:"Minimal", bg:"#f5f0e8",
  cats:[{n:"Mind",k:"yoga",c:"#78716c"},{n:"Body",k:"heart",c:"#a8a29e"},{n:"Soul",k:"flower",c:"#d6d3d1"},{n:"Earth",k:"mountain",c:"#57534e"},{n:"Water",k:"leaf",c:"#78716c"},{n:"Light",k:"sun",c:"#a8a29e"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-10" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340">{[...Array(10)].map((_,i) => <line key={i} x1="0" y1={120+i*18} x2="800" y2={120+i*18} stroke="#c2b280" strokeWidth="0.6" opacity="0.1"/>)}</svg>
      <div className="relative z-10">
        <h3 className="text-stone-600 font-light text-2xl mb-6" style={{letterSpacing:"8px"}}>禅</h3>
        <div className="grid grid-cols-6 gap-4">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="text-center transition-all p-3" style={{
              borderBottom: active ? `2px solid ${cat.c}` : "2px solid transparent"
            }}>
              <div className="w-10 h-10 mx-auto mb-2">{SVG[cat.k](active?cat.c:"#d6d3d1")}</div>
              <span className="text-xs" style={{color:active?cat.c:"#d6d3d1", letterSpacing:"2px"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

// ━━━━━━━━━━━━━━━━━━━━━━━━
// 🌿 NATURE & MODERN (16-20)  
// ━━━━━━━━━━━━━━━━━━━━━━━━

{ id:16, name:"Forest Deep", style:"Nature", bg:"linear-gradient(180deg, #1b4332, #2d6a4f, #40916c)",
  cats:[{n:"Trees",k:"tree",c:"#b7e4c7"},{n:"Blooms",k:"flower",c:"#f9a8d4"},{n:"Peaks",k:"mountain",c:"#e2e8f0"},{n:"Fruits",k:"donut",c:"#fda4af"},{n:"Herbs",k:"leaf",c:"#86efac"},{n:"Spice",k:"bolt",c:"#fbbf24"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340">{[...Array(8)].map((_,i) => <ellipse key={i} cx={50+i*100} cy={30+Math.random()*30} rx={30+Math.random()*25} ry={20+Math.random()*15} fill={i%2?"#2d6a4f":"#40916c"} opacity={0.2+Math.random()*0.15}/>)}
        {[...Array(12)].map((_,i) => <circle key={i} cx={Math.random()*800} cy={Math.random()*200} r={2+Math.random()*3} fill="#b7e4c7" opacity={0.1+Math.random()*0.15}><animate attributeName="opacity" values="0.08;0.25;0.08" dur={`${2+Math.random()*4}s`} repeatCount="indefinite"/></circle>)}
      </svg>
      <div className="relative z-10">
        <h3 className="text-green-100 font-bold text-lg mb-5">🌲 Forest Market</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-2xl p-4 text-center transition-all" style={{
              background: active ? "rgba(183,228,199,0.1)" : "rgba(255,255,255,0.03)",
              border: active ? `2px solid ${cat.c}40` : "2px solid rgba(255,255,255,0.05)"
            }}>
              <div className="w-10 h-10 mx-auto mb-2">{SVG[cat.k](active?cat.c:"rgba(255,255,255,0.25)")}</div>
              <span className="text-xs font-medium" style={{color:active?cat.c:"rgba(255,255,255,0.25)"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:17, name:"Sunset Warm", style:"Modern", bg:"linear-gradient(135deg, #fef3c7, #fde68a, #fbbf24, #f59e0b)",
  cats:[{n:"Fashion",k:"tshirt",c:"#92400e"},{n:"Shoes",k:"shoe",c:"#78350f"},{n:"Bags",k:"bag",c:"#451a03"},{n:"Watch",k:"watch",c:"#92400e"},{n:"Glasses",k:"glasses",c:"#78350f"},{n:"Style",k:"crown",c:"#451a03"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340"><g transform="translate(680,60)">{[...Array(10)].map((_,i) => <line key={i} x1="0" y1="0" x2={Math.cos(i*36*Math.PI/180)*200} y2={Math.sin(i*36*Math.PI/180)*200} stroke="#f59e0b" strokeWidth="1.5" opacity="0.08"/>)}<circle r="40" fill="#fbbf24" opacity="0.2"/></g></svg>
      <div className="relative z-10">
        <h3 className="text-amber-900 font-black text-lg mb-5">☀️ Summer Style</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-2xl p-4 text-center transition-all" style={{
              background: active ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)",
              border: active ? `2px solid ${cat.c}` : "2px solid rgba(255,255,255,0.3)",
              boxShadow: active ? "0 6px 20px rgba(146,64,14,0.15)" : "none"
            }}>
              <div className="w-10 h-10 mx-auto mb-2">{SVG[cat.k](active?cat.c:"#b45309")}</div>
              <span className="text-xs font-bold" style={{color:active?cat.c:"#b45309"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:18, name:"Ocean Breeze", style:"Nature", bg:"linear-gradient(180deg, #0077b6, #023e8a, #03045e)",
  cats:[{n:"Surf",k:"ball",c:"#90e0ef"},{n:"Dive",k:"compass",c:"#48cae4"},{n:"Sail",k:"plane",c:"#caf0f8"},{n:"Fish",k:"leaf",c:"#00b4d8"},{n:"Shell",k:"gem",c:"#ade8f4"},{n:"Wave",k:"mountain",c:"#90e0ef"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute bottom-0 w-full" viewBox="0 0 800 150" preserveAspectRatio="none" style={{height:"40%"}}>
        <path d="M0,60 C150,30 300,90 450,60 C600,30 750,80 800,60 L800,150 L0,150Z" fill="#48cae4" opacity="0.2"><animate attributeName="d" values="M0,60 C150,30 300,90 450,60 C600,30 750,80 800,60 L800,150 L0,150Z;M0,80 C150,90 300,30 450,80 C600,90 750,40 800,80 L800,150 L0,150Z;M0,60 C150,30 300,90 450,60 C600,30 750,80 800,60 L800,150 L0,150Z" dur="6s" repeatCount="indefinite"/></path>
      </svg>
      <div className="relative z-10">
        <h3 className="text-cyan-100 font-bold text-lg mb-5">🌊 Ocean Zone</h3>
        <div className="grid grid-cols-6 gap-2">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-xl p-3 text-center transition-all" style={{
              background: active ? "rgba(144,224,239,0.15)" : "rgba(255,255,255,0.04)",
              border: active ? `2px solid ${cat.c}50` : "2px solid rgba(255,255,255,0.06)"
            }}>
              <div className="w-8 h-8 mx-auto mb-1">{SVG[cat.k](active?cat.c:"rgba(255,255,255,0.25)")}</div>
              <span className="text-xs" style={{color:active?cat.c:"rgba(255,255,255,0.25)"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:19, name:"Fire & Ice", style:"Modern", bg:"linear-gradient(135deg, #1e3a5f 0%, #0a1628 50%, #3d0c02 100%)",
  cats:[{n:"Hot",k:"bolt",c:"#ef4444"},{n:"Cold",k:"gem",c:"#38bdf8"},{n:"Fire",k:"rocket",c:"#f97316"},{n:"Frost",k:"star",c:"#67e8f9"},{n:"Lava",k:"trophy",c:"#dc2626"},{n:"Snow",k:"flower",c:"#bae6fd"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340"><defs><filter id="c19b"><feGaussianBlur stdDeviation="30"/></filter></defs>
        <circle cx="200" cy="170" r="150" fill="#38bdf8" opacity="0.08" filter="url(#c19b)"/>
        <circle cx="600" cy="170" r="150" fill="#ef4444" opacity="0.08" filter="url(#c19b)"/>
      </svg>
      <div className="relative z-10">
        <h3 className="text-white font-bold text-lg mb-5">🔥 Fire & Ice ❄️</h3>
        <div className="grid grid-cols-6 gap-2">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-xl p-3 text-center transition-all" style={{
              background: active ? `${cat.c}12` : "rgba(255,255,255,0.02)",
              border: active ? `2px solid ${cat.c}50` : "2px solid rgba(255,255,255,0.04)",
              boxShadow: active ? `0 0 20px ${cat.c}20` : "none"
            }}>
              <div className="w-8 h-8 mx-auto mb-1">{SVG[cat.k](active?cat.c:"#444")}</div>
              <span className="text-xs" style={{color:active?cat.c:"#444"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:20, name:"Brutalist Raw", style:"Modern", bg:"#e5e5e5",
  cats:[{n:"Build",k:"house",c:"#1a1a1a"},{n:"Design",k:"palette",c:"#ef4444"},{n:"Code",k:"laptop",c:"#1a1a1a"},{n:"Sound",k:"music",c:"#ef4444"},{n:"Read",k:"book",c:"#1a1a1a"},{n:"Move",k:"rocket",c:"#ef4444"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:300}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 300"><line x1="0" y1="230" x2="800" y2="230" stroke="#1a1a1a" strokeWidth="3"/><rect x="280" y="40" width="3" height="200" fill="#ef4444"/></svg>
      <div className="relative z-10">
        <h3 className="text-black font-black text-2xl mb-5" style={{letterSpacing:"-2px"}}>CATEGORIES.</h3>
        <div className="grid grid-cols-6 gap-2">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="p-3 text-center transition-all" style={{
              borderBottom: active ? `3px solid ${cat.c}` : "3px solid transparent",
              background: active ? "rgba(0,0,0,0.04)" : "transparent"
            }}>
              <div className="w-8 h-8 mx-auto mb-1">{SVG[cat.k](active?cat.c:"#bbb")}</div>
              <span className="text-xs font-mono font-bold uppercase" style={{color:active?cat.c:"#bbb"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

// ━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 ABSTRACT & ART (21-27)
// ━━━━━━━━━━━━━━━━━━━━━━━━

{ id:21, name:"Gradient Mesh Orbs", style:"Abstract", bg:"linear-gradient(135deg, #faf5ff, #fdf2f8, #fff1f2)",
  cats:[{n:"Paint",k:"palette",c:"#8b5cf6"},{n:"Sculpt",k:"gem",c:"#ec4899"},{n:"Music",k:"music",c:"#f43f5e"},{n:"Write",k:"book",c:"#6366f1"},{n:"Photo",k:"camera",c:"#14b8a6"},{n:"Film",k:"star",c:"#f59e0b"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340"><defs><filter id="c21b"><feGaussianBlur stdDeviation="20"/></filter></defs>
        <ellipse cx="200" cy="100" rx="140" ry="100" fill="#c084fc" opacity="0.2" filter="url(#c21b)"><animate attributeName="rx" values="140;170;140" dur="8s" repeatCount="indefinite"/></ellipse>
        <ellipse cx="600" cy="220" rx="120" ry="110" fill="#fb7185" opacity="0.15" filter="url(#c21b)"><animate attributeName="ry" values="110;130;110" dur="10s" repeatCount="indefinite"/></ellipse>
        <ellipse cx="400" cy="170" rx="100" ry="85" fill="#60a5fa" opacity="0.12" filter="url(#c21b)"/>
      </svg>
      <div className="relative z-10">
        <h3 className="text-purple-800 font-black text-lg mb-5">🎨 Creative Studio</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-2xl p-4 text-center transition-all" style={{
              background: active ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.4)",
              backdropFilter:"blur(15px)", border: active ? `2px solid ${cat.c}` : "2px solid rgba(255,255,255,0.5)",
              boxShadow: active ? `0 8px 25px ${cat.c}20` : "0 2px 10px rgba(0,0,0,0.03)",
              transform: active ? "scale(1.04)" : "none"
            }}>
              <div className="w-10 h-10 mx-auto mb-2">{SVG[cat.k](active?cat.c:"#aaa")}</div>
              <span className="text-xs font-bold" style={{color:active?cat.c:"#888"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:22, name:"Geometric Prism", style:"Abstract", bg:"linear-gradient(135deg, #0f172a, #1e293b)",
  cats:[{n:"Triangle",k:"mountain",c:"#38bdf8"},{n:"Circle",k:"ball",c:"#a78bfa"},{n:"Square",k:"laptop",c:"#fb7185"},{n:"Diamond",k:"gem",c:"#34d399"},{n:"Star",k:"star",c:"#fbbf24"},{n:"Hex",k:"bolt",c:"#f472b6"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340"><defs><linearGradient id="c22p" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5"/><stop offset="50%" stopColor="#a78bfa" stopOpacity="0.5"/><stop offset="100%" stopColor="#fb7185" stopOpacity="0.5"/></linearGradient></defs>
        <polygon points="400,30 530,160 470,300 330,300 270,160" fill="none" stroke="url(#c22p)" strokeWidth="1.5" opacity="0.3"><animateTransform attributeName="transform" type="rotate" from="0 400 170" to="360 400 170" dur="30s" repeatCount="indefinite"/></polygon>
        {[0,72,144,216,288].map((a,i) => {const r=a*Math.PI/180; return <line key={i} x1="400" y1="170" x2={400+Math.cos(r)*300} y2={170+Math.sin(r)*300} stroke={["#38bdf8","#a78bfa","#fb7185","#34d399","#fbbf24"][i]} strokeWidth="0.8" opacity="0.08"/>;})}
      </svg>
      <div className="relative z-10">
        <h3 className="text-white font-bold text-lg mb-5">Geometric Forms</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-xl p-4 text-center transition-all" style={{
              background: active ? `${cat.c}10` : "rgba(255,255,255,0.02)",
              border: active ? `2px solid ${cat.c}40` : "2px solid rgba(255,255,255,0.04)",
            }}>
              <div className="w-10 h-10 mx-auto mb-2">{SVG[cat.k](active?cat.c:"rgba(255,255,255,0.2)")}</div>
              <span className="text-xs font-medium" style={{color:active?cat.c:"rgba(255,255,255,0.2)"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:23, name:"Holographic Iridescent", style:"Abstract", bg:"linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #43e97b 100%)",
  cats:[{n:"Trend",k:"bolt",c:"#fff"},{n:"New",k:"star",c:"#fff"},{n:"Hot",k:"rocket",c:"#fff"},{n:"Top",k:"trophy",c:"#fff"},{n:"VIP",k:"crown",c:"#fff"},{n:"Love",k:"heart",c:"#fff"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:300}}>
      <div className="absolute inset-0" style={{background:"repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 6px)"}}/>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 300">{[...Array(10)].map((_,i) => <line key={i} x1={i*88} y1="0" x2={i*88+60} y2="300" stroke="white" strokeWidth="0.5" opacity="0.05"/>)}</svg>
      <div className="relative z-10">
        <h3 className="text-white font-black text-lg mb-5" style={{textShadow:"0 2px 10px rgba(0,0,0,0.2)"}}>✨ Trending Now</h3>
        <div className="flex gap-3 justify-center">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-full p-4 w-20 h-20 flex flex-col items-center justify-center transition-all" style={{
              background: active ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
              backdropFilter:"blur(15px)", border: active ? "2px solid rgba(255,255,255,0.6)" : "2px solid rgba(255,255,255,0.15)",
              transform: active ? "scale(1.15)" : "none", boxShadow: active ? "0 8px 25px rgba(0,0,0,0.15)" : "none"
            }}>
              <div className="w-7 h-7">{SVG[cat.k]("white")}</div>
              <span className="text-white text-xs mt-1 font-bold" style={{opacity:active?1:0.6}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:24, name:"Noise Texture Cards", style:"Abstract", bg:"linear-gradient(135deg, #0ea5e9, #8b5cf6, #ec4899)",
  cats:[{n:"Design",k:"palette",c:"#fff"},{n:"Dev",k:"laptop",c:"#fff"},{n:"Media",k:"camera",c:"#fff"},{n:"Audio",k:"headphone",c:"#fff"},{n:"Social",k:"heart",c:"#fff"},{n:"Growth",k:"rocket",c:"#fff"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:320}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320"><defs><filter id="c24n"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3"/><feColorMatrix type="saturate" values="0"/></filter></defs><rect width="800" height="320" filter="url(#c24n)" opacity="0.06"/></svg>
      <div className="relative z-10">
        <h3 className="text-white font-bold text-lg mb-5">Agency Picks</h3>
        <div className="grid grid-cols-6 gap-2">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-xl p-3 text-center transition-all" style={{
              background: active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)",
              border: active ? "2px solid rgba(255,255,255,0.4)" : "2px solid rgba(255,255,255,0.08)",
              transform: active ? "translateY(-3px)" : "none"
            }}>
              <div className="w-8 h-8 mx-auto mb-1">{SVG[cat.k]("white")}</div>
              <span className="text-white text-xs font-medium" style={{opacity:active?1:0.5}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

// ━━━━━━━━━━━━━━━━━━━━━━━━
// 🏪 E-COMMERCE (25-30)
// ━━━━━━━━━━━━━━━━━━━━━━━━

{ id:25, name:"Clean Store White", style:"Ecommerce", bg:"#ffffff",
  cats:[{n:"Shirts",k:"tshirt",c:"#111"},{n:"Shoes",k:"shoe",c:"#111"},{n:"Bags",k:"bag",c:"#111"},{n:"Watches",k:"watch",c:"#111"},{n:"Hats",k:"crown",c:"#111"},{n:"Sports",k:"ball",c:"#111"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:300, border:"1px solid #eee"}}>
      <div className="relative z-10">
        <h3 className="text-gray-900 font-black text-lg mb-6">Shop by Category</h3>
        <div className="grid grid-cols-6 gap-4">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="text-center transition-all group" style={{transform:active?"translateY(-6px)":"none"}}>
              <div className="w-16 h-16 mx-auto mb-2 rounded-2xl flex items-center justify-center transition-all" style={{
                background: active ? "#111" : "#f5f5f5",
                boxShadow: active ? "0 10px 25px rgba(0,0,0,0.15)" : "none"
              }}>
                <div className="w-8 h-8">{SVG[cat.k](active?"#fff":"#888")}</div>
              </div>
              <span className="text-xs font-semibold" style={{color:active?"#111":"#888"}}>{cat.n}</span>
              {active && <div className="w-4 h-0.5 mx-auto mt-1 rounded-full bg-black"/>}
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:26, name:"Pink Fashion Store", style:"Ecommerce", bg:"linear-gradient(135deg, #fdf2f8, #fce7f3)",
  cats:[{n:"Dress",k:"tshirt",c:"#be185d"},{n:"Heels",k:"shoe",c:"#db2777"},{n:"Clutch",k:"bag",c:"#ec4899"},{n:"Ring",k:"gem",c:"#f472b6"},{n:"Scarf",k:"flower",c:"#f9a8d4"},{n:"Shade",k:"glasses",c:"#be185d"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:320}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">{[...Array(6)].map((_,i) => <circle key={i} cx={100+Math.random()*600} cy={40+Math.random()*240} r={30+Math.random()*40} fill="none" stroke="#f9a8d4" strokeWidth="1" opacity="0.15"/>)}</svg>
      <div className="relative z-10">
        <h3 className="text-pink-800 font-black text-lg mb-5">👗 Fashion Boutique</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-2xl p-4 text-center transition-all" style={{
              background: active ? "white" : "rgba(255,255,255,0.5)",
              border: active ? `2px solid ${cat.c}` : "2px solid transparent",
              boxShadow: active ? `0 8px 20px ${cat.c}20` : "0 2px 8px rgba(0,0,0,0.03)",
              transform: active ? "scale(1.04)" : "none"
            }}>
              <div className="w-10 h-10 mx-auto mb-2">{SVG[cat.k](active?cat.c:"#ccc")}</div>
              <span className="text-xs font-bold" style={{color:active?cat.c:"#999"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:27, name:"Tech Store Dark", style:"Ecommerce", bg:"linear-gradient(180deg, #111827, #1f2937)",
  cats:[{n:"Laptop",k:"laptop",c:"#60a5fa"},{n:"Mobile",k:"phone",c:"#34d399"},{n:"Camera",k:"camera",c:"#fbbf24"},{n:"Console",k:"gamepad",c:"#f472b6"},{n:"Audio",k:"headphone",c:"#a78bfa"},{n:"Smart",k:"watch",c:"#fb923c"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340"><defs><pattern id="c27g" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="none" stroke="white" strokeWidth="0.3" opacity="0.03"/></pattern></defs><rect width="800" height="340" fill="url(#c27g)"/></svg>
      <div className="relative z-10">
        <h3 className="text-white font-bold text-lg mb-5">⚡ Tech Categories</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-xl p-5 text-left transition-all flex items-center gap-4" style={{
              background: active ? `${cat.c}10` : "rgba(255,255,255,0.02)",
              border: active ? `1px solid ${cat.c}40` : "1px solid rgba(255,255,255,0.05)",
            }}>
              <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center" style={{background:active?`${cat.c}15`:"rgba(255,255,255,0.04)"}}><div className="w-6 h-6">{SVG[cat.k](active?cat.c:"#555")}</div></div>
              <div><span className="text-sm font-semibold block" style={{color:active?cat.c:"#888"}}>{cat.n}</span><span className="text-xs" style={{color:active?`${cat.c}80`:"#444"}}>12 items</span></div>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:28, name:"Food Market Warm", style:"Ecommerce", bg:"linear-gradient(135deg, #fffbeb, #fef3c7, #fde68a)",
  cats:[{n:"Bakery",k:"cake",c:"#92400e"},{n:"Drinks",k:"coffee",c:"#78350f"},{n:"Pizza",k:"pizza",c:"#dc2626"},{n:"Burgers",k:"burger",c:"#b45309"},{n:"Sweets",k:"candy",c:"#be185d"},{n:"Frozen",k:"icecream",c:"#7c3aed"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340"><defs><pattern id="c28d" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="1" fill="#d97706" opacity="0.1"/></pattern></defs><rect width="800" height="340" fill="url(#c28d)"/></svg>
      <div className="relative z-10">
        <h3 className="text-amber-900 font-black text-lg mb-5">🍕 Food Market</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-2xl p-5 text-center transition-all" style={{
              background: active ? "white" : "rgba(255,255,255,0.5)",
              border: active ? `3px solid ${cat.c}` : "3px solid rgba(255,255,255,0.3)",
              boxShadow: active ? `0 8px 20px ${cat.c}18` : "none", transform: active ? "scale(1.04) rotate(-1deg)" : "none"
            }}>
              <div className="w-12 h-12 mx-auto mb-2">{SVG[cat.k](active?cat.c:"#bbb")}</div>
              <span className="text-xs font-bold" style={{color:active?cat.c:"#999"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:29, name:"Mega Store Grid", style:"Ecommerce", bg:"linear-gradient(135deg, #1e1b4b, #312e81, #4338ca)",
  cats:[{n:"Fashion",k:"tshirt",c:"#c7d2fe"},{n:"Electronics",k:"phone",c:"#93c5fd"},{n:"Food",k:"pizza",c:"#fca5a5"},{n:"Sports",k:"trophy",c:"#86efac"},{n:"Beauty",k:"flower",c:"#f9a8d4"},{n:"Books",k:"book",c:"#fde68a"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340">{[...Array(20)].map((_,i) => <circle key={i} cx={Math.random()*800} cy={Math.random()*340} r={1+Math.random()*2} fill="white" opacity={Math.random()*0.08}/>)}</svg>
      <div className="relative z-10">
        <h3 className="text-indigo-200 font-bold text-lg mb-5">🛒 Mega Store</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-2xl p-5 text-center transition-all" style={{
              background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
              backdropFilter:"blur(10px)", border: active ? `2px solid ${cat.c}60` : "2px solid rgba(255,255,255,0.06)",
              boxShadow: active ? `0 0 25px ${cat.c}15` : "none"
            }}>
              <div className="w-11 h-11 mx-auto mb-2 rounded-xl flex items-center justify-center" style={{background:active?`${cat.c}15`:"rgba(255,255,255,0.04)"}}><div className="w-7 h-7">{SVG[cat.k](active?cat.c:"rgba(255,255,255,0.25)")}</div></div>
              <span className="text-xs font-medium" style={{color:active?cat.c:"rgba(255,255,255,0.3)"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:30, name:"Organic Marketplace", style:"Ecommerce", bg:"linear-gradient(135deg, #ecfdf5, #d1fae5, #a7f3d0)",
  cats:[{n:"Veggies",k:"leaf",c:"#15803d"},{n:"Fruits",k:"sun",c:"#ea580c"},{n:"Herbs",k:"flower",c:"#059669"},{n:"Grains",k:"mountain",c:"#92400e"},{n:"Dairy",k:"coffee",c:"#0369a1"},{n:"Meat",k:"bolt",c:"#b91c1c"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340">{[...Array(6)].map((_,i) => <path key={i} d={`M${-50+i*12},${160+i*10} Q${200+i*6},${130+i*12} ${450+i*4},${170+i*6} T${850-i*12},${150+i*10}`} fill="none" stroke="#86efac" strokeWidth="1" opacity={0.06+i*0.01}/>)}</svg>
      <div className="relative z-10">
        <h3 className="text-green-800 font-black text-lg mb-5">🌱 Organic Market</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-2xl p-4 text-center transition-all" style={{
              background: active ? "white" : "rgba(255,255,255,0.5)",
              border: active ? `2px solid ${cat.c}` : "2px solid rgba(255,255,255,0.4)",
              boxShadow: active ? `0 6px 20px ${cat.c}15` : "none"
            }}>
              <div className="w-10 h-10 mx-auto mb-2">{SVG[cat.k](active?cat.c:"#aaa")}</div>
              <span className="text-xs font-bold" style={{color:active?cat.c:"#999"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

// ━━━━━━━━━━━━━━━━━━━━━━━━
// 🔥 SPECIAL EFFECTS (31-37)
// ━━━━━━━━━━━━━━━━━━━━━━━━

{ id:31, name:"Lightning Surge", style:"Effects", bg:"linear-gradient(180deg, #1a1a2e, #2d2d44)",
  cats:[{n:"Flash",k:"bolt",c:"#fbbf24"},{n:"Storm",k:"mountain",c:"#60a5fa"},{n:"Thunder",k:"rocket",c:"#c084fc"},{n:"Spark",k:"star",c:"#fde68a"},{n:"Blitz",k:"trophy",c:"#f472b6"},{n:"Surge",k:"gem",c:"#22d3ee"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340"><defs><filter id="c31g"><feGaussianBlur stdDeviation="3"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <polyline points="250,0 260,80 240,85 270,160 245,165 280,280" fill="none" stroke="#fbbf24" strokeWidth="2" filter="url(#c31g)"><animate attributeName="opacity" values="0;0.8;0;0;0.6;0" dur="3s" repeatCount="indefinite"/></polyline>
        <polyline points="580,0 570,60 590,65 560,130 585,135 555,220" fill="none" stroke="#fbbf24" strokeWidth="1.5" filter="url(#c31g)"><animate attributeName="opacity" values="0;0;0.7;0;0;0.5;0" dur="4s" repeatCount="indefinite"/></polyline>
        <rect width="800" height="340" fill="white" opacity="0"><animate attributeName="opacity" values="0;0.06;0;0;0;0.04;0" dur="3s" repeatCount="indefinite"/></rect>
      </svg>
      <div className="relative z-10">
        <h3 className="text-yellow-200 font-bold text-lg mb-5" style={{textShadow:"0 0 15px rgba(251,191,36,0.3)"}}>⚡ Power Zone</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-xl p-4 text-center transition-all" style={{
              background: active ? `${cat.c}10` : "rgba(255,255,255,0.02)",
              border: active ? `2px solid ${cat.c}50` : "2px solid rgba(255,255,255,0.04)",
              boxShadow: active ? `0 0 20px ${cat.c}15` : "none"
            }}>
              <div className="w-10 h-10 mx-auto mb-2">{SVG[cat.k](active?cat.c:"#444")}</div>
              <span className="text-xs font-medium" style={{color:active?cat.c:"#444", textShadow:active?`0 0 8px ${cat.c}`:"none"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:32, name:"Snowfall Winter", style:"Effects", bg:"linear-gradient(180deg, #475569, #64748b, #94a3b8)",
  cats:[{n:"Coats",k:"tshirt",c:"#fff"},{n:"Boots",k:"shoe",c:"#e2e8f0"},{n:"Gifts",k:"gem",c:"#fca5a5"},{n:"Decor",k:"star",c:"#fde68a"},{n:"Drinks",k:"coffee",c:"#d4a76a"},{n:"Sweets",k:"candy",c:"#f9a8d4"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340">{[...Array(30)].map((_,i) => {
        const x=Math.random()*800, s=1.5+Math.random()*3;
        return <circle key={i} cx={x} cy={-5} r={s} fill="white" opacity={0.3+Math.random()*0.4}>
          <animate attributeName="cy" from={-5-Math.random()*80} to="350" dur={`${4+Math.random()*5}s`} repeatCount="indefinite"/>
          <animate attributeName="cx" values={`${x};${x+15};${x-10};${x}`} dur={`${3+Math.random()*3}s`} repeatCount="indefinite"/>
        </circle>;
      })}</svg>
      <div className="relative z-10">
        <h3 className="text-white font-bold text-lg mb-5 drop-shadow-md">❄️ Winter Collection</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-2xl p-4 text-center transition-all" style={{
              background: active ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)",
              backdropFilter:"blur(10px)", border: active ? "2px solid rgba(255,255,255,0.5)" : "2px solid rgba(255,255,255,0.15)"
            }}>
              <div className="w-10 h-10 mx-auto mb-2">{SVG[cat.k](active?cat.c:"rgba(255,255,255,0.4)")}</div>
              <span className="text-xs font-medium" style={{color:active?"white":"rgba(255,255,255,0.4)"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:33, name:"Cherry Blossom Float", style:"Effects", bg:"linear-gradient(180deg, #fce7f3, #fbcfe8, #f9a8d4)",
  cats:[{n:"Skincare",k:"flower",c:"#be185d"},{n:"Makeup",k:"palette",c:"#db2777"},{n:"Hair",k:"crown",c:"#e11d48"},{n:"Body",k:"heart",c:"#f43f5e"},{n:"Nails",k:"gem",c:"#ec4899"},{n:"Scent",k:"leaf",c:"#d946ef"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340">{[...Array(15)].map((_,i) => {
        const x=Math.random()*800, s=-20-Math.random()*40;
        return <ellipse key={i} cx={x} cy={s} rx="5" ry="3.5" fill="#f9a8d4" opacity={0.25+Math.random()*0.3}>
          <animate attributeName="cy" from={s} to="360" dur={`${5+Math.random()*6}s`} repeatCount="indefinite"/>
          <animate attributeName="cx" values={`${x};${x+20};${x-12};${x}`} dur={`${3+Math.random()*2}s`} repeatCount="indefinite"/>
        </ellipse>;
      })}</svg>
      <div className="relative z-10">
        <h3 className="text-pink-800 font-bold text-lg mb-5">🌸 Beauty Bar</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-2xl p-4 text-center transition-all" style={{
              background: active ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.3)",
              border: active ? `2px solid ${cat.c}` : "2px solid rgba(255,255,255,0.4)",
              boxShadow: active ? `0 6px 18px ${cat.c}20` : "none"
            }}>
              <div className="w-10 h-10 mx-auto mb-2">{SVG[cat.k](active?cat.c:"#ccc")}</div>
              <span className="text-xs font-bold" style={{color:active?cat.c:"#aaa"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:34, name:"Meteor Dark", style:"Effects", bg:"linear-gradient(180deg, #020617, #0f172a)",
  cats:[{n:"Space",k:"rocket",c:"#c4b5fd"},{n:"Orbit",k:"compass",c:"#93c5fd"},{n:"Comet",k:"bolt",c:"#fde68a"},{n:"Planet",k:"ball",c:"#86efac"},{n:"Lunar",k:"gem",c:"#e2e8f0"},{n:"Solar",k:"sun",c:"#fbbf24"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340">
        {[...Array(30)].map((_,i) => <circle key={i} cx={Math.random()*800} cy={Math.random()*340} r={Math.random()*1.2} fill="white" opacity={Math.random()*0.4}/>)}
        {[...Array(5)].map((_,i) => {const x1=100+Math.random()*500,y1=Math.random()*80; return <line key={`m${i}`} x1={x1} y1={y1} x2={x1+50} y2={y1+35} stroke="white" strokeWidth={0.8+Math.random()} opacity="0"><animate attributeName="opacity" values="0;0.5;0" dur={`${1.5+Math.random()*2}s`} begin={`${Math.random()*4}s`} repeatCount="indefinite"/></line>;})}
      </svg>
      <div className="relative z-10">
        <h3 className="text-violet-200 font-bold text-lg mb-5">🌠 Cosmos Explorer</h3>
        <div className="grid grid-cols-6 gap-2">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-xl p-3 text-center transition-all" style={{
              background: active ? `${cat.c}08` : "rgba(255,255,255,0.01)",
              border: active ? `1px solid ${cat.c}35` : "1px solid rgba(255,255,255,0.03)",
            }}>
              <div className="w-8 h-8 mx-auto mb-1">{SVG[cat.k](active?cat.c:"rgba(255,255,255,0.2)")}</div>
              <span className="text-xs" style={{color:active?cat.c:"rgba(255,255,255,0.2)"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

// ━━━━━━━━━━━━━━━━━━━━━━━━
// 🏠 LIFESTYLE (35-40)
// ━━━━━━━━━━━━━━━━━━━━━━━━

{ id:35, name:"Cozy Home Beige", style:"Lifestyle", bg:"linear-gradient(135deg, #f5f0e8, #ede5d8, #e8dcc8)",
  cats:[{n:"Living",k:"sofa",c:"#78350f"},{n:"Kitchen",k:"coffee",c:"#92400e"},{n:"Bedroom",k:"lamp",c:"#a16207"},{n:"Garden",k:"flower",c:"#15803d"},{n:"Office",k:"laptop",c:"#1e40af"},{n:"Bath",k:"heart",c:"#be185d"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340">{[...Array(8)].map((_,i) => <line key={i} x1="0" y1={80+i*30} x2="800" y2={80+i*30} stroke="#c2b280" strokeWidth="0.6" opacity="0.08"/>)}</svg>
      <div className="relative z-10">
        <h3 className="text-stone-700 font-bold text-lg mb-5" style={{letterSpacing:"2px"}}>🏠 Home & Living</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-xl p-4 text-center transition-all" style={{
              background: active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)",
              border: active ? `2px solid ${cat.c}` : "2px solid rgba(194,178,128,0.2)",
              boxShadow: active ? "0 4px 15px rgba(0,0,0,0.06)" : "none"
            }}>
              <div className="w-10 h-10 mx-auto mb-2">{SVG[cat.k](active?cat.c:"#bbb")}</div>
              <span className="text-xs font-semibold" style={{color:active?cat.c:"#999"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:36, name:"Fitness Gradient", style:"Lifestyle", bg:"linear-gradient(135deg, #1a1a2e, #e94560, #0f3460)",
  cats:[{n:"Yoga",k:"yoga",c:"#67e8f9"},{n:"Run",k:"shoe",c:"#34d399"},{n:"Gym",k:"trophy",c:"#fbbf24"},{n:"Swim",k:"compass",c:"#60a5fa"},{n:"Cycle",k:"ball",c:"#f472b6"},{n:"Box",k:"bolt",c:"#ef4444"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340"><defs><filter id="c36b"><feGaussianBlur stdDeviation="35"/></filter></defs><circle cx="400" cy="170" r="200" fill="#e94560" opacity="0.15" filter="url(#c36b)"/></svg>
      <div className="relative z-10">
        <h3 className="text-white font-black text-lg mb-5">💪 Fitness Zone</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-xl p-4 text-center transition-all" style={{
              background: active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
              border: active ? `2px solid ${cat.c}60` : "2px solid rgba(255,255,255,0.06)",
              transform: active ? "scale(1.04)" : "none"
            }}>
              <div className="w-10 h-10 mx-auto mb-2">{SVG[cat.k](active?cat.c:"rgba(255,255,255,0.25)")}</div>
              <span className="text-xs font-bold" style={{color:active?cat.c:"rgba(255,255,255,0.25)"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:37, name:"Kids Playful", style:"Lifestyle", bg:"linear-gradient(135deg, #dbeafe, #fce7f3, #fef3c7, #d1fae5)",
  cats:[{n:"Toys",k:"gamepad",c:"#dc2626"},{n:"Books",k:"book",c:"#2563eb"},{n:"Clothes",k:"tshirt",c:"#16a34a"},{n:"School",k:"star",c:"#d97706"},{n:"Sports",k:"ball",c:"#9333ea"},{n:"Music",k:"music",c:"#ec4899"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340">{[...Array(20)].map((_,i) => <circle key={i} cx={Math.random()*800} cy={Math.random()*340} r={5+Math.random()*10} fill={["#fca5a5","#93c5fd","#86efac","#fde68a","#d8b4fe","#f9a8d4"][i%6]} opacity="0.12"/>)}</svg>
      <div className="relative z-10">
        <h3 className="font-black text-lg mb-5" style={{background:"linear-gradient(90deg,#dc2626,#d97706,#16a34a,#2563eb,#9333ea)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>🎈 Kids World</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-2xl p-4 text-center transition-all" style={{
              background: active ? "white" : "rgba(255,255,255,0.5)",
              border: active ? `3px solid ${cat.c}` : "3px solid rgba(255,255,255,0.3)",
              boxShadow: active ? `0 6px 18px ${cat.c}20` : "none",
              transform: active ? "rotate(-2deg) scale(1.05)" : "none"
            }}>
              <div className="w-11 h-11 mx-auto mb-2">{SVG[cat.k](active?cat.c:"#ccc")}</div>
              <span className="text-xs font-black" style={{color:active?cat.c:"#bbb"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

// ━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 UNIQUE LAYOUTS (38-44)
// ━━━━━━━━━━━━━━━━━━━━━━━━

{ id:38, name:"Pill Tabs Selector", style:"Layout", bg:"#ffffff",
  cats:[{n:"All",k:"star",c:"#111"},{n:"Wear",k:"tshirt",c:"#7c3aed"},{n:"Tech",k:"laptop",c:"#0ea5e9"},{n:"Home",k:"house",c:"#059669"},{n:"Food",k:"cake",c:"#ea580c"},{n:"Sport",k:"ball",c:"#dc2626"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:240, border:"1px solid #eee"}}>
      <div className="relative z-10">
        <h3 className="text-gray-900 font-bold text-lg mb-5">Browse Categories</h3>
        <div className="flex gap-2 flex-wrap">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-full px-5 py-3 flex items-center gap-2.5 transition-all" style={{
              background: active ? cat.c : "#f5f5f5",
              color: active ? "white" : "#666",
              boxShadow: active ? `0 4px 15px ${cat.c}30` : "none",
              transform: active ? "scale(1.05)" : "none"
            }}>
              <div className="w-5 h-5">{SVG[cat.k](active?"white":cat.c)}</div>
              <span className="text-sm font-semibold">{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:39, name:"Sidebar Vertical", style:"Layout", bg:"linear-gradient(135deg, #0f172a, #1e293b)",
  cats:[{n:"Inbox",k:"book",c:"#60a5fa"},{n:"Sent",k:"plane",c:"#34d399"},{n:"Draft",k:"palette",c:"#fbbf24"},{n:"Trash",k:"bolt",c:"#ef4444"},{n:"Star",k:"star",c:"#c084fc"},{n:"Archive",k:"bag",c:"#fb923c"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl flex" style={{background:this.bg, minHeight:340}}>
      <div className="w-56 p-4 flex-shrink-0" style={{background:"rgba(255,255,255,0.02)", borderRight:"1px solid rgba(255,255,255,0.04)"}}>
        <h3 className="text-white/50 text-xs font-bold mb-4 px-3 tracking-widest uppercase">Folders</h3>
        <div className="space-y-1">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="w-full rounded-lg px-3 py-2.5 flex items-center gap-3 transition-all text-left" style={{
              background: active ? `${cat.c}12` : "transparent",
              borderLeft: active ? `3px solid ${cat.c}` : "3px solid transparent"
            }}>
              <div className="w-5 h-5">{SVG[cat.k](active?cat.c:"#555")}</div>
              <span className="text-sm font-medium" style={{color:active?cat.c:"#555"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center"><p className="text-white/15 text-sm">Select a category</p></div>
    </div>;
  }
},

{ id:40, name:"Circular Wheel", style:"Layout", bg:"linear-gradient(135deg, #581c87, #7e22ce, #a855f7)",
  cats:[{n:"Fire",k:"bolt",c:"#fbbf24"},{n:"Water",k:"leaf",c:"#22d3ee"},{n:"Earth",k:"mountain",c:"#86efac"},{n:"Wind",k:"plane",c:"#e2e8f0"},{n:"Ice",k:"gem",c:"#bae6fd"},{n:"Light",k:"sun",c:"#fde68a"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:380}}>
      <div className="relative z-10 flex items-center justify-center" style={{minHeight:300}}>
        <div className="relative" style={{width:280,height:280}}>
          {this.cats.map((cat,i) => {
            const a = (i*60-90)*Math.PI/180, r=110;
            const x=140+Math.cos(a)*r-30, y=140+Math.sin(a)*r-30;
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="absolute w-16 h-16 rounded-full flex flex-col items-center justify-center transition-all" style={{
              left:x, top:y,
              background: active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)",
              border: active ? `2px solid ${cat.c}` : "2px solid rgba(255,255,255,0.1)",
              boxShadow: active ? `0 0 20px ${cat.c}30` : "none",
              transform: active ? "scale(1.2)" : "none", zIndex: active ? 10 : 1
            }}>
              <div className="w-6 h-6">{SVG[cat.k](active?cat.c:"rgba(255,255,255,0.5)")}</div>
              <span className="text-xs mt-0.5 font-medium" style={{color:active?cat.c:"rgba(255,255,255,0.5)"}}>{cat.n}</span>
            </button>;
          })}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.1)"}}>
              <span className="text-white/50 text-xs font-bold">{sel||"Pick"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>;
  }
},

{ id:41, name:"Accordion Stack", style:"Layout", bg:"#fafafa",
  cats:[{n:"Fashion",k:"tshirt",c:"#7c3aed"},{n:"Electronics",k:"phone",c:"#0ea5e9"},{n:"Food",k:"pizza",c:"#ea580c"},{n:"Sports",k:"trophy",c:"#059669"},{n:"Beauty",k:"flower",c:"#ec4899"},{n:"Books",k:"book",c:"#1e40af"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-6" style={{background:this.bg, minHeight:340, border:"1px solid #eee"}}>
      <h3 className="text-gray-900 font-bold text-lg mb-4">Categories</h3>
      <div className="space-y-2 max-w-lg">
        {this.cats.map((cat,i) => {
          const active = sel === cat.n;
          return <button key={i} onClick={()=>onSel(cat.n)} className="w-full rounded-xl p-4 flex items-center gap-4 transition-all text-left" style={{
            background: active ? `${cat.c}08` : "white",
            border: active ? `2px solid ${cat.c}40` : "2px solid #f0f0f0",
            boxShadow: active ? `0 4px 15px ${cat.c}10` : "none"
          }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:active?`${cat.c}12`:"#f5f5f5"}}><div className="w-6 h-6">{SVG[cat.k](active?cat.c:"#bbb")}</div></div>
            <div className="flex-1"><span className="text-sm font-semibold" style={{color:active?cat.c:"#666"}}>{cat.n}</span><br/><span className="text-xs" style={{color:active?`${cat.c}80`:"#bbb"}}>Browse collection</span></div>
            <span className="text-lg" style={{color:active?cat.c:"#ddd"}}>{active?"›":"›"}</span>
          </button>;
        })}
      </div>
    </div>;
  }
},

{ id:42, name:"Masonry Cards", style:"Layout", bg:"linear-gradient(135deg, #fdf4ff, #fae8ff)",
  cats:[{n:"Art",k:"palette",c:"#a21caf"},{n:"Photo",k:"camera",c:"#7c3aed"},{n:"Music",k:"music",c:"#db2777"},{n:"Film",k:"star",c:"#ea580c"},{n:"Dance",k:"yoga",c:"#0ea5e9"},{n:"Craft",k:"gem",c:"#059669"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <div className="relative z-10">
        <h3 className="text-purple-900 font-black text-lg mb-5">🎭 Arts & Culture</h3>
        <div className="grid grid-cols-3 gap-3" style={{gridAutoRows:"auto"}}>
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            const tall = i % 3 === 0;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-2xl text-center transition-all" style={{
              padding: tall ? "2rem 1rem" : "1.25rem 1rem",
              background: active ? "white" : "rgba(255,255,255,0.5)",
              border: active ? `2px solid ${cat.c}` : "2px solid rgba(255,255,255,0.3)",
              boxShadow: active ? `0 8px 20px ${cat.c}18` : "none"
            }}>
              <div className={`${tall?"w-14 h-14":"w-10 h-10"} mx-auto mb-2`}>{SVG[cat.k](active?cat.c:"#ccc")}</div>
              <span className="text-xs font-bold" style={{color:active?cat.c:"#aaa"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

// ━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 BONUS THEMES (43-50)
// ━━━━━━━━━━━━━━━━━━━━━━━━

{ id:43, name:"Synthwave Retro", style:"Retro", bg:"linear-gradient(180deg, #0a0015, #1a0030, #2d1b69, #ff6ec7)",
  cats:[{n:"Vinyl",k:"music",c:"#ff6ec7"},{n:"Arcade",k:"gamepad",c:"#ff9a3c"},{n:"Neon",k:"bolt",c:"#00ffff"},{n:"Retro",k:"camera",c:"#ff6ec7"},{n:"Disco",k:"star",c:"#ffd700"},{n:"Wave",k:"compass",c:"#ff9a3c"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:380}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 380" preserveAspectRatio="none"><defs><linearGradient id="c43s" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff6ec7"/><stop offset="100%" stopColor="#ff9a3c"/></linearGradient></defs>
        <circle cx="400" cy="280" r="50" fill="url(#c43s)" opacity="0.5"/>{[...Array(4)].map((_,i) => <line key={i} x1="360" y1={280+i*10} x2="440" y2={280+i*10} stroke="#0a0015" strokeWidth="4"/>)}
        {[...Array(12)].map((_,i) => <line key={`v${i}`} x1={i*68} y1="310" x2={400+(i*68-400)*3} y2="380" stroke="#ff6ec7" strokeWidth="1" opacity="0.25"/>)}
        {[0,1,2].map(i => <line key={`h${i}`} x1="0" y1={310+i*22} x2="800" y2={310+i*22} stroke="#ff6ec7" strokeWidth="1" opacity={0.2-i*0.05}/>)}
      </svg>
      <div className="relative z-10" style={{paddingBottom:100}}>
        <h3 className="font-bold text-lg italic mb-5" style={{color:"#ff6ec7", textShadow:"0 0 20px #ff6ec7"}}>SYNTHWAVE</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-lg p-4 text-center transition-all" style={{
              background: active ? `${cat.c}12` : "rgba(0,0,0,0.3)",
              border: active ? `2px solid ${cat.c}` : "2px solid rgba(255,255,255,0.06)",
              boxShadow: active ? `0 0 15px ${cat.c}30` : "none"
            }}>
              <div className="w-10 h-10 mx-auto mb-2">{SVG[cat.k](active?cat.c:"#555")}</div>
              <span className="text-xs font-bold italic" style={{color:active?cat.c:"#555", textShadow:active?`0 0 8px ${cat.c}`:"none"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:44, name:"Paper Cut Art", style:"Retro", bg:"#fef3c7",
  cats:[{n:"Origami",k:"plane",c:"#b45309"},{n:"Craft",k:"palette",c:"#92400e"},{n:"Stitch",k:"heart",c:"#be185d"},{n:"Clay",k:"flower",c:"#15803d"},{n:"Wood",k:"tree",c:"#78350f"},{n:"Metal",k:"gem",c:"#475569"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute bottom-0 w-full" viewBox="0 0 800 180" preserveAspectRatio="none" style={{height:"45%"}}>
        <path d="M0,50 Q200,20 400,60 T800,40 L800,180 L0,180Z" fill="#fbbf24" opacity="0.3"/>
        <path d="M0,80 Q250,55 450,85 T800,65 L800,180 L0,180Z" fill="#f59e0b" opacity="0.35"/>
        <path d="M0,110 Q200,90 400,115 T800,95 L800,180 L0,180Z" fill="#d97706" opacity="0.4"/>
      </svg>
      <div className="relative z-10">
        <h3 className="text-amber-900 font-black text-lg mb-5">✂️ Handcraft</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-xl p-4 text-center transition-all" style={{
              background: active ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)",
              border: active ? `2px solid ${cat.c}` : "2px solid rgba(180,83,9,0.1)",
              boxShadow: active ? `0 4px 15px ${cat.c}15` : "none"
            }}>
              <div className="w-10 h-10 mx-auto mb-2">{SVG[cat.k](active?cat.c:"#cba77a")}</div>
              <span className="text-xs font-bold" style={{color:active?cat.c:"#cba77a"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:45, name:"Stained Glass Mosaic", style:"Glass", bg:"#1a1a2e",
  cats:[{n:"Sacred",k:"star",c:"#ef4444"},{n:"Royal",k:"crown",c:"#3b82f6"},{n:"Nature",k:"leaf",c:"#22c55e"},{n:"Sunset",k:"sun",c:"#f59e0b"},{n:"Mystic",k:"gem",c:"#8b5cf6"},{n:"Rose",k:"flower",c:"#ec4899"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:380}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 380">
        {[{p:"0,0 130,0 110,130 0,120",f:"#ef4444"},{p:"130,0 280,0 230,125 110,130",f:"#3b82f6"},{p:"280,0 430,0 410,140 230,125",f:"#22c55e"},{p:"430,0 580,0 530,115 410,140",f:"#f59e0b"},{p:"580,0 730,0 710,130 530,115",f:"#8b5cf6"},{p:"730,0 800,0 800,125 710,130",f:"#ec4899"},
          {p:"0,120 110,130 90,260 0,250",f:"#06b6d4"},{p:"110,130 230,125 250,260 90,260",f:"#f97316"},{p:"230,125 410,140 390,270 250,260",f:"#84cc16"},{p:"410,140 530,115 550,260 390,270",f:"#e11d48"},{p:"530,115 710,130 690,260 550,260",f:"#6366f1"},{p:"710,130 800,125 800,270 690,260",f:"#14b8a6"},
        ].map((s,i) => <polygon key={i} points={s.p} fill={s.f} opacity="0.35" stroke="#1a1a2e" strokeWidth="3"><animate attributeName="opacity" values="0.3;0.45;0.3" dur={`${3+i*0.15}s`} repeatCount="indefinite"/></polygon>)}
      </svg>
      <div className="absolute inset-0 bg-black/10"/>
      <div className="relative z-10">
        <h3 className="text-white font-bold text-lg mb-5">🏛 Sacred Mosaic</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-xl p-4 text-center transition-all" style={{
              background: active ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.2)",
              backdropFilter:"blur(10px)", border: active ? `2px solid ${cat.c}60` : "2px solid rgba(255,255,255,0.06)"
            }}>
              <div className="w-10 h-10 mx-auto mb-2">{SVG[cat.k](active?cat.c:"rgba(255,255,255,0.3)")}</div>
              <span className="text-xs font-medium" style={{color:active?cat.c:"rgba(255,255,255,0.3)"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:46, name:"Candy Explosion", style:"Candy", bg:"linear-gradient(135deg, #ec4899 0%, #f43f5e 30%, #f97316 60%, #eab308 100%)",
  cats:[{n:"Gummy",k:"heart",c:"#fff"},{n:"Lollipop",k:"candy",c:"#fff"},{n:"Choco",k:"cake",c:"#fff"},{n:"Mint",k:"leaf",c:"#fff"},{n:"Berry",k:"flower",c:"#fff"},{n:"Sour",k:"bolt",c:"#fff"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340">{[...Array(40)].map((_,i) => {
        const x=Math.random()*800,y=Math.random()*340,isR=Math.random()>0.5;
        return isR ? <rect key={i} x={x} y={y} width={3+Math.random()*5} height={2+Math.random()*4} rx="1" fill="white" opacity={0.12+Math.random()*0.12} transform={`rotate(${Math.random()*360} ${x} ${y})`}/> : <circle key={i} cx={x} cy={y} r={1.5+Math.random()*2.5} fill="white" opacity={0.08+Math.random()*0.1}/>;
      })}</svg>
      <div className="relative z-10 text-center">
        <h3 className="text-white font-black text-xl mb-5" style={{textShadow:"0 2px 10px rgba(0,0,0,0.15)"}}>🍬 Candy World 🍭</h3>
        <div className="flex gap-3 justify-center flex-wrap">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-full w-20 h-20 flex flex-col items-center justify-center transition-all" style={{
              background: active ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.12)",
              border: active ? "3px solid white" : "3px solid rgba(255,255,255,0.2)",
              transform: active ? "scale(1.15) rotate(-5deg)" : "none",
              boxShadow: active ? "0 8px 25px rgba(0,0,0,0.15)" : "none"
            }}>
              <div className="w-7 h-7">{SVG[cat.k]("white")}</div>
              <span className="text-white text-xs mt-0.5 font-bold" style={{opacity:active?1:0.7}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:47, name:"Matrix Digital", style:"Cyberpunk", bg:"#000",
  cats:[{n:"Decode",k:"laptop",c:"#00ff41"},{n:"Hack",k:"bolt",c:"#00ff41"},{n:"Trace",k:"compass",c:"#00ff41"},{n:"Scan",k:"camera",c:"#00ff41"},{n:"Sync",k:"phone",c:"#00ff41"},{n:"Link",k:"gem",c:"#00ff41"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 340">{[...Array(18)].map((_,i) => (
        <text key={i} x={i*45} y="0" fill="#00ff41" fontSize="11" fontFamily="monospace" opacity={0.08+Math.random()*0.1}>
          {Array.from({length:25},()=>String.fromCharCode(0x30A0+Math.random()*96)).join('\n')}
          <animate attributeName="y" from={-300-Math.random()*200} to={700} dur={`${3+Math.random()*4}s`} repeatCount="indefinite"/>
        </text>
      ))}</svg>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/60"/>
      <div className="relative z-10">
        <h3 className="font-bold text-lg font-mono mb-5" style={{color:"#00ff41", textShadow:"0 0 15px #00ff41"}}>THE_MATRIX</h3>
        <div className="grid grid-cols-6 gap-2">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-lg p-3 text-center transition-all" style={{
              background: active ? "rgba(0,255,65,0.06)" : "rgba(0,255,65,0.01)",
              border: active ? "1px solid rgba(0,255,65,0.4)" : "1px solid rgba(0,255,65,0.06)"
            }}>
              <div className="w-7 h-7 mx-auto mb-1">{SVG[cat.k](active?"#00ff41":"#0a3d0f")}</div>
              <span className="text-xs font-mono" style={{color:active?"#00ff41":"#0a3d0f", textShadow:active?"0 0 6px #00ff41":"none"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:48, name:"Art Deco Gold", style:"Luxury", bg:"#1a1a2e",
  cats:[{n:"Rings",k:"gem",c:"#ffd700"},{n:"Chains",k:"crown",c:"#daa520"},{n:"Watches",k:"watch",c:"#f5c542"},{n:"Pearls",k:"flower",c:"#fcf6ba"},{n:"Stones",k:"star",c:"#bf953f"},{n:"Sets",k:"bag",c:"#b8860b"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:380}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 380"><defs><linearGradient id="c48g" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#ffd700"/><stop offset="50%" stopColor="#daa520"/><stop offset="100%" stopColor="#b8860b"/></linearGradient></defs>
        <line x1="400" y1="0" x2="400" y2="380" stroke="url(#c48g)" strokeWidth="0.8" opacity="0.15"/>
        <line x1="0" y1="190" x2="800" y2="190" stroke="url(#c48g)" strokeWidth="0.8" opacity="0.15"/>
        {[60,100,140].map((r,i) => <circle key={i} cx="400" cy="190" r={r} fill="none" stroke="url(#c48g)" strokeWidth="0.4" opacity={0.1-i*0.02}/>)}
        {[...Array(8)].map((_,i) => {const a=(i*45)*Math.PI/180; return <line key={i} x1="400" y1="190" x2={400+Math.cos(a)*160} y2={190+Math.sin(a)*160} stroke="url(#c48g)" strokeWidth="0.4" opacity="0.06"/>;})}
      </svg>
      <div className="relative z-10">
        <h3 className="font-bold text-lg text-center mb-5" style={{color:"#ffd700", letterSpacing:"6px", fontVariant:"small-caps"}}>Bijoux</h3>
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-xl p-4 text-center transition-all" style={{
              background: active ? "rgba(255,215,0,0.06)" : "transparent",
              border: active ? `1px solid ${cat.c}50` : "1px solid rgba(255,215,0,0.06)"
            }}>
              <div className="w-9 h-9 mx-auto mb-2">{SVG[cat.k](active?cat.c:"#444")}</div>
              <span className="text-xs" style={{color:active?cat.c:"#444", letterSpacing:"2px"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:49, name:"Volcanic Magma", style:"Nature", bg:"linear-gradient(180deg, #1a0000, #3d0000, #7f1d1d)",
  cats:[{n:"Lava",k:"bolt",c:"#fbbf24"},{n:"Ash",k:"mountain",c:"#9ca3af"},{n:"Ember",k:"sun",c:"#f97316"},{n:"Flame",k:"rocket",c:"#ef4444"},{n:"Smoke",k:"leaf",c:"#6b7280"},{n:"Stone",k:"gem",c:"#78716c"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:340}}>
      <svg className="absolute bottom-0 w-full" viewBox="0 0 800 160" preserveAspectRatio="none" style={{height:"40%"}}><defs><filter id="c49g"><feGaussianBlur stdDeviation="4"/></filter></defs>
        <path d="M0,50 Q200,20 400,60 T800,40 L800,160 L0,160Z" fill="#991b1b" opacity="0.5"/>
        <path d="M0,80 Q150,55 300,80 Q500,100 700,65 L800,80 L800,160 L0,160Z" fill="#b91c1c" opacity="0.35"/>
        <path d="M150,100 Q250,85 350,105" fill="none" stroke="#fbbf24" strokeWidth="2.5" filter="url(#c49g)" opacity="0.4"><animate attributeName="opacity" values="0.25;0.5;0.25" dur="3s" repeatCount="indefinite"/></path>
      </svg>
      <div className="relative z-10">
        <h3 className="text-orange-200 font-bold text-lg mb-5" style={{textShadow:"0 0 15px rgba(239,68,68,0.4)"}}>🌋 Volcanic</h3>
        <div className="grid grid-cols-3 gap-3">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-xl p-4 text-center transition-all" style={{
              background: active ? `${cat.c}12` : "rgba(255,255,255,0.02)",
              border: active ? `2px solid ${cat.c}50` : "2px solid rgba(255,255,255,0.04)",
              boxShadow: active ? `0 0 18px ${cat.c}15` : "none"
            }}>
              <div className="w-10 h-10 mx-auto mb-2">{SVG[cat.k](active?cat.c:"rgba(255,255,255,0.2)")}</div>
              <span className="text-xs font-medium" style={{color:active?cat.c:"rgba(255,255,255,0.2)"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

{ id:50, name:"Galaxy Spiral", style:"Space", bg:"radial-gradient(circle at center, #1e1b4b, #0c0a1d, #000)",
  cats:[{n:"Stars",k:"star",c:"#c4b5fd"},{n:"Planets",k:"ball",c:"#93c5fd"},{n:"Moons",k:"gem",c:"#e2e8f0"},{n:"Suns",k:"sun",c:"#fde68a"},{n:"Comets",k:"rocket",c:"#f9a8d4"},{n:"Nebula",k:"flower",c:"#a78bfa"}],
  render(sel,onSel){
    return <div className="relative w-full overflow-hidden rounded-2xl p-8" style={{background:this.bg, minHeight:380}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 380"><defs><radialGradient id="c50c"><stop offset="0%" stopColor="#818cf8" stopOpacity="0.3"/><stop offset="100%" stopColor="transparent"/></radialGradient><filter id="c50g"><feGaussianBlur stdDeviation="8"/></filter></defs>
        <circle cx="400" cy="190" r="40" fill="url(#c50c)" filter="url(#c50g)"/>
        {[...Array(3)].map((_,arm) => <g key={arm}>{[...Array(20)].map((_,i) => {
          const a=(arm*120+i*10)*Math.PI/180, r=20+i*10;
          return <circle key={i} cx={400+Math.cos(a)*r} cy={190+Math.sin(a)*r*0.5} r={1+Math.random()*0.8} fill={["#818cf8","#a78bfa","#c4b5fd"][arm]} opacity={0.4-i*0.015}/>;
        })}</g>)}
        {[...Array(30)].map((_,i) => <circle key={i} cx={Math.random()*800} cy={Math.random()*380} r={Math.random()*1} fill="white" opacity={Math.random()*0.4}/>)}
      </svg>
      <div className="relative z-10 text-center">
        <h3 className="text-indigo-200 font-bold text-lg mb-5" style={{textShadow:"0 0 20px rgba(129,140,248,0.4)"}}>🌀 Galaxy</h3>
        <div className="flex gap-3 justify-center flex-wrap">
          {this.cats.map((cat,i) => {
            const active = sel === cat.n;
            return <button key={i} onClick={()=>onSel(cat.n)} className="rounded-2xl p-4 w-24 text-center transition-all" style={{
              background: active ? `${cat.c}10` : "rgba(255,255,255,0.02)",
              border: active ? `2px solid ${cat.c}40` : "2px solid rgba(255,255,255,0.04)",
              boxShadow: active ? `0 0 25px ${cat.c}15` : "none"
            }}>
              <div className="w-9 h-9 mx-auto mb-1">{SVG[cat.k](active?cat.c:"rgba(255,255,255,0.2)")}</div>
              <span className="text-xs" style={{color:active?cat.c:"rgba(255,255,255,0.2)"}}>{cat.n}</span>
            </button>;
          })}
        </div>
      </div>
    </div>;
  }
},

];

// ═══════════════════════════════════════════
// GALLERY APP
// ═══════════════════════════════════════════

const styles = ["All", ...new Set(categoryThemes.map(t => t.style))];
const stIcons = {All:"🎯",Glass:"🔮",Candy:"🍬",Space:"🌌",Aurora:"🌌",Gaming:"🎮",Cyberpunk:"⚡",Luxury:"💎",Minimal:"◻️",Nature:"🌿",Modern:"✨",Abstract:"🎨",Ecommerce:"🛒",Effects:"🔥",Lifestyle:"🏠",Layout:"🧩",Retro:"📼"};

export default function CategoryThemesGallery() {
  const [styleFilter, setStyleFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selections, setSelections] = useState({});

  const handleSelect = (themeId, catName) => {
    setSelections(p => ({ ...p, [themeId]: p[themeId] === catName ? null : catName }));
  };

  const filtered = categoryThemes.filter(t => {
    const ms = styleFilter === "All" || t.style === styleFilter;
    const mq = t.name.toLowerCase().includes(search.toLowerCase()) || t.style.toLowerCase().includes(search.toLowerCase());
    return ms && mq;
  });

  return (
    <div className="min-h-screen" style={{ background: "#050508", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="sticky top-0 z-50" style={{ background: "rgba(5,5,8,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: "linear-gradient(135deg, #ec4899, #8b5cf6)" }}>🏷️</div>
              <div>
                <h1 className="text-lg font-bold text-white">Category Selectors</h1>
                <p className="text-gray-600 text-xs">{categoryThemes.length} Themes · SVG Icons · Interactive</p>
              </div>
            </div>
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="text-sm rounded-xl px-4 py-2 w-44 outline-none" style={{ background: "rgba(255,255,255,0.04)", color: "white", border: "1px solid rgba(255,255,255,0.06)" }}/>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {styles.map(s => (
              <button key={s} onClick={() => setStyleFilter(s)} className="px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all" style={{
                background: styleFilter===s ? "rgba(236,72,153,0.2)" : "rgba(255,255,255,0.02)",
                color: styleFilter===s ? "#f9a8d4" : "#555",
                border: `1px solid ${styleFilter===s ? "rgba(236,72,153,0.3)" : "rgba(255,255,255,0.04)"}`
              }}>{stIcons[s]||"✦"} {s}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Themes */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map(t => (
            <div key={t.id}>
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-pink-400/40 text-xs font-mono">#{String(t.id).padStart(2,'0')}</span>
                  <span className="text-gray-200 text-sm font-medium">{t.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.03)", color: "#666" }}>{t.style}</span>
                  {selections[t.id] && <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-300">{selections[t.id]}</span>}
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden" style={{ border: "2px solid rgba(255,255,255,0.03)" }}>
                {t.render(selections[t.id], (cat) => handleSelect(t.id, cat))}
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && <div className="text-center py-20"><p className="text-gray-600 text-sm">No themes found</p></div>}
      </div>

      <div className="text-center py-8 border-t" style={{ borderColor: "rgba(255,255,255,0.03)" }}>
        <p className="text-gray-700 text-xs">{categoryThemes.length} Category Themes · 40+ Custom SVG Icons · Interactive Selection</p>
      </div>
    </div>
  );
}
