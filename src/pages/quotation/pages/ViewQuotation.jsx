import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QuotationSideBar from '../components/QuotationSideBar';
import QuotationNavbar from '../components/QuotationNavbar';
import { supabase } from '../../../lib/supabase';
import { PrinterIcon, PencilIcon } from '@heroicons/react/24/outline';
import { usePageSecurity } from '../../../hooks/usePageSecurity';
import { canAccessQuotations } from '../../../utils/rbac';

function ViewQuotation() {
  const { loading: securityLoading } = usePageSecurity(canAccessQuotations);

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
  const isQuotation2 = quotation?.quotation_type === 'quotation2';

  if (loading || securityLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <QuotationSideBar />
        <div className="flex-1 flex items-center justify-center" style={{ marginLeft: '16rem' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
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
              onClick={() => navigate(`/quotation/edit${isQuotation2 ? '2' : ''}/${id}`)}
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
                <div className="-mb-1">
                  <img
                    src={template.header_image}
                    alt="Company Logo"
                    className="h-16 object-contain mx-auto"
                  />
                </div>
              )}
              {template?.company_address && (
                <p className="font-bold text-black -mb-1" style={{ fontSize: '10px'}} >{template.company_address}</p>
              )}
              <div className=" font-bold text-black -mb-1"style={{ fontSize: '10px'}}>
                {template?.company_phone && <span>Contact No: {template.company_phone}</span>}<br />
              </div>
              <div className=" font-bold text-black -mb-8" style={{ fontSize: '10px'}}>
                {template?.company_email && <span>Email: {template.company_email}</span>}
              </div>
            </div>

            <div className="text-right mb-4">
              <p className="text-black" style={{ fontSize: '12px'}}>Reference No: {quotation.reference_number}</p>
              <p className=" text-black -mt-1" style={{ fontSize: '12px'}}>Date: {formatDate(quotation.created_at)}</p>
            </div>

            <div className="mb-4">
              {isQuotation2 && quotation.company_name && (
                <p className="text-black font-semibold"style={{ fontSize: '12px'}}>{quotation.company_name}</p>
              )}
              <p className="text-black -mb-1 font-semibold" style={{ fontSize: '12px'}}>{quotation.customer_name}</p>
              {quotation.position && <p className="text-black -mb-1" style={{ fontSize: '12px'}}>{quotation.position}</p>}
              {quotation.address && <p className="text-black" style={{ fontSize: '12px'}}>{quotation.address}</p>}

              {!isQuotation2 && quotation.subject && (
                <p className="text-black mt-3" style={{ fontSize: '12px'}}>Subject: {quotation.subject}</p>
              )}
            </div>

            {isQuotation2 && (
              <>
                {quotation.greeting && (
                  <p className="text-black mb-3" style={{ fontSize: '12px'}}>{quotation.greeting}</p>
                )}

                {quotation.introduction && (
                  <p className="text-black mb-4" style={{ fontSize: '12px'}}>{quotation.introduction}</p>
                )}

                {quotation.scope_of_work && (
                  <div className="mb-4">
                    <p className="text-black font-bold italic mb-1" style={{ fontSize: '12px'}}>Scope of Work</p>
                    <p className="text-black whitespace-pre-line" style={{ fontSize: '12px'}}>{quotation.scope_of_work}</p>
                  </div>
                )}

                <div className="mb-4">
                  <table
                    className="w-full overflow-hidden"
                    style={{ borderCollapse: 'separate', borderSpacing: 0, border: '1px solid black', borderRadius: '3px' }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        <th className="px-3 py-1.5 text-left text-sm font-bold" style={{ borderBottom: '1px solid black', borderRight: '1px solid black',fontSize: '12px' }}>Item</th>
                        <th className="px-3 py-1.5 text-center text-sm font-bold w-20" style={{ borderBottom: '1px solid black', borderRight: '1px solid black',fontSize: '12px' }}>Qty</th>
                        <th className="px-3 py-1.5 text-left text-sm font-bold" style={{ borderBottom: '1px solid black',fontSize: '12px' }}>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.id}>
                          <td className="px-3 py-1.5 text-sm text-black" style={{ borderBottom: '1px solid black', borderRight: '1px solid black',fontSize: '12px' }}>
                            {item.item_name}
                          </td>
                          <td className="px-3 py-1.5 text-sm text-center text-black" style={{ borderBottom: '1px solid black', borderRight: '1px solid black',fontSize: '12px' }}>
                            {item.quantity}
                          </td>
                          <td className="px-3 py-1.5 text-sm text-black whitespace-pre-line" style={{ borderBottom: '1px solid black',fontSize: '12px'  }}>
                            {item.description}
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={2} className="px-3 py-1.5 font-bold text-black" style={{ fontSize: '12px' }}>
                          Total Price:
                        </td>
                        <td className="px-3 py-1.5 font-bold text-black text-right" style={{ fontSize: '12px' }}>
                          {formatCurrency(quotation.total_price)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {quotation.closing_message && (
                  <p className="text-black mb-4 whitespace-pre-line" style={{ fontSize: '12px' }}>{quotation.closing_message}</p>
                )}

                {quotation.payment_terms && (
                  <p className="text-black mb-8" style={{ fontSize: '12px' }}>Payment Terms: {quotation.payment_terms}</p>
                )}
              </>
            )}

            {!isQuotation2 && (
              <>
                <div className="mb-4">
                  <table
                    className="w-full overflow-hidden"
                    style={{ borderCollapse: 'separate', borderSpacing: 0, border: '1px solid black', borderRadius: '3px' }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        <th className="px-3 py-1.5 text-left  font-bold" style={{ borderBottom: '1px solid black', borderRight: '1px solid black', fontSize:'12px' }}>Description</th>
                        <th className="px-3 py-1.5 text-center  font-bold w-20" style={{ borderBottom: '1px solid black', borderRight: '1px solid black', fontSize:'12px' }}>Qty</th>
                        <th className="px-3 py-1.5 text-right  font-bold w-32" style={{ borderBottom: '1px solid black', borderRight: '1px solid black', fontSize:'12px' }}>Unit Price</th>
                        <th className="px-3 py-1.5 text-right font-bold w-32" style={{ borderBottom: '1px solid black', fontSize:'12px' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => {
                        const isLast = index === items.length - 1;
                        const rowBorder = isLast ? 'none' : '1px solid black';
                        return (
                          <tr key={item.id}>
                            <td className="px-3 py-1.5 text-sm text-black" style={{ borderBottom: rowBorder, borderRight: '1px solid black', fontSize: '12px' }}>
                              {item.description}
                            </td>
                            <td className="px-3 py-1.5 text-sm text-center text-black" style={{ borderBottom: rowBorder, borderRight: '1px solid black', fontSize: '12px' }}>
                              {item.quantity}
                            </td>
                            <td className="px-3 py-1.5 text-sm text-right text-black" style={{ borderBottom: rowBorder, borderRight: '1px solid black', fontSize: '12px' }}>
                              {formatCurrency(item.unit_price)}
                            </td>
                            <td className="px-3 py-1.5 text-sm text-right font-semibold text-black" style={{ borderBottom: rowBorder, fontSize: '12px' }}>
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
                    <p className="text-black mb-2" style={{ fontSize: '12px' }}>Payment Terms: {quotation.payment_terms}</p>
                  </div>
                )}

                <div className="mb-8 space-y-3">
                  <div
                    className="flex flex-col px-4 py-2"
                    style={{ border: '1px solid rgba(0, 0, 0, 0.2)', borderRadius: '8px' }}
                  >
                    <div className="flex justify-between">
                      <span className="text-black" style={{ fontSize: '12px' }}>Subtotal:</span>
                      <span style={{ fontSize: '12px' }}>{formatCurrency(quotation.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black" style={{ fontSize: '12px' }}>VAT (12%):</span>
                      <span style={{ fontSize: '12px' }}>{formatCurrency(quotation.vat_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xl font-bold text-green-950" style={{ fontSize: '12px' }}>Grand Total:</span>
                      <span className="text-xl font-bold text-green-950" style={{ fontSize: '12px' }}>{formatCurrency(quotation.grand_total)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className={`mt-16 pb-16 ${hasApprovedBy ? 'grid grid-cols-2 gap-8' : 'flex justify-start'}`}>
              <div className="text-center">
                <p className="text-left text-black" style={{ fontSize: '12px' }}>Prepared By</p>
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
                  <p className="text-black" style={{ fontSize: '12px' }}>{quotation.prepared_by || '_________________'}</p>
                </div>
                {quotation.prepared_by_designation && (
                  <p className="text-black mt-1" style={{ fontSize: '12px' }}>{quotation.prepared_by_designation}</p>
                )}
              </div>

              {hasApprovedBy && (
                <div className="text-center">
                  <p className="text-left text-black" style={{ fontSize: '12px' }}>Approved By</p>
                  <div className="-mb-6 h-20 flex items-center justify-center">
                    {quotation.approved_by_signature && (
                      <img
                        src={quotation.approved_by_signature}
                        alt="Approved By Signature"
                        className="h-16 object-contain"
                      />
                    )}
                  </div>
                  <div style={{ borderBottom: '1pt solid black', paddingBottom: '0.25rem' }}>
                    <p className="text-black" style={{ fontSize: '12px' }}>{quotation.approved_by || '_________________'}</p>
                  </div>
                  {quotation.approved_by_designation && (
                    <p className="text-black mt-1" style={{ fontSize: '12px' }}>{quotation.approved_by_designation}</p>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

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