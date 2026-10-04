import React, { useState, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface AlertTheme {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  style: 'inline' | 'toast' | 'banner' | 'floating' | 'minimal' | 'card';
  tags?: string[];
}

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'neutral';

export interface AlertProps {
  type?: AlertType;
  title?: string;
  message: string;
  icon?: React.ReactNode;
  showIcon?: boolean;
  closable?: boolean;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  autoClose?: boolean;
  autoCloseDelay?: number;
  className?: string;
  children?: React.ReactNode;
}

export interface ToastProps extends AlertProps {
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  isVisible?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// 100 ALERT THEMES DATA
// ═══════════════════════════════════════════════════════════════

export const alertThemes: AlertTheme[] = [
  // ═══════════════════════════════════════════════════════════════
  // 🎯 BASIC INLINE ALERTS (1-15)
  // ═══════════════════════════════════════════════════════════════
  { id: 'basic-simple', name: 'Basic Simple', nameAr: 'أساسي بسيط', category: 'Basic', style: 'inline', tags: ['basic', 'simple', 'clean'] },
  { id: 'basic-bordered', name: 'Basic Bordered', nameAr: 'أساسي محدد', category: 'Basic', style: 'inline', tags: ['basic', 'bordered'] },
  { id: 'basic-filled', name: 'Basic Filled', nameAr: 'أساسي ممتلئ', category: 'Basic', style: 'inline', tags: ['basic', 'filled', 'solid'] },
  { id: 'basic-soft', name: 'Basic Soft', nameAr: 'أساسي ناعم', category: 'Basic', style: 'inline', tags: ['basic', 'soft', 'light'] },
  { id: 'basic-outline', name: 'Basic Outline', nameAr: 'أساسي خط', category: 'Basic', style: 'inline', tags: ['basic', 'outline'] },
  { id: 'basic-rounded', name: 'Basic Rounded', nameAr: 'أساسي دائري', category: 'Basic', style: 'inline', tags: ['basic', 'rounded'] },
  { id: 'basic-sharp', name: 'Basic Sharp', nameAr: 'أساسي حاد', category: 'Basic', style: 'inline', tags: ['basic', 'sharp', 'square'] },
  { id: 'basic-with-icon', name: 'Basic With Icon', nameAr: 'أساسي مع أيقونة', category: 'Basic', style: 'inline', tags: ['basic', 'icon'] },
  { id: 'basic-with-title', name: 'Basic With Title', nameAr: 'أساسي مع عنوان', category: 'Basic', style: 'inline', tags: ['basic', 'title'] },
  { id: 'basic-with-action', name: 'Basic With Action', nameAr: 'أساسي مع إجراء', category: 'Basic', style: 'inline', tags: ['basic', 'action', 'button'] },
  { id: 'basic-closable', name: 'Basic Closable', nameAr: 'أساسي قابل للإغلاق', category: 'Basic', style: 'inline', tags: ['basic', 'closable', 'dismiss'] },
  { id: 'basic-left-accent', name: 'Basic Left Accent', nameAr: 'أساسي حد يسار', category: 'Basic', style: 'inline', tags: ['basic', 'accent', 'border'] },
  { id: 'basic-top-accent', name: 'Basic Top Accent', nameAr: 'أساسي حد علوي', category: 'Basic', style: 'inline', tags: ['basic', 'accent', 'top'] },
  { id: 'basic-gradient', name: 'Basic Gradient', nameAr: 'أساسي متدرج', category: 'Basic', style: 'inline', tags: ['basic', 'gradient'] },
  { id: 'basic-glass', name: 'Basic Glass', nameAr: 'أساسي زجاجي', category: 'Basic', style: 'inline', tags: ['basic', 'glass', 'blur'] },

  // ═══════════════════════════════════════════════════════════════
  // 🍞 TOAST NOTIFICATIONS (16-35)
  // ═══════════════════════════════════════════════════════════════
  { id: 'toast-simple', name: 'Toast Simple', nameAr: 'توست بسيط', category: 'Toast', style: 'toast', tags: ['toast', 'simple'] },
  { id: 'toast-rounded', name: 'Toast Rounded', nameAr: 'توست دائري', category: 'Toast', style: 'toast', tags: ['toast', 'rounded'] },
  { id: 'toast-with-icon', name: 'Toast With Icon', nameAr: 'توست مع أيقونة', category: 'Toast', style: 'toast', tags: ['toast', 'icon'] },
  { id: 'toast-with-avatar', name: 'Toast With Avatar', nameAr: 'توست مع صورة', category: 'Toast', style: 'toast', tags: ['toast', 'avatar', 'image'] },
  { id: 'toast-with-progress', name: 'Toast With Progress', nameAr: 'توست مع تقدم', category: 'Toast', style: 'toast', tags: ['toast', 'progress', 'bar'] },
  { id: 'toast-with-action', name: 'Toast With Action', nameAr: 'توست مع إجراء', category: 'Toast', style: 'toast', tags: ['toast', 'action'] },
  { id: 'toast-stacked', name: 'Toast Stacked', nameAr: 'توست مكدس', category: 'Toast', style: 'toast', tags: ['toast', 'stacked', 'multiple'] },
  { id: 'toast-dark', name: 'Toast Dark', nameAr: 'توست داكن', category: 'Toast', style: 'toast', tags: ['toast', 'dark'] },
  { id: 'toast-light', name: 'Toast Light', nameAr: 'توست فاتح', category: 'Toast', style: 'toast', tags: ['toast', 'light'] },
  { id: 'toast-colored', name: 'Toast Colored', nameAr: 'توست ملون', category: 'Toast', style: 'toast', tags: ['toast', 'colored'] },
  { id: 'toast-minimal', name: 'Toast Minimal', nameAr: 'توست بسيط', category: 'Toast', style: 'toast', tags: ['toast', 'minimal'] },
  { id: 'toast-pill', name: 'Toast Pill', nameAr: 'توست حبة', category: 'Toast', style: 'toast', tags: ['toast', 'pill', 'rounded'] },
  { id: 'toast-floating', name: 'Toast Floating', nameAr: 'توست عائم', category: 'Toast', style: 'toast', tags: ['toast', 'floating', 'shadow'] },
  { id: 'toast-slide', name: 'Toast Slide', nameAr: 'توست منزلق', category: 'Toast', style: 'toast', tags: ['toast', 'slide', 'animation'] },
  { id: 'toast-bounce', name: 'Toast Bounce', nameAr: 'توست قفز', category: 'Toast', style: 'toast', tags: ['toast', 'bounce', 'animation'] },
  { id: 'toast-fade', name: 'Toast Fade', nameAr: 'توست تلاشي', category: 'Toast', style: 'toast', tags: ['toast', 'fade', 'animation'] },
  { id: 'toast-expandable', name: 'Toast Expandable', nameAr: 'توست قابل للتوسع', category: 'Toast', style: 'toast', tags: ['toast', 'expandable'] },
  { id: 'toast-compact', name: 'Toast Compact', nameAr: 'توست مضغوط', category: 'Toast', style: 'toast', tags: ['toast', 'compact', 'small'] },
  { id: 'toast-wide', name: 'Toast Wide', nameAr: 'توست عريض', category: 'Toast', style: 'toast', tags: ['toast', 'wide', 'large'] },
  { id: 'toast-glass', name: 'Toast Glass', nameAr: 'توست زجاجي', category: 'Toast', style: 'toast', tags: ['toast', 'glass', 'blur'] },

  // ═══════════════════════════════════════════════════════════════
  // 📢 BANNER ALERTS (36-50)
  // ═══════════════════════════════════════════════════════════════
  { id: 'banner-simple', name: 'Banner Simple', nameAr: 'بانر بسيط', category: 'Banner', style: 'banner', tags: ['banner', 'simple'] },
  { id: 'banner-fixed-top', name: 'Banner Fixed Top', nameAr: 'بانر ثابت علوي', category: 'Banner', style: 'banner', tags: ['banner', 'fixed', 'top'] },
  { id: 'banner-fixed-bottom', name: 'Banner Fixed Bottom', nameAr: 'بانر ثابت سفلي', category: 'Banner', style: 'banner', tags: ['banner', 'fixed', 'bottom'] },
  { id: 'banner-with-icon', name: 'Banner With Icon', nameAr: 'بانر مع أيقونة', category: 'Banner', style: 'banner', tags: ['banner', 'icon'] },
  { id: 'banner-with-action', name: 'Banner With Action', nameAr: 'بانر مع إجراء', category: 'Banner', style: 'banner', tags: ['banner', 'action'] },
  { id: 'banner-gradient', name: 'Banner Gradient', nameAr: 'بانر متدرج', category: 'Banner', style: 'banner', tags: ['banner', 'gradient'] },
  { id: 'banner-announcement', name: 'Banner Announcement', nameAr: 'بانر إعلان', category: 'Banner', style: 'banner', tags: ['banner', 'announcement'] },
  { id: 'banner-promo', name: 'Banner Promo', nameAr: 'بانر ترويجي', category: 'Banner', style: 'banner', tags: ['banner', 'promo', 'sale'] },
  { id: 'banner-cookie', name: 'Banner Cookie', nameAr: 'بانر كوكيز', category: 'Banner', style: 'banner', tags: ['banner', 'cookie', 'consent'] },
  { id: 'banner-maintenance', name: 'Banner Maintenance', nameAr: 'بانر صيانة', category: 'Banner', style: 'banner', tags: ['banner', 'maintenance'] },
  { id: 'banner-update', name: 'Banner Update', nameAr: 'بانر تحديث', category: 'Banner', style: 'banner', tags: ['banner', 'update', 'new'] },
  { id: 'banner-trial', name: 'Banner Trial', nameAr: 'بانر تجربة', category: 'Banner', style: 'banner', tags: ['banner', 'trial', 'subscription'] },
  { id: 'banner-countdown', name: 'Banner Countdown', nameAr: 'بانر عد تنازلي', category: 'Banner', style: 'banner', tags: ['banner', 'countdown', 'timer'] },
  { id: 'banner-notification', name: 'Banner Notification', nameAr: 'بانر إشعار', category: 'Banner', style: 'banner', tags: ['banner', 'notification'] },
  { id: 'banner-dark', name: 'Banner Dark', nameAr: 'بانر داكن', category: 'Banner', style: 'banner', tags: ['banner', 'dark'] },

  // ═══════════════════════════════════════════════════════════════
  // 🎨 MODERN / CREATIVE (51-65)
  // ═══════════════════════════════════════════════════════════════
  { id: 'modern-minimal', name: 'Modern Minimal', nameAr: 'حديث بسيط', category: 'Modern', style: 'card', tags: ['modern', 'minimal'] },
  { id: 'modern-card', name: 'Modern Card', nameAr: 'حديث بطاقة', category: 'Modern', style: 'card', tags: ['modern', 'card'] },
  { id: 'modern-floating', name: 'Modern Floating', nameAr: 'حديث عائم', category: 'Modern', style: 'floating', tags: ['modern', 'floating'] },
  { id: 'modern-neon', name: 'Modern Neon', nameAr: 'حديث نيون', category: 'Modern', style: 'card', tags: ['modern', 'neon', 'glow'] },
  { id: 'modern-glassmorphism', name: 'Modern Glassmorphism', nameAr: 'حديث زجاجي', category: 'Modern', style: 'card', tags: ['modern', 'glass', 'blur'] },
  { id: 'modern-neumorphism', name: 'Modern Neumorphism', nameAr: 'حديث نيومورفيزم', category: 'Modern', style: 'card', tags: ['modern', 'neumorphism', 'soft'] },
  { id: 'modern-3d', name: 'Modern 3D', nameAr: 'حديث ثلاثي الأبعاد', category: 'Modern', style: 'card', tags: ['modern', '3d', 'shadow'] },
  { id: 'modern-gradient-border', name: 'Modern Gradient Border', nameAr: 'حديث حد متدرج', category: 'Modern', style: 'card', tags: ['modern', 'gradient', 'border'] },
  { id: 'modern-animated', name: 'Modern Animated', nameAr: 'حديث متحرك', category: 'Modern', style: 'card', tags: ['modern', 'animated'] },
  { id: 'modern-split', name: 'Modern Split', nameAr: 'حديث منقسم', category: 'Modern', style: 'card', tags: ['modern', 'split'] },
  { id: 'modern-emoji', name: 'Modern Emoji', nameAr: 'حديث إيموجي', category: 'Modern', style: 'card', tags: ['modern', 'emoji', 'fun'] },
  { id: 'modern-illustration', name: 'Modern Illustration', nameAr: 'حديث رسم', category: 'Modern', style: 'card', tags: ['modern', 'illustration'] },
  { id: 'modern-confetti', name: 'Modern Confetti', nameAr: 'حديث احتفال', category: 'Modern', style: 'card', tags: ['modern', 'confetti', 'celebration'] },
  { id: 'modern-timeline', name: 'Modern Timeline', nameAr: 'حديث خط زمني', category: 'Modern', style: 'card', tags: ['modern', 'timeline'] },
  { id: 'modern-chat', name: 'Modern Chat', nameAr: 'حديث محادثة', category: 'Modern', style: 'card', tags: ['modern', 'chat', 'message'] },

  // ═══════════════════════════════════════════════════════════════
  // 🚀 TECH / APP (66-77)
  // ═══════════════════════════════════════════════════════════════
  { id: 'tech-terminal', name: 'Tech Terminal', nameAr: 'تقني طرفية', category: 'Tech', style: 'card', tags: ['tech', 'terminal', 'code'] },
  { id: 'tech-code', name: 'Tech Code', nameAr: 'تقني كود', category: 'Tech', style: 'card', tags: ['tech', 'code', 'developer'] },
  { id: 'tech-github', name: 'Tech GitHub', nameAr: 'تقني جيتهب', category: 'Tech', style: 'card', tags: ['tech', 'github'] },
  { id: 'tech-vscode', name: 'Tech VSCode', nameAr: 'تقني VSCode', category: 'Tech', style: 'card', tags: ['tech', 'vscode', 'editor'] },
  { id: 'tech-slack', name: 'Tech Slack', nameAr: 'تقني سلاك', category: 'Tech', style: 'toast', tags: ['tech', 'slack'] },
  { id: 'tech-discord', name: 'Tech Discord', nameAr: 'تقني ديسكورد', category: 'Tech', style: 'toast', tags: ['tech', 'discord'] },
  { id: 'tech-macos', name: 'Tech macOS', nameAr: 'تقني ماك', category: 'Tech', style: 'toast', tags: ['tech', 'macos', 'apple'] },
  { id: 'tech-windows', name: 'Tech Windows', nameAr: 'تقني ويندوز', category: 'Tech', style: 'toast', tags: ['tech', 'windows', 'microsoft'] },
  { id: 'tech-android', name: 'Tech Android', nameAr: 'تقني أندرويد', category: 'Tech', style: 'toast', tags: ['tech', 'android', 'material'] },
  { id: 'tech-ios', name: 'Tech iOS', nameAr: 'تقني iOS', category: 'Tech', style: 'toast', tags: ['tech', 'ios', 'apple'] },
  { id: 'tech-api', name: 'Tech API', nameAr: 'تقني API', category: 'Tech', style: 'card', tags: ['tech', 'api', 'response'] },
  { id: 'tech-deployment', name: 'Tech Deployment', nameAr: 'تقني نشر', category: 'Tech', style: 'card', tags: ['tech', 'deployment', 'ci'] },

  // ═══════════════════════════════════════════════════════════════
  // 🛒 E-COMMERCE (78-87)
  // ═══════════════════════════════════════════════════════════════
  { id: 'ecommerce-cart', name: 'E-commerce Cart', nameAr: 'متجر سلة', category: 'E-commerce', style: 'toast', tags: ['ecommerce', 'cart', 'add'] },
  { id: 'ecommerce-order', name: 'E-commerce Order', nameAr: 'متجر طلب', category: 'E-commerce', style: 'card', tags: ['ecommerce', 'order', 'status'] },
  { id: 'ecommerce-shipping', name: 'E-commerce Shipping', nameAr: 'متجر شحن', category: 'E-commerce', style: 'card', tags: ['ecommerce', 'shipping', 'delivery'] },
  { id: 'ecommerce-payment', name: 'E-commerce Payment', nameAr: 'متجر دفع', category: 'E-commerce', style: 'card', tags: ['ecommerce', 'payment'] },
  { id: 'ecommerce-discount', name: 'E-commerce Discount', nameAr: 'متجر خصم', category: 'E-commerce', style: 'banner', tags: ['ecommerce', 'discount', 'coupon'] },
  { id: 'ecommerce-stock', name: 'E-commerce Stock', nameAr: 'متجر مخزون', category: 'E-commerce', style: 'inline', tags: ['ecommerce', 'stock', 'inventory'] },
  { id: 'ecommerce-wishlist', name: 'E-commerce Wishlist', nameAr: 'متجر مفضلة', category: 'E-commerce', style: 'toast', tags: ['ecommerce', 'wishlist', 'favorite'] },
  { id: 'ecommerce-review', name: 'E-commerce Review', nameAr: 'متجر مراجعة', category: 'E-commerce', style: 'toast', tags: ['ecommerce', 'review', 'rating'] },
  { id: 'ecommerce-flash-sale', name: 'E-commerce Flash Sale', nameAr: 'متجر عرض سريع', category: 'E-commerce', style: 'banner', tags: ['ecommerce', 'flash', 'sale'] },
  { id: 'ecommerce-back-in-stock', name: 'E-commerce Back in Stock', nameAr: 'متجر عاد للمخزون', category: 'E-commerce', style: 'toast', tags: ['ecommerce', 'stock', 'notification'] },

  // ═══════════════════════════════════════════════════════════════
  // 🎮 GAMING (88-93)
  // ═══════════════════════════════════════════════════════════════
  { id: 'gaming-achievement', name: 'Gaming Achievement', nameAr: 'ألعاب إنجاز', category: 'Gaming', style: 'toast', tags: ['gaming', 'achievement', 'unlock'] },
  { id: 'gaming-level-up', name: 'Gaming Level Up', nameAr: 'ألعاب مستوى', category: 'Gaming', style: 'toast', tags: ['gaming', 'level', 'xp'] },
  { id: 'gaming-reward', name: 'Gaming Reward', nameAr: 'ألعاب مكافأة', category: 'Gaming', style: 'card', tags: ['gaming', 'reward', 'prize'] },
  { id: 'gaming-notification', name: 'Gaming Notification', nameAr: 'ألعاب إشعار', category: 'Gaming', style: 'toast', tags: ['gaming', 'notification'] },
  { id: 'gaming-friend', name: 'Gaming Friend', nameAr: 'ألعاب صديق', category: 'Gaming', style: 'toast', tags: ['gaming', 'friend', 'online'] },
  { id: 'gaming-match', name: 'Gaming Match', nameAr: 'ألعاب مباراة', category: 'Gaming', style: 'card', tags: ['gaming', 'match', 'found'] },

  // ═══════════════════════════════════════════════════════════════
  // 📱 SOCIAL / MESSAGING (94-100)
  // ═══════════════════════════════════════════════════════════════
  { id: 'social-like', name: 'Social Like', nameAr: 'اجتماعي إعجاب', category: 'Social', style: 'toast', tags: ['social', 'like', 'heart'] },
  { id: 'social-comment', name: 'Social Comment', nameAr: 'اجتماعي تعليق', category: 'Social', style: 'toast', tags: ['social', 'comment'] },
  { id: 'social-follow', name: 'Social Follow', nameAr: 'اجتماعي متابعة', category: 'Social', style: 'toast', tags: ['social', 'follow'] },
  { id: 'social-mention', name: 'Social Mention', nameAr: 'اجتماعي إشارة', category: 'Social', style: 'toast', tags: ['social', 'mention', 'tag'] },
  { id: 'social-message', name: 'Social Message', nameAr: 'اجتماعي رسالة', category: 'Social', style: 'toast', tags: ['social', 'message', 'dm'] },
  { id: 'social-share', name: 'Social Share', nameAr: 'اجتماعي مشاركة', category: 'Social', style: 'toast', tags: ['social', 'share'] },
  { id: 'social-live', name: 'Social Live', nameAr: 'اجتماعي بث مباشر', category: 'Social', style: 'toast', tags: ['social', 'live', 'stream'] },
];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const alertCategories = [...new Set(alertThemes.map(t => t.category))];

export const getAlertTheme = (themeId: string): AlertTheme | undefined => {
  return alertThemes.find(t => t.id === themeId);
};

export const getAlertsByCategory = (category: string): AlertTheme[] => {
  return alertThemes.filter(t => t.category === category);
};

export const getAlertsByTag = (tag: string): AlertTheme[] => {
  return alertThemes.filter(t => t.tags?.includes(tag));
};

// ═══════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════

const Icons = {
  success: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  close: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

const getIcon = (type: AlertType) => {
  switch (type) {
    case 'success': return Icons.success;
    case 'error': return Icons.error;
    case 'warning': return Icons.warning;
    case 'info': return Icons.info;
    default: return Icons.info;
  }
};

// ═══════════════════════════════════════════════════════════════
// ALERT COMPONENTS
// ═══════════════════════════════════════════════════════════════

// Color schemes for different alert types
const colorSchemes = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: 'text-green-500',
    filled: 'bg-green-500 text-white',
    accent: 'border-l-green-500',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: 'text-red-500',
    filled: 'bg-red-500 text-white',
    accent: 'border-l-red-500',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    icon: 'text-amber-500',
    filled: 'bg-amber-500 text-white',
    accent: 'border-l-amber-500',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: 'text-blue-500',
    filled: 'bg-blue-500 text-white',
    accent: 'border-l-blue-500',
  },
  neutral: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-800',
    icon: 'text-gray-500',
    filled: 'bg-gray-500 text-white',
    accent: 'border-l-gray-500',
  },
};

// 1. Basic Simple Alert
export const AlertBasicSimple: React.FC<AlertProps> = ({
  type = 'info',
  message,
  title,
  showIcon = true,
  closable = false,
  onClose,
  className = '',
}) => {
  const colors = colorSchemes[type];
  return (
    <div className={`p-4 rounded-lg ${colors.bg} ${colors.border} border ${className}`}>
      <div className="flex items-start gap-3">
        {showIcon && <span className={colors.icon}>{getIcon(type)}</span>}
        <div className="flex-1">
          {title && <p className={`font-semibold ${colors.text}`}>{title}</p>}
          <p className={colors.text}>{message}</p>
        </div>
        {closable && (
          <button onClick={onClose} className={`${colors.icon} hover:opacity-70`}>{Icons.close}</button>
        )}
      </div>
    </div>
  );
};

// 2. Basic Filled Alert
export const AlertBasicFilled: React.FC<AlertProps> = ({
  type = 'info',
  message,
  title,
  showIcon = true,
  closable = false,
  onClose,
  className = '',
}) => {
  const colors = colorSchemes[type];
  return (
    <div className={`p-4 rounded-lg ${colors.filled} ${className}`}>
      <div className="flex items-start gap-3">
        {showIcon && <span className="opacity-90">{getIcon(type)}</span>}
        <div className="flex-1">
          {title && <p className="font-semibold">{title}</p>}
          <p className="opacity-90">{message}</p>
        </div>
        {closable && (
          <button onClick={onClose} className="opacity-70 hover:opacity-100">{Icons.close}</button>
        )}
      </div>
    </div>
  );
};

// 3. Basic Left Accent Alert
export const AlertLeftAccent: React.FC<AlertProps> = ({
  type = 'info',
  message,
  title,
  showIcon = true,
  closable = false,
  onClose,
  className = '',
}) => {
  const colors = colorSchemes[type];
  return (
    <div className={`p-4 ${colors.bg} border-l-4 ${colors.accent} ${className}`}>
      <div className="flex items-start gap-3">
        {showIcon && <span className={colors.icon}>{getIcon(type)}</span>}
        <div className="flex-1">
          {title && <p className={`font-semibold ${colors.text}`}>{title}</p>}
          <p className={colors.text}>{message}</p>
        </div>
        {closable && (
          <button onClick={onClose} className={`${colors.icon} hover:opacity-70`}>{Icons.close}</button>
        )}
      </div>
    </div>
  );
};

// 4. Basic With Action
export const AlertWithAction: React.FC<AlertProps> = ({
  type = 'info',
  message,
  title,
  showIcon = true,
  closable = false,
  onClose,
  action,
  secondaryAction,
  className = '',
}) => {
  const colors = colorSchemes[type];
  return (
    <div className={`p-4 rounded-lg ${colors.bg} ${colors.border} border ${className}`}>
      <div className="flex items-start gap-3">
        {showIcon && <span className={colors.icon}>{getIcon(type)}</span>}
        <div className="flex-1">
          {title && <p className={`font-semibold ${colors.text}`}>{title}</p>}
          <p className={colors.text}>{message}</p>
          {(action || secondaryAction) && (
            <div className="flex gap-3 mt-3">
              {action && (
                <button onClick={action.onClick} className={`px-4 py-1.5 rounded font-medium text-sm ${colors.filled}`}>
                  {action.label}
                </button>
              )}
              {secondaryAction && (
                <button onClick={secondaryAction.onClick} className={`px-4 py-1.5 rounded font-medium text-sm ${colors.text} hover:underline`}>
                  {secondaryAction.label}
                </button>
              )}
            </div>
          )}
        </div>
        {closable && (
          <button onClick={onClose} className={`${colors.icon} hover:opacity-70`}>{Icons.close}</button>
        )}
      </div>
    </div>
  );
};

// 5. Toast Simple
export const ToastSimple: React.FC<ToastProps> = ({
  type = 'info',
  message,
  title,
  showIcon = true,
  closable = true,
  onClose,
  isVisible = true,
  className = '',
}) => {
  if (!isVisible) return null;
  
  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[320px] max-w-md ${className}`}>
      <div className="flex items-start gap-3">
        {showIcon && (
          <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorSchemes[type].bg} ${colorSchemes[type].icon}`}>
            {getIcon(type)}
          </span>
        )}
        <div className="flex-1 pt-0.5">
          {title && <p className="font-semibold text-gray-900">{title}</p>}
          <p className="text-gray-600 text-sm">{message}</p>
        </div>
        {closable && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">{Icons.close}</button>
        )}
      </div>
    </div>
  );
};

// 6. Toast Dark
export const ToastDark: React.FC<ToastProps> = ({
  type = 'info',
  message,
  title,
  showIcon = true,
  closable = true,
  onClose,
  isVisible = true,
  className = '',
}) => {
  if (!isVisible) return null;
  
  const iconColors: Record<AlertType, string> = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-amber-400',
    info: 'text-blue-400',
    neutral: 'text-gray-400',
  };
  
  return (
    <div className={`bg-gray-900 rounded-lg shadow-xl p-4 min-w-[320px] max-w-md ${className}`}>
      <div className="flex items-start gap-3">
        {showIcon && <span className={iconColors[type]}>{getIcon(type)}</span>}
        <div className="flex-1">
          {title && <p className="font-semibold text-white">{title}</p>}
          <p className="text-gray-300 text-sm">{message}</p>
        </div>
        {closable && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">{Icons.close}</button>
        )}
      </div>
    </div>
  );
};

// 7. Toast With Progress
export const ToastWithProgress: React.FC<ToastProps & { progress?: number }> = ({
  type = 'info',
  message,
  title,
  showIcon = true,
  closable = true,
  onClose,
  isVisible = true,
  progress = 100,
  className = '',
}) => {
  if (!isVisible) return null;
  
  const progressColors: Record<AlertType, string> = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
    neutral: 'bg-gray-500',
  };
  
  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden min-w-[320px] max-w-md ${className}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {showIcon && (
            <span className={`flex-shrink-0 ${colorSchemes[type].icon}`}>{getIcon(type)}</span>
          )}
          <div className="flex-1">
            {title && <p className="font-semibold text-gray-900">{title}</p>}
            <p className="text-gray-600 text-sm">{message}</p>
          </div>
          {closable && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">{Icons.close}</button>
          )}
        </div>
      </div>
      <div className="h-1 bg-gray-100">
        <div className={`h-full ${progressColors[type]} transition-all duration-300`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

// 8. Banner Simple
export const BannerSimple: React.FC<AlertProps> = ({
  type = 'info',
  message,
  closable = true,
  onClose,
  action,
  className = '',
}) => {
  const colors = colorSchemes[type];
  return (
    <div className={`py-3 px-4 ${colors.filled} ${className}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 flex-wrap">
        <p className="text-center">{message}</p>
        {action && (
          <button onClick={action.onClick} className="px-4 py-1 bg-white/20 rounded font-medium text-sm hover:bg-white/30">
            {action.label}
          </button>
        )}
        {closable && (
          <button onClick={onClose} className="absolute right-4 opacity-70 hover:opacity-100">{Icons.close}</button>
        )}
      </div>
    </div>
  );
};

// 9. Banner Gradient
export const BannerGradient: React.FC<AlertProps> = ({
  message,
  closable = true,
  onClose,
  action,
  className = '',
}) => {
  return (
    <div className={`py-3 px-4 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white ${className}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 flex-wrap">
        <p className="text-center font-medium">{message}</p>
        {action && (
          <button onClick={action.onClick} className="px-4 py-1 bg-white text-purple-600 rounded font-medium text-sm hover:bg-gray-100">
            {action.label}
          </button>
        )}
        {closable && (
          <button onClick={onClose} className="absolute right-4 opacity-70 hover:opacity-100">{Icons.close}</button>
        )}
      </div>
    </div>
  );
};

// 10. Modern Glass Alert
export const AlertModernGlass: React.FC<AlertProps> = ({
  type = 'info',
  message,
  title,
  showIcon = true,
  closable = true,
  onClose,
  className = '',
}) => {
  const colors = colorSchemes[type];
  return (
    <div className={`p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl ${className}`}>
      <div className="flex items-start gap-3">
        {showIcon && (
          <span className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-white/20 ${colors.icon}`}>
            {getIcon(type)}
          </span>
        )}
        <div className="flex-1">
          {title && <p className="font-semibold text-white">{title}</p>}
          <p className="text-white/80">{message}</p>
        </div>
        {closable && (
          <button onClick={onClose} className="text-white/50 hover:text-white">{Icons.close}</button>
        )}
      </div>
    </div>
  );
};

// 11. Modern Neon Alert
export const AlertModernNeon: React.FC<AlertProps> = ({
  type = 'info',
  message,
  title,
  showIcon = true,
  closable = true,
  onClose,
  className = '',
}) => {
  const neonColors: Record<AlertType, { glow: string; border: string; text: string }> = {
    success: { glow: 'shadow-[0_0_20px_rgba(34,197,94,0.5)]', border: 'border-green-500', text: 'text-green-400' },
    error: { glow: 'shadow-[0_0_20px_rgba(239,68,68,0.5)]', border: 'border-red-500', text: 'text-red-400' },
    warning: { glow: 'shadow-[0_0_20px_rgba(245,158,11,0.5)]', border: 'border-amber-500', text: 'text-amber-400' },
    info: { glow: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]', border: 'border-blue-500', text: 'text-blue-400' },
    neutral: { glow: 'shadow-[0_0_20px_rgba(107,114,128,0.5)]', border: 'border-gray-500', text: 'text-gray-400' },
  };
  const neon = neonColors[type];
  
  return (
    <div className={`p-4 rounded-lg bg-gray-900 border ${neon.border} ${neon.glow} ${className}`}>
      <div className="flex items-start gap-3">
        {showIcon && <span className={neon.text}>{getIcon(type)}</span>}
        <div className="flex-1">
          {title && <p className={`font-semibold ${neon.text}`}>{title}</p>}
          <p className="text-gray-300">{message}</p>
        </div>
        {closable && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">{Icons.close}</button>
        )}
      </div>
    </div>
  );
};

// 12. Tech Terminal Alert
export const AlertTechTerminal: React.FC<AlertProps> = ({
  type = 'info',
  message,
  title,
  closable = true,
  onClose,
  className = '',
}) => {
  const prefixes: Record<AlertType, string> = {
    success: '[SUCCESS]',
    error: '[ERROR]',
    warning: '[WARNING]',
    info: '[INFO]',
    neutral: '[LOG]',
  };
  const textColors: Record<AlertType, string> = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-cyan-400',
    neutral: 'text-gray-400',
  };
  
  return (
    <div className={`bg-gray-950 rounded-lg border border-gray-800 overflow-hidden font-mono ${className}`}>
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-800">
        <span className="w-3 h-3 rounded-full bg-red-500"></span>
        <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
        <span className="w-3 h-3 rounded-full bg-green-500"></span>
        <span className="text-gray-500 text-sm ml-2">terminal</span>
        {closable && (
          <button onClick={onClose} className="ml-auto text-gray-500 hover:text-gray-300">{Icons.close}</button>
        )}
      </div>
      <div className="p-4">
        <p className="text-sm">
          <span className={textColors[type]}>{prefixes[type]}</span>
          <span className="text-gray-300 ml-2">{message}</span>
        </p>
      </div>
    </div>
  );
};

// 13. E-commerce Cart Toast
export const ToastEcommerceCart: React.FC<ToastProps & { productName?: string; productImage?: string }> = ({
  message,
  productName,
  productImage,
  closable = true,
  onClose,
  action,
  isVisible = true,
  className = '',
}) => {
  if (!isVisible) return null;
  
  return (
    <div className={`bg-white rounded-xl shadow-2xl border border-gray-200 p-4 min-w-[360px] max-w-md ${className}`}>
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
          {productImage ? (
            <img src={productImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">🛒</div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-green-600 font-medium flex items-center gap-1">
                <span className="text-green-500">✓</span> Added to cart
              </p>
              {productName && <p className="text-gray-900 font-semibold mt-1">{productName}</p>}
              {message && <p className="text-gray-500 text-sm">{message}</p>}
            </div>
            {closable && (
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">{Icons.close}</button>
            )}
          </div>
          {action && (
            <button onClick={action.onClick} className="mt-3 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800">
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// 14. Gaming Achievement Toast
export const ToastGamingAchievement: React.FC<ToastProps & { achievementName?: string; xp?: number }> = ({
  message,
  achievementName,
  xp,
  closable = true,
  onClose,
  isVisible = true,
  className = '',
}) => {
  if (!isVisible) return null;
  
  return (
    <div className={`bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 rounded-xl shadow-2xl p-1 min-w-[340px] max-w-md ${className}`}>
      <div className="bg-gray-900 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
            🏆
          </div>
          <div className="flex-1">
            <p className="text-yellow-400 text-xs font-bold uppercase tracking-wider">Achievement Unlocked!</p>
            {achievementName && <p className="text-white font-bold text-lg">{achievementName}</p>}
            {xp && <p className="text-green-400 text-sm font-medium">+{xp} XP</p>}
          </div>
          {closable && (
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300">{Icons.close}</button>
          )}
        </div>
      </div>
    </div>
  );
};

// 15. Social Notification Toast
export const ToastSocialNotification: React.FC<ToastProps & { userName?: string; userAvatar?: string; notificationType?: 'like' | 'comment' | 'follow' | 'mention' }> = ({
  message,
  userName,
  userAvatar,
  notificationType = 'like',
  closable = true,
  onClose,
  isVisible = true,
  className = '',
}) => {
  if (!isVisible) return null;
  
  const icons: Record<string, string> = {
    like: '❤️',
    comment: '💬',
    follow: '👤',
    mention: '@',
  };
  
  return (
    <div className={`bg-white rounded-2xl shadow-xl border border-gray-100 p-4 min-w-[320px] max-w-md ${className}`}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden">
            {userAvatar ? (
              <img src={userAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">👤</div>
            )}
          </div>
          <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center text-sm shadow">
            {icons[notificationType]}
          </span>
        </div>
        <div className="flex-1">
          <p className="text-gray-900">
            <span className="font-semibold">{userName || 'Someone'}</span>
            <span className="text-gray-600"> {message}</span>
          </p>
          <p className="text-gray-400 text-sm">Just now</p>
        </div>
        {closable && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">{Icons.close}</button>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// COMPONENTS MAP
// ═══════════════════════════════════════════════════════════════

export const alertComponents: Record<string, React.FC<any>> = {
  'basic-simple': AlertBasicSimple,
  'basic-filled': AlertBasicFilled,
  'basic-soft': AlertBasicSimple,
  'basic-bordered': AlertBasicSimple,
  'basic-outline': AlertBasicSimple,
  'basic-with-icon': AlertBasicSimple,
  'basic-with-title': AlertBasicSimple,
  'basic-with-action': AlertWithAction,
  'basic-closable': AlertBasicSimple,
  'basic-left-accent': AlertLeftAccent,
  'basic-top-accent': AlertLeftAccent,
  'basic-gradient': AlertBasicFilled,
  'basic-glass': AlertModernGlass,
  'toast-simple': ToastSimple,
  'toast-dark': ToastDark,
  'toast-with-icon': ToastSimple,
  'toast-with-progress': ToastWithProgress,
  'toast-with-action': ToastSimple,
  'toast-minimal': ToastSimple,
  'toast-glass': ToastDark,
  'banner-simple': BannerSimple,
  'banner-gradient': BannerGradient,
  'modern-glassmorphism': AlertModernGlass,
  'modern-neon': AlertModernNeon,
  'tech-terminal': AlertTechTerminal,
  'tech-code': AlertTechTerminal,
  'ecommerce-cart': ToastEcommerceCart,
  'gaming-achievement': ToastGamingAchievement,
  'social-like': ToastSocialNotification,
  'social-follow': ToastSocialNotification,
};

export default alertComponents;
