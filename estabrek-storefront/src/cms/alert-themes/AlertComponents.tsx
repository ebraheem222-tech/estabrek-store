import React from 'react';

// ═══════════════════════════════════════════════════════════════
// ADDITIONAL ALERT COMPONENTS
// ═══════════════════════════════════════════════════════════════

type AlertType = 'success' | 'error' | 'warning' | 'info' | 'neutral';

interface AlertProps {
  type?: AlertType;
  title?: string;
  message: string;
  showIcon?: boolean;
  closable?: boolean;
  onClose?: () => void;
  action?: { label: string; onClick: () => void };
  className?: string;
}

// Icons
const Icons = {
  success: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  error: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  warning: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  info: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  close: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
};

const getIcon = (type: AlertType) => {
  const map = { success: Icons.success, error: Icons.error, warning: Icons.warning, info: Icons.info, neutral: Icons.info };
  return map[type];
};

// ═══════════════════════════════════════════════════════════════
// ROUNDED ALERT
// ═══════════════════════════════════════════════════════════════

export const AlertRounded: React.FC<AlertProps> = ({
  type = 'info',
  message,
  title,
  showIcon = true,
  closable = true,
  onClose,
  className = '',
}) => {
  const colors: Record<AlertType, string> = {
    success: 'bg-green-100 text-green-800 border-green-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    neutral: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  const iconColors: Record<AlertType, string> = {
    success: 'text-green-500', error: 'text-red-500', warning: 'text-amber-500', info: 'text-blue-500', neutral: 'text-gray-500',
  };

  return (
    <div className={`p-4 rounded-2xl border ${colors[type]} ${className}`}>
      <div className="flex items-start gap-3">
        {showIcon && (
          <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-white ${iconColors[type]}`}>
            {getIcon(type)}
          </span>
        )}
        <div className="flex-1">
          {title && <p className="font-semibold">{title}</p>}
          <p>{message}</p>
        </div>
        {closable && <button onClick={onClose} className="opacity-60 hover:opacity-100">{Icons.close}</button>}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// OUTLINE ALERT
// ═══════════════════════════════════════════════════════════════

export const AlertOutline: React.FC<AlertProps> = ({
  type = 'info',
  message,
  title,
  showIcon = true,
  closable = true,
  onClose,
  className = '',
}) => {
  const colors: Record<AlertType, string> = {
    success: 'border-green-500 text-green-700',
    error: 'border-red-500 text-red-700',
    warning: 'border-amber-500 text-amber-700',
    info: 'border-blue-500 text-blue-700',
    neutral: 'border-gray-500 text-gray-700',
  };

  return (
    <div className={`p-4 rounded-lg border-2 bg-white ${colors[type]} ${className}`}>
      <div className="flex items-start gap-3">
        {showIcon && <span>{getIcon(type)}</span>}
        <div className="flex-1">
          {title && <p className="font-semibold">{title}</p>}
          <p>{message}</p>
        </div>
        {closable && <button onClick={onClose} className="opacity-60 hover:opacity-100">{Icons.close}</button>}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TOP ACCENT ALERT
// ═══════════════════════════════════════════════════════════════

export const AlertTopAccent: React.FC<AlertProps> = ({
  type = 'info',
  message,
  title,
  showIcon = true,
  closable = true,
  onClose,
  className = '',
}) => {
  const colors: Record<AlertType, { bg: string; border: string; text: string; icon: string }> = {
    success: { bg: 'bg-green-50', border: 'border-t-green-500', text: 'text-green-800', icon: 'text-green-500' },
    error: { bg: 'bg-red-50', border: 'border-t-red-500', text: 'text-red-800', icon: 'text-red-500' },
    warning: { bg: 'bg-amber-50', border: 'border-t-amber-500', text: 'text-amber-800', icon: 'text-amber-500' },
    info: { bg: 'bg-blue-50', border: 'border-t-blue-500', text: 'text-blue-800', icon: 'text-blue-500' },
    neutral: { bg: 'bg-gray-50', border: 'border-t-gray-500', text: 'text-gray-800', icon: 'text-gray-500' },
  };
  const c = colors[type];

  return (
    <div className={`p-4 ${c.bg} border-t-4 ${c.border} ${className}`}>
      <div className="flex items-start gap-3">
        {showIcon && <span className={c.icon}>{getIcon(type)}</span>}
        <div className="flex-1">
          {title && <p className={`font-semibold ${c.text}`}>{title}</p>}
          <p className={c.text}>{message}</p>
        </div>
        {closable && <button onClick={onClose} className={`${c.icon} hover:opacity-70`}>{Icons.close}</button>}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TOAST WITH AVATAR
// ═══════════════════════════════════════════════════════════════

export const ToastWithAvatar: React.FC<AlertProps & { avatar?: string; userName?: string }> = ({
  message,
  avatar,
  userName,
  closable = true,
  onClose,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 p-4 min-w-[320px] ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400">👤</div>}
        </div>
        <div className="flex-1">
          {userName && <p className="font-semibold text-gray-900">{userName}</p>}
          <p className="text-gray-600 text-sm">{message}</p>
        </div>
        {closable && <button onClick={onClose} className="text-gray-400 hover:text-gray-600">{Icons.close}</button>}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TOAST COLORED
// ═══════════════════════════════════════════════════════════════

export const ToastColored: React.FC<AlertProps> = ({
  type = 'info',
  message,
  title,
  showIcon = true,
  closable = true,
  onClose,
  className = '',
}) => {
  const colors: Record<AlertType, string> = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
    neutral: 'bg-gray-500',
  };

  return (
    <div className={`${colors[type]} text-white rounded-xl shadow-lg p-4 min-w-[320px] ${className}`}>
      <div className="flex items-start gap-3">
        {showIcon && <span className="opacity-90">{getIcon(type)}</span>}
        <div className="flex-1">
          {title && <p className="font-semibold">{title}</p>}
          <p className="opacity-90">{message}</p>
        </div>
        {closable && <button onClick={onClose} className="opacity-70 hover:opacity-100">{Icons.close}</button>}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TOAST PILL
// ═══════════════════════════════════════════════════════════════

export const ToastPill: React.FC<AlertProps> = ({
  type = 'info',
  message,
  showIcon = true,
  closable = false,
  onClose,
  className = '',
}) => {
  const colors: Record<AlertType, { bg: string; icon: string }> = {
    success: { bg: 'bg-green-100 text-green-800', icon: 'text-green-500' },
    error: { bg: 'bg-red-100 text-red-800', icon: 'text-red-500' },
    warning: { bg: 'bg-amber-100 text-amber-800', icon: 'text-amber-500' },
    info: { bg: 'bg-blue-100 text-blue-800', icon: 'text-blue-500' },
    neutral: { bg: 'bg-gray-100 text-gray-800', icon: 'text-gray-500' },
  };

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${colors[type].bg} ${className}`}>
      {showIcon && <span className={colors[type].icon}>{getIcon(type)}</span>}
      <span className="font-medium">{message}</span>
      {closable && <button onClick={onClose} className="ml-1 opacity-60 hover:opacity-100">{Icons.close}</button>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TOAST COMPACT
// ═══════════════════════════════════════════════════════════════

export const ToastCompact: React.FC<AlertProps> = ({
  type = 'info',
  message,
  showIcon = true,
  closable = true,
  onClose,
  className = '',
}) => {
  const iconColors: Record<AlertType, string> = {
    success: 'text-green-500', error: 'text-red-500', warning: 'text-amber-500', info: 'text-blue-500', neutral: 'text-gray-500',
  };

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 px-3 py-2 inline-flex items-center gap-2 ${className}`}>
      {showIcon && <span className={iconColors[type]}>{getIcon(type)}</span>}
      <span className="text-gray-700 text-sm">{message}</span>
      {closable && <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-1">{Icons.close}</button>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// BANNER WITH ICON
// ═══════════════════════════════════════════════════════════════

export const BannerWithIcon: React.FC<AlertProps> = ({
  type = 'info',
  message,
  showIcon = true,
  closable = true,
  onClose,
  action,
  className = '',
}) => {
  const colors: Record<AlertType, string> = {
    success: 'bg-green-500', error: 'bg-red-500', warning: 'bg-amber-500', info: 'bg-blue-500', neutral: 'bg-gray-500',
  };

  return (
    <div className={`${colors[type]} text-white py-3 px-4 ${className}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 flex-wrap">
        {showIcon && <span>{getIcon(type)}</span>}
        <p>{message}</p>
        {action && (
          <button onClick={action.onClick} className="px-3 py-1 bg-white/20 rounded text-sm font-medium hover:bg-white/30">
            {action.label}
          </button>
        )}
        {closable && (
          <button onClick={onClose} className="ml-auto opacity-70 hover:opacity-100">{Icons.close}</button>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// BANNER PROMO
// ═══════════════════════════════════════════════════════════════

export const BannerPromo: React.FC<AlertProps & { code?: string }> = ({
  message,
  code,
  closable = true,
  onClose,
  className = '',
}) => {
  return (
    <div className={`bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 ${className}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 flex-wrap">
        <span className="text-2xl">🎉</span>
        <p className="font-medium">{message}</p>
        {code && (
          <span className="px-3 py-1 bg-white/20 rounded font-mono font-bold">{code}</span>
        )}
        {closable && (
          <button onClick={onClose} className="ml-auto opacity-70 hover:opacity-100">{Icons.close}</button>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// BANNER COOKIE
// ═══════════════════════════════════════════════════════════════

export const BannerCookie: React.FC<AlertProps & { onAccept?: () => void; onDecline?: () => void }> = ({
  message,
  onAccept,
  onDecline,
  className = '',
}) => {
  return (
    <div className={`bg-gray-900 text-white py-4 px-6 ${className}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍪</span>
          <p className="text-sm text-gray-300">{message}</p>
        </div>
        <div className="flex gap-3">
          {onDecline && (
            <button onClick={onDecline} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
              Decline
            </button>
          )}
          {onAccept && (
            <button onClick={onAccept} className="px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100">
              Accept All
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MODERN NEUMORPHISM
// ═══════════════════════════════════════════════════════════════

export const AlertNeumorphism: React.FC<AlertProps> = ({
  type = 'info',
  message,
  title,
  showIcon = true,
  closable = true,
  onClose,
  className = '',
}) => {
  const iconColors: Record<AlertType, string> = {
    success: 'text-green-500', error: 'text-red-500', warning: 'text-amber-500', info: 'text-blue-500', neutral: 'text-gray-500',
  };

  return (
    <div className={`p-5 rounded-2xl bg-gray-100 shadow-[8px_8px_16px_#d1d1d1,-8px_-8px_16px_#ffffff] ${className}`}>
      <div className="flex items-start gap-4">
        {showIcon && (
          <span className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-md ${iconColors[type]}`}>
            {getIcon(type)}
          </span>
        )}
        <div className="flex-1">
          {title && <p className="font-semibold text-gray-800">{title}</p>}
          <p className="text-gray-600">{message}</p>
        </div>
        {closable && <button onClick={onClose} className="text-gray-400 hover:text-gray-600">{Icons.close}</button>}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MODERN SPLIT
// ═══════════════════════════════════════════════════════════════

export const AlertSplit: React.FC<AlertProps> = ({
  type = 'info',
  message,
  title,
  action,
  className = '',
}) => {
  const colors: Record<AlertType, string> = {
    success: 'bg-green-500', error: 'bg-red-500', warning: 'bg-amber-500', info: 'bg-blue-500', neutral: 'bg-gray-500',
  };

  return (
    <div className={`flex rounded-xl overflow-hidden shadow-lg ${className}`}>
      <div className={`${colors[type]} w-16 flex items-center justify-center text-white`}>
        {getIcon(type)}
      </div>
      <div className="flex-1 bg-white p-4">
        <div className="flex items-start justify-between">
          <div>
            {title && <p className="font-semibold text-gray-900">{title}</p>}
            <p className="text-gray-600">{message}</p>
          </div>
          {action && (
            <button onClick={action.onClick} className={`px-4 py-2 ${colors[type]} text-white rounded-lg text-sm font-medium`}>
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MODERN EMOJI
// ═══════════════════════════════════════════════════════════════

export const AlertEmoji: React.FC<AlertProps> = ({
  type = 'info',
  message,
  title,
  closable = true,
  onClose,
  className = '',
}) => {
  const emojis: Record<AlertType, string> = {
    success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️', neutral: '📝',
  };
  const colors: Record<AlertType, string> = {
    success: 'bg-green-50 border-green-200', error: 'bg-red-50 border-red-200', warning: 'bg-amber-50 border-amber-200', info: 'bg-blue-50 border-blue-200', neutral: 'bg-gray-50 border-gray-200',
  };

  return (
    <div className={`p-4 rounded-xl border ${colors[type]} ${className}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{emojis[type]}</span>
        <div className="flex-1">
          {title && <p className="font-semibold text-gray-900">{title}</p>}
          <p className="text-gray-700">{message}</p>
        </div>
        {closable && <button onClick={onClose} className="text-gray-400 hover:text-gray-600">{Icons.close}</button>}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TECH GITHUB
// ═══════════════════════════════════════════════════════════════

export const AlertGitHub: React.FC<AlertProps> = ({
  type = 'info',
  message,
  title,
  closable = true,
  onClose,
  className = '',
}) => {
  const colors: Record<AlertType, { bg: string; border: string; icon: string }> = {
    success: { bg: 'bg-green-50', border: 'border-green-300', icon: '✓' },
    error: { bg: 'bg-red-50', border: 'border-red-300', icon: '✕' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-300', icon: '!' },
    info: { bg: 'bg-blue-50', border: 'border-blue-300', icon: 'i' },
    neutral: { bg: 'bg-gray-50', border: 'border-gray-300', icon: '•' },
  };
  const c = colors[type];

  return (
    <div className={`p-4 rounded-md ${c.bg} border ${c.border} ${className}`}>
      <div className="flex items-start gap-3">
        <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs font-bold">
          {c.icon}
        </span>
        <div className="flex-1">
          {title && <p className="font-semibold text-gray-900">{title}</p>}
          <p className="text-gray-700">{message}</p>
        </div>
        {closable && <button onClick={onClose} className="text-gray-400 hover:text-gray-600">{Icons.close}</button>}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TECH macOS
// ═══════════════════════════════════════════════════════════════

export const AlertMacOS: React.FC<AlertProps & { appIcon?: string; appName?: string }> = ({
  message,
  title,
  appIcon,
  appName,
  closable = true,
  onClose,
  className = '',
}) => {
  return (
    <div className={`bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 p-4 min-w-[340px] ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl shadow-lg">
          {appIcon || '📱'}
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-500 uppercase font-medium">{appName || 'Notification'}</p>
          {title && <p className="font-semibold text-gray-900">{title}</p>}
          <p className="text-gray-600 text-sm">{message}</p>
        </div>
        {closable && <button onClick={onClose} className="text-gray-400 hover:text-gray-600">{Icons.close}</button>}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// E-COMMERCE ORDER STATUS
// ═══════════════════════════════════════════════════════════════

export const AlertOrderStatus: React.FC<AlertProps & { orderNumber?: string; status?: 'processing' | 'shipped' | 'delivered' }> = ({
  message,
  orderNumber,
  status = 'processing',
  action,
  className = '',
}) => {
  const statusConfig = {
    processing: { icon: '📦', color: 'bg-blue-500', label: 'Processing' },
    shipped: { icon: '🚚', color: 'bg-amber-500', label: 'Shipped' },
    delivered: { icon: '✅', color: 'bg-green-500', label: 'Delivered' },
  };
  const s = statusConfig[status];

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 ${s.color} rounded-xl flex items-center justify-center text-2xl`}>
          {s.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 ${s.color} text-white text-xs font-bold rounded`}>{s.label}</span>
            {orderNumber && <span className="text-gray-400 text-sm">#{orderNumber}</span>}
          </div>
          <p className="text-gray-700 mt-1">{message}</p>
        </div>
        {action && (
          <button onClick={action.onClick} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium">
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// GAMING LEVEL UP
// ═══════════════════════════════════════════════════════════════

export const AlertLevelUp: React.FC<AlertProps & { level?: number; reward?: string }> = ({
  message,
  level,
  reward,
  closable = true,
  onClose,
  className = '',
}) => {
  return (
    <div className={`bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-xl p-1 ${className}`}>
      <div className="bg-gray-900 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-lg">
            {level || '?'}
          </div>
          <div className="flex-1">
            <p className="text-yellow-400 text-sm font-bold uppercase tracking-wider">Level Up!</p>
            <p className="text-white font-bold text-xl">{message}</p>
            {reward && <p className="text-green-400 text-sm">🎁 {reward}</p>}
          </div>
          {closable && <button onClick={onClose} className="text-gray-500 hover:text-white">{Icons.close}</button>}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// EXPORT MAP
// ═══════════════════════════════════════════════════════════════

export const additionalAlertComponents = {
  'basic-rounded': AlertRounded,
  'basic-sharp': AlertOutline,
  'basic-top-accent': AlertTopAccent,
  'toast-with-avatar': ToastWithAvatar,
  'toast-colored': ToastColored,
  'toast-pill': ToastPill,
  'toast-compact': ToastCompact,
  'banner-with-icon': BannerWithIcon,
  'banner-promo': BannerPromo,
  'banner-cookie': BannerCookie,
  'modern-neumorphism': AlertNeumorphism,
  'modern-split': AlertSplit,
  'modern-emoji': AlertEmoji,
  'tech-github': AlertGitHub,
  'tech-macos': AlertMacOS,
  'ecommerce-order': AlertOrderStatus,
  'ecommerce-shipping': AlertOrderStatus,
  'gaming-level-up': AlertLevelUp,
};

export default additionalAlertComponents;
