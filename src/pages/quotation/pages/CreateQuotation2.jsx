import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QuotationSideBar from '../components/QuotationSideBar';
import QuotationNavbar from '../components/QuotationNavbar';
import { supabase } from '../../../lib/supabase';
import { PlusIcon, TrashIcon, CloudArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { usePageSecurity } from '../../../hooks/usePageSecurity';
import { canAccessQuotations } from '../../../utils/rbac';

function CreateQuotation2() {
  const { loading: securityLoading } = usePageSecurity(canAccessQuotations);

  const navigate = useNavigate();
  const preparedSigRef = useRef(null);
  const approvedSigRef = useRef(null);

  const DRAFT_KEY = 'quotation2_draft';

  const [formData, setFormData] = useState({
    referenceNumber: '',
    companyName: '',
    customerName: '',
    position: '',
    address: '',
    greeting: 'Dear Sir/Madam,',
    introduction: 'We are pleased to offer to you our premium services. Please see below for the scope and delivery of materials needed.',
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

  const [items, setItems] = useState([
    { item: '', quantity: '', description: '' }
  ]);

  const [totalPrice, setTotalPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [preparedSigPreview, setPreparedSigPreview] = useState(null);
  const [approvedSigPreview, setApprovedSigPreview] = useState(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [generatingRefNumber, setGeneratingRefNumber] = useState(true);

  // Generate reference number on component mount (shared with Quotation1)
  useEffect(() => {
    const generateReferenceNumber = async () => {
      try {
        setGeneratingRefNumber(true);
        
        // Get the last quotation from BOTH quotation types ordered by created_at
        const { data, error } = await supabase
          .from('quotations')
          .select('reference_number')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        let nextNumber = 1; // Default if no quotations exist
        
        if (data && data.length > 0 && data[0].reference_number) {
          // Parse the last reference number (format: Q-YYYY-NNNN)
          const lastRefNumber = data[0].reference_number;
          const parts = lastRefNumber.split('-');
          
          if (parts.length === 3) {
            // Extract the sequential number (last part)
            const lastSequentialNumber = parseInt(parts[2], 10);
            nextNumber = lastSequentialNumber + 1;
          }
        }
        
        // Get current year
        const currentYear = new Date().getFullYear();
        
        // Format reference number: Q-YYYY-NNNN
        const refNumber = `Q-${currentYear}-${nextNumber}`;
        
        setFormData(prev => ({ ...prev, referenceNumber: refNumber }));
      } catch (error) {
        console.error('Error generating reference number:', error);
        alert('Error generating reference number. Please try refreshing the page.');
      } finally {
        setGeneratingRefNumber(false);
      }
    };

    generateReferenceNumber();
  }, []);

  // Load draft on component mount
  useEffect(() => {
    const loadDraft = () => {
      try {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
          const draft = JSON.parse(savedDraft);
          setFormData(draft.formData);
          setItems(draft.items);
          setTotalPrice(draft.totalPrice || '');
          
          // Restore signature previews
          if (draft.formData.preparedBySignature) {
            setPreparedSigPreview(draft.formData.preparedBySignature);
          }
          if (draft.formData.approvedBySignature) {
            setApprovedSigPreview(draft.formData.approvedBySignature);
          }
          
          setShowDraftBanner(true);
        }
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    };

    loadDraft();
  }, []);

  // Auto-save draft whenever formData, items, or totalPrice change
  useEffect(() => {
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

    // Debounce the save to avoid too many writes
    const timeoutId = setTimeout(saveDraft, 1000);
    return () => clearTimeout(timeoutId);
  }, [formData, items, totalPrice]);

  // Warn user before leaving page if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setShowDraftBanner(false);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
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

  const handleSignatureUpload = async (e, type) => {
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
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .insert([{
          quotation_type: 'quotation2',
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
          approved_by_signature: formData.approvedBySignature || null,
          created_by: user?.id
        }])
        .select()
        .single();

      if (quotationError) throw quotationError;

      const itemsToInsert = items.map((item, index) => ({
        quotation_id: quotation.id,
        item_name: item.item,
        quantity: item.quantity,
        description: item.description,
        sort_order: index
      }));

      const { error: itemsError } = await supabase
        .from('quotation_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Clear draft after successful submission
      clearDraft();

      alert('Quotation created successfully!');
      navigate(`/quotation/view/${quotation.id}`);
    } catch (error) {
      console.error('Error creating quotation:', error);
      alert('Error creating quotation: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (error) {
        console.error('Error clearing draft:', error);
      }
      navigate('/quotation');
    }
  };

  const handleClearDraft = async () => {
    if (window.confirm('Are you sure you want to clear the saved draft? This cannot be undone.')) {
      clearDraft();
      
      // Regenerate reference number
      try {
        setGeneratingRefNumber(true);
        
        const { data, error } = await supabase
          .from('quotations')
          .select('reference_number')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        let nextNumber = 1;
        
        if (data && data.length > 0 && data[0].reference_number) {
          const lastRefNumber = data[0].reference_number;
          const parts = lastRefNumber.split('-');
          
          if (parts.length === 3) {
            const lastSequentialNumber = parseInt(parts[2], 10);
            nextNumber = lastSequentialNumber + 1;
          }
        }
        
        const currentYear = new Date().getFullYear();
        const refNumber = `Q-${currentYear}-${nextNumber}`;
        
        // Reset form with new reference number
        setFormData({
          referenceNumber: refNumber,
          companyName: '',
          customerName: '',
          position: '',
          address: '',
          greeting: 'Dear Sir/Madam,',
          introduction: 'We are pleased to offer to you our premium services. Please see below for the scope and delivery of materials needed.',
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
      } catch (error) {
        console.error('Error regenerating reference number:', error);
        setFormData({
          referenceNumber: '',
          companyName: '',
          customerName: '',
          position: '',
          address: '',
          greeting: 'Dear Sir/Madam,',
          introduction: 'We are pleased to offer to you our premium services. Please see below for the scope and delivery of materials needed.',
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
      } finally {
        setGeneratingRefNumber(false);
      }
      
      setItems([{ item: '', quantity: '', description: '' }]);
      setTotalPrice('');
      setPreparedSigPreview(null);
      setApprovedSigPreview(null);
    }
  };

  if (securityLoading || generatingRefNumber) {
    return (
      <div className="flex h-screen bg-gray-50">
        <QuotationSideBar />
        <div className="flex-1 overflow-y-auto flex items-center justify-center" style={{ marginLeft: '16rem' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">
              {generatingRefNumber ? 'Generating reference number...' : 'Loading...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <QuotationSideBar />
      <div className="flex-1 overflow-y-auto" style={{ marginLeft: '16rem' }}>
        <QuotationNavbar 
          title="Create Quotation 2" 
          subtitle="Fill in the quotation details"
        />

        {/* Draft Banner */}
        {showDraftBanner && (
          <div className="mx-8 mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-blue-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-900">Draft restored</p>
                <p className="text-xs text-blue-700">Your previous work has been automatically loaded</p>
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
            {/* Auto-save indicator */}
            <div className="mb-4 flex justify-end">
              <span className="text-xs text-gray-500 italic">
                ✓ Auto-saving draft...
              </span>
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
                    onChange={handleInputChange}
                    required
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                    placeholder="Q-2024-001"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Auto-generated reference number (shared with Quotation 1)
                  </p>
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
                disabled={loading}
                className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Quotation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateQuotation2;