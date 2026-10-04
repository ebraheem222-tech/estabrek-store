import React from 'react';

// ═══════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface FeatureTheme {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  layout: 'grid' | 'list' | 'cards' | 'icons' | 'split' | 'bento' | 'timeline' | 'tabs';
  tags?: string[];
}

export interface FeatureItem {
  id: string | number;
  icon?: React.ReactNode | string;
  title: string;
  description?: string;
  image?: string;
  link?: string;
  badge?: string;
  stats?: string;
}

export interface FeatureSectionProps {
  title?: string;
  subtitle?: string;
  description?: string;
  features: FeatureItem[];
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// 100 FEATURE SECTION THEMES DATA
// ═══════════════════════════════════════════════════════════════

export const featureThemes: FeatureTheme[] = [
  // ═══════════════════════════════════════════════════════════════
  // 🎯 BASIC GRID (1-15)
  // ═══════════════════════════════════════════════════════════════
  { id: 'basic-grid-simple', name: 'Basic Grid Simple', nameAr: 'شبكة أساسية بسيطة', category: 'Basic', layout: 'grid', tags: ['basic', 'grid', 'simple'] },
  { id: 'basic-grid-icons', name: 'Basic Grid Icons', nameAr: 'شبكة أيقونات', category: 'Basic', layout: 'icons', tags: ['basic', 'icons', 'grid'] },
  { id: 'basic-grid-centered', name: 'Basic Grid Centered', nameAr: 'شبكة متوسطة', category: 'Basic', layout: 'grid', tags: ['basic', 'centered'] },
  { id: 'basic-grid-bordered', name: 'Basic Grid Bordered', nameAr: 'شبكة محددة', category: 'Basic', layout: 'grid', tags: ['basic', 'bordered'] },
  { id: 'basic-grid-shadow', name: 'Basic Grid Shadow', nameAr: 'شبكة ظل', category: 'Basic', layout: 'cards', tags: ['basic', 'shadow'] },
  { id: 'basic-list-simple', name: 'Basic List Simple', nameAr: 'قائمة بسيطة', category: 'Basic', layout: 'list', tags: ['basic', 'list'] },
  { id: 'basic-list-icons', name: 'Basic List Icons', nameAr: 'قائمة أيقونات', category: 'Basic', layout: 'list', tags: ['basic', 'list', 'icons'] },
  { id: 'basic-two-column', name: 'Basic Two Column', nameAr: 'عمودين', category: 'Basic', layout: 'grid', tags: ['basic', 'two-column'] },
  { id: 'basic-three-column', name: 'Basic Three Column', nameAr: 'ثلاثة أعمدة', category: 'Basic', layout: 'grid', tags: ['basic', 'three-column'] },
  { id: 'basic-four-column', name: 'Basic Four Column', nameAr: 'أربعة أعمدة', category: 'Basic', layout: 'grid', tags: ['basic', 'four-column'] },
  { id: 'basic-alternating', name: 'Basic Alternating', nameAr: 'متناوب', category: 'Basic', layout: 'list', tags: ['basic', 'alternating', 'zigzag'] },
  { id: 'basic-numbered', name: 'Basic Numbered', nameAr: 'مرقم', category: 'Basic', layout: 'list', tags: ['basic', 'numbered', 'steps'] },
  { id: 'basic-minimal', name: 'Basic Minimal', nameAr: 'بسيط جداً', category: 'Basic', layout: 'grid', tags: ['basic', 'minimal'] },
  { id: 'basic-compact', name: 'Basic Compact', nameAr: 'مضغوط', category: 'Basic', layout: 'grid', tags: ['basic', 'compact'] },
  { id: 'basic-spacious', name: 'Basic Spacious', nameAr: 'واسع', category: 'Basic', layout: 'grid', tags: ['basic', 'spacious'] },

  // ═══════════════════════════════════════════════════════════════
  // 🃏 CARDS (16-30)
  // ═══════════════════════════════════════════════════════════════
  { id: 'cards-simple', name: 'Cards Simple', nameAr: 'بطاقات بسيطة', category: 'Cards', layout: 'cards', tags: ['cards', 'simple'] },
  { id: 'cards-elevated', name: 'Cards Elevated', nameAr: 'بطاقات مرتفعة', category: 'Cards', layout: 'cards', tags: ['cards', 'shadow', 'elevated'] },
  { id: 'cards-bordered', name: 'Cards Bordered', nameAr: 'بطاقات محددة', category: 'Cards', layout: 'cards', tags: ['cards', 'bordered'] },
  { id: 'cards-rounded', name: 'Cards Rounded', nameAr: 'بطاقات دائرية', category: 'Cards', layout: 'cards', tags: ['cards', 'rounded'] },
  { id: 'cards-gradient', name: 'Cards Gradient', nameAr: 'بطاقات متدرجة', category: 'Cards', layout: 'cards', tags: ['cards', 'gradient'] },
  { id: 'cards-glass', name: 'Cards Glass', nameAr: 'بطاقات زجاجية', category: 'Cards', layout: 'cards', tags: ['cards', 'glass', 'blur'] },
  { id: 'cards-hover-lift', name: 'Cards Hover Lift', nameAr: 'بطاقات رفع', category: 'Cards', layout: 'cards', tags: ['cards', 'hover', 'animation'] },
  { id: 'cards-hover-glow', name: 'Cards Hover Glow', nameAr: 'بطاقات توهج', category: 'Cards', layout: 'cards', tags: ['cards', 'hover', 'glow'] },
  { id: 'cards-icon-top', name: 'Cards Icon Top', nameAr: 'بطاقات أيقونة علوية', category: 'Cards', layout: 'cards', tags: ['cards', 'icon'] },
  { id: 'cards-icon-left', name: 'Cards Icon Left', nameAr: 'بطاقات أيقونة يسار', category: 'Cards', layout: 'cards', tags: ['cards', 'icon', 'horizontal'] },
  { id: 'cards-image-top', name: 'Cards Image Top', nameAr: 'بطاقات صورة علوية', category: 'Cards', layout: 'cards', tags: ['cards', 'image'] },
  { id: 'cards-dark', name: 'Cards Dark', nameAr: 'بطاقات داكنة', category: 'Cards', layout: 'cards', tags: ['cards', 'dark'] },
  { id: 'cards-colorful', name: 'Cards Colorful', nameAr: 'بطاقات ملونة', category: 'Cards', layout: 'cards', tags: ['cards', 'colorful'] },
  { id: 'cards-minimal', name: 'Cards Minimal', nameAr: 'بطاقات بسيطة', category: 'Cards', layout: 'cards', tags: ['cards', 'minimal'] },
  { id: 'cards-accent', name: 'Cards Accent', nameAr: 'بطاقات مميزة', category: 'Cards', layout: 'cards', tags: ['cards', 'accent', 'border'] },

  // ═══════════════════════════════════════════════════════════════
  // 🎨 MODERN / CREATIVE (31-48)
  // ═══════════════════════════════════════════════════════════════
  { id: 'modern-bento', name: 'Modern Bento', nameAr: 'حديث بينتو', category: 'Modern', layout: 'bento', tags: ['modern', 'bento', 'grid'] },
  { id: 'modern-bento-alt', name: 'Modern Bento Alt', nameAr: 'حديث بينتو بديل', category: 'Modern', layout: 'bento', tags: ['modern', 'bento'] },
  { id: 'modern-masonry', name: 'Modern Masonry', nameAr: 'حديث ماسونري', category: 'Modern', layout: 'bento', tags: ['modern', 'masonry'] },
  { id: 'modern-glassmorphism', name: 'Modern Glassmorphism', nameAr: 'حديث زجاجي', category: 'Modern', layout: 'cards', tags: ['modern', 'glass', 'blur'] },
  { id: 'modern-neumorphism', name: 'Modern Neumorphism', nameAr: 'حديث نيومورفيزم', category: 'Modern', layout: 'cards', tags: ['modern', 'neumorphism'] },
  { id: 'modern-gradient-border', name: 'Modern Gradient Border', nameAr: 'حديث حد متدرج', category: 'Modern', layout: 'cards', tags: ['modern', 'gradient', 'border'] },
  { id: 'modern-neon', name: 'Modern Neon', nameAr: 'حديث نيون', category: 'Modern', layout: 'cards', tags: ['modern', 'neon', 'glow'] },
  { id: 'modern-3d', name: 'Modern 3D', nameAr: 'حديث ثلاثي الأبعاد', category: 'Modern', layout: 'cards', tags: ['modern', '3d'] },
  { id: 'modern-animated', name: 'Modern Animated', nameAr: 'حديث متحرك', category: 'Modern', layout: 'cards', tags: ['modern', 'animated'] },
  { id: 'modern-floating', name: 'Modern Floating', nameAr: 'حديث عائم', category: 'Modern', layout: 'cards', tags: ['modern', 'floating'] },
  { id: 'modern-stacked', name: 'Modern Stacked', nameAr: 'حديث مكدس', category: 'Modern', layout: 'cards', tags: ['modern', 'stacked'] },
  { id: 'modern-overlap', name: 'Modern Overlap', nameAr: 'حديث متداخل', category: 'Modern', layout: 'cards', tags: ['modern', 'overlap'] },
  { id: 'modern-timeline', name: 'Modern Timeline', nameAr: 'حديث خط زمني', category: 'Modern', layout: 'timeline', tags: ['modern', 'timeline'] },
  { id: 'modern-tabs', name: 'Modern Tabs', nameAr: 'حديث تبويبات', category: 'Modern', layout: 'tabs', tags: ['modern', 'tabs', 'interactive'] },
  { id: 'modern-accordion', name: 'Modern Accordion', nameAr: 'حديث أكورديون', category: 'Modern', layout: 'list', tags: ['modern', 'accordion'] },
  { id: 'modern-reveal', name: 'Modern Reveal', nameAr: 'حديث كشف', category: 'Modern', layout: 'cards', tags: ['modern', 'reveal', 'hover'] },
  { id: 'modern-split-screen', name: 'Modern Split Screen', nameAr: 'حديث شاشة منقسمة', category: 'Modern', layout: 'split', tags: ['modern', 'split'] },
  { id: 'modern-asymmetric', name: 'Modern Asymmetric', nameAr: 'حديث غير متماثل', category: 'Modern', layout: 'bento', tags: ['modern', 'asymmetric'] },

  // ═══════════════════════════════════════════════════════════════
  // 🚀 TECH / SAAS (49-62)
  // ═══════════════════════════════════════════════════════════════
  { id: 'tech-gradient', name: 'Tech Gradient', nameAr: 'تقني متدرج', category: 'Tech', layout: 'cards', tags: ['tech', 'gradient', 'saas'] },
  { id: 'tech-dark', name: 'Tech Dark', nameAr: 'تقني داكن', category: 'Tech', layout: 'cards', tags: ['tech', 'dark'] },
  { id: 'tech-terminal', name: 'Tech Terminal', nameAr: 'تقني طرفية', category: 'Tech', layout: 'cards', tags: ['tech', 'terminal', 'code'] },
  { id: 'tech-api', name: 'Tech API', nameAr: 'تقني API', category: 'Tech', layout: 'list', tags: ['tech', 'api', 'developer'] },
  { id: 'tech-dashboard', name: 'Tech Dashboard', nameAr: 'تقني لوحة تحكم', category: 'Tech', layout: 'bento', tags: ['tech', 'dashboard'] },
  { id: 'tech-pricing-features', name: 'Tech Pricing Features', nameAr: 'تقني ميزات الأسعار', category: 'Tech', layout: 'list', tags: ['tech', 'pricing', 'checklist'] },
  { id: 'tech-comparison', name: 'Tech Comparison', nameAr: 'تقني مقارنة', category: 'Tech', layout: 'grid', tags: ['tech', 'comparison', 'table'] },
  { id: 'tech-integrations', name: 'Tech Integrations', nameAr: 'تقني تكاملات', category: 'Tech', layout: 'icons', tags: ['tech', 'integrations', 'logos'] },
  { id: 'tech-stats', name: 'Tech Stats', nameAr: 'تقني إحصائيات', category: 'Tech', layout: 'grid', tags: ['tech', 'stats', 'numbers'] },
  { id: 'tech-workflow', name: 'Tech Workflow', nameAr: 'تقني سير عمل', category: 'Tech', layout: 'timeline', tags: ['tech', 'workflow', 'steps'] },
  { id: 'tech-security', name: 'Tech Security', nameAr: 'تقني أمان', category: 'Tech', layout: 'cards', tags: ['tech', 'security'] },
  { id: 'tech-ai', name: 'Tech AI', nameAr: 'تقني ذكاء اصطناعي', category: 'Tech', layout: 'cards', tags: ['tech', 'ai', 'ml'] },
  { id: 'tech-cloud', name: 'Tech Cloud', nameAr: 'تقني سحابة', category: 'Tech', layout: 'cards', tags: ['tech', 'cloud'] },
  { id: 'tech-mobile', name: 'Tech Mobile', nameAr: 'تقني موبايل', category: 'Tech', layout: 'split', tags: ['tech', 'mobile', 'app'] },

  // ═══════════════════════════════════════════════════════════════
  // 🛒 E-COMMERCE (63-72)
  // ═══════════════════════════════════════════════════════════════
  { id: 'ecommerce-benefits', name: 'E-commerce Benefits', nameAr: 'متجر فوائد', category: 'E-commerce', layout: 'icons', tags: ['ecommerce', 'benefits'] },
  { id: 'ecommerce-shipping', name: 'E-commerce Shipping', nameAr: 'متجر شحن', category: 'E-commerce', layout: 'icons', tags: ['ecommerce', 'shipping'] },
  { id: 'ecommerce-trust', name: 'E-commerce Trust', nameAr: 'متجر ثقة', category: 'E-commerce', layout: 'grid', tags: ['ecommerce', 'trust', 'badges'] },
  { id: 'ecommerce-categories', name: 'E-commerce Categories', nameAr: 'متجر فئات', category: 'E-commerce', layout: 'cards', tags: ['ecommerce', 'categories'] },
  { id: 'ecommerce-services', name: 'E-commerce Services', nameAr: 'متجر خدمات', category: 'E-commerce', layout: 'cards', tags: ['ecommerce', 'services'] },
  { id: 'ecommerce-promo', name: 'E-commerce Promo', nameAr: 'متجر ترويج', category: 'E-commerce', layout: 'bento', tags: ['ecommerce', 'promo', 'banner'] },
  { id: 'ecommerce-why-us', name: 'E-commerce Why Us', nameAr: 'متجر لماذا نحن', category: 'E-commerce', layout: 'cards', tags: ['ecommerce', 'why-us'] },
  { id: 'ecommerce-luxury', name: 'E-commerce Luxury', nameAr: 'متجر فاخر', category: 'E-commerce', layout: 'cards', tags: ['ecommerce', 'luxury', 'premium'] },
  { id: 'ecommerce-minimal', name: 'E-commerce Minimal', nameAr: 'متجر بسيط', category: 'E-commerce', layout: 'grid', tags: ['ecommerce', 'minimal'] },
  { id: 'ecommerce-fashion', name: 'E-commerce Fashion', nameAr: 'متجر أزياء', category: 'E-commerce', layout: 'cards', tags: ['ecommerce', 'fashion'] },

  // ═══════════════════════════════════════════════════════════════
  // 🏢 CORPORATE (73-82)
  // ═══════════════════════════════════════════════════════════════
  { id: 'corporate-services', name: 'Corporate Services', nameAr: 'شركات خدمات', category: 'Corporate', layout: 'cards', tags: ['corporate', 'services'] },
  { id: 'corporate-values', name: 'Corporate Values', nameAr: 'شركات قيم', category: 'Corporate', layout: 'grid', tags: ['corporate', 'values'] },
  { id: 'corporate-process', name: 'Corporate Process', nameAr: 'شركات عملية', category: 'Corporate', layout: 'timeline', tags: ['corporate', 'process', 'steps'] },
  { id: 'corporate-stats', name: 'Corporate Stats', nameAr: 'شركات إحصائيات', category: 'Corporate', layout: 'grid', tags: ['corporate', 'stats', 'numbers'] },
  { id: 'corporate-benefits', name: 'Corporate Benefits', nameAr: 'شركات فوائد', category: 'Corporate', layout: 'cards', tags: ['corporate', 'benefits'] },
  { id: 'corporate-solutions', name: 'Corporate Solutions', nameAr: 'شركات حلول', category: 'Corporate', layout: 'cards', tags: ['corporate', 'solutions'] },
  { id: 'corporate-industries', name: 'Corporate Industries', nameAr: 'شركات صناعات', category: 'Corporate', layout: 'icons', tags: ['corporate', 'industries'] },
  { id: 'corporate-consulting', name: 'Corporate Consulting', nameAr: 'شركات استشارات', category: 'Corporate', layout: 'cards', tags: ['corporate', 'consulting'] },
  { id: 'corporate-finance', name: 'Corporate Finance', nameAr: 'شركات مالية', category: 'Corporate', layout: 'cards', tags: ['corporate', 'finance'] },
  { id: 'corporate-legal', name: 'Corporate Legal', nameAr: 'شركات قانونية', category: 'Corporate', layout: 'list', tags: ['corporate', 'legal'] },

  // ═══════════════════════════════════════════════════════════════
  // 🎨 CREATIVE / AGENCY (83-90)
  // ═══════════════════════════════════════════════════════════════
  { id: 'creative-services', name: 'Creative Services', nameAr: 'إبداعي خدمات', category: 'Creative', layout: 'cards', tags: ['creative', 'services', 'agency'] },
  { id: 'creative-portfolio', name: 'Creative Portfolio', nameAr: 'إبداعي معرض', category: 'Creative', layout: 'bento', tags: ['creative', 'portfolio'] },
  { id: 'creative-process', name: 'Creative Process', nameAr: 'إبداعي عملية', category: 'Creative', layout: 'timeline', tags: ['creative', 'process'] },
  { id: 'creative-skills', name: 'Creative Skills', nameAr: 'إبداعي مهارات', category: 'Creative', layout: 'grid', tags: ['creative', 'skills'] },
  { id: 'creative-bold', name: 'Creative Bold', nameAr: 'إبداعي جريء', category: 'Creative', layout: 'cards', tags: ['creative', 'bold'] },
  { id: 'creative-minimal', name: 'Creative Minimal', nameAr: 'إبداعي بسيط', category: 'Creative', layout: 'grid', tags: ['creative', 'minimal'] },
  { id: 'creative-dark', name: 'Creative Dark', nameAr: 'إبداعي داكن', category: 'Creative', layout: 'cards', tags: ['creative', 'dark'] },
  { id: 'creative-colorful', name: 'Creative Colorful', nameAr: 'إبداعي ملون', category: 'Creative', layout: 'cards', tags: ['creative', 'colorful'] },

  // ═══════════════════════════════════════════════════════════════
  // 🎮 GAMING (91-95)
  // ═══════════════════════════════════════════════════════════════
  { id: 'gaming-features', name: 'Gaming Features', nameAr: 'ألعاب ميزات', category: 'Gaming', layout: 'cards', tags: ['gaming', 'features'] },
  { id: 'gaming-neon', name: 'Gaming Neon', nameAr: 'ألعاب نيون', category: 'Gaming', layout: 'cards', tags: ['gaming', 'neon'] },
  { id: 'gaming-cyberpunk', name: 'Gaming Cyberpunk', nameAr: 'ألعاب سايبربانك', category: 'Gaming', layout: 'cards', tags: ['gaming', 'cyberpunk'] },
  { id: 'gaming-retro', name: 'Gaming Retro', nameAr: 'ألعاب ريترو', category: 'Gaming', layout: 'cards', tags: ['gaming', 'retro'] },
  { id: 'gaming-esports', name: 'Gaming Esports', nameAr: 'ألعاب رياضات', category: 'Gaming', layout: 'cards', tags: ['gaming', 'esports'] },

  // ═══════════════════════════════════════════════════════════════
  // 🍔 FOOD & TRAVEL (96-100)
  // ═══════════════════════════════════════════════════════════════
  { id: 'food-features', name: 'Food Features', nameAr: 'طعام ميزات', category: 'Food', layout: 'icons', tags: ['food', 'restaurant'] },
  { id: 'food-services', name: 'Food Services', nameAr: 'طعام خدمات', category: 'Food', layout: 'cards', tags: ['food', 'services'] },
  { id: 'travel-features', name: 'Travel Features', nameAr: 'سفر ميزات', category: 'Travel', layout: 'icons', tags: ['travel', 'features'] },
  { id: 'travel-services', name: 'Travel Services', nameAr: 'سفر خدمات', category: 'Travel', layout: 'cards', tags: ['travel', 'services'] },
  { id: 'travel-destinations', name: 'Travel Destinations', nameAr: 'سفر وجهات', category: 'Travel', layout: 'cards', tags: ['travel', 'destinations'] },
];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const featureCategories = [...new Set(featureThemes.map(t => t.category))];

export const getFeatureTheme = (themeId: string): FeatureTheme | undefined => {
  return featureThemes.find(t => t.id === themeId);
};

export const getFeaturesByCategory = (category: string): FeatureTheme[] => {
  return featureThemes.filter(t => t.category === category);
};

export const getFeaturesByTag = (tag: string): FeatureTheme[] => {
  return featureThemes.filter(t => t.tags?.includes(tag));
};

// ═══════════════════════════════════════════════════════════════
// DEFAULT ICONS
// ═══════════════════════════════════════════════════════════════

const DefaultIcons = {
  check: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  star: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
  lightning: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  shield: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  globe: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  chart: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
};

const iconArray = [DefaultIcons.check, DefaultIcons.star, DefaultIcons.lightning, DefaultIcons.shield, DefaultIcons.globe, DefaultIcons.chart];

// ═══════════════════════════════════════════════════════════════
// FEATURE SECTION COMPONENTS
// ═══════════════════════════════════════════════════════════════

// 1. Basic Grid Simple
export const FeatureBasicGridSimple: React.FC<FeatureSectionProps> = ({
  title,
  subtitle,
  description,
  features,
  columns = 3,
  className = '',
}) => {
  return (
    <section className={`py-16 px-4 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-blue-600 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{title}</h2>}
            {description && <p className="text-gray-600 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-8`}>
          {features.map((feature, index) => (
            <div key={feature.id} className="text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                {feature.icon || iconArray[index % iconArray.length]}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              {feature.description && <p className="text-gray-600">{feature.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// 2. Basic Grid with Icons (Left Aligned)
export const FeatureBasicGridIcons: React.FC<FeatureSectionProps> = ({
  title,
  subtitle,
  description,
  features,
  columns = 3,
  className = '',
}) => {
  return (
    <section className={`py-16 px-4 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-blue-600 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{title}</h2>}
            {description && <p className="text-gray-600 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-8`}>
          {features.map((feature, index) => (
            <div key={feature.id} className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center">
                {feature.icon || iconArray[index % iconArray.length]}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{feature.title}</h3>
                {feature.description && <p className="text-gray-600 text-sm">{feature.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// 3. Cards Elevated
export const FeatureCardsElevated: React.FC<FeatureSectionProps> = ({
  title,
  subtitle,
  description,
  features,
  columns = 3,
  className = '',
}) => {
  return (
    <section className={`py-16 px-4 bg-gray-50 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-blue-600 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{title}</h2>}
            {description && <p className="text-gray-600 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-8`}>
          {features.map((feature, index) => (
            <div key={feature.id} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl flex items-center justify-center mb-4">
                {feature.icon || iconArray[index % iconArray.length]}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
              {feature.description && <p className="text-gray-600">{feature.description}</p>}
              {feature.link && (
                <a href={feature.link} className="inline-flex items-center text-blue-600 font-medium mt-4 hover:underline">
                  Learn more →
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// 4. Cards Glass
export const FeatureCardsGlass: React.FC<FeatureSectionProps> = ({
  title,
  subtitle,
  description,
  features,
  columns = 3,
  className = '',
}) => {
  return (
    <section className={`py-16 px-4 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-white/80 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{title}</h2>}
            {description && <p className="text-white/80 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
          {features.map((feature, index) => (
            <div key={feature.id} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-white/20 text-white rounded-xl flex items-center justify-center mb-4">
                {feature.icon || iconArray[index % iconArray.length]}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              {feature.description && <p className="text-white/80">{feature.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// 5. Modern Bento Grid
export const FeatureModernBento: React.FC<FeatureSectionProps> = ({
  title,
  subtitle,
  description,
  features,
  className = '',
}) => {
  return (
    <section className={`py-16 px-4 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-blue-600 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{title}</h2>}
            {description && <p className="text-gray-600 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[200px]">
          {features.slice(0, 6).map((feature, index) => {
            const isLarge = index === 0 || index === 3;
            return (
              <div 
                key={feature.id} 
                className={`bg-gray-100 rounded-2xl p-6 flex flex-col justify-between ${isLarge ? 'md:col-span-2 md:row-span-2' : ''}`}
              >
                <div className="w-12 h-12 bg-white text-gray-900 rounded-xl flex items-center justify-center shadow-sm">
                  {feature.icon || iconArray[index % iconArray.length]}
                </div>
                <div>
                  <h3 className={`font-semibold text-gray-900 mb-1 ${isLarge ? 'text-2xl' : 'text-lg'}`}>{feature.title}</h3>
                  {feature.description && <p className="text-gray-600 text-sm">{feature.description}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// 6. Tech Gradient
export const FeatureTechGradient: React.FC<FeatureSectionProps> = ({
  title,
  subtitle,
  description,
  features,
  columns = 3,
  className = '',
}) => {
  const gradients = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-orange-500 to-red-500',
    'from-green-500 to-emerald-500',
    'from-indigo-500 to-purple-500',
    'from-pink-500 to-rose-500',
  ];

  return (
    <section className={`py-16 px-4 bg-gray-900 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-cyan-400 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{title}</h2>}
            {description && <p className="text-gray-400 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
          {features.map((feature, index) => (
            <div key={feature.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors">
              <div className={`w-12 h-12 bg-gradient-to-br ${gradients[index % gradients.length]} rounded-lg flex items-center justify-center text-white mb-4`}>
                {feature.icon || iconArray[index % iconArray.length]}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              {feature.description && <p className="text-gray-400">{feature.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// 7. Modern Timeline
export const FeatureModernTimeline: React.FC<FeatureSectionProps> = ({
  title,
  subtitle,
  description,
  features,
  className = '',
}) => {
  return (
    <section className={`py-16 px-4 ${className}`}>
      <div className="max-w-4xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-blue-600 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{title}</h2>}
            {description && <p className="text-gray-600 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className="relative">
          {/* Line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />
          
          <div className="space-y-8">
            {features.map((feature, index) => (
              <div key={feature.id} className="relative pl-20">
                {/* Number */}
                <div className="absolute left-0 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                  {index + 1}
                </div>
                <div className="bg-white rounded-xl p-6 shadow-md">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  {feature.description && <p className="text-gray-600">{feature.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// 8. E-commerce Benefits (Icons Strip)
export const FeatureEcommerceBenefits: React.FC<FeatureSectionProps> = ({
  features,
  className = '',
}) => {
  return (
    <section className={`py-8 px-4 bg-gray-100 ${className}`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap justify-center gap-8 md:gap-16">
          {features.map((feature, index) => (
            <div key={feature.id} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-sm">
                {feature.icon || iconArray[index % iconArray.length]}
              </div>
              <span className="text-gray-700 font-medium">{feature.title}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// 9. Gaming Neon
export const FeatureGamingNeon: React.FC<FeatureSectionProps> = ({
  title,
  subtitle,
  description,
  features,
  columns = 3,
  className = '',
}) => {
  const neonColors = [
    { border: 'border-cyan-500', shadow: 'shadow-cyan-500/50', text: 'text-cyan-400' },
    { border: 'border-pink-500', shadow: 'shadow-pink-500/50', text: 'text-pink-400' },
    { border: 'border-purple-500', shadow: 'shadow-purple-500/50', text: 'text-purple-400' },
    { border: 'border-green-500', shadow: 'shadow-green-500/50', text: 'text-green-400' },
    { border: 'border-yellow-500', shadow: 'shadow-yellow-500/50', text: 'text-yellow-400' },
    { border: 'border-red-500', shadow: 'shadow-red-500/50', text: 'text-red-400' },
  ];

  return (
    <section className={`py-16 px-4 bg-gray-950 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-cyan-400 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 mb-4">{title}</h2>}
            {description && <p className="text-gray-400 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
          {features.map((feature, index) => {
            const neon = neonColors[index % neonColors.length];
            return (
              <div 
                key={feature.id} 
                className={`bg-gray-900 rounded-xl p-6 border ${neon.border} shadow-lg ${neon.shadow}`}
              >
                <div className={`w-12 h-12 border ${neon.border} ${neon.text} rounded-lg flex items-center justify-center mb-4`}>
                  {feature.icon || iconArray[index % iconArray.length]}
                </div>
                <h3 className={`text-xl font-bold ${neon.text} mb-2`}>{feature.title}</h3>
                {feature.description && <p className="text-gray-400">{feature.description}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// 10. Corporate Stats
export const FeatureCorporateStats: React.FC<FeatureSectionProps> = ({
  title,
  subtitle,
  description,
  features,
  className = '',
}) => {
  return (
    <section className={`py-16 px-4 bg-blue-600 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-blue-200 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{title}</h2>}
            {description && <p className="text-blue-100 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {features.map((feature) => (
            <div key={feature.id} className="text-center">
              <p className="text-4xl md:text-5xl font-bold text-white mb-2">{feature.stats || feature.title}</p>
              <p className="text-blue-200">{feature.description || feature.title}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// 11. Creative Bold
export const FeatureCreativeBold: React.FC<FeatureSectionProps> = ({
  title,
  subtitle,
  description,
  features,
  className = '',
}) => {
  const colors = ['bg-yellow-400', 'bg-pink-500', 'bg-cyan-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500'];

  return (
    <section className={`py-16 px-4 bg-black ${className}`}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-gray-400 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-4xl md:text-6xl font-black text-white mb-4">{title}</h2>}
            {description && <p className="text-gray-400 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
          {features.map((feature, index) => (
            <div 
              key={feature.id} 
              className={`${colors[index % colors.length]} p-8 ${index % 2 === 0 ? 'text-black' : 'text-white'}`}
            >
              <h3 className="text-2xl font-black mb-2">{feature.title}</h3>
              {feature.description && <p className="opacity-80">{feature.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// 12. Split Screen with Image
export const FeatureSplitScreen: React.FC<FeatureSectionProps & { image?: string }> = ({
  title,
  subtitle,
  description,
  features,
  image,
  className = '',
}) => {
  return (
    <section className={`py-16 px-4 ${className}`}>
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            {subtitle && <p className="text-blue-600 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{title}</h2>}
            {description && <p className="text-gray-600 mb-8">{description}</p>}
            
            <div className="space-y-6">
              {features.map((feature, index) => (
                <div key={feature.id} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    {feature.icon || iconArray[index % iconArray.length]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                    {feature.description && <p className="text-gray-600 text-sm">{feature.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Image */}
          <div className="relative">
            {image ? (
              <img src={image} alt="" className="rounded-2xl shadow-2xl" />
            ) : (
              <div className="aspect-square bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════
// COMPONENTS MAP
// ═══════════════════════════════════════════════════════════════

export const featureComponents: Record<string, React.FC<any>> = {
  'basic-grid-simple': FeatureBasicGridSimple,
  'basic-grid-icons': FeatureBasicGridIcons,
  'basic-grid-centered': FeatureBasicGridSimple,
  'basic-three-column': FeatureBasicGridSimple,
  'basic-four-column': FeatureBasicGridSimple,
  'basic-list-icons': FeatureBasicGridIcons,
  'cards-simple': FeatureCardsElevated,
  'cards-elevated': FeatureCardsElevated,
  'cards-glass': FeatureCardsGlass,
  'modern-bento': FeatureModernBento,
  'modern-glassmorphism': FeatureCardsGlass,
  'modern-timeline': FeatureModernTimeline,
  'tech-gradient': FeatureTechGradient,
  'tech-dark': FeatureTechGradient,
  'ecommerce-benefits': FeatureEcommerceBenefits,
  'gaming-neon': FeatureGamingNeon,
  'gaming-cyberpunk': FeatureGamingNeon,
  'corporate-stats': FeatureCorporateStats,
  'creative-bold': FeatureCreativeBold,
  'tech-mobile': FeatureSplitScreen,
  'modern-split-screen': FeatureSplitScreen,
};

export default featureComponents;
