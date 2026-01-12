import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute, AdminRoute, PublicRoute, EmployeeRoute } from './components/ProtectedRoute'

import Login from './pages/Login'
import Signup from './pages/Signup'
import PendingApproval from './pages/PendingApproval'
import AccountRejected from './pages/AccountRejected'
import AccountSettings from './pages/AccountSettings'

import BillingDashboard from './pages/billings/BillingDashboard'
import Providers from './pages/billings/Providers'
import ToPayBill from './pages/billings/ToPayBill'
import ActivityLogs from './pages/billings/ActivityLogs'
import PaymentHistory from './pages/billings/PaymentHistory'

import ReportDashboard from './pages/dictreport/ReportDashboard'
import DowntimeList from './pages/dictreport/DownTimeList';

import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import ApprovalPage from './pages/admin/ApprovalPage'
import EmployeeDashboard from './pages/employee/EmployeeDashboard'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

          {/* Status */}
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/account-rejected" element={<AccountRejected />} />

          {/* Employee */}
          <Route
            path="/employee"
            element={<EmployeeRoute><EmployeeDashboard /></EmployeeRoute>}
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="approval" element={<ApprovalPage />} />
            <Route path="reports" element={<div className="p-6">Reports</div>} />
            <Route path="analytics" element={<div className="p-6">Analytics</div>} />
            <Route path="system" element={<div className="p-6">System Settings</div>} />
          </Route>

          {/* Billings */}
          <Route path="/billings" element={<ProtectedRoute><BillingDashboard /></ProtectedRoute>} />
          <Route path="/billings/providers" element={<ProtectedRoute><Providers /></ProtectedRoute>} />
          <Route path="/billings/to-pay" element={<ProtectedRoute><ToPayBill /></ProtectedRoute>} />
          <Route path="/billings/logs" element={<ProtectedRoute><ActivityLogs /></ProtectedRoute>} />
          <Route path="/billings/payments" element={<ProtectedRoute><PaymentHistory /></ProtectedRoute>} />

          {/* DICT Report */}
          <Route path="/dictreport" element={<ProtectedRoute><ReportDashboard /></ProtectedRoute>} />
          <Route path="/downtime-list" element={<ProtectedRoute><DowntimeList /></ProtectedRoute>} />

          {/* Settings */}
          <Route path="/settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />

          {/* Defaults */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
