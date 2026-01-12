import { useState, useEffect } from 'react';

const AddDowntimeModal = ({ isOpen, onClose, onSubmit, sheet, spreadsheetId }) => {
  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    cause: '',
    targetSheet: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableSheets, setAvailableSheets] = useState([]);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [siteCode, setSiteCode] = useState('');
  const [rowNumber, setRowNumber] = useState(null);

  const downtimeCauses = [
    'Power Outage',
    'Human Intervention',
    'Equipment Failure',
    'Network Issue',
    'Maintenance',
    'Weather Related',
    'Other'
  ];

  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

  useEffect(() => {
    if (isOpen && spreadsheetId) {
      fetchAvailableSheets();
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
      
      console.log('[AddDowntime] Available sheets:', sheets);
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

  useEffect(() => {
    if (sheet) {
      // Get site code from the SECOND column (Column B / index 1)
      const entries = Object.entries(sheet).filter(([key]) => key !== '_rowNumber');
      const columnBValue = entries.length > 1 ? entries[1][1] : (entries[0]?.[1] || '');
      
      setSiteCode(columnBValue);
      setRowNumber(sheet._rowNumber || null);
      
      console.log('[AddDowntime] All sheet data:', sheet);
      console.log('[AddDowntime] Filtered entries:', entries);
      console.log('[AddDowntime] Site Code from Column B (index 1):', columnBValue);
      console.log('[AddDowntime] Row Number:', sheet._rowNumber);
      
      setFormData(prev => ({
        ...prev,
        startTime: '',
        endTime: '',
        cause: ''
      }));
    }
  }, [sheet]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.startTime) {
      setError('Start time is required');
      setLoading(false);
      return;
    }

    if (!formData.endTime) {
      setError('End time is required');
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

    if (new Date(formData.endTime) <= new Date(formData.startTime)) {
      setError('End time must be after start time');
      setLoading(false);
      return;
    }

    try {
      const downtimeData = {
        ...formData,
        siteCode: siteCode,
        rowNumber: rowNumber
      };

      if (onSubmit) {
        await onSubmit(downtimeData);
      }
      
      setFormData({ 
        startTime: '', 
        endTime: '', 
        cause: '',
        targetSheet: availableSheets[0] || ''
      });
      setError('');
      onClose();
    } catch (err) {
      console.error('[AddDowntime] Error:', err);
      setError(err.message || 'Failed to add downtime record');
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
        targetSheet: ''
      });
      setError('');
      setAvailableSheets([]);
      setSiteCode('');
      setRowNumber(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Add Downtime Record</h2>
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

          {siteCode && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm font-medium text-blue-800">Selected Site</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{siteCode}</p>
              {rowNumber && (
                <p className="text-xs text-blue-600 mt-1">Row {rowNumber} in spreadsheet</p>
              )}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
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
                Data will be written to columns A, F, G, and H in this sheet
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
                End of Downtime (Column G) <span className="text-red-500">*</span>
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
                Cause of Downtime (Column H) <span className="text-red-500">*</span>
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

            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-xs text-green-800 font-medium mb-1">📝 Write Location:</p>
              <p className="text-xs text-green-700">
                • Site Code <strong>{siteCode}</strong> will be written to Column A<br/>
                • Start Time will be written to Column F<br/>
                • End Time will be written to Column G<br/>
                • Cause will be written to Column H<br/>
                • Data will stack in next available row if row already has data
              </p>
            </div>

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
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
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