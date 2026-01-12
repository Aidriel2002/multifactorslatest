import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import AdminSidebar from "../../components/AdminSidebar";
import EmployeeSidebar from "../../components/EmployeeSidebar";
import { fetchSitesFromGoogleSheets } from "../../lib/googleSheetsAPI";

const DowntimeList = () => {
  const { profile } = useAuth();

  const [phases, setPhases] = useState([]);
  const [selectedPhase, setSelectedPhase] = useState("");
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [downtimeRecords, setDowntimeRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const Sidebar = profile?.role === "admin" ? AdminSidebar : EmployeeSidebar;
  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

  // Helper function to extract spreadsheet ID from URL
  const extractSpreadsheetId = (urlOrId) => {
    if (!urlOrId.includes('/')) {
      return urlOrId;
    }
    const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : urlOrId;
  };

  // Fetch phases from database
  useEffect(() => {
    const fetchPhases = async () => {
      const { data, error } = await supabase
        .from("phases")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[DowntimeList] ❌ Failed to fetch phases:", error.message);
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

  // Fetch available sheets when phase changes
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
        console.error('[DowntimeList] Error fetching sheets:', err);
        setError('Failed to load available sheets');
      }
    };

    fetchSheets();
  }, [selectedPhase, phases]);

  // Fetch downtime records when sheet changes
  useEffect(() => {
    if (!selectedSheet || !selectedPhase) return;

    const fetchDowntimeRecords = async () => {
      setLoading(true);
      setError("");

      const phase = phases.find((p) => p.name === selectedPhase);
      if (!phase) return;

      const spreadsheetId = extractSpreadsheetId(phase.sheets_link);

      try {
        const records = await fetchSitesFromGoogleSheets({
          spreadsheetId: spreadsheetId,
          sheetName: selectedSheet
        });

        // Filter records that have downtime data (columns F and G)
        const downtimeData = records.filter(record => {
          const values = Object.values(record);
          // Check if there's data in what would be columns F and G (index 5 and 6)
          return values.length >= 7 && (values[5] || values[6]);
        });

        console.log('[DowntimeList] ✅ Loaded downtime records:', downtimeData.length);
        setDowntimeRecords(downtimeData);
      } catch (err) {
        console.error('[DowntimeList] ❌ Load failed:', err.message);
        setError(err.message || 'Failed to fetch downtime records');
        setDowntimeRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDowntimeRecords();
  }, [selectedSheet, selectedPhase, phases]);

  // Calculate downtime duration
  const calculateDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const diffMs = endDate - startDate;
      
      if (diffMs <= 0) return 'Invalid';
      
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${hours}h ${minutes}m`;
    } catch (error) {
      return 'Invalid';
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 ml-64 overflow-y-auto">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Downtime Records
            </h1>
            <p className="text-sm text-gray-600">
              View all downtime records from Google Sheets
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Add Downtime Report
            </a>
          </div>
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

          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phase
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sheet
                </label>
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

          {/* Stats */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 text-3xl">⏱️</div>
                  <div className="ml-5 w-0 flex-1">
                    <div className="text-sm font-medium text-gray-500">Total Downtime Records</div>
                    <div className="text-2xl font-bold text-gray-900">{downtimeRecords.length}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 text-3xl">📊</div>
                  <div className="ml-5 w-0 flex-1">
                    <div className="text-sm font-medium text-gray-500">Selected Phase</div>
                    <div className="text-2xl font-bold text-gray-900 truncate">{selectedPhase || 'None'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 text-3xl">📄</div>
                  <div className="ml-5 w-0 flex-1">
                    <div className="text-sm font-medium text-gray-500">Selected Sheet</div>
                    <div className="text-2xl font-bold text-gray-900 truncate">{selectedSheet || 'None'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Downtime Records Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Downtime Records
              </h2>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Loading downtime records...</p>
              </div>
            ) : downtimeRecords.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-gray-500">
                  No downtime records found in this sheet
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {downtimeRecords.length > 0 && Object.keys(downtimeRecords[0])
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
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {downtimeRecords.map((record, index) => {
                      const values = Object.entries(record).filter(([key]) => key !== '_rowNumber');
                      const startTime = values[5]?.[1]; // Column F
                      const endTime = values[6]?.[1];   // Column G
                      
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          {values.map(([key, value]) => (
                            <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {value || '-'}
                            </td>
                          ))}
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {calculateDuration(startTime, endTime)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DowntimeList;