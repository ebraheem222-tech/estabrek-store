# Estabrek Storefront (CMS-powered)

This is a Next.js (App Router) storefront that renders **published CMS pages** from your backend:

- Navbar + Footer from **Navigation Menus** (Admin)
- Page sections rendered via the **shared CMS renderer** (same UI as Admin preview)
- SEO head meta from **Page SEO + global SiteSettings** (favicon/apple icon/theme color)

## 1) Run the backend
From your backend repo:

```bash
docker compose --env-file .env.docker up -d --build
```
Backend will be on: `http://localhost:4000`.

## 2) Configure env
Copy env example:

```bash
cp .env.example .env.local
```

## 3) Install + run storefront

```bash
npm i
npm run dev
```

Open: `http://localhost:3000`

## CMS routing
- `/` loads CMS page with slug `/`
- `/about` loads CMS page with slug `/about`

If a page is not published or slug doesn't exist, you'll get a 404 page.

## Notes
- **Global icons + theme-color** are injected from `SiteSettings`.
- **Head scripts** + **Body scripts** support either:
  - `[{ src, async, defer }]`
  - `["https://..."]`
  - `{ code: "...js..." }`

(If you store full `<script ...>` HTML in the DB, convert it to the structured JSON format above.)
