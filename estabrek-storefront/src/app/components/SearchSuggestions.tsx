"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Icons
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const TagIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const HistoryIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TrendingIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface Suggestion {
  id: string;
  title?: string;
  name?: string;
  slug: string;
  image?: string;
}

interface SearchSuggestionsProps {
  baseUrl?: string;
  placeholder?: string;
  onSelect?: (query: string) => void;
}

const HISTORY_KEY = "estabrek_search_history";
const MAX_HISTORY = 10;

export function SearchSuggestions({
  baseUrl = "/v1/storefront",
  placeholder = "ابحث عن منتج...",
  onSelect,
}: SearchSuggestionsProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Suggestion[]>([]);
  const [categories, setCategories] = useState<Suggestion[]>([]);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const router = useRouter();

  // Load search history
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed.slice(0, MAX_HISTORY));
        }
      }
    } catch (e) {
      console.error("Failed to load search history:", e);
    }
  }, []);

  // Save search to history
  const saveToHistory = useCallback((term: string) => {
    if (!term.trim()) return;
    
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.toLowerCase() !== term.toLowerCase());
      const updated = [term, ...filtered].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save search history:", e);
      }
      return updated;
    });
  }, []);

  // Remove from history
  const removeFromHistory = useCallback((term: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setHistory((prev) => {
      const updated = prev.filter((h) => h !== term);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save search history:", e);
      }
      return updated;
    });
  }, []);

  // Clear all history
  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (e) {
      console.error("Failed to clear search history:", e);
    }
  }, []);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setProducts([]);
      setCategories([]);
      setDidYouMean(null);
      return;
    }

    setIsLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/v1";
      const res = await fetch(
        `${apiBase}/storefront/search/suggest?q=${encodeURIComponent(searchQuery)}&limit=6`
      );
      
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setCategories(data.categories || []);
        setDidYouMean(data.didYouMean || null);
      }
    } catch (e) {
      console.error("Failed to fetch suggestions:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, fetchSuggestions]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = products.length + categories.length + (query ? 0 : history.length);
    
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, totalItems - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          // Handle selection based on index
          if (query) {
            if (selectedIndex < products.length) {
              handleSelectProduct(products[selectedIndex]);
            } else if (selectedIndex < products.length + categories.length) {
              handleSelectCategory(categories[selectedIndex - products.length]);
            }
          } else {
            if (selectedIndex < history.length) {
              handleSelectHistory(history[selectedIndex]);
            }
          }
        } else if (query) {
          handleSearch();
        }
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Handlers
  const handleSearch = () => {
    if (query.trim()) {
      saveToHistory(query.trim());
      onSelect?.(query.trim());
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
    }
  };

  const handleSelectProduct = (product: Suggestion) => {
    router.push(`/p/${product.slug}`);
    setIsOpen(false);
    setQuery("");
  };

  const handleSelectCategory = (category: Suggestion) => {
    router.push(`/c/${category.slug}`);
    setIsOpen(false);
    setQuery("");
  };

  const handleSelectHistory = (term: string) => {
    setQuery(term);
    saveToHistory(term);
    onSelect?.(term);
    router.push(`/search?q=${encodeURIComponent(term)}`);
    setIsOpen(false);
  };

  const handleDidYouMean = () => {
    if (didYouMean) {
      setQuery(didYouMean);
      fetchSuggestions(didYouMean);
    }
  };

  const showHistory = !query && history.length > 0;
  const showResults = query && (products.length > 0 || categories.length > 0);
  const showEmpty = query && !isLoading && products.length === 0 && categories.length === 0;

  return (
    <div className="search-suggestions" ref={containerRef} dir="rtl">
      <div className="search-suggestions-input-wrapper">
        <SearchIcon />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="search-suggestions-input"
        />
        {query && (
          <button
            className="search-suggestions-clear"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
          >
            <XIcon />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="search-suggestions-dropdown">
          {/* Loading */}
          {isLoading && (
            <div className="search-suggestions-loading">
              <div className="search-suggestions-spinner" />
              <span>جاري البحث...</span>
            </div>
          )}

          {/* Did You Mean */}
          {didYouMean && !isLoading && (
            <button className="search-suggestions-did-you-mean" onClick={handleDidYouMean}>
              <span>هل تقصد:</span>
              <strong>{didYouMean}</strong>
            </button>
          )}

          {/* Search History */}
          {showHistory && (
            <div className="search-suggestions-section">
              <div className="search-suggestions-section-header">
                <span>
                  <HistoryIcon />
                  البحث السابق
                </span>
                <button onClick={clearHistory}>مسح الكل</button>
              </div>
              {history.map((term, idx) => (
                <button
                  key={term}
                  className={`search-suggestions-item history ${selectedIndex === idx ? "selected" : ""}`}
                  onClick={() => handleSelectHistory(term)}
                >
                  <HistoryIcon />
                  <span>{term}</span>
                  <button
                    className="search-suggestions-item-remove"
                    onClick={(e) => removeFromHistory(term, e)}
                  >
                    <XIcon />
                  </button>
                </button>
              ))}
            </div>
          )}

          {/* Products */}
          {showResults && products.length > 0 && (
            <div className="search-suggestions-section">
              <div className="search-suggestions-section-header">
                <span>
                  <TrendingIcon />
                  المنتجات
                </span>
              </div>
              {products.map((product, idx) => (
                <button
                  key={product.id}
                  className={`search-suggestions-item product ${selectedIndex === idx ? "selected" : ""}`}
                  onClick={() => handleSelectProduct(product)}
                >
                  <SearchIcon />
                  <span>{product.title}</span>
                </button>
              ))}
            </div>
          )}

          {/* Categories */}
          {showResults && categories.length > 0 && (
            <div className="search-suggestions-section">
              <div className="search-suggestions-section-header">
                <span>
                  <TagIcon />
                  التصنيفات
                </span>
              </div>
              {categories.map((category, idx) => (
                <button
                  key={category.id}
                  className={`search-suggestions-item category ${selectedIndex === products.length + idx ? "selected" : ""}`}
                  onClick={() => handleSelectCategory(category)}
                >
                  <TagIcon />
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {showEmpty && (
            <div className="search-suggestions-empty">
              <p>لا توجد نتائج لـ "{query}"</p>
              <span>جرب البحث بكلمات مختلفة</span>
            </div>
          )}

          {/* Search Button */}
          {query && (
            <button className="search-suggestions-submit" onClick={handleSearch}>
              <SearchIcon />
              <span>البحث عن "{query}"</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
