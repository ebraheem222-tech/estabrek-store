"use client";
import React from 'react';

// ═══════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface HeroTheme {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  layout: 'centered' | 'left' | 'right' | 'split' | 'fullscreen' | 'minimal' | 'asymmetric';
  tags?: string[];
}

export interface HeroProps {
  theme?: string;
  // Content
  badge?: string;
  headline: string;
  subheadline?: string;
  description?: string;
  // CTAs
  primaryCta?: { text: string; href?: string; onClick?: () => void };
  secondaryCta?: { text: string; href?: string; onClick?: () => void };
  // Media
  imageSrc?: string;
  imageAlt?: string;
  videoSrc?: string;
  // Features/Stats
  features?: string[];
  stats?: { value: string; label: string }[];
  // Customization
  className?: string;
  children?: React.ReactNode;
}

// ═══════════════════════════════════════════════════════════════
// 100 HERO THEMES DATA
// ═══════════════════════════════════════════════════════════════

export const heroThemes: HeroTheme[] = [
  // ═══════════════════════════════════════════════════════════════
  // 🎯 BASIC / MINIMAL (1-12)
  // ═══════════════════════════════════════════════════════════════
  { id: 'basic-centered', name: 'Basic Centered', nameAr: 'أساسي متوسط', category: 'Basic', layout: 'centered', tags: ['basic', 'clean', 'minimal'] },
  { id: 'basic-left', name: 'Basic Left Aligned', nameAr: 'أساسي يسار', category: 'Basic', layout: 'left', tags: ['basic', 'clean'] },
  { id: 'basic-split', name: 'Basic Split', nameAr: 'أساسي منقسم', category: 'Basic', layout: 'split', tags: ['basic', 'image'] },
  { id: 'basic-minimal', name: 'Basic Minimal', nameAr: 'أساسي بسيط', category: 'Basic', layout: 'minimal', tags: ['basic', 'minimal'] },
  { id: 'basic-dark', name: 'Basic Dark', nameAr: 'أساسي داكن', category: 'Basic', layout: 'centered', tags: ['basic', 'dark'] },
  { id: 'basic-gradient', name: 'Basic Gradient', nameAr: 'أساسي متدرج', category: 'Basic', layout: 'centered', tags: ['basic', 'gradient'] },
  { id: 'basic-fullscreen', name: 'Basic Fullscreen', nameAr: 'أساسي ملء الشاشة', category: 'Basic', layout: 'fullscreen', tags: ['basic', 'fullscreen'] },
  { id: 'basic-with-image', name: 'Basic With Image', nameAr: 'أساسي مع صورة', category: 'Basic', layout: 'split', tags: ['basic', 'image'] },
  { id: 'basic-with-stats', name: 'Basic With Stats', nameAr: 'أساسي مع إحصائيات', category: 'Basic', layout: 'centered', tags: ['basic', 'stats'] },
  { id: 'basic-with-features', name: 'Basic With Features', nameAr: 'أساسي مع ميزات', category: 'Basic', layout: 'centered', tags: ['basic', 'features'] },
  { id: 'basic-asymmetric', name: 'Basic Asymmetric', nameAr: 'أساسي غير متماثل', category: 'Basic', layout: 'asymmetric', tags: ['basic', 'modern'] },
  { id: 'basic-boxed', name: 'Basic Boxed', nameAr: 'أساسي محاط', category: 'Basic', layout: 'centered', tags: ['basic', 'boxed'] },

  // ═══════════════════════════════════════════════════════════════
  // 🚀 TECH / STARTUP (13-24)
  // ═══════════════════════════════════════════════════════════════
  { id: 'tech-saas', name: 'Tech SaaS', nameAr: 'تقنية SaaS', category: 'Tech', layout: 'centered', tags: ['tech', 'saas', 'startup'] },
  { id: 'tech-ai', name: 'Tech AI', nameAr: 'تقنية ذكاء اصطناعي', category: 'Tech', layout: 'split', tags: ['tech', 'ai', 'futuristic'] },
  { id: 'tech-developer', name: 'Tech Developer', nameAr: 'تقنية مطورين', category: 'Tech', layout: 'left', tags: ['tech', 'developer', 'code'] },
  { id: 'tech-startup', name: 'Tech Startup', nameAr: 'تقنية ناشئة', category: 'Tech', layout: 'split', tags: ['tech', 'startup', 'modern'] },
  { id: 'tech-product', name: 'Tech Product', nameAr: 'تقنية منتج', category: 'Tech', layout: 'centered', tags: ['tech', 'product', 'launch'] },
  { id: 'tech-app', name: 'Tech App', nameAr: 'تقنية تطبيق', category: 'Tech', layout: 'split', tags: ['tech', 'app', 'mobile'] },
  { id: 'tech-crypto', name: 'Tech Crypto', nameAr: 'تقنية كريبتو', category: 'Tech', layout: 'centered', tags: ['tech', 'crypto', 'blockchain'] },
  { id: 'tech-cloud', name: 'Tech Cloud', nameAr: 'تقنية سحابية', category: 'Tech', layout: 'split', tags: ['tech', 'cloud', 'hosting'] },
  { id: 'tech-security', name: 'Tech Security', nameAr: 'تقنية أمان', category: 'Tech', layout: 'left', tags: ['tech', 'security', 'cyber'] },
  { id: 'tech-fintech', name: 'Tech Fintech', nameAr: 'تقنية مالية', category: 'Tech', layout: 'split', tags: ['tech', 'fintech', 'finance'] },
  { id: 'tech-data', name: 'Tech Data', nameAr: 'تقنية بيانات', category: 'Tech', layout: 'centered', tags: ['tech', 'data', 'analytics'] },
  { id: 'tech-api', name: 'Tech API', nameAr: 'تقنية API', category: 'Tech', layout: 'left', tags: ['tech', 'api', 'developer'] },

  // ═══════════════════════════════════════════════════════════════
  // 🛒 E-COMMERCE (25-36)
  // ═══════════════════════════════════════════════════════════════
  { id: 'ecommerce-modern', name: 'E-commerce Modern', nameAr: 'متجر حديث', category: 'E-commerce', layout: 'split', tags: ['ecommerce', 'modern', 'shop'] },
  { id: 'ecommerce-fashion', name: 'E-commerce Fashion', nameAr: 'متجر أزياء', category: 'E-commerce', layout: 'fullscreen', tags: ['ecommerce', 'fashion', 'elegant'] },
  { id: 'ecommerce-minimal', name: 'E-commerce Minimal', nameAr: 'متجر بسيط', category: 'E-commerce', layout: 'split', tags: ['ecommerce', 'minimal', 'clean'] },
  { id: 'ecommerce-sale', name: 'E-commerce Sale', nameAr: 'متجر تخفيضات', category: 'E-commerce', layout: 'centered', tags: ['ecommerce', 'sale', 'promo'] },
  { id: 'ecommerce-luxury', name: 'E-commerce Luxury', nameAr: 'متجر فاخر', category: 'E-commerce', layout: 'fullscreen', tags: ['ecommerce', 'luxury', 'premium'] },
  { id: 'ecommerce-product', name: 'E-commerce Product', nameAr: 'متجر منتج', category: 'E-commerce', layout: 'split', tags: ['ecommerce', 'product', 'showcase'] },
  { id: 'ecommerce-collection', name: 'E-commerce Collection', nameAr: 'متجر مجموعة', category: 'E-commerce', layout: 'centered', tags: ['ecommerce', 'collection', 'gallery'] },
  { id: 'ecommerce-seasonal', name: 'E-commerce Seasonal', nameAr: 'متجر موسمي', category: 'E-commerce', layout: 'fullscreen', tags: ['ecommerce', 'seasonal', 'holiday'] },
  { id: 'ecommerce-kids', name: 'E-commerce Kids', nameAr: 'متجر أطفال', category: 'E-commerce', layout: 'split', tags: ['ecommerce', 'kids', 'playful'] },
  { id: 'ecommerce-electronics', name: 'E-commerce Electronics', nameAr: 'متجر إلكترونيات', category: 'E-commerce', layout: 'split', tags: ['ecommerce', 'electronics', 'tech'] },
  { id: 'ecommerce-beauty', name: 'E-commerce Beauty', nameAr: 'متجر جمال', category: 'E-commerce', layout: 'split', tags: ['ecommerce', 'beauty', 'cosmetics'] },
  { id: 'ecommerce-food', name: 'E-commerce Food', nameAr: 'متجر طعام', category: 'E-commerce', layout: 'split', tags: ['ecommerce', 'food', 'grocery'] },

  // ═══════════════════════════════════════════════════════════════
  // 🎮 GAMING (37-46)
  // ═══════════════════════════════════════════════════════════════
  { id: 'gaming-neon', name: 'Gaming Neon', nameAr: 'ألعاب نيون', category: 'Gaming', layout: 'fullscreen', tags: ['gaming', 'neon', 'dark'] },
  { id: 'gaming-esports', name: 'Gaming Esports', nameAr: 'ألعاب رياضات', category: 'Gaming', layout: 'split', tags: ['gaming', 'esports', 'competitive'] },
  { id: 'gaming-stream', name: 'Gaming Stream', nameAr: 'ألعاب بث', category: 'Gaming', layout: 'centered', tags: ['gaming', 'stream', 'twitch'] },
  { id: 'gaming-launch', name: 'Gaming Launch', nameAr: 'ألعاب إطلاق', category: 'Gaming', layout: 'fullscreen', tags: ['gaming', 'launch', 'release'] },
  { id: 'gaming-cyberpunk', name: 'Gaming Cyberpunk', nameAr: 'ألعاب سايبربانك', category: 'Gaming', layout: 'fullscreen', tags: ['gaming', 'cyberpunk', 'futuristic'] },
  { id: 'gaming-rpg', name: 'Gaming RPG', nameAr: 'ألعاب RPG', category: 'Gaming', layout: 'fullscreen', tags: ['gaming', 'rpg', 'fantasy'] },
  { id: 'gaming-mobile', name: 'Gaming Mobile', nameAr: 'ألعاب موبايل', category: 'Gaming', layout: 'split', tags: ['gaming', 'mobile', 'app'] },
  { id: 'gaming-retro', name: 'Gaming Retro', nameAr: 'ألعاب ريترو', category: 'Gaming', layout: 'centered', tags: ['gaming', 'retro', 'pixel'] },
  { id: 'gaming-vr', name: 'Gaming VR', nameAr: 'ألعاب واقع افتراضي', category: 'Gaming', layout: 'fullscreen', tags: ['gaming', 'vr', 'immersive'] },
  { id: 'gaming-tournament', name: 'Gaming Tournament', nameAr: 'ألعاب بطولة', category: 'Gaming', layout: 'centered', tags: ['gaming', 'tournament', 'event'] },

  // ═══════════════════════════════════════════════════════════════
  // 🏢 CORPORATE / BUSINESS (47-58)
  // ═══════════════════════════════════════════════════════════════
  { id: 'corporate-professional', name: 'Corporate Professional', nameAr: 'شركات احترافي', category: 'Corporate', layout: 'split', tags: ['corporate', 'professional', 'business'] },
  { id: 'corporate-consulting', name: 'Corporate Consulting', nameAr: 'شركات استشارات', category: 'Corporate', layout: 'left', tags: ['corporate', 'consulting', 'services'] },
  { id: 'corporate-finance', name: 'Corporate Finance', nameAr: 'شركات مالية', category: 'Corporate', layout: 'split', tags: ['corporate', 'finance', 'banking'] },
  { id: 'corporate-law', name: 'Corporate Law', nameAr: 'شركات قانونية', category: 'Corporate', layout: 'left', tags: ['corporate', 'law', 'legal'] },
  { id: 'corporate-healthcare', name: 'Corporate Healthcare', nameAr: 'شركات صحة', category: 'Corporate', layout: 'split', tags: ['corporate', 'healthcare', 'medical'] },
  { id: 'corporate-real-estate', name: 'Corporate Real Estate', nameAr: 'شركات عقارات', category: 'Corporate', layout: 'fullscreen', tags: ['corporate', 'realestate', 'property'] },
  { id: 'corporate-insurance', name: 'Corporate Insurance', nameAr: 'شركات تأمين', category: 'Corporate', layout: 'split', tags: ['corporate', 'insurance', 'trust'] },
  { id: 'corporate-manufacturing', name: 'Corporate Manufacturing', nameAr: 'شركات تصنيع', category: 'Corporate', layout: 'split', tags: ['corporate', 'manufacturing', 'industrial'] },
  { id: 'corporate-logistics', name: 'Corporate Logistics', nameAr: 'شركات لوجستية', category: 'Corporate', layout: 'left', tags: ['corporate', 'logistics', 'shipping'] },
  { id: 'corporate-hr', name: 'Corporate HR', nameAr: 'شركات موارد بشرية', category: 'Corporate', layout: 'split', tags: ['corporate', 'hr', 'recruitment'] },
  { id: 'corporate-education', name: 'Corporate Education', nameAr: 'شركات تعليم', category: 'Corporate', layout: 'split', tags: ['corporate', 'education', 'training'] },
  { id: 'corporate-ngo', name: 'Corporate NGO', nameAr: 'شركات منظمات', category: 'Corporate', layout: 'centered', tags: ['corporate', 'ngo', 'nonprofit'] },

  // ═══════════════════════════════════════════════════════════════
  // 🎨 CREATIVE / AGENCY (59-70)
  // ═══════════════════════════════════════════════════════════════
  { id: 'creative-agency', name: 'Creative Agency', nameAr: 'إبداعي وكالة', category: 'Creative', layout: 'centered', tags: ['creative', 'agency', 'design'] },
  { id: 'creative-portfolio', name: 'Creative Portfolio', nameAr: 'إبداعي معرض', category: 'Creative', layout: 'minimal', tags: ['creative', 'portfolio', 'personal'] },
  { id: 'creative-studio', name: 'Creative Studio', nameAr: 'إبداعي استوديو', category: 'Creative', layout: 'split', tags: ['creative', 'studio', 'design'] },
  { id: 'creative-photography', name: 'Creative Photography', nameAr: 'إبداعي تصوير', category: 'Creative', layout: 'fullscreen', tags: ['creative', 'photography', 'visual'] },
  { id: 'creative-video', name: 'Creative Video', nameAr: 'إبداعي فيديو', category: 'Creative', layout: 'fullscreen', tags: ['creative', 'video', 'production'] },
  { id: 'creative-art', name: 'Creative Art', nameAr: 'إبداعي فني', category: 'Creative', layout: 'asymmetric', tags: ['creative', 'art', 'gallery'] },
  { id: 'creative-music', name: 'Creative Music', nameAr: 'إبداعي موسيقى', category: 'Creative', layout: 'fullscreen', tags: ['creative', 'music', 'audio'] },
  { id: 'creative-fashion-designer', name: 'Creative Fashion Designer', nameAr: 'إبداعي مصمم أزياء', category: 'Creative', layout: 'split', tags: ['creative', 'fashion', 'designer'] },
  { id: 'creative-architect', name: 'Creative Architect', nameAr: 'إبداعي معماري', category: 'Creative', layout: 'fullscreen', tags: ['creative', 'architect', 'design'] },
  { id: 'creative-freelancer', name: 'Creative Freelancer', nameAr: 'إبداعي مستقل', category: 'Creative', layout: 'centered', tags: ['creative', 'freelancer', 'personal'] },
  { id: 'creative-branding', name: 'Creative Branding', nameAr: 'إبداعي علامة تجارية', category: 'Creative', layout: 'split', tags: ['creative', 'branding', 'identity'] },
  { id: 'creative-motion', name: 'Creative Motion', nameAr: 'إبداعي حركة', category: 'Creative', layout: 'fullscreen', tags: ['creative', 'motion', 'animation'] },

  // ═══════════════════════════════════════════════════════════════
  // 🍔 FOOD & RESTAURANT (71-80)
  // ═══════════════════════════════════════════════════════════════
  { id: 'food-restaurant', name: 'Food Restaurant', nameAr: 'طعام مطعم', category: 'Food', layout: 'fullscreen', tags: ['food', 'restaurant', 'dining'] },
  { id: 'food-cafe', name: 'Food Cafe', nameAr: 'طعام كافيه', category: 'Food', layout: 'split', tags: ['food', 'cafe', 'coffee'] },
  { id: 'food-delivery', name: 'Food Delivery', nameAr: 'طعام توصيل', category: 'Food', layout: 'split', tags: ['food', 'delivery', 'app'] },
  { id: 'food-recipe', name: 'Food Recipe', nameAr: 'طعام وصفات', category: 'Food', layout: 'split', tags: ['food', 'recipe', 'blog'] },
  { id: 'food-bakery', name: 'Food Bakery', nameAr: 'طعام مخبز', category: 'Food', layout: 'split', tags: ['food', 'bakery', 'sweet'] },
  { id: 'food-fine-dining', name: 'Food Fine Dining', nameAr: 'طعام راقي', category: 'Food', layout: 'fullscreen', tags: ['food', 'finedining', 'luxury'] },
  { id: 'food-fast-food', name: 'Food Fast Food', nameAr: 'طعام سريع', category: 'Food', layout: 'centered', tags: ['food', 'fastfood', 'quick'] },
  { id: 'food-organic', name: 'Food Organic', nameAr: 'طعام عضوي', category: 'Food', layout: 'split', tags: ['food', 'organic', 'healthy'] },
  { id: 'food-bar', name: 'Food Bar', nameAr: 'طعام بار', category: 'Food', layout: 'fullscreen', tags: ['food', 'bar', 'drinks'] },
  { id: 'food-food-truck', name: 'Food Truck', nameAr: 'طعام شاحنة', category: 'Food', layout: 'centered', tags: ['food', 'foodtruck', 'street'] },

  // ═══════════════════════════════════════════════════════════════
  // 🏋️ FITNESS & WELLNESS (81-88)
  // ═══════════════════════════════════════════════════════════════
  { id: 'fitness-gym', name: 'Fitness Gym', nameAr: 'لياقة جيم', category: 'Fitness', layout: 'fullscreen', tags: ['fitness', 'gym', 'workout'] },
  { id: 'fitness-yoga', name: 'Fitness Yoga', nameAr: 'لياقة يوغا', category: 'Fitness', layout: 'split', tags: ['fitness', 'yoga', 'wellness'] },
  { id: 'fitness-personal-trainer', name: 'Fitness Personal Trainer', nameAr: 'لياقة مدرب شخصي', category: 'Fitness', layout: 'split', tags: ['fitness', 'trainer', 'coaching'] },
  { id: 'fitness-spa', name: 'Fitness Spa', nameAr: 'لياقة سبا', category: 'Fitness', layout: 'fullscreen', tags: ['fitness', 'spa', 'relaxation'] },
  { id: 'fitness-sports', name: 'Fitness Sports', nameAr: 'لياقة رياضة', category: 'Fitness', layout: 'fullscreen', tags: ['fitness', 'sports', 'athletic'] },
  { id: 'fitness-nutrition', name: 'Fitness Nutrition', nameAr: 'لياقة تغذية', category: 'Fitness', layout: 'split', tags: ['fitness', 'nutrition', 'diet'] },
  { id: 'fitness-crossfit', name: 'Fitness CrossFit', nameAr: 'لياقة كروسفيت', category: 'Fitness', layout: 'fullscreen', tags: ['fitness', 'crossfit', 'intense'] },
  { id: 'fitness-meditation', name: 'Fitness Meditation', nameAr: 'لياقة تأمل', category: 'Fitness', layout: 'centered', tags: ['fitness', 'meditation', 'mindfulness'] },

  // ═══════════════════════════════════════════════════════════════
  // ✈️ TRAVEL & HOSPITALITY (89-96)
  // ═══════════════════════════════════════════════════════════════
  { id: 'travel-hotel', name: 'Travel Hotel', nameAr: 'سفر فندق', category: 'Travel', layout: 'fullscreen', tags: ['travel', 'hotel', 'hospitality'] },
  { id: 'travel-booking', name: 'Travel Booking', nameAr: 'سفر حجز', category: 'Travel', layout: 'split', tags: ['travel', 'booking', 'flights'] },
  { id: 'travel-adventure', name: 'Travel Adventure', nameAr: 'سفر مغامرة', category: 'Travel', layout: 'fullscreen', tags: ['travel', 'adventure', 'outdoor'] },
  { id: 'travel-resort', name: 'Travel Resort', nameAr: 'سفر منتجع', category: 'Travel', layout: 'fullscreen', tags: ['travel', 'resort', 'luxury'] },
  { id: 'travel-tour', name: 'Travel Tour', nameAr: 'سفر جولة', category: 'Travel', layout: 'split', tags: ['travel', 'tour', 'guide'] },
  { id: 'travel-cruise', name: 'Travel Cruise', nameAr: 'سفر رحلة بحرية', category: 'Travel', layout: 'fullscreen', tags: ['travel', 'cruise', 'ocean'] },
  { id: 'travel-airbnb', name: 'Travel Airbnb', nameAr: 'سفر إيجار', category: 'Travel', layout: 'split', tags: ['travel', 'airbnb', 'rental'] },
  { id: 'travel-destination', name: 'Travel Destination', nameAr: 'سفر وجهة', category: 'Travel', layout: 'fullscreen', tags: ['travel', 'destination', 'explore'] },

  // ═══════════════════════════════════════════════════════════════
  // 🎭 SPECIAL / UNIQUE (97-100)
  // ═══════════════════════════════════════════════════════════════
  { id: 'special-coming-soon', name: 'Coming Soon', nameAr: 'قريباً', category: 'Special', layout: 'centered', tags: ['special', 'comingsoon', 'launch'] },
  { id: 'special-event', name: 'Event', nameAr: 'حدث', category: 'Special', layout: 'centered', tags: ['special', 'event', 'conference'] },
  { id: 'special-app-download', name: 'App Download', nameAr: 'تحميل تطبيق', category: 'Special', layout: 'split', tags: ['special', 'app', 'download'] },
  { id: 'special-newsletter', name: 'Newsletter', nameAr: 'نشرة بريدية', category: 'Special', layout: 'centered', tags: ['special', 'newsletter', 'subscribe'] },
];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const heroCategories = [...new Set(heroThemes.map(h => h.category))];

export const getHeroTheme = (themeId: string): HeroTheme | undefined => {
  return heroThemes.find(t => t.id === themeId);
};

export const getHerosByCategory = (category: string): HeroTheme[] => {
  return heroThemes.filter(t => t.category === category);
};

export const getHerosByTag = (tag: string): HeroTheme[] => {
  return heroThemes.filter(t => t.tags?.includes(tag));
};

// ═══════════════════════════════════════════════════════════════
// HERO SECTION COMPONENTS
// ═══════════════════════════════════════════════════════════════

// 1. Basic Centered Hero
export const HeroBasicCentered: React.FC<HeroProps> = ({
  badge,
  headline,
  subheadline,
  description,
  primaryCta,
  secondaryCta,
  className = '',
}) => (
  <section className={`py-20 px-4 bg-white ${className}`}>
    <div className="max-w-4xl mx-auto text-center">
      {badge && (
        <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-blue-100 text-blue-700 rounded-full">
          {badge}
        </span>
      )}
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
        {headline}
      </h1>
      {subheadline && (
        <p className="text-xl md:text-2xl text-gray-600 mb-4">{subheadline}</p>
      )}
      {description && (
        <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">{description}</p>
      )}
      <div className="flex flex-wrap justify-center gap-4">
        {primaryCta && (
          <button
            onClick={primaryCta.onClick}
            className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {primaryCta.text}
          </button>
        )}
        {secondaryCta && (
          <button
            onClick={secondaryCta.onClick}
            className="px-8 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            {secondaryCta.text}
          </button>
        )}
      </div>
    </div>
  </section>
);

// 2. Basic Split Hero
export const HeroBasicSplit: React.FC<HeroProps> = ({
  badge,
  headline,
  description,
  primaryCta,
  secondaryCta,
  imageSrc,
  imageAlt = 'Hero Image',
  className = '',
}) => (
  <section className={`py-20 px-4 bg-white ${className}`}>
    <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div>
        {badge && (
          <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-blue-100 text-blue-700 rounded-full">
            {badge}
          </span>
        )}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          {headline}
        </h1>
        {description && (
          <p className="text-lg text-gray-600 mb-8">{description}</p>
        )}
        <div className="flex flex-wrap gap-4">
          {primaryCta && (
            <button
              onClick={primaryCta.onClick}
              className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              {primaryCta.text}
            </button>
          )}
          {secondaryCta && (
            <button
              onClick={secondaryCta.onClick}
              className="px-8 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              {secondaryCta.text}
            </button>
          )}
        </div>
      </div>
      <div className="relative">
        {imageSrc ? (
          <img src={imageSrc} alt={imageAlt} className="w-full rounded-2xl shadow-2xl" />
        ) : (
          <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
            <span className="text-gray-400">Image Placeholder</span>
          </div>
        )}
      </div>
    </div>
  </section>
);

// 3. Tech SaaS Hero (Gradient)
export const HeroTechSaas: React.FC<HeroProps> = ({
  badge,
  headline,
  description,
  primaryCta,
  secondaryCta,
  features,
  className = '',
}) => (
  <section className={`py-24 px-4 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 ${className}`}>
    <div className="max-w-4xl mx-auto text-center text-white">
      {badge && (
        <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-white/20 backdrop-blur-sm rounded-full">
          {badge}
        </span>
      )}
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
        {headline}
      </h1>
      {description && (
        <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">{description}</p>
      )}
      <div className="flex flex-wrap justify-center gap-4 mb-12">
        {primaryCta && (
          <button
            onClick={primaryCta.onClick}
            className="px-8 py-3 bg-white text-purple-700 font-medium rounded-lg hover:bg-purple-50 transition-colors"
          >
            {primaryCta.text}
          </button>
        )}
        {secondaryCta && (
          <button
            onClick={secondaryCta.onClick}
            className="px-8 py-3 border border-white/30 text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
          >
            {secondaryCta.text}
          </button>
        )}
      </div>
      {features && features.length > 0 && (
        <div className="flex flex-wrap justify-center gap-6">
          {features.map((feature, i) => (
            <div key={i} className="flex items-center gap-2 text-purple-100">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {feature}
            </div>
          ))}
        </div>
      )}
    </div>
  </section>
);

// 4. Gaming Neon Hero
export const HeroGamingNeon: React.FC<HeroProps> = ({
  badge,
  headline,
  description,
  primaryCta,
  secondaryCta,
  imageSrc,
  className = '',
}) => (
  <section className={`relative py-24 px-4 bg-gray-950 overflow-hidden ${className}`}>
    {/* Neon glow effects */}
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl" />
    
    <div className="relative max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div>
        {badge && (
          <span className="inline-block px-4 py-1.5 mb-6 text-sm font-bold bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-full">
            {badge}
          </span>
        )}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 mb-6">
          {headline}
        </h1>
        {description && (
          <p className="text-lg text-gray-400 mb-8">{description}</p>
        )}
        <div className="flex flex-wrap gap-4">
          {primaryCta && (
            <button
              onClick={primaryCta.onClick}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold rounded-lg hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all"
            >
              {primaryCta.text}
            </button>
          )}
          {secondaryCta && (
            <button
              onClick={secondaryCta.onClick}
              className="px-8 py-3 border border-purple-500/50 text-purple-400 font-medium rounded-lg hover:bg-purple-500/10 transition-colors"
            >
              {secondaryCta.text}
            </button>
          )}
        </div>
      </div>
      <div className="relative">
        {imageSrc ? (
          <img src={imageSrc} alt="Game" className="w-full rounded-2xl" />
        ) : (
          <div className="aspect-video bg-gradient-to-br from-purple-900/50 to-cyan-900/50 rounded-2xl border border-purple-500/30 flex items-center justify-center">
            <span className="text-purple-400">Game Preview</span>
          </div>
        )}
      </div>
    </div>
  </section>
);

// 5. E-commerce Fashion Hero
export const HeroEcommerceFashion: React.FC<HeroProps> = ({
  badge,
  headline,
  subheadline,
  primaryCta,
  imageSrc,
  className = '',
}) => (
  <section className={`relative min-h-screen flex items-center ${className}`}>
    {/* Background Image */}
    <div className="absolute inset-0 bg-gray-900">
      {imageSrc ? (
        <img src={imageSrc} alt="Fashion" className="w-full h-full object-cover opacity-60" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
      )}
    </div>
    
    <div className="relative z-10 max-w-7xl mx-auto px-4 py-24 text-center text-white">
      {badge && (
        <span className="inline-block px-6 py-2 mb-8 text-sm tracking-widest uppercase border border-white/30">
          {badge}
        </span>
      )}
      <h1 className="text-5xl md:text-7xl lg:text-8xl font-light tracking-wider mb-6">
        {headline}
      </h1>
      {subheadline && (
        <p className="text-xl md:text-2xl font-light tracking-wide text-gray-300 mb-12">
          {subheadline}
        </p>
      )}
      {primaryCta && (
        <button
          onClick={primaryCta.onClick}
          className="px-12 py-4 bg-white text-black font-medium tracking-widest uppercase hover:bg-gray-100 transition-colors"
        >
          {primaryCta.text}
        </button>
      )}
    </div>
  </section>
);

// 6. Corporate Professional Hero
export const HeroCorporateProfessional: React.FC<HeroProps> = ({
  badge,
  headline,
  description,
  primaryCta,
  secondaryCta,
  stats,
  imageSrc,
  className = '',
}) => (
  <section className={`py-20 px-4 bg-slate-50 ${className}`}>
    <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div>
        {badge && (
          <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-blue-600 text-white rounded">
            {badge}
          </span>
        )}
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
          {headline}
        </h1>
        {description && (
          <p className="text-lg text-slate-600 mb-8">{description}</p>
        )}
        <div className="flex flex-wrap gap-4 mb-12">
          {primaryCta && (
            <button
              onClick={primaryCta.onClick}
              className="px-8 py-3 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors"
            >
              {primaryCta.text}
            </button>
          )}
          {secondaryCta && (
            <button
              onClick={secondaryCta.onClick}
              className="px-8 py-3 border-2 border-slate-300 text-slate-700 font-medium rounded hover:border-slate-400 transition-colors"
            >
              {secondaryCta.text}
            </button>
          )}
        </div>
        {stats && stats.length > 0 && (
          <div className="grid grid-cols-3 gap-8 pt-8 border-t border-slate-200">
            {stats.map((stat, i) => (
              <div key={i}>
                <div className="text-3xl font-bold text-blue-600">{stat.value}</div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        {imageSrc ? (
          <img src={imageSrc} alt="Business" className="w-full rounded-lg shadow-xl" />
        ) : (
          <div className="aspect-[4/3] bg-gradient-to-br from-blue-100 to-slate-100 rounded-lg flex items-center justify-center">
            <span className="text-slate-400">Business Image</span>
          </div>
        )}
      </div>
    </div>
  </section>
);

// 7. Creative Agency Hero
export const HeroCreativeAgency: React.FC<HeroProps> = ({
  headline,
  subheadline,
  primaryCta,
  className = '',
}) => (
  <section className={`relative py-32 px-4 bg-black overflow-hidden ${className}`}>
    {/* Abstract shapes */}
    <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-3xl opacity-30" />
    <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full blur-3xl opacity-30" />
    
    <div className="relative max-w-6xl mx-auto text-center">
      <h1 className="text-5xl md:text-7xl lg:text-9xl font-black text-white mb-8 leading-none">
        {headline}
      </h1>
      {subheadline && (
        <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto">
          {subheadline}
        </p>
      )}
      {primaryCta && (
        <button
          onClick={primaryCta.onClick}
          className="group px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-yellow-400 transition-colors inline-flex items-center gap-2"
        >
          {primaryCta.text}
          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>
      )}
    </div>
  </section>
);

// 8. Food Restaurant Hero
export const HeroFoodRestaurant: React.FC<HeroProps> = ({
  badge,
  headline,
  description,
  primaryCta,
  secondaryCta,
  imageSrc,
  className = '',
}) => (
  <section className={`relative min-h-[80vh] flex items-center ${className}`}>
    {/* Background */}
    <div className="absolute inset-0">
      {imageSrc ? (
        <img src={imageSrc} alt="Restaurant" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-amber-900 to-orange-900" />
      )}
      <div className="absolute inset-0 bg-black/50" />
    </div>
    
    <div className="relative z-10 max-w-4xl mx-auto px-4 text-center text-white">
      {badge && (
        <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium border border-amber-400 text-amber-400 rounded-full">
          {badge}
        </span>
      )}
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold mb-6">
        {headline}
      </h1>
      {description && (
        <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
          {description}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-4">
        {primaryCta && (
          <button
            onClick={primaryCta.onClick}
            className="px-8 py-3 bg-amber-500 text-white font-medium rounded-full hover:bg-amber-600 transition-colors"
          >
            {primaryCta.text}
          </button>
        )}
        {secondaryCta && (
          <button
            onClick={secondaryCta.onClick}
            className="px-8 py-3 border border-white text-white font-medium rounded-full hover:bg-white/10 transition-colors"
          >
            {secondaryCta.text}
          </button>
        )}
      </div>
    </div>
  </section>
);

// 9. Fitness Gym Hero
export const HeroFitnessGym: React.FC<HeroProps> = ({
  headline,
  subheadline,
  primaryCta,
  imageSrc,
  className = '',
}) => (
  <section className={`relative min-h-screen flex items-center ${className}`}>
    {/* Background */}
    <div className="absolute inset-0">
      {imageSrc ? (
        <img src={imageSrc} alt="Gym" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
    </div>
    
    <div className="relative z-10 max-w-7xl mx-auto px-4 py-24">
      <div className="max-w-2xl">
        <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tight mb-6">
          {headline}
        </h1>
        {subheadline && (
          <p className="text-xl text-gray-300 mb-10">{subheadline}</p>
        )}
        {primaryCta && (
          <button
            onClick={primaryCta.onClick}
            className="px-10 py-4 bg-red-600 text-white font-bold uppercase tracking-wider hover:bg-red-700 transition-colors"
          >
            {primaryCta.text}
          </button>
        )}
      </div>
    </div>
  </section>
);

// 10. Travel Hotel Hero
export const HeroTravelHotel: React.FC<HeroProps> = ({
  badge,
  headline,
  description,
  primaryCta,
  imageSrc,
  className = '',
  children,
}) => (
  <section className={`relative min-h-[90vh] flex items-center ${className}`}>
    {/* Background */}
    <div className="absolute inset-0">
      {imageSrc ? (
        <img src={imageSrc} alt="Hotel" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-sky-900 to-blue-900" />
      )}
      <div className="absolute inset-0 bg-black/40" />
    </div>
    
    <div className="relative z-10 max-w-4xl mx-auto px-4 text-center text-white">
      {badge && (
        <span className="inline-block px-6 py-2 mb-8 text-sm tracking-widest uppercase bg-white/10 backdrop-blur-sm rounded-full">
          {badge}
        </span>
      )}
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-light mb-6">
        {headline}
      </h1>
      {description && (
        <p className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto">
          {description}
        </p>
      )}
      
      {/* Search box placeholder */}
      {children || (
        <div className="bg-white rounded-lg p-4 max-w-3xl mx-auto shadow-2xl">
          <div className="grid md:grid-cols-4 gap-4">
            <input type="text" placeholder="Destination" className="px-4 py-3 bg-gray-100 rounded text-gray-800" />
            <input type="text" placeholder="Check In" className="px-4 py-3 bg-gray-100 rounded text-gray-800" />
            <input type="text" placeholder="Check Out" className="px-4 py-3 bg-gray-100 rounded text-gray-800" />
            <button className="px-6 py-3 bg-blue-600 text-white font-medium rounded hover:bg-blue-700">
              {primaryCta?.text || 'Search'}
            </button>
          </div>
        </div>
      )}
    </div>
  </section>
);

// 11. Coming Soon Hero
export const HeroComingSoon: React.FC<HeroProps> = ({
  headline,
  description,
  primaryCta,
  className = '',
}) => (
  <section className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 ${className}`}>
    <div className="max-w-2xl mx-auto px-4 text-center text-white">
      <div className="mb-8">
        <span className="text-6xl">🚀</span>
      </div>
      <h1 className="text-4xl md:text-6xl font-bold mb-6">{headline}</h1>
      {description && (
        <p className="text-xl text-gray-300 mb-10">{description}</p>
      )}
      
      {/* Email signup */}
      <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
        <input
          type="email"
          placeholder="Enter your email"
          className="flex-1 px-5 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button className="px-8 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors">
          {primaryCta?.text || 'Notify Me'}
        </button>
      </div>
    </div>
  </section>
);

// 12. App Download Hero
export const HeroAppDownload: React.FC<HeroProps> = ({
  badge,
  headline,
  description,
  imageSrc,
  className = '',
}) => (
  <section className={`py-20 px-4 bg-gradient-to-br from-blue-600 to-indigo-700 ${className}`}>
    <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div className="text-white">
        {badge && (
          <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-white/20 rounded-full">
            {badge}
          </span>
        )}
        <h1 className="text-4xl md:text-5xl font-bold mb-6">{headline}</h1>
        {description && (
          <p className="text-xl text-blue-100 mb-8">{description}</p>
        )}
        
        {/* App store buttons */}
        <div className="flex flex-wrap gap-4">
          <button className="flex items-center gap-3 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-900 transition-colors">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <div className="text-left">
              <div className="text-xs">Download on the</div>
              <div className="text-lg font-semibold">App Store</div>
            </div>
          </button>
          <button className="flex items-center gap-3 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-900 transition-colors">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
            </svg>
            <div className="text-left">
              <div className="text-xs">GET IT ON</div>
              <div className="text-lg font-semibold">Google Play</div>
            </div>
          </button>
        </div>
      </div>
      
      <div className="relative flex justify-center">
        {imageSrc ? (
          <img src={imageSrc} alt="App" className="max-w-sm w-full" />
        ) : (
          <div className="w-64 h-[500px] bg-gray-900 rounded-[3rem] border-4 border-gray-800 flex items-center justify-center">
            <span className="text-gray-600">Phone Mockup</span>
          </div>
        )}
      </div>
    </div>
  </section>
);

// ═══════════════════════════════════════════════════════════════
// MAIN HERO RENDERER
// ═══════════════════════════════════════════════════════════════

interface HeroRendererProps extends HeroProps {
  themeId: string;
}

export const HeroRenderer: React.FC<HeroRendererProps> = ({ themeId, ...props }) => {
  const theme = getHeroTheme(themeId);
  
  if (!theme) {
    return <HeroBasicCentered {...props} />;
  }

  // Map themes to components
  const componentMap: Record<string, React.FC<HeroProps>> = {
    'basic-centered': HeroBasicCentered,
    'basic-split': HeroBasicSplit,
    'basic-with-image': HeroBasicSplit,
    'tech-saas': HeroTechSaas,
    'tech-ai': HeroTechSaas,
    'tech-startup': HeroTechSaas,
    'gaming-neon': HeroGamingNeon,
    'gaming-esports': HeroGamingNeon,
    'gaming-cyberpunk': HeroGamingNeon,
    'ecommerce-fashion': HeroEcommerceFashion,
    'ecommerce-luxury': HeroEcommerceFashion,
    'corporate-professional': HeroCorporateProfessional,
    'corporate-consulting': HeroCorporateProfessional,
    'creative-agency': HeroCreativeAgency,
    'creative-studio': HeroCreativeAgency,
    'food-restaurant': HeroFoodRestaurant,
    'food-fine-dining': HeroFoodRestaurant,
    'fitness-gym': HeroFitnessGym,
    'fitness-crossfit': HeroFitnessGym,
    'travel-hotel': HeroTravelHotel,
    'travel-resort': HeroTravelHotel,
    'special-coming-soon': HeroComingSoon,
    'special-app-download': HeroAppDownload,
  };

  const Component = componentMap[themeId] || HeroBasicCentered;
  return <Component {...props} />;
};

export default HeroRenderer;




