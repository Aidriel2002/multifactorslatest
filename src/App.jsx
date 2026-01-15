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
import DowntimeList from './pages/dictreport/DownTimeList'
import NoUptimePage from './pages/dictreport/NoUptimePage'
import EscalationReport from './pages/dictreport/EscalationReport'

import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import ApprovalPage from './pages/admin/ApprovalPage'
import EmployeeDashboard from './pages/employee/EmployeeDashboard'

// Portfolio/Landing Page Components
import Header from './components/layouts/Header'
import Navigation from './components/layouts/Navigation'
import HeroSection from './components/sections/HeroSection'
import AboutSection from './components/sections/AboutSection'
import ProjectSection from './components/sections/ProjectSection'
import ServicesSection from './components/sections/ServicesSection'
import Footer from './components/layouts/Footer'

// Landing Page Component
const LandingPage = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <Navigation />
      <HeroSection />
      <AboutSection />
      <ProjectSection />
      <ServicesSection />
      <Footer />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Landing Page - Public */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Public Routes */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

          {/* Status Pages */}
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/account-rejected" element={<AccountRejected />} />

          {/* Employee Routes */}
          <Route
            path="/employee"
            element={<EmployeeRoute><EmployeeDashboard /></EmployeeRoute>}
          />

          {/* Admin Routes */}
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

          {/* Billings Routes */}
          <Route path="/billings" element={<ProtectedRoute><BillingDashboard /></ProtectedRoute>} />
          <Route path="/billings/providers" element={<ProtectedRoute><Providers /></ProtectedRoute>} />
          <Route path="/billings/to-pay" element={<ProtectedRoute><ToPayBill /></ProtectedRoute>} />
          <Route path="/billings/logs" element={<ProtectedRoute><ActivityLogs /></ProtectedRoute>} />
          <Route path="/billings/payments" element={<ProtectedRoute><PaymentHistory /></ProtectedRoute>} />

          {/* DICT Report Routes */}
          <Route path="/dictreport" element={<ProtectedRoute><ReportDashboard /></ProtectedRoute>} />
          <Route path="/downtime-list" element={<ProtectedRoute><DowntimeList /></ProtectedRoute>} />
          <Route path="/no-uptime" element={<ProtectedRoute><NoUptimePage /></ProtectedRoute>} />
          <Route path="/escalation" element={<ProtectedRoute><EscalationReport /></ProtectedRoute>} />

          {/* Settings */}
          <Route path="/settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App