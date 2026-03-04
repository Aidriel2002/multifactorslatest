import { useState, useEffect, useCallback, useRef } from 'react';
import { productAPI, ADMIN_PAGE_SIZE } from '../../lib/supabase';
import ProductModal from './components/ProductModal';
import { usePageSecurity } from '../../hooks/usePageSecurity';
import { canManageProducts } from '../../utils/rbac';
import LandingSideBar from './components/LandingSideBar';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

const PAGE_SIZE = ADMIN_PAGE_SIZE; // 6 per page

const ManageProduct = () => {
  // ── Paginated data ─────────────────────────────────────────────────────────
  const [products, setProducts]         = useState([]);
  const [totalCount, setTotalCount]     = useState(0);
  const [totalPages, setTotalPages]     = useState(1);
  const [currentPage, setCurrentPage]   = useState(1);
  const [loading, setLoading]           = useState(true);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]       = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [homepageFilter, setHomepageFilter] = useState('all'); // 'all' | 'homepage' | 'not-homepage'
  const [allCategories, setAllCategories]   = useState([]);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving]                 = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage]     = useState('');

  // ── Homepage total count (separate lightweight query) ─────────────────────
  const [homepageCount, setHomepageCount] = useState(0);

  const { loading: securityLoading } = usePageSecurity(canManageProducts);
  const searchTimeout = useRef(null);

  // ── Load page ──────────────────────────────────────────────────────────────
  const loadPage = useCallback(async (page, category, search, hpFilter) => {
    try {
      setLoading(true);

      // Build category param; for homepage filters we pass through and filter via the API
      const catParam   = category !== 'all' ? category : undefined;
      const searchParam = search || undefined;

      // For homepage filtering we still use getPaginated but add homepage flag
      // (handled by calling getAll just for the homepage sub-filter — only when needed)
      let result;
      if (hpFilter === 'homepage') {
        // Fetch homepage=true products paginated
        result = await productAPI.getPaginated({
          page, pageSize: PAGE_SIZE,
          category: catParam, search: searchParam,
          homepageOnly: true,
        });
      } else if (hpFilter === 'not-homepage') {
        result = await productAPI.getPaginated({
          page, pageSize: PAGE_SIZE,
          category: catParam, search: searchParam,
          homepageOnly: false,
        });
      } else {
        result = await productAPI.getPaginated({
          page, pageSize: PAGE_SIZE,
          category: catParam, search: searchParam,
        });
      }

      setProducts(result.data);
      setTotalCount(result.count);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error('Error loading products:', err);
      setErrorMessage('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load categories once (tiny payload)
  const loadCategories = useCallback(async () => {
    const cats = await productAPI.getCategories();
    setAllCategories(cats);
  }, []);

  // Load homepage count once (tiny count query)
  const loadHomepageCount = useCallback(async () => {
    try {
      const { count } = await productAPI.getPaginated({ page: 1, pageSize: 1, homepageOnly: true });
      setHomepageCount(count);
    } catch { /* ignore */ }
  }, []);

  // Initial
  useEffect(() => {
    loadCategories();
    loadHomepageCount();
  }, [loadCategories, loadHomepageCount]);

  // Re-fetch on page / filter changes
  useEffect(() => {
    loadPage(currentPage, categoryFilter, searchQuery, homepageFilter);
  }, [currentPage, categoryFilter, homepageFilter]); // eslint-disable-line

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setCurrentPage(1);
      loadPage(1, categoryFilter, searchQuery, homepageFilter);
    }, 350);
    return () => clearTimeout(searchTimeout.current);
  }, [searchQuery]); // eslint-disable-line

  // Real-time subscription — only refreshes current page (not full table)
  useEffect(() => {
    const subscription = productAPI.subscribeToChanges((payload) => {
      // Optimistic local update for INSERT/UPDATE/DELETE to avoid a full reload
      if (payload.eventType === 'INSERT') {
        loadPage(currentPage, categoryFilter, searchQuery, homepageFilter);
        loadHomepageCount();
      } else if (payload.eventType === 'UPDATE') {
        setProducts(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
        loadHomepageCount();
      } else if (payload.eventType === 'DELETE') {
        setProducts(prev => prev.filter(p => p.id !== payload.old.id));
        setTotalCount(prev => Math.max(0, prev - 1));
        loadHomepageCount();
      }
    });
    return () => subscription.unsubscribe();
  }, [currentPage, categoryFilter, searchQuery, homepageFilter, loadPage, loadHomepageCount]);

  // ── Modal handlers ─────────────────────────────────────────────────────────
  const openModal = (product = null) => {
    setEditingProduct(product);
    setIsModalOpen(true);
    setErrorMessage('');
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setSaving(false);
  };
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleSubmit = async (productData) => {
    try {
      setSaving(true);
      setErrorMessage('');
      if (editingProduct) {
        await productAPI.update(editingProduct.id, productData);
        showSuccess('Product updated successfully!');
      } else {
        await productAPI.create(productData);
        showSuccess('Product added successfully!');
      }
      closeModal();
      loadPage(currentPage, categoryFilter, searchQuery, homepageFilter);
      loadHomepageCount();
    } catch (err) {
      console.error('Error saving product:', err);
      setErrorMessage(err.message || 'Failed to save product. Please try again.');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productAPI.delete(id);
        showSuccess('Product deleted successfully!');
        // If this was the last item on the page, go back one page
        const newTotal = totalCount - 1;
        const newTotalPages = Math.ceil(newTotal / PAGE_SIZE);
        const newPage = currentPage > newTotalPages ? Math.max(1, newTotalPages) : currentPage;
        setCurrentPage(newPage);
        loadPage(newPage, categoryFilter, searchQuery, homepageFilter);
        loadHomepageCount();
      } catch (err) {
        console.error('Error deleting product:', err);
        setErrorMessage('Failed to delete product. Please try again.');
      }
    }
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setHomepageFilter('all');
    setCurrentPage(1);
  };

  // ── Pagination pages array ─────────────────────────────────────────────────
  const getPaginationPages = () => {
    const delta = 1;
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

  const notHomepageCount = totalCount - homepageCount; // approx

  if (loading && products.length === 0 || securityLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <LandingSideBar />

      <div className="flex-1 ml-0 overflow-y-auto">
        {/* ── Header ── */}
        <div className="bg-white shadow">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manage Products</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Homepage products:{' '}
                  <span className={`font-semibold ${homepageCount >= 5 ? 'text-red-600' : 'text-green-600'}`}>
                    {homepageCount}/5
                  </span>
                  {homepageCount >= 5 && <span className="text-red-600 ml-2">● Maximum reached</span>}
                </p>
              </div>
              <button
                onClick={() => openModal()}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
              >
                + Add New Product
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          {/* ── Search + Category Filter ── */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Products</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, model, series, or category..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                >
                  <option value="all">All Categories</option>
                  {allCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Tab Filter ── */}
          <div className="mb-6 border-b border-gray-200">
            <div className="flex space-x-8">
              {[
                { key: 'all',          label: `All Products (${totalCount})` },
                { key: 'homepage',     label: `On Homepage (${homepageCount})` },
                { key: 'not-homepage', label: `Not on Homepage` },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setHomepageFilter(key); setCurrentPage(1); }}
                  className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    homepageFilter === key
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Messages ── */}
          {errorMessage && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage('')} className="text-red-700 hover:text-red-900 font-bold">×</button>
            </div>
          )}
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{successMessage}</span>
              </div>
              <button onClick={() => setSuccessMessage('')} className="text-green-700 hover:text-green-900 font-bold">×</button>
            </div>
          )}

          {/* ── Result info ── */}
          {!loading && (
            <div className="mb-3 flex items-center justify-between">
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
              {(searchQuery || categoryFilter !== 'all' || homepageFilter !== 'all') && (
                <button onClick={clearFilters} className="text-sm text-green-600 hover:text-green-700 font-medium">
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* ── Loading overlay ── */}
          {loading && products.length > 0 && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          )}

          {/* ── Table ── */}
          {products.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Title', 'Category', 'Brand', 'Model', 'Quantity', 'Price', 'Homepage', 'Actions'].map(h => (
                        <th key={h} className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : 'text-left'}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{product.title}</div>
                          {product.display_order && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                              Order #{product.display_order}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {product.category ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {product.category}
                            </span>
                          ) : <span className="text-sm text-gray-400">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.model || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.series || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                          ₱{parseFloat(product.price).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            product.display_on_homepage !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {product.display_on_homepage !== false ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={() => openModal(product)} className="text-blue-600 hover:text-blue-900 mr-4">Edit</button>
                          <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-900">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination ── */}
              {totalPages > 1 && (
                <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                  <p className="text-sm text-gray-500">Page {currentPage} of {totalPages}</p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {getPaginationPages().map((page, i) =>
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
                </div>
              )}
            </div>
          ) : (
            !loading && (
              <div className="text-center py-20 bg-white rounded-lg">
                <p className="text-gray-500 text-xl">
                  {searchQuery || categoryFilter !== 'all' || homepageFilter !== 'all'
                    ? 'No products match your current filters.'
                    : 'No products yet. Click "Add New Product" to get started.'}
                </p>
                {(searchQuery || categoryFilter !== 'all' || homepageFilter !== 'all') && (
                  <button onClick={clearFilters} className="mt-4 text-green-600 hover:text-green-700 font-medium">
                    Clear all filters
                  </button>
                )}
              </div>
            )
          )}
        </div>

        <ProductModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSubmit={handleSubmit}
          editingProduct={editingProduct}
          products={products}
          saving={saving}
          homepageCount={homepageCount}
        />
      </div>
    </div>
  );
};

export default ManageProduct;