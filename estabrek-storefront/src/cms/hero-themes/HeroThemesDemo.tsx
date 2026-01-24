"use client";

import React, { useState } from 'react';
import { heroThemes, heroCategories, HeroTheme } from './HeroThemes';
import { heroComponents } from './HeroComponents';

// Category Icons
const categoryIcons: Record<string, string> = {
  'Basic': '🎯',
  'Tech': '🚀',
  'E-commerce': '🛒',
  'Gaming': '🎮',
  'Corporate': '🏢',
  'Creative': '🎨',
  'Food': '🍔',
  'Fitness': '🏋️',
  'Travel': '✈️',
  'Special': '🎭',
};

const HeroThemesDemo: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewMode, setPreviewMode] = useState<'grid' | 'full'>('grid');

  const filteredThemes = heroThemes.filter(theme => {
    const matchesCategory = activeCategory === 'all' || theme.category === activeCategory;
    const matchesSearch = searchQuery === '' ||
      theme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      theme.nameAr.includes(searchQuery) ||
      theme.tags?.some(t => t.includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Sample data for previews
  const sampleData = {
    badge: 'New Release',
    headline: 'Build Amazing Products',
    subheadline: 'The future of design is here',
    description: 'Create stunning websites with our collection of 100 hero section templates. Perfect for any industry.',
    primaryCta: { text: 'Get Started', onClick: () => {} },
    secondaryCta: { text: 'Learn More', onClick: () => {} },
    features: ['Fast Performance', 'Modern Design', 'Easy to Use'],
    stats: [
      { value: '10K+', label: 'Users' },
      { value: '99%', label: 'Uptime' },
      { value: '24/7', label: 'Support' },
    ],
  };

  const renderHeroPreview = (theme: HeroTheme) => {
    const Component = heroComponents[theme.id];
    if (Component) {
      return <Component {...sampleData} />;
    }
    // Default preview for themes without specific component
    return (
      <div className="bg-gray-100 p-8 text-center">
        <p className="text-gray-500">Preview: {theme.name}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">🎯 Hero Section Templates</h1>
          <p className="text-orange-100 text-lg">100 Ready-to-Use Hero Sections for All Industries</p>
          <p className="text-orange-200 mt-1">100 قالب قسم رئيسي جاهز لجميع الصناعات</p>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">{heroThemes.length}</span>
              <span className="text-orange-200 ml-2">Templates</span>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">{heroCategories.length}</span>
              <span className="text-orange-200 ml-2">Categories</span>
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
            placeholder="🔍 Search templates by name, category, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-5 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8 sticky top-0 bg-gray-50 py-4 z-20">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-5 py-2 rounded-full font-medium transition-all duration-200 ${
              activeCategory === 'all'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-orange-300'
            }`}
          >
            ✨ All ({heroThemes.length})
          </button>
          {heroCategories.map(category => {
            const count = heroThemes.filter(t => t.category === category).length;
            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-5 py-2 rounded-full font-medium transition-all duration-200 ${
                  activeCategory === category
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-orange-300'
                }`}
              >
                {categoryIcons[category] || '🔸'} {category} ({count})
              </button>
            );
          })}
        </div>

        {/* Results Count */}
        <p className="text-gray-500 mb-4">
          Showing {filteredThemes.length} of {heroThemes.length} templates
        </p>

        {/* Grid View */}
        {previewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredThemes.map((theme, index) => (
              <div
                key={theme.id}
                className={`bg-white rounded-2xl border-2 overflow-hidden transition-all duration-300 cursor-pointer ${
                  selectedTheme === theme.id
                    ? 'border-orange-500 shadow-xl shadow-orange-500/20'
                    : 'border-gray-200 hover:border-orange-300 hover:shadow-lg'
                }`}
                onClick={() => setSelectedTheme(selectedTheme === theme.id ? null : theme.id)}
              >
                {/* Preview Thumbnail */}
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  <div className="absolute inset-0 transform scale-[0.4] origin-top-left w-[250%] h-[250%]">
                    {renderHeroPreview(theme)}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  <span className="absolute top-2 right-2 text-xs font-medium px-2 py-1 rounded-full bg-black/50 text-white">
                    #{index + 1}
                  </span>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{categoryIcons[theme.category]}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {theme.category}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {theme.layout}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{theme.name}</h3>
                  <p className="text-sm text-gray-500">{theme.nameAr}</p>
                  <p className="text-xs text-gray-400 font-mono mt-1">{theme.id}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {theme.tags?.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
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
                      className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600"
                    >
                      Copy ID
                    </button>
                  </div>
                </div>

                {/* Preview */}
                <div className="overflow-hidden">
                  {renderHeroPreview(theme)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {filteredThemes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No templates found matching your search.</p>
            <button
              onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
              className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
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
                  Selected: {heroThemes.find(t => t.id === selectedTheme)?.name}
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
{`import { heroComponents } from '@/components/hero-themes';

// Get the hero component
const Hero = heroComponents['${selectedTheme}'];

// Use in your page
<Hero
  badge="New"
  headline="Your Headline Here"
  description="Your description text"
  primaryCta={{ text: "Get Started", onClick: () => {} }}
  secondaryCta={{ text: "Learn More", onClick: () => {} }}
  imageSrc="/path/to/image.jpg"
  stats={[
    { value: "10K+", label: "Users" },
    { value: "99%", label: "Uptime" },
  ]}
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

export default HeroThemesDemo;

