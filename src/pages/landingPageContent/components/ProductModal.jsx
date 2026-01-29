import { useState, useEffect } from 'react';

const ProductModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingProduct, 
  products,
  error: externalError 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '',
    price: '',
    quantity: '',
    model: '',
    series: '',
    category: '',
    display_on_homepage: true,
    display_order: ''
  });
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState(null);

  // Sync external error with internal error state
  useEffect(() => {
    setError(externalError);
  }, [externalError]);

  // Reset form when modal opens/closes or editing product changes
  useEffect(() => {
    if (isOpen) {
      if (editingProduct) {
        setFormData({
          title: editingProduct.title,
          description: editingProduct.description,
          image: editingProduct.image || '',
          price: editingProduct.price || '',
          quantity: editingProduct.quantity || '',
          model: editingProduct.model || '',
          series: editingProduct.series || '',
          category: editingProduct.category || '',
          display_on_homepage: editingProduct.display_on_homepage !== false,
          display_order: editingProduct.display_order || ''
        });
        setImagePreview(editingProduct.image || '');
      } else {
        setFormData({
          title: '',
          description: '',
          image: '',
          price: '',
          quantity: '',
          model: '',
          series: '',
          category: '',
          display_on_homepage: true,
          display_order: ''
        });
        setImagePreview('');
      }
      setError(null);
    }
  }, [isOpen, editingProduct]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          image: reader.result
        }));
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate price to prevent database overflow
    const priceValue = parseFloat(formData.price) || 0;
    if (priceValue > 99999999.99) {
      setError('Price cannot exceed ₱99,999,999.99. Please enter a smaller amount.');
      return;
    }

    // Validate homepage display settings
    if (formData.display_on_homepage) {
      // Count current products displayed on homepage (excluding current product if editing)
      const homepageProducts = products.filter(p => 
        p.display_on_homepage !== false && 
        (!editingProduct || p.id !== editingProduct.id)
      );

      // Check if we've reached the maximum of 5 homepage products
      if (homepageProducts.length >= 5) {
        setError('Maximum of 5 products can be displayed on homepage. Please disable homepage display for another product first.');
        return;
      }

      // Check for duplicate display_order if it's set
      if (formData.display_order) {
        const displayOrderValue = parseInt(formData.display_order);
        const duplicateOrder = products.find(p => 
          p.display_order === displayOrderValue && 
          (!editingProduct || p.id !== editingProduct.id)
        );

        if (duplicateOrder) {
          setError(`Display order #${displayOrderValue} is already used by "${duplicateOrder.title}". Please choose a different order number.`);
          return;
        }
      }
    }

    const productData = {
      title: formData.title,
      description: formData.description,
      image: formData.image,
      price: priceValue,
      quantity: parseInt(formData.quantity) || 0,
      model: formData.model || '',
      series: formData.series || '',
      category: formData.category || '',
      display_on_homepage: formData.display_on_homepage,
      display_order: formData.display_order ? parseInt(formData.display_order) : null
    };

    await onSubmit(productData);
  };

  const getUniqueCategories = () => {
    const categories = products
      .map(p => p.category)
      .filter(c => c && c.trim() !== '');
    return [...new Set(categories)].sort();
  };

  const homepageCount = products.filter(p => p.display_on_homepage !== false).length;
  const uniqueCategories = getUniqueCategories();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                placeholder="Enter Product Name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none resize-none"
                placeholder="Enter Product Description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Price *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                  min="0"
                  max="99999999.99"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum: ₱99,999,999.99
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  required
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Model
                </label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                  placeholder="e.g., MX-2000"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Series
                </label>
                <input
                  type="text"
                  name="series"
                  value={formData.series}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                  placeholder="e.g., Pro Series"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category
              </label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                list="category-suggestions"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                placeholder="e.g., CCTV, Access Control, Networking"
              />
              <datalist id="category-suggestions">
                {uniqueCategories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
              <p className="text-sm text-gray-500 mt-2">
                Type to see existing categories or enter a new one
              </p>
            </div>

            {/* Homepage Display Settings */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Homepage Display Settings</h3>
              
              {/* Warning if homepage is full */}
              {!editingProduct && homepageCount >= 5 && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
                  <p className="text-sm font-medium">⚠️ Homepage is full (5/5 products)</p>
                  <p className="text-xs mt-1">You cannot enable homepage display unless you disable it for another product first.</p>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="display_on_homepage"
                    id="display_on_homepage"
                    checked={formData.display_on_homepage}
                    onChange={handleInputChange}
                    disabled={!editingProduct && homepageCount >= 5 && !formData.display_on_homepage}
                    className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <label htmlFor="display_on_homepage" className={`ml-2 text-sm font-medium ${!editingProduct && homepageCount >= 5 && !formData.display_on_homepage ? 'text-gray-400' : 'text-gray-700'}`}>
                    Display this product on homepage
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Display Order (Optional)
                  </label>
                  <input
                    type="number"
                    name="display_order"
                    value={formData.display_order}
                    onChange={handleInputChange}
                    min="1"
                    max="5"
                    disabled={!formData.display_on_homepage}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Leave empty for random order"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Set a number (1-5) to control display order. Lower numbers appear first. Leave empty to randomize.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Product Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
              />
              {imagePreview && (
                <div className="mt-4">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
              <p className="text-sm text-gray-500 mt-2">
                Leave empty to use default placeholder image
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
            >
              {editingProduct ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;