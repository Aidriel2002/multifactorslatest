import { useAuth } from '../../contexts/AuthContext'
import EmployeeSidebar from '../../components/EmployeeSidebar'

const EmployeeDashboard = () => {
  const { profile } = useAuth()

  return (
    <div className="flex h-screen bg-gray-100">
      <EmployeeSidebar />
      
      <div className="flex-1 ml-64 overflow-y-auto">
        <div className="bg-white shadow">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome back, {profile?.full_name}</p>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-6 py-5">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Welcome, {profile?.full_name}!
              </h2>
              <p className="text-gray-600">
                You are logged in as an User. There's nothing here yet.
              </p>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-6 py-5">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Profile Information
              </h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{profile?.full_name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{profile?.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Role</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">{profile?.role}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                      {profile?.status}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                PLEASE CONTACT ADMINISTRATOR FOR MORE INFORMATION
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmployeeDashboard