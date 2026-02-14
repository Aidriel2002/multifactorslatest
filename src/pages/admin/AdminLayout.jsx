import { Outlet } from 'react-router-dom'
import AdminSidebar from '../../components/AdminSidebar'

const AdminLayout = () => {

  return (
    <div className="flex min-h-screen bg-gray-100">
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
