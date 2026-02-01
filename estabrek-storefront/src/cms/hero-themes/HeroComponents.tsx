"use client";
import React from 'react';

// ═══════════════════════════════════════════════════════════════
// ADDITIONAL HERO COMPONENTS FOR ALL 100 THEMES
// ═══════════════════════════════════════════════════════════════

interface HeroTemplateProps {
  badge?: string;
  headline: string;
  subheadline?: string;
  description?: string;
  primaryCta?: { text: string; onClick?: () => void };
  secondaryCta?: { text: string; onClick?: () => void };
  imageSrc?: string;
  imageAlt?: string;
  features?: string[];
  stats?: { value: string; label: string }[];
  className?: string;
  children?: React.ReactNode;
}

// ═══════════════════════════════════════════════════════════════
// BASIC HEROES (1-12)
// ═══════════════════════════════════════════════════════════════

// 1. Basic Centered
export const Hero1: React.FC<HeroTemplateProps> = (props) => (
  <section className={`py-20 px-4 bg-white ${props.className || ''}`}>
    <div className="max-w-4xl mx-auto text-center">
      {props.badge && <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-blue-100 text-blue-700 rounded-full">{props.badge}</span>}
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">{props.headline}</h1>
      {props.description && <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">{props.description}</p>}
      <div className="flex flex-wrap justify-center gap-4">
        {props.primaryCta && <button onClick={props.primaryCta.onClick} className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">{props.primaryCta.text}</button>}
        {props.secondaryCta && <button onClick={props.secondaryCta.onClick} className="px-8 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">{props.secondaryCta.text}</button>}
      </div>
    </div>
  </section>
);

// 2. Basic Left Aligned
export const Hero2: React.FC<HeroTemplateProps> = (props) => (
  <section className={`py-20 px-4 bg-white ${props.className || ''}`}>
    <div className="max-w-7xl mx-auto">
      <div className="max-w-2xl">
        {props.badge && <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-gray-100 text-gray-700 rounded-full">{props.badge}</span>}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">{props.headline}</h1>
        {props.description && <p className="text-lg text-gray-600 mb-8">{props.description}</p>}
        <div className="flex flex-wrap gap-4">
          {props.primaryCta && <button onClick={props.primaryCta.onClick} className="px-8 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors">{props.primaryCta.text}</button>}
          {props.secondaryCta && <button onClick={props.secondaryCta.onClick} className="px-8 py-3 text-gray-700 font-medium hover:text-gray-900 transition-colors">{props.secondaryCta.text} →</button>}
        </div>
      </div>
    </div>
  </section>
);

// 3. Basic Split
export const Hero3: React.FC<HeroTemplateProps> = (props) => (
  <section className={`py-20 px-4 bg-white ${props.className || ''}`}>
    <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div>
        {props.badge && <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-blue-100 text-blue-700 rounded-full">{props.badge}</span>}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">{props.headline}</h1>
        {props.description && <p className="text-lg text-gray-600 mb-8">{props.description}</p>}
        <div className="flex flex-wrap gap-4">
          {props.primaryCta && <button onClick={props.primaryCta.onClick} className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">{props.primaryCta.text}</button>}
          {props.secondaryCta && <button onClick={props.secondaryCta.onClick} className="px-8 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">{props.secondaryCta.text}</button>}
        </div>
      </div>
      <div className="relative">
        {props.imageSrc ? <img src={props.imageSrc} alt={props.imageAlt || ''} className="w-full rounded-2xl shadow-2xl" loading="eager" decoding="async" /> : <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center"><span className="text-gray-400">Image</span></div>}
      </div>
    </div>
  </section>
);

// 4. Basic Minimal
export const Hero4: React.FC<HeroTemplateProps> = (props) => (
  <section className={`py-32 px-4 bg-white ${props.className || ''}`}>
    <div className="max-w-3xl mx-auto text-center">
      <h1 className="text-5xl md:text-6xl lg:text-7xl font-light text-gray-900 mb-8 leading-tight">{props.headline}</h1>
      {props.description && <p className="text-xl text-gray-500 mb-12">{props.description}</p>}
      {props.primaryCta && <button onClick={props.primaryCta.onClick} className="px-10 py-4 text-gray-900 font-medium border-b-2 border-gray-900 hover:bg-gray-100 transition-colors">{props.primaryCta.text}</button>}
    </div>
  </section>
);

// 5. Basic Dark
export const Hero5: React.FC<HeroTemplateProps> = (props) => (
  <section className={`py-20 px-4 bg-gray-900 ${props.className || ''}`}>
    <div className="max-w-4xl mx-auto text-center">
      {props.badge && <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-white/10 text-white rounded-full">{props.badge}</span>}
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">{props.headline}</h1>
      {props.description && <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">{props.description}</p>}
      <div className="flex flex-wrap justify-center gap-4">
        {props.primaryCta && <button onClick={props.primaryCta.onClick} className="px-8 py-3 bg-white text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-colors">{props.primaryCta.text}</button>}
        {props.secondaryCta && <button onClick={props.secondaryCta.onClick} className="px-8 py-3 border border-gray-600 text-white font-medium rounded-lg hover:bg-white/5 transition-colors">{props.secondaryCta.text}</button>}
      </div>
    </div>
  </section>
);

// 6. Basic Gradient
export const Hero6: React.FC<HeroTemplateProps> = (props) => (
  <section className={`py-24 px-4 bg-gradient-to-r from-blue-600 to-purple-600 ${props.className || ''}`}>
    <div className="max-w-4xl mx-auto text-center text-white">
      {props.badge && <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-white/20 rounded-full">{props.badge}</span>}
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">{props.headline}</h1>
      {props.description && <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">{props.description}</p>}
      <div className="flex flex-wrap justify-center gap-4">
        {props.primaryCta && <button onClick={props.primaryCta.onClick} className="px-8 py-3 bg-white text-purple-700 font-medium rounded-lg hover:bg-purple-50 transition-colors">{props.primaryCta.text}</button>}
        {props.secondaryCta && <button onClick={props.secondaryCta.onClick} className="px-8 py-3 border border-white/30 text-white font-medium rounded-lg hover:bg-white/10 transition-colors">{props.secondaryCta.text}</button>}
      </div>
    </div>
  </section>
);

// 7. Basic Fullscreen
export const Hero7: React.FC<HeroTemplateProps> = (props) => (
  <section className={`min-h-screen flex items-center justify-center px-4 bg-gray-50 ${props.className || ''}`}>
    <div className="max-w-4xl mx-auto text-center">
      <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-8">{props.headline}</h1>
      {props.description && <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">{props.description}</p>}
      <div className="flex flex-wrap justify-center gap-4">
        {props.primaryCta && <button onClick={props.primaryCta.onClick} className="px-10 py-4 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-colors">{props.primaryCta.text}</button>}
        {props.secondaryCta && <button onClick={props.secondaryCta.onClick} className="px-10 py-4 border-2 border-gray-300 text-gray-700 font-medium rounded-xl hover:border-gray-400 transition-colors">{props.secondaryCta.text}</button>}
      </div>
    </div>
  </section>
);

// 8-12: More Basic Variants
export const Hero8: React.FC<HeroTemplateProps> = (props) => (
  <section className={`py-20 px-4 bg-gray-100 ${props.className || ''}`}>
    <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
      <div className="order-2 md:order-1">
        {props.imageSrc ? <img src={props.imageSrc} alt={props.imageAlt || ''} className="w-full rounded-3xl" loading="eager" decoding="async" /> : <div className="aspect-square bg-gradient-to-br from-blue-200 to-purple-200 rounded-3xl"></div>}
      </div>
      <div className="order-1 md:order-2">
        {props.badge && <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-blue-600 text-white rounded-full">{props.badge}</span>}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">{props.headline}</h1>
        {props.description && <p className="text-lg text-gray-600 mb-8">{props.description}</p>}
        {props.primaryCta && <button onClick={props.primaryCta.onClick} className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">{props.primaryCta.text}</button>}
      </div>
    </div>
  </section>
);

export const Hero9: React.FC<HeroTemplateProps> = (props) => (
  <section className={`py-20 px-4 bg-white ${props.className || ''}`}>
    <div className="max-w-4xl mx-auto text-center">
      <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">{props.headline}</h1>
      {props.description && <p className="text-lg text-gray-600 mb-12">{props.description}</p>}
      {props.stats && props.stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {props.stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl font-bold text-blue-600">{stat.value}</div>
              <div className="text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      )}
      {props.primaryCta && <button onClick={props.primaryCta.onClick} className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg">{props.primaryCta.text}</button>}
    </div>
  </section>
);

export const Hero10: React.FC<HeroTemplateProps> = (props) => (
  <section className={`py-20 px-4 bg-white ${props.className || ''}`}>
    <div className="max-w-4xl mx-auto text-center">
      <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">{props.headline}</h1>
      {props.description && <p className="text-lg text-gray-600 mb-8">{props.description}</p>}
      {props.features && (
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {props.features.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-gray-700">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {f}
            </span>
          ))}
        </div>
      )}
      {props.primaryCta && <button onClick={props.primaryCta.onClick} className="px-8 py-3 bg-gray-900 text-white font-medium rounded-lg">{props.primaryCta.text}</button>}
    </div>
  </section>
);

// ═══════════════════════════════════════════════════════════════
// TECH HEROES (13-24)
// ═══════════════════════════════════════════════════════════════

export const Hero13: React.FC<HeroTemplateProps> = (props) => (
  <section className={`py-24 px-4 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 ${props.className || ''}`}>
    <div className="max-w-4xl mx-auto text-center text-white">
      {props.badge && <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-white/20 backdrop-blur-sm rounded-full">{props.badge}</span>}
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">{props.headline}</h1>
      {props.description && <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">{props.description}</p>}
      <div className="flex flex-wrap justify-center gap-4">
        {props.primaryCta && <button onClick={props.primaryCta.onClick} className="px-8 py-3 bg-white text-purple-700 font-medium rounded-lg">{props.primaryCta.text}</button>}
        {props.secondaryCta && <button onClick={props.secondaryCta.onClick} className="px-8 py-3 border border-white/30 text-white font-medium rounded-lg">{props.secondaryCta.text}</button>}
      </div>
    </div>
  </section>
);

export const Hero14: React.FC<HeroTemplateProps> = (props) => (
  <section className={`relative py-24 px-4 bg-slate-950 overflow-hidden ${props.className || ''}`}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(34,211,238,0.1),transparent_50%)]"></div>
    <div className="relative max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div>
        {props.badge && <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">{props.badge}</span>}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">{props.headline}</h1>
        {props.description && <p className="text-lg text-gray-400 mb-8">{props.description}</p>}
        {props.primaryCta && <button onClick={props.primaryCta.onClick} className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-lg">{props.primaryCta.text}</button>}
      </div>
      <div className="relative">
        <div className="aspect-video bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl border border-cyan-500/20 flex items-center justify-center">
          <span className="text-cyan-500">AI Visualization</span>
        </div>
      </div>
    </div>
  </section>
);

export const Hero15: React.FC<HeroTemplateProps> = (props) => (
  <section className={`py-20 px-4 bg-gray-950 ${props.className || ''}`}>
    <div className="max-w-7xl mx-auto">
      <div className="bg-gray-900 rounded-2xl p-8 md:p-12 border border-gray-800">
        <div className="flex items-center gap-2 mb-6 text-gray-400 font-mono text-sm">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          <span className="ml-4">developer@api ~ %</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-mono text-white mb-4">{props.headline}</h1>
        {props.description && <p className="text-gray-400 font-mono mb-8">{props.description}</p>}
        {props.primaryCta && <button onClick={props.primaryCta.onClick} className="px-6 py-2 bg-green-500 text-black font-mono font-medium rounded">{props.primaryCta.text}</button>}
      </div>
    </div>
  </section>
);

// ═══════════════════════════════════════════════════════════════
// GAMING HEROES (37-46)
// ═══════════════════════════════════════════════════════════════

export const Hero37: React.FC<HeroTemplateProps> = (props) => (
  <section className={`relative min-h-screen flex items-center px-4 bg-gray-950 overflow-hidden ${props.className || ''}`}>
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl"></div>
    <div className="relative max-w-4xl mx-auto text-center">
      {props.badge && <span className="inline-block px-6 py-2 mb-8 text-sm font-bold bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-full">{props.badge}</span>}
      <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 mb-6">{props.headline}</h1>
      {props.description && <p className="text-xl text-gray-400 mb-10">{props.description}</p>}
      {props.primaryCta && <button onClick={props.primaryCta.onClick} className="px-10 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold rounded-lg hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] transition-all">{props.primaryCta.text}</button>}
    </div>
  </section>
);

export const Hero38: React.FC<HeroTemplateProps> = (props) => (
  <section className={`py-20 px-4 bg-black ${props.className || ''}`}>
    <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div>
        {props.badge && <span className="inline-block px-4 py-1 mb-6 text-xs font-bold bg-red-600 text-white uppercase tracking-wider">{props.badge}</span>}
        <h1 className="text-4xl md:text-6xl font-black text-white uppercase mb-6">{props.headline}</h1>
        {props.description && <p className="text-gray-400 mb-8">{props.description}</p>}
        <div className="flex gap-4">
          {props.primaryCta && <button onClick={props.primaryCta.onClick} className="px-8 py-3 bg-red-600 text-white font-bold uppercase">{props.primaryCta.text}</button>}
          {props.secondaryCta && <button onClick={props.secondaryCta.onClick} className="px-8 py-3 border border-red-600 text-red-500 font-bold uppercase">{props.secondaryCta.text}</button>}
        </div>
      </div>
      <div className="relative aspect-video bg-gradient-to-br from-red-900/30 to-black rounded-xl border border-red-900/50 flex items-center justify-center">
        <span className="text-red-500">LIVE</span>
      </div>
    </div>
  </section>
);

// ═══════════════════════════════════════════════════════════════
// E-COMMERCE HEROES (25-36)
// ═══════════════════════════════════════════════════════════════

export const Hero25: React.FC<HeroTemplateProps> = (props) => (
  <section className={`py-20 px-4 bg-gray-50 ${props.className || ''}`}>
    <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div>
        {props.badge && <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-pink-100 text-pink-700 rounded-full">{props.badge}</span>}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">{props.headline}</h1>
        {props.description && <p className="text-lg text-gray-600 mb-8">{props.description}</p>}
        {props.primaryCta && <button onClick={props.primaryCta.onClick} className="px-8 py-3 bg-black text-white font-medium rounded-full hover:bg-gray-800">{props.primaryCta.text}</button>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="aspect-square bg-pink-100 rounded-2xl"></div>
        <div className="aspect-square bg-purple-100 rounded-2xl mt-8"></div>
      </div>
    </div>
  </section>
);

export const Hero26: React.FC<HeroTemplateProps> = (props) => (
  <section className={`relative min-h-screen flex items-center ${props.className || ''}`}>
    <div className="absolute inset-0 bg-black">
      {props.imageSrc ? <img src={props.imageSrc} alt="" className="w-full h-full object-cover opacity-60" loading="eager" decoding="async" /> : <div className="w-full h-full bg-gradient-to-br from-gray-800 to-black"></div>}
    </div>
    <div className="relative z-10 max-w-4xl mx-auto px-4 text-center text-white">
      {props.badge && <span className="inline-block px-6 py-2 mb-8 text-sm tracking-[0.3em] uppercase border border-white/30">{props.badge}</span>}
      <h1 className="text-5xl md:text-7xl font-light tracking-[0.2em] uppercase mb-6">{props.headline}</h1>
      {props.subheadline && <p className="text-xl tracking-wider text-gray-300 mb-12">{props.subheadline}</p>}
      {props.primaryCta && <button onClick={props.primaryCta.onClick} className="px-12 py-4 bg-white text-black tracking-widest uppercase hover:bg-gray-100">{props.primaryCta.text}</button>}
    </div>
  </section>
);

export const Hero27: React.FC<HeroTemplateProps> = (props) => (
  <section className={`py-16 px-4 bg-white ${props.className || ''}`}>
    <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8 items-center">
      <div>
        <h1 className="text-3xl md:text-4xl font-light text-gray-900 mb-4">{props.headline}</h1>
        {props.description && <p className="text-gray-500 mb-6">{props.description}</p>}
        {props.primaryCta && <button onClick={props.primaryCta.onClick} className="text-gray-900 font-medium underline underline-offset-4">{props.primaryCta.text} →</button>}
      </div>
      <div className="aspect-[4/3] bg-gray-100 rounded-lg"></div>
    </div>
  </section>
);

// ═══════════════════════════════════════════════════════════════
// CORPORATE HEROES (47-58)
// ═══════════════════════════════════════════════════════════════

export const Hero47: React.FC<HeroTemplateProps> = (props) => (
  <section className={`py-20 px-4 bg-slate-50 ${props.className || ''}`}>
    <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div>
        {props.badge && <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-blue-600 text-white rounded">{props.badge}</span>}
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">{props.headline}</h1>
        {props.description && <p className="text-lg text-slate-600 mb-8">{props.description}</p>}
        <div className="flex gap-4">
          {props.primaryCta && <button onClick={props.primaryCta.onClick} className="px-8 py-3 bg-blue-600 text-white font-medium rounded">{props.primaryCta.text}</button>}
          {props.secondaryCta && <button onClick={props.secondaryCta.onClick} className="px-8 py-3 border-2 border-slate-300 text-slate-700 font-medium rounded">{props.secondaryCta.text}</button>}
        </div>
        {props.stats && (
          <div className="grid grid-cols-3 gap-8 pt-10 mt-10 border-t border-slate-200">
            {props.stats.map((s, i) => (
              <div key={i}>
                <div className="text-3xl font-bold text-blue-600">{s.value}</div>
                <div className="text-sm text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="aspect-[4/3] bg-gradient-to-br from-blue-100 to-slate-100 rounded-lg"></div>
    </div>
  </section>
);

export const Hero48: React.FC<HeroTemplateProps> = (props) => (
  <section className={`py-20 px-4 bg-white ${props.className || ''}`}>
    <div className="max-w-7xl mx-auto">
      <div className="max-w-3xl">
        {props.badge && <span className="text-blue-600 font-medium mb-4 block">{props.badge}</span>}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">{props.headline}</h1>
        {props.description && <p className="text-xl text-gray-600 mb-8">{props.description}</p>}
        <div className="flex gap-4">
          {props.primaryCta && <button onClick={props.primaryCta.onClick} className="px-8 py-3 bg-gray-900 text-white font-medium rounded-lg">{props.primaryCta.text}</button>}
          {props.secondaryCta && <button onClick={props.secondaryCta.onClick} className="px-8 py-3 text-gray-600 font-medium">{props.secondaryCta.text}</button>}
        </div>
      </div>
    </div>
  </section>
);

// ═══════════════════════════════════════════════════════════════
// CREATIVE HEROES (59-70)
// ═══════════════════════════════════════════════════════════════

export const Hero59: React.FC<HeroTemplateProps> = (props) => (
  <section className={`relative py-32 px-4 bg-black overflow-hidden ${props.className || ''}`}>
    <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-3xl opacity-30"></div>
    <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full blur-3xl opacity-30"></div>
    <div className="relative max-w-6xl mx-auto text-center">
      <h1 className="text-6xl md:text-8xl font-black text-white mb-8">{props.headline}</h1>
      {props.description && <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">{props.description}</p>}
      {props.primaryCta && <button onClick={props.primaryCta.onClick} className="group px-8 py-4 bg-white text-black font-bold rounded-full inline-flex items-center gap-2">{props.primaryCta.text} <span className="group-hover:translate-x-1 transition-transform">→</span></button>}
    </div>
  </section>
);

export const Hero60: React.FC<HeroTemplateProps> = (props) => (
  <section className={`min-h-screen flex items-center px-4 bg-white ${props.className || ''}`}>
    <div className="max-w-7xl mx-auto w-full">
      <h1 className="text-[15vw] font-black text-gray-900 leading-none">{props.headline}</h1>
      {props.description && <p className="text-xl text-gray-600 mt-8 max-w-xl">{props.description}</p>}
      {props.primaryCta && <button onClick={props.primaryCta.onClick} className="mt-8 px-8 py-3 bg-black text-white font-medium rounded-full">{props.primaryCta.text}</button>}
    </div>
  </section>
);

// ═══════════════════════════════════════════════════════════════
// FOOD HEROES (71-80)
// ═══════════════════════════════════════════════════════════════

export const Hero71: React.FC<HeroTemplateProps> = (props) => (
  <section className={`relative min-h-[80vh] flex items-center ${props.className || ''}`}>
    <div className="absolute inset-0">
      {props.imageSrc ? <img src={props.imageSrc} alt="" className="w-full h-full object-cover" loading="eager" decoding="async" /> : <div className="w-full h-full bg-gradient-to-br from-amber-900 to-orange-900"></div>}
      <div className="absolute inset-0 bg-black/50"></div>
    </div>
    <div className="relative z-10 max-w-4xl mx-auto px-4 text-center text-white">
      {props.badge && <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium border border-amber-400 text-amber-400 rounded-full">{props.badge}</span>}
      <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6">{props.headline}</h1>
      {props.description && <p className="text-xl text-gray-300 mb-10">{props.description}</p>}
      <div className="flex flex-wrap justify-center gap-4">
        {props.primaryCta && <button onClick={props.primaryCta.onClick} className="px-8 py-3 bg-amber-500 text-white font-medium rounded-full">{props.primaryCta.text}</button>}
        {props.secondaryCta && <button onClick={props.secondaryCta.onClick} className="px-8 py-3 border border-white text-white font-medium rounded-full">{props.secondaryCta.text}</button>}
      </div>
    </div>
  </section>
);

// ═══════════════════════════════════════════════════════════════
// FITNESS HEROES (81-88)
// ═══════════════════════════════════════════════════════════════

export const Hero81: React.FC<HeroTemplateProps> = (props) => (
  <section className={`relative min-h-screen flex items-center ${props.className || ''}`}>
    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent z-10"></div>
    <div className="absolute inset-0 bg-gray-900">
      {props.imageSrc && <img src={props.imageSrc} alt="" className="w-full h-full object-cover" loading="eager" decoding="async" />}
    </div>
    <div className="relative z-20 max-w-7xl mx-auto px-4 py-24">
      <div className="max-w-2xl">
        <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tight mb-6">{props.headline}</h1>
        {props.description && <p className="text-xl text-gray-300 mb-10">{props.description}</p>}
        {props.primaryCta && <button onClick={props.primaryCta.onClick} className="px-10 py-4 bg-red-600 text-white font-bold uppercase tracking-wider">{props.primaryCta.text}</button>}
      </div>
    </div>
  </section>
);

// ═══════════════════════════════════════════════════════════════
// TRAVEL HEROES (89-96)
// ═══════════════════════════════════════════════════════════════

export const Hero89: React.FC<HeroTemplateProps> = (props) => (
  <section className={`relative min-h-[90vh] flex items-center ${props.className || ''}`}>
    <div className="absolute inset-0">
      {props.imageSrc ? <img src={props.imageSrc} alt="" className="w-full h-full object-cover" loading="eager" decoding="async" /> : <div className="w-full h-full bg-gradient-to-br from-sky-900 to-blue-900"></div>}
      <div className="absolute inset-0 bg-black/40"></div>
    </div>
    <div className="relative z-10 max-w-4xl mx-auto px-4 text-center text-white">
      {props.badge && <span className="inline-block px-6 py-2 mb-8 text-sm tracking-widest uppercase bg-white/10 backdrop-blur-sm rounded-full">{props.badge}</span>}
      <h1 className="text-5xl md:text-7xl font-light mb-6">{props.headline}</h1>
      {props.description && <p className="text-xl text-white/80 mb-10">{props.description}</p>}
      {props.children || (
        <div className="bg-white rounded-lg p-4 max-w-3xl mx-auto shadow-2xl">
          <div className="grid md:grid-cols-4 gap-4">
            <input type="text" placeholder="Destination" className="px-4 py-3 bg-gray-100 rounded text-gray-800" />
            <input type="text" placeholder="Check In" className="px-4 py-3 bg-gray-100 rounded text-gray-800" />
            <input type="text" placeholder="Check Out" className="px-4 py-3 bg-gray-100 rounded text-gray-800" />
            <button className="px-6 py-3 bg-blue-600 text-white font-medium rounded">{props.primaryCta?.text || 'Search'}</button>
          </div>
        </div>
      )}
    </div>
  </section>
);

// ═══════════════════════════════════════════════════════════════
// SPECIAL HEROES (97-100)
// ═══════════════════════════════════════════════════════════════

export const Hero97: React.FC<HeroTemplateProps> = (props) => (
  <section className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 ${props.className || ''}`}>
    <div className="max-w-2xl mx-auto px-4 text-center text-white">
      <div className="text-6xl mb-8">🚀</div>
      <h1 className="text-5xl md:text-6xl font-bold mb-6">{props.headline}</h1>
      {props.description && <p className="text-xl text-gray-300 mb-10">{props.description}</p>}
      <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
        <input type="email" placeholder="Enter your email" className="flex-1 px-5 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400" />
        <button className="px-8 py-3 bg-purple-600 text-white font-medium rounded-lg">{props.primaryCta?.text || 'Notify Me'}</button>
      </div>
    </div>
  </section>
);

export const Hero98: React.FC<HeroTemplateProps> = (props) => (
  <section className={`py-24 px-4 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 ${props.className || ''}`}>
    <div className="max-w-4xl mx-auto text-center text-white">
      {props.badge && <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-white/20 rounded-full">{props.badge}</span>}
      <h1 className="text-4xl md:text-6xl font-bold mb-6">{props.headline}</h1>
      {props.description && <p className="text-xl text-purple-200 mb-8">{props.description}</p>}
      <div className="flex flex-wrap justify-center gap-4">
        <div className="text-center">
          <div className="text-4xl font-bold">00</div>
          <div className="text-purple-300">Days</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold">00</div>
          <div className="text-purple-300">Hours</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold">00</div>
          <div className="text-purple-300">Minutes</div>
        </div>
      </div>
      {props.primaryCta && <button onClick={props.primaryCta.onClick} className="mt-10 px-8 py-3 bg-white text-purple-900 font-medium rounded-lg">{props.primaryCta.text}</button>}
    </div>
  </section>
);

export const Hero99: React.FC<HeroTemplateProps> = (props) => (
  <section className={`py-20 px-4 bg-gradient-to-br from-blue-600 to-indigo-700 ${props.className || ''}`}>
    <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div className="text-white">
        {props.badge && <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-white/20 rounded-full">{props.badge}</span>}
        <h1 className="text-4xl md:text-5xl font-bold mb-6">{props.headline}</h1>
        {props.description && <p className="text-xl text-blue-100 mb-8">{props.description}</p>}
        <div className="flex flex-wrap gap-4">
          <button className="flex items-center gap-3 px-6 py-3 bg-black text-white rounded-xl">
            <span className="text-2xl">🍎</span>
            <div className="text-left">
              <div className="text-xs">Download on</div>
              <div className="font-semibold">App Store</div>
            </div>
          </button>
          <button className="flex items-center gap-3 px-6 py-3 bg-black text-white rounded-xl">
            <span className="text-2xl">▶️</span>
            <div className="text-left">
              <div className="text-xs">GET IT ON</div>
              <div className="font-semibold">Google Play</div>
            </div>
          </button>
        </div>
      </div>
      <div className="flex justify-center">
        <div className="w-64 h-[500px] bg-gray-900 rounded-[3rem] border-4 border-gray-800 flex items-center justify-center">
          <span className="text-gray-600">Phone</span>
        </div>
      </div>
    </div>
  </section>
);

export const Hero100: React.FC<HeroTemplateProps> = (props) => (
  <section className={`py-20 px-4 bg-gray-900 ${props.className || ''}`}>
    <div className="max-w-2xl mx-auto text-center">
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">{props.headline}</h1>
      {props.description && <p className="text-lg text-gray-400 mb-8">{props.description}</p>}
      <div className="bg-gray-800 rounded-xl p-6">
        <input type="email" placeholder="Enter your email address" className="w-full px-5 py-3 bg-gray-700 text-white rounded-lg mb-4 border border-gray-600" />
        <button className="w-full px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg">{props.primaryCta?.text || 'Subscribe'}</button>
        <p className="text-sm text-gray-500 mt-4">No spam. Unsubscribe at any time.</p>
      </div>
    </div>
  </section>
);

// ═══════════════════════════════════════════════════════════════
// EXPORT ALL HERO COMPONENTS
// ═══════════════════════════════════════════════════════════════

export const heroComponents: Record<string, React.FC<HeroTemplateProps>> = {
  'basic-centered': Hero1,
  'basic-left': Hero2,
  'basic-split': Hero3,
  'basic-minimal': Hero4,
  'basic-dark': Hero5,
  'basic-gradient': Hero6,
  'basic-fullscreen': Hero7,
  'basic-with-image': Hero8,
  'basic-with-stats': Hero9,
  'basic-with-features': Hero10,
  'tech-saas': Hero13,
  'tech-ai': Hero14,
  'tech-developer': Hero15,
  'ecommerce-modern': Hero25,
  'ecommerce-fashion': Hero26,
  'ecommerce-minimal': Hero27,
  'gaming-neon': Hero37,
  'gaming-esports': Hero38,
  'corporate-professional': Hero47,
  'corporate-consulting': Hero48,
  'creative-agency': Hero59,
  'creative-portfolio': Hero60,
  'food-restaurant': Hero71,
  'fitness-gym': Hero81,
  'travel-hotel': Hero89,
  'special-coming-soon': Hero97,
  'special-event': Hero98,
  'special-app-download': Hero99,
  'special-newsletter': Hero100,
};

export default heroComponents;




