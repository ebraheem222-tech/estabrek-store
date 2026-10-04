# Button Themes (100)

This module provides **100 button themes** (`10 color families x 10 style profiles`).

## Files

- `ButtonThemes.ts`: theme data, token generation, helpers.
- `index.ts`: public exports.

## Key Exports

```ts
import {
  buttonThemes,
  getButtonTheme,
  resolveButtonTheme,
  DEFAULT_BUTTON_THEME_ID,
} from "@/cms/button-themes";
```

## Use In Components

```tsx
<Button variant="primary" themeId="btn-violet-neon">
  Buy Now
</Button>
```

## Use As Global Admin Theme

```ts
import { applyButtonTheme } from "@/theme/buttonTheme";
applyButtonTheme("btn-violet-neon");
```

## Settings Integration

- Selectable in `Settings -> Storefront -> Theme & Colors`.
- Saved under `settings.header.storefront.buttonThemeId`.

