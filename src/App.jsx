import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthProvider'
import { ProtectedRoute, AdminRoute, EmployeeRoute } from './components/ProtectedRoute'

import PendingApproval from './pages/PendingApproval'
import AccountRejected from './pages/AccountRejected'
import AccountSettings from './pages/AccountSettings'

import BillingDashboard from './pages/billings/BillingDashboard'
import Providers from './pages/billings/Providers'
import ToPayBill from './pages/billings/ToPayBill'
import ActivityLogs from './pages/billings/ActivityLogs'
import PaymentHistory from './pages/billings/PaymentHistory'

import ReportDashboard from './pages/dictreport/ReportDashboard'
import DowntimeList from './pages/dictreport/DowntimeList'
import NoUptimePage from './pages/dictreport/NoUptimePage'
import EscalationReport from './pages/dictreport/EscalationReport'

import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import ApprovalPage from './pages/admin/ApprovalPage'
import EmployeeDashboard from './pages/employee/EmployeeDashboard'

// Import landing page components
import Header from './pages/landingpage/layouts/Header'
import Navigation from './pages/landingpage/layouts/Navigation'
import Footer from './pages/landingpage/layouts/Footer'
import HeroSection from './pages/landingpage/sections/HeroSection'
import AboutSection from './pages/landingpage/sections/AboutSection'
import ProjectSection from './pages/landingpage/sections/ProjectSection'
import ServicesSection from './pages/landingpage/sections/ServicesSection'
import AuthModal from './components/AuthModal'

const LandingPage = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')

  const handleLoginClick = () => {
    setAuthMode('login')
    setIsAuthModalOpen(true)
  }

  const handleGetStartedClick = () => {
    setAuthMode('signup')
    setIsAuthModalOpen(true)
  }

  const handleLearnMoreClick = () => {
    // Scroll to about section
    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen">
      <Header />
      <Navigation onLoginClick={handleLoginClick} />
      <HeroSection 
        onGetStartedClick={handleGetStartedClick}
        onLearnMoreClick={handleLearnMoreClick}
      />
      <AboutSection />
      <ProjectSection />
      <ServicesSection />
      <Footer />
      
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/account-rejected" element={<AccountRejected />} />

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

          <Route path="/billings" element={<ProtectedRoute><BillingDashboard /></ProtectedRoute>} />
          <Route path="/billings/providers" element={<ProtectedRoute><Providers /></ProtectedRoute>} />
          <Route path="/billings/to-pay" element={<ProtectedRoute><ToPayBill /></ProtectedRoute>} />
          <Route path="/billings/logs" element={<ProtectedRoute><ActivityLogs /></ProtectedRoute>} />
          <Route path="/billings/payments" element={<ProtectedRoute><PaymentHistory /></ProtectedRoute>} />

          <Route path="/dictreport" element={<ProtectedRoute><ReportDashboard /></ProtectedRoute>} />
          <Route path="/downtime-list" element={<ProtectedRoute><DowntimeList /></ProtectedRoute>} />
          <Route path="/no-uptime" element={<ProtectedRoute><NoUptimePage /></ProtectedRoute>} />
          <Route path="/escalation" element={<ProtectedRoute><EscalationReport /></ProtectedRoute>} />

          <Route path="/settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App