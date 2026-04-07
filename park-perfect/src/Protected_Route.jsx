import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { use_auth } from './Auth_Context';

export default function protected_route() {
  const { is_authenticated } = use_auth();
  const location = useLocation();

  if (!is_authenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return <Outlet />;
}


