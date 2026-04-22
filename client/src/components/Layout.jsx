import { LogOut, GraduationCap, BookOpen, ShieldCheck } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const ROLE_STYLES = {
  admin:   { cls: 'bg-white/20 text-white',  icon: <ShieldCheck size={14} /> },
  teacher: { cls: 'bg-white/20 text-white',  icon: <GraduationCap size={14} /> },
  student: { cls: 'bg-white/20 text-white',  icon: <BookOpen size={14} /> },
}

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()
  const roleStyle = ROLE_STYLES[user?.role] ?? ROLE_STYLES.student

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-800 font-sans overscroll-none">
      {/* Crimson header */}
      <header className="sticky top-0 z-10 shadow-md" style={{ backgroundColor: '#8B1A1A' }}>
        {/* Gold accent line */}
        <div className="h-1 bg-gradient-to-r from-[#8B1A1A] via-[#C8960C] to-[#f0d060]" />

        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="https://hamlin.org/wp-content/uploads/2025/03/Logo-Transparent-BG.png"
              alt="The Hamlin School"
              className="h-8 object-contain brightness-0 invert"
            />
            <span className="text-white font-bold text-lg tracking-tight">Rapid Recall</span>
          </Link>

          {user && (
            <div className="flex items-center gap-2">
              {user.role === 'admin' && (pathname === '/admin'
                ? <Link to="/" className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
                    <GraduationCap size={14} /> Teacher Panel
                  </Link>
                : <Link to="/admin" className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
                    <ShieldCheck size={14} /> Admin Panel
                  </Link>
              )}
              <span className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${roleStyle.cls}`}>
                {roleStyle.icon}
                {user.role}
              </span>
              {user.photoUrl
                ? <img src={user.photoUrl} alt={user.displayName} className="w-8 h-8 rounded-full border-2 border-white/30" />
                : <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">{user.displayName?.[0]}</div>
              }
              <span className="hidden sm:block text-sm font-medium text-white/80">{user.displayName}</span>
              <button onClick={signOut} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Sign out">
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 pb-24">
        {children}
      </main>
    </div>
  )
}
