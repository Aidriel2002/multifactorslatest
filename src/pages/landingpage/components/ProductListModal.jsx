import React, { useState, useEffect } from 'react';
import { X, Package } from 'lucide-react';

const ProductListModal = ({ product, onClose }) => {
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!product) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const renderFormattedText = (html) => {
    if (!html) return null;
    const sanitizedHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') 
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, ''); 

    return (
      <div 
        className="formatted-content"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    );
  };

  const getTruncatedDescription = (html) => {
    if (!html) return { truncated: '', needsReadMore: false };

    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      const lines = textContent.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length <= 5) {
        return {
          truncated: html,
          needsReadMore: false
        };
      }

      const children = Array.from(tempDiv.childNodes);
      let lineCount = 0;
      let truncatedHtml = '';
      
      for (const child of children) {
        const childText = (child.textContent || '').trim();
        if (!childText) continue;
        
        const childLines = childText.split('\n').filter(l => l.trim() !== '');
        
        if (lineCount + childLines.length <= 5) {
          truncatedHtml += child.outerHTML || child.textContent;
          lineCount += childLines.length;
        } else {
          const remainingLines = 5 - lineCount;
          if (remainingLines > 0) {
            const partialText = childLines.slice(0, remainingLines).join('\n');
            if (child.nodeType === Node.ELEMENT_NODE) {
              const clonedNode = child.cloneNode(false);
              clonedNode.textContent = partialText;
              truncatedHtml += clonedNode.outerHTML;
            } else {
              truncatedHtml += partialText;
            }
          }
          break;
        }
      }

      return {
        truncated: truncatedHtml,
        needsReadMore: true
      };
    } catch (error) {
      console.error('Error truncating description:', error);
      return {
        truncated: html,
        needsReadMore: false
      };
    }
  };

  const getStockText = (quantity) => {
    if (!quantity || quantity < 0) return '0 units available';
    return quantity === 1 ? `${quantity} unit available` : `${quantity} units available`;
  };

  const getLowStockText = (quantity) => {
    if (!quantity || quantity < 0) return 'Out of stock';
    return quantity === 1 
      ? `Only ${quantity} unit remaining!` 
      : `Only ${quantity} units remaining!`;
  };

  const getStockStatusColor = (quantity) => {
    if (quantity > 10) return 'text-green-600';
    if (quantity > 0) return 'text-orange-600';
    return 'text-red-600';
  };

  const getStockStatusText = (quantity) => {
    if (!quantity || quantity <= 0) return 'Out of Stock';
    return getStockText(quantity);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <h2 id="modal-title" className="text-2xl font-bold text-gray-900">Product Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6 md:p-9">
          <div className="flex flex-col gap-8">
            <div className="bg-gray-50 rounded-lg p-6 flex items-center justify-center relative min-h-[300px]">
              {product.display_on_homepage !== false && (
                <span className="absolute top-4 right-4 px-3 py-1.5 bg-yellow-400 text-yellow-900 text-sm font-bold rounded-lg shadow-md z-2">
                  ★ FEATURED
                </span>
              )}
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.title || 'Product image'}
                  className="max-w-full max-h-96 object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    const fallback = e.target.nextSibling;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className="w-full h-96 flex items-center justify-center" style={{ display: product.image ? 'none' : 'flex' }}>
                <Package className="w-24 h-24 text-gray-300" />
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex flex-col md:flex-col gap-2 pb-4 border-b">
                <h3 className="text-xl md:text-3xl text-gray-900">
                  {product.title || 'Untitled Product'}
                </h3>
                <p className="text-xl md:text-3xl text-green-700 text-right md:whitespace-nowrap">
                  ₱{parseFloat(product.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </p>
              </div>
              {product.quantity > 0 && product.quantity <= 10 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-orange-800">
                    <span className="font-semibold">⚠️ Low Stock Alert:</span> {getLowStockText(product.quantity)}
                  </p>
                </div>
              )}
              {(!product.quantity || product.quantity === 0) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    <span className="font-semibold">❌ Out of Stock:</span> This product is currently unavailable.
                  </p>
                </div>
              )}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Product Information
                </h4>
                
                <div className="grid grid-row-1 sm:grid-cols-2 gap-4">
                  {product.model && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1 font-medium">Brand</p>
                      <p className="text-sm font-semibold text-gray-900">{product.model}</p>
                    </div>
                  )}
                  
                  {product.series && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1 font-medium">Model</p>
                      <p className="text-sm font-semibold text-gray-900">{product.series}</p>
                    </div>
                  )}
                  
                  {product.category && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1 font-medium">Category</p>
                      <p className="text-sm font-semibold text-gray-900">{product.category}</p>
                    </div>
                  )}
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1 font-medium">Stock Status</p>
                    <p className={`text-sm font-semibold ${getStockStatusColor(product.quantity)}`}>
                      {getStockStatusText(product.quantity)}
                    </p>
                  </div>
                </div>
              </div>

              {product.description && (
                <div className="space-y-3">
                  <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    Description
                  </h4>
                  <div className="text-gray-700 leading-relaxed">
                    {(() => {
                      const { truncated, needsReadMore } = getTruncatedDescription(
                        product.description
                      );

                      if (showFullDescription) {
                        return (
                          <div>
                            {renderFormattedText(product.description)}
                            {needsReadMore && (
                              <button
                                onClick={() => setShowFullDescription(false)}
                                className="text-green-600 hover:text-green-700 font-medium mt-3 inline-block transition-colors"
                              >
                                Show less ▲
                              </button>
                            )}
                          </div>
                        );
                      } else {
                        return (
                          <div>
                            {renderFormattedText(truncated)}
                            {needsReadMore && (
                              <div className="mt-2">
                                <button
                                  onClick={() => setShowFullDescription(true)}
                                  className="text-green-600 hover:text-green-700 font-medium transition-colors"
                                >
                                  Read more ▼
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

         <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            disabled={product.quantity === 0}
          >
            {product.quantity === 0 ? 'Out of Stock' : 'Add to Inquiry'}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }

        /* Formatted content styles */
        .formatted-content {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .formatted-content ul,
        .formatted-content ol {
          margin: 0.75em 0;
          padding-left: 2em;
        }

        .formatted-content ul {
          list-style-type: disc;
        }

        .formatted-content ol {
          list-style-type: decimal;
        }

        .formatted-content li {
          margin: 0.5em 0;
          padding-left: 0.25em;
        }

        .formatted-content p {
          margin: 0.75em 0;
        }

        .formatted-content strong,
        .formatted-content b {
          font-weight: 700;
        }

        .formatted-content em,
        .formatted-content i {
          font-style: italic;
        }

        .formatted-content h1,
        .formatted-content h2,
        .formatted-content h3,
        .formatted-content h4,
        .formatted-content h5,
        .formatted-content h6 {
          font-weight: 700;
          margin: 1em 0 0.5em 0;
        }

        .formatted-content a {
          color: #059669;
          text-decoration: underline;
        }

        .formatted-content a:hover {
          color: #047857;
        }

        /* Ensure proper spacing */
        .formatted-content > *:first-child {
          margin-top: 0;
        }

        .formatted-content > *:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
};

export default ProductListModal;