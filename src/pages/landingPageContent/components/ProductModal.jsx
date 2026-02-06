import { useState, useEffect, useRef } from 'react';
import { canManageProducts } from '../../../utils/rbac'
import { useAuth } from '../../../contexts/AuthContext'

const ProductModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingProduct, 
  products,
  saving 
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
  const { profile } = useAuth()
  const canManage = canManageProducts(profile)
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [currentSize, setCurrentSize] = useState('3');
  const [isListActive, setIsListActive] = useState(false);
  const editorRef = useRef(null);
  const colorPickerRef = useRef(null);
  const sizePickerRef = useRef(null);

  const predefinedColors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000',
    '#FFC0CB', '#A52A2A', '#808080', '#FFD700', '#4B0082'
  ];

  const textSizes = [
    { label: 'Tiny', value: '1' },
    { label: 'Small', value: '2' },
    { label: 'Normal', value: '3' },
    { label: 'Medium', value: '4' },
    { label: 'Large', value: '5' },
    { label: 'Extra Large', value: '6' },
    { label: 'Huge', value: '7' }
  ];

  useEffect(() => {
    if (isOpen && editorRef.current) {
      if (editingProduct) {
        setFormData({
          title: editingProduct.title || '',
          description: editingProduct.description || '',
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
        editorRef.current.innerHTML = editingProduct.description || '';
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
        editorRef.current.innerHTML = '';
      }
      setError(null);
      setIsListActive(false);
    }
  }, [isOpen, editingProduct]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setShowColorPicker(false);
      }
      if (sizePickerRef.current && !sizePickerRef.current.contains(event.target)) {
        setShowSizePicker(false);
      }
    };

    if (showColorPicker || showSizePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker, showSizePicker]);

  // Monitor list state in editor
  useEffect(() => {
    if (!editorRef.current) return;

    const checkListState = () => {
      try {
        const selection = window.getSelection();
        if (selection && selection.anchorNode) {
          let node = selection.anchorNode;
          while (node && node !== editorRef.current) {
            if (node.nodeName === 'UL' || node.nodeName === 'OL') {
              setIsListActive(true);
              return;
            }
            node = node.parentNode;
          }
        }
        setIsListActive(false);
      } catch (e) {
        // Ignore selection errors
      }
    };

    const editor = editorRef.current;
    editor.addEventListener('keyup', checkListState);
    editor.addEventListener('mouseup', checkListState);
    editor.addEventListener('focus', checkListState);

    return () => {
      editor.removeEventListener('keyup', checkListState);
      editor.removeEventListener('mouseup', checkListState);
      editor.removeEventListener('focus', checkListState);
    };
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      e.target.value = '';
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        image: reader.result
      }));
      setImagePreview(reader.result);
    };
    reader.onerror = () => {
      setError('Failed to read image file');
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleEditorChange = () => {
    if (editorRef.current) {
      setFormData(prev => ({
        ...prev,
        description: editorRef.current.innerHTML
      }));
    }
  };

  const applyBold = (e) => {
    e.preventDefault();
    try {
      document.execCommand('bold', false, null);
      editorRef.current?.focus();
    } catch (err) {
      console.error('Bold command failed:', err);
    }
  };

  const applyItalic = (e) => {
    e.preventDefault();
    try {
      document.execCommand('italic', false, null);
      editorRef.current?.focus();
    } catch (err) {
      console.error('Italic command failed:', err);
    }
  };

  const applyBullet = (e) => {
    e.preventDefault();
    try {
      // Check if we're already in a list
      const selection = window.getSelection();
      if (selection && selection.anchorNode) {
        let node = selection.anchorNode;
        let inList = false;
        
        while (node && node !== editorRef.current) {
          if (node.nodeName === 'UL' || node.nodeName === 'OL') {
            inList = true;
            break;
          }
          node = node.parentNode;
        }
        
        // Toggle list
        document.execCommand('insertUnorderedList', false, null);
        setIsListActive(!inList);
      } else {
        document.execCommand('insertUnorderedList', false, null);
      }
      
      editorRef.current?.focus();
    } catch (err) {
      console.error('Bullet list command failed:', err);
    }
  };

  const applyNumberedList = (e) => {
    e.preventDefault();
    try {
      document.execCommand('insertOrderedList', false, null);
      editorRef.current?.focus();
    } catch (err) {
      console.error('Numbered list command failed:', err);
    }
  };

  const applyColor = (color) => {
    try {
      document.execCommand('foreColor', false, color);
      setCurrentColor(color);
      setShowColorPicker(false);
      editorRef.current?.focus();
    } catch (err) {
      console.error('Color command failed:', err);
    }
  };

  const applySize = (size) => {
    try {
      document.execCommand('fontSize', false, size);
      setCurrentSize(size);
      setShowSizePicker(false);
      editorRef.current?.focus();
    } catch (err) {
      console.error('Font size command failed:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.title.trim()) {
      setError('Product name is required');
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError('Please enter a valid price');
      return;
    }
    
    const priceValue = parseFloat(formData.price);
    if (priceValue > 99999999.99) {
      setError('Price cannot exceed ₱99,999,999.99. Please enter a smaller amount.');
      return;
    }

    if (!formData.quantity || parseInt(formData.quantity) < 0) {
      setError('Please enter a valid quantity');
      return;
    }

    if (!formData.description.trim()) {
      setError('Product description is required');
      return;
    }

    if (formData.display_on_homepage) {
      const homepageProducts = products.filter(p => 
        p.display_on_homepage !== false && 
        (!editingProduct || p.id !== editingProduct.id)
      );

      if (homepageProducts.length >= 5) {
        setError('Maximum of 5 products can be displayed on homepage. Please disable homepage display for another product first.');
        return;
      }

      if (formData.display_order) {
        const displayOrderValue = parseInt(formData.display_order);
        
        if (displayOrderValue < 1 || displayOrderValue > 5) {
          setError('Display order must be between 1 and 5');
          return;
        }

        const duplicateOrder = products.find(p => 
          p.display_order === displayOrderValue && 
          p.display_on_homepage !== false &&
          (!editingProduct || p.id !== editingProduct.id)
        );

        if (duplicateOrder) {
          setError(`Display order #${displayOrderValue} is already used by "${duplicateOrder.title}". Please choose a different order number.`);
          return;
        }
      }
    }

    const productData = {
      title: formData.title.trim(),
      description: formData.description,
      image: formData.image,
      price: priceValue,
      quantity: parseInt(formData.quantity) || 0,
      model: formData.model.trim() || '',
      series: formData.series.trim() || '',
      category: formData.category.trim() || '',
      display_on_homepage: formData.display_on_homepage,
      display_order: formData.display_order ? parseInt(formData.display_order) : null
    };

    try {
      await onSubmit(productData);
    } catch (err) {
      setError(err.message || 'Failed to save product. Please try again.');
    }
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
  if (!canManage) {
  return null
}

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          {error && (
            <div className="mx-6 mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-6 p-6">
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
                    disabled={saving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Enter Product Name"
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
                      disabled={saving}
                      min="0"
                      max="99999999.99"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="0.00"
                    />
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
                      disabled={saving}
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="0"
                    />
                  </div>
                </div>

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
                      disabled={saving}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="e.g., UNV"
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
                      disabled={saving}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                    disabled={saving}
                    list="category-suggestions"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="e.g., CCTV, Smart Door Lock"
                  />
                  <datalist id="category-suggestions">
                    {uniqueCategories.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </div>

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
                        disabled={saving || (!editingProduct && homepageCount >= 5 && !formData.display_on_homepage)}
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
                        disabled={saving || !formData.display_on_homepage}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Leave empty for random"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        1-5, lower numbers appear first
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
                    disabled={saving}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                    Leave empty for default placeholder (Max 5MB)
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description *
                  </label>
                  
                  <div className="flex gap-2 mb-2 flex-wrap">
                    <button
                      type="button"
                      onClick={applyBold}
                      disabled={saving}
                      className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Bold - Select text and click"
                    >
                      <span className="font-bold">B</span>
                    </button>
                    <button
                      type="button"
                      onClick={applyItalic}
                      disabled={saving}
                      className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Italic - Select text and click"
                    >
                      <span className="italic font-serif">I</span>
                    </button>
                    <button
                      type="button"
                      onClick={applyBullet}
                      disabled={saving}
                      className={`px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                        isListActive ? 'bg-green-50 border-green-500' : ''
                      }`}
                      title="Bullet list - Click to toggle"
                    >
                      <span>Bullet List</span>
                    </button>
                    <button
                      type="button"
                      onClick={applyNumberedList}
                      disabled={saving}
                      className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Numbered list - Click to toggle"
                    >
                      <span>Numbered List</span>
                    </button>
                    <div className="relative" ref={colorPickerRef}>
                      <button
                        type="button"
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        disabled={saving}
                        className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Text color - Select text and choose color"
                      >
                        <span className="flex items-center gap-1">
                          <span 
                            className="w-4 h-4 rounded border border-gray-400" 
                            style={{ backgroundColor: currentColor }}
                          ></span>
                          <span>Color</span>
                        </span>
                      </button>
                      
                      {showColorPicker && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-10 w-64">
                          <div className="mb-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Quick Colors
                            </label>
                            <div className="grid grid-cols-5 gap-2">
                              {predefinedColors.map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => applyColor(color)}
                                  className="w-10 h-10 rounded border-2 border-gray-300 hover:border-gray-500 transition-colors"
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="border-t border-gray-200 pt-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Custom Color
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={currentColor}
                                onChange={(e) => setCurrentColor(e.target.value)}
                                className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={currentColor}
                                onChange={(e) => setCurrentColor(e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                                placeholder="#000000"
                              />
                              <button
                                type="button"
                                onClick={() => applyColor(currentColor)}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium"
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="relative" ref={sizePickerRef}>
                      <button
                        type="button"
                        onClick={() => setShowSizePicker(!showSizePicker)}
                        disabled={saving}
                        className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Text size - Select text and choose size"
                      >
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10M12 21V3m0 0l-3 3m3-3l3 3" />
                          </svg>
                          <span>Size</span>
                        </span>
                      </button>
                      
                      {showSizePicker && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-10 w-48">
                          <div className="space-y-1">
                            {textSizes.map((size) => (
                              <button
                                key={size.value}
                                type="button"
                                onClick={() => applySize(size.value)}
                                className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition-colors flex items-center justify-between text-sm"
                              >
                                <span>{size.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    ref={editorRef}
                    contentEditable={!saving}
                    onInput={handleEditorChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none text-sm min-h-[400px] max-h-[400px] overflow-y-auto bg-white editor-content"
                    suppressContentEditableWarning
                  />
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Type naturally like in Word or Google Docs. Select text and click buttons to format. Use Enter to add list items.
                  </p>
                  
                  <style jsx>{`
                    .editor-content ul,
                    .editor-content ol {
                      margin: 0.5em 0;
                      padding-left: 2em;
                    }
                    
                    .editor-content ul {
                      list-style-type: disc;
                    }
                    
                    .editor-content ol {
                      list-style-type: decimal;
                    }
                    
                    .editor-content li {
                      margin: 0.25em 0;
                      padding-left: 0.25em;
                    }
                    
                    .editor-content p {
                      margin: 0.5em 0;
                    }
                    
                    .editor-content:empty:before {
                      content: 'Enter product description...';
                      color: #9ca3af;
                    }
                  `}</style>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 p-6">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  editingProduct ? 'Update Product' : 'Add Product'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;