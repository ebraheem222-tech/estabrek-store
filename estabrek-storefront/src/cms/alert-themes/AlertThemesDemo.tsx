import React, { useState } from 'react';
import { 
  alertThemes, 
  alertCategories, 
  alertComponents,
  AlertTheme,
  AlertType
} from './AlertThemes';
import { additionalAlertComponents } from './AlertComponents';

// Merge all components
const allAlertComponents = { ...alertComponents, ...additionalAlertComponents };

// Category Icons
const categoryIcons: Record<string, string> = {
  'Basic': '🎯',
  'Toast': '🍞',
  'Banner': '📢',
  'Modern': '🎨',
  'Tech': '🚀',
  'E-commerce': '🛒',
  'Gaming': '🎮',
  'Social': '📱',
};

// Style Icons
const styleIcons: Record<string, string> = {
  'inline': '📄',
  'toast': '🍞',
  'banner': '📢',
  'floating': '💫',
  'minimal': '✨',
  'card': '🃏',
};

const AlertThemesDemo: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [alertType, setAlertType] = useState<AlertType>('info');
  const [previewMode, setPreviewMode] = useState<'grid' | 'full'>('grid');

  const filteredThemes = alertThemes.filter(theme => {
    const matchesCategory = activeCategory === 'all' || theme.category === activeCategory;
    const matchesSearch = searchQuery === '' ||
      theme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      theme.nameAr.includes(searchQuery) ||
      theme.tags?.some(t => t.includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const sampleProps = {
    type: alertType,
    title: 'Alert Title',
    message: 'This is a sample alert message to demonstrate the component style.',
    showIcon: true,
    closable: true,
    onClose: () => {},
    action: { label: 'Action', onClick: () => {} },
    secondaryAction: { label: 'Dismiss', onClick: () => {} },
    // For special components
    productName: 'Premium Headphones',
    achievementName: 'First Victory',
    xp: 500,
    userName: 'John Doe',
    notificationType: 'like' as const,
    code: 'SAVE20',
    level: 10,
    orderNumber: '12345',
    status: 'shipped' as const,
    appName: 'App Store',
    progress: 75,
    isVisible: true,
  };

  const renderAlertPreview = (theme: AlertTheme) => {
    const Component = allAlertComponents[theme.id];
    if (Component) {
      return <Component {...sampleProps} />;
    }
    // Default fallback
    return (
      <div className="p-4 bg-gray-100 rounded-lg text-center">
        <p className="text-gray-500">{theme.name}</p>
        <p className="text-sm text-gray-400">Style: {theme.style}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">🔔 Alert & Notification Themes</h1>
          <p className="text-rose-100 text-lg">100 Ready-to-Use Alert Components</p>
          <p className="text-rose-200 mt-1">100 مكون تنبيهات وإشعارات جاهز</p>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">{alertThemes.length}</span>
              <span className="text-rose-200 ml-2">Themes</span>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">{alertCategories.length}</span>
              <span className="text-rose-200 ml-2">Categories</span>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <span className="text-2xl font-bold">6</span>
              <span className="text-rose-200 ml-2">Styles</span>
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

          {/* Alert Type Selector */}
          <div className="flex bg-white rounded-lg border border-gray-200 p-1">
            {(['success', 'error', 'warning', 'info'] as AlertType[]).map(type => (
              <button
                key={type}
                onClick={() => setAlertType(type)}
                className={`px-3 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                  alertType === type ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {type === 'success' && '✅'}
                {type === 'error' && '❌'}
                {type === 'warning' && '⚠️'}
                {type === 'info' && 'ℹ️'}
                {' '}{type}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="🔍 Search alerts by name, category, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-5 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8 sticky top-0 bg-gray-50 py-4 z-20">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-5 py-2 rounded-full font-medium transition-all duration-200 ${
              activeCategory === 'all'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-rose-300'
            }`}
          >
            ✨ All ({alertThemes.length})
          </button>
          {alertCategories.map(category => {
            const count = alertThemes.filter(t => t.category === category).length;
            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-5 py-2 rounded-full font-medium transition-all duration-200 ${
                  activeCategory === category
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-rose-300'
                }`}
              >
                {categoryIcons[category] || '🔸'} {category} ({count})
              </button>
            );
          })}
        </div>

        {/* Results Count */}
        <p className="text-gray-500 mb-4">
          Showing {filteredThemes.length} of {alertThemes.length} alerts
        </p>

        {/* Grid View */}
        {previewMode === 'grid' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredThemes.map((theme, index) => (
              <div
                key={theme.id}
                className={`bg-white rounded-2xl border-2 overflow-hidden transition-all duration-300 cursor-pointer ${
                  selectedTheme === theme.id
                    ? 'border-rose-500 shadow-xl shadow-rose-500/20'
                    : 'border-gray-200 hover:border-rose-300 hover:shadow-lg'
                }`}
                onClick={() => setSelectedTheme(selectedTheme === theme.id ? null : theme.id)}
              >
                {/* Preview */}
                <div className={`p-6 ${theme.style === 'banner' ? 'bg-gray-100' : theme.category === 'Gaming' || theme.category === 'Tech' ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  {renderAlertPreview(theme)}
                </div>

                {/* Info */}
                <div className="p-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{categoryIcons[theme.category]}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {theme.category}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                      {styleIcons[theme.style]} {theme.style}
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
                    {theme.tags?.slice(0, 4).map(tag => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-600"
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
          <div className="space-y-6">
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
                      className="px-4 py-2 bg-rose-500 text-white text-sm font-medium rounded-lg hover:bg-rose-600"
                    >
                      Copy ID
                    </button>
                  </div>
                </div>

                {/* Preview - All 4 types */}
                <div className={`p-6 space-y-4 ${theme.category === 'Gaming' || theme.category === 'Tech' ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  {(['success', 'error', 'warning', 'info'] as AlertType[]).map(type => {
                    const Component = allAlertComponents[theme.id];
                    if (Component) {
                      return (
                        <div key={type}>
                          <Component {...sampleProps} type={type} title={`${type.charAt(0).toUpperCase() + type.slice(1)} Alert`} />
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {filteredThemes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No alerts found matching your search.</p>
            <button
              onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
              className="mt-4 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
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
                  Selected: {alertThemes.find(t => t.id === selectedTheme)?.name}
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
{`import { alertComponents } from '@/components/alert-themes';

// Get the alert component
const Alert = alertComponents['${selectedTheme}'];

// Basic usage
<Alert
  type="success" // 'success' | 'error' | 'warning' | 'info'
  title="Success!"
  message="Your changes have been saved."
  showIcon={true}
  closable={true}
  onClose={() => console.log('closed')}
/>

// With action buttons
<Alert
  type="warning"
  message="Your trial expires in 3 days."
  action={{ label: "Upgrade", onClick: () => {} }}
  secondaryAction={{ label: "Dismiss", onClick: () => {} }}
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

export default AlertThemesDemo;
