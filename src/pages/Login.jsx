import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase/config'
import { doc, getDoc } from 'firebase/firestore'
import * as faceapi from 'face-api.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState('credentials')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [loggedInUser, setLoggedInUser] = useState(null)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
 const { login, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models'
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])
        setModelsLoaded(true)
      } catch {
        setError('Failed to load face detection models.')
      }
    }
    loadModels()
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      detectLoop()
    } catch {
      setError('Camera access denied.')
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  const detectLoop = () => {
    const interval = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return
      try {
        const det = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor()
        setFaceDetected(!!det)
        if (canvasRef.current && videoRef.current) {
          const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true)
          canvasRef.current.getContext('2d').clearRect(0, 0, dims.width, dims.height)
          if (det) faceapi.draw.drawDetections(canvasRef.current, faceapi.resizeResults(det, dims))
        }
      } catch (err) {
        console.error('Detection error:', err)
      }
    }, 300)
    return interval
  }

  useEffect(() => {
    let interval
    if (step === 'face') {
      startCamera()
      interval = detectLoop()
    }
    return () => {
      if (interval) clearInterval(interval)
      stopCamera()
    }
  }, [step])

const handleCredentials = async (e) => {
  e.preventDefault()
  setError('')
  setLoading(true)
  try {
    const cred = await login(email, password)
    setLoggedInUser(cred.user)
    // Sign out immediately — user must pass face scan to stay logged in
    await logout()
    setStep('face')
  } catch (err) {
    setError(err.message.replace('Firebase: ', ''))
  }
  setLoading(false)
}

  const handleFaceVerify = async () => {
    if (verifying) return // Prevent double-click
    setVerifying(true)
    setError('')
    try {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        throw new Error('Camera not ready')
      }

      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        setError('No face detected. Please look directly at the camera.')
        return
      }

      if (!loggedInUser) {
        setError('Session error. Please sign in again.')
        return
      }

      const voterDoc = await getDoc(doc(db, 'voters', loggedInUser.uid))
      if (!voterDoc.exists()) {
        setError('No face data found. Please re-register.')
        return
      }

      const storedDescriptor = new Float32Array(voterDoc.data().faceDescriptor)
      const liveDescriptor = detection.descriptor
      const distance = faceapi.euclideanDistance(liveDescriptor, storedDescriptor)
      const THRESHOLD = 0.45

      if (distance > THRESHOLD) {
        setError(`Face not recognized (distance: ${distance.toFixed(3)}). Please try again.`)
        return
      }

      // Face verified successfully - now re-authenticate the user
      await login(email, password)
      setStep('success')
      stopCamera()
      
      // Redirect after brief success animation
      setTimeout(() => navigate('/vote'), 1800)
    } catch (err) {
      console.error('Face verification error:', err)
      setError('Verification error: ' + (err.message || 'Unknown error'))
    } finally {
      setVerifying(false)
    }
  }

  const stepIndex = step === 'credentials' ? 0 : step === 'face' ? 1 : 2

  return (
    <div className="min-h-screen grid-bg" style={{ paddingTop: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px 40px' }}>
      <div className="scan-line" />

      <div style={{ width: '100%', maxWidth: '460px' }}>

        {/* ── Page Title ── */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }} className="fade-in">
          <div className="badge badge-accent" style={{ marginBottom: '16px' }}>
            {step === 'credentials' ? '01 / Credentials' : step === 'face' ? '02 / Biometric' : '✓ Verified'}
          </div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
            {step === 'credentials' && 'Sign In'}
            {step === 'face' && <>Verify <span style={{ color: 'var(--accent)' }} className="text-glow">Your Face</span></>}
            {step === 'success' && <span style={{ color: 'var(--green)' }} className="text-glow-green">Access Granted</span>}
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
            {step === 'credentials' && 'Enter your credentials to continue'}
            {step === 'face' && 'Face scan required to complete authentication'}
            {step === 'success' && 'Redirecting to voting portal...'}
          </p>
        </div>

        {/* ── Step Progress Bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', marginBottom: '28px' }} className="fade-in">
          {['Credentials', 'Face Scan', 'Done'].map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '32px', height: '32px',
                  border: `2px solid ${i < stepIndex ? 'var(--green)' : i === stepIndex ? 'var(--accent)' : 'var(--border2)'}`,
                  background: i < stepIndex ? 'var(--green-glow)' : i === stepIndex ? 'var(--accent-glow)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: 'rotate(45deg)',
                  transition: 'all 0.3s',
                }}>
                  <span style={{ transform: 'rotate(-45deg)', fontSize: '11px', color: i < stepIndex ? 'var(--green)' : i === stepIndex ? 'var(--accent)' : 'var(--text3)', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                    {i < stepIndex ? '✓' : i + 1}
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: i === stepIndex ? 'var(--accent)' : i < stepIndex ? 'var(--green)' : 'var(--text3)', fontFamily: 'JetBrains Mono', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
              </div>
              {i < 2 && (
                <div style={{ width: '60px', height: '2px', background: i < stepIndex ? 'var(--green)' : 'var(--border2)', marginBottom: '22px', transition: 'background 0.3s' }} />
              )}
            </div>
          ))}
        </div>

        {/* ── Main Card ── */}
        <div className="card bracket-box fade-in-1" style={{ padding: '2rem' }}>

          {error && (
            <div style={{ marginBottom: '20px', padding: '12px 16px', border: '1px solid var(--red)', background: 'rgba(255,61,90,0.08)', color: 'var(--red)', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Credentials Step */}
          {step === 'credentials' && (
            <form onSubmit={handleCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text3)', marginBottom: '8px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text3)', marginBottom: '8px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  className="input-field"
                />
              </div>

              {/* Info box */}
              <div style={{ padding: '12px 16px', background: 'var(--accent-glow)', border: '1px solid rgba(0,212,255,0.2)', fontSize: '11px', color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6 }}>
                ◈ After credentials, a face scan will verify your identity before granting access.
              </div>

              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '4px' }}>
                {loading ? 'Authenticating...' : 'Continue to Face Scan →'}
              </button>
            </form>
          )}

          {/* Face Step */}
          {step === 'face' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.7, margin: 0 }}>
                Look directly at the camera. Your live face will be compared against your registered 128-point descriptor.
              </p>

              {!modelsLoaded ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '3rem', justifyContent: 'center' }}>
                  <div style={{ width: '20px', height: '20px', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text2)', fontFamily: 'JetBrains Mono' }}>Loading face models...</span>
                </div>
              ) : (
                <>
                  {/* Camera feed */}
                  <div style={{ position: 'relative', aspectRatio: '4/3', background: 'var(--bg2)', border: '1px solid var(--border2)', overflow: 'hidden' }}>
                    <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

                    {/* Status badge */}
                    <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                      <div className={`badge ${faceDetected ? 'badge-green' : 'badge-red'}`}>
                        {faceDetected ? '● Face Detected' : '○ No Face'}
                      </div>
                    </div>

                    {/* Scan line */}
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', left: 0, right: 0, height: '1px', background: 'var(--accent)', opacity: 0.3, animation: 'scan 2s linear infinite' }} />
                    </div>

                    {/* Corner brackets */}
                    {[
                      { top: '12px', left: '12px', borderTop: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)' },
                      { top: '12px', right: '12px', borderTop: '2px solid var(--accent)', borderRight: '2px solid var(--accent)' },
                      { bottom: '12px', left: '12px', borderBottom: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)' },
                      { bottom: '12px', right: '12px', borderBottom: '2px solid var(--accent)', borderRight: '2px solid var(--accent)' },
                    ].map((style, i) => (
                      <div key={i} style={{ position: 'absolute', width: '24px', height: '24px', opacity: 0.7, ...style }} />
                    ))}

                    {/* Face detected glow overlay */}
                    {faceDetected && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,255,136,0.04)', pointerEvents: 'none', transition: 'opacity 0.3s' }} />
                    )}
                  </div>

                  <button
                    onClick={handleFaceVerify}
                    disabled={!faceDetected || verifying}
                    className="btn-primary"
                    style={{ width: '100%' }}
                  >
                    {verifying ? 'Comparing face data...' : faceDetected ? 'Verify & Enter →' : 'Waiting for face...'}
                  </button>

                  {faceDetected && (
                    <p style={{ fontSize: '11px', color: 'var(--green)', fontFamily: 'JetBrains Mono', textAlign: 'center', margin: 0 }}>
                      ✓ Face detected — click the button to verify
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              {/* Animated diamond */}
              <div style={{ position: 'relative', width: '72px', height: '72px', margin: '0 auto 24px' }}>
                <div style={{ position: 'absolute', inset: 0, border: '2px solid var(--green)', transform: 'rotate(45deg)', boxShadow: '0 0 20px var(--green-glow)' }} />
                <div style={{ position: 'absolute', inset: '8px', background: 'var(--green-glow)', transform: 'rotate(45deg)' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: 'var(--green)' }}>
                  ✓
                </div>
              </div>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.2rem', color: 'var(--green)', marginBottom: '8px' }} className="text-glow-green">
                Identity Verified
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'JetBrains Mono' }}>
                Redirecting to voting portal...
              </p>
              {/* Loading bar */}
              <div style={{ marginTop: '24px', height: '2px', background: 'var(--border2)', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--green)', width: '100%', animation: 'progress 1.8s linear forwards', boxShadow: '0 0 8px var(--green)' }} />
              </div>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text3)', marginTop: '20px', fontFamily: 'JetBrains Mono, monospace' }}>
          Not registered?{' '}
          <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Create account →</Link>
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes progress { from { width: 0% } to { width: 100% } }
      `}</style>
    </div>
  )
}