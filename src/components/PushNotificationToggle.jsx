import { usePushNotifications } from '../hooks/usePushNotifications';

export default function PushNotificationToggle() {
  const { permission, isSubscribed, loading, error, subscribe, unsubscribe } = usePushNotifications();

  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  if (!isSupported) return null;

  return (
    <div style={styles.wrapper}>
      <div style={styles.info}>
        <span style={styles.icon}>{isSubscribed ? '🔔' : '🔕'}</span>
        <div>
          <div style={styles.label}>Push Notifications</div>
          <div style={styles.sub}>
            {isSubscribed
              ? 'You will receive notifications on this device'
              : permission === 'denied'
              ? 'Blocked — enable in browser settings'
              : 'Get notified about tasks outside the app'}
          </div>
        </div>
      </div>

      <button
        onClick={isSubscribed ? unsubscribe : subscribe}
        disabled={loading || permission === 'denied'}
        style={{
          ...styles.btn,
          background: isSubscribed ? '#ef4444' : '#3b82f6',
          opacity: loading || permission === 'denied' ? 0.5 : 1,
          cursor: loading || permission === 'denied' ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? '...' : isSubscribed ? 'Disable' : 'Enable'}
      </button>

      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '14px 18px',
    background: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    flexWrap: 'wrap',
  },
  info: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  icon: {
    fontSize: '22px',
  },
  label: {
    fontWeight: 600,
    fontSize: '14px',
    color: '#1e293b',
  },
  sub: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '2px',
  },
  btn: {
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 18px',
    fontWeight: 700,
    fontSize: '13px',
    flexShrink: 0,
  },
  error: {
    width: '100%',
    fontSize: '12px',
    color: '#ef4444',
    marginTop: '4px',
  },
};