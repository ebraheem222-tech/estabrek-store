import React, { useState } from 'react';
import { 
  sliderThemes, 
  sliderCategories, 
  sliderComponents,
  SliderTheme 
} from './SliderThemes';
import { additionalSliderComponents } from './SliderComponents';

// Merge all components
const allSliderComponents = { ...sliderComponents, ...additionalSliderComponents };

// Category Icons
const categoryIcons: Record<string, string> = {
  'Basic': '🎯',
  'E-commerce': '🛒',
  'Hero': '🖼️',
  'Testimonial': '💬',
  'Gallery': '🖼️',
  'Gaming': '🎮',
  'Corporate': '🏢',
  'Creative': '🎨',
  'Food': '🍔',
  'Travel': '✈️',
};

// Sample slides data
const sampleSlides = [
  { id: 1, title: 'Amazing Product', description: 'Discover our latest collection', badge: 'New', price: '$99', originalPrice: '$149', rating: 5, image: '', author: 'John Doe', role: 'CEO, Company', avatar: '' },
  { id: 2, title: 'Special Offer', description: 'Limited time deal - Save 50%', badge: 'Sale', price: '$49', originalPrice: '$99', rating: 4, image: '', author: 'Jane Smith', role: 'Designer', avatar: '' },
  { id: 3, title: 'Premium Quality', description: 'Handcrafted with care', badge: 'Premium', price: '$199', rating: 5, image: '', author: 'Mike Johnson', role: 'Developer', avatar: '' },
  { id: 4, title: 'Best Seller', description: 'Customer favorite item', badge: 'Hot', price: '$79', rating: 4, image: '', author: 'Sarah Wilson', role: 'Manager', avatar: '' },
  { id: 5, title: 'New Arrival', description: 'Fresh from our collection', badge: 'New', price: '$129', rating: 5, image: '', author: 'Chris Brown', role: 'Director', avatar: '' },
];

const SliderThemesDemo: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewMode, setPreviewMode] = useState<'grid' | 'full'>('grid');

  const filteredThemes = sliderThemes.filter(theme => {
    const matchesCategory = activeCategory === 'all' || theme.category === activeCategory;
    const matchesSearch = searchQuery === '' ||
      theme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      theme.nameAr.includes(searchQuery) ||
      theme.tags?.some(t => t.includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const renderSliderPreview = (theme: SliderTheme) => {
    const Component = allSliderComponents[theme.id];
    if (Component) {
      return <Component slides={sampleSlides} showArrows={true} showDots={true} slidesToShow={theme.style === 'carousel' ? 3 : undefined} />;
    }
    // Default fallback
    return (
      <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 font-medium">{theme.name}</p>
          <p className="text-sm text-gray-400 mt-1">Style: {theme.style}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">🎠 Slider & Carousel Themes</h1>
          <p className="text-indigo-100 text-lg">100 Ready-to-Use Slider Components</p>
          <p className="text-indigo-200 mt-1">100 مكون سلايدر جاهز للاستخدام</p>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">{sliderThemes.length}</span>
              <span className="text-indigo-200 ml-2">Themes</span>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">{sliderCategories.length}</span>
              <span className="text-indigo-200 ml-2">Categories</span>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">8</span>
              <span className="text-indigo-200 ml-2">Styles</span>
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
            placeholder="🔍 Search sliders by name, category, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-5 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8 sticky top-0 bg-gray-50 py-4 z-20">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-5 py-2 rounded-full font-medium transition-all duration-200 ${
              activeCategory === 'all'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-indigo-300'
            }`}
          >
            ✨ All ({sliderThemes.length})
          </button>
          {sliderCategories.map(category => {
            const count = sliderThemes.filter(t => t.category === category).length;
            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-5 py-2 rounded-full font-medium transition-all duration-200 ${
                  activeCategory === category
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-indigo-300'
                }`}
              >
                {categoryIcons[category] || '🔸'} {category} ({count})
              </button>
            );
          })}
        </div>

        {/* Results Count */}
        <p className="text-gray-500 mb-4">
          Showing {filteredThemes.length} of {sliderThemes.length} sliders
        </p>

        {/* Grid View */}
        {previewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredThemes.map((theme, index) => (
              <div
                key={theme.id}
                className={`bg-white rounded-2xl border-2 overflow-hidden transition-all duration-300 cursor-pointer ${
                  selectedTheme === theme.id
                    ? 'border-indigo-500 shadow-xl shadow-indigo-500/20'
                    : 'border-gray-200 hover:border-indigo-300 hover:shadow-lg'
                }`}
                onClick={() => setSelectedTheme(selectedTheme === theme.id ? null : theme.id)}
              >
                {/* Preview */}
                <div className="p-4 bg-gray-50">
                  <div className="transform scale-75 origin-top">
                    {renderSliderPreview(theme)}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{categoryIcons[theme.category]}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {theme.category}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      {theme.style}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-white ml-auto">
                      #{index + 1}
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
                        className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600"
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
                      {theme.style}
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(theme.id)}
                      className="px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600"
                    >
                      Copy ID
                    </button>
                  </div>
                </div>

                {/* Preview */}
                <div className="p-6">
                  {renderSliderPreview(theme)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {filteredThemes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No sliders found matching your search.</p>
            <button
              onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
              className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
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
                  Selected: {sliderThemes.find(t => t.id === selectedTheme)?.name}
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
{`import { sliderComponents } from '@/components/slider-themes';

// Get the slider component
const Slider = sliderComponents['${selectedTheme}'];

// Define your slides
const slides = [
  { id: 1, title: 'Slide 1', description: 'Description', image: '/img1.jpg' },
  { id: 2, title: 'Slide 2', description: 'Description', image: '/img2.jpg' },
  { id: 3, title: 'Slide 3', description: 'Description', image: '/img3.jpg' },
];

// Use in your component
<Slider
  slides={slides}
  showArrows={true}
  showDots={true}
  autoPlay={true}
  autoPlayInterval={5000}
  infinite={true}
  slidesToShow={3} // for carousel style
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

export default SliderThemesDemo;
