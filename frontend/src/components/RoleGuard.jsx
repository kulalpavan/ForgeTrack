import { Navigate, useOutletContext } from 'react-router-dom';

/**
 * RoleGuard wraps routes that are restricted to a specific role.
 * Assumes it's placed inside the AppShell where `role` is provided via context.
 */
export default function RoleGuard({ allowedRole, children }) {
  const { role } = useOutletContext();

  if (role !== allowedRole) {
    return <Navigate to="/403" replace />;
  }

  return children;
}
