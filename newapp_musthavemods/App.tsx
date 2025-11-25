import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ModGrid } from './components/ModGrid';
import { FilterBar } from './components/FilterBar';
import { Footer } from './components/Footer';
import { ModDetailsModal } from './components/ModDetailsModal';
import { Mod, Category, FilterState, SortOption } from './types';
import { searchModsWithGemini, getTrendingMods } from './services/geminiService';

const App: React.FC = () => {
  // Raw data from API
  const [allMods, setAllMods] = useState<Mod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApiKeyMissing, setIsApiKeyMissing] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [selectedMod, setSelectedMod] = useState<Mod | null>(null);

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    category: Category.ALL,
    sort: SortOption.RELEVANCE,
    showMaxisMatchOnly: false,
    showAlphaOnly: false,
  });

  // Initial Load
  useEffect(() => {
    if (!process.env.API_KEY) {
      setIsApiKeyMissing(true);
      setIsLoading(false);
      return;
    }

    const init = async () => {
      try {
        const trending = await getTrendingMods();
        setAllMods(trending);
      } catch (e) {
        console.error("Failed to load trending mods", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const handleSearch = useCallback(async (query: string, category: Category, imageBase64?: string) => {
    setIsLoading(true);
    
    // Reset filters on new search, but keep category if specifically selected in Hero
    setFilters(prev => ({
      ...prev,
      category: category,
      showMaxisMatchOnly: false,
      showAlphaOnly: false,
      sort: SortOption.RELEVANCE
    }));

    // Smart Scroll: Scroll so the FilterBar is at the top of the viewport (with a bit of padding)
    // This focuses the user on the results
    if (filterRef.current) {
       const yOffset = -100; // Offset for sticky navbar
       const y = filterRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
       window.scrollTo({ top: y, behavior: 'smooth' });
    }

    try {
      const results = await searchModsWithGemini(query, category, imageBase64);
      setAllMods(results);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Calculate Category Facet Counts based on current 'allMods'
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    // Initialize 0
    Object.values(Category).forEach(cat => counts[cat] = 0);
    
    // Count items (All always equals total)
    counts[Category.ALL] = allMods.length;

    allMods.forEach(mod => {
      // Try to match the mod's category string to our enum
      const matchedCat = Object.values(Category).find(c => c === mod.category);
      if (matchedCat) {
        counts[matchedCat] = (counts[matchedCat] || 0) + 1;
      }
    });

    return counts;
  }, [allMods]);

  // Client-Side Filtering & Sorting Logic
  const filteredMods = useMemo(() => {
    let result = [...allMods];

    // 1. Filter by Category (if not ALL)
    if (filters.category !== Category.ALL) {
      result = result.filter(m => m.category === filters.category);
    }

    // 2. Filter by Style (Maxis Match vs Alpha)
    if (filters.showMaxisMatchOnly) {
      result = result.filter(m => m.isMaxisMatch);
    }
    if (filters.showAlphaOnly) {
      result = result.filter(m => !m.isMaxisMatch);
    }

    // 3. Sort
    switch (filters.sort) {
      case SortOption.RATING:
        result.sort((a, b) => b.rating - a.rating);
        break;
      case SortOption.DOWNLOADS:
        result.sort((a, b) => {
          const getNum = (str: string) => {
            const n = parseFloat(str.replace(/,/g, ''));
            if (str.includes('M')) return n * 1000000;
            if (str.includes('k')) return n * 1000;
            return n;
          };
          return getNum(b.downloadCount) - getNum(a.downloadCount);
        });
        break;
      case SortOption.NEWEST:
        // Since we don't have real dates in mock data, randomize slightly or use ID
        result.sort((a, b) => b.id.localeCompare(a.id));
        break;
      case SortOption.RELEVANCE:
      default:
        // Default order from API
        break;
    }

    return result;
  }, [allMods, filters]);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleModClick = (mod: Mod) => {
    setSelectedMod(mod);
  };

  const handleCloseModal = () => {
    setSelectedMod(null);
  };

  return (
    <div className="min-h-screen bg-mhm-dark text-slate-200 flex flex-col font-sans selection:bg-sims-pink/30 selection:text-white">
      <Navbar />
      
      <main className="flex-grow relative">
        <Hero onSearch={handleSearch} isLoading={isLoading} />
        
        {/* Anchor point for smooth scrolling */}
        <div ref={filterRef}></div>

        {isApiKeyMissing ? (
          <div className="container mx-auto px-4 py-12 text-center relative z-20">
             <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 max-w-2xl mx-auto backdrop-blur-sm">
                <h2 className="text-2xl font-bold text-red-400 mb-2">Configuration Required</h2>
                <p className="text-slate-300">
                  The <code>API_KEY</code> environment variable is missing. 
                  Please check your setup to enable Gemini-powered search functionality.
                </p>
             </div>
          </div>
        ) : (
          <>
            <FilterBar 
              filters={filters} 
              onFilterChange={handleFilterChange} 
              resultCount={filteredMods.length}
              categoryCounts={categoryCounts}
            />
            <ModGrid 
              mods={filteredMods} 
              isLoading={isLoading} 
              onModClick={handleModClick}
            />
          </>
        )}
      </main>

      <Footer />

      {/* Mod Details Modal */}
      {selectedMod && (
        <ModDetailsModal mod={selectedMod} onClose={handleCloseModal} />
      )}
    </div>
  );
};

export default App;
