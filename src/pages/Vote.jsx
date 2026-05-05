import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingModal from '../components/LoadingModal'
import { getContract, connectWallet, getWalletAddress } from '../blockchain/contract'
import { db } from '../firebase/config'
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore'

export default function Vote() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [candidates, setCandidates] = useState([])
  const [selected, setSelected] = useState(null)
  const [walletAddress, setWalletAddress] = useState(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [votingOpen, setVotingOpen] = useState(false)
  const [txHash, setTxHash] = useState(null)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [modalMessage, setModalMessage] = useState('')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    loadData()
  }, [user])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const contract = await getContract()
      const [rawCandidates, isOpen] = await Promise.all([
        contract.getCandidates(),
        contract.votingOpen(),
      ])

      // Fetch candidate images from Firestore
      const candidatesSnap = await getDocs(collection(db, 'candidates'))
      const candidatesMap = {}
      candidatesSnap.docs.forEach(doc => {
        candidatesMap[doc.id] = doc.data()
      })

      setCandidates(rawCandidates.map(c => ({
        id: Number(c.id),
        name: c.name,
        voteCount: Number(c.voteCount),
        image: candidatesMap[Number(c.id)]?.image || null,
      })))
      setVotingOpen(isOpen)
      const addr = await getWalletAddress()
      if (addr) {
        setWalletAddress(addr)
        const voted = await contract.hasVoted(addr)
        setHasVoted(voted)
      }
    } catch (err) {
      setError('Failed to load data: ' + err.message)
    }
    setLoading(false)
  }

  const handleConnectWallet = async () => {
    setError('')
    setModalMessage('Connecting to MetaMask')
    try {
      const addr = await connectWallet()
      setWalletAddress(addr)
      const contract = await getContract()
      const voted = await contract.hasVoted(addr)
      setHasVoted(voted)
      setModalMessage('')
    } catch (err) {
      setModalMessage('')
      setError(err.message)
    }
  }

  const handleVote = async () => {
    if (selected === null) return setError('Please select a candidate.')
    setError('')
    setVoting(true)
    setModalMessage('Submitting Your Vote')
    try {
      const contract = await getContract(true)
      setModalMessage('Waiting for Confirmation')
      const tx = await contract.castVote(selected)
      setModalMessage('Recording on Blockchain')
      await tx.wait()
      setTxHash(tx.hash)
      setHasVoted(true)
      setModalMessage('')
      if (user) {
        try {
          await updateDoc(doc(db, 'voters', user.uid), { hasVoted: true })
        } catch (e) {
          console.warn('Firestore update failed:', e)
        }
      }
    } catch (err) {
      const msg = err.reason || err.message
      setModalMessage('')
      if (msg.includes('already voted')) {
        setError('You have already cast your vote.')
        setHasVoted(true)
      } else if (msg.includes('user rejected')) {
        setError('Transaction rejected in MetaMask.')
      } else {
        setError('Vote failed: ' + msg)
      }
    }
    setVoting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen grid-bg" style={{ paddingTop: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontSize: '12px', color: 'var(--text2)', fontFamily: 'JetBrains Mono' }}>Loading election data from blockchain...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid-bg" style={{ paddingTop: '64px' }}>
      <LoadingModal show={!!modalMessage} message={modalMessage} />
      <div className="scan-line" />

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '48px 32px 64px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '36px' }} className="fade-in">
          <div className={`badge ${votingOpen ? 'badge-green' : 'badge-red'}`} style={{ marginBottom: '14px' }}>
            {votingOpen ? '● Voting Open' : '○ Voting Closed'}
          </div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
            Cast Your <span style={{ color: 'var(--accent)' }} className="text-glow">Vote</span>
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', margin: 0 }}>
            Your vote will be permanently recorded on the Ethereum blockchain.
          </p>
        </div>

        {/* ── Wallet Card ── */}
        <div className="card fade-in-1" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
              Connected Wallet
            </div>
            {walletAddress ? (
              <div style={{ fontSize: '12px', color: 'var(--accent)', fontFamily: 'JetBrains Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {walletAddress}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'JetBrains Mono' }}>Not connected</div>
            )}
          </div>
          {!walletAddress ? (
            <button onClick={handleConnectWallet} className="btn-outline" style={{ fontSize: '12px', padding: '8px 16px', flexShrink: 0 }}>
              Connect MetaMask
            </button>
          ) : (
            <div className={`badge ${hasVoted ? 'badge-green' : 'badge-amber'}`} style={{ flexShrink: 0 }}>
              {hasVoted ? '✓ Voted' : '○ Not voted'}
            </div>
          )}
        </div>

        {/* ── Already Voted with TX hash ── */}
        {hasVoted && txHash && (
          <div className="card bracket-box fade-in" style={{ padding: '24px', marginBottom: '20px', borderColor: 'var(--green)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '32px', height: '32px', border: '2px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(45deg)', flexShrink: 0, boxShadow: '0 0 12px var(--green-glow)' }}>
                <span style={{ transform: 'rotate(-45deg)', color: 'var(--green)', fontSize: '14px' }}>✓</span>
              </div>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: 'var(--green)' }} className="text-glow-green">
                  Vote Recorded On-Chain
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'JetBrains Mono' }}>Permanently written to the Ethereum blockchain</div>
              </div>
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', marginBottom: '6px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Transaction Hash</div>
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '11px', color: 'var(--accent)', fontFamily: 'JetBrains Mono', wordBreak: 'break-all', textDecoration: 'none' }}
                onMouseOver={e => e.target.style.textDecoration = 'underline'}
                onMouseOut={e => e.target.style.textDecoration = 'none'}
              >
                {txHash}
              </a>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', marginTop: '12px', margin: '12px 0 0' }}>
              View on Etherscan to verify your vote on the public ledger.
            </p>
          </div>
        )}

        {hasVoted && !txHash && (
          <div className="card fade-in" style={{ padding: '20px', marginBottom: '20px', borderColor: 'rgba(0,255,136,0.3)' }}>
            <div style={{ color: 'var(--green)', fontFamily: 'Syne, sans-serif', fontWeight: 700, marginBottom: '6px' }}>✓ Already Voted</div>
            <p style={{ fontSize: '12px', color: 'var(--text2)', fontFamily: 'JetBrains Mono', margin: 0 }}>
              Your vote was previously recorded on the blockchain. Each wallet can only vote once.
            </p>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', border: '1px solid var(--red)', background: 'rgba(255,61,90,0.08)', color: 'var(--red)', fontSize: '12px', fontFamily: 'JetBrains Mono', display: 'flex', gap: '8px' }}>
            <span>⚠</span><span>{error}</span>
          </div>
        )}

        {/* ── Candidates ── */}
        {!hasVoted && votingOpen && walletAddress && (
          <>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>
              Select a candidate — {candidates.length} running
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {candidates.map((c, i) => {
                const isSelected = selected === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                    className={`card fade-in-${Math.min(i + 1, 4)}`}
                    style={{
                      padding: 0,
                      cursor: 'pointer',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      boxShadow: isSelected ? '0 0 20px var(--accent-glow)' : 'none',
                      background: isSelected ? 'rgba(0,212,255,0.05)' : 'var(--surface)',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                      width: '100%',
                      display: 'flex',
                      flexDirection: c.image ? 'row' : 'row',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Image */}
                    {c.image && (
                      <div style={{
                        width: '100px',
                        height: '100px',
                        flexShrink: 0,
                        overflow: 'hidden',
                        background: 'var(--bg2)',
                      }}>
                        <img
                          src={c.image}
                          alt={c.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px', flex: 1 }}>
                      {/* Selection indicator */}
                      <div style={{
                        width: '22px', height: '22px', flexShrink: 0,
                        border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border2)'}`,
                        background: isSelected ? 'var(--accent)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transform: 'rotate(45deg)', transition: 'all 0.2s',
                      }}>
                        {isSelected && <span style={{ transform: 'rotate(-45deg)', fontSize: '11px', color: '#000', fontWeight: 700 }}>✓</span>}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: isSelected ? 'var(--accent)' : 'var(--text)', fontSize: '1rem', transition: 'color 0.2s' }}>
                          {c.name}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', marginTop: '3px' }}>
                          Candidate #{c.id}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '13px', color: 'var(--text2)', fontFamily: 'Syne', fontWeight: 700 }}>{c.voteCount}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'JetBrains Mono' }}>votes</div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              onClick={handleVote}
              disabled={selected === null || voting}
              className="btn-primary"
              style={{ width: '100%', fontSize: '14px' }}
            >
              {voting ? 'Processing...' : selected !== null ? `Submit Vote for ${candidates.find(c => c.id === selected)?.name} →` : 'Select a candidate first'}
            </button>

            <p style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', textAlign: 'center', marginTop: '12px' }}>
              This action is permanent and cannot be undone. MetaMask will ask for confirmation.
            </p>
          </>
        )}

        {/* ── Not Connected ── */}
        {!hasVoted && votingOpen && !walletAddress && (
          <div className="card bracket-box fade-in-2" style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '16px', opacity: 0.6 }}>◈</div>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>Connect Your Wallet</h3>
            <p style={{ fontSize: '12px', color: 'var(--text2)', fontFamily: 'JetBrains Mono', marginBottom: '28px', lineHeight: 1.7 }}>
              You need MetaMask connected to cast a vote<br />on the Ethereum blockchain.
            </p>
            <button onClick={handleConnectWallet} className="btn-primary">
              Connect MetaMask →
            </button>
          </div>
        )}

        {/* ── Voting Closed ── */}
        {!votingOpen && (
          <div className="card fade-in-2" style={{ padding: '48px', textAlign: 'center' }}>
            <div className="badge badge-red" style={{ marginBottom: '16px' }}>○ Voting Closed</div>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>Election Not Active</h3>
            <p style={{ fontSize: '12px', color: 'var(--text2)', fontFamily: 'JetBrains Mono', margin: 0, lineHeight: 1.7 }}>
              The election is currently closed.<br />Check back when the admin opens voting.
            </p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}