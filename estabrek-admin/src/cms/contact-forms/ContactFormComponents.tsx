"use client";

import React from 'react';

// ═══════════════════════════════════════════════════════════════
// ADDITIONAL CONTACT FORM COMPONENTS
// ═══════════════════════════════════════════════════════════════

interface FormProps {
  title?: string;
  subtitle?: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  onSubmit?: (data: any) => void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// BASIC FORMS (More Variations)
// ═══════════════════════════════════════════════════════════════

// Basic Bordered
export const Form3: React.FC<FormProps> = (props) => (
  <section className={`py-16 px-4 bg-white ${props.className || ''}`}>
    <div className="max-w-xl mx-auto">
      {props.title && <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{props.title}</h2>}
      <form className="space-y-5 border-2 border-gray-200 rounded-xl p-8">
        <input type="text" placeholder="Your name" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:ring-0" />
        <input type="email" placeholder="Email address" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:ring-0" />
        <input type="tel" placeholder="Phone number" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:ring-0" />
        <textarea rows={4} placeholder="Your message" className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:ring-0 resize-none"></textarea>
        <button type="submit" className="w-full py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800">Send Message</button>
      </form>
    </div>
  </section>
);

// Basic Rounded
export const Form4: React.FC<FormProps> = (props) => (
  <section className={`py-16 px-4 bg-gray-100 ${props.className || ''}`}>
    <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-lg p-10">
      {props.title && <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">{props.title}</h2>}
      <form className="space-y-5">
        <input type="text" placeholder="Name" className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-0 focus:ring-2 focus:ring-blue-500" />
        <input type="email" placeholder="Email" className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-0 focus:ring-2 focus:ring-blue-500" />
        <textarea rows={4} placeholder="Message" className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-0 focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
        <button type="submit" className="w-full py-4 bg-blue-600 text-white font-medium rounded-2xl hover:bg-blue-700">Submit</button>
      </form>
    </div>
  </section>
);

// Floating Labels
export const Form7: React.FC<FormProps> = (props) => (
  <section className={`py-16 px-4 bg-white ${props.className || ''}`}>
    <div className="max-w-xl mx-auto">
      {props.title && <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{props.title}</h2>}
      <form className="space-y-6">
        <div className="relative">
          <input type="text" id="name" className="peer w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-transparent focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Name" />
          <label htmlFor="name" className="absolute left-4 -top-2.5 bg-white px-1 text-sm text-gray-600 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-blue-600">Name</label>
        </div>
        <div className="relative">
          <input type="email" id="email" className="peer w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-transparent focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Email" />
          <label htmlFor="email" className="absolute left-4 -top-2.5 bg-white px-1 text-sm text-gray-600 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-blue-600">Email</label>
        </div>
        <div className="relative">
          <textarea id="message" rows={4} className="peer w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-transparent focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" placeholder="Message"></textarea>
          <label htmlFor="message" className="absolute left-4 -top-2.5 bg-white px-1 text-sm text-gray-600 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-blue-600">Message</label>
        </div>
        <button type="submit" className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">Send</button>
      </form>
    </div>
  </section>
);

// Two Column
export const Form10: React.FC<FormProps> = (props) => (
  <section className={`py-16 px-4 bg-white ${props.className || ''}`}>
    <div className="max-w-3xl mx-auto">
      {props.title && <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{props.title}</h2>}
      <form className="space-y-5">
        <div className="grid grid-cols-2 gap-5">
          <input type="text" placeholder="First name" className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <input type="text" placeholder="Last name" className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="grid grid-cols-2 gap-5">
          <input type="email" placeholder="Email" className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <input type="tel" placeholder="Phone" className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <input type="text" placeholder="Subject" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        <textarea rows={5} placeholder="Message" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
        <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">Send Message</button>
      </form>
    </div>
  </section>
);

// Glass Form
export const Form14: React.FC<FormProps> = (props) => (
  <section className={`py-16 px-4 bg-gradient-to-br from-purple-600 to-blue-600 ${props.className || ''}`}>
    <div className="max-w-xl mx-auto">
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
        {props.title && <h2 className="text-3xl font-bold text-white mb-6 text-center">{props.title}</h2>}
        <form className="space-y-5">
          <input type="text" placeholder="Name" className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:ring-2 focus:ring-white/50" />
          <input type="email" placeholder="Email" className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:ring-2 focus:ring-white/50" />
          <textarea rows={4} placeholder="Message" className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:ring-2 focus:ring-white/50 resize-none"></textarea>
          <button type="submit" className="w-full py-3 bg-white text-purple-700 font-medium rounded-lg hover:bg-purple-50">Send</button>
        </form>
      </div>
    </div>
  </section>
);

// ═══════════════════════════════════════════════════════════════
// TECH FORMS
// ═══════════════════════════════════════════════════════════════

// Tech AI
export const Form21: React.FC<FormProps> = (props) => (
  <section className={`py-16 px-4 bg-slate-950 ${props.className || ''}`}>
    <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
      <div>
        {props.title && <h2 className="text-4xl font-bold text-white mb-4">{props.title}</h2>}
        {props.description && <p className="text-gray-400 mb-8">{props.description}</p>}
        <div className="flex items-center gap-4 p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
          <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <p className="text-cyan-400 font-medium">AI-Powered Support</p>
            <p className="text-gray-500 text-sm">Average response: 2 hours</p>
          </div>
        </div>
      </div>
      <div className="bg-gray-900/50 rounded-2xl p-8 border border-cyan-500/20">
        <form className="space-y-5">
          <input type="text" placeholder="Name" className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500" />
          <input type="email" placeholder="Email" className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500" />
          <select className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500">
            <option value="">Select topic</option>
            <option value="api">API Integration</option>
            <option value="pricing">Pricing</option>
            <option value="support">Technical Support</option>
          </select>
          <textarea rows={4} placeholder="Message" className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 resize-none"></textarea>
          <button type="submit" className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-lg">Send Message</button>
        </form>
      </div>
    </div>
  </section>
);

// Tech Developer/API
export const Form19: React.FC<FormProps> = (props) => (
  <section className={`py-16 px-4 bg-gray-950 ${props.className || ''}`}>
    <div className="max-w-3xl mx-auto">
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/50 border-b border-gray-800">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          <span className="ml-4 text-gray-400 text-sm font-mono">contact-form.tsx</span>
        </div>
        <div className="p-8">
          {props.title && <h2 className="text-2xl font-mono text-white mb-6">{props.title}</h2>}
          <form className="space-y-5">
            <div>
              <label className="block text-green-400 text-sm font-mono mb-1">// your_name</label>
              <input type="text" placeholder="string" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded text-white font-mono placeholder-gray-600 focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-green-400 text-sm font-mono mb-1">// email</label>
              <input type="email" placeholder="string" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded text-white font-mono placeholder-gray-600 focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-green-400 text-sm font-mono mb-1">// message</label>
              <textarea rows={4} placeholder="string" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded text-white font-mono placeholder-gray-600 focus:ring-2 focus:ring-green-500 resize-none"></textarea>
            </div>
            <button type="submit" className="px-6 py-2 bg-green-500 text-black font-mono font-medium rounded hover:bg-green-400">submit()</button>
          </form>
        </div>
      </div>
    </div>
  </section>
);

// Tech Crypto
export const Form22: React.FC<FormProps> = (props) => (
  <section className={`py-16 px-4 bg-gray-950 ${props.className || ''}`}>
    <div className="max-w-xl mx-auto">
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl p-8 border border-amber-500/30">
        {props.title && <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500 mb-2 text-center">{props.title}</h2>}
        {props.subtitle && <p className="text-gray-500 mb-8 text-center">{props.subtitle}</p>}
        <form className="space-y-5">
          <input type="text" placeholder="Name" className="w-full px-4 py-3 bg-gray-800/50 border border-amber-500/30 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500" />
          <input type="email" placeholder="Email" className="w-full px-4 py-3 bg-gray-800/50 border border-amber-500/30 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500" />
          <input type="text" placeholder="Wallet Address (optional)" className="w-full px-4 py-3 bg-gray-800/50 border border-amber-500/30 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500" />
          <textarea rows={4} placeholder="Message" className="w-full px-4 py-3 bg-gray-800/50 border border-amber-500/30 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 resize-none"></textarea>
          <button type="submit" className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-lg hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]">Send Message</button>
        </form>
      </div>
    </div>
  </section>
);

// ═══════════════════════════════════════════════════════════════
// E-COMMERCE FORMS
// ═══════════════════════════════════════════════════════════════

// Luxury E-commerce
export const Form34: React.FC<FormProps> = (props) => (
  <section className={`py-16 px-4 bg-black ${props.className || ''}`}>
    <div className="max-w-xl mx-auto">
      <div className="border border-amber-400/30 p-10">
        {props.title && <h2 className="text-3xl font-light text-white tracking-widest mb-2 text-center uppercase">{props.title}</h2>}
        {props.subtitle && <p className="text-amber-400/60 mb-10 text-center tracking-wider">{props.subtitle}</p>}
        <form className="space-y-6">
          <input type="text" placeholder="NAME" className="w-full px-4 py-4 bg-transparent border-b border-gray-700 text-white placeholder-gray-600 tracking-widest focus:border-amber-400 focus:outline-none" />
          <input type="email" placeholder="EMAIL" className="w-full px-4 py-4 bg-transparent border-b border-gray-700 text-white placeholder-gray-600 tracking-widest focus:border-amber-400 focus:outline-none" />
          <input type="tel" placeholder="PHONE" className="w-full px-4 py-4 bg-transparent border-b border-gray-700 text-white placeholder-gray-600 tracking-widest focus:border-amber-400 focus:outline-none" />
          <textarea rows={4} placeholder="MESSAGE" className="w-full px-4 py-4 bg-transparent border-b border-gray-700 text-white placeholder-gray-600 tracking-widest focus:border-amber-400 focus:outline-none resize-none"></textarea>
          <button type="submit" className="w-full py-4 border border-amber-400 text-amber-400 tracking-[0.3em] hover:bg-amber-400 hover:text-black transition-colors">SUBMIT</button>
        </form>
      </div>
    </div>
  </section>
);

// Kids E-commerce
export const Form35: React.FC<FormProps> = (props) => (
  <section className={`py-16 px-4 bg-gradient-to-br from-pink-100 via-purple-100 to-cyan-100 ${props.className || ''}`}>
    <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl p-8 border-4 border-pink-200">
      {props.title && <h2 className="text-3xl font-bold text-purple-600 mb-2 text-center">{props.title} 🎈</h2>}
      {props.subtitle && <p className="text-purple-400 mb-8 text-center">{props.subtitle}</p>}
      <form className="space-y-5">
        <input type="text" placeholder="Your Name 😊" className="w-full px-5 py-4 border-3 border-pink-200 rounded-2xl focus:ring-4 focus:ring-pink-300 focus:border-pink-400" />
        <input type="email" placeholder="Email Address 📧" className="w-full px-5 py-4 border-3 border-purple-200 rounded-2xl focus:ring-4 focus:ring-purple-300 focus:border-purple-400" />
        <textarea rows={4} placeholder="Your Message 💬" className="w-full px-5 py-4 border-3 border-cyan-200 rounded-2xl focus:ring-4 focus:ring-cyan-300 focus:border-cyan-400 resize-none"></textarea>
        <button type="submit" className="w-full py-4 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white font-bold rounded-2xl text-lg hover:shadow-lg transition-shadow">Send Message! 🚀</button>
      </form>
    </div>
  </section>
);

// ═══════════════════════════════════════════════════════════════
// GAMING FORMS (More)
// ═══════════════════════════════════════════════════════════════

// Gaming Retro
export const Form44: React.FC<FormProps> = (props) => (
  <section className={`py-16 px-4 bg-purple-900 ${props.className || ''}`}>
    <div className="max-w-xl mx-auto bg-gray-900 border-4 border-yellow-400 p-8">
      {props.title && <h2 className="text-3xl font-bold text-yellow-400 mb-6 text-center uppercase" style={{ fontFamily: 'monospace' }}>{props.title}</h2>}
      <form className="space-y-5">
        <input type="text" placeholder="PLAYER NAME" className="w-full px-4 py-3 bg-purple-900 border-2 border-yellow-400 text-yellow-400 placeholder-yellow-600 focus:ring-2 focus:ring-yellow-400" style={{ fontFamily: 'monospace' }} />
        <input type="email" placeholder="EMAIL" className="w-full px-4 py-3 bg-purple-900 border-2 border-yellow-400 text-yellow-400 placeholder-yellow-600 focus:ring-2 focus:ring-yellow-400" style={{ fontFamily: 'monospace' }} />
        <textarea rows={4} placeholder="MESSAGE" className="w-full px-4 py-3 bg-purple-900 border-2 border-yellow-400 text-yellow-400 placeholder-yellow-600 focus:ring-2 focus:ring-yellow-400 resize-none" style={{ fontFamily: 'monospace' }}></textarea>
        <button type="submit" className="w-full py-3 bg-yellow-400 text-purple-900 font-bold uppercase hover:bg-yellow-300" style={{ fontFamily: 'monospace' }}>PRESS START</button>
      </form>
    </div>
  </section>
);

// Gaming Esports
export const Form42: React.FC<FormProps> = (props) => (
  <section className={`py-16 px-4 bg-black ${props.className || ''}`}>
    <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
      <div>
        {props.title && <h2 className="text-4xl font-black text-white uppercase mb-4">{props.title}</h2>}
        {props.description && <p className="text-gray-400 mb-8">{props.description}</p>}
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-red-600/10 rounded-lg border border-red-600/30">
            <span className="text-3xl">🎮</span>
            <div>
              <p className="text-red-500 font-bold">Discord</p>
              <p className="text-gray-500">Join our community</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-red-600/10 rounded-lg border border-red-600/30">
            <span className="text-3xl">📺</span>
            <div>
              <p className="text-red-500 font-bold">Twitch</p>
              <p className="text-gray-500">Watch live streams</p>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-gray-900 rounded-xl p-8 border border-red-600/30">
        <form className="space-y-5">
          <input type="text" placeholder="Gamer Tag" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500" />
          <input type="email" placeholder="Email" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500" />
          <select className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500">
            <option value="">Select Game</option>
            <option value="valorant">Valorant</option>
            <option value="csgo">CS:GO</option>
            <option value="lol">League of Legends</option>
          </select>
          <textarea rows={4} placeholder="Message" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 resize-none"></textarea>
          <button type="submit" className="w-full py-4 bg-red-600 text-white font-bold uppercase tracking-wider rounded-lg hover:bg-red-700">Join Team</button>
        </form>
      </div>
    </div>
  </section>
);

// ═══════════════════════════════════════════════════════════════
// CREATIVE FORMS
// ═══════════════════════════════════════════════════════════════

// Creative Photography
export const Form66: React.FC<FormProps> = (props) => (
  <section className={`py-20 px-4 bg-gray-900 ${props.className || ''}`}>
    <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12">
      <div className="aspect-square bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center">
        <span className="text-6xl">📷</span>
      </div>
      <div>
        {props.title && <h2 className="text-4xl font-light text-white mb-4">{props.title}</h2>}
        {props.description && <p className="text-gray-500 mb-8">{props.description}</p>}
        <form className="space-y-5">
          <input type="text" placeholder="Name" className="w-full px-0 py-3 bg-transparent border-b border-gray-700 text-white placeholder-gray-600 focus:border-white focus:outline-none" />
          <input type="email" placeholder="Email" className="w-full px-0 py-3 bg-transparent border-b border-gray-700 text-white placeholder-gray-600 focus:border-white focus:outline-none" />
          <input type="text" placeholder="Event Type" className="w-full px-0 py-3 bg-transparent border-b border-gray-700 text-white placeholder-gray-600 focus:border-white focus:outline-none" />
          <input type="text" placeholder="Event Date" className="w-full px-0 py-3 bg-transparent border-b border-gray-700 text-white placeholder-gray-600 focus:border-white focus:outline-none" />
          <textarea rows={3} placeholder="Tell me about your vision" className="w-full px-0 py-3 bg-transparent border-b border-gray-700 text-white placeholder-gray-600 focus:border-white focus:outline-none resize-none"></textarea>
          <button type="submit" className="px-8 py-3 bg-white text-gray-900 font-medium rounded-full hover:bg-gray-100">Book Session</button>
        </form>
      </div>
    </div>
  </section>
);

// Creative Minimalist Portfolio
export const Form63: React.FC<FormProps> = (props) => (
  <section className={`py-20 px-4 bg-white ${props.className || ''}`}>
    <div className="max-w-2xl mx-auto">
      {props.title && <h2 className="text-6xl font-light text-gray-900 mb-4">{props.title}</h2>}
      {props.subtitle && <p className="text-gray-500 mb-12">{props.subtitle}</p>}
      <form className="space-y-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Name</label>
            <input type="text" className="w-full px-0 py-2 bg-transparent border-b border-gray-200 text-gray-900 focus:border-gray-900 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Email</label>
            <input type="email" className="w-full px-0 py-2 bg-transparent border-b border-gray-200 text-gray-900 focus:border-gray-900 focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Message</label>
          <textarea rows={4} className="w-full px-0 py-2 bg-transparent border-b border-gray-200 text-gray-900 focus:border-gray-900 focus:outline-none resize-none"></textarea>
        </div>
        <button type="submit" className="text-gray-900 font-medium border-b-2 border-gray-900 pb-1 hover:text-gray-600 hover:border-gray-600">Send Message →</button>
      </form>
    </div>
  </section>
);

// ═══════════════════════════════════════════════════════════════
// SPECIAL FORMS
// ═══════════════════════════════════════════════════════════════

// Spa/Wellness
export const Form86: React.FC<FormProps> = (props) => (
  <section className={`py-16 px-4 bg-gradient-to-br from-teal-50 to-cyan-50 ${props.className || ''}`}>
    <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-lg p-10">
      {props.title && <h2 className="text-3xl font-light text-teal-800 mb-2 text-center">{props.title}</h2>}
      {props.subtitle && <p className="text-teal-600/60 mb-8 text-center">{props.subtitle}</p>}
      <form className="space-y-5">
        <input type="text" placeholder="Your name" className="w-full px-5 py-4 bg-teal-50/50 border border-teal-100 rounded-2xl text-teal-900 placeholder-teal-400 focus:ring-2 focus:ring-teal-300" />
        <input type="email" placeholder="Email" className="w-full px-5 py-4 bg-teal-50/50 border border-teal-100 rounded-2xl text-teal-900 placeholder-teal-400 focus:ring-2 focus:ring-teal-300" />
        <input type="tel" placeholder="Phone" className="w-full px-5 py-4 bg-teal-50/50 border border-teal-100 rounded-2xl text-teal-900 placeholder-teal-400 focus:ring-2 focus:ring-teal-300" />
        <select className="w-full px-5 py-4 bg-teal-50/50 border border-teal-100 rounded-2xl text-teal-900 focus:ring-2 focus:ring-teal-300">
          <option value="">Select service</option>
          <option value="massage">Massage</option>
          <option value="facial">Facial</option>
          <option value="yoga">Yoga Class</option>
        </select>
        <textarea rows={3} placeholder="Special requests" className="w-full px-5 py-4 bg-teal-50/50 border border-teal-100 rounded-2xl text-teal-900 placeholder-teal-400 focus:ring-2 focus:ring-teal-300 resize-none"></textarea>
        <button type="submit" className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium rounded-2xl hover:shadow-lg">Book Appointment</button>
      </form>
    </div>
  </section>
);

// Newsletter
export const Form100: React.FC<FormProps> = (props) => (
  <section className={`py-16 px-4 bg-gray-900 ${props.className || ''}`}>
    <div className="max-w-xl mx-auto text-center">
      {props.title && <h2 className="text-3xl font-bold text-white mb-4">{props.title}</h2>}
      {props.subtitle && <p className="text-gray-400 mb-8">{props.subtitle}</p>}
      <form className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <input type="email" placeholder="Enter your email" className="flex-1 px-5 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500" />
          <button type="submit" className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:shadow-lg whitespace-nowrap">Subscribe</button>
        </div>
        <p className="text-sm text-gray-500">No spam. Unsubscribe at any time.</p>
      </form>
    </div>
  </section>
);

// ═══════════════════════════════════════════════════════════════
// EXPORT MAP
// ═══════════════════════════════════════════════════════════════

export const additionalFormComponents: Record<string, React.FC<FormProps>> = {
  'basic-bordered': Form3,
  'basic-rounded': Form4,
  'basic-floating': Form7,
  'basic-two-column': Form10,
  'basic-glass': Form14,
  'tech-ai': Form21,
  'tech-developer': Form19,
  'tech-api': Form19,
  'tech-crypto': Form22,
  'ecommerce-luxury': Form34,
  'ecommerce-kids': Form35,
  'gaming-retro': Form44,
  'gaming-esports': Form42,
  'creative-photography': Form66,
  'creative-portfolio': Form63,
  'fitness-spa': Form86,
  'fitness-meditation': Form86,
  'special-newsletter': Form100,
};

export default additionalFormComponents;
