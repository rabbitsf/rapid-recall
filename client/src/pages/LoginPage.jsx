export default function LoginPage() {
  const error = new URLSearchParams(window.location.search).get('error')

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at center, #cf2e2e 0%, #8B1A1A 70%)' }}
    >
      {/* Card */}
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Gold accent bar */}
        <div style={{ height: 4, background: '#C8960C' }} />

        <div className="flex flex-col items-center px-8 py-8 gap-5">
          {/* Hamlin Logo */}
          <img
            src="https://hamlin.org/wp-content/uploads/2025/03/Logo-Transparent-BG.png"
            alt="The Hamlin School"
            className="w-48 object-contain"
          />

          {/* Gold divider */}
          <div style={{ height: 1, background: '#C8960C', width: '100%' }} />

          {/* Title */}
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#8B1A1A' }}>
              Rapid Recall
            </h1>
          </div>

          {/* Error messages */}
          {error === 'unauthorized' && (
            <div className="w-full text-sm bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-left">
              <p className="font-semibold text-amber-800 mb-1">Account not set up</p>
              <p className="text-amber-700">Your Google account isn't registered yet. Ask your teacher or admin to add you.</p>
            </div>
          )}
          {error && error !== 'unauthorized' && (
            <p className="w-full text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 text-center">
              Sign-in failed. Please try again.
            </p>
          )}

          {/* Instruction */}
          <p className="text-sm text-center text-slate-500">
            Sign in with your school Google account
          </p>

          {/* Sign-in button */}
          <a
            href="/auth/google"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#cf2e2e' }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </a>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>© The Hamlin School</p>
    </div>
  )
}
