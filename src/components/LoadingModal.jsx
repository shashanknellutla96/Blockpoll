export default function LoadingModal({ message = 'Connecting to MetaMask...', show = false }) {
  if (!show) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(2px)',
    }}>
      <div style={{
        textAlign: 'center',
        animation: 'fadeIn 0.3s ease-in',
      }}>
        {/* Spinner */}
        <div style={{
          width: '80px',
          height: '80px',
          border: '4px solid var(--accent)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 32px',
          boxShadow: '0 0 30px rgba(0, 255, 200, 0.3)',
        }} />

        {/* Loading Text */}
        <h2 style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: '28px',
          fontWeight: 700,
          color: 'var(--text)',
          marginBottom: '12px',
          letterSpacing: '0.05em',
        }}>
          {message}
        </h2>

        {/* Subtext */}
        <p style={{
          fontSize: '13px',
          color: 'var(--text2)',
          fontFamily: 'JetBrains Mono, monospace',
          marginTop: '16px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          Please confirm in MetaMask
        </p>

        {/* Animated dots */}
        <div style={{
          marginTop: '20px',
          fontSize: '18px',
          color: 'var(--accent)',
          animation: 'pulse 1.4s ease-in-out infinite',
        }}>
          ●●●
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
