import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navLinks = [
  { path: '/', label: 'Home' },
  { path: '/vote', label: 'Vote' },
  { path: '/results', label: 'Results' },
  { path: '/admin', label: 'Admin' },
]

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border2" style={{ background: 'rgba(8,11,16,0.92)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 border-2 border-accent rotate-45 group-hover:rotate-[225deg] transition-transform duration-500" />
            <div className="absolute inset-1 bg-accent rotate-45" />
          </div>
          <span className="font-syne font-800 text-lg tracking-widest text-text">
            BLOCK<span className="text-accent">POLL</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-3">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-4 py-2 text-xs font-mono tracking-widest uppercase transition-all duration-200 relative ${
                location.pathname === link.path
                  ? 'text-accent'
                  : 'text-text2 hover:text-text'
              }`}
            >
              {location.pathname === link.path && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-accent" />
              )}
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green pulse" />
                <span className="text-xs text-text2 font-mono truncate max-w-[160px]">{user.email}</span>
              </div>
              <button onClick={handleLogout} className="btn-outline text-xs py-2 px-4">
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-outline text-xs py-2 px-4">Login</Link>
              <Link to="/register" className="btn-primary text-xs py-2 px-4">Register</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}