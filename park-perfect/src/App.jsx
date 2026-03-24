import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Map from './pages/Map';
import Settings from './pages/Settings';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminReports from './pages/admin/AdminReports';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/map" element={<Map />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/reports" element={<AdminReports />} />
      <Route path="/" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default App;