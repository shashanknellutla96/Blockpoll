import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const stats = [
  { label: 'Network', value: 'Sepolia', sub: 'Ethereum testnet' },
  { label: 'Encryption', value: 'AES-256', sub: 'Military grade' },
  { label: 'Verification', value: 'Biometric', sub: 'Face recognition' },
  { label: 'Immutability', value: '100%', sub: 'On-chain votes' },
]

const features = [
  {
    icon: '◈',
    title: 'Biometric Identity',
    desc: 'Your face is your key. Real-time facial recognition ensures only you can cast your vote — no passwords, no impersonation.',
    color: 'accent',
  },
  {
    icon: '⬡',
    title: 'Blockchain Permanence',
    desc: 'Every vote becomes an immutable transaction on the Ethereum blockchain. No administrator can alter or delete it.',
    color: 'green',
  },
  {
    icon: '◎',
    title: 'Zero Double Voting',
    desc: 'The smart contract enforces a strict one-wallet-one-vote rule at the protocol level. Fraud is architecturally impossible.',
    color: 'amber',
  },
]

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen grid-bg pt-16" style={{ overflowX: 'hidden' }}>
      <div className="scan-line" />

      {/* ── Hero ── */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 40px 72px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '48px',
          alignItems: 'center',
        }}>

          {/* Left — text */}
          <div style={{ minWidth: 0 }}>
            <div className="flex items-center gap-3 mb-6 fade-in">
              <div className="badge badge-green">● Live on Sepolia</div>
              <div className="badge badge-accent">v1.0.0</div>
            </div>

            <h1 className="fade-in-1" style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              color: 'var(--text)',
              marginBottom: '24px',
            }}>
              Voting,{' '}
              <span className="text-glow" style={{ color: 'var(--accent)' }}>Secured</span>
              <br />by the Chain.
            </h1>

            <p className="fade-in-2" style={{
              color: 'var(--text2)',
              fontSize: '14px',
              lineHeight: 1.8,
              marginBottom: '36px',
              maxWidth: '420px',
            }}>
              BlockPoll combines biometric face verification with Ethereum smart contracts
              to deliver elections that are tamper-proof, transparent, and publicly verifiable
              by anyone on the blockchain.
            </p>

            <div className="flex flex-wrap gap-3 fade-in-3">
              {user ? (
                <Link to="/vote" className="btn-primary" style={{ fontSize: '14px' }}>
                  Cast Your Vote →
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn-primary" style={{ fontSize: '14px' }}>
                    Register to Vote →
                  </Link>
                  <Link to="/results" className="btn-outline" style={{ fontSize: '14px' }}>
                    View Live Results
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right — blockchain visual */}
          <div className="fade-in-4" style={{
            position: 'relative',
            height: '340px',
            minWidth: '300px',
          }}>
            {/* Outer rotating diamond */}
            <div className="glow-accent" style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: '140px', height: '140px',
              border: '2px solid var(--accent)',
              transform: 'translate(-50%, -50%) rotate(45deg)',
            }} />
            {/* Middle dim fill */}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: '90px', height: '90px',
              background: 'var(--accent)',
              opacity: 0.08,
              transform: 'translate(-50%, -50%) rotate(45deg)',
            }} />
            {/* Center pulsing dot */}
            <div className="pulse" style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: '28px', height: '28px',
              background: 'var(--accent)',
              transform: 'translate(-50%, -50%) rotate(45deg)',
            }} />

            {/* Orbiting dots */}
            {[0, 60, 120, 180, 240, 300].map((deg, i) => {
              const rad = (deg * Math.PI) / 180
              const x = 50 + Math.cos(rad) * 34
              const y = 50 + Math.sin(rad) * 30
              return (
                <div key={i} style={{
                  position: 'absolute',
                  left: `${x}%`, top: `${y}%`,
                  width: '10px', height: '10px',
                  border: '1px solid var(--accent)',
                  transform: 'translate(-50%, -50%) rotate(45deg)',
                  opacity: 0.3 + i * 0.1,
                }} />
              )
            })}

            {/* Floating info cards */}
            <div className="card" style={{
              position: 'absolute', top: '12px', left: '12px',
              padding: '8px 14px',
            }}>
              <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'JetBrains Mono' }}>TX Hash</div>
              <div style={{ fontSize: '11px', color: 'var(--accent)', fontFamily: 'JetBrains Mono' }}>0x4a2f...8e1c</div>
            </div>

            <div className="card" style={{
              position: 'absolute', bottom: '24px', right: '12px',
              padding: '8px 14px',
            }}>
              <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'JetBrains Mono' }}>Block</div>
              <div style={{ fontSize: '11px', color: 'var(--green)', fontFamily: 'JetBrains Mono' }}>#5,829,441</div>
            </div>

            <div className="card" style={{
              position: 'absolute', top: '38%', right: '12px',
              padding: '8px 14px',
            }}>
              <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'JetBrains Mono' }}>Verified</div>
              <div style={{ fontSize: '11px', color: 'var(--accent)', fontFamily: 'JetBrains Mono' }}>✓ Face Match</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section style={{ borderTop: '1px solid var(--border2)', borderBottom: '1px solid var(--border2)', background: 'var(--surface)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 40px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
          }}>
            {stats.map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent)' }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '6px' }}>{s.label}</div>
                <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '3px' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div className="badge badge-accent" style={{ marginBottom: '16px' }}>How it works</div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '2rem', fontWeight: 700, color: 'var(--text)' }}>
            Three Pillars of Trust
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}>
          {features.map((f, i) => (
            <div key={i} className={`card bracket-box fade-in-${i + 1}`} style={{ padding: '36px 32px' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '20px', color: `var(--${f.color})` }}>
                {f.icon}
              </div>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text)' }}>
                {f.title}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.75 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px 80px' }}>
        <div className="card bracket-box" style={{
          padding: '64px 40px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%)',
        }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '2rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text)' }}>
            Ready to <span className="text-glow" style={{ color: 'var(--accent)' }}>Vote?</span>
          </h2>
          <p style={{ color: 'var(--text2)', fontSize: '14px', marginBottom: '32px', maxWidth: '440px', margin: '0 auto 32px', lineHeight: 1.8 }}>
            Register with your face, connect your MetaMask wallet, and cast a vote that cannot be erased.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px' }}>
            <Link to="/register" className="btn-primary">Get Started →</Link>
            <Link to="/results" className="btn-outline">View Results</Link>
          </div>
        </div>
      </section>

    </div>
  )
}