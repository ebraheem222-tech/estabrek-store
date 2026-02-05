"use client";

import React from 'react';

// ═══════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface PricingTheme {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  style: 'cards' | 'table' | 'toggle' | 'comparison' | 'minimal' | 'feature-list';
  tags?: string[];
}

export interface PricingFeature {
  text: string;
  included: boolean;
  tooltip?: string;
}

export interface PricingPlan {
  id: string | number;
  name: string;
  description?: string;
  price: number | string;
  originalPrice?: number | string;
  period?: string;
  currency?: string;
  badge?: string;
  popular?: boolean;
  features: (string | PricingFeature)[];
  buttonText?: string;
  buttonVariant?: 'primary' | 'secondary' | 'outline';
  onSelect?: () => void;
  buttonHref?: string;
}

export interface PricingTableProps {
  title?: string;
  subtitle?: string;
  description?: string;
  plans: PricingPlan[];
  billingToggle?: boolean;
  onBillingChange?: (isAnnual: boolean) => void;
  className?: string;
}

function handlePlanSelect(plan: PricingPlan) {
  if (plan.onSelect) {
    plan.onSelect();
    return;
  }
  if (plan.buttonHref && typeof window !== "undefined") {
    window.location.href = plan.buttonHref;
  }
}

// ═══════════════════════════════════════════════════════════════
// 100 PRICING TABLE THEMES DATA
// ═══════════════════════════════════════════════════════════════

export const pricingThemes: PricingTheme[] = [
  // ═══════════════════════════════════════════════════════════════
  // 🎯 BASIC CARDS (1-15)
  // ═══════════════════════════════════════════════════════════════
  { id: 'basic-simple', name: 'Basic Simple', nameAr: 'أساسي بسيط', category: 'Basic', style: 'cards', tags: ['basic', 'simple', 'clean'] },
  { id: 'basic-bordered', name: 'Basic Bordered', nameAr: 'أساسي محدد', category: 'Basic', style: 'cards', tags: ['basic', 'bordered'] },
  { id: 'basic-shadow', name: 'Basic Shadow', nameAr: 'أساسي ظل', category: 'Basic', style: 'cards', tags: ['basic', 'shadow'] },
  { id: 'basic-rounded', name: 'Basic Rounded', nameAr: 'أساسي دائري', category: 'Basic', style: 'cards', tags: ['basic', 'rounded'] },
  { id: 'basic-flat', name: 'Basic Flat', nameAr: 'أساسي مسطح', category: 'Basic', style: 'cards', tags: ['basic', 'flat'] },
  { id: 'basic-minimal', name: 'Basic Minimal', nameAr: 'أساسي بسيط', category: 'Basic', style: 'minimal', tags: ['basic', 'minimal'] },
  { id: 'basic-centered', name: 'Basic Centered', nameAr: 'أساسي متوسط', category: 'Basic', style: 'cards', tags: ['basic', 'centered'] },
  { id: 'basic-horizontal', name: 'Basic Horizontal', nameAr: 'أساسي أفقي', category: 'Basic', style: 'cards', tags: ['basic', 'horizontal'] },
  { id: 'basic-compact', name: 'Basic Compact', nameAr: 'أساسي مضغوط', category: 'Basic', style: 'cards', tags: ['basic', 'compact'] },
  { id: 'basic-spacious', name: 'Basic Spacious', nameAr: 'أساسي واسع', category: 'Basic', style: 'cards', tags: ['basic', 'spacious'] },
  { id: 'basic-with-toggle', name: 'Basic With Toggle', nameAr: 'أساسي مع تبديل', category: 'Basic', style: 'toggle', tags: ['basic', 'toggle', 'billing'] },
  { id: 'basic-with-badge', name: 'Basic With Badge', nameAr: 'أساسي مع شارة', category: 'Basic', style: 'cards', tags: ['basic', 'badge', 'popular'] },
  { id: 'basic-highlighted', name: 'Basic Highlighted', nameAr: 'أساسي مميز', category: 'Basic', style: 'cards', tags: ['basic', 'highlighted'] },
  { id: 'basic-gradient-header', name: 'Basic Gradient Header', nameAr: 'أساسي رأس متدرج', category: 'Basic', style: 'cards', tags: ['basic', 'gradient'] },
  { id: 'basic-icon-header', name: 'Basic Icon Header', nameAr: 'أساسي رأس أيقونة', category: 'Basic', style: 'cards', tags: ['basic', 'icon'] },

  // ═══════════════════════════════════════════════════════════════
  // 🎨 MODERN / CREATIVE (16-35)
  // ═══════════════════════════════════════════════════════════════
  { id: 'modern-glass', name: 'Modern Glass', nameAr: 'حديث زجاجي', category: 'Modern', style: 'cards', tags: ['modern', 'glass', 'blur'] },
  { id: 'modern-gradient', name: 'Modern Gradient', nameAr: 'حديث متدرج', category: 'Modern', style: 'cards', tags: ['modern', 'gradient'] },
  { id: 'modern-neon', name: 'Modern Neon', nameAr: 'حديث نيون', category: 'Modern', style: 'cards', tags: ['modern', 'neon', 'glow'] },
  { id: 'modern-neumorphism', name: 'Modern Neumorphism', nameAr: 'حديث نيومورفيزم', category: 'Modern', style: 'cards', tags: ['modern', 'neumorphism'] },
  { id: 'modern-3d', name: 'Modern 3D', nameAr: 'حديث ثلاثي الأبعاد', category: 'Modern', style: 'cards', tags: ['modern', '3d'] },
  { id: 'modern-floating', name: 'Modern Floating', nameAr: 'حديث عائم', category: 'Modern', style: 'cards', tags: ['modern', 'floating'] },
  { id: 'modern-stacked', name: 'Modern Stacked', nameAr: 'حديث مكدس', category: 'Modern', style: 'cards', tags: ['modern', 'stacked'] },
  { id: 'modern-overlap', name: 'Modern Overlap', nameAr: 'حديث متداخل', category: 'Modern', style: 'cards', tags: ['modern', 'overlap'] },
  { id: 'modern-gradient-border', name: 'Modern Gradient Border', nameAr: 'حديث حد متدرج', category: 'Modern', style: 'cards', tags: ['modern', 'gradient', 'border'] },
  { id: 'modern-animated', name: 'Modern Animated', nameAr: 'حديث متحرك', category: 'Modern', style: 'cards', tags: ['modern', 'animated'] },
  { id: 'modern-dark', name: 'Modern Dark', nameAr: 'حديث داكن', category: 'Modern', style: 'cards', tags: ['modern', 'dark'] },
  { id: 'modern-light', name: 'Modern Light', nameAr: 'حديث فاتح', category: 'Modern', style: 'cards', tags: ['modern', 'light'] },
  { id: 'modern-colorful', name: 'Modern Colorful', nameAr: 'حديث ملون', category: 'Modern', style: 'cards', tags: ['modern', 'colorful'] },
  { id: 'modern-monochrome', name: 'Modern Monochrome', nameAr: 'حديث أحادي', category: 'Modern', style: 'cards', tags: ['modern', 'monochrome'] },
  { id: 'modern-split', name: 'Modern Split', nameAr: 'حديث منقسم', category: 'Modern', style: 'cards', tags: ['modern', 'split'] },
  { id: 'modern-timeline', name: 'Modern Timeline', nameAr: 'حديث خط زمني', category: 'Modern', style: 'cards', tags: ['modern', 'timeline'] },
  { id: 'modern-tabs', name: 'Modern Tabs', nameAr: 'حديث تبويبات', category: 'Modern', style: 'toggle', tags: ['modern', 'tabs'] },
  { id: 'modern-slider', name: 'Modern Slider', nameAr: 'حديث منزلق', category: 'Modern', style: 'cards', tags: ['modern', 'slider'] },
  { id: 'modern-accordion', name: 'Modern Accordion', nameAr: 'حديث أكورديون', category: 'Modern', style: 'cards', tags: ['modern', 'accordion'] },
  { id: 'modern-magazine', name: 'Modern Magazine', nameAr: 'حديث مجلة', category: 'Modern', style: 'cards', tags: ['modern', 'magazine'] },

  // ═══════════════════════════════════════════════════════════════
  // 🚀 TECH / SAAS (36-55)
  // ═══════════════════════════════════════════════════════════════
  { id: 'tech-startup', name: 'Tech Startup', nameAr: 'تقني ستارتب', category: 'Tech', style: 'cards', tags: ['tech', 'startup', 'saas'] },
  { id: 'tech-enterprise', name: 'Tech Enterprise', nameAr: 'تقني مؤسسي', category: 'Tech', style: 'cards', tags: ['tech', 'enterprise'] },
  { id: 'tech-developer', name: 'Tech Developer', nameAr: 'تقني مطور', category: 'Tech', style: 'cards', tags: ['tech', 'developer', 'api'] },
  { id: 'tech-cloud', name: 'Tech Cloud', nameAr: 'تقني سحابي', category: 'Tech', style: 'cards', tags: ['tech', 'cloud', 'hosting'] },
  { id: 'tech-api', name: 'Tech API', nameAr: 'تقني API', category: 'Tech', style: 'cards', tags: ['tech', 'api'] },
  { id: 'tech-usage-based', name: 'Tech Usage Based', nameAr: 'تقني حسب الاستخدام', category: 'Tech', style: 'cards', tags: ['tech', 'usage', 'metered'] },
  { id: 'tech-freemium', name: 'Tech Freemium', nameAr: 'تقني فريميوم', category: 'Tech', style: 'cards', tags: ['tech', 'freemium', 'free'] },
  { id: 'tech-comparison', name: 'Tech Comparison', nameAr: 'تقني مقارنة', category: 'Tech', style: 'comparison', tags: ['tech', 'comparison', 'table'] },
  { id: 'tech-feature-matrix', name: 'Tech Feature Matrix', nameAr: 'تقني مصفوفة', category: 'Tech', style: 'table', tags: ['tech', 'matrix', 'features'] },
  { id: 'tech-tier-based', name: 'Tech Tier Based', nameAr: 'تقني مستويات', category: 'Tech', style: 'cards', tags: ['tech', 'tiers'] },
  { id: 'tech-gradient-dark', name: 'Tech Gradient Dark', nameAr: 'تقني متدرج داكن', category: 'Tech', style: 'cards', tags: ['tech', 'gradient', 'dark'] },
  { id: 'tech-terminal', name: 'Tech Terminal', nameAr: 'تقني طرفية', category: 'Tech', style: 'cards', tags: ['tech', 'terminal', 'code'] },
  { id: 'tech-dashboard', name: 'Tech Dashboard', nameAr: 'تقني لوحة تحكم', category: 'Tech', style: 'cards', tags: ['tech', 'dashboard'] },
  { id: 'tech-analytics', name: 'Tech Analytics', nameAr: 'تقني تحليلات', category: 'Tech', style: 'cards', tags: ['tech', 'analytics'] },
  { id: 'tech-security', name: 'Tech Security', nameAr: 'تقني أمان', category: 'Tech', style: 'cards', tags: ['tech', 'security'] },
  { id: 'tech-ai', name: 'Tech AI', nameAr: 'تقني ذكاء اصطناعي', category: 'Tech', style: 'cards', tags: ['tech', 'ai', 'ml'] },
  { id: 'tech-storage', name: 'Tech Storage', nameAr: 'تقني تخزين', category: 'Tech', style: 'cards', tags: ['tech', 'storage'] },
  { id: 'tech-bandwidth', name: 'Tech Bandwidth', nameAr: 'تقني نطاق', category: 'Tech', style: 'cards', tags: ['tech', 'bandwidth'] },
  { id: 'tech-seats', name: 'Tech Seats', nameAr: 'تقني مقاعد', category: 'Tech', style: 'cards', tags: ['tech', 'seats', 'users'] },
  { id: 'tech-credits', name: 'Tech Credits', nameAr: 'تقني رصيد', category: 'Tech', style: 'cards', tags: ['tech', 'credits', 'tokens'] },

  // ═══════════════════════════════════════════════════════════════
  // 🛒 E-COMMERCE (56-68)
  // ═══════════════════════════════════════════════════════════════
  { id: 'ecommerce-subscription', name: 'E-commerce Subscription', nameAr: 'متجر اشتراك', category: 'E-commerce', style: 'cards', tags: ['ecommerce', 'subscription'] },
  { id: 'ecommerce-membership', name: 'E-commerce Membership', nameAr: 'متجر عضوية', category: 'E-commerce', style: 'cards', tags: ['ecommerce', 'membership'] },
  { id: 'ecommerce-vip', name: 'E-commerce VIP', nameAr: 'متجر VIP', category: 'E-commerce', style: 'cards', tags: ['ecommerce', 'vip', 'premium'] },
  { id: 'ecommerce-bundle', name: 'E-commerce Bundle', nameAr: 'متجر باقة', category: 'E-commerce', style: 'cards', tags: ['ecommerce', 'bundle', 'package'] },
  { id: 'ecommerce-loyalty', name: 'E-commerce Loyalty', nameAr: 'متجر ولاء', category: 'E-commerce', style: 'cards', tags: ['ecommerce', 'loyalty', 'rewards'] },
  { id: 'ecommerce-discount', name: 'E-commerce Discount', nameAr: 'متجر خصم', category: 'E-commerce', style: 'cards', tags: ['ecommerce', 'discount', 'sale'] },
  { id: 'ecommerce-luxury', name: 'E-commerce Luxury', nameAr: 'متجر فاخر', category: 'E-commerce', style: 'cards', tags: ['ecommerce', 'luxury'] },
  { id: 'ecommerce-minimal', name: 'E-commerce Minimal', nameAr: 'متجر بسيط', category: 'E-commerce', style: 'minimal', tags: ['ecommerce', 'minimal'] },
  { id: 'ecommerce-fashion', name: 'E-commerce Fashion', nameAr: 'متجر أزياء', category: 'E-commerce', style: 'cards', tags: ['ecommerce', 'fashion'] },
  { id: 'ecommerce-beauty', name: 'E-commerce Beauty', nameAr: 'متجر تجميل', category: 'E-commerce', style: 'cards', tags: ['ecommerce', 'beauty'] },
  { id: 'ecommerce-food', name: 'E-commerce Food', nameAr: 'متجر طعام', category: 'E-commerce', style: 'cards', tags: ['ecommerce', 'food', 'delivery'] },
  { id: 'ecommerce-digital', name: 'E-commerce Digital', nameAr: 'متجر رقمي', category: 'E-commerce', style: 'cards', tags: ['ecommerce', 'digital', 'download'] },
  { id: 'ecommerce-service', name: 'E-commerce Service', nameAr: 'متجر خدمات', category: 'E-commerce', style: 'cards', tags: ['ecommerce', 'service'] },

  // ═══════════════════════════════════════════════════════════════
  // 🏢 CORPORATE (69-78)
  // ═══════════════════════════════════════════════════════════════
  { id: 'corporate-professional', name: 'Corporate Professional', nameAr: 'شركات احترافي', category: 'Corporate', style: 'cards', tags: ['corporate', 'professional'] },
  { id: 'corporate-enterprise', name: 'Corporate Enterprise', nameAr: 'شركات مؤسسي', category: 'Corporate', style: 'cards', tags: ['corporate', 'enterprise'] },
  { id: 'corporate-consulting', name: 'Corporate Consulting', nameAr: 'شركات استشارات', category: 'Corporate', style: 'cards', tags: ['corporate', 'consulting'] },
  { id: 'corporate-legal', name: 'Corporate Legal', nameAr: 'شركات قانونية', category: 'Corporate', style: 'cards', tags: ['corporate', 'legal'] },
  { id: 'corporate-finance', name: 'Corporate Finance', nameAr: 'شركات مالية', category: 'Corporate', style: 'cards', tags: ['corporate', 'finance'] },
  { id: 'corporate-insurance', name: 'Corporate Insurance', nameAr: 'شركات تأمين', category: 'Corporate', style: 'cards', tags: ['corporate', 'insurance'] },
  { id: 'corporate-healthcare', name: 'Corporate Healthcare', nameAr: 'شركات صحة', category: 'Corporate', style: 'cards', tags: ['corporate', 'healthcare'] },
  { id: 'corporate-education', name: 'Corporate Education', nameAr: 'شركات تعليم', category: 'Corporate', style: 'cards', tags: ['corporate', 'education'] },
  { id: 'corporate-real-estate', name: 'Corporate Real Estate', nameAr: 'شركات عقارات', category: 'Corporate', style: 'cards', tags: ['corporate', 'real-estate'] },
  { id: 'corporate-comparison', name: 'Corporate Comparison', nameAr: 'شركات مقارنة', category: 'Corporate', style: 'comparison', tags: ['corporate', 'comparison'] },

  // ═══════════════════════════════════════════════════════════════
  // 🎨 CREATIVE / AGENCY (79-86)
  // ═══════════════════════════════════════════════════════════════
  { id: 'creative-agency', name: 'Creative Agency', nameAr: 'إبداعي وكالة', category: 'Creative', style: 'cards', tags: ['creative', 'agency'] },
  { id: 'creative-portfolio', name: 'Creative Portfolio', nameAr: 'إبداعي معرض', category: 'Creative', style: 'cards', tags: ['creative', 'portfolio'] },
  { id: 'creative-freelancer', name: 'Creative Freelancer', nameAr: 'إبداعي فريلانسر', category: 'Creative', style: 'cards', tags: ['creative', 'freelancer'] },
  { id: 'creative-studio', name: 'Creative Studio', nameAr: 'إبداعي ستوديو', category: 'Creative', style: 'cards', tags: ['creative', 'studio'] },
  { id: 'creative-bold', name: 'Creative Bold', nameAr: 'إبداعي جريء', category: 'Creative', style: 'cards', tags: ['creative', 'bold'] },
  { id: 'creative-minimal', name: 'Creative Minimal', nameAr: 'إبداعي بسيط', category: 'Creative', style: 'minimal', tags: ['creative', 'minimal'] },
  { id: 'creative-retro', name: 'Creative Retro', nameAr: 'إبداعي ريترو', category: 'Creative', style: 'cards', tags: ['creative', 'retro'] },
  { id: 'creative-artistic', name: 'Creative Artistic', nameAr: 'إبداعي فني', category: 'Creative', style: 'cards', tags: ['creative', 'artistic'] },

  // ═══════════════════════════════════════════════════════════════
  // 🎮 GAMING (87-92)
  // ═══════════════════════════════════════════════════════════════
  { id: 'gaming-subscription', name: 'Gaming Subscription', nameAr: 'ألعاب اشتراك', category: 'Gaming', style: 'cards', tags: ['gaming', 'subscription'] },
  { id: 'gaming-premium', name: 'Gaming Premium', nameAr: 'ألعاب بريميوم', category: 'Gaming', style: 'cards', tags: ['gaming', 'premium'] },
  { id: 'gaming-neon', name: 'Gaming Neon', nameAr: 'ألعاب نيون', category: 'Gaming', style: 'cards', tags: ['gaming', 'neon'] },
  { id: 'gaming-cyberpunk', name: 'Gaming Cyberpunk', nameAr: 'ألعاب سايبربانك', category: 'Gaming', style: 'cards', tags: ['gaming', 'cyberpunk'] },
  { id: 'gaming-esports', name: 'Gaming Esports', nameAr: 'ألعاب رياضات', category: 'Gaming', style: 'cards', tags: ['gaming', 'esports'] },
  { id: 'gaming-coins', name: 'Gaming Coins', nameAr: 'ألعاب عملات', category: 'Gaming', style: 'cards', tags: ['gaming', 'coins', 'credits'] },

  // ═══════════════════════════════════════════════════════════════
  // 📱 APP / MOBILE (93-97)
  // ═══════════════════════════════════════════════════════════════
  { id: 'app-freemium', name: 'App Freemium', nameAr: 'تطبيق فريميوم', category: 'App', style: 'cards', tags: ['app', 'freemium'] },
  { id: 'app-pro', name: 'App Pro', nameAr: 'تطبيق برو', category: 'App', style: 'cards', tags: ['app', 'pro'] },
  { id: 'app-family', name: 'App Family', nameAr: 'تطبيق عائلي', category: 'App', style: 'cards', tags: ['app', 'family'] },
  { id: 'app-student', name: 'App Student', nameAr: 'تطبيق طالب', category: 'App', style: 'cards', tags: ['app', 'student', 'education'] },
  { id: 'app-lifetime', name: 'App Lifetime', nameAr: 'تطبيق مدى الحياة', category: 'App', style: 'cards', tags: ['app', 'lifetime'] },

  // ═══════════════════════════════════════════════════════════════
  // 📊 COMPARISON TABLES (98-100)
  // ═══════════════════════════════════════════════════════════════
  { id: 'comparison-full', name: 'Comparison Full', nameAr: 'مقارنة كاملة', category: 'Comparison', style: 'table', tags: ['comparison', 'table', 'full'] },
  { id: 'comparison-minimal', name: 'Comparison Minimal', nameAr: 'مقارنة بسيطة', category: 'Comparison', style: 'table', tags: ['comparison', 'minimal'] },
  { id: 'comparison-highlighted', name: 'Comparison Highlighted', nameAr: 'مقارنة مميزة', category: 'Comparison', style: 'table', tags: ['comparison', 'highlighted'] },
];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const pricingCategories = [...new Set(pricingThemes.map(t => t.category))];

export const getPricingTheme = (themeId: string): PricingTheme | undefined => {
  return pricingThemes.find(t => t.id === themeId);
};

export const getPricingByCategory = (category: string): PricingTheme[] => {
  return pricingThemes.filter(t => t.category === category);
};

export const getPricingByTag = (tag: string): PricingTheme[] => {
  return pricingThemes.filter(t => t.tags?.includes(tag));
};

// ═══════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════
// PRICING COMPONENTS
// ═══════════════════════════════════════════════════════════════

// 1. Basic Simple
export const PricingBasicSimple: React.FC<PricingTableProps> = ({
  title,
  subtitle,
  description,
  plans,
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
        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(plans.length, 3)} gap-8`}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-xl p-8 ${
                plan.popular ? 'ring-2 ring-blue-500 shadow-xl' : 'border border-gray-200'
              }`}
            >
              {plan.badge && (
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full mb-4">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
              {plan.description && <p className="text-gray-500 mt-1">{plan.description}</p>}
              <div className="mt-6">
                <span className="text-4xl font-bold text-gray-900">
                  {plan.currency || '$'}{plan.price}
                </span>
                {plan.period && <span className="text-gray-500">/{plan.period}</span>}
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature, idx) => {
                  const text = typeof feature === 'string' ? feature : feature.text;
                  const included = typeof feature === 'string' ? true : feature.included;
                  return (
                    <li key={idx} className="flex items-center gap-3">
                      <span className={included ? 'text-green-500' : 'text-gray-300'}>
                        {included ? <CheckIcon /> : <XIcon />}
                      </span>
                      <span className={included ? 'text-gray-700' : 'text-gray-400'}>{text}</span>
                    </li>
                  );
                })}
              </ul>
              <button
                onClick={() => handlePlanSelect(plan)}
                className={`w-full mt-8 py-3 px-4 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {plan.buttonText || 'Get Started'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// 2. Basic With Toggle
export const PricingBasicWithToggle: React.FC<PricingTableProps & { isAnnual?: boolean }> = ({
  title,
  subtitle,
  description,
  plans,
  isAnnual = false,
  onBillingChange,
  className = '',
}) => {
  const [annual, setAnnual] = React.useState(isAnnual);

  const handleToggle = () => {
    setAnnual(!annual);
    onBillingChange?.(!annual);
  };

  return (
    <section className={`py-16 px-4 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-8">
            {subtitle && <p className="text-blue-600 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{title}</h2>}
            {description && <p className="text-gray-600 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`font-medium ${!annual ? 'text-gray-900' : 'text-gray-500'}`}>Monthly</span>
          <button
            onClick={handleToggle}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              annual ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                annual ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`font-medium ${annual ? 'text-gray-900' : 'text-gray-500'}`}>
            Annual <span className="text-green-500 text-sm">(Save 20%)</span>
          </span>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(plans.length, 3)} gap-8`}>
          {plans.map((plan) => {
            const price = annual ? Math.round(Number(plan.price) * 0.8 * 12) : plan.price;
            const period = annual ? 'year' : plan.period || 'month';
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl p-8 ${
                  plan.popular ? 'ring-2 ring-blue-500 shadow-xl scale-105' : 'border border-gray-200'
                }`}
              >
                {plan.badge && (
                  <span className="inline-block px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-full mb-4">
                    {plan.badge}
                  </span>
                )}
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                {plan.description && <p className="text-gray-500 mt-1">{plan.description}</p>}
                <div className="mt-6">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.currency || '$'}{price}
                  </span>
                  <span className="text-gray-500">/{period}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, idx) => {
                    const text = typeof feature === 'string' ? feature : feature.text;
                    return (
                      <li key={idx} className="flex items-center gap-3">
                        <span className="text-green-500"><CheckIcon /></span>
                        <span className="text-gray-700">{text}</span>
                      </li>
                    );
                  })}
                </ul>
                <button
                  onClick={() => handlePlanSelect(plan)}
                  className={`w-full mt-8 py-3 px-4 rounded-lg font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.buttonText || 'Get Started'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// 3. Modern Glass
export const PricingModernGlass: React.FC<PricingTableProps> = ({
  title,
  subtitle,
  description,
  plans,
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
        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(plans.length, 3)} gap-6`}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 ${
                plan.popular ? 'ring-2 ring-white shadow-2xl' : ''
              }`}
            >
              {plan.badge && (
                <span className="inline-block px-3 py-1 bg-white text-purple-600 text-sm font-bold rounded-full mb-4">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-xl font-bold text-white">{plan.name}</h3>
              {plan.description && <p className="text-white/70 mt-1">{plan.description}</p>}
              <div className="mt-6">
                <span className="text-5xl font-bold text-white">
                  {plan.currency || '$'}{plan.price}
                </span>
                {plan.period && <span className="text-white/70">/{plan.period}</span>}
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature, idx) => {
                  const text = typeof feature === 'string' ? feature : feature.text;
                  return (
                    <li key={idx} className="flex items-center gap-3">
                      <span className="text-green-400"><CheckIcon /></span>
                      <span className="text-white/90">{text}</span>
                    </li>
                  );
                })}
              </ul>
              <button
                onClick={() => handlePlanSelect(plan)}
                className={`w-full mt-8 py-3 px-4 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-white text-purple-600 hover:bg-gray-100'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {plan.buttonText || 'Get Started'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// 4. Modern Dark
export const PricingModernDark: React.FC<PricingTableProps> = ({
  title,
  subtitle,
  description,
  plans,
  className = '',
}) => {
  return (
    <section className={`py-16 px-4 bg-gray-900 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-blue-400 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{title}</h2>}
            {description && <p className="text-gray-400 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(plans.length, 3)} gap-8`}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-gray-800 rounded-2xl p-8 border ${
                plan.popular ? 'border-blue-500 shadow-xl shadow-blue-500/20' : 'border-gray-700'
              }`}
            >
              {plan.badge && (
                <span className="inline-block px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-medium rounded-full mb-4">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-xl font-bold text-white">{plan.name}</h3>
              {plan.description && <p className="text-gray-400 mt-1">{plan.description}</p>}
              <div className="mt-6">
                <span className="text-4xl font-bold text-white">
                  {plan.currency || '$'}{plan.price}
                </span>
                {plan.period && <span className="text-gray-400">/{plan.period}</span>}
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature, idx) => {
                  const text = typeof feature === 'string' ? feature : feature.text;
                  const included = typeof feature === 'string' ? true : feature.included;
                  return (
                    <li key={idx} className="flex items-center gap-3">
                      <span className={included ? 'text-green-400' : 'text-gray-600'}>
                        {included ? <CheckIcon /> : <XIcon />}
                      </span>
                      <span className={included ? 'text-gray-300' : 'text-gray-600'}>{text}</span>
                    </li>
                  );
                })}
              </ul>
              <button
                onClick={() => handlePlanSelect(plan)}
                className={`w-full mt-8 py-3 px-4 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                {plan.buttonText || 'Get Started'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// 5. Tech Gradient
export const PricingTechGradient: React.FC<PricingTableProps> = ({
  title,
  subtitle,
  description,
  plans,
  className = '',
}) => {
  const gradients = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-orange-500 to-red-500',
  ];

  return (
    <section className={`py-16 px-4 bg-gray-950 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-cyan-400 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{title}</h2>}
            {description && <p className="text-gray-400 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(plans.length, 3)} gap-6`}>
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              className="relative bg-gray-900 rounded-2xl p-8 border border-gray-800 overflow-hidden"
            >
              {/* Gradient top bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradients[index % gradients.length]}`} />
              
              {plan.badge && (
                <span className={`inline-block px-3 py-1 bg-gradient-to-r ${gradients[index % gradients.length]} text-white text-sm font-medium rounded-full mb-4`}>
                  {plan.badge}
                </span>
              )}
              <h3 className="text-xl font-bold text-white">{plan.name}</h3>
              {plan.description && <p className="text-gray-400 mt-1">{plan.description}</p>}
              <div className="mt-6">
                <span className={`text-4xl font-bold bg-gradient-to-r ${gradients[index % gradients.length]} bg-clip-text text-transparent`}>
                  {plan.currency || '$'}{plan.price}
                </span>
                {plan.period && <span className="text-gray-400">/{plan.period}</span>}
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature, idx) => {
                  const text = typeof feature === 'string' ? feature : feature.text;
                  return (
                    <li key={idx} className="flex items-center gap-3">
                      <span className="text-green-400"><CheckIcon /></span>
                      <span className="text-gray-300">{text}</span>
                    </li>
                  );
                })}
              </ul>
              <button
                onClick={() => handlePlanSelect(plan)}
                className={`w-full mt-8 py-3 px-4 rounded-lg font-semibold bg-gradient-to-r ${gradients[index % gradients.length]} text-white hover:opacity-90 transition-opacity`}
              >
                {plan.buttonText || 'Get Started'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// 6. Gaming Neon
export const PricingGamingNeon: React.FC<PricingTableProps> = ({
  title,
  subtitle,
  description,
  plans,
  className = '',
}) => {
  const neonColors = [
    { border: 'border-cyan-500', shadow: 'shadow-cyan-500/50', text: 'text-cyan-400', bg: 'bg-cyan-500' },
    { border: 'border-pink-500', shadow: 'shadow-pink-500/50', text: 'text-pink-400', bg: 'bg-pink-500' },
    { border: 'border-purple-500', shadow: 'shadow-purple-500/50', text: 'text-purple-400', bg: 'bg-purple-500' },
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
        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(plans.length, 3)} gap-6`}>
          {plans.map((plan, index) => {
            const neon = neonColors[index % neonColors.length];
            return (
              <div
                key={plan.id}
                className={`bg-gray-900 rounded-xl p-8 border-2 ${neon.border} shadow-lg ${neon.shadow}`}
              >
                {plan.badge && (
                  <span className={`inline-block px-3 py-1 ${neon.bg} text-white text-sm font-bold rounded-full mb-4`}>
                    {plan.badge}
                  </span>
                )}
                <h3 className={`text-2xl font-bold ${neon.text}`}>{plan.name}</h3>
                {plan.description && <p className="text-gray-400 mt-1">{plan.description}</p>}
                <div className="mt-6">
                  <span className={`text-5xl font-black ${neon.text}`}>
                    {plan.currency || '$'}{plan.price}
                  </span>
                  {plan.period && <span className="text-gray-400">/{plan.period}</span>}
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, idx) => {
                    const text = typeof feature === 'string' ? feature : feature.text;
                    return (
                      <li key={idx} className="flex items-center gap-3">
                        <span className={neon.text}>✓</span>
                        <span className="text-gray-300">{text}</span>
                      </li>
                    );
                  })}
                </ul>
                <button
                  onClick={() => handlePlanSelect(plan)}
                  className={`w-full mt-8 py-3 px-4 rounded-lg font-bold ${neon.bg} text-white hover:opacity-90 transition-opacity`}
                >
                  {plan.buttonText || 'SUBSCRIBE'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// 7. E-commerce Luxury
export const PricingEcommerceLuxury: React.FC<PricingTableProps> = ({
  title,
  subtitle,
  description,
  plans,
  className = '',
}) => {
  return (
    <section className={`py-16 px-4 bg-stone-100 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-amber-700 font-medium tracking-widest uppercase text-sm mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 mb-4">{title}</h2>}
            {description && <p className="text-stone-600 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(plans.length, 3)} gap-8`}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-none p-10 ${
                plan.popular ? 'ring-2 ring-amber-600' : 'border border-stone-200'
              }`}
            >
              {plan.badge && (
                <span className="inline-block px-4 py-1 bg-amber-600 text-white text-xs font-medium tracking-widest uppercase mb-6">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-2xl font-serif text-stone-900">{plan.name}</h3>
              {plan.description && <p className="text-stone-500 mt-2">{plan.description}</p>}
              <div className="mt-8 pb-8 border-b border-stone-200">
                <span className="text-5xl font-light text-stone-900">
                  {plan.currency || '$'}{plan.price}
                </span>
                {plan.period && <span className="text-stone-500 text-lg">/{plan.period}</span>}
              </div>
              <ul className="mt-8 space-y-4">
                {plan.features.map((feature, idx) => {
                  const text = typeof feature === 'string' ? feature : feature.text;
                  return (
                    <li key={idx} className="flex items-center gap-3">
                      <span className="text-amber-600">✓</span>
                      <span className="text-stone-700">{text}</span>
                    </li>
                  );
                })}
              </ul>
              <button
                onClick={() => handlePlanSelect(plan)}
                className={`w-full mt-10 py-4 px-4 font-medium tracking-wide transition-colors ${
                  plan.popular
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'bg-stone-900 text-white hover:bg-stone-800'
                }`}
              >
                {plan.buttonText || 'SELECT PLAN'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// 8. Comparison Table
export const PricingComparisonTable: React.FC<PricingTableProps> = ({
  title,
  subtitle,
  description,
  plans,
  className = '',
}) => {
  // Get all unique features
  const allFeatures = [...new Set(plans.flatMap(p => 
    p.features.map(f => typeof f === 'string' ? f : f.text)
  ))];

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
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-4 px-6 text-left text-gray-500 font-medium">Features</th>
                {plans.map((plan) => (
                  <th key={plan.id} className="py-4 px-6 text-center">
                    <div className={`${plan.popular ? 'text-blue-600' : 'text-gray-900'}`}>
                      <p className="font-bold text-lg">{plan.name}</p>
                      <p className="text-2xl font-bold mt-2">
                        {plan.currency || '$'}{plan.price}
                        {plan.period && <span className="text-sm font-normal text-gray-500">/{plan.period}</span>}
                      </p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allFeatures.map((featureText, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-4 px-6 text-gray-700">{featureText}</td>
                  {plans.map((plan) => {
                    const feature = plan.features.find(f => 
                      (typeof f === 'string' ? f : f.text) === featureText
                    );
                    const included = feature ? (typeof feature === 'string' ? true : feature.included) : false;
                    return (
                      <td key={plan.id} className="py-4 px-6 text-center">
                        {included ? (
                          <span className="text-green-500 inline-flex justify-center"><CheckIcon /></span>
                        ) : (
                          <span className="text-gray-300 inline-flex justify-center"><XIcon /></span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="py-6 px-6"></td>
                {plans.map((plan) => (
                  <td key={plan.id} className="py-6 px-6 text-center">
                    <button
                      onClick={() => handlePlanSelect(plan)}
                      className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
                        plan.popular
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      {plan.buttonText || 'Choose Plan'}
                    </button>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════
// COMPONENTS MAP
// ═══════════════════════════════════════════════════════════════

export const pricingComponents: Record<string, React.FC<any>> = {
  'basic-simple': PricingBasicSimple,
  'basic-bordered': PricingBasicSimple,
  'basic-shadow': PricingBasicSimple,
  'basic-rounded': PricingBasicSimple,
  'basic-with-toggle': PricingBasicWithToggle,
  'basic-with-badge': PricingBasicSimple,
  'basic-highlighted': PricingBasicSimple,
  'modern-glass': PricingModernGlass,
  'modern-gradient': PricingModernGlass,
  'modern-dark': PricingModernDark,
  'tech-startup': PricingModernDark,
  'tech-gradient-dark': PricingTechGradient,
  'tech-enterprise': PricingModernDark,
  'gaming-neon': PricingGamingNeon,
  'gaming-cyberpunk': PricingGamingNeon,
  'ecommerce-luxury': PricingEcommerceLuxury,
  'ecommerce-membership': PricingEcommerceLuxury,
  'comparison-full': PricingComparisonTable,
  'tech-comparison': PricingComparisonTable,
  'tech-feature-matrix': PricingComparisonTable,
};

export default pricingComponents;

