import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import AdminSidebar from "../../components/AdminSidebar";
import EmployeeSidebar from "../../components/EmployeeSidebar";

const NoUptime = () => {
  const { profile } = useAuth();
  const [phases, setPhases] = useState([]);
  const [selectedPhase, setSelectedPhase] = useState("");
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [noUptimeRecords, setNoUptimeRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [endTime, setEndTime] = useState("");
  const [googleAuthToken, setGoogleAuthToken] = useState(() => {
    const stored = sessionStorage.getItem('google_sheets_token');
    if (stored) {
      const { token, expiry } = JSON.parse(stored);
      if (expiry && Date.now() < expiry) {
        return token;
      }
      sessionStorage.removeItem('google_sheets_token');
    }
    return null;
  });

  const Sidebar = profile?.role === "admin" ? AdminSidebar : EmployeeSidebar;
  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

  const extractSpreadsheetId = (urlOrId) => {
    if (!urlOrId.includes('/')) {
      return urlOrId;
    }
    const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : urlOrId;
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const requestGoogleAuth = () => {
    return new Promise((resolve, reject) => {
      if (!window.google) {
        reject(new Error('Google API not loaded'));
        return;
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
          const expiry = Date.now() + (60 * 60 * 1000);
          sessionStorage.setItem('google_sheets_token', JSON.stringify({
            token: tokenResponse.access_token,
            expiry: expiry
          }));
          setGoogleAuthToken(tokenResponse.access_token);
          resolve(tokenResponse.access_token);
        },
        error_callback: (error) => {
          reject(new Error('Google authentication failed'));
        }
      });

      client.requestAccessToken();
    });
  };

  useEffect(() => {
    const fetchPhases = async () => {
      const { data, error } = await supabase
        .from("phases")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        setError("Failed to load phases");
        return;
      }

      setPhases(data || []);
      if (data && data.length > 0) {
        setSelectedPhase(data[0].name);
      }
    };

    fetchPhases();
  }, []);

  useEffect(() => {
    if (!selectedPhase) return;

    const fetchSheets = async () => {
      const phase = phases.find((p) => p.name === selectedPhase);
      if (!phase) return;

      const spreadsheetId = extractSpreadsheetId(phase.sheets_link);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${GOOGLE_API_KEY}`;

      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch spreadsheet metadata');
        
        const data = await response.json();
        const sheets = data.sheets.map(sheet => sheet.properties.title);
        
        setAvailableSheets(sheets);
        if (sheets.length > 0) {
          setSelectedSheet(sheets[0]);
        }
      } catch (err) {
        setError('Failed to load available sheets');
      }
    };

    fetchSheets();
  }, [selectedPhase, phases]);

  useEffect(() => {
    if (!selectedSheet || !selectedPhase) return;

    const fetchNoUptimeRecords = async () => {
      setLoading(true);
      setError("");

      const phase = phases.find((p) => p.name === selectedPhase);
      if (!phase) return;

      const spreadsheetId = extractSpreadsheetId(phase.sheets_link);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${selectedSheet}?key=${GOOGLE_API_KEY}`;

      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch data');
        
        const data = await response.json();
        const rows = data.values || [];
        
        if (rows.length < 2) {
          setNoUptimeRecords([]);
          return;
        }

        const headers = rows[0];
        const records = rows.slice(1).map((row, index) => {
          const record = { _rowNumber: index + 2 };
          headers.forEach((header, i) => {
            record[header] = row[i] || '';
          });
          return record;
        });

        // Filter records where column G (End Time) is empty but F (Start Time) has data
        const noUptimeData = records.filter(record => {
          const values = Object.values(record);
          const startTime = values[5]; // Column F
          const endTime = values[6];   // Column G
          return startTime && !endTime;
        });

        setNoUptimeRecords(noUptimeData);
      } catch (err) {
        setError('Failed to fetch no uptime records');
        setNoUptimeRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNoUptimeRecords();
  }, [selectedSheet, selectedPhase, phases]);

  const filteredRecords = useMemo(() => {
    if (!searchTerm) return noUptimeRecords;
    
    return noUptimeRecords.filter(record => {
      return Object.values(record).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [noUptimeRecords, searchTerm]);

  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredRecords.slice(startIndex, endIndex);
  }, [filteredRecords, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSheet]);

  const handleUpdateEndTime = (record) => {
    setSelectedRecord(record);
    setEndTime('');
    setIsUpdateModalOpen(true);
  };

  const handleSubmitUpdate = async () => {
    if (!endTime) {
      alert('Please select an end time');
      return;
    }

    const phase = phases.find((p) => p.name === selectedPhase);
    if (!phase) return;

    const spreadsheetId = extractSpreadsheetId(phase.sheets_link);

    try {
      let token = googleAuthToken;
      
      if (!token) {
        token = await requestGoogleAuth();
      }

      const formattedEnd = formatDateTime(endTime);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: [{
            range: `${selectedSheet}!G${selectedRecord._rowNumber}`,
            values: [[formattedEnd]]
          }]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update end time');
      }

      alert('✅ End time updated successfully!');
      setIsUpdateModalOpen(false);
      setSelectedRecord(null);
      setEndTime('');
      
      // Refresh data
      const refreshEvent = new CustomEvent('refreshData');
      window.dispatchEvent(refreshEvent);
      
      // Manually refresh
      window.location.reload();
    } catch (error) {
      alert(`Failed to update: ${error.message}`);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 ml-0 md:ml-64 overflow-y-auto">
        <div className="bg-white shadow">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              No Uptime Records
            </h1>
            <p className="text-sm text-gray-600">
              Records with missing end times
            </p>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <a
              href="/dictreport"
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white text-base font-medium rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </a>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phase</label>
                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {phases.map((phase) => (
                    <option key={phase.id} value={phase.name}>
                      {phase.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sheet</label>
                <select
                  value={selectedSheet}
                  onChange={(e) => setSelectedSheet(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableSheets.map((sheet) => (
                    <option key={sheet} value={sheet}>
                      {sheet}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  No Uptime Records
                </h2>
                <span className="text-sm text-gray-600">
                  {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Loading records...</p>
              </div>
            ) : paginatedRecords.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-gray-500">
                  {searchTerm ? 'No records match your search' : 'No records with missing end times'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {paginatedRecords.length > 0 && Object.keys(paginatedRecords[0])
                          .filter(key => key !== '_rowNumber')
                          .map((header) => (
                            <th
                              key={header}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {header}
                            </th>
                          ))}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedRecords.map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          {Object.entries(record)
                            .filter(([key]) => key !== '_rowNumber')
                            .map(([key, value]) => (
                              <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {value || '-'}
                              </td>
                            ))}
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleUpdateEndTime(record)}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Update End Time
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} records
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      {[...Array(totalPages)].map((_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`px-3 py-1 border rounded-md text-sm font-medium ${
                            currentPage === i + 1
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Update End Time Modal */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Update End Time</h2>
            
            {selectedRecord && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm font-medium text-blue-800">Site Code</p>
                <p className="text-lg font-bold text-blue-900">
                  {Object.values(selectedRecord).filter((_, i) => i === 2)[0] || 'N/A'}
                </p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsUpdateModalOpen(false);
                  setSelectedRecord(null);
                  setEndTime('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoUptime;