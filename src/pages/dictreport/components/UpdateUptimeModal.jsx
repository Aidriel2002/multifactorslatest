import { useState } from 'react';

const UpdateUptimeModal = ({ isOpen, onClose, onSubmit, record }) => {
  const [uptime, setUptime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!uptime) {
      setError('End of downtime is required');
      return;
    }

    const downtimeDate = new Date(record.downtime);
    const uptimeDate = new Date(uptime);

    if (uptimeDate <= downtimeDate) {
      setError('End of downtime must be after start of downtime');
      return;
    }

    setLoading(true);

    try {
      await onSubmit({ uptime });
      setUptime('');
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to update end of downtime');
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = () => {
    if (!uptime || !record.downtime) return null;

    const start = new Date(record.downtime);
    const end = new Date(uptime);
    const diffMs = end - start;

    if (diffMs <= 0) return 'Invalid duration';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  if (!isOpen) return null;

  const duration = calculateDuration();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Add End of Downtime</h2>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm font-medium text-blue-800">Site Code</p>
            <p className="text-lg font-bold text-blue-900">{record.siteCode}</p>
            <p className="text-xs text-blue-600 mt-1">Sheet: {record.sheetName} | Row: {record.rowNumber}</p>
          </div>

          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-sm font-medium text-gray-700">Start of Downtime</p>
            <p className="text-sm text-gray-900">{record.downtime}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End of Downtime (Column G) <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={uptime}
                onChange={(e) => setUptime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            {duration && duration !== 'Invalid duration' && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm font-medium text-gray-700">Downtime Duration</p>
                <p className="text-sm text-gray-600 mt-1">{duration}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Update End of Downtime'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateUptimeModal;