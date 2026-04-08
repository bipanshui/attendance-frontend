import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleRoute } from './components/RoleRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import StudentDashboard from './pages/student/StudentDashboard';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Redirect root based on auth status and role */}
      <Route 
        path="/" 
        element={
          user ? <Navigate to={`/${user.role}`} replace /> : <Navigate to="/login" replace />
        } 
      />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        
        {/* Faculty Only Routes */}
        <Route element={<RoleRoute allowedRole="faculty" />}>
          <Route path="/faculty" element={<FacultyDashboard />} />
        </Route>

        {/* Student Only Routes */}
        <Route element={<RoleRoute allowedRole="student" />}>
          <Route path="/student" element={<StudentDashboard />} />
        </Route>
        
      </Route>

      {/* Catch all route - fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
