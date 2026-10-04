import React, { useState } from 'react';
import { 
  pricingThemes, 
  pricingCategories, 
  pricingComponents
} from './PricingThemes';
import type { PricingTheme } from './PricingThemes';
import { additionalPricingComponents } from './PricingComponents';

// Merge all components
const allPricingComponents = { ...pricingComponents, ...additionalPricingComponents };

// Category Icons
const categoryIcons: Record<string, string> = {
  'Basic': '🎯',
  'Modern': '🎨',
  'Tech': '🚀',
  'E-commerce': '🛒',
  'Corporate': '🏢',
  'Creative': '🎨',
  'Gaming': '🎮',
  'App': '📱',
  'Comparison': '📊',
};

// Style Icons
const styleIcons: Record<string, string> = {
  'cards': '🃏',
  'table': '📊',
  'toggle': '🔄',
  'comparison': '⚖️',
  'minimal': '✨',
  'feature-list': '📋',
};

// Sample plans data
const samplePlans = [
  {
    id: 1,
    name: 'Starter',
    description: 'Perfect for individuals',
    price: 9,
    period: 'month',
    features: [
      '5 Projects',
      '10GB Storage',
      'Basic Analytics',
      'Email Support',
      { text: 'API Access', included: false },
      { text: 'Custom Domain', included: false },
    ],
    buttonText: 'Start Free Trial',
  },
  {
    id: 2,
    name: 'Professional',
    description: 'Best for growing teams',
    price: 29,
    period: 'month',
    badge: 'Most Popular',
    popular: true,
    features: [
      'Unlimited Projects',
      '100GB Storage',
      'Advanced Analytics',
      'Priority Support',
      'API Access',
      { text: 'Custom Domain', included: false },
    ],
    buttonText: 'Get Started',
  },
  {
    id: 3,
    name: 'Enterprise',
    description: 'For large organizations',
    price: 99,
    period: 'month',
    features: [
      'Unlimited Everything',
      'Unlimited Storage',
      'Custom Analytics',
      '24/7 Phone Support',
      'API Access',
      'Custom Domain',
    ],
    buttonText: 'Contact Sales',
  },
];

const PricingThemesDemo: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewMode, setPreviewMode] = useState<'grid' | 'full'>('grid');

  const filteredThemes = pricingThemes.filter(theme => {
    const matchesCategory = activeCategory === 'all' || theme.category === activeCategory;
    const matchesSearch = searchQuery === '' ||
      theme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      theme.nameAr.includes(searchQuery) ||
      theme.tags?.some(t => t.includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const renderPricingPreview = (theme: PricingTheme) => {
    const Component = allPricingComponents[theme.id];
    if (Component) {
      return <Component plans={samplePlans} />;
    }
    // Default fallback
    return (
      <div className="py-16 px-4 bg-gray-100 text-center">
        <p className="text-gray-500 font-medium">{theme.name}</p>
        <p className="text-sm text-gray-400 mt-1">Style: {theme.style}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">💰 Pricing Table Themes</h1>
          <p className="text-violet-100 text-lg">100 Ready-to-Use Pricing Table Components</p>
          <p className="text-violet-200 mt-1">100 مكون جداول أسعار جاهز للاستخدام</p>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">{pricingThemes.length}</span>
              <span className="text-violet-200 ml-2">Themes</span>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">{pricingCategories.length}</span>
              <span className="text-violet-200 ml-2">Categories</span>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">6</span>
              <span className="text-violet-200 ml-2">Styles</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* View Mode Toggle */}
          <div className="flex bg-white rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setPreviewMode('grid')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                previewMode === 'grid' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Grid View
            </button>
            <button
              onClick={() => setPreviewMode('full')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                previewMode === 'full' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📺 Full Preview
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="🔍 Search pricing tables by name, category, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-5 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-sm"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8 sticky top-0 bg-gray-50 py-4 z-20">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-5 py-2 rounded-full font-medium transition-all duration-200 ${
              activeCategory === 'all'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-violet-300'
            }`}
          >
            💰 All ({pricingThemes.length})
          </button>
          {pricingCategories.map(category => {
            const count = pricingThemes.filter(t => t.category === category).length;
            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-5 py-2 rounded-full font-medium transition-all duration-200 ${
                  activeCategory === category
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-violet-300'
                }`}
              >
                {categoryIcons[category] || '🔸'} {category} ({count})
              </button>
            );
          })}
        </div>

        {/* Results Count */}
        <p className="text-gray-500 mb-4">
          Showing {filteredThemes.length} of {pricingThemes.length} pricing tables
        </p>

        {/* Grid View */}
        {previewMode === 'grid' && (
          <div className="space-y-8">
            {filteredThemes.map((theme, index) => (
              <div
                key={theme.id}
                className={`bg-white rounded-2xl border-2 overflow-hidden transition-all duration-300 cursor-pointer ${
                  selectedTheme === theme.id
                    ? 'border-violet-500 shadow-xl shadow-violet-500/20'
                    : 'border-gray-200 hover:border-violet-300 hover:shadow-lg'
                }`}
                onClick={() => setSelectedTheme(selectedTheme === theme.id ? null : theme.id)}
              >
                {/* Info Bar */}
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{categoryIcons[theme.category]}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        #{index + 1} {theme.name}
                      </h3>
                      <p className="text-sm text-gray-500">{theme.nameAr}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                      {theme.category}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-violet-100 text-violet-700">
                      {styleIcons[theme.style]} {theme.style}
                    </span>
                  </div>
                </div>

                {/* Preview */}
                <div className="overflow-hidden">
                  <div className="transform scale-90 origin-top">
                    {renderPricingPreview(theme)}
                  </div>
                </div>

                {/* Tags */}
                <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {theme.tags?.slice(0, 4).map(tag => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-600"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(theme.id); }}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                  >
                    Copy ID
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Full Preview Mode */}
        {previewMode === 'full' && (
          <div className="space-y-8">
            {filteredThemes.map((theme, index) => (
              <div key={theme.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{categoryIcons[theme.category]}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        #{index + 1} {theme.name}
                      </h3>
                      <p className="text-sm text-gray-500">{theme.nameAr}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-3 py-1 rounded-full bg-gray-200 text-gray-700">
                      {theme.style}
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(theme.id)}
                      className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700"
                    >
                      Copy ID
                    </button>
                  </div>
                </div>

                {/* Full Preview */}
                <div>
                  {renderPricingPreview(theme)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {filteredThemes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No pricing tables found matching your search.</p>
            <button
              onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
              className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Usage Code */}
        {selectedTheme && (
          <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-4 shadow-2xl z-50">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-semibold">
                  Selected: {pricingThemes.find(t => t.id === selectedTheme)?.name}
                </h3>
                <button
                  onClick={() => setSelectedTheme(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕ Close
                </button>
              </div>
              <pre className="bg-gray-800 rounded-lg p-4 overflow-x-auto text-sm">
                <code className="text-green-400">
{`import { pricingComponents } from '@/components/pricing-themes';

// Define your plans
const plans = [
  {
    id: 1,
    name: 'Starter',
    price: 9,
    period: 'month',
    features: ['5 Projects', '10GB Storage', 'Email Support'],
  },
  {
    id: 2,
    name: 'Pro',
    price: 29,
    period: 'month',
    badge: 'Popular',
    popular: true,
    features: ['Unlimited Projects', '100GB Storage', 'Priority Support'],
  },
];

// Get the pricing component
const PricingTable = pricingComponents['${selectedTheme}'];

// Use in your page
<PricingTable
  title="Choose Your Plan"
  subtitle="Pricing"
  description="Simple, transparent pricing"
  plans={plans}
/>`}
                </code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingThemesDemo;
