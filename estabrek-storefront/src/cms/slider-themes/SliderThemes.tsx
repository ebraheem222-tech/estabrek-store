import React, { useState, useEffect, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface SliderTheme {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  style: 'basic' | 'cards' | 'fade' | 'carousel' | 'gallery' | 'hero' | 'testimonial' | 'product';
  tags?: string[];
}

export interface SliderProps {
  theme?: string;
  slides: SlideItem[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showArrows?: boolean;
  showDots?: boolean;
  showThumbnails?: boolean;
  infinite?: boolean;
  slidesToShow?: number;
  gap?: number;
  className?: string;
}

export interface SlideItem {
  id: string | number;
  image?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  price?: string;
  originalPrice?: string;
  rating?: number;
  link?: string;
  author?: string;
  role?: string;
  avatar?: string;
}

// ═══════════════════════════════════════════════════════════════
// 100 SLIDER THEMES DATA
// ═══════════════════════════════════════════════════════════════

export const sliderThemes: SliderTheme[] = [
  // ═══════════════════════════════════════════════════════════════
  // 🎯 BASIC (1-15)
  // ═══════════════════════════════════════════════════════════════
  { id: 'basic-simple', name: 'Basic Simple', nameAr: 'أساسي بسيط', category: 'Basic', style: 'basic', tags: ['basic', 'clean', 'minimal'] },
  { id: 'basic-arrows', name: 'Basic With Arrows', nameAr: 'أساسي مع أسهم', category: 'Basic', style: 'basic', tags: ['basic', 'arrows'] },
  { id: 'basic-dots', name: 'Basic With Dots', nameAr: 'أساسي مع نقاط', category: 'Basic', style: 'basic', tags: ['basic', 'dots', 'pagination'] },
  { id: 'basic-fade', name: 'Basic Fade', nameAr: 'أساسي تلاشي', category: 'Basic', style: 'fade', tags: ['basic', 'fade', 'transition'] },
  { id: 'basic-card', name: 'Basic Card', nameAr: 'أساسي بطاقة', category: 'Basic', style: 'cards', tags: ['basic', 'card', 'shadow'] },
  { id: 'basic-rounded', name: 'Basic Rounded', nameAr: 'أساسي دائري', category: 'Basic', style: 'basic', tags: ['basic', 'rounded'] },
  { id: 'basic-fullwidth', name: 'Basic Full Width', nameAr: 'أساسي عرض كامل', category: 'Basic', style: 'hero', tags: ['basic', 'fullwidth'] },
  { id: 'basic-thumbnails', name: 'Basic Thumbnails', nameAr: 'أساسي صور مصغرة', category: 'Basic', style: 'gallery', tags: ['basic', 'thumbnails'] },
  { id: 'basic-vertical', name: 'Basic Vertical', nameAr: 'أساسي عمودي', category: 'Basic', style: 'basic', tags: ['basic', 'vertical'] },
  { id: 'basic-centered', name: 'Basic Centered', nameAr: 'أساسي متوسط', category: 'Basic', style: 'carousel', tags: ['basic', 'centered'] },
  { id: 'basic-dark', name: 'Basic Dark', nameAr: 'أساسي داكن', category: 'Basic', style: 'basic', tags: ['basic', 'dark'] },
  { id: 'basic-light', name: 'Basic Light', nameAr: 'أساسي فاتح', category: 'Basic', style: 'basic', tags: ['basic', 'light'] },
  { id: 'basic-bordered', name: 'Basic Bordered', nameAr: 'أساسي محدد', category: 'Basic', style: 'basic', tags: ['basic', 'bordered'] },
  { id: 'basic-gradient', name: 'Basic Gradient', nameAr: 'أساسي متدرج', category: 'Basic', style: 'basic', tags: ['basic', 'gradient'] },
  { id: 'basic-autoplay', name: 'Basic Autoplay', nameAr: 'أساسي تشغيل تلقائي', category: 'Basic', style: 'basic', tags: ['basic', 'autoplay'] },

  // ═══════════════════════════════════════════════════════════════
  // 🛒 E-COMMERCE / PRODUCT (16-30)
  // ═══════════════════════════════════════════════════════════════
  { id: 'product-grid', name: 'Product Grid', nameAr: 'منتجات شبكة', category: 'E-commerce', style: 'product', tags: ['ecommerce', 'product', 'grid'] },
  { id: 'product-carousel', name: 'Product Carousel', nameAr: 'منتجات دوار', category: 'E-commerce', style: 'carousel', tags: ['ecommerce', 'product', 'carousel'] },
  { id: 'product-featured', name: 'Product Featured', nameAr: 'منتجات مميزة', category: 'E-commerce', style: 'product', tags: ['ecommerce', 'featured'] },
  { id: 'product-sale', name: 'Product Sale', nameAr: 'منتجات تخفيض', category: 'E-commerce', style: 'product', tags: ['ecommerce', 'sale', 'discount'] },
  { id: 'product-new-arrivals', name: 'New Arrivals', nameAr: 'وصل حديثاً', category: 'E-commerce', style: 'product', tags: ['ecommerce', 'new', 'arrivals'] },
  { id: 'product-best-sellers', name: 'Best Sellers', nameAr: 'الأكثر مبيعاً', category: 'E-commerce', style: 'product', tags: ['ecommerce', 'bestsellers'] },
  { id: 'product-fashion', name: 'Fashion Products', nameAr: 'منتجات أزياء', category: 'E-commerce', style: 'product', tags: ['ecommerce', 'fashion'] },
  { id: 'product-electronics', name: 'Electronics', nameAr: 'إلكترونيات', category: 'E-commerce', style: 'product', tags: ['ecommerce', 'electronics', 'tech'] },
  { id: 'product-minimal', name: 'Product Minimal', nameAr: 'منتجات بسيط', category: 'E-commerce', style: 'product', tags: ['ecommerce', 'minimal'] },
  { id: 'product-luxury', name: 'Luxury Products', nameAr: 'منتجات فاخرة', category: 'E-commerce', style: 'product', tags: ['ecommerce', 'luxury', 'premium'] },
  { id: 'product-quick-view', name: 'Quick View', nameAr: 'عرض سريع', category: 'E-commerce', style: 'product', tags: ['ecommerce', 'quickview'] },
  { id: 'product-compare', name: 'Product Compare', nameAr: 'مقارنة منتجات', category: 'E-commerce', style: 'carousel', tags: ['ecommerce', 'compare'] },
  { id: 'product-gallery', name: 'Product Gallery', nameAr: 'معرض منتجات', category: 'E-commerce', style: 'gallery', tags: ['ecommerce', 'gallery'] },
  { id: 'product-zoom', name: 'Product Zoom', nameAr: 'تكبير منتج', category: 'E-commerce', style: 'gallery', tags: ['ecommerce', 'zoom'] },
  { id: 'product-360', name: 'Product 360°', nameAr: 'منتج 360 درجة', category: 'E-commerce', style: 'gallery', tags: ['ecommerce', '360', 'view'] },

  // ═══════════════════════════════════════════════════════════════
  // 🖼️ HERO / BANNER (31-42)
  // ═══════════════════════════════════════════════════════════════
  { id: 'hero-fullscreen', name: 'Hero Fullscreen', nameAr: 'بطل ملء الشاشة', category: 'Hero', style: 'hero', tags: ['hero', 'fullscreen', 'banner'] },
  { id: 'hero-split', name: 'Hero Split', nameAr: 'بطل منقسم', category: 'Hero', style: 'hero', tags: ['hero', 'split'] },
  { id: 'hero-video', name: 'Hero Video', nameAr: 'بطل فيديو', category: 'Hero', style: 'hero', tags: ['hero', 'video'] },
  { id: 'hero-parallax', name: 'Hero Parallax', nameAr: 'بطل بارالاكس', category: 'Hero', style: 'hero', tags: ['hero', 'parallax'] },
  { id: 'hero-kenburns', name: 'Hero Ken Burns', nameAr: 'بطل كين بيرنز', category: 'Hero', style: 'hero', tags: ['hero', 'kenburns', 'zoom'] },
  { id: 'hero-text-only', name: 'Hero Text Only', nameAr: 'بطل نص فقط', category: 'Hero', style: 'hero', tags: ['hero', 'text'] },
  { id: 'hero-gradient-overlay', name: 'Hero Gradient Overlay', nameAr: 'بطل تدرج', category: 'Hero', style: 'hero', tags: ['hero', 'gradient', 'overlay'] },
  { id: 'hero-slideshow', name: 'Hero Slideshow', nameAr: 'بطل عرض شرائح', category: 'Hero', style: 'fade', tags: ['hero', 'slideshow'] },
  { id: 'hero-ecommerce', name: 'Hero E-commerce', nameAr: 'بطل متجر', category: 'Hero', style: 'hero', tags: ['hero', 'ecommerce', 'promo'] },
  { id: 'hero-tech', name: 'Hero Tech', nameAr: 'بطل تقني', category: 'Hero', style: 'hero', tags: ['hero', 'tech', 'startup'] },
  { id: 'hero-creative', name: 'Hero Creative', nameAr: 'بطل إبداعي', category: 'Hero', style: 'hero', tags: ['hero', 'creative', 'agency'] },
  { id: 'hero-minimal', name: 'Hero Minimal', nameAr: 'بطل بسيط', category: 'Hero', style: 'hero', tags: ['hero', 'minimal'] },

  // ═══════════════════════════════════════════════════════════════
  // 💬 TESTIMONIALS (43-55)
  // ═══════════════════════════════════════════════════════════════
  { id: 'testimonial-simple', name: 'Testimonial Simple', nameAr: 'شهادة بسيطة', category: 'Testimonial', style: 'testimonial', tags: ['testimonial', 'simple'] },
  { id: 'testimonial-card', name: 'Testimonial Card', nameAr: 'شهادة بطاقة', category: 'Testimonial', style: 'testimonial', tags: ['testimonial', 'card'] },
  { id: 'testimonial-carousel', name: 'Testimonial Carousel', nameAr: 'شهادة دوار', category: 'Testimonial', style: 'carousel', tags: ['testimonial', 'carousel'] },
  { id: 'testimonial-grid', name: 'Testimonial Grid', nameAr: 'شهادة شبكة', category: 'Testimonial', style: 'testimonial', tags: ['testimonial', 'grid'] },
  { id: 'testimonial-quote', name: 'Testimonial Quote', nameAr: 'شهادة اقتباس', category: 'Testimonial', style: 'testimonial', tags: ['testimonial', 'quote'] },
  { id: 'testimonial-avatar', name: 'Testimonial Avatar', nameAr: 'شهادة صورة', category: 'Testimonial', style: 'testimonial', tags: ['testimonial', 'avatar'] },
  { id: 'testimonial-video', name: 'Testimonial Video', nameAr: 'شهادة فيديو', category: 'Testimonial', style: 'testimonial', tags: ['testimonial', 'video'] },
  { id: 'testimonial-rating', name: 'Testimonial Rating', nameAr: 'شهادة تقييم', category: 'Testimonial', style: 'testimonial', tags: ['testimonial', 'rating', 'stars'] },
  { id: 'testimonial-corporate', name: 'Testimonial Corporate', nameAr: 'شهادة شركات', category: 'Testimonial', style: 'testimonial', tags: ['testimonial', 'corporate', 'business'] },
  { id: 'testimonial-minimal', name: 'Testimonial Minimal', nameAr: 'شهادة بسيطة', category: 'Testimonial', style: 'testimonial', tags: ['testimonial', 'minimal'] },
  { id: 'testimonial-dark', name: 'Testimonial Dark', nameAr: 'شهادة داكنة', category: 'Testimonial', style: 'testimonial', tags: ['testimonial', 'dark'] },
  { id: 'testimonial-gradient', name: 'Testimonial Gradient', nameAr: 'شهادة متدرجة', category: 'Testimonial', style: 'testimonial', tags: ['testimonial', 'gradient'] },
  { id: 'testimonial-boxed', name: 'Testimonial Boxed', nameAr: 'شهادة محاطة', category: 'Testimonial', style: 'testimonial', tags: ['testimonial', 'boxed'] },

  // ═══════════════════════════════════════════════════════════════
  // 🖼️ GALLERY / PORTFOLIO (56-68)
  // ═══════════════════════════════════════════════════════════════
  { id: 'gallery-grid', name: 'Gallery Grid', nameAr: 'معرض شبكة', category: 'Gallery', style: 'gallery', tags: ['gallery', 'grid'] },
  { id: 'gallery-masonry', name: 'Gallery Masonry', nameAr: 'معرض ماسونري', category: 'Gallery', style: 'gallery', tags: ['gallery', 'masonry'] },
  { id: 'gallery-lightbox', name: 'Gallery Lightbox', nameAr: 'معرض لايت بوكس', category: 'Gallery', style: 'gallery', tags: ['gallery', 'lightbox'] },
  { id: 'gallery-thumbnails', name: 'Gallery Thumbnails', nameAr: 'معرض صور مصغرة', category: 'Gallery', style: 'gallery', tags: ['gallery', 'thumbnails'] },
  { id: 'gallery-fullscreen', name: 'Gallery Fullscreen', nameAr: 'معرض ملء الشاشة', category: 'Gallery', style: 'gallery', tags: ['gallery', 'fullscreen'] },
  { id: 'gallery-portfolio', name: 'Portfolio Gallery', nameAr: 'معرض أعمال', category: 'Gallery', style: 'gallery', tags: ['gallery', 'portfolio'] },
  { id: 'gallery-photography', name: 'Photography Gallery', nameAr: 'معرض تصوير', category: 'Gallery', style: 'gallery', tags: ['gallery', 'photography'] },
  { id: 'gallery-creative', name: 'Creative Gallery', nameAr: 'معرض إبداعي', category: 'Gallery', style: 'gallery', tags: ['gallery', 'creative'] },
  { id: 'gallery-dark', name: 'Gallery Dark', nameAr: 'معرض داكن', category: 'Gallery', style: 'gallery', tags: ['gallery', 'dark'] },
  { id: 'gallery-minimal', name: 'Gallery Minimal', nameAr: 'معرض بسيط', category: 'Gallery', style: 'gallery', tags: ['gallery', 'minimal'] },
  { id: 'gallery-hover', name: 'Gallery Hover Effects', nameAr: 'معرض تأثيرات', category: 'Gallery', style: 'gallery', tags: ['gallery', 'hover', 'effects'] },
  { id: 'gallery-filter', name: 'Gallery Filter', nameAr: 'معرض فلتر', category: 'Gallery', style: 'gallery', tags: ['gallery', 'filter', 'category'] },
  { id: 'gallery-instagram', name: 'Instagram Gallery', nameAr: 'معرض انستغرام', category: 'Gallery', style: 'gallery', tags: ['gallery', 'instagram', 'social'] },

  // ═══════════════════════════════════════════════════════════════
  // 🎮 GAMING (69-76)
  // ═══════════════════════════════════════════════════════════════
  { id: 'gaming-neon', name: 'Gaming Neon', nameAr: 'ألعاب نيون', category: 'Gaming', style: 'carousel', tags: ['gaming', 'neon', 'dark'] },
  { id: 'gaming-showcase', name: 'Gaming Showcase', nameAr: 'ألعاب عرض', category: 'Gaming', style: 'hero', tags: ['gaming', 'showcase'] },
  { id: 'gaming-cards', name: 'Gaming Cards', nameAr: 'ألعاب بطاقات', category: 'Gaming', style: 'cards', tags: ['gaming', 'cards'] },
  { id: 'gaming-stream', name: 'Gaming Stream', nameAr: 'ألعاب بث', category: 'Gaming', style: 'carousel', tags: ['gaming', 'stream', 'twitch'] },
  { id: 'gaming-esports', name: 'Gaming Esports', nameAr: 'ألعاب رياضات', category: 'Gaming', style: 'hero', tags: ['gaming', 'esports'] },
  { id: 'gaming-retro', name: 'Gaming Retro', nameAr: 'ألعاب ريترو', category: 'Gaming', style: 'carousel', tags: ['gaming', 'retro', 'pixel'] },
  { id: 'gaming-featured', name: 'Gaming Featured', nameAr: 'ألعاب مميزة', category: 'Gaming', style: 'hero', tags: ['gaming', 'featured'] },
  { id: 'gaming-cyberpunk', name: 'Gaming Cyberpunk', nameAr: 'ألعاب سايبربانك', category: 'Gaming', style: 'hero', tags: ['gaming', 'cyberpunk'] },

  // ═══════════════════════════════════════════════════════════════
  // 🏢 CORPORATE (77-84)
  // ═══════════════════════════════════════════════════════════════
  { id: 'corporate-team', name: 'Corporate Team', nameAr: 'شركات فريق', category: 'Corporate', style: 'carousel', tags: ['corporate', 'team'] },
  { id: 'corporate-clients', name: 'Corporate Clients', nameAr: 'شركات عملاء', category: 'Corporate', style: 'carousel', tags: ['corporate', 'clients', 'logos'] },
  { id: 'corporate-partners', name: 'Corporate Partners', nameAr: 'شركات شركاء', category: 'Corporate', style: 'carousel', tags: ['corporate', 'partners'] },
  { id: 'corporate-news', name: 'Corporate News', nameAr: 'شركات أخبار', category: 'Corporate', style: 'cards', tags: ['corporate', 'news', 'blog'] },
  { id: 'corporate-services', name: 'Corporate Services', nameAr: 'شركات خدمات', category: 'Corporate', style: 'cards', tags: ['corporate', 'services'] },
  { id: 'corporate-projects', name: 'Corporate Projects', nameAr: 'شركات مشاريع', category: 'Corporate', style: 'gallery', tags: ['corporate', 'projects'] },
  { id: 'corporate-awards', name: 'Corporate Awards', nameAr: 'شركات جوائز', category: 'Corporate', style: 'carousel', tags: ['corporate', 'awards'] },
  { id: 'corporate-stats', name: 'Corporate Stats', nameAr: 'شركات إحصائيات', category: 'Corporate', style: 'cards', tags: ['corporate', 'stats', 'numbers'] },

  // ═══════════════════════════════════════════════════════════════
  // 🎨 CREATIVE (85-92)
  // ═══════════════════════════════════════════════════════════════
  { id: 'creative-agency', name: 'Creative Agency', nameAr: 'إبداعي وكالة', category: 'Creative', style: 'hero', tags: ['creative', 'agency'] },
  { id: 'creative-portfolio', name: 'Creative Portfolio', nameAr: 'إبداعي معرض', category: 'Creative', style: 'gallery', tags: ['creative', 'portfolio'] },
  { id: 'creative-split', name: 'Creative Split', nameAr: 'إبداعي منقسم', category: 'Creative', style: 'hero', tags: ['creative', 'split'] },
  { id: 'creative-minimal', name: 'Creative Minimal', nameAr: 'إبداعي بسيط', category: 'Creative', style: 'fade', tags: ['creative', 'minimal'] },
  { id: 'creative-bold', name: 'Creative Bold', nameAr: 'إبداعي جريء', category: 'Creative', style: 'hero', tags: ['creative', 'bold'] },
  { id: 'creative-artsy', name: 'Creative Artsy', nameAr: 'إبداعي فني', category: 'Creative', style: 'gallery', tags: ['creative', 'art'] },
  { id: 'creative-motion', name: 'Creative Motion', nameAr: 'إبداعي حركة', category: 'Creative', style: 'fade', tags: ['creative', 'motion', 'animation'] },
  { id: 'creative-experimental', name: 'Creative Experimental', nameAr: 'إبداعي تجريبي', category: 'Creative', style: 'hero', tags: ['creative', 'experimental'] },

  // ═══════════════════════════════════════════════════════════════
  // 🍔 FOOD & TRAVEL (93-100)
  // ═══════════════════════════════════════════════════════════════
  { id: 'food-menu', name: 'Food Menu', nameAr: 'طعام قائمة', category: 'Food', style: 'carousel', tags: ['food', 'menu', 'restaurant'] },
  { id: 'food-gallery', name: 'Food Gallery', nameAr: 'طعام معرض', category: 'Food', style: 'gallery', tags: ['food', 'gallery'] },
  { id: 'food-specials', name: 'Food Specials', nameAr: 'طعام عروض', category: 'Food', style: 'cards', tags: ['food', 'specials', 'promo'] },
  { id: 'food-reviews', name: 'Food Reviews', nameAr: 'طعام مراجعات', category: 'Food', style: 'testimonial', tags: ['food', 'reviews'] },
  { id: 'travel-destinations', name: 'Travel Destinations', nameAr: 'سفر وجهات', category: 'Travel', style: 'hero', tags: ['travel', 'destinations'] },
  { id: 'travel-gallery', name: 'Travel Gallery', nameAr: 'سفر معرض', category: 'Travel', style: 'gallery', tags: ['travel', 'gallery'] },
  { id: 'travel-packages', name: 'Travel Packages', nameAr: 'سفر باقات', category: 'Travel', style: 'cards', tags: ['travel', 'packages'] },
  { id: 'travel-reviews', name: 'Travel Reviews', nameAr: 'سفر مراجعات', category: 'Travel', style: 'testimonial', tags: ['travel', 'reviews'] },
];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const sliderCategories = [...new Set(sliderThemes.map(t => t.category))];

export const getSliderTheme = (themeId: string): SliderTheme | undefined => {
  return sliderThemes.find(t => t.id === themeId);
};

export const getSlidersByCategory = (category: string): SliderTheme[] => {
  return sliderThemes.filter(t => t.category === category);
};

export const getSlidersByTag = (tag: string): SliderTheme[] => {
  return sliderThemes.filter(t => t.tags?.includes(tag));
};

// ═══════════════════════════════════════════════════════════════
// BASE SLIDER HOOK
// ═══════════════════════════════════════════════════════════════

export const useSlider = (
  slidesCount: number,
  options?: {
    autoPlay?: boolean;
    autoPlayInterval?: number;
    infinite?: boolean;
  }
) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(options?.autoPlay ?? false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const goToSlide = (index: number) => {
    if (options?.infinite) {
      setCurrentIndex((index + slidesCount) % slidesCount);
    } else {
      setCurrentIndex(Math.max(0, Math.min(index, slidesCount - 1)));
    }
  };

  const goNext = () => goToSlide(currentIndex + 1);
  const goPrev = () => goToSlide(currentIndex - 1);

  useEffect(() => {
    if (isPlaying && slidesCount > 1) {
      intervalRef.current = setInterval(() => {
        goNext();
      }, options?.autoPlayInterval ?? 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, currentIndex, slidesCount]);

  return {
    currentIndex,
    goToSlide,
    goNext,
    goPrev,
    isPlaying,
    setIsPlaying,
  };
};

// ═══════════════════════════════════════════════════════════════
// SLIDER COMPONENTS
// ═══════════════════════════════════════════════════════════════

// Arrow Components
const ArrowLeft: React.FC<{ onClick: () => void; className?: string }> = ({ onClick, className }) => (
  <button onClick={onClick} className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/90 shadow-lg hover:bg-white transition-colors ${className || ''}`}>
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  </button>
);

const ArrowRight: React.FC<{ onClick: () => void; className?: string }> = ({ onClick, className }) => (
  <button onClick={onClick} className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/90 shadow-lg hover:bg-white transition-colors ${className || ''}`}>
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  </button>
);

// Dots Component
const Dots: React.FC<{ count: number; current: number; onClick: (i: number) => void; className?: string; dotClassName?: string }> = 
  ({ count, current, onClick, className, dotClassName }) => (
  <div className={`flex justify-center gap-2 mt-4 ${className || ''}`}>
    {Array.from({ length: count }).map((_, i) => (
      <button
        key={i}
        onClick={() => onClick(i)}
        className={`w-3 h-3 rounded-full transition-all ${i === current ? 'bg-blue-600 scale-110' : 'bg-gray-300 hover:bg-gray-400'} ${dotClassName || ''}`}
      />
    ))}
  </div>
);

// ═══════════════════════════════════════════════════════════════
// 1. BASIC SIMPLE SLIDER
// ═══════════════════════════════════════════════════════════════

export const SliderBasicSimple: React.FC<SliderProps> = ({
  slides,
  showArrows = true,
  showDots = true,
  autoPlay = false,
  autoPlayInterval = 5000,
  infinite = true,
  className = '',
}) => {
  const { currentIndex, goToSlide, goNext, goPrev } = useSlider(slides.length, { autoPlay, autoPlayInterval, infinite });

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      <div className="relative aspect-video">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-500 ${index === currentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            {slide.image ? (
              <img src={slide.image} alt={slide.title || ''} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">{slide.title || `Slide ${index + 1}`}</span>
              </div>
            )}
            {(slide.title || slide.description) && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                {slide.title && <h3 className="text-white text-xl font-bold">{slide.title}</h3>}
                {slide.description && <p className="text-white/80">{slide.description}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
      {showArrows && slides.length > 1 && (
        <>
          <ArrowLeft onClick={goPrev} />
          <ArrowRight onClick={goNext} />
        </>
      )}
      {showDots && slides.length > 1 && <Dots count={slides.length} current={currentIndex} onClick={goToSlide} />}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 2. PRODUCT CAROUSEL SLIDER
// ═══════════════════════════════════════════════════════════════

export const SliderProductCarousel: React.FC<SliderProps> = ({
  slides,
  showArrows = true,
  slidesToShow = 4,
  gap = 24,
  className = '',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const maxIndex = Math.max(0, slides.length - slidesToShow);

  const goNext = () => setCurrentIndex(Math.min(currentIndex + 1, maxIndex));
  const goPrev = () => setCurrentIndex(Math.max(currentIndex - 1, 0));

  return (
    <div className={`relative ${className}`}>
      <div className="overflow-hidden">
        <div 
          className="flex transition-transform duration-500"
          style={{ 
            transform: `translateX(-${currentIndex * (100 / slidesToShow)}%)`,
            gap: `${gap}px`
          }}
        >
          {slides.map((slide) => (
            <div 
              key={slide.id} 
              className="flex-shrink-0"
              style={{ width: `calc(${100 / slidesToShow}% - ${gap * (slidesToShow - 1) / slidesToShow}px)` }}
            >
              <div className="bg-white rounded-xl shadow-md overflow-hidden group hover:shadow-xl transition-shadow">
                <div className="aspect-square relative overflow-hidden">
                  {slide.image ? (
                    <img src={slide.image} alt={slide.title || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400">Product</span>
                    </div>
                  )}
                  {slide.badge && (
                    <span className="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">{slide.badge}</span>
                  )}
                </div>
                <div className="p-4">
                  {slide.title && <h3 className="font-semibold text-gray-900 mb-1 truncate">{slide.title}</h3>}
                  {slide.description && <p className="text-sm text-gray-500 mb-2 line-clamp-2">{slide.description}</p>}
                  <div className="flex items-center justify-between">
                    {slide.price && (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-900">{slide.price}</span>
                        {slide.originalPrice && <span className="text-sm text-gray-400 line-through">{slide.originalPrice}</span>}
                      </div>
                    )}
                    {slide.rating && (
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400">★</span>
                        <span className="text-sm text-gray-600">{slide.rating}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {showArrows && slides.length > slidesToShow && (
        <>
          <button onClick={goPrev} disabled={currentIndex === 0} className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white shadow-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={goNext} disabled={currentIndex === maxIndex} className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white shadow-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 3. HERO FULLSCREEN SLIDER
// ═══════════════════════════════════════════════════════════════

export const SliderHeroFullscreen: React.FC<SliderProps> = ({
  slides,
  showArrows = true,
  showDots = true,
  autoPlay = true,
  autoPlayInterval = 6000,
  className = '',
}) => {
  const { currentIndex, goToSlide, goNext, goPrev } = useSlider(slides.length, { autoPlay, autoPlayInterval, infinite: true });

  return (
    <div className={`relative h-screen overflow-hidden ${className}`}>
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${index === currentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          {slide.image ? (
            <img src={slide.image} alt={slide.title || ''} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800" />
          )}
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white px-4 max-w-4xl">
              {slide.badge && (
                <span className="inline-block px-4 py-2 mb-6 text-sm font-medium bg-white/20 backdrop-blur-sm rounded-full">{slide.badge}</span>
              )}
              {slide.title && <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6">{slide.title}</h2>}
              {slide.description && <p className="text-xl md:text-2xl text-white/80 mb-8">{slide.description}</p>}
              {slide.link && (
                <a href={slide.link} className="inline-block px-8 py-4 bg-white text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-colors">
                  Learn More
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
      {showArrows && (
        <>
          <button onClick={goPrev} className="absolute left-6 top-1/2 -translate-y-1/2 z-10 p-4 text-white/70 hover:text-white transition-colors">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={goNext} className="absolute right-6 top-1/2 -translate-y-1/2 z-10 p-4 text-white/70 hover:text-white transition-colors">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </>
      )}
      {showDots && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`w-12 h-1 rounded-full transition-all ${i === currentIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/60'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 4. TESTIMONIAL SLIDER
// ═══════════════════════════════════════════════════════════════

export const SliderTestimonial: React.FC<SliderProps> = ({
  slides,
  showArrows = true,
  showDots = true,
  autoPlay = true,
  autoPlayInterval = 7000,
  className = '',
}) => {
  const { currentIndex, goToSlide, goNext, goPrev } = useSlider(slides.length, { autoPlay, autoPlayInterval, infinite: true });

  return (
    <div className={`relative py-16 px-4 bg-gray-50 ${className}`}>
      <div className="max-w-4xl mx-auto text-center">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
        </svg>
        
        <div className="relative min-h-[200px]">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-all duration-500 ${index === currentIndex ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
            >
              {slide.description && (
                <p className="text-xl md:text-2xl text-gray-700 leading-relaxed mb-8">"{slide.description}"</p>
              )}
              <div className="flex items-center justify-center gap-4">
                {slide.avatar ? (
                  <img src={slide.avatar} alt={slide.author || ''} className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-xl text-gray-400">👤</span>
                  </div>
                )}
                <div className="text-left">
                  {slide.author && <p className="font-semibold text-gray-900">{slide.author}</p>}
                  {slide.role && <p className="text-sm text-gray-500">{slide.role}</p>}
                </div>
              </div>
              {slide.rating && (
                <div className="flex justify-center gap-1 mt-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={i < slide.rating! ? 'text-yellow-400' : 'text-gray-300'}>★</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {showArrows && slides.length > 1 && (
          <>
            <button onClick={goPrev} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={goNext} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </>
        )}
        
        {showDots && slides.length > 1 && <Dots count={slides.length} current={currentIndex} onClick={goToSlide} className="mt-8" />}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 5. GALLERY THUMBNAILS SLIDER
// ═══════════════════════════════════════════════════════════════

export const SliderGalleryThumbnails: React.FC<SliderProps> = ({
  slides,
  showArrows = true,
  className = '',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <div className={`${className}`}>
      {/* Main Image */}
      <div className="relative aspect-video rounded-xl overflow-hidden mb-4">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-500 ${index === currentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            {slide.image ? (
              <img src={slide.image} alt={slide.title || ''} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400">Image {index + 1}</span>
              </div>
            )}
          </div>
        ))}
        {showArrows && slides.length > 1 && (
          <>
            <ArrowLeft onClick={() => setCurrentIndex((currentIndex - 1 + slides.length) % slides.length)} />
            <ArrowRight onClick={() => setCurrentIndex((currentIndex + 1) % slides.length)} />
          </>
        )}
      </div>
      
      {/* Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            onClick={() => setCurrentIndex(index)}
            className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${index === currentIndex ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-transparent hover:border-gray-300'}`}
          >
            {slide.image ? (
              <img src={slide.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">{index + 1}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 6. GAMING NEON SLIDER
// ═══════════════════════════════════════════════════════════════

export const SliderGamingNeon: React.FC<SliderProps> = ({
  slides,
  showArrows = true,
  showDots = true,
  className = '',
}) => {
  const { currentIndex, goToSlide, goNext, goPrev } = useSlider(slides.length, { autoPlay: true, autoPlayInterval: 5000, infinite: true });

  return (
    <div className={`relative py-12 px-4 bg-gray-950 overflow-hidden ${className}`}>
      {/* Glow Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl" />
      
      <div className="relative max-w-6xl mx-auto">
        <div className="relative aspect-video rounded-2xl overflow-hidden border border-purple-500/30">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-all duration-700 ${index === currentIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
            >
              {slide.image ? (
                <img src={slide.image} alt={slide.title || ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-cyan-900/50" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                {slide.badge && (
                  <span className="inline-block px-3 py-1 mb-4 text-sm font-bold bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded">{slide.badge}</span>
                )}
                {slide.title && (
                  <h3 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400">{slide.title}</h3>
                )}
                {slide.description && <p className="text-gray-400 mt-2 max-w-2xl">{slide.description}</p>}
              </div>
            </div>
          ))}
        </div>

        {showArrows && (
          <>
            <button onClick={goPrev} className="absolute left-0 top-1/2 -translate-y-1/2 p-4 text-purple-400 hover:text-purple-300 transition-colors">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={goNext} className="absolute right-0 top-1/2 -translate-y-1/2 p-4 text-purple-400 hover:text-purple-300 transition-colors">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </>
        )}

        {showDots && (
          <div className="flex justify-center gap-2 mt-6">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`h-1 rounded-full transition-all ${i === currentIndex ? 'w-8 bg-gradient-to-r from-purple-500 to-cyan-500' : 'w-4 bg-gray-700 hover:bg-gray-600'}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 7. CORPORATE CLIENTS LOGO SLIDER
// ═══════════════════════════════════════════════════════════════

export const SliderCorporateClients: React.FC<SliderProps> = ({
  slides,
  className = '',
}) => {
  return (
    <div className={`py-12 bg-gray-50 overflow-hidden ${className}`}>
      <div className="relative">
        <div className="flex animate-scroll">
          {[...slides, ...slides].map((slide, index) => (
            <div key={`${slide.id}-${index}`} className="flex-shrink-0 px-8">
              {slide.image ? (
                <img src={slide.image} alt={slide.title || ''} className="h-12 w-auto grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100" />
              ) : (
                <div className="h-12 w-32 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-sm">
                  {slide.title || 'Logo'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 8. CREATIVE SPLIT SLIDER
// ═══════════════════════════════════════════════════════════════

export const SliderCreativeSplit: React.FC<SliderProps> = ({
  slides,
  showDots = true,
  className = '',
}) => {
  const { currentIndex, goToSlide, goNext, goPrev } = useSlider(slides.length, { autoPlay: true, autoPlayInterval: 6000, infinite: true });

  return (
    <div className={`relative min-h-screen bg-black ${className}`}>
      <div className="grid md:grid-cols-2 min-h-screen">
        {/* Left - Content */}
        <div className="flex items-center justify-center p-12 md:p-20 relative z-10">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-12 md:inset-20 flex flex-col justify-center transition-all duration-700 ${index === currentIndex ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8 pointer-events-none'}`}
            >
              {slide.badge && (
                <span className="text-sm text-gray-400 tracking-widest uppercase mb-4">{slide.badge}</span>
              )}
              {slide.title && (
                <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">{slide.title}</h2>
              )}
              {slide.description && (
                <p className="text-lg text-gray-400 mb-8 max-w-md">{slide.description}</p>
              )}
              {slide.link && (
                <a href={slide.link} className="inline-flex items-center gap-2 text-white font-medium hover:gap-4 transition-all">
                  Explore <span>→</span>
                </a>
              )}
            </div>
          ))}
        </div>
        
        {/* Right - Image */}
        <div className="relative overflow-hidden">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-all duration-1000 ${index === currentIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'}`}
            >
              {slide.image ? (
                <img src={slide.image} alt={slide.title || ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="absolute bottom-8 left-12 md:left-20 z-20 flex items-center gap-4">
        <button onClick={goPrev} className="p-2 text-white/50 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-white/50">
          <span className="text-white">{String(currentIndex + 1).padStart(2, '0')}</span>
          {' / '}
          {String(slides.length).padStart(2, '0')}
        </span>
        <button onClick={goNext} className="p-2 text-white/50 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {showDots && (
        <div className="absolute bottom-8 right-12 md:right-20 z-20 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`w-8 h-1 rounded-full transition-all ${i === currentIndex ? 'bg-white' : 'bg-white/30 hover:bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// COMPONENTS MAP
// ═══════════════════════════════════════════════════════════════

export const sliderComponents: Record<string, React.FC<SliderProps>> = {
  'basic-simple': SliderBasicSimple,
  'basic-arrows': SliderBasicSimple,
  'basic-dots': SliderBasicSimple,
  'basic-fade': SliderBasicSimple,
  'product-carousel': SliderProductCarousel,
  'product-grid': SliderProductCarousel,
  'product-featured': SliderProductCarousel,
  'hero-fullscreen': SliderHeroFullscreen,
  'hero-slideshow': SliderHeroFullscreen,
  'testimonial-simple': SliderTestimonial,
  'testimonial-card': SliderTestimonial,
  'testimonial-carousel': SliderTestimonial,
  'gallery-thumbnails': SliderGalleryThumbnails,
  'gallery-lightbox': SliderGalleryThumbnails,
  'gaming-neon': SliderGamingNeon,
  'gaming-cyberpunk': SliderGamingNeon,
  'corporate-clients': SliderCorporateClients,
  'corporate-partners': SliderCorporateClients,
  'creative-split': SliderCreativeSplit,
  'creative-agency': SliderCreativeSplit,
};

export default sliderComponents;
