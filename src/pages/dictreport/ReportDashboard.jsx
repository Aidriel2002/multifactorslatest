import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import AddPhaseModal from "./components/AddPhaseModal";
import AddDowntimeModal from "./components/AddDowntimeModal";
import { fetchSitesFromGoogleSheets } from "../../lib/googleSheetsAPI";
import { usePageSecurity } from "../../hooks/usePageSecurity";
import { canAccessReports } from "../../utils/rbac";

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#F3F4F6'
  },
  mainContent: {
    flex: 1,
    width: '100%',
    overflowY: 'auto'
  },
  header: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
  },
  headerInner: {
    padding: '1rem'
  },
  headerFlex: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#111827'
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#4B5563',
    marginTop: '0.25rem'
  },
  buttonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem 1rem',
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    fontSize: '0.875rem',
    fontWeight: '500',
    borderRadius: '0.5rem',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    transition: 'all 0.2s'
  },
  buttonSuccess: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem 1.5rem',
    backgroundColor: '#16A34A',
    color: '#FFFFFF',
    fontSize: '0.875rem',
    fontWeight: '500',
    borderRadius: '0.5rem',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s',
    textDecoration: 'none'
  },
  input: {
    display: 'block',
    width: '100%',
    padding: '0.5rem 0.75rem 0.5rem 2.5rem',
    border: '2px solid #D1D5DB',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    backgroundColor: '#FFFFFF',
    outline: 'none'
  },
  card: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    borderRadius: '0.5rem',
    overflow: 'hidden'
  },
  cardPadding: {
    padding: '1rem'
  },
  errorBox: {
    padding: '1rem',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '0.375rem',
    marginBottom: '1rem'
  },
  select: {
    display: 'block',
    width: '100%',
    padding: '0.5rem 2.5rem 0.5rem 1rem',
    fontSize: '0.875rem',
    border: '2px solid #D1D5DB',
    borderRadius: '0.5rem',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    outline: 'none',
    appearance: 'none'
  },
  table: {
    minWidth: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '0.75rem 1.5rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    backgroundColor: '#F9FAFB',
    cursor: 'pointer',
    userSelect: 'none'
  },
  td: {
    padding: '1rem 1.5rem',
    whiteSpace: 'nowrap',
    fontSize: '0.875rem',
    color: '#111827'
  },
  mobileCard: {
    padding: '1rem',
    borderBottom: '1px solid #E5E7EB',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  }
};

const ReportDashboard = () => {
  const { profile, securityLoading } = usePageSecurity(canAccessReports);

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
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' }); 
  const [selectedRows, setSelectedRows] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
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

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const writeDowntimeToSheet = async ({ spreadsheetId, sheetName, siteCode, startTime, endTime, cause, actionTaken, token }) => {
    if (!token) {
      throw new Error('No Google OAuth token available. Please connect Google Sheets first.');
    }
    
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
    
    let lastRowWithData = 0;
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      if (row && row.some(val => val !== '' && val !== null && val !== undefined)) {
        lastRowWithData = i + 1;
      }
    }
    
    const targetRow = lastRowWithData + 1;
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

  const handleSelectAll = () => {
    if (selectedRows.length === paginatedSheets.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedSheets.map((sheet, index) => ({ ...sheet, _index: index })));
    }
  };

  const handleCreateBulkReports = () => {
    if (selectedRows.length === 0) {
      alert('Please select at least one record');
      return;
    }
    setIsDowntimeModalOpen(true);
    setSelectedSheet(selectedRows);
  };

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  if (securityLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' }}>
        <div style={{ 
          animation: 'spin 1s linear infinite', 
          height: '3rem', 
          width: '3rem', 
          borderBottom: '2px solid #2563EB', 
          borderRadius: '50%' 
        }} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.mainContent}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerInner}>
            <div style={{ 
              display: 'flex', 
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: '1rem'
            }}>
              <div>
                <h1 style={styles.title}>
                  Downtime Report Dashboard
                </h1>
                <p style={styles.subtitle}>
                  Track and manage downtime records via Google Sheets
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', width: isMobile ? '100%' : 'auto' }}>
                {googleAuthToken ? (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '0.625rem 1rem', 
                    backgroundColor: '#FFFFFF', 
                    border: '2px solid #10B981', 
                    borderRadius: '0.5rem', 
                    width: isMobile ? '100%' : 'auto', 
                    justifyContent: 'center',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{
                      width: '2rem',
                      height: '2rem',
                      backgroundColor: '#D1FAE5',
                      borderRadius: '0.375rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '0.75rem'
                    }}>
                      <svg style={{ width: '1.25rem', height: '1.25rem', color: '#10B981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Status</span>
                      <span style={{ fontSize: '0.875rem', color: '#059669', fontWeight: '600' }}>Connected to Sheets</span>
                    </div>
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
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '0.625rem 1.25rem', 
                      backgroundColor: '#FFFFFF', 
                      border: '2px solid #E5E7EB', 
                      borderRadius: '0.5rem', 
                      width: isMobile ? '100%' : 'auto', 
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                      e.currentTarget.style.borderColor = '#2563EB';
                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#E5E7EB';
                      e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    <div style={{
                      width: '2rem',
                      height: '2rem',
                      background: 'linear-gradient(135deg, #4285F4 0%, #34A853 50%, #FBBC05 75%, #EA4335 100%)',
                      borderRadius: '0.375rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '0.75rem'
                    }}>
                      <svg style={{ width: '1.25rem', height: '1.25rem', color: '#FFFFFF' }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4c-1.48 0-2.85.43-4.01 1.17l1.46 1.46C10.21 6.23 11.08 6 12 6c3.04 0 5.5 2.46 5.5 5.5v.5H19c1.66 0 3 1.34 3 3 0 1.13-.64 2.11-1.56 2.62l1.45 1.45C23.16 18.16 24 16.68 24 15c0-2.64-2.05-4.78-4.65-4.96zM3 5.27l2.75 2.74C2.56 8.15 0 10.77 0 14c0 3.31 2.69 6 6 6h11.73l2 2L21 20.73 4.27 4 3 5.27zM7.73 10l8 8H6c-2.21 0-4-1.79-4-4s1.79-4 4-4h1.73z"/>
                      </svg>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Not Connected</span>
                      <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '600' }}>Connect Google Sheets</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '1rem' }}>
          {/* Error Message */}
          {error && (
            <div style={styles.errorBox}>
              <div style={{ display: 'flex' }}>
                <svg style={{ height: '1.25rem', width: '1.25rem', color: '#EF4444' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div style={{ marginLeft: '0.75rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#991B1B' }}>{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: isMobile ? 'column' : 'row', 
              gap: '0.75rem',
              justifyContent: 'space-between'
            }}>
              <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                flexWrap: 'wrap', 
                gap: '0.5rem' 
              }}>
                <a
                  href="/downtime-list"
                  style={{
                    ...styles.buttonSuccess,
                    textDecoration: 'none',
                    width: isMobile ? '100%' : 'auto'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803D'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16A34A'}
                >
                  <svg style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Downtime Records
                </a>
                <a
                  href="/no-uptime"
                  style={{
                    ...styles.buttonSuccess,
                    textDecoration: 'none',
                    width: isMobile ? '100%' : 'auto'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803D'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16A34A'}
                >
                  <svg style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  No Uptime
                </a>
                <a
                  href="/escalation"
                  style={{
                    ...styles.buttonSuccess,
                    textDecoration: 'none',
                    width: isMobile ? '100%' : 'auto'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803D'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16A34A'}
                >
                  <svg style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Escalation Report
                </a>

                {/* Search Bar */}
                <div style={{ position: 'relative', width: isMobile ? '100%' : '250px' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, display: 'flex', alignItems: 'center', paddingLeft: '0.75rem', pointerEvents: 'none' }}>
                    <svg style={{ height: '1.25rem', width: '1.25rem', color: '#9CA3AF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.input}
                    onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                    onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', paddingRight: '0.75rem', color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <svg style={{ height: '1.25rem', width: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* New Phase Button */}
              <div style={{ width: isMobile ? '100%' : 'auto' }}>
                <button 
                  onClick={() => setIsPhaseModalOpen(true)}
                  style={{
                    ...styles.buttonPrimary,
                    width: isMobile ? '100%' : 'auto'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1D4ED8'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563EB'}
                >
                  <svg style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New Phase
                </button>
              </div>
            </div>
          </div>

          {/* Phases Section */}
          <div style={{ ...styles.card, ...styles.cardPadding, marginBottom: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '0.75rem', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>Phases</h2>
                <p style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '0.25rem' }}>
                  {phases.length === 0 ? 'Get started by creating a phase' : `${phases.length} phase${phases.length !== 1 ? 's' : ''} configured`}
                </p>
              </div>
            
            {phases.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', border: '2px dashed #D1D5DB', borderRadius: '0.5rem', backgroundColor: '#F9FAFB', marginTop: '1rem' }}>
                <svg style={{ width: '3rem', height: '3rem', margin: '0 auto', color: '#9CA3AF', marginBottom: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p style={{ color: '#4B5563', fontWeight: '500', marginBottom: '0.5rem' }}>No phases yet</p>
                <p style={{ color: '#6B7280', fontSize: '0.875rem', marginBottom: '1rem' }}>Create your first phase to get started</p>
                <button
                  onClick={() => setIsPhaseModalOpen(true)}
                  style={styles.buttonPrimary}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1D4ED8'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563EB'}
                >
                  <svg style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Phase
                </button>
              </div>
            ) : (
              <div style={{ marginTop: isMobile ? '1rem' : '0' }}>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '0.5rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <select
                      value={effectiveSelectedPhase}
                      onChange={(e) => setSelectedPhase(e.target.value)}
                      style={styles.select}
                      onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                      onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                    >
                      {phases.map((phase) => (
                        <option key={phase.id} value={phase.name}>
                          {phase.name} - {phase.sheet_name}
                        </option>
                      ))}
                    </select>
                    <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', paddingRight: '0.75rem', pointerEvents: 'none', color: '#6B7280' }}>
                      <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeletePhase(effectiveSelectedPhase)}
                    style={{ 
                      padding: '0.75rem', 
                      color: '#9CA3AF', 
                      backgroundColor: 'transparent',
                      border: '2px solid #D1D5DB', 
                      borderRadius: '0.5rem', 
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title="Delete selected phase"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#DC2626';
                      e.currentTarget.style.backgroundColor = '#FEF2F2';
                      e.currentTarget.style.borderColor = '#FECACA';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#9CA3AF';
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = '#D1D5DB';
                    }}
                  >
                    <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Records Table */}
          <div style={styles.card}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '0.75rem', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                  Records {effectiveSelectedPhase && `- ${effectiveSelectedPhase}`}
                </h2>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '0.5rem' }}>
                  {selectedRows.length > 0 && (
                    <button
                      onClick={handleCreateBulkReports}
                      style={{
                        ...styles.buttonSuccess,
                        padding: '0.5rem 1rem'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803D'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16A34A'}
                    >
                      <svg style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create Reports ({selectedRows.length})
                    </button>
                  )}
                  {filteredSheets.length > 0 && (
                    <p style={{ fontSize: '0.875rem', color: '#6B7280', textAlign: isMobile ? 'center' : 'left', alignSelf: 'center' }}>
                      Showing {paginatedSheets.length} of {filteredSheets.length} records
                    </p>
                  )}
                </div>
              </div>
            </div>

            {fetchingSheets ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ 
                  display: 'inline-block',
                  animation: 'spin 1s linear infinite', 
                  borderRadius: '50%', 
                  height: '2rem', 
                  width: '2rem', 
                  borderBottom: '2px solid #2563EB' 
                }}></div>
                <p style={{ marginTop: '0.5rem', color: '#4B5563' }}>Loading records from Google Sheets...</p>
              </div>
            ) : paginatedSheets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <svg style={{ width: '3rem', height: '3rem', margin: '0 auto', color: '#9CA3AF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p style={{ marginTop: '0.5rem', color: '#6B7280' }}>
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
                    style={{ ...styles.buttonPrimary, marginTop: '1rem' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1D4ED8'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563EB'}
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                {!isMobile && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                      <thead style={{ backgroundColor: '#F9FAFB' }}>
                        <tr>
                          <th style={styles.th}>
                            <input
                              type="checkbox"
                              checked={selectedRows.length === paginatedSheets.length && paginatedSheets.length > 0}
                              onChange={handleSelectAll}
                              style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
                            />
                          </th>
                          {Object.keys(paginatedSheets[0]).filter(key => key !== '_rowNumber').map((header) => (
                            <th
                              key={header}
                              onClick={() => handleSort(header)}
                              style={styles.th}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span>{header}</span>
                                {sortConfig.key === header && (
                                  <svg
                                    style={{
                                      width: '1rem',
                                      height: '1rem',
                                      transform: sortConfig.direction === 'desc' ? 'rotate(180deg)' : 'none',
                                      transition: 'transform 0.2s'
                                    }}
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
                      <tbody style={{ backgroundColor: '#FFFFFF' }}>
                        {paginatedSheets.map((sheet, index) => {
                          const isSelected = selectedRows.some(row => row._index === index);
                          return (
                            <tr 
                              key={index}
                              onClick={() => handleRowSelection(sheet, index)}
                              style={{
                                cursor: 'pointer',
                                backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                                borderBottom: '1px solid #E5E7EB'
                              }}
                              onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                              onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                            >
                              <td style={styles.td}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleRowSelection(sheet, index)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
                                />
                              </td>
                              {Object.entries(sheet).filter(([key]) => key !== '_rowNumber').map(([key, value]) => (
                                <td key={key} style={styles.td}>
                                  {value}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Mobile Card View */}
                {isMobile && (
                  <div style={{ borderTop: '1px solid #E5E7EB' }}>
                    {paginatedSheets.map((sheet, index) => {
                      const isSelected = selectedRows.some(row => row._index === index);
                      return (
                        <div 
                          key={index}
                          onClick={() => handleRowSelection(sheet, index)}
                          style={{
                            ...styles.mobileCard,
                            backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF'
                          }}
                          onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                          onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleRowSelection(sheet, index)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ width: '1rem', height: '1rem', marginTop: '0.25rem', cursor: 'pointer' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {Object.entries(sheet).filter(([key]) => key !== '_rowNumber').map(([key, value]) => (
                              <div key={key} style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#6B7280', textTransform: 'uppercase' }}>{key}</span>
                                <span style={{ fontSize: '0.875rem', color: '#111827', marginTop: '0.125rem', wordBreak: 'break-word' }}>{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ padding: '1rem', borderTop: '1px solid #E5E7EB' }}>
                    {isMobile ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          style={{ 
                            padding: '0.5rem 0.75rem', 
                            border: '1px solid #D1D5DB', 
                            fontSize: '0.875rem', 
                            fontWeight: '500', 
                            borderRadius: '0.375rem', 
                            color: '#374151', 
                            backgroundColor: '#FFFFFF',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            opacity: currentPage === 1 ? 0.5 : 1
                          }}
                        >
                          Previous
                        </button>
                        <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          style={{ 
                            padding: '0.5rem 0.75rem', 
                            border: '1px solid #D1D5DB', 
                            fontSize: '0.875rem', 
                            fontWeight: '500', 
                            borderRadius: '0.375rem', 
                            color: '#374151', 
                            backgroundColor: '#FFFFFF',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            opacity: currentPage === totalPages ? 0.5 : 1
                          }}
                        >
                          Next
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ fontSize: '0.875rem', color: '#374151' }}>
                            Showing page <span style={{ fontWeight: '500' }}>{currentPage}</span> of{' '}
                            <span style={{ fontWeight: '500' }}>{totalPages}</span>
                          </p>
                        </div>
                        <div>
                          <div style={{ display: 'inline-flex', borderRadius: '0.375rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              style={{ 
                                padding: '0.5rem', 
                                border: '1px solid #D1D5DB', 
                                fontSize: '0.875rem', 
                                fontWeight: '500', 
                                borderTopLeftRadius: '0.375rem',
                                borderBottomLeftRadius: '0.375rem',
                                color: '#6B7280', 
                                backgroundColor: '#FFFFFF',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                opacity: currentPage === 1 ? 0.5 : 1
                              }}
                            >
                              <svg style={{ height: '1.25rem', width: '1.25rem' }} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                            {[...Array(totalPages)].map((_, i) => (
                              <button
                                key={i + 1}
                                onClick={() => setCurrentPage(i + 1)}
                                style={{ 
                                  padding: '0.5rem 1rem', 
                                  border: '1px solid #D1D5DB', 
                                  fontSize: '0.875rem', 
                                  fontWeight: '500',
                                  color: currentPage === i + 1 ? '#2563EB' : '#6B7280',
                                  backgroundColor: currentPage === i + 1 ? '#EFF6FF' : '#FFFFFF',
                                  borderColor: currentPage === i + 1 ? '#3B82F6' : '#D1D5DB',
                                  cursor: 'pointer',
                                  marginLeft: '-1px'
                                }}
                              >
                                {i + 1}
                              </button>
                            ))}
                            <button
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={currentPage === totalPages}
                              style={{ 
                                padding: '0.5rem', 
                                border: '1px solid #D1D5DB', 
                                fontSize: '0.875rem', 
                                fontWeight: '500', 
                                borderTopRightRadius: '0.375rem',
                                borderBottomRightRadius: '0.375rem',
                                color: '#6B7280', 
                                backgroundColor: '#FFFFFF',
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                opacity: currentPage === totalPages ? 0.5 : 1,
                                marginLeft: '-1px'
                              }}
                            >
                              <svg style={{ height: '1.25rem', width: '1.25rem' }} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <AddPhaseModal
        isOpen={isPhaseModalOpen}
        onClose={() => setIsPhaseModalOpen(false)}
        onSubmit={handleAddPhase}
      />

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
      
      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
};

export default ReportDashboard;