import { useState, useEffect, useRef } from 'react';

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
  const descriptionRef = useRef(null);

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

  const handleDescriptionChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      description: value
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

  // Toggle formatting on selected text
  const toggleFormatting = (format) => {
    const textarea = descriptionRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.description.substring(start, end);

    if (!selectedText) {
      alert('Please select text first');
      return;
    }

    let wrappedText = '';
    
    if (format === 'bold') {
      // Check if already bold
      const beforeSelection = formData.description.substring(Math.max(0, start - 3), start);
      const afterSelection = formData.description.substring(end, Math.min(formData.description.length, end + 4));
      
      if (beforeSelection === '<b>' && afterSelection.startsWith('</b>')) {
        // Remove bold
        const newDescription = 
          formData.description.substring(0, start - 3) + 
          selectedText + 
          formData.description.substring(end + 4);
        
        setFormData(prev => ({
          ...prev,
          description: newDescription
        }));
        
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start - 3, start - 3 + selectedText.length);
        }, 0);
      } else {
        // Add bold
        wrappedText = `<b>${selectedText}</b>`;
        const newDescription = 
          formData.description.substring(0, start) + 
          wrappedText + 
          formData.description.substring(end);
        
        setFormData(prev => ({
          ...prev,
          description: newDescription
        }));
        
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + 3, start + 3 + selectedText.length);
        }, 0);
      }
    } else if (format === 'italic') {
      // Check if already italic
      const beforeSelection = formData.description.substring(Math.max(0, start - 3), start);
      const afterSelection = formData.description.substring(end, Math.min(formData.description.length, end + 4));
      
      if (beforeSelection === '<i>' && afterSelection.startsWith('</i>')) {
        // Remove italic
        const newDescription = 
          formData.description.substring(0, start - 3) + 
          selectedText + 
          formData.description.substring(end + 4);
        
        setFormData(prev => ({
          ...prev,
          description: newDescription
        }));
        
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start - 3, start - 3 + selectedText.length);
        }, 0);
      } else {
        // Add italic
        wrappedText = `<i>${selectedText}</i>`;
        const newDescription = 
          formData.description.substring(0, start) + 
          wrappedText + 
          formData.description.substring(end);
        
        setFormData(prev => ({
          ...prev,
          description: newDescription
        }));
        
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + 3, start + 3 + selectedText.length);
        }, 0);
      }
    } else if (format === 'bullet') {
      // Add bullet point
      const lines = selectedText.split('\n');
      const bulletedText = lines.map(line => line.trim() ? `• ${line}` : line).join('\n');
      
      const newDescription = 
        formData.description.substring(0, start) + 
        bulletedText + 
        formData.description.substring(end);
      
      setFormData(prev => ({
        ...prev,
        description: newDescription
      }));
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + bulletedText.length);
      }, 0);
    }
  };

  // Render HTML preview
  const renderHTMLPreview = () => {
    if (!formData.description) {
      return <p className="text-gray-400 text-sm">Preview will appear here...</p>;
    }

    const html = formData.description
      .replace(/<b>/g, '<strong>')
      .replace(/<\/b>/g, '</strong>')
      .replace(/<i>/g, '<em>')
      .replace(/<\/i>/g, '</em>');

    return (
      <div 
        className="text-sm text-gray-700 whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
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
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h2>
        </div>
        
        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          {error && (
            <div className="mx-6 mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Two Column Layout */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-6 p-6">
              {/* LEFT COLUMN - All Inputs */}
              <div className="space-y-6">
                {/* Product Name */}
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

                {/* Price and Quantity */}
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
                      Max: ₱99,999,999.99
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

                {/* Model and Series */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Brand
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
                      Model
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

                {/* Category */}
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
                    placeholder="e.g., CCTV, Access Control"
                  />
                  <datalist id="category-suggestions">
                    {uniqueCategories.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                  <p className="text-xs text-gray-500 mt-1">
                    Type to see existing categories
                  </p>
                </div>

                {/* Homepage Display Settings */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    Homepage Display
                  </h3>
                  
                  {!editingProduct && homepageCount >= 5 && (
                    <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-lg">
                      <p className="text-xs font-medium">⚠️ Homepage full (5/5)</p>
                      <p className="text-xs mt-1">Disable another product first</p>
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
                      <label 
                        htmlFor="display_on_homepage" 
                        className={`ml-2 text-sm font-medium ${!editingProduct && homepageCount >= 5 && !formData.display_on_homepage ? 'text-gray-400' : 'text-gray-700'}`}
                      >
                        Display on homepage
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Display Order
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
                        placeholder="Leave empty for random"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        1-5, lower numbers appear first
                      </p>
                    </div>
                  </div>
                </div>

                {/* Product Image */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Product Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none text-sm"
                  />
                  {imagePreview && (
                    <div className="mt-4">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-40 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty for default placeholder
                  </p>
                </div>
              </div>

              {/* RIGHT COLUMN - Description with Formatting */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description *
                  </label>
                  
                  {/* Formatting Buttons */}
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => toggleFormatting('bold')}
                      className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-1.5 text-sm font-medium"
                      title="Bold - Select text and click to toggle"
                    >
                      <span className="font-bold">B</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFormatting('italic')}
                      className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-1.5 text-sm"
                      title="Italic - Select text and click to toggle"
                    >
                      <span className="italic font-serif">I</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFormatting('bullet')}
                      className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-1.5 text-sm"
                      title="Bullet point - Select lines and click to add bullets"
                    >
                      <span>• List</span>
                    </button>
                  </div>

                  {/* Description Textarea */}
                  <textarea
                    ref={descriptionRef}
                    name="description"
                    value={formData.description}
                    onChange={handleDescriptionChange}
                    required
                    rows="20"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none resize-none text-sm"
                    placeholder="Enter product description here..."
                  />
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Select text and use buttons above: <strong>B</strong> for bold, <em>I</em> for italic, <strong>• List</strong> for bullets
                  </p>
                </div>

                {/* Preview Section */}
                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Preview
                  </label>
                  <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 min-h-[100px] max-h-[200px] overflow-y-auto">
                    {renderHTMLPreview()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="border-t border-gray-200 p-6">
            <div className="flex gap-3">
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
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;