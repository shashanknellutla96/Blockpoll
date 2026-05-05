import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase/config'
import { doc, setDoc } from 'firebase/firestore'
import * as faceapi from 'face-api.js'

const STEPS = ['Account', 'Face Scan', 'Complete']

async function uploadToCloudinary(base64Image) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  
  // Convert base64 data URL to blob
  const arr = base64Image.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  const n = bstr.length
  const u8arr = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i)
  }
  const blob = new Blob([u8arr], { type: mime })
  
  const formData = new FormData()
  formData.append('file', blob)
  formData.append('upload_preset', uploadPreset)
  formData.append('folder', 'blockpoll/faces')
  
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { 
    method: 'POST', 
    body: formData 
  })
  if (!response.ok) throw new Error('Cloudinary upload failed')
  const data = await response.json()
  return data.secure_url
}

export default function Register() {
  const [step, setStep] = useState(0)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [registeredUser, setRegisteredUser] = useState(null)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const detectIntervalRef = useRef(null)
const { register, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ])
        setModelsLoaded(true)
      } catch (err) {
        setError('Failed to load face detection models. Check /public/models has all 7 files.')
        console.error(err)
      }
    }
    loadModels()
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await new Promise(resolve => { videoRef.current.onloadedmetadata = resolve })
      }
      startDetectLoop()
    } catch {
      setError('Camera access denied. Please allow camera permissions in your browser.')
    }
  }

  const stopCamera = () => {
    if (detectIntervalRef.current) clearInterval(detectIntervalRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  const startDetectLoop = () => {
    detectIntervalRef.current = setInterval(async () => {
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
      } catch { }
    }, 300)
  }

  useEffect(() => {
    if (step === 1) startCamera()
    return () => stopCamera()
  }, [step])

  const handleAccountStep = async (e) => {
    e.preventDefault()
    if (password !== confirm) return setError('Passwords do not match.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    
    setError('')
    // Just validate and move to face capture step - don't create user yet
    setStep(1)
  }

  const handleCaptureFace = async () => {
    if (capturing) return // Prevent double-click
    setCapturing(true)
    setError('')
    try {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        setError('Camera not ready yet. Please wait a moment.')
        return
      }

      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        setError('No face detected. Look directly at the camera in good lighting.')
        return
      }

      // Capture face data
      const descriptor = Array.from(detection.descriptor)
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
      const base64Image = canvas.toDataURL('image/jpeg', 0.7)

      let imageUrl = null
      try {
        imageUrl = await uploadToCloudinary(base64Image)
      } catch (uploadErr) {
        console.warn('Cloudinary upload failed:', uploadErr)
        // Continue without image URL - face descriptor is the primary data
      }

      // Now create the Firebase Auth user
      const cred = await register(email, password)
      const newUser = cred.user

      // Save voter data with the new user's UID
      await setDoc(doc(db, 'voters', newUser.uid), {
        email: newUser.email,
        uid: newUser.uid,
        faceDescriptor: descriptor,
        faceImageUrl: imageUrl || null,
        registeredAt: new Date().toISOString(),
        hasVoted: false,
      })

      // Log out immediately - user must verify face on login
      await logout()
      setRegisteredUser(newUser)
      stopCamera()
      setStep(2)
    } catch (err) {
      console.error('Face capture error:', err)
      setError('Registration failed: ' + (err.message || 'Unknown error'))
    } finally {
      setCapturing(false)
    }
  }

  return (
    <div className="min-h-screen grid-bg" style={{ paddingTop: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px 40px' }}>
      <div className="scan-line" />

      <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* ── Page Title ── */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }} className="fade-in">
          <div className="badge badge-accent" style={{ marginBottom: '16px' }}>
            {step === 0 ? '01 / Account' : step === 1 ? '02 / Biometric' : '✓ Complete'}
          </div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
            {step === 0 && 'Create Account'}
            {step === 1 && <>Register <span style={{ color: 'var(--accent)' }} className="text-glow">Your Face</span></>}
            {step === 2 && <span style={{ color: 'var(--green)' }} className="text-glow-green">Registration Complete</span>}
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
            {step === 0 && 'Set up your voter credentials'}
            {step === 1 && 'Biometric identity enrollment'}
            {step === 2 && 'Your account is ready to vote'}
          </p>
        </div>

        {/* ── Step Progress ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px' }} className="fade-in">
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '32px', height: '32px',
                  border: `2px solid ${i < step ? 'var(--green)' : i === step ? 'var(--accent)' : 'var(--border2)'}`,
                  background: i < step ? 'var(--green-glow)' : i === step ? 'var(--accent-glow)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: 'rotate(45deg)', transition: 'all 0.3s',
                }}>
                  <span style={{ transform: 'rotate(-45deg)', fontSize: '11px', color: i < step ? 'var(--green)' : i === step ? 'var(--accent)' : 'var(--text3)', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                    {i < step ? '✓' : i + 1}
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: i === step ? 'var(--accent)' : i < step ? 'var(--green)' : 'var(--text3)', fontFamily: 'JetBrains Mono', whiteSpace: 'nowrap' }}>
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: '60px', height: '2px', background: i < step ? 'var(--green)' : 'var(--border2)', marginBottom: '22px', transition: 'background 0.3s' }} />
              )}
            </div>
          ))}
        </div>

        {/* ── Main Card ── */}
        <div className="card bracket-box fade-in-1" style={{ padding: '2rem' }}>

          {error && (
            <div style={{ marginBottom: '20px', padding: '12px 16px', border: '1px solid var(--red)', background: 'rgba(255,61,90,0.08)', color: 'var(--red)', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', display: 'flex', gap: '8px' }}>
              <span>⚠</span><span>{error}</span>
            </div>
          )}

          {/* Step 0 — Credentials */}
          {step === 0 && (
            <form onSubmit={handleAccountStep} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                { label: 'Email Address', type: 'email', value: email, onChange: e => setEmail(e.target.value), placeholder: 'you@example.com' },
                { label: 'Password', type: 'password', value: password, onChange: e => setPassword(e.target.value), placeholder: 'Min. 6 characters' },
                { label: 'Confirm Password', type: 'password', value: confirm, onChange: e => setConfirm(e.target.value), placeholder: 'Repeat password' },
              ].map(({ label, ...inputProps }) => (
                <div key={label}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text3)', marginBottom: '8px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {label}
                  </label>
                  <input {...inputProps} required className="input-field" />
                </div>
              ))}

              <div style={{ padding: '12px 16px', background: 'var(--accent-glow)', border: '1px solid rgba(0,212,255,0.2)', fontSize: '11px', color: 'var(--text2)', fontFamily: 'JetBrains Mono', lineHeight: 1.6 }}>
                ◈ Account will be created after you successfully register your face. No account yet.
              </div>

              <button type="submit" disabled={false} className="btn-primary" style={{ width: '100%', marginTop: '4px' }}>
                Continue to Face Scan →
              </button>
            </form>
          )}

          {/* Step 1 — Face Scan */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text2)', fontFamily: 'JetBrains Mono', lineHeight: 1.7, margin: 0 }}>
                Look directly at the camera in good lighting. Your face is stored as a 128-point mathematical descriptor — not a raw image.
              </p>

              {!modelsLoaded ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '3rem', justifyContent: 'center' }}>
                  <div style={{ width: '20px', height: '20px', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text2)', fontFamily: 'JetBrains Mono' }}>Loading face models...</span>
                </div>
              ) : (
                <>
                  <div style={{ position: 'relative', aspectRatio: '4/3', background: 'var(--bg2)', border: '1px solid var(--border2)', overflow: 'hidden' }}>
                    <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

                    <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                      <div className={`badge ${faceDetected ? 'badge-green' : 'badge-red'}`}>
                        {faceDetected ? '● Face Detected' : '○ No Face'}
                      </div>
                    </div>

                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', left: 0, right: 0, height: '1px', background: 'var(--accent)', opacity: 0.3, animation: 'scan 2s linear infinite' }} />
                    </div>

                    {[
                      { top: '12px', left: '12px', borderTop: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)' },
                      { top: '12px', right: '12px', borderTop: '2px solid var(--accent)', borderRight: '2px solid var(--accent)' },
                      { bottom: '12px', left: '12px', borderBottom: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)' },
                      { bottom: '12px', right: '12px', borderBottom: '2px solid var(--accent)', borderRight: '2px solid var(--accent)' },
                    ].map((style, i) => (
                      <div key={i} style={{ position: 'absolute', width: '24px', height: '24px', opacity: 0.7, ...style }} />
                    ))}

                    {faceDetected && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,255,136,0.04)', pointerEvents: 'none' }} />
                    )}
                  </div>

                  <button onClick={handleCaptureFace} disabled={!faceDetected || capturing} className="btn-primary" style={{ width: '100%' }}>
                    {capturing ? 'Creating account & Registering face...' : faceDetected ? 'Complete Registration ✓' : 'Waiting for face detection...'}
                  </button>

                  {faceDetected && (
                    <p style={{ fontSize: '11px', color: 'var(--green)', fontFamily: 'JetBrains Mono', textAlign: 'center', margin: 0 }}>
                      ✓ Face detected — click the button to register
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 2 — Done */}
          {step === 2 && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ position: 'relative', width: '72px', height: '72px', margin: '0 auto 24px' }}>
                <div style={{ position: 'absolute', inset: 0, border: '2px solid var(--green)', transform: 'rotate(45deg)', boxShadow: '0 0 20px var(--green-glow)' }} />
                <div style={{ position: 'absolute', inset: '8px', background: 'var(--green-glow)', transform: 'rotate(45deg)' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: 'var(--green)' }}>
                  ✓
                </div>
              </div>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)', marginBottom: '8px' }}>
                Account & face registered successfully.
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', marginBottom: '28px', lineHeight: 1.6 }}>
                You can now log in using your email<br />and face verification.
              </p>

              {/* Stats summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                {[
                  { label: 'Auth Method', value: 'Email + Face' },
                  { label: 'Descriptor', value: '128-point' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '12px', background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'JetBrains Mono', marginBottom: '4px' }}>{label}</div>
                    <div style={{ fontSize: '13px', color: 'var(--accent)', fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>{value}</div>
                  </div>
                ))}
              </div>

              <button onClick={() => navigate('/login')} className="btn-primary" style={{ width: '100%' }}>
                Go to Login →
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text3)', marginTop: '20px', fontFamily: 'JetBrains Mono, monospace' }}>
          Already registered?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Sign in →</Link>
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}