# 📬 Contact Form Templates

100 Ready-to-Use Contact Form Designs for All Industries

100 تصميم نموذج اتصال جاهز لجميع الصناعات

---

## 📊 Categories Overview

| Category | Count | Description |
|----------|-------|-------------|
| 🎯 **Basic** | 15 | Clean, minimal form designs |
| 🚀 **Tech** | 12 | SaaS, AI, developer, startup |
| 🛒 **E-commerce** | 12 | Support, inquiry, wholesale |
| 🎮 **Gaming** | 10 | Neon, esports, retro |
| 🏢 **Corporate** | 12 | Professional, consulting, legal |
| 🎨 **Creative** | 12 | Agency, portfolio, photography |
| 🍔 **Food** | 10 | Restaurant, reservation, catering |
| 🏋️ **Fitness** | 8 | Gym, yoga, spa, membership |
| ✈️ **Travel** | 9 | Hotel, booking, tour |

**Total: 100 contact form templates**

---

## 🎨 Layout Types

| Layout | Description | Best For |
|--------|-------------|----------|
| `single` | Single column form | Simple contact |
| `split` | Form + Contact info | Business, agency |
| `card` | Elevated card style | Modern, clean |
| `floating` | Floating labels | Elegant, minimal |
| `minimal` | Ultra simple | Portfolio, creative |
| `fullwidth` | Full width sections | Landing pages |
| `sidebar` | Form + Quick links | E-commerce support |

---

## 🚀 Quick Start

### Installation

```bash
# Copy to your React project
src/
  components/
    contact-forms/
      ContactFormThemes.tsx
      ContactFormComponents.tsx
      ContactFormThemesDemo.tsx
      index.ts
```

### Basic Usage

```tsx
import { contactFormComponents } from '@/components/contact-forms';

// Get a specific form
const ContactForm = contactFormComponents['tech-saas'];

function ContactPage() {
  return (
    <ContactForm
      title="Get in Touch"
      subtitle="We'd love to hear from you"
      email="hello@example.com"
      phone="+1 (555) 123-4567"
      onSubmit={(data) => console.log(data)}
    />
  );
}
```

---

## 📦 Form Props

All contact form components accept these props:

```tsx
interface ContactFormProps {
  // Content
  title?: string;           // Form title
  subtitle?: string;        // Subtitle text
  description?: string;     // Description paragraph
  
  // Contact Info (for split layouts)
  email?: string;           // Contact email
  phone?: string;           // Phone number
  address?: string;         // Physical address
  
  // Field Visibility
  showName?: boolean;       // Show name field (default: true)
  showEmail?: boolean;      // Show email field (default: true)
  showPhone?: boolean;      // Show phone field (default: true)
  showSubject?: boolean;    // Show subject field (default: true)
  showCompany?: boolean;    // Show company field (default: false)
  showMessage?: boolean;    // Show message field (default: true)
  
  // Labels & Placeholders
  nameLabel?: string;
  emailLabel?: string;
  phoneLabel?: string;
  subjectLabel?: string;
  companyLabel?: string;
  messageLabel?: string;
  submitLabel?: string;
  
  namePlaceholder?: string;
  emailPlaceholder?: string;
  phonePlaceholder?: string;
  subjectPlaceholder?: string;
  companyPlaceholder?: string;
  messagePlaceholder?: string;
  
  // Handlers
  onSubmit?: (data: any) => void;
  
  // Customization
  className?: string;
  children?: React.ReactNode;
}
```

---

## 🎯 Basic Forms (1-15)

```tsx
// Simple single column
<ContactFormBasicSimple title="Contact Us" />

// Card style
<ContactFormBasicCard title="Get in Touch" />

// Split with contact info
<ContactFormBasicSplit
  title="Let's Talk"
  email="hello@example.com"
  phone="+1 555-123-4567"
  address="123 Main St, City"
/>

// Dark theme
<ContactFormDark title="Contact" />

// Glass morphism
const Form14 = contactFormComponents['basic-glass'];
<Form14 title="Contact Us" />
```

---

## 🚀 Tech Forms (16-27)

```tsx
// SaaS gradient
<ContactFormTechGradient
  title="Start Building"
  subtitle="Join thousands of developers"
/>

// AI/ML style
const TechAI = contactFormComponents['tech-ai'];
<TechAI title="AI-Powered Support" />

// Developer/API style
const TechDev = contactFormComponents['tech-developer'];
<TechDev title="API Support" />

// Crypto/blockchain
const TechCrypto = contactFormComponents['tech-crypto'];
<TechCrypto title="Get in Touch" />
```

---

## 🎮 Gaming Forms (40-49)

```tsx
// Neon cyberpunk
<ContactFormGamingNeon
  title="Join the Battle"
  subtitle="Contact our support team"
/>

// Esports
const GamingEsports = contactFormComponents['gaming-esports'];
<GamingEsports title="Join Our Team" />

// Retro arcade
const GamingRetro = contactFormComponents['gaming-retro'];
<GamingRetro title="CONTACT US" />
```

---

## 🏢 Corporate Forms (50-61)

```tsx
// Professional business
<ContactFormCorporate
  title="Contact Our Team"
  description="Get in touch with our experts"
  phone="+1 (555) 123-4567"
  email="info@company.com"
  address="123 Business Ave"
/>
```

---

## 🎨 Creative Forms (62-73)

```tsx
// Creative agency
<ContactFormCreative
  title="Let's Create Together"
  subtitle="Tell us about your project"
/>

// Photography booking
const Photography = contactFormComponents['creative-photography'];
<Photography title="Book a Session" />

// Minimal portfolio
const Portfolio = contactFormComponents['creative-portfolio'];
<Portfolio title="Say Hello" />
```

---

## 🍔 Food Forms (74-83)

```tsx
// Restaurant reservation
<ContactFormFood
  title="Make a Reservation"
  phone="(555) 123-4567"
  email="info@restaurant.com"
  address="123 Food Street"
/>
```

---

## 🏋️ Fitness Forms (84-91)

```tsx
// Gym membership inquiry
<ContactFormFitness
  title="Start Your Journey"
  description="Get your free trial today"
/>

// Spa/wellness booking
const Spa = contactFormComponents['fitness-spa'];
<Spa title="Book Your Escape" />
```

---

## ✈️ Travel Forms (92-100)

```tsx
// Travel inquiry
<ContactFormTravel
  title="Plan Your Trip"
  description="Let us help you explore"
/>
```

---

## 🛒 E-commerce Support (Special)

```tsx
// Support with quick links
<ContactFormEcommerceSupport
  title="How Can We Help?"
  subtitle="Choose a topic below"
  phone="+1 (555) 123-4567"
  email="support@store.com"
/>
```

---

## 🔧 API Reference

### Get Theme Data

```tsx
import { 
  contactFormThemes,
  getContactFormTheme,
  getFormsByCategory,
  getFormsByTag 
} from '@/components/contact-forms';

// All themes
console.log(contactFormThemes.length); // 100

// Get theme by ID
const theme = getContactFormTheme('tech-saas');

// Get by category
const techForms = getFormsByCategory('Tech'); // 12 forms

// Get by tag
const darkForms = getFormsByTag('dark');
```

### Theme Object

```tsx
interface ContactFormTheme {
  id: string;       // 'tech-saas'
  name: string;     // 'Tech SaaS'
  nameAr: string;   // 'تقنية SaaS'
  category: string; // 'Tech'
  layout: 'single' | 'split' | 'card' | 'floating' | 'minimal' | 'fullwidth' | 'sidebar';
  tags?: string[];  // ['tech', 'saas', 'modern']
}
```

---

## 🎯 Industry-Specific Features

### Restaurant Forms
- Date & Time picker
- Number of guests selector
- Special requests field

### Fitness Forms
- Program/service selector
- Free trial CTA
- Membership inquiry

### Travel Forms
- Destination input
- Check-in/out dates
- Number of travelers

### E-commerce Support
- Order number field
- Topic selector
- Urgency checkbox
- Quick help links

### Gaming Forms
- Gamer tag field
- Game selector
- Discord/Twitch links

---

## 💡 Tips

1. **Split layouts** work best when you have contact info to display
2. **Dark themes** match well with gaming/tech sites
3. **Card styles** add elevation and focus
4. **Floating labels** create an elegant, modern feel
5. **Add validation** on top of these base templates

---

## ✅ Features

- ✅ 100 unique form templates
- ✅ 9 industry categories
- ✅ 7 layout variations
- ✅ Arabic + English names
- ✅ Responsive design
- ✅ Dark mode variants
- ✅ TypeScript support
- ✅ Pure Tailwind CSS
- ✅ Industry-specific fields
- ✅ No dependencies

---

Made with ❤️ for Estabrek Store
