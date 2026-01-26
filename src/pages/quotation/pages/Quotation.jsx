import React from 'react'
import QuotationNavbar from '../components/QuotationNavbar'
import QuotationSideBar from '../components/QuotationSideBar'

function PurchaseOrder() {
  return (
    <div className="flex h-screen bg-gray-100">
        <QuotationSideBar />

      <div className="flex-1 overflow-y-auto" style={{ marginLeft: '16rem' }}>
        <QuotationNavbar 
          title="Quotation" 
          subtitle="Manage Quotation"
        />
        </div>
    </div>
  )
}

export default PurchaseOrder
