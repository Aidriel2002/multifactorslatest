import { useState, useEffect } from 'react';
import { productAPI } from '../../lib/supabase';
import ProductModal from './components/ProductModal';
import AdminSidebar from '../../components/AdminSidebar';
import EmployeeSidebar from '../../components/EmployeeSidebar';
import { usePageSecurity } from '../../hooks/usePageSecurity';
import { canManageProducts } from '../../utils/rbac';

const ManageProduct = () => {
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { profile, loading: securityLoading } = usePageSecurity(canManageProducts);

  const Sidebar = profile?.role === 'admin' ? AdminSidebar : EmployeeSidebar;

  useEffect(() => {
    loadProducts();
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    const subscription = productAPI.subscribeToChanges((payload) => {
      console.log('Real-time update:', payload);
      
      if (payload.eventType === 'INSERT') {
        setProducts(prev => {
          // Check if product already exists to prevent duplicates
          const exists = prev.some(p => p.id === payload.new.id);
          if (exists) {
            console.log('Product already exists, skipping insert');
            return prev;
          }
          // Add new product at the beginning
          return [payload.new, ...prev];
        });
      } else if (payload.eventType === 'UPDATE') {
        setProducts(prev => prev.map(p => 
          p.id === payload.new.id ? payload.new : p
        ));
      } else if (payload.eventType === 'DELETE') {
        setProducts(prev => prev.filter(p => p.id !== payload.old.id));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productAPI.getAll();
      setProducts(data);
    } catch (err) {
      console.error('Error loading products:', err);
      setErrorMessage('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (product = null) => {
    setEditingProduct(product);
    setIsModalOpen(true);
    setErrorMessage('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setSaving(false);
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleSubmit = async (productData) => {
    try {
      setSaving(true);
      setErrorMessage('');

      if (editingProduct) {
        await productAPI.update(editingProduct.id, productData);
        showSuccess('Product updated successfully!');
      } else {
        await productAPI.create(productData);
        showSuccess('Product added successfully!');
      }
      
      closeModal();
    } catch (err) {
      console.error('Error saving product:', err);
      const errorMsg = err.message || 'Failed to save product. Please try again.';
      setErrorMessage(errorMsg);
      throw err; // Re-throw to let modal handle it
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productAPI.delete(id);
        showSuccess('Product deleted successfully!');
      } catch (err) {
        console.error('Error deleting product:', err);
        setErrorMessage('Failed to delete product. Please try again.');
      }
    }
  };

  const getFilteredProducts = () => {
    let filtered = products;

    if (filter === 'homepage') {
      filtered = filtered.filter(p => p.display_on_homepage !== false);
    } else if (filter === 'not-homepage') {
      filtered = filtered.filter(p => p.display_on_homepage === false);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(query) ||
        (p.model && p.model.toLowerCase().includes(query)) ||
        (p.series && p.series.toLowerCase().includes(query)) ||
        (p.category && p.category.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  const getUniqueCategories = () => {
    const categories = products
      .map(p => p.category)
      .filter(c => c && c.trim() !== '');
    return [...new Set(categories)].sort();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setFilter('all');
  };

  const filteredProducts = getFilteredProducts();
  const uniqueCategories = getUniqueCategories();
  const homepageCount = products.filter(p => p.display_on_homepage !== false).length;


  if (loading || securityLoading) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading products...</p>
      </div>
    </div>
  );
}

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 ml-0 md:ml-64 overflow-y-auto">
        <div className="bg-white shadow">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manage Products</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Homepage products: <span className={`font-semibold ${homepageCount >= 5 ? 'text-red-600' : 'text-green-600'}`}>
                    {homepageCount}/5
                  </span>
                  {homepageCount >= 5 && <span className="text-red-600 ml-2">● Maximum reached</span>}
                </p>
              </div>
              <button
                onClick={() => openModal()}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
              >
                + Add New Product
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Products
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, model, series, or category..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
                >
                  <option value="all">All Categories</option>
                  {uniqueCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mb-6 border-b border-gray-200">
            <div className="flex space-x-8">
              <button
                onClick={() => setFilter('all')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  filter === 'all'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Products ({products.length})
              </button>
              <button
                onClick={() => setFilter('homepage')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  filter === 'homepage'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                On Homepage ({homepageCount})
              </button>
              <button
                onClick={() => setFilter('not-homepage')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  filter === 'not-homepage'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Not on Homepage ({products.length - homepageCount})
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
              <span>{errorMessage}</span>
              <button 
                onClick={() => setErrorMessage('')}
                className="text-red-700 hover:text-red-900 font-bold"
              >
                ×
              </button>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{successMessage}</span>
              </div>
              <button 
                onClick={() => setSuccessMessage('')}
                className="text-green-700 hover:text-green-900 font-bold"
              >
                ×
              </button>
            </div>
          )}

          {filteredProducts.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Brand
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Model
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Homepage
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {product.title}
                              </div>
                              {product.display_order && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                  Order #{product.display_order}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {product.category ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {product.category}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{product.model || '—'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{product.series || '—'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{product.quantity}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-green-600">
                            ₱{parseFloat(product.price).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            product.display_on_homepage !== false 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {product.display_on_homepage !== false ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openModal(product)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-lg">
              <p className="text-gray-500 text-xl">
                {products.length === 0 
                  ? 'No products yet. Click "Add New Product" to get started.'
                  : 'No products match your current filters.'}
              </p>
              {(searchQuery || categoryFilter !== 'all' || filter !== 'all') && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-green-600 hover:text-green-700 font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        <ProductModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSubmit={handleSubmit}
          editingProduct={editingProduct}
          products={products}
          saving={saving}
        />
      </div>
    </div>
  );
};

export default ManageProduct;