// ============================================================
// ESTABREK - 70+ CURSOR STYLES COLLECTION
// ============================================================
// مجموعة شاملة من أنماط المؤشرات
// ============================================================

// ============================================================
// TYPES
// ============================================================

export interface CursorStyle {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  cursor: string;
  description?: string;
}

export interface CustomCursor {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  svg: string;
  hotspot: { x: number; y: number };
  cssClass: string;
}

export interface CursorAnimation {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  cssClass: string;
  keyframes: string;
  description?: string;
}

// ============================================================
// 🖱️ NATIVE CURSORS (15 styles)
// ============================================================

export const NATIVE_CURSORS: CursorStyle[] = [
  {
    id: "cursor-default",
    name: "Default",
    nameAr: "افتراضي",
    category: "native",
    cursor: "cursor-default",
    description: "Default arrow cursor",
  },
  {
    id: "cursor-pointer",
    name: "Pointer",
    nameAr: "مؤشر",
    category: "native",
    cursor: "cursor-pointer",
    description: "Hand pointer for clickable elements",
  },
  {
    id: "cursor-wait",
    name: "Wait",
    nameAr: "انتظار",
    category: "native",
    cursor: "cursor-wait",
    description: "Loading/busy cursor",
  },
  {
    id: "cursor-text",
    name: "Text",
    nameAr: "نص",
    category: "native",
    cursor: "cursor-text",
    description: "Text selection cursor",
  },
  {
    id: "cursor-move",
    name: "Move",
    nameAr: "تحريك",
    category: "native",
    cursor: "cursor-move",
    description: "Move/drag cursor",
  },
  {
    id: "cursor-crosshair",
    name: "Crosshair",
    nameAr: "تقاطع",
    category: "native",
    cursor: "cursor-crosshair",
    description: "Precision selection cursor",
  },
  {
    id: "cursor-grab",
    name: "Grab",
    nameAr: "إمساك",
    category: "native",
    cursor: "cursor-grab",
    description: "Open hand for draggable items",
  },
  {
    id: "cursor-grabbing",
    name: "Grabbing",
    nameAr: "ممسوك",
    category: "native",
    cursor: "cursor-grabbing",
    description: "Closed hand while dragging",
  },
  {
    id: "cursor-not-allowed",
    name: "Not Allowed",
    nameAr: "غير مسموح",
    category: "native",
    cursor: "cursor-not-allowed",
    description: "Indicates disabled action",
  },
  {
    id: "cursor-help",
    name: "Help",
    nameAr: "مساعدة",
    category: "native",
    cursor: "cursor-help",
    description: "Help available cursor",
  },
  {
    id: "cursor-progress",
    name: "Progress",
    nameAr: "تقدم",
    category: "native",
    cursor: "cursor-progress",
    description: "Background task in progress",
  },
  {
    id: "cursor-cell",
    name: "Cell",
    nameAr: "خلية",
    category: "native",
    cursor: "cursor-cell",
    description: "Table cell selection",
  },
  {
    id: "cursor-context-menu",
    name: "Context Menu",
    nameAr: "قائمة سياق",
    category: "native",
    cursor: "cursor-context-menu",
    description: "Context menu available",
  },
  {
    id: "cursor-alias",
    name: "Alias",
    nameAr: "اختصار",
    category: "native",
    cursor: "cursor-alias",
    description: "Create shortcut/alias",
  },
  {
    id: "cursor-copy",
    name: "Copy",
    nameAr: "نسخ",
    category: "native",
    cursor: "cursor-copy",
    description: "Copy action cursor",
  },
];

// ============================================================
// ↔️ RESIZE CURSORS (10 styles)
// ============================================================

export const RESIZE_CURSORS: CursorStyle[] = [
  {
    id: "cursor-n-resize",
    name: "North Resize",
    nameAr: "تغيير شمالي",
    category: "resize",
    cursor: "cursor-n-resize",
    description: "Resize from top edge",
  },
  {
    id: "cursor-s-resize",
    name: "South Resize",
    nameAr: "تغيير جنوبي",
    category: "resize",
    cursor: "cursor-s-resize",
    description: "Resize from bottom edge",
  },
  {
    id: "cursor-e-resize",
    name: "East Resize",
    nameAr: "تغيير شرقي",
    category: "resize",
    cursor: "cursor-e-resize",
    description: "Resize from right edge",
  },
  {
    id: "cursor-w-resize",
    name: "West Resize",
    nameAr: "تغيير غربي",
    category: "resize",
    cursor: "cursor-w-resize",
    description: "Resize from left edge",
  },
  {
    id: "cursor-ne-resize",
    name: "Northeast Resize",
    nameAr: "تغيير شمال شرقي",
    category: "resize",
    cursor: "cursor-ne-resize",
    description: "Resize from top-right corner",
  },
  {
    id: "cursor-nw-resize",
    name: "Northwest Resize",
    nameAr: "تغيير شمال غربي",
    category: "resize",
    cursor: "cursor-nw-resize",
    description: "Resize from top-left corner",
  },
  {
    id: "cursor-se-resize",
    name: "Southeast Resize",
    nameAr: "تغيير جنوب شرقي",
    category: "resize",
    cursor: "cursor-se-resize",
    description: "Resize from bottom-right corner",
  },
  {
    id: "cursor-sw-resize",
    name: "Southwest Resize",
    nameAr: "تغيير جنوب غربي",
    category: "resize",
    cursor: "cursor-sw-resize",
    description: "Resize from bottom-left corner",
  },
  {
    id: "cursor-ew-resize",
    name: "East-West Resize",
    nameAr: "تغيير أفقي",
    category: "resize",
    cursor: "cursor-ew-resize",
    description: "Horizontal resize",
  },
  {
    id: "cursor-ns-resize",
    name: "North-South Resize",
    nameAr: "تغيير عمودي",
    category: "resize",
    cursor: "cursor-ns-resize",
    description: "Vertical resize",
  },
];

// ============================================================
// 🎨 CUSTOM SVG CURSORS (25 styles)
// ============================================================

export const CUSTOM_CURSORS: CustomCursor[] = [
  {
    id: "cursor-custom-arrow",
    name: "Custom Arrow",
    nameAr: "سهم مخصص",
    category: "custom",
    hotspot: { x: 0, y: 0 },
    cssClass: "cursor-custom-arrow",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="black" stroke="white" stroke-width="1"><path d="M4 4l16 8-8 2-2 8z"/></svg>`,
  },
  {
    id: "cursor-custom-pointer",
    name: "Custom Pointer",
    nameAr: "مؤشر مخصص",
    category: "custom",
    hotspot: { x: 6, y: 0 },
    cssClass: "cursor-custom-pointer",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="black" stroke="white" stroke-width="1"><path d="M6 2l8 18-3-7-7-3z"/></svg>`,
  },
  {
    id: "cursor-custom-circle",
    name: "Circle",
    nameAr: "دائرة",
    category: "custom",
    hotspot: { x: 12, y: 12 },
    cssClass: "cursor-custom-circle",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="black" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="black"/></svg>`,
  },
  {
    id: "cursor-custom-crosshair",
    name: "Crosshair Plus",
    nameAr: "تقاطع زائد",
    category: "custom",
    hotspot: { x: 12, y: 12 },
    cssClass: "cursor-custom-crosshair",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="4" fill="none"/></svg>`,
  },
  {
    id: "cursor-custom-target",
    name: "Target",
    nameAr: "هدف",
    category: "custom",
    hotspot: { x: 12, y: 12 },
    cssClass: "cursor-custom-target",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="red"/></svg>`,
  },
  {
    id: "cursor-custom-hand",
    name: "Hand",
    nameAr: "يد",
    category: "custom",
    hotspot: { x: 8, y: 0 },
    cssClass: "cursor-custom-hand",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="black"><path d="M18 11V6a2 2 0 00-4 0v1a2 2 0 00-4 0v1a2 2 0 00-4 0v5c0 5 3 7 6 9 3-2 6-4 6-9z"/></svg>`,
  },
  {
    id: "cursor-custom-pen",
    name: "Pen",
    nameAr: "قلم",
    category: "custom",
    hotspot: { x: 0, y: 24 },
    cssClass: "cursor-custom-pen",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  },
  {
    id: "cursor-custom-brush",
    name: "Brush",
    nameAr: "فرشاة",
    category: "custom",
    hotspot: { x: 2, y: 22 },
    cssClass: "cursor-custom-brush",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="black"><path d="M20 2c-1 0-2 1-3 2l-8 8c-1 1-2 3-2 5v5h5c2 0 4-1 5-2l8-8c1-1 2-2 2-3s-1-2-2-2c-2-2-3-3-5-5z"/></svg>`,
  },
  {
    id: "cursor-custom-eraser",
    name: "Eraser",
    nameAr: "ممحاة",
    category: "custom",
    hotspot: { x: 4, y: 20 },
    cssClass: "cursor-custom-eraser",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="pink" stroke="black" stroke-width="1"><rect x="4" y="10" width="16" height="10" rx="2" transform="rotate(-45 12 12)"/></svg>`,
  },
  {
    id: "cursor-custom-eyedropper",
    name: "Eyedropper",
    nameAr: "قطارة",
    category: "custom",
    hotspot: { x: 0, y: 24 },
    cssClass: "cursor-custom-eyedropper",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><path d="M2 22l1-1h3l9-9 4 4-9 9v3zM15 7l3-3 3 3-3 3z"/></svg>`,
  },
  {
    id: "cursor-custom-zoom-in",
    name: "Zoom In",
    nameAr: "تكبير",
    category: "custom",
    hotspot: { x: 10, y: 10 },
    cssClass: "cursor-custom-zoom-in",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><circle cx="10" cy="10" r="7"/><line x1="21" y1="21" x2="15" y2="15"/><line x1="10" y1="7" x2="10" y2="13"/><line x1="7" y1="10" x2="13" y2="10"/></svg>`,
  },
  {
    id: "cursor-custom-zoom-out",
    name: "Zoom Out",
    nameAr: "تصغير",
    category: "custom",
    hotspot: { x: 10, y: 10 },
    cssClass: "cursor-custom-zoom-out",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><circle cx="10" cy="10" r="7"/><line x1="21" y1="21" x2="15" y2="15"/><line x1="7" y1="10" x2="13" y2="10"/></svg>`,
  },
  {
    id: "cursor-custom-crop",
    name: "Crop",
    nameAr: "قص",
    category: "custom",
    hotspot: { x: 12, y: 12 },
    cssClass: "cursor-custom-crop",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><path d="M6 2v6h12v12h6M2 6h4m12 12v4"/></svg>`,
  },
  {
    id: "cursor-custom-text",
    name: "Text Cursor",
    nameAr: "مؤشر نص",
    category: "custom",
    hotspot: { x: 12, y: 12 },
    cssClass: "cursor-custom-text",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>`,
  },
  {
    id: "cursor-custom-link",
    name: "Link",
    nameAr: "رابط",
    category: "custom",
    hotspot: { x: 12, y: 12 },
    cssClass: "cursor-custom-link",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="blue" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`,
  },
  {
    id: "cursor-custom-star",
    name: "Star",
    nameAr: "نجمة",
    category: "custom",
    hotspot: { x: 12, y: 12 },
    cssClass: "cursor-custom-star",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="gold" stroke="orange" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  },
  {
    id: "cursor-custom-heart",
    name: "Heart",
    nameAr: "قلب",
    category: "custom",
    hotspot: { x: 12, y: 12 },
    cssClass: "cursor-custom-heart",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="red"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
  },
  {
    id: "cursor-custom-lightning",
    name: "Lightning",
    nameAr: "برق",
    category: "custom",
    hotspot: { x: 12, y: 2 },
    cssClass: "cursor-custom-lightning",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="yellow" stroke="orange" stroke-width="1"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  },
  {
    id: "cursor-custom-fire",
    name: "Fire",
    nameAr: "نار",
    category: "custom",
    hotspot: { x: 12, y: 20 },
    cssClass: "cursor-custom-fire",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="orange"><path d="M12 23c-4 0-8-3-8-8 0-3 2-6 4-8 0 2 1 3 3 3 0-4 2-8 5-10 0 4 1 6 3 8 2 2 3 4 3 7 0 5-4 8-8 8h-2z"/><path fill="yellow" d="M12 23c-2 0-4-2-4-4 0-2 1-3 2-4 0 1 1 2 2 2 0-2 1-4 2-5 0 2 1 3 2 4 1 1 1 2 1 3 0 2-2 4-4 4h-1z"/></svg>`,
  },
  {
    id: "cursor-custom-sword",
    name: "Sword",
    nameAr: "سيف",
    category: "gaming",
    hotspot: { x: 2, y: 2 },
    cssClass: "cursor-custom-sword",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2"><path d="M4 20L2 22l3-1 1-3 12-12 2-4-4 2z" fill="silver"/><path d="M14.5 9.5L9 15M5 19l3-3"/></svg>`,
  },
  {
    id: "cursor-custom-wand",
    name: "Magic Wand",
    nameAr: "عصا سحرية",
    category: "custom",
    hotspot: { x: 2, y: 2 },
    cssClass: "cursor-custom-wand",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="purple" stroke="gold" stroke-width="1"><path d="M3 21L21 3"/><polygon points="19 2 22 5 21 6 18 3" fill="gold"/><circle cx="6" cy="6" r="1" fill="yellow"/><circle cx="10" cy="3" r="1" fill="yellow"/><circle cx="3" cy="10" r="1" fill="yellow"/></svg>`,
  },
  {
    id: "cursor-custom-pipette",
    name: "Pipette",
    nameAr: "ماصة",
    category: "custom",
    hotspot: { x: 2, y: 22 },
    cssClass: "cursor-custom-pipette",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><path d="M2 22l4-4m0 0l8-8 4-4 2 2-4 4-8 8-6-6 6 6m0 0l-2 2z"/></svg>`,
  },
  {
    id: "cursor-custom-bucket",
    name: "Paint Bucket",
    nameAr: "دلو طلاء",
    category: "custom",
    hotspot: { x: 18, y: 20 },
    cssClass: "cursor-custom-bucket",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="blue" stroke="black" stroke-width="1"><path d="M19 11l-8-8-8.6 8.6a2 2 0 000 2.8l5.2 5.2a2 2 0 002.8 0L19 11z"/><path d="M5 12l6-6" fill="none" stroke="white"/><ellipse cx="20" cy="20" rx="3" ry="4" fill="blue"/></svg>`,
  },
  {
    id: "cursor-custom-select",
    name: "Select Box",
    nameAr: "مربع تحديد",
    category: "custom",
    hotspot: { x: 0, y: 0 },
    cssClass: "cursor-custom-select",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-dasharray="4 2"><rect x="3" y="3" width="18" height="18" rx="1"/></svg>`,
  },
  {
    id: "cursor-custom-rotate",
    name: "Rotate",
    nameAr: "تدوير",
    category: "custom",
    hotspot: { x: 12, y: 12 },
    cssClass: "cursor-custom-rotate",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>`,
  },
];

// Continue in next part...

// ============================================================
// ✨ ANIMATED CURSORS (10 styles)
// ============================================================

export const ANIMATED_CURSORS: CursorAnimation[] = [
  {
    id: "cursor-anim-pulse",
    name: "Pulse",
    nameAr: "نبض",
    category: "animated",
    cssClass: "cursor-anim-pulse",
    keyframes: `
      @keyframes cursor-pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.8; }
      }
      .cursor-anim-pulse { animation: cursor-pulse 1s ease-in-out infinite; }
    `,
  },
  {
    id: "cursor-anim-spin",
    name: "Spin",
    nameAr: "دوران",
    category: "animated",
    cssClass: "cursor-anim-spin",
    keyframes: `
      @keyframes cursor-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .cursor-anim-spin { animation: cursor-spin 1s linear infinite; }
    `,
  },
  {
    id: "cursor-anim-bounce",
    name: "Bounce",
    nameAr: "ارتداد",
    category: "animated",
    cssClass: "cursor-anim-bounce",
    keyframes: `
      @keyframes cursor-bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }
      .cursor-anim-bounce { animation: cursor-bounce 0.5s ease-in-out infinite; }
    `,
  },
  {
    id: "cursor-anim-glow",
    name: "Glow",
    nameAr: "توهج",
    category: "animated",
    cssClass: "cursor-anim-glow",
    keyframes: `
      @keyframes cursor-glow {
        0%, 100% { filter: drop-shadow(0 0 2px currentColor); }
        50% { filter: drop-shadow(0 0 10px currentColor) drop-shadow(0 0 20px currentColor); }
      }
      .cursor-anim-glow { animation: cursor-glow 1.5s ease-in-out infinite; }
    `,
  },
  {
    id: "cursor-anim-shake",
    name: "Shake",
    nameAr: "اهتزاز",
    category: "animated",
    cssClass: "cursor-anim-shake",
    keyframes: `
      @keyframes cursor-shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-2px); }
        75% { transform: translateX(2px); }
      }
      .cursor-anim-shake { animation: cursor-shake 0.3s ease-in-out infinite; }
    `,
  },
  {
    id: "cursor-anim-fade",
    name: "Fade",
    nameAr: "تلاشي",
    category: "animated",
    cssClass: "cursor-anim-fade",
    keyframes: `
      @keyframes cursor-fade {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      .cursor-anim-fade { animation: cursor-fade 1s ease-in-out infinite; }
    `,
  },
  {
    id: "cursor-anim-rainbow",
    name: "Rainbow",
    nameAr: "قوس قزح",
    category: "animated",
    cssClass: "cursor-anim-rainbow",
    keyframes: `
      @keyframes cursor-rainbow {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(360deg); }
      }
      .cursor-anim-rainbow { animation: cursor-rainbow 2s linear infinite; }
    `,
  },
  {
    id: "cursor-anim-swing",
    name: "Swing",
    nameAr: "تأرجح",
    category: "animated",
    cssClass: "cursor-anim-swing",
    keyframes: `
      @keyframes cursor-swing {
        0%, 100% { transform: rotate(0deg); transform-origin: top center; }
        25% { transform: rotate(15deg); }
        75% { transform: rotate(-15deg); }
      }
      .cursor-anim-swing { animation: cursor-swing 1s ease-in-out infinite; }
    `,
  },
  {
    id: "cursor-anim-heartbeat",
    name: "Heartbeat",
    nameAr: "نبض قلب",
    category: "animated",
    cssClass: "cursor-anim-heartbeat",
    keyframes: `
      @keyframes cursor-heartbeat {
        0%, 100% { transform: scale(1); }
        14% { transform: scale(1.2); }
        28% { transform: scale(1); }
        42% { transform: scale(1.2); }
        70% { transform: scale(1); }
      }
      .cursor-anim-heartbeat { animation: cursor-heartbeat 1.5s ease-in-out infinite; }
    `,
  },
  {
    id: "cursor-anim-morph",
    name: "Morph",
    nameAr: "تحول",
    category: "animated",
    cssClass: "cursor-anim-morph",
    keyframes: `
      @keyframes cursor-morph {
        0%, 100% { border-radius: 50%; }
        25% { border-radius: 0%; }
        50% { border-radius: 50% 0% 50% 0%; }
        75% { border-radius: 0% 50% 0% 50%; }
      }
      .cursor-anim-morph { animation: cursor-morph 2s ease-in-out infinite; }
    `,
  },
];

// ============================================================
// 🎮 GAMING CURSORS (10 styles)
// ============================================================

export const GAMING_CURSORS: CustomCursor[] = [
  {
    id: "cursor-gaming-crosshair",
    name: "Gaming Crosshair",
    nameAr: "تقاطع ألعاب",
    category: "gaming",
    hotspot: { x: 12, y: 12 },
    cssClass: "cursor-gaming-crosshair",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="lime" stroke-width="2"><circle cx="12" cy="12" r="8"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="2" fill="lime"/></svg>`,
  },
  {
    id: "cursor-gaming-reticle",
    name: "Reticle",
    nameAr: "شبكية",
    category: "gaming",
    hotspot: { x: 12, y: 12 },
    cssClass: "cursor-gaming-reticle",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="1"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><line x1="12" y1="0" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="24"/><line x1="0" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="24" y2="12"/></svg>`,
  },
  {
    id: "cursor-gaming-diamond",
    name: "Diamond",
    nameAr: "ماسة",
    category: "gaming",
    hotspot: { x: 12, y: 12 },
    cssClass: "cursor-gaming-diamond",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="cyan" stroke-width="2"><rect x="5" y="5" width="14" height="14" transform="rotate(45 12 12)"/><rect x="9" y="9" width="6" height="6" transform="rotate(45 12 12)" fill="cyan"/></svg>`,
  },
  {
    id: "cursor-gaming-triangle",
    name: "Triangle",
    nameAr: "مثلث",
    category: "gaming",
    hotspot: { x: 12, y: 8 },
    cssClass: "cursor-gaming-triangle",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="yellow" stroke-width="2"><polygon points="12 4 22 20 2 20" fill="none"/><circle cx="12" cy="14" r="2" fill="yellow"/></svg>`,
  },
  {
    id: "cursor-gaming-scope",
    name: "Scope",
    nameAr: "منظار",
    category: "gaming",
    hotspot: { x: 12, y: 12 },
    cssClass: "cursor-gaming-scope",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1"><circle cx="12" cy="12" r="11" stroke-width="2"/><line x1="12" y1="1" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="1" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="23" y2="12"/><line x1="12" y1="9" x2="12" y2="15" stroke="red"/><line x1="9" y1="12" x2="15" y2="12" stroke="red"/></svg>`,
  },
  {
    id: "cursor-gaming-arrow",
    name: "Gaming Arrow",
    nameAr: "سهم ألعاب",
    category: "gaming",
    hotspot: { x: 0, y: 0 },
    cssClass: "cursor-gaming-arrow",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M4 4L20 12L12 14L10 22L4 4Z" fill="#00ff00" stroke="#003300" stroke-width="1"/></svg>`,
  },
  {
    id: "cursor-gaming-pixel",
    name: "Pixel",
    nameAr: "بكسل",
    category: "gaming",
    hotspot: { x: 0, y: 0 },
    cssClass: "cursor-gaming-pixel",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect x="0" y="0" width="4" height="4" fill="white"/><rect x="4" y="4" width="4" height="4" fill="white"/><rect x="8" y="8" width="4" height="4" fill="white"/><rect x="0" y="4" width="4" height="4" fill="black"/><rect x="4" y="8" width="4" height="4" fill="black"/><rect x="0" y="8" width="4" height="4" fill="black"/><rect x="8" y="12" width="4" height="4" fill="white"/><rect x="4" y="16" width="4" height="4" fill="white"/></svg>`,
  },
  {
    id: "cursor-gaming-neon",
    name: "Neon",
    nameAr: "نيون",
    category: "gaming",
    hotspot: { x: 0, y: 0 },
    cssClass: "cursor-gaming-neon",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><defs><filter id="glow"><feGaussianBlur stdDeviation="1" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path d="M4 4L20 12L12 14L10 22L4 4Z" fill="none" stroke="#ff00ff" stroke-width="2" filter="url(#glow)"/></svg>`,
  },
  {
    id: "cursor-gaming-tech",
    name: "Tech",
    nameAr: "تقني",
    category: "gaming",
    hotspot: { x: 12, y: 12 },
    cssClass: "cursor-gaming-tech",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00ffff" stroke-width="1"><polygon points="12,2 14,10 22,12 14,14 12,22 10,14 2,12 10,10"/><circle cx="12" cy="12" r="3"/></svg>`,
  },
  {
    id: "cursor-gaming-blade",
    name: "Blade",
    nameAr: "نصل",
    category: "gaming",
    hotspot: { x: 2, y: 2 },
    cssClass: "cursor-gaming-blade",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M2 2L22 12L12 14L2 2Z" fill="silver" stroke="gray" stroke-width="1"/><path d="M12 14L14 22L2 2" fill="none" stroke="gray" stroke-width="2"/></svg>`,
  },
];

// ============================================================
// 🎨 CURSOR THEMES (10 complete themes)
// ============================================================

export interface CursorTheme {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  cursors: {
    default: string;
    pointer: string;
    text: string;
    grab: string;
    grabbing: string;
    notAllowed: string;
  };
}

export const CURSOR_THEMES: CursorTheme[] = [
  {
    id: "theme-default",
    name: "Default",
    nameAr: "افتراضي",
    category: "theme",
    colors: { primary: "#000000", secondary: "#ffffff", accent: "#3b82f6" },
    cursors: {
      default: "cursor-default",
      pointer: "cursor-pointer",
      text: "cursor-text",
      grab: "cursor-grab",
      grabbing: "cursor-grabbing",
      notAllowed: "cursor-not-allowed",
    },
  },
  {
    id: "theme-dark",
    name: "Dark",
    nameAr: "داكن",
    category: "theme",
    colors: { primary: "#ffffff", secondary: "#1f2937", accent: "#06b6d4" },
    cursors: {
      default: "cursor-default",
      pointer: "cursor-pointer",
      text: "cursor-text",
      grab: "cursor-grab",
      grabbing: "cursor-grabbing",
      notAllowed: "cursor-not-allowed",
    },
  },
  {
    id: "theme-neon",
    name: "Neon",
    nameAr: "نيون",
    category: "theme",
    colors: { primary: "#00ffff", secondary: "#0f0f0f", accent: "#ff00ff" },
    cursors: {
      default: "cursor-gaming-neon",
      pointer: "cursor-custom-hand",
      text: "cursor-custom-text",
      grab: "cursor-grab",
      grabbing: "cursor-grabbing",
      notAllowed: "cursor-not-allowed",
    },
  },
  {
    id: "theme-gaming",
    name: "Gaming",
    nameAr: "ألعاب",
    category: "theme",
    colors: { primary: "#00ff00", secondary: "#000000", accent: "#ff0000" },
    cursors: {
      default: "cursor-gaming-arrow",
      pointer: "cursor-gaming-crosshair",
      text: "cursor-custom-text",
      grab: "cursor-grab",
      grabbing: "cursor-grabbing",
      notAllowed: "cursor-not-allowed",
    },
  },
  {
    id: "theme-retro",
    name: "Retro",
    nameAr: "رجعي",
    category: "theme",
    colors: { primary: "#f59e0b", secondary: "#78350f", accent: "#fbbf24" },
    cursors: {
      default: "cursor-gaming-pixel",
      pointer: "cursor-pointer",
      text: "cursor-text",
      grab: "cursor-grab",
      grabbing: "cursor-grabbing",
      notAllowed: "cursor-not-allowed",
    },
  },
  {
    id: "theme-minimal",
    name: "Minimal",
    nameAr: "بسيط",
    category: "theme",
    colors: { primary: "#6b7280", secondary: "#f3f4f6", accent: "#111827" },
    cursors: {
      default: "cursor-default",
      pointer: "cursor-pointer",
      text: "cursor-text",
      grab: "cursor-grab",
      grabbing: "cursor-grabbing",
      notAllowed: "cursor-not-allowed",
    },
  },
  {
    id: "theme-creative",
    name: "Creative",
    nameAr: "إبداعي",
    category: "theme",
    colors: { primary: "#8b5cf6", secondary: "#faf5ff", accent: "#ec4899" },
    cursors: {
      default: "cursor-custom-wand",
      pointer: "cursor-custom-star",
      text: "cursor-custom-pen",
      grab: "cursor-grab",
      grabbing: "cursor-grabbing",
      notAllowed: "cursor-not-allowed",
    },
  },
  {
    id: "theme-professional",
    name: "Professional",
    nameAr: "احترافي",
    category: "theme",
    colors: { primary: "#1e3a5f", secondary: "#ffffff", accent: "#2563eb" },
    cursors: {
      default: "cursor-default",
      pointer: "cursor-pointer",
      text: "cursor-text",
      grab: "cursor-grab",
      grabbing: "cursor-grabbing",
      notAllowed: "cursor-not-allowed",
    },
  },
  {
    id: "theme-playful",
    name: "Playful",
    nameAr: "مرح",
    category: "theme",
    colors: { primary: "#f472b6", secondary: "#fdf2f8", accent: "#06b6d4" },
    cursors: {
      default: "cursor-custom-heart",
      pointer: "cursor-custom-star",
      text: "cursor-text",
      grab: "cursor-grab",
      grabbing: "cursor-grabbing",
      notAllowed: "cursor-not-allowed",
    },
  },
  {
    id: "theme-nature",
    name: "Nature",
    nameAr: "طبيعة",
    category: "theme",
    colors: { primary: "#059669", secondary: "#ecfdf5", accent: "#84cc16" },
    cursors: {
      default: "cursor-default",
      pointer: "cursor-pointer",
      text: "cursor-text",
      grab: "cursor-grab",
      grabbing: "cursor-grabbing",
      notAllowed: "cursor-not-allowed",
    },
  },
];

// ============================================================
// COMBINE ALL CURSORS
// ============================================================

export const ALL_NATIVE_CURSORS: CursorStyle[] = [...NATIVE_CURSORS, ...RESIZE_CURSORS];
export const ALL_CUSTOM_CURSORS: CustomCursor[] = [...CUSTOM_CURSORS, ...GAMING_CURSORS];
export const ALL_ANIMATED_CURSORS: CursorAnimation[] = ANIMATED_CURSORS;
export const ALL_CURSOR_THEMES: CursorTheme[] = CURSOR_THEMES;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function getNativeCursorById(id: string): CursorStyle | undefined {
  return ALL_NATIVE_CURSORS.find(c => c.id === id);
}

export function getCustomCursorById(id: string): CustomCursor | undefined {
  return ALL_CUSTOM_CURSORS.find(c => c.id === id);
}

export function getAnimatedCursorById(id: string): CursorAnimation | undefined {
  return ALL_ANIMATED_CURSORS.find(c => c.id === id);
}

export function getCursorThemeById(id: string): CursorTheme | undefined {
  return ALL_CURSOR_THEMES.find(t => t.id === id);
}

export function getCursorsByCategory(category: string): (CursorStyle | CustomCursor)[] {
  const native = ALL_NATIVE_CURSORS.filter(c => c.category === category);
  const custom = ALL_CUSTOM_CURSORS.filter(c => c.category === category);
  return [...native, ...custom];
}

export function getAllCursorCategories(): string[] {
  const categories = [
    ...ALL_NATIVE_CURSORS.map(c => c.category),
    ...ALL_CUSTOM_CURSORS.map(c => c.category),
  ];
  return [...new Set(categories)];
}

export function generateCursorCSS(cursor: CustomCursor): string {
  const encodedSVG = encodeURIComponent(cursor.svg);
  return `.${cursor.cssClass} { cursor: url("data:image/svg+xml,${encodedSVG}") ${cursor.hotspot.x} ${cursor.hotspot.y}, auto; }`;
}

export function generateAllCursorCSS(): string {
  const customCSS = ALL_CUSTOM_CURSORS.map(c => generateCursorCSS(c)).join('\n');
  const animatedCSS = ALL_ANIMATED_CURSORS.map(c => c.keyframes).join('\n');
  return `/* Custom Cursors */\n${customCSS}\n\n/* Animated Cursors */\n${animatedCSS}`;
}

// ============================================================
// CATEGORY LABELS (Arabic)
// ============================================================

export const CURSOR_CATEGORY_LABELS_AR: Record<string, string> = {
  native: "أصلي",
  resize: "تغيير حجم",
  custom: "مخصص",
  gaming: "ألعاب",
  animated: "متحرك",
  theme: "ثيم",
};
