import React, { useState } from 'react';
import { X, Package } from 'lucide-react';

const ProductListModal = ({ product, onClose }) => {
  const [showFullDescription, setShowFullDescription] = useState(false);

  if (!product) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const renderFormattedText = (text) => {
    if (!text) return null;

    const html = text
      .replace(/<b>/g, '<strong>')
      .replace(/<\/b>/g, '</strong>')
      .replace(/<i>/g, '<em>')
      .replace(/<\/i>/g, '</em>');

    return (
      <div 
        className="whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  const getTruncatedDescription = (text) => {
    if (!text) return { truncated: '', needsReadMore: false };

    const lines = text.split('\n');
    const first5Lines = lines.slice(0, 5).join('\n');
    
    const needsReadMore = lines.length > 5;

    return {
      truncated: first5Lines,
      needsReadMore
    };
  };

  const getStockText = (quantity) => {
    return quantity === 1 ? `${quantity} unit available` : `${quantity} units available`;
  };

  const getLowStockText = (quantity) => {
    return quantity === 1 
      ? `Only ${quantity} unit remaining!` 
      : `Only ${quantity} units remaining!`;
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Product Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-9">
          <div className="flex flex-col gap-8">
            <div className="bg-gray-50 rounded-lg p-6 flex items-center justify-center relative">
              {product.display_on_homepage !== false && (
                <span className="absolute top-4 right-4 px-3 py-1.5 bg-yellow-400 text-yellow-900 text-sm font-bold rounded-lg shadow-md">
                  ★ FEATURED
                </span>
              )}
              {product.image ? (
                <img
                  src={product.image}
                  
                  alt={product.title}
                  className="max-w-full max-h-96 object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f3f4f6" width="400" height="400"/%3E%3C/svg%3E';
                  }}
                />
              ) : (
                <div className="w-full h-96 flex items-center justify-center">
                  <Package className="w-24 h-24 text-gray-300" />
                </div>
              )}
            </div>

            <div className="space-y-6 p-4">
              <div className='flex flex-col md:flex-row gap-2'>
                <h3 className="text-base md:text-2xl font-bold text-gray-900">
                  {product.title}
                </h3>
                <p className="text-base md:text-2xl text-end font-bold text-green-700 md:whitespace-nowrap">
                  ₱{parseFloat(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </p>
              </div>
              {product.quantity <= 10 && product.quantity > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-orange-800">
                    <span className="font-semibold">Low Stock Alert:</span> {getLowStockText(product.quantity)}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Product Information
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  {product.model && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Brand</p>
                      <p className="text-sm font-semibold text-gray-900">{product.model}</p>
                    </div>
                  )}
                  
                  {product.series && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Model</p>
                      <p className="text-sm font-semibold text-gray-900">{product.series}</p>
                    </div>
                  )}
                  
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Stock Status</p>
                    <p className={`text-sm font-semibold ${
                      product.quantity > 10 ? 'text-green-600' : 
                      product.quantity > 0 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {product.quantity > 0 ? getStockText(product.quantity) : 'Out of Stock'}
                    </p>
                  </div>

                </div>
              </div>

              {product.quantity === 0 && (  
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    <span className="font-semibold">Out of Stock:</span> This product is currently unavailable.
                  </p>
                </div>
              )}

              {product.description && (
                <div className="space-y-2">
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
                                className="text-green-600 hover:text-green-700 font-medium mt-2 inline-block"
                              >
                                Show less
                              </button>
                            )}
                          </div>
                        );
                      } else {
                        return (
                          <div>
                            {renderFormattedText(truncated)}
                            {needsReadMore && (
                              <span>
                                <span className="text-gray-400">...</span>
                                <button
                                  onClick={() => setShowFullDescription(true)}
                                  className="text-green-600 hover:text-green-700 font-medium ml-1"
                                >
                                  read more
                                </button>
                              </span>
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
      `}</style>
    </div>
  );
};

export default ProductListModal;