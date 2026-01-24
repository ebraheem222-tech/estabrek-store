# ✨ Animated Shape Themes

100 Animated Background Decorations for React Components

100 أشكال متحركة للخلفيات

---

## 📊 Categories Overview

| Category | Count | Shapes |
|----------|-------|--------|
| 🔵 **Circles** | 15 | Float, Pulse, Glow, Ripple, Orbit, Bubble |
| 🟦 **Rectangles** | 13 | Float, Rotate, Slide, Grid, Stack |
| ⭐ **Stars** | 12 | Float, Twinkle, Scatter, Field, Shooting |
| 🔺 **Triangles** | 10 | Float, Rotate, Geometric, Pattern |
| 🫧 **Blobs** | 12 | Morph, Gradient, Glass, Aurora, Liquid |
| ⬤ **Dots** | 13 | Float, Grid, Wave, Particles, Confetti |
| ➖ **Lines** | 10 | Float, Wave, Grid, Diagonal, Spiral |
| 🎨 **Mixed** | 15 | Geometric, Neon, Cyber, Retro, Cosmic |

**Total: 100 animated shape themes**

---

## 🎬 Animation Types

| Animation | Description | Effect |
|-----------|-------------|--------|
| `float` | Floating up/down | Gentle movement |
| `pulse` | Scale in/out | Heartbeat effect |
| `rotate` | Continuous rotation | Spinning |
| `bounce` | Bounce up/down | Playful jump |
| `fade` | Opacity change | Appear/disappear |
| `scale` | Size change | Grow/shrink |
| `slide` | Move direction | Sliding motion |
| `morph` | Shape change | Blob morphing |

---

## 🚀 Quick Start

### Installation

```bash
# Copy to your React project
src/
  components/
    animated-shapes/
      AnimatedShapes.tsx
      AnimatedShapesExtra.tsx
      AnimatedShapesDemo.tsx
      index.ts
```

### Setup (Important!)

**1. Add CSS Keyframes**

The animations require CSS keyframes. Add them to your global CSS or inject them:

```tsx
// In _app.tsx or layout
import { animationKeyframes } from '@/components/animated-shapes';

// Method 1: Inject in component
<style dangerouslySetInnerHTML={{ __html: animationKeyframes }} />

// Method 2: Add to global CSS
// Copy animationKeyframes string to your globals.css
```

### Basic Usage

```tsx
import { CirclesMultiple } from '@/components/animated-shapes';

// Use inside any component
<div className="relative overflow-hidden min-h-[400px]">
  <CirclesMultiple opacity={0.4} count={8} />
  
  {/* Your content on top */}
  <div className="relative z-10">
    <h1>Your Content</h1>
  </div>
</div>
```

---

## 📦 Component Props

```tsx
interface AnimatedShapeProps {
  className?: string;      // Additional CSS classes
  color?: string;          // Color name or hex
  size?: 'sm' | 'md' | 'lg' | 'xl';  // Shape size
  speed?: 'slow' | 'normal' | 'fast'; // Animation speed
  opacity?: number;        // 0 to 1
  count?: number;          // For multi-shape components
}
```

---

## 🔵 Circles

```tsx
// Single floating circle
<CircleFloatSimple 
  color="blue" 
  size="lg" 
  opacity={0.5}
  className="top-10 left-10"
/>

// Multiple scattered circles
<CirclesMultiple count={8} opacity={0.4} />

// Pulsing glow circle
<CirclePulseGlow color="purple" size="xl" />

// Ripple effect
<CirclesRipple color="cyan" />

// Orbiting circles
<CirclesOrbit count={3} opacity={0.6} />
```

---

## ⭐ Stars

```tsx
// Single floating star
<StarFloat color="yellow" size="md" />

// Scattered twinkling stars
<StarsScatter count={15} opacity={0.7} />

// Cosmic starfield with nebula
<CosmicShapes count={50} />
```

---

## 🟦 Rectangles

```tsx
// Rotating rectangle
<RectangleRotate color="purple" size="md" speed="slow" />

// Scattered squares
<SquaresScatter count={6} opacity={0.4} />
```

---

## 🫧 Blobs

```tsx
// Single morphing blob
<BlobMorph color="purple" size="xl" opacity={0.5} />

// Multiple gradient blobs
<BlobsMultiple opacity={0.4} />

// Gradient orbs (blur effect)
<GradientOrbs opacity={0.5} />
```

---

## ⬤ Dots & Particles

```tsx
// Dot grid pattern
<DotsGrid rows={8} cols={12} opacity={0.3} />

// Floating particles
<ParticlesFloat count={20} opacity={0.5} />

// Confetti celebration
<Confetti count={30} opacity={0.8} />

// Fireflies glow
<Fireflies count={15} opacity={0.8} />
```

---

## 🌦️ Weather Effects

```tsx
// Falling snow
<Snow count={40} opacity={0.8} />

// Rain drops
<Rain count={50} opacity={0.5} />
```

---

## 🔺 Triangles

```tsx
// Floating triangle
<TriangleFloat color="green" size="md" />

// Scattered triangles
<TrianglesScatter count={8} opacity={0.4} />
```

---

## ➖ Lines

```tsx
// Wavy lines
<LinesWave count={5} color="blue" opacity={0.3} />

// Tech grid pattern
<TechGrid color="cyan" opacity={0.1} />
```

---

## 🎨 Mixed & Special

```tsx
// Geometric mix (circles, squares, triangles, stars)
<GeometricMix opacity={0.4} />

// Neon glow shapes
<NeonShapes opacity={0.8} />

// Cyber/tech aesthetic
<CyberShapes opacity={0.6} />

// Retro/vintage style
<RetroShapes opacity={0.5} />

// Minimal elegant
<MinimalShapes opacity={0.3} />

// Nature (leaves, flowers)
<NatureShapes opacity={0.4} />
```

---

## 🎯 Usage Examples

### Hero Section

```tsx
<section className="relative min-h-screen overflow-hidden">
  <BlobsMultiple opacity={0.3} />
  
  <div className="relative z-10 flex items-center justify-center min-h-screen">
    <h1 className="text-6xl font-bold">Welcome</h1>
  </div>
</section>
```

### Card Decoration

```tsx
<div className="relative p-8 bg-gray-900 rounded-2xl overflow-hidden">
  <StarsScatter count={20} opacity={0.5} />
  
  <div className="relative z-10">
    <h2 className="text-white text-2xl">Premium Plan</h2>
  </div>
</div>
```

### Feature Section

```tsx
<section className="relative py-20 overflow-hidden">
  <DotsGrid opacity={0.1} />
  <CircleFloatSimple className="top-10 right-10" color="blue" opacity={0.2} />
  <CircleFloatSimple className="bottom-20 left-10" color="purple" opacity={0.2} />
  
  <div className="relative z-10">
    {/* Features */}
  </div>
</section>
```

### Gaming Theme

```tsx
<div className="relative bg-gray-950 overflow-hidden">
  <NeonShapes opacity={0.7} />
  <ParticlesFloat count={30} opacity={0.4} />
  
  <div className="relative z-10">
    {/* Gaming content */}
  </div>
</div>
```

### Celebration Modal

```tsx
<div className="relative bg-white rounded-2xl overflow-hidden">
  <Confetti count={50} opacity={0.9} />
  
  <div className="relative z-10 p-8 text-center">
    <h2>🎉 Congratulations!</h2>
  </div>
</div>
```

---

## 💡 Tips

### Layering

Always use `relative` on parent and `z-10` on content:

```tsx
<div className="relative overflow-hidden">
  <AnimatedShape />
  <div className="relative z-10">Content</div>
</div>
```

### Performance

For many shapes, reduce count on mobile:

```tsx
const isMobile = window.innerWidth < 768;
<ParticlesFloat count={isMobile ? 10 : 30} />
```

### Dark vs Light

Adjust opacity based on background:

```tsx
// Light background
<CirclesMultiple opacity={0.2} />

// Dark background
<CirclesMultiple opacity={0.5} />
```

### Color Customization

Use Tailwind colors or hex:

```tsx
<CircleFloatSimple color="blue" />     // Tailwind blue-500
<CircleFloatSimple color="#ff6b6b" />  // Custom hex
```

---

## ✅ Features

- ✅ 100 unique animated shape themes
- ✅ 8 shape categories
- ✅ 8 animation types
- ✅ Customizable colors, sizes, speeds
- ✅ Arabic + English names
- ✅ Responsive design
- ✅ TypeScript support
- ✅ Pure CSS animations
- ✅ No external dependencies
- ✅ Lightweight & performant
- ✅ Weather effects (snow, rain)
- ✅ Celebration effects (confetti)
- ✅ Theme-specific (neon, cyber, retro)

---

Made with ❤️ for Estabrek Store
