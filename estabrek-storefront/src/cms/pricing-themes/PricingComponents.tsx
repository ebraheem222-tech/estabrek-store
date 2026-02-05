"use client";

import React from 'react';

// ═══════════════════════════════════════════════════════════════
// ADDITIONAL PRICING TABLE COMPONENTS
// ═══════════════════════════════════════════════════════════════

interface PricingFeature {
  text: string;
  included: boolean;
}

interface PricingPlan {
  id: string | number;
  name: string;
  description?: string;
  price: number | string;
  originalPrice?: number | string;
  period?: string;
  currency?: string;
  badge?: string;
  popular?: boolean;
  features: (string | PricingFeature)[];
  buttonText?: string;
  buttonHref?: string;
  onSelect?: () => void;
}

interface PricingTableProps {
  title?: string;
  subtitle?: string;
  description?: string;
  plans: PricingPlan[];
  className?: string;
}

// Icons
const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

function handlePlanSelect(plan: PricingPlan) {
  if (plan.onSelect) {
    plan.onSelect();
    return;
  }
  if (plan.buttonHref && typeof window !== "undefined") {
    window.location.href = plan.buttonHref;
  }
}

// ═══════════════════════════════════════════════════════════════
// BASIC BORDERED
// ═══════════════════════════════════════════════════════════════

export const PricingBasicBordered: React.FC<PricingTableProps> = ({
  title,
  subtitle,
  description,
  plans,
  className = '',
}) => {
  return (
    <section className={`py-16 px-4 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-blue-600 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{title}</h2>}
            {description && <p className="text-gray-600 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(plans.length, 3)} gap-8`}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl p-8 border-2 transition-all ${
                plan.popular 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              {plan.badge && (
                <span className="inline-block px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-full mb-4">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
              {plan.description && <p className="text-gray-500 mt-1">{plan.description}</p>}
              <div className="mt-6">
                <span className="text-4xl font-bold text-gray-900">
                  {plan.currency || '$'}{plan.price}
                </span>
                {plan.period && <span className="text-gray-500">/{plan.period}</span>}
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature, idx) => {
                  const text = typeof feature === 'string' ? feature : feature.text;
                  return (
                    <li key={idx} className="flex items-center gap-3">
                      <span className="text-blue-500"><CheckIcon /></span>
                      <span className="text-gray-700">{text}</span>
                    </li>
                  );
                })}
              </ul>
              <button
                onClick={() => handlePlanSelect(plan)}
                className={`w-full mt-8 py-3 px-4 rounded-lg font-semibold transition-colors border-2 ${
                  plan.popular
                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                    : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                }`}
              >
                {plan.buttonText || 'Get Started'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════
// MODERN GRADIENT BORDER
// ═══════════════════════════════════════════════════════════════

export const PricingModernGradientBorder: React.FC<PricingTableProps> = ({
  title,
  subtitle,
  description,
  plans,
  className = '',
}) => {
  return (
    <section className={`py-16 px-4 bg-gray-900 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-purple-400 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{title}</h2>}
            {description && <p className="text-gray-400 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(plans.length, 3)} gap-6`}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`${plan.popular ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500' : 'bg-gray-700'} p-[2px] rounded-2xl`}
            >
              <div className="bg-gray-900 rounded-2xl p-8 h-full">
                {plan.badge && (
                  <span className="inline-block px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-full mb-4">
                    {plan.badge}
                  </span>
                )}
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                {plan.description && <p className="text-gray-400 mt-1">{plan.description}</p>}
                <div className="mt-6">
                  <span className="text-4xl font-bold text-white">
                    {plan.currency || '$'}{plan.price}
                  </span>
                  {plan.period && <span className="text-gray-400">/{plan.period}</span>}
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, idx) => {
                    const text = typeof feature === 'string' ? feature : feature.text;
                    return (
                      <li key={idx} className="flex items-center gap-3">
                        <span className="text-green-400"><CheckIcon /></span>
                        <span className="text-gray-300">{text}</span>
                      </li>
                    );
                  })}
                </ul>
                <button
                  onClick={() => handlePlanSelect(plan)}
                  className={`w-full mt-8 py-3 px-4 rounded-lg font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  {plan.buttonText || 'Get Started'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════
// MODERN NEUMORPHISM
// ═══════════════════════════════════════════════════════════════

export const PricingModernNeumorphism: React.FC<PricingTableProps> = ({
  title,
  subtitle,
  description,
  plans,
  className = '',
}) => {
  return (
    <section className={`py-16 px-4 bg-gray-200 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-blue-600 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">{title}</h2>}
            {description && <p className="text-gray-600 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(plans.length, 3)} gap-8`}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-3xl p-8 bg-gray-200 ${
                plan.popular 
                  ? 'shadow-[inset_8px_8px_16px_#bebebe,inset_-8px_-8px_16px_#ffffff]' 
                  : 'shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff]'
              }`}
            >
              {plan.badge && (
                <span className="inline-block px-4 py-1 bg-blue-600 text-white text-sm font-medium rounded-full mb-4">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-xl font-bold text-gray-800">{plan.name}</h3>
              {plan.description && <p className="text-gray-500 mt-1">{plan.description}</p>}
              <div className="mt-6">
                <span className="text-4xl font-bold text-gray-800">
                  {plan.currency || '$'}{plan.price}
                </span>
                {plan.period && <span className="text-gray-500">/{plan.period}</span>}
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature, idx) => {
                  const text = typeof feature === 'string' ? feature : feature.text;
                  return (
                    <li key={idx} className="flex items-center gap-3">
                      <span className="text-blue-600"><CheckIcon /></span>
                      <span className="text-gray-700">{text}</span>
                    </li>
                  );
                })}
              </ul>
              <button
                onClick={() => handlePlanSelect(plan)}
                className="w-full mt-8 py-3 px-4 rounded-xl font-semibold bg-blue-600 text-white shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff] hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1)] transition-shadow"
              >
                {plan.buttonText || 'Get Started'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════
// MODERN COLORFUL
// ═══════════════════════════════════════════════════════════════

export const PricingModernColorful: React.FC<PricingTableProps> = ({
  title,
  subtitle,
  description,
  plans,
  className = '',
}) => {
  const colors = [
    { bg: 'bg-blue-500', hover: 'hover:bg-blue-600' },
    { bg: 'bg-purple-500', hover: 'hover:bg-purple-600' },
    { bg: 'bg-pink-500', hover: 'hover:bg-pink-600' },
  ];

  return (
    <section className={`py-16 px-4 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-gray-600 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{title}</h2>}
            {description && <p className="text-gray-600 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(plans.length, 3)} gap-6`}>
          {plans.map((plan, index) => {
            const color = colors[index % colors.length];
            return (
              <div
                key={plan.id}
                className={`${color.bg} rounded-2xl p-8 text-white`}
              >
                {plan.badge && (
                  <span className="inline-block px-3 py-1 bg-white/20 text-white text-sm font-medium rounded-full mb-4">
                    {plan.badge}
                  </span>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                {plan.description && <p className="text-white/80 mt-1">{plan.description}</p>}
                <div className="mt-6">
                  <span className="text-5xl font-bold">
                    {plan.currency || '$'}{plan.price}
                  </span>
                  {plan.period && <span className="text-white/70">/{plan.period}</span>}
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, idx) => {
                    const text = typeof feature === 'string' ? feature : feature.text;
                    return (
                      <li key={idx} className="flex items-center gap-3">
                        <span className="text-white">✓</span>
                        <span className="text-white/90">{text}</span>
                      </li>
                    );
                  })}
                </ul>
                <button
                  onClick={() => handlePlanSelect(plan)}
                  className="w-full mt-8 py-3 px-4 rounded-lg font-semibold bg-white text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  {plan.buttonText || 'Get Started'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════
// TECH FREEMIUM
// ═══════════════════════════════════════════════════════════════

export const PricingTechFreemium: React.FC<PricingTableProps> = ({
  title,
  subtitle,
  description,
  plans,
  className = '',
}) => {
  return (
    <section className={`py-16 px-4 bg-gray-50 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-blue-600 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{title}</h2>}
            {description && <p className="text-gray-600 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(plans.length, 3)} gap-6`}>
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl p-8 ${
                plan.popular 
                  ? 'ring-2 ring-blue-500 shadow-xl relative' 
                  : 'border border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-blue-500 text-white text-sm font-bold rounded-full">
                    {plan.badge || 'MOST POPULAR'}
                  </span>
                </div>
              )}
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                {plan.description && <p className="text-gray-500 mt-1">{plan.description}</p>}
                <div className="mt-6">
                  {plan.price === 0 || plan.price === '0' ? (
                    <span className="text-4xl font-bold text-gray-900">Free</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-gray-900">
                        {plan.currency || '$'}{plan.price}
                      </span>
                      {plan.period && <span className="text-gray-500">/{plan.period}</span>}
                    </>
                  )}
                </div>
              </div>
              <ul className="mt-8 space-y-4">
                {plan.features.map((feature, idx) => {
                  const text = typeof feature === 'string' ? feature : feature.text;
                  const included = typeof feature === 'string' ? true : feature.included;
                  return (
                    <li key={idx} className="flex items-center gap-3">
                      <span className={included ? 'text-green-500' : 'text-gray-300'}>
                        {included ? <CheckIcon /> : <XIcon />}
                      </span>
                      <span className={included ? 'text-gray-700' : 'text-gray-400'}>{text}</span>
                    </li>
                  );
                })}
              </ul>
              <button
                onClick={() => handlePlanSelect(plan)}
                className={`w-full mt-8 py-3 px-4 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : index === 0
                      ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {plan.buttonText || (plan.price === 0 || plan.price === '0' ? 'Start Free' : 'Get Started')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════
// ECOMMERCE DISCOUNT
// ═══════════════════════════════════════════════════════════════

export const PricingEcommerceDiscount: React.FC<PricingTableProps> = ({
  title,
  subtitle,
  description,
  plans,
  className = '',
}) => {
  return (
    <section className={`py-16 px-4 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-red-600 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{title}</h2>}
            {description && <p className="text-gray-600 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(plans.length, 3)} gap-8`}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl p-8 border ${
                plan.popular ? 'border-red-500 shadow-xl' : 'border-gray-200'
              }`}
            >
              {plan.badge && (
                <span className="inline-block px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full mb-4">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
              {plan.description && <p className="text-gray-500 mt-1">{plan.description}</p>}
              <div className="mt-6 flex items-baseline gap-2">
                {plan.originalPrice && (
                  <span className="text-2xl text-gray-400 line-through">
                    {plan.currency || '$'}{plan.originalPrice}
                  </span>
                )}
                <span className="text-4xl font-bold text-red-600">
                  {plan.currency || '$'}{plan.price}
                </span>
                {plan.period && <span className="text-gray-500">/{plan.period}</span>}
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature, idx) => {
                  const text = typeof feature === 'string' ? feature : feature.text;
                  return (
                    <li key={idx} className="flex items-center gap-3">
                      <span className="text-green-500"><CheckIcon /></span>
                      <span className="text-gray-700">{text}</span>
                    </li>
                  );
                })}
              </ul>
              <button
                onClick={() => handlePlanSelect(plan)}
                className={`w-full mt-8 py-3 px-4 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {plan.buttonText || 'Subscribe Now'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════
// CORPORATE PROFESSIONAL
// ═══════════════════════════════════════════════════════════════

export const PricingCorporateProfessional: React.FC<PricingTableProps> = ({
  title,
  subtitle,
  description,
  plans,
  className = '',
}) => {
  return (
    <section className={`py-16 px-4 bg-slate-50 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-slate-600 font-medium uppercase tracking-wider text-sm mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">{title}</h2>}
            {description && <p className="text-slate-600 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(plans.length, 3)} gap-8`}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-lg p-8 shadow-sm ${
                plan.popular ? 'ring-2 ring-slate-900' : 'border border-slate-200'
              }`}
            >
              {plan.badge && (
                <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-medium uppercase tracking-wider mb-4">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-xl font-semibold text-slate-900">{plan.name}</h3>
              {plan.description && <p className="text-slate-500 mt-1">{plan.description}</p>}
              <div className="mt-6 pb-6 border-b border-slate-200">
                <span className="text-4xl font-bold text-slate-900">
                  {plan.currency || '$'}{plan.price}
                </span>
                {plan.period && <span className="text-slate-500">/{plan.period}</span>}
              </div>
              <ul className="mt-6 space-y-4">
                {plan.features.map((feature, idx) => {
                  const text = typeof feature === 'string' ? feature : feature.text;
                  const included = typeof feature === 'string' ? true : feature.included;
                  return (
                    <li key={idx} className="flex items-center gap-3">
                      <span className={included ? 'text-slate-900' : 'text-slate-300'}>
                        {included ? <CheckIcon /> : <XIcon />}
                      </span>
                      <span className={included ? 'text-slate-700' : 'text-slate-400'}>{text}</span>
                    </li>
                  );
                })}
              </ul>
              <button
                onClick={() => handlePlanSelect(plan)}
                className={`w-full mt-8 py-3 px-4 rounded font-medium transition-colors ${
                  plan.popular
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                }`}
              >
                {plan.buttonText || 'Contact Sales'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════
// CREATIVE BOLD
// ═══════════════════════════════════════════════════════════════

export const PricingCreativeBold: React.FC<PricingTableProps> = ({
  title,
  subtitle,
  description,
  plans,
  className = '',
}) => {
  const colors = ['bg-yellow-400', 'bg-pink-500', 'bg-cyan-500'];

  return (
    <section className={`py-16 px-4 bg-black ${className}`}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-gray-400 font-medium mb-2">{subtitle}</p>}
            {title && <h2 className="text-4xl md:text-5xl font-black text-white mb-4">{title}</h2>}
            {description && <p className="text-gray-400 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(plans.length, 3)} gap-6`}>
          {plans.map((plan, index) => {
            const bgColor = colors[index % colors.length];
            const textColor = index === 0 ? 'text-black' : 'text-white';
            return (
              <div
                key={plan.id}
                className={`${bgColor} rounded-none p-8 ${textColor}`}
              >
                {plan.badge && (
                  <span className="inline-block px-3 py-1 bg-black text-white text-sm font-bold mb-4">
                    {plan.badge}
                  </span>
                )}
                <h3 className="text-2xl font-black">{plan.name}</h3>
                {plan.description && <p className="opacity-80 mt-1">{plan.description}</p>}
                <div className="mt-6">
                  <span className="text-6xl font-black">
                    {plan.currency || '$'}{plan.price}
                  </span>
                  {plan.period && <span className="opacity-70 text-lg">/{plan.period}</span>}
                </div>
                <ul className="mt-6 space-y-2">
                  {plan.features.map((feature, idx) => {
                    const text = typeof feature === 'string' ? feature : feature.text;
                    return (
                      <li key={idx} className="flex items-center gap-2">
                        <span>→</span>
                        <span>{text}</span>
                      </li>
                    );
                  })}
                </ul>
                <button
                  onClick={() => handlePlanSelect(plan)}
                  className={`w-full mt-8 py-4 px-4 font-black transition-colors ${
                    index === 0
                      ? 'bg-black text-white hover:bg-gray-900'
                      : 'bg-white text-black hover:bg-gray-100'
                  }`}
                >
                  {plan.buttonText || 'GET STARTED'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════
// APP LIFETIME
// ═══════════════════════════════════════════════════════════════

export const PricingAppLifetime: React.FC<PricingTableProps> = ({
  title,
  subtitle,
  description,
  plans,
  className = '',
}) => {
  return (
    <section className={`py-16 px-4 bg-gradient-to-b from-gray-900 to-gray-950 ${className}`}>
      <div className="max-w-4xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-green-400 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{title}</h2>}
            {description && <p className="text-gray-400 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className="space-y-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-gray-800/50 rounded-2xl p-6 md:p-8 border ${
                plan.popular ? 'border-green-500' : 'border-gray-700'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    {plan.badge && (
                      <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  {plan.description && <p className="text-gray-400 mt-1">{plan.description}</p>}
                  <div className="flex flex-wrap gap-4 mt-4">
                    {plan.features.slice(0, 4).map((feature, idx) => {
                      const text = typeof feature === 'string' ? feature : feature.text;
                      return (
                        <span key={idx} className="flex items-center gap-1 text-gray-300 text-sm">
                          <span className="text-green-400">✓</span> {text}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    {plan.originalPrice && (
                      <p className="text-gray-500 line-through text-lg">
                        {plan.currency || '$'}{plan.originalPrice}
                      </p>
                    )}
                    <p className="text-3xl font-bold text-white">
                      {plan.currency || '$'}{plan.price}
                    </p>
                    <p className="text-gray-400 text-sm">one-time payment</p>
                  </div>
                  <button
                    onClick={() => handlePlanSelect(plan)}
                    className="px-8 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors whitespace-nowrap"
                  >
                    {plan.buttonText || 'Buy Now'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════
// EXPORT MAP
// ═══════════════════════════════════════════════════════════════

export const additionalPricingComponents = {
  'basic-bordered': PricingBasicBordered,
  'modern-gradient-border': PricingModernGradientBorder,
  'modern-neumorphism': PricingModernNeumorphism,
  'modern-colorful': PricingModernColorful,
  'tech-freemium': PricingTechFreemium,
  'ecommerce-discount': PricingEcommerceDiscount,
  'ecommerce-subscription': PricingEcommerceDiscount,
  'corporate-professional': PricingCorporateProfessional,
  'corporate-enterprise': PricingCorporateProfessional,
  'creative-bold': PricingCreativeBold,
  'creative-agency': PricingCreativeBold,
  'app-lifetime': PricingAppLifetime,
  'app-pro': PricingTechFreemium,
};

export default additionalPricingComponents;
