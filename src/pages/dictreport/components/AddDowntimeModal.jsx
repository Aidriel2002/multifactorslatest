import { useState, useEffect } from 'react';

const AddDowntimeModal = ({ isOpen, onClose, onSubmit, sheet, spreadsheetId }) => {
  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    cause: '',
    actionTaken: 'None',
    targetSheet: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableSheets, setAvailableSheets] = useState([]);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [processingLog, setProcessingLog] = useState([]);

  // Check if we're in multi-report mode
  const isMultiMode = Array.isArray(sheet);
  const sheets = isMultiMode ? sheet : (sheet ? [sheet] : []);
  const totalReports = sheets.length;

  const downtimeCauses = [
    'Power Outage',
    'Human Intervention',
    'Equipment Failure',
    'Network Issue',
    'Maintenance',
    'Weather Related',
    'Other'
  ];

  const actionTakenOptions = [
    'None',
    'Technical Visit'
  ];

  const formatForSheets = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${String(date.getMonth() + 1).padStart(2, '0')}/` +
           `${String(date.getDate()).padStart(2, '0')}/` +
           `${date.getFullYear()} ` +
           `${String(date.getHours()).padStart(2, '0')}:` +
           `${String(date.getMinutes()).padStart(2, '0')}:00`;
  };

  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

  useEffect(() => {
    if (isOpen && spreadsheetId) {
      fetchAvailableSheets();
      setProcessingLog([]);
    }
  }, [isOpen, spreadsheetId]);

  const fetchAvailableSheets = async () => {
    setLoadingSheets(true);
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${GOOGLE_API_KEY}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch spreadsheet metadata');
      }
      
      const data = await response.json();
      const sheets = data.sheets.map(sheet => sheet.properties.title);
      
      setAvailableSheets(sheets);
      
      if (sheets.length > 0 && !formData.targetSheet) {
        setFormData(prev => ({ ...prev, targetSheet: sheets[0] }));
      }
    } catch (err) {
      console.error('[AddDowntime] Error fetching sheets:', err);
      setError('Failed to load available sheets from Google Spreadsheet');
    } finally {
      setLoadingSheets(false);
    }
  };

  const getSiteCode = (sheetData) => {
    if (!sheetData) return '';
    const entries = Object.entries(sheetData).filter(([key]) => key !== '_rowNumber' && key !== '_index');
    return entries.length > 1 ? entries[1][1] : (entries[0]?.[1] || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setProcessingLog([]);

    if (!formData.startTime) {
      setError('Start time is required');
      setLoading(false);
      return;
    }

    if (!formData.cause) {
      setError('Cause of downtime is required');
      setLoading(false);
      return;
    }

    if (!formData.targetSheet) {
      setError('Target sheet is required');
      setLoading(false);
      return;
    }

    if (formData.endTime && new Date(formData.endTime) <= new Date(formData.startTime)) {
      setError('End time must be after start time');
      setLoading(false);
      return;
    }

    try {
      // Prepare common data for all sites
      const commonData = {
        startTime: formatForSheets(formData.startTime),
        endTime: formData.endTime ? formatForSheets(formData.endTime) : '',
        cause: formData.cause,
        actionTaken: formData.actionTaken,
        targetSheet: formData.targetSheet
      };

      let successCount = 0;
      let failCount = 0;

      // Process each site sequentially
      for (let i = 0; i < sheets.length; i++) {
        const currentSheet = sheets[i];
        const siteCode = getSiteCode(currentSheet);
        
        setProcessingLog(prev => [...prev, {
          site: siteCode,
          status: 'processing',
          message: `Processing site ${i + 1} of ${totalReports}...`
        }]);

        try {
          const downtimeData = {
            ...commonData,
            siteCode: siteCode,
            rowNumber: currentSheet._rowNumber || null
          };

          console.log(`[AddDowntime] Processing site ${i + 1}/${totalReports}:`, siteCode);

          if (onSubmit) {
            const result = await onSubmit(downtimeData);
            
            setProcessingLog(prev => prev.map((log, idx) => 
              idx === i ? {
                ...log,
                status: 'success',
                message: `✅ ${siteCode} - Saved to row ${result?.targetRow || 'unknown'}`,
                row: result?.targetRow
              } : log
            ));
            
            successCount++;
            
            // Small delay between writes to avoid rate limiting
            if (i < sheets.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
        } catch (err) {
          console.error(`[AddDowntime] Failed for site ${siteCode}:`, err);
          
          setProcessingLog(prev => prev.map((log, idx) => 
            idx === i ? {
              ...log,
              status: 'error',
              message: `❌ ${siteCode} - Failed: ${err.message}`
            } : log
          ));
          
          failCount++;
        }
      }

      // Show final summary
      const summary = `Batch Report Complete!\n✅ Success: ${successCount}\n${failCount > 0 ? `❌ Failed: ${failCount}` : ''}`;
      
      if (failCount === 0) {
        setTimeout(() => {
          handleClose();
          alert(summary);
        }, 1500);
      } else {
        setError(`Some reports failed to save. Success: ${successCount}, Failed: ${failCount}`);
      }
      
    } catch (err) {
      console.error('[AddDowntime] Batch processing error:', err);
      setError(err.message || 'Failed to process batch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ 
        startTime: '', 
        endTime: '', 
        cause: '',
        actionTaken: 'None',
        targetSheet: availableSheets[0] || ''
      });
      setError('');
      setProcessingLog([]);
      setAvailableSheets([]);
      onClose();
    }
  };

  if (!isOpen || sheets.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {isMultiMode ? `Batch Report - ${totalReports} Sites` : 'Add Downtime Record'}
            </h2>
            <button 
              onClick={handleClose} 
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isMultiMode && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm font-medium text-blue-800 mb-2">Selected Sites ({totalReports})</p>
              <div className="flex flex-wrap gap-2">
                {sheets.map((s, idx) => {
                  const siteCode = getSiteCode(s);
                  return (
                    <span key={idx} className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                      {siteCode}
                    </span>
                  );
                })}
              </div>
              <p className="text-xs text-blue-600 mt-2">
                The same report data will be saved for all selected sites
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {processingLog.length > 0 && (
            <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-md max-h-48 overflow-y-auto">
              <p className="text-sm font-medium text-gray-800 mb-2">Processing Status:</p>
              <div className="space-y-1">
                {processingLog.map((log, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-xs">
                    {log.status === 'processing' && (
                      <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {log.status === 'success' && (
                      <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {log.status === 'error' && (
                      <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className={`flex-1 ${
                      log.status === 'success' ? 'text-green-700' :
                      log.status === 'error' ? 'text-red-700' :
                      'text-gray-700'
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Sheet Tab <span className="text-red-500">*</span>
              </label>
              {loadingSheets ? (
                <div className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md">
                  <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm text-gray-600">Loading sheets...</span>
                </div>
              ) : availableSheets.length > 0 ? (
                <select
                  value={formData.targetSheet}
                  onChange={(e) => setFormData({...formData, targetSheet: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="">Select a sheet tab</option>
                  {availableSheets.map((sheetName) => (
                    <option key={sheetName} value={sheetName}>
                      {sheetName}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                  <p className="text-sm text-gray-500">No sheets available</p>
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Data will be written to columns A, F, G, R, and S in this sheet
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start of Downtime (Column F) <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End of Downtime (Column G) <span className="text-gray-500 text-xs">(Optional)</span>
              </label>
              <input
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cause of Downtime (Column R) <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.cause}
                onChange={(e) => setFormData({...formData, cause: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">Select a cause</option>
                {downtimeCauses.map((cause) => (
                  <option key={cause} value={cause}>
                    {cause}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action Taken (Column S) <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.actionTaken}
                onChange={(e) => setFormData({...formData, actionTaken: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                {actionTakenOptions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>

            {formData.startTime && formData.endTime && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm font-medium text-gray-700">Duration</p>
                <p className="text-sm text-gray-600 mt-1">
                  {(() => {
                    const start = new Date(formData.startTime);
                    const end = new Date(formData.endTime);
                    const diffMs = end - start;
                    
                    if (diffMs <= 0) {
                      return 'Invalid duration';
                    }
                    
                    const hours = Math.floor(diffMs / (1000 * 60 * 60));
                    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    
                    return `${hours}h ${minutes}m`;
                  })()}
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing {processingLog.filter(l => l.status === 'success').length}/{totalReports}...
                  </>
                ) : isMultiMode ? (
                  `Save ${totalReports} Reports`
                ) : (
                  'Add Downtime'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddDowntimeModal;