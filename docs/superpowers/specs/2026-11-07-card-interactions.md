# Product cards and storefront interactions (C1)

The owner can configure product cards and public visual interactions in the CMS. The user explicitly chose store defaults with overrides on pages and individual elements. This is an addition to the shipped Shop/Cart editor; dynamic account/product page templates remain a later part of phase C.

Cards expose layout, image ratio/fit, background, text and border colours, radius, spacing, title/price sizes, visible parts, button colours and swatch size/shape/gap. Product names, prices, pictures and colour values stay bound to the catalog. An absent card design inherits; `null` restores the original card. Selected card colours carry through quick add.

Interactions have four events: colour selection, add-button click, accepted cart addition and ordinary click. Each event independently inherits from store → page → nearest element; an explicit empty action list disables that event. Automatic initial colour selection does not run shopper actions. Actions are a bounded registry: apply theme (event colour or a fixed hex), reset theme, show/hide/toggle a native element, scroll to it, or pulse/fade/shake it. No executable code, arbitrary selectors or remote side effects are stored. Theme effects last for the current page visit and restore exact inline values on reset/navigation. Existing behaviour remains when no rule is configured.

Global configuration has a dedicated nullable SiteSettings.visualControls JSON column, independent optimistic revision, read/write settings permissions, public normalized DTO and cache invalidation. General settings saves/history cannot overwrite it. Page/element values follow normal draft/publication. UI makes inheritance and disabling explicit; target selection uses native element IDs. Preview uses synthetic products and local simulation only, without orders or persistent cart changes.

Tests use local browser fixtures and the explicitly isolated CI PostgreSQL database. Never seed or test writes against merchant databases or APIs. Existing unconfigured designs retain their renderer.
