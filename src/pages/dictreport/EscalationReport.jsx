import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import AdminSidebar from "../../components/AdminSidebar";
import EmployeeSidebar from "../../components/EmployeeSidebar";

const EscalationReport = () => {
  const { profile } = useAuth();
  const [phases, setPhases] = useState([]);
  const [selectedPhase, setSelectedPhase] = useState("");
  const [selectedProject, setSelectedProject] = useState(""); // New state for project filter
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [escalationRecords, setEscalationRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [causeOfDowntime, setCauseOfDowntime] = useState("");
  const [actionPlan, setActionPlan] = useState("");
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

  // Project options
  const projectOptions = [
    "PICS MUN",
    "PICS-PP PH2 Bukidnon",
    "PICS-PP R10 PH2",
    "PICS-PP R10 P3",
    "PICS MUN EXPANSION"
  ];

  // Cause of Downtime options
  const causeOptions = [
    "Power Outage",
    "Human Intervention",
    "Municipal Renovation",
    "Brgy Renovation",
    "Maintenance",
    "Natural Disaster",
    "Other"
  ];

  // Action Plan options
  const actionPlanOptions = [
    "None",
    "Technical Visit",
    "Remote Troubleshooting",
    "System Restart",
    "Configuration Update",
    "Hardware Replacement",
    "Software Patch",
    "Schedule Maintenance"
  ];

  const extractSpreadsheetId = (urlOrId) => {
    if (!urlOrId.includes('/')) {
      return urlOrId;
    }
    const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : urlOrId;
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
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

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

    const fetchEscalationRecords = async () => {
      setLoading(true);
      setError("");

      const phase = phases.find((p) => p.name === selectedPhase);
      if (!phase) {
        setLoading(false);
        return;
      }

      const spreadsheetId = extractSpreadsheetId(phase.sheets_link);
      // Fetch all data starting from row 1
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${selectedSheet}!A1:Z1000?key=${GOOGLE_API_KEY}`;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to fetch data');
        }
        
        const data = await response.json();
        const rows = data.values || [];
        
        if (rows.length < 5) {
          setEscalationRecords([]);
          setLoading(false);
          return;
        }

        // Headers are in row 4 (index 3)
        const headerRowIndex = 3;
        const headers = rows[headerRowIndex];
        
        // Check if we actually have headers
        if (!headers || headers.length === 0) {
          throw new Error('No headers found in row 4');
        }

        // Column D = index 3, Column E = index 4
        const causeColumnIndex = 3;
        const actionPlanColumnIndex = 4;

        // Data starts from row 5 (index 4), since row 4 is headers
        const dataRows = rows.slice(headerRowIndex + 1);
        
        const records = dataRows.map((row, index) => {
          const actualRowNumber = headerRowIndex + 2 + index; // +2 because: +1 for 1-based indexing, +1 to skip header row
          const record = { 
            _rowNumber: actualRowNumber,
            _causeColumnIndex: causeColumnIndex,
            _actionPlanColumnIndex: actionPlanColumnIndex,
            _sheetName: selectedSheet,
            _spreadsheetId: spreadsheetId,
            _index: index
          };
          headers.forEach((header, i) => {
            record[header] = row[i] || '';
          });
          return record;
        });

        // Filter for records missing cause or action plan
        const escalationData = records.filter(record => {
          const cause = record[headers[causeColumnIndex]];
          const action = record[headers[actionPlanColumnIndex]];
          
          const hasMissingCause = !cause || cause.trim() === '';
          const hasMissingAction = !action || action.trim() === '';
          
          return hasMissingCause || hasMissingAction;
        });

        setEscalationRecords(escalationData);
      } catch (err) {
        console.error('Error fetching records:', err);
        setError('Failed to fetch escalation records: ' + err.message);
        setEscalationRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEscalationRecords();
  }, [selectedSheet, selectedPhase, phases, GOOGLE_API_KEY]);

  const filteredRecords = useMemo(() => {
    let filtered = escalationRecords;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(record => {
        return Object.values(record).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Filter by project
    if (selectedProject) {
      filtered = filtered.filter(record => {
        // Assuming the Project column exists in the records
        // Adjust the column name if it's different in your sheet
        const projectValue = record['Project'] || record['PROJECT'] || '';
        return projectValue === selectedProject;
      });
    }
    
    return filtered;
  }, [escalationRecords, searchTerm, selectedProject]);

  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredRecords.slice(startIndex, endIndex);
  }, [filteredRecords, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSheet, selectedProject]);

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

  const handleSelectAll = () => {
    if (selectedRecords.length === paginatedRecords.length && paginatedRecords.length > 0) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords([...paginatedRecords]);
    }
  };

  const handleBulkUpdate = () => {
    if (selectedRecords.length === 0) {
      alert('Please select at least one record');
      return;
    }
    setCauseOfDowntime("");
    setActionPlan("");
    setIsUpdateModalOpen(true);
  };

  const handleSubmitUpdate = async () => {
    if (!causeOfDowntime && !actionPlan) {
      alert('Please select at least Cause of Downtime or Action Plan');
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

      // Prepare batch update for all selected records
      const updates = [];
      
      selectedRecords.forEach(record => {
        if (causeOfDowntime) {
          const causeColumnLetter = String.fromCharCode(65 + record._causeColumnIndex);
          updates.push({
            range: `${selectedSheet}!${causeColumnLetter}${record._rowNumber}`,
            values: [[causeOfDowntime]]
          });
        }
        
        if (actionPlan) {
          const actionColumnLetter = String.fromCharCode(65 + record._actionPlanColumnIndex);
          updates.push({
            range: `${selectedSheet}!${actionColumnLetter}${record._rowNumber}`,
            values: [[actionPlan]]
          });
        }
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
        throw new Error('Failed to update records');
      }

      setIsUpdateModalOpen(false);
      setSelectedRecords([]);
      setCauseOfDowntime("");
      setActionPlan("");
      
      alert(`✅ Successfully updated ${selectedRecords.length} record${selectedRecords.length > 1 ? 's' : ''}!`);
      
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
              Escalation Report
            </h1>
            <p className="text-sm text-gray-600">
              Records with missing cause of downtime or action plan
            </p>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Projects</option>
                  {projectOptions.map((project) => (
                    <option key={project} value={project}>
                      {project}
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
                  Escalation Records
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
                  {searchTerm || selectedProject ? 'No records match your filters' : 'No records with missing information'}
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

      {/* Update Modal */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Update Escalation Details</h2>
            
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm font-medium text-blue-800">Selected Records</p>
              <p className="text-lg font-bold text-blue-900">
                {selectedRecords.length} record{selectedRecords.length > 1 ? 's' : ''}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cause of Downtime (Column D)
                </label>
                <select
                  value={causeOfDowntime}
                  onChange={(e) => setCauseOfDowntime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Cause --</option>
                  {causeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action Plan (Column E)
                </label>
                <select
                  value={actionPlan}
                  onChange={(e) => setActionPlan(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Action Plan --</option>
                  {actionPlanOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setIsUpdateModalOpen(false);
                    setCauseOfDowntime("");
                    setActionPlan("");
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitUpdate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update Records
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EscalationReport;