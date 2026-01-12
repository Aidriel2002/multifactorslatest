import { useAuth } from '../../../contexts/AuthContext'
import BillingNotification from './BillingNotification'

const BillingNavbar = ({ title, subtitle, onAddProvider }) => {
  const { profile } = useAuth()

  return (
    <div className="bg-white shadow-md">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
          </div>
          
          <div className="flex items-center space-x-4">
            {onAddProvider && (
              <button
                onClick={onAddProvider}
                className="hidden sm:flex items-center px-3 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Provider
              </button>
            )}

            <BillingNotification />

            <div className="hidden md:flex items-center">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold">
                {profile?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="ml-2">
                <p className="text-sm font-medium text-gray-700">{profile?.full_name}</p>
                <p className="text-xs text-gray-500">Billing Admin</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BillingNavbar