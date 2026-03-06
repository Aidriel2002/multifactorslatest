import { useState, useEffect, useRef } from 'react';
import { canManageProducts } from '../../../utils/rbac';
import { useAuth } from '../../../contexts/AuthContext';
import { productAPI } from '../../../lib/supabase';
import { invalidateImageCache } from '../../../lib/cdn';

// ─── Canvas-based WebP converter ──────────────────────────────────────────────
// Resizes to maxDimension and encodes at quality 0.82 (~60-75% smaller than JPEG)
async function convertToWebP(file, { maxDimension = 1200, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(blobUrl);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) { height = Math.round((height / width) * maxDimension); width = maxDimension; }
        else                 { width  = Math.round((width / height) * maxDimension); height = maxDimension; }
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff'; // white bg — prevents transparency artifacts
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('WebP conversion failed')); return; }
          const webpFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, '') + '.webp',
            { type: 'image/webp' }
          );
          resolve(webpFile);
        },
        'image/webp',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error('Image load failed')); };
    img.src = blobUrl;
  });
}

function fmtBytes(b) {
  if (b < 1024)        return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(2) + ' MB';
}

const ProductModal = ({
  isOpen, onClose, onSubmit, editingProduct, products, saving,
  homepageCount: homepageCountProp,
}) => {
  const [formData, setFormData] = useState({
    title: '', description: '', image_url: '', price: '', quantity: '',
    model: '', series: '', category: '', product_type: '',
    display_on_homepage: true, display_order: '',
  });

  const { profile } = useAuth();
  const canManage = canManageProducts(profile);

  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageStats,   setImageStats]   = useState(null);
  const [converting,   setConverting]   = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [error,        setError]        = useState(null);
  const [typeSuggestions, setTypeSuggestions] = useState([]);

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor,    setCurrentColor]    = useState('#000000');
  const [showSizePicker,  setShowSizePicker]  = useState(false);
  const [currentSize,     setCurrentSize]     = useState('3');
  const [isListActive,    setIsListActive]    = useState(false);

  const editorRef      = useRef(null);
  const colorPickerRef = useRef(null);
  const sizePickerRef  = useRef(null);

  const COLORS = ['#000000','#FF0000','#00FF00','#0000FF','#FFFF00','#FF00FF','#00FFFF','#FFA500','#800080','#008000','#FFC0CB','#A52A2A','#808080','#FFD700','#4B0082'];
  const SIZES  = [{ label:'Tiny',value:'1'},{ label:'Small',value:'2'},{ label:'Normal',value:'3'},{ label:'Medium',value:'4'},{ label:'Large',value:'5'},{ label:'X-Large',value:'6'},{ label:'Huge',value:'7'}];

  // Type suggestions from products with same category
  useEffect(() => {
    if (!formData.category?.trim()) { setTypeSuggestions([]); return; }
    const types = products
      .filter(p => p.category?.toLowerCase() === formData.category.toLowerCase() && p.product_type?.trim())
      .map(p => p.product_type.trim());
    setTypeSuggestions([...new Set(types)].sort());
  }, [formData.category, products]);

  // Populate / reset form when modal opens
  useEffect(() => {
    if (!isOpen || !editorRef.current) return;
    if (editingProduct) {
      setFormData({
        title: editingProduct.title || '', description: editingProduct.description || '',
        image_url: editingProduct.image_url || '', price: editingProduct.price || '',
        quantity: editingProduct.quantity || '', model: editingProduct.model || '',
        series: editingProduct.series || '', category: editingProduct.category || '',
        product_type: editingProduct.product_type || '',
        display_on_homepage: editingProduct.display_on_homepage !== false,
        display_order: editingProduct.display_order || '',
      });
      setImagePreview(editingProduct.image_url || '');
      editorRef.current.innerHTML = editingProduct.description || '';
    } else {
      setFormData({ title:'',description:'',image_url:'',price:'',quantity:'',model:'',series:'',category:'',product_type:'',display_on_homepage:true,display_order:'' });
      setImagePreview('');
      editorRef.current.innerHTML = '';
    }
    setImageFile(null); setImageStats(null); setError(null); setIsListActive(false);
  }, [isOpen, editingProduct]);

  // Close pickers on outside click
  useEffect(() => {
    const h = (e) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) setShowColorPicker(false);
      if (sizePickerRef.current  && !sizePickerRef.current.contains(e.target))  setShowSizePicker(false);
    };
    if (showColorPicker || showSizePicker) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showColorPicker, showSizePicker]);

  // Track list state
  useEffect(() => {
    if (!editorRef.current) return;
    const check = () => {
      try {
        const sel = window.getSelection();
        if (sel?.anchorNode) {
          let n = sel.anchorNode;
          while (n && n !== editorRef.current) {
            if (n.nodeName === 'UL' || n.nodeName === 'OL') { setIsListActive(true); return; }
            n = n.parentNode;
          }
        }
        setIsListActive(false);
      } catch {}
    };
    const el = editorRef.current;
    ['keyup','mouseup','focus'].forEach(ev => el.addEventListener(ev, check));
    return () => ['keyup','mouseup','focus'].forEach(ev => el.removeEventListener(ev, check));
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
    if (error) setError(null);
  };

  // Image select → auto convert to WebP
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10 MB.'); e.target.value = ''; return; }
    if (!file.type.startsWith('image/')) { setError('Please select a valid image.'); e.target.value = ''; return; }

    setConverting(true); setError(null);
    const origUrl = URL.createObjectURL(file);
    setImagePreview(origUrl); // show immediately

    try {
      const webpFile = await convertToWebP(file, { maxDimension: 1200, quality: 0.82 });
      URL.revokeObjectURL(origUrl);
      setImagePreview(URL.createObjectURL(webpFile));
      setImageFile(webpFile);
      setImageStats({ original: fmtBytes(file.size), converted: fmtBytes(webpFile.size), saving: Math.round((1 - webpFile.size / file.size) * 100) });
    } catch (err) {
      console.error('WebP conversion failed:', err);
      setImageFile(file); // fallback to original
      setImageStats(null);
      setError('WebP conversion failed — will upload original format.');
    } finally {
      setConverting(false);
    }
  };

  const handleEditorChange = () => {
    if (editorRef.current) setFormData(p => ({ ...p, description: editorRef.current.innerHTML }));
  };

  const cmd = (c, v = null) => { document.execCommand(c, false, v); editorRef.current?.focus(); };
  const applyBold         = (e) => { e.preventDefault(); cmd('bold'); };
  const applyItalic       = (e) => { e.preventDefault(); cmd('italic'); };
  const applyNumberedList = (e) => { e.preventDefault(); cmd('insertOrderedList'); };
  const applyBullet       = (e) => {
    e.preventDefault();
    const sel = window.getSelection();
    let inList = false;
    if (sel?.anchorNode) { let n = sel.anchorNode; while (n && n !== editorRef.current) { if (n.nodeName==='UL'||n.nodeName==='OL'){inList=true;break;} n=n.parentNode; } }
    cmd('insertUnorderedList');
    setIsListActive(!inList);
  };
  const applyColor = (c) => { cmd('foreColor', c); setCurrentColor(c); setShowColorPicker(false); };
  const applySize  = (s) => { cmd('fontSize', s); setCurrentSize(s); setShowSizePicker(false); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(null);
    if (!formData.title.trim()) return setError('Product name is required');
    if (!formData.price || parseFloat(formData.price) <= 0) return setError('Please enter a valid price');
    const priceValue = parseFloat(formData.price);
    if (priceValue > 99999999.99) return setError('Price cannot exceed ₱99,999,999.99');
    if (formData.quantity === '' || parseInt(formData.quantity) < 0) return setError('Please enter a valid quantity');
    if (!formData.description.trim()) return setError('Product description is required');

    const hpCount = homepageCountProp ?? products.filter(p => p.display_on_homepage !== false).length;
    if (formData.display_on_homepage) {
      const others = products.filter(p => p.display_on_homepage !== false && (!editingProduct || p.id !== editingProduct.id));
      if (!editingProduct && hpCount >= 5) return setError('Maximum of 5 products on homepage.');
      if (editingProduct && others.length >= 5 && editingProduct.display_on_homepage === false) return setError('Maximum of 5 products on homepage.');
      if (formData.display_order) {
        const dov = parseInt(formData.display_order);
        if (dov < 1 || dov > 5) return setError('Display order must be 1–5');
        const dup = products.find(p => p.display_order === dov && p.display_on_homepage !== false && (!editingProduct || p.id !== editingProduct.id));
        if (dup) return setError(`Order #${dov} already used by "${dup.title}".`);
      }
    }

    try {
      setUploading(true);
      let imageUrl = formData.image_url;
      if (imageFile) {
        if (editingProduct?.image_url) {
          try { await productAPI.deleteImage(editingProduct.image_url); } catch {}
        }
        // ✅ Pass profile from useAuth() — avoids redundant auth.getUser() call
        imageUrl = await productAPI.uploadImage(imageFile, profile);
      }
      await onSubmit({
        title: formData.title.trim(), description: formData.description,
        image_url: imageUrl, price: priceValue,
        quantity: parseInt(formData.quantity) || 0,
        model: formData.model.trim() || '', series: formData.series.trim() || '',
        category: formData.category.trim() || '', product_type: formData.product_type.trim() || '',
        display_on_homepage: formData.display_on_homepage,
        display_order: formData.display_order ? parseInt(formData.display_order) : null,
      });
    } catch (err) {
      setError(err.message || 'Failed to save product.');
    } finally {
      setUploading(false);
    }
  };

  const uniqueCategories = [...new Set(products.map(p => p.category).filter(c => c?.trim()))].sort();
  const hpCount          = homepageCountProp ?? products.filter(p => p.display_on_homepage !== false).length;
  const isBusy           = saving || uploading || converting;

  if (!isOpen || !canManage) return null;

  const inputCls = "w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none disabled:bg-gray-50 text-sm transition-all";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="px-8 py-5 flex items-center justify-between bg-gradient-to-r from-green-600 to-emerald-600">
          <div>
            <h2 className="text-xl font-bold text-white">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
            <p className="text-green-100 text-xs mt-0.5">{editingProduct ? 'Update product details' : 'Fill in details to add a product'}</p>
          </div>
          <button type="button" onClick={onClose} disabled={isBusy} className="text-green-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-40">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          {error && (
            <div className="mx-8 mt-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9v4a1 1 0 002 0V9a1 1 0 00-2 0zm0-4a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd"/></svg>
              {error}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-8 p-8">

              {/* LEFT */}
              <div className="space-y-5">

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name <span className="text-red-500">*</span></label>
                  <input type="text" name="title" value={formData.title} onChange={handleInputChange} required disabled={isBusy} placeholder="Enter product name" className={inputCls} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Price <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>
                      <input type="number" name="price" value={formData.price} onChange={handleInputChange} required disabled={isBusy} min="0" max="99999999.99" step="0.01" placeholder="0.00" className={`${inputCls} pl-8`} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity <span className="text-red-500">*</span></label>
                    <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} required disabled={isBusy} min="0" placeholder="0" className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Brand</label>
                    <input type="text" name="model" value={formData.model} onChange={handleInputChange} disabled={isBusy} placeholder="e.g., UNV" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Model</label>
                    <input type="text" name="series" value={formData.series} onChange={handleInputChange} disabled={isBusy} placeholder="e.g., Pro Series" className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                    <input type="text" name="category" value={formData.category} onChange={handleInputChange} disabled={isBusy} list="cat-list" placeholder="e.g., Smart Door Lock" className={inputCls} />
                    <datalist id="cat-list">{uniqueCategories.map(c => <option key={c} value={c}/>)}</datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Type
                      <span className="ml-1 text-xs font-normal text-gray-400">sub-type</span>
                    </label>
                    <input type="text" name="product_type" value={formData.product_type} onChange={handleInputChange} disabled={isBusy} list="type-list" placeholder={formData.category ? 'e.g., Padlock' : 'Pick category first'} className={inputCls} />
                    <datalist id="type-list">{typeSuggestions.map(t => <option key={t} value={t}/>)}</datalist>
                    {formData.category && formData.product_type && (
                      <p className="text-xs text-green-600 mt-1 truncate">{formData.product_type} <span className="text-gray-400">in</span> {formData.category}</p>
                    )}
                  </div>
                </div>

                {/* Homepage */}
                <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/80">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-800">Homepage Display</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${hpCount >= 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>{hpCount}/5 slots</span>
                  </div>
                  {!editingProduct && hpCount >= 5 && (
                    <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-3">⚠️ Homepage full — disable another product first.</p>
                  )}
                  <label className="flex items-center gap-2 mb-3 cursor-pointer">
                    <input type="checkbox" name="display_on_homepage" id="doh" checked={formData.display_on_homepage} onChange={handleInputChange}
                      disabled={isBusy || (!editingProduct && hpCount >= 5 && !formData.display_on_homepage)}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500" />
                    <span className="text-sm text-gray-700">Show on homepage</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input type="number" name="display_order" value={formData.display_order} onChange={handleInputChange} min="1" max="5"
                      disabled={isBusy || !formData.display_on_homepage} placeholder="Auto"
                      className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none disabled:bg-gray-100 text-sm" />
                    <p className="text-xs text-gray-400">Order 1–5, lower = first</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">Product Image</label>
                    <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                      ✦ Auto WebP
                    </span>
                  </div>

                  {imagePreview && (
                    <div className="relative w-full h-44 rounded-xl overflow-hidden border border-gray-200 mb-3 group">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      {imageStats && !converting && (
                        <div className="absolute bottom-0 inset-x-0 bg-black/70 backdrop-blur-sm px-3 py-2 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-white">
                            <span className="line-through text-gray-400">{imageStats.original}</span>
                            <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                            <span className="text-green-400 font-medium">{imageStats.converted} WebP</span>
                          </div>
                          <span className="text-xs font-bold text-green-400">−{imageStats.saving}% smaller</span>
                        </div>
                      )}
                      {converting && (
                        <div className="absolute inset-0 bg-white/85 flex flex-col items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-200 border-t-green-600" />
                          <p className="text-xs font-semibold text-green-700">Converting to WebP…</p>
                        </div>
                      )}
                      <button type="button" disabled={isBusy}
                        onClick={() => { setImageFile(null); setImagePreview(''); setImageStats(null); setFormData(p => ({...p, image_url:''})); }}
                        className="absolute top-2 right-2 bg-white/90 hover:bg-white text-red-500 hover:text-red-700 rounded-full w-7 h-7 flex items-center justify-center font-bold shadow-md opacity-0 group-hover:opacity-100 transition-all disabled:opacity-40">
                        ×
                      </button>
                    </div>
                  )}

                  <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isBusy ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50' : 'border-gray-200 bg-gray-50/50 hover:border-green-400 hover:bg-green-50'}`}>
                    {converting ? (
                      <div className="flex items-center gap-2 text-green-600 pointer-events-none">
                        <div className="animate-spin h-5 w-5 rounded-full border-2 border-green-200 border-t-green-600" />
                        <span className="text-sm font-medium">Converting…</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 pointer-events-none">
                        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                        <p className="text-sm text-gray-500"><span className="font-semibold text-green-600">Click to upload</span> or drag & drop</p>
                        <p className="text-xs text-gray-400">Any image up to 10 MB — auto-converted to WebP</p>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} disabled={isBusy} />
                  </label>
                </div>
              </div>

              <div className="flex flex-col">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description <span className="text-red-500">*</span></label>

                <div className="flex gap-1.5 flex-wrap p-2 bg-gray-50 border border-gray-200 rounded-t-xl border-b-0">
                  <button type="button" onClick={applyBold} disabled={isBusy} className="w-8 h-8 border border-gray-200 rounded-lg bg-white hover:bg-gray-100 text-sm font-bold shadow-sm disabled:opacity-40">B</button>
                  <button type="button" onClick={applyItalic} disabled={isBusy} className="w-8 h-8 border border-gray-200 rounded-lg bg-white hover:bg-gray-100 text-sm italic font-serif shadow-sm disabled:opacity-40">I</button>
                  <div className="w-px bg-gray-200 self-stretch mx-0.5" />
                  <button type="button" onClick={applyBullet} disabled={isBusy} className={`px-2.5 h-8 border rounded-lg text-xs font-medium shadow-sm transition-colors disabled:opacity-40 ${isListActive ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white hover:bg-gray-100'}`}>• List</button>
                  <button type="button" onClick={applyNumberedList} disabled={isBusy} className="px-2.5 h-8 border border-gray-200 rounded-lg bg-white hover:bg-gray-100 text-xs font-medium shadow-sm disabled:opacity-40">1. List</button>
                  <div className="w-px bg-gray-200 self-stretch mx-0.5" />

                  <div className="relative" ref={colorPickerRef}>
                    <button type="button" onClick={() => setShowColorPicker(!showColorPicker)} disabled={isBusy} className="px-2 h-8 border border-gray-200 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-40 shadow-sm flex items-center gap-1.5 text-xs">
                      <span className="w-3.5 h-3.5 rounded-sm border border-gray-300" style={{backgroundColor:currentColor}} />
                      Color
                    </button>
                    {showColorPicker && (
                      <div className="absolute top-full left-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl p-4 z-30 w-64">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Quick Colors</p>
                        <div className="grid grid-cols-5 gap-2 mb-3">
                          {COLORS.map(c => (
                            <button key={c} type="button" onClick={() => applyColor(c)}
                              className={`w-9 h-9 rounded-lg border-2 transition-transform hover:scale-110 ${currentColor===c?'border-gray-700 scale-110':'border-transparent hover:border-gray-300'}`}
                              style={{backgroundColor:c}} />
                          ))}
                        </div>
                        <div className="border-t border-gray-100 pt-3 flex gap-2">
                          <input type="color" value={currentColor} onChange={e=>setCurrentColor(e.target.value)} className="w-10 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                          <input type="text" value={currentColor} onChange={e=>setCurrentColor(e.target.value)} className="flex-1 px-2 py-1 border border-gray-200 rounded-lg text-xs font-mono" placeholder="#000000" />
                          <button type="button" onClick={()=>applyColor(currentColor)} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold">Apply</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Size */}
                  <div className="relative" ref={sizePickerRef}>
                    <button type="button" onClick={() => setShowSizePicker(!showSizePicker)} disabled={isBusy} className="px-2 h-8 border border-gray-200 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-40 shadow-sm flex items-center gap-1 text-xs">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10M12 21V3m0 0l-3 3m3-3l3 3"/></svg>
                      Size
                    </button>
                    {showSizePicker && (
                      <div className="absolute top-full left-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl p-2 z-30 w-40">
                        {SIZES.map(s => (
                          <button key={s.value} type="button" onClick={()=>applySize(s.value)} className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${currentSize===s.value?'bg-green-50 text-green-700 font-semibold':'hover:bg-gray-50'}`}>{s.label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div ref={editorRef} contentEditable={!isBusy} onInput={handleEditorChange} suppressContentEditableWarning
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-b-xl focus:ring-2 focus:ring-green-500 outline-none text-sm min-h-[420px] max-h-[420px] overflow-y-auto bg-white editor-content" />
                <p className="text-xs text-gray-400 mt-1.5">Select text then click a toolbar button to format.</p>

                <style>{`.editor-content ul,.editor-content ol{margin:.5em 0;padding-left:2em}.editor-content ul{list-style-type:disc}.editor-content ol{list-style-type:decimal}.editor-content li{margin:.25em 0}.editor-content p{margin:.5em 0}.editor-content:empty:before{content:'Enter product description…';color:#9ca3af}`}</style>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-8 py-5 bg-gray-50 flex gap-3">
            <button type="button" onClick={onClose} disabled={isBusy} className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={isBusy} className="flex-[2] bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
              {isBusy ? (
                <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  {converting ? 'Converting to WebP…' : uploading ? 'Uploading…' : 'Saving…'}</>
              ) : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={editingProduct?'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z':'M12 4v16m8-8H4'}/></svg>
                  {editingProduct ? 'Update Product' : 'Add Product'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;