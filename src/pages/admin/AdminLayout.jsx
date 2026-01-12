import { Outlet } from 'react-router-dom'
import AdminSidebar from '../../components/AdminSidebar'

const AdminLayout = () => {

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 md:ml-64 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
