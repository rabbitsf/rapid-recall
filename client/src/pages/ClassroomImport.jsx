import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Link2, CheckCircle2, Download, Users, Unlink, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function ClassroomImport() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [connected, setConnected] = useState(null) // null = loading
  const [connectionInfo, setConnectionInfo] = useState(null) // { own, via }
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(null) // courseId being synced
  const [results, setResults] = useState({}) // courseId → sync result
  const [syncError, setSyncError] = useState('')

  const checkStatus = useCallback(async () => {
    const res = await fetch('/api/classroom/status', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      setConnected(data.connected)
      setConnectionInfo(data)
    }
  }, [])

  const fetchCourses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/classroom/courses', { credentials: 'include' })
      if (res.ok) setCourses(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    checkStatus()
    // Handle OAuth return — check for error in URL
    const params = new URLSearchParams(window.location.search)
    if (params.get('error')) {
      setConnected(false)
    }
  }, [checkStatus])

  useEffect(() => {
    if (connected) fetchCourses()
  }, [connected, fetchCourses])

  const disconnect = async () => {
    if (!window.confirm('Disconnect Google Classroom? You can reconnect at any time.')) return
    await fetch('/api/classroom/disconnect', { method: 'DELETE', credentials: 'include' })
    setConnected(false)
    setCourses([])
  }

  const syncCourse = async (courseId) => {
    setSyncing(courseId)
    setSyncError('')
    try {
      const res = await fetch(`/api/classroom/sync/${courseId}`, {
        method: 'POST', credentials: 'include',
      })
      const data = await res.json()
      if (res.ok) {
        setResults(r => ({ ...r, [courseId]: data }))
        fetchCourses()
      } else {
        setSyncError(data.error ?? `Server error ${res.status}`)
      }
    } catch (err) {
      setSyncError(err.message)
    } finally { setSyncing(null) }
  }

  if (connected === null) return (
    <div className="flex items-center justify-center py-24">
      <RefreshCw className="animate-spin text-crimson-600" size={28} />
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-2.5 bg-white rounded-full shadow-sm text-slate-500 hover:text-slate-700 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Google Classroom Import</h2>
          <p className="text-slate-500 text-sm mt-0.5">Import your classes and students from Google Classroom.</p>
        </div>
      </div>

      {!connected ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-crimson-50 text-crimson-600 mb-4">
            <Link2 size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Google Classroom Not Connected</h3>
          {isAdmin ? (
            <>
              <p className="text-slate-500 mb-6 max-w-sm mx-auto text-sm">
                Connect the school's Google Classroom account once — all teachers will be able to import from it.
              </p>
              <a href="/api/classroom/connect"
                className="inline-flex items-center gap-2 px-6 py-3 bg-crimson-600 hover:bg-crimson-700 text-white font-semibold rounded-xl transition-colors shadow-sm">
                <ShieldCheck size={18} /> Connect as Admin
              </a>
            </>
          ) : (
            <p className="text-slate-500 max-w-sm mx-auto text-sm">
              An admin needs to connect the school's Google Classroom account first. Contact your admin to set this up.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl flex items-center gap-2">
              <CheckCircle2 size={16} />
              Connected via <strong>{connectionInfo?.via ?? 'admin'}</strong>
            </p>
            <div className="flex items-center gap-3">
              <button onClick={fetchCourses} disabled={loading} className="flex items-center gap-2 text-sm text-slate-600 hover:text-crimson-600 transition-colors">
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
              {isAdmin && (
                <button onClick={disconnect} className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-500 transition-colors">
                  <Unlink size={15} /> Disconnect
                </button>
              )}
            </div>
          </div>

          {syncError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              Import failed: {syncError}
            </div>
          )}

          {loading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : courses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
              No active Google Classroom courses found.
            </div>
          ) : (
            <div className="grid gap-3">
              {courses.map(course => {
                const result = results[course.id]
                const isSyncing = syncing === course.id
                return (
                  <div key={course.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800">{course.name}</p>
                      {course.section && <p className="text-sm text-slate-500">{course.section}</p>}
                      {course.imported && !result && (
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <CheckCircle2 size={12} className="text-emerald-500" />
                          Last synced {new Date(course.lastSyncedAt).toLocaleDateString()}
                        </p>
                      )}
                      {result && (
                        <p className="text-xs text-emerald-700 mt-1">
                          ✓ {result.studentsCreated} new · {result.studentsLinked} linked
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {course.imported && (
                        <button onClick={() => navigate(`/classes/${course.localClassId}`)}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                          <Users size={14} /> View
                        </button>
                      )}
                      <button onClick={() => syncCourse(course.id)} disabled={isSyncing}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-crimson-600 hover:bg-crimson-700 disabled:opacity-60 rounded-xl transition-colors">
                        {isSyncing
                          ? <><RefreshCw size={14} className="animate-spin" /> Syncing…</>
                          : <><Download size={14} /> {course.imported ? 'Re-sync' : 'Import'}</>
                        }
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
