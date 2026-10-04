import React, { useState } from 'react';

// ═══════════════════════════════════════════════════════════════
// ADDITIONAL FEATURE SECTION COMPONENTS
// ═══════════════════════════════════════════════════════════════

interface FeatureItem {
  id: string | number;
  icon?: React.ReactNode | string;
  title: string;
  description?: string;
  image?: string;
  link?: string;
  badge?: string;
  stats?: string;
}

interface FeatureSectionProps {
  title?: string;
  subtitle?: string;
  description?: string;
  features: FeatureItem[];
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

// Default Icons
const Icons = {
  check: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  star: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
  lightning: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  shield: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  globe: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  chart: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
};

const iconArray = [Icons.check, Icons.star, Icons.lightning, Icons.shield, Icons.globe, Icons.chart];

// ═══════════════════════════════════════════════════════════════
// CARDS BORDERED
// ═══════════════════════════════════════════════════════════════

export const FeatureCardsBordered: React.FC<FeatureSectionProps> = ({
  title,
  subtitle,
  description,
  features,
  columns = 3,
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
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
          {features.map((feature, index) => (
            <div key={feature.id} className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 transition-colors">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
                {feature.icon || iconArray[index % iconArray.length]}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
              {feature.description && <p className="text-gray-600">{feature.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════
// CARDS HOVER LIFT
// ═══════════════════════════════════════════════════════════════

export const FeatureCardsHoverLift: React.FC<FeatureSectionProps> = ({
  title,
  subtitle,
  description,
  features,
  columns = 3,
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
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
          {features.map((feature, index) => (
            <div 
              key={feature.id} 
              className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl flex items-center justify-center mb-4">
                {feature.icon || iconArray[index % iconArray.length]}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
              {feature.description && <p className="text-gray-600">{feature.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════
// CARDS COLORFUL
// ═══════════════════════════════════════════════════════════════

export const FeatureCardsColorful: React.FC<FeatureSectionProps> = ({
  title,
  subtitle,
  description,
  features,
  columns = 3,
  className = '',
}) => {
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 
    'bg-green-500', 'bg-orange-500', 'bg-cyan-500'
  ];

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
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
          {features.map((feature, index) => (
            <div key={feature.id} className={`${colors[index % colors.length]} rounded-xl p-6 text-white`}>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                {feature.icon || iconArray[index % iconArray.length]}
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              {feature.description && <p className="opacity-90">{feature.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════
// CARDS DARK
// ═══════════════════════════════════════════════════════════════

export const FeatureCardsDark: React.FC<FeatureSectionProps> = ({
  title,
  subtitle,
  description,
  features,
  columns = 3,
  className = '',
}) => {
  return (
    <section className={`py-16 px-4 bg-gray-900 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-blue-400 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{title}</h2>}
            {description && <p className="text-gray-400 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
          {features.map((feature, index) => (
            <div key={feature.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="w-12 h-12 bg-gray-700 text-blue-400 rounded-lg flex items-center justify-center mb-4">
                {feature.icon || iconArray[index % iconArray.length]}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              {feature.description && <p className="text-gray-400">{feature.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════
// CARDS ACCENT (Top Border)
// ═══════════════════════════════════════════════════════════════

export const FeatureCardsAccent: React.FC<FeatureSectionProps> = ({
  title,
  subtitle,
  description,
  features,
  columns = 3,
  className = '',
}) => {
  const accentColors = [
    'border-t-blue-500', 'border-t-purple-500', 'border-t-pink-500',
    'border-t-green-500', 'border-t-orange-500', 'border-t-cyan-500'
  ];

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
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
          {features.map((feature, index) => (
            <div key={feature.id} className={`bg-white rounded-lg p-6 shadow-md border-t-4 ${accentColors[index % accentColors.length]}`}>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
              {feature.description && <p className="text-gray-600">{feature.description}</p>}
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

export const FeatureModernNeumorphism: React.FC<FeatureSectionProps> = ({
  title,
  subtitle,
  description,
  features,
  columns = 3,
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
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-8`}>
          {features.map((feature, index) => (
            <div 
              key={feature.id} 
              className="bg-gray-200 rounded-2xl p-6 shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff]"
            >
              <div className="w-14 h-14 bg-gray-200 rounded-xl flex items-center justify-center mb-4 shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] text-blue-600">
                {feature.icon || iconArray[index % iconArray.length]}
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{feature.title}</h3>
              {feature.description && <p className="text-gray-600">{feature.description}</p>}
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

export const FeatureModernGradientBorder: React.FC<FeatureSectionProps> = ({
  title,
  subtitle,
  description,
  features,
  columns = 3,
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
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
          {features.map((feature, index) => (
            <div key={feature.id} className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 p-[2px] rounded-xl">
              <div className="bg-gray-900 rounded-xl p-6 h-full">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg flex items-center justify-center mb-4">
                  {feature.icon || iconArray[index % iconArray.length]}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                {feature.description && <p className="text-gray-400">{feature.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════
// ALTERNATING LIST
// ═══════════════════════════════════════════════════════════════

export const FeatureAlternatingList: React.FC<FeatureSectionProps> = ({
  title,
  subtitle,
  description,
  features,
  className = '',
}) => {
  return (
    <section className={`py-16 px-4 ${className}`}>
      <div className="max-w-5xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-16">
            {subtitle && <p className="text-blue-600 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{title}</h2>}
            {description && <p className="text-gray-600 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className="space-y-16">
          {features.map((feature, index) => (
            <div 
              key={feature.id} 
              className={`flex flex-col md:flex-row items-center gap-8 ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}
            >
              <div className="flex-1">
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                  {feature.icon || iconArray[index % iconArray.length]}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                {feature.description && <p className="text-gray-600 text-lg">{feature.description}</p>}
              </div>
              <div className="flex-1">
                {feature.image ? (
                  <img src={feature.image} alt="" className="rounded-2xl shadow-lg" />
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════
// NUMBERED LIST
// ═══════════════════════════════════════════════════════════════

export const FeatureNumberedList: React.FC<FeatureSectionProps> = ({
  title,
  subtitle,
  description,
  features,
  className = '',
}) => {
  return (
    <section className={`py-16 px-4 ${className}`}>
      <div className="max-w-4xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-blue-600 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{title}</h2>}
            {description && <p className="text-gray-600 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className="space-y-6">
          {features.map((feature, index) => (
            <div key={feature.id} className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                {index + 1}
              </div>
              <div className="pt-2">
                <h3 className="text-xl font-semibold text-gray-900 mb-1">{feature.title}</h3>
                {feature.description && <p className="text-gray-600">{feature.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════
// TABS FEATURE SECTION
// ═══════════════════════════════════════════════════════════════

export const FeatureModernTabs: React.FC<FeatureSectionProps> = ({
  title,
  subtitle,
  description,
  features,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className={`py-16 px-4 ${className}`}>
      <div className="max-w-5xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-blue-600 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{title}</h2>}
            {description && <p className="text-gray-600 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        
        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {features.map((feature, index) => (
            <button
              key={feature.id}
              onClick={() => setActiveTab(index)}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === index 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {feature.title}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-gray-50 rounded-2xl p-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                {features[activeTab]?.icon || iconArray[activeTab % iconArray.length]}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{features[activeTab]?.title}</h3>
              <p className="text-gray-600 text-lg">{features[activeTab]?.description}</p>
            </div>
            <div>
              {features[activeTab]?.image ? (
                <img src={features[activeTab].image} alt="" className="rounded-xl shadow-lg" />
              ) : (
                <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl" />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════
// TECH API / CHECKLIST
// ═══════════════════════════════════════════════════════════════

export const FeatureTechChecklist: React.FC<FeatureSectionProps> = ({
  title,
  subtitle,
  description,
  features,
  className = '',
}) => {
  return (
    <section className={`py-16 px-4 ${className}`}>
      <div className="max-w-4xl mx-auto">
        {(title || subtitle || description) && (
          <div className="text-center mb-12">
            {subtitle && <p className="text-blue-600 font-semibold mb-2">{subtitle}</p>}
            {title && <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{title}</h2>}
            {description && <p className="text-gray-600 max-w-2xl mx-auto">{description}</p>}
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-4">
          {features.map((feature) => (
            <div key={feature.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-gray-700 font-medium">{feature.title}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════
// TECH INTEGRATIONS (Logo Grid)
// ═══════════════════════════════════════════════════════════════

export const FeatureTechIntegrations: React.FC<FeatureSectionProps> = ({
  title,
  subtitle,
  description,
  features,
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
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {features.map((feature) => (
            <div 
              key={feature.id} 
              className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-center hover:border-gray-300 hover:shadow-md transition-all"
            >
              {feature.image ? (
                <img src={feature.image} alt={feature.title} className="h-8 w-auto grayscale hover:grayscale-0 transition-all" />
              ) : (
                <span className="text-2xl">{feature.icon || '🔗'}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════
// FOOD FEATURES (Icons Strip)
// ═══════════════════════════════════════════════════════════════

export const FeatureFoodIcons: React.FC<FeatureSectionProps> = ({
  features,
  className = '',
}) => {
  return (
    <section className={`py-8 px-4 bg-amber-50 ${className}`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap justify-center gap-8 md:gap-12">
          {features.map((feature, index) => (
            <div key={feature.id} className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-white text-amber-600 rounded-full flex items-center justify-center shadow-md text-2xl">
                {feature.icon || '🍴'}
              </div>
              <span className="text-gray-700 font-medium text-sm text-center">{feature.title}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════
// TRAVEL DESTINATIONS
// ═══════════════════════════════════════════════════════════════

export const FeatureTravelDestinations: React.FC<FeatureSectionProps> = ({
  title,
  subtitle,
  description,
  features,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div key={feature.id} className="group relative rounded-2xl overflow-hidden aspect-[4/3]">
              {feature.image ? (
                <img src={feature.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-sky-400 to-blue-600" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="text-xl font-bold text-white mb-1">{feature.title}</h3>
                {feature.description && <p className="text-white/80 text-sm">{feature.description}</p>}
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

export const additionalFeatureComponents = {
  'basic-bordered': FeatureCardsBordered,
  'basic-grid-bordered': FeatureCardsBordered,
  'cards-bordered': FeatureCardsBordered,
  'cards-hover-lift': FeatureCardsHoverLift,
  'cards-colorful': FeatureCardsColorful,
  'cards-dark': FeatureCardsDark,
  'cards-accent': FeatureCardsAccent,
  'modern-neumorphism': FeatureModernNeumorphism,
  'modern-gradient-border': FeatureModernGradientBorder,
  'basic-alternating': FeatureAlternatingList,
  'basic-numbered': FeatureNumberedList,
  'modern-tabs': FeatureModernTabs,
  'tech-pricing-features': FeatureTechChecklist,
  'tech-api': FeatureTechChecklist,
  'tech-integrations': FeatureTechIntegrations,
  'food-features': FeatureFoodIcons,
  'travel-destinations': FeatureTravelDestinations,
  'travel-services': FeatureTravelDestinations,
};

export default additionalFeatureComponents;
