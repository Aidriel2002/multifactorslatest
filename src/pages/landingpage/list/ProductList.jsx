import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productAPI, DEFAULT_PAGE_SIZE } from '../../../lib/supabase';
import { Search, Grid, List, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductListModal from '../components/ProductListModal';
import Navigation from '../layouts/Navigation';
import Header from '../layouts/Header';
import placeholderImage from '../images/multifactorslogo.jpg';

const PAGE_SIZE = DEFAULT_PAGE_SIZE; // 6 per page

// ─── Simple LRU-style in-memory page cache ────────────────────────────────────
// Prevents re-fetching pages the user already visited in this session.
// Cache is already managed in supabase.js (5-min TTL), but this avoids even
// the cache-read overhead on instant back-navigation.
const pageCache = new Map();

function buildCacheKey(page, category, search) {
  return `p${page}|c${category}|q${search}`;
}

// ─── Image lazy-load with intersection observer ───────────────────────────────
// Only loads images when they enter the viewport — avoids downloading all 6
// images eagerly when some are below the fold.
function LazyImage({ src, alt, className, fallback }) {
  const imgRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState('');

  useEffect(() => {
    if (!src) { setImgSrc(fallback); return; }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImgSrc(src);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [src, fallback]);

  return (
    <div ref={imgRef} className={`${className} bg-gray-100`}>
      {imgSrc && (
        <img
          src={imgSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-110 transition-transform duration-300`}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={(e) => { e.target.src = fallback; setLoaded(true); }}
        />
      )}
    </div>
  );
}

const ProductList = () => {
  const [searchParams] = useSearchParams();

  // ── Server-driven state ────────────────────────────────────────────────────
  const [products, setProducts]         = useState([]);
  const [totalCount, setTotalCount]     = useState(0);
  const [totalPages, setTotalPages]     = useState(1);
  const [currentPage, setCurrentPage]   = useState(1);
  const [loading, setLoading]           = useState(true);

  // ── Filter / UI state ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]         = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [allCategories, setAllCategories]     = useState([]);
  const [viewMode, setViewMode]               = useState('grid');
  const [highlightedProductId, setHighlightedProductId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [hasAnimated, setHasAnimated]         = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  const productRefs   = useRef({});
  const searchTimeout = useRef(null);

  // ── Load page (with in-memory cache bypass) ───────────────────────────────
  const loadPage = useCallback(async (page, category, search, skipCache = false) => {
    const cacheKey = buildCacheKey(page, category, search);

    if (!skipCache && pageCache.has(cacheKey)) {
      const cached = pageCache.get(cacheKey);
      setProducts(cached.data);
      setTotalCount(cached.count);
      setTotalPages(cached.totalPages);
      setLoading(false);
      setHasAnimated(false);
      setTimeout(() => setHasAnimated(true), 50);
      return;
    }

    try {
      setLoading(true);
      const result = await productAPI.getPaginated({
        page,
        pageSize: PAGE_SIZE,
        category: category !== 'all' ? category : undefined,
        search: search || undefined,
      });

      // Store in local session cache
      pageCache.set(cacheKey, result);
      // Limit cache size to avoid memory bloat
      if (pageCache.size > 50) {
        const firstKey = pageCache.keys().next().value;
        pageCache.delete(firstKey);
      }

      setProducts(result.data);
      setTotalCount(result.count);
      setTotalPages(result.totalPages);
      setHasAnimated(false);
      setTimeout(() => setHasAnimated(true), 100);
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load categories once – tiny payload (category column only) ────────────
  const loadCategories = useCallback(async () => {
    const cats = await productAPI.getCategories();
    setAllCategories(cats);
  }, []);

  // ── Initial ────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // ── Re-fetch when page / category changes ─────────────────────────────────
  useEffect(() => {
    loadPage(currentPage, selectedCategory, searchQuery);
  }, [currentPage, selectedCategory]); // eslint-disable-line

  // ── Debounced search ───────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setCurrentPage(1);
      loadPage(1, selectedCategory, searchQuery);
    }, 350);
    return () => clearTimeout(searchTimeout.current);
  }, [searchQuery]); // eslint-disable-line

  // ── Real-time subscription – busts local cache and refreshes current page ─
  useEffect(() => {
    const subscription = productAPI.subscribeToChanges(() => {
      pageCache.clear(); // Invalidate all cached pages on any remote mutation
      loadPage(currentPage, selectedCategory, searchQuery, true);
    });
    return () => subscription.unsubscribe();
  }, [currentPage, selectedCategory, searchQuery, loadPage]);

  // ── Deep-link highlight ────────────────────────────────────────────────────
  useEffect(() => {
    const productId = searchParams.get('product');
    if (productId && products.length > 0) {
      setHighlightedProductId(productId);
      setTimeout(() => {
        productRefs.current[productId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
      setTimeout(() => setHighlightedProductId(null), 3500);
    }
  }, [searchParams, products]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const openProductModal = (product) => {
    setSelectedProduct(product);
    document.body.style.overflow = 'hidden';
  };
  const closeProductModal = () => {
    setSelectedProduct(null);
    document.body.style.overflow = 'unset';
  };
  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
    setIsCategoriesOpen(false);
  };
  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPaginationPages = () => {
    const delta = 2;
    const pages = [];
    const left  = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);
    pages.push(1);
    if (left > 2) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };

  // ── Sub-components ─────────────────────────────────────────────────────────
  const CategorySidebar = ({ mobile = false }) => (
    <div className={mobile ? 'p-3 space-y-1' : 'space-y-1'}>
      <button
        onClick={() => handleCategoryChange('all')}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
          selectedCategory === 'all' ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <span>All Products</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${selectedCategory === 'all' ? 'bg-green-700 text-white' : 'bg-gray-200 text-gray-600'}`}>
          {totalCount}
        </span>
      </button>
      {allCategories.map((cat) => (
        <button
          key={cat}
          onClick={() => handleCategoryChange(cat)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
            selectedCategory === cat ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <span>{cat}</span>
        </button>
      ))}
    </div>
  );

  const Pagination = () => {
    if (totalPages <= 1) return null;
    const pages = getPaginationPages();
    return (
      <div className="flex items-center justify-center gap-1 mt-8">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((page, i) =>
          page === '...' ? (
            <span key={`e${i}`} className="px-3 py-2 text-gray-400 text-sm">…</span>
          ) : (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                currentPage === page
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          )
        )}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  };

  // ── Initial full-screen loader ─────────────────────────────────────────────
  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-700 mx-auto" />
          <p className="mt-4 text-gray-600 font-medium">Loading products...</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Header />
      <Navigation />

      <div className="min-h-screen bg-gray-50 p-10">
        {/* ── Top search bar ── */}
        <div className="bg-white border-b">
          <div className="max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Products</h1>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="search-bar-wrapper">
                <Search className="search-icon" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="search-input"
                />
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                  className="lg:hidden p-2 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <Filter className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                  <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}>
                    <Grid className={`w-5 h-5 ${viewMode === 'grid' ? 'text-green-600' : 'text-gray-500'}`} />
                  </button>
                  <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}>
                    <List className={`w-5 h-5 ${viewMode === 'list' ? 'text-green-600' : 'text-gray-500'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-8">
            {/* ── Desktop category sidebar ── */}
            <aside className="categories-sidebar">
              <div className="bg-white rounded-lg border border-gray-200 p-5 sticky top-4 w-full">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Categories</h2>
                <CategorySidebar />
              </div>
            </aside>

            {/* ── Main content ── */}
            <div className="flex-1 min-w-0">
              {/* Mobile categories */}
              {isCategoriesOpen && (
                <div className="lg:hidden mb-4 bg-white rounded-lg border border-gray-200">
                  <CategorySidebar mobile />
                </div>
              )}

              {/* Result count */}
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {totalCount === 0 ? 'No products found' : (
                    <>
                      Showing{' '}
                      <span className="font-semibold text-gray-900">
                        {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount)}
                      </span>{' '}
                      of <span className="font-semibold text-gray-900">{totalCount}</span> products
                    </>
                  )}
                </p>
                {(searchQuery || selectedCategory !== 'all') && (
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setCurrentPage(1); }}
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    Clear all filters
                  </button>
                )}
              </div>

              {/* Loading spinner overlay on re-fetch */}
              {loading && products.length > 0 && (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
                </div>
              )}

              {/* ── Grid view ── */}
              {!loading && products.length > 0 && viewMode === 'grid' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-3 gap-4 w-full">
                  {products.map((product, index) => (
                    <div
                      key={product.id}
                      ref={(el) => (productRefs.current[product.id] = el)}
                      onClick={() => openProductModal(product)}
                      className={`bg-white rounded-lg border-2 hover:border-green-500 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col cursor-pointer ${
                        highlightedProductId === product.id
                          ? 'border-green-500 shadow-2xl ring-4 ring-green-200 animate-pulse'
                          : 'border-gray-200'
                      }`}
                      style={{ animation: hasAnimated ? 'none' : `fadeInUp 0.4s ease-out ${index * 0.06}s both` }}
                    >
                      <div className="relative w-full h-40 overflow-hidden group">
                        <LazyImage
                          src={product.image_url}
                          alt={product.title}
                          className="w-full h-full"
                          fallback={placeholderImage}
                        />
                        {product.display_on_homepage !== false && (
                          <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-yellow-400 text-yellow-900 text-[10px] font-bold rounded shadow">★</span>
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem]">{product.title}</h3>
                        <div className="space-y-1 mb-2 text-xs flex-1">
                          {product.model  && <p className="text-gray-600 truncate"><span className="font-medium">Brand:</span> {product.model}</p>}
                          {product.series && <p className="text-gray-600 truncate"><span className="font-medium">Model:</span> {product.series}</p>}
                          <p className="text-gray-600">
                            <span className="font-medium">Stock:</span>{' '}
                            <span className={product.quantity > 10 ? 'text-green-600' : 'text-orange-600'}>{product.quantity}</span>
                          </p>
                        </div>
                        <div className="pt-2 border-t border-gray-100 mt-auto">
                          <p className="text-sm font-bold text-green-700">
                            ₱{parseFloat(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── List view ── */}
              {!loading && products.length > 0 && viewMode === 'list' && (
                <div className="space-y-4">
                  {products.map((product, index) => (
                    <div
                      key={product.id}
                      ref={(el) => (productRefs.current[product.id] = el)}
                      onClick={() => openProductModal(product)}
                      className={`bg-white rounded-lg border-2 hover:border-green-500 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer ${
                        highlightedProductId === product.id
                          ? 'border-green-500 shadow-2xl ring-4 ring-green-200 animate-pulse'
                          : 'border-gray-200'
                      }`}
                      style={{ animation: hasAnimated ? 'none' : `fadeInUp 0.4s ease-out ${index * 0.06}s both` }}
                    >
                      <div className="flex flex-col sm:flex-row">
                        <div className="relative w-full sm:w-48 h-48 flex-shrink-0 overflow-hidden group">
                          <LazyImage
                            src={product.image_url}
                            alt={product.title}
                            className="w-full h-full"
                            fallback={placeholderImage}
                          />
                        </div>
                        <div className="flex-1 p-5">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <h3 className="text-xl font-semibold text-gray-900">{product.title}</h3>
                                {product.category && (
                                  <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">{product.category}</span>
                                )}
                                {product.display_on_homepage !== false && (
                                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">★ Featured</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                {product.model  && <span>Brand: <span className="font-medium">{product.model}</span></span>}
                                {product.series && <span>Model: <span className="font-medium">{product.series}</span></span>}
                                <span>Stock:{' '}
                                  <span className={`font-medium ${product.quantity > 10 ? 'text-green-600' : 'text-orange-600'}`}>
                                    {product.quantity} units
                                  </span>
                                </span>
                              </div>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="text-3xl font-bold text-green-700">
                                ₱{parseFloat(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Empty state ── */}
              {!loading && products.length === 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
                  <p className="text-gray-500">
                    {searchQuery || selectedCategory !== 'all'
                      ? 'Try adjusting your search or category filter'
                      : 'No products available'}
                  </p>
                </div>
              )}

              {/* ── Pagination ── */}
              <Pagination />
              {totalPages > 1 && (
                <p className="text-center text-sm text-gray-500 mt-3">
                  Page {currentPage} of {totalPages}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedProduct && <ProductListModal product={selectedProduct} onClose={closeProductModal} />}

      <style>{`
        .search-bar-wrapper { position: relative; flex: 1; max-width: 42rem; width: 100%; }
        .search-icon { position: absolute; left: .75rem; top: 50%; transform: translateY(-50%); color: #9ca3af; width: 1.25rem; height: 1.25rem; pointer-events: none; }
        .search-input { width: 100%; padding: .625rem 1rem .625rem 2.5rem; border: 1px solid #d1d5db; border-radius: .5rem; outline: none; transition: all .2s; font-size: 1rem; }
        .search-input:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.1); }
        .search-input::placeholder { color: #9ca3af; }
        .categories-sidebar { display: none; width: 256px; flex-shrink: 0; }
        @media (min-width: 1024px) { .categories-sidebar { display: block; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
};

export default ProductList;