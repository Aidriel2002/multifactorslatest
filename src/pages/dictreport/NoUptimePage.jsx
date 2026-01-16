import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import AdminSidebar from "../../components/AdminSidebar";
import EmployeeSidebar from "../../components/EmployeeSidebar";
import UpdateUptimeModal from "./components/UpdateUptimeModal";

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
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isBulkUpdate, setIsBulkUpdate] = useState(false);
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
        error_callback: () => {
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
      } catch {
        setError('Failed to load available sheets');
      }
    };

    fetchSheets();
  }, [selectedPhase, phases, GOOGLE_API_KEY]);

  useEffect(() => {
    if (!selectedSheet || !selectedPhase) return;

    const fetchNoUptimeRecords = async () => {
      setLoading(true);
      setError("");

      const phase = phases.find((p) => p.name === selectedPhase);
      if (!phase) {
        setLoading(false);
        return;
      }

      const spreadsheetId = extractSpreadsheetId(phase.sheets_link);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${selectedSheet}?key=${GOOGLE_API_KEY}`;

      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch data');
        
        const data = await response.json();
        const rows = data.values || [];
        
        if (rows.length < 2) {
          setNoUptimeRecords([]);
          setLoading(false);
          return;
        }

        const headers = rows[0];

        const startTimeColumn = headers.find(h => 
          h && (h.includes('DOWNTIME START') || h.includes('START'))
        );
        const endTimeColumn = headers.find(h => 
          h && (h.includes('DOWNTIME END') || h.includes('END'))
        );

        const endTimeIndex = headers.indexOf(endTimeColumn);

        const records = rows.slice(1).map((row, index) => {
          const record = { 
            _rowNumber: index + 2,
            _endTimeColumnIndex: endTimeIndex,
            _sheetName: selectedSheet,
            _spreadsheetId: spreadsheetId,
            _index: index
          };
          headers.forEach((header, i) => {
            record[header] = row[i] || '';
          });
          return record;
        });

        const noUptimeData = records.filter(record => {
          const startTime = record[startTimeColumn];
          const endTime = record[endTimeColumn];
          
          const hasStartTime = startTime && startTime.trim() !== '';
          const hasNoEndTime = !endTime || endTime.trim() === '';
          
          return hasStartTime && hasNoEndTime;
        });

        setNoUptimeRecords(noUptimeData);
      } catch (err) {
        console.error('Error fetching records:', err);
        setError('Failed to fetch no uptime records: ' + err.message);
        setNoUptimeRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNoUptimeRecords();
  }, [selectedSheet, selectedPhase, phases, GOOGLE_API_KEY]);

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

  // Handle row selection
  const handleRowSelection = (record) => {
    setSelectedRecords(prev => {
      const isSelected = prev.some(r => r._index === record._index);
      if (isSelected) {
        return prev.filter(r => r._index !== record._index);
      } else {
        return [...prev, record];
      }
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedRecords.length === paginatedRecords.length && paginatedRecords.length > 0) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords([...paginatedRecords]);
    }
  };

  // Handle bulk update
  const handleBulkUpdate = () => {
    if (selectedRecords.length === 0) {
      alert('Please select at least one record');
      return;
    }
    setIsBulkUpdate(true);
    setIsUpdateModalOpen(true);
  };

  const handleSubmitUpdate = async ({ uptime }) => {
    const phase = phases.find((p) => p.name === selectedPhase);
    if (!phase) return;

    const spreadsheetId = extractSpreadsheetId(phase.sheets_link);

    try {
      let token = googleAuthToken;
      
      if (!token) {
        token = await requestGoogleAuth();
      }

      const formattedEnd = formatDateTime(uptime);
      
      // Prepare batch update for all selected records
      const updates = selectedRecords.map(record => {
        const columnLetter = String.fromCharCode(65 + record._endTimeColumnIndex);
        return {
          range: `${selectedSheet}!${columnLetter}${record._rowNumber}`,
          values: [[formattedEnd]]
        };
      });

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: updates
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update end times');
      }

      setIsUpdateModalOpen(false);
      setSelectedRecords([]);
      setIsBulkUpdate(false);
      
      alert(`✅ Successfully updated ${selectedRecords.length} record${selectedRecords.length > 1 ? 's' : ''}!`);
      
      window.location.reload();
    } catch (error) {
      throw new Error(`Failed to update: ${error.message}`);
    }
  };

  const handleCloseModal = () => {
    setIsUpdateModalOpen(false);
    setIsBulkUpdate(false);
  };

  // Create modal record for display
  const getModalRecord = () => {
    if (selectedRecords.length === 0) return null;

    const headers = Object.keys(selectedRecords[0]).filter(k => !k.startsWith('_'));
    const startTimeColumn = headers.find(h => 
      h && (h.includes('DOWNTIME START') || h.includes('START'))
    );

    if (isBulkUpdate) {
      return {
        siteCode: `${selectedRecords.length} sites selected`,
        downtime: selectedRecords[0][startTimeColumn] || '',
        sheetName: selectedSheet,
        rowNumber: `Multiple rows`,
        _original: selectedRecords
      };
    }

    const record = selectedRecords[0];
    return {
      siteCode: record['SITE CODE'] || 'N/A',
      downtime: record[startTimeColumn] || '',
      sheetName: selectedSheet,
      rowNumber: record._rowNumber,
      _original: [record]
    };
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 ml-0 md:ml-64 overflow-y-auto">
        <div className="bg-white shadow">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  No Uptime Records
                </h1>
                <p className="text-sm text-gray-600">
                  Update End of Downtime Report
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {googleAuthToken ? (
                  <div className="flex items-center px-3 py-1.5 bg-green-50 border border-green-200 rounded-md">
                    <svg className="w-4 h-4 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-sm text-green-800 font-medium"> Sheets Connected</span>
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      try {
                        await requestGoogleAuth();
                        alert('Successfully connected to Google Sheets!');
                      } catch (error) {
                        alert('Failed to connect: ' + error.message);
                      }
                    }}
                    className="flex items-center px-3 py-1.5 bg-yellow-50 border border-yellow-300 rounded-md hover:bg-yellow-100"
                  >
                    <svg className="w-4 h-4 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-yellow-800 font-medium">Connect to Sheets</span>
                  </button>
                )}
              </div>
            </div>
          </div>
          
        </div>
        

        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <a
              href="/dictreport"
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white text-base font-medium rounded-lg hover:bg-green-700 shadow-md hover:shadow-lg transition-all"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Add Downtime Report
            </a>

            {selectedRecords.length > 0 && (
              <button
                onClick={handleBulkUpdate}
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white text-base font-medium rounded-lg hover:bg-green-700 shadow-md hover:shadow-lg transition-all"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Update Selected ({selectedRecords.length})
              </button>
            )}
          </div>
          <div className="mb-4">
            
                <input
                
                  type="text"
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedRecords.length === paginatedRecords.length && paginatedRecords.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                          />
                        </th>
                        {paginatedRecords.length > 0 && Object.keys(paginatedRecords[0])
                          .filter(key => !key.startsWith('_'))
                          .map((header) => (
                            <th
                              key={header}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {header}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedRecords.map((record, index) => {
                        const isSelected = selectedRecords.some(r => r._index === record._index);
                        return (
                          <tr 
                            key={index} 
                            className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => handleRowSelection(record)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleRowSelection(record)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                              />
                            </td>
                            {Object.entries(record)
                              .filter(([key]) => !key.startsWith('_'))
                              .map(([key, value]) => (
                                <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {value || '-'}
                                </td>
                              ))}
                          </tr>
                        );
                      })}
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

      {/* Update Uptime Modal */}
      {selectedRecords.length > 0 && (
        <UpdateUptimeModal
          isOpen={isUpdateModalOpen}
          onClose={handleCloseModal}
          onSubmit={handleSubmitUpdate}
          record={getModalRecord()}
        />
      )}
    </div>
  );
};

export default NoUptime;