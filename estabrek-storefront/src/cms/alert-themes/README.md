# 🔔 Alert & Notification Themes

100 Ready-to-Use Alert, Toast, Banner & Notification Components

100 مكون تنبيهات وإشعارات جاهز للاستخدام

---

## 📊 Categories Overview

| Category | Count | Description |
|----------|-------|-------------|
| 🎯 **Basic** | 15 | Simple, filled, bordered, accented |
| 🍞 **Toast** | 20 | Popup notifications |
| 📢 **Banner** | 15 | Full-width announcements |
| 🎨 **Modern** | 15 | Glass, neon, neumorphism |
| 🚀 **Tech** | 12 | Terminal, GitHub, macOS, VSCode |
| 🛒 **E-commerce** | 10 | Cart, order, shipping |
| 🎮 **Gaming** | 6 | Achievement, level up, rewards |
| 📱 **Social** | 7 | Like, comment, follow, mention |

**Total: 100 alert themes**

---

## 🎨 Alert Styles

| Style | Description | Best For |
|-------|-------------|----------|
| `inline` | Standard inline alert | Form validation, messages |
| `toast` | Popup notification | Quick feedback, actions |
| `banner` | Full-width strip | Announcements, promos |
| `floating` | Floating card | Important notices |
| `minimal` | Simple, clean | Subtle notifications |
| `card` | Card-based | Detailed alerts |

---

## 🚀 Quick Start

### Installation

```bash
# Copy to your React project
src/
  components/
    alert-themes/
      AlertThemes.tsx
      AlertComponents.tsx
      AlertThemesDemo.tsx
      index.ts
```

### Basic Usage

```tsx
import { alertComponents } from '@/components/alert-themes';

// Get an alert component
const Alert = alertComponents['basic-simple'];

// Use it
<Alert
  type="success"
  title="Success!"
  message="Your changes have been saved."
  showIcon
  closable
  onClose={() => console.log('closed')}
/>
```

---

## 📦 Alert Props

```tsx
interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info' | 'neutral';
  title?: string;           // Alert title
  message: string;          // Alert message (required)
  icon?: React.ReactNode;   // Custom icon
  showIcon?: boolean;       // Show type icon
  closable?: boolean;       // Show close button
  onClose?: () => void;     // Close handler
  action?: {                // Primary action
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {       // Secondary action
    label: string;
    onClick: () => void;
  };
  autoClose?: boolean;      // Auto dismiss
  autoCloseDelay?: number;  // Delay in ms
  className?: string;       // Additional CSS
}
```

---

## 🎯 Basic Alerts (1-15)

```tsx
// Simple alert
<AlertBasicSimple
  type="info"
  message="This is an informational message."
/>

// Filled/solid background
<AlertBasicFilled
  type="success"
  title="Success!"
  message="Operation completed."
/>

// Left accent border
<AlertLeftAccent
  type="warning"
  message="Please review your input."
/>

// With action buttons
<AlertWithAction
  type="error"
  title="Error"
  message="Failed to save changes."
  action={{ label: "Retry", onClick: () => {} }}
  secondaryAction={{ label: "Cancel", onClick: () => {} }}
/>
```

---

## 🍞 Toast Notifications (16-35)

```tsx
// Simple toast
<ToastSimple
  type="success"
  title="Saved!"
  message="Your profile has been updated."
  isVisible={true}
/>

// Dark toast
<ToastDark
  type="info"
  message="New message received."
/>

// With progress bar
<ToastWithProgress
  type="info"
  message="Uploading file..."
  progress={75}
/>

// Pill shape
<ToastPill
  type="success"
  message="Copied to clipboard!"
/>

// Compact
<ToastCompact
  type="info"
  message="3 new notifications"
/>
```

### Toast Positions

```tsx
// Position prop for toast components
position?: 'top-left' | 'top-center' | 'top-right' 
         | 'bottom-left' | 'bottom-center' | 'bottom-right'
```

---

## 📢 Banner Alerts (36-50)

```tsx
// Simple banner
<BannerSimple
  type="info"
  message="System maintenance scheduled for tonight."
  closable
/>

// Gradient promo banner
<BannerGradient
  message="🎉 Summer Sale - 50% off everything!"
  action={{ label: "Shop Now", onClick: () => {} }}
/>

// Promo with code
<BannerPromo
  message="Use code for 20% off"
  code="SAVE20"
/>

// Cookie consent
<BannerCookie
  message="We use cookies to improve your experience."
  onAccept={() => {}}
  onDecline={() => {}}
/>
```

---

## 🎨 Modern Alerts (51-65)

```tsx
// Glassmorphism
<AlertModernGlass
  type="info"
  title="Notice"
  message="This is a glass effect alert."
/>

// Neon glow
<AlertModernNeon
  type="success"
  message="Achievement unlocked!"
/>

// Neumorphism
<AlertNeumorphism
  type="info"
  message="Soft UI style alert."
/>

// Split design
<AlertSplit
  type="warning"
  title="Warning"
  message="Your session will expire soon."
  action={{ label: "Extend", onClick: () => {} }}
/>

// Emoji style
<AlertEmoji
  type="success"
  title="Great job!"
  message="You completed all tasks."
/>
```

---

## 🚀 Tech Alerts (66-77)

```tsx
// Terminal style
<AlertTechTerminal
  type="success"
  message="Build completed successfully"
/>

// GitHub style
<AlertGitHub
  type="warning"
  title="Deprecated"
  message="This API will be removed in v2.0"
/>

// macOS notification
<AlertMacOS
  title="Download Complete"
  message="Your file is ready."
  appName="Safari"
  appIcon="🌐"
/>
```

---

## 🛒 E-commerce Alerts (78-87)

```tsx
// Add to cart
<ToastEcommerceCart
  productName="Wireless Headphones"
  message="1 item added"
  action={{ label: "View Cart", onClick: () => {} }}
/>

// Order status
<AlertOrderStatus
  orderNumber="12345"
  status="shipped" // 'processing' | 'shipped' | 'delivered'
  message="Your order is on the way!"
  action={{ label: "Track", onClick: () => {} }}
/>
```

---

## 🎮 Gaming Alerts (88-93)

```tsx
// Achievement unlocked
<ToastGamingAchievement
  achievementName="First Victory"
  xp={500}
/>

// Level up
<AlertLevelUp
  level={10}
  message="You reached Level 10!"
  reward="Unlocked: Premium Avatar"
/>
```

---

## 📱 Social Alerts (94-100)

```tsx
// Social notification
<ToastSocialNotification
  userName="John Doe"
  message="liked your post"
  notificationType="like" // 'like' | 'comment' | 'follow' | 'mention'
  userAvatar="/avatar.jpg"
/>
```

---

## 🔧 API Reference

### Get Theme Data

```tsx
import { 
  alertThemes,
  getAlertTheme,
  getAlertsByCategory,
  getAlertsByTag 
} from '@/components/alert-themes';

// All themes
console.log(alertThemes.length); // 100

// Get theme by ID
const theme = getAlertTheme('toast-simple');

// Get by category
const toasts = getAlertsByCategory('Toast'); // 20 alerts

// Get by tag
const darkAlerts = getAlertsByTag('dark');
```

### Theme Object

```tsx
interface AlertTheme {
  id: string;       // 'toast-simple'
  name: string;     // 'Toast Simple'
  nameAr: string;   // 'توست بسيط'
  category: string; // 'Toast'
  style: 'inline' | 'toast' | 'banner' | 'floating' | 'minimal' | 'card';
  tags?: string[];  // ['toast', 'simple']
}
```

---

## 🎯 Alert Types

| Type | Color | Use For |
|------|-------|---------|
| `success` | Green | Completed actions, confirmations |
| `error` | Red | Errors, failures, problems |
| `warning` | Amber | Cautions, important notices |
| `info` | Blue | Information, tips, updates |
| `neutral` | Gray | General messages |

---

## 💡 Usage Tips

### Auto-dismiss Toast
```tsx
const [show, setShow] = useState(true);

useEffect(() => {
  if (show) {
    const timer = setTimeout(() => setShow(false), 3000);
    return () => clearTimeout(timer);
  }
}, [show]);

<ToastSimple isVisible={show} ... />
```

### Stacking Multiple Toasts
```tsx
<div className="fixed top-4 right-4 space-y-2 z-50">
  {toasts.map(toast => (
    <ToastSimple key={toast.id} {...toast} />
  ))}
</div>
```

### Fixed Banner
```tsx
<div className="fixed top-0 left-0 right-0 z-50">
  <BannerSimple type="warning" message="..." />
</div>
```

---

## ✅ Features

- ✅ 100 unique alert themes
- ✅ 8 industry categories
- ✅ 6 style variations
- ✅ 5 alert types (success, error, warning, info, neutral)
- ✅ Arabic + English names
- ✅ Closable alerts
- ✅ Action buttons support
- ✅ Auto-close capability
- ✅ Progress bar support
- ✅ Avatar support
- ✅ TypeScript support
- ✅ Pure Tailwind CSS
- ✅ No external dependencies

---

## 🎨 Customization

### Custom Colors
```tsx
<AlertBasicSimple
  type="info"
  message="..."
  className="!bg-purple-50 !border-purple-200 !text-purple-800"
/>
```

### Custom Icon
```tsx
<AlertBasicSimple
  type="info"
  icon={<MyCustomIcon />}
  message="..."
/>
```

---

Made with ❤️ for Estabrek Store
