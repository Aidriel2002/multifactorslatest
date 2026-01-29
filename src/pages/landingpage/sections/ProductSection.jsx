import { useState, useEffect, useRef } from 'react';
import { productAPI } from '../../../lib/supabase';
import placeholderImage from '../images/multifactorslogo.jpg';

const ProductSection = () => {
  const [titleVisible, setTitleVisible] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const sectionRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const subscription = productAPI.subscribeToChanges((payload) => {
      console.log('ProductSection - Real-time update:', payload);
      
      if (payload.eventType === 'INSERT') {
        // Reload products to maintain proper order/randomization
        loadProducts();
      } else if (payload.eventType === 'UPDATE') {
        setProducts(prev => {
          const updated = prev.map(p => 
            p.id === payload.new.id ? payload.new : p
          );
          // If the selected product was updated, update it
          if (selectedProduct?.id === payload.new.id) {
            setSelectedProduct(payload.new);
          }
          return updated;
        });
      } else if (payload.eventType === 'DELETE') {
        setProducts(prev => {
          const filtered = prev.filter(p => p.id !== payload.old.id);
          // If the selected product was deleted, select the first available product
          if (selectedProduct?.id === payload.old.id) {
            setSelectedProduct(filtered.length > 0 ? filtered[0] : null);
          }
          return filtered;
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedProduct]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productAPI.getAll();
      console.log('ProductSection - Loaded products:', data);
      setProducts(data);
      
      // Only set selected product if there isn't one already
      if (!selectedProduct && data.length > 0) {
        const displayProducts = getDisplayProductsFromData(data);
        if (displayProducts.length > 0) {
          setSelectedProduct(displayProducts[0]);
        }
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const titleObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTitleVisible(true);
          }
        });
      },
      { threshold: 0.3 }
    );

    if (titleRef.current) {
      titleObserver.observe(titleRef.current);
    }

    return () => {
      titleObserver.disconnect();
    };
  }, []);

  // Helper function to get display products from any product array
  const getDisplayProductsFromData = (productList) => {
    if (productList.length === 0) return [];
    
    // Filter products that should be displayed
    const displayableProducts = productList.filter(p => p.display_on_homepage !== false);
    
    // Check if any products have display_order set
    const hasDisplayOrder = displayableProducts.some(p => p.display_order !== null && p.display_order !== undefined);
    
    if (hasDisplayOrder) {
      // Sort by display_order (null/undefined goes to end)
      return displayableProducts
        .sort((a, b) => {
          const orderA = a.display_order ?? Number.MAX_SAFE_INTEGER;
          const orderB = b.display_order ?? Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        })
        .slice(0, 5);
    } else {
      // Randomize if no display_order is set
      return [...displayableProducts]
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);
    }
  };

  // Get display products (up to 5, based on display_order or randomized)
  const getDisplayProducts = () => {
    return getDisplayProductsFromData(products);
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
  };

  const displayProducts = getDisplayProducts();

  return (
    <section id="products" className="py-20 px-4 md:px-8 bg-gray-50" ref={sectionRef}>
      <div className="max-w-7xl mx-auto">
        <h2 
          ref={titleRef}
          className={`text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12 transform transition-all duration-1000 ${
            titleVisible 
              ? 'translate-y-0 opacity-100' 
              : 'translate-y-10 opacity-0'
          }`}
        >
          Products
        </h2>
        
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-xl">No products available yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Main Product Display */}
            {selectedProduct && (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="grid md:grid-cols-2 gap-8 p-8">
                  {/* Left Side - Large Image */}
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg overflow-hidden aspect-square flex items-center justify-center">
                      <img 
                        src={selectedProduct.image || placeholderImage} 
                        alt={selectedProduct.title}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.src = placeholderImage;
                        }}
                      />
                    </div>
                    
                    {/* Product List - Other Products */}
                    {displayProducts.length > 1 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                          Other Products
                        </h4>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {displayProducts
                            .filter(p => p.id !== selectedProduct.id)
                            .map((product) => (
                              <button
                                key={product.id}
                                onClick={() => handleProductSelect(product)}
                                className="flex-shrink-0 group"
                              >
                                <div className="w-24 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-green-600 transition-all duration-200 hover:shadow-md">
                                  <div className="aspect-square bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center overflow-hidden">
                                    <img 
                                      src={product.image || placeholderImage} 
                                      alt={product.title}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                      onError={(e) => {
                                        e.target.src = placeholderImage;
                                      }}
                                    />
                                  </div>
                                  <div className="p-2 bg-white">
                                    <p className="text-xs font-medium text-gray-900 truncate">
                                      {product.title}
                                    </p>
                                    <p className="text-xs text-green-600 font-semibold">
                                      ₱{parseFloat(product.price).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Side - Product Details */}
                  <div className="flex flex-col justify-between">
                    <div className="space-y-4">
                      <h3 className="text-3xl font-bold text-gray-900">{selectedProduct.title}</h3>
                      
                      <p className="text-gray-600 text-lg leading-relaxed">
                        {selectedProduct.description}
                      </p>

                      <div className="space-y-3 pt-4">
                        {selectedProduct.model && (
                          <div className="flex items-center justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-500 font-medium">Model:</span>
                            <span className="text-gray-900 font-semibold">{selectedProduct.model}</span>
                          </div>
                        )}

                        {selectedProduct.series && (
                          <div className="flex items-center justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-500 font-medium">Series:</span>
                            <span className="text-gray-900 font-semibold">{selectedProduct.series}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-500 font-medium">Availability:</span>
                          <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                            selectedProduct.quantity > 0 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {selectedProduct.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>

                        {selectedProduct.price && (
                          <div className="flex items-center justify-between py-3 mt-4">
                            <span className="text-gray-500 font-medium text-lg">Price:</span>
                            <span className="text-3xl font-bold text-green-600">
                              ₱{parseFloat(selectedProduct.price).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductSection;