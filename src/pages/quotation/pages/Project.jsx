import React from 'react'
import QuotationNavbar from '../components/QuotationNavbar'
import QuotationSideBar from '../components/QuotationSideBar'

function Project() {
  return (
    <div className="flex h-screen bg-gray-100">
      <QuotationSideBar />

      <div className="flex-1 overflow-y-auto" >
        <QuotationNavbar 
          title="Project" 
          subtitle="Manage Project"
        />
        </div>
    </div>
  )
}

export default Project