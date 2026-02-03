import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import QuotationSideBar from './components/QuotationSideBar';
import QuotationNavbar from './components/QuotationNavbar';
import { supabase } from '../../lib/supabase';
import {
  DocumentTextIcon,
  ShoppingCartIcon,
  FolderIcon,
  ArrowTrendingUpIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

function QuotationDashboard() {
  const [stats, setStats] = useState({
    quotations: { total: 0, change: 0 },
    purchaseOrders: { total: 0, change: 0 },
    project: { total: 0, change: 0 },
    revenue: { total: 0, change: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get current month stats
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const startOfLastMonth = new Date(startOfMonth);
      startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);

      // Quotations
      const { data: quotations } = await supabase
        .from('quotations')
        .select('id, grand_total, created_at');

      const currentMonthQuotations = quotations?.filter(
        q => new Date(q.created_at) >= startOfMonth
      ) || [];
      const lastMonthQuotations = quotations?.filter(
        q => new Date(q.created_at) >= startOfLastMonth && new Date(q.created_at) < startOfMonth
      ) || [];

      // Purchase Orders
      const { data: purchaseOrders } = await supabase
        .from('purchase_orders')
        .select('id, created_at');

      const currentMonthPO = purchaseOrders?.filter(
        po => new Date(po.created_at) >= startOfMonth
      ) || [];
      const lastMonthPO = purchaseOrders?.filter(
        po => new Date(po.created_at) >= startOfLastMonth && new Date(po.created_at) < startOfMonth
      ) || [];

      // Projects
      const { data: project } = await supabase
        .from('project')
        .select('id, created_at');

      const currentMonthProjects = project?.filter(
        p => new Date(p.created_at) >= startOfMonth
      ) || [];
      const lastMonthProjects = project?.filter(
        p => new Date(p.created_at) >= startOfLastMonth && new Date(p.created_at) < startOfMonth
      ) || [];

      // Revenue
      const currentRevenue = currentMonthQuotations.reduce((sum, q) => sum + parseFloat(q.grand_total || 0), 0);
      const lastRevenue = lastMonthQuotations.reduce((sum, q) => sum + parseFloat(q.grand_total || 0), 0);

      setStats({
        quotations: {
          total: quotations?.length || 0,
          change: calculatePercentageChange(currentMonthQuotations.length, lastMonthQuotations.length)
        },
        purchaseOrders: {
          total: purchaseOrders?.length || 0,
          change: calculatePercentageChange(currentMonthPO.length, lastMonthPO.length)
        },
        project: {
          total: project?.length || 0,
          change: calculatePercentageChange(currentMonthProjects.length, lastMonthProjects.length)
        },
        revenue: {
          total: quotations?.reduce((sum, q) => sum + parseFloat(q.grand_total || 0), 0) || 0,
          change: calculatePercentageChange(currentRevenue, lastRevenue)
        }
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentageChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const statCards = [
    {
      title: 'Total Quotations',
      value: stats.quotations.total,
      change: stats.quotations.change,
      icon: DocumentTextIcon,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Purchase Orders',
      value: stats.purchaseOrders.total,
      change: stats.purchaseOrders.change,
      icon: ShoppingCartIcon,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600'
    },
    {
      title: 'Active Projects',
      value: stats.project.total,
      change: stats.project.change,
      icon: FolderIcon,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.revenue.total),
      change: stats.revenue.change,
      icon: ArrowTrendingUpIcon,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      isCurrency: true
    }
  ];

  const quickActions = [
    { title: 'New Quotation 1', path: '/quotation/create/quotation1', color: 'bg-gradient-to-r from-blue-500 to-blue-600' },
    { title: 'New Quotation 2', path: '/quotation/create/quotation2', color: 'bg-gradient-to-r from-indigo-500 to-indigo-600' },
    { title: 'New Purchase Order', path: '/quotation/purchase-orders/create', color: 'bg-gradient-to-r from-purple-500 to-purple-600' },
    { title: 'New Project', path: '/quotation/projects/create', color: 'bg-gradient-to-r from-emerald-500 to-emerald-600' }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <QuotationSideBar />
      <div className="flex-1 overflow-y-auto" style={{ marginLeft: '16rem' }}>
        <QuotationNavbar 
          title="Dashboard" 
          subtitle="Overview of your quotation system"
        />

        <div className="p-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              const isPositive = parseFloat(stat.change) >= 0;
              
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                        <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                      </div>
                      <div className={`flex items-center text-sm font-medium ${
                        isPositive ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        <span>{isPositive ? '+' : ''}{stat.change}%</span>
                        <ArrowTrendingUpIcon className={`h-4 w-4 ml-1 ${!isPositive && 'rotate-180'}`} />
                      </div>
                    </div>
                    <h3 className="text-gray-600 text-sm font-medium mb-1">{stat.title}</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : stat.value}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">vs last month</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.path}
                  className={`${action.color} text-white rounded-lg p-4 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{action.title}</span>
                    <PlusIcon className="h-5 w-5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity (placeholder for future enhancement) */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
            <p className="text-gray-500 text-sm">No recent activity to display</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuotationDashboard;