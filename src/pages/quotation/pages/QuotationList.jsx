import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import QuotationSideBar from '../components/QuotationSideBar';
import QuotationNavbar from '../components/QuotationNavbar';
import { supabase } from '../../../lib/supabase';
import { EyeIcon, PencilIcon, TrashIcon, PlusIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { usePageSecurity } from '../../../hooks/usePageSecurity';
import { canAccessQuotations } from '../../../utils/rbac';

function QuotationList() {
  const { loading: securityLoading } = usePageSecurity(canAccessQuotations);

  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchQuotations();
    
    const subscription = supabase
      .channel('quotations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quotations' },
        () => {
          fetchQuotations();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [filter]);

  const fetchQuotations = async () => {
    try {
      let query = supabase
        .from('quotations')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('quotation_type', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setQuotations(data);
    } catch (error) {
      console.error('Error fetching quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this quotation?')) return;

    try {
      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      alert('Quotation deleted successfully!');
      fetchQuotations();
    } catch (error) {
      console.error('Error deleting quotation:', error);
      alert('Error deleting quotation: ' + error.message);
    }
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
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEditPath = (quotation) => {
    return quotation.quotation_type === 'quotation2'
      ? `/quotation/edit2/${quotation.id}`
      : `/quotation/edit/${quotation.id}`;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <QuotationSideBar />
      <div className="flex-1 overflow-y-auto" style={{ marginLeft: '16rem' }}>
        <QuotationNavbar 
          title="Quotations" 
          subtitle="Manage all your quotations"
        />

        <div className="p-8">
          {/* Header Actions */}
          <div className="mb-6 flex justify-between items-center">
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'all'
                    ? 'bg-amber-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('quotation1')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'quotation1'
                    ? 'bg-amber-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Quotation 1
              </button>
              <button
                onClick={() => setFilter('quotation2')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'quotation2'
                    ? 'bg-amber-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Quotation 2
              </button>
            </div>

            <div className="flex space-x-3">
              <Link
                to="/editprintable"
                className="flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Header
              </Link>
              <Link
                to="/quotation/create/quotation1"
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Quotation 1
              </Link>
              <Link
                to="/quotation/create/quotation2"
                className="flex items-center px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Quotation 2
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {loading || securityLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
              </div>
            ) : quotations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No quotations found. Create your first quotation!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Reference
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {quotations.map((quotation) => (
                      <tr key={quotation.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-gray-900">
                            {quotation.reference_number}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-900">{quotation.customer_name}</div>
                          {quotation.position && (
                            <div className="text-sm text-gray-500">{quotation.position}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                            {quotation.quotation_type === 'quotation1' ? 'Type 1' : 'Type 2'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(
                              quotation.quotation_type === 'quotation2'
                                ? quotation.total_price
                                : quotation.grand_total
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(quotation.status)}`}>
                            {quotation.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(quotation.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end space-x-2">
                            <Link
                              to={`/quotation/view/${quotation.id}`}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </Link>
                            <Link
                              to={getEditPath(quotation)}
                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </Link>
                            <button
                              onClick={() => handleDelete(quotation.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuotationList;