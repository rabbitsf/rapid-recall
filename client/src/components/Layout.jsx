import { BrainCircuit, LogOut, GraduationCap, BookOpen, ShieldCheck } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const ROLE_STYLES = {
  admin:   { cls: 'bg-rose-100 text-rose-700',   icon: <ShieldCheck size={14} /> },
  teacher: { cls: 'bg-amber-100 text-amber-700',  icon: <GraduationCap size={14} /> },
  student: { cls: 'bg-indigo-100 text-indigo-700', icon: <BookOpen size={14} /> },
}

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()
  const roleStyle = ROLE_STYLES[user?.role] ?? ROLE_STYLES.student

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-800 font-sans overscroll-none">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <BrainCircuit size={24} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              Rapid Recall
            </h1>
          </Link>

          {user && (
            <div className="flex items-center gap-3">
              {user.role === 'admin' && (pathname === '/admin'
                ? <Link to="/" className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
                    <GraduationCap size={14} /> Teacher Panel
                  </Link>
                : <Link to="/admin" className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors">
                    <ShieldCheck size={14} /> Admin Panel
                  </Link>
              )}
              <span className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${roleStyle.cls}`}>
                {roleStyle.icon}
                {user.role}
              </span>
              {user.photoUrl
                ? <img src={user.photoUrl} alt={user.displayName} className="w-8 h-8 rounded-full" />
                : <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm">{user.displayName?.[0]}</div>
              }
              <span className="hidden sm:block text-sm font-medium text-slate-600">{user.displayName}</span>
              <button onClick={signOut} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Sign out">
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
