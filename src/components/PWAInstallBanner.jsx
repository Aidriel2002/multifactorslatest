import { usePWA } from '../hooks/usePWA';
import { useState, useEffect } from 'react';

export default function PWAInstallBanner() {
  const {
    isInstallable,
    isInstalled,
    isOffline,
    updateAvailable,
    installApp,
    applyUpdate,
  } = usePWA();

  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      // Trigger when within 50px of bottom
      if (scrollTop + windowHeight >= docHeight - 50) {
        setHasReachedBottom(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showInstallBanner = isInstallable && !isInstalled && hasReachedBottom && !dismissed;

  return (
    <>
      {/* Offline banner — always visible */}
      {isOffline && (
        <div style={styles.offlineBanner}>
          <span>⚠️ You're offline — app is running from cache</span>
        </div>
      )}

      {/* Update available banner — always visible */}
      {updateAvailable && (
        <div style={styles.updateBanner}>
          <span>🔄 A new version is available!</span>
          <button onClick={applyUpdate} style={styles.updateBtn}>
            Update Now
          </button>
        </div>
      )}

      {/* Install prompt — only after reaching bottom */}
      <div style={{
        ...styles.installBanner,
        opacity: showInstallBanner ? 1 : 0,
        pointerEvents: showInstallBanner ? 'auto' : 'none',
        transform: showInstallBanner
          ? 'translateX(-50%) translateY(0)'
          : 'translateX(-50%) translateY(20px)',
      }}>
        <div style={styles.installText}>
          <strong>📲 Install MultifactorsSales</strong>
          <span style={styles.installSub}>
            Add to your home screen for a better experience
          </span>
        </div>
        <button onClick={installApp} style={styles.installBtn}>
          Install
        </button>
        <button onClick={() => setDismissed(true)} style={styles.dismissBtn}>
          ✕
        </button>
      </div>
    </>
  );
}

const styles = {
  offlineBanner: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    background: '#92400e',
    color: '#fef3c7',
    padding: '10px 20px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 500,
  },
  updateBanner: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    background: '#1e40af',
    color: '#fff',
    padding: '10px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    fontSize: '14px',
    fontWeight: 500,
  },
  updateBtn: {
    background: '#fff',
    color: '#1e40af',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 14px',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '13px',
  },
  installBanner: {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    zIndex: 9998,
    background: '#1e293b',
    color: '#f1f5f9',
    borderRadius: '14px',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    maxWidth: '420px',
    width: 'calc(100% - 40px)',
    transition: 'opacity 0.4s ease, transform 0.4s ease',
  },
  installText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  installSub: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: 400,
  },
  installBtn: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  dismissBtn: {
    background: 'transparent',
    color: '#94a3b8',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    lineHeight: 1,
    flexShrink: 0,
  },
};