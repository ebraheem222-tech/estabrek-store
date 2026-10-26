import React, { useState, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════
// ADDITIONAL SLIDER COMPONENTS
// ═══════════════════════════════════════════════════════════════

interface SlideItem {
  id: string | number;
  image?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  price?: string;
  originalPrice?: string;
  rating?: number;
  link?: string;
  author?: string;
  role?: string;
  avatar?: string;
}

interface SliderProps {
  slides: SlideItem[];
  showArrows?: boolean;
  showDots?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  slidesToShow?: number;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// DARK THEME SLIDER
// ═══════════════════════════════════════════════════════════════

export const SliderDark: React.FC<SliderProps> = ({
  slides,
  showArrows = true,
  showDots = true,
  autoPlay = true,
  className = '',
}) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => setCurrent(c => (c + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [autoPlay, slides.length]);

  return (
    <div className={`relative bg-gray-900 rounded-2xl overflow-hidden ${className}`}>
      <div className="aspect-video relative">
        {slides.map((slide, i) => (
          <div key={slide.id} className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}>
            {slide.image ? (
              <img src={slide.image} alt="" className="w-full h-full object-cover opacity-60" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
            )}
            <div className="absolute inset-0 flex items-center justify-center text-center p-8">
              <div>
                {slide.title && <h3 className="text-3xl font-bold text-white mb-2">{slide.title}</h3>}
                {slide.description && <p className="text-gray-400">{slide.description}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
      {showArrows && (
        <>
          <button onClick={() => setCurrent((current - 1 + slides.length) % slides.length)} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 rounded-full text-white hover:bg-white/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => setCurrent((current + 1) % slides.length)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 rounded-full text-white hover:bg-white/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </>
      )}
      {showDots && (
        <div className="cms-slider-dots absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`cms-slider-dot rounded-full transition-all ${i === current ? 'is-active bg-white w-6 h-2' : 'is-inactive bg-white/40 w-2 h-2'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// GRADIENT SLIDER
// ═══════════════════════════════════════════════════════════════

export const SliderGradient: React.FC<SliderProps> = ({
  slides,
  showArrows = true,
  showDots = true,
  className = '',
}) => {
  const [current, setCurrent] = useState(0);

  const gradients = [
    'from-purple-600 to-blue-600',
    'from-pink-600 to-rose-600',
    'from-cyan-600 to-teal-600',
    'from-orange-600 to-red-600',
    'from-green-600 to-emerald-600',
  ];

  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`}>
      <div className="aspect-video relative">
        {slides.map((slide, i) => (
          <div key={slide.id} className={`absolute inset-0 bg-gradient-to-br ${gradients[i % gradients.length]} transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute inset-0 flex items-center justify-center text-center p-8">
              <div className="text-white">
                {slide.badge && <span className="inline-block px-3 py-1 mb-4 bg-white/20 rounded-full text-sm">{slide.badge}</span>}
                {slide.title && <h3 className="text-4xl font-bold mb-4">{slide.title}</h3>}
                {slide.description && <p className="text-white/80 max-w-md mx-auto">{slide.description}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
      {showArrows && (
        <>
          <button onClick={() => setCurrent((current - 1 + slides.length) % slides.length)} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 rounded-full text-white hover:bg-white/30">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => setCurrent((current + 1) % slides.length)} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 rounded-full text-white hover:bg-white/30">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </>
      )}
      {showDots && (
        <div className="cms-slider-dots absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`cms-slider-dot w-3 h-3 rounded-full transition-all ${i === current ? 'is-active bg-white' : 'is-inactive bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// CARDS CAROUSEL SLIDER
// ═══════════════════════════════════════════════════════════════

export const SliderCardsCarousel: React.FC<SliderProps> = ({
  slides,
  showArrows = true,
  slidesToShow = 3,
  className = '',
}) => {
  const [current, setCurrent] = useState(0);
  const maxIndex = Math.max(0, slides.length - slidesToShow);

  return (
    <div className={`relative ${className}`}>
      <div className="overflow-hidden">
        <div 
          className="flex gap-6 transition-transform duration-500"
          style={{ transform: `translateX(-${current * (100 / slidesToShow + 2)}%)` }}
        >
          {slides.map((slide) => (
            <div key={slide.id} className="flex-shrink-0" style={{ width: `calc(${100 / slidesToShow}% - 1rem)` }}>
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="aspect-video relative">
                  {slide.image ? (
                    <img src={slide.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                  )}
                </div>
                <div className="p-6">
                  {slide.title && <h3 className="text-lg font-semibold text-gray-900 mb-2">{slide.title}</h3>}
                  {slide.description && <p className="text-gray-600 text-sm">{slide.description}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {showArrows && slides.length > slidesToShow && (
        <>
          <button onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0} className="absolute -left-4 top-1/2 -translate-y-1/2 p-3 bg-white rounded-full shadow-lg disabled:opacity-50">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => setCurrent(Math.min(maxIndex, current + 1))} disabled={current === maxIndex} className="absolute -right-4 top-1/2 -translate-y-1/2 p-3 bg-white rounded-full shadow-lg disabled:opacity-50">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// FASHION/LUXURY SLIDER
// ═══════════════════════════════════════════════════════════════

export const SliderLuxury: React.FC<SliderProps> = ({
  slides,
  showDots = true,
  className = '',
}) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrent(c => (c + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className={`relative bg-black ${className}`}>
      <div className="aspect-[16/9] md:aspect-[21/9] relative overflow-hidden">
        {slides.map((slide, i) => (
          <div key={slide.id} className={`absolute inset-0 transition-all duration-1000 ${i === current ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}>
            {slide.image && <img src={slide.image} alt="" className="w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute inset-0 flex items-center justify-center text-center">
              <div className="text-white">
                {slide.badge && <span className="block text-sm tracking-[0.3em] uppercase mb-4 text-white/60">{slide.badge}</span>}
                {slide.title && <h2 className="text-4xl md:text-6xl font-light tracking-[0.2em] uppercase mb-6">{slide.title}</h2>}
                {slide.link && <a href={slide.link} className="inline-block px-8 py-3 border border-white text-white tracking-widest text-sm hover:bg-white hover:text-black transition-colors">SHOP NOW</a>}
              </div>
            </div>
          </div>
        ))}
      </div>
      {showDots && (
        <div className="cms-slider-dots cms-slider-dots--line absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`cms-slider-dot cms-slider-dot--line h-0.5 transition-all ${i === current ? 'is-active w-8 bg-white' : 'is-inactive w-8 bg-white/30'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TESTIMONIAL CARDS SLIDER
// ═══════════════════════════════════════════════════════════════

export const SliderTestimonialCards: React.FC<SliderProps> = ({
  slides,
  showArrows = true,
  slidesToShow = 3,
  className = '',
}) => {
  const [current, setCurrent] = useState(0);
  const maxIndex = Math.max(0, slides.length - slidesToShow);

  return (
    <div className={`relative py-12 ${className}`}>
      <div className="overflow-hidden px-4">
        <div 
          className="flex gap-6 transition-transform duration-500"
          style={{ transform: `translateX(-${current * (100 / slidesToShow)}%)` }}
        >
          {slides.map((slide) => (
            <div key={slide.id} className="flex-shrink-0" style={{ width: `calc(${100 / slidesToShow}% - 1rem)` }}>
              <div className="bg-white rounded-xl shadow-md p-6 h-full">
                {slide.rating && (
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={i < slide.rating! ? 'text-yellow-400' : 'text-gray-200'}>★</span>
                    ))}
                  </div>
                )}
                {slide.description && <p className="text-gray-600 mb-6 italic">"{slide.description}"</p>}
                <div className="flex items-center gap-3 mt-auto">
                  {slide.avatar ? (
                    <img src={slide.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">👤</div>
                  )}
                  <div>
                    {slide.author && <p className="font-semibold text-gray-900">{slide.author}</p>}
                    {slide.role && <p className="text-sm text-gray-500">{slide.role}</p>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {showArrows && slides.length > slidesToShow && (
        <>
          <button onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0} className="absolute left-0 top-1/2 -translate-y-1/2 p-3 bg-white rounded-full shadow-lg disabled:opacity-50">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => setCurrent(Math.min(maxIndex, current + 1))} disabled={current === maxIndex} className="absolute right-0 top-1/2 -translate-y-1/2 p-3 bg-white rounded-full shadow-lg disabled:opacity-50">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// FOOD MENU SLIDER
// ═══════════════════════════════════════════════════════════════

export const SliderFoodMenu: React.FC<SliderProps> = ({
  slides,
  showArrows = true,
  slidesToShow = 4,
  className = '',
}) => {
  const [current, setCurrent] = useState(0);
  const maxIndex = Math.max(0, slides.length - slidesToShow);

  return (
    <div className={`relative py-8 bg-amber-50 ${className}`}>
      <div className="overflow-hidden px-4">
        <div 
          className="flex gap-6 transition-transform duration-500"
          style={{ transform: `translateX(-${current * (100 / slidesToShow)}%)` }}
        >
          {slides.map((slide) => (
            <div key={slide.id} className="flex-shrink-0" style={{ width: `calc(${100 / slidesToShow}% - 1.2rem)` }}>
              <div className="bg-white rounded-2xl shadow-md overflow-hidden group">
                <div className="aspect-square relative overflow-hidden">
                  {slide.image ? (
                    <img src={slide.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-amber-100 flex items-center justify-center text-4xl">🍽️</div>
                  )}
                  {slide.badge && (
                    <span className="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">{slide.badge}</span>
                  )}
                </div>
                <div className="p-4 text-center">
                  {slide.title && <h3 className="font-semibold text-gray-900">{slide.title}</h3>}
                  {slide.description && <p className="text-sm text-gray-500 mt-1">{slide.description}</p>}
                  {slide.price && <p className="text-lg font-bold text-amber-600 mt-2">{slide.price}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {showArrows && slides.length > slidesToShow && (
        <>
          <button onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0} className="absolute left-2 top-1/2 -translate-y-1/2 p-3 bg-white rounded-full shadow-lg disabled:opacity-50 border-2 border-amber-200">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => setCurrent(Math.min(maxIndex, current + 1))} disabled={current === maxIndex} className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-white rounded-full shadow-lg disabled:opacity-50 border-2 border-amber-200">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TRAVEL DESTINATIONS SLIDER
// ═══════════════════════════════════════════════════════════════

export const SliderTravelDestinations: React.FC<SliderProps> = ({
  slides,
  showArrows = true,
  showDots = true,
  className = '',
}) => {
  const [current, setCurrent] = useState(0);

  return (
    <div className={`relative ${className}`}>
      <div className="aspect-[16/9] rounded-2xl overflow-hidden">
        {slides.map((slide, i) => (
          <div key={slide.id} className={`absolute inset-0 transition-all duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}>
            {slide.image ? (
              <img src={slide.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-sky-400 to-blue-600" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="max-w-xl">
                {slide.badge && <span className="inline-block px-3 py-1 mb-3 bg-sky-500 text-white text-sm rounded-full">{slide.badge}</span>}
                {slide.title && <h3 className="text-3xl font-bold text-white mb-2">{slide.title}</h3>}
                {slide.description && <p className="text-white/80">{slide.description}</p>}
                {slide.price && <p className="text-2xl font-bold text-white mt-4">From {slide.price}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
      {showArrows && (
        <>
          <button onClick={() => setCurrent((current - 1 + slides.length) % slides.length)} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 rounded-full shadow-lg hover:bg-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => setCurrent((current + 1) % slides.length)} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 rounded-full shadow-lg hover:bg-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </>
      )}
      {showDots && (
        <div className="cms-slider-dots flex justify-center gap-2 mt-4">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`cms-slider-dot w-3 h-3 rounded-full transition-all ${i === current ? 'is-active bg-sky-500' : 'is-inactive bg-gray-300'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TECH/SAAS SLIDER
// ═══════════════════════════════════════════════════════════════

export const SliderTechSaas: React.FC<SliderProps> = ({
  slides,
  showDots = true,
  className = '',
}) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrent(c => (c + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className={`relative py-20 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 overflow-hidden ${className}`}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="relative min-h-[300px]">
            {slides.map((slide, i) => (
              <div key={slide.id} className={`absolute inset-0 transition-all duration-500 ${i === current ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {slide.badge && <span className="inline-block px-4 py-1 mb-4 bg-white/20 rounded-full text-white text-sm">{slide.badge}</span>}
                {slide.title && <h2 className="text-4xl font-bold text-white mb-4">{slide.title}</h2>}
                {slide.description && <p className="text-purple-100 text-lg">{slide.description}</p>}
              </div>
            ))}
          </div>
          {/* Image */}
          <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl">
            {slides.map((slide, i) => (
              <div key={slide.id} className={`absolute inset-0 transition-opacity duration-500 ${i === current ? 'opacity-100' : 'opacity-0'}`}>
                {slide.image ? (
                  <img src={slide.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/40">Preview</div>
                )}
              </div>
            ))}
          </div>
        </div>
        {showDots && (
          <div className="cms-slider-dots flex justify-center gap-3 mt-12">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`cms-slider-dot w-3 h-3 rounded-full transition-all ${i === current ? 'is-active bg-white' : 'is-inactive bg-white/30'}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// RETRO/GAMING SLIDER
// ═══════════════════════════════════════════════════════════════

export const SliderRetroGaming: React.FC<SliderProps> = ({
  slides,
  showArrows = true,
  showDots = true,
  className = '',
}) => {
  const [current, setCurrent] = useState(0);

  return (
    <div className={`relative py-8 bg-purple-900 ${className}`}>
      <div className="max-w-4xl mx-auto px-4">
        <div className="relative aspect-video bg-gray-900 border-4 border-yellow-400 rounded-lg overflow-hidden">
          {slides.map((slide, i) => (
            <div key={slide.id} className={`absolute inset-0 transition-opacity duration-300 ${i === current ? 'opacity-100' : 'opacity-0'}`}>
              {slide.image ? (
                <img src={slide.image} alt="" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
              ) : (
                <div className="w-full h-full bg-purple-800 flex items-center justify-center">
                  <span className="text-yellow-400 text-4xl" style={{ fontFamily: 'monospace' }}>{slide.title || `LEVEL ${i + 1}`}</span>
                </div>
              )}
              {slide.title && (
                <div className="absolute bottom-4 left-4 right-4 bg-black/80 p-4 border-2 border-yellow-400">
                  <h3 className="text-yellow-400 font-bold text-xl" style={{ fontFamily: 'monospace' }}>{slide.title}</h3>
                  {slide.description && <p className="text-yellow-200 text-sm mt-1" style={{ fontFamily: 'monospace' }}>{slide.description}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
        {showArrows && (
          <div className="flex justify-center gap-4 mt-4">
            <button onClick={() => setCurrent((current - 1 + slides.length) % slides.length)} className="px-4 py-2 bg-yellow-400 text-purple-900 font-bold" style={{ fontFamily: 'monospace' }}>◄ PREV</button>
            <button onClick={() => setCurrent((current + 1) % slides.length)} className="px-4 py-2 bg-yellow-400 text-purple-900 font-bold" style={{ fontFamily: 'monospace' }}>NEXT ►</button>
          </div>
        )}
        {showDots && (
          <div className="cms-slider-dots flex justify-center gap-2 mt-4">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`cms-slider-dot w-4 h-4 border-2 border-yellow-400 ${i === current ? 'is-active bg-yellow-400' : 'is-inactive bg-transparent'}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// EXPORT MAP
// ═══════════════════════════════════════════════════════════════

export const additionalSliderComponents = {
  'basic-dark': SliderDark,
  'basic-gradient': SliderGradient,
  'basic-card': SliderCardsCarousel,
  'basic-centered': SliderCardsCarousel,
  'product-luxury': SliderLuxury,
  'ecommerce-fashion': SliderLuxury,
  'ecommerce-luxury': SliderLuxury,
  'testimonial-grid': SliderTestimonialCards,
  'testimonial-rating': SliderTestimonialCards,
  'food-menu': SliderFoodMenu,
  'food-specials': SliderFoodMenu,
  'travel-destinations': SliderTravelDestinations,
  'travel-gallery': SliderTravelDestinations,
  'tech-saas': SliderTechSaas,
  'hero-tech': SliderTechSaas,
  'gaming-retro': SliderRetroGaming,
};

export default additionalSliderComponents;
