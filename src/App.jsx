import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import {AuthProvider} from './contexts/AuthProvider'
import { ProtectedRoute, AdminRoute, EmployeeRoute, StaffOrAdminRoute } from './components/ProtectedRoute'
import { SecureRoute, AdminOnlyRoute, ApprovedOnlyRoute } from './components/SecureRoute'

import {
  canAccessBilling,
  canAccessContacts,
  canAccessQuotations,
  canAccessReports,
  isAdminOrStaff,
  canManageLandingPage,
  canManageKanban,
} from './utils/rbac'

import PendingApproval from './pages/PendingApproval'
import AccountRejected from './pages/AccountRejected'
import AccountSettings from './pages/AccountSettings'

import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import ApprovalPage from './pages/admin/ApprovalPage'
import EmployeeDashboard from './pages/employee/EmployeeDashboard'

import Header from './pages/landingpage/layouts/Header'
import Navigation from './pages/landingpage/layouts/Navigation'
import Footer from './pages/landingpage/layouts/Footer'
import HeroSection from './pages/landingpage/sections/HeroSection'
import AboutSection from './pages/landingpage/sections/AboutSection'
import ProductSection from './pages/landingpage/sections/ProductSection'
import ProjectSection from './pages/landingpage/sections/ProjectSection'
import ServicesSection from './pages/landingpage/sections/ServicesSection'
import ChatButton from './pages/landingpage/components/ChatButton'

import ProductList from './pages/landingpage/list/ProductList'

import KanbanBoard from './pages/kanban/KanbanBoard'

import ReportDashboard from './pages/dictreport/ReportDashboard'
import DowntimeList from './pages/dictreport/DowntimeList'
import NoUptimePage from './pages/dictreport/NoUptimePage'
import EscalationReport from './pages/dictreport/EscalationReport'

import BillingDashboard from './pages/billings/BillingDashboard'
import Providers from './pages/billings/Providers'
import ToPayBill from './pages/billings/ToPayBill'
import ActivityLogs from './pages/billings/ActivityLogs'
import PaymentHistory from './pages/billings/PaymentHistory'

import QuotationDashboard from './pages/quotation/QuotationDashboard'
import Project from './pages/quotation/pages/Project'
import PurchaseOrder from './pages/quotation/pages/PurchaseOrder'
import QuotationList from './pages/quotation/pages/QuotationList'
import CreateQuotation1 from './pages/quotation/pages/CreateQuotation1'
import CreateQuotation2 from './pages/quotation/pages/CreateQuotation2'
import ViewQuotation from './pages/quotation/pages/ViewQuotation'
import EditQuotation from './pages/quotation/pages/EditQuotation'
import EditQuotation2 from './pages/quotation/pages/EditQuotation2'
import EditPrintableTemplate from './pages/quotation/pages/EditPrintableTemplate'

import ContactsDashboard from './pages/contacts/ContactsDashboard'

import ManageProduct from './pages/landingPageContent/ManageProducts'
import ManageProject from './pages/landingPageContent/ManageProject'

import AdminSidebar from './components/AdminSidebar'
import EmployeeSidebar from './components/EmployeeSidebar'
import AuthModal from './components/AuthModal'
import AccountLogin from './components/AccountLogin'

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
      <ProductSection />
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

const ConditionalChatButton = () => {
  const location = useLocation()
  const publicRoutes = ['/', '/productlist', '/pending-approval', '/account-rejected']
  const isPublicRoute = publicRoutes.includes(location.pathname)
  return isPublicRoute ? <ChatButton /> : null
}

const AppLayoutWrapper = () => {
  const location = useLocation()
  const { profile } = useAuth()
  
  const publicRoutes = ['/', '/productlist', '/pending-approval', '/account-rejected', '/accountlogin']
  const isPublicRoute = publicRoutes.includes(location.pathname)

  const hideGlobalSidebar = 
    location.pathname === '/kanban' || 
    location.pathname === '/manageproject' || 
    location.pathname === '/manageproduct'

  if (isPublicRoute || !profile || hideGlobalSidebar) {
    return null
  }

  const isAdminOrStaff = profile.role === 'admin' || profile.role === 'staff'
  
  return isAdminOrStaff ? <AdminSidebar /> : <EmployeeSidebar />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex min-h-screen">
          <AppLayoutWrapper />
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/pending-approval" element={<PendingApproval />} />
              <Route path="/account-rejected" element={<AccountRejected />} />
              <Route path="/productlist" element={<ProductList />} />
              <Route path="/accountlogin" element={<AccountLogin />} />
              <Route
                path="/user"
                element={<EmployeeRoute><EmployeeDashboard /></EmployeeRoute>}
              />

              <Route
                path="/manageproject"
                element={
                  <SecureRoute requirePermission={canManageLandingPage}>
                    <ManageProject />
                  </SecureRoute>
                }
              />

              <Route
                path="/kanban"
                element={
                  <SecureRoute requirePermission={canManageKanban}>
                    <KanbanBoard />
                  </SecureRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <SecureRoute requirePermission={isAdminOrStaff}>
                    <AdminLayout />
                  </SecureRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route 
                  path="approval" 
                  element={
                    <AdminOnlyRoute>
                      <ApprovalPage />
                    </AdminOnlyRoute>
                  } 
                />
                <Route path="system" element={<div className="p-6">System Settings</div>} />
              </Route>

              <Route
                path="/billings"
                element={
                  <SecureRoute requirePermission={canAccessBilling}>
                    <BillingDashboard />
                  </SecureRoute>
                }
              />
              <Route
                path="/providers"
                element={
                  <SecureRoute requirePermission={canAccessBilling}>
                    <Providers />
                  </SecureRoute>
                }
              />
              <Route
                path="/paybill"
                element={
                  <SecureRoute requirePermission={canAccessBilling}>
                    <ToPayBill />
                  </SecureRoute>
                }
              />
              <Route
                path="/logs"
                element={
                  <SecureRoute requirePermission={canAccessBilling}>
                    <ActivityLogs />
                  </SecureRoute>
                }
              />
              <Route
                path="/payments"
                element={
                  <SecureRoute requirePermission={canAccessBilling}>
                    <PaymentHistory />
                  </SecureRoute>
                }
              />

              <Route
                path="/contacts/dashboard"
                element={
                  <SecureRoute requirePermission={canAccessContacts}>
                    <ContactsDashboard />
                  </SecureRoute>
                }
              />

              <Route
                path="/dictreport"
                element={
                  <SecureRoute requirePermission={canAccessReports}>
                    <ReportDashboard />
                  </SecureRoute>
                }
              />
              <Route
                path="/downtime-list"
                element={
                  <SecureRoute requirePermission={canAccessReports}>
                    <DowntimeList />
                  </SecureRoute>
                }
              />
              <Route
                path="/no-uptime"
                element={
                  <SecureRoute requirePermission={canAccessReports}>
                    <NoUptimePage />
                  </SecureRoute>
                }
              />
              <Route
                path="/escalation"
                element={
                  <SecureRoute requirePermission={canAccessReports}>
                    <EscalationReport />
                  </SecureRoute>
                }
              />

              <Route
                path="/quotation"
                element={
                  <SecureRoute requirePermission={canAccessQuotations}>
                    <QuotationDashboard />
                  </SecureRoute>
                }
              />
              <Route
                path="/project"
                element={
                  <SecureRoute requirePermission={canAccessQuotations}>
                    <Project />
                  </SecureRoute>
                }
              />
              <Route
                path="/purchase-order"
                element={
                  <SecureRoute requirePermission={canAccessQuotations}>
                    <PurchaseOrder />
                  </SecureRoute>
                }
              />
              <Route
                path="/quotationlist"
                element={
                  <SecureRoute requirePermission={canAccessQuotations}>
                    <QuotationList />
                  </SecureRoute>
                }
              />
              <Route
                path="/editprintable"
                element={
                  <SecureRoute requirePermission={canAccessQuotations}>
                    <EditPrintableTemplate />
                  </SecureRoute>
                }
              />
              <Route
                path="/quotation/create/quotation1"
                element={
                  <SecureRoute requirePermission={canAccessQuotations}>
                    <CreateQuotation1 />
                  </SecureRoute>
                }
              />
              <Route
                path="/quotation/create/quotation2"
                element={
                  <SecureRoute requirePermission={canAccessQuotations}>
                    <CreateQuotation2 />
                  </SecureRoute>
                }
              />
              <Route
                path="/quotation/view/:id"
                element={
                  <SecureRoute requirePermission={canAccessQuotations}>
                    <ViewQuotation />
                  </SecureRoute>
                }
              />
              <Route
                path="/quotation/edit/:id"
                element={
                  <SecureRoute requirePermission={canAccessQuotations}>
                    <EditQuotation />
                  </SecureRoute>
                }
              />
              <Route
                path="/quotation/edit2/:id"
                element={
                  <SecureRoute requirePermission={canAccessQuotations}>
                    <EditQuotation2 />
                  </SecureRoute>
                }
              />

              <Route
                path="/manageproduct"
                element={
                  <SecureRoute requirePermission={canManageLandingPage}>
                    <ManageProduct />
                  </SecureRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <ApprovedOnlyRoute>
                    <AccountSettings />
                  </ApprovedOnlyRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
        
        <ConditionalChatButton />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App