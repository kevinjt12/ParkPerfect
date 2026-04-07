import { Navigate, Route, Routes } from 'react-router-dom';
import { use_auth } from './Auth_Context';
import Protected_Route from './Protected_Route';
import Login_Page from './pages/Login_Page';
import Map_Page from './pages/Map_Page';
import Settings_Page from './pages/Settings_Page';
import Admin_Login from './pages/admin/Admin_Login';
import Admin_Dashboard from './pages/admin/Admin_Dashboard';
import Admin_Reports from './pages/admin/Admin_Reports';

function home_redirect() {
  const { is_authenticated } = use_auth();

  return <Navigate replace to={is_authenticated ? '/map' : '/login'} />;
}

const Home_Redirect = home_redirect;

function app_root() {
  return (
    <Routes>
      <Route path="/login" element={<Login_Page />} />
      <Route element={<Protected_Route />}>
        <Route path="/map" element={<Map_Page />} />
        <Route path="/settings" element={<Settings_Page />} />
      </Route>
      <Route path="/admin/login" element={<Admin_Login />} />
      <Route path="/admin/dashboard" element={<Admin_Dashboard />} />
      <Route path="/admin/reports" element={<Admin_Reports />} />
      <Route path="/" element={<Home_Redirect />} />
      <Route path="*" element={<Home_Redirect />} />
    </Routes>
  );
}

export default app_root;


