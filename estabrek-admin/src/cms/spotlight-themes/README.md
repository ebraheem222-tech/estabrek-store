# ✨ Spotlight Themes Collection

150 Interactive Mouse-Following Light Effect Themes

مجموعة 150 تأثير ضوء متتبع للماوس تفاعلي

---

## 🎯 What is this?

A collection of **150 themes** that add a **spotlight/glow effect** that follows the mouse cursor. Works with any component:

- 📦 **Cards** - Product cards, profile cards, info cards
- 🔘 **Buttons** - CTAs, navigation, actions
- 📝 **Inputs** - Form fields, search bars
- 📄 **Containers** - Sections, divs, articles

---

## 📊 Categories Overview

| Category | Count | Description |
|----------|-------|-------------|
| 🌟 **Basic** | 15 | Clean, minimal styles |
| 🎮 **Gaming** | 20 | Neon, RGB, cyberpunk effects |
| 🚀 **Tech** | 20 | Startup, AI, developer themes |
| 🛒 **E-commerce** | 20 | Store, product card styles |
| 💎 **Luxury** | 15 | Premium, elegant effects |
| 🪟 **Glass** | 15 | Glassmorphism with blur |
| 🔘 **Neumorphism** | 15 | Soft 3D shadow effects |
| 🎨 **Creative** | 15 | Gradients, artistic styles |
| 🎭 **Special** | 15 | Unique effects (holographic, chrome, etc.) |

**Total: 150 themes**

---

## 🚀 Quick Start

### Installation

```bash
# Copy to your React project
src/
  components/
    spotlight-themes/
      SpotlightThemes.tsx
      SpotlightThemesDemo.tsx
      index.ts
```

### Basic Usage

```tsx
import { SpotlightCard } from '@/components/spotlight-themes';

function ProductCard() {
  return (
    <SpotlightCard theme="gaming-neon-purple">
      <img src="product.jpg" alt="Product" />
      <h3>Gaming Mouse</h3>
      <p>$99.99</p>
      <button>Add to Cart</button>
    </SpotlightCard>
  );
}
```

---

## 📦 Components

### 1. SpotlightCard

Card component with spotlight effect.

```tsx
<SpotlightCard 
  theme="tech-ai"
  padding="p-8"
  onClick={() => console.log('clicked')}
>
  <h2>AI Features</h2>
  <p>Hover to see the magic!</p>
</SpotlightCard>
```

**Props:**
- `theme` - Theme ID or theme object
- `padding` - Tailwind padding class (default: "p-6")
- `onClick` - Click handler
- `className` - Additional classes
- `disabled` - Disable spotlight effect

### 2. SpotlightButton

Button with spotlight effect.

```tsx
<SpotlightButton 
  theme="gaming-neon-green"
  size="lg"
  onClick={handleClick}
>
  Start Game
</SpotlightButton>
```

**Props:**
- `theme` - Theme ID
- `size` - "sm" | "md" | "lg"
- `onClick` - Click handler

### 3. SpotlightInput

Input field with spotlight wrapper.

```tsx
<SpotlightInput 
  theme="glass-purple"
  placeholder="Search..."
  value={query}
  onChange={handleChange}
/>
```

**Props:**
- `theme` - Theme ID
- `placeholder` - Input placeholder
- `value` - Input value
- `onChange` - Change handler
- `type` - Input type

### 4. SpotlightContainer

Generic container for any content.

```tsx
<SpotlightContainer 
  theme="luxury-gold"
  as="section"
  className="min-h-screen"
>
  <header>...</header>
  <main>...</main>
  <footer>...</footer>
</SpotlightContainer>
```

**Props:**
- `theme` - Theme ID
- `as` - HTML element ("div", "section", "article", "button", etc.)
- `className` - Additional classes
- `spotlightSize` - Override spotlight size (default varies by theme)
- `spotlightOpacity` - Override opacity (0-1)

---

## 🎮 Gaming Themes

Perfect for gaming websites, esports platforms.

```tsx
// Neon colors
<SpotlightCard theme="gaming-neon-green" />
<SpotlightCard theme="gaming-neon-purple" />
<SpotlightCard theme="gaming-neon-cyan" />
<SpotlightCard theme="gaming-neon-pink" />

// Special effects
<SpotlightCard theme="gaming-rgb" />
<SpotlightCard theme="gaming-cyberpunk" />
<SpotlightCard theme="gaming-matrix" />
<SpotlightCard theme="gaming-fire" />
<SpotlightCard theme="gaming-ice" />
<SpotlightCard theme="gaming-hologram" />
```

---

## 🚀 Tech Themes

For startups, SaaS, developer tools.

```tsx
<SpotlightCard theme="tech-modern" />
<SpotlightCard theme="tech-dark" />
<SpotlightCard theme="tech-ai" />
<SpotlightCard theme="tech-crypto" />
<SpotlightCard theme="tech-terminal" />
<SpotlightCard theme="tech-developer" />
```

---

## 🪟 Glass Themes

Glassmorphism effects (need gradient backgrounds).

```tsx
// Wrap in gradient background
<div className="bg-gradient-to-br from-purple-600 to-blue-600 p-8">
  <SpotlightCard theme="glass-white">
    <h3>Glass Card</h3>
  </SpotlightCard>
</div>

// Available glass themes
glass-white, glass-dark, glass-blue, glass-purple,
glass-pink, glass-green, glass-cyan, glass-orange,
glass-frosted, glass-holographic, glass-neon, glass-aurora
```

---

## 🔘 Neumorphism Themes

Soft 3D shadow effects.

```tsx
// Must use matching background color
<div className="bg-gray-100 p-8">
  <SpotlightCard theme="neu-light">
    Soft shadows!
  </SpotlightCard>
</div>

// Dark neumorphism
<div className="bg-gray-800 p-8">
  <SpotlightCard theme="neu-dark">
    Dark soft shadows!
  </SpotlightCard>
</div>
```

---

## 🎨 Creative Themes

Gradients and artistic effects.

```tsx
<SpotlightCard theme="creative-gradient-sunset" />
<SpotlightCard theme="creative-gradient-ocean" />
<SpotlightCard theme="creative-gradient-aurora" />
<SpotlightCard theme="creative-watercolor" />
<SpotlightCard theme="creative-neon-art" />
<SpotlightCard theme="creative-pop-art" />
```

---

## 🎭 Special Themes

Unique and eye-catching effects.

```tsx
<SpotlightCard theme="special-holographic" />
<SpotlightCard theme="special-chrome" />
<SpotlightCard theme="special-rainbow" />
<SpotlightCard theme="special-galaxy" />
<SpotlightCard theme="special-lava" />
<SpotlightCard theme="special-retro-wave" />
<SpotlightCard theme="special-brutalist" />
```

---

## 🔧 API Reference

### Functions

```tsx
import {
  getSpotlightTheme,
  getThemesByCategory,
  getThemesByTag,
  spotlightThemes,
  spotlightCategories,
} from '@/components/spotlight-themes';

// Get theme by ID
const theme = getSpotlightTheme('gaming-neon-purple');

// Get all themes in category
const gamingThemes = getThemesByCategory('Gaming');

// Get themes by tag
const neonThemes = getThemesByTag('neon');

// All themes array
console.log(spotlightThemes.length); // 150

// All category names
console.log(spotlightCategories); // ['Basic', 'Gaming', ...]
```

### Theme Object

```tsx
interface SpotlightTheme {
  id: string;              // Unique identifier
  name: string;            // English name
  nameAr: string;          // Arabic name
  category: string;        // Category name
  baseClassName: string;   // Tailwind base classes
  spotlightColor: string;  // RGBA color for spotlight
  spotlightSize?: number;  // Spotlight radius in pixels
  spotlightOpacity?: number; // Opacity 0-1
  borderGlow?: boolean;    // Enable border glow on hover
  borderColor?: string;    // Border glow color
  hoverScale?: boolean;    // Scale up on hover
  tags?: string[];         // Searchable tags
}
```

---

## 💡 Tips & Best Practices

### 1. Background Requirements

```tsx
// Glass themes need gradient backgrounds
<div className="bg-gradient-to-br from-indigo-500 to-purple-600">
  <SpotlightCard theme="glass-white" />
</div>

// Neumorphism needs matching bg
<div className="bg-gray-100">
  <SpotlightCard theme="neu-light" />
</div>
```

### 2. Custom Spotlight Settings

```tsx
<SpotlightContainer
  theme="basic-white"
  spotlightSize={300}      // Bigger spotlight
  spotlightOpacity={0.8}   // More visible
>
  Custom settings!
</SpotlightContainer>
```

### 3. Combining with Other Themes

```tsx
import { getInputClassName } from '@/components/input-themes';
import { SpotlightCard } from '@/components/spotlight-themes';

// Use spotlight card with themed input
<SpotlightCard theme="tech-dark">
  <input className={getInputClassName('tech-terminal')} />
</SpotlightCard>
```

### 4. Dynamic Theme Selection

```tsx
function ThemeSelector({ themes }) {
  const [selected, setSelected] = useState('basic-white');
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {themes.map(theme => (
        <SpotlightCard
          key={theme.id}
          theme={theme}
          onClick={() => setSelected(theme.id)}
          className={selected === theme.id ? 'ring-2 ring-blue-500' : ''}
        >
          {theme.name}
        </SpotlightCard>
      ))}
    </div>
  );
}
```

---

## 🎯 Use Cases

### Product Cards

```tsx
<SpotlightCard theme="ecommerce-modern">
  <img src="product.jpg" />
  <h3>Product Name</h3>
  <p className="text-2xl font-bold">$99.99</p>
  <button>Add to Cart</button>
</SpotlightCard>
```

### Feature Cards

```tsx
<SpotlightCard theme="tech-gradient-purple">
  <div className="text-4xl">🚀</div>
  <h3>Fast Performance</h3>
  <p>Lightning-fast load times</p>
</SpotlightCard>
```

### Gaming UI

```tsx
<SpotlightButton theme="gaming-neon-green" size="lg">
  PLAY NOW
</SpotlightButton>
```

### Search Inputs

```tsx
<SpotlightInput
  theme="glass-blue"
  placeholder="Search games..."
/>
```

---

## 📱 Responsive Design

The spotlight effect works on all screen sizes, but consider touch devices:

```tsx
<SpotlightCard
  theme="basic-shadow"
  disabled={isMobile}  // Disable on mobile if needed
>
  Content
</SpotlightCard>
```

---

## ✅ Features

- ✅ 150 unique spotlight themes
- ✅ Mouse-following light effect
- ✅ Border glow effects
- ✅ Hover scale animations
- ✅ Works with any content
- ✅ Card, Button, Input components
- ✅ Custom container support
- ✅ TypeScript support
- ✅ Arabic & English names
- ✅ Tag-based filtering
- ✅ Pure Tailwind CSS
- ✅ No external dependencies

---

Made with ❤️ for Estabrek Store
