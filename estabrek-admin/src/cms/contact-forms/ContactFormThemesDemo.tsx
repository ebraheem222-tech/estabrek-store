import React, { useState } from 'react';
import { 
  contactFormThemes, 
  contactFormCategories, 
  contactFormComponents,
  ContactFormTheme 
} from './ContactFormThemes';
import { additionalFormComponents } from './ContactFormComponents';

// Merge all components
const allFormComponents = { ...contactFormComponents, ...additionalFormComponents };

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
};

// Sample data for all forms
const sampleData = {
  title: 'Get in Touch',
  subtitle: "We'd love to hear from you",
  description: 'Have a question or want to work together? Fill out the form below and we\'ll get back to you as soon as possible.',
  email: 'hello@example.com',
  phone: '+1 (555) 123-4567',
  address: '123 Main Street, City, Country',
};

const ContactFormThemesDemo: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewMode, setPreviewMode] = useState<'grid' | 'full'>('grid');

  const filteredThemes = contactFormThemes.filter(theme => {
    const matchesCategory = activeCategory === 'all' || theme.category === activeCategory;
    const matchesSearch = searchQuery === '' ||
      theme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      theme.nameAr.includes(searchQuery) ||
      theme.tags?.some(t => t.includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const renderFormPreview = (theme: ContactFormTheme) => {
    const Component = allFormComponents[theme.id];
    if (Component) {
      return <Component {...sampleData} />;
    }
    // Default fallback
    return (
      <div className="py-16 px-4 bg-gray-100 text-center">
        <p className="text-gray-500">Preview: {theme.name}</p>
        <p className="text-sm text-gray-400 mt-2">Layout: {theme.layout}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">📬 Contact Form Templates</h1>
          <p className="text-emerald-100 text-lg">100 Ready-to-Use Contact Form Designs</p>
          <p className="text-emerald-200 mt-1">100 تصميم نموذج اتصال جاهز للاستخدام</p>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">{contactFormThemes.length}</span>
              <span className="text-emerald-200 ml-2">Templates</span>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">{contactFormCategories.length}</span>
              <span className="text-emerald-200 ml-2">Categories</span>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">7</span>
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
            placeholder="🔍 Search forms by name, category, or tag..."
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
            ✨ All ({contactFormThemes.length})
          </button>
          {contactFormCategories.map(category => {
            const count = contactFormThemes.filter(t => t.category === category).length;
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
          Showing {filteredThemes.length} of {contactFormThemes.length} forms
        </p>

        {/* Grid View */}
        {previewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                {/* Preview Thumbnail */}
                <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                  <div className="absolute inset-0 transform scale-[0.35] origin-top-left w-[285%] h-[285%]">
                    {renderFormPreview(theme)}
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
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
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
                        className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600"
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
                      className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600"
                    >
                      Copy ID
                    </button>
                  </div>
                </div>

                {/* Preview */}
                <div className="overflow-hidden">
                  {renderFormPreview(theme)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {filteredThemes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No forms found matching your search.</p>
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
                  Selected: {contactFormThemes.find(t => t.id === selectedTheme)?.name}
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
{`import { contactFormComponents } from '@/components/contact-forms';

// Get the form component
const ContactForm = contactFormComponents['${selectedTheme}'];

// Use in your page
<ContactForm
  title="Get in Touch"
  subtitle="We'd love to hear from you"
  description="Fill out the form and we'll respond shortly."
  email="hello@example.com"
  phone="+1 (555) 123-4567"
  address="123 Main Street, City"
  onSubmit={(data) => console.log(data)}
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

export default ContactFormThemesDemo;
