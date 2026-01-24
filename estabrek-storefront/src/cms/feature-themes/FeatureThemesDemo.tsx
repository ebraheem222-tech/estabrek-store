"use client";

import React, { useState } from 'react';
import { 
  featureThemes, 
  featureCategories, 
  featureComponents,
  FeatureTheme 
} from './FeatureThemes';
import { additionalFeatureComponents } from './FeatureComponents';

// Merge all components
const allFeatureComponents = { ...featureComponents, ...additionalFeatureComponents };

// Category Icons
const categoryIcons: Record<string, string> = {
  'Basic': '🎯',
  'Cards': '🃏',
  'Modern': '🎨',
  'Tech': '🚀',
  'E-commerce': '🛒',
  'Corporate': '🏢',
  'Creative': '🎨',
  'Gaming': '🎮',
  'Food': '🍔',
  'Travel': '✈️',
};

// Layout Icons
const layoutIcons: Record<string, string> = {
  'grid': '📊',
  'list': '📋',
  'cards': '🃏',
  'icons': '🔣',
  'split': '⬜',
  'bento': '🍱',
  'timeline': '📅',
  'tabs': '📑',
};

// Sample features data
const sampleFeatures = [
  { id: 1, title: 'Lightning Fast', description: 'Experience blazing fast performance with our optimized infrastructure.', stats: '99.9%' },
  { id: 2, title: 'Secure by Default', description: 'Enterprise-grade security built into every layer of our platform.', stats: '256-bit' },
  { id: 3, title: 'Global Scale', description: 'Deploy worldwide with our distributed network of data centers.', stats: '50+' },
  { id: 4, title: '24/7 Support', description: 'Our expert team is always here to help you succeed.', stats: '< 1hr' },
  { id: 5, title: 'Easy Integration', description: 'Connect with your favorite tools in just a few clicks.', stats: '100+' },
  { id: 6, title: 'Analytics', description: 'Get deep insights into your data with powerful analytics.', stats: 'Real-time' },
];

const FeatureThemesDemo: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewMode, setPreviewMode] = useState<'grid' | 'full'>('grid');

  const filteredThemes = featureThemes.filter(theme => {
    const matchesCategory = activeCategory === 'all' || theme.category === activeCategory;
    const matchesSearch = searchQuery === '' ||
      theme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      theme.nameAr.includes(searchQuery) ||
      theme.tags?.some(t => t.includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const renderFeaturePreview = (theme: FeatureTheme) => {
    const Component = allFeatureComponents[theme.id];
    if (Component) {
      return (
        <Component 
          features={sampleFeatures.slice(0, theme.layout === 'bento' ? 6 : theme.layout === 'icons' ? 4 : 3)}
        />
      );
    }
    // Default fallback
    return (
      <div className="py-12 px-4 bg-gray-100 text-center">
        <p className="text-gray-500 font-medium">{theme.name}</p>
        <p className="text-sm text-gray-400 mt-1">Layout: {theme.layout}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">✨ Feature Section Themes</h1>
          <p className="text-emerald-100 text-lg">100 Ready-to-Use Feature Section Components</p>
          <p className="text-emerald-200 mt-1">100 مكون أقسام ميزات جاهز للاستخدام</p>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">{featureThemes.length}</span>
              <span className="text-emerald-200 ml-2">Themes</span>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">{featureCategories.length}</span>
              <span className="text-emerald-200 ml-2">Categories</span>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">8</span>
              <span className="text-emerald-200 ml-2">Layouts</span>
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
            placeholder="🔍 Search features by name, category, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-5 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8 sticky top-0 bg-gray-50 py-4 z-20">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-5 py-2 rounded-full font-medium transition-all duration-200 ${
              activeCategory === 'all'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-emerald-300'
            }`}
          >
            ✨ All ({featureThemes.length})
          </button>
          {featureCategories.map(category => {
            const count = featureThemes.filter(t => t.category === category).length;
            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-5 py-2 rounded-full font-medium transition-all duration-200 ${
                  activeCategory === category
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-emerald-300'
                }`}
              >
                {categoryIcons[category] || '🔸'} {category} ({count})
              </button>
            );
          })}
        </div>

        {/* Results Count */}
        <p className="text-gray-500 mb-4">
          Showing {filteredThemes.length} of {featureThemes.length} feature sections
        </p>

        {/* Grid View */}
        {previewMode === 'grid' && (
          <div className="grid grid-cols-1 gap-6">
            {filteredThemes.map((theme, index) => (
              <div
                key={theme.id}
                className={`bg-white rounded-2xl border-2 overflow-hidden transition-all duration-300 cursor-pointer ${
                  selectedTheme === theme.id
                    ? 'border-emerald-500 shadow-xl shadow-emerald-500/20'
                    : 'border-gray-200 hover:border-emerald-300 hover:shadow-lg'
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
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                      {layoutIcons[theme.layout]} {theme.layout}
                    </span>
                  </div>
                </div>

                {/* Preview */}
                <div className="overflow-hidden">
                  <div className="transform scale-90 origin-top">
                    {renderFeaturePreview(theme)}
                  </div>
                </div>

                {/* Tags */}
                <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {theme.tags?.slice(0, 4).map(tag => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600"
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
                      {theme.layout}
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(theme.id)}
                      className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600"
                    >
                      Copy ID
                    </button>
                  </div>
                </div>

                {/* Full Preview */}
                <div>
                  {renderFeaturePreview(theme)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {filteredThemes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No feature sections found matching your search.</p>
            <button
              onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
              className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
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
                  Selected: {featureThemes.find(t => t.id === selectedTheme)?.name}
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
{`import { featureComponents } from '@/components/feature-themes';

// Define your features
const features = [
  { id: 1, title: 'Fast Performance', description: 'Lightning fast speeds...' },
  { id: 2, title: 'Secure', description: 'Enterprise-grade security...' },
  { id: 3, title: '24/7 Support', description: 'Always here to help...' },
];

// Get the feature section component
const FeatureSection = featureComponents['${selectedTheme}'];

// Use in your page
<FeatureSection
  title="Why Choose Us"
  subtitle="Our Features"
  description="Discover what makes us different"
  features={features}
  columns={3}
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

export default FeatureThemesDemo;

