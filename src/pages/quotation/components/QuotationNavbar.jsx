const QuotationNavbar = ({ title, subtitle }) => {
  return (
    <div className="bg-white shadow-md">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
          </div>
          <div className="flex items-center space-x-4">
          </div>
        </div>
      </div>
    </div>
  )
}
export default QuotationNavbar