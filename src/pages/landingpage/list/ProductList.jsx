import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productAPI, DEFAULT_PAGE_SIZE } from '../../../lib/supabase';
import { Search, Grid, List, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Package } from 'lucide-react';
import ProductListModal from '../components/ProductListModal';
import Navigation from '../layouts/Navigation';
import Header from '../layouts/Header';
import placeholderImage from '../images/multifactorslogo.jpg';

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

// ─── Session-level page cache ──────────────────────────────────────────────────
const pageCache = new Map();
function buildKey(page, cat, q) { return `${page}|${cat}|${q}`; }

// ─── IntersectionObserver lazy image ──────────────────────────────────────────
function LazyImg({ src, alt, className, fallback }) {
  const ref  = useRef(null);
  const [url, setUrl] = useState('');
  const [vis, setVis] = useState(false);

  useEffect(() => {
    if (!src) { setUrl(fallback); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setUrl(src); setVis(true); io.disconnect(); } }, { rootMargin: '120px' });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, [src, fallback]);

  return (
    <div ref={ref} className={`${className} bg-gray-100 overflow-hidden`}>
      {url && (
        <img src={url} alt={alt} loading="lazy" decoding="async"
          className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${vis ? 'opacity-100' : 'opacity-0'}`}
          onLoad={e => e.currentTarget.classList.add('opacity-100')}
          onError={e => { e.currentTarget.src = fallback; }} />
      )}
    </div>
  );
}

// ─── Pagination component ──────────────────────────────────────────────────────
function Pagination({ current, total, onChange }) {
  if (total <= 1) return null;

  const [jumpValue, setJumpValue] = useState('');
  const [showJump,  setShowJump]  = useState(false);

  const go = (p) => { if (p >= 1 && p <= total && p !== current) onChange(p); };

  // Smart page window — shows up to 5 pages around current
  const getPages = () => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [];
    const left  = Math.max(2, current - 2);
    const right = Math.min(total - 1, current + 2);
    pages.push(1);
    if (left > 2)         pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < total - 1) pages.push('...');
    pages.push(total);
    return pages;
  };

  const handleJump = (e) => {
    e.preventDefault();
    const p = parseInt(jumpValue);
    if (p >= 1 && p <= total) { go(p); setShowJump(false); setJumpValue(''); }
  };

  const progress = Math.round((current / total) * 100);

  return (
    <div className="mt-10 flex flex-col items-center gap-4 select-none">
      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Page {current}</span>
          <span>{total} pages</span>
        </div>
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-1.5">
        {/* First */}
        <button onClick={() => go(1)} disabled={current === 1}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="First page">
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Prev */}
        <button onClick={() => go(current - 1)} disabled={current === 1}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all group"
          title="Previous page">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {getPages().map((page, i) =>
            page === '...' ? (
              <button key={`ellipsis-${i}`} onClick={() => setShowJump(v => !v)}
                title="Jump to page"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all text-sm tracking-widest font-medium">
                …
              </button>
            ) : (
              <button key={page} onClick={() => go(page)}
                className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  current === page
                    ? 'bg-green-600 text-white shadow-md shadow-green-200 scale-105'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}>
                {page}
              </button>
            )
          )}
        </div>

        {/* Next */}
        <button onClick={() => go(current + 1)} disabled={current === total}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all group"
          title="Next page">
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Last */}
        <button onClick={() => go(total)} disabled={current === total}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Last page">
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      {/* Jump-to input — appears when clicking ellipsis */}
      {showJump && (
        <form onSubmit={handleJump} className="flex items-center gap-2 animate-fadeIn">
          <span className="text-xs text-gray-500">Jump to page:</span>
          <input
            type="number" min={1} max={total} value={jumpValue}
            onChange={e => setJumpValue(e.target.value)}
            autoFocus
            className="w-16 px-2 py-1.5 text-sm text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            placeholder="1"
          />
          <button type="submit" className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors">
            Go
          </button>
          <button type="button" onClick={() => setShowJump(false)} className="px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600">
            Cancel
          </button>
        </form>
      )}

      {/* Keyboard hint */}
      <p className="text-xs text-gray-300 flex items-center gap-3">
        <span>← → arrow keys to navigate</span>
        <span>·</span>
        <span>Click … to jump</span>
      </p>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
const ProductList = () => {
  const [searchParams] = useSearchParams();

  const [products,    setProducts]    = useState([]);
  const [totalCount,  setTotalCount]  = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading,     setLoading]     = useState(true);

  const [searchQuery,      setSearchQuery]      = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [allCategories,    setAllCategories]    = useState([]);
  const [viewMode,         setViewMode]         = useState('grid');
  const [highlightedId,    setHighlightedId]    = useState(null);
  const [selectedProduct,  setSelectedProduct]  = useState(null);
  const [hasAnimated,      setHasAnimated]      = useState(false);
  const [isCatOpen,        setIsCatOpen]        = useState(false);

  const productRefs      = useRef({});
  const searchTimeout    = useRef(null);
  const realtimeDebounce = useRef(null);
  // Refs so the realtime callback always sees latest values without re-subscribing
  const currentPageRef   = useRef(currentPage);
  const selectedCatRef   = useRef(selectedCategory);
  const searchQueryRef   = useRef(searchQuery);

  useEffect(() => { currentPageRef.current = currentPage;      }, [currentPage]);
  useEffect(() => { selectedCatRef.current = selectedCategory; }, [selectedCategory]);
  useEffect(() => { searchQueryRef.current = searchQuery;      }, [searchQuery]);

  // Load page with cache
  const loadPage = useCallback(async (page, cat, q, skipCache = false) => {
    const key = buildKey(page, cat, q);
    if (!skipCache && pageCache.has(key)) {
      const c = pageCache.get(key);
      // Expire client-side page cache after 10 minutes
      if (Date.now() - c.ts < 10 * 60 * 1000) {
        setProducts(c.data); setTotalCount(c.count); setTotalPages(c.totalPages);
        setLoading(false); setHasAnimated(false); setTimeout(() => setHasAnimated(true), 50);
        return;
      }
      pageCache.delete(key); // expired — fall through to fresh fetch
    }
    try {
      setLoading(true);
      const result = await productAPI.getPaginated({
        page, pageSize: PAGE_SIZE,
        category: cat !== 'all' ? cat : undefined,
        search: q || undefined,
      });
      pageCache.set(key, { ...result, ts: Date.now() });
      if (pageCache.size > 60) pageCache.delete(pageCache.keys().next().value);
      setProducts(result.data); setTotalCount(result.count); setTotalPages(result.totalPages);
      setHasAnimated(false); setTimeout(() => setHasAnimated(true), 100);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    const cats = await productAPI.getCategories();
    setAllCategories(cats);
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  // Re-fetch only when page or category actually changes
  useEffect(() => {
    loadPage(currentPage, selectedCategory, searchQuery);
  }, [currentPage, selectedCategory]); // eslint-disable-line

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setCurrentPage(1);
      loadPage(1, selectedCategory, searchQuery);
    }, 350);
    return () => clearTimeout(searchTimeout.current);
  }, [searchQuery]); // eslint-disable-line

  // Realtime — subscribe ONCE, read filter values via refs to avoid stale closures.
  // The subscription uses a unique channel name (see supabase.js) so React StrictMode
  // double-mounts don't stack duplicate listeners.
  useEffect(() => {
    const sub = productAPI.subscribeToChanges((payload) => {
      // Only react to actual data mutation events — ignore system/status events
      const validEvents = ['INSERT', 'UPDATE', 'DELETE'];
      if (!payload?.eventType || !validEvents.includes(payload.eventType)) return;

      // Debounce: multiple rapid changes collapse into one reload
      clearTimeout(realtimeDebounce.current);
      realtimeDebounce.current = setTimeout(() => {
        // Bust only the current page's cache entry — other pages stay cached
        const key = buildKey(currentPageRef.current, selectedCatRef.current, searchQueryRef.current);
        pageCache.delete(key);
        loadPage(currentPageRef.current, selectedCatRef.current, searchQueryRef.current, true);
        // Only refresh categories on INSERT — UPDATE/DELETE can't introduce new ones
        if (payload.eventType === 'INSERT') loadCategories();
      }, 1000);
    });

    return () => {
      clearTimeout(realtimeDebounce.current);
      sub.unsubscribe();
    };
  }, []); // Empty deps — subscribe exactly once

  // Deep-link highlight
  useEffect(() => {
    const id = searchParams.get('product');
    if (id && products.length) {
      setHighlightedId(id);
      setTimeout(() => productRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 500);
      setTimeout(() => setHighlightedId(null), 3500);
    }
  }, [searchParams, products]);

  // Keyboard pagination
  useEffect(() => {
    const onKey = (e) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' && currentPage < totalPages) handlePageChange(currentPage + 1);
      if (e.key === 'ArrowLeft'  && currentPage > 1)          handlePageChange(currentPage - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentPage, totalPages]); // eslint-disable-line

  const openModal  = (p) => { setSelectedProduct(p);   document.body.style.overflow = 'hidden'; };
  const closeModal = ()   => { setSelectedProduct(null); document.body.style.overflow = 'unset'; };

  const handleCategoryChange = (cat) => { setSelectedCategory(cat); setCurrentPage(1); setIsCatOpen(false); };
  const handlePageChange     = (p)   => {
    if (p < 1 || p > totalPages) return;
    setCurrentPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem   = Math.min(currentPage * PAGE_SIZE, totalCount);

  // ── Sidebar ──
  const CategorySidebar = ({ mobile = false }) => (
    <div className={mobile ? 'p-3 space-y-1' : 'space-y-1'}>
      {[{ key: 'all', label: 'All Products', count: totalCount }, ...allCategories.map(c => ({ key: c, label: c, count: null }))].map(item => (
        <button key={item.key} onClick={() => handleCategoryChange(item.key)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
            selectedCategory === item.key
              ? 'bg-green-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}>
          <span>{item.label}</span>
          {item.count !== null && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${selectedCategory === item.key ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-green-100" />
            <div className="absolute inset-0 rounded-full border-4 border-green-600 border-t-transparent animate-spin" />
          </div>
          <p className="text-gray-500 font-medium">Loading products…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <Navigation />

      <div className="min-h-screen bg-[#f8faf9]">

        {/* ── Page header ── */}
        <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
          <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 py-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search products, brand, model…"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none text-sm transition-all" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Mobile category toggle */}
                <button onClick={() => setIsCatOpen(v => !v)} className={`lg:hidden p-2.5 rounded-xl border transition-all ${isCatOpen ? 'bg-green-600 border-green-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                  <Filter className="w-4 h-4" />
                </button>

                {/* View toggle */}
                <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-0.5">
                  <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400 hover:text-gray-600'}`}>
                    <Grid className="w-4 h-4" />
                  </button>
                  <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400 hover:text-gray-600'}`}>
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 py-8">
          <div className="flex gap-8">

            {/* ── Desktop sidebar ── */}
            <aside className="hidden lg:block w-56 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-gray-100 p-4 sticky top-20 shadow-sm">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Categories</h2>
                <CategorySidebar />
              </div>
            </aside>

            {/* ── Content ── */}
            <div className="flex-1 min-w-0">

              {/* Mobile categories */}
              {isCatOpen && (
                <div className="lg:hidden mb-4 bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
                  <CategorySidebar mobile />
                </div>
              )}

              {/* Meta row */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  {totalCount > 0 ? (
                    <p className="text-sm text-gray-500">
                      Showing <span className="font-semibold text-gray-800">{startItem}–{endItem}</span> of{' '}
                      <span className="font-semibold text-gray-800">{totalCount}</span> products
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">No products found</p>
                  )}
                </div>
                {(searchQuery || selectedCategory !== 'all') && (
                  <button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setCurrentPage(1); }}
                    className="text-xs text-green-600 hover:text-green-700 font-semibold flex items-center gap-1 px-3 py-1.5 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                    Clear filters
                  </button>
                )}
              </div>

              {/* Refetch spinner */}
              {loading && products.length > 0 && (
                <div className="flex justify-center py-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="w-4 h-4 rounded-full border-2 border-green-200 border-t-green-600 animate-spin" />
                    Updating…
                  </div>
                </div>
              )}

              {/* ── GRID ── */}
              {!loading && products.length > 0 && viewMode === 'grid' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-4">
                  {products.map((product, i) => (
                    <article key={product.id} ref={el => productRefs.current[product.id] = el}
                      onClick={() => openModal(product)}
                      className={`bg-white rounded-2xl border overflow-hidden flex flex-col cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-green-100/50 ${
                        highlightedId === product.id ? 'border-green-500 shadow-xl ring-4 ring-green-100 animate-pulse' : 'border-gray-100 hover:border-green-300'
                      }`}
                      style={{ animation: hasAnimated ? 'none' : `fadeInUp 0.4s ease-out ${i * 0.055}s both` }}>

                      {/* Image */}
                      <div className="relative h-44 flex-shrink-0">
                        <LazyImg src={product.image_url} alt={product.title} className="w-full h-full" fallback={placeholderImage} />
                        {/* Badges */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          {product.category && (
                            <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm text-gray-700 text-[10px] font-semibold rounded-full shadow-sm border border-gray-100">
                              {product.category}
                            </span>
                          )}
                          {product.product_type && (
                            <span className="px-2 py-0.5 bg-green-600/90 backdrop-blur-sm text-white text-[10px] font-semibold rounded-full shadow-sm">
                              {product.product_type}
                            </span>
                          )}
                        </div>
                        {product.display_on_homepage !== false && (
                          <span className="absolute top-2 right-2 w-6 h-6 bg-yellow-400 text-yellow-900 text-[10px] font-black rounded-full flex items-center justify-center shadow">★</span>
                        )}
                        {product.quantity === 0 && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                            <span className="px-3 py-1 bg-white/90 text-gray-800 text-xs font-bold rounded-full shadow">Out of Stock</span>
                          </div>
                        )}
                      </div>

                      {/* Body */}
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="text-sm font-bold text-gray-900 mb-2 line-clamp-2 leading-snug group-hover:text-green-700 transition-colors">{product.title}</h3>
                        <div className="space-y-1 text-xs text-gray-500 flex-1">
                          {product.model  && <p className="truncate"><span className="text-gray-400">Brand</span> · <span className="text-gray-700 font-medium">{product.model}</span></p>}
                          {product.series && <p className="truncate"><span className="text-gray-400">Model</span> · <span className="text-gray-700 font-medium">{product.series}</span></p>}
                          <p><span className="text-gray-400">Stock</span> · <span className={`font-semibold ${product.quantity > 10 ? 'text-green-600' : product.quantity > 0 ? 'text-orange-500' : 'text-red-500'}`}>{product.quantity} units</span></p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                          <p className="text-base font-black text-green-700">₱{parseFloat(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                          <span className="text-[10px] text-gray-400 group-hover:text-green-600 font-medium transition-colors">View →</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {/* ── LIST ── */}
              {!loading && products.length > 0 && viewMode === 'list' && (
                <div className="space-y-3">
                  {products.map((product, i) => (
                    <article key={product.id} ref={el => productRefs.current[product.id] = el}
                      onClick={() => openModal(product)}
                      className={`bg-white rounded-2xl border overflow-hidden cursor-pointer group transition-all duration-200 hover:shadow-lg hover:shadow-green-50 ${
                        highlightedId === product.id ? 'border-green-500 shadow-xl ring-4 ring-green-100 animate-pulse' : 'border-gray-100 hover:border-green-200'
                      }`}
                      style={{ animation: hasAnimated ? 'none' : `fadeInUp 0.35s ease-out ${i * 0.04}s both` }}>
                      <div className="flex">
                        {/* Image */}
                        <div className="relative w-40 sm:w-52 flex-shrink-0">
                          <LazyImg src={product.image_url} alt={product.title} className="w-full h-full min-h-[9rem]" fallback={placeholderImage} />
                          {product.quantity === 0 && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <span className="px-2 py-0.5 bg-white/90 text-gray-800 text-xs font-bold rounded-full">Out of Stock</span>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                              {product.category && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">{product.category}</span>
                              )}
                              {product.product_type && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">{product.product_type}</span>
                              )}
                              {product.display_on_homepage !== false && (
                                <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 text-xs font-medium rounded-full border border-yellow-100">★ Featured</span>
                              )}
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-green-700 transition-colors mb-2 leading-tight">{product.title}</h3>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                              {product.model  && <span>Brand: <span className="font-semibold text-gray-700">{product.model}</span></span>}
                              {product.series && <span>Model: <span className="font-semibold text-gray-700">{product.series}</span></span>}
                              <span>Stock: <span className={`font-semibold ${product.quantity > 10 ? 'text-green-600' : product.quantity > 0 ? 'text-orange-500' : 'text-red-500'}`}>{product.quantity} units</span></span>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-2xl font-black text-green-700">₱{parseFloat(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                            <p className="text-xs text-gray-400 group-hover:text-green-600 font-medium mt-1 transition-colors">View details →</p>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {/* ── Empty ── */}
              {!loading && products.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                    <Package className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-700 mb-1">No products found</h3>
                  <p className="text-sm text-gray-400 mb-4 max-w-xs">
                    {searchQuery || selectedCategory !== 'all' ? 'Try adjusting your filters or search term.' : 'No products available yet.'}
                  </p>
                  {(searchQuery || selectedCategory !== 'all') && (
                    <button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors">
                      Clear all filters
                    </button>
                  )}
                </div>
              )}

              {/* ── Pagination ── */}
              <Pagination current={currentPage} total={totalPages} onChange={handlePageChange} />
            </div>
          </div>
        </div>
      </div>

      {selectedProduct && <ProductListModal product={selectedProduct} onClose={closeModal} />}

      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out both; }
      `}</style>
    </>
  );
};

export default ProductList;