import { useState } from "react";

// ─────────────────────────────────────────────────────────────
// STYLE FAMILY 1: DIAMOND CUT  (inspired by B&W fashion sale)
// Diagonal geometric photo masks, price badge, high contrast
// ─────────────────────────────────────────────────────────────

const DiamondCutHero = ({ variant = 1 }) => {
  const variants = {
    1: { bg: "#FFFFFF", text: "#111", accent: "#E53935", price: "#111", priceText: "#FFF", badge: "#E53935", badgeText: "#FFF", tagline: "Special Offer", title: "FASHION\nSALE", desc: "Elevate your wardrobe with our latest drops.", label: "PRICE $199" },
    2: { bg: "#111111", text: "#FFF", accent: "#FFD700", price: "#FFD700", priceText: "#000", badge: "#FFD700", badgeText: "#000", tagline: "Exclusive Drop", title: "URBAN\nEDIT", desc: "Street-ready pieces for the bold and fearless.", label: "NOW $299" },
    3: { bg: "#0A0A0A", text: "#FFF", accent: "#00E5FF", price: "#00E5FF", priceText: "#000", badge: "#00E5FF", badgeText: "#000", tagline: "New Season", title: "COLD\nWAVE", desc: "Winter essentials, reimagined for the modern wardrobe.", label: "FROM $89" },
    4: { bg: "#F5F5F5", text: "#111", accent: "#7B1FA2", price: "#7B1FA2", priceText: "#FFF", badge: "#7B1FA2", badgeText: "#FFF", tagline: "Limited Edition", title: "VELVET\nDROP", desc: "Luxe textures meet bold silhouettes this season.", label: "ONLY $249" },
    5: { bg: "#1A1A2E", text: "#FFF", accent: "#FF6B6B", price: "#FF6B6B", priceText: "#FFF", badge: "#FF6B6B", badgeText: "#FFF", tagline: "Flash Sale", title: "NIGHT\nMODE", desc: "After-dark looks that demand attention.", label: "50% OFF" },
  };
  const v = variants[variant];

  // SVG person silhouettes for 3 diamond panels
  const Person = ({ cx, cy, scale = 1 }) => (
    <g transform={`translate(${cx},${cy}) scale(${scale})`}>
      <ellipse cx="0" cy="-60" rx="18" ry="20" fill="rgba(255,255,255,0.15)" />
      <rect x="-22" y="-38" width="44" height="55" rx="6" fill="rgba(255,255,255,0.1)" />
      <rect x="-32" y="-34" width="14" height="40" rx="6" fill="rgba(255,255,255,0.08)" />
      <rect x="18" y="-34" width="14" height="40" rx="6" fill="rgba(255,255,255,0.08)" />
      <rect x="-16" y="18" width="13" height="40" rx="5" fill="rgba(255,255,255,0.1)" />
      <rect x="3" y="18" width="13" height="40" rx="5" fill="rgba(255,255,255,0.1)" />
    </g>
  );

  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ backgroundColor: v.bg, height: "320px" }}>
      {/* Left text area */}
      <div className="absolute left-0 top-0 w-5/12 h-full flex flex-col justify-between p-8 z-10">
        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: v.accent, fontFamily: "'Georgia', serif", fontStyle: "italic" }}>
            {v.tagline}
          </p>
          <h2 className="text-5xl font-black leading-none tracking-tighter" style={{ color: v.text, fontFamily: "'Arial Black', sans-serif" }}>
            {v.title.split("\n").map((line, i) => <div key={i}>{line}</div>)}
          </h2>
        </div>
        <div>
          <p className="text-xs mb-4 opacity-60 leading-relaxed" style={{ color: v.text }}>{v.desc}</p>
          <div className="flex items-center gap-3">
            {["f","t","ig"].map(s => (
              <div key={s} className="w-7 h-7 rounded-full flex items-center justify-center border" style={{ borderColor: `${v.text}40`, color: v.text }}>
                <span className="text-[9px] font-bold">{s.toUpperCase()}</span>
              </div>
            ))}
            <span className="text-xs opacity-40" style={{ color: v.text }}>@socialmediainfo</span>
          </div>
        </div>
      </div>

      {/* Right: Diamond SVG panels */}
      <svg className="absolute right-0 top-0 h-full" style={{ width: "62%" }} viewBox="0 0 500 320" preserveAspectRatio="xMidYMid slice">
        {/* Price badge diamond */}
        <polygon points="260,10 380,10 430,80 380,150 260,150 210,80" fill={v.price} />
        <text x="320" y="60" textAnchor="middle" fill={v.priceText} fontSize="11" fontWeight="900" fontFamily="Arial Black" letterSpacing="1">PRICE</text>
        <text x="310" y="108" textAnchor="middle" fill={v.priceText} fontSize="36" fontWeight="900" fontFamily="Arial Black">{v.label.replace("PRICE ","").replace(" OFF","").replace("FROM ","").replace("NOW ","").replace("ONLY ","")}</text>

        {/* Big center diamond - main model */}
        <clipPath id={`dia-main-${variant}`}>
          <polygon points="180,5 460,5 495,160 460,315 180,315 145,160" />
        </clipPath>
        <rect x="145" y="5" width="350" height="310" fill={v.accent} opacity="0.08" clipPath={`url(#dia-main-${variant})`} />
        {/* Decorative grid lines inside */}
        {[...Array(8)].map((_,i) => (
          <line key={i} x1={145 + i*44} y1="5" x2={145 + i*30} y2="315" stroke={`${v.text}08`} strokeWidth="1" clipPath={`url(#dia-main-${variant})`} />
        ))}
        <Person cx={280} cy={180} scale={1.4} />

        {/* Bottom-left diamond - shoes/details */}
        <clipPath id={`dia-bl-${variant}`}>
          <polygon points="130,180 250,160 310,240 250,320 130,320 70,240" />
        </clipPath>
        <rect x="70" y="160" width="240" height="160" fill={v.accent} opacity="0.12" clipPath={`url(#dia-bl-${variant})`} />
        <Person cx={190} cy={270} scale={0.8} />

        {/* Bottom-right diamond */}
        <clipPath id={`dia-br-${variant}`}>
          <polygon points="330,180 450,165 500,240 450,315 330,315 280,240" />
        </clipPath>
        <rect x="280" y="165" width="220" height="150" fill={v.text} opacity="0.06" clipPath={`url(#dia-br-${variant})`} />
        <Person cx={390} cy={255} scale={0.75} />

        {/* White divider lines creating diamond borders */}
        <polygon points="180,5 460,5 495,160 460,315 180,315 145,160" fill="none" stroke={v.bg} strokeWidth="3" />
        <polygon points="130,180 250,160 310,240 250,320 130,320 70,240" fill="none" stroke={v.bg} strokeWidth="3" />
        <polygon points="330,180 450,165 500,240 450,315 330,315 280,240" fill="none" stroke={v.bg} strokeWidth="3" />
        <polygon points="260,10 380,10 430,80 380,150 260,150 210,80" fill="none" stroke={v.bg} strokeWidth="2" />
      </svg>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// STYLE FAMILY 2: EDITORIAL LINES  (inspired by B&W columns)
// Vertical black bars, script signature, ultra minimal
// ─────────────────────────────────────────────────────────────

const EditorialLinesHero = ({ variant = 1 }) => {
  const variants = {
    1: { bg: "#F0EFEA", text: "#111", bars: "#111", script: "enna", sub: "Contrast inspired collection", title: "BLACK & WHITE", event: "Great launch at Central Palace\nOctober 20 Collection 2022", bar1w: 28, bar1h: 200, bar2w: 28, bar2h: 130 },
    2: { bg: "#FFFFFF", text: "#1A1A1A", bars: "#1A1A1A", script: "maison", sub: "Monochrome SS collection", title: "PURE FORM", event: "Exhibition opens at The Gallery\nNovember 5, 2024", bar1w: 20, bar1h: 220, bar2w: 38, bar2h: 100 },
    3: { bg: "#F8F4EE", text: "#2C2C2C", bars: "#2C2C2C", script: "luma", sub: "Minimalist winter edition", title: "STILL LIFE", event: "Pop-up at Marché Concept\nDecember 12, 2024", bar1w: 16, bar1h: 180, bar2w: 50, bar2h: 90 },
    4: { bg: "#1A1A1A", text: "#F5F5F0", bars: "#F5F5F0", script: "sable", sub: "After dark capsule collection", title: "NOIR BLANC", event: "Exclusive at La Galerie Nuit\nJanuary 18, 2025", bar1w: 24, bar1h: 210, bar2w: 32, bar2h: 115 },
    5: { bg: "#EEE8E0", text: "#111", bars: "#8B0000", script: "vivid", sub: "Spring contrast editorial", title: "RED LINE", event: "Preview at Palazzo Rosso\nMarch 3, 2025", bar1w: 22, bar1h: 190, bar2w: 28, bar2h: 120 },
  };
  const v = variants[variant];

  return (
    <div className="relative w-full rounded-2xl overflow-hidden flex" style={{ backgroundColor: v.bg, height: "280px" }}>
      {/* Left: text content */}
      <div className="flex flex-col justify-between p-10 w-5/12">
        {/* Script signature */}
        <div>
          <svg viewBox="0 0 160 60" style={{ width: "140px", height: "50px" }}>
            <text x="8" y="44" fill={v.text} fontSize="38" fontFamily="'Brush Script MT', cursive" fontStyle="italic" fontWeight="400">
              {v.script}
            </text>
          </svg>
          <p className="text-xs tracking-widest mt-2 mb-1" style={{ color: v.text, opacity: 0.5, fontFamily: "'Times New Roman', serif" }}>
            {v.sub}
          </p>
          <h2 className="text-2xl font-black tracking-widest" style={{ color: v.text, fontFamily: "'Times New Roman', serif" }}>
            {v.title}
          </h2>
        </div>
        <div>
          <p className="text-xs leading-relaxed" style={{ color: v.text, opacity: 0.5, fontFamily: "'Times New Roman', serif", whiteSpace: "pre-line" }}>
            {v.event}
          </p>
        </div>
      </div>

      {/* Center: vertical bars as design element */}
      <div className="flex items-end justify-center gap-4 py-8 w-1/5">
        <div className="rounded-sm" style={{ width: `${v.bar1w}px`, height: `${v.bar1h}px`, backgroundColor: v.bars }} />
        <div className="rounded-sm" style={{ width: `${v.bar2w}px`, height: `${v.bar2h}px`, backgroundColor: v.bars }} />
      </div>

      {/* Right: model silhouette */}
      <div className="flex-1 relative overflow-hidden">
        <svg viewBox="0 0 300 280" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          {/* Model silhouette */}
          <defs>
            <linearGradient id={`fade-${variant}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={v.bg} stopOpacity="0.9" />
              <stop offset="30%" stopColor={v.bg} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Ambient light blobs */}
          <ellipse cx="180" cy="100" rx="120" ry="140" fill={v.bars} opacity="0.04" />
          {/* Stylized figure */}
          <ellipse cx="180" cy="50" rx="30" ry="33" fill={v.bars} opacity="0.15" />
          <rect x="148" y="84" width="64" height="90" rx="8" fill={v.bars} opacity="0.12" />
          <rect x="128" y="90" width="22" height="64" rx="10" fill={v.bars} opacity="0.1" />
          <rect x="210" y="90" width="22" height="64" rx="10" fill={v.bars} opacity="0.1" />
          <rect x="152" y="175" width="24" height="80" rx="8" fill={v.bars} opacity="0.12" />
          <rect x="182" y="175" width="24" height="80" rx="8" fill={v.bars} opacity="0.12" />
          {/* Caption text overlay */}
          <rect x="0" y="0" width="80" height="280" fill={`url(#fade-${variant})`} />
          <text x="240" y="28" textAnchor="middle" fill={v.text} fontSize="7" opacity="0.3" fontFamily="Times New Roman" letterSpacing="1">
            ipsum dolor sit amet, consectetuers
          </text>
          <text x="240" y="40" textAnchor="middle" fill={v.text} fontSize="7" opacity="0.3" fontFamily="Times New Roman" letterSpacing="1">
            ng elit, sed diam nonummy nib
          </text>
        </svg>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// STYLE FAMILY 3: ARCH & SPARKLE  (inspired by Spring Fashion)
// Arch shapes, diamond sparkles, rotated vertical text, warm tones
// ─────────────────────────────────────────────────────────────

const ArchSparklHero = ({ variant = 1 }) => {
  const variants = {
    1: { bg: "#F5F0D0", accent: "#F5C842", text: "#5C3A1E", pink: "#E8927A", label: "New Arrivals", title: "Spring\nFashion", sub: "New Collection", desc: "Discover curated styles for every occasion. Designed for the modern woman.", site: "www.yara.com", sideText: "Summer Sale" },
    2: { bg: "#E8F5E9", accent: "#66BB6A", text: "#1B5E20", pink: "#A5D6A7", label: "Just Landed", title: "Bloom\nEdit", sub: "Fresh Arrivals", desc: "Garden-fresh palettes, organic textures, nature-inspired silhouettes.", site: "www.bloom.com", sideText: "Spring Drop" },
    3: { bg: "#FFF8E1", accent: "#FFB300", text: "#4E342E", pink: "#FFCC80", label: "Season Picks", title: "Golden\nHour", sub: "Summer Edit", desc: "Sun-drenched pieces to carry you through the golden months ahead.", site: "www.goldhr.com", sideText: "Warm Tones" },
    4: { bg: "#FCE4EC", accent: "#F06292", text: "#880E4F", pink: "#F48FB1", label: "Valentine Drop", title: "Rose\nSeason", sub: "Love Collection", desc: "Romance-inspired designs, soft fabrics, and heartfelt palettes for you.", site: "www.roseco.com", sideText: "Soft & Sweet" },
    5: { bg: "#E3F2FD", accent: "#42A5F5", text: "#0D47A1", pink: "#90CAF9", label: "Cool Down", title: "Coastal\nVibes", sub: "Beach Edit", desc: "Breezy linens and ocean-washed hues for the perfect summer escape.", site: "www.coastal.co", sideText: "Ocean Mood" },
  };
  const v = variants[variant];

  const Sparkle = ({ x, y, size = 16 }) => (
    <g transform={`translate(${x},${y})`}>
      <line x1={`-${size/2}`} y1="0" x2={`${size/2}`} y2="0" stroke={v.pink} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="0" y1={`-${size/2}`} x2="0" y2={`${size/2}`} stroke={v.pink} strokeWidth="2.5" strokeLinecap="round" />
      <line x1={`-${size/3}`} y1={`-${size/3}`} x2={`${size/3}`} y2={`${size/3}`} stroke={v.pink} strokeWidth="1.5" strokeLinecap="round" />
      <line x1={`${size/3}`} y1={`-${size/3}`} x2={`-${size/3}`} y2={`${size/3}`} stroke={v.pink} strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );

  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ backgroundColor: v.bg, height: "300px" }}>
      {/* SVG decorative layer */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice">
        {/* Arch background shapes */}
        <rect x="430" y="30" width="170" height="220" rx="85" fill={v.accent} opacity="0.25" />
        <rect x="432" y="32" width="166" height="218" rx="83" fill="none" stroke={v.accent} strokeWidth="2" opacity="0.4" />

        {/* Geometric accent blocks */}
        <rect x="680" y="100" width="40" height="40" rx="4" fill={v.pink} opacity="0.5" />
        <rect x="690" y="200" width="25" height="25" rx="3" fill={v.pink} opacity="0.35" />
        <rect x="610" y="240" width="16" height="16" rx="2" fill={v.accent} opacity="0.6" />

        {/* Logo icon */}
        <polygon points="400,20 405,10 410,20 420,20 412,26 415,36 405,30 395,36 398,26 390,20" fill={v.text} opacity="0.4" transform="scale(0.7) translate(167,15)" />

        {/* Sparkles */}
        <Sparkle x={360} y={60} size={18} />
        <Sparkle x={760} y={50} size={22} />
        <Sparkle x={760} y={230} size={14} />
        <Sparkle x={390} y={220} size={12} />

        {/* Circular badge - "New Arrivals" rotated */}
        <g transform="translate(590,50)">
          <circle r="36" fill="none" stroke={v.text} strokeWidth="1" opacity="0.35" />
          {v.label.split("").map((char, i) => {
            const angle = (i / v.label.length) * 2 * Math.PI - Math.PI / 2;
            const r2 = 28;
            return (
              <text key={i}
                x={Math.cos(angle) * r2}
                y={Math.sin(angle) * r2}
                textAnchor="middle"
                dominantBaseline="central"
                fill={v.text}
                fontSize="8"
                fontFamily="'Times New Roman', serif"
                fontWeight="600"
                letterSpacing="0.5"
                transform={`rotate(${(angle * 180) / Math.PI + 90}, ${Math.cos(angle) * r2}, ${Math.sin(angle) * r2})`}
                opacity="0.7"
              >{char}</text>
            );
          })}
        </g>

        {/* Side vertical text */}
        <text x="785" y="200" textAnchor="middle" fill={v.text} fontSize="11" fontFamily="'Times New Roman', serif" fontWeight="700" opacity="0.45" transform="rotate(-90, 785, 160)" letterSpacing="3">
          {v.sideText.toUpperCase()}
        </text>
      </svg>

      {/* Text content */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-center p-10 w-1/2 z-10">
        <div className="flex items-center gap-2 mb-2">
          <svg viewBox="0 0 20 20" width="16" height="16">
            <polygon points="10,1 12,7 18,7 13,11 15,17 10,13 5,17 7,11 2,7 8,7" fill={v.text} opacity="0.5" />
          </svg>
          <span className="text-xs tracking-widest font-semibold uppercase" style={{ color: v.text, opacity: 0.6, fontFamily: "'Times New Roman', serif" }}>
            Yara
          </span>
        </div>
        <h1 className="text-5xl font-black leading-none mb-3" style={{ color: v.text, fontFamily: "'Georgia', serif", lineHeight: "1.05" }}>
          {v.title.split("\n").map((l, i) => <div key={i}>{l}</div>)}
        </h1>
        <div className="inline-flex mb-3">
          <span className="text-sm font-semibold px-5 py-1.5 rounded-full" style={{ backgroundColor: v.accent, color: v.text, fontFamily: "'Times New Roman', serif" }}>
            {v.sub}
          </span>
        </div>
        <p className="text-xs leading-relaxed mb-4 opacity-60" style={{ color: v.text, maxWidth: "280px", fontFamily: "'Times New Roman', serif" }}>{v.desc}</p>
        <div className="flex items-center gap-3">
          {["ig","f","tw"].map(s => (
            <div key={s} className="w-6 h-6 rounded-full flex items-center justify-center border" style={{ borderColor: `${v.text}40`, color: v.text }}>
              <span className="text-[8px] font-bold">{s}</span>
            </div>
          ))}
          <span className="text-xs opacity-40" style={{ color: v.text }}>{v.site}</span>
        </div>
      </div>

      {/* Model placeholder */}
      <div className="absolute right-0 top-0 h-full flex items-end justify-center" style={{ width: "45%" }}>
        <svg viewBox="0 0 300 300" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <ellipse cx="155" cy="55" rx="32" ry="35" fill={v.text} opacity="0.12" />
          <rect x="118" y="90" width="74" height="100" rx="8" fill={v.text} opacity="0.1" />
          <rect x="100" y="95" width="20" height="72" rx="9" fill={v.text} opacity="0.08" />
          <rect x="192" y="95" width="20" height="72" rx="9" fill={v.text} opacity="0.08" />
          <rect x="126" y="192" width="26" height="90" rx="8" fill={v.text} opacity="0.1" />
          <rect x="158" y="192" width="26" height="90" rx="8" fill={v.text} opacity="0.1" />
        </svg>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// STYLE FAMILY 4: BOTANICAL WAVE  (inspired by Summer Fashion Sale)
// Organic wave shape, leaf elements, discount badge, soft tones
// ─────────────────────────────────────────────────────────────

const BotanicalWaveHero = ({ variant = 1 }) => {
  const variants = {
    1: { bg: "#FFFFFF", wave: "#F5E6D0", text: "#C35B2A", accent: "#D4872C", leaf: "#E07060", title: "Summer\nFashion Sale", discount: "50%", desc: "Quality fashion for every moment. Classic styles, modern comfort.", site: "www.website.com" },
    2: { bg: "#FFF9F0", wave: "#FDDCB5", text: "#B5451B", accent: "#E07830", leaf: "#C85040", title: "Autumn\nTrend Sale", discount: "40%", desc: "Rich autumnal tones, textured fabrics, and timeless silhouettes.", site: "www.autumn.co" },
    3: { bg: "#F0FFF5", wave: "#C8F0D8", text: "#1B6B3C", accent: "#2E8B57", leaf: "#4CAF50", title: "Fresh\nSpring Edit", discount: "30%", desc: "Botanical prints and breezy fabrics for the new season arrivals.", site: "www.freshco.com" },
    4: { bg: "#F8F0FF", wave: "#E8D5FF", text: "#6B21A8", accent: "#7E30B5", leaf: "#9B59B6", title: "Bloom\nCollection", discount: "35%", desc: "Floral fantasy pieces for the romantic at heart this season.", site: "www.bloomco.co" },
    5: { bg: "#FFF5F5", wave: "#FFD0D5", text: "#C0183A", accent: "#E0254A", leaf: "#E87884", title: "Valentine\nFashion Sale", discount: "45%", desc: "Romantic reds, blush pinks, and heart-soft textures for love.", site: "www.lovefash.com" },
  };
  const v = variants[variant];

  const Leaf = ({ x, y, rotate, scale = 1 }) => (
    <g transform={`translate(${x},${y}) rotate(${rotate}) scale(${scale})`}>
      <path d="M0,-20 C10,-10 14,5 0,20 C-14,5 -10,-10 0,-20Z" fill={v.leaf} opacity="0.55" />
      <line x1="0" y1="-18" x2="0" y2="18" stroke={v.leaf} strokeWidth="1" opacity="0.6" />
      <line x1="0" y1="-5" x2="8" y2="2" stroke={v.leaf} strokeWidth="0.8" opacity="0.4" />
      <line x1="0" y1="5" x2="-7" y2="10" stroke={v.leaf} strokeWidth="0.8" opacity="0.4" />
    </g>
  );

  const Deco = ({ x, y }) => (
    <g transform={`translate(${x},${y})`}>
      <path d="M0,0 Q8,8 0,16 Q-8,8 0,0Z" fill="none" stroke={v.leaf} strokeWidth="1.5" opacity="0.4" />
      <path d="M5,3 Q12,10 5,18" fill="none" stroke={v.leaf} strokeWidth="1" opacity="0.3" />
    </g>
  );

  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ backgroundColor: v.bg, height: "290px" }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 290" preserveAspectRatio="xMidYMid slice">
        {/* Organic wave divider */}
        <path d={`M0,0 L500,0 L500,290 Q380,260 320,200 Q260,140 200,160 Q130,185 0,290 Z`} fill={v.wave} opacity="0.7" />

        {/* Botanical decorations */}
        <Leaf x={520} y={40} rotate={-30} scale={1.3} />
        <Leaf x={560} y={20} rotate={20} scale={0.9} />
        <Leaf x={490} y={80} rotate={-60} scale={0.8} />
        <Leaf x={580} y={65} rotate={50} scale={1.1} />
        <Leaf x={540} y={120} rotate={-15} scale={0.7} />
        <Leaf x={600} y={100} rotate={80} scale={0.9} />
        <Leaf x={500} y={150} rotate={-45} scale={1.0} />
        <Leaf x={620} y={145} rotate={25} scale={0.75} />

        {/* Monstera leaf outlines */}
        <ellipse cx="430" cy="150" rx="55" ry="70" fill="none" stroke={v.leaf} strokeWidth="1" opacity="0.12" />
        <ellipse cx="660" cy="60" rx="45" ry="58" fill="none" stroke={v.leaf} strokeWidth="1" opacity="0.1" />

        {/* Wave decorative swirls */}
        <Deco x={160} y={100} />
        <Deco x={100} y={60} />
        <Deco x={200} y={50} />

        {/* Left decorative chevrons */}
        {[0,1,2].map(i => (
          <path key={i} d={`M25,${100+i*18} L35,${109+i*18} L25,${118+i*18}`} fill="none" stroke={v.text} strokeWidth="2" opacity="0.3" />
        ))}

        {/* Social icons top */}
        {["T","IG","F"].map((s, i) => (
          <g key={i} transform={`translate(${310+i*32},28)`}>
            <circle r="11" fill="none" stroke={v.text} strokeWidth="1.2" opacity="0.3" />
            <text textAnchor="middle" dominantBaseline="central" fill={v.text} fontSize="7" fontFamily="sans-serif" fontWeight="700" opacity="0.5">{s}</text>
          </g>
        ))}
      </svg>

      {/* Text content */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-center pl-12 pr-8 w-1/2 z-10">
        <h1 className="text-5xl font-black leading-tight mb-3" style={{ color: v.text, fontFamily: "'Georgia', serif" }}>
          {v.title.split("\n").map((l, i) => (
            <div key={i} style={{ color: i === 0 ? v.text : v.accent }}>{l}</div>
          ))}
        </h1>
        <p className="text-xs leading-relaxed mb-4 opacity-65" style={{ color: v.text, maxWidth: "260px", fontFamily: "'Times New Roman', serif" }}>{v.desc}</p>
        <div className="flex items-center gap-2 mb-5">
          <span className="text-sm font-black" style={{ color: v.accent }}>UPTO</span>
          <span className="text-3xl font-black" style={{ color: v.accent }}>{v.discount}</span>
          <span className="text-xl font-black" style={{ color: v.accent }}>OFF</span>
          <span className="text-lg opacity-40" style={{ color: v.text }}>{"<<<"}</span>
        </div>
        <button className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold tracking-widest uppercase text-white rounded-sm w-fit" style={{ backgroundColor: v.accent, fontFamily: "'Arial Black', sans-serif" }}>
          SHOP NOW
        </button>
        <p className="text-xs mt-3 opacity-40" style={{ color: v.text }}>{v.site}</p>
      </div>

      {/* Model */}
      <div className="absolute right-0 top-0 h-full" style={{ width: "42%" }}>
        <svg viewBox="0 0 320 290" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id={`bwfade-${variant}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={v.bg} stopOpacity="1" />
              <stop offset="25%" stopColor={v.bg} stopOpacity="0" />
            </linearGradient>
          </defs>
          <ellipse cx="180" cy="60" rx="38" ry="42" fill={v.text} opacity="0.1" />
          <rect x="140" y="102" width="78" height="100" rx="8" fill={v.text} opacity="0.08" />
          <rect x="120" y="107" width="22" height="78" rx="10" fill={v.text} opacity="0.06" />
          <rect x="218" y="107" width="22" height="78" rx="10" fill={v.text} opacity="0.06" />
          <rect x="148" y="202" width="30" height="75" rx="8" fill={v.text} opacity="0.08" />
          <rect x="182" y="202" width="30" height="75" rx="8" fill={v.text} opacity="0.08" />
          <rect x="0" y="0" width="80" height="290" fill={`url(#bwfade-${variant})`} />
        </svg>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// STYLE FAMILY 5: ARCH GRADIENT  (inspired by New Collection)
// Pastel gradient bg, arched photo frame, circular badge, star bursts
// ─────────────────────────────────────────────────────────────

const ArchGradientHero = ({ variant = 1 }) => {
  const variants = {
    1: { from: "#C9D6FF", to: "#E2B0FF", text: "#1A1A2E", tagline: "New Collection For Your Style", title: "New\nCollection", desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.", site: "www.fashion.com", archBg: "#D4B8E0", accent: "#333" },
    2: { from: "#A8EDEA", to: "#FED6E3", text: "#1A2E2E", tagline: "Discover Your Perfect Style", title: "Fresh\nArrivals", desc: "Handpicked pieces from emerging designers around the world, curated for the fashion-forward individual.", site: "www.arrivals.co", archBg: "#B8E0DC", accent: "#1A3030" },
    3: { from: "#FEE2E2", to: "#FECACA", text: "#450A0A", tagline: "Romance Meets Style This Season", title: "Rose\nGarden", desc: "Soft florals and romantic silhouettes inspired by English garden parties and timeless femininity.", site: "www.rosegarden.com", archBg: "#F9B8B8", accent: "#5A0A0A" },
    4: { from: "#D1FAE5", to: "#A7F3D0", text: "#064E3B", tagline: "Eco-Conscious Fashion Forward", title: "Green\nEdit", desc: "Sustainably sourced materials and earth-friendly dyes for the conscious fashion lover.", site: "www.greendit.co", archBg: "#86EFAC", accent: "#14532D" },
    5: { from: "#FFF9C4", to: "#FDE68A", text: "#3D2000", tagline: "Golden Hour Style Collection", title: "Sunset\nLooks", desc: "Warm-toned pieces inspired by the magic of golden hour light and sun-drenched afternoons.", site: "www.sunsetlooks.com", archBg: "#FCD34D", accent: "#2D1500" },
  };
  const v = variants[variant];

  const StarBurst = ({ x, y, size = 16 }) => {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const outerA = (i * 45 - 90) * Math.PI / 180;
      const innerA = ((i * 45 + 22.5) - 90) * Math.PI / 180;
      pts.push(`${Math.cos(outerA) * size},${Math.sin(outerA) * size}`);
      pts.push(`${Math.cos(innerA) * (size * 0.42)},${Math.sin(innerA) * (size * 0.42)}`);
    }
    return <polygon transform={`translate(${x},${y})`} points={pts.join(" ")} fill={v.text} opacity="0.4" />;
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg,${v.from},${v.to})`, height: "310px" }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 310" preserveAspectRatio="xMidYMid slice">
        {/* Brand icon top center */}
        <text x="410" y="28" textAnchor="middle" fill={v.text} fontSize="10" fontFamily="'Arial', sans-serif" fontWeight="700" opacity="0.5" letterSpacing="2">
          ✦ FASHION
        </text>

        {/* Atom-like decoration top left */}
        <g transform="translate(52,40)">
          <circle r="12" fill="none" stroke={v.text} strokeWidth="1.5" opacity="0.3" />
          <ellipse rx="20" ry="8" fill="none" stroke={v.text} strokeWidth="1" opacity="0.25" transform="rotate(30)" />
          <ellipse rx="20" ry="8" fill="none" stroke={v.text} strokeWidth="1" opacity="0.25" transform="rotate(-30)" />
          <circle r="3" fill={v.text} opacity="0.4" />
        </g>

        {/* Diamond shape top right */}
        <polygon points="730,20 745,35 730,50 715,35" fill={v.text} opacity="0.5" />

        {/* Star bursts */}
        <StarBurst x={715} y={140} size={14} />
        <StarBurst x={60} y={265} size={16} />

        {/* Circular text badge on arch */}
        <g transform="translate(190,105)">
          {["F","I","N","D"," ","Y","O","U","R"," ","S","T","Y","L","E"," ","N","O","W"," "].map((char, i) => {
            const total = 20;
            const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
            const r = 42;
            return (
              <text key={i}
                x={Math.cos(angle) * r}
                y={Math.sin(angle) * r}
                textAnchor="middle"
                dominantBaseline="central"
                fill={v.text}
                fontSize="7.5"
                fontFamily="'Times New Roman', serif"
                fontWeight="600"
                transform={`rotate(${(angle * 180) / Math.PI + 90}, ${Math.cos(angle) * r}, ${Math.sin(angle) * r})`}
                opacity="0.6"
              >{char}</text>
            );
          })}
        </g>

        {/* Right edge vertical text */}
        <text x="790" y="155" textAnchor="middle" fill={v.text} fontSize="9" fontFamily="Georgia" fontWeight="500" opacity="0.35" letterSpacing="2.5" transform="rotate(90,790,155)">
          BUILDING NAME, MAIN ROAD, COUNTRY
        </text>

        {/* Social icons right side */}
        {["IG","F","TW","BE"].map((s, i) => (
          <g key={i} transform={`translate(768,${70+i*36})`}>
            <rect x="-14" y="-14" width="28" height="28" rx="6" fill={v.text} opacity="0.12" />
            <text textAnchor="middle" dominantBaseline="central" fill={v.text} fontSize="7" fontFamily="sans-serif" fontWeight="700" opacity="0.6">{s}</text>
          </g>
        ))}

        {/* Bottom social bar */}
        {[["IG","@fashion"],["F","fashion"],["TW","@fashion"]].map(([icon, handle], i) => (
          <g key={i} transform={`translate(${55 + i * 140}, 285)`}>
            <circle r="10" fill={v.text} opacity="0.15" />
            <text textAnchor="middle" dominantBaseline="central" fill={v.text} fontSize="7" fontWeight="700" opacity="0.5">{icon}</text>
            <text x="18" textAnchor="start" dominantBaseline="central" fill={v.text} fontSize="8.5" opacity="0.45" fontFamily="Georgia">{handle}</text>
          </g>
        ))}
      </svg>

      {/* Arched photo frame - left */}
      <div className="absolute top-6 left-10 z-10" style={{ width: "220px", height: "250px" }}>
        <svg viewBox="0 0 220 250" className="absolute inset-0 w-full h-full">
          <clipPath id={`arch-${variant}`}>
            <path d="M10,120 L10,240 Q10,248 18,248 L202,248 Q210,248 210,240 L210,120 Q210,50 115,10 Q20,50 10,120Z" />
          </clipPath>
          <path d="M10,120 L10,240 Q10,248 18,248 L202,248 Q210,248 210,240 L210,120 Q210,50 115,10 Q20,50 10,120Z" fill={v.archBg} opacity="0.6" />
          {/* Model silhouette inside arch */}
          <g clipPath={`url(#arch-${variant})`}>
            <rect x="0" y="0" width="220" height="250" fill={v.archBg} opacity="0.3" />
            <ellipse cx="113" cy="65" rx="35" ry="38" fill={v.text} opacity="0.15" />
            <rect x="75" y="104" width="76" height="95" rx="8" fill={v.text} opacity="0.12" />
            <rect x="55" y="109" width="22" height="70" rx="10" fill={v.text} opacity="0.1" />
            <rect x="150" y="109" width="22" height="70" rx="10" fill={v.text} opacity="0.1" />
            <rect x="82" y="200" width="24" height="50" rx="8" fill={v.text} opacity="0.12" />
            <rect x="112" y="200" width="24" height="50" rx="8" fill={v.text} opacity="0.12" />
          </g>
          <path d="M10,120 L10,240 Q10,248 18,248 L202,248 Q210,248 210,240 L210,120 Q210,50 115,10 Q20,50 10,120Z" fill="none" stroke={v.text} strokeWidth="2" opacity="0.2" />
        </svg>
      </div>

      {/* Right text content */}
      <div className="absolute right-0 top-0 h-full flex flex-col justify-center pr-16 pl-8 z-10" style={{ left: "55%", right: "60px" }}>
        <h1 className="text-6xl font-bold leading-tight mb-4" style={{ color: v.text, fontFamily: "'Georgia', serif", letterSpacing: "-1px" }}>
          {v.title.split("\n").map((l, i) => <div key={i}>{l}</div>)}
        </h1>
        <p className="text-xs leading-relaxed mb-4 opacity-55" style={{ color: v.text, fontFamily: "'Times New Roman', serif" }}>
          {v.desc}
        </p>
        <div className="border-t border-current py-3 mb-4" style={{ borderColor: `${v.text}30` }}>
          <p className="text-xs tracking-widest uppercase opacity-60" style={{ color: v.text, fontFamily: "'Times New Roman', serif" }}>
            {v.tagline}
          </p>
        </div>
        <p className="text-xs opacity-40" style={{ color: v.text }}>more info : {v.site}</p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN SHOWCASE APP
// ─────────────────────────────────────────────────────────────

const FAMILIES = [
  {
    id: "diamond",
    name: "Diamond Cut",
    desc: "Geometric photo masks, price badges, high-contrast editorial",
    count: 5,
    Component: DiamondCutHero,
    palette: ["#E53935", "#111", "#FFD700", "#00E5FF", "#7B1FA2"],
  },
  {
    id: "editorial",
    name: "Editorial Lines",
    desc: "Vertical bar accents, script signature, minimal luxury",
    count: 5,
    Component: EditorialLinesHero,
    palette: ["#F0EFEA", "#FFF", "#F8F4EE", "#1A1A1A", "#EEE8E0"],
  },
  {
    id: "arch",
    name: "Arch & Sparkle",
    desc: "Arch shapes, diamond sparkles, circular text, playful tones",
    count: 5,
    Component: ArchSparklHero,
    palette: ["#F5C842", "#66BB6A", "#FFB300", "#F06292", "#42A5F5"],
  },
  {
    id: "botanical",
    name: "Botanical Wave",
    desc: "Organic waves, leaf illustrations, discount badges",
    count: 5,
    Component: BotanicalWaveHero,
    palette: ["#FFF", "#FFF9F0", "#F0FFF5", "#F8F0FF", "#FFF5F5"],
  },
  {
    id: "arch-gradient",
    name: "Arch Gradient",
    desc: "Pastel gradients, arched frame, star bursts, social layout",
    count: 5,
    Component: ArchGradientHero,
    palette: ["#C9D6FF", "#A8EDEA", "#FEE2E2", "#D1FAE5", "#FFF9C4"],
  },
];

export default function AdvancedHeroBanners() {
  const [activeFamily, setActiveFamily] = useState("diamond");
  const [activeVariant, setActiveVariant] = useState(1);
  const [copiedCode, setCopiedCode] = useState(false);

  const family = FAMILIES.find(f => f.id === activeFamily);
  const Component = family.Component;

  const cmsConfig = {
    family: family.id,
    variant: activeVariant,
    componentName: family.Component.name,
    importAs: `import { ${family.Component.name} } from './hero-advanced-themes';`,
    usage: `<${family.Component.name} variant={${activeVariant}} />`,
    cmsField: { type: "hero_theme", family: family.id, variant: activeVariant },
    replaceImage: "Replace the SVG silhouette with: <img src={heroImage} className='w-full h-full object-cover object-top' />",
  };

  const copyCode = () => {
    navigator.clipboard.writeText(JSON.stringify(cmsConfig, null, 2));
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white" style={{ fontFamily: "'Georgia', serif" }}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-950 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Advanced Hero Banners</h1>
            <p className="text-xs text-gray-400">5 style families · 25 variants · Inspired by real design templates</p>
          </div>
          <button
            onClick={copyCode}
            className="text-xs bg-white text-black px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-all"
          >
            {copiedCode ? "✓ Copied CMS Config" : "Copy CMS Config"}
          </button>
        </div>
      </div>

      {/* Family selector */}
      <div className="px-6 pt-5 pb-3 flex gap-3 overflow-x-auto">
        {FAMILIES.map(f => (
          <button
            key={f.id}
            onClick={() => { setActiveFamily(f.id); setActiveVariant(1); }}
            className={`flex-shrink-0 rounded-xl p-3 border transition-all text-left ${
              activeFamily === f.id
                ? "border-white bg-white/10"
                : "border-gray-700 hover:border-gray-500"
            }`}
            style={{ minWidth: "200px" }}
          >
            <div className="flex gap-1 mb-2">
              {f.palette.map((c, i) => (
                <div key={i} className="w-4 h-4 rounded-full border border-gray-700" style={{ backgroundColor: c }} />
              ))}
            </div>
            <p className="text-sm font-bold text-white">{f.name}</p>
            <p className="text-xs text-gray-400 leading-tight mt-0.5">{f.desc}</p>
          </button>
        ))}
      </div>

      {/* Big preview */}
      <div className="px-6 pb-4">
        <div className="relative">
          <Component variant={activeVariant} />
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="text-xs font-bold text-white">{family.name}</span>
            <span className="text-xs text-gray-400">Variant {activeVariant}</span>
          </div>
        </div>
      </div>

      {/* Variant selector */}
      <div className="px-6 pb-2">
        <p className="text-xs text-gray-500 mb-3 uppercase tracking-widest">Select Variant</p>
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: family.count }, (_, i) => i + 1).map(v => (
            <div
              key={v}
              onClick={() => setActiveVariant(v)}
              className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02] ${
                activeVariant === v ? "border-white shadow-lg shadow-white/15" : "border-transparent hover:border-gray-600"
              }`}
            >
              <div className="scale-[0.45] origin-top-left" style={{ width: "222%", height: "222%", pointerEvents: "none" }}>
                <Component variant={v} />
              </div>
              <div className="bg-gray-900 py-1.5 text-center">
                <span className="text-xs text-gray-300">Variant {v}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All families preview */}
      <div className="px-6 pb-10 mt-6">
        <div className="border-t border-gray-800 pt-6 mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest">All Families at a Glance</p>
        </div>
        <div className="grid grid-cols-1 gap-6">
          {FAMILIES.map(f => (
            <div key={f.id} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-white">{f.name}</span>
                <span className="text-xs text-gray-500">{f.desc}</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: f.count }, (_, i) => i + 1).map(v => (
                  <div
                    key={v}
                    onClick={() => { setActiveFamily(f.id); setActiveVariant(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="cursor-pointer rounded-xl overflow-hidden border border-gray-700 hover:border-white transition-all group"
                  >
                    <div className="scale-[0.38] origin-top-left" style={{ width: "263%", height: "263%", pointerEvents: "none" }}>
                      <f.Component variant={v} />
                    </div>
                    <div className="bg-gray-900 py-1 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-gray-300">v{v}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
