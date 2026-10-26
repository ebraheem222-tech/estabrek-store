import { useState, useEffect, useRef } from "react";

export const featurePackThemes = [
  // ═══════════════════════════════════════════
  // 🚀 HERO / FEATURE PACK THEMES
  // ═══════════════════════════════════════════

  // 1. Gradient Glassmorphism Hero
  {
    id: 1,
    name: "Gradient Glass Hero",
    category: "Hero",
    render: (data) => (
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)", minHeight: 420 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 420">
          <defs>
            <radialGradient id="gh1"><stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4"/><stop offset="100%" stopColor="transparent"/></radialGradient>
            <radialGradient id="gh2"><stop offset="0%" stopColor="#ec4899" stopOpacity="0.3"/><stop offset="100%" stopColor="transparent"/></radialGradient>
            <filter id="ghBlur"><feGaussianBlur stdDeviation="30"/></filter>
          </defs>
          <circle cx="200" cy="100" r="180" fill="url(#gh1)" filter="url(#ghBlur)"><animate attributeName="cx" values="200;250;200" dur="10s" repeatCount="indefinite"/></circle>
          <circle cx="700" cy="350" r="200" fill="url(#gh2)" filter="url(#ghBlur)"><animate attributeName="cy" values="350;300;350" dur="12s" repeatCount="indefinite"/></circle>
          {[...Array(30)].map((_, i) => <circle key={i} cx={Math.random()*900} cy={Math.random()*420} r={Math.random()*1.5} fill="white" opacity={Math.random()*0.4}/>)}
        </svg>
        <div className="relative z-10 p-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(139,92,246,0.3)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" }}>{data.badge || "✨ New Release"}</span>
          </div>
          <h2 className="text-4xl font-black text-white mb-3 leading-tight" style={{ maxWidth: 500 }}>{data.title || "The Ultimate Experience"}</h2>
          <p className="text-gray-400 text-sm mb-8" style={{ maxWidth: 440 }}>{data.subtitle || "Everything you need in one powerful package"}</p>
          <div className="grid grid-cols-3 gap-4 mb-8" style={{ maxWidth: 550 }}>
            {(data.features || ["Unlimited Access","Priority Support","Cloud Storage"]).map((f, i) => (
              <div key={i} className="rounded-xl p-4 text-center" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="text-2xl mb-2">{["⚡","🛡️","☁️","🎯","💎","🔥"][i] || "✦"}</div>
                <span className="text-white text-xs font-medium">{f}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button className="px-8 py-3 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)", boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }}>{data.cta || "Get Started"}</button>
            <button className="px-8 py-3 rounded-xl text-sm font-medium text-gray-300" style={{ border: "1px solid rgba(255,255,255,0.15)" }}>{data.cta2 || "Learn More"}</button>
          </div>
        </div>
      </div>
    ),
  },

  // 2. Pricing Spotlight
  {
    id: 2,
    name: "Pricing Spotlight",
    category: "Pricing",
    render: (data) => (
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ background: "#0a0a0f", minHeight: 420 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 420">
          <defs>
            <radialGradient id="ps_spot" cx="50%" cy="30%"><stop offset="0%" stopColor="#fbbf24" stopOpacity="0.08"/><stop offset="100%" stopColor="transparent"/></radialGradient>
          </defs>
          <rect width="900" height="420" fill="url(#ps_spot)"/>
          {[...Array(20)].map((_, i) => <line key={i} x1={i*48} y1="0" x2={i*48} y2="420" stroke="white" strokeWidth="0.3" opacity="0.03"/>)}
          {[...Array(12)].map((_, i) => <line key={i} x1="0" y1={i*36} x2="900" y2={i*36} stroke="white" strokeWidth="0.3" opacity="0.03"/>)}
        </svg>
        <div className="relative z-10 p-10">
          <div className="text-center mb-8">
            <span className="text-yellow-400/70 text-xs tracking-widest uppercase font-semibold">{data.badge || "💰 Choose Your Plan"}</span>
            <h2 className="text-3xl font-black text-white mt-2">{data.title || "Simple, Transparent Pricing"}</h2>
            <p className="text-gray-500 text-sm mt-2">{data.subtitle || "No hidden fees. Cancel anytime."}</p>
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { name: "Starter", price: "$9", features: ["5 Products","Basic Analytics","Email Support"], popular: false },
              { name: "Pro", price: "$29", features: ["Unlimited Products","Advanced Analytics","Priority Support"], popular: true },
              { name: "Enterprise", price: "$99", features: ["Custom Solutions","Dedicated Manager","SLA Guarantee"], popular: false },
            ].map((plan, i) => (
              <div key={i} className="rounded-2xl p-5 relative" style={{
                background: plan.popular ? "linear-gradient(135deg, rgba(251,191,36,0.1), rgba(245,158,11,0.05))" : "rgba(255,255,255,0.03)",
                border: plan.popular ? "1px solid rgba(251,191,36,0.3)" : "1px solid rgba(255,255,255,0.06)",
                transform: plan.popular ? "scale(1.05)" : "scale(1)"
              }}>
                {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900">POPULAR</div>}
                <h3 className="text-white font-bold text-sm">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-2 mb-4">
                  <span className="text-3xl font-black" style={{ color: plan.popular ? "#fbbf24" : "white" }}>{plan.price}</span>
                  <span className="text-gray-500 text-xs">/mo</span>
                </div>
                {plan.features.map((f, j) => (
                  <div key={j} className="flex items-center gap-2 mb-2">
                    <span style={{ color: plan.popular ? "#fbbf24" : "#4ade80" }} className="text-xs">✓</span>
                    <span className="text-gray-400 text-xs">{f}</span>
                  </div>
                ))}
                <button className="w-full mt-3 py-2 rounded-lg text-xs font-bold" style={{
                  background: plan.popular ? "linear-gradient(135deg, #fbbf24, #f59e0b)" : "rgba(255,255,255,0.06)",
                  color: plan.popular ? "#1a1a1a" : "white", border: plan.popular ? "none" : "1px solid rgba(255,255,255,0.1)"
                }}>Choose Plan</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // 3. Feature Bento Grid
  {
    id: 3,
    name: "Feature Bento Grid",
    category: "Features",
    render: (data) => (
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ background: "linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%)", minHeight: 420 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 420">
          <defs><pattern id="bentoDots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#d4d4d8" opacity="0.5"/></pattern></defs>
          <rect width="900" height="420" fill="url(#bentoDots)"/>
        </svg>
        <div className="relative z-10 p-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-black text-gray-900">{data.title || "Everything You Need"}</h2>
            <p className="text-gray-500 text-sm mt-1">{data.subtitle || "Powerful features for modern commerce"}</p>
          </div>
          <div className="grid grid-cols-4 grid-rows-2 gap-3 max-w-3xl mx-auto" style={{ height: 280 }}>
            {/* Large card */}
            <div className="col-span-2 row-span-2 rounded-2xl p-6 flex flex-col justify-between" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", boxShadow: "0 8px 30px rgba(124,58,237,0.2)" }}>
              <div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3" style={{ background: "rgba(255,255,255,0.15)" }}>🚀</div>
                <h3 className="text-white font-bold text-lg">Lightning Fast</h3>
                <p className="text-violet-200/70 text-xs mt-1">Blazing performance with sub-second load times and instant checkout</p>
              </div>
              <div className="flex gap-2 mt-4">
                <span className="px-2 py-0.5 rounded text-xs bg-white/10 text-white/70">99.9% Uptime</span>
                <span className="px-2 py-0.5 rounded text-xs bg-white/10 text-white/70">CDN Global</span>
              </div>
            </div>
            {/* Small cards */}
            {[
              { icon: "🔒", title: "Secure Payments", desc: "PCI DSS compliant", bg: "white" },
              { icon: "📊", title: "Analytics", desc: "Real-time insights", bg: "white" },
              { icon: "🌍", title: "Multi-Currency", desc: "130+ currencies", bg: "#1a1a2e", dark: true },
              { icon: "📦", title: "Inventory", desc: "Auto-sync stock", bg: "#fef3c7" },
            ].map((card, i) => (
              <div key={i} className="rounded-2xl p-4 flex flex-col justify-between" style={{ background: card.bg, border: card.bg === "white" ? "1px solid #e5e7eb" : "none" }}>
                <span className="text-xl">{card.icon}</span>
                <div>
                  <h4 className={`font-bold text-sm ${card.dark ? "text-white" : "text-gray-800"}`}>{card.title}</h4>
                  <p className={`text-xs mt-0.5 ${card.dark ? "text-gray-400" : "text-gray-500"}`}>{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // 4. Product Launch Hero
  {
    id: 4,
    name: "Product Launch Hero",
    category: "Hero",
    render: (data) => (
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ background: "#000", minHeight: 420 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 420">
          <defs>
            <radialGradient id="pl_glow" cx="50%" cy="50%"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15"/><stop offset="100%" stopColor="transparent"/></radialGradient>
            <filter id="pl_blur"><feGaussianBlur stdDeviation="2"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <rect width="900" height="420" fill="url(#pl_glow)"/>
          {/* Orbit rings */}
          <ellipse cx="450" cy="210" rx="300" ry="120" fill="none" stroke="#3b82f6" strokeWidth="0.5" opacity="0.1">
            <animateTransform attributeName="transform" type="rotate" from="0 450 210" to="360 450 210" dur="30s" repeatCount="indefinite"/>
          </ellipse>
          <ellipse cx="450" cy="210" rx="220" ry="80" fill="none" stroke="#8b5cf6" strokeWidth="0.5" opacity="0.08">
            <animateTransform attributeName="transform" type="rotate" from="360 450 210" to="0 450 210" dur="20s" repeatCount="indefinite"/>
          </ellipse>
          {/* Orbiting dots */}
          {[0,120,240].map((offset, i) => {
            const colors = ["#3b82f6","#8b5cf6","#ec4899"];
            return <circle key={i} cx="0" cy="0" r="3" fill={colors[i]} filter="url(#pl_blur)">
              <animateMotion dur={`${15+i*5}s`} repeatCount="indefinite" path={`M450,210 m-${250-i*40},0 a${250-i*40},${100-i*20} 0 1,1 ${(250-i*40)*2},0 a${250-i*40},${100-i*20} 0 1,1 -${(250-i*40)*2},0`}/>
            </circle>;
          })}
          {[...Array(20)].map((_, i) => <circle key={i} cx={Math.random()*900} cy={Math.random()*420} r={Math.random()*1.2} fill="white" opacity={Math.random()*0.3}/>)}
        </svg>
        <div className="relative z-10 flex flex-col items-center justify-center text-center p-10" style={{ minHeight: 420 }}>
          <span className="text-blue-400/70 text-xs tracking-widest uppercase font-semibold mb-4">{data.badge || "🚀 Launching Today"}</span>
          <h2 className="text-5xl font-black text-white mb-3" style={{ textShadow: "0 0 40px rgba(59,130,246,0.3)" }}>{data.title || "Game Changer"}</h2>
          <p className="text-gray-400 text-sm mb-6 max-w-md">{data.subtitle || "The product you've been waiting for is finally here"}</p>
          <div className="flex items-center gap-6 mb-8">
            {(data.stats || [{ val: "10x", label: "Faster" },{ val: "99.9%", label: "Uptime" },{ val: "24/7", label: "Support" }]).map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-black text-blue-400">{s.val}</div>
                <div className="text-gray-500 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button className="px-10 py-3.5 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", boxShadow: "0 4px 25px rgba(59,130,246,0.4)" }}>Pre-Order Now</button>
            <button className="px-8 py-3.5 rounded-xl text-sm font-medium text-gray-300 border border-white/10">Watch Demo ▶</button>
          </div>
        </div>
      </div>
    ),
  },

  // 5. Comparison Table
  {
    id: 5,
    name: "Comparison Table",
    category: "Pricing",
    render: (data) => (
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ background: "linear-gradient(180deg, #f0fdf4 0%, #ecfdf5 50%, #d1fae5 100%)", minHeight: 420 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 420">
          {[...Array(10)].map((_, i) => <path key={i} d={`M${-50+i*15},${200+i*10} Q${200+i*8},${150+i*15} ${450+i*5},${190+i*8} T${950-i*15},${180+i*12}`} fill="none" stroke="#86efac" strokeWidth="1" opacity={0.08+i*0.01}/>)}
        </svg>
        <div className="relative z-10 p-8">
          <div className="text-center mb-6">
            <span className="text-emerald-600 text-xs tracking-widest uppercase font-semibold">🏆 Compare Plans</span>
            <h2 className="text-3xl font-black text-gray-900 mt-2">{data.title || "Find Your Perfect Fit"}</h2>
          </div>
          <div className="max-w-2xl mx-auto rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid #d1fae5", boxShadow: "0 8px 30px rgba(34,197,94,0.08)" }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
                  <th className="text-left p-4 text-white text-sm font-bold">Feature</th>
                  <th className="text-center p-4 text-white text-sm font-bold">Free</th>
                  <th className="text-center p-4 text-sm font-bold" style={{ color: "#fef3c7" }}>Pro ⭐</th>
                  <th className="text-center p-4 text-white text-sm font-bold">Team</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feat: "Products", free: "10", pro: "Unlimited", team: "Unlimited" },
                  { feat: "Storage", free: "1 GB", pro: "50 GB", team: "500 GB" },
                  { feat: "Analytics", free: "Basic", pro: "Advanced", team: "Custom" },
                  { feat: "Support", free: "Email", pro: "Priority", team: "Dedicated" },
                  { feat: "API Access", free: "✕", pro: "✓", team: "✓" },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f0fdf4", background: i % 2 ? "#fafffe" : "white" }}>
                    <td className="p-3 text-sm font-medium text-gray-700">{row.feat}</td>
                    <td className="p-3 text-sm text-center text-gray-500">{row.free}</td>
                    <td className="p-3 text-sm text-center font-semibold text-emerald-600">{row.pro}</td>
                    <td className="p-3 text-sm text-center text-gray-600">{row.team}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-center gap-3 p-4 bg-emerald-50/50">
              <button className="px-6 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600">Start Free</button>
              <button className="px-6 py-2 rounded-lg text-xs font-bold text-emerald-700 border border-emerald-300">Upgrade Pro</button>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // 6. Trust & Social Proof
  {
    id: 6,
    name: "Trust & Social Proof",
    category: "Trust",
    render: (data) => (
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ background: "#0f172a", minHeight: 380 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 380">
          <defs><linearGradient id="tp_grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.05"/><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05"/></linearGradient></defs>
          <rect width="900" height="380" fill="url(#tp_grad)"/>
          {[...Array(6)].map((_, i) => <circle key={i} cx={150*i+75} cy="380" r={60+i*10} fill="none" stroke="#1e293b" strokeWidth="1" opacity="0.3"/>)}
        </svg>
        <div className="relative z-10 p-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-white">{data.title || "Trusted by 50,000+ Businesses"}</h2>
            <p className="text-slate-400 text-sm mt-2">Join companies that scale with confidence</p>
          </div>
          {/* Stats bar */}
          <div className="flex justify-center gap-12 mb-8">
            {[
              { val: "50K+", label: "Active Stores", icon: "🏪" },
              { val: "$2.1B", label: "Revenue Processed", icon: "💰" },
              { val: "4.9/5", label: "Average Rating", icon: "⭐" },
              { val: "99.99%", label: "Uptime", icon: "🔒" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <span className="text-xl">{s.icon}</span>
                <div className="text-2xl font-black text-white mt-1">{s.val}</div>
                <div className="text-slate-500 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
          {/* Testimonial cards */}
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { name: "Sarah K.", role: "CEO, StyleCo", text: "Increased our revenue by 340% in 3 months", stars: 5 },
              { name: "Mike R.", role: "Founder, TechShop", text: "The best e-commerce platform we've ever used", stars: 5 },
              { name: "Lisa M.", role: "CMO, FoodBox", text: "Setup took 10 minutes. Sales started in an hour", stars: 5 },
            ].map((t, i) => (
              <div key={i} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-yellow-400 text-xs mb-2">{"★".repeat(t.stars)}</div>
                <p className="text-gray-300 text-xs italic mb-3">"{t.text}"</p>
                <div>
                  <div className="text-white text-xs font-bold">{t.name}</div>
                  <div className="text-gray-500 text-xs">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // 7. Feature Showcase Cards
  {
    id: 7,
    name: "Feature Showcase Cards",
    category: "Features",
    render: (data) => (
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #faf5ff 0%, #fdf2f8 50%, #fff1f2 100%)", minHeight: 420 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 420">
          {[...Array(8)].map((_, i) => <circle key={i} cx={100+Math.random()*700} cy={50+Math.random()*320} r={40+Math.random()*60} fill="none" stroke={["#e9d5ff","#fbcfe8","#fecdd3"][i%3]} strokeWidth="1" opacity="0.2"/>)}
        </svg>
        <div className="relative z-10 p-8">
          <div className="text-center mb-8">
            <span className="text-purple-500 text-xs tracking-widest uppercase font-semibold">🎯 Core Features</span>
            <h2 className="text-3xl font-black text-gray-900 mt-2">{data.title || "Built for Performance"}</h2>
            <p className="text-gray-500 text-sm mt-1">Everything your store needs to succeed</p>
          </div>
          <div className="grid grid-cols-3 gap-5 max-w-3xl mx-auto">
            {[
              { icon: "⚡", title: "Instant Checkout", desc: "One-click purchase flow with smart cart optimization", color: "#8b5cf6" },
              { icon: "📱", title: "Mobile First", desc: "Responsive design that converts on every device", color: "#ec4899" },
              { icon: "🔍", title: "Smart Search", desc: "AI-powered product discovery and recommendations", color: "#f43f5e" },
              { icon: "📊", title: "Live Analytics", desc: "Real-time dashboard with conversion tracking", color: "#8b5cf6" },
              { icon: "🌐", title: "Multi-Language", desc: "Reach global audiences with auto-translation", color: "#ec4899" },
              { icon: "🎨", title: "Theme Editor", desc: "Drag-and-drop customization without code", color: "#f43f5e" },
            ].map((f, i) => (
              <div key={i} className="rounded-2xl p-5 transition-all" style={{ background: "white", boxShadow: "0 4px 20px rgba(0,0,0,0.04)", border: "1px solid #f3f4f6" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3" style={{ background: `${f.color}15` }}>{f.icon}</div>
                <h3 className="text-gray-900 font-bold text-sm">{f.title}</h3>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // 8. Dark Neon Feature Strip
  {
    id: 8,
    name: "Dark Neon Feature Strip",
    category: "Features",
    render: (data) => (
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #0a0a1a 0%, #111127 100%)", minHeight: 380 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 380">
          <defs><filter id="dnf_glow"><feGaussianBlur stdDeviation="6"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          <line x1="0" y1="190" x2="900" y2="190" stroke="#6366f1" strokeWidth="1" opacity="0.1"/>
          {[150,300,450,600,750].map((x, i) => <circle key={i} cx={x} cy="190" r="4" fill="#6366f1" filter="url(#dnf_glow)" opacity="0.3"><animate attributeName="opacity" values="0.2;0.6;0.2" dur={`${2+i*0.5}s`} repeatCount="indefinite"/></circle>)}
          {[...Array(4)].map((_, i) => <rect key={i} x={160+i*180} y="120" width="120" height="140" rx="12" fill="none" stroke="#6366f1" strokeWidth="0.5" opacity="0.08"/>)}
        </svg>
        <div className="relative z-10 p-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-white">{data.title || "Power Features"}</h2>
            <p className="text-indigo-300/40 text-sm mt-1">Built for the modern web</p>
          </div>
          <div className="flex justify-center gap-5">
            {[
              { icon: "🛡️", title: "SSL Security", desc: "256-bit encryption", color: "#22c55e" },
              { icon: "⚡", title: "Edge CDN", desc: "< 50ms worldwide", color: "#3b82f6" },
              { icon: "🤖", title: "AI Engine", desc: "Smart recommendations", color: "#8b5cf6" },
              { icon: "📈", title: "Auto Scale", desc: "Handle any traffic", color: "#ec4899" },
            ].map((f, i) => (
              <div key={i} className="text-center rounded-2xl p-5 w-44" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mx-auto mb-3" style={{ background: `${f.color}15`, boxShadow: `0 0 20px ${f.color}20` }}>{f.icon}</div>
                <h3 className="text-white font-bold text-sm">{f.title}</h3>
                <p className="text-gray-500 text-xs mt-1">{f.desc}</p>
                <div className="w-8 h-0.5 mx-auto mt-3 rounded-full" style={{ background: f.color, opacity: 0.5 }}/>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // 9. Candy Pack Bundle
  {
    id: 9,
    name: "Candy Pack Bundle",
    category: "Candy",
    render: (data) => (
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 30%, #fbcfe8 60%, #fdf4ff 100%)", minHeight: 420 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 420">
          {[...Array(40)].map((_, i) => {
            const x=Math.random()*900, y=Math.random()*420, a=Math.random()*360;
            const colors=["#f9a8d4","#c4b5fd","#93c5fd","#fda4af","#a5f3fc","#d9f99d"];
            return <rect key={i} x={x} y={y} width={3} height={12} rx="1.5" fill={colors[i%6]} opacity={0.3+Math.random()*0.2} transform={`rotate(${a} ${x+1.5} ${y+6})`}/>;
          })}
          {[...Array(8)].map((_, i) => <circle key={i} cx={80+Math.random()*740} cy={40+Math.random()*340} r={15+Math.random()*25} fill="none" stroke={["#f9a8d4","#c4b5fd","#fda4af"][i%3]} strokeWidth="1.5" opacity="0.15"/>)}
        </svg>
        <div className="relative z-10 p-8">
          <div className="text-center mb-2">
            <span className="text-3xl">🍬🍭🍫</span>
            <h2 className="text-3xl font-black text-pink-700 mt-2">{data.title || "Sweet Bundle Packs"}</h2>
            <p className="text-pink-400/60 text-sm mt-1">Mix, match & save big on your favorite treats</p>
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mt-6">
            {[
              { name: "Starter Box", price: "$14.99", items: "12 pieces", icon: "🎁", color: "#f472b6", saves: "Save 15%" },
              { name: "Party Pack", price: "$29.99", items: "30 pieces", icon: "🎉", color: "#a855f7", saves: "Save 25%", popular: true },
              { name: "Mega Bundle", price: "$49.99", items: "60 pieces", icon: "🏆", color: "#f59e0b", saves: "Save 40%" },
            ].map((pack, i) => (
              <div key={i} className="rounded-2xl p-5 text-center relative" style={{
                background: "white",
                border: pack.popular ? `2px solid ${pack.color}` : "1px solid #fce7f3",
                boxShadow: pack.popular ? `0 8px 30px ${pack.color}20` : "0 4px 15px rgba(0,0,0,0.04)",
                transform: pack.popular ? "scale(1.05)" : "none"
              }}>
                {pack.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: pack.color }}>BEST VALUE</div>}
                <span className="text-3xl">{pack.icon}</span>
                <h3 className="font-bold text-gray-800 text-sm mt-2">{pack.name}</h3>
                <div className="text-2xl font-black mt-1" style={{ color: pack.color }}>{pack.price}</div>
                <div className="text-gray-400 text-xs">{pack.items}</div>
                <div className="text-xs font-bold mt-1" style={{ color: pack.color }}>{pack.saves}</div>
                <button className="w-full mt-3 py-2 rounded-xl text-xs font-bold text-white" style={{ background: pack.color }}>Add to Cart</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // 10. Countdown Timer Banner
  {
    id: 10,
    name: "Countdown Timer",
    category: "Sale",
    render: (data) => (
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 40%, #b91c1c 100%)", minHeight: 340 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 340">
          <defs>
            <linearGradient id="ct_fire" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stopColor="#ff4500"/><stop offset="100%" stopColor="#ffd700" stopOpacity="0"/></linearGradient>
            <filter id="ct_glow"><feGaussianBlur stdDeviation="8"/></filter>
          </defs>
          {[100,250,400,550,700,850].map((x, i) => (
            <path key={i} d={`M${x},340 Q${x-10},${280-i*5} ${x+5},${240-i*3} Q${x+15},${200-i*4} ${x},${170-i*6}`} fill="url(#ct_fire)" opacity={0.08+i*0.01} filter="url(#ct_glow)">
              <animate attributeName="d" values={`M${x},340 Q${x-10},280 ${x+5},240 Q${x+15},200 ${x},170;M${x},340 Q${x-15},270 ${x+10},230 Q${x+5},190 ${x+5},160;M${x},340 Q${x-10},280 ${x+5},240 Q${x+15},200 ${x},170`} dur={`${3+Math.random()*2}s`} repeatCount="indefinite"/>
            </path>
          ))}
          {[...Array(10)].map((_, i) => <circle key={i} cx={100+Math.random()*700} cy={250+Math.random()*80} r="1.5" fill="#ffd700" opacity="0.3">
            <animate attributeName="cy" from={280+Math.random()*60} to={50+Math.random()*100} dur={`${2+Math.random()*2}s`} repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.4;0;0.4" dur={`${2+Math.random()*2}s`} repeatCount="indefinite"/>
          </circle>)}
        </svg>
        <div className="relative z-10 flex flex-col items-center justify-center text-center p-10" style={{ minHeight: 340 }}>
          <span className="text-red-300/80 text-xs tracking-widest uppercase font-bold mb-2">🔥 Flash Sale Ends In</span>
          <div className="flex gap-3 mb-4">
            {[
              { val: "02", label: "Days" },
              { val: "14", label: "Hours" },
              { val: "37", label: "Min" },
              { val: "52", label: "Sec" },
            ].map((t, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <span className="text-3xl font-black text-white">{t.val}</span>
                </div>
                <span className="text-red-200/50 text-xs mt-1 block">{t.label}</span>
              </div>
            ))}
          </div>
          <h2 className="text-3xl font-black text-white mb-2">{data.title || "Up to 70% Off Everything"}</h2>
          <p className="text-red-200/50 text-sm mb-5">{data.subtitle || "Don't miss out on our biggest sale of the year"}</p>
          <button className="px-12 py-3.5 rounded-xl text-sm font-black text-red-900" style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)", boxShadow: "0 4px 20px rgba(251,191,36,0.3)" }}>SHOP THE SALE ⚡</button>
        </div>
      </div>
    ),
  },

  // 11. Subscription Box
  {
    id: 11,
    name: "Subscription Box",
    category: "Pricing",
    render: (data) => (
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", minHeight: 400 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 400">
          <defs><pattern id="sb_grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="none" stroke="#fbbf24" strokeWidth="0.5" opacity="0.08"/></pattern></defs>
          <rect width="900" height="400" fill="url(#sb_grid)"/>
          {/* Gift box shape */}
          <g transform="translate(750, 50)" opacity="0.1"><rect x="-30" y="10" width="60" height="50" rx="4" fill="#f59e0b"/><rect x="-35" y="0" width="70" height="15" rx="3" fill="#fbbf24"/><rect x="-3" y="0" width="6" height="60" fill="#d97706"/><path d="M-30,5 Q0,-15 3,0" fill="none" stroke="#d97706" strokeWidth="3"/><path d="M30,5 Q0,-15 -3,0" fill="none" stroke="#d97706" strokeWidth="3"/></g>
        </svg>
        <div className="relative z-10 p-8">
          <div className="flex items-start justify-between">
            <div style={{ maxWidth: 400 }}>
              <span className="text-amber-600 text-xs tracking-widest uppercase font-semibold">📦 Monthly Box</span>
              <h2 className="text-3xl font-black text-amber-900 mt-2">{data.title || "Surprise Box Every Month"}</h2>
              <p className="text-amber-700/60 text-sm mt-2">Curated selection of premium products delivered to your doorstep</p>
              <div className="mt-5 space-y-2">
                {["Hand-picked premium items", "Free shipping worldwide", "Cancel anytime, no commitment", "Exclusive member discounts"].map((item, i) => (
                  <div key={i} className="flex items-center gap-2"><span className="text-amber-500 text-sm">✓</span><span className="text-amber-800 text-sm">{item}</span></div>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button className="px-8 py-3 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #d97706, #b45309)", boxShadow: "0 4px 15px rgba(217,119,6,0.3)" }}>Subscribe Now - $29/mo</button>
                <button className="px-6 py-3 rounded-xl text-sm font-medium text-amber-700 border border-amber-300">Gift a Box 🎁</button>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {["🍫 Artisan Chocolates","🧴 Skincare Essentials","📚 Bestseller Books"].map((item, i) => (
                <div key={i} className="rounded-xl px-4 py-3" style={{ background: "white", border: "1px solid #fde68a", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                  <span className="text-sm text-amber-800">{item}</span>
                </div>
              ))}
              <div className="text-center text-amber-500 text-xs font-medium">+ 3 more surprise items!</div>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // 12. App Download CTA
  {
    id: 12,
    name: "App Download CTA",
    category: "CTA",
    render: (data) => (
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #3730a3 100%)", minHeight: 360 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 360">
          <defs>
            <linearGradient id="app_shine" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="white" stopOpacity="0.03"/><stop offset="50%" stopColor="white" stopOpacity="0.08"/><stop offset="100%" stopColor="white" stopOpacity="0.03"/></linearGradient>
          </defs>
          <rect x="560" y="40" width="180" height="320" rx="24" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
          <rect x="570" y="60" width="160" height="270" rx="8" fill="url(#app_shine)"/>
          <circle cx="650" cy="355" r="12" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
          {/* Phone UI elements */}
          <rect x="585" y="80" width="130" height="20" rx="4" fill="rgba(255,255,255,0.06)"/>
          <rect x="585" y="110" width="80" height="8" rx="2" fill="rgba(255,255,255,0.04)"/>
          <rect x="585" y="130" width="130" height="60" rx="8" fill="rgba(99,102,241,0.2)"/>
          <rect x="585" y="200" width="60" height="50" rx="6" fill="rgba(255,255,255,0.04)"/>
          <rect x="655" y="200" width="60" height="50" rx="6" fill="rgba(255,255,255,0.04)"/>
          <rect x="585" y="260" width="130" height="30" rx="6" fill="rgba(99,102,241,0.3)"/>
          {/* Glow effects */}
          {[...Array(5)].map((_, i) => <circle key={i} cx={100+Math.random()*400} cy={50+Math.random()*260} r={2+Math.random()*3} fill="#818cf8" opacity={0.1+Math.random()*0.15}>
            <animate attributeName="opacity" values="0.05;0.2;0.05" dur={`${3+Math.random()*3}s`} repeatCount="indefinite"/>
          </circle>)}
        </svg>
        <div className="relative z-10 flex items-center p-10" style={{ minHeight: 360 }}>
          <div style={{ maxWidth: 420 }}>
            <span className="text-indigo-300/60 text-xs tracking-widest uppercase font-semibold">📱 Mobile App</span>
            <h2 className="text-3xl font-black text-white mt-3">{data.title || "Shop On The Go"}</h2>
            <p className="text-indigo-200/50 text-sm mt-2">Download our app for exclusive deals, faster checkout, and real-time order tracking</p>
            <div className="flex gap-3 mt-4 mb-5">
              {["🍎 App Store","▶️ Google Play"].map((store, i) => (
                <button key={i} className="px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2" style={{ background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.12)" }}>
                  {store}
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              {[{ val: "4.8★", label: "App Store" },{ val: "1M+", label: "Downloads" },{ val: "50%", label: "Faster" }].map((s, i) => (
                <div key={i}><span className="text-white font-bold text-sm">{s.val}</span><span className="text-indigo-300/40 text-xs ml-1">{s.label}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // 13. Free Trial Banner
  {
    id: 13,
    name: "Free Trial Banner",
    category: "CTA",
    render: (data) => (
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)", minHeight: 320 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 320">
          {/* Decorative arrows */}
          {[...Array(5)].map((_, i) => (
            <g key={i} transform={`translate(${100+i*180}, ${80+Math.sin(i)*60})`} opacity="0.08">
              <path d="M0,0 L30,15 L0,30 Z" fill="#059669"/>
              <animate attributeName="opacity" values="0.05;0.15;0.05" dur={`${3+i}s`} repeatCount="indefinite"/>
            </g>
          ))}
          <circle cx="800" cy="50" r="120" fill="none" stroke="#86efac" strokeWidth="1" opacity="0.15"/>
          <circle cx="800" cy="50" r="80" fill="none" stroke="#86efac" strokeWidth="0.5" opacity="0.1"/>
        </svg>
        <div className="relative z-10 flex items-center justify-between p-10" style={{ minHeight: 320 }}>
          <div style={{ maxWidth: 500 }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
              <span className="text-green-700 text-xs font-bold tracking-widest uppercase">No Credit Card Required</span>
            </div>
            <h2 className="text-4xl font-black text-green-900">{data.title || "Start Free for 14 Days"}</h2>
            <p className="text-green-700/60 text-sm mt-3 leading-relaxed">Get full access to all premium features. Set up your store in minutes and start selling today.</p>
            <div className="flex items-center gap-6 mt-6">
              <button className="px-10 py-3.5 rounded-xl text-sm font-bold text-white bg-green-600" style={{ boxShadow: "0 4px 20px rgba(5,150,105,0.3)" }}>Start Free Trial →</button>
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => <div key={i} className="w-8 h-8 rounded-full border-2 border-white" style={{ background: ["#7c3aed","#ec4899","#f97316","#3b82f6"][i] }}/>)}
                <div className="w-8 h-8 rounded-full border-2 border-white bg-green-100 flex items-center justify-center text-xs text-green-700 font-bold">+5k</div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {["✓ Unlimited products","✓ Custom domain","✓ Payment processing","✓ 24/7 support","✓ Analytics dashboard"].map((f, i) => (
              <span key={i} className="text-green-800 text-sm font-medium">{f}</span>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // 14. Loyalty Program
  {
    id: 14,
    name: "Loyalty Program",
    category: "Rewards",
    render: (data) => (
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", minHeight: 380 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 380">
          <defs>
            <linearGradient id="lp_gold" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ffd700"/><stop offset="50%" stopColor="#ffed4a"/><stop offset="100%" stopColor="#daa520"/></linearGradient>
            <filter id="lp_sparkle"><feGaussianBlur stdDeviation="2"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          {/* Star pattern */}
          {[...Array(12)].map((_, i) => {
            const x = Math.random()*900, y = Math.random()*380;
            return <g key={i} transform={`translate(${x},${y})`} opacity="0.1">
              <polygon points="0,-8 2,-2 8,-2 3,2 5,8 0,4 -5,8 -3,2 -8,-2 -2,-2" fill="url(#lp_gold)" filter="url(#lp_sparkle)">
                <animate attributeName="opacity" values="0.05;0.2;0.05" dur={`${2+Math.random()*3}s`} repeatCount="indefinite"/>
              </polygon>
            </g>;
          })}
          {/* Crown */}
          <g transform="translate(750, 80)" opacity="0.08">
            <polygon points="0,-30 10,-10 25,-25 20,0 -20,0 -25,-25 -10,-10" fill="url(#lp_gold)"/>
            <rect x="-22" y="0" width="44" height="8" rx="2" fill="url(#lp_gold)"/>
          </g>
        </svg>
        <div className="relative z-10 p-10">
          <div className="flex items-start justify-between">
            <div style={{ maxWidth: 450 }}>
              <span className="text-yellow-400/70 text-xs tracking-widest uppercase font-semibold">👑 Rewards Program</span>
              <h2 className="text-3xl font-black text-white mt-3">{data.title || "Earn While You Shop"}</h2>
              <p className="text-gray-400 text-sm mt-2">Collect points with every purchase and unlock exclusive rewards</p>
              <div className="mt-6 space-y-3">
                {[
                  { tier: "Bronze", points: "0-500", perk: "5% cashback", icon: "🥉" },
                  { tier: "Silver", points: "500-2000", perk: "10% cashback + Free shipping", icon: "🥈" },
                  { tier: "Gold", points: "2000+", perk: "20% cashback + VIP access", icon: "🥇" },
                ].map((t, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-xl">{t.icon}</span>
                    <div className="flex-1">
                      <div className="flex justify-between"><span className="text-white text-sm font-bold">{t.tier}</span><span className="text-gray-500 text-xs">{t.points} pts</span></div>
                      <span className="text-yellow-400/70 text-xs">{t.perk}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-6 px-8 py-3 rounded-xl text-sm font-bold" style={{ background: "linear-gradient(135deg, #fbbf24, #d97706)", color: "#1a1a2e" }}>Join Rewards Club →</button>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // 15. Shipping & Delivery
  {
    id: 15,
    name: "Shipping & Delivery",
    category: "Trust",
    render: (data) => (
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)", minHeight: 300 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 300">
          {/* Road/path */}
          <path d="M0,200 Q150,180 300,200 T600,190 T900,200" fill="none" stroke="#93c5fd" strokeWidth="3" strokeDasharray="12 8" opacity="0.3">
            <animate attributeName="stroke-dashoffset" from="0" to="-40" dur="2s" repeatCount="indefinite"/>
          </path>
          {/* Truck */}
          <g transform="translate(200, 160)" opacity="0.15">
            <rect x="0" y="0" width="70" height="35" rx="3" fill="#2563eb"/>
            <rect x="70" y="10" width="28" height="25" rx="3" fill="#3b82f6"/>
            <circle cx="18" cy="40" r="8" fill="#1d4ed8"/><circle cx="55" cy="40" r="8" fill="#1d4ed8"/><circle cx="85" cy="40" r="8" fill="#1d4ed8"/>
          </g>
          {/* Package */}
          <g transform="translate(650, 100)" opacity="0.1">
            <rect x="-20" y="-15" width="40" height="30" rx="3" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1"/>
            <line x1="0" y1="-15" x2="0" y2="15" stroke="#1d4ed8" strokeWidth="0.5"/>
            <line x1="-20" y1="0" x2="20" y2="0" stroke="#1d4ed8" strokeWidth="0.5"/>
          </g>
        </svg>
        <div className="relative z-10 p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-blue-900">{data.title || "Fast & Free Shipping"}</h2>
            <p className="text-blue-600/50 text-sm mt-1">We deliver happiness to your doorstep</p>
          </div>
          <div className="flex justify-center gap-6">
            {[
              { icon: "🚚", title: "Free Shipping", desc: "On orders over $50", color: "#2563eb" },
              { icon: "⚡", title: "Express Delivery", desc: "Next-day available", color: "#7c3aed" },
              { icon: "🌍", title: "Global Reach", desc: "Ship to 150+ countries", color: "#059669" },
              { icon: "↩️", title: "Easy Returns", desc: "30-day free returns", color: "#dc2626" },
            ].map((f, i) => (
              <div key={i} className="text-center rounded-2xl p-4 w-40" style={{ background: "white", boxShadow: "0 4px 15px rgba(37,99,235,0.06)", border: "1px solid #dbeafe" }}>
                <span className="text-2xl">{f.icon}</span>
                <h3 className="text-gray-800 font-bold text-sm mt-2">{f.title}</h3>
                <p className="text-gray-400 text-xs mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // 16. Newsletter Signup
  {
    id: 16,
    name: "Newsletter Signup",
    category: "CTA",
    render: (data) => (
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", minHeight: 280 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 280">
          {/* Mail/envelope pattern */}
          {[...Array(6)].map((_, i) => (
            <g key={i} transform={`translate(${80+i*150}, ${40+Math.sin(i*1.5)*60})`} opacity="0.04">
              <rect x="-20" y="-14" width="40" height="28" rx="3" fill="white"/>
              <path d="M-20,-14 L0,6 L20,-14" fill="none" stroke="white" strokeWidth="1"/>
            </g>
          ))}
          <rect x="0" y="270" width="900" height="10" fill="url(#tp_grad)" opacity="0.3"/>
        </svg>
        <div className="relative z-10 flex items-center justify-between p-10" style={{ minHeight: 280 }}>
          <div style={{ maxWidth: 400 }}>
            <span className="text-purple-400/60 text-xs tracking-widest uppercase font-semibold">✉️ Stay Updated</span>
            <h2 className="text-2xl font-black text-white mt-2">{data.title || "Get 15% Off Your First Order"}</h2>
            <p className="text-gray-400 text-sm mt-2">Subscribe for exclusive deals, new arrivals, and sweet surprises</p>
          </div>
          <div className="flex-shrink-0">
            <div className="flex gap-2 mb-3">
              <div className="rounded-xl px-4 py-3 w-64" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span className="text-gray-500 text-sm">Enter your email...</span>
              </div>
              <button className="px-6 py-3 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}>Subscribe</button>
            </div>
            <p className="text-gray-600 text-xs">🔒 No spam. Unsubscribe anytime. Join 25,000+ subscribers.</p>
          </div>
        </div>
      </div>
    ),
  },

  // 17. Seasonal Collection
  {
    id: 17,
    name: "Seasonal Collection",
    category: "Hero",
    render: (data) => (
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #fef7cd 0%, #fde68a 30%, #fbbf24 60%, #f59e0b 100%)", minHeight: 380 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 380">
          {/* Sun rays */}
          <g transform="translate(750, 80)">
            {[...Array(12)].map((_, i) => <line key={i} x1="0" y1="0" x2={Math.cos(i*30*Math.PI/180)*250} y2={Math.sin(i*30*Math.PI/180)*250} stroke="#f59e0b" strokeWidth="1.5" opacity="0.08"/>)}
            <circle r="50" fill="#fbbf24" opacity="0.2"/>
            <circle r="30" fill="#fde68a" opacity="0.15"/>
          </g>
          {/* Leaves */}
          {[{x:60,y:80},{x:180,y:300},{x:420,y:50},{x:550,y:320}].map((l,i) => (
            <g key={i} transform={`translate(${l.x},${l.y}) rotate(${i*45-30})`} opacity="0.12">
              <path d="M0,0 Q15,-25 0,-50 Q-15,-25 0,0" fill={["#f59e0b","#d97706","#b45309","#92400e"][i]}/>
            </g>
          ))}
        </svg>
        <div className="relative z-10 p-10" style={{ minHeight: 380 }}>
          <span className="text-amber-800/60 text-xs tracking-widest uppercase font-semibold">☀️ Summer 2025</span>
          <h2 className="text-4xl font-black text-amber-900 mt-3" style={{ maxWidth: 450 }}>{data.title || "Hot Season Collection"}</h2>
          <p className="text-amber-700/60 text-sm mt-2 max-w-md">{data.subtitle || "Fresh styles, bold colors, and everything you need for sunny days"}</p>
          <div className="flex gap-3 mt-6">
            {["👗 Dresses","👕 Tees","🩳 Shorts","🕶️ Accessories"].map((cat, i) => (
              <button key={i} className="px-4 py-2 rounded-full text-xs font-bold" style={{ background: "rgba(255,255,255,0.4)", color: "#92400e", border: "1px solid rgba(146,64,14,0.15)" }}>{cat}</button>
            ))}
          </div>
          <button className="mt-6 px-10 py-3.5 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #92400e, #78350f)", boxShadow: "0 4px 20px rgba(146,64,14,0.3)" }}>Shop Collection →</button>
        </div>
      </div>
    ),
  },

  // 18. Referral Program
  {
    id: 18,
    name: "Referral Program",
    category: "Rewards",
    render: (data) => (
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #ede9fe 100%)", minHeight: 340 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 340">
          {/* Connection lines */}
          {[[200,170,400,100],[400,100,600,170],[400,100,400,250],[200,170,350,250],[600,170,500,250]].map(([x1,y1,x2,y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c084fc" strokeWidth="1" opacity="0.1" strokeDasharray="5 5"/>
          ))}
          {/* People nodes */}
          {[[400,100],[200,170],[600,170],[350,250],[500,250]].map(([cx,cy], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r={i===0?16:12} fill={i===0?"#8b5cf6":"#c084fc"} opacity={i===0?0.15:0.1}/>
              <circle cx={cx} cy={cy} r={i===0?6:4} fill={i===0?"#8b5cf6":"#a855f7"} opacity="0.2"/>
            </g>
          ))}
        </svg>
        <div className="relative z-10 p-10 text-center" style={{ minHeight: 340 }}>
          <span className="text-purple-500 text-xs tracking-widest uppercase font-semibold">🤝 Refer & Earn</span>
          <h2 className="text-3xl font-black text-purple-900 mt-3">{data.title || "Give $20, Get $20"}</h2>
          <p className="text-purple-500/60 text-sm mt-2 max-w-md mx-auto">Share the love! When your friend makes their first purchase, you both get $20 credit</p>
          <div className="flex justify-center gap-8 mt-6 mb-6">
            {[
              { step: "1", title: "Share Link", desc: "Send your unique code" },
              { step: "2", title: "Friend Shops", desc: "They get $20 off" },
              { step: "3", title: "You Earn", desc: "Get $20 credit" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-black text-white" style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)" }}>{s.step}</div>
                <h4 className="text-purple-900 font-bold text-sm">{s.title}</h4>
                <p className="text-purple-400 text-xs">{s.desc}</p>
              </div>
            ))}
          </div>
          <button className="px-10 py-3 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", boxShadow: "0 4px 20px rgba(139,92,246,0.3)" }}>Get Your Referral Link</button>
        </div>
      </div>
    ),
  },

  // 19. Candy Mega Sale
  {
    id: 19,
    name: "Candy Mega Sale",
    category: "Candy",
    render: (data) => (
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #ec4899 0%, #f43f5e 30%, #f97316 60%, #eab308 100%)", minHeight: 380 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 380">
          {/* Confetti */}
          {[...Array(50)].map((_, i) => {
            const x=Math.random()*900, y=Math.random()*380;
            const colors=["white","#fef3c7","#fce7f3","#dbeafe","#d1fae5"];
            const isRect = Math.random() > 0.5;
            return isRect ?
              <rect key={i} x={x} y={y} width={4+Math.random()*6} height={3+Math.random()*4} rx="1" fill={colors[i%5]} opacity={0.15+Math.random()*0.15} transform={`rotate(${Math.random()*360} ${x} ${y})`}/> :
              <circle key={i} cx={x} cy={y} r={2+Math.random()*3} fill={colors[i%5]} opacity={0.1+Math.random()*0.15}/>;
          })}
          {/* Big shapes */}
          <circle cx="150" cy="80" r="60" fill="white" opacity="0.05"/>
          <circle cx="750" cy="300" r="80" fill="white" opacity="0.05"/>
        </svg>
        <div className="relative z-10 flex flex-col items-center justify-center text-center p-10" style={{ minHeight: 380 }}>
          <div className="px-5 py-1.5 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)" }}>
            <span className="text-white text-sm font-black">🍬 CANDY MEGA SALE 🍭</span>
          </div>
          <h2 className="text-6xl font-black text-white" style={{ textShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>{data.title || "50% OFF"}</h2>
          <p className="text-white/80 text-lg font-bold mt-2">{data.subtitle || "On All Sweet Treats"}</p>
          <p className="text-white/50 text-sm mt-1">Use code: SWEET50 at checkout</p>
          <div className="flex gap-3 mt-6">
            <button className="px-10 py-3.5 rounded-xl text-sm font-black bg-white text-pink-600" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>Shop Candy 🍬</button>
            <button className="px-8 py-3.5 rounded-xl text-sm font-bold text-white border-2 border-white/30">View All Deals</button>
          </div>
        </div>
      </div>
    ),
  },

  // 20. Product Categories Grid
  {
    id: 20,
    name: "Categories Grid",
    category: "Features",
    render: (data) => (
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ background: "#fafafa", minHeight: 420 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 420">
          <defs><pattern id="cg_dots" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="15" cy="15" r="1" fill="#e5e7eb"/></pattern></defs>
          <rect width="900" height="420" fill="url(#cg_dots)"/>
        </svg>
        <div className="relative z-10 p-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-black text-gray-900">{data.title || "Shop By Category"}</h2>
            <p className="text-gray-400 text-sm mt-1">Find exactly what you're looking for</p>
          </div>
          <div className="grid grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { icon: "🍫", name: "Chocolate", count: "240+", bg: "linear-gradient(135deg, #78350f, #92400e)" },
              { icon: "🍭", name: "Lollipops", count: "180+", bg: "linear-gradient(135deg, #9333ea, #7c3aed)" },
              { icon: "🍬", name: "Hard Candy", count: "320+", bg: "linear-gradient(135deg, #dc2626, #ef4444)" },
              { icon: "🧁", name: "Baked", count: "150+", bg: "linear-gradient(135deg, #ea580c, #f97316)" },
              { icon: "🍪", name: "Cookies", count: "200+", bg: "linear-gradient(135deg, #ca8a04, #eab308)" },
              { icon: "🍩", name: "Donuts", count: "90+", bg: "linear-gradient(135deg, #db2777, #ec4899)" },
              { icon: "🎂", name: "Cakes", count: "75+", bg: "linear-gradient(135deg, #059669, #10b981)" },
              { icon: "🍦", name: "Ice Cream", count: "130+", bg: "linear-gradient(135deg, #2563eb, #3b82f6)" },
            ].map((cat, i) => (
              <div key={i} className="rounded-2xl p-5 text-center cursor-pointer transition-all" style={{ background: cat.bg, boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}>
                <span className="text-3xl">{cat.icon}</span>
                <h3 className="text-white font-bold text-sm mt-2">{cat.name}</h3>
                <span className="text-white/50 text-xs">{cat.count} items</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
];

const categories = ["All", ...new Set(featurePackThemes.map(t => t.category))];

export default function FeaturePackGallery() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTheme, setSelectedTheme] = useState(null);

  const filtered = featurePackThemes.filter(t => {
    const matchCat = selectedCategory === "All" || t.category === selectedCategory;
    const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  const categoryIcons = { "All":"🎯","Hero":"🚀","Pricing":"💰","Features":"⚙️","Trust":"🛡️","Sale":"🔥","CTA":"📣","Candy":"🍬","Rewards":"🏆" };

  return (
    <div className="min-h-screen" style={{ background: "#06060a", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="sticky top-0 z-50" style={{ background: "rgba(6,6,10,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                🛍️ Feature Pack Themes
                <span className="text-xs px-2 py-0.5 rounded-full font-normal" style={{ background: "rgba(236,72,153,0.15)", color: "#f9a8d4", border: "1px solid rgba(236,72,153,0.2)" }}>{featurePackThemes.length} themes</span>
              </h1>
              <p className="text-gray-600 text-xs mt-0.5">E-commerce landing page banners & feature packs</p>
            </div>
            <input type="text" placeholder="Search themes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="text-sm rounded-lg px-4 py-2 w-44 outline-none" style={{ background: "rgba(255,255,255,0.04)", color: "white", border: "1px solid rgba(255,255,255,0.06)" }}/>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className="px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                style={{ background: selectedCategory === cat ? "rgba(236,72,153,0.2)" : "rgba(255,255,255,0.02)", color: selectedCategory === cat ? "#f9a8d4" : "#555", border: `1px solid ${selectedCategory === cat ? "rgba(236,72,153,0.3)" : "rgba(255,255,255,0.04)"}` }}>
                {categoryIcons[cat] || "✦"} {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Themes */}
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-8">
        {filtered.map(theme => (
          <div key={theme.id} onClick={() => setSelectedTheme(selectedTheme === theme.id ? null : theme.id)}>
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-pink-400/50 text-xs font-mono">#{String(theme.id).padStart(2,'0')}</span>
                <span className="text-gray-300 text-sm font-medium">{theme.name}</span>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.03)", color: "#666" }}>{theme.category}</span>
            </div>
            <div className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-300" style={{
              border: selectedTheme === theme.id ? "2px solid rgba(236,72,153,0.4)" : "2px solid rgba(255,255,255,0.03)",
              boxShadow: selectedTheme === theme.id ? "0 0 40px rgba(236,72,153,0.1)" : "none"
            }}>
              {theme.render({})}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-20"><p className="text-gray-600 text-sm">No themes match your search</p></div>}
      </div>
    </div>
  );
}
