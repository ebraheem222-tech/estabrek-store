# ✨ Feature Section Themes

100 Ready-to-Use Feature Section Components

100 مكون أقسام ميزات جاهز للاستخدام

---

## 📊 Categories Overview

| Category | Count | Description |
|----------|-------|-------------|
| 🎯 **Basic** | 15 | Grid, list, centered, numbered |
| 🃏 **Cards** | 15 | Elevated, bordered, glass, hover |
| 🎨 **Modern** | 18 | Bento, glassmorphism, neon, tabs |
| 🚀 **Tech** | 14 | Gradient, terminal, API, stats |
| 🛒 **E-commerce** | 10 | Benefits, shipping, trust badges |
| 🏢 **Corporate** | 10 | Services, values, process |
| 🎨 **Creative** | 8 | Bold, minimal, portfolio |
| 🎮 **Gaming** | 5 | Neon, cyberpunk, esports |
| 🍔 **Food** | 2 | Restaurant features, services |
| ✈️ **Travel** | 3 | Destinations, services |

**Total: 100 feature section themes**

---

## 🎨 Layout Types

| Layout | Description | Best For |
|--------|-------------|----------|
| `grid` | Standard grid layout | General features |
| `list` | Vertical list | Steps, processes |
| `cards` | Card-based | Services, benefits |
| `icons` | Icon strip | Quick features, trust |
| `split` | Image + content | Product features |
| `bento` | Bento grid | Modern dashboards |
| `timeline` | Timeline | Process, roadmap |
| `tabs` | Tabbed content | Interactive features |

---

## 🚀 Quick Start

### Installation

```bash
# Copy to your React project
src/
  components/
    feature-themes/
      FeatureThemes.tsx
      FeatureComponents.tsx
      FeatureThemesDemo.tsx
      index.ts
```

### Basic Usage

```tsx
import { featureComponents } from '@/components/feature-themes';

// Define features
const features = [
  { id: 1, title: 'Fast', description: 'Lightning fast performance' },
  { id: 2, title: 'Secure', description: 'Enterprise-grade security' },
  { id: 3, title: 'Scalable', description: 'Grows with your business' },
];

// Get a feature component
const FeatureSection = featureComponents['cards-elevated'];

// Use it
<FeatureSection
  title="Why Choose Us"
  subtitle="Features"
  description="What makes us different"
  features={features}
  columns={3}
/>
```

---

## 📦 Feature Item Props

```tsx
interface FeatureItem {
  id: string | number;      // Unique identifier
  title: string;            // Feature title
  description?: string;     // Feature description
  icon?: React.ReactNode;   // Custom icon
  image?: string;           // Image URL
  link?: string;            // Link URL
  badge?: string;           // Badge text
  stats?: string;           // Stat value (for stats sections)
}
```

---

## 📦 Section Props

```tsx
interface FeatureSectionProps {
  title?: string;           // Section title
  subtitle?: string;        // Section subtitle (above title)
  description?: string;     // Section description
  features: FeatureItem[];  // Array of features
  columns?: 2 | 3 | 4 | 5 | 6; // Grid columns
  className?: string;       // Additional CSS
}
```

---

## 🎯 Basic Sections (1-15)

```tsx
// Simple centered grid
<FeatureBasicGridSimple
  title="Our Features"
  features={features}
  columns={3}
/>

// Grid with left-aligned icons
<FeatureBasicGridIcons
  title="Why Choose Us"
  features={features}
/>

// Numbered list (steps)
<FeatureNumberedList
  title="How It Works"
  features={steps}
/>

// Alternating layout
<FeatureAlternatingList
  title="Our Process"
  features={features}
/>
```

---

## 🃏 Card Sections (16-30)

```tsx
// Elevated cards with shadow
<FeatureCardsElevated
  title="Our Services"
  features={services}
/>

// Cards with hover lift effect
<FeatureCardsHoverLift
  features={features}
/>

// Colorful cards
<FeatureCardsColorful
  features={features}
/>

// Dark theme cards
<FeatureCardsDark
  title="Features"
  features={features}
/>

// Cards with top accent
<FeatureCardsAccent
  features={features}
/>
```

---

## 🎨 Modern Sections (31-48)

```tsx
// Bento grid layout
<FeatureModernBento
  title="Platform Features"
  features={features}
/>

// Glassmorphism
<FeatureCardsGlass
  title="Key Benefits"
  features={features}
/>

// Neumorphism style
<FeatureModernNeumorphism
  features={features}
/>

// Gradient border cards
<FeatureModernGradientBorder
  features={features}
/>

// Timeline layout
<FeatureModernTimeline
  title="Our Process"
  features={steps}
/>

// Interactive tabs
<FeatureModernTabs
  title="Explore Features"
  features={features}
/>
```

---

## 🚀 Tech Sections (49-62)

```tsx
// Gradient cards on dark
<FeatureTechGradient
  title="Developer Tools"
  subtitle="Built for Scale"
  features={features}
/>

// Checklist style
<FeatureTechChecklist
  title="What's Included"
  features={checklistItems}
/>

// Integration logos grid
<FeatureTechIntegrations
  title="Integrations"
  features={integrations}
/>
```

---

## 🛒 E-commerce Sections (63-72)

```tsx
// Benefits strip (horizontal icons)
<FeatureEcommerceBenefits
  features={[
    { id: 1, title: 'Free Shipping' },
    { id: 2, title: '30-Day Returns' },
    { id: 3, title: 'Secure Payment' },
    { id: 4, title: '24/7 Support' },
  ]}
/>
```

---

## 🏢 Corporate Sections (73-82)

```tsx
// Stats section
<FeatureCorporateStats
  title="Our Impact"
  features={[
    { id: 1, stats: '500+', description: 'Happy Clients' },
    { id: 2, stats: '$10M+', description: 'Revenue Generated' },
    { id: 3, stats: '50+', description: 'Countries' },
    { id: 4, stats: '99.9%', description: 'Uptime' },
  ]}
/>
```

---

## 🎮 Gaming Sections (91-95)

```tsx
// Neon glow cards
<FeatureGamingNeon
  title="Game Features"
  features={features}
/>
```

---

## 🎨 Creative Sections (83-90)

```tsx
// Bold colorful blocks
<FeatureCreativeBold
  title="Our Services"
  features={features}
/>

// Split screen with image
<FeatureSplitScreen
  title="Why Choose Us"
  features={features}
  image="/dashboard.png"
/>
```

---

## 🍔 Food & Travel (96-100)

```tsx
// Food icons strip
<FeatureFoodIcons
  features={[
    { id: 1, icon: '🍕', title: 'Fresh Ingredients' },
    { id: 2, icon: '⏱️', title: 'Fast Delivery' },
    { id: 3, icon: '👨‍🍳', title: 'Expert Chefs' },
  ]}
/>

// Travel destinations
<FeatureTravelDestinations
  title="Popular Destinations"
  features={destinations}
/>
```

---

## 🔧 Custom Icons

```tsx
// Using custom SVG icons
const features = [
  {
    id: 1,
    title: 'Custom Icon',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
];

// Using emoji icons
const features = [
  { id: 1, title: 'Fast', icon: '⚡' },
  { id: 2, title: 'Secure', icon: '🔒' },
  { id: 3, title: 'Global', icon: '🌍' },
];
```

---

## 💡 Tips

1. **Columns**: Use 2-3 columns for detailed features, 4-6 for simple icons
2. **Icons**: Keep icons consistent (all outline or all filled)
3. **Descriptions**: Keep short (1-2 sentences)
4. **Stats**: Use for impressive numbers
5. **Images**: Use for visual features (split layout)
6. **Mobile**: All sections are responsive by default

---

## ✅ Features

- ✅ 100 unique feature section themes
- ✅ 10 industry categories
- ✅ 8 layout variations
- ✅ Arabic + English names
- ✅ Responsive design
- ✅ Custom icons support
- ✅ Hover animations
- ✅ Dark mode variants
- ✅ TypeScript support
- ✅ Pure Tailwind CSS
- ✅ No external dependencies

---

Made with ❤️ for Estabrek Store
