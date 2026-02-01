import React from 'react';

// ═══════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface AnimatedShapeTheme {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  shape: 'circle' | 'rectangle' | 'star' | 'triangle' | 'blob' | 'line' | 'dot' | 'mixed';
  animation: 'float' | 'pulse' | 'rotate' | 'bounce' | 'fade' | 'scale' | 'slide' | 'morph';
  tags?: string[];
}

export interface AnimatedShapeProps {
  className?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  speed?: 'slow' | 'normal' | 'fast';
  opacity?: number;
}

// ═══════════════════════════════════════════════════════════════
// 100 ANIMATED SHAPE THEMES DATA
// ═══════════════════════════════════════════════════════════════

export const animatedShapeThemes: AnimatedShapeTheme[] = [
  // ═══════════════════════════════════════════════════════════════
  // 🔵 FLOATING CIRCLES (1-15)
  // ═══════════════════════════════════════════════════════════════
  { id: 'circle-float-simple', name: 'Circle Float Simple', nameAr: 'دائرة عائمة بسيطة', category: 'Circles', shape: 'circle', animation: 'float', tags: ['circle', 'float', 'simple'] },
  { id: 'circle-float-gradient', name: 'Circle Float Gradient', nameAr: 'دائرة عائمة متدرجة', category: 'Circles', shape: 'circle', animation: 'float', tags: ['circle', 'gradient'] },
  { id: 'circle-pulse', name: 'Circle Pulse', nameAr: 'دائرة نابضة', category: 'Circles', shape: 'circle', animation: 'pulse', tags: ['circle', 'pulse'] },
  { id: 'circle-pulse-glow', name: 'Circle Pulse Glow', nameAr: 'دائرة متوهجة', category: 'Circles', shape: 'circle', animation: 'pulse', tags: ['circle', 'glow'] },
  { id: 'circle-scale', name: 'Circle Scale', nameAr: 'دائرة متغيرة', category: 'Circles', shape: 'circle', animation: 'scale', tags: ['circle', 'scale'] },
  { id: 'circle-rotate', name: 'Circle Rotate', nameAr: 'دائرة دوارة', category: 'Circles', shape: 'circle', animation: 'rotate', tags: ['circle', 'rotate'] },
  { id: 'circle-bounce', name: 'Circle Bounce', nameAr: 'دائرة مرتدة', category: 'Circles', shape: 'circle', animation: 'bounce', tags: ['circle', 'bounce'] },
  { id: 'circle-fade', name: 'Circle Fade', nameAr: 'دائرة متلاشية', category: 'Circles', shape: 'circle', animation: 'fade', tags: ['circle', 'fade'] },
  { id: 'circles-multiple', name: 'Circles Multiple', nameAr: 'دوائر متعددة', category: 'Circles', shape: 'circle', animation: 'float', tags: ['circles', 'multiple'] },
  { id: 'circles-concentric', name: 'Circles Concentric', nameAr: 'دوائر متحدة المركز', category: 'Circles', shape: 'circle', animation: 'pulse', tags: ['circles', 'concentric'] },
  { id: 'circles-orbit', name: 'Circles Orbit', nameAr: 'دوائر مدارية', category: 'Circles', shape: 'circle', animation: 'rotate', tags: ['circles', 'orbit'] },
  { id: 'circles-scatter', name: 'Circles Scatter', nameAr: 'دوائر متناثرة', category: 'Circles', shape: 'circle', animation: 'float', tags: ['circles', 'scatter'] },
  { id: 'circles-trail', name: 'Circles Trail', nameAr: 'مسار دوائر', category: 'Circles', shape: 'circle', animation: 'fade', tags: ['circles', 'trail'] },
  { id: 'circles-bubble', name: 'Circles Bubble', nameAr: 'فقاعات', category: 'Circles', shape: 'circle', animation: 'float', tags: ['circles', 'bubble'] },
  { id: 'circles-ripple', name: 'Circles Ripple', nameAr: 'تموجات', category: 'Circles', shape: 'circle', animation: 'scale', tags: ['circles', 'ripple'] },

  // ═══════════════════════════════════════════════════════════════
  // 🟦 RECTANGLES & SQUARES (16-28)
  // ═══════════════════════════════════════════════════════════════
  { id: 'rect-float', name: 'Rectangle Float', nameAr: 'مستطيل عائم', category: 'Rectangles', shape: 'rectangle', animation: 'float', tags: ['rectangle', 'float'] },
  { id: 'rect-rotate', name: 'Rectangle Rotate', nameAr: 'مستطيل دوار', category: 'Rectangles', shape: 'rectangle', animation: 'rotate', tags: ['rectangle', 'rotate'] },
  { id: 'rect-pulse', name: 'Rectangle Pulse', nameAr: 'مستطيل نابض', category: 'Rectangles', shape: 'rectangle', animation: 'pulse', tags: ['rectangle', 'pulse'] },
  { id: 'rect-slide', name: 'Rectangle Slide', nameAr: 'مستطيل منزلق', category: 'Rectangles', shape: 'rectangle', animation: 'slide', tags: ['rectangle', 'slide'] },
  { id: 'squares-grid', name: 'Squares Grid', nameAr: 'شبكة مربعات', category: 'Rectangles', shape: 'rectangle', animation: 'fade', tags: ['squares', 'grid'] },
  { id: 'squares-cascade', name: 'Squares Cascade', nameAr: 'مربعات متتالية', category: 'Rectangles', shape: 'rectangle', animation: 'slide', tags: ['squares', 'cascade'] },
  { id: 'squares-rotate', name: 'Squares Rotate', nameAr: 'مربعات دوارة', category: 'Rectangles', shape: 'rectangle', animation: 'rotate', tags: ['squares', 'rotate'] },
  { id: 'squares-scatter', name: 'Squares Scatter', nameAr: 'مربعات متناثرة', category: 'Rectangles', shape: 'rectangle', animation: 'float', tags: ['squares', 'scatter'] },
  { id: 'rect-3d', name: 'Rectangle 3D', nameAr: 'مستطيل ثلاثي الأبعاد', category: 'Rectangles', shape: 'rectangle', animation: 'rotate', tags: ['rectangle', '3d'] },
  { id: 'rect-gradient', name: 'Rectangle Gradient', nameAr: 'مستطيل متدرج', category: 'Rectangles', shape: 'rectangle', animation: 'float', tags: ['rectangle', 'gradient'] },
  { id: 'rect-outline', name: 'Rectangle Outline', nameAr: 'مستطيل محدد', category: 'Rectangles', shape: 'rectangle', animation: 'rotate', tags: ['rectangle', 'outline'] },
  { id: 'rect-stack', name: 'Rectangle Stack', nameAr: 'مستطيلات مكدسة', category: 'Rectangles', shape: 'rectangle', animation: 'slide', tags: ['rectangles', 'stack'] },
  { id: 'rect-morph', name: 'Rectangle Morph', nameAr: 'مستطيل متحول', category: 'Rectangles', shape: 'rectangle', animation: 'morph', tags: ['rectangle', 'morph'] },

  // ═══════════════════════════════════════════════════════════════
  // ⭐ STARS (29-40)
  // ═══════════════════════════════════════════════════════════════
  { id: 'star-float', name: 'Star Float', nameAr: 'نجمة عائمة', category: 'Stars', shape: 'star', animation: 'float', tags: ['star', 'float'] },
  { id: 'star-rotate', name: 'Star Rotate', nameAr: 'نجمة دوارة', category: 'Stars', shape: 'star', animation: 'rotate', tags: ['star', 'rotate'] },
  { id: 'star-pulse', name: 'Star Pulse', nameAr: 'نجمة نابضة', category: 'Stars', shape: 'star', animation: 'pulse', tags: ['star', 'pulse'] },
  { id: 'star-twinkle', name: 'Star Twinkle', nameAr: 'نجمة لامعة', category: 'Stars', shape: 'star', animation: 'fade', tags: ['star', 'twinkle'] },
  { id: 'star-glow', name: 'Star Glow', nameAr: 'نجمة متوهجة', category: 'Stars', shape: 'star', animation: 'pulse', tags: ['star', 'glow'] },
  { id: 'stars-scatter', name: 'Stars Scatter', nameAr: 'نجوم متناثرة', category: 'Stars', shape: 'star', animation: 'float', tags: ['stars', 'scatter'] },
  { id: 'stars-field', name: 'Stars Field', nameAr: 'حقل نجوم', category: 'Stars', shape: 'star', animation: 'fade', tags: ['stars', 'field'] },
  { id: 'stars-shooting', name: 'Stars Shooting', nameAr: 'نجوم ساقطة', category: 'Stars', shape: 'star', animation: 'slide', tags: ['stars', 'shooting'] },
  { id: 'stars-spiral', name: 'Stars Spiral', nameAr: 'نجوم حلزونية', category: 'Stars', shape: 'star', animation: 'rotate', tags: ['stars', 'spiral'] },
  { id: 'star-burst', name: 'Star Burst', nameAr: 'انفجار نجمي', category: 'Stars', shape: 'star', animation: 'scale', tags: ['star', 'burst'] },
  { id: 'stars-constellation', name: 'Stars Constellation', nameAr: 'كوكبة نجوم', category: 'Stars', shape: 'star', animation: 'fade', tags: ['stars', 'constellation'] },
  { id: 'stars-sparkle', name: 'Stars Sparkle', nameAr: 'بريق نجوم', category: 'Stars', shape: 'star', animation: 'scale', tags: ['stars', 'sparkle'] },

  // ═══════════════════════════════════════════════════════════════
  // 🔺 TRIANGLES (41-50)
  // ═══════════════════════════════════════════════════════════════
  { id: 'triangle-float', name: 'Triangle Float', nameAr: 'مثلث عائم', category: 'Triangles', shape: 'triangle', animation: 'float', tags: ['triangle', 'float'] },
  { id: 'triangle-rotate', name: 'Triangle Rotate', nameAr: 'مثلث دوار', category: 'Triangles', shape: 'triangle', animation: 'rotate', tags: ['triangle', 'rotate'] },
  { id: 'triangle-pulse', name: 'Triangle Pulse', nameAr: 'مثلث نابض', category: 'Triangles', shape: 'triangle', animation: 'pulse', tags: ['triangle', 'pulse'] },
  { id: 'triangles-scatter', name: 'Triangles Scatter', nameAr: 'مثلثات متناثرة', category: 'Triangles', shape: 'triangle', animation: 'float', tags: ['triangles', 'scatter'] },
  { id: 'triangles-geometric', name: 'Triangles Geometric', nameAr: 'مثلثات هندسية', category: 'Triangles', shape: 'triangle', animation: 'rotate', tags: ['triangles', 'geometric'] },
  { id: 'triangle-3d', name: 'Triangle 3D', nameAr: 'مثلث ثلاثي الأبعاد', category: 'Triangles', shape: 'triangle', animation: 'rotate', tags: ['triangle', '3d'] },
  { id: 'triangles-pattern', name: 'Triangles Pattern', nameAr: 'نمط مثلثات', category: 'Triangles', shape: 'triangle', animation: 'fade', tags: ['triangles', 'pattern'] },
  { id: 'triangle-arrow', name: 'Triangle Arrow', nameAr: 'سهم مثلثي', category: 'Triangles', shape: 'triangle', animation: 'slide', tags: ['triangle', 'arrow'] },
  { id: 'triangles-cascade', name: 'Triangles Cascade', nameAr: 'مثلثات متتالية', category: 'Triangles', shape: 'triangle', animation: 'slide', tags: ['triangles', 'cascade'] },
  { id: 'triangle-pyramid', name: 'Triangle Pyramid', nameAr: 'هرم', category: 'Triangles', shape: 'triangle', animation: 'rotate', tags: ['triangle', 'pyramid'] },

  // ═══════════════════════════════════════════════════════════════
  // 🫧 BLOBS & ORGANIC (51-62)
  // ═══════════════════════════════════════════════════════════════
  { id: 'blob-float', name: 'Blob Float', nameAr: 'فقاعة عائمة', category: 'Blobs', shape: 'blob', animation: 'float', tags: ['blob', 'float'] },
  { id: 'blob-morph', name: 'Blob Morph', nameAr: 'فقاعة متحولة', category: 'Blobs', shape: 'blob', animation: 'morph', tags: ['blob', 'morph'] },
  { id: 'blob-pulse', name: 'Blob Pulse', nameAr: 'فقاعة نابضة', category: 'Blobs', shape: 'blob', animation: 'pulse', tags: ['blob', 'pulse'] },
  { id: 'blob-gradient', name: 'Blob Gradient', nameAr: 'فقاعة متدرجة', category: 'Blobs', shape: 'blob', animation: 'morph', tags: ['blob', 'gradient'] },
  { id: 'blobs-multiple', name: 'Blobs Multiple', nameAr: 'فقاعات متعددة', category: 'Blobs', shape: 'blob', animation: 'float', tags: ['blobs', 'multiple'] },
  { id: 'blob-glow', name: 'Blob Glow', nameAr: 'فقاعة متوهجة', category: 'Blobs', shape: 'blob', animation: 'pulse', tags: ['blob', 'glow'] },
  { id: 'blob-glass', name: 'Blob Glass', nameAr: 'فقاعة زجاجية', category: 'Blobs', shape: 'blob', animation: 'float', tags: ['blob', 'glass'] },
  { id: 'blob-neon', name: 'Blob Neon', nameAr: 'فقاعة نيون', category: 'Blobs', shape: 'blob', animation: 'pulse', tags: ['blob', 'neon'] },
  { id: 'blobs-lava', name: 'Blobs Lava', nameAr: 'فقاعات حمم', category: 'Blobs', shape: 'blob', animation: 'morph', tags: ['blobs', 'lava'] },
  { id: 'blob-aurora', name: 'Blob Aurora', nameAr: 'شفق قطبي', category: 'Blobs', shape: 'blob', animation: 'morph', tags: ['blob', 'aurora'] },
  { id: 'blob-wave', name: 'Blob Wave', nameAr: 'موجة', category: 'Blobs', shape: 'blob', animation: 'morph', tags: ['blob', 'wave'] },
  { id: 'blob-liquid', name: 'Blob Liquid', nameAr: 'سائل', category: 'Blobs', shape: 'blob', animation: 'morph', tags: ['blob', 'liquid'] },

  // ═══════════════════════════════════════════════════════════════
  // ⬤ DOTS & PARTICLES (63-75)
  // ═══════════════════════════════════════════════════════════════
  { id: 'dots-float', name: 'Dots Float', nameAr: 'نقاط عائمة', category: 'Dots', shape: 'dot', animation: 'float', tags: ['dots', 'float'] },
  { id: 'dots-pulse', name: 'Dots Pulse', nameAr: 'نقاط نابضة', category: 'Dots', shape: 'dot', animation: 'pulse', tags: ['dots', 'pulse'] },
  { id: 'dots-grid', name: 'Dots Grid', nameAr: 'شبكة نقاط', category: 'Dots', shape: 'dot', animation: 'fade', tags: ['dots', 'grid'] },
  { id: 'dots-wave', name: 'Dots Wave', nameAr: 'موجة نقاط', category: 'Dots', shape: 'dot', animation: 'float', tags: ['dots', 'wave'] },
  { id: 'dots-scatter', name: 'Dots Scatter', nameAr: 'نقاط متناثرة', category: 'Dots', shape: 'dot', animation: 'float', tags: ['dots', 'scatter'] },
  { id: 'particles-float', name: 'Particles Float', nameAr: 'جزيئات عائمة', category: 'Dots', shape: 'dot', animation: 'float', tags: ['particles', 'float'] },
  { id: 'particles-rise', name: 'Particles Rise', nameAr: 'جزيئات صاعدة', category: 'Dots', shape: 'dot', animation: 'slide', tags: ['particles', 'rise'] },
  { id: 'particles-fall', name: 'Particles Fall', nameAr: 'جزيئات ساقطة', category: 'Dots', shape: 'dot', animation: 'slide', tags: ['particles', 'fall'] },
  { id: 'particles-explode', name: 'Particles Explode', nameAr: 'انفجار جزيئات', category: 'Dots', shape: 'dot', animation: 'scale', tags: ['particles', 'explode'] },
  { id: 'confetti', name: 'Confetti', nameAr: 'قصاصات', category: 'Dots', shape: 'mixed', animation: 'float', tags: ['confetti', 'celebration'] },
  { id: 'snow', name: 'Snow', nameAr: 'ثلج', category: 'Dots', shape: 'dot', animation: 'slide', tags: ['snow', 'winter'] },
  { id: 'rain', name: 'Rain', nameAr: 'مطر', category: 'Dots', shape: 'dot', animation: 'slide', tags: ['rain', 'weather'] },
  { id: 'fireflies', name: 'Fireflies', nameAr: 'يراعات', category: 'Dots', shape: 'dot', animation: 'float', tags: ['fireflies', 'glow'] },

  // ═══════════════════════════════════════════════════════════════
  // ➖ LINES & STROKES (76-85)
  // ═══════════════════════════════════════════════════════════════
  { id: 'lines-float', name: 'Lines Float', nameAr: 'خطوط عائمة', category: 'Lines', shape: 'line', animation: 'float', tags: ['lines', 'float'] },
  { id: 'lines-rotate', name: 'Lines Rotate', nameAr: 'خطوط دوارة', category: 'Lines', shape: 'line', animation: 'rotate', tags: ['lines', 'rotate'] },
  { id: 'lines-pulse', name: 'Lines Pulse', nameAr: 'خطوط نابضة', category: 'Lines', shape: 'line', animation: 'pulse', tags: ['lines', 'pulse'] },
  { id: 'lines-wave', name: 'Lines Wave', nameAr: 'خطوط موجية', category: 'Lines', shape: 'line', animation: 'morph', tags: ['lines', 'wave'] },
  { id: 'lines-grid', name: 'Lines Grid', nameAr: 'شبكة خطوط', category: 'Lines', shape: 'line', animation: 'fade', tags: ['lines', 'grid'] },
  { id: 'lines-diagonal', name: 'Lines Diagonal', nameAr: 'خطوط قطرية', category: 'Lines', shape: 'line', animation: 'slide', tags: ['lines', 'diagonal'] },
  { id: 'lines-cross', name: 'Lines Cross', nameAr: 'خطوط متقاطعة', category: 'Lines', shape: 'line', animation: 'rotate', tags: ['lines', 'cross'] },
  { id: 'lines-zigzag', name: 'Lines Zigzag', nameAr: 'خطوط متعرجة', category: 'Lines', shape: 'line', animation: 'slide', tags: ['lines', 'zigzag'] },
  { id: 'lines-spiral', name: 'Lines Spiral', nameAr: 'خطوط حلزونية', category: 'Lines', shape: 'line', animation: 'rotate', tags: ['lines', 'spiral'] },
  { id: 'lines-connect', name: 'Lines Connect', nameAr: 'خطوط متصلة', category: 'Lines', shape: 'line', animation: 'fade', tags: ['lines', 'connect'] },

  // ═══════════════════════════════════════════════════════════════
  // 🎨 MIXED & SPECIAL (86-100)
  // ═══════════════════════════════════════════════════════════════
  { id: 'geometric-mix', name: 'Geometric Mix', nameAr: 'أشكال هندسية', category: 'Mixed', shape: 'mixed', animation: 'float', tags: ['geometric', 'mixed'] },
  { id: 'abstract-shapes', name: 'Abstract Shapes', nameAr: 'أشكال مجردة', category: 'Mixed', shape: 'mixed', animation: 'float', tags: ['abstract', 'shapes'] },
  { id: 'neon-shapes', name: 'Neon Shapes', nameAr: 'أشكال نيون', category: 'Mixed', shape: 'mixed', animation: 'pulse', tags: ['neon', 'glow'] },
  { id: 'gradient-shapes', name: 'Gradient Shapes', nameAr: 'أشكال متدرجة', category: 'Mixed', shape: 'mixed', animation: 'float', tags: ['gradient', 'colorful'] },
  { id: 'glass-shapes', name: 'Glass Shapes', nameAr: 'أشكال زجاجية', category: 'Mixed', shape: 'mixed', animation: 'float', tags: ['glass', 'blur'] },
  { id: 'outline-shapes', name: 'Outline Shapes', nameAr: 'أشكال محددة', category: 'Mixed', shape: 'mixed', animation: 'rotate', tags: ['outline', 'minimal'] },
  { id: 'tech-grid', name: 'Tech Grid', nameAr: 'شبكة تقنية', category: 'Mixed', shape: 'mixed', animation: 'fade', tags: ['tech', 'grid'] },
  { id: 'cyber-shapes', name: 'Cyber Shapes', nameAr: 'أشكال سايبر', category: 'Mixed', shape: 'mixed', animation: 'pulse', tags: ['cyber', 'tech'] },
  { id: 'retro-shapes', name: 'Retro Shapes', nameAr: 'أشكال ريترو', category: 'Mixed', shape: 'mixed', animation: 'float', tags: ['retro', 'vintage'] },
  { id: 'minimal-shapes', name: 'Minimal Shapes', nameAr: 'أشكال بسيطة', category: 'Mixed', shape: 'mixed', animation: 'fade', tags: ['minimal', 'clean'] },
  { id: 'playful-shapes', name: 'Playful Shapes', nameAr: 'أشكال مرحة', category: 'Mixed', shape: 'mixed', animation: 'bounce', tags: ['playful', 'fun'] },
  { id: 'elegant-shapes', name: 'Elegant Shapes', nameAr: 'أشكال أنيقة', category: 'Mixed', shape: 'mixed', animation: 'float', tags: ['elegant', 'luxury'] },
  { id: 'dynamic-shapes', name: 'Dynamic Shapes', nameAr: 'أشكال ديناميكية', category: 'Mixed', shape: 'mixed', animation: 'morph', tags: ['dynamic', 'animated'] },
  { id: 'cosmic-shapes', name: 'Cosmic Shapes', nameAr: 'أشكال كونية', category: 'Mixed', shape: 'mixed', animation: 'float', tags: ['cosmic', 'space'] },
  { id: 'nature-shapes', name: 'Nature Shapes', nameAr: 'أشكال طبيعية', category: 'Mixed', shape: 'mixed', animation: 'float', tags: ['nature', 'organic'] },
];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const shapeCategories = [...new Set(animatedShapeThemes.map(t => t.category))];

export const getAnimatedShapeTheme = (themeId: string): AnimatedShapeTheme | undefined => {
  return animatedShapeThemes.find(t => t.id === themeId);
};

export const getShapesByCategory = (category: string): AnimatedShapeTheme[] => {
  return animatedShapeThemes.filter(t => t.category === category);
};

export const getShapesByAnimation = (animation: string): AnimatedShapeTheme[] => {
  return animatedShapeThemes.filter(t => t.animation === animation);
};

// ═══════════════════════════════════════════════════════════════
// CSS KEYFRAMES (inject into document)
// ═══════════════════════════════════════════════════════════════

export const animationKeyframes = `
@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
}

@keyframes float-reverse {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(20px) rotate(-5deg); }
}

@keyframes float-horizontal {
  0%, 100% { transform: translateX(0px); }
  50% { transform: translateX(20px); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

@keyframes pulse-glow {
  0%, 100% { transform: scale(1); box-shadow: 0 0 20px currentColor; }
  50% { transform: scale(1.05); box-shadow: 0 0 40px currentColor; }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes rotate-reverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-30px); }
}

@keyframes fade {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

@keyframes scale {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.5); }
}

@keyframes slide-up {
  0% { transform: translateY(100%); opacity: 0; }
  100% { transform: translateY(-100%); opacity: 0; }
  10%, 90% { opacity: 1; }
}

@keyframes slide-down {
  0% { transform: translateY(-100%); opacity: 0; }
  100% { transform: translateY(100%); opacity: 0; }
  10%, 90% { opacity: 1; }
}

@keyframes morph {
  0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
  50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
}

@keyframes twinkle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

@keyframes ripple {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

@keyframes orbit {
  from { transform: rotate(0deg) translateX(50px) rotate(0deg); }
  to { transform: rotate(360deg) translateX(50px) rotate(-360deg); }
}
`;

// ═══════════════════════════════════════════════════════════════
// ANIMATED SHAPE COMPONENTS
// ═══════════════════════════════════════════════════════════════

// 1. Circle Float Simple
export const CircleFloatSimple: React.FC<AnimatedShapeProps> = ({
  className = '',
  color = 'blue',
  size = 'md',
  speed = 'normal',
  opacity = 0.6,
}) => {
  const sizes = { sm: 'w-8 h-8', md: 'w-16 h-16', lg: 'w-24 h-24', xl: 'w-32 h-32' };
  const speeds = { slow: '8s', normal: '5s', fast: '3s' };
  const colors: Record<string, string> = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    cyan: 'bg-cyan-500',
  };

  return (
    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${className}`}>
      <div
        className={`${sizes[size]} ${colors[color] || color} rounded-full`}
        style={{
          opacity,
          animation: `float ${speeds[speed]} ease-in-out infinite`,
        }}
      />
    </div>
  );
};

// 2. Circles Multiple
export const CirclesMultiple: React.FC<AnimatedShapeProps & { count?: number }> = ({
  className = '',
  count = 5,
  opacity = 0.4,
}) => {
  const circles = Array.from({ length: count }, (_, i) => ({
    size: Math.random() * 60 + 20,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 5,
    duration: Math.random() * 3 + 4,
    color: ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500'][i % 4],
  }));

  return (
    <div className={`absolute inset-0 overflow-visible pointer-events-none ${className}`}>
      {circles.map((circle, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${circle.color}`}
          style={{
            width: circle.size,
            height: circle.size,
            left: `${circle.x}%`,
            top: `${circle.y}%`,
            opacity,
            animation: `float ${circle.duration}s ease-in-out infinite`,
            animationDelay: `${circle.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

// 3. Circle Pulse Glow
export const CirclePulseGlow: React.FC<AnimatedShapeProps> = ({
  className = '',
  color = 'blue',
  size = 'lg',
  speed = 'normal',
  opacity = 0.6,
}) => {
  const sizes = { sm: 'w-12 h-12', md: 'w-20 h-20', lg: 'w-32 h-32', xl: 'w-48 h-48' };
  const speeds = { slow: '4s', normal: '2.5s', fast: '1.5s' };
  const colors: Record<string, string> = {
    blue: '#3b82f6',
    purple: '#8b5cf6',
    pink: '#ec4899',
    green: '#22c55e',
    cyan: '#06b6d4',
  };

  return (
    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${className}`}>
      <div
        className={`${sizes[size]} rounded-full`}
        style={{
          backgroundColor: colors[color] || color,
          opacity,
          boxShadow: `0 0 60px ${colors[color] || color}`,
          animation: `pulse-glow ${speeds[speed]} ease-in-out infinite`,
        }}
      />
    </div>
  );
};

// 4. Circles Ripple
export const CirclesRipple: React.FC<AnimatedShapeProps> = ({
  className = '',
  color = 'blue',
  size = 'lg',
}) => {
  const sizes = { sm: 'w-16 h-16', md: 'w-24 h-24', lg: 'w-40 h-40', xl: 'w-56 h-56' };
  const colors: Record<string, string> = {
    blue: 'border-blue-500',
    purple: 'border-purple-500',
    pink: 'border-pink-500',
    cyan: 'border-cyan-500',
  };

  return (
    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${className}`}>
      <div className="relative">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`absolute ${sizes[size]} rounded-full border-2 ${colors[color] || 'border-blue-500'}`}
            style={{
              animation: `ripple 3s ease-out infinite`,
              animationDelay: `${i * 1}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

// 5. Star Float
export const StarFloat: React.FC<AnimatedShapeProps> = ({
  className = '',
  color = 'yellow',
  size = 'md',
  speed = 'normal',
  opacity = 0.8,
}) => {
  const sizes = { sm: 16, md: 24, lg: 36, xl: 48 };
  const speeds = { slow: '6s', normal: '4s', fast: '2s' };
  const colors: Record<string, string> = {
    yellow: '#fbbf24',
    gold: '#f59e0b',
    white: '#ffffff',
    pink: '#ec4899',
  };

  return (
    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${className}`}>
      <svg
        width={sizes[size]}
        height={sizes[size]}
        viewBox="0 0 24 24"
        fill={colors[color] || color}
        style={{
          opacity,
          animation: `float ${speeds[speed]} ease-in-out infinite`,
        }}
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </div>
  );
};

// 6. Stars Scatter
export const StarsScatter: React.FC<AnimatedShapeProps & { count?: number }> = ({
  className = '',
  count = 12,
  opacity = 0.7,
}) => {
  const stars = Array.from({ length: count }, (_, i) => ({
    size: Math.random() * 12 + 8,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 3,
    duration: Math.random() * 2 + 2,
  }));

  return (
    <div className={`absolute inset-0 overflow-visible pointer-events-none ${className}`}>
      {stars.map((star, i) => (
        <svg
          key={i}
          className="absolute"
          width={star.size}
          height={star.size}
          viewBox="0 0 24 24"
          fill="#fbbf24"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            opacity,
            animation: `twinkle ${star.duration}s ease-in-out infinite`,
            animationDelay: `${star.delay}s`,
          }}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
};

// 7. Rectangle Rotate
export const RectangleRotate: React.FC<AnimatedShapeProps> = ({
  className = '',
  color = 'purple',
  size = 'md',
  speed = 'normal',
  opacity = 0.5,
}) => {
  const sizes = { sm: 'w-8 h-8', md: 'w-16 h-16', lg: 'w-24 h-24', xl: 'w-32 h-32' };
  const speeds = { slow: '12s', normal: '8s', fast: '4s' };
  const colors: Record<string, string> = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    green: 'bg-green-500',
  };

  return (
    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${className}`}>
      <div
        className={`${sizes[size]} ${colors[color] || color} rounded-lg`}
        style={{
          opacity,
          animation: `rotate ${speeds[speed]} linear infinite`,
        }}
      />
    </div>
  );
};

// 8. Squares Scatter
export const SquaresScatter: React.FC<AnimatedShapeProps & { count?: number }> = ({
  className = '',
  count = 6,
  opacity = 0.4,
}) => {
  const squares = Array.from({ length: count }, (_, i) => ({
    size: Math.random() * 40 + 20,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 5,
    duration: Math.random() * 5 + 8,
    rotation: Math.random() * 360,
    color: ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500', 'bg-green-500'][i % 5],
  }));

  return (
    <div className={`absolute inset-0 overflow-visible pointer-events-none ${className}`}>
      {squares.map((sq, i) => (
        <div
          key={i}
          className={`absolute rounded-lg ${sq.color}`}
          style={{
            width: sq.size,
            height: sq.size,
            left: `${sq.x}%`,
            top: `${sq.y}%`,
            opacity,
            transform: `rotate(${sq.rotation}deg)`,
            animation: `float ${sq.duration}s ease-in-out infinite, rotate ${sq.duration * 2}s linear infinite`,
            animationDelay: `${sq.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

// 9. Blob Morph
export const BlobMorph: React.FC<AnimatedShapeProps> = ({
  className = '',
  color = 'purple',
  size = 'xl',
  speed = 'slow',
  opacity = 0.5,
}) => {
  const sizes = { sm: 'w-32 h-32', md: 'w-48 h-48', lg: 'w-64 h-64', xl: 'w-96 h-96' };
  const speeds = { slow: '10s', normal: '6s', fast: '3s' };
  const gradients: Record<string, string> = {
    purple: 'from-purple-500 to-pink-500',
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    orange: 'from-orange-500 to-red-500',
  };

  return (
    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${className}`}>
      <div
        className={`${sizes[size]} bg-gradient-to-br ${gradients[color] || gradients.purple} rounded-[60%_40%_30%_70%/60%_30%_70%_40%]`}
        style={{
          opacity,
          animation: `morph ${speeds[speed]} ease-in-out infinite`,
        }}
      />
    </div>
  );
};

// 10. Blobs Multiple
export const BlobsMultiple: React.FC<AnimatedShapeProps> = ({
  className = '',
  opacity = 0.4,
}) => {
  return (
    <div className={`absolute inset-0 overflow-visible pointer-events-none ${className}`}>
      <div
        className="absolute -top-20 -left-20 w-72 h-72 bg-gradient-to-br from-purple-500 to-pink-500 rounded-[60%_40%_30%_70%/60%_30%_70%_40%]"
        style={{ opacity, animation: 'morph 8s ease-in-out infinite' }}
      />
      <div
        className="absolute -bottom-20 -right-20 w-80 h-80 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-[40%_60%_70%_30%/40%_50%_60%_50%]"
        style={{ opacity, animation: 'morph 10s ease-in-out infinite', animationDelay: '2s' }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-pink-500 to-orange-500 rounded-[50%_50%_40%_60%/60%_40%_60%_40%]"
        style={{ opacity: opacity * 0.6, animation: 'morph 12s ease-in-out infinite', animationDelay: '4s' }}
      />
    </div>
  );
};

// 11. Dots Grid
export const DotsGrid: React.FC<AnimatedShapeProps & { rows?: number; cols?: number }> = ({
  className = '',
  rows = 8,
  cols = 12,
  opacity = 0.3,
}) => {
  const dots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push({
        x: (c / (cols - 1)) * 100,
        y: (r / (rows - 1)) * 100,
        delay: (r + c) * 0.1,
      });
    }
  }

  return (
    <div className={`absolute inset-0 overflow-visible pointer-events-none ${className}`}>
      {dots.map((dot, i) => (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 bg-gray-400 rounded-full"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            opacity,
            animation: `fade 3s ease-in-out infinite`,
            animationDelay: `${dot.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

// 12. Particles Float
export const ParticlesFloat: React.FC<AnimatedShapeProps & { count?: number }> = ({
  className = '',
  count = 20,
  opacity = 0.5,
}) => {
  const particles = Array.from({ length: count }, (_, i) => ({
    size: Math.random() * 6 + 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 5,
    duration: Math.random() * 5 + 5,
    color: ['bg-blue-400', 'bg-purple-400', 'bg-pink-400', 'bg-cyan-400'][i % 4],
  }));

  return (
    <div className={`absolute inset-0 overflow-visible pointer-events-none ${className}`}>
      {particles.map((p, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${p.color}`}
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity,
            animation: `float ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

// 13. Lines Wave
export const LinesWave: React.FC<AnimatedShapeProps & { count?: number }> = ({
  className = '',
  count = 5,
  color = 'blue',
  opacity = 0.3,
}) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    cyan: 'bg-cyan-500',
  };

  return (
    <div className={`absolute inset-0 overflow-visible pointer-events-none ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`absolute h-0.5 ${colors[color] || colors.blue}`}
          style={{
            width: '120%',
            left: '-10%',
            top: `${20 + i * 15}%`,
            opacity,
            transform: `rotate(${-5 + i * 2}deg)`,
            animation: `float ${4 + i * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
};

// 14. Geometric Mix
export const GeometricMix: React.FC<AnimatedShapeProps> = ({
  className = '',
  opacity = 0.4,
}) => {
  return (
    <div className={`absolute inset-0 overflow-visible pointer-events-none ${className}`}>
      {/* Circles */}
      <div
        className="absolute top-10 left-10 w-20 h-20 bg-blue-500 rounded-full"
        style={{ opacity, animation: 'float 5s ease-in-out infinite' }}
      />
      <div
        className="absolute bottom-20 right-20 w-16 h-16 bg-purple-500 rounded-full"
        style={{ opacity, animation: 'float 6s ease-in-out infinite', animationDelay: '1s' }}
      />
      {/* Squares */}
      <div
        className="absolute top-1/4 right-1/4 w-12 h-12 bg-pink-500 rounded-lg"
        style={{ opacity, animation: 'rotate 10s linear infinite' }}
      />
      <div
        className="absolute bottom-1/3 left-1/5 w-16 h-16 bg-cyan-500 rounded-lg"
        style={{ opacity, animation: 'rotate 12s linear infinite reverse' }}
      />
      {/* Triangles */}
      <svg className="absolute top-1/2 left-10 w-16 h-16" style={{ opacity, animation: 'float 7s ease-in-out infinite' }}>
        <polygon points="32,0 64,64 0,64" fill="#22c55e" />
      </svg>
      {/* Stars */}
      <svg className="absolute bottom-10 left-1/3 w-12 h-12" style={{ opacity, animation: 'twinkle 3s ease-in-out infinite' }}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#fbbf24" />
      </svg>
    </div>
  );
};

// 15. Neon Shapes
export const NeonShapes: React.FC<AnimatedShapeProps> = ({
  className = '',
  opacity = 0.8,
}) => {
  return (
    <div className={`absolute inset-0 overflow-visible pointer-events-none ${className}`}>
      <div
        className="absolute top-20 left-20 w-24 h-24 rounded-full border-2 border-cyan-400"
        style={{
          opacity,
          boxShadow: '0 0 20px #22d3ee, inset 0 0 20px #22d3ee',
          animation: 'pulse-glow 3s ease-in-out infinite',
        }}
      />
      <div
        className="absolute bottom-20 right-20 w-20 h-20 rounded-lg border-2 border-pink-500"
        style={{
          opacity,
          boxShadow: '0 0 20px #ec4899, inset 0 0 20px #ec4899',
          animation: 'pulse-glow 4s ease-in-out infinite, rotate 15s linear infinite',
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-2 border-purple-500"
        style={{
          opacity: opacity * 0.6,
          boxShadow: '0 0 30px #8b5cf6, inset 0 0 30px #8b5cf6',
          animation: 'pulse-glow 5s ease-in-out infinite',
        }}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// COMPONENTS MAP
// ═══════════════════════════════════════════════════════════════

export const animatedShapeComponents: Record<string, React.FC<any>> = {
  'circle-float-simple': CircleFloatSimple,
  'circle-float-gradient': CircleFloatSimple,
  'circle-pulse': CircleFloatSimple,
  'circle-pulse-glow': CirclePulseGlow,
  'circles-multiple': CirclesMultiple,
  'circles-ripple': CirclesRipple,
  'circles-scatter': CirclesMultiple,
  'circles-bubble': CirclesMultiple,
  'star-float': StarFloat,
  'star-twinkle': StarFloat,
  'stars-scatter': StarsScatter,
  'stars-field': StarsScatter,
  'rect-rotate': RectangleRotate,
  'squares-scatter': SquaresScatter,
  'blob-morph': BlobMorph,
  'blob-gradient': BlobMorph,
  'blobs-multiple': BlobsMultiple,
  'dots-grid': DotsGrid,
  'particles-float': ParticlesFloat,
  'lines-wave': LinesWave,
  'geometric-mix': GeometricMix,
  'neon-shapes': NeonShapes,
};

export default animatedShapeComponents;

