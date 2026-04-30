import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login      from './pages/Login';
import Forbidden  from './pages/Forbidden';
import Dashboard  from './pages/Dashboard';
import Attendance from './pages/Attendance';
import History    from './pages/History';
import Materials  from './pages/Materials';
import Upload     from './pages/Upload';
import Settings   from './pages/Settings';
import StudentAttendance from './pages/StudentAttendance';
import Upcoming   from './pages/Upcoming';
import AppShell   from './components/AppShell';
import RoleGuard  from './components/RoleGuard';
import DevTokens  from './pages/DevTokens';


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public ─────────────────────────────────── */}
        <Route path="/login"    element={<Login />} />
        <Route path="/403"      element={<Forbidden />} />

        {/* ── Dev (Phase 0 gate — remove in Phase 6) ── */}
        <Route path="/dev-tokens" element={<DevTokens />} />

        {/* ── Authenticated — Shell wrapper ─────────── */}
        <Route element={<AppShell />}>
          {/* Mentor routes */}
          <Route path="/dashboard"  element={<RoleGuard allowedRole="mentor"><Dashboard /></RoleGuard>} />
          <Route path="/attendance" element={<RoleGuard allowedRole="mentor"><Attendance /></RoleGuard>} />
          <Route path="/history"    element={<RoleGuard allowedRole="mentor"><History /></RoleGuard>} />
          <Route path="/materials"  element={<RoleGuard allowedRole="mentor"><Materials /></RoleGuard>} />
          <Route path="/upload"     element={<RoleGuard allowedRole="mentor"><Upload /></RoleGuard>} />
          <Route path="/settings"   element={<Settings />} />

          {/* Student routes */}
          <Route path="/me/attendance" element={<RoleGuard allowedRole="student"><StudentAttendance /></RoleGuard>} />
          <Route path="/me/upcoming"   element={<RoleGuard allowedRole="student"><Upcoming /></RoleGuard>} />
          <Route path="/me/materials"  element={<RoleGuard allowedRole="student"><Materials /></RoleGuard>} />
          <Route path="/me/settings"   element={<RoleGuard allowedRole="student"><Settings /></RoleGuard>} />
        </Route>

        {/* ── Default ────────────────────────────────── */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
