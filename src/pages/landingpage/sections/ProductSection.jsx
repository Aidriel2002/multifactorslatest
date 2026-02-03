import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { productAPI } from '../../../lib/supabase';
import placeholderImage from '../images/multifactorslogo.jpg';

const ProductSection = () => {
  const navigate = useNavigate();
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
      if (payload.eventType === 'INSERT') {
        loadProducts();
      } else if (payload.eventType === 'UPDATE') {
        setProducts(prev => {
          const updated = prev.map(p => 
            p.id === payload.new.id ? payload.new : p
          );
          if (selectedProduct?.id === payload.new.id) {
            setSelectedProduct(payload.new);
          }
          return updated;
        });
      } else if (payload.eventType === 'DELETE') {
        setProducts(prev => {
          const filtered = prev.filter(p => p.id !== payload.old.id);
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
      setProducts(data);
      
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

  const getDisplayProductsFromData = (productList) => {
    if (productList.length === 0) return [];
    
    const displayableProducts = productList.filter(p => p.display_on_homepage !== false);
    
    const hasDisplayOrder = displayableProducts.some(p => p.display_order !== null && p.display_order !== undefined);
    
    if (hasDisplayOrder) {
      return displayableProducts
        .sort((a, b) => {
          const orderA = a.display_order ?? Number.MAX_SAFE_INTEGER;
          const orderB = b.display_order ?? Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        })
        .slice(0, 5);
    } else {
      return [...displayableProducts]
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);
    }
  };

  const getDisplayProducts = () => {
    return getDisplayProductsFromData(products);
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
  };

  const handleReadMore = () => {
    navigate(`/productlist?product=${selectedProduct.id}`);
  };

  const formatPrice = (price) => {
    const num = parseFloat(price);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getPlainText = (html) => {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  const truncateHTML = (html, maxLength = 300) => {
    if (!html) return { html: '', needsReadMore: false };
    
    const plainText = getPlainText(html);
    
    if (plainText.length <= maxLength) {
      return { html: html, needsReadMore: false };
    }
    
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    let currentLength = 0;
    let truncated = false;
    
    const truncateNode = (node) => {
      if (truncated) return;
      
      if (node.nodeType === Node.TEXT_NODE) {
        const textContent = node.textContent || '';
        if (currentLength + textContent.length > maxLength) {
          const remaining = maxLength - currentLength;
          node.textContent = textContent.substring(0, remaining) + '...';
          truncated = true;
        } else {
          currentLength += textContent.length;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const childNodes = Array.from(node.childNodes);
        for (let child of childNodes) {
          truncateNode(child);
          if (truncated) {
            while (child.nextSibling) {
              node.removeChild(child.nextSibling);
            }
            break;
          }
        }
      }
    };
    
    const childNodes = Array.from(temp.childNodes);
    for (let child of childNodes) {
      truncateNode(child);
      if (truncated) {
        while (child.nextSibling) {
          temp.removeChild(child.nextSibling);
        }
        break;
      }
    }
    
    return { html: temp.innerHTML, needsReadMore: true };
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return { text: '', needsReadMore: false };
    
    const plainText = getPlainText(text);
    
    if (plainText.length <= maxLength) {
      return { text: plainText, needsReadMore: false };
    }
    
    const truncated = plainText.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    const finalText = lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated;
    
    return { text: finalText, needsReadMore: true };
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
            {selectedProduct && (
              <div className="bg-white rounded-md shadow-lg overflow-hidden">
                <div className="grid md:grid-cols-2 gap-8 p-8">
                  <div className="space-y-4">
                    <div className="bg-gray-100 rounded-xl aspect-square flex items-center justify-center relative overflow-hidden">
                      <img 
                        src={selectedProduct.image || placeholderImage} 
                        alt={selectedProduct.title}
                        className="w-full h-full object-cover rounded-2xl"
                        onError={(e) => {
                          e.target.src = placeholderImage;
                        }}
                      />
                      {selectedProduct.quantity === 0 && (
                        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                          <span className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold text-lg">
                            OUT OF STOCK
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-3xl font-bold text-gray-900">
                        {truncateText(selectedProduct.title, 100).text}
                        {truncateText(selectedProduct.title, 100).needsReadMore && '...'}
                      </h3>
                      {selectedProduct.price && (
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-green-600">
                            ₱{formatPrice(selectedProduct.price)}
                          </span>
                        </div>
                      )}
                      {selectedProduct.description && (
                        <div className="text-gray-600 text-base leading-relaxed">
                          {(() => {
                            const { html, needsReadMore } = truncateHTML(
                              selectedProduct.description,
                              400
                            );
                            return (
                              <div>
                                <div 
                                  className="product-description"
                                  dangerouslySetInnerHTML={{ __html: html }}
                                />
                                {needsReadMore && (
                                  <button
                                    onClick={handleReadMore}
                                    className="text-green-600 hover:text-green-700 font-medium mt-2 inline-flex items-center gap-1 transition-colors"
                                  >
                                    read more →
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                      <div className="space-y-3 pt-4 border-t border-gray-200">
                        {selectedProduct.model && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 font-medium">Brand:</span>
                            <span className="text-gray-900 font-semibold">
                              {truncateText(selectedProduct.model, 100).text}
                              {truncateText(selectedProduct.model, 100).needsReadMore && (
                                <button
                                  onClick={handleReadMore}
                                  className="text-green-600 hover:text-green-700 text-sm ml-1"
                                >
                                  more
                                </button>
                              )}
                            </span>
                          </div>
                        )}
                        {selectedProduct.series && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 font-medium">Model:</span>
                            <span className="text-gray-900 font-semibold">
                              {truncateText(selectedProduct.series, 100).text}
                              {truncateText(selectedProduct.series, 100).needsReadMore && (
                                <button
                                  onClick={handleReadMore}
                                  className="text-green-600 hover:text-green-700 text-sm ml-1"
                                >
                                  more
                                </button>
                              )}
                            </span>
                          </div>
                        )}
                        {selectedProduct.category && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 font-medium">Category:</span>
                            <span className="text-gray-900 font-semibold">
                              {truncateText(selectedProduct.category, 100).text}
                              {truncateText(selectedProduct.category, 100).needsReadMore && (
                                <button
                                  onClick={handleReadMore}
                                  className="text-green-600 hover:text-green-700 text-sm ml-1"
                                >
                                  more
                                </button>
                              )}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 font-medium">Availability:</span>
                          <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                            selectedProduct.quantity > 0 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {selectedProduct.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
                {displayProducts.length > 1 && (
                  <div className="border-t border-gray-200 px-8 py-6">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                      Other Products
                    </h4>
                    <div className="flex flex-wrap gap-2">
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
                                  ₱{formatPrice(product.price)}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <style jsx>{`
        .product-description {
          word-wrap: break-word;
        }

        .product-description p {
          margin-bottom: 0.5rem;
        }

        .product-description strong {
          font-weight: 600;
          color: #111827;
        }

        .product-description em {
          font-style: italic;
        }

        .product-description u {
          text-decoration: underline;
        }

        .product-description ul,
        .product-description ol {
          margin-left: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .product-description ul {
          list-style-type: disc;
        }

        .product-description ol {
          list-style-type: decimal;
        }

        .product-description li {
          margin-bottom: 0.25rem;
        }
      `}</style>
    </section>
  );
};

export default ProductSection;