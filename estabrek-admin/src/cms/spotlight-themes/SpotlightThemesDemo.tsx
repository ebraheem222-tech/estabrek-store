import React, { useState } from 'react';
import {
  spotlightThemes,
  spotlightCategories,
  SpotlightContainer,
  SpotlightCard,
  SpotlightButton,
  SpotlightInput,
} from './SpotlightThemes';
import type { SpotlightTheme } from './SpotlightThemes';

// Category Icons
const categoryIcons: Record<string, string> = {
  'Basic': '🌟',
  'Gaming': '🎮',
  'Tech': '🚀',
  'E-commerce': '🛒',
  'Luxury': '💎',
  'Glass': '🪟',
  'Neumorphism': '🔘',
  'Creative': '🎨',
  'Special': '🎭',
};

const SpotlightThemesDemo: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [demoMode, setDemoMode] = useState<'card' | 'button' | 'input'>('card');

  const filteredThemes = spotlightThemes.filter(theme => {
    const matchesCategory = activeCategory === 'all' || theme.category === activeCategory;
    const matchesSearch = searchQuery === '' ||
      theme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      theme.nameAr.includes(searchQuery) ||
      theme.tags?.some(t => t.includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const copyToClipboard = (theme: SpotlightTheme) => {
    const code = `<SpotlightCard theme="${theme.id}">
  <h3>Your Content Here</h3>
  <p>Move your mouse to see the spotlight effect!</p>
</SpotlightCard>`;
    navigator.clipboard.writeText(code);
    setCopySuccess(theme.id);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  // Check if theme needs dark background for preview
  const needsDarkBg = (theme: SpotlightTheme) => {
    return theme.category === 'Glass' || 
           theme.baseClassName.includes('text-white') ||
           theme.baseClassName.includes('bg-black') ||
           theme.baseClassName.includes('bg-gray-9') ||
           theme.baseClassName.includes('bg-slate-9') ||
           theme.baseClassName.includes('-950');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">✨ Spotlight Themes Collection</h1>
          <p className="text-indigo-100 text-lg">150 Interactive Mouse-Following Light Effects</p>
          <p className="text-indigo-200 mt-1">مجموعة 150 تأثير ضوء متتبع للماوس</p>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">{spotlightThemes.length}</span>
              <span className="text-indigo-200 ml-2">Themes</span>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">{spotlightCategories.length}</span>
              <span className="text-indigo-200 ml-2">Categories</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Demo Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setDemoMode('card')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              demoMode === 'card'
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-indigo-300'
            }`}
          >
            📦 Card Demo
          </button>
          <button
            onClick={() => setDemoMode('button')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              demoMode === 'button'
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-indigo-300'
            }`}
          >
            🔘 Button Demo
          </button>
          <button
            onClick={() => setDemoMode('input')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              demoMode === 'input'
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-indigo-300'
            }`}
          >
            📝 Input Demo
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="🔍 Search themes by name, category, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-5 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8 sticky top-0 bg-gray-50 dark:bg-gray-900 py-4 z-10">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-5 py-2 rounded-full font-medium transition-all duration-200 ${
              activeCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-indigo-300'
            }`}
          >
            ✨ All ({spotlightThemes.length})
          </button>
          {spotlightCategories.map(category => {
            const count = spotlightThemes.filter(t => t.category === category).length;
            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-5 py-2 rounded-full font-medium transition-all duration-200 ${
                  activeCategory === category
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                }`}
              >
                {categoryIcons[category] || '🔸'} {category} ({count})
              </button>
            );
          })}
        </div>

        {/* Results Count */}
        <p className="text-gray-500 mb-4">
          Showing {filteredThemes.length} of {spotlightThemes.length} themes
          <span className="ml-2 text-indigo-600">• Move mouse over cards to see effect</span>
        </p>

        {/* Themes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredThemes.map((theme, index) => (
            <div
              key={theme.id}
              className={`relative ${needsDarkBg(theme) ? 'p-4 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900' : ''}`}
            >
              {/* Index Badge */}
              <span className="absolute top-2 right-2 z-20 text-xs font-medium px-2 py-1 rounded-full bg-black/50 text-white">
                #{index + 1}
              </span>

              {/* Theme Preview */}
              {demoMode === 'card' && (
                <SpotlightCard
                  theme={theme}
                  padding="p-6"
                  onClick={() => setSelectedTheme(theme.id)}
                >
                  <div className="space-y-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-black/10 dark:bg-white/10">
                      {categoryIcons[theme.category]} {theme.category}
                    </span>
                    <h3 className="text-lg font-semibold">{theme.name}</h3>
                    <p className="text-sm opacity-70">{theme.nameAr}</p>
                    <p className="text-xs opacity-50 font-mono">{theme.id}</p>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {theme.tags?.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </SpotlightCard>
              )}

              {demoMode === 'button' && (
                <div className="space-y-4">
                  <SpotlightButton
                    theme={theme}
                    onClick={() => setSelectedTheme(theme.id)}
                    className="w-full"
                  >
                    {theme.name}
                  </SpotlightButton>
                  <p className="text-sm text-center text-gray-500">{theme.nameAr}</p>
                </div>
              )}

              {demoMode === 'input' && (
                <div className="space-y-2">
                  <SpotlightInput
                    theme={theme}
                    placeholder={`${theme.name}...`}
                  />
                  <p className="text-sm text-center text-gray-500">{theme.nameAr}</p>
                </div>
              )}

              {/* Copy Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(theme);
                }}
                className="mt-3 w-full py-2 px-4 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                {copySuccess === theme.id ? '✓ Copied!' : '📋 Copy Code'}
              </button>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredThemes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No themes found matching your search.</p>
            <button
              onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Selected Theme Code */}
        {selectedTheme && (
          <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-4 shadow-2xl z-50">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-semibold">
                  Selected: {spotlightThemes.find(t => t.id === selectedTheme)?.name}
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
{`// Usage Examples

// 1. Card with spotlight effect
<SpotlightCard theme="${selectedTheme}">
  <h3>Product Card</h3>
  <p>Move your mouse to see the light follow!</p>
</SpotlightCard>

// 2. Button with spotlight effect
<SpotlightButton theme="${selectedTheme}">
  Click Me
</SpotlightButton>

// 3. Input with spotlight effect
<SpotlightInput theme="${selectedTheme}" placeholder="Type here..." />

// 4. Custom container
<SpotlightContainer theme="${selectedTheme}" as="section">
  <div className="p-8">Any content here</div>
</SpotlightContainer>`}
                </code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpotlightThemesDemo;
