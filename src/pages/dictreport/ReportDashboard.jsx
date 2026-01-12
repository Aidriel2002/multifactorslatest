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

  // Initialize Google OAuth
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

  // Request Google OAuth token
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
          console.log('[Dashboard] ✅ Google token received');
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

  // Helper function to extract spreadsheet ID from URL
  const extractSpreadsheetId = (urlOrId) => {
    if (!urlOrId.includes('/')) {
      return urlOrId;
    }
    const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : urlOrId;
  };

  // Format date as MM/DD/YYYY HH:MM:SS
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

  // Write downtime data to Google Sheets (requires OAuth token)
  const writeDowntimeToSheet = async ({ spreadsheetId, sheetName, rowNumber, siteCode, startTime, endTime, cause, token }) => {
    console.log('[Dashboard] 🔍 Token check:', token ? 'Token exists ✅' : 'Token missing ❌');
    
    if (!token) {
      throw new Error('No Google OAuth token available. Please connect Google Sheets first.');
    }
    
    const formattedStart = formatDateTime(startTime);
    const formattedEnd = formatDateTime(endTime);
    
    // Get all data in columns F, G, H to find the last row with data
    const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!F:H`;
    
    const checkResponse = await fetch(checkUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    if (!checkResponse.ok) {
      throw new Error('Failed to check existing data');
    }
    
    const checkData = await checkResponse.json();
    const allRows = checkData.values || [];
    
    // Find the last row that has data in any of columns F, G, H
    let lastRowWithData = 0;
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      if (row && row.some(val => val !== '' && val !== null && val !== undefined)) {
        lastRowWithData = i + 1; // Convert to 1-based row number
      }
    }
    
    // Append to the next row after the last row with data
    const targetRow = lastRowWithData + 1;
    
    console.log('[Dashboard] 📝 Last row with data:', lastRowWithData);
    console.log('[Dashboard] 📝 Target row for writing:', targetRow);
    
    // Write to columns A (Site Code), F (Start Time), G (End Time), H (Cause)
    const requests = [
      {
        range: `${sheetName}!A${targetRow}`,
        values: [[siteCode]]
      },
      {
        range: `${sheetName}!F${targetRow}`,
        values: [[formattedStart]]
      },
      {
        range: `${sheetName}!G${targetRow}`,
        values: [[formattedEnd]]
      },
      {
        range: `${sheetName}!H${targetRow}`,
        values: [[cause]]
      }
    ];
    
    console.log('[Dashboard] 📝 Writing to multiple ranges:');
    console.log('  - Site Code (A):', siteCode);
    console.log('  - Start Time (F):', formattedStart);
    console.log('  - End Time (G):', formattedEnd);
    console.log('  - Cause (H):', cause);
    
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
      console.error('[Dashboard] ❌ Write error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to write to Google Sheets');
    }
    
    const result = await response.json();
    console.log('[Dashboard] ✅ Write successful to row:', targetRow);
    return { ...result, targetRow };
  };

  // Auto-select first phase
  const effectiveSelectedPhase = useMemo(() => {
    if (selectedPhase) return selectedPhase;
    if (phases.length > 0) return phases[0].name;
    return "";
  }, [selectedPhase, phases]);

  // Fetch phases from database
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

    console.log("[Dashboard] ✅ Loaded phases:", data.length);
    setPhases(data || []);
  };

  // Add new phase
  const handleAddPhase = async (phaseData) => {
    const { error } = await supabase.from("phases").insert([phaseData]);
    
    if (error) {
      console.error("[Dashboard] ❌ Failed to add phase:", error.message);
      throw new Error("Failed to add phase: " + error.message);
    }
    
    console.log("[Dashboard] ✅ Phase added:", phaseData.name);
    await fetchPhases();
    setIsPhaseModalOpen(false);
  };

  // Delete phase
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

    console.log("[Dashboard] ✅ Phase deleted:", phaseName);
    alert("Phase deleted successfully");
    await fetchPhases();

    if (selectedPhase === phaseName) {
      setSelectedPhase("");
    }
  };

  // Handle opening downtime modal
  const handleAddDowntime = (sheet) => {
    setSelectedSheet(sheet);
    setIsDowntimeModalOpen(true);
  };

  // Handle downtime submission
  const handleSubmitDowntime = async (downtimeData) => {
    const phase = phases.find((p) => p.name === effectiveSelectedPhase);
    
    if (!phase) {
      throw new Error("Phase not found");
    }

    const spreadsheetId = extractSpreadsheetId(phase.sheets_link);

    console.log("[Dashboard] 📝 Submitting downtime to sheet:", downtimeData.targetSheet);
    console.log("[Dashboard] Data:", downtimeData);

    try {
      let token = googleAuthToken;
      
      if (!token) {
        console.log('[Dashboard] 🔐 No Google token, requesting authentication...');
        token = await requestGoogleAuth();
      }

      await writeDowntimeToSheet({
        spreadsheetId: spreadsheetId,
        sheetName: downtimeData.targetSheet,
        rowNumber: downtimeData.rowNumber,
        siteCode: downtimeData.siteCode,
        startTime: downtimeData.startTime,
        endTime: downtimeData.endTime,
        cause: downtimeData.cause,
        token: token
      }).then((result) => {
        setIsDowntimeModalOpen(false);
        alert(`✅ Downtime record written successfully!\n\nSheet: ${downtimeData.targetSheet}\nRow: ${result.targetRow}\nSite: ${downtimeData.siteCode}`);
      });
    } catch (error) {
      console.error('[Dashboard] ❌ Write failed:', error);
      alert(`Failed to write downtime: ${error.message}`);
      throw error;
    }
  };

  // Get current spreadsheet ID for modal
  const getCurrentSpreadsheetId = () => {
    const phase = phases.find((p) => p.name === effectiveSelectedPhase);
    return phase ? extractSpreadsheetId(phase.sheets_link) : null;
  };

  // Initial load
  useEffect(() => {
    console.log("[Dashboard] 🚀 Initializing...");
    fetchPhases();
  }, []);

  // Load sheets when phase changes
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

      console.log("[Dashboard] 📊 Loading:", phase.name);
      console.log("  - Sheet:", phase.sheet_name);
      console.log("  - ID:", spreadsheetId);

      try {
        const sheetsData = await fetchSitesFromGoogleSheets({
          spreadsheetId: spreadsheetId,
          sheetName: phase.sheet_name
        });
        
        if (sheetsData.length === 0) {
          console.warn("[Dashboard] ⚠️ No data returned (sheet may be empty or have only headers)");
        } else {
          console.log("[Dashboard] ✅ Loaded records:", sheetsData.length);
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
                    <span className="text-sm text-green-800 font-medium">Google Sheets Connected</span>
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
                    <span className="text-sm text-yellow-800 font-medium">Connect Google Sheets</span>
                  </button>
                )}
                <div className="flex items-center px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
                  <svg className="w-4 h-4 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-sm text-blue-800 font-medium">{profile?.username || profile?.email}</span>
                </div>
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
            <a
              href="/downtime-list"
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white text-base font-medium rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Downtime Records
            </a>
          </div>

          {/* Phase Selector */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Phase Selection</h2>
              <button
                onClick={() => setIsPhaseModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Phase
              </button>
            </div>

            {phases.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No phases created yet</p>
                <button
                  onClick={() => setIsPhaseModalOpen(true)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Create your first phase
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {phases.map((phase) => (
                  <div
                    key={phase.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      effectiveSelectedPhase === phase.name
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPhase(phase.name)}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">{phase.name}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhase(phase.name);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{phase.sheet_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sheets Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Records {effectiveSelectedPhase && `- ${effectiveSelectedPhase}`}
              </h2>
            </div>

            {fetchingSheets ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Loading records from Google Sheets...</p>
              </div>
            ) : sheets.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2 text-gray-500">
                  {effectiveSelectedPhase ? 'No records found in the selected phase. Sheet may only have headers.' : 'Select a phase to view records'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(sheets[0]).filter(key => key !== '_rowNumber').map((header) => (
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
                    {sheets.map((sheet, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {Object.entries(sheet).filter(([key]) => key !== '_rowNumber').map(([key, value]) => (
                          <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {value}
                          </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleAddDowntime(sheet)}
                            className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add Report
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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