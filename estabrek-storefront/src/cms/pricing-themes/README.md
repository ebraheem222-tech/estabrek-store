# 💰 Pricing Table Themes

100 Ready-to-Use Pricing Table Components

100 مكون جداول أسعار جاهز للاستخدام

---

## 📊 Categories Overview

| Category | Count | Description |
|----------|-------|-------------|
| 🎯 **Basic** | 15 | Simple, bordered, shadow, toggle |
| 🎨 **Modern** | 20 | Glass, gradient, neon, neumorphism |
| 🚀 **Tech** | 20 | SaaS, API, freemium, enterprise |
| 🛒 **E-commerce** | 13 | Subscription, membership, VIP |
| 🏢 **Corporate** | 10 | Professional, finance, legal |
| 🎨 **Creative** | 8 | Agency, bold, retro, artistic |
| 🎮 **Gaming** | 6 | Neon, cyberpunk, esports |
| 📱 **App** | 5 | Freemium, pro, family, lifetime |
| 📊 **Comparison** | 3 | Full table, minimal, highlighted |

**Total: 100 pricing table themes**

---

## 🎨 Style Types

| Style | Description | Best For |
|-------|-------------|----------|
| `cards` | Card-based layout | Most use cases |
| `table` | Comparison table | Feature comparison |
| `toggle` | Monthly/Annual toggle | Subscription pricing |
| `comparison` | Side-by-side comparison | Detailed features |
| `minimal` | Clean, simple | Modern sites |
| `feature-list` | Feature-focused | Detailed plans |

---

## 🚀 Quick Start

### Installation

```bash
# Copy to your React project
src/
  components/
    pricing-themes/
      PricingThemes.tsx
      PricingComponents.tsx
      PricingThemesDemo.tsx
      index.ts
```

### Basic Usage

```tsx
import { pricingComponents } from '@/components/pricing-themes';

// Define your plans
const plans = [
  {
    id: 1,
    name: 'Starter',
    price: 9,
    period: 'month',
    features: ['5 Projects', '10GB Storage', 'Email Support'],
  },
  {
    id: 2,
    name: 'Pro',
    price: 29,
    period: 'month',
    badge: 'Popular',
    popular: true,
    features: ['Unlimited Projects', '100GB Storage', 'Priority Support'],
  },
];

// Get a pricing component
const PricingTable = pricingComponents['basic-simple'];

// Use it
<PricingTable
  title="Choose Your Plan"
  subtitle="Pricing"
  description="Simple, transparent pricing"
  plans={plans}
/>
```

---

## 📦 Plan Object Props

```tsx
interface PricingPlan {
  id: string | number;       // Unique identifier
  name: string;              // Plan name
  description?: string;      // Plan description
  price: number | string;    // Price value
  originalPrice?: number;    // Original price (for discounts)
  period?: string;           // 'month', 'year', 'lifetime'
  currency?: string;         // '$', '€', '£'
  badge?: string;            // 'Popular', 'Best Value'
  popular?: boolean;         // Highlight this plan
  features: Feature[];       // List of features
  buttonText?: string;       // CTA button text
  onSelect?: () => void;     // Click handler
}

// Feature can be string or object
type Feature = string | {
  text: string;
  included: boolean;         // false = crossed out
  tooltip?: string;
};
```

---

## 📦 Component Props

```tsx
interface PricingTableProps {
  title?: string;            // Section title
  subtitle?: string;         // Above title
  description?: string;      // Section description
  plans: PricingPlan[];      // Array of plans
  billingToggle?: boolean;   // Show monthly/annual toggle
  onBillingChange?: (isAnnual: boolean) => void;
  className?: string;        // Additional CSS
}
```

---

## 🎯 Basic Tables (1-15)

```tsx
// Simple pricing cards
<PricingBasicSimple
  title="Pricing Plans"
  plans={plans}
/>

// With monthly/annual toggle
<PricingBasicWithToggle
  title="Pricing"
  plans={plans}
  onBillingChange={(isAnnual) => console.log(isAnnual)}
/>

// Bordered cards
<PricingBasicBordered
  plans={plans}
/>
```

---

## 🎨 Modern Tables (16-35)

```tsx
// Glassmorphism style
<PricingModernGlass
  title="Choose Your Plan"
  plans={plans}
/>

// Dark theme
<PricingModernDark
  title="Pricing"
  plans={plans}
/>

// Gradient border
<PricingModernGradientBorder
  plans={plans}
/>

// Neumorphism
<PricingModernNeumorphism
  plans={plans}
/>

// Colorful cards
<PricingModernColorful
  plans={plans}
/>
```

---

## 🚀 Tech Tables (36-55)

```tsx
// Tech gradient (SaaS style)
<PricingTechGradient
  title="Developer Plans"
  plans={plans}
/>

// Freemium model
<PricingTechFreemium
  title="Start Free, Scale Up"
  plans={[
    { id: 1, name: 'Free', price: 0, features: [...] },
    { id: 2, name: 'Pro', price: 29, popular: true, features: [...] },
    { id: 3, name: 'Enterprise', price: 99, features: [...] },
  ]}
/>
```

---

## 🛒 E-commerce Tables (56-68)

```tsx
// Luxury style
<PricingEcommerceLuxury
  title="Membership Tiers"
  plans={plans}
/>

// Discount pricing
<PricingEcommerceDiscount
  plans={[
    {
      id: 1,
      name: 'Annual Plan',
      price: 79,
      originalPrice: 99,
      badge: '20% OFF',
      features: [...],
    },
  ]}
/>
```

---

## 🎮 Gaming Tables (87-92)

```tsx
// Neon glow
<PricingGamingNeon
  title="Game Pass"
  plans={[
    { id: 1, name: 'Basic', price: 4.99, features: [...] },
    { id: 2, name: 'Premium', price: 9.99, badge: 'BEST VALUE', features: [...] },
    { id: 3, name: 'Ultimate', price: 14.99, features: [...] },
  ]}
/>
```

---

## 🏢 Corporate Tables (69-78)

```tsx
// Professional style
<PricingCorporateProfessional
  title="Enterprise Solutions"
  plans={plans}
/>
```

---

## 🎨 Creative Tables (79-86)

```tsx
// Bold colorful
<PricingCreativeBold
  title="Pick Your Vibe"
  plans={plans}
/>
```

---

## 📱 App Tables (93-97)

```tsx
// Lifetime pricing
<PricingAppLifetime
  title="One-Time Purchase"
  plans={[
    {
      id: 1,
      name: 'Personal License',
      price: 49,
      originalPrice: 79,
      badge: '38% OFF',
      features: ['1 Device', 'Lifetime Updates', 'Email Support'],
    },
    {
      id: 2,
      name: 'Team License',
      price: 149,
      originalPrice: 249,
      badge: '40% OFF',
      popular: true,
      features: ['5 Devices', 'Lifetime Updates', 'Priority Support'],
    },
  ]}
/>
```

---

## 📊 Comparison Tables (98-100)

```tsx
// Full comparison table
<PricingComparisonTable
  title="Compare Plans"
  plans={plans}
/>
```

---

## 💡 Tips

### Highlighting Popular Plan
```tsx
{
  id: 2,
  name: 'Pro',
  price: 29,
  badge: 'Most Popular',  // Badge text
  popular: true,          // Highlight styling
  features: [...],
}
```

### Showing Discounts
```tsx
{
  id: 1,
  name: 'Annual',
  price: 199,
  originalPrice: 299,     // Shows crossed out
  badge: 'Save 33%',
  features: [...],
}
```

### Features with Availability
```tsx
features: [
  'Unlimited Projects',              // Always included
  { text: 'API Access', included: true },
  { text: 'Custom Domain', included: false }, // Crossed out
]
```

### Free Tier
```tsx
{
  id: 1,
  name: 'Free',
  price: 0,              // Shows "Free" instead of $0
  features: [...],
  buttonText: 'Start Free',
}
```

---

## ✅ Features

- ✅ 100 unique pricing table themes
- ✅ 9 industry categories
- ✅ 6 style variations
- ✅ Monthly/Annual toggle support
- ✅ Feature comparison tables
- ✅ Discount/original price display
- ✅ Popular plan highlighting
- ✅ Badge support
- ✅ Arabic + English names
- ✅ Responsive design
- ✅ TypeScript support
- ✅ Pure Tailwind CSS
- ✅ No external dependencies

---

Made with ❤️ for Estabrek Store
