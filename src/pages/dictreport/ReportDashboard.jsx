import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import AdminSidebar from "../../components/AdminSidebar";
import EmployeeSidebar from "../../components/EmployeeSidebar";
import AddPhaseModal from "./components/AddPhaseModal";
import AddDowntimeModal from "./components/AddDowntimeModal";
import { fetchSitesFromGoogleSheets } from "../../lib/googleSheetsAPI";

const ReportDashboard = () => {
  const { profile } = useAuth();

  const [selectedPhase, setSelectedPhase] = useState("");
  const [phases, setPhases] = useState([]);
  const [sheets, setSheets] = useState([]);
  const [fetchingSheets, setFetchingSheets] = useState(false);
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [isDowntimeModalOpen, setIsDowntimeModalOpen] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' }); // Add this line
  const [selectedRows, setSelectedRows] = useState([]); // Add this line for multi-select
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

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

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
          console.error('[Dashboard] ❌ Google auth error:', error);
          reject(new Error('Google authentication failed'));
        }
      });

      client.requestAccessToken();
    });
  };

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

  const writeDowntimeToSheet = async ({ spreadsheetId, sheetName, siteCode, startTime, endTime, cause, actionTaken, token }) => {
  
  if (!token) {
    throw new Error('No Google OAuth token available. Please connect Google Sheets first.');
  }
  
  console.log('[WriteToSheet] Starting write for:', { 
    sheetName, 
    siteCode, 
    startTime, 
    endTime, 
    cause, 
    actionTaken 
  });
  
  // First, check existing data to find the next empty row
  const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:S`;
  
  const checkResponse = await fetch(checkUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
    }
  });
  
  if (!checkResponse.ok) {
    const errorData = await checkResponse.json();
    console.error('[WriteToSheet] ❌ Check failed:', errorData);
    throw new Error('Failed to check existing data: ' + (errorData.error?.message || 'Unknown error'));
  }
  
  const checkData = await checkResponse.json();
  const allRows = checkData.values || [];
  
  console.log('[WriteToSheet] Total rows in sheet:', allRows.length);
  
  // Find the last row with any data
  let lastRowWithData = 0;
  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];
    if (row && row.some(val => val !== '' && val !== null && val !== undefined)) {
      lastRowWithData = i + 1;
    }
  }
  
  // Target row is the next row after the last row with data
  const targetRow = lastRowWithData + 1;
  
  console.log('[WriteToSheet] Last row with data:', lastRowWithData);
  console.log('[WriteToSheet] Writing to row:', targetRow);
  
  // Prepare the batch update request
  const requests = [
    {
      range: `${sheetName}!A${targetRow}`,
      values: [[siteCode]]
    },
    {
      range: `${sheetName}!F${targetRow}`,
      values: [[startTime]]
    },
    {
      range: `${sheetName}!G${targetRow}`,
      values: [[endTime]]
    },
    {
      range: `${sheetName}!R${targetRow}`,
      values: [[cause]]
    },
    {
      range: `${sheetName}!S${targetRow}`,
      values: [[actionTaken]]
    }
  ];
  
  console.log('[WriteToSheet] Batch update requests:', requests);
  
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: requests
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error('[WriteToSheet] ❌ Write error:', errorData);
    throw new Error(errorData.error?.message || 'Failed to write to Google Sheets');
  }
  
  const result = await response.json();
  console.log('[WriteToSheet] ✅ Write successful:', result);
  
  return { ...result, targetRow, siteCode };
};

  const effectiveSelectedPhase = useMemo(() => {
    if (selectedPhase) return selectedPhase;
    if (phases.length > 0) return phases[0].name;
    return "";
  }, [selectedPhase, phases]);

  const filteredSheets = useMemo(() => {
    if (!searchTerm) return sheets;
    
    return sheets.filter(sheet => {
      return Object.values(sheet).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [sheets, searchTerm]);

  const paginatedSheets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredSheets.slice(startIndex, endIndex);
  }, [filteredSheets, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredSheets.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, effectiveSelectedPhase]);

  const fetchPhases = async () => {
    const { data, error } = await supabase
      .from("phases")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[Dashboard] ❌ Failed to fetch phases:", error.message);
      setError("Failed to load phases");
      return;
    }

    setPhases(data || []);
  };

  const handleAddPhase = async (phaseData) => {
    const { error } = await supabase.from("phases").insert([phaseData]);
    
    if (error) {
      console.error("[Dashboard] ❌ Failed to add phase:", error.message);
      throw new Error("Failed to add phase: " + error.message);
    }
    
    await fetchPhases();
    setIsPhaseModalOpen(false);
  };

  const handleDeletePhase = async (phaseName) => {
    if (
      !window.confirm(
        `Delete phase "${phaseName}"? This will remove the phase from the list (Google Sheet data will not be affected).`
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("phases")
      .delete()
      .eq("name", phaseName);

    if (error) {
      console.error("[Dashboard] ❌ Failed to delete phase:", error.message);
      alert("Failed to delete phase");
      return;
    }

    alert("Phase deleted successfully");
    await fetchPhases();

    if (selectedPhase === phaseName) {
      setSelectedPhase("");
    }
  };

  const handleAddDowntime = (sheet) => {
    setSelectedSheet(sheet);
    setIsDowntimeModalOpen(true);
  };

  const handleSubmitDowntime = async (downtimeData) => {
  const phase = phases.find((p) => p.name === effectiveSelectedPhase);
  
  if (!phase) {
    throw new Error("Phase not found");
  }

  const spreadsheetId = extractSpreadsheetId(phase.sheets_link);

  try {
    let token = googleAuthToken;
    
    if (!token) {
      token = await requestGoogleAuth();
    }

    console.log('[Dashboard] Submitting downtime for site:', downtimeData.siteCode);

    const result = await writeDowntimeToSheet({
      spreadsheetId: spreadsheetId,
      sheetName: downtimeData.targetSheet,
      siteCode: downtimeData.siteCode,
      startTime: downtimeData.startTime,
      endTime: downtimeData.endTime,
      cause: downtimeData.cause,
      actionTaken: downtimeData.actionTaken,
      token: token
    });

    console.log('[Dashboard] ✅ Successfully written to row:', result.targetRow);
    
    // Don't close modal or show alert here - let the modal handle it
    return result;
  } catch (error) {
    console.error('[Dashboard] ❌ Write failed:', error);
    throw error;
  }
};

  const getCurrentSpreadsheetId = () => {
    const phase = phases.find((p) => p.name === effectiveSelectedPhase);
    return phase ? extractSpreadsheetId(phase.sheets_link) : null;
  };

  useEffect(() => {
    fetchPhases();
  }, []);

  useEffect(() => {
    if (!effectiveSelectedPhase || phases.length === 0) {
      setSheets([]);
      return;
    }

    const loadSheetsForPhase = async () => {
      const phase = phases.find((p) => p.name === effectiveSelectedPhase);

      if (!phase || !phase.sheets_link || !phase.sheet_name) {
        console.error("[Dashboard] ❌ Incomplete phase config");
        setSheets([]);
        setError("Phase configuration is incomplete");
        return;
      }

      setFetchingSheets(true);
      setError("");

      const spreadsheetId = extractSpreadsheetId(phase.sheets_link);

      try {
        const sheetsData = await fetchSitesFromGoogleSheets({
          spreadsheetId: spreadsheetId,
          sheetName: phase.sheet_name
        });
        
        if (sheetsData.length === 0) {
          console.warn("[Dashboard] ⚠️ No data returned (sheet may be empty or have only headers)");
        } else {
          console.log();
        }
        
        setSheets(sheetsData);
      } catch (err) {
        console.error("[Dashboard] ❌ Load failed:", err.message);
        setError(err.message || "Failed to fetch sheets from Google Sheets");
        setSheets([]);
      } finally {
        setFetchingSheets(false);
      }
    };

    loadSheetsForPhase();
  }, [effectiveSelectedPhase, phases]);


  // Add this function to handle row selection
const handleRowSelection = (sheet, index) => {
  setSelectedRows(prev => {
    const isSelected = prev.some(row => row._index === index);
    if (isSelected) {
      return prev.filter(row => row._index !== index);
    } else {
      return [...prev, { ...sheet, _index: index }];
    }
  });
};

// Add this function to handle select all
const handleSelectAll = () => {
  if (selectedRows.length === paginatedSheets.length) {
    setSelectedRows([]);
  } else {
    setSelectedRows(paginatedSheets.map((sheet, index) => ({ ...sheet, _index: index })));
  }
};

// Add this function to handle bulk report creation
const handleCreateBulkReports = () => {
  if (selectedRows.length === 0) {
    alert('Please select at least one record');
    return;
  }
  // You can modify this to open a modal for bulk report creation
  // For now, we'll just process them one by one
  setIsDowntimeModalOpen(true);
  setSelectedSheet(selectedRows);
};

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 ml-0 md:ml-64 overflow-y-auto">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Downtime Report Dashboard
                </h1>
                <p className="text-sm text-gray-600">
                  Track and manage downtime records via Google Sheets
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

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
        <div className="mb-6">

          <div className="flex flex-row items-center justify-between">

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/downtime-list"
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white text-base font-medium rounded-lg hover:bg-green-700 shadow-md hover:shadow-lg transition-all"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Downtime Records
              </a>
              <a
                href="/no-uptime"
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white text-base font-medium rounded-lg hover:bg-green-700 shadow-md hover:shadow-lg transition-all"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                No Uptime
              </a>
              <a
                href="/escalation"
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white text-base font-medium rounded-lg hover:bg-green-700 shadow-md hover:shadow-lg transition-all"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Escalation Report
              </a>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm placeholder-gray-400"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="bttnss">
              <button onClick={() => setIsPhaseModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Phase
              </button>
            </div>
          </div>
      </div>
          {/* Phase Selector */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Phases</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {phases.length === 0 ? 'Get started by creating a phase' : `${phases.length} phase${phases.length !== 1 ? 's' : ''} configured`}
                </p>
              </div>
            
            {phases.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-600 font-medium mb-2">No phases yet</p>
                <p className="text-gray-500 text-sm mb-4">Create your first phase to get started</p>
                <button
                  onClick={() => setIsPhaseModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Phase
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <div className="relative inline-block flex-1 min-w-64 max-w-md">
                    <select
                      value={effectiveSelectedPhase}
                      onChange={(e) => setSelectedPhase(e.target.value)}
                      className="block w-full pl-4 pr-10 py-3 text-base border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-white cursor-pointer hover:border-gray-400 transition-colors appearance-none"
                    >
                      {phases.map((phase) => (
                        <option key={phase.id} value={phase.name}>
                          {phase.name} - {phase.sheet_name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeletePhase(effectiveSelectedPhase)}
                    className="flex-shrink-0 p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 border-2 border-gray-300 hover:border-red-300 rounded-lg transition-colors"
                    title="Delete selected phase"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Sheets Table */}
  <div className="bg-white shadow rounded-lg overflow-hidden">
  <div className="px-6 py-4 border-b border-gray-200">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold text-gray-900">
        Records {effectiveSelectedPhase && `- ${effectiveSelectedPhase}`}
      </h2>
      <div className="flex items-center gap-4">
        {selectedRows.length > 0 && (
          <button
            onClick={handleCreateBulkReports}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 shadow-sm transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Reports ({selectedRows.length})
          </button>
        )}
        {filteredSheets.length > 0 && (
          <p className="text-sm text-gray-500">
            Showing {paginatedSheets.length} of {filteredSheets.length} records
          </p>
        )}
      </div>
    </div>
  </div>

  {fetchingSheets ? (
    <div className="text-center py-12">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p className="mt-2 text-gray-600">Loading records from Google Sheets...</p>
    </div>
  ) : paginatedSheets.length === 0 ? (
    <div className="text-center py-12">
      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="mt-2 text-gray-500">
        {searchTerm 
          ? `No records found matching "${searchTerm}"` 
          : effectiveSelectedPhase 
            ? 'No records found in the selected phase. Sheet may only have headers.' 
            : 'Select a phase to view records'
        }
      </p>
      {searchTerm && (
        <button
          onClick={() => setSearchTerm('')}
          className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          Clear Search
        </button>
      )}
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
                  checked={selectedRows.length === paginatedSheets.length && paginatedSheets.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                />
              </th>
              {Object.keys(paginatedSheets[0]).filter(key => key !== '_rowNumber').map((header) => (
                <th
                  key={header}
                  onClick={() => handleSort(header)}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>{header}</span>
                    {sortConfig.key === header && (
                      <svg
                        className={`w-4 h-4 transition-transform ${
                          sortConfig.direction === 'desc' ? 'transform rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedSheets.map((sheet, index) => {
              const isSelected = selectedRows.some(row => row._index === index);
              return (
                <tr 
                  key={index} 
                  className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleRowSelection(sheet, index)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleRowSelection(sheet, index)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                      />
                      {isSelected && (
                        <></>
                      )}
                    </div>
                  </td>
                  {Object.entries(sheet).filter(([key]) => key !== '_rowNumber').map(([key, value]) => (
                    <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {value}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{currentPage}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === i + 1
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  )}
</div>
        </div>
      </div>

      {/* Add Phase Modal */}
      <AddPhaseModal
        isOpen={isPhaseModalOpen}
        onClose={() => setIsPhaseModalOpen(false)}
        onSubmit={handleAddPhase}
      />

      {/* Add Downtime Modal */}
      <AddDowntimeModal
        isOpen={isDowntimeModalOpen}
        onClose={() => {
          setIsDowntimeModalOpen(false);
          setSelectedSheet(null);
        }}
        onSubmit={handleSubmitDowntime}
        sheet={selectedSheet}
        spreadsheetId={getCurrentSpreadsheetId()}
      />
    </div>
  );
};

export default ReportDashboard;