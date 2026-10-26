# 🎠 Slider & Carousel Themes

100 Ready-to-Use Slider & Carousel Components

100 مكون سلايدر ودوار جاهز للاستخدام

---

## 📊 Categories Overview

| Category | Count | Description |
|----------|-------|-------------|
| 🎯 **Basic** | 15 | Simple, fade, arrows, dots |
| 🛒 **E-commerce** | 15 | Products, featured, sale |
| 🖼️ **Hero** | 12 | Fullscreen, parallax, video |
| 💬 **Testimonial** | 13 | Reviews, quotes, ratings |
| 🖼️ **Gallery** | 13 | Grid, masonry, lightbox |
| 🎮 **Gaming** | 8 | Neon, retro, esports |
| 🏢 **Corporate** | 8 | Team, clients, logos |
| 🎨 **Creative** | 8 | Agency, portfolio, split |
| 🍔 **Food** | 4 | Menu, specials |
| ✈️ **Travel** | 4 | Destinations, packages |

**Total: 100 slider themes**

---

## 🎨 Slider Styles

| Style | Description | Best For |
|-------|-------------|----------|
| `basic` | Simple image slider | General use |
| `fade` | Fade transition | Hero, slideshow |
| `cards` | Card-based slides | Products, features |
| `carousel` | Multiple visible slides | Products, team |
| `gallery` | Image gallery | Portfolio, photos |
| `hero` | Full-width/fullscreen | Landing pages |
| `testimonial` | Review/quote style | Social proof |
| `product` | E-commerce focused | Online stores |

---

## 🚀 Quick Start

### Installation

```bash
# Copy to your React project
src/
  components/
    slider-themes/
      SliderThemes.tsx
      SliderComponents.tsx
      SliderThemesDemo.tsx
      index.ts
```

### Basic Usage

```tsx
import { sliderComponents } from '@/components/slider-themes';

// Define slides
const slides = [
  { id: 1, title: 'Slide 1', image: '/img1.jpg' },
  { id: 2, title: 'Slide 2', image: '/img2.jpg' },
  { id: 3, title: 'Slide 3', image: '/img3.jpg' },
];

// Get a slider component
const Slider = sliderComponents['basic-simple'];

// Use it
<Slider slides={slides} showArrows showDots />
```

---

## 📦 Slide Item Props

```tsx
interface SlideItem {
  id: string | number;      // Unique identifier
  image?: string;           // Image URL
  title?: string;           // Title text
  subtitle?: string;        // Subtitle
  description?: string;     // Description
  badge?: string;           // Badge text (e.g., "New", "Sale")
  price?: string;           // Price
  originalPrice?: string;   // Original price (for discounts)
  rating?: number;          // Star rating (1-5)
  link?: string;            // Link URL
  author?: string;          // Author name (testimonials)
  role?: string;            // Author role
  avatar?: string;          // Author avatar URL
}
```

---

## 📦 Slider Props

```tsx
interface SliderProps {
  slides: SlideItem[];         // Required: array of slides
  autoPlay?: boolean;          // Auto-advance slides
  autoPlayInterval?: number;   // Interval in ms (default: 5000)
  showArrows?: boolean;        // Show prev/next arrows
  showDots?: boolean;          // Show pagination dots
  showThumbnails?: boolean;    // Show thumbnail strip
  infinite?: boolean;          // Loop slides infinitely
  slidesToShow?: number;       // Visible slides (carousel)
  gap?: number;                // Gap between slides
  className?: string;          // Additional CSS classes
}
```

---

## 🎯 Basic Sliders (1-15)

```tsx
// Simple with arrows
<SliderBasicSimple 
  slides={slides} 
  showArrows 
  showDots 
/>

// Fade transition
const FadeSlider = sliderComponents['basic-fade'];
<FadeSlider slides={slides} autoPlay />

// Dark theme
const DarkSlider = sliderComponents['basic-dark'];
<DarkSlider slides={slides} />

// Gradient backgrounds
const GradientSlider = sliderComponents['basic-gradient'];
<GradientSlider slides={slides} />
```

---

## 🛒 Product Sliders (16-30)

```tsx
// Product carousel
<SliderProductCarousel 
  slides={products}
  slidesToShow={4}
  showArrows
/>

// Luxury/Fashion
const LuxurySlider = sliderComponents['product-luxury'];
<LuxurySlider slides={products} />

// Sale/Promo
const SaleSlider = sliderComponents['product-sale'];
<SaleSlider slides={saleItems} />
```

Product slides support:
- `price` / `originalPrice`
- `badge` (New, Sale, Hot)
- `rating` (stars)

---

## 🖼️ Hero Sliders (31-42)

```tsx
// Fullscreen hero
<SliderHeroFullscreen
  slides={heroSlides}
  autoPlay
  autoPlayInterval={6000}
/>

// Tech/SaaS style
const TechSlider = sliderComponents['hero-tech'];
<TechSlider slides={slides} />

// Split layout
<SliderCreativeSplit slides={slides} />
```

---

## 💬 Testimonial Sliders (43-55)

```tsx
// Simple testimonial
<SliderTestimonial
  slides={[
    { 
      id: 1, 
      description: "Amazing product!", 
      author: "John Doe", 
      role: "CEO", 
      rating: 5 
    },
    // ...
  ]}
/>

// Card style
const TestimonialCards = sliderComponents['testimonial-card'];
<TestimonialCards slides={reviews} slidesToShow={3} />
```

---

## 🖼️ Gallery Sliders (56-68)

```tsx
// With thumbnails
<SliderGalleryThumbnails
  slides={images}
  showArrows
/>

// Portfolio
const PortfolioGallery = sliderComponents['gallery-portfolio'];
<PortfolioGallery slides={works} />
```

---

## 🎮 Gaming Sliders (69-76)

```tsx
// Neon/Cyberpunk
<SliderGamingNeon
  slides={games}
  showDots
/>

// Retro arcade
<SliderRetroGaming slides={games} />
```

---

## 🏢 Corporate Sliders (77-84)

```tsx
// Client logos (auto-scroll)
<SliderCorporateClients
  slides={[
    { id: 1, title: 'Client A', image: '/logo-a.png' },
    { id: 2, title: 'Client B', image: '/logo-b.png' },
  ]}
/>

// Team carousel
const TeamSlider = sliderComponents['corporate-team'];
<TeamSlider slides={teamMembers} slidesToShow={4} />
```

---

## 🍔 Food Sliders (93-96)

```tsx
// Menu items
<SliderFoodMenu
  slides={menuItems}
  slidesToShow={4}
/>
```

---

## ✈️ Travel Sliders (97-100)

```tsx
// Destinations
<SliderTravelDestinations
  slides={destinations}
/>
```

---

## 🔧 useSlider Hook

```tsx
import { useSlider } from '@/components/slider-themes';

function CustomSlider({ slides }) {
  const {
    currentIndex,
    goToSlide,
    goNext,
    goPrev,
    isPlaying,
    setIsPlaying,
  } = useSlider(slides.length, {
    autoPlay: true,
    autoPlayInterval: 5000,
    infinite: true,
  });

  return (
    <div>
      <div>Slide {currentIndex + 1}</div>
      <button onClick={goPrev}>Prev</button>
      <button onClick={goNext}>Next</button>
      <button onClick={() => setIsPlaying(!isPlaying)}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
    </div>
  );
}
```

---

## 🎨 Customization Examples

### Custom Arrows
```tsx
<SliderBasicSimple
  slides={slides}
  showArrows
  className="[&_button]:bg-red-500 [&_button]:text-white"
/>
```

### Custom Dots
```tsx
<SliderBasicSimple
  slides={slides}
  showDots
  className="[&_.dots]:gap-4 [&_.dot]:w-4 [&_.dot]:h-4"
/>
```

### Responsive Slides
```tsx
// Use Tailwind responsive classes
<div className="md:hidden">
  <Slider slidesToShow={1} />
</div>
<div className="hidden md:block lg:hidden">
  <Slider slidesToShow={2} />
</div>
<div className="hidden lg:block">
  <Slider slidesToShow={4} />
</div>
```

---

## 💡 Tips

1. **Performance**: Use lazy loading for images
2. **Mobile**: Reduce `slidesToShow` on small screens
3. **Autoplay**: Consider disabling on mobile
4. **Accessibility**: Add proper alt text to images
5. **Images**: Use consistent aspect ratios

---

## ✅ Features

- ✅ 100 unique slider themes
- ✅ 10 industry categories
- ✅ 8 slider styles
- ✅ Arabic + English names
- ✅ Responsive design
- ✅ Touch/swipe ready
- ✅ Autoplay support
- ✅ Infinite loop
- ✅ TypeScript support
- ✅ Pure Tailwind CSS
- ✅ useSlider hook
- ✅ No external dependencies

---

Made with ❤️ for Estabrek Store
