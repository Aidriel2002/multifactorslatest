import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QuotationSideBar from '../components/QuotationSideBar';
import QuotationNavbar from '../components/QuotationNavbar';
import { supabase } from '../../../lib/supabase';
import { PlusIcon, TrashIcon, CloudArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { usePageSecurity } from '../../../hooks/usePageSecurity';
import { canAccessQuotations } from '../../../utils/rbac';

function EditQuotation2() {
  const { loading: securityLoading } = usePageSecurity(canAccessQuotations);

  const { id } = useParams();
  const navigate = useNavigate();
  const preparedSigRef = useRef(null);
  const approvedSigRef = useRef(null);

  const DRAFT_KEY = `quotation2_edit_draft_${id}`;

  const [formData, setFormData] = useState({
    referenceNumber: '',
    companyName: '',
    customerName: '',
    position: '',
    address: '',
    greeting: '',
    introduction: '',
    scopeOfWork: '',
    closingMessage: '',
    paymentTerms: '',
    preparedBy: '',
    preparedByDesignation: '',
    approvedBy: '',
    approvedByDesignation: '',
    preparedBySignature: null,
    approvedBySignature: null
  });

  const [items, setItems] = useState([]);
  const [totalPrice, setTotalPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preparedSigPreview, setPreparedSigPreview] = useState(null);
  const [approvedSigPreview, setApprovedSigPreview] = useState(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  useEffect(() => {
    if (initialLoadComplete) {
      const saveDraft = () => {
        try {
          const draft = {
            formData,
            items,
            totalPrice,
            timestamp: new Date().toISOString()
          };
          localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        } catch (error) {
          console.error('Error saving draft:', error);
        }
      };

      const timeoutId = setTimeout(saveDraft, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [formData, items, totalPrice, initialLoadComplete]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft && initialLoadComplete) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [initialLoadComplete]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setShowDraftBanner(false);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  };

  const handleClearDraft = async () => {
    if (window.confirm('Are you sure you want to clear the saved draft and reload the original data?')) {
      clearDraft();
      setLoading(true);
      setInitialLoadComplete(false);
      await fetchQuotation();
    }
  };

  const fetchQuotation = async () => {
    try {
      const { data: quotationData, error: quotationError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', id)
        .single();

      if (quotationError) throw quotationError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', id)
        .order('sort_order', { ascending: true });

      if (itemsError) throw itemsError;

      const savedDraft = localStorage.getItem(DRAFT_KEY);

      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          setFormData(draft.formData);
          setItems(draft.items);
          setTotalPrice(draft.totalPrice || '');

          if (draft.formData.preparedBySignature) {
            setPreparedSigPreview(draft.formData.preparedBySignature);
          }
          if (draft.formData.approvedBySignature) {
            setApprovedSigPreview(draft.formData.approvedBySignature);
          }

          setShowDraftBanner(true);
        } catch (error) {
          console.error('Error loading draft:', error);
          loadDatabaseData(quotationData, itemsData);
        }
      } else {
        loadDatabaseData(quotationData, itemsData);
      }

      setInitialLoadComplete(true);
    } catch (error) {
      console.error('Error fetching quotation:', error);
      alert('Error loading quotation');
    } finally {
      setLoading(false);
    }
  };

  const loadDatabaseData = (quotationData, itemsData) => {
    setFormData({
      referenceNumber: quotationData.reference_number,
      companyName: quotationData.company_name || '',
      customerName: quotationData.customer_name,
      position: quotationData.position || '',
      address: quotationData.address || '',
      greeting: quotationData.greeting || '',
      introduction: quotationData.introduction || '',
      scopeOfWork: quotationData.scope_of_work || '',
      closingMessage: quotationData.closing_message || '',
      paymentTerms: quotationData.payment_terms || '',
      preparedBy: quotationData.prepared_by || '',
      preparedByDesignation: quotationData.prepared_by_designation || '',
      approvedBy: quotationData.approved_by || '',
      approvedByDesignation: quotationData.approved_by_designation || '',
      preparedBySignature: quotationData.prepared_by_signature,
      approvedBySignature: quotationData.approved_by_signature
    });

    setTotalPrice(quotationData.total_price?.toString() || '');
    setPreparedSigPreview(quotationData.prepared_by_signature);
    setApprovedSigPreview(quotationData.approved_by_signature);

    setItems(itemsData.map(item => ({
      id: item.id,
      item: item.item_name || '',
      quantity: item.quantity?.toString() || '',
      description: item.description || ''
    })));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { item: '', quantity: '', description: '' }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSignatureUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'prepared') {
        setPreparedSigPreview(reader.result);
        setFormData(prev => ({ ...prev, preparedBySignature: reader.result }));
      } else {
        setApprovedSigPreview(reader.result);
        setFormData(prev => ({ ...prev, approvedBySignature: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error: quotationError } = await supabase
        .from('quotations')
        .update({
          company_name: formData.companyName,
          customer_name: formData.customerName,
          position: formData.position,
          address: formData.address,
          greeting: formData.greeting,
          introduction: formData.introduction,
          scope_of_work: formData.scopeOfWork,
          closing_message: formData.closingMessage,
          payment_terms: formData.paymentTerms,
          total_price: parseFloat(totalPrice) || 0,
          prepared_by: formData.preparedBy,
          prepared_by_designation: formData.preparedByDesignation,
          approved_by: formData.approvedBy || null,
          approved_by_designation: formData.approvedByDesignation || null,
          prepared_by_signature: formData.preparedBySignature,
          approved_by_signature: formData.approvedBySignature || null
        })
        .eq('id', id);

      if (quotationError) throw quotationError;

      const { error: deleteError } = await supabase
        .from('quotation_items')
        .delete()
        .eq('quotation_id', id);

      if (deleteError) throw deleteError;

      const itemsToInsert = items.map((item, index) => ({
        quotation_id: id,
        item_name: item.item,
        quantity: item.quantity,
        description: item.description,
        sort_order: index
      }));

      const { error: itemsError } = await supabase
        .from('quotation_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      clearDraft();

      alert('Quotation updated successfully!');
      navigate(`/quotation/view/${id}`);
    } catch (error) {
      console.error('Error updating quotation:', error);
      alert('Error updating quotation: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (error) {
        console.error('Error clearing draft:', error);
      }
      navigate(`/quotation/view/${id}`);
    }
  };

  if (loading || securityLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <QuotationSideBar />
        <div className="flex-1 flex items-center justify-center" >
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <QuotationSideBar />
      <div className="flex-1 overflow-y-auto" >
        <QuotationNavbar
          title="Edit Quotation 2"
          subtitle={`Reference: ${formData.referenceNumber}`}
        />

        {showDraftBanner && (
          <div className="mx-8 mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-blue-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-900">Draft restored</p>
                <p className="text-xs text-blue-700">Your previous edits have been automatically loaded</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleClearDraft}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear Draft
              </button>
              <button
                onClick={() => setShowDraftBanner(false)}
                className="text-blue-400 hover:text-blue-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        <div className="p-8 max-w-6xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-8">

            <div className="mb-4 flex justify-end">
              <span className="text-xs text-gray-500 italic">✓ Auto-saving draft...</span>
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-amber-500">
                Quotation Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference Number *
                  </label>
                  <input
                    type="text"
                    name="referenceNumber"
                    value={formData.referenceNumber}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter company/organization name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter contact person name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position
                  </label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter position"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter company address"
                  />
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-amber-500">
                Letter Content
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Greeting
                  </label>
                  <input
                    type="text"
                    name="greeting"
                    value={formData.greeting}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Dear Sir/Madam,"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Introduction
                  </label>
                  <textarea
                    name="introduction"
                    value={formData.introduction}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="We are pleased to offer to you our premium services..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="font-bold italic">Scope of Work</span>
                  </label>
                  <textarea
                    name="scopeOfWork"
                    value={formData.scopeOfWork}
                    onChange={handleInputChange}
                    rows="5"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter scope of work details..."
                  />
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Items</h2>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Item
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-24">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.item}
                            onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            placeholder="Item name"
                            required
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            placeholder="Qty"
                            required
                          />
                        </td>
                        <td className="px-4 py-3">
                          <textarea
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            rows="2"
                            placeholder="Description"
                            required
                          />
                        </td>
                        <td className="px-4 py-3">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50">
                      <td colSpan="2" className="px-4 py-3 text-right font-semibold text-gray-900">
                        Total Price:
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={totalPrice}
                          onChange={(e) => setTotalPrice(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-semibold"
                          placeholder="0.00"
                          required
                        />
                      </td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Closing Message
              </label>
              <textarea
                name="closingMessage"
                value={formData.closingMessage}
                onChange={handleInputChange}
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Enter closing message..."
              />
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Terms
              </label>
              <textarea
                name="paymentTerms"
                value={formData.paymentTerms}
                onChange={handleInputChange}
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Enter payment terms and conditions"
              />
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-amber-500">
                Authorized Signatures
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prepared By
                  </label>
                  <input
                    type="text"
                    name="preparedBy"
                    value={formData.preparedBy}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mb-3"
                    placeholder="Enter name"
                  />
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Designation
                  </label>
                  <input
                    type="text"
                    name="preparedByDesignation"
                    value={formData.preparedByDesignation}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mb-3"
                    placeholder="Enter designation"
                  />
                  <div>
                    <input
                      type="file"
                      ref={preparedSigRef}
                      onChange={(e) => handleSignatureUpload(e, 'prepared')}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => preparedSigRef.current.click()}
                      className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-amber-500 transition-colors flex items-center justify-center"
                    >
                      <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                      Upload Signature
                    </button>
                    {preparedSigPreview && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <img src={preparedSigPreview} alt="Signature" className="h-20 mx-auto" />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Approved By <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="approvedBy"
                    value={formData.approvedBy}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mb-3"
                    placeholder="Enter name"
                  />
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Designation <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="approvedByDesignation"
                    value={formData.approvedByDesignation}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mb-3"
                    placeholder="Enter designation"
                  />
                  <div>
                    <input
                      type="file"
                      ref={approvedSigRef}
                      onChange={(e) => handleSignatureUpload(e, 'approved')}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => approvedSigRef.current.click()}
                      className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-amber-500 transition-colors flex items-center justify-center"
                    >
                      <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                      Upload Signature
                    </button>
                    {approvedSigPreview && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <img src={approvedSigPreview} alt="Signature" className="h-20 mx-auto" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditQuotation2;