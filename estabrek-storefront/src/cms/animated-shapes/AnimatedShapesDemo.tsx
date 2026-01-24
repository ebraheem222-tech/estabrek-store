import React, { useState } from 'react';
import { 
  animatedShapeThemes, 
  shapeCategories, 
  animatedShapeComponents,
  animationKeyframes,
  AnimatedShapeTheme 
} from './AnimatedShapes';
import { additionalShapeComponents } from './AnimatedShapesExtra';

// Merge all components
const allShapeComponents = { ...animatedShapeComponents, ...additionalShapeComponents };

// Category Icons
const categoryIcons: Record<string, string> = {
  'Circles': '🔵',
  'Rectangles': '🟦',
  'Stars': '⭐',
  'Triangles': '🔺',
  'Blobs': '🫧',
  'Dots': '⬤',
  'Lines': '➖',
  'Mixed': '🎨',
};

// Animation Icons
const animationIcons: Record<string, string> = {
  'float': '🎈',
  'pulse': '💓',
  'rotate': '🔄',
  'bounce': '⬆️',
  'fade': '👻',
  'scale': '📐',
  'slide': '➡️',
  'morph': '🌊',
};

const AnimatedShapesDemo: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewBg, setPreviewBg] = useState<'light' | 'dark' | 'gradient'>('light');

  const filteredThemes = animatedShapeThemes.filter(theme => {
    const matchesCategory = activeCategory === 'all' || theme.category === activeCategory;
    const matchesSearch = searchQuery === '' ||
      theme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      theme.nameAr.includes(searchQuery) ||
      theme.tags?.some(t => t.includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getBgClass = () => {
    switch (previewBg) {
      case 'dark': return 'bg-gray-900';
      case 'gradient': return 'bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500';
      default: return 'bg-white';
    }
  };

  const renderShapePreview = (theme: AnimatedShapeTheme) => {
    const Component = allShapeComponents[theme.id];
    if (Component) {
      return (
        <div className={`relative w-full h-48 ${getBgClass()} rounded-xl overflow-hidden`}>
          <Component />
        </div>
      );
    }
    // Default fallback
    return (
      <div className={`relative w-full h-48 ${getBgClass()} rounded-xl overflow-hidden flex items-center justify-center`}>
        <div className="text-center">
          <p className={`font-medium ${previewBg === 'light' ? 'text-gray-500' : 'text-white'}`}>{theme.name}</p>
          <p className={`text-sm mt-1 ${previewBg === 'light' ? 'text-gray-400' : 'text-white/70'}`}>
            {theme.shape} • {theme.animation}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Inject keyframes */}
      <style dangerouslySetInnerHTML={{ __html: animationKeyframes }} />

      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">✨ Animated Shape Themes</h1>
          <p className="text-pink-100 text-lg">100 Animated Background Decorations</p>
          <p className="text-pink-200 mt-1">100 أشكال متحركة للخلفيات</p>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">{animatedShapeThemes.length}</span>
              <span className="text-pink-200 ml-2">Shapes</span>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">{shapeCategories.length}</span>
              <span className="text-pink-200 ml-2">Categories</span>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">8</span>
              <span className="text-pink-200 ml-2">Animations</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Background Toggle */}
          <div className="flex bg-white rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setPreviewBg('light')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                previewBg === 'light' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ☀️ Light
            </button>
            <button
              onClick={() => setPreviewBg('dark')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                previewBg === 'dark' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🌙 Dark
            </button>
            <button
              onClick={() => setPreviewBg('gradient')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                previewBg === 'gradient' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🌈 Gradient
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="🔍 Search shapes by name, category, or animation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-5 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 shadow-sm"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8 sticky top-0 bg-gray-50 py-4 z-20">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-5 py-2 rounded-full font-medium transition-all duration-200 ${
              activeCategory === 'all'
                ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-pink-300'
            }`}
          >
            ✨ All ({animatedShapeThemes.length})
          </button>
          {shapeCategories.map(category => {
            const count = animatedShapeThemes.filter(t => t.category === category).length;
            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-5 py-2 rounded-full font-medium transition-all duration-200 ${
                  activeCategory === category
                    ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-pink-300'
                }`}
              >
                {categoryIcons[category] || '🔸'} {category} ({count})
              </button>
            );
          })}
        </div>

        {/* Results Count */}
        <p className="text-gray-500 mb-4">
          Showing {filteredThemes.length} of {animatedShapeThemes.length} animated shapes
        </p>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredThemes.map((theme, index) => (
            <div
              key={theme.id}
              className={`bg-white rounded-2xl border-2 overflow-hidden transition-all duration-300 cursor-pointer ${
                selectedTheme === theme.id
                  ? 'border-pink-500 shadow-xl shadow-pink-500/20'
                  : 'border-gray-200 hover:border-pink-300 hover:shadow-lg'
              }`}
              onClick={() => setSelectedTheme(selectedTheme === theme.id ? null : theme.id)}
            >
              {/* Preview */}
              <div className="p-4">
                {renderShapePreview(theme)}
              </div>

              {/* Info */}
              <div className="p-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{categoryIcons[theme.category]}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">
                        #{index + 1} {theme.name}
                      </h3>
                      <p className="text-xs text-gray-500">{theme.nameAr}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                    {theme.shape}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-pink-100 text-pink-700">
                    {animationIcons[theme.animation]} {theme.animation}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {theme.tags?.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-600"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(theme.id); }}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
                  >
                    Copy ID
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredThemes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No animated shapes found matching your search.</p>
            <button
              onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
              className="mt-4 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
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
                  Selected: {animatedShapeThemes.find(t => t.id === selectedTheme)?.name}
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
{`import { animatedShapeComponents, animationKeyframes } from '@/components/animated-shapes';

// 1. Add keyframes to your CSS or inject them
// In your global CSS or _app.tsx:
<style>{animationKeyframes}</style>

// 2. Get the shape component
const AnimatedShape = animatedShapeComponents['${selectedTheme}'];

// 3. Use inside any component
<div className="relative overflow-hidden">
  {/* Your content */}
  <AnimatedShape 
    opacity={0.5}
    color="blue"
    size="lg"
    speed="normal"
  />
</div>`}
                </code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnimatedShapesDemo;
