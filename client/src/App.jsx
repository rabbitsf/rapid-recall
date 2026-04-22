import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { RefreshCw } from 'lucide-react'
import LoginPage from './pages/LoginPage.jsx'
import Layout from './components/Layout.jsx'
import StudentDashboard from './pages/StudentDashboard.jsx'
import TeacherDashboard from './pages/TeacherDashboard.jsx'
import ClassManager from './pages/ClassManager.jsx'
import StudentProgress from './pages/StudentProgress.jsx'
import SetEditor from './pages/SetEditor.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import ClassroomImport from './pages/ClassroomImport.jsx'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center text-slate-500">
      <RefreshCw className="animate-spin mb-4 text-crimson-600" size={32} />
      <p className="font-medium">Loading...</p>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/*" element={
        <RequireAuth>
          <Layout>
            <Routes>
              <Route path="/" element={
                user?.role === 'student' ? <StudentDashboard /> : <TeacherDashboard />
              } />
              <Route path="/admin" element={user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" replace />} />
              <Route path="/sets/new" element={<SetEditor />} />
              <Route path="/sets/:id/edit" element={<SetEditor />} />
              <Route path="/classes/:id" element={<ClassManager />} />
              <Route path="/classes/:id/progress" element={<StudentProgress />} />
              <Route path="/teacher/classroom" element={<ClassroomImport />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </RequireAuth>
      } />
    </Routes>
  )
}
