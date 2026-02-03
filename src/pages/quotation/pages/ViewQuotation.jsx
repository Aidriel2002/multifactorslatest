import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QuotationSideBar from '../components/QuotationSideBar';
import QuotationNavbar from '../components/QuotationNavbar';
import { supabase } from '../../../lib/supabase';
import { PrinterIcon, PencilIcon } from '@heroicons/react/24/outline';

function ViewQuotation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [items, setItems] = useState([]);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotation();
  }, [id]);

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

      const { data: templateData } = await supabase
        .from('company_header')
        .select('*')
        .single();

      setQuotation(quotationData);
      setItems(itemsData);
      setTemplate(templateData);
    } catch (error) {
      console.error('Error fetching quotation:', error);
      alert('Error loading quotation');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const hasApprovedBy = quotation?.approved_by || quotation?.approved_by_signature;

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <QuotationSideBar />
        <div className="flex-1 flex items-center justify-center" style={{ marginLeft: '16rem' }}>
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex h-screen bg-gray-50">
        <QuotationSideBar />
        <div className="flex-1 flex items-center justify-center" style={{ marginLeft: '16rem' }}>
          <div className="text-gray-500">Quotation not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <QuotationSideBar />
      <div className="flex-1 overflow-y-auto" style={{ marginLeft: '16rem' }}>
        <QuotationNavbar 
          title="View Quotation" 
          subtitle={`Reference: ${quotation.reference_number}`}
        />

        <div className="p-8">
          <div className="mb-6 flex justify-end space-x-4 print:hidden">
            <button
              onClick={() => navigate(`/quotation/edit/${id}`)}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <PencilIcon className="h-5 w-5 mr-2" />
              Edit
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              <PrinterIcon className="h-5 w-5 mr-2" />
              Print
            </button>
          </div>

          <div className="bg-white shadow-lg print:shadow-none max-w-4xl mx-auto pt-12 px-24">
            <div className="text-center mb-6 pb-6">
              {template?.header_image && (
                <div className="-mb-3">
                  <img 
                    src={template.header_image} 
                    alt="Company Logo" 
                    className="h-24 object-contain mx-auto"
                  />
                </div>
              )}
              
              {template?.company_address && (
                <p className="text-xs font-bold text-black -mb-1">{template.company_address}</p>
              )}
              
              <div className="text-xs font-bold text-black -mb-1">
                {template?.company_phone && <span>Contact No: {template.company_phone}</span>}<br />
              </div>
              <div className="text-xs font-bold text-black -mb-8">
                {template?.company_email && <span>Email: {template.company_email}</span>}
              </div>
            </div>

            <div className="text-right mb-4">  
              <p className="text-black">Reference No: {quotation.reference_number}</p>
              <p className="text-sm text-black -mt-1">Date: {formatDate(quotation.created_at)}</p>
            </div>

            <div className="mb-4">
              <div>
                <div className="">
                  <div>
                    <p className=" text-black -mb-1 font-semibold">{quotation.customer_name}</p>
                  </div>
                  {quotation.position && (
                    <div>
                      <p className=" text-black -mb-1">{quotation.position}</p>
                    </div>
                  )}
                  {quotation.address && (
                    <div>
                      <p className=" text-black">{quotation.address}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {quotation.subject && (
                <div>
                  <p className="text-black text-sm uppercase mt-3">Subject: {quotation.subject}</p>
                </div>
              )}
            </div>

            <div className="mb-5">
              <table className="w-full overflow-hidden" style={{ borderCollapse: 'separate', borderSpacing: 0, border: '1px solid black', borderRadius: '3px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th className="px-3 py-1.5 text-left text-sm font-bold" style={{ borderBottom: '1px solid black', borderRight: '1px solid black' }}>Description</th>
                    <th className="px-3 py-1.5 text-center text-sm font-bold w-20" style={{ borderBottom: '1px solid black', borderRight: '1px solid black' }}>Qty</th>
                    <th className="px-3 py-1.5 text-right text-sm font-bold w-32" style={{ borderBottom: '1px solid black', borderRight: '1px solid black' }}>Unit Price</th>
                    <th className="px-3 py-1.5 text-right text-sm font-bold w-32" style={{ borderBottom: '1px solid black' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    const rowBorderBottom = isLast ? 'none' : '1px solid black';
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-1.5 text-sm text-black" style={{ borderBottom: rowBorderBottom, borderRight: '1px solid black' }}>
                          {item.description}
                        </td>
                        <td className="px-3 py-1.5 text-sm text-center text-black" style={{ borderBottom: rowBorderBottom, borderRight: '1px solid black' }}>
                          {item.quantity}
                        </td>
                        <td className="px-3 py-1.5 text-sm text-right text-black" style={{ borderBottom: rowBorderBottom, borderRight: '1px solid black' }}>
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-3 py-1.5 text-sm text-right font-semibold text-black" style={{ borderBottom: rowBorderBottom }}>
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {quotation.payment_terms && (
              <div className="mb-8">
                <p className=" text-black mb-2 text-sm">Payment Terms: {quotation.payment_terms}</p>
              </div>
            )}

            <div className="mb-8 space-y-3">
              <div 
                className="flex flex-col px-4 py-2"
                style={{ 
                  border: '1px solid rgba(0, 0, 0, 0.2)',
                  borderRadius: '8px',
                }}
              >
                <div className="flex justify-between">
                    <span className=" text-black">Subtotal: </span>
                    <span>{formatCurrency(quotation.subtotal)}</span>
                </div>

                <div className="flex justify-between">
                    <span className=" text-black">VAT (12%):  </span>
                    <span>{formatCurrency(quotation.vat_amount)}</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-xl font-bold text-green-950">Grand Total:  </span>
                    <span className='text-xl font-bold text-green-950'>{formatCurrency(quotation.grand_total)}</span>
                </div>

              </div>
            </div>

            <div className={`mt-16 ${hasApprovedBy ? 'grid grid-cols-2 gap-8' : 'flex justify-start'}`}>
              {/* Prepared By */}
              <div className="text-center">
                <p className="text-left text-sm text-black">Prepared By</p>
                <div className="-mb-6 h-20 flex items-center justify-center">
                  {quotation.prepared_by_signature && (
                    <img 
                      src={quotation.prepared_by_signature} 
                      alt="Prepared By Signature" 
                      className="h-16 object-contain"
                    />
                  )}
                </div>
                <div style={{ borderBottom: '1pt solid black', paddingBottom: '0.25rem' }}>
                  <p className="text-black">{quotation.prepared_by || '_________________'}</p>
                </div>
                {quotation.prepared_by_designation && (
                  <p className="text-sm text-black mt-1">{quotation.prepared_by_designation}</p>
                )}
              </div>

              {/* Approved By — only shown if there is input */}
              {hasApprovedBy && (
                <div className="text-center">
                  <p className="text-left text-sm text-black">Approved By</p>
                  <div className="mb-4 h-20 flex items-center justify-center">
                    {quotation.approved_by_signature && (
                      <img 
                        src={quotation.approved_by_signature} 
                        alt="Approved By Signature" 
                        className="h-16 object-contain"
                      />
                    )}
                  </div>
                  <div style={{ borderBottom: '1pt solid black', paddingBottom: '0.25rem' }}>
                    <p className="font-bold text-black">{quotation.approved_by}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:shadow-none,
          .print\\:shadow-none * {
            visibility: visible;
          }
          .print\\:shadow-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            margin: 0;
            size: auto;
          }
          
          /* Remove browser default headers and footers */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

export default ViewQuotation;