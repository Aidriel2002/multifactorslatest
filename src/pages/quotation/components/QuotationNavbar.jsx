import { usePageSecurity } from '../../../hooks/usePageSecurity'
import { canAccessQuotations } from '../../../utils/rbac'

const QuotationNavbar = ({ title, subtitle }) => {
    const { securityLoading } = usePageSecurity(canAccessQuotations)

    if (securityLoading) {
    return (
      <div className="bg-white shadow-md">
        <div className="px-6 py-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-b-2 border-gray-900 rounded-full" />
          </div>
        </div>
      </div>
    )
  }
  
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