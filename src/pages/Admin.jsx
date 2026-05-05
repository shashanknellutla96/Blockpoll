import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import LoadingModal from '../components/LoadingModal'
import { getContract } from '../blockchain/contract'
import { db } from '../firebase/config'
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore'
import { uploadImageToCloudinary } from '../utils/cloudinary'

// Set your admin wallet address here after deploying the contract
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@blockpoll.com'

export default function Admin() {
  const { user } = useAuth()
  const [candidates, setCandidates] = useState([])
  const [newCandidate, setNewCandidate] = useState('')
  const [candidateImage, setCandidateImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [voters, setVoters] = useState([])
  const [votingOpen, setVotingOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [txLoading, setTxLoading] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [modalMessage, setModalMessage] = useState('')

  const isAdmin = user?.email === ADMIN_EMAIL

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const contract = await getContract()
      const [raw, isOpen] = await Promise.all([
        contract.getCandidates(),
        contract.votingOpen(),
      ])

      // Fetch candidate images from Firestore
      const candidatesSnap = await getDocs(collection(db, 'candidates'))
      const candidatesMap = {}
      candidatesSnap.docs.forEach(doc => {
        candidatesMap[doc.id] = doc.data()
      })

      setCandidates(
        raw.map(c => ({
          id: Number(c.id),
          name: c.name,
          voteCount: Number(c.voteCount),
          image: candidatesMap[Number(c.id)]?.image || null,
        }))
      )
      setVotingOpen(isOpen)

      // Firestore voters
      const snap = await getDocs(collection(db, 'voters'))
      setVoters(snap.docs.map(d => d.data()))
    } catch (err) {
      setError('Failed to load: ' + err.message)
    }
    setLoading(false)
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setCandidateImage(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setImagePreview(event.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddCandidate = async (e) => {
    e.preventDefault()
    if (!newCandidate.trim()) return
    setError(''); setSuccess('')
    setTxLoading(true)
    setModalMessage('Adding Candidate')
    
    try {
      let imageUrl = null

      // Upload image if selected
      if (candidateImage) {
        setModalMessage('Uploading Image')
        setImageLoading(true)
        imageUrl = await uploadImageToCloudinary(candidateImage)
        setImageLoading(false)
      }

      const contract = await getContract(true)
      setModalMessage('Waiting for Confirmation')
      const tx = await contract.addCandidate(newCandidate.trim())
      setModalMessage('Recording on Blockchain')
      await tx.wait()

      // Store image URL in Firestore with candidate ID
      if (imageUrl) {
        const candidateId = candidates.length
        await setDoc(doc(db, 'candidates', String(candidateId)), {
          name: newCandidate.trim(),
          image: imageUrl,
          timestamp: new Date(),
        })
      }

      setSuccess(`Candidate "${newCandidate}" added to blockchain.`)
      setNewCandidate('')
      setCandidateImage(null)
      setImagePreview(null)
      setModalMessage('')
      await loadData()
    } catch (err) {
      setModalMessage('')
      setImageLoading(false)
      setError(err.reason || err.message)
    }
    setTxLoading(false)
  }

  const handleToggleVoting = async () => {
    setError(''); setSuccess('')
    setTxLoading(true)
    setModalMessage(votingOpen ? 'Closing Voting' : 'Opening Voting')
    try {
      const contract = await getContract(true)
      setModalMessage('Waiting for Confirmation')
      const tx = votingOpen ? await contract.closeVoting() : await contract.openVoting()
      setModalMessage('Recording on Blockchain')
      await tx.wait()
      setVotingOpen(!votingOpen)
      setSuccess(votingOpen ? 'Voting closed.' : 'Voting opened.')
      setModalMessage('')
    } catch (err) {
      setModalMessage('')
      setError(err.reason || err.message)
    }
    setTxLoading(false)
  }

  const totalVotes = candidates.reduce((s, c) => s + c.voteCount, 0)
  const votersWhoVoted = voters.filter(v => v.hasVoted).length

  if (!user) {
    return (
      <div className="min-h-screen grid-bg pt-16 flex items-center justify-center">
        <div className="card p-8 text-center">
          <p className="text-text2 text-xs font-mono">Please log in to access admin panel.</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen grid-bg pt-16 flex items-center justify-center">
        <div className="card bracket-box p-8 text-center max-w-sm">
          <div className="text-red text-2xl mb-4">⚠</div>
          <h2 className="font-syne font-700 text-text mb-2">Access Denied</h2>
          <p className="text-text2 text-xs font-mono">
            This panel is restricted to the election administrator.
          </p>
          <p className="text-text3 text-xs font-mono mt-2">Logged in as: {user.email}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid-bg" style={{ paddingTop: '64px' }}>
      <LoadingModal show={!!modalMessage} message={modalMessage} />
      <div className="scan-line" />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 32px 64px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '40px' }} className="fade-in">
          <div className="badge badge-amber" style={{ marginBottom: '14px' }}>
            ◈ Admin Panel
          </div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
            Election <span style={{ color: 'var(--accent)' }} className="text-glow">Control</span>
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', margin: 0 }}>
            Manage candidates, control voting, monitor participation.
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div style={{ marginBottom: '20px', padding: '12px 16px', border: '1px solid var(--red)', background: 'rgba(255,61,90,0.08)', color: 'var(--red)', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', display: 'flex', gap: '8px' }} className="fade-in">
            <span>⚠</span><span>{error}</span>
          </div>
        )}
        {success && (
          <div style={{ marginBottom: '20px', padding: '12px 16px', border: '1px solid var(--green)', background: 'rgba(0,255,136,0.08)', color: 'var(--green)', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', display: 'flex', gap: '8px' }} className="fade-in">
            <span>✓</span><span>{success}</span>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '3rem' }}>
            <div style={{ width: '20px', height: '20px', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: '12px', color: 'var(--text2)', fontFamily: 'JetBrains Mono' }}>Loading from blockchain...</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>

            {/* Voting Status Card */}
            <div className="card bracket-box fade-in-1" style={{ padding: '24px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                Voting Status
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.4rem', fontWeight: 700, color: votingOpen ? 'var(--green)' : 'var(--red)', marginBottom: '6px' }}>
                  {votingOpen ? '● Voting Open' : '○ Voting Closed'}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', margin: 0 }}>
                  {votingOpen ? 'Voters can cast votes now.' : 'Voting is currently paused.'}
                </p>
              </div>
              <button
                onClick={handleToggleVoting}
                disabled={txLoading}
                className={votingOpen ? 'btn-outline' : 'btn-primary'}
                style={{ width: '100%', fontSize: '12px', borderColor: votingOpen ? 'var(--red)' : undefined, color: votingOpen ? 'var(--red)' : undefined }}
              >
                {txLoading ? 'Processing...' : votingOpen ? '⊘ Close Voting' : '▶ Open Voting'}
              </button>
            </div>

            {/* Add Candidate Card */}
            <div className="card bracket-box fade-in-2" style={{ padding: '24px', gridColumn: 'span 1' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                Add Candidate
              </div>
              <form onSubmit={handleAddCandidate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  value={newCandidate}
                  onChange={e => setNewCandidate(e.target.value)}
                  placeholder="Candidate name"
                  className="input-field"
                  disabled={txLoading || imageLoading}
                />
                
                {/* Image Preview */}
                {imagePreview && (
                  <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '4px', border: '1px solid var(--border)', aspectRatio: '1' }}>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCandidateImage(null)
                        setImagePreview(null)
                      }}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'rgba(0,0,0,0.7)',
                        border: 'none',
                        color: 'var(--text)',
                        cursor: 'pointer',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* File Input */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: '1px dashed var(--border2)', borderRadius: '4px', cursor: 'pointer', background: 'var(--surface2)', transition: 'all 0.2s' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text2)' }}>📷 Upload Logo/Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ display: 'none' }}
                    disabled={txLoading || imageLoading}
                  />
                </label>

                <button
                  type="submit"
                  disabled={txLoading || !newCandidate.trim() || imageLoading}
                  className="btn-primary"
                  style={{ fontSize: '12px', padding: '8px 16px', width: '100%' }}
                >
                  {imageLoading ? 'Uploading...' : txLoading ? 'Adding...' : 'Add Candidate'}
                </button>
              </form>
              <p style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', margin: '8px 0 0' }}>
                MetaMask confirmation required. 
              </p>
            </div>

            {/* Stats Cards */}
            <div className="card bracket-box fade-in-3" style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                Total Votes
              </div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '2.2rem', fontWeight: 700, color: 'var(--accent)' }}>
                {totalVotes}
              </div>
            </div>

            <div className="card bracket-box fade-in-4" style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                Registered Voters
              </div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '2.2rem', fontWeight: 700, color: 'var(--green)' }}>
                {voters.length}
              </div>
            </div>

            <div className="card bracket-box fade-in-1" style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                Participant Voted
              </div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '2.2rem', fontWeight: 700, color: 'var(--amber)' }}>
                {votersWhoVoted}
              </div>
            </div>

            <div className="card bracket-box fade-in-2" style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                Turnout Rate
              </div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '2.2rem', fontWeight: 700, color: 'var(--text)' }}>
                {voters.length > 0 ? ((votersWhoVoted / voters.length) * 100).toFixed(1) : '0.0'}%
              </div>
            </div>
          </div>
        )}

        {/* Candidates List */}
        {!loading && candidates.length > 0 && (
          <div style={{ marginTop: '40px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
              Candidates ({candidates.length})
            </div>
            <div className="card bracket-box fade-in-3" style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                {candidates.map(c => (
                  <div key={c.id} style={{ padding: '0', background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Image */}
                    {c.image && (
                      <div style={{ width: '100%', aspectRatio: '1', overflow: 'hidden', background: 'var(--surface)' }}>
                        <img
                          src={c.image}
                          alt={c.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    )}
                    {/* Info */}
                    <div style={{ padding: '14px 16px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', marginBottom: '6px' }}>
                          #{c.id}
                        </div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
                          {c.name}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--accent)', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                        {c.voteCount} {c.voteCount === 1 ? 'vote' : 'votes'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Voters */}
        {!loading && voters.length > 0 && (
          <div style={{ marginTop: '40px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
              Recent Activity ({voters.length} registered)
            </div>
            <div className="card bracket-box fade-in-4" style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                {voters.slice().reverse().map((v, i) => (
                  <div key={i} style={{ padding: '12px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: v.hasVoted ? 'var(--green)' : 'var(--text3)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', color: 'var(--text)', fontFamily: 'JetBrains Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v.email}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>
                        {v.hasVoted ? '✓ Voted' : '○ Registered'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  )
}