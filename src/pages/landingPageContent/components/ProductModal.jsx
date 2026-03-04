import { useState, useEffect, useRef } from 'react';
import { canManageProducts } from '../../../utils/rbac';
import { useAuth } from '../../../contexts/AuthContext';
import { productAPI } from '../../../lib/supabase';
import { invalidateImageCache } from '../../../lib/cdn';

const ProductModal = ({
  isOpen,
  onClose,
  onSubmit,
  editingProduct,
  products,
  saving,
  homepageCount: homepageCountProp,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    price: '',
    quantity: '',
    model: '',
    series: '',
    category: '',
    product_type: '',
    display_on_homepage: true,
    display_order: '',
  });

  const { profile } = useAuth();
  const canManage = canManageProducts(profile);

  const [imageFile, setImageFile]         = useState(null);
  const [imagePreview, setImagePreview]   = useState('');
  const [uploading, setUploading]         = useState(false);
  const [error, setError]                 = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor, setCurrentColor]   = useState('#000000');
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [currentSize, setCurrentSize]     = useState('3');
  const [isListActive, setIsListActive]   = useState(false);

  // Type suggestions derived from products that share the same category
  const [typeSuggestions, setTypeSuggestions] = useState([]);

  const editorRef      = useRef(null);
  const colorPickerRef = useRef(null);
  const sizePickerRef  = useRef(null);

  const predefinedColors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000',
    '#FFC0CB', '#A52A2A', '#808080', '#FFD700', '#4B0082',
  ];

  const textSizes = [
    { label: 'Tiny',       value: '1' },
    { label: 'Small',      value: '2' },
    { label: 'Normal',     value: '3' },
    { label: 'Medium',     value: '4' },
    { label: 'Large',      value: '5' },
    { label: 'Extra Large',value: '6' },
    { label: 'Huge',       value: '7' },
  ];

  // ─── Update type suggestions when category changes ─────────────────────────
  useEffect(() => {
    if (!formData.category?.trim()) { setTypeSuggestions([]); return; }
    const types = products
      .filter(p => p.category?.toLowerCase() === formData.category.toLowerCase() && p.product_type?.trim())
      .map(p => p.product_type.trim());
    setTypeSuggestions([...new Set(types)].sort());
  }, [formData.category, products]);

  // ─── Reset / populate form ─────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && editorRef.current) {
      if (editingProduct) {
        setFormData({
          title:               editingProduct.title               || '',
          description:         editingProduct.description         || '',
          image_url:           editingProduct.image_url           || '',
          price:               editingProduct.price               || '',
          quantity:            editingProduct.quantity            || '',
          model:               editingProduct.model               || '',
          series:              editingProduct.series              || '',
          category:            editingProduct.category            || '',
          product_type:        editingProduct.product_type        || '',
          display_on_homepage: editingProduct.display_on_homepage !== false,
          display_order:       editingProduct.display_order       || '',
        });
        setImagePreview(editingProduct.image_url || '');
        editorRef.current.innerHTML = editingProduct.description || '';
      } else {
        setFormData({
          title: '', description: '', image_url: '', price: '',
          quantity: '', model: '', series: '', category: '',
          product_type: '', display_on_homepage: true, display_order: '',
        });
        setImagePreview('');
        editorRef.current.innerHTML = '';
      }
      setImageFile(null);
      setError(null);
      setIsListActive(false);
    }
  }, [isOpen, editingProduct]);

  // ─── Close pickers on outside click ───────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target))
        setShowColorPicker(false);
      if (sizePickerRef.current && !sizePickerRef.current.contains(event.target))
        setShowSizePicker(false);
    };
    if (showColorPicker || showSizePicker)
      document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPicker, showSizePicker]);

  // ─── Track list state in editor ───────────────────────────────────────────
  useEffect(() => {
    if (!editorRef.current) return;
    const checkListState = () => {
      try {
        const selection = window.getSelection();
        if (selection?.anchorNode) {
          let node = selection.anchorNode;
          while (node && node !== editorRef.current) {
            if (node.nodeName === 'UL' || node.nodeName === 'OL') { setIsListActive(true); return; }
            node = node.parentNode;
          }
        }
        setIsListActive(false);
      } catch { /* noop */ }
    };
    const editor = editorRef.current;
    editor.addEventListener('keyup',   checkListState);
    editor.addEventListener('mouseup', checkListState);
    editor.addEventListener('focus',   checkListState);
    return () => {
      editor.removeEventListener('keyup',   checkListState);
      editor.removeEventListener('mouseup', checkListState);
      editor.removeEventListener('focus',   checkListState);
    };
  }, [isOpen]);

  // ─── Input handlers ────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (error) setError(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      e.target.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      e.target.value = '';
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    if (error) setError(null);
  };

  const handleEditorChange = () => {
    if (editorRef.current)
      setFormData(prev => ({ ...prev, description: editorRef.current.innerHTML }));
  };

  // ─── Rich-text commands ────────────────────────────────────────────────────
  const applyBold          = (e) => { e.preventDefault(); document.execCommand('bold',                false, null); editorRef.current?.focus(); };
  const applyItalic        = (e) => { e.preventDefault(); document.execCommand('italic',              false, null); editorRef.current?.focus(); };
  const applyNumberedList  = (e) => { e.preventDefault(); document.execCommand('insertOrderedList',   false, null); editorRef.current?.focus(); };

  const applyBullet = (e) => {
    e.preventDefault();
    const selection = window.getSelection();
    let inList = false;
    if (selection?.anchorNode) {
      let node = selection.anchorNode;
      while (node && node !== editorRef.current) {
        if (node.nodeName === 'UL' || node.nodeName === 'OL') { inList = true; break; }
        node = node.parentNode;
      }
    }
    document.execCommand('insertUnorderedList', false, null);
    setIsListActive(!inList);
    editorRef.current?.focus();
  };

  const applyColor = (color) => {
    document.execCommand('foreColor', false, color);
    setCurrentColor(color);
    setShowColorPicker(false);
    editorRef.current?.focus();
  };

  const applySize = (size) => {
    document.execCommand('fontSize', false, size);
    setCurrentSize(size);
    setShowSizePicker(false);
    editorRef.current?.focus();
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim())                          return setError('Product name is required');
    if (!formData.price || parseFloat(formData.price) <= 0) return setError('Please enter a valid price');
    const priceValue = parseFloat(formData.price);
    if (priceValue > 99999999.99)                        return setError('Price cannot exceed ₱99,999,999.99');
    if (!formData.quantity || parseInt(formData.quantity) < 0) return setError('Please enter a valid quantity');
    if (!formData.description.trim())                    return setError('Product description is required');

    // Use prop-based homepageCount for accurate check (not derived from paginated products slice)
    const effectiveHomepageCount = homepageCountProp ?? products.filter(p => p.display_on_homepage !== false).length;

    if (formData.display_on_homepage) {
      const othersOnHomepage = products.filter(
        p => p.display_on_homepage !== false && (!editingProduct || p.id !== editingProduct.id)
      );
      // Only block if we're not editing an existing homepage product
      if (!editingProduct && effectiveHomepageCount >= 5)
        return setError('Maximum of 5 products can be displayed on homepage.');
      if (editingProduct && othersOnHomepage.length >= 5 && editingProduct.display_on_homepage === false)
        return setError('Maximum of 5 products can be displayed on homepage.');

      if (formData.display_order) {
        const displayOrderValue = parseInt(formData.display_order);
        if (displayOrderValue < 1 || displayOrderValue > 5)
          return setError('Display order must be between 1 and 5');
        const duplicateOrder = products.find(
          p => p.display_order === displayOrderValue &&
               p.display_on_homepage !== false &&
               (!editingProduct || p.id !== editingProduct.id)
        );
        if (duplicateOrder)
          return setError(`Display order #${displayOrderValue} is already used by "${duplicateOrder.title}".`);
      }
    }

    try {
      setUploading(true);
      let imageUrl = formData.image_url;

      // ── Upload new image to Supabase Storage ──────────────────────────────
      if (imageFile) {
        // Delete old image first so storage doesn't accumulate orphaned files
        if (editingProduct?.image_url) {
          try {
            await productAPI.deleteImage(editingProduct.image_url);
            if (typeof invalidateImageCache === 'function')
              invalidateImageCache(editingProduct.image_url);
          } catch { /* non-fatal */ }
        }
        // uploadImage() handles the bucket upload and returns the public CDN URL
        imageUrl = await productAPI.uploadImage(imageFile);
      }

      const productData = {
        title:               formData.title.trim(),
        description:         formData.description,
        image_url:           imageUrl,
        price:               priceValue,
        quantity:            parseInt(formData.quantity) || 0,
        model:               formData.model.trim()        || '',
        series:              formData.series.trim()       || '',
        category:            formData.category.trim()     || '',
        product_type:        formData.product_type.trim() || '',
        display_on_homepage: formData.display_on_homepage,
        display_order:       formData.display_order ? parseInt(formData.display_order) : null,
      };

      await onSubmit(productData);
    } catch (err) {
      setError(err.message || 'Failed to save product. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ─── Derived values ────────────────────────────────────────────────────────
  const getUniqueCategories = () => {
    const cats = products.map(p => p.category).filter(c => c?.trim());
    return [...new Set(cats)].sort();
  };

  const effectiveHomepageCount = homepageCountProp ?? products.filter(p => p.display_on_homepage !== false).length;
  const uniqueCategories = getUniqueCategories();
  const isBusy = saving || uploading;

  if (!isOpen || !canManage) return null;

  // ─── Reusable field wrapper ────────────────────────────────────────────────
  const Field = ({ label, required, children }) => (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

        {/* ── Header ── */}
        <div className="px-8 py-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          {error && (
            <div className="mx-8 mt-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9v4a1 1 0 002 0V9a1 1 0 00-2 0zm0-4a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-8 p-8">

              {/* ══════════════════════════════════════════════
                  LEFT COLUMN
              ══════════════════════════════════════════════ */}
              <div className="space-y-5">

                {/* Product Name */}
                <Field label="Product Name" required>
                  <input
                    type="text" name="title" value={formData.title} onChange={handleInputChange}
                    required disabled={isBusy}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none disabled:bg-gray-100 text-sm"
                    placeholder="Enter product name"
                  />
                </Field>

                {/* Price + Quantity */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Price" required>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">₱</span>
                      <input
                        type="number" name="price" value={formData.price} onChange={handleInputChange}
                        required disabled={isBusy} min="0" max="99999999.99" step="0.01"
                        className="w-full pl-7 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none disabled:bg-gray-100 text-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </Field>
                  <Field label="Quantity" required>
                    <input
                      type="number" name="quantity" value={formData.quantity} onChange={handleInputChange}
                      required disabled={isBusy} min="0"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none disabled:bg-gray-100 text-sm"
                      placeholder="0"
                    />
                  </Field>
                </div>

                {/* Brand + Model */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Brand">
                    <input
                      type="text" name="model" value={formData.model} onChange={handleInputChange}
                      disabled={isBusy}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none disabled:bg-gray-100 text-sm"
                      placeholder="e.g., UNV"
                    />
                  </Field>
                  <Field label="Model">
                    <input
                      type="text" name="series" value={formData.series} onChange={handleInputChange}
                      disabled={isBusy}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none disabled:bg-gray-100 text-sm"
                      placeholder="e.g., Pro Series"
                    />
                  </Field>
                </div>

                {/* Category + Type — side by side, linked */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Category">
                    <input
                      type="text" name="category" value={formData.category} onChange={handleInputChange}
                      disabled={isBusy} list="category-suggestions"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none disabled:bg-gray-100 text-sm"
                      placeholder="e.g., Smart Door Lock"
                    />
                    <datalist id="category-suggestions">
                      {uniqueCategories.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </Field>

                  <Field label="Type">
                    <input
                      type="text" name="product_type" value={formData.product_type} onChange={handleInputChange}
                      disabled={isBusy} list="type-suggestions"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none disabled:bg-gray-100 text-sm"
                      placeholder={formData.category ? `e.g., Padlock` : 'Select category first'}
                    />
                    <datalist id="type-suggestions">
                      {typeSuggestions.map(t => <option key={t} value={t} />)}
                    </datalist>
                    {formData.category && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        Sub-type of <span className="font-medium text-gray-600">{formData.category}</span>
                      </p>
                    )}
                  </Field>
                </div>

                {/* ── Homepage Display ── */}
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-800">Homepage Display</h3>

                  {!editingProduct && effectiveHomepageCount >= 5 && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-lg">
                      <p className="text-xs font-medium">⚠️ Homepage full (5/5) — disable another product first</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox" name="display_on_homepage" id="display_on_homepage"
                      checked={formData.display_on_homepage} onChange={handleInputChange}
                      disabled={isBusy || (!editingProduct && effectiveHomepageCount >= 5 && !formData.display_on_homepage)}
                      className="w-4 h-4 text-green-600 bg-white border-gray-300 rounded focus:ring-green-500"
                    />
                    <label htmlFor="display_on_homepage" className="text-sm text-gray-700">
                      Show on homepage
                      <span className={`ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full ${effectiveHomepageCount >= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {effectiveHomepageCount}/5 used
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Display Order (1–5)</label>
                    <input
                      type="number" name="display_order" value={formData.display_order}
                      onChange={handleInputChange} min="1" max="5"
                      disabled={isBusy || !formData.display_on_homepage}
                      className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none disabled:bg-gray-100 text-sm"
                      placeholder="Auto"
                    />
                    <p className="text-xs text-gray-400 mt-1">Lower number = shown first. Leave blank for auto.</p>
                  </div>
                </div>

                {/* ── Image Upload ── */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Product Image
                    <span className="ml-2 text-xs font-normal text-gray-400">Stored in Supabase Storage CDN</span>
                  </label>

                  <div className="space-y-3">
                    {imagePreview && (
                      <div className="relative w-full h-44 border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all" />
                        <button
                          type="button"
                          onClick={() => { setImageFile(null); setImagePreview(''); setFormData(p => ({ ...p, image_url: '' })); }}
                          disabled={isBusy}
                          className="absolute top-2 right-2 bg-white bg-opacity-90 hover:bg-opacity-100 text-red-500 hover:text-red-700 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow transition-all disabled:opacity-40"
                          title="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    )}

                    <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${isBusy ? 'opacity-50 cursor-not-allowed' : 'border-gray-300 bg-gray-50 hover:bg-green-50 hover:border-green-400'}`}>
                      <div className="flex flex-col items-center justify-center gap-1">
                        <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <p className="text-sm text-gray-500">
                          <span className="font-semibold text-green-600">Click to upload</span> or drag & drop
                        </p>
                        <p className="text-xs text-gray-400">PNG, JPG, WEBP — max 5 MB</p>
                      </div>
                      <input
                        type="file" className="hidden" accept="image/*"
                        onChange={handleImageChange} disabled={isBusy}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════
                  RIGHT COLUMN — Rich text editor
              ══════════════════════════════════════════════ */}
              <div className="space-y-4 flex flex-col">
                <Field label="Description" required>
                  {/* Toolbar */}
                  <div className="flex gap-1.5 mb-2 flex-wrap p-2 bg-gray-50 border border-gray-200 rounded-t-lg">
                    <button type="button" onClick={applyBold} disabled={isBusy}
                      className="px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-sm font-bold disabled:opacity-50 shadow-sm">
                      B
                    </button>
                    <button type="button" onClick={applyItalic} disabled={isBusy}
                      className="px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-sm italic font-serif disabled:opacity-50 shadow-sm">
                      I
                    </button>
                    <div className="w-px bg-gray-200 mx-0.5" />
                    <button type="button" onClick={applyBullet} disabled={isBusy}
                      className={`px-3 py-1.5 border rounded-md bg-white hover:bg-gray-50 text-sm disabled:opacity-50 shadow-sm transition-colors ${isListActive ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300'}`}>
                      • List
                    </button>
                    <button type="button" onClick={applyNumberedList} disabled={isBusy}
                      className="px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-sm disabled:opacity-50 shadow-sm">
                      1. List
                    </button>
                    <div className="w-px bg-gray-200 mx-0.5" />

                    {/* Color picker */}
                    <div className="relative" ref={colorPickerRef}>
                      <button type="button" onClick={() => setShowColorPicker(!showColorPicker)} disabled={isBusy}
                        className="px-2.5 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-sm disabled:opacity-50 shadow-sm flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-sm border border-gray-300 flex-shrink-0" style={{ backgroundColor: currentColor }} />
                        <span className="text-xs">Color</span>
                      </button>
                      {showColorPicker && (
                        <div className="absolute top-full left-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-20 w-64">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Quick Colors</p>
                          <div className="grid grid-cols-5 gap-2 mb-3">
                            {predefinedColors.map(c => (
                              <button key={c} type="button" onClick={() => applyColor(c)}
                                className={`w-9 h-9 rounded-lg border-2 transition-transform hover:scale-110 ${currentColor === c ? 'border-gray-800 scale-110' : 'border-transparent hover:border-gray-400'}`}
                                style={{ backgroundColor: c }} title={c} />
                            ))}
                          </div>
                          <div className="border-t border-gray-100 pt-3">
                            <p className="text-xs font-semibold text-gray-700 mb-1.5">Custom</p>
                            <div className="flex gap-2">
                              <input type="color" value={currentColor} onChange={e => setCurrentColor(e.target.value)}
                                className="w-10 h-8 rounded border border-gray-300 cursor-pointer p-0.5" />
                              <input type="text" value={currentColor} onChange={e => setCurrentColor(e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono" placeholder="#000000" />
                              <button type="button" onClick={() => applyColor(currentColor)}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium">
                                Apply
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Size picker */}
                    <div className="relative" ref={sizePickerRef}>
                      <button type="button" onClick={() => setShowSizePicker(!showSizePicker)} disabled={isBusy}
                        className="px-2.5 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-sm disabled:opacity-50 shadow-sm flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10M12 21V3m0 0l-3 3m3-3l3 3" />
                        </svg>
                        <span className="text-xs">Size</span>
                      </button>
                      {showSizePicker && (
                        <div className="absolute top-full left-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-20 w-44">
                          {textSizes.map(s => (
                            <button key={s.value} type="button" onClick={() => applySize(s.value)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${currentSize === s.value ? 'bg-green-50 text-green-700 font-medium' : 'hover:bg-gray-100'}`}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content-editable */}
                  <div
                    ref={editorRef}
                    contentEditable={!isBusy}
                    onInput={handleEditorChange}
                    className="w-full px-4 py-3 border border-gray-300 border-t-0 rounded-b-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none text-sm min-h-[380px] max-h-[380px] overflow-y-auto bg-white editor-content"
                    suppressContentEditableWarning
                  />
                  <p className="text-xs text-gray-400 mt-1.5">Select text then click a toolbar button to format.</p>
                </Field>

                <style>{`
                  .editor-content ul, .editor-content ol { margin: .5em 0; padding-left: 2em; }
                  .editor-content ul { list-style-type: disc; }
                  .editor-content ol { list-style-type: decimal; }
                  .editor-content li { margin: .25em 0; padding-left: .25em; }
                  .editor-content p  { margin: .5em 0; }
                  .editor-content:empty:before { content: 'Enter product description here…'; color: #9ca3af; }
                `}</style>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="border-t border-gray-200 px-8 py-5 bg-gray-50">
            <div className="flex gap-3">
              <button type="button" onClick={onClose} disabled={isBusy}
                className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 text-sm">
                Cancel
              </button>
              <button type="submit" disabled={isBusy}
                className="flex-2 min-w-[200px] bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-sm">
                {isBusy ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {uploading ? 'Uploading image…' : 'Saving…'}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={editingProduct ? 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' : 'M12 4v16m8-8H4'} />
                    </svg>
                    {editingProduct ? 'Update Product' : 'Add Product'}
                  </>
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