# CMS Renderer (Shared)

This folder is designed to be copied into **both**:
- Admin dashboard (for preview)
- Storefront (for real rendering)

## Usage

```ts
import { CmsPageRenderer, buildSeoMeta, type CmsSection, type CmsPage } from "./cms";
```

### Render sections

```tsx
<CmsPageRenderer
  sections={page.sections}
  renderProductCard={(productId) => <ProductCard productId={productId} />}
/>
```

### SEO

```ts
const seo = buildSeoMeta(page);
// Put seo.title / seo.description / seo.canonicalUrl / seo.ogImageUrl / seo.robots in your <head>.
```

### Per-section anchors

Backend supports:
- section.anchorId -> renders as `id` on the outer <section>
- section.ariaLabel -> renders as `aria-label`
