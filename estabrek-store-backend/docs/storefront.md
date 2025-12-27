# Storefront CMS API (Public)

هاي الـ endpoints مخصصة لواجهة المتجر (Storefront) عشان تقرأ الـ CMS وتعرضه للزوار.

> ملاحظة: كل الـ pages هون بتطلع **فقط إذا status = PUBLISHED**.

---

## 1) Bootstrap (Settings + Menus)

**GET** `/v1/storefront/bootstrap`

يرجع:
- `site`: SiteSettings
  - `header` / `footer` (JSON)
  - `scriptsHead` / `scriptsBody`
  - `customCss` (global CSS للمتجر)
  - `contactEmail` / `contactPhone`
- `primaryMenu`: `{ menuId, tree } | null`
- `footerMenu`: `{ menuId, tree } | null`

مثال:
```json
{
  "site": {
    "siteName": "Estabrak",
    "logoUrl": "https://...",
    "header": {"sticky": true},
    "footer": {"about": {"title": "عن المتجر"}},
    "scriptsHead": "<meta ...>",
    "scriptsBody": "<script ...></script>",
    "customCss": ".btn{border-radius:16px}",
    "contactEmail": "support@example.com",
    "contactPhone": "+972..."
  },
  "primaryMenu": {"menuId": "...", "tree": [/* nested */]},
  "footerMenu": {"menuId": "...", "tree": [/* nested */]}
}
```

---

## 2) Get published page by slug

**GET** `/v1/storefront/page?slug=/about`

- slug ممكن تبعته كـ `/about` أو `about`.
- للـ root استخدم `slug=/`.

يرجع:
```json
{
  "page": {
    "id": "...",
    "name": "About",
    "slug": "/about",
    "status": "PUBLISHED",
    "headScripts": null,
    "bodyScripts": null,
    "customCss": "...",
    "canonicalUrl": "https://example.com/about",
    "sections": [
      {"id": "...", "type": "HERO", "order": 0, "data": {"title": "..."}},
      {"id": "...", "type": "RICH_TEXT", "order": 1, "data": {"html": "<p>...</p>"}}
    ]
  }
}
```

> ملاحظة: الـ backend بنظّف HTML تبع `RICH_TEXT` (sanitize) كـ طبقة حماية إضافية.

---

## 3) List published pages (للسايت ماب/الراوتر)

**GET** `/v1/storefront/pages`

يرجع قائمة خفيفة:
```json
{
  "pages": [
    {"id": "...", "name": "Home", "slug": "/", "updatedAt": "2025-12-22T..."}
  ]
}
```
