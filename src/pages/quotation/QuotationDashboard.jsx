import React from 'react'
import QuotationSideBar from './components/QuotationSideBar'
import QuotationNavbar from './components/QuotationNavbar'

function QuotationDashboard() {
  return (
    <div className="flex h-screen bg-gray-100">
     <QuotationSideBar />
      <div className="flex-1 overflow-y-auto" style={{ marginLeft: '16rem' }}>
        <QuotationNavbar 
          title="Dashboard" 
          subtitle="Quotation Dashboard"
        />

        </div>
    </div>
  )
}

export default QuotationDashboard