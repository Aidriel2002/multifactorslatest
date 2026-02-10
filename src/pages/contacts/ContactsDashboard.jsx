import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { usePageSecurity } from '../../hooks/usePageSecurity'
import { canAccessContacts } from '../../utils/rbac'
import AdminSidebar from '../../components/AdminSidebar'
import AddContactModal from './components/AddContact'

const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e) => setIsDesktop(e.matches)
    setIsDesktop(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isDesktop
}

const Pagination = ({ currentPage, totalPages, onPageChange, isDesktop }) => {
  if (totalPages <= 1) return null

  const getPages = () => {
    const pages = []
    const delta = isDesktop ? 2 : 1 

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i)
      } else if (
        i === currentPage - delta - 1 ||
        i === currentPage + delta + 1
      ) {
        pages.push('...')
      }
    }
    return pages.filter((p, i, arr) => !(p === '...' && arr[i - 1] === '...'))
  }

  return (
    <div
      className="flex items-center justify-between border-t border-gray-200 px-4 py-3"
      style={{ flexWrap: isDesktop ? 'nowrap' : 'wrap', gap: '0.5rem' }}
    >
      <button
        onClick={() => onPageChange(p => Math.max(p - 1, 1))}
        disabled={currentPage === 1}
        className="px-3 py-1.5 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ← Prev
      </button>

      <div className="flex items-center gap-1">
        {getPages().map((page, i) =>
          page === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 py-1 text-sm text-gray-400 select-none">…</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              style={{
                backgroundColor: currentPage === page ? '#2563eb' : 'transparent',
                color: currentPage === page ? '#ffffff' : '#374151',
                fontWeight: currentPage === page ? '600' : '400',
              }}
              className="w-8 h-8 rounded text-sm hover:bg-blue-50 transition-colors"
            >
              {page}
            </button>
          )
        )}
      </div>

      <button
        onClick={() => onPageChange(p => Math.min(p + 1, totalPages))}
        disabled={currentPage === totalPages}
        className="px-3 py-1.5 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next →
      </button>
    </div>
  )
}

const ContactsDashboard = () => {
  const { loading: securityLoading } = usePageSecurity(canAccessContacts)
  const { profile } = useAuth()
  const isDesktop = useIsDesktop()

  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProvince, setSelectedProvince] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  const fetchContacts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching contacts:', error)
    } else {
      setContacts(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchContacts()
  }, [])

  const handleAddContact = async (contactData) => {
    if (editingContact) {
      const { error } = await supabase
        .from('contacts')
        .update(contactData)
        .eq('id', editingContact.id)

      if (error) {
        console.error('Error updating contact:', error)
        throw error
      }
    } else {
      const { error } = await supabase
        .from('contacts')
        .insert([contactData])

      if (error) {
        console.error('Error adding contact:', error)
        throw error
      }
    }

    await fetchContacts()
    setIsAddModalOpen(false)
    setEditingContact(null)
  }

  const handleEdit = (contact) => {
    setEditingContact(contact)
    setIsAddModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (profile?.role !== 'admin') {
      alert('Only administrators can delete contacts')
      return
    }

    if (window.confirm('Are you sure you want to delete this contact?')) {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting contact:', error)
        alert('Failed to delete contact')
      } else {
        alert('Contact deleted successfully')
        await fetchContacts()
      }
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedProvince('')
    setSelectedCity('')
    setSelectedProject('')
    setSelectedType('')
    setCurrentPage(1)
  }

  useEffect(() => { setCurrentPage(1) }, [searchTerm, selectedProvince, selectedCity, selectedProject, selectedType])

  const hasActiveFilters = searchTerm || selectedProvince || selectedCity || selectedProject || selectedType

  const provinces = [...new Set(contacts.map(c => c.province).filter(Boolean))]
  const cities = [...new Set(
    contacts
      .filter(c => !selectedProvince || c.province === selectedProvince)
      .map(c => c.city)
      .filter(Boolean)
  )]
  const projects = [...new Set(contacts.map(c => c.project_name).filter(Boolean))]

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch =
      contact.site_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.contact_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.fb_account?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesProvince = !selectedProvince || contact.province === selectedProvince
    const matchesCity = !selectedCity || contact.city === selectedCity
    const matchesProject = !selectedProject || contact.project_name === selectedProject
    const matchesType = !selectedType || contact.contact_type === selectedType

    return matchesSearch && matchesProvince && matchesCity && matchesProject && matchesType
  })

  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / ITEMS_PER_PAGE))
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const stats = {
    total: contacts.length,
    contactPersons: contacts.filter(c => c.contact_type === 'Contact Person').length,
    internetProviders: contacts.filter(c => c.contact_type === 'Internet Provider').length,
    provinces: provinces.length,
  }

  const typeBadge = (type) => {
    const base = 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full'
    return type === 'Contact Person'
      ? `${base} bg-green-100 text-green-800`
      : `${base} bg-purple-100 text-purple-800`
  }

  if (securityLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSidebar />

      <div style={{ marginLeft: isDesktop ? '256px' : '0' }} className="min-h-screen transition-all">

        <div className="bg-white shadow sticky top-0 z-10">
          <div className="px-4 py-3" style={{ paddingTop: isDesktop ? '1rem' : '4rem', paddingLeft: isDesktop ? '1.5rem' : '1rem', paddingRight: isDesktop ? '1rem' : '1rem' }}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900" style={{ fontSize: isDesktop ? '1.5rem' : '1.125rem' }}>
                  Contacts Directory
                </h1>
                <p className="text-sm text-gray-600">Manage contact persons and internet providers</p>
              </div>
              <button
                onClick={() => {
                  setEditingContact(null)
                  setIsAddModalOpen(true)
                }}
                className="inline-flex items-center bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                style={{ padding: isDesktop ? '0.5rem 1rem' : '0.5rem 0.75rem' }}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {isDesktop ? 'Add Contact' : 'Add'}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4" style={{ padding: isDesktop ? '1.5rem' : '0.75rem' }}>

          <div
            className="grid gap-4 mb-6"
            style={{ gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)' }}
          >
            {[
              {
                label: 'Total Contacts',
                value: stats.total,
                color: 'text-blue-600',
                icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
              },
              {
                label: 'Contact Persons',
                value: stats.contactPersons,
                color: 'text-green-600',
                icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
              },
              {
                label: 'Internet Providers',
                value: stats.internetProviders,
                color: 'text-purple-600',
                icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
              },
              {
                label: 'Provinces',
                value: stats.provinces,
                color: 'text-orange-600',
                icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
              },
            ].map((item, i) => (
              <div key={i} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-4">
                  <div className="flex items-center">
                    <svg className={`h-7 w-7 flex-shrink-0 ${item.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {item.icon.split(' ').length > 1 && item.icon.includes('M15') && item.label === 'Provinces' ? (
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </>
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                      )}
                    </svg>
                    <div className="ml-3">
                      <div className="text-xs font-medium text-gray-500">{item.label}</div>
                      <div className="text-xl font-bold text-gray-900">{item.value}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white shadow rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">Filters</h2>
              <div className="flex items-center gap-3">
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear all
                  </button>
                )}
                {!isDesktop && (
                  <button
                    onClick={() => setShowFilters(f => !f)}
                    className="text-sm text-gray-600 hover:text-gray-800 font-medium flex items-center gap-1"
                  >
                    {showFilters ? 'Hide' : 'Show'}
                    <svg
                      className="w-4 h-4 transition-transform"
                      style={{ transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {(isDesktop || showFilters) && (
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: isDesktop ? 'repeat(5, 1fr)' : '1fr' }}
              >
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Province</label>
                  <select
                    value={selectedProvince}
                    onChange={(e) => {
                      setSelectedProvince(e.target.value)
                      setSelectedCity('')
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Provinces</option>
                    {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">City/Municipality</label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!selectedProvince}
                  >
                    <option value="">All Cities</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Project Name</label>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Projects</option>
                    {projects.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contact Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="Contact Person">Contact Person</option>
                    <option value="Internet Provider">Internet Provider</option>
                  </select>
                </div>
              </div>
            )}

            {!isDesktop && !showFilters && hasActiveFilters && (
              <p className="text-xs text-blue-600 font-medium mt-1">
                {[searchTerm, selectedProvince, selectedCity, selectedProject, selectedType].filter(Boolean).length} filter(s) active
              </p>
            )}
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Contacts ({filteredContacts.length})
              </h2>
              {!loading && filteredContacts.length > 0 && (
                <span className="text-xs text-gray-500">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredContacts.length)} of {filteredContacts.length}
                </span>
              )}
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="mt-2 text-gray-500 text-sm">No contacts found</p>
              </div>
            ) : isDesktop ? (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Site Name', 'Name', 'Contact #', 'FB Account', 'Province', 'City', 'Project', 'Type', 'Actions'].map(col => (
                          <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedContacts.map((contact, index) => (
                        <tr
                          key={contact.id}
                          style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#eff6ff'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f9fafb'}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{contact.site_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contact.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.contact_number}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.fb_account}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.province}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.city}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.project_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={typeBadge(contact.contact_type)}>{contact.contact_type}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                            <button onClick={() => handleEdit(contact)} className="text-blue-600 hover:text-blue-900 font-medium">
                              Edit
                            </button>
                            {profile?.role === 'admin' && (
                              <button onClick={() => handleDelete(contact.id)} className="text-red-600 hover:text-red-900 font-medium">
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} isDesktop={isDesktop} />
              </>
            ) : (
              <>
                <div className="divide-y divide-gray-200">
                  {paginatedContacts.map((contact, index) => (
                    <div
                      key={contact.id}
                      className="p-4 space-y-3"
                      style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-sm text-gray-900">{contact.site_name}</div>
                          <div className="text-xs text-gray-500">{contact.name}</div>
                        </div>
                        <span className={typeBadge(contact.contact_type)}>{contact.contact_type}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          { label: 'Contact #', value: contact.contact_number },
                          { label: 'FB Account', value: contact.fb_account },
                          { label: 'Province', value: contact.province },
                          { label: 'City', value: contact.city },
                          { label: 'Project', value: contact.project_name },
                        ].map(({ label, value }) => (
                          value ? (
                            <div key={label}>
                              <span className="font-medium text-gray-500 uppercase block">{label}</span>
                              <span className="text-gray-900">{value}</span>
                            </div>
                          ) : null
                        ))}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleEdit(contact)}
                          className="flex-1 text-blue-600 text-sm font-medium bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded transition-colors"
                        >
                          Edit
                        </button>
                        {profile?.role === 'admin' && (
                          <button
                            onClick={() => handleDelete(contact.id)}
                            className="flex-1 text-red-600 text-sm font-medium bg-red-50 hover:bg-red-100 px-3 py-2 rounded transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} isDesktop={isDesktop} />
              </>
            )}
          </div>
        </div>
      </div>

      <AddContactModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          setEditingContact(null)
        }}
        onSubmit={handleAddContact}
        contact={editingContact}
      />
    </div>
  )
}

export default ContactsDashboard