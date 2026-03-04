import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { productAPI } from '../../../lib/supabase';
import { prefetchImages, getImageUrlSync } from '../../../lib/cdn';
import placeholderImage from '../images/multifactorslogo.jpg';

const ProductSection = () => {
  const navigate = useNavigate();
  const [titleVisible, setTitleVisible] = useState(false);
  const [products, setProducts] = useState([]);       // homepage products only (≤5)
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const sectionRef = useRef(null);
  const titleRef = useRef(null);

  // ── Load homepage products (server-filtered, ≤5 rows) ──────────────────────
  const loadProducts = async () => {
    try {
      setLoading(true);
      // Uses the new getHomepage() which does ORDER + LIMIT 5 on the server
      const data = await productAPI.getHomepage();
      setProducts(data);
      if (data.length > 0) setSelectedProduct(data[0]);
      prefetchImages(data.map((p) => p.image_url), placeholderImage);
    } catch (err) {
      console.error('Error loading products:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // ── Real-time subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const subscription = productAPI.subscribeToChanges((payload) => {
      if (payload.eventType === 'UPDATE') {
        setProducts((prev) => {
          const updated = prev.map((p) => (p.id === payload.new.id ? payload.new : p));
          if (selectedProduct?.id === payload.new.id) setSelectedProduct(payload.new);
          return updated;
        });
      } else {
        // INSERT / DELETE → re-fetch homepage list from server
        loadProducts();
      }
    });
    return () => subscription.unsubscribe();
  }, [selectedProduct]);

  // ── Intersection observer for title animation ──────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setTitleVisible(true); }),
      { threshold: 0.3 }
    );
    if (titleRef.current) observer.observe(titleRef.current);
    return () => observer.disconnect();
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const handleReadMore = () => {
    navigate(`/productlist?product=${selectedProduct.id}`);
  };

  const formatPrice = (price) => {
    const num = parseFloat(price);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    if (plainText.length <= maxLength) return { html, needsReadMore: false };

    const temp = document.createElement('div');
    temp.innerHTML = html;
    let currentLength = 0;
    let truncated = false;

    const truncateNode = (node) => {
      if (truncated) return;
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (currentLength + text.length > maxLength) {
          node.textContent = text.substring(0, maxLength - currentLength) + '... ';
          truncated = true;
        } else {
          currentLength += text.length;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        for (const child of Array.from(node.childNodes)) {
          truncateNode(child);
          if (truncated) {
            while (child.nextSibling) node.removeChild(child.nextSibling);
            break;
          }
        }
      }
    };

    for (const child of Array.from(temp.childNodes)) {
      truncateNode(child);
      if (truncated) {
        while (child.nextSibling) temp.removeChild(child.nextSibling);
        break;
      }
    }

    return { html: temp.innerHTML, needsReadMore: true };
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return { text: '', needsReadMore: false };
    const plain = getPlainText(text);
    if (plain.length <= maxLength) return { text: plain, needsReadMore: false };
    const cut = plain.substring(0, maxLength);
    const lastSpace = cut.lastIndexOf(' ');
    return { text: lastSpace > 0 ? cut.substring(0, lastSpace) : cut, needsReadMore: true };
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <section id="products" className="py-20 px-4 md:px-8 bg-gray-50" ref={sectionRef}>
      <div className="max-w-7xl mx-auto">
        <h2
          ref={titleRef}
          className={`text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12 transform transition-all duration-1000 ${
            titleVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}
        >
          Products
        </h2>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto" />
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
                  {/* Image */}
                  <div className="space-y-4">
                    <div className="bg-gray-100 rounded-xl aspect-square flex items-center justify-center relative overflow-hidden">
                      <img
                        src={getImageUrlSync(selectedProduct.image_url, placeholderImage)}
                        alt={selectedProduct.title}
                        className="w-full h-full object-cover rounded-2xl"
                        onError={(e) => { e.target.src = placeholderImage; }}
                      />
                      {selectedProduct.quantity === 0 && (
                        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                          <span className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold text-lg">OUT OF STOCK</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-3xl font-bold text-gray-900">
                        {truncateText(selectedProduct.title, 100).text}
                        {truncateText(selectedProduct.title, 100).needsReadMore && '...'}
                      </h3>
                      {selectedProduct.price && (
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-green-600">₱{formatPrice(selectedProduct.price)}</span>
                        </div>
                      )}
                      {selectedProduct.description && (
                        <div className="text-gray-700 text-base leading-relaxed">
                          {(() => {
                            const { html, needsReadMore } = truncateHTML(selectedProduct.description, 250);
                            return (
                              <div className="product-description">
                                <span dangerouslySetInnerHTML={{ __html: html }} />
                                {needsReadMore && (
                                  <button onClick={handleReadMore} className="text-green-600 ml-1 inline-flex items-center gap-1">
                                    <span className="hover:text-green-700 hover:underline">Learn more</span> »
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
                            <span className="text-gray-900 font-semibold">{truncateText(selectedProduct.model, 100).text}</span>
                          </div>
                        )}
                        {selectedProduct.series && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 font-medium">Model:</span>
                            <span className="text-gray-900 font-semibold">{truncateText(selectedProduct.series, 100).text}</span>
                          </div>
                        )}
                        {selectedProduct.category && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 font-medium">Category:</span>
                            <span className="text-gray-900 font-semibold">{selectedProduct.category}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 font-medium">Availability:</span>
                          <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                            selectedProduct.quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {selectedProduct.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Thumbnail strip */}
                {products.length > 1 && (
                  <div className="border-t border-gray-200 px-8 py-6">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Other Products</h4>
                    <div className="flex flex-wrap gap-2">
                      {products
                        .filter((p) => p.id !== selectedProduct.id)
                        .map((product) => (
                          <button key={product.id} onClick={() => setSelectedProduct(product)} className="flex-shrink-0 group">
                            <div className="w-24 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-green-600 transition-all duration-200 hover:shadow-md">
                              <div className="aspect-square bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden">
                                <img
                                  src={getImageUrlSync(product.image_url, placeholderImage)}
                                  alt={product.title}
                                  loading="lazy"
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                  onError={(e) => { e.target.src = placeholderImage; }}
                                />
                              </div>
                              <div className="p-2 bg-white">
                                <p className="text-xs font-medium text-gray-900 truncate">{product.title}</p>
                                <p className="text-xs text-green-600 font-semibold">₱{formatPrice(product.price)}</p>
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

      <style>{`
        .product-description { word-wrap: break-word; overflow-wrap: break-word; }
        .product-description * { margin: 0; padding: 0; }
        .product-description ul, .product-description ol { margin: .75em 0; padding-left: 2em; }
        .product-description ul { list-style-type: disc; }
        .product-description ol { list-style-type: decimal; }
        .product-description li { margin: .5em 0; padding-left: .25em; }
        .product-description p { margin: .75em 0; }
        .product-description strong, .product-description b { font-weight: 700; }
        .product-description em, .product-description i { font-style: italic; }
        .product-description > *:first-child { margin-top: 0; }
        .product-description > *:last-child { margin-bottom: 0; }
      `}</style>
    </section>
  );
};

export default ProductSection;