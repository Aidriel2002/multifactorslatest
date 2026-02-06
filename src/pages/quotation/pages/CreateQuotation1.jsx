import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QuotationSideBar from '../components/QuotationSideBar';
import QuotationNavbar from '../components/QuotationNavbar';
import { supabase } from '../../../lib/supabase';
import { PlusIcon, TrashIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { usePageSecurity } from '../../../hooks/usePageSecurity';
import { canAccessQuotations } from '../../../utils/rbac';

function CreateQuotation1() {
  const { loading: securityLoading } = usePageSecurity(canAccessQuotations);

  const navigate = useNavigate();
  const preparedSigRef = useRef(null);
  const approvedSigRef = useRef(null);

  const [formData, setFormData] = useState({
    referenceNumber: '',
    customerName: '',
    position: '',
    address: '',
    subject: '',
    paymentTerms: '',
    preparedBy: '',
    preparedByDesignation: '',
    approvedBy: '',
    approvedByDesignation: '',
    preparedBySignature: null,
    approvedBySignature: null
  });

  const [items, setItems] = useState([
    { description: '', quantity: '', unitPrice: '', total: 0 }
  ]);

  const [loading, setLoading] = useState(false);
  const [preparedSigPreview, setPreparedSigPreview] = useState(null);
  const [approvedSigPreview, setApprovedSigPreview] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // Calculate total for this item
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = parseFloat(newItems[index].quantity) || 0;
      const price = parseFloat(newItems[index].unitPrice) || 0;
      newItems[index].total = qty * price;
    }

    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: '', unitPrice: '', total: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSignatureUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Preview
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

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
  };

  const calculateVAT = () => {
    return calculateSubtotal() * 0.12;
  };

  const calculateGrandTotal = () => {
    return calculateSubtotal() + calculateVAT();
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

      // Insert quotation
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .insert([{
          quotation_type: 'quotation1',
          reference_number: formData.referenceNumber,
          customer_name: formData.customerName,
          position: formData.position,
          address: formData.address,
          subject: formData.subject,
          payment_terms: formData.paymentTerms,
          subtotal: calculateSubtotal(),
          vat_amount: calculateVAT(),
          grand_total: calculateGrandTotal(),
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

      // Insert items
      const itemsToInsert = items.map((item, index) => ({
        quotation_id: quotation.id,
        description: item.description,
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unitPrice),
        total: parseFloat(item.total),
        sort_order: index
      }));

      const { error: itemsError } = await supabase
        .from('quotation_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      alert('Quotation created successfully!');
      navigate(`/quotation/view/${quotation.id}`);
    } catch (error) {
      console.error('Error creating quotation:', error);
      alert('Error creating quotation: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (securityLoading) {
  return (
    <div className="flex h-screen bg-gray-50">
      <QuotationSideBar />
      <div className="flex-1 overflow-y-auto flex items-center justify-center" style={{ marginLeft: '16rem' }}>
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
      <div className="flex-1 overflow-y-auto" style={{ marginLeft: '16rem' }}>
        <QuotationNavbar 
          title="Create Quotation 1" 
          subtitle="Fill in the quotation details"
        />

        <div className="p-8 max-w-6xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-8">
            {/* Header Information */}
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Q-2024-001"
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
                    placeholder="Enter customer name"
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter address"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <textarea
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter subject"
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
                        Description
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-24">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-32">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-32">
                        Total
                      </th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3">
                          <textarea
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            rows="2"
                            placeholder="Item description"
                            required
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            placeholder="0"
                            required
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            placeholder="0.00"
                            required
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(item.total)}
                          </div>
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
                  </tbody>
                </table>
              </div>
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

            <div className="mb-8 flex justify-end">
              <div className="w-full md:w-1/2 lg:w-1/3 bg-gray-50 rounded-lg p-6 space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span className="font-medium">Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(calculateSubtotal())}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span className="font-medium">VAT (12%):</span>
                  <span className="font-semibold">{formatCurrency(calculateVAT())}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t-2 border-gray-300">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(calculateGrandTotal())}</span>
                </div>
              </div>
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
                onClick={() => navigate('/quotation')}
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

export default CreateQuotation1;