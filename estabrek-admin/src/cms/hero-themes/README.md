# 🎯 Hero Section Templates

150 Ready-to-Use Hero Sections for All Industries

150 قالب قسم رئيسي جاهز لجميع الصناعات

---

## 📊 Categories Overview

| Category | Count | Description |
|----------|-------|-------------|
| 🎯 **Basic** | 17 | Clean, minimal hero sections |
| 🚀 **Tech** | 17 | SaaS, AI, developer, startup |
| 🛒 **E-commerce** | 17 | Fashion, products, sales |
| 🎮 **Gaming** | 15 | Neon, esports, game launches |
| 🏢 **Corporate** | 17 | Business, finance, consulting |
| 🎨 **Creative** | 17 | Agency, portfolio, studio |
| 🍔 **Food** | 15 | Restaurant, cafe, delivery |
| 🏋️ **Fitness** | 13 | Gym, yoga, wellness |
| ✈️ **Travel** | 13 | Hotel, booking, destinations |
| 🎭 **Special** | 9 | Coming soon, events, newsletter |

**Total: 150 hero templates**

---

## 🚀 Quick Start

### Installation

```bash
# Copy to your React project
src/
  components/
    hero-themes/
      HeroThemes.tsx
      HeroComponents.tsx
      HeroThemesDemo.tsx
      index.ts
```

### Basic Usage

```tsx
import { heroComponents } from '@/components/hero-themes';

// Get a specific hero
const Hero = heroComponents['tech-saas'];

function HomePage() {
  return (
    <Hero
      badge="New Release"
      headline="Build Amazing Products"
      description="The best tool for developers"
      primaryCta={{ text: "Get Started", onClick: () => {} }}
      secondaryCta={{ text: "Learn More", onClick: () => {} }}
    />
  );
}
```

---

## 📦 Hero Props

All hero components accept these props:

```tsx
interface HeroProps {
  // Content
  badge?: string;           // Small badge/label above headline
  headline: string;         // Main heading (required)
  subheadline?: string;     // Secondary heading
  description?: string;     // Body text
  
  // Call-to-Actions
  primaryCta?: { 
    text: string; 
    href?: string; 
    onClick?: () => void;
  };
  secondaryCta?: { 
    text: string; 
    href?: string; 
    onClick?: () => void;
  };
  
  // Media
  imageSrc?: string;        // Hero image URL
  imageAlt?: string;        // Image alt text
  videoSrc?: string;        // Video URL (for video heroes)
  
  // Additional Content
  features?: string[];      // Feature list
  stats?: { 
    value: string; 
    label: string; 
  }[];                      // Statistics
  
  // Customization
  className?: string;       // Additional CSS classes
  children?: React.ReactNode; // Custom content
}
```

---

## 🎯 Basic Heroes (1-12)

```tsx
// Centered hero
<Hero1 headline="Welcome" />

// Left-aligned
<Hero2 headline="Welcome" />

// Split with image
<Hero3 headline="Welcome" imageSrc="/hero.jpg" />

// Minimal
<Hero4 headline="Welcome" />

// Dark theme
<Hero5 headline="Welcome" />

// Gradient background
<Hero6 headline="Welcome" />

// Fullscreen
<Hero7 headline="Welcome" />

// With stats
<Hero9 
  headline="Welcome"
  stats={[
    { value: "10K+", label: "Users" },
    { value: "99%", label: "Uptime" },
  ]}
/>
```

---

## 🚀 Tech Heroes (13-24)

```tsx
import { heroComponents } from '@/components/hero-themes';

// SaaS landing
const TechSaas = heroComponents['tech-saas'];
<TechSaas
  badge="New Feature"
  headline="Ship Faster with AI"
  description="Automate your workflow"
  features={['Fast', 'Secure', 'Scalable']}
/>

// AI/ML product
const TechAI = heroComponents['tech-ai'];
<TechAI
  headline="Powered by AI"
  description="Next-gen intelligence"
/>

// Developer tools
const TechDev = heroComponents['tech-developer'];
<TechDev
  headline="Built for Developers"
  description="The API you'll love"
/>
```

---

## 🎮 Gaming Heroes (37-46)

```tsx
// Neon gaming style
const GamingNeon = heroComponents['gaming-neon'];
<GamingNeon
  badge="Now Live"
  headline="Enter the Arena"
  description="Battle royale awaits"
/>

// Esports
const GamingEsports = heroComponents['gaming-esports'];
<GamingEsports
  badge="Tournament"
  headline="Compete & Win"
/>
```

---

## 🛒 E-commerce Heroes (25-36)

```tsx
// Modern store
const EcomModern = heroComponents['ecommerce-modern'];
<EcomModern
  badge="New Arrivals"
  headline="Summer Collection"
  primaryCta={{ text: "Shop Now" }}
/>

// Fashion (fullscreen)
const EcomFashion = heroComponents['ecommerce-fashion'];
<EcomFashion
  badge="Luxury"
  headline="Timeless Elegance"
  imageSrc="/fashion.jpg"
/>

// Sale banner
const EcomSale = heroComponents['ecommerce-sale'];
<EcomSale
  badge="50% OFF"
  headline="Flash Sale"
/>
```

---

## 🏢 Corporate Heroes (47-58)

```tsx
// Professional business
const CorpPro = heroComponents['corporate-professional'];
<CorpPro
  headline="Transform Your Business"
  stats={[
    { value: "500+", label: "Clients" },
    { value: "$1B", label: "Managed" },
  ]}
/>

// Consulting
const CorpConsulting = heroComponents['corporate-consulting'];
<CorpConsulting
  headline="Expert Guidance"
  description="Strategic consulting for growth"
/>
```

---

## 🎨 Creative Heroes (59-70)

```tsx
// Creative agency
const CreativeAgency = heroComponents['creative-agency'];
<CreativeAgency
  headline="We Create"
  description="Award-winning design studio"
/>

// Portfolio
const CreativePortfolio = heroComponents['creative-portfolio'];
<CreativePortfolio
  headline="John Doe"
  description="Designer & Developer"
/>
```

---

## 🍔 Food Heroes (71-80)

```tsx
// Restaurant
const FoodRestaurant = heroComponents['food-restaurant'];
<FoodRestaurant
  badge="Est. 1990"
  headline="Fine Dining"
  imageSrc="/restaurant.jpg"
  primaryCta={{ text: "Reserve Table" }}
  secondaryCta={{ text: "View Menu" }}
/>
```

---

## 🏋️ Fitness Heroes (81-88)

```tsx
// Gym
const FitnessGym = heroComponents['fitness-gym'];
<FitnessGym
  headline="Transform Your Body"
  imageSrc="/gym.jpg"
  primaryCta={{ text: "Join Now" }}
/>
```

---

## ✈️ Travel Heroes (89-96)

```tsx
// Hotel with search
const TravelHotel = heroComponents['travel-hotel'];
<TravelHotel
  badge="5-Star Resort"
  headline="Escape to Paradise"
  imageSrc="/hotel.jpg"
/>
```

---

## 🎭 Special Heroes (97+)

```tsx
// Coming Soon
const ComingSoon = heroComponents['special-coming-soon'];
<ComingSoon
  headline="Coming Soon"
  description="We're launching something big"
/>

// Event countdown
const Event = heroComponents['special-event'];
<Event
  badge="March 15, 2025"
  headline="Annual Conference"
/>

// App Download
const AppDownload = heroComponents['special-app-download'];
<AppDownload
  headline="Get the App"
  description="Available on iOS and Android"
/>

// Newsletter
const Newsletter = heroComponents['special-newsletter'];
<Newsletter
  headline="Stay Updated"
  description="Join our newsletter"
/>
```

---

## 🔧 API Reference

### Get Theme Data

```tsx
import { 
  heroThemes,
  getHeroTheme,
  getHerosByCategory,
  getHerosByTag 
} from '@/components/hero-themes';

// All themes
console.log(heroThemes.length); // 150

// Get theme by ID
const theme = getHeroTheme('tech-saas');

// Get by category
const techHeroes = getHerosByCategory('Tech'); // 12 themes

// Get by tag
const neonHeroes = getHerosByTag('neon');
```

### Theme Object

```tsx
interface HeroTheme {
  id: string;       // 'tech-saas'
  name: string;     // 'Tech SaaS'
  nameAr: string;   // 'تقنية SaaS'
  category: string; // 'Tech'
  layout: 'centered' | 'left' | 'right' | 'split' | 'fullscreen' | 'minimal' | 'asymmetric';
  tags?: string[];  // ['tech', 'saas', 'startup']
}
```

---

## 🎨 Layout Types

| Layout | Description | Best For |
|--------|-------------|----------|
| `centered` | Text centered, stacked | General, announcements |
| `left` | Text left-aligned | Content-heavy |
| `split` | Text + Image side by side | Products, features |
| `fullscreen` | Full viewport height | Impact, immersion |
| `minimal` | Very simple, lots of whitespace | Luxury, creative |
| `asymmetric` | Creative layouts | Unique, artistic |

---

## 💡 Tips

1. **Images**: Most heroes look better with high-quality images
2. **Dark themes**: Gaming/Tech heroes work best on dark pages
3. **Stats**: Use 3-4 stats for best visual balance
4. **CTAs**: Always include at least one call-to-action
5. **Mobile**: All heroes are responsive by default

---

## ✅ Features

- ✅ 150 unique hero templates
- ✅ 10 industry categories
- ✅ 7 layout variations
- ✅ Arabic + English names
- ✅ Responsive design
- ✅ Dark mode support
- ✅ TypeScript support
- ✅ Pure Tailwind CSS
- ✅ Easy customization
- ✅ No dependencies

---

Made with ❤️ for Estabrek Store
