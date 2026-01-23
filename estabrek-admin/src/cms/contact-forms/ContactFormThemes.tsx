"use client";

import React, { useState } from 'react';

// ═══════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface ContactFormTheme {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  layout: 'single' | 'split' | 'floating' | 'card' | 'minimal' | 'fullwidth' | 'sidebar';
  tags?: string[];
}

export interface ContactFormProps {
  theme?: string;
  // Content
  title?: string;
  subtitle?: string;
  description?: string;
  // Fields config
  showName?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
  showSubject?: boolean;
  showCompany?: boolean;
  showMessage?: boolean;
  // Labels
  nameLabel?: string;
  emailLabel?: string;
  phoneLabel?: string;
  subjectLabel?: string;
  companyLabel?: string;
  messageLabel?: string;
  submitLabel?: string;
  // Placeholders
  namePlaceholder?: string;
  emailPlaceholder?: string;
  phonePlaceholder?: string;
  subjectPlaceholder?: string;
  companyPlaceholder?: string;
  messagePlaceholder?: string;
  // Contact info
  email?: string;
  phone?: string;
  address?: string;
  // Handlers
  onSubmit?: (data: any) => void;
  // Customization
  className?: string;
  children?: React.ReactNode;
}

// ═══════════════════════════════════════════════════════════════
// 100 CONTACT FORM THEMES DATA
// ═══════════════════════════════════════════════════════════════

export const contactFormThemes: ContactFormTheme[] = [
  // ═══════════════════════════════════════════════════════════════
  // 🎯 BASIC / MINIMAL (1-15)
  // ═══════════════════════════════════════════════════════════════
  { id: 'basic-simple', name: 'Basic Simple', nameAr: 'أساسي بسيط', category: 'Basic', layout: 'single', tags: ['basic', 'clean', 'minimal'] },
  { id: 'basic-card', name: 'Basic Card', nameAr: 'أساسي بطاقة', category: 'Basic', layout: 'card', tags: ['basic', 'card', 'shadow'] },
  { id: 'basic-bordered', name: 'Basic Bordered', nameAr: 'أساسي محدد', category: 'Basic', layout: 'single', tags: ['basic', 'bordered'] },
  { id: 'basic-rounded', name: 'Basic Rounded', nameAr: 'أساسي دائري', category: 'Basic', layout: 'card', tags: ['basic', 'rounded'] },
  { id: 'basic-dark', name: 'Basic Dark', nameAr: 'أساسي داكن', category: 'Basic', layout: 'single', tags: ['basic', 'dark'] },
  { id: 'basic-split', name: 'Basic Split', nameAr: 'أساسي منقسم', category: 'Basic', layout: 'split', tags: ['basic', 'split', 'info'] },
  { id: 'basic-floating', name: 'Basic Floating Labels', nameAr: 'أساسي عائم', category: 'Basic', layout: 'floating', tags: ['basic', 'floating'] },
  { id: 'basic-inline', name: 'Basic Inline', nameAr: 'أساسي سطري', category: 'Basic', layout: 'single', tags: ['basic', 'inline'] },
  { id: 'basic-stacked', name: 'Basic Stacked', nameAr: 'أساسي مكدس', category: 'Basic', layout: 'single', tags: ['basic', 'stacked'] },
  { id: 'basic-two-column', name: 'Basic Two Column', nameAr: 'أساسي عمودين', category: 'Basic', layout: 'single', tags: ['basic', 'grid'] },
  { id: 'basic-centered', name: 'Basic Centered', nameAr: 'أساسي متوسط', category: 'Basic', layout: 'card', tags: ['basic', 'centered'] },
  { id: 'basic-fullwidth', name: 'Basic Full Width', nameAr: 'أساسي عرض كامل', category: 'Basic', layout: 'fullwidth', tags: ['basic', 'fullwidth'] },
  { id: 'basic-sidebar', name: 'Basic With Sidebar', nameAr: 'أساسي شريط جانبي', category: 'Basic', layout: 'sidebar', tags: ['basic', 'sidebar'] },
  { id: 'basic-glass', name: 'Basic Glass', nameAr: 'أساسي زجاجي', category: 'Basic', layout: 'card', tags: ['basic', 'glass', 'blur'] },
  { id: 'basic-gradient', name: 'Basic Gradient', nameAr: 'أساسي متدرج', category: 'Basic', layout: 'card', tags: ['basic', 'gradient'] },

  // ═══════════════════════════════════════════════════════════════
  // 🚀 TECH / STARTUP (16-27)
  // ═══════════════════════════════════════════════════════════════
  { id: 'tech-modern', name: 'Tech Modern', nameAr: 'تقنية حديث', category: 'Tech', layout: 'split', tags: ['tech', 'modern', 'startup'] },
  { id: 'tech-saas', name: 'Tech SaaS', nameAr: 'تقنية SaaS', category: 'Tech', layout: 'card', tags: ['tech', 'saas', 'product'] },
  { id: 'tech-developer', name: 'Tech Developer', nameAr: 'تقنية مطور', category: 'Tech', layout: 'single', tags: ['tech', 'developer', 'code'] },
  { id: 'tech-api', name: 'Tech API', nameAr: 'تقنية API', category: 'Tech', layout: 'card', tags: ['tech', 'api', 'developer'] },
  { id: 'tech-ai', name: 'Tech AI', nameAr: 'تقنية ذكاء اصطناعي', category: 'Tech', layout: 'split', tags: ['tech', 'ai', 'futuristic'] },
  { id: 'tech-crypto', name: 'Tech Crypto', nameAr: 'تقنية كريبتو', category: 'Tech', layout: 'card', tags: ['tech', 'crypto', 'blockchain'] },
  { id: 'tech-cloud', name: 'Tech Cloud', nameAr: 'تقنية سحابي', category: 'Tech', layout: 'split', tags: ['tech', 'cloud', 'hosting'] },
  { id: 'tech-security', name: 'Tech Security', nameAr: 'تقنية أمان', category: 'Tech', layout: 'card', tags: ['tech', 'security', 'cyber'] },
  { id: 'tech-fintech', name: 'Tech Fintech', nameAr: 'تقنية مالية', category: 'Tech', layout: 'split', tags: ['tech', 'fintech', 'finance'] },
  { id: 'tech-mobile', name: 'Tech Mobile', nameAr: 'تقنية موبايل', category: 'Tech', layout: 'card', tags: ['tech', 'mobile', 'app'] },
  { id: 'tech-dark', name: 'Tech Dark', nameAr: 'تقنية داكن', category: 'Tech', layout: 'single', tags: ['tech', 'dark', 'modern'] },
  { id: 'tech-gradient', name: 'Tech Gradient', nameAr: 'تقنية متدرج', category: 'Tech', layout: 'card', tags: ['tech', 'gradient', 'purple'] },

  // ═══════════════════════════════════════════════════════════════
  // 🛒 E-COMMERCE (28-39)
  // ═══════════════════════════════════════════════════════════════
  { id: 'ecommerce-modern', name: 'E-commerce Modern', nameAr: 'متجر حديث', category: 'E-commerce', layout: 'split', tags: ['ecommerce', 'modern', 'shop'] },
  { id: 'ecommerce-minimal', name: 'E-commerce Minimal', nameAr: 'متجر بسيط', category: 'E-commerce', layout: 'single', tags: ['ecommerce', 'minimal'] },
  { id: 'ecommerce-support', name: 'E-commerce Support', nameAr: 'متجر دعم', category: 'E-commerce', layout: 'split', tags: ['ecommerce', 'support', 'help'] },
  { id: 'ecommerce-fashion', name: 'E-commerce Fashion', nameAr: 'متجر أزياء', category: 'E-commerce', layout: 'card', tags: ['ecommerce', 'fashion', 'elegant'] },
  { id: 'ecommerce-electronics', name: 'E-commerce Electronics', nameAr: 'متجر إلكترونيات', category: 'E-commerce', layout: 'split', tags: ['ecommerce', 'electronics', 'tech'] },
  { id: 'ecommerce-luxury', name: 'E-commerce Luxury', nameAr: 'متجر فاخر', category: 'E-commerce', layout: 'card', tags: ['ecommerce', 'luxury', 'premium'] },
  { id: 'ecommerce-kids', name: 'E-commerce Kids', nameAr: 'متجر أطفال', category: 'E-commerce', layout: 'card', tags: ['ecommerce', 'kids', 'playful'] },
  { id: 'ecommerce-beauty', name: 'E-commerce Beauty', nameAr: 'متجر جمال', category: 'E-commerce', layout: 'split', tags: ['ecommerce', 'beauty', 'cosmetics'] },
  { id: 'ecommerce-furniture', name: 'E-commerce Furniture', nameAr: 'متجر أثاث', category: 'E-commerce', layout: 'split', tags: ['ecommerce', 'furniture', 'home'] },
  { id: 'ecommerce-organic', name: 'E-commerce Organic', nameAr: 'متجر عضوي', category: 'E-commerce', layout: 'card', tags: ['ecommerce', 'organic', 'natural'] },
  { id: 'ecommerce-wholesale', name: 'E-commerce Wholesale', nameAr: 'متجر جملة', category: 'E-commerce', layout: 'sidebar', tags: ['ecommerce', 'wholesale', 'b2b'] },
  { id: 'ecommerce-inquiry', name: 'E-commerce Inquiry', nameAr: 'متجر استفسار', category: 'E-commerce', layout: 'card', tags: ['ecommerce', 'inquiry', 'quote'] },

  // ═══════════════════════════════════════════════════════════════
  // 🎮 GAMING (40-49)
  // ═══════════════════════════════════════════════════════════════
  { id: 'gaming-neon', name: 'Gaming Neon', nameAr: 'ألعاب نيون', category: 'Gaming', layout: 'card', tags: ['gaming', 'neon', 'dark'] },
  { id: 'gaming-cyberpunk', name: 'Gaming Cyberpunk', nameAr: 'ألعاب سايبربانك', category: 'Gaming', layout: 'card', tags: ['gaming', 'cyberpunk', 'futuristic'] },
  { id: 'gaming-esports', name: 'Gaming Esports', nameAr: 'ألعاب رياضات', category: 'Gaming', layout: 'split', tags: ['gaming', 'esports', 'competitive'] },
  { id: 'gaming-stream', name: 'Gaming Stream', nameAr: 'ألعاب بث', category: 'Gaming', layout: 'card', tags: ['gaming', 'stream', 'twitch'] },
  { id: 'gaming-retro', name: 'Gaming Retro', nameAr: 'ألعاب ريترو', category: 'Gaming', layout: 'card', tags: ['gaming', 'retro', 'pixel'] },
  { id: 'gaming-mobile', name: 'Gaming Mobile', nameAr: 'ألعاب موبايل', category: 'Gaming', layout: 'card', tags: ['gaming', 'mobile', 'casual'] },
  { id: 'gaming-vr', name: 'Gaming VR', nameAr: 'ألعاب واقع افتراضي', category: 'Gaming', layout: 'split', tags: ['gaming', 'vr', 'immersive'] },
  { id: 'gaming-mmo', name: 'Gaming MMO', nameAr: 'ألعاب MMO', category: 'Gaming', layout: 'card', tags: ['gaming', 'mmo', 'rpg'] },
  { id: 'gaming-support', name: 'Gaming Support', nameAr: 'ألعاب دعم', category: 'Gaming', layout: 'split', tags: ['gaming', 'support', 'help'] },
  { id: 'gaming-feedback', name: 'Gaming Feedback', nameAr: 'ألعاب ملاحظات', category: 'Gaming', layout: 'card', tags: ['gaming', 'feedback', 'report'] },

  // ═══════════════════════════════════════════════════════════════
  // 🏢 CORPORATE / BUSINESS (50-61)
  // ═══════════════════════════════════════════════════════════════
  { id: 'corporate-professional', name: 'Corporate Professional', nameAr: 'شركات احترافي', category: 'Corporate', layout: 'split', tags: ['corporate', 'professional', 'business'] },
  { id: 'corporate-consulting', name: 'Corporate Consulting', nameAr: 'شركات استشارات', category: 'Corporate', layout: 'sidebar', tags: ['corporate', 'consulting', 'services'] },
  { id: 'corporate-finance', name: 'Corporate Finance', nameAr: 'شركات مالية', category: 'Corporate', layout: 'split', tags: ['corporate', 'finance', 'banking'] },
  { id: 'corporate-law', name: 'Corporate Law', nameAr: 'شركات قانونية', category: 'Corporate', layout: 'card', tags: ['corporate', 'law', 'legal'] },
  { id: 'corporate-healthcare', name: 'Corporate Healthcare', nameAr: 'شركات صحة', category: 'Corporate', layout: 'split', tags: ['corporate', 'healthcare', 'medical'] },
  { id: 'corporate-real-estate', name: 'Corporate Real Estate', nameAr: 'شركات عقارات', category: 'Corporate', layout: 'split', tags: ['corporate', 'realestate', 'property'] },
  { id: 'corporate-insurance', name: 'Corporate Insurance', nameAr: 'شركات تأمين', category: 'Corporate', layout: 'card', tags: ['corporate', 'insurance', 'trust'] },
  { id: 'corporate-hr', name: 'Corporate HR', nameAr: 'شركات موارد بشرية', category: 'Corporate', layout: 'split', tags: ['corporate', 'hr', 'recruitment'] },
  { id: 'corporate-education', name: 'Corporate Education', nameAr: 'شركات تعليم', category: 'Corporate', layout: 'card', tags: ['corporate', 'education', 'training'] },
  { id: 'corporate-manufacturing', name: 'Corporate Manufacturing', nameAr: 'شركات تصنيع', category: 'Corporate', layout: 'sidebar', tags: ['corporate', 'manufacturing', 'industrial'] },
  { id: 'corporate-logistics', name: 'Corporate Logistics', nameAr: 'شركات لوجستية', category: 'Corporate', layout: 'split', tags: ['corporate', 'logistics', 'shipping'] },
  { id: 'corporate-ngo', name: 'Corporate NGO', nameAr: 'شركات منظمات', category: 'Corporate', layout: 'card', tags: ['corporate', 'ngo', 'nonprofit'] },

  // ═══════════════════════════════════════════════════════════════
  // 🎨 CREATIVE / AGENCY (62-73)
  // ═══════════════════════════════════════════════════════════════
  { id: 'creative-agency', name: 'Creative Agency', nameAr: 'إبداعي وكالة', category: 'Creative', layout: 'split', tags: ['creative', 'agency', 'design'] },
  { id: 'creative-portfolio', name: 'Creative Portfolio', nameAr: 'إبداعي معرض', category: 'Creative', layout: 'minimal', tags: ['creative', 'portfolio', 'personal'] },
  { id: 'creative-studio', name: 'Creative Studio', nameAr: 'إبداعي استوديو', category: 'Creative', layout: 'card', tags: ['creative', 'studio', 'design'] },
  { id: 'creative-photography', name: 'Creative Photography', nameAr: 'إبداعي تصوير', category: 'Creative', layout: 'split', tags: ['creative', 'photography', 'visual'] },
  { id: 'creative-video', name: 'Creative Video', nameAr: 'إبداعي فيديو', category: 'Creative', layout: 'card', tags: ['creative', 'video', 'production'] },
  { id: 'creative-music', name: 'Creative Music', nameAr: 'إبداعي موسيقى', category: 'Creative', layout: 'card', tags: ['creative', 'music', 'audio'] },
  { id: 'creative-art', name: 'Creative Art', nameAr: 'إبداعي فني', category: 'Creative', layout: 'minimal', tags: ['creative', 'art', 'gallery'] },
  { id: 'creative-freelancer', name: 'Creative Freelancer', nameAr: 'إبداعي مستقل', category: 'Creative', layout: 'card', tags: ['creative', 'freelancer', 'personal'] },
  { id: 'creative-architect', name: 'Creative Architect', nameAr: 'إبداعي معماري', category: 'Creative', layout: 'split', tags: ['creative', 'architect', 'design'] },
  { id: 'creative-branding', name: 'Creative Branding', nameAr: 'إبداعي علامة تجارية', category: 'Creative', layout: 'card', tags: ['creative', 'branding', 'identity'] },
  { id: 'creative-motion', name: 'Creative Motion', nameAr: 'إبداعي حركة', category: 'Creative', layout: 'split', tags: ['creative', 'motion', 'animation'] },
  { id: 'creative-ux', name: 'Creative UX', nameAr: 'إبداعي تجربة مستخدم', category: 'Creative', layout: 'card', tags: ['creative', 'ux', 'design'] },

  // ═══════════════════════════════════════════════════════════════
  // 🍔 FOOD & RESTAURANT (74-83)
  // ═══════════════════════════════════════════════════════════════
  { id: 'food-restaurant', name: 'Food Restaurant', nameAr: 'طعام مطعم', category: 'Food', layout: 'split', tags: ['food', 'restaurant', 'dining'] },
  { id: 'food-cafe', name: 'Food Cafe', nameAr: 'طعام كافيه', category: 'Food', layout: 'card', tags: ['food', 'cafe', 'coffee'] },
  { id: 'food-delivery', name: 'Food Delivery', nameAr: 'طعام توصيل', category: 'Food', layout: 'card', tags: ['food', 'delivery', 'order'] },
  { id: 'food-catering', name: 'Food Catering', nameAr: 'طعام تموين', category: 'Food', layout: 'split', tags: ['food', 'catering', 'events'] },
  { id: 'food-bakery', name: 'Food Bakery', nameAr: 'طعام مخبز', category: 'Food', layout: 'card', tags: ['food', 'bakery', 'sweet'] },
  { id: 'food-fine-dining', name: 'Food Fine Dining', nameAr: 'طعام راقي', category: 'Food', layout: 'split', tags: ['food', 'finedining', 'luxury'] },
  { id: 'food-reservation', name: 'Food Reservation', nameAr: 'طعام حجز', category: 'Food', layout: 'card', tags: ['food', 'reservation', 'booking'] },
  { id: 'food-bar', name: 'Food Bar', nameAr: 'طعام بار', category: 'Food', layout: 'card', tags: ['food', 'bar', 'drinks'] },
  { id: 'food-organic', name: 'Food Organic', nameAr: 'طعام عضوي', category: 'Food', layout: 'split', tags: ['food', 'organic', 'healthy'] },
  { id: 'food-food-truck', name: 'Food Truck', nameAr: 'طعام شاحنة', category: 'Food', layout: 'card', tags: ['food', 'foodtruck', 'street'] },

  // ═══════════════════════════════════════════════════════════════
  // 🏋️ FITNESS & WELLNESS (84-91)
  // ═══════════════════════════════════════════════════════════════
  { id: 'fitness-gym', name: 'Fitness Gym', nameAr: 'لياقة جيم', category: 'Fitness', layout: 'split', tags: ['fitness', 'gym', 'workout'] },
  { id: 'fitness-yoga', name: 'Fitness Yoga', nameAr: 'لياقة يوغا', category: 'Fitness', layout: 'card', tags: ['fitness', 'yoga', 'wellness'] },
  { id: 'fitness-trainer', name: 'Fitness Trainer', nameAr: 'لياقة مدرب', category: 'Fitness', layout: 'split', tags: ['fitness', 'trainer', 'coaching'] },
  { id: 'fitness-spa', name: 'Fitness Spa', nameAr: 'لياقة سبا', category: 'Fitness', layout: 'card', tags: ['fitness', 'spa', 'relaxation'] },
  { id: 'fitness-nutrition', name: 'Fitness Nutrition', nameAr: 'لياقة تغذية', category: 'Fitness', layout: 'split', tags: ['fitness', 'nutrition', 'diet'] },
  { id: 'fitness-membership', name: 'Fitness Membership', nameAr: 'لياقة عضوية', category: 'Fitness', layout: 'card', tags: ['fitness', 'membership', 'join'] },
  { id: 'fitness-class', name: 'Fitness Class', nameAr: 'لياقة فصل', category: 'Fitness', layout: 'card', tags: ['fitness', 'class', 'booking'] },
  { id: 'fitness-meditation', name: 'Fitness Meditation', nameAr: 'لياقة تأمل', category: 'Fitness', layout: 'minimal', tags: ['fitness', 'meditation', 'mindfulness'] },

  // ═══════════════════════════════════════════════════════════════
  // ✈️ TRAVEL & HOSPITALITY (92-100)
  // ═══════════════════════════════════════════════════════════════
  { id: 'travel-hotel', name: 'Travel Hotel', nameAr: 'سفر فندق', category: 'Travel', layout: 'split', tags: ['travel', 'hotel', 'hospitality'] },
  { id: 'travel-booking', name: 'Travel Booking', nameAr: 'سفر حجز', category: 'Travel', layout: 'card', tags: ['travel', 'booking', 'reservation'] },
  { id: 'travel-tour', name: 'Travel Tour', nameAr: 'سفر جولة', category: 'Travel', layout: 'split', tags: ['travel', 'tour', 'guide'] },
  { id: 'travel-airline', name: 'Travel Airline', nameAr: 'سفر طيران', category: 'Travel', layout: 'card', tags: ['travel', 'airline', 'flight'] },
  { id: 'travel-cruise', name: 'Travel Cruise', nameAr: 'سفر رحلة بحرية', category: 'Travel', layout: 'split', tags: ['travel', 'cruise', 'ocean'] },
  { id: 'travel-resort', name: 'Travel Resort', nameAr: 'سفر منتجع', category: 'Travel', layout: 'card', tags: ['travel', 'resort', 'luxury'] },
  { id: 'travel-adventure', name: 'Travel Adventure', nameAr: 'سفر مغامرة', category: 'Travel', layout: 'split', tags: ['travel', 'adventure', 'outdoor'] },
  { id: 'travel-rental', name: 'Travel Rental', nameAr: 'سفر إيجار', category: 'Travel', layout: 'card', tags: ['travel', 'rental', 'airbnb'] },
  { id: 'travel-inquiry', name: 'Travel Inquiry', nameAr: 'سفر استفسار', category: 'Travel', layout: 'sidebar', tags: ['travel', 'inquiry', 'custom'] },
];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const contactFormCategories = [...new Set(contactFormThemes.map(t => t.category))];

export const getContactFormTheme = (themeId: string): ContactFormTheme | undefined => {
  return contactFormThemes.find(t => t.id === themeId);
};

export const getFormsByCategory = (category: string): ContactFormTheme[] => {
  return contactFormThemes.filter(t => t.category === category);
};

export const getFormsByTag = (tag: string): ContactFormTheme[] => {
  return contactFormThemes.filter(t => t.tags?.includes(tag));
};

// ═══════════════════════════════════════════════════════════════
// CONTACT FORM COMPONENTS
// ═══════════════════════════════════════════════════════════════

// Default Props
const defaultProps: Partial<ContactFormProps> = {
  showName: true,
  showEmail: true,
  showPhone: true,
  showSubject: true,
  showMessage: true,
  nameLabel: 'Name',
  emailLabel: 'Email',
  phoneLabel: 'Phone',
  subjectLabel: 'Subject',
  companyLabel: 'Company',
  messageLabel: 'Message',
  submitLabel: 'Send Message',
  namePlaceholder: 'Your name',
  emailPlaceholder: 'your@email.com',
  phonePlaceholder: '+1 (555) 000-0000',
  subjectPlaceholder: 'How can we help?',
  companyPlaceholder: 'Your company',
  messagePlaceholder: 'Your message...',
};

// 1. Basic Simple Form
export const ContactFormBasicSimple: React.FC<ContactFormProps> = (props) => {
  const p = { ...defaultProps, ...props };
  return (
    <section className={`py-16 px-4 bg-white ${p.className || ''}`}>
      <div className="max-w-xl mx-auto">
        {p.title && <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">{p.title}</h2>}
        {p.subtitle && <p className="text-gray-600 mb-8 text-center">{p.subtitle}</p>}
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); p.onSubmit?.({}); }}>
          {p.showName && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{p.nameLabel}</label>
              <input type="text" placeholder={p.namePlaceholder} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          )}
          {p.showEmail && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{p.emailLabel}</label>
              <input type="email" placeholder={p.emailPlaceholder} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          )}
          {p.showPhone && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{p.phoneLabel}</label>
              <input type="tel" placeholder={p.phonePlaceholder} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          )}
          {p.showSubject && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{p.subjectLabel}</label>
              <input type="text" placeholder={p.subjectPlaceholder} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          )}
          {p.showMessage && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{p.messageLabel}</label>
              <textarea rows={5} placeholder={p.messagePlaceholder} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"></textarea>
            </div>
          )}
          <button type="submit" className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
            {p.submitLabel}
          </button>
        </form>
      </div>
    </section>
  );
};

// 2. Basic Card Form
export const ContactFormBasicCard: React.FC<ContactFormProps> = (props) => {
  const p = { ...defaultProps, ...props };
  return (
    <section className={`py-16 px-4 bg-gray-50 ${p.className || ''}`}>
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        {p.title && <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">{p.title}</h2>}
        {p.subtitle && <p className="text-gray-600 mb-8 text-center">{p.subtitle}</p>}
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); p.onSubmit?.({}); }}>
          <div className="grid grid-cols-2 gap-4">
            {p.showName && <input type="text" placeholder={p.namePlaceholder} className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />}
            {p.showEmail && <input type="email" placeholder={p.emailPlaceholder} className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />}
          </div>
          {p.showPhone && <input type="tel" placeholder={p.phonePlaceholder} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />}
          {p.showSubject && <input type="text" placeholder={p.subjectPlaceholder} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />}
          {p.showMessage && <textarea rows={4} placeholder={p.messagePlaceholder} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"></textarea>}
          <button type="submit" className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">{p.submitLabel}</button>
        </form>
      </div>
    </section>
  );
};

// 3. Basic Split Form
export const ContactFormBasicSplit: React.FC<ContactFormProps> = (props) => {
  const p = { ...defaultProps, ...props };
  return (
    <section className={`py-16 px-4 bg-white ${p.className || ''}`}>
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
        {/* Info Side */}
        <div>
          {p.title && <h2 className="text-3xl font-bold text-gray-900 mb-4">{p.title}</h2>}
          {p.description && <p className="text-gray-600 mb-8">{p.description}</p>}
          <div className="space-y-6">
            {p.email && (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{p.email}</p>
                </div>
              </div>
            )}
            {p.phone && (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">{p.phone}</p>
                </div>
              </div>
            )}
            {p.address && (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium text-gray-900">{p.address}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Form Side */}
        <div className="bg-gray-50 rounded-2xl p-8">
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); p.onSubmit?.({}); }}>
            {p.showName && <input type="text" placeholder={p.namePlaceholder} className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500" />}
            {p.showEmail && <input type="email" placeholder={p.emailPlaceholder} className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500" />}
            {p.showPhone && <input type="tel" placeholder={p.phonePlaceholder} className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500" />}
            {p.showSubject && <input type="text" placeholder={p.subjectPlaceholder} className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500" />}
            {p.showMessage && <textarea rows={4} placeholder={p.messagePlaceholder} className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 resize-none"></textarea>}
            <button type="submit" className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">{p.submitLabel}</button>
          </form>
        </div>
      </div>
    </section>
  );
};

// 4. Dark Theme Form
export const ContactFormDark: React.FC<ContactFormProps> = (props) => {
  const p = { ...defaultProps, ...props };
  return (
    <section className={`py-16 px-4 bg-gray-900 ${p.className || ''}`}>
      <div className="max-w-xl mx-auto">
        {p.title && <h2 className="text-3xl font-bold text-white mb-2 text-center">{p.title}</h2>}
        {p.subtitle && <p className="text-gray-400 mb-8 text-center">{p.subtitle}</p>}
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); p.onSubmit?.({}); }}>
          {p.showName && <input type="text" placeholder={p.namePlaceholder} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />}
          {p.showEmail && <input type="email" placeholder={p.emailPlaceholder} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />}
          {p.showPhone && <input type="tel" placeholder={p.phonePlaceholder} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />}
          {p.showMessage && <textarea rows={5} placeholder={p.messagePlaceholder} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"></textarea>}
          <button type="submit" className="w-full py-3 bg-white text-gray-900 font-medium rounded-lg hover:bg-gray-100">{p.submitLabel}</button>
        </form>
      </div>
    </section>
  );
};

// 5. Tech Gradient Form
export const ContactFormTechGradient: React.FC<ContactFormProps> = (props) => {
  const p = { ...defaultProps, ...props };
  return (
    <section className={`py-16 px-4 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 ${p.className || ''}`}>
      <div className="max-w-xl mx-auto">
        {p.title && <h2 className="text-3xl font-bold text-white mb-2 text-center">{p.title}</h2>}
        {p.subtitle && <p className="text-purple-200 mb-8 text-center">{p.subtitle}</p>}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); p.onSubmit?.({}); }}>
            <div className="grid grid-cols-2 gap-4">
              {p.showName && <input type="text" placeholder={p.namePlaceholder} className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200 focus:ring-2 focus:ring-white/50" />}
              {p.showEmail && <input type="email" placeholder={p.emailPlaceholder} className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200 focus:ring-2 focus:ring-white/50" />}
            </div>
            {p.showPhone && <input type="tel" placeholder={p.phonePlaceholder} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200 focus:ring-2 focus:ring-white/50" />}
            {p.showMessage && <textarea rows={4} placeholder={p.messagePlaceholder} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200 focus:ring-2 focus:ring-white/50 resize-none"></textarea>}
            <button type="submit" className="w-full py-3 bg-white text-purple-700 font-medium rounded-lg hover:bg-purple-50">{p.submitLabel}</button>
          </form>
        </div>
      </div>
    </section>
  );
};

// 6. Gaming Neon Form
export const ContactFormGamingNeon: React.FC<ContactFormProps> = (props) => {
  const p = { ...defaultProps, ...props };
  return (
    <section className={`py-16 px-4 bg-gray-950 ${p.className || ''}`}>
      <div className="max-w-xl mx-auto relative">
        {/* Glow Effects */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-600/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-cyan-600/30 rounded-full blur-3xl"></div>
        
        <div className="relative bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30">
          {p.title && <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-2 text-center">{p.title}</h2>}
          {p.subtitle && <p className="text-gray-400 mb-8 text-center">{p.subtitle}</p>}
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); p.onSubmit?.({}); }}>
            {p.showName && <input type="text" placeholder={p.namePlaceholder} className="w-full px-4 py-3 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />}
            {p.showEmail && <input type="email" placeholder={p.emailPlaceholder} className="w-full px-4 py-3 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />}
            {p.showSubject && (
              <select className="w-full px-4 py-3 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white focus:ring-2 focus:ring-purple-500">
                <option value="">Select Topic</option>
                <option value="support">Technical Support</option>
                <option value="bug">Bug Report</option>
                <option value="feedback">Feedback</option>
                <option value="other">Other</option>
              </select>
            )}
            {p.showMessage && <textarea rows={4} placeholder={p.messagePlaceholder} className="w-full px-4 py-3 bg-gray-800/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 resize-none"></textarea>}
            <button type="submit" className="w-full py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold rounded-lg hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all">{p.submitLabel}</button>
          </form>
        </div>
      </div>
    </section>
  );
};

// 7. Corporate Professional Form
export const ContactFormCorporate: React.FC<ContactFormProps> = (props) => {
  const p = { ...defaultProps, ...props };
  return (
    <section className={`py-16 px-4 bg-slate-50 ${p.className || ''}`}>
      <div className="max-w-6xl mx-auto grid md:grid-cols-5 gap-12">
        {/* Info Side */}
        <div className="md:col-span-2">
          {p.title && <h2 className="text-3xl font-bold text-slate-900 mb-4">{p.title}</h2>}
          {p.description && <p className="text-slate-600 mb-8">{p.description}</p>}
          <div className="space-y-4">
            {p.phone && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </div>
                <span className="text-slate-700">{p.phone}</span>
              </div>
            )}
            {p.email && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <span className="text-slate-700">{p.email}</span>
              </div>
            )}
            {p.address && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                </div>
                <span className="text-slate-700">{p.address}</span>
              </div>
            )}
          </div>
        </div>
        {/* Form Side */}
        <div className="md:col-span-3 bg-white rounded-xl shadow-lg p-8">
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); p.onSubmit?.({}); }}>
            <div className="grid md:grid-cols-2 gap-4">
              {p.showName && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{p.nameLabel} *</label>
                  <input type="text" placeholder={p.namePlaceholder} className="w-full px-4 py-3 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
              {p.showEmail && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{p.emailLabel} *</label>
                  <input type="email" placeholder={p.emailPlaceholder} className="w-full px-4 py-3 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {p.showPhone && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{p.phoneLabel}</label>
                  <input type="tel" placeholder={p.phonePlaceholder} className="w-full px-4 py-3 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
              {p.showCompany && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{p.companyLabel}</label>
                  <input type="text" placeholder={p.companyPlaceholder} className="w-full px-4 py-3 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
            </div>
            {p.showSubject && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{p.subjectLabel}</label>
                <select className="w-full px-4 py-3 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500">
                  <option value="">Select a topic</option>
                  <option value="sales">Sales Inquiry</option>
                  <option value="support">Support</option>
                  <option value="partnership">Partnership</option>
                  <option value="other">Other</option>
                </select>
              </div>
            )}
            {p.showMessage && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{p.messageLabel} *</label>
                <textarea rows={4} placeholder={p.messagePlaceholder} className="w-full px-4 py-3 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
              </div>
            )}
            <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-medium rounded hover:bg-blue-700">{p.submitLabel}</button>
          </form>
        </div>
      </div>
    </section>
  );
};

// 8. Food/Restaurant Form
export const ContactFormFood: React.FC<ContactFormProps> = (props) => {
  const p = { ...defaultProps, ...props };
  return (
    <section className={`py-16 px-4 bg-amber-50 ${p.className || ''}`}>
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div>
          {p.title && <h2 className="text-4xl font-serif font-bold text-amber-900 mb-4">{p.title}</h2>}
          {p.description && <p className="text-amber-700 mb-8">{p.description}</p>}
          <div className="space-y-4 text-amber-800">
            {p.phone && <p className="flex items-center gap-3"><span className="text-2xl">📞</span> {p.phone}</p>}
            {p.email && <p className="flex items-center gap-3"><span className="text-2xl">✉️</span> {p.email}</p>}
            {p.address && <p className="flex items-center gap-3"><span className="text-2xl">📍</span> {p.address}</p>}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-amber-200">
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); p.onSubmit?.({}); }}>
            {p.showName && <input type="text" placeholder={p.namePlaceholder} className="w-full px-4 py-3 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />}
            {p.showEmail && <input type="email" placeholder={p.emailPlaceholder} className="w-full px-4 py-3 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />}
            {p.showPhone && <input type="tel" placeholder={p.phonePlaceholder} className="w-full px-4 py-3 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />}
            <div>
              <label className="block text-sm font-medium text-amber-800 mb-1">Date & Time</label>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" className="px-4 py-3 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500" />
                <input type="time" className="px-4 py-3 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-amber-800 mb-1">Number of Guests</label>
              <select className="w-full px-4 py-3 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500">
                <option value="2">2 guests</option>
                <option value="4">4 guests</option>
                <option value="6">6 guests</option>
                <option value="8+">8+ guests</option>
              </select>
            </div>
            {p.showMessage && <textarea rows={3} placeholder="Special requests..." className="w-full px-4 py-3 border-2 border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 resize-none"></textarea>}
            <button type="submit" className="w-full py-3 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700">Book Table</button>
          </form>
        </div>
      </div>
    </section>
  );
};

// 9. Fitness/Gym Form  
export const ContactFormFitness: React.FC<ContactFormProps> = (props) => {
  const p = { ...defaultProps, ...props };
  return (
    <section className={`py-16 px-4 bg-gray-900 ${p.className || ''}`}>
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
        <div>
          {p.title && <h2 className="text-4xl font-black text-white uppercase mb-4">{p.title}</h2>}
          {p.description && <p className="text-gray-400 mb-8">{p.description}</p>}
          <div className="space-y-4">
            {p.phone && <p className="text-gray-300 flex items-center gap-3"><span className="w-10 h-10 bg-red-600 rounded flex items-center justify-center">📞</span> {p.phone}</p>}
            {p.email && <p className="text-gray-300 flex items-center gap-3"><span className="w-10 h-10 bg-red-600 rounded flex items-center justify-center">✉️</span> {p.email}</p>}
            {p.address && <p className="text-gray-300 flex items-center gap-3"><span className="w-10 h-10 bg-red-600 rounded flex items-center justify-center">📍</span> {p.address}</p>}
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-6">Get Your Free Trial</h3>
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); p.onSubmit?.({}); }}>
            {p.showName && <input type="text" placeholder={p.namePlaceholder} className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500" />}
            {p.showEmail && <input type="email" placeholder={p.emailPlaceholder} className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500" />}
            {p.showPhone && <input type="tel" placeholder={p.phonePlaceholder} className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500" />}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">I'm interested in</label>
              <select className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500">
                <option value="">Select program</option>
                <option value="gym">Gym Membership</option>
                <option value="pt">Personal Training</option>
                <option value="class">Group Classes</option>
                <option value="other">Other</option>
              </select>
            </div>
            {p.showMessage && <textarea rows={3} placeholder={p.messagePlaceholder} className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 resize-none"></textarea>}
            <button type="submit" className="w-full py-4 bg-red-600 text-white font-bold uppercase tracking-wider rounded-lg hover:bg-red-700">{p.submitLabel}</button>
          </form>
        </div>
      </div>
    </section>
  );
};

// 10. Travel/Hotel Form
export const ContactFormTravel: React.FC<ContactFormProps> = (props) => {
  const p = { ...defaultProps, ...props };
  return (
    <section className={`py-16 px-4 bg-sky-50 ${p.className || ''}`}>
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
        <div>
          {p.title && <h2 className="text-4xl font-light text-sky-900 mb-4">{p.title}</h2>}
          {p.description && <p className="text-sky-700 mb-8">{p.description}</p>}
          <div className="space-y-4">
            {p.phone && <p className="text-sky-800 flex items-center gap-3">📞 {p.phone}</p>}
            {p.email && <p className="text-sky-800 flex items-center gap-3">✉️ {p.email}</p>}
            {p.address && <p className="text-sky-800 flex items-center gap-3">📍 {p.address}</p>}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h3 className="text-xl font-semibold text-sky-900 mb-6">Plan Your Trip</h3>
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); p.onSubmit?.({}); }}>
            <div className="grid grid-cols-2 gap-4">
              {p.showName && <input type="text" placeholder={p.namePlaceholder} className="px-4 py-3 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-500" />}
              {p.showEmail && <input type="email" placeholder={p.emailPlaceholder} className="px-4 py-3 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-500" />}
            </div>
            {p.showPhone && <input type="tel" placeholder={p.phonePlaceholder} className="w-full px-4 py-3 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-500" />}
            <div>
              <label className="block text-sm font-medium text-sky-800 mb-1">Destination</label>
              <input type="text" placeholder="Where do you want to go?" className="w-full px-4 py-3 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-sky-800 mb-1">Check In</label>
                <input type="date" className="w-full px-4 py-3 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-sky-800 mb-1">Check Out</label>
                <input type="date" className="w-full px-4 py-3 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-sky-800 mb-1">Number of Travelers</label>
              <select className="w-full px-4 py-3 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-500">
                <option value="1">1 Traveler</option>
                <option value="2">2 Travelers</option>
                <option value="3-4">3-4 Travelers</option>
                <option value="5+">5+ Travelers</option>
              </select>
            </div>
            {p.showMessage && <textarea rows={3} placeholder="Special requests..." className="w-full px-4 py-3 border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-500 resize-none"></textarea>}
            <button type="submit" className="w-full py-3 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-700">Get Quote</button>
          </form>
        </div>
      </div>
    </section>
  );
};

// 11. Creative/Agency Form
export const ContactFormCreative: React.FC<ContactFormProps> = (props) => {
  const p = { ...defaultProps, ...props };
  return (
    <section className={`py-20 px-4 bg-black ${p.className || ''}`}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          {p.title && <h2 className="text-5xl md:text-6xl font-black text-white mb-4">{p.title}</h2>}
          {p.subtitle && <p className="text-xl text-gray-400">{p.subtitle}</p>}
        </div>
        <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); p.onSubmit?.({}); }}>
          <div className="grid md:grid-cols-2 gap-8">
            {p.showName && (
              <div>
                <label className="block text-white text-sm mb-2 uppercase tracking-wider">Name</label>
                <input type="text" placeholder={p.namePlaceholder} className="w-full px-0 py-3 bg-transparent border-b-2 border-gray-700 text-white placeholder-gray-600 focus:border-white focus:outline-none" />
              </div>
            )}
            {p.showEmail && (
              <div>
                <label className="block text-white text-sm mb-2 uppercase tracking-wider">Email</label>
                <input type="email" placeholder={p.emailPlaceholder} className="w-full px-0 py-3 bg-transparent border-b-2 border-gray-700 text-white placeholder-gray-600 focus:border-white focus:outline-none" />
              </div>
            )}
          </div>
          {p.showSubject && (
            <div>
              <label className="block text-white text-sm mb-2 uppercase tracking-wider">Project Type</label>
              <input type="text" placeholder="e.g. Branding, Web Design, Motion" className="w-full px-0 py-3 bg-transparent border-b-2 border-gray-700 text-white placeholder-gray-600 focus:border-white focus:outline-none" />
            </div>
          )}
          {p.showMessage && (
            <div>
              <label className="block text-white text-sm mb-2 uppercase tracking-wider">Tell us about your project</label>
              <textarea rows={4} placeholder={p.messagePlaceholder} className="w-full px-0 py-3 bg-transparent border-b-2 border-gray-700 text-white placeholder-gray-600 focus:border-white focus:outline-none resize-none"></textarea>
            </div>
          )}
          <div className="pt-4">
            <button type="submit" className="group px-10 py-4 bg-white text-black font-bold rounded-full inline-flex items-center gap-3 hover:bg-yellow-400 transition-colors">
              {p.submitLabel}
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

// 12. E-commerce Support Form
export const ContactFormEcommerceSupport: React.FC<ContactFormProps> = (props) => {
  const p = { ...defaultProps, ...props };
  return (
    <section className={`py-16 px-4 bg-gray-50 ${p.className || ''}`}>
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
        {/* Quick Links */}
        <div className="md:col-span-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Help</h3>
          <div className="space-y-3">
            <a href="#" className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-500 transition-colors">
              <span className="text-2xl">📦</span>
              <span className="text-gray-700">Track Order</span>
            </a>
            <a href="#" className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-500 transition-colors">
              <span className="text-2xl">↩️</span>
              <span className="text-gray-700">Returns & Refunds</span>
            </a>
            <a href="#" className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-500 transition-colors">
              <span className="text-2xl">❓</span>
              <span className="text-gray-700">FAQs</span>
            </a>
          </div>
          <div className="mt-8">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Contact Info</h4>
            {p.phone && <p className="text-gray-600 text-sm mb-2">📞 {p.phone}</p>}
            {p.email && <p className="text-gray-600 text-sm mb-2">✉️ {p.email}</p>}
          </div>
        </div>
        {/* Form */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm p-8 border border-gray-200">
          {p.title && <h2 className="text-2xl font-bold text-gray-900 mb-2">{p.title}</h2>}
          {p.subtitle && <p className="text-gray-600 mb-6">{p.subtitle}</p>}
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); p.onSubmit?.({}); }}>
            <div className="grid md:grid-cols-2 gap-4">
              {p.showName && <input type="text" placeholder={p.namePlaceholder} className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />}
              {p.showEmail && <input type="email" placeholder={p.emailPlaceholder} className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Number (if applicable)</label>
              <input type="text" placeholder="#12345" className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
              <select className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="">Select topic</option>
                <option value="order">Order Status</option>
                <option value="return">Return Request</option>
                <option value="product">Product Question</option>
                <option value="shipping">Shipping Issue</option>
                <option value="other">Other</option>
              </select>
            </div>
            {p.showMessage && <textarea rows={4} placeholder={p.messagePlaceholder} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"></textarea>}
            <div className="flex items-center gap-3">
              <input type="checkbox" id="urgent" className="w-4 h-4 text-blue-600 rounded" />
              <label htmlFor="urgent" className="text-sm text-gray-600">This is urgent</label>
            </div>
            <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">{p.submitLabel}</button>
          </form>
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════
// FORM COMPONENTS MAP
// ═══════════════════════════════════════════════════════════════

export const contactFormComponents: Record<string, React.FC<ContactFormProps>> = {
  'basic-simple': ContactFormBasicSimple,
  'basic-card': ContactFormBasicCard,
  'basic-split': ContactFormBasicSplit,
  'basic-dark': ContactFormDark,
  'basic-gradient': ContactFormTechGradient,
  'tech-modern': ContactFormBasicSplit,
  'tech-saas': ContactFormBasicCard,
  'tech-gradient': ContactFormTechGradient,
  'tech-dark': ContactFormDark,
  'gaming-neon': ContactFormGamingNeon,
  'gaming-cyberpunk': ContactFormGamingNeon,
  'corporate-professional': ContactFormCorporate,
  'corporate-consulting': ContactFormCorporate,
  'creative-agency': ContactFormCreative,
  'creative-portfolio': ContactFormCreative,
  'food-restaurant': ContactFormFood,
  'food-reservation': ContactFormFood,
  'fitness-gym': ContactFormFitness,
  'fitness-membership': ContactFormFitness,
  'travel-hotel': ContactFormTravel,
  'travel-booking': ContactFormTravel,
  'ecommerce-support': ContactFormEcommerceSupport,
  'ecommerce-modern': ContactFormBasicSplit,
};

export default contactFormComponents;
