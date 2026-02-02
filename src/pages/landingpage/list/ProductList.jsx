import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productAPI } from '../../../lib/supabase';
import { Search, Grid, List, Package, ChevronDown, Filter } from 'lucide-react';
import ProductListModal from '../components/ProductListModal';
import Navigation from '../layouts/Navigation';
import Header from '../layouts/Header';

const ProductList = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [highlightedProductId, setHighlightedProductId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const productRefs = useRef({});

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const productId = searchParams.get('product');
    if (productId && products.length > 0) {
      setHighlightedProductId(productId);
      
      setTimeout(() => {
        const productElement = productRefs.current[productId];
        if (productElement) {
          productElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 500);

      setTimeout(() => {
        setHighlightedProductId(null);
      }, 3500);
    }
  }, [searchParams, products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productAPI.getAll();
      setProducts(data);
      setTimeout(() => setHasAnimated(true), 100);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUniqueCategories = () => {
    const categories = products
      .map(p => p.category)
      .filter(c => c && c.trim() !== '');
    return [...new Set(categories)].sort();
  };

  const getFilteredProducts = () => {
    let filtered = products;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        (p.model && p.model.toLowerCase().includes(query)) ||
        (p.series && p.series.toLowerCase().includes(query)) ||
        (p.category && p.category.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  const getCategoryCount = (category) => {
    return products.filter(p => p.category === category).length;
  };

  const openProductModal = (product) => {
    setSelectedProduct(product);
    document.body.style.overflow = 'hidden';
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
    document.body.style.overflow = 'unset';
  };

  const filteredProducts = getFilteredProducts();
  const uniqueCategories = getUniqueCategories();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-700 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <Navigation />
      <div className="min-h-screen bg-gray-50 p-10">
        <div className="bg-white border-b">
          <div className="max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Products</h1>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="relative flex-1 max-w-xl w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                  className="lg:hidden p-2 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                  aria-label="Filter categories"
                >
                  <Filter className="w-5 h-5 text-gray-600" />
                </button>
                
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                    aria-label="Grid view"
                  >
                    <Grid className={`w-5 h-5 ${viewMode === 'grid' ? 'text-green-600' : 'text-gray-500'}`} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                    aria-label="List view"
                  >
                    <List className={`w-5 h-5 ${viewMode === 'list' ? 'text-green-600' : 'text-gray-500'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-8">
            <aside className="categories-sidebar">
              <div className="bg-white rounded-lg border border-gray-200 p-5 sticky top-4 w-full">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Categories</h2>
                
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-green-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>All Products</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedCategory === 'all'
                        ? 'bg-green-700 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {products.length}
                    </span>
                  </button>

                  {uniqueCategories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                        selectedCategory === category
                          ? 'bg-green-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span>{category}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedCategory === category
                          ? 'bg-green-700 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {getCategoryCount(category)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <div className="flex-1">
              {isCategoriesOpen && (
                <div className="lg:hidden mb-4 bg-white rounded-lg border border-gray-200 p-3 space-y-1">
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setIsCategoriesOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-green-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>All Products</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedCategory === 'all'
                        ? 'bg-green-700 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {products.length}
                    </span>
                  </button>

                  {uniqueCategories.map((category) => (
                    <button
                      key={category}
                      onClick={() => {
                        setSelectedCategory(category);
                        setIsCategoriesOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                        selectedCategory === category
                          ? 'bg-green-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span>{category}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedCategory === category
                          ? 'bg-green-700 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {getCategoryCount(category)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-semibold text-gray-900">{filteredProducts.length}</span> products
                </p>
                {(searchQuery || selectedCategory !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    Clear all filters
                  </button>
                )}
              </div>

              {filteredProducts.length > 0 ? (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full">
                    {filteredProducts.map((product, index) => (
                      <div
                        key={product.id}
                        ref={el => productRefs.current[product.id] = el}
                        onClick={() => openProductModal(product)}
                        className={`bg-white rounded-lg border-2 hover:border-green-500 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col cursor-pointer ${
                          highlightedProductId === product.id 
                            ? 'border-green-500 shadow-2xl ring-4 ring-green-200 animate-pulse' 
                            : 'border-gray-200'
                        }`}
                        style={{
                          animation: hasAnimated ? 'none' : `fadeInUp 0.5s ease-out ${index * 0.05}s both`
                        }}
                      >
                        <div className="relative w-full h-32 bg-gray-100 overflow-hidden group">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.title}
                              className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 p-2"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f3f4f6" width="200" height="200"/%3E%3C/svg%3E';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-12 h-12 text-gray-300" />
                            </div>
                          )}
                          {product.display_on_homepage !== false && (
                            <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-yellow-400 text-yellow-900 text-[10px] font-bold rounded shadow">
                              ★
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center">
                            <span className="text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              View
                            </span>
                          </div>
                        </div>

                        <div className="p-3 flex flex-col flex-1">
                          <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem]">
                            {product.title}
                          </h3>

                          <div className="space-y-1 mb-2 text-xs flex-1">
                            {product.model && (
                              <p className="text-gray-600 truncate">
                                <span className="font-medium">Brand:</span> {product.model}
                              </p>
                            )}
                            {product.series && (
                              <p className="text-gray-600 truncate">
                                <span className="font-medium">Model:</span> {product.series}
                              </p>
                            )}
                            <p className="text-gray-600">
                              <span className="font-medium">Stock:</span>{' '}
                              <span className={product.quantity > 10 ? 'text-green-600' : 'text-orange-600'}>
                                {product.quantity}
                              </span>
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
                ) : (
                  <div className="space-y-4">
                    {filteredProducts.map((product, index) => (
                      <div
                        key={product.id}
                        ref={el => productRefs.current[product.id] = el}
                        onClick={() => openProductModal(product)}
                        className={`bg-white rounded-lg border-2 hover:border-green-500 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer ${
                          highlightedProductId === product.id 
                            ? 'border-green-500 shadow-2xl ring-4 ring-green-200 animate-pulse' 
                            : 'border-gray-200'
                        }`}
                        style={{
                          animation: hasAnimated ? 'none' : `fadeInUp 0.5s ease-out ${index * 0.05}s both`
                        }}
                      >
                        <div className="flex flex-col sm:flex-row">
                          <div className="relative w-full sm:w-48 h-48 bg-gray-100 flex-shrink-0 group">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.title}
                                className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f3f4f6" width="200" height="200"/%3E%3C/svg%3E';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-16 h-16 text-gray-300" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center">
                              <span className="text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                View Details
                              </span>
                            </div>
                          </div>

                          <div className="flex-1 p-5">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <h3 className="text-xl font-semibold text-gray-900">
                                    {product.title}
                                  </h3>
                                  {product.category && (
                                    <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                                      {product.category}
                                    </span>
                                  )}
                                  {product.display_on_homepage !== false && (
                                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                                      ★ Featured
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                  {product.model && (
                                    <span>Brand: <span className="font-medium">{product.model}</span></span>
                                  )}
                                  {product.series && (
                                    <span>Model: <span className="font-medium">{product.series}</span></span>
                                  )}
                                  <span>
                                    Stock:{' '}
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
                )
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchQuery || selectedCategory !== 'all'
                      ? 'Try adjusting your search or category filter'
                      : 'No products available'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedProduct && (
        <ProductListModal 
          product={selectedProduct} 
          onClose={closeProductModal} 
        />
      )}

      <style jsx>{`
        .categories-sidebar {
          display: none;
          width: 256px;
          flex-shrink: 0;
        }

        @media (min-width: 1024px) {
          .categories-sidebar {
            display: block;
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default ProductList;