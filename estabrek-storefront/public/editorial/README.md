# Rose editorial assets

Generated using the built-in image_gen tool. Resized and encoded to WebP with Sharp. These images are campaign inspiration, not catalog inventory.

hijab-campaign.webp — Prompt: Premium portrait modest-fashion editorial. Adult Arab woman wearing dusty rose hijab fully covering her hair, neck and chest and a loose opaque full-length abaya with long sleeves. Pink sculptural studio architecture, circular recessed alcove, warm diffuse sunlight, gently floating scarf, rich folds and textile weave. Serene confident pose, realistic hands, 85mm magazine photography, blush/rose/pearl palette, subtle film grain. No handbag, coat, branding, text or watermark. Editorial inspiration, not a product photo.

scarves.webp — Prompt: Premium landscape studio still life. Three long hijab scarves in dusty rose, muted lilac and pearl ivory, folded and draped over low rounded pink sculptural blocks. Cascading textile and tactile woven folds, subtle silver hijab pin. Pink curved wall, warm morning light and diagonal shadows, refined contemporary feminine fashion art direction, photorealistic. No people, handbag, shoes, text or logos. Editorial inspiration, not catalog inventory.

estabrek-logo.webp — The store's original logo, sourced from its published CMS Cloudinary asset (1771746655378-bffb87ac56578_ml8aru.png). Resized to 512px and encoded to WebP. The active CMS logo takes precedence.

ScarfScene.tsx and HijabGeometry.ts use procedural draped garment geometry, a smooth display bust, woven texture and local lighting. No downloaded model or HDR image. It is fabric inspiration; actual product colors come from the catalog.

Cairo, Cormorant Garamond and Manrope are OFL-licensed Google Fonts from the official google/fonts repository. WOFF2 subsets are served locally. License files are beside the fonts in public/fonts. Cairo includes Arabic and Latin glyphs.


## Campaign fabric video (2026-10-03)

- Source: [A Pink Silk Fabric, Artem Podrez / Pexels, video 7234135](https://www.pexels.com/video/a-pink-silk-fabric-7234135/).
- [Pexels license](https://www.pexels.com/legal-pages/license/), checked 2026-10-03. Download and modification for website/editorial use are allowed; the footage is used as campaign inspiration, not as a store product or endorsement.
- Actual 11-second stock video, silent H.264, fast-start MP4. Desktop: 720×1280, 824243 bytes; mobile: 480×854, 245246 bytes. Poster: 900×1600 WebP, 42126 bytes, sampled at 1.5 seconds.
- Source retained in ignored `.tmp/rose-fabric-source.mp4`; exports created with FFmpeg (imageio-ffmpeg), CRF 25, no audio.
- Replace via an authored CMS VIDEO section. A published VIDEO suppresses the default campaign insert. The first HERO can disable it with `roseVideoEnabled: false`.
